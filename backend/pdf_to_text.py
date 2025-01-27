#!/usr/bin/env python3

import os
import sys
import PyPDF2
import logging
from backend.utils.decorators import timeit

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
INPUT_DIR = os.path.join(ROOT, "input")  # Read PDFs from root/input/*.pdf
OUTPUT_DIR = os.path.join(ROOT, "output", "text")  # Write text to root/output/text/*.txt

os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

logger = logging.getLogger(__name__)

def convert_pdf_to_text(pdf_path: str) -> str:
    """
    Convert a PDF file to text using PyPDF2.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        str: Extracted text from the PDF
    """
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = []
            for page in pdf_reader.pages:
                text.append(page.extract_text() or "")
            return " ".join(text)
    except Exception as e:
        logger.error(f"Error converting PDF to text: {e}")
        raise

@timeit
def process_pdf_documents():
    """Process all PDF documents in the input directory."""
    print(f"\nInput directory: {INPUT_DIR}")
    print(f"Output directory: {OUTPUT_DIR}\n")
    
    # walk the input dir for each of the pdf files
    for root, dirs, files in os.walk(INPUT_DIR):
        for file in files:
            if file.endswith(".pdf"):
                # convert the pdf to text
                pdf_path = os.path.join(INPUT_DIR, file)
                text = convert_pdf_to_text(pdf_path)
                
                # save the text to a file
                output_file = os.path.join(OUTPUT_DIR, file.replace(".pdf", ".txt"))
                with open(output_file, "w", encoding="utf-8") as f:
                    f.write(text)

                print(f"Converted {file} to {output_file}")


if __name__ == "__main__":
    process_pdf_documents()
