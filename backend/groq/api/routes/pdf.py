from fastapi import APIRouter, UploadFile, Form, File
from typing import Dict, Any
import logging
from pathlib import Path
import tempfile
from ...pdf_to_text import process_pdf
from ...text_to_summary import process_text_document, ProcessingStatus
from ...summary_to_dialogue import generate_dialogue
from ...utils.decorators import timeit  # Add this import

router = APIRouter()
logger = logging.getLogger(__name__)

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
        logger.info(f"Processing PDF for source {sourceId}, user {userId} notebook {notebookId}")
        
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
