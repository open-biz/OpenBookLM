from fastapi import APIRouter
from typing import Dict
from groq import Groq
import os

router = APIRouter()

@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Check Groq API health."""
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        # Simple API test
        client.chat.completions.create(
            messages=[{"role": "user", "content": "test"}],
            model="mixtral-8x7b-32768",
            max_tokens=1
        )
        return {"status": "ok", "provider": "groq"}
    except Exception as e:
        return {"status": "error", "message": str(e), "provider": "groq"}