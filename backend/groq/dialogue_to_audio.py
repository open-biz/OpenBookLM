#!/usr/bin/env python3
"""Convert dialogue scripts to audio using Suno Bark text-to-speech."""

import os
import re
import random
import numpy as np
from typing import List, Tuple, Dict
from dataclasses import dataclass
from bark import SAMPLE_RATE, generate_audio, preload_models
from scipy.io import wavfile
import torch
from transformers import AutoTokenizer
import sys
from backend.utils.decorators import timeit

# Force CPU if no GPU available
if not torch.cuda.is_available():
    print("No GPU detected, using CPU...")
    os.environ["CUDA_VISIBLE_DEVICES"] = ""

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
INPUT_DIR = os.path.join(ROOT, "output", "dialogue")
OUTPUT_DIR = os.path.join(ROOT, "output", "audio")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Available voice presets
VOICE_PRESETS = {
    'male': [
        'v2/en_speaker_6',
        'v2/en_speaker_7',
        'v2/en_speaker_8',
        'v2/en_speaker_9',
    ],
    'female': [
        'v2/en_speaker_1',
        'v2/en_speaker_2',
        'v2/en_speaker_3',
        'v2/en_speaker_4',
    ]
}

# Select two random voices at module level
HOST_VOICE = random.choice(VOICE_PRESETS['male' if random.random() < 0.5 else 'female'])
GUEST_VOICE = random.choice(VOICE_PRESETS['female' if 'male' in HOST_VOICE else 'male'])

@dataclass
class AudioChunk:
    """Represents a chunk of audio with its metadata."""
    text: str
    speaker: str
    voice_preset: str
    audio: np.ndarray = None
    duration: float = 0.0

def estimate_audio_duration(text: str) -> float:
    """Estimate audio duration in seconds based on word count."""
    # Average speaking rate is ~150 words per minute
    # Add extra time for pauses and natural speech
    words = len(text.split())
    return (words / 150) * 60 + 0.5  # Add 0.5s buffer

def chunk_dialogue(dialogue: str) -> List[AudioChunk]:
    """Split dialogue into chunks suitable for Bark processing."""
    chunks = []
    current_text = []
    current_duration = 0
    current_speaker = None
    current_voice = None
    
    # Parse dialogue and create initial chunks
    for line in dialogue.split('\n'):
        line = line.strip()
        if not line:
            continue
            
        # Extract speaker and text
        match = re.match(r'\[(Male|Female) (Host|Guest)\]:\s*(.*)', line)
        if not match:
            continue
            
        gender, role, text = match.groups()
        speaker = f"[{gender} {role}]"
        
        # Use consistent voice for host/guest
        voice_preset = HOST_VOICE if role == 'Host' else GUEST_VOICE
        
        # If speaker changes or current chunk is getting too long, create new chunk
        if speaker != current_speaker or current_duration > 8.0:  # Reduced from 10s to 8s for safety
            if current_text and current_speaker:
                chunks.append(AudioChunk(
                    text=' '.join(current_text),
                    speaker=current_speaker,
                    voice_preset=current_voice
                ))
            current_text = []
            current_duration = 0
            current_speaker = speaker
            current_voice = voice_preset
        
        # Add text to current chunk
        current_text.append(text)
        current_duration += estimate_audio_duration(text)
    
    # Add final chunk
    if current_text and current_speaker:
        chunks.append(AudioChunk(
            text=' '.join(current_text),
            speaker=current_speaker,
            voice_preset=current_voice
        ))
    
    return chunks

def generate_chunk_audio(chunk: AudioChunk) -> np.ndarray:
    """Generate audio for a single chunk using Bark."""
    try:
        if not chunk.text.strip():
            return np.array([])
            
        # Generate audio (Bark handles its own temperature internally)
        audio = generate_audio(
            chunk.text,
            history_prompt=chunk.voice_preset
        )
        
        # Add small silence at end for natural pauses
        silence = np.zeros(int(0.2 * SAMPLE_RATE))
        return np.concatenate([audio, silence])
        
    except Exception as e:
        print(f"Error generating audio for chunk: {str(e)}")
        print(f"Text was: {chunk.text[:100]}...")  # Print first 100 chars of problematic text
        return np.array([])

def combine_audio_chunks(chunks: List[AudioChunk]) -> np.ndarray:
    """Combine audio chunks with smooth transitions."""
    if not chunks:
        return np.array([])
        
    # Add crossfade between chunks
    crossfade_duration = 0.1  # seconds
    crossfade_samples = int(crossfade_duration * SAMPLE_RATE)
    
    combined = []
    for i, chunk in enumerate(chunks):
        if chunk.audio is None or len(chunk.audio) == 0:
            continue
            
        if i > 0 and len(combined) > crossfade_samples:
            # Apply crossfade
            fade_out = np.linspace(1.0, 0.0, crossfade_samples)
            fade_in = np.linspace(0.0, 1.0, crossfade_samples)
            
            combined[-crossfade_samples:] *= fade_out
            chunk.audio[:crossfade_samples] *= fade_in
            
            # Overlap-add
            combined[-crossfade_samples:] += chunk.audio[:crossfade_samples]
            combined.extend(chunk.audio[crossfade_samples:])
        else:
            combined.extend(chunk.audio)
    
    return np.array(combined) if combined else np.array([])

def convert_dialogue_to_audio(dialogue_path: str) -> str:
    """Convert a dialogue file to audio."""
    try:
        print(f"\nProcessing: {dialogue_path}")
        
        # Read dialogue
        with open(dialogue_path, 'r', encoding='utf-8') as f:
            dialogue = f.read()
        
        if not dialogue.strip():
            print("Empty dialogue file")
            return ""
        
        # Split into chunks
        chunks = chunk_dialogue(dialogue)
        if not chunks:
            print("No valid chunks created")
            return ""
            
        print(f"Split into {len(chunks)} chunks")
        
        # Generate audio for each chunk
        for i, chunk in enumerate(chunks, 1):
            print(f"Generating audio for chunk {i}/{len(chunks)}...")
            print(f"Speaker: {chunk.speaker}, Text length: {len(chunk.text)}")
            chunk.audio = generate_chunk_audio(chunk)
            if len(chunk.audio) == 0:
                print(f"Warning: No audio generated for chunk {i}")
        
        # Remove empty chunks
        chunks = [c for c in chunks if c.audio is not None and len(c.audio) > 0]
        if not chunks:
            print("No valid audio chunks generated")
            return ""
        
        # Combine chunks
        print("Combining audio chunks...")
        final_audio = combine_audio_chunks(chunks)
        
        if len(final_audio) == 0:
            print("No audio generated")
            return ""
        
        # Save audio
        output_path = os.path.join(
            OUTPUT_DIR,
            os.path.splitext(os.path.basename(dialogue_path))[0] + '.wav'
        )
        
        wavfile.write(output_path, SAMPLE_RATE, final_audio)
        print(f"Saved audio to: {output_path}")
        
        duration = len(final_audio) / SAMPLE_RATE
        print(f"Audio duration: {duration:.1f} seconds")
        
        return output_path
        
    except Exception as e:
        print(f"Error processing {dialogue_path}: {str(e)}")
        return ""

@timeit
def process_dialogue_files():
    """Process all dialogue files to generate podcast audio."""
    print(f"\nInput directory: {INPUT_DIR}")
    print(f"Output directory: {OUTPUT_DIR}\n")
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Load Bark models
    print("Loading Bark models...")
    preload_models()
    
    # Process all dialogue files
    for _, _, files in os.walk(INPUT_DIR):
        for file in sorted(files):
            if not file.endswith('.txt'):
                continue
                
            dialogue_path = os.path.join(INPUT_DIR, file)
            convert_dialogue_to_audio(dialogue_path)
    
    print("\nGenerated audio files:")
    for _, _, files in os.walk(OUTPUT_DIR):
        for file in sorted(files):
            if file.endswith('.wav'):
                print(os.path.join(OUTPUT_DIR, file))

if __name__ == "__main__":
    process_dialogue_files()
