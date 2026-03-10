from cerebras.cloud.sdk import Cerebras
from typing import List, Tuple
# we may get higher limits ... tbd
# context windows for Cerebras free mode listed
models_and_context_wins = {
    "llama3.1-8b": 8192,  # 32,768 standard context window
    "llama3.3-70b": 8192, # 32,768 standard context window
    # "deepseek-r1-distill-llama-70b": 8192
}


def get_cerebras_client() -> Cerebras:
    import os
    from dotenv import load_dotenv
    from cerebras.cloud.sdk import (
        Cerebras,
        APIConnectionError,
        RateLimitError,
        APIStatusError
    )
    load_dotenv()
    CEREBRAS_API_KEY = os.getenv('CEREBRAS_API_KEY', None)
    if not CEREBRAS_API_KEY:
        raise ValueError("CEREBRAS_API_KEY not found in environment variables")
    try:
        client = Cerebras(api_key=CEREBRAS_API_KEY)
    except APIConnectionError as e:
        raise APIConnectionError(f"APIConnectionError: {str(e)}")
    except RateLimitError as e:
        raise RateLimitError(f"RateLimitError: {str(e)}")
    except APIStatusError as e:
        raise APIStatusError(f"APIStatusError: {str(e)}")
    finally:
        return client


def is_model_rate_limited(
    client: Cerebras,
    model_name: str,
    text: str = "Will I get a 429 error?"
) -> bool:
    """ Test the rate limit for this model
    returns True if the model is rate limited, False otherwise """
    from cerebras.cloud.sdk import (
        APIConnectionError,
        RateLimitError,
        APIStatusError
    )
    try:
        _ = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": text}],
            stream=False
        )
    except RateLimitError as e:
        return True
        # raise RateLimitError(f"Rate limit exceeded: {e}")
    except APIConnectionError as e:
        raise APIConnectionError(f"Connection error: {e}")
    except APIStatusError as e:
        raise APIStatusError(f"API status error: {e}")
    except Exception as e:
        raise Exception(f"An error occurred: {e}")
    finally:
        return False


def select_model(models_and_context_wins: dict) -> str:
    """
    Select a model that is not rate limited
    do quick rate limit test to see if we should change models
    """
    import sys
    if len(models_and_context_wins) == 0:
        sys.exit("No models found")
    for model_name in models_and_context_wins.keys():
        if not is_model_rate_limited(
            client=get_cerebras_client(),
            model_name=model_name
        ):
            print(f'Selected model: {model_name}')
            return model_name

    sys.exit("No model found that is not rate limited")


def digest_input(text_to_summ_fullpath: str) -> str:
    """ Digest the input text """
    import os
    if not os.path.isfile(text_to_summ_fullpath):
        raise FileNotFoundError(f"File not found at {text_to_summ_fullpath}")
    if not os.access(text_to_summ_fullpath, os.R_OK):
        raise PermissionError(f"No read permission for file at {text_to_summ_fullpath}")

    try:
        with open(text_to_summ_fullpath, 'r') as f:
            text_to_summarize = f.read()
        return text_to_summarize
    except IOError:
        raise IOError(f"Error reading file at {text_to_summ_fullpath}")
    except Exception as e:
        raise Exception(e)


def get_max_input_tokens_per_chunk(
    context_window: int = 8192,
    prompt_tokens: int = 250,
    target_tokens_out: int = 500
) -> int:
    """ Get the maximum input tokens per chunk
    The context window includes
    - input (body and prompt(s)) tokens
    - I got 248 tokens for llama3.1 when counting the system and user prompt
    -    for t2s_system.py and t2s_user.py
    - output tokens
    The max input tokens can't are therefore less
    than the model's context window.
    """
    # I haven't seen an API with a context window under 8192, so using as a default
    max_input_tokens = context_window - prompt_tokens - target_tokens_out
    return max_input_tokens


def chunkify_text(
    text: str,
    max_chunk_input_tokens: int
) -> List[Tuple[int, str]]:
    """
    Split the text into chunks respecting the max input tokens per chunk
    Returns
    """
    from ..huggingface.hf_tokenizer import load_tokenizer_from_hf
    tokenizer = load_tokenizer_from_hf()
    if tokenizer is None:
        raise RuntimeError("Failed to load tokenizer")

    try:
        token_ids = tokenizer.encode(text)
    except Exception as e:
        raise Exception(f"A tokenizer.encode error occurred: {e}")

    chunks = []
    for i in range(0, len(token_ids), max_chunk_input_tokens):
        if i == len(token_ids) - 1:
            chunk_ids = token_ids[i:]
        else:
            chunk_ids = token_ids[i : i + max_chunk_input_tokens]

        try:
            chunk_text = tokenizer.decode(chunk_ids, skip_special_tokens=True)
        except Exception as e:
            raise Exception(f"A tokenizer.decode error occurred: {e}")
        chunks.append((count_tokens(chunk_text), chunk_text))
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
    import textwrap
    paragraphs = text.split('\n\n')
    wrapped_paragraphs = []

    for paragraph in paragraphs:
        if not paragraph.strip(): continue

        lines = textwrap.wrap(paragraph.strip(), width=width)
        if not lines: continue

        wrapped_lines = [lines[0]]
        if len(lines) > 1:
            wrapped_lines.extend(' ' * indent + line for line in lines[1:])

        wrapped_paragraphs.append('\n'.join(wrapped_lines))

    return '\n\n'.join(wrapped_paragraphs)


# # FIXME: use or remove
# def split_text_into_chunks(text: str, verbose: bool = False) -> List[str]:
#     """Split text into chunks that fit within token limits."""
#     import math
#     from ..huggingface.hf_tokenizer import count_tokens
#     total_tokens = count_tokens(text)
#     chunks_needed = math.ceil(total_tokens / MAX_CHUNK_INPUT_TOKENS)
#     target_chunk_size = total_tokens // chunks_needed

#     if verbose:
#         print(f"\nSplitting {total_tokens:,} tokens into {chunks_needed} chunks")
#         print(f"Target completion tokens per chunk: {target_chunk_size}")
#         print(f"Max completion tokens per chunk: {MAX_CHUNK_INPUT_TOKENS:,}")

#     words = text.split()
#     words_per_chunk = math.ceil(total_words / chunks_needed) # FIXME: use or remove

#     chunks = []
#     for idx in range(chunks_needed):
#         start_idx = idx * words_per_chunk
#         end_idx = min((idx + 1) * words_per_chunk, total_words)
#         chunk = " ".join(words[start_idx:end_idx])
#         chunks.append(chunk)
#         if verbose:
#             print(f"Chunk {len(chunks)}: {count_tokens(chunk):,} tokens")

#     return chunks
