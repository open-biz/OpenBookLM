from fastapi import FastAPI, HTTPException, APIRouter, UploadFile, Form, File
from pydantic import BaseModel
from typing import List, Dict, Any
import logging
import os
import tempfile
from pathlib import Path
import sys

# Add project root to Python path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.append(ROOT)

from backend.cerebras.utils.cerebras_helpers import make_api_call
# from backend.pdf_to_text import process_pdf
# from backend.text_to_summary import process_text_document

app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/process-pdf")
async def process_pdf_endpoint(
    file: UploadFile = File(...),
    sourceId: str = Form(...),
    notebookId: str = Form(...),
    userId: str = Form(...)
) -> Dict[str, Any]:
    """Process PDF file using Cerebras API."""
    try:
        logger.info(f"Processing PDF for source {sourceId}")
        
        # Create temp directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save uploaded file
            file_path = Path(temp_dir) / file.filename
            with open(file_path, "wb") as f:
                f.write(await file.read())
            
            # Extract text from PDF
            extracted_text = await process_pdf(str(file_path))
            
            if not extracted_text:
                return {
                    "status": "error",
                    "message": "Failed to extract text from PDF",
                    "sourceId": sourceId
                }
            
            # Process the extracted text
            result = await process_text_document(extracted_text, notebookId)
            
            return {
                "status": "success",
                "message": "PDF processed successfully",
                "sourceId": sourceId,
                "extractedText": extracted_text,
                "summary": result.get("summary", ""),
                "contentLength": len(extracted_text)
            }
            
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "sourceId": sourceId
        }