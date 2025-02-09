#!/usr/bin/env python3

from enum import Enum
import glob
import io
import logging
import os
from pathlib import Path
import tempfile

import PyPDF2
from bark import SAMPLE_RATE, generate_audio, preload_models
from fastapi import FastAPI, HTTPException, Response
import modal
import numpy as np
from pydantic import BaseModel
from pydub import AudioSegment
import requests
import scipy.io.wavfile as wavfile
import torch
from tqdm import tqdm
from transformers import AutoProcessor, BarkModel, pipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
INPUT_DIR = os.path.join(ROOT, "input")
OUTPUT_DIR = os.path.join(ROOT, "output")

os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = modal.App("sundai-tts")

# Configure Modal image with all necessary dependencies
def get_latest_pip_modules() -> str:
    """
    fetch the latest versions of pip modules and update for image
    Returns comma-separated string of 'module>=version', ...
    """
    modules = [
        'transformers',
        'scipy',
        'numpy',
        'torch',
        'fastapi',
        'python-multipart',
        'pydantic',
        'PyPDF2',
        'pydub',
        'python-ffmpeg',
        'sentencepiece',
        'accelerate',
        'bark'
    ]

    # Get package info from PyPI JSON API
    url_pypi = "https://pypi.org/pypi/"

    python_modules = dict.fromkeys(modules, None)
    for module in python_modules.keys():
        try:
            pypi_mod_url = f"{url_pypi}{module}/json"
            r = requests.get(pypi_mod_url, timeout=2)
            r.raise_for_status()  # Raise an error for bad status codes
            if r.status_code == 200:
                latest_version = r.json()['info']['version']
                python_modules[module] = latest_version
        except Exception as _:
            pass

    modules = []
    for module, version in python_modules.items():
        output = module
        if version is not None:
            output += f">={version}"
        modules.append(output)

    py_modules = " ".join(modules)
    return py_modules


image = (modal.Image.debian_slim()
    # Install system dependencies
    .apt_install(
        "ffmpeg",
        "libsndfile1",
        "libsndfile1-dev",
        "libportaudio2",
        "libportaudiocpp0",
        "portaudio19-dev"
    )
    # Install PyTorch with CUDA support
    # CUDA 12.4 and pytorch 2.5.1 stable version
    .pip_install(
        "torch==2.5.1+cu124", 
        "torchaudio==2.5.1+cu124",
        extra_index_url="https://download.pytorch.org/whl/cu124"
    )
    # Install other Python dependencies
    .pip_install(*get_latest_pip_modules().split())
)

class GPUType(str, Enum):
    T4 = "t4"
    L4 = "l4"
    A10G = "a10g"
    L40S = "l40s"
    A100 = "a100"
    A100_80GB = "a100-80gb"
    H100 = "h100"
    ANY = "any"

class TTSModel(str, Enum):
    BARK = "bark"
    BARK_SMALL = "bark-small"

class TextToSpeechRequest(BaseModel):
    text: str
    model_name: TTSModel = TTSModel.BARK_SMALL
    gpu_type: GPUType = GPUType.H100
    output_file: str = None
    voice_preset: str = "v2/en_speaker_6"

def setup_gpu():
    """Setup GPU and memory optimizations"""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    # raise warning if we can't run on GPU as this will be very slow
    if not torch.cuda.is_available():
        warning = "No GPU detected, running on CPU. This will be very slow!"
        logger.warning(warning)
        print(warning)
    if torch.cuda.is_available():
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True
    return device

def normalize_audio(audio_array):
    """Normalize audio to prevent clipping and ensure proper format"""
    # Convert to float32 for processing
    audio_float = audio_array.astype(np.float32)

    # Normalize to [-1, 1] range
    # TODO: does this really make it -1 to 1?
    if np.max(np.abs(audio_float)) > 0:
        audio_float = audio_float / np.max(np.abs(audio_float))

    # Convert to 16-bit PCM
    audio_int16 = (audio_float * 32767).astype(np.int16)

    return audio_int16

def generate_speech_with_bark(
    text: str,
    model_name: TTSModel = TTSModel.BARK_SMALL
    ) -> np.ndarray:
    """Generate speech using Bark directly"""
    logger.info("Generating audio with Bark...")
    preload_models()
    audio_array = generate_audio(text)
    return normalize_audio(audio_array)

@app.function(gpu=GPUType.T4, image=image)
async def generate_speech_t4(text: str, model_name: TTSModel = TTSModel.BARK_SMALL) -> bytes:
    return await generate_speech(text, model_name)

@app.function(gpu=GPUType.L4, image=image)
async def generate_speech_l4(text: str, model_name: TTSModel = TTSModel.BARK_SMALL) -> bytes:
    return await generate_speech(text, model_name)

@app.function(gpu=GPUType.A10G, image=image)
async def generate_speech_a10g(text: str, model_name: TTSModel = TTSModel.BARK_SMALL) -> bytes:
    return await generate_speech(text, model_name)

@app.function(gpu=GPUType.L40S, image=image)
async def generate_speech_l40s(text: str, model_name: TTSModel = TTSModel.BARK_SMALL) -> bytes:
    return await generate_speech(text, model_name)

@app.function(gpu=GPUType.A100, image=image)
async def generate_speech_a100(text: str, model_name: TTSModel = TTSModel.BARK_SMALL) -> bytes:
    return await generate_speech(text, model_name)

@app.function(gpu=GPUType.A100_80GB, image=image)
async def generate_speech_a100_80gb(text: str, model_name: TTSModel = TTSModel.BARK_SMALL) -> bytes:
    return await generate_speech(text, model_name)

@app.function(gpu=GPUType.H100, image=image)
async def generate_speech_h100(text: str, model_name: TTSModel = TTSModel.BARK_SMALL) -> bytes:
    return await generate_speech(text, model_name)

@app.function(gpu=GPUType.ANY, image=image)
async def generate_speech_any(text: str, model_name: TTSModel = TTSModel.BARK_SMALL) -> bytes:
    return await generate_speech(text, model_name)

async def generate_speech(
    text: str,
    model_name: TTSModel = TTSModel.BARK_SMALL
    ) -> bytes:
    """Generate speech from text using Bark"""
    try:
        audio_array = generate_speech_with_bark(text, model_name)
        
        with tempfile.NamedTemporaryFile(suffix='.wav') as temp_file:
            wavfile.write(temp_file.name, SAMPLE_RATE, audio_array)
            audio_bytes = open(temp_file.name, 'rb').read()
        
        return audio_bytes
    except Exception as e:
        logger.error(f"Error generating speech: {str(e)}")
        raise

def chunk_text(text, max_chunk_size=1000):
    """Split text into chunks at sentence boundaries"""
    sentences = text.replace('\n', ' ').split('. ')
    chunks = []
    current_chunk = []
    current_size = 0
    
    for sentence in sentences:
        sentence = sentence.strip() + '. '
        sentence_size = len(sentence)
        
        if current_size + sentence_size > max_chunk_size and current_chunk:
            chunks.append(''.join(current_chunk))
            current_chunk = [sentence]
            current_size = sentence_size
        else:
            current_chunk.append(sentence)
            current_size += sentence_size
    
    if current_chunk:
        chunks.append(''.join(current_chunk))
    
    return chunks

async def process_pdf_to_audio(
    pdf_path,
    output_path=None,
    model_name=TTSModel.BARK_SMALL
    ):
    """Process a PDF file to generate podcast-style audio"""
    try:
        logger.info(f"Processing {pdf_path}...")
        
        # Extract text from PDF
        # TODO: need better chunking
        text = []
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text.append(page.extract_text())
        
        full_text = ' '.join(text)
        
        # Split into chunks
        chunks = chunk_text(full_text)
        logger.info(f"Split into {len(chunks)} chunks")
        
        # Create podcast introduction
        title = os.path.splitext(os.path.basename(pdf_path))[0]
        intro_text = f"Welcome to the audio version of '{title}'. "
        
        # Generate output path if not provided
        output_path = os.path.join(OUTPUT_DIR, f"{title}.wav")
        
        # Process introduction
        logger.info("Generating introduction...")
        intro_audio = AudioSegment.from_wav(
            io.BytesIO(await generate_speech(intro_text, model_name))
        )
        
        # Process each chunk
        logger.info("Processing chunks...")
        audio_segments = [intro_audio]
        
        for i, chunk in enumerate(chunks, 1):
            logger.info(f"Processing chunk {i}/{len(chunks)}...")
            chunk_audio = AudioSegment.from_wav(
                io.BytesIO(await generate_speech(chunk, model_name))
            )
            audio_segments.append(chunk_audio)
            
            # Add a short pause between chunks
            audio_segments.append(AudioSegment.silent(duration=500))
        
        # Combine all audio segments
        logger.info("Combining audio segments...")
        combined_audio = sum(audio_segments)
        
        # Export final audio
        logger.info("Exporting final audio...")
        combined_audio.export(output_path, format="wav")
        
        return {
            "input": pdf_path,
            "output": output_path,
            "chunks": len(chunks),
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error processing {pdf_path}: {str(e)}")
        return {
            "input": pdf_path,
            "error": str(e),
            "status": "error"
        }

@app.local_entrypoint()
async def main():
    """Process all PDFs in the input directory"""
    import argparse
    parser = argparse.ArgumentParser(description='Generate audio from PDF files using Bark')
    parser.add_argument('--model', type=str, choices=['bark', 'bark-small'], default='bark-small',
                      help='TTS model to use')
    parser.add_argument('--gpu', type=str, choices=[g.value for g in GPUType], default='h100',
                      help='GPU type to use')
    args, unknown = parser.parse_known_args()
    
    pdf_files = glob.glob(os.path.join(INPUT_DIR, "*.pdf"))
    results = []
    
    for pdf_path in pdf_files:
        result = await process_pdf_to_audio(pdf_path, model_name=args.model)
        results.append(result)
    
    print("\nProcessing Summary:")
    for result in results:
        if result["status"] == "success":
            print(f"✓ {result['input']} -> {result['output']} ({result['chunks']} chunks)")
        else:
            print(f"✗ {result['input']}: {result['error']}")
