#!/usr/bin/env python3
"""Convert text summaries to natural dialogue format using LLaMA
Run:
(venv) ./scripts/summary_to_dialogue.py --language [LANGUAGE] [--num_guests [NUM_GUESTS]] [--num_tokens [NUM_TOKENS]] [--debug]
(venv) ./scripts/summary_to_dialogue.py --language Italian --num_guests 3 --num_tokens 1000 --debug
input: ./output/summaries/*.txt
output: ./output/dialogue/*.txt
"""

# Change imports
import os
import sys
import argparse
import time
from dotenv import load_dotenv
from groq import Groq
import glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(ROOT)

from .utils.llama_api_helpers import make_api_call

from .utils.decorators import timeit

INPUT_DIR = os.path.join(ROOT, "output", "summaries")
OUTPUT_DIR = os.path.join(ROOT, "output", "dialogue")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Change API setup
load_dotenv()
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable not set")
groq_client = Groq(api_key=GROQ_API_KEY)

# To this:
DIALOGUE_PROMPT_PATH = os.path.join(ROOT, "prompts", "multi_lang_guests.txt")

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
    """Generate natural dialogue using Groq model."""
    
    # Replace template variables in base prompt
    system_prompt = (DIALOGUE_PROMPT
        .replace("[LANGUAGE]", language)
        .replace("[NUM_GUESTS]", str(num_guests))
        .replace("[SUMMARY]", summary)
        .replace("[NUM_TOKENS]", str(num_tokens))
    )

    try:
        print("Starting Groq API request")
        completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                }
            ],
            model="mixtral-8x7b-32768",
            temperature=0.7,
            max_tokens=num_tokens,
            top_p=1,
            stream=False
        )

        if not completion or not completion.choices:
            print("Error: Empty response from API")
            return ""

        dialogue = completion.choices[0].message.content

        if debug:
            print("\nRaw API Response:")
            print(dialogue)

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
