#!/usr/bin/env python3
"""Convert text summaries to natural dialogue format."""

import os
import re
import random
from typing import List, Tuple
import sys
from backend.utils.decorators import timeit

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(ROOT)

INPUT_DIR = os.path.join(ROOT, "output", "summaries")
OUTPUT_DIR = os.path.join(ROOT, "output", "dialogue")

# Conversation starters/transitions
TRANSITIONS = [
    "That's fascinating! Let me add that",
    "Building on that point,",
    "Interesting perspective. In my experience,",
    "You raise a good point. Additionally,",
    "To expand on what you're saying,",
    "That's crucial to understand. Furthermore,",
    "I agree, and it's worth noting that",
    "Let me add some context here -",
    "This is particularly important because",
    "What's really interesting here is",
    "To put this in perspective,",
    "Let me break this down further -",
    "Here's something crucial to consider:",
    "This connects to something important:",
    "A key insight here is",
]

# Natural reactions
REACTIONS = [
    "Exactly!",
    "That's fascinating.",
    "Great point.",
    "Very interesting.",
    "I see what you mean.",
    "That makes sense.",
    "Absolutely.",
    "Well said.",
]

# Words/phrases to filter out
FILTER_PATTERNS = [
    r'Table of Contents',
    r'Chapter \d+',
    r'\|\s*\d+\s*\|',  # Table markers
    r'^\d+\s*$',  # Standalone numbers
    r'v\d+\.\d+',  # Version numbers
    r'[A-Z]{2,}(?:\s+[A-Z]{2,})+',  # All caps sequences
    r'_+',  # Underscores
    r'\.{2,}',  # Multiple dots
]

@timeit
def clean_text(text: str) -> str:
    """Clean text of unwanted patterns and normalize spacing."""
    # Remove unwanted patterns
    for pattern in FILTER_PATTERNS:
        text = re.sub(pattern, '', text)
    
    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\s*\n\s*', '\n', text)
    
    return text.strip()

@timeit
def split_into_segments(text: str) -> List[str]:
    """Split text into meaningful segments for dialogue."""
    # Split on sentence boundaries
    segments = []
    current = []
    
    for line in text.split('\n'):
        line = line.strip()
        if not line:
            continue
            
        # Split long sentences
        sentences = re.split(r'(?<=[.!?])\s+', line)
        for sent in sentences:
            sent = sent.strip()
            if not sent:
                continue
                
            # Combine short related sentences
            if len(current) < 3 and len(' '.join(current + [sent])) < 150:
                current.append(sent)
            else:
                if current:
                    segments.append(' '.join(current))
                current = [sent]
    
    if current:
        segments.append(' '.join(current))
    
    return segments

@timeit
def create_dialogue_script(segments: List[str]) -> List[Tuple[str, str]]:
    """Create natural dialogue from segments."""
    dialogue = []
    
    # Randomly assign host/guest gender for this conversation
    speakers = ['[Male Host]', '[Female Guest]'] if random.random() < 0.5 else ['[Female Host]', '[Male Guest]']
    host, guest = speakers
    
    # Start with introduction
    title_words = segments[0].split()[:6]  # Use first few words for topic
    intro = f"Welcome to our discussion about {' '.join(title_words)}..."
    dialogue.append((host, intro))
    
    prev_speaker = host
    for i, segment in enumerate(segments[1:], 1):
        # Decide who speaks next (avoid same speaker twice in a row)
        if prev_speaker == host:
            speaker = guest
            # Add reaction occasionally
            if random.random() < 0.3:
                segment = f"{random.choice(REACTIONS)} {segment}"
        else:
            speaker = host
            # Add transition occasionally
            if random.random() < 0.4:
                segment = f"{random.choice(TRANSITIONS)} {segment}"
        
        dialogue.append((speaker, segment))
        prev_speaker = speaker
    
    # Add conclusion
    conclusion = "Thank you for this insightful discussion!"
    if prev_speaker == host:
        dialogue.append((guest, conclusion))
    else:
        dialogue.append((host, conclusion))
    
    return dialogue

@timeit
def format_dialogue_script(dialogue: List[Tuple[str, str]]) -> str:
    """Format dialogue pairs into text."""
    lines = []
    for speaker, text in dialogue:
        lines.append(f"{speaker}: {text}")
    return '\n\n'.join(lines)

@timeit
def generate_dialogue_script(summary_path: str) -> str:
    """Convert a summary file to dialogue format."""
    try:
        print(f"\nProcessing: {summary_path}")
        
        # Read summary
        with open(summary_path, 'r', encoding='utf-8') as f:
            text = f.read()
        
        if not text.strip():
            print("Empty summary file")
            return ""
        
        # Clean text
        text = clean_text(text)
        
        # Split into segments
        segments = split_into_segments(text)
        
        # Ensure minimum dialogue length
        min_lines = 70
        while len(segments) < min_lines:
            # Duplicate some segments to reach minimum length
            additional = random.sample(segments, min(len(segments), min_lines - len(segments)))
            segments.extend(additional)
        
        # Cap maximum length
        max_lines = 150
        if len(segments) > max_lines:
            segments = segments[:max_lines]
        
        # Create and format dialogue
        dialogue = create_dialogue_script(segments)
        formatted = format_dialogue_script(dialogue)
        
        # Save dialogue
        output_path = os.path.join(
            OUTPUT_DIR,
            os.path.basename(summary_path)
        )
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(formatted)
            
        print(f"Generated dialogue script: {output_path}")
        print(f"Dialogue length: {len(formatted):,} chars")
        
        return output_path
        
    except Exception as e:
        print(f"Error processing {summary_path}: {str(e)}")
        return ""

@timeit
def process_summary_files():
    """Process all summary files to create dialogue scripts."""
    print(f"\nInput directory: {INPUT_DIR}")
    print(f"Output directory: {OUTPUT_DIR}\n")
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Process all summary files
    for _, _, files in os.walk(INPUT_DIR):
        for file in sorted(files):
            if not file.endswith('.txt'):
                continue
                
            summary_path = os.path.join(INPUT_DIR, file)
            generate_dialogue_script(summary_path)

if __name__ == "__main__":
    process_summary_files()
