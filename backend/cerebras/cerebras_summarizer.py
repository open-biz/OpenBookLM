#!/usr/bin/env python3

import os
import sys
from transformers import AutoTokenizer
from cerebras.cloud.sdk import Cerebras
from cerebras.cloud.sdk import (
    APIConnectionError,
    RateLimitError,
    APIStatusError
)
from typing import List
from dotenv import load_dotenv
from collections import OrderedDict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(ROOT)
load_dotenv()


def get_cerebras_client() -> Cerebras | None:
    CEREBRAS_API_KEY = os.getenv('CEREBRAS_API_KEY', None)
    if not CEREBRAS_API_KEY:
        raise ValueError("CEREBRAS_API_KEY not found in environment variables")
    else:
        client = Cerebras(api_key=CEREBRAS_API_KEY)

    return client


def is_model_rate_limited(
    client: Cerebras,
    model_name: str,
    text: str = "Will I get a 429 error?"
) -> bool:
    """ Test the rate limit for this model
    returns True if the model is rate limited, False otherwise """
    try:
        _ = client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "user", "content": text
                }
            ],
            stream=False
        )
    except RateLimitError as e:
        print(f"Rate limit exceeded: {e}")
        return True
    except APIConnectionError as e:
        print(f"Connection error: {e}")
    except APIStatusError as e:
        print(f"API status error: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")

    return False

# for Cerebras free mode
models_and_context_wins = {
    "llama3.1-8b": 8192,  # 32,768 standard context window
    "llama3.3-70b": 8192, # 32,768 standard context window
    # "deepseek-r1-distill-llama-70b": 8192
}

def select_model(models_and_context_wins: dict) -> str | None:
    """
    Select a model that is not rate limited
    do quick rate limit test to see if we should change models
    """
    for model_name in models_and_context_wins.keys():
        if not is_model_rate_limited(
            client = get_cerebras_client(),
            model_name = model_name
        ):
            print(f'Running on {model_name}')
            return model_name
    if not model_name:
        sys.exit("No model found that is not rate limited")
    return None


MODEL_NAME = select_model(models_and_context_wins)
CONTEXT_WINDOW = models_and_context_wins[MODEL_NAME]
PROMPT_TOKENS = 250
TARGET_OUTPUT_TOKENS = 1000
MAX_OUTPUT_TOKENS = int(1.2 * TARGET_OUTPUT_TOKENS)

# Hugging Face same model used for token counting
HUGGING_FACE_MODEL = "meta-llama/Llama-3.1-8B"
HF_TOKEN = os.getenv('HUGGING_FACE_API_KEY', None)
if not HF_TOKEN:
    raise ValueError("HUGGING_FACE_TOKEN not found in environment variables")

OUTPUT_DIR = os.path.join(ROOT, 'backend', 'cerebras')

# Define the sys prompt with a variable value of {TOKENS}
SYS_PROMPT = """
Your generated response must be {NUM_TOKENS} tokens or less.
Tokens counted in the same language as the input text.
Don't use impersonal language like 'this summary' or 'this text'.
Exclude pages numbers, copyright information, legal disclaimers, etc.
Make sure to complete the thought while also generating the right amount of tokens.
"""

USER_PROMPT = """
Generate a summary of this text with at most {NUM_TOKENS} tokens.
Make sure to complete the thought. The text to summarize: {TEXT}
"""


def digest_input(text_to_summ_fullpath: str) -> str:
    """ Digest the input text """
    if not os.path.isfile(text_to_summ_fullpath):
        raise FileNotFoundError(f"File not found at {text_to_summ_fullpath}")
    if not os.access(text_to_summ_fullpath, os.R_OK):
        raise PermissionError(f"No read permission for file at {text_to_summ_fullpath}")

    text_to_summarize = ""
    try:
        with open(text_to_summ_fullpath, 'r') as f:
            text_to_summarize = f.read()
    except FileNotFoundError:
        raise FileNotFoundError(f"File not found at {text_to_summ_fullpath}")
    except IOError:
        raise IOError(f"Error reading file at {text_to_summ_fullpath}")
    except Exception as e:
        raise e
    return text_to_summarize


def input_text_token_count(
    text: str,
) -> int:
    """ See how many tokens the input text takes up """
    try:
        tokenizer = load_tokenizer_from_hf()
        if not tokenizer:
            raise ValueError("Tokenizer access not granted")

        total_tokens = tokenizer.encode(text)
        total_token_count = len(total_tokens)
        return total_token_count
    except Exception as e:
        raise Exception(f"An error occurred: {e}")


def get_max_input_tokens_per_chunk(
    target_tokens_out: int = TARGET_OUTPUT_TOKENS
) -> int:
    """ Get the maximum input tokens per chunk
    The context window includes
    - input (body and prompt(s)) tokens
    - handling tokens
    - output tokens
    The max input tokens can't are therefore less
    than the model's context window.
    """
    max_input_tokens = CONTEXT_WINDOW - PROMPT_TOKENS - target_tokens_out
    return max_input_tokens


def chunkify_text(
    text: str,
    max_input_tokens: int
) -> List[str]:
    """ Split the text into chunks respecting the max input tokens per chunk """
    tokenizer = load_tokenizer_from_hf()
    token_ids = tokenizer.encode(text)
    chunks = []
    for i in range(0, len(token_ids), max_input_tokens):
        if i == len(token_ids) - 1:
            chunk_ids = token_ids[i:]
        else:
            chunk_ids = token_ids[i : i + max_input_tokens]
        chunk_text = tokenizer.decode(chunk_ids, skip_special_tokens=True)
        chunks.append(chunk_text)
    return chunks


def load_tokenizer_from_hf(
    primary_model: str = HUGGING_FACE_MODEL,
    fallback_model: str = "meta-llama/Llama-2-7b"
) -> AutoTokenizer | None:
    """
    The primary model may be gated
    Fallback to secondary model which is publicly available

    # https://huggingface.co/meta-llama/Llama-3.1-8B
    """
    tokenizer = None
    try:
        primary_tokenizer = AutoTokenizer.from_pretrained(primary_model)
        tokenizer = primary_tokenizer
    except OSError as e:
        # Check if it's a 'gated repo' / 403 permission error
        error_str = str(e)
        if "gated repo" in error_str or "403 Client Error" in error_str:
            # you may need to agree to terms / request access
            print(f"Access to the repo '{primary_model}' is gated or forbidden.")
            if fallback_model:
                print(f"Attempting fallback model: '{fallback_model}'...")
                try:
                    tokenizer = AutoTokenizer.from_pretrained(fallback_model)
                    print(f"Successfully loaded fallback tokenizer '{fallback_model}'.")
                    return tokenizer
                except Exception as fallback_exc:
                    print(f"Failed to load fallback model '{fallback_model}'.")
                    print(f"Error: {fallback_exc}")
                    return None
            else:
                print("No fallback model provided. Exiting or return None.")
                return None
        else:
            print(f"OSError occurred while loading '{primary_model}':\n{e}")
            return None

    except Exception as e:
        print(f"An unexpected error occurred while loading '{primary_model}': {str(e)}")
        return None

    return tokenizer


# FIXME: add summary of the summaries
# FIXME: we can just call this recursively if the output is too long
def summarize_all_chunks(
    text: str,
    client: Cerebras,
    max_input_tokens: int,
    max_output_tokens: int,
    debug: bool = False
) -> str:
    """
    Summarize all chunks by creating summary for each chunk
    and then combining them into a single summary

    Args:
        client: Cerebras client
        total_tokens: Total tokens in the text
        total_token_count: Total token count in the text
        max_input_tokens: Maximum input tokens per chunk
        max_output_tokens: Maximum output tokens per chunk
        model_name: Name of the model to use

    Returns:
        str: Summary of the text ~ target_output_tokens ~
    """
    client = get_cerebras_client()

    # Split the text into chunks that fit within the max_input_tokens
    # for the model's context window
    chunks = chunkify_text(text, max_input_tokens)

    idx_tokens_summary_dict = OrderedDict.fromkeys(range(len(chunks)), (0, None))

    tokenizer = load_tokenizer_from_hf()
    if not tokenizer:
        raise ValueError("Failed to load tokenizer")

    for idx, chunk_str in enumerate(chunks):
        # Replace the {TOKENS} variable with the target tokens
        sys_prompt = SYS_PROMPT.format(NUM_TOKENS=TARGET_OUTPUT_TOKENS)
        # Replace the {TEXT} variable with the actual text to summarize
        user_prompt = USER_PROMPT.format(
            TEXT=chunk_str,
            NUM_TOKENS=TARGET_OUTPUT_TOKENS,
        )
        # Combine the sys_prompt and user_prompt
        input_data = [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_prompt},
        ]

        response = None
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=input_data,
                max_completion_tokens=max_output_tokens,
                stream=False, # default is False
                temperature=0.8,
                timeout=3,
            )
        except APIConnectionError as e:
            print(f"APIConnectionError: {str(e)}")
        except RateLimitError as e:
            print(f"RateLimitError: {str(e)}")
        except APIStatusError as e:
            print(f"APIStatusError: {str(e)}")
        except Exception as e:
            print(f"Exception: {str(e)}")

        if response is None:
            print("No response found")
            continue
        elif not response.choices[0].message.content:
            print("No output text found")
            continue

        chunk_summary = response.choices[0].message.content
        tokens_out = len(tokenizer.encode(chunk_summary))

        try:
            if debug:
                print(f'#{idx}: [tokens={tokens_out}] {chunk_summary = }\n')
            idx_tokens_summary_dict[idx] = (tokens_out, chunk_summary)
        except Exception as e:
            print(f"Error accessing output data: {str(e)}")
            continue

    full_response = [
        f"{idx_tokens_summary_dict[idx][1]}\n"
        for idx in range(len(idx_tokens_summary_dict.keys()))
    ]
    if debug:
        print(f'{full_response = }\n')

    return full_response


if __name__ == "__main__":

    text_to_summ_fullpath = os.path.join(
        # ROOT, 'examples_io', 'output', 'text', 'The_Illiad.txt')
        # ROOT, 'examples_io', 'output', 'text', 'The_End_of_Encryption_WP.txt')
        ROOT, 'examples_io', 'output', 'text', 'situational_awareness.txt')

    text_to_summarize = digest_input(text_to_summ_fullpath)
    client = get_cerebras_client()

    max_input_tokens = get_max_input_tokens_per_chunk(
        target_tokens_out=MAX_OUTPUT_TOKENS
    )

    # TODO: add final summary of summaries
    summary = summarize_all_chunks(
        text=text_to_summarize,
        client=client,
        max_input_tokens=max_input_tokens,
        max_output_tokens=MAX_OUTPUT_TOKENS,
        debug=True # prints chunks and full summary
    )


# FIXME: add async

# FIXME: add streaming - see if performance is worse / comp / faster

# FIXME: multiprocessing but save index of summaries so easy to combine

# FIXME: consistent output token lengths
# - now its 500ish but a few at 1200 extended limit

# FIXME: add argparse / specify input / output, debug

# add @timeit / @timeit_async decorators
