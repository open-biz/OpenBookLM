#!/usr/bin/env python3

import glob
import io
import logging
import os
import tempfile
from enum import Enum

import modal
import PyPDF2
from modal import gpu
import numpy as np
import requests
import torch
import torch.nn.utils.parametrizations as parametrizations  # Update weight_norm import
from bark import SAMPLE_RATE, generate_audio, preload_models
from pydub import AudioSegment
import scipy.io.wavfile as wavfile

"""
Sample Run:
modal run backend/text_to_speech.py --gpu-type h100 --count 8 --precision fp16 --model bark-small
"""

# ----------------------------------------------------------------------
# GLOBAL CONFIG
# ----------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
TIMEOUT = 6000

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
INPUT_DIR = os.path.join(ROOT, "input")
OUTPUT_DIR = os.path.join(ROOT, "output")

os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ----------------------------------------------------------------------
# Modal App + Image
# ----------------------------------------------------------------------
app = modal.App("sundai-tts-unified")

def get_latest_pip_modules() -> list[str]:
    """
    Returns a list of required pip packages.
    """
    return [
        "transformers",
        "scipy",
        "numpy",
        "torch",
        "fastapi",
        "python-multipart",
        "pydantic",
        "PyPDF2",
        "pydub",
        "python-ffmpeg",
        "sentencepiece",
        "accelerate",
        "bark",
        "librosa"
    ]


# image = (
#     modal.Image.debian_slim()
#     .pip_install("uv")
#     .run_commands("uv pip install --system --compile-bytecode torch")
# )

image = (
    modal.Image.debian_slim()
    .apt_install(
        "ffmpeg",
        "libsndfile1",
        "libsndfile1-dev",
        "libportaudio2",
        "libportaudiocpp0",
        "portaudio19-dev"
    )
    .pip_install(*get_latest_pip_modules(), gpu="h100")
    .add_local_dir(INPUT_DIR, "/root/input")
    .add_local_dir(OUTPUT_DIR, "/root/output")
)

# ----------------------------------------------------------------------
# Enums
# ----------------------------------------------------------------------
class TTSModel(str, Enum):
    BARK = "bark"
    BARK_SMALL = "bark-small"

class PrecisionType(str, Enum):
    FP32 = "fp32"
    FP16 = "fp16"
    # FP8  = "fp8"

class GPUType(str, Enum):
    H100 = "h100"
    A100 = "a100"
    L40S = "l40s"
    A10G = "a10g"
    L4 = "l4"
    T4 = "t4"
    ANY = "any"

# ----------------------------------------------------------------------
# Precision
# ----------------------------------------------------------------------
def set_precision(precision: PrecisionType):
    if precision == PrecisionType.FP16:
        logger.info("Using half-precision (FP16).")
        torch.set_default_dtype(torch.float16)
    else:
        logger.info("Using full-precision (FP32).")
        torch.set_default_dtype(torch.float32)

# ----------------------------------------------------------------------
# Audio Normalization
# ----------------------------------------------------------------------
def normalize_audio(audio_array: np.ndarray) -> np.ndarray:
    audio_float = audio_array.astype(np.float32)
    if np.max(np.abs(audio_float)) > 0:
        audio_float /= np.max(np.abs(audio_float))
    return (audio_float * 32767).astype(np.int16)

# ----------------------------------------------------------------------
# Bark TTS
# ----------------------------------------------------------------------
def run_bark_tts(text: str, model_name: TTSModel):
    if model_name == TTSModel.BARK_SMALL:
        os.environ["SUNO_USE_SMALL_MODELS"] = "True"
    else:
        if "SUNO_USE_SMALL_MODELS" in os.environ:
            del os.environ["SUNO_USE_SMALL_MODELS"]
    preload_models()
    return generate_audio(text)

# ----------------------------------------------------------------------
# GPU Configurations
# ----------------------------------------------------------------------
def get_gpu_config(gpu_type: str, count: int = 1):
    """Get a GPU configuration with the specified count."""
    gpu_classes = {
        "h100": modal.gpu.H100,
        "a100": modal.gpu.A100,
        "l40s": modal.gpu.L40S,
        "a10g": modal.gpu.A10G,
        "l4": modal.gpu.L4,
        "t4": modal.gpu.T4,
        "any": modal.gpu.Any
    }
    gpu_class = gpu_classes[gpu_type]
    return gpu_class(count=count)

# ----------------------------------------------------------------------
# PDF -> Audio
# ----------------------------------------------------------------------
def chunk_text(text: str, max_chunk_size=1000) -> list[str]:
    sents = text.replace('\n',' ').split('. ')
    chunks = []
    cur_chunk = []
    cur_size = 0
    for s in sents:
        s = s.strip() + '. '
        size = len(s)
        if (cur_size + size) > max_chunk_size and cur_chunk:
            chunks.append(''.join(cur_chunk))
            cur_chunk = [s]
            cur_size = size
        else:
            cur_chunk.append(s)
            cur_size += size
    if cur_chunk:
        chunks.append(''.join(cur_chunk))
    return chunks

@app.function(gpu=get_gpu_config("h100"), image=image, timeout=TIMEOUT)
def process_with_gpu(pdf_path: str, output_path: str, model_name: TTSModel, precision: PrecisionType):
    # Convert local paths to container paths correctly
    pdf_name = os.path.basename(pdf_path)
    output_name = os.path.basename(output_path)
    container_input = f"/root/input/{pdf_name}"
    container_output = f"/root/output/{output_name}"
    
    logger.info(f"Container paths: {container_input} -> {container_output}")
    
    return process_pdf_to_audio(
        pdf_path=container_input,
        output_path=container_output,
        model_name=model_name,
        precision=precision
    )

def process_pdf_to_audio(
    pdf_path: str,
    output_path: str = None,
    model_name: TTSModel = TTSModel.BARK_SMALL,
    precision: PrecisionType = PrecisionType.FP16
) -> dict:
    logger.info(f"Processing PDF: {pdf_path}")
    if not output_path:
        base = os.path.splitext(os.path.basename(pdf_path))[0]
        output_path = os.path.join(OUTPUT_DIR, f"{base}.wav")

    # 1) Read PDF text
    try:
        pdf_reader = PyPDF2.PdfReader(open(pdf_path, 'rb'))
        pages_text = [p.extract_text() or "" for p in pdf_reader.pages]
        full_text = " ".join(pages_text)
    except Exception as e:
        err = f"Failed to read {pdf_path}: {e}"
        logger.error(err)
        return {"input": pdf_path, "status":"error", "error":err}

    # 2) Chunk
    chunks = chunk_text(full_text, max_chunk_size=1000)
    logger.info(f"Split into {len(chunks)} chunks.")

    # 3) Intro
    title = os.path.splitext(os.path.basename(pdf_path))[0]
    intro_text = f"Welcome to the audio version of {title}. "

    try:
        logger.info(f"Generating introduction...")
        intro_bytes = generate_speech(intro_text, model_name, precision)
        intro_seg = AudioSegment.from_wav(io.BytesIO(intro_bytes))
    except Exception as e:
        err = f"Intro TTS failed: {e}"
        logger.error(err)
        return {"input": pdf_path, "status":"error", "error":err}

    # 4) Generate each chunk
    audio_segments = [intro_seg]
    for i, chunk in enumerate(chunks, start=1):
        logger.info(f"Generating chunk {i}/{len(chunks)}...")
        try:
            chunk_bytes = generate_speech(chunk, model_name, precision)
            chunk_seg = AudioSegment.from_wav(io.BytesIO(chunk_bytes))
            audio_segments.append(chunk_seg)
            audio_segments.append(AudioSegment.silent(duration=500))
        except Exception as e:
            err = f"Chunk {i} TTS failed: {e}"
            logger.error(err)
            return {"input": pdf_path, "status":"error", "error":err}

    # 5) Combine & export
    combined = sum(audio_segments)
    logger.info(f"Exporting final WAV: {output_path}")
    combined.export(output_path, format="wav")
    return {"input": pdf_path, "output": output_path, "chunks": len(chunks), "status": "success"}

def generate_speech(text: str, model_name: TTSModel, precision: PrecisionType) -> bytes:
    set_precision(precision)
    audio_array = run_bark_tts(text, model_name)
    audio_int16 = normalize_audio(audio_array)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        wavfile.write(tmp.name, SAMPLE_RATE, audio_int16)
        return open(tmp.name, 'rb').read()

# ----------------------------------------------------------------------
# Local Entrypoint
# ----------------------------------------------------------------------
@app.local_entrypoint()
def main(
    gpu_type: str = "h100",
    count: int = 1,
    precision: str = "fp16",
    model: str = "bark-small"
):
    """
    Orchestrate the entire process:
      - find *.pdf files in `input/` directory
      - run PDF -> TTS on GPU (with fallback)
      - produce combined WAV in `output/` directory

    Args:
        gpu_type: GPU type to use (h100, a100, l40s, a10g, l4, t4, any)
        count: Number of GPUs to use
        precision: Precision mode (fp32, fp16) # fp8
        model: Bark model to use (bark, bark-small)
    """
    # Convert string to enum
    gpu_type = GPUType(gpu_type)
    model_name = TTSModel(model)
    precision = PrecisionType(precision)

    # Create a GPU configuration with the specified count
    gpu_config = get_gpu_config(gpu_type.value, count)
    
    # Find all PDFs
    pdf_files = glob.glob(os.path.join(INPUT_DIR, "*.pdf"))
    
    if not pdf_files:
        logger.warning(f"No PDF files found in {INPUT_DIR}")
        return

    # Process each PDF
    results = []
    for pdf_path in pdf_files:
        base_name = os.path.splitext(os.path.basename(pdf_path))[0]
        output_path = os.path.join(OUTPUT_DIR, f"{base_name}.wav")
        
        logger.info(f"Processing {pdf_path} -> {output_path}")
        logger.info(f"Using: GPU={gpu_type.value}x{count}, precision={precision.value}, model={model_name.value}")
        
        result = process_with_gpu.remote(pdf_path, output_path, model_name, precision)
        results.append(result)

    print("\n=== Processing Summary ===")
    for r in results:
        if r["status"] == "success":
            print(f"  ✓ {r['input']} -> {r['output']} ({r['chunks']} chunks)")
        else:
            print(f"  ✗ {r['input']}: {r['error']}")

if __name__ == "__main__":
    main()
