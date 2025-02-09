"""Token counting utilities for LlamaAPI requests."""

from typing import Optional

def count_tokens_fast(text: str) -> int:
    """Estimate token count using 4 chars per token rule.
    This is faster but less accurate than using tiktoken.

    Args:
        text: Input text to count tokens for

    Returns:
        Estimated number of tokens
    """
    return len(text) // 4

def count_tokens_accurate(text: str, model: Optional[str] = None) -> int:
    """Count tokens accurately using tiktoken.
    This is more accurate but slower than the 4 chars rule.

    Args:
        text: Input text to count tokens for
        model: Optional model name to use specific encoding.
              Defaults to cl100k_base (used by LlamaAPI)

    Returns:
        Exact number of tokens
    """
    import tiktoken
    encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text))

def count_tokens(text: str, accurate: bool = True, model: Optional[str] = None) -> int:
    """Count tokens in text using either fast or accurate method.

    Args:
        text: Input text to count tokens for
        accurate: If True, use tiktoken for accurate count.
                 If False, use 4 chars/token estimate.
                 Defaults to True for accuracy.
        model: Optional model name for tiktoken encoding.
               Only used if accurate=True.

    Returns:
        Token count (estimated or exact)
    """
    if accurate:
        return count_tokens_accurate(text, model)
    return count_tokens_fast(text)
