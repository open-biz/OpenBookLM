from fastapi import FastAPI, HTTPException, APIRouter
from pydantic import BaseModel
from typing import Dict, Any
import os
import sys

# Add project root to Python path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.append(ROOT)

from backend.groq.dialogue_to_audio import convert_dialogue_to_audio, chunk_dialogue, generate_chunk_audio
from backend.groq.utils.llama_api_helpers import make_api_call

router = APIRouter()

class AudioGenerationRequest(BaseModel):
    notebook_id: str
    conversation: Dict[str, Any]

async def generate_audio(notebook_id: str, conversation_config: Dict[str, Any]):
    try:
        # Convert conversation to dialogue format
        dialogue = conversation_config.get('dialogue', '')
        if not dialogue:
            raise ValueError("No dialogue provided in conversation config")

        # Create temporary file for dialogue
        temp_path = f"/tmp/{notebook_id}_dialogue.txt"
        with open(temp_path, 'w') as f:
            f.write(dialogue)

        # Generate audio using dialogue_to_audio
        audio_path = convert_dialogue_to_audio(temp_path)
        if not audio_path:
            raise ValueError("Failed to generate audio")

        # Return audio file URL and duration
        return {
            "url": f"/audio/{os.path.basename(audio_path)}",
            "duration": os.path.getsize(audio_path) / 32000  # Approximate duration
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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