from fastapi import FastAPI, HTTPException, APIRouter, UploadFile, Form, File
from pydantic import BaseModel
from typing import List, Dict, Any
import logging
import os
import sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.append(ROOT)

from .routes import pdf, dialogue, website

app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

router.include_router(pdf.router, tags=["pdf"])
router.include_router(dialogue.router, tags=["dialogue"])
# router.include_router(website.router, tags=["website"])
# router.include_router(status.router, tags=["status"])


