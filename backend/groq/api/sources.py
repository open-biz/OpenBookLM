from fastapi import FastAPI, HTTPException, APIRouter, UploadFile, Form, File
from pydantic import BaseModel
from typing import List, Dict, Any
import logging
import os
import tempfile
from pathlib import Path
import sys
from fastapi.responses import JSONResponse
import asyncio
import requests
from bs4 import BeautifulSoup

# Add project root to Python path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.append(ROOT)

from backend.groq.api.pdf_to_text import process_pdf
from backend.groq.api.text_to_summary import process_text_document, ProcessingStatus, ProcessingProgress
from backend.utils.decorators import timeit
from backend.groq.api.summary_to_dialogue import generate_dialogue

app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class SourceRequest(BaseModel):
    userId: str
    notebookId: str
    sources: List[Dict[Any, Any]]

class WebsiteSourceRequest(BaseModel):
    url: str
    notebookId: str
    userId: str

async def run_pdf_processing(pdf_path: str, text_path: str) -> None:
    """Run PDF processing asynchronously."""
    await process_pdf(pdf_path, text_path)

@router.post("/process-pdf")
@timeit
async def process_pdf_endpoint(
    file: UploadFile = File(...),
    sourceId: str = Form(...),
    notebookId: str = Form(...),
    userId: str = Form(...)
) -> Dict[str, Any]:
    """Process uploaded PDF file through the conversion pipeline."""
    try:
        logger.info(f"Processing PDF for source {sourceId}")
        
        # Create temp directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save uploaded file
            pdf_path = Path(temp_dir) / "input.pdf"
            content = await file.read()
            with open(pdf_path, "wb") as f:
                f.write(content)
            
            # Process PDF to text
            text_path = Path(temp_dir) / "output.txt"
            await run_pdf_processing(str(pdf_path), str(text_path))
            
            # Read extracted text
            with open(text_path, "r") as f:
                extracted_text = f.read()
            
            # Start text processing
            summary_path = Path(temp_dir) / "summary.txt"
            result = await process_text_document(extracted_text, str(summary_path))
            
            if result["status"] == ProcessingStatus.ERROR:
                return {
                    "status": "error",
                    "message": result["error"],
                    "sourceId": sourceId,
                    "fileName": file.filename
                }
            
            # Read final summary
            with open(summary_path, "r") as f:
                summary_text = f.read()
            
            # Generate dialogue from summary
            dialogue_path = Path(temp_dir) / "dialogue.txt"
            dialogue_result = generate_dialogue(
                summary=summary_text,  # Pass the text directly
                language="English",
                num_guests=5,
                num_tokens=1000
            )
            
            if dialogue_result:
                dialogue_text = dialogue_result  # Use the result directly since it's text
            else:
                dialogue_text = ""

            return {
                "status": "success",
                "message": "PDF processed successfully",
                "sourceId": sourceId,
                "fileName": file.filename,
                "extractedText": extracted_text,
                "summary": summary_text,
                "dialogue": dialogue_text,
                "contentLength": len(summary_text),
                "progress": 100
            }
            
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "sourceId": sourceId,
            "fileName": file.filename,
            "progress": 0  # Fixed progress reference
        }

@router.get("/status/{sourceId}")
async def get_processing_status_endpoint(sourceId: str) -> Dict[str, Any]:
    """Get current processing status for a source."""
    status = await get_processing_status()
    return {
        "sourceId": sourceId,
        **status
    }

@router.post("/generate-dialogue")
@timeit
async def generate_dialogue_endpoint(
    sourceId: str = Form(...),
    summary: str = Form(...)
) -> Dict[str, Any]:
    """Generate dialogue script from summary text."""
    try:
        logger.info(f"Generating dialogue for source {sourceId}")
        
        # Create temp directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save summary to temp file
            summary_path = Path(temp_dir) / "summary.txt"
            with open(summary_path, "w", encoding='utf-8') as f:
                f.write(summary)
            
            # Generate dialogue
            dialogue_path = Path(temp_dir) / "dialogue.txt"
            result = generate_dialogue_script(str(summary_path))
            
            if not result:
                return {
                    "status": "error",
                    "message": "Failed to generate dialogue",
                    "sourceId": sourceId
                }
            
            # Read generated dialogue
            with open(result, "r", encoding='utf-8') as f:
                dialogue_text = f.read()
            
            return {
                "status": "success",
                "message": "Dialogue generated successfully",
                "sourceId": sourceId,
                "dialogue": dialogue_text,
                "contentLength": len(dialogue_text)
            }
            
    except Exception as e:
        logger.error(f"Error generating dialogue: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "sourceId": sourceId
        }

@router.post("/website")
async def process_website(request: WebsiteSourceRequest):
    try:
        # Fetch website content
        response = requests.get(request.url, timeout=10)  # Add timeout
        response.raise_for_status()
        
        # Parse HTML and extract text
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
            
        # Get text content
        text = soup.get_text()
        
        # Clean up text (remove extra whitespace)
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        # Process the text content
        result = await process_text_document(text, request.notebookId)
        
        return JSONResponse(content=result)
        
    except requests.RequestException as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch website: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error processing website: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing website: {str(e)}"
        )