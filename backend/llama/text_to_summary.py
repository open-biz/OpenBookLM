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
from typing import List
import textwrap

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
TOTAL_TOKEN_LIMIT = 32768  # Total tokens per request/response (llama API llama3.1-8b)
DESIRED_OUTPUT_TOKENS = 4096  # Target length of summary including overhead
OVERHEAD_TOKENS = 200  # System prompt, formatting, etc
CHUNK_OVERLAP = 200  # Tokens of overlap between chunks
MAX_INPUT_TOKENS = TOTAL_TOKEN_LIMIT - DESIRED_OUTPUT_TOKENS - OVERHEAD_TOKENS  # Available for input
TARGET_SUMMARY_TOKENS = 3000

# Constants for token management
MAX_TOKENS_PER_CHUNK = TOTAL_TOKEN_LIMIT - CHUNK_OVERLAP - OVERHEAD_TOKENS
CONTEXT_WINDOW = TOTAL_TOKEN_LIMIT
MAX_CONTEXT_USAGE = 0.9

# Paths and environment variables
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(ROOT)

INPUT_DIR = os.path.join(ROOT, "output", "text")
OUTPUT_DIR = os.path.join(ROOT, "output", "summaries")
load_dotenv()
LLAMA_MODEL = os.getenv("LLAMA_MODEL", "llama3.1-8b")
LLAMA_API_KEY = os.getenv('LLAMA_API_KEY')
if not LLAMA_API_KEY:
    raise ValueError("LLAMA_API_KEY not found in environment variables")

# Initialize API client
llama = LlamaAPI(LLAMA_API_KEY)

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


def retry_with_backoff(func):
    """Decorator to retry functions with exponential backoff."""
    def wrapper(*args, **kwargs):
        for attempt in range(MAX_RETRIES):
            try:
                return func(*args, **kwargs)
            except APIError as e:
                e.handle(attempt, MAX_RETRIES)
                if attempt == MAX_RETRIES - 1:
                    raise
            except (TimeoutError, ConnectionError) as e:
                wait_time = 2 * (2 ** attempt)
                if attempt < MAX_RETRIES - 1:
                    print(f"Connection error on attempt {attempt + 1}: {str(e)}")
                    print(f"Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                else:
                    print(f"All {MAX_RETRIES} attempts failed")
                    raise
        return None
    return wrapper


@timeit
@retry_with_backoff
def process_chunk(chunk: str) -> str:
    """Process a single chunk."""
    chunk_tokens = count_tokens(chunk)
    prompt_with_count = prompt_summary.replace("TARGET_TOKENS", str(TARGET_SUMMARY_TOKENS))
    prompt = f"{prompt_with_count}\tText:\n{chunk}\n"
    messages = [{
        "role": "user",
        "content": prompt
    }]

    # Calculate appropriate timeout based on chunk size
    timeout = calculate_timeout(chunk_tokens)
    return make_api_call(
        llama_client=llama,
        messages=messages,
        model=LLAMA_MODEL,
        timeout=timeout
    )


@retry_with_backoff
def combine_summaries(summaries: List[str]) -> str:
    """Combine multiple summaries into one."""
    if not summaries:
        return ""
    if len(summaries) == 1:
        return summaries[0]

    default_prompt = prompt_summary.split('. ')
    default_prompt = '. '.join(default_prompt[1:])
    default_prompt = default_prompt.replace("TARGET_TOKENS", str(TARGET_SUMMARY_TOKENS))
    combined_text = "\n\n".join([f"Part {i+1}:\n{s}" for i, s in enumerate(summaries)])
    prompt = f"Combine these summaries into a single coherent piece. {default_prompt}\tText:\n{combined_text}\n"
    messages = [{
        "role": "user",
        "content": prompt
    }]

    # Calculate appropriate timeout based on total size
    total_tokens = sum(count_tokens(s) for s in summaries)
    timeout = calculate_timeout(total_tokens)

    return make_api_call(
        llama_client=llama,
        messages=messages,
        model=LLAMA_MODEL,
        timeout=timeout
    )


@timeit
def process_chunks_sequential(chunks: List[str]) -> List[str]:
    """Process chunks sequentially with waits between."""
    summaries = []
    for i, chunk in enumerate(chunks, 1):
        print(f"\nProcessing chunk {i}/{len(chunks)}...")
        print(f"Processing chunk of {count_tokens(chunk):,} tokens (max: {int(TOTAL_TOKEN_LIMIT):,})")
        summary = process_chunk(chunk)
        if not summary:
            return None
        summaries.append(summary)
        if i < len(chunks):
            print(f"Waiting {SLEEP_BETWEEN_REQUESTS}s before next chunk...")
            time.sleep(SLEEP_BETWEEN_REQUESTS)
    return summaries


@retry_with_backoff
def get_summary(text: str) -> str:
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

    return make_api_call(
        llama_client=llama,
        messages=messages,
        model=LLAMA_MODEL,
        timeout=timeout
    )


def process_text_document(text: str, output_path: str) -> None:
    """Process a text document and write summary to file."""
    total_tokens = count_tokens(text)
    total_chars = len(text)
    total_words = len(text.split())
    print(f"\nInput tokens: {total_tokens:,}")
    print(f"Estimated cost: ${estimate_token_cost_per_model(LLAMA_MODEL, total_tokens):.4f}")
    print(f"Input length: {total_chars:,} chars ({total_words:,} words)")

    if total_tokens <= MAX_INPUT_TOKENS:
        print("Text fits in single chunk - processing directly")
        print("\nProcessing 1 chunk(s)...")
        final_summary = get_summary(text)
    else:
        chunks = split_text_into_chunks(text)
        if not chunks:
            return

        print(f"\nProcessing {len(chunks)} chunk(s)...")
        summaries = process_chunks_sequential(chunks)
        if not summaries:
            print("No summaries generated")
            return

        final_summary = combine_summaries(summaries)

    if final_summary:
        wrapped_summary = wrap_text_with_indent(final_summary, width=120, indent=4)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w') as f:
            f.write(wrapped_summary)

        summary_chars = len(wrapped_summary)
        summary_words = len(wrapped_summary.split())
        summary_tokens = count_tokens(wrapped_summary)
        print("\nSummary statistics:")
        print(f"Length: {summary_chars:,} chars")
        print(f"Words: {summary_words:,}")
        print(f"Tokens: {summary_tokens:,}")
        print(f"\nSummary written to {output_path}")


def split_text_into_chunks(text: str) -> List[str]:
    """Split text into chunks that fit within token limits."""
    total_tokens = count_tokens(text)
    chunks_needed = math.ceil(total_tokens / MAX_INPUT_TOKENS)
    target_chunk_size = total_tokens // chunks_needed

    print(f"\nSplitting {total_tokens:,} tokens into {chunks_needed} chunks")
    print(f"Target tokens per chunk: {target_chunk_size}")
    print(f"Maximum tokens per chunk: {MAX_INPUT_TOKENS:,}")
    print(f"Target summary tokens: {TARGET_SUMMARY_TOKENS:,}")

    words = text.split()
    total_words = len(words)
    words_per_chunk = math.ceil(total_words / chunks_needed)

    chunks = []
    for idx in range(chunks_needed):
        start_idx = idx * words_per_chunk
        end_idx = min((idx + 1) * words_per_chunk, total_words)
        chunk = " ".join(words[start_idx:end_idx])
        chunks.append(chunk)
        print(f"Chunk {len(chunks)}: {count_tokens(chunk):,} tokens")

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


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Generate summaries from text documents')
    parser.add_argument('--test-api-limits', action='store_true', help='Test API to get actual token limits')
    args = parser.parse_args()
    summarize_full_flow(test_api_limits=args.test_api_limits, verbose=True)
