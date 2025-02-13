from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import os
from pathlib import Path

# Add project root to Python path
root = str(Path(__file__).parent.parent)
sys.path.append(root)

# Import centralized routers
from backend.routers import routers
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

# Include all routers from the registry
for router_config in routers.values():
    app.include_router(
        router_config["router"],
        prefix=router_config["prefix"],
        tags=router_config["tags"]
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)