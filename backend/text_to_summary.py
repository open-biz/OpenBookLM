#!/usr/bin/env python3
"""Generate concise summaries from text documents."""

import os
import sys
from multiprocessing import Pool
from typing import List, Tuple

from transformers import pipeline
from backend.utils.decorators import timeit

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(ROOT)

INPUT_DIR = os.path.join(ROOT, "output", "text")
OUTPUT_DIR = os.path.join(ROOT, "output", "summaries")

@timeit
def process_text_chunk(chunk: str) -> str:
    """Process a single chunk of text through the summarization model."""
    summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
    try:
        summary = summarizer(chunk, max_length=200, min_length=50, do_sample=False)[0]['summary_text']
        return summary.strip()
    except Exception as e:
        print(f"Error summarizing chunk: {str(e)}")
        return ""

@timeit
def combine_summaries(summaries: List[str]) -> str:
    """Combine multiple chunk summaries into a final coherent summary."""
    if not summaries:
        return ""
    
    # Join summaries with double newlines for readability
    combined = "\n\n".join(s for s in summaries if s.strip())
    
    # If combined text is too long, summarize again
    if len(combined) > 2000:
        try:
            summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
            final_summary = summarizer(
                combined,
                max_length=1000,
                min_length=200,
                do_sample=False
            )[0]['summary_text']
            return final_summary.strip()
        except Exception as e:
            print(f"Error in final summarization: {str(e)}")
            return combined
    
    return combined

@timeit
def generate_text_summary(text_path: str) -> str:
    """Generate a summary from a text file using chunked processing."""
    try:
        # Read the text file
        with open(text_path, 'r', encoding='utf-8') as f:
            text = f.read().strip()
        
        if not text:
            print(f"Empty text file: {text_path}")
            return ""
        
        print(f"\nProcessing: {text_path}")
        print(f"Input length: {len(text):,} chars")
        
        # Split into chunks targeting ~1000 tokens each
        chunk_size = 3000  # Approximate chars per 1000 tokens
        overlap = 200  # Overlap between chunks
        
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            if end > len(text):
                end = len(text)
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - overlap
        
        print(f"Split into {len(chunks)} chunks")
        
        # Process chunks in parallel
        with Pool() as pool:
            chunk_summaries = pool.map(process_text_chunk, chunks)
        
        # Combine summaries
        final_summary = combine_summaries(chunk_summaries)
        if not final_summary:
            print("Failed to generate summary")
            return ""
        
        # Create output filename
        output_path = os.path.join(OUTPUT_DIR, os.path.basename(text_path))
        
        # Save summary
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(final_summary)
        
        print(f"Generated summary: {output_path}")
        print(f"Summary length: {len(final_summary):,} chars")
        
        return output_path
        
    except Exception as e:
        print(f"Error processing {text_path}: {str(e)}")
        return ""

@timeit
def process_text_documents():
    """Process all text documents in the input directory."""
    print(f"\nInput directory: {INPUT_DIR}")
    print(f"Output directory: {OUTPUT_DIR}\n")
    
    # Create output directory if needed
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Get all text files and sort by size
    files = []
    for _, _, filenames in os.walk(INPUT_DIR):
        for filename in sorted(filenames):
            if not filename.endswith('.txt'):
                continue
            files.append(os.path.join(INPUT_DIR, filename))
    
    # Process all text files
    for file in files:
        generate_text_summary(file)

if __name__ == "__main__":
    process_text_documents()
