#!/usr/bin/env python3
"""Convert text summaries to natural dialogue format using LLaMA 70B."""

import os
import sys
import time
import argparse
from dotenv import load_dotenv
from llamaapi import LlamaAPI
import textwrap
import time
import re
import requests
import glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(ROOT)

from utils.llama_api_helpers import make_api_call

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

LLAMA_MODEL = os.getenv('LLAMA_MODEL', 'llama2-70b')  # Default to 70b if not set

def clean_dialogue_output(content: str) -> str:
    """Clean and validate dialogue output."""
    if not content:
        return ""

    # Remove any trailing whitespace and normalize line endings
    content = content.strip().replace('\r\n', '\n')

    # Split into lines and process each line
    lines = content.split('\n')
    valid_lines = []

    # Process title line
    if not lines:
        return ""

    title_line = lines[0].strip()
    if not title_line.startswith('TITLE:'):
        # Try to fix title line if it starts with **
        if title_line.startswith('**') and title_line.endswith('**'):
            title = title_line[2:-2].strip()
            valid_lines.append(f"TITLE: {title}")
        else:
            print("Error: First line must start with 'TITLE:'")
            return ""
    else:
        valid_lines.append(title_line)

    # Add blank line after title
    valid_lines.append("")

    # Track guest names and their assigned numbers
    guest_numbers = {}  # name -> number
    next_guest_num = 1

    # Process dialogue lines
    last_speaker = None
    for line in lines[1:]:
        line = line.strip()
        if not line:
            continue

        # Check if it's a dialogue line
        match = re.match(r'^\[(\d+): (Host|Guest): ([^]]+)\]:', line)
        if match:
            line_num = int(match.group(1))
            role = match.group(2)
            name = match.group(3).strip()

            # Extract the dialogue content
            parts = line.split(':', 2)  # Split on first two colons
            if len(parts) < 3:
                print(f"Error: Could not extract dialogue from line - {line}")
                continue

            # Get everything after the second colon
            dialogue = parts[2].strip()

            # If dialogue contains the speaker's name again, remove it
            name_pattern = re.escape(name) + r'\]:'
            dialogue = re.sub(name_pattern, '', dialogue).strip()

            if role == "Guest":
                # Assign consistent number to each unique guest
                if name not in guest_numbers:
                    if next_guest_num > 5:  # Max 5 guests
                        print(f"Error: Too many guests ({next_guest_num})")
                        continue
                    guest_numbers[name] = next_guest_num
                    next_guest_num += 1
                line_num = guest_numbers[name]  # Use assigned guest number
            else:
                # Host is always 0
                line_num = 0

            # Check for incomplete response
            if len(dialogue) < 5 or dialogue.endswith((':', '-')):
                print(f"Warning: Potentially incomplete dialogue: {dialogue}")
                continue

            # Track last speaker to detect duplicate responses
            current_speaker = f"{role}:{name}"
            if current_speaker == last_speaker:
                print(f"Warning: Duplicate speaker {current_speaker}, skipping line")
                continue
            last_speaker = current_speaker

            # Format speaker tag
            speaker_tag = f"[{line_num}: {role}: {name}]:"

            # Wrap text to 120 chars
            wrapped_lines = textwrap.wrap(dialogue, width=120-4)  # Account for 4-space indent
            if not wrapped_lines:
                continue

            # First line with speaker tag
            formatted_lines = [f"{speaker_tag} {wrapped_lines[0]}"]
            # Subsequent lines indented with exactly 4 spaces
            if len(wrapped_lines) > 1:
                formatted_lines.extend(["    " + line for line in wrapped_lines[1:]])

            # Add blank line between speakers
            if valid_lines and valid_lines[-1]:  # If last line is not empty
                valid_lines.append("")
            valid_lines.extend(formatted_lines)

        else:
            # Skip non-dialogue lines
            continue

    if len(valid_lines) < 2:  # Need at least title and one dialogue line
        print("Error: Not enough valid dialogue lines")
        return ""

    # Ensure file ends with newline
    valid_lines.append("")

    # Join lines
    return '\n'.join(valid_lines)

# def make_api_call(llama_client, messages, model, max_tokens, debug=False):
#     try:
#         start_time = time.time()
#         if debug:
#             print("Starting API request")

#         response = requests.post(
#             "https://api.llama-api.com/chat/completions",
#             headers={"Authorization": f"Bearer {llama_client.api_token}"},
#             json={
#                 "model": model,
#                 "messages": messages,
#                 "max_tokens": max_tokens
#             }
#         )

#         if debug:
#             print(f"API request took {time.time() - start_time:.1f}s")

#         if response.status_code != 200:
#             raise Exception(response.text)

#         json_response = response.json()
#         if 'choices' not in json_response:
#             raise ValueError(f"Unexpected response format: {json_response}")

#         content = json_response['choices'][0]['message']['content']
#         if not content:
#             raise ValueError("Empty response from API")

#         return content

#     except Exception as e:
#         raise

def generate_dialogue(
    summary: str,
    language: str = "English",
    num_guests: int = 1,
    num_tokens: int = 1000
) -> str:
    """Generate natural dialogue using LLaMA model."""

    # Calculate token targets for each section
    intro_tokens = num_tokens // 10
    main_tokens = num_tokens * 7 // 10  # Reduced to leave room for conclusion
    conclusion_tokens = num_tokens * 2 // 10  # Increased for better wrap-up

    # Replace template variables in base prompt first
    system_prompt = (DIALOGUE_PROMPT
        .replace("[LANGUAGE]", language)
        .replace("[NUM_GUESTS]", str(num_guests))
        .replace("[SUMMARY]", summary))

    system_prompt += f"""\n\nYou must target {num_tokens} for your generated response with
    approximately {intro_tokens} for the intro, {main_tokens} for the main dialogue,
    and {conclusion_tokens} for the final wrap-up.\n
    """

    # Call LLaMA API with single system message
    messages = [
        {
            "role": "system",
            "content": system_prompt
        }
    ]

    try:
        print("Starting API request")
        print(f"Requesting {num_tokens + 500} max tokens to ensure completion")
        dialogue = make_api_call(
            llama_client=llama,
            messages=messages,
            model=LLAMA_MODEL,
            # max_tokens=num_tokens + 500,  # Request extra tokens to ensure completion
            timeout=(10, 30),
            stream=False
            # debug=True
        )

        if not dialogue:
            print("Error: Empty response from API")
            return ""

        # Print raw response for debugging
        print("\nRaw API Response:")
        print(dialogue)  # Print full response

        # Clean and validate dialogue format
        cleaned = clean_dialogue_output(dialogue)
        if cleaned:
            # Count tokens in cleaned dialogue
            token_count = len(cleaned.split())
            print(f"\nApproximate token count: {token_count}")
            if token_count > num_tokens * 1.2:  # Allow 20% margin
                print(f"Warning: Generated dialogue ({token_count} tokens) exceeds requested length ({num_tokens} tokens)")

            # Check for incomplete dialogue
            if cleaned.count('[') < 2:
                print("Error: Dialogue too short or incomplete")
                return ""

            return cleaned

        print("Error: Invalid dialogue format or incomplete response")
        return ""

    except Exception as e:
        print(f"Error generating dialogue: {str(e)}")
        return ""

def main() -> None:
    """Main function."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--num_tokens", type=int, default=2000)
    parser.add_argument("--language", type=str, default="English")
    parser.add_argument("--num_guests", type=int, default=5)
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()

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
                language=args.language,
                num_guests=args.num_guests,
                num_tokens=args.num_tokens
            )

            # Write output even if incomplete
            output_file = os.path.join(OUTPUT_DIR, os.path.basename(summary_file))
            with open(output_file, 'w') as f:
                f.write(dialogue if dialogue else "Error: Failed to generate valid dialogue")

            print(f"Output written to: {output_file}")

        except Exception as e:
            print(f"Error processing {summary_file}: {str(e)}")
            continue


if __name__ == "__main__":
    main()
