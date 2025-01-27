# OpenBookLM Processing Flow

This document describes the data flow between different processing scripts in the OpenBookLM project.

## Directory Structure
```
ROOT/
├── input/              # Input PDFs
│   ├── *.pdf          # Source PDF files
└── output/
    ├── text/          # Extracted text from PDFs
    │   └── *.txt
    ├── summaries/     # Generated summaries (~1000 words)
    │   └── *.txt
    ├── dialogue/      # Generated dialogue scripts
    │   └── *.txt
    └── audio/         # Final podcast audio files
        └── *.wav
```

## Processing Flow

1. **PDF to Text** (`pdf_to_text.py`)
   - Input: `ROOT/input/*.pdf`
   - Output: `ROOT/output/text/*.txt`
   - Function: Extracts text content from PDF files

2. **Text to Summary** (`text_to_summary.py`)
   - Input: `ROOT/output/text/*.txt`
   - Output: `ROOT/output/summaries/*.txt`
   - Function: Generates ~1000 word summaries from text content with one sentence per line

3. **Summary to Dialogue** (`summary_to_dialogue.py`)
   - Input: `ROOT/output/summaries/*.txt`
   - Output: `ROOT/output/dialogue/*.txt`
   - Function: Creates conversational dialogue scripts between two speakers

4. **Dialogue to Audio** (`dialogue_to_audio.py`)
   - Input: `ROOT/output/dialogue/*.txt`
   - Output: `ROOT/output/audio/*.wav`
   - Function: Converts dialogue scripts to audio using Suno Bark text-to-speech

## Usage

Run the scripts in sequence:
```bash
./backend/pdf_to_text.py
./backend/text_to_summary.py
./backend/summary_to_dialogue.py
./backend/dialogue_to_audio.py
```

Each script will process all files in its input directory and generate corresponding output files in its output directory.

## Dependencies
- PyPDF2: PDF text extraction
- Transformers: BART model for text summarization
- LangChain: Text processing and chunking
- Suno Bark: High-quality text-to-speech synthesis
