#!/usr/bin/env python3

"""Text summarization script using LlamaAPI.

This script processes text files and generates summaries using the LlamaAPI.
It can handle large files by splitting them into chunks and then combining the summaries.

Requirements:
    - aiohttp
    - backoff
    - tiktoken
    - python-dotenv
    - requests
"""

# Standard library imports
import os
import sys
import math
import time
import argparse
from typing import List, Dict, Any
import textwrap
import asyncio
import aiofiles
import logging
import functools

# Third-party imports
from dotenv import load_dotenv
from llamaapi import LlamaAPI

# Local imports
from utils.decorators import timeit
from utils.token_counter import count_tokens
from utils.llama_api_token_limits import get_llama_total_token_limit
from utils.llama_api_helpers import (
    estimate_token_cost_per_model,
    APIError,
    make_api_call,
    calculate_timeout
)

# Constants for API request timeout
BASE_TIMEOUT = 30
CONNECT_TIMEOUT = 10  # Time to establish connection
BASE_READ_TIMEOUT = 30  # Base time to wait for response
TIMEOUT_PER_1K_TOKENS = 3  # Additional seconds per 1K tokens
SLEEP_BETWEEN_REQUESTS = 0.2  # Seconds to sleep between API requests
MAX_RETRIES = 3  # Reduced from 5 since we're using smaller chunks

# Token limits
TOTAL_TOKEN_LIMIT = 6000  # Groq's rate limit per minute
DESIRED_OUTPUT_TOKENS = 1000  # Reduced target length
OVERHEAD_TOKENS = 100  # System prompt, formatting, etc
CHUNK_OVERLAP = 100  # Reduced overlap between chunks
MAX_INPUT_TOKENS = TOTAL_TOKEN_LIMIT - DESIRED_OUTPUT_TOKENS - OVERHEAD_TOKENS
TARGET_SUMMARY_TOKENS = 800  # Reduced target summary length

# Constants for token management
MAX_TOKENS_PER_CHUNK = 3000  # Groq's recommended max per request
CONTEXT_WINDOW = 6000  # Match Groq's rate limit
MAX_CONTEXT_USAGE = 0.8  # Reduced to be more conservative

# Paths and environment variables
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(ROOT)

INPUT_DIR = os.path.join(ROOT, "output", "text")
OUTPUT_DIR = os.path.join(ROOT, "output", "summaries")
load_dotenv()
LLAMA_MODEL = os.getenv("LLAMA_MODEL", "llama-3.1-8b-instant")
LLAMA_API_KEY = os.getenv('LLAMA_API_KEY')
if not LLAMA_API_KEY:
    raise ValueError("LLAMA_API_KEY not found in environment variables")

# Constants for API configuration
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")  # Groq model
GROQ_API_KEY = "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"

# Initialize API client
llama = LlamaAPI(GROQ_API_KEY)  # We'll override the endpoint in make_api_call

# Prompt to summarize input text
prompt_summary = """You are a precise summarization assistant. Your task is to create a DETAILED summary of TARGET_TOKENS tokens. \
Your summary MUST be EXACTLY TARGET_TOKENS tokens long. Not shorter, not longer.
 
Instructions:
1. Keep title and author if available
2. Use a conversational tone
3. Include all key points, main arguments, and important details
4. Expand each point with relevant examples and context
5. If your summary is too short, add more details until you reach TARGET_TOKENS tokens
6. Do not include: references, citations, release notes, trademarks, source code, logos, disclaimers, legal notices, or appendices

Required summary length: TARGET_TOKENS tokens. You MUST hit this target.

Text to summarize:
"""  # replace TARGET_TOKENS with actual token count in calling functions

# Add a logger
logger = logging.getLogger(__name__)

# Add status tracking constants
class ProcessingStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"

class ProcessingProgress:
    def __init__(self):
        self.status = ProcessingStatus.PENDING
        self.progress = 0
        self.total_chunks = 0
        self.processed_chunks = 0
        self.current_chunk = 0
        self.error = None

    def update(self, chunk_num: int, total_chunks: int):
        self.current_chunk = chunk_num
        self.total_chunks = total_chunks
        self.processed_chunks = chunk_num
        self.progress = int((chunk_num / total_chunks) * 100)
        self.status = ProcessingStatus.PROCESSING

    def complete(self):
        self.status = ProcessingStatus.COMPLETED
        self.progress = 100

    def set_error(self, error: str):
        self.status = ProcessingStatus.ERROR
        self.error = error

# Global progress tracker
processing_progress = ProcessingProgress()

def retry_with_backoff(func):
    """Decorator to retry async functions with exponential backoff."""
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        for attempt in range(MAX_RETRIES):
            try:
                return await func(*args, **kwargs)
            except APIError as e:
                await e.handle(attempt, MAX_RETRIES)
                if attempt == MAX_RETRIES - 1:
                    raise
            except (TimeoutError, ConnectionError) as e:
                wait_time = 2 * (2 ** attempt)
                if attempt < MAX_RETRIES - 1:
                    logger.warning(f"Connection error on attempt {attempt + 1}: {str(e)}")
                    logger.info(f"Waiting {wait_time} seconds before retry...")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"All {MAX_RETRIES} attempts failed")
                    raise
        return None
    return wrapper


@retry_with_backoff
async def process_chunk(chunk: str) -> str:
    """Process a single chunk."""
    chunk_tokens = count_tokens(chunk)
    if chunk_tokens > MAX_TOKENS_PER_CHUNK:
        logger.warning(f"Chunk size ({chunk_tokens}) exceeds max tokens ({MAX_TOKENS_PER_CHUNK})")
        # Split chunk if needed
        return await split_and_process_chunk(chunk)
        
    prompt_with_count = prompt_summary.replace("TARGET_TOKENS", str(TARGET_SUMMARY_TOKENS))
    prompt = f"{prompt_with_count}\tText:\n{chunk}\n"
    messages = [{
        "role": "user",
        "content": prompt
    }]

    # Calculate appropriate timeout based on chunk size
    timeout = calculate_timeout(chunk_tokens)

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None,
        lambda: make_api_call(
            llama_client=llama,
            messages=messages,
            model=GROQ_MODEL,
            timeout=timeout
        )
    )


@retry_with_backoff
async def combine_summaries(summaries: List[str]) -> str:
    """Combine multiple summaries into one."""
    if not summaries:
        return ""
    if len(summaries) == 1:
        return summaries[0]

    # Check total size before combining
    total_tokens = sum(count_tokens(s) for s in summaries)
    if total_tokens > MAX_TOKENS_PER_CHUNK * 2:
        # If too large, recursively combine smaller groups
        mid = len(summaries) // 2
        first_half = await combine_summaries(summaries[:mid])
        second_half = await combine_summaries(summaries[mid:])
        combined = [first_half, second_half]
    else:
        combined = summaries

    # Create prompt with token limits
    default_prompt = prompt_summary.split('. ')
    default_prompt = '. '.join(default_prompt[1:])
    default_prompt = default_prompt.replace("TARGET_TOKENS", str(TARGET_SUMMARY_TOKENS))
    
    # Format summaries with part numbers but limit size
    combined_parts = []
    current_tokens = count_tokens(default_prompt)
    
    for i, summary in enumerate(combined):
        part_text = f"Part {i+1}:\n{summary}"
        part_tokens = count_tokens(part_text)
        
        # Check if adding this part would exceed limit
        if current_tokens + part_tokens > MAX_TOKENS_PER_CHUNK:
            # If too large, truncate the summary
            available_tokens = MAX_TOKENS_PER_CHUNK - current_tokens - 100  # Buffer
            truncated = truncate_text_to_tokens(summary, available_tokens)
            part_text = f"Part {i+1}:\n{truncated}"
            combined_parts.append(part_text)
            break
        
        combined_parts.append(part_text)
        current_tokens += part_tokens

    combined_text = "\n\n".join(combined_parts)
    prompt = f"Combine these summaries into a single coherent piece. {default_prompt}\tText:\n{combined_text}\n"
    
    messages = [{
        "role": "user",
        "content": prompt
    }]

    # Calculate appropriate timeout based on prompt size
    timeout = calculate_timeout(count_tokens(prompt))

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None,
        lambda: make_api_call(
            llama_client=llama,
            messages=messages,
            model=GROQ_MODEL,  # Use GROQ_MODEL instead of LLAMA_MODEL
            timeout=timeout
        )
    )

def truncate_text_to_tokens(text: str, max_tokens: int) -> str:
    """Truncate text to fit within token limit."""
    if count_tokens(text) <= max_tokens:
        return text
        
    # Split into sentences and add until we hit limit
    sentences = text.split('. ')
    result = []
    current_tokens = 0
    
    for sentence in sentences:
        sentence_tokens = count_tokens(sentence)
        if current_tokens + sentence_tokens > max_tokens:
            break
        result.append(sentence)
        current_tokens += sentence_tokens
        
    return '. '.join(result)


@timeit
async def process_chunks_sequential(chunks: List[str]) -> List[str]:
    """Process chunks sequentially with waits between."""
    summaries = []
    for i, chunk in enumerate(chunks, 1):
        print(f"\nProcessing chunk {i}/{len(chunks)}...")
        print(f"Processing chunk of {count_tokens(chunk):,} tokens (max: {int(TOTAL_TOKEN_LIMIT):,})")
        summary = await process_chunk(chunk)
        if not summary:
            return None
        summaries.append(summary)
        if i < len(chunks):
            print(f"Waiting {SLEEP_BETWEEN_REQUESTS}s before next chunk...")
            await asyncio.sleep(SLEEP_BETWEEN_REQUESTS)
    return summaries


@retry_with_backoff
async def get_summary(text: str) -> str:
    """Get summary from LlamaAPI."""
    default_prompt = prompt_summary.split('. ')
    default_prompt = '. '.join(default_prompt[1:])
    default_prompt = default_prompt.replace("TARGET_TOKENS", str(TARGET_SUMMARY_TOKENS))
    default_prompt += f"{TARGET_SUMMARY_TOKENS}\tText:\n{text}\n"
    messages = [{
        "role": "user",
        "content": default_prompt.strip()
    }]

    # Calculate appropriate timeout based on text size
    total_tokens = count_tokens(text)
    timeout = calculate_timeout(total_tokens)

    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,
        lambda: make_api_call(
            llama_client=llama,
            messages=messages,
            model=LLAMA_MODEL,
            timeout=timeout
        )
    )
    return result


@timeit
async def process_text_document(text: str, output_path: str = None) -> Dict[str, Any]:
    """Process a text document and return status updates."""
    try:
        processing_progress.status = ProcessingStatus.PROCESSING
        chunks = split_text_into_chunks(text)
        processing_progress.total_chunks = len(chunks)
        
        summaries = []
        for i, chunk in enumerate(chunks, 1):
            processing_progress.update(i, len(chunks))
            summary = await process_chunk(chunk)
            if summary:
                summaries.append(summary)
                
        if not summaries:
            error = "No valid summaries generated"
            processing_progress.set_error(error)
            return {
                "status": ProcessingStatus.ERROR,
                "error": error
            }
            
        final_summary = await combine_summaries(summaries)
        
        if output_path:
            async with aiofiles.open(output_path, 'w') as f:
                await f.write(final_summary)
                
        processing_progress.complete()
        return {
            "status": ProcessingStatus.COMPLETED,
            "summary": final_summary,
            "progress": 100
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error processing text: {error_msg}")
        processing_progress.set_error(error_msg)
        return {
            "status": ProcessingStatus.ERROR,
            "error": error_msg,
            "progress": processing_progress.progress
        }

def split_text_into_chunks(text: str) -> List[str]:
    """Split text into chunks that fit within token limits."""
    if not text:
        return []
        
    # First split into paragraphs
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = []
    current_tokens = 0
    
    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue
            
        # Count tokens in this paragraph
        para_tokens = count_tokens(paragraph)
        
        # If paragraph alone exceeds limit, split it
        if para_tokens > MAX_INPUT_TOKENS:
            # If we have a current chunk, add it first
            if current_chunk:
                chunks.append('\n\n'.join(current_chunk))
                current_chunk = []
                current_tokens = 0
            
            # Split paragraph into sentences
            sentences = paragraph.split('. ')
            temp_chunk = []
            temp_tokens = 0
            
            for sentence in sentences:
                sentence = sentence.strip()
                if not sentence:
                    continue
                    
                sent_tokens = count_tokens(sentence)
                
                # If adding this sentence would exceed limit
                if temp_tokens + sent_tokens > MAX_INPUT_TOKENS:
                    # Save current temp chunk if it exists
                    if temp_chunk:
                        chunks.append('. '.join(temp_chunk) + '.')
                        temp_chunk = []
                        temp_tokens = 0
                
                # Add sentence to temp chunk
                temp_chunk.append(sentence)
                temp_tokens += sent_tokens
            
            # Add any remaining sentences
            if temp_chunk:
                chunks.append('. '.join(temp_chunk) + '.')
            
        # If adding this paragraph would exceed limit
        elif current_tokens + para_tokens > MAX_INPUT_TOKENS:
            # Save current chunk and start new one
            chunks.append('\n\n'.join(current_chunk))
            current_chunk = [paragraph]
            current_tokens = para_tokens
            
        # Add paragraph to current chunk
        else:
            current_chunk.append(paragraph)
            current_tokens += para_tokens
    
    # Add final chunk if it exists
    if current_chunk:
        chunks.append('\n\n'.join(current_chunk))
    
    logger.info(f"Split text into {len(chunks)} chunks")
    return chunks


def wrap_text_with_indent(text: str, width: int = 120, indent: int = 4) -> str:
    """Wrap text to specified width with indentation for subsequent lines.

    Args:
        text: Text to wrap
        width: Maximum line width (default: 120)
        indent: Number of spaces to indent continuation lines (default: 4)

    Returns:
        Wrapped text with indented continuation lines
    """
    paragraphs = text.split('\n\n')
    wrapped_paragraphs = []

    for paragraph in paragraphs:
        if not paragraph.strip():
            continue

        lines = textwrap.wrap(paragraph.strip(), width=width)
        if not lines:
            continue

        wrapped_lines = [lines[0]]
        if len(lines) > 1:
            wrapped_lines.extend(' ' * indent + line for line in lines[1:])

        wrapped_paragraphs.append('\n'.join(wrapped_lines))

    return '\n\n'.join(wrapped_paragraphs)


@timeit
def summarize_full_flow(test_api_limits: bool = False, verbose: bool = False):
    """Main entry point."""
    global TOTAL_TOKEN_LIMIT, MAX_INPUT_TOKENS

    if test_api_limits:
        TOTAL_TOKEN_LIMIT = get_llama_total_token_limit(verbose=verbose)
        MAX_INPUT_TOKENS = TOTAL_TOKEN_LIMIT - DESIRED_OUTPUT_TOKENS - OVERHEAD_TOKENS
    else:
        print("\nToken limit calculations:")
        print(f"Total API limit: {TOTAL_TOKEN_LIMIT:,}")
        print(f"Desired output (with overhead): {DESIRED_OUTPUT_TOKENS + OVERHEAD_TOKENS:,}")
        print(f"Available for input: {MAX_INPUT_TOKENS:,}")

    print("\nStarting text summarization...")

    for filename in os.listdir(INPUT_DIR):
        if filename.endswith(".txt"):
            filepath = os.path.join(INPUT_DIR, filename)
            basename = os.path.splitext(filename)[0]  # Remove .txt extension
            output_path = os.path.join(OUTPUT_DIR, f"{basename}.txt")
            with open(filepath, 'r') as f:
                text = f.read()
            process_text_document(text, output_path)


async def split_and_process_chunk(chunk: str) -> str:
    """Split a large chunk into smaller pieces and process them."""
    logger.info(f"Splitting chunk of {count_tokens(chunk)} tokens")
    
    # Split into smaller chunks
    sentences = chunk.split('. ')
    current_chunk = []
    current_tokens = 0
    sub_chunks = []
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        sentence_tokens = count_tokens(sentence)
        
        # If single sentence is too big, split on commas
        if sentence_tokens > MAX_TOKENS_PER_CHUNK:
            sub_sentences = sentence.split(',')
            for sub in sub_sentences:
                sub = sub.strip()
                if not sub:
                    continue
                    
                sub_tokens = count_tokens(sub)
                if current_tokens + sub_tokens > MAX_TOKENS_PER_CHUNK:
                    if current_chunk:
                        sub_chunks.append(' '.join(current_chunk))
                    current_chunk = [sub]
                    current_tokens = sub_tokens
                else:
                    current_chunk.append(sub)
                    current_tokens += sub_tokens
        
        # Otherwise add sentence if it fits
        elif current_tokens + sentence_tokens > MAX_TOKENS_PER_CHUNK:
            if current_chunk:
                sub_chunks.append(' '.join(current_chunk))
            current_chunk = [sentence]
            current_tokens = sentence_tokens
        else:
            current_chunk.append(sentence)
            current_tokens += sentence_tokens
    
    # Add final chunk
    if current_chunk:
        sub_chunks.append(' '.join(current_chunk))
    
    # Process each sub-chunk
    summaries = []
    for sub_chunk in sub_chunks:
        sub_summary = await process_chunk(sub_chunk)
        if sub_summary:
            summaries.append(sub_summary)
    
    # Combine sub-summaries
    if not summaries:
        raise ValueError("No valid summaries generated from sub-chunks")
        
    return await combine_summaries(summaries)


# Add status endpoint
async def get_processing_status() -> Dict[str, Any]:
    """Get current processing status."""
    return {
        "status": processing_progress.status,
        "progress": processing_progress.progress,
        "total_chunks": processing_progress.total_chunks,
        "processed_chunks": processing_progress.processed_chunks,
        "current_chunk": processing_progress.current_chunk,
        "error": processing_progress.error
    }


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Generate summaries from text documents')
    parser.add_argument('--test-api-limits', action='store_true', help='Test API to get actual token limits')
    args = parser.parse_args()
    summarize_full_flow(test_api_limits=args.test_api_limits, verbose=True)
