#!/usr/bin/env python3

"""
Helper functions to be called by other scripts for tokenization etc.
a file at repo root/backend/script.py needs

import os, sys
from dotenv import load_dotenv
ROOT = os.path.abspath(os.path.dirname(__file__))
sys.path.append(ROOT)
load_dotenv()
from backend.utils.llama_api_helpers import *
"""

from typing import Dict, Any
import requests
from llamaapi import LlamaAPI
from .token_counter import count_tokens
import json
import time
import re

class APIError(Exception):
    """Custom exception for API errors"""
    ERROR_MESSAGES = {
        400: "Bad request - Check if the request format is correct",
        401: "Unauthorized - Check API key",
        403: "Forbidden - Check API permissions",
        404: "Not found - Check if the model exists",
        422: "Invalid request format - Check message structure and content",
        429: "Rate limit exceeded - Too many requests",
        500: "Server error - Try again later",
        503: "Service unavailable - Try again later",
        524: "Request timed out"
    }

    def __init__(self, status_code: int, response_body: str = None):
        self.status_code = status_code
        self.response_body = response_body
        self.message = self.ERROR_MESSAGES.get(status_code, f"Unknown error {status_code}")
        super().__init__(self.message)

    def handle(self,
        attempt_num: int,
        MAX_RETRIES: int = 3
        ) -> None:
        """Handle the error with appropriate waiting strategy."""
        print(f"API Error ({attempt_num + 1}/{MAX_RETRIES}): {self.message}")
        if self.response_body:
            print(f"Response details: {self.response_body}")

        if self.status_code == 429:
            # Rate limit - wait longer
            wait_time = min(30, 2 ** (attempt_num + 2))
            print(f"Rate limited. Waiting {wait_time} seconds...")
        elif self.status_code == 524:
            wait_time = 5
            print(f"Request timed out. Waiting {wait_time} seconds...")
        else:
            wait_time = min(10, 2 ** attempt_num)
            print(f"Waiting {wait_time} seconds before retry...")

        time.sleep(wait_time)

def handle_api_response(response: dict) -> str:
    """Handle API response and extract summary text."""
    if not response:
        print("Warning: Empty response")
        return ""

    # Handle non-dict responses
    if not isinstance(response, dict):
        print(f"Warning: Unexpected response type: {type(response)}, value: {response}")
        return str(response) if response else ""

    # Handle streaming response format
    if 'choices' in response and response['choices']:
        choice = response['choices'][0]
        if 'delta' in choice:
            if 'content' in choice['delta']:
                return choice['delta']['content']
            print(f"Warning: No content in delta: {choice['delta']}")
        elif 'message' in choice:
            if 'content' in choice['message']:
                return choice['message']['content'].strip()
            print(f"Warning: No content in message: {choice['message']}")
        else:
            print(f"Warning: No delta or message in choice: {choice}")
    else:
        print(f"Warning: No choices in response: {response}")

    return ""

def get_api_request_params(system_prompt, target_tokens=4000, temperature=0.8):
    """Get parameters for the API request with better token management."""
    # Count tokens in the prompt
    prompt_tokens = count_tokens(system_prompt)

    # Calculate the target completion tokens, accounting for prompt overhead
    # Add a 20% buffer to avoid early cutoffs
    completion_buffer = int(target_tokens * 0.2)
    max_tokens = target_tokens + completion_buffer

    # Adjust temperature based on target length
    # Lower temperature for longer outputs to maintain coherence
    adjusted_temp = max(0.6, min(0.8, temperature - (target_tokens / 10000)))

    # Set minimum_length to 90% of target to ensure we get close
    min_length = int(target_tokens * 0.9)

    return {
        'model': 'llama3.1-8b',
        'messages': [{'role': 'system', 'content': system_prompt}],
        'stream': False,
        'temperature': adjusted_temp,
        'top_p': 0.95,
        'max_tokens': max_tokens,
        'min_tokens': min_length,  # Add minimum length requirement
        'presence_penalty': 0.2,   # Encourage diverse content
        'frequency_penalty': 0.2,  # Discourage repetition
    }

def make_api_call(
    llama_client: LlamaAPI,
    api_params: dict,
    debug: bool = False
) -> str:
    """Make API call with error handling and retries."""
    max_retries = 3
    retry_delay = 2
    last_error = None

    for attempt in range(max_retries):
        try:
            if attempt > 0:
                print(f"Retrying API call (attempt {attempt + 1}/{max_retries})")
                time.sleep(retry_delay)

            if debug:
                print(f"API request parameters: {api_params}")

            response = llama_client.run(api_params)
            
            if debug:
                print(f"Response status: {response.status_code}")
                print(f"Response headers: {dict(response.headers)}")
                print(f"Response text length: {len(response.text)}")
                print(f"Response content (first 200 chars): {response.text[:200]}")

            if response.status_code != 200:
                error_msg = f"API Error (status {response.status_code})"
                try:
                    error_msg += f": {response.json()}"
                except:
                    error_msg += f": {response.text}"
                raise APIError(response.status_code, error_msg)

            try:
                response_data = response.json()
                if debug:
                    print("Response data:", {k: v for k, v in response_data.items() if k != 'choices'})
                
                content = response_data['choices'][0]['message']['content']
                return clean_dialogue_output(content)

            except json.JSONDecodeError as e:
                if attempt < max_retries - 1:
                    continue
                raise APIError(520, f"Failed to parse response: {str(e)}")

        except Exception as e:
            last_error = e
            if isinstance(e, APIError):
                raise
            if attempt < max_retries - 1:
                continue
            raise APIError(520, f"Unknown error: {str(e)}")

    raise APIError(520, f"All {max_retries} attempts failed. Last error: {str(last_error)}")

def clean_dialogue_output(content: str) -> str:
    """Clean and validate dialogue output."""
    if not content:
        return ""

    # Remove any leading/trailing whitespace
    content = content.strip()

    # Fix common formatting issues
    lines = []
    current_line = []
    speaker_pattern = re.compile(r'^\[\d+:\s*(?:Host|Guest):\s*[^]]+\]')
    
    for line in content.split('\n'):
        line = line.strip()
        if not line:
            continue
            
        # Check if this is a new speaker line
        if speaker_pattern.match(line):
            # If we have a pending line, add it
            if current_line:
                lines.append(' '.join(current_line))
                current_line = []
            current_line.append(line)
        else:
            # Continue previous line
            current_line.append(line)
    
    # Add any remaining line
    if current_line:
        lines.append(' '.join(current_line))

    # Join lines with proper spacing
    content = '\n'.join(lines)

    # Validate basic dialogue structure
    if not re.search(r'^\[\d+:', content):  # Should start with a speaker tag
        return ""
        
    if not re.search(r'\[\d+:\s*(?:Host|Guest):\s*[^]]+\]', content):  # Should have proper speaker format
        return ""

    return content

def calculate_timeout(
    token_count: int,
    base_timeout: int = 30,  # Increased base timeout
    tokens_per_second: float = 20,  # Conservative estimate
    min_timeout: int = 20,  # Increased minimum
    max_timeout: int = 300  # Allow up to 5 minutes for very long outputs
) -> tuple[int, int]:
    """Calculate appropriate timeout values based on expected token count."""
    # Calculate estimated processing time
    estimated_seconds = (token_count / tokens_per_second) + base_timeout
    
    # Add buffer for network latency and processing
    connect_timeout = min(30, max(10, int(estimated_seconds * 0.2)))
    read_timeout = min(max_timeout, max(min_timeout, int(estimated_seconds * 1.5)))
    
    return (connect_timeout, read_timeout)

def get_model_context_window(model: str) -> int:
    """Get context window size for a model."""
    # Default context windows for known models
    context_windows = {
        'llama3.1-8b': 4096,
        'llama3.1-70b': 4096,
        'llama3.1-7b': 4096,
        'llama3.1-13b': 4096,
        'llama3.1-34b': 4096,
        'llama3.2-70b': 8192,
        'llama3.2-7b': 8192,
        'llama3.2-13b': 8192,
        'llama3.2-34b': 8192
    }
    return context_windows.get(model, 4096)  # Default to 4096 if model not found

def estimate_token_cost_per_model(
    model_name: str = "llama3.1-8b",
    num_tokens: int = None,
    prompt_tokens: int = None,
    completion_tokens: int = None
    ) -> float:
    """
    Get the cost per 1K tokens for a model, or calculate total cost for given tokens.

    Args:
        model_name: Name of the model to get pricing for
        num_tokens: Optional number of tokens to calculate total cost for
        prompt_tokens: Optional number of prompt tokens to calculate total cost for
        completion_tokens: Optional number of completion tokens to calculate total cost for

    Returns:
        If num_tokens is None: Cost per 1K tokens in USD
        If num_tokens is provided: Total estimated cost in USD
    """
    # Current pricing from docs 01-26-2025

    # Model pricing per 1K tokens
    MODEL_PRICING_1K_TOKENS = {
        # Meta models
        "llama3.2-11b-vision": 0.0004,
        "llama3.2-1b": 0.0004,
        "llama3.2-3b": 0.0004,
        "llama3.2-90b-vision": 0.0028,
        "llama3.1-405b": 0.003596,
        "llama3.1-70b": 0.0028,
        "llama3.1-8b": 0.0004,
        "llama3-70b": 0.0028,
        "llama3-8b": 0.0004,
        "llama3.3-70b": 0.0028,
        "llama-7b-32k": 0.0028,
        "llama2-13b": 0.0016,
        "llama2-70b": 0.0028,
        "llama2-7b": 0.0016,

        # Google models
        "gemma2-27b": 0.0016,
        "gemma2-9b": 0.0004,

        # Mistral models
        "mixtral-8x22b": 0.0028,
        "mixtral-8x22b-instruct": 0.0028,
        "mixtral-8x7b-instruct": 0.0028,
        "mistral-7b": 0.0004,
        "mistral-7b-instruct": 0.0004,
        "Nous-Hermes-2-Mixtral-8x7B-DPO": 0.0004,

        # Custom models
        "deepseek-r1": 0.009,
        "deepseek-v3": 0.0028,
        "Nous-Hermes-2-Yi-34B": 0.0028,
        "Qwen1.5-0.5B-Chat": 0.0004,
        "Qwen1.5-1.8B-Chat": 0.0004,
        "Qwen1.5-110B-Chat": 0.0028,
        "Qwen1.5-14B-Chat": 0.0016,
        "Qwen1.5-32B-Chat": 0.0028,
        "Qwen1.5-4B-Chat": 0.0004,
        "Qwen1.5-72B-Chat": 0.0028,
        "Qwen1.5-7B-Chat": 0.0004,
        "Qwen2-72B-Instruct": 0.0028,
    }

    try:
        if model_name not in MODEL_PRICING_1K_TOKENS:
            print(f"Error: Unknown model name: {model_name}")
            return 0.0  # Unknown model

        cost_per_1k_tokens = MODEL_PRICING_1K_TOKENS[model_name]
        if prompt_tokens is not None and completion_tokens is not None:
            prompt_cost = (prompt_tokens / 1000.0) * cost_per_1k_tokens
            completion_cost = (completion_tokens / 1000.0) * cost_per_1k_tokens
            return prompt_cost + completion_cost

        if num_tokens is None:
            return cost_per_1k_tokens

        return (num_tokens / 1000) * cost_per_1k_tokens

    except Exception as e:
        print(f"Error calculating cost: {str(e)}")
        return 0.0

def estimate_tokens(text: str, accurate: bool = False) -> int:
    """Estimate token count for text.

    Args:
        text: Input text to count tokens for
        accurate: If True, use tiktoken for accurate count.
                 If False, use 4 chars/token estimate.

    Returns:
        Estimated token count
    """
    return count_tokens(text, accurate=accurate)

def validate_request(request: Dict[str, Any], model: str = "llama3.1-8b") -> None:
    """Validate API request parameters and content.

    Args:
        request: API request dictionary
        model: Model name to validate against

    Raises:
        APIError: If request is invalid
    """
    if "model" not in request:
        raise APIError(422, "Request must include 'model' field")

    if "messages" not in request:
        raise APIError(422, "Request must include 'messages' field")

    if not isinstance(request["messages"], list):
        raise APIError(422, "Messages must be a list")

    for msg in request["messages"]:
        if not isinstance(msg, dict):
            raise APIError(422, "Each message must be a dictionary")

        if "role" not in msg:
            raise APIError(422, "Each message must have a 'role' field")

        if "content" not in msg:
            raise APIError(422, "Each message must have a 'content' field")

    # Get context window for model
    context_window = get_model_context_window(model)

    # Count total tokens in messages
    total_tokens = 0
    for msg in request["messages"]:
        total_tokens += estimate_tokens(msg["content"])

    # Add 10% buffer for encoding overhead
    total_tokens = int(total_tokens * 1.1)

    if total_tokens > context_window:
        raise APIError(400, f"Total tokens ({total_tokens:,}) exceeds context window ({context_window:,}) for model {model}")

if __name__ == "__main__":
    # Example usage
    model_name = "llama3.1-8b"
    context_window = get_model_context_window(model_name)
    print(f"Context window for {model_name}: {context_window} tokens")

    cost_per_1k = estimate_token_cost_per_model(model_name)
    print(f"Cost per 1K tokens for {model_name}: ${cost_per_1k}")

    # Example cost calculation
    tokens = 10000
    total_cost = estimate_token_cost_per_model(model_name, num_tokens=tokens)
    print(f"Cost for {tokens} tokens: ${total_cost:.4f}")
