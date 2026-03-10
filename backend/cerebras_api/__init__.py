from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Import key functions to expose at package level
from .cerebras_summarizer import (
    get_cerebras_client,
    summarize_all_chunks,
    select_model
)

__all__ = [
    'get_cerebras_client',
    'summarize_all_chunks',
    'select_model'
]