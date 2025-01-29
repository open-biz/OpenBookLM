#!/usr/bin/env python3
"""Convert text summaries to natural dialogue format using LLaMA 70B."""

import os
import sys
import re
import argparse
import random
import requests
from typing import Tuple
from dotenv import load_dotenv
from llamaapi import LlamaAPI
import textwrap
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(ROOT)

INPUT_DIR = os.path.join(ROOT, "output", "summaries")
OUTPUT_DIR = os.path.join(ROOT, "output", "dialogue")
os.makedirs(OUTPUT_DIR, exist_ok=True)

load_dotenv()
from backend.utils.decorators import timeit
from utils.llama_api_helpers import make_api_call, APIError, calculate_timeout, estimate_tokens, get_model_context_window

LLAMA_API_KEY = os.getenv('LLAMA_API_KEY')
if not LLAMA_API_KEY:
    raise ValueError("LLAMA_API_KEY environment variable not set")
llama = LlamaAPI(LLAMA_API_KEY)

DIALOGUE_PROMPT_PATH = os.path.join(ROOT, "backend", "prompts", "multi_lang_guests.txt")
with open(DIALOGUE_PROMPT_PATH, 'r') as f:
    SYSTEM_PROMPT = f.read().strip()

# LLAMA_MODEL = os.getenv('LLAMA_MODEL', 'llama3.1-8b')
LLAMA_MODEL = 'llama2-70b'
MIN_TOKENS = 50
MAX_TOKENS = 3000

# TODO: up to 9 characters on the podcast
# top podcasts have a host, so allocate 1 host and up to 8 guests

# these are all supported by suno-bark
LanguageOptions = {
    "en": "English",
    "de": "German",
    "es": "Spanish",
    "fr": "French",
    "hi": "Hindi",
    "it": "Italian",
    "ja": "Japanese",
    "ko": "Korean",
    "pl": "Polish",
    "pt": "Portuguese",
    "ru": "Russian",
    "tr": "Turkish",
    # simplified Chinese
    "zh": "Chinese"
}


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--num_guests", type=int, default=1, help="Number of guests on the podcast 0-8")
    parser.add_argument("--language", type=str, default="English", choices=LanguageOptions.values(), help="Language code")
    parser.add_argument("--num_tokens", type=int, default=1000, help="Target number of tokens for output dialogue")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    args = parser.parse_args()
    return args


def validate_args(args: argparse.Namespace) -> Tuple[str, int, int]:
    """
    Validate command line arguments
    Exception is raised if the arguments are invalid
    otherwise return the validated arguments
    """
    language, num_guests, num_tokens = None, None, None

    if args.language in LanguageOptions.values():
        language = args.language
    elif args.language in LanguageOptions.keys():
        language = LanguageOptions[args.language]
    else:
        raise ValueError(f"Invalid language: {args.language}")
    # up to 9 people on the podcast with 1 host (and 0 to 8 guests)
    if not (0 <= args.num_guests <= 8):
        raise ValueError(f"Invalid number of guests: {args.num_guests}")
    if not (MIN_TOKENS <= args.num_tokens <= MAX_TOKENS):
        raise ValueError(f"Invalid number of tokens: {args.num_tokens}")

    num_guests = args.num_guests
    num_tokens = args.num_tokens

    return language, num_guests, num_tokens


def clean_text(text: str) -> str:
    """Clean text of unwanted patterns and normalize spacing."""
    # Remove unwanted patterns like table markers, version numbers, etc.
    patterns = [
        r'Table of Contents',
        r'Chapter \d+',
        r'\|\s*\d+\s*\|',
        r'^\d+\s*$',
        r'v\d+\.\d+',
        r'[A-Z]{2,}(?:\s+[A-Z]{2,})+',
        r'_+',
        r'\.{2,}'
    ]
    for pattern in patterns:
        text = re.sub(pattern, '', text)

    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\s*\n\s*', '\n', text)

    return text.strip()


def create_messages(summary_text: str, num_tokens: int, language: str, num_guests: int) -> list:
    """Create messages for the API request."""
    # Read and format the system prompt
    prompt_path = os.path.join(ROOT, "backend", "prompts", "multi_lang_guests.txt")
    with open(prompt_path, 'r', encoding='utf-8') as f:
        system_prompt = f.read().strip()

    # Replace placeholders
    system_prompt = (
        system_prompt
        .replace("[LANGUAGE]", language)
        .replace("[NUM_GUESTS]", str(num_guests))
        .replace("[NUM_TOKENS]", str(num_tokens))
        .replace("[SUMMARY]", summary_text)
    )

    # Add length requirement as a separate user message
    length_requirement = f"""
IMPORTANT LENGTH REQUIREMENT:
- Your response MUST be approximately {num_tokens} tokens in length
- This is a strict requirement - do not stop early
- Ensure thorough discussion of all topics in the summary
- Include detailed dialogue and interactions between participants
- Maintain natural conversation flow while reaching the target length
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": length_requirement}
    ]

    if args.debug:
        print(f"Prompt length: {len(system_prompt)} chars")

    return messages

def get_api_request_params(messages, target_tokens):
    """Get optimized API parameters for LLaMA model."""
    # Calculate token overhead from prompt
    prompt_tokens = estimate_tokens(messages[0]["content"])

    # Calculate max tokens needed, accounting for prompt overhead
    max_tokens = min(
        int(target_tokens * 1.1),  # Allow 10% buffer
        get_model_context_window(LLAMA_MODEL) - prompt_tokens
    )
    min_tokens = int(target_tokens * 0.9)  # Allow 10% under

    # Adjust temperature based on target length
    adjusted_temp = 0.7 + (target_tokens / 10000)  # Slightly higher temp for longer outputs

    return {
        "model": LLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "temperature": adjusted_temp,
        "top_p": 0.95,
        "max_tokens": max_tokens,
        "min_tokens": min_tokens,
        "presence_penalty": 0.2,
        "frequency_penalty": 0.2,
        "timeout": calculate_timeout(max_tokens)
    }

def generate_dialogue(llama, summary_text, num_tokens, language, num_guests, debug=False):
    """Generate dialogue using LLaMA model."""
    try:
        # Create messages for API request
        messages = create_messages(summary_text, num_tokens, language, num_guests)

        # Get API parameters
        api_params = get_api_request_params(messages, target_tokens=num_tokens)

        if debug:
            print(f"API request parameters: {api_params}")

        start_time = time.time()
        dialogue = make_api_call(llama_client=llama, api_params=api_params, debug=debug)

        if debug:
            print(f"Generation took {time.time() - start_time:.1f}s")

        return dialogue

    except Exception as e:
        print(f"Error generating dialogue: {str(e)}")
        raise e

def generate_dialogue_script(
    summary_path: str,
    language: str = "English",
    num_guests: int = 1,
    num_tokens: int = 500,
    debug: bool = False
) -> str:
    """Generate dialogue script from summary file."""
    # Read and clean summary
    with open(summary_path, 'r') as f:
        summary = clean_text(f.read())

    # Generate dialogue using llama model
    dialogue = generate_dialogue(
        llama,
        summary,
        num_tokens,
        language,
        num_guests,
        debug
    )

    # Count tokens in the generated dialogue
    actual_tokens = estimate_tokens(dialogue, accurate=True)

    if debug:
        print(f"Tokens requested: {num_tokens}, actual tokens: {actual_tokens}")

    filename = os.path.basename(summary_path)
    # get the language abbreviation from the LanguageOptions enum
    # 'en' for English, 'de' for German, etc.
    lang_short = None
    for key, value in LanguageOptions.items():
        if value == language:
            lang_short = key
            break

    # example:
    # output/summaries/The_Power_of_Habit.txt
    # output/dialogue/The_Power_of_Habit_en_1h_1g_2000tk.txt
    fname = filename.split('.')[0]
    output_filepath = os.path.join(OUTPUT_DIR, f'{fname}_{lang_short}_1h_{num_guests}g_{num_tokens}tk.txt')
    dialogue_wrapped = wrap_text_with_indent(dialogue)
    with open(output_filepath, 'w') as f:
        f.write(dialogue_wrapped)

    print(f"Generated dialogue saved to:\n\t{output_filepath}")
    print(f"Tokens requested: {num_tokens}, actual tokens: {actual_tokens}\n")

    return dialogue


def wrap_text_with_indent(text: str, width: int = 120, indent: int = 4) -> str:
    """Wrap text to specified width with indentation for subsequent lines.

    Args:
        text: Text to wrap
        width: Maximum line width (default: 120)
        indent: Number of spaces to indent continuation lines (default: 4)

    Returns:
        Wrapped text with indented continuation lines
    """
    wrapped_lines = []
    paragraphs = text.split('\n\n')

    for paragraph in paragraphs:
        if not paragraph.strip():
            wrapped_lines.append('')
            continue

        # Check if this is a dialogue line (starts with '[')
        if paragraph.strip().startswith('['):
            # For dialogue lines, preserve the speaker tag and wrap the content
            speaker_end = paragraph.find(']: ')
            if speaker_end != -1:
                speaker = paragraph[:speaker_end + 2]
                content = paragraph[speaker_end + 2:].strip()

                # Wrap the content with no indent for first line, indent for subsequent lines
                wrapped_content = textwrap.fill(
                    content,
                    width=width,
                    initial_indent='',
                    subsequent_indent=' ' * indent
                )
                wrapped_lines.append(f"{speaker} {wrapped_content}")
            else:
                # If no proper dialogue format, wrap normally
                wrapped_lines.append(textwrap.fill(
                    paragraph,
                    width=width,
                    initial_indent='',
                    subsequent_indent=' ' * indent
                ))
        else:
            # For non-dialogue lines, wrap normally
            wrapped_lines.append(textwrap.fill(
                paragraph,
                width=width,
                initial_indent='',
                subsequent_indent=' ' * indent
            ))

    wrapped_text = '\n\n'.join(wrapped_lines)
    wrapped_text += '\n'

    return wrapped_text


@timeit
def process_summary_files(
    language: str = "English",
    num_guests: int = 1,
    num_tokens: int = 500,
    debug: bool = False
) -> None:
    """Process all summary files to create dialogue scripts."""

    for filename in os.listdir(INPUT_DIR):
        if filename.endswith('.txt'):
            summary_path = os.path.join(INPUT_DIR, filename)
            try:
                generate_dialogue_script(
                    summary_path,
                    language,
                    num_guests,
                    num_tokens,
                    debug
                )
            except Exception as e:
                print(f"Error processing {os.path.join(INPUT_DIR, filename)}: {str(e)}")


if __name__ == "__main__":
    args = parse_args()
    debug = args.debug
    language, num_guests, num_tokens = validate_args(args)

    print(f"Input arguments:\n\t{language = }\n\t{num_guests = }\n\t{num_tokens = }\n\t{debug = }\n")

    process_summary_files(language, num_guests, num_tokens, debug)
