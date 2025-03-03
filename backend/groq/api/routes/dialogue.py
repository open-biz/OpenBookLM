from fastapi import APIRouter, Form
from typing import Dict, Any
import logging
from pathlib import Path
import tempfile
from ...summary_to_dialogue import generate_dialogue
from ...utils.decorators import timeit

router = APIRouter()
logger = logging.getLogger(__name__)

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
            
            # Generate dialogue using the imported generate_dialogue function
            dialogue_result = generate_dialogue(
                summary=summary,
                language="English",
                num_guests=5,
                num_tokens=1000
            )
            
            if not dialogue_result:
                return {
                    "status": "error",
                    "message": "Failed to generate dialogue",
                    "sourceId": sourceId
                }
            
            return {
                "status": "success",
                "message": "Dialogue generated successfully",
                "sourceId": sourceId,
                "dialogue": dialogue_result,
                "contentLength": len(dialogue_result)
            }
            
    except Exception as e:
        logger.error(f"Error generating dialogue: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "sourceId": sourceId
        }
