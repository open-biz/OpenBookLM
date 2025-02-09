#!/usr/bin/env python3
"""Module for connecting to Cerebras API and making model queries."""

import os
import sys
from dotenv import load_dotenv
from cerebras.cloud.sdk import (
    Cerebras, AsyncCerebras, APIConnectionError, RateLimitError, APIStatusError
)
from cerebras.cloud.sdk.types.chat import ChatCompletion
import cerebras.framework.torch as cbtorch
# from cerebras.framework.torch import CerebrasPyTorch
from groq import Groq

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(ROOT)

load_dotenv()
CEREBRAS_API_KEY = os.getenv('CEREBRAS_API_KEY')
if not CEREBRAS_API_KEY:
    raise ValueError("CEREBRAS_API_KEY not found in environment variables")

client = Groq(api_key="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",
)


def query_cerebras(
    content: str = "test",
    model_name: str = "llama-3.1-8b-instant",
    temperature: float = 0.7,
    min_tokens: int = 800,
    max_tokens: int = 1000,
    top_p: float = 0.9
) -> ChatCompletion:
    """
    Query Cerebras API with given content and parameters.

    Args:
        content: The prompt text to send to the model (default: "test")
        model_name: Name of the model to use (default: llama3.1-8b)
        temperature: Controls randomness in generation (0.0-1.0) (default: 0.7)
        min_tokens: Minimum number of tokens to generate (default: 800)
        max_tokens: Maximum number of tokens to generate (default: 1000)
        top_p: Nucleus sampling parameter (0.0-1.0) (default: 0.9)

    Returns:
        ChatCompletion containing the model's response and metadata

    Raises:
        Exception: If there's an error querying the Cerebras API
    """
    try:
        chat_completion = client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": content
            }],
            model=model_name,
            temperature=temperature,
            min_tokens=min_tokens,
            max_tokens=max_tokens,
            top_p=top_p
        )
        return chat_completion
    except APIConnectionError as e:
        print("The server could not be reached")
        print(e.__cause__)  # an underlying Exception, likely raised within httpx.
    except RateLimitError as e:
        print("A 429 status code was received; we should back off a bit.")
    except APIStatusError as e:
        print("Another non-200-range status code was received")
        print(e.status_code)
        print(e.response)
    except Exception as e:
        raise Exception(f"Error querying Cerebras API: {str(e)}")


def get_completion_text(response: ChatCompletion, debug: bool = False) -> str:
    """
    Extract the generated text from a Cerebras API response.

    Args:
        response: The ChatCompletion from query_cerebras
        debug: If True, prints debug information about the response (default: False)

    Returns:
        The generated text string

    Raises:
        ValueError: If the response format is invalid or missing required fields
    """
    if debug:
        choices = response.choices
        choice0 = response.choices[0]
        message = response.choices[0].message
        content = response.choices[0].message.content

        print("\nDebug Info:")
        print(f'{choices=}\n')
        print(f'{choice0=}\n')
        print(f'{message=}\n')
        print(f'{content=}\n')
    try:
        content = response.choices[0].message.content
        return content
    except (AttributeError, IndexError) as e:
        raise ValueError(f"Invalid response format from Cerebras API: {str(e)}")

def test_cerebras_api(
    prompt: str = "Tell me about the WS3 chip",
    model: str = "llama3.1-8b",
    debug: bool = False
) -> None:
    """
    Test the Cerebras API connection and response handling.

    Args:
        prompt: Test prompt to send to the model (default: "Tell me about the WS3 chip")
        model: Model to test with (default: llama3.1-8b)
        debug: If True, prints debug information (default: False)
    """
    try:
        response = query_cerebras(
            content=prompt,
            model_name=model,
            min_tokens=800,
            max_tokens=1000
        )
        print("Raw response:")
        print(response)

        print("\nExtracted text:")
        text = get_completion_text(response, debug=debug)
        print(f"\nFinal output: {text}")

    except Exception as e:
        print(f"Error during test: {str(e)}")

if __name__ == "__main__":
    test_cerebras_api(debug=True)


# TODO: cerebras_pytorch install. cuda compatible?


"""
ChatCompletionResponse(
    id='chatcmpl-4bfbed53-110f-4988-a003-127e6a30756a',
    choices=[
        ChatCompletionResponseChoice(
            finish_reason='length',
            index=0,
            message=ChatCompletionResponseChoiceMessage(
                role='assistant',
                content="I couldn't find any information on a widely known 'WS3 chip.' However, I can provide some possibilities based on available data:\n\n1. **WS3 chip in Apple devices**: Apple has been working on its own custom chipsets, such as the A14 Bionic, A15 Bionic, and A16 Bionic. However, I couldn't find any information on a 'WS3 chip' in Apple devices.\n\n2. **WS3 chip in other devices**: I found a few",
                tool_calls=None
            ),
            logprobs=None
        )
    ],
    created=1737583081,
    model='llama3.1-8b',
    object='chat.completion',
    system_fingerprint='fp_6381a6c109',
    time_info=ChatCompletionResponseTimeInfo(
        completion_time=0.045409766,
        prompt_time=0.002150612,
        queue_time=8.8551e-05,
        total_time=0.04952359199523926,
        created=1737583081
    ),
    usage=ChatCompletionResponseUsage(
        completion_tokens=100,
        prompt_tokens=42,
        total_tokens=142
    ),
    service_tier=None
)
"""