#!/usr/bin/env python3
from transformers import AutoTokenizer

def load_tokenizer_from_hf(
    primary_model: str = "meta-llama/Llama-3.1-8B", # gated
    fallback_model: str = "meta-llama/Llama-2-7b" # public
) -> AutoTokenizer | None:
    """
    This is used for encoding, decoding, token counting of text chunks

    # https://huggingface.co/meta-llama/Llama-3.1-8B
    """
    import os
    from dotenv import load_dotenv
    from transformers import AutoTokenizer
    from huggingface_hub import login
    from huggingface_hub.utils import (
        GatedRepoError,
        RepositoryNotFoundError
    )
    load_dotenv()
    HF_TOKEN = os.getenv('HUGGING_FACE_API_KEY', None)
    if HF_TOKEN is None:
        raise ValueError("HUGGING_FACE_TOKEN not found in environment variables")

    try:
        login(token=HF_TOKEN)
    except Exception as e:
        print(f"Error logging in to Hugging Face: {e}")
        return None

    for model_name in [primary_model, fallback_model]:
        try:
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            print(f"Successfully loaded tokenizer '{model_name}'.")
            return tokenizer
        except GatedRepoError as e:
            print(f"GatedRepoError: {e}")
        except RepositoryNotFoundError as e:
            print(f"RepositoryNotFoundError: {e}")
        except Exception as e:
            print(f"Exception: {e}")

    print("Failed to load tokenizer for primary and fallback models")
    return None


def count_tokens(text: str, debug: bool = False) -> int | None:
    """
    Count the number of tokens in the given text using the provided tokenizer.
    """
    tokenizer = load_tokenizer_from_hf()
    if tokenizer is None:
        raise ValueError("Tokenizer not found")
    encoded = tokenizer.encode(text)
    num_tokens = len(encoded)
    if type(num_tokens) != int:
        raise TypeError("Number of tokens is not an integer")
    if debug:
        print(f'{num_tokens = }')
    return num_tokens


if __name__ == "__main__":
    text = "The quick brown fox jumps over the lazy dog."
    num_tokens = count_tokens(text, debug=True)
