#!/usr/bin/env python3
""" Run:
(venv) /.../OpenBookLM/ python3 -m backend.cerebras.text_to_summary_cerebras
"""
"""Text summarization script using Cerebras API and llama models.

This script processes text files and generates summaries using Cerebras API to call llama models.
It can handle large files by splitting them into chunks and then combining the summaries.
"""
import os
import sys
import math
from typing import List, Tuple, Dict

from ..utils.decorators import timeit
# FIXME: add timeit_async

from cerebras.cloud.sdk import Cerebras, AsyncCerebras
from cerebras.cloud.sdk import (
    APIConnectionError,
    RateLimitError,
    APIStatusError
)
from collections import OrderedDict
from dotenv import load_dotenv
load_dotenv()

from ..huggingface.hf_tokenizer import count_tokens
from ..prompts.t2s_system import SYSTEM_PROMPT as SYSTEM_PROMPT
from ..prompts.t2s_user import USER_PROMPT as USER_PROMPT
from .cerebras_common import (
    models_and_context_wins,
    select_model,
    digest_input,
    get_cerebras_client,
    get_max_input_tokens_per_chunk,
    chunkify_text,
    wrap_text_with_indent
)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(ROOT)
INPUT_DIR = os.path.join(ROOT, "output", "text")
OUTPUT_DIR = os.path.join(ROOT, "output", "summaries")

MODEL_NAME = select_model(models_and_context_wins)
CONTEXT_WINDOW = models_and_context_wins[MODEL_NAME]
MAX_CHUNK_INPUT_TOKENS = get_max_input_tokens_per_chunk(CONTEXT_WINDOW)

TARGET_OUTPUT_TOKENS = 500
STRICT_MAX_OUTPUT_TOKENS = int(1.3 * TARGET_OUTPUT_TOKENS)


@timeit
def summarize_chunk(chunk_text: str, client: Cerebras) -> str | None:
    """
    Summarize an individual chunk of text
    by calling Cerebras API with text, system prompt, and user prompt
    """
    system_prompt = SYSTEM_PROMPT.format(NUM_TOKENS=TARGET_OUTPUT_TOKENS)
    user_prompt = USER_PROMPT.format(
        TEXT=chunk_text,
        NUM_TOKENS=TARGET_OUTPUT_TOKENS,
    )
    input_data = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    response = None
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=input_data,
            max_completion_tokens=STRICT_MAX_OUTPUT_TOKENS, # buffer above target
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
    elif not response.choices[0].message.content:
        print("No output text generated")

    chunk_summary = response.choices[0].message.content
    tokens_out = count_tokens(chunk_summary)

    return chunk_summary, tokens_out


@timeit
def summarize_all_chunks(
    text: str,
    client: Cerebras,
    debug: bool = False
) -> str:
    """
    Summarize all chunks by creating summary for each chunk
    and then combining them into a single summary

    Returns:
        str: Summary of the text ~ target_output_tokens ~
    """
    # Split the text into chunks that fit within the MAX_CHUNK_INPUT_TOKENS
    # for the model's context window
    chunks = chunkify_text(text, MAX_CHUNK_INPUT_TOKENS)
    n = len(chunks)

    # Base Cases
    if n == 0:
        return ''
    elif n == 1:
        # one-shot (either final case or small text - no need to divide and conquer)
        return summarize_chunk(chunk_text=chunks[0], client=client)[0]

    # TODO: parallel processing (indices will be useful for the indices)
    idx_tokens_summary_dict = OrderedDict.fromkeys(range(n), (0, None))
    for idx, tokens_and_chunk in enumerate(chunks):

        chunk_tokens, chunk_text = tokens_and_chunk
        summary_txt, summary_tokens = summarize_chunk(
            chunk_text=chunk_text,
            client=client
        )

        if debug:
            print(f'#{idx}: [tokens={summary_tokens:,}] chunk_summary\n{summary_txt}\n')

        if not summary_txt:
            print(f'[Error: no summary for chunk {idx}]')
            continue

        idx_tokens_summary_dict[idx] = (summary_tokens, summary_txt)

    concatted_summaries, _ = concat_summaries(list(idx_tokens_summary_dict.values()))

    # recursive call to keep funneling down until one-shot summary occurs
    return summarize_all_chunks(text=concatted_summaries, client=client, debug=debug)


def num_chunks_reqd(num_tokens: int) -> int:
    """ ceiling division for chunks necessary given context window """

    return math.ceil(num_tokens / MAX_CHUNK_INPUT_TOKENS)
    return math.ceil(num_tokens / MAX_CHUNK_INPUT_TOKENS)


def target_tokens_per_chunk(total_tokens: int, num_chunks: int) -> int:
    """ how many tokens should each chunk have for even distribution """
    return math.ceil(total_tokens / num_chunks)


def concat_summaries(summaries: List[int, str]) -> Tuple[int, str]:
    """ output text combining each of the summaries and the token length """
    n = len(summaries)
    concatted = '\n'.join([summaries[x][1] for x in range(n)])
    # account for newline chars with 4 newlines being 1 token
    total_tokens = sum([summaries[x][0] for x in range(n)]) + math.ceil((n-1) / 4)

    return total_tokens, concatted


def create_new_chunk_dict(
    summaries_dict: OrderedDict[int, Tuple[int, str]]
) -> OrderedDict[int, Tuple[int, str]]:
    """ combine summaries and return concatted summaries for api calls """

    n = len(summaries_dict.keys())

    if n == 0:
        raise ValueError("No summaries provided")
    elif n == 1:
        print("Only one summary provided, returning directly")
        return summaries_dict

    output_chunk_dict = OrderedDict()

    # keep track of the culm token count
    index = 0
    batch_token_count = 0
    text_blob = ''
    for i in range(n):
        summ_token_count = summaries_dict[i][0]
        summ_text = summaries_dict[i][1]

        # token gen failed, continue on
        if summ_token_count == 0:
            print(f"Token generation failed for summary {i}, skipping")
            continue

        # under limit, concat and keep going
        elif batch_token_count + summ_token_count < MAX_CHUNK_INPUT_TOKENS:

            batch_token_count += summ_token_count
            text_blob += summ_text

        # final chunk, append and finish
        elif i == n - 1:
            output_chunk_dict[index] = (batch_token_count, text_blob)

        # intermediate chunk, would cause overflow, so append previous blob and start new blob
        else:
        # if batch_token_count + summ_token_count >= MAX_CHUNK_INPUT_TOKENS:
            output_chunk_dict[index] = (batch_token_count, text_blob)

            index += 1
            batch_token_count = summ_token_count
            text_blob = summ_text

    return output_chunk_dict


def inspect_chunk_dict(chunk_dict: OrderedDict[int, Tuple[int, str]]) -> None:
    """
    inspect the chunk dict to ensure validity; expecting:

    summary_dict: Dict[int, Tuple[int, str]] = {
    0: (token_count, summary # 0),
    1: (token_count, summary # 1),
    ...
    N-1: (token_count, summary # N-1),
    """
    for idx, value in chunk_dict.items():
        token_count, text_blob = value
        print(f"Chunk #{idx}: {token_count} tokens")
        print(f'{text_blob}\n')
    print()


if __name__ == "__main__":

    # this is more deliberate than everything in the directory
    text_to_summ_fullpath = os.path.join(
        # ROOT, 'examples_io', 'output', 'text', 'The_Illiad.txt') # need high rate limits
        ROOT, 'examples_io', 'output', 'text', 'situational_awareness.txt')

    text_to_summarize = digest_input(text_to_summ_fullpath)
    cerebras_client = get_cerebras_client()

    # TODO: add final summary of summaries
    summary = summarize_all_chunks(
        text=text_to_summarize,
        client=cerebras_client,
        debug=True # prints chunks and full summary
    )







"""
so with input size size of 100,000 tokens and context win of 8,192 tokens
effective input context window of 7,000 tokens

/ 100,000 \
| ------- |  = 15 chunks required  num_chunks_reqd()
|  7,000  |

/ 100,000 \
| ------- |  = 6667 token target per chunk   target_tokens_per_chunk()
|   15    |

round #0:   0...14 chunk to summary (15 API calls)  summarize_chunk()
                \/
            500 token summary each

<concat>  concat_summaries()

15 summaries @ 500 tokens = 7500 tokens

/ 7,500 \
| ----- |  = 2 chunks required  num_chunks_reqd()
| 7,000 |

/ 7,500 \
| ----- |  = 3750 token target per chunk  target_tokens_per_chunk()
|   2   |

round #1:   0...1 chunk to summary (2 API calls)  summarize_chunk()
                \/
            500 token summary each token summary each

<concat>  concat_summaries()

2 summaries @ 500 tokens = 1000 tokens

/ 1,000 \
| ----- |  = 1 chunk required
| 7,000 |

round #2:   0 chunk to summary (1 API call)  summarize_chunk()
                \/
            500 token [final] summary

done
"""
"""
if API lets us do parallel calls, then each round can be parallelized
but sequential wait necessary for concat between rounds
"""
