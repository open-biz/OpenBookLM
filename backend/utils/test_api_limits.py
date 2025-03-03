import os
import sys
from dotenv import load_dotenv
from llamaapi import LlamaAPI
import requests

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(ROOT)

# Load environment variables
load_dotenv()
LLAMA_API_KEY = os.getenv('LLAMA_API_KEY')
if not LLAMA_API_KEY:
    raise ValueError("LLAMA_API_KEY environment variable not set")

# Constants
GROQ_API_KEY = "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"
GROQ_MODEL = "llama-3.1-8b-instant"
MAX_TOKENS_PER_REQUEST = 4000  # Groq's recommended max
RATE_LIMIT_TPM = 6000  # Tokens per minute limit

def test_api_with_tokens(num_tokens: int, model: str = GROQ_MODEL):
    """Test API with specified number of tokens."""
    if num_tokens > MAX_TOKENS_PER_REQUEST:
        print(f"Warning: {num_tokens} tokens exceeds max of {MAX_TOKENS_PER_REQUEST}")
        return False

    # Create test text (4 chars per token)
    test_text = "test " * num_tokens
    
    print(f"\nTesting with {num_tokens:,} tokens...")
    print(f"Text length: {len(test_text):,} chars")
    
    api_request = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful assistant that summarizes text."
            },
            {
                "role": "user", 
                "content": f"Summarize this text: {test_text}"
            }
        ],
        "temperature": 0.7,
        "stream": False
    }

    try:
        print("\nSending request...")
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json=api_request
        )
        print("\nResponse received!")
        print(f"Response type: {type(response)}")
        print(f"Response content: {response}")
        
        if isinstance(response, list) and len(response) > 0:
            print("\nError response details:")
            for field, value in response[0].items():
                print(f"{field}: {value}")
            return False
        
        if 'choices' in response:
            print("\nSuccess! Response contains choices.")
            print(f"First choice: {response['choices'][0]}")
            return True
            
        print("\nUnexpected response format:")
        print(response)
        return False
        
    except Exception as e:
        print(f"\nError: {str(e)}")
        return False

def main():
    """Test API with various token sizes."""
    test_sizes = [1000, 2000, 3000, 4000]  # Reduced test sizes
    
    print("Starting API limit tests...")
    print("Model: mixtral-8x7b-32768")
    
    results = []
    for size in test_sizes:
        success = test_api_with_tokens(size)
        results.append((size, success))
        if not success:
            print(f"\nFailed at {size:,} tokens")
        print("\n" + "="*50)
    
    print("\nTest Results:")
    print("Token Size | Status")
    print("-"*20)
    for size, success in results:
        status = "Success" if success else "Failed"
        print(f"{size:>9,} | {status}")

if __name__ == "__main__":
    main()
