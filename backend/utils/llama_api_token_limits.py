#!/usr/bin/env python3

"""Get maximum token limits for LlamaAPI models.

This script can be used in two ways:

1. Run directly from command line:
   ```
   python llama_api_token_limits.py
   ```
   This will show full debug output including:
   - Test progress for each token amount
   - Binary search steps
   - Final results table showing success/failure for each test
   - Maximum total token limit that worked without failure

2. Import and use in another script:
   ```python
   import os
   import sys
   ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
   sys.path.append(ROOT)

   from backend.utils.llama_api_token_limits import get_llama_total_token_limit

   # Get max token limit silently
   total_limit = get_llama_total_token_limit(verbose=False)

   # Calculate available input tokens based on your needs
   output_tokens = 4000  # Example: targeting 4k output tokens
   input_limit = total_limit - output_tokens
"""

import os
import sys
from typing import Dict, List, Tuple
from dotenv import load_dotenv

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(ROOT)

from backend.utils.decorators import timeit

load_dotenv()
LLAMA_MODEL = os.getenv('LLAMA_MODEL', 'llama-3.1-8b-instant')  # Default to 8b if not set


def get_token_count(text: str) -> int:
    """Get accurate token count using tiktoken."""
    import tiktoken
    encoding = tiktoken.get_encoding("cl100k_base")  # Used by LlamaAPI
    return len(encoding.encode(text))

class TokenPool:
    """Lazy-loaded token pool for testing."""
    def __init__(self):
        self._pool = None
        self._tokens = None

    def _generate_pool(self, max_tokens: int = 2**17) -> str:
        """Generate a pool of tokens that we can slice from."""
        import tiktoken
        import random

        # Use exact same encoding as API
        encoding = tiktoken.get_encoding("cl100k_base")

        # Start with common tokens that we know encode to single tokens
        tokens = []
        common_tokens = list(range(100, 10000))  # Numbers typically encode to single tokens

        while len(tokens) < max_tokens:
            # Add chunks of 1000 tokens at a time
            chunk = random.sample(common_tokens, min(1000, max_tokens - len(tokens)))
            tokens.extend(chunk)

            # Verify token count
            text = encoding.decode(tokens)
            actual_tokens = len(encoding.encode(text))

            if actual_tokens > max_tokens:
                # Remove tokens until we're under the limit
                while actual_tokens > max_tokens:
                    tokens.pop()
                    text = encoding.decode(tokens)
                    actual_tokens = len(encoding.encode(text))
                break

        text = encoding.decode(tokens)
        actual_tokens = len(encoding.encode(text))
        print(f"Generated pool with exactly {actual_tokens:,} tokens")
        return text, tokens

    def get_text(self, target_tokens: int) -> str:
        """Get exactly target_tokens worth of text from the pool."""
        import tiktoken

        # Generate pool if not exists
        if self._pool is None:
            print("Generating token pool...")
            self._pool, tokens = self._generate_pool()
            encoding = tiktoken.get_encoding("cl100k_base")
            self._tokens = encoding.encode(self._pool)
            print(f"Token pool ready: {len(self._tokens):,} tokens")

        # Take exactly target_tokens from pool
        encoding = tiktoken.get_encoding("cl100k_base")
        text = encoding.decode(self._tokens[:target_tokens])

        # Double-check token count
        actual_tokens = len(encoding.encode(text))
        if actual_tokens != target_tokens:
            print("Warning: Token count mismatch in pool slice")
            print(f"  Requested: {target_tokens:,}")
            print(f"  Got: {actual_tokens:,}")

        return text

# Create singleton instance
_token_pool = TokenPool()

def get_test_text(target_tokens: int) -> str:
    """Get exactly target_tokens worth of text from the token pool."""
    return _token_pool.get_text(target_tokens)

def test_api_with_tokens(num_tokens: int, model: str = LLAMA_MODEL) -> Dict:
    """Test API with specified number of tokens."""
    # Import dependencies here so function is self-contained
    import os
    from dotenv import load_dotenv
    from llamaapi import LlamaAPI
    import tiktoken

    # Load API key
    load_dotenv()
    LLAMA_API_KEY = os.getenv('LLAMA_API_KEY')
    if not LLAMA_API_KEY:
        raise ValueError("LLAMA_API_KEY environment variable not set")
    llama = LlamaAPI(LLAMA_API_KEY)

    # Generate exactly (power_of_2 - 200) tokens to leave room for overhead
    target = num_tokens - 200
    test_text = get_test_text(target)

    # Get accurate token counts
    encoding = tiktoken.get_encoding("cl100k_base")
    actual_tokens = len(encoding.encode(test_text))

    # Verify exact match
    assert actual_tokens == target, f"Token mismatch: got {actual_tokens}, expected {target}"

    print(f"\nTesting with {num_tokens:,} tokens...")
    print(f"Generated text length: {len(test_text):,} chars")
    print(f"Text tokens (verified): {actual_tokens:,}")

    system_prompt = "You are a test assistant. Only respond with exactly: ACK [token_count]"
    user_prompt = f"""This text contains {actual_tokens} tokens.
Respond with exactly: ACK {actual_tokens}

Text: {test_text}"""

    # Get accurate token counts for prompts
    system_tokens = len(encoding.encode(system_prompt))
    user_tokens = len(encoding.encode(user_prompt))
    total_prompt_tokens = system_tokens + user_tokens

    print(f"System prompt tokens: {system_tokens:,}")
    print(f"User prompt tokens: {user_tokens:,}")
    print(f"Total prompt tokens: {total_prompt_tokens:,}")

    # Make API request
    print("\nSending request...")
    response = llama.run({
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "stream": False,
        "max_tokens": 10,  # Very small since we expect "ACK [number]"
        "temperature": 0.0,  # Zero temperature for most consistent output
        "top_p": 1.0,
        "model": model
    })

    print("\nResponse received!")
    api_response = response.json()
    print(f"Response JSON: {api_response}")

    # Check for error response
    if isinstance(api_response, list) and len(api_response) == 2 and 'error' in api_response[0]:
        error_msg = api_response[0]['error']
        print(f"\nError response details: {error_msg}")
        return {
            'requested_tokens': num_tokens,
            'actual_tokens': actual_tokens,
            'success': False,
            'error': error_msg,
            'usage': None
        }

    # Extract token usage if available
    usage = api_response.get('usage', {})
    if usage:
        print("\nToken usage:")
        print(f"  Prompt tokens: {usage['prompt_tokens']:,}")
        print(f"  Completion tokens: {usage['completion_tokens']:,}")
        print(f"  Total tokens: {usage['total_tokens']:,}")

        # Compare our count vs API count
        token_diff = usage['prompt_tokens'] - total_prompt_tokens
        if abs(token_diff) > 0:
            print("\nToken count difference:")
            print(f"  Our count: {total_prompt_tokens:,}")
            print(f"  API count: {usage['prompt_tokens']:,}")
            print(f"  Difference: {token_diff:,} tokens")

            # Analyze the token sequences
            our_tokens = encoding.encode(system_prompt + user_prompt)
            print("\nDetailed token analysis:")
            print(f"  System prompt tokens: {system_tokens}")
            print(f"    Tokens: {our_tokens[:system_tokens]}")
            print(f"  User prompt tokens: {user_tokens}")
            print(f"    First 10: {our_tokens[system_tokens:system_tokens+10]}")
            print(f"    Last 10: {our_tokens[-10:]}")

        # Verify the response is exactly what we expect
        if 'choices' in api_response and api_response['choices']:
            content = api_response['choices'][0]['message']['content']
            expected = f"ACK {actual_tokens}"
            if content.strip() != expected:
                print("\nWarning: Unexpected response content:")
                print(f"  Expected: {expected}")
                print(f"  Got: {content}")

    return {
        'requested_tokens': num_tokens,
        'actual_tokens': actual_tokens,
        'success': True,
        'error': None,
        'usage': usage
    }

def find_token_limit(model: str = LLAMA_MODEL) -> Tuple[int, List[Dict]]:
    """Find maximum token limit by testing powers of 2.
    
    Args:
        model: Model name to test (default: llama3.1-8b)
        
    Returns:
        Tuple of (max_tokens, test_results)
        - max_tokens: Maximum total token limit that worked without failure
        - test_results: List of test results for each attempt
    """
    results = []
    STEP_SIZE = 4096

    # Start testing from 4096 tokens
    test_tokens = [
        4096,   # 2^12
        8192,   # 2^13
        16384,  # 2^14
        32768,  # 2^15
        65536,  # 2^16
        131072  # 2^17
    ]

    print("\nTesting powers of 2 to find range:")
    for tokens in test_tokens:
        print(f"{tokens:>6,} tokens (2^{tokens.bit_length()-1})")
    print("\n")

    # Test each power of 2 until we find failure
    last_success = None
    for num_tokens in test_tokens:
        result = test_api_with_tokens(num_tokens, model=model)
        results.append(result)
        if not result['success']:
            # Found upper bound, do binary search between last success and failure
            if last_success is None:
                return 4096, results  # Default to minimum if first test failed

            lower = last_success
            upper = num_tokens
            print(f"\nFound bounds: {lower:,} (success) to {upper:,} (fail)")
            print("Starting binary search...")

            # Binary search in steps of 4096
            while upper - lower > STEP_SIZE:
                # Calculate midpoint as multiple of 4096
                steps = (upper - lower) // STEP_SIZE
                mid = lower + (steps // 2) * STEP_SIZE

                print(f"\nTrying midpoint: {mid:,} tokens")
                result = test_api_with_tokens(mid, model=model)
                results.append(result)

                if result['success']:
                    lower = mid
                else:
                    upper = mid

            return lower, results
        last_success = num_tokens

    return last_success, results

@timeit
def get_llama_total_token_limit(model: str = LLAMA_MODEL, verbose: bool = True) -> int:
    """Find maximum total token limit for LlamaAPI model.

    Args:
        model: Model name to test (default: llama3.1-8b)
        verbose: Whether to print test progress (default: True)

    Returns:
        Maximum total token limit that worked without failure
    """
    import sys
    import io
    if not verbose:
        # Temporarily redirect stdout
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()

    try:
        max_tokens, results = find_token_limit(model=model)

        if verbose:
            # Print results table
            print("\nTest Results Summary:")
            print("Requested | Actual | Status | Error | Usage")
            print("-"*70)
            for result in results:
                status = "Success" if result['success'] else "Failed"
                error = result['error'] if result['error'] else "None"
                usage = result['usage']['total_tokens'] if result['usage'] else "N/A"
                print(f"{result['requested_tokens']:>9,} | {result['actual_tokens']:>7,} | {status:7} | {error:20} | {usage}")

            print(f"\nMaximum total token limit: {max_tokens:,}")
            print("(Use this to calculate your input limit by subtracting desired output tokens and misc/header tokens)")

        return max_tokens
    finally:
        if not verbose:
            # Restore stdout
            sys.stdout = old_stdout

if __name__ == "__main__":

    print("Starting API limit tests...")
    print("Model:", LLAMA_MODEL)
    total_limit = get_llama_total_token_limit(verbose=True)  # Show all debug output
