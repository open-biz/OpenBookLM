#!/usr/bin/env python3
"""Convert text summaries to natural dialogue format using LLaMA
Run:
(venv) ./scripts/summary_to_dialogue.py --language [LANGUAGE] [--num_guests [NUM_GUESTS]] [--num_tokens [NUM_TOKENS]] [--debug]
(venv) ./scripts/summary_to_dialogue.py --language Italian --num_guests 3 --num_tokens 1000 --debug
input: ./output/summaries/*.txt
output: ./output/dialogue/*.txt
"""

import os
import sys
import argparse
import time
from dotenv import load_dotenv
from llamaapi import LlamaAPI
import glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(ROOT)

from utils.llama_api_helpers import make_api_call
from utils.decorators import timeit

INPUT_DIR = os.path.join(ROOT, "output", "summaries")
OUTPUT_DIR = os.path.join(ROOT, "output", "dialogue")
os.makedirs(OUTPUT_DIR, exist_ok=True)

load_dotenv()
LLAMA_API_KEY = os.getenv('LLAMA_API_KEY')
if not LLAMA_API_KEY:
    raise ValueError("LLAMA_API_KEY environment variable not set")
llama = LlamaAPI(LLAMA_API_KEY)

DIALOGUE_PROMPT_PATH = os.path.join(ROOT, "backend", "prompts", "multi_lang_guests.txt")
with open(DIALOGUE_PROMPT_PATH, 'r') as f:
    DIALOGUE_PROMPT = f.read().strip()

# LLAMA_MODEL = os.getenv('LLAMA_MODEL', 'llama2-70b')  # Default to 70b if not set
LLAMA_MODEL = os.getenv('LLAMA_MODEL', 'llama3.1-8b')  # Default to 70b if not set

# available languages for llama
LanguageOptions = {
    "English",
    "German",
    "Spanish",
    "French",
    "Hindi",
    "Italian",
    "Japanese",
    "Korean",
    "Polish",
    "Portuguese",
    "Russian",
    "Turkish",
    # simplified Chinese
    "Chinese"
}

def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--num_tokens", type=int, default=1000)
    parser.add_argument("--language", type=str, default="English")
    parser.add_argument("--num_guests", type=int, default=5)
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()
    # Validate arguments and if not errors raised, then return args
    validate_args(args)
    return args


def validate_args(args: argparse.Namespace) -> None:
    """Validate command-line arguments."""
    # Validate num_guests
    if not (1 <= args.num_guests <= 8):
        raise ValueError("Number of guests must be between 1 and 8")

    # Validate language
    if args.language not in LanguageOptions:
        raise ValueError(f"Language {args.language} not supported")

    # Validate num_tokens
    # TODO: support targeted token counts in future from LLaMA API
    if not (100 <= args.num_tokens <= 1000):
        raise ValueError("Number of tokens must be between 100 and 1000")


@timeit
def generate_dialogue(
    summary: str,
    language: str = "English",
    num_guests: int = 1,
    num_tokens: int = 1000,
    debug: bool = False
) -> str:
    """
    Generate natural dialogue using LLaMA model.
    take the system prompt template and the summary as input
    add token parameters to the system prompt
    make an API call to generate the dialogue
    return the generated dialogue
    """

    # TODO: get targeted token output working in the future
    # Calculate token targets for each section
    # intro_tokens = num_tokens // 10
    # main_tokens = num_tokens * 7 // 10  # Reduced to leave room for conclusion
    # conclusion_tokens = num_tokens * 2 // 10  # Increased for better wrap-up

    # Replace template variables in base prompt first
    system_prompt = (DIALOGUE_PROMPT
        .replace("[LANGUAGE]", language)
        .replace("[NUM_GUESTS]", str(num_guests))
        .replace("[SUMMARY]", summary)
        .replace("[NUM_TOKENS]", str(num_tokens))
    )

    # TODO: get targeted token output working in the future
    # token_constraints = f"""\n\nYou must target {num_tokens} for your generated response with
    # approximately {intro_tokens} for the intro, {main_tokens} for the main dialogue,
    # and {conclusion_tokens} for the final wrap-up.\n"""
    # system_prompt += token_constraints

    messages = [
        {
            "role": "system",
            "content": system_prompt
        }
    ]

    try:
        print("Starting API request")
        dialogue = make_api_call(
            llama_client=llama,
            messages=messages,
            model=LLAMA_MODEL,
            timeout=(10, 30),
            stream=False
        )

        if not dialogue:
            print("Error: Empty response from API")
            return ""

        if debug:
            print("\nRaw API Response:")
            print(dialogue)  # Print full response

        return dialogue

    except Exception as e:
        print(f"Error generating dialogue: {str(e)}")
        return ""


@timeit
def generate_dialogues_from_summaries(
    num_guests: int = 1,
    language: str = "English",
    num_tokens: int = 1000,
    debug: bool = False
) -> None:
    """
    Read in all files in summaries folder and generate dialogue for each one.
    """

    # Process each summary file
    for summary_file in glob.glob(os.path.join(INPUT_DIR, "*.txt")):
        try:
            print(f"\nProcessing {summary_file}")

            # Read summary
            with open(summary_file, "r") as f:
                summary = f.read().strip()

            # Generate dialogue
            dialogue = generate_dialogue(
                summary=summary,
                language=language,
                num_guests=num_guests,
                num_tokens=num_tokens,
                debug=debug
            )

            # Write output even if incomplete
            # TODO: add num tokens to filepath once accurate calculations and targets are hit
            basename = os.path.basename(summary_file).split('.')[0]
            output_filename = f"{basename}_{language}_{num_guests}guests.txt"
            output_file = os.path.join(OUTPUT_DIR, output_filename)
            with open(output_file, 'w') as f:
                f.write(dialogue if dialogue else "Error: Failed to generate valid dialogue")

            print(f"Output written to: {output_file}")

        except Exception as e:
            print(f"Error processing {summary_file}: {str(e)}")
            continue

        time.sleep(0.1)

if __name__ == "__main__":
    args = parse_args()

    generate_dialogues_from_summaries(
        args.num_guests,
        args.language,
        args.num_tokens,
        args.debug
    )
