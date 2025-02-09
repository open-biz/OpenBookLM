#!/usr/bin/env python3
"""Module for connecting to Cerebras API and making model queries."""

import os
import sys
from dotenv import load_dotenv
import modal

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(ROOT)

load_dotenv()
MODAL_API_KEY = os.getenv('MODAL_API_KEY')
if not MODAL_API_KEY:
    raise ValueError("MODAL_API_KEY not found in environment variables")

reqs_file = os.path.join(ROOT, "requirements.txt")
if not os.path.isfile(reqs_file):
    raise ValueError("requirements.txt not found")


apt_modules = [
    ...
]


# TODO: cuda pytorch
image = (
    modal.Image.debian_slim(python_version="3.11")
    # TODO: see if from requirements lets us skip listing most modules below
    .pip_install_from_requirements(reqs_file)
    # cuda 12.4 enabled pytorch
    .pip_install(
        "torch", pre=True,
        index_url="https://download.pytorch.org/whl/nightly/cu124"
    )
    .pip_install(
        "torchaudio", pre=True,
        index_url="https://download.pytorch.org/whl/nightly/cu124"
    )
    .pip_install(
        [
            "huggingface_hub",
            "cerebras-cloud-sdk",
            "transformers",
            "torchvision",
            "torchaudio",
            "diffusers",
            "accelerate",
            "soundfile",
            "pydub",
            "bark"
        ]
    )
    .apt_install(*apt_modules)
    .env_set("MODAL_API_KEY", MODAL_API_KEY)
    .env_set("MODAL_API_HOST", "api.cerebras.com")
    .env_set("MODAL_API_VERSION", "v1")
    .env_set("MODAL_API_BASE", "https://api.cerebras.com")

)

