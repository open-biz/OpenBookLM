from cerebras.cloud.sdk import Cerebras
from typing import Dict, Any, Optional
import os
import json
import logging

logger = logging.getLogger(__name__)

def get_cerebras_client():
    api_key = os.getenv('CEREBRAS_API_KEY')
    if not api_key:
        raise ValueError("CEREBRAS_API_KEY not found in environment variables")
    return Cerebras(api_key=api_key)

def make_api_call(
    messages: list,
    model: str = "llama-3.1-8b-instant",
    temperature: float = 0.7,
    max_tokens: int = 1000,
    stream: bool = False
) -> Optional[str]:
    """
    Make an API call to Cerebras, following the same pattern as Groq.
    """
    try:
        client = get_cerebras_client()
        response = client.chat.completions.create(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=stream
        )
        
        if stream:
            return response
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"Cerebras API error: {str(e)}")
        return None