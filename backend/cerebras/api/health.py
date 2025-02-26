from fastapi import APIRouter
from typing import Dict
from backend.cerebras.utils.cerebras_helpers import get_cerebras_client

router = APIRouter()

@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Check Cerebras API health."""
    try:
        client = get_cerebras_client()
        return {"status": "ok", "provider": "cerebras"}
    except Exception as e:
        return {"status": "error", "message": str(e), "provider": "cerebras"}