from fastapi import FastAPI, HTTPException, APIRouter
from pydantic import BaseModel
from typing import Dict, Any
import os
import sys

# Add project root to Python path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(ROOT)

try:
    from utils.cerebras_connect import generate_audio
except ImportError:
    # Fallback function if Cerebras is not available
    async def generate_audio(notebook_id: str, conversation_config: Dict[str, Any]):
        # For testing/development
        return {
            "url": "http://170.187.161.93:8000/test-audio.wav",
            "duration": 30.0
        }

router = APIRouter()

class AudioGenerationRequest(BaseModel):
    notebook_id: str
    conversation: Dict[str, Any]

@router.post("/generate_audio")
async def generate_audio_endpoint(request: AudioGenerationRequest):
    try:
        audio_data = await generate_audio(
            notebook_id=request.notebook_id,
            conversation_config=request.conversation
        )
        
        return {
            "success": True,
            "audio_url": audio_data["url"],
            "duration": audio_data["duration"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        ) 