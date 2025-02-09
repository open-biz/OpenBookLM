import os
import sys
from dotenv import load_dotenv
from llamaapi import LlamaAPI

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(ROOT)

# Load environment variables
load_dotenv()
LLAMA_API_KEY = os.getenv('LLAMA_API_KEY')
if not LLAMA_API_KEY:
    raise ValueError("LLAMA_API_KEY environment variable not set")

llama = LlamaAPI(LLAMA_API_KEY)

def test_api_with_tokens(num_tokens: int, model: str = "llama3.1-8b"):
    """Test API with specified number of tokens."""
    # Create test text (4 chars per token)
    test_text = "test " * num_tokens  # Each "test " is roughly 1 token
    
    print(f"\nTesting with {num_tokens:,} tokens...")
    print(f"Text length: {len(test_text):,} chars")
    
    system_prompt = "You are a helpful assistant that summarizes text. Keep responses very brief."
    user_prompt = f"""Summarize this text in 100 words or less:

{test_text}

Summary:"""

    api_request = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user", 
                "content": user_prompt
            }
        ],
        "temperature": 0.7,
        "stream": False
    }

    try:
        print("\nSending request...")
        response = llama.run(api_request)
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
    test_sizes = [1000, 2000, 5000, 8000, 10000]
    
    print("Starting API limit tests...")
    print("Model: llama3.1-8b")
    
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
