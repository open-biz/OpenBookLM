from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import os
from pathlib import Path

# Add project root and backend to Python path
root = str(Path(__file__).parent.parent.parent)
backend_path = str(Path(__file__).parent.parent)
sys.path.extend([root, backend_path])

# Import routers from local api directory
from api.sources import router as sources_router
from api.audio_generation import router as audio_router
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Get frontend URL from environment variable, default to localhost:3000
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://170.187.161.93:3000')

# Add CORS middleware with configurable frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with prefixes
app.include_router(sources_router, prefix="/python/api")
app.include_router(audio_router, prefix="/python/api")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)