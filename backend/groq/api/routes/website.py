### WORK IN PROGRESS


from fastapi import  HTTPException
import os
import sys
from fastapi.responses import JSONResponse
import requests
from bs4 import BeautifulSoup

# Add project root to Python path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.append(ROOT)

# from utils.decorators import timeit

# @router.post("/website")
# async def process_website(request: WebsiteSourceRequest):
#     try:
#         # Fetch website content
#         response = requests.get(request.url, timeout=10)  # Add timeout
#         response.raise_for_status()
        
#         # Parse HTML and extract text
#         soup = BeautifulSoup(response.text, 'html.parser')
        
#         # Remove script and style elements
#         for script in soup(["script", "style", "nav", "footer", "header"]):
#             script.decompose()
            
#         # Get text content
#         text = soup.get_text()
        
#         # Clean up text (remove extra whitespace)
#         lines = (line.strip() for line in text.splitlines())
#         chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
#         text = ' '.join(chunk for chunk in chunks if chunk)
        
#         # Process the text content
#         result = await process_text_document(text, request.notebookId)
        
#         return JSONResponse(content=result)
        
#     except requests.RequestException as e:
#         raise HTTPException(
#             status_code=400,
#             detail=f"Failed to fetch website: {str(e)}"
#         )
#     except Exception as e:
#         logger.error(f"Error processing website: {str(e)}")
#         raise HTTPException(
#             status_code=500,
#             detail=f"Error processing website: {str(e)}"
#         )