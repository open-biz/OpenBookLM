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
import json
from llamaapi import LlamaAPI
from .token_counter import count_tokens
import time

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

def make_api_call(
    llama_client: LlamaAPI,
    messages: list,
    model: str,
    timeout: tuple[int, int] = (10, 30),
    stream: bool = True
) -> str:
    """Make API call with error handling."""
    try:
        api_request = {
            "model": model,
            "messages": messages,
            "stream": stream
        }

        # Use requests directly with timeout and streaming
        response = requests.post(
            "https://api.llama-api.com/chat/completions",
            headers={"Authorization": f"Bearer {llama_client.api_token}"},
            json=api_request,
            timeout=timeout,
            stream=stream
        )

        if response.status_code != 200:
            error_body = None
            try:
                error_body = response.json()
            except Exception:
                error_body = str(response.content)
            raise APIError(response.status_code, error_body)

        if not stream:
            response_json = response.json()
            if not response_json:
                raise APIError(422, "Empty JSON response")

            content = handle_api_response(response_json)
            if not content:
                raise APIError(422, "No valid content in response")
            return content.strip()

        # Process streamed response
        full_content = ""
        try:
            for line in response.iter_lines():
                if not line:
                    continue
                if line == b'data: [DONE]':
                    break

                try:
                    if line.startswith(b'data: '):
                        line = line[6:]
                    json_response = json.loads(line)
                    if content := handle_api_response(json_response):
                        full_content += content
                except json.JSONDecodeError as e:
                    # Log but continue - one bad line shouldn't fail the whole response
                    print(f"Warning: Failed to parse line: {str(e)}")
                    continue

        except requests.Timeout as err:
            raise APIError(524, f"Stream timed out after {timeout[1]} seconds") from err
        except Exception as err:
            # Any other error during streaming is unexpected and should be treated as a server error
            raise APIError(500, f"Stream processing failed: {str(err)}") from err

        if not full_content:
            raise APIError(422, "No valid content in response")

        return full_content.strip()

    except requests.Timeout as err:
        raise APIError(524, f"Request timed out after {timeout[1]} seconds") from err
    except requests.ConnectionError as e:
        raise APIError(503, f"Connection failed: {str(e)}") from e  # Service unavailable
    except requests.RequestException as err:
        if hasattr(err, 'response') and err.response is not None:
            status_code = err.response.status_code
            raise APIError(status_code, err.response.text) from err
        raise APIError(500, str(err)) from err
    except Exception as e:
        if isinstance(e, APIError):
            raise  # Re-raise APIError as is
        # For truly unexpected errors, raise as unknown error
        raise APIError(520, f"Unknown error: {str(e)}") from e

def calculate_timeout(
    token_count: int,
    base_timeout: int = 30,
    connect_timeout: int = 10,
    timeout_per_1k: int = 3
) -> tuple[int, int]:
    """Calculate appropriate timeouts based on token count.

    Args:
        token_count: Number of tokens in the request
        base_timeout: Base timeout for reading response
        connect_timeout: Timeout for establishing connection
        timeout_per_1k: Additional seconds per 1K tokens

    Returns:
        Tuple of (connect_timeout, read_timeout)
    """
    read_timeout = base_timeout + (token_count // 1000) * timeout_per_1k
    return (connect_timeout, read_timeout)

def get_model_context_window(model: str) -> int:
    """Get context window size for model."""
    # Based on testing with tiktoken
    model_windows = {
        "llama3.1-8b": 32_768  # Found via testing
    }
    if model in model_windows.keys():
        return model_windows[model]
    return None

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
