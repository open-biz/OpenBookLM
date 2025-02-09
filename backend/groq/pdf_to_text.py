#!/usr/bin/env python3

import os
import sys
import re
from PyPDF2 import PdfReader
import logging
import asyncio
from pathlib import Path
import aiofiles
from io import BytesIO
import textwrap
from typing import List

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(ROOT)

from backend.utils.decorators import timeit

INPUT_DIR = os.path.join(ROOT, "input")  # Read PDFs from root/input/*.pdf
OUTPUT_DIR = os.path.join(ROOT, "output", "text")  # Write text to root/output/text/*.txt

os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

logger = logging.getLogger(__name__)

# Core patterns for detecting reference sections
SKIP_SECTIONS = [
    r'\s*Appendix\s*$',
    r'^\s*References?\s*$',
    r'^\s*Bibliography\s*$',
    r'^\s*Works\s+Cited\s*$',
]

def clean_text(text: str) -> str:
    """Clean extracted text by removing common PDF artifacts and normalizing whitespace."""
    if not text:
        return text

    # First remove indentation and normalize line endings
    lines = [line.strip() for line in text.split('\n')]
    text = '\n'.join(lines)

    text = re.sub(r"(\d+)\s+(st|nd|rd|th|s)\b", r"\1\2", text)  # Remove space in ordinals and years
    text = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", text)  # Add space between lowercase and uppercase
    text = re.sub(r"(?<=[a-zA-Z])(?=[\d])(?!s\b)", " ", text)  # Space between letters and numbers, except years
    text = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", text)  # Add space between lowercase and uppercase
    text = re.sub(r"(?<=[a-zA-Z])(?=[\d])(?!s\b)", " ", text)  # Space between letters and numbers, except years
    text = re.sub(r"(?<=[\w])-[\s]+(?=[\w])", "-", text)  # Remove hyphenation at line breaks
    text = re.sub(r"(?<=\w)-\s+(\w)", r"\1", text)  # Remove hyphenation at line breaks
    text = re.sub(r"(?<=\w)\s*-\s*(?=\w)", "-", text)  # Normalize hyphens between words
    text = re.sub(r"\. ?\. ?\.", "...", text)  # Preserve ellipses
    text = re.sub(r"\s+", " ", text)  # Normalize whitespace
    return text.strip()

def make_title_readable(title: str) -> str:
    """Make a title more readable by fixing common formatting issues."""
    # First combine any spaced capital letters (e.g. "S I T U A T I O N A L")
    while re.search(r'\b[A-Z]\s+[A-Z](?:\s+[A-Z])*\b', title):
        title = re.sub(r'\b([A-Z])\s+([A-Z](?:\s+[A-Z])*)\b', r'\1\2', title)

    # Fix hyphenation artifacts
    title = re.sub(r'(\w)-\s+(\w)', r'\1\2', title)  # Remove split-word hyphens
    title = re.sub(r'(\w)\s*-\s*(\w)', r'\1-\2', title)  # Normalize spacing around real hyphens

    # Convert to title case for readability
    words = []
    for word in title.split():
        # Handle hyphenated words
        if '-' in word:
            parts = word.split('-')
            parts = [p.title() if p.isupper() and len(p) > 2 else p for p in parts]
            words.append('-'.join(parts))
        else:
            # If word is all caps and longer than 2 letters, convert to title case
            if word.isupper() and len(word) > 2:
                word = word.title()
            words.append(word)

    # Join words and ensure single spaces
    title = ' '.join(words)
    title = re.sub(r'\s+', ' ', title)

    return title.strip()

def is_reference_line(text: str) -> bool:
    """Check if a line appears to be part of references section."""
    # Clean and normalize text for better matching
    text = text.strip()
    if not text:
        return False

    # Reference section headers - must be on its own line
    if re.match(r'^\s*References?\s*(?:\d+)?(?:\s|$)', text):
        return True

    # Check if line matches any reference pattern
    if any(re.search(pattern, text) for pattern in SKIP_SECTIONS):
        return True

    return False

def should_skip_line(line: str) -> bool:
    """Check if line indicates start of appendix or references section."""
    if not line.strip():
        return False

    skip_patterns = [
        r"^\s*Appendix.*$",
        r"^\s*References?.*$",
        r"^\s*Bibliography.*$",
        r"^\s*Works\s+Cited.*$",
    ]

    # Check raw line first
    for pattern in skip_patterns:
        if re.match(pattern, line.strip()):
            return True
    return False

def should_skip_section(line: str) -> bool:
    """Check if line indicates start of section that should be skipped."""
    line = line.strip()
    return any(re.match(pattern, line, re.IGNORECASE) for pattern in SKIP_SECTIONS)

def wrap_line(line: str, width: int = 80) -> str:
    """Wrap a line of text to specified width."""
    return '\n'.join(textwrap.wrap(line, width=width))

async def convert_pdf_to_text(input_pdf_path: str, output_txt_path: str) -> None:
    """Convert PDF to text with metadata and content processing."""
    try:
        # Read PDF
        reader = PdfReader(input_pdf_path)
        metadata = reader.metadata

        # Extract and format metadata
        text_parts = ['PDF METADATA:']
        if metadata:
            for key, value in metadata.items():
                if key.startswith('/'):
                    key = key[1:]  # Remove leading slash
                text_parts.append(f"{key}: {value}")
        text_parts.extend(['', 'DOCUMENT CONTENT:', ''])

        # Extract text from each page
        skip_remaining = False
        for i, page in enumerate(reader.pages):
            if skip_remaining:
                break

            page_text = page.extract_text()
            if page_text:
                # Split into lines to check for appendix/references
                lines = page_text.split('\n')
                cleaned_lines = []
                
                for line in lines:
                    if should_skip_section(line):
                        skip_remaining = True
                        # Keep the line if it's part of a sentence
                        if cleaned_lines and not cleaned_lines[-1].strip().endswith('.'):
                            cleaned_lines.append(line)
                        break
                    cleaned_lines.append(line)

                if skip_remaining:
                    # Only keep content before the skip marker
                    if cleaned_lines:
                        cleaned_text = '\n'.join(cleaned_lines)
                        if cleaned_text.strip():
                            wrapped_lines = [wrap_line(line) for line in cleaned_text.split('\n')]
                            text_parts.append('\n'.join(wrapped_lines))
                    break

                # Process normal page content
                cleaned_text = clean_text('\n'.join(cleaned_lines))
                if cleaned_text:
                    wrapped_lines = [wrap_line(line) for line in cleaned_text.split('\n')]
                    text_parts.append('\n'.join(wrapped_lines))
                    if i < len(reader.pages) - 1:  # Don't add newline after last page
                        text_parts.append('')  # Single newline between pages

        # Write processed text to file
        final_text = '\n'.join(text_parts)
        async with aiofiles.open(output_txt_path, 'w', encoding='utf-8') as f:
            await f.write(final_text)

        logger.info(f"Successfully converted {input_pdf_path} to {output_txt_path}")
        
    except Exception as e:
        logger.error(f"Error converting PDF to text: {str(e)}")
        raise

async def process_pdf(input_pdf_path: str, output_txt_path: str) -> None:
    """Process PDF in multiple steps with proper file handling."""
    # Step 1: Convert PDF to text
    await convert_pdf_to_text(input_pdf_path, output_txt_path)

    # Step 2: Remove appendix sections
    await remove_appendix_and_references(output_txt_path)

    # Step 3: Clean up text formatting
    await clean_text_formatting(output_txt_path)

    print(f"Processed {os.path.basename(input_pdf_path)} -> {output_txt_path}")

async def remove_appendix_and_references(filepath: str) -> None:
    """Remove appendix sections with proper file handling."""
    async with aiofiles.open(filepath, 'r') as f:
        content = await f.read()
        lines = content.splitlines()
    
    appendix_line = -1
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped and not line.startswith(' '):
            if stripped == 'Appendix':
                logger.info("Found appendix marker")
                appendix_line = i
                break
    
    if appendix_line >= 0:
        logger.info(f"Truncating file at line: {appendix_line}")
        async with aiofiles.open(filepath, 'w') as f:
            await f.write('\n'.join(lines[:appendix_line]))

async def clean_text_formatting(filepath: str) -> None:
    """Clean up text formatting."""
    async with aiofiles.open(filepath, 'r') as f:
        text = await f.read()
    
    # Clean text
    cleaned = clean_text(text)
    
    # Write back
    async with aiofiles.open(filepath, 'w') as f:
        await f.write(cleaned)

@timeit
async def process_pdf_documents(input_dir: str, output_dir: str) -> None:
    """Process all PDF documents in the input directory and save as text files."""

    for filename in os.listdir(input_dir):
        if not filename.lower().endswith('.pdf'):
            continue

        pdf_path = os.path.join(input_dir, filename)
        output_path = os.path.join(output_dir, os.path.splitext(filename)[0] + '.txt')

        await process_pdf(pdf_path, output_path)


if __name__ == "__main__":
    asyncio.run(process_pdf_documents(INPUT_DIR, OUTPUT_DIR))
