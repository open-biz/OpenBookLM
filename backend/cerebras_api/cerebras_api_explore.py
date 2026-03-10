#!/usr/bin/env python3
"""Module for connecting to Cerebras API and making model queries."""

import os
import sys
from dotenv import load_dotenv

"""
show all available imports for cerebras.cloud.sdk
import cerebras.cloud.sdk as cs
print(f'{dir(cs) = }\n')
print(f'{dir(cs.types.chat) = }\n')
print(f'{dir(cs.types) = }\n')
"""
from cerebras.cloud.sdk import (
    # Error classes
    APIConnectionError,          # no specific status code
    APIError,                    # general base API error
    APIResponseValidationError,
    APIStatusError,              # 500
    APITimeoutError,
    AuthenticationError,         # 401
    BadRequestError,
    ConflictError,
    InternalServerError,         # >= 500
    NotFoundError,
    PermissionDeniedError,       # 403
    RateLimitError,              # 429
    UnprocessableEntityError,    # 422

    # Core client classes
    Cerebras,
    AsyncCerebras,
    Client,
    AsyncClient,

    # Response, streaming, utilities
    APIResponse,
    AsyncAPIResponse,
    Stream,
    AsyncStream,
    file_from_path,

    # Re-exported pydantic base
    BaseModel,

    # Additional classes / constants
    CerebrasError,
    DEFAULT_CONNECTION_LIMITS,
    DEFAULT_MAX_RETRIES,
    DEFAULT_TIMEOUT,
    DefaultAsyncHttpxClient,
    DefaultHttpxClient,
    NotGiven,
    Omit,
    ProxiesTypes,
    RequestOptions,
    Timeout,
    Transport,

    # Submodules (not strictly “importable classes”, but appear in dir())
    resources,
    types,
)
from cerebras.cloud.sdk.types.chat import (
    ChatCompletion,
    CompletionCreateParams,
    CompletionCreateResponse
)
from cerebras.cloud.sdk.types import (
    Completion,
    CompletionCreateParams,
    ModelListResponse,
    ModelRetrieveResponse
)
# import cerebras.framework.torch as cbtorch
# from cerebras.framework.torch import CerebrasPyTorch
# TODO: Hardware Development Kit (HDK) install


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(ROOT)


def get_client(debug: bool = False) -> Cerebras | None:
    # load the env vars
    load_dotenv()

    MODEL = os.getenv("MODEL_NAME", "llama3.1-8b")
    # MODEL = os.getenv("MODEL_NAME", "llama3.3-70b")
    if not MODEL:
        raise ValueError("MODEL_NAME not found in environment variables")

    CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY", None)
    if not CEREBRAS_API_KEY:
        raise ValueError("CEREBRAS_API_KEY not found in environment variables")

    try:
        client = Cerebras(api_key=CEREBRAS_API_KEY)
    except APIConnectionError as e:
        print(f"APIConnectionError: {str(e)}")
        return None
    except RateLimitError as e:
        print(f"RateLimitError: {str(e)}")
        return None
    except APIStatusError as e:
        print(f"APIStatusError: {str(e)}")
        return None
    except Exception as e:
        print(f"Exception: {str(e)}")
        return None
    finally:
        return client

def debug_client(client: Cerebras) -> None:
    try:
        # all objects \/
        print()
        print(f'client\n\t{client}\n')
        print(f'client.chat\n\t{client.chat}\n')
        print(f'client.chat.completions\n\t{client.chat.completions}\n')
        print(f'client.chat.completions.create\n\t{client.chat.completions.create}\n')
        print(f'client.completions\n\t{client.completions}\n')
        print(f'client.get_api_list\n\t{client.get_api_list}\n')
        print(f'client.platform_headers\n\t{client.platform_headers}\n')
        # all objects /\
        print(f'client.models.list()\n\t{client.models.list()}\n')
        [print(f'{model=}\n') for model in client.models.list()]

        # print(f'{client.models.data = }\n')
        # [print(f'{item=}\n') for item in client.models.items()]

        """
        client.models.list() = ModelListResponse(data=[
                                                        Data(id='llama3.1-8b', created=1721692800, object='model', owned_by='Meta'),
                                                        Data(id='llama-3.3-70b', created=1733443200, object='model', owned_by='Meta')
                                                        ],
                                                        object='list'
                                                    )

        model=('data', [
            Data(id='llama3.1-8b', created=1721692800, object='model', owned_by='Meta'),
            Data(id='llama-3.3-70b', created=1733443200, object='model', owned_by='Meta')
        ])

        model=('object', 'list')
        """
    except APIConnectionError as e:
        print(f"APIConnectionError: {str(e)}")
        return None
    except RateLimitError as e:
        print(f"RateLimitError: {str(e)}")
        return None
    except APIStatusError as e:
        print(f"APIStatusError: {str(e)}")
        return None
    except Exception as e:
        print(f"Exception: {str(e)}")
        return None

    return client


def custom_retries(
    client: Cerebras,
    model: str = "llama3.1-8b",
    content: str = "What are the most powerful chips for inference?",
    max_retries: int = 3
) -> str | None:

    # Configure the default for all requests:
    client = Cerebras(
        max_retries=max_retries,  # Disable retries (default is 2)
    )
    # Or, configure per-request:
    try:
        response = client.with_options(max_retries=max_retries).chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": "Why is fast inference important?",
                }
            ],
            model=model,
            stream=False
        )
    except APIConnectionError as e:
        print(f"APIConnectionError: {str(e)}")
        return None
    except RateLimitError as e:
        print(f"RateLimitError: {str(e)}")
        return None
    except APIStatusError as e:
        print(f"APIStatusError: {str(e)}")
        return None
    except Exception as e:
        print(f"Exception: {str(e)}")
        return None

    if not response:
        return None

    return response.choices[0].message.content


@timeit_async
async def async_response(
    client: Cerebras,
    model: str = "llama3.1-8b",
    content: str = "What are the most powerful chips for inference?"
) -> str | None:
    """
    testing out async responses
    """
    try:
        response = await client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": content
            }],
            model=model,
            stream=False
        )
    except APIConnectionError as e:
        print(f"APIConnectionError: {str(e)}")
        return None
    except RateLimitError as e:
        print(f"RateLimitError: {str(e)}")
        return None
    except APIStatusError as e:
        print(f"APIStatusError: {str(e)}")
        return None
    except Exception as e:
        print(f"Exception: {str(e)}")
        return None

    if not response:
        return None

    return response.choices[0].message.content



def std_response(
    client: Cerebras,
    model: str = "llama3.1-8b",
    content: str = "What are the most powerful chips for inference?",
    chunk_view_limit: int = 5
) -> str | None:
    """
    Get a standard response from the Cerebras API.

    Args:
        client: The Cerebras client object
        model: The model to use for the completion
        content: The prompt to send to the model

    Returns:
        The generated text string

    Raises:
        ValueError: If the response format is invalid or missing required fields
    """
    try:
        response = client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": content
            }],
            model=model,
            stream=False
        )
    except APIConnectionError as e:
        print(f"APIConnectionError: {e}")
        sys.exit(1)
    except RateLimitError as e:
        print(f"RateLimitError: {e}")
        sys.exit(1)
    except APIStatusError as e:
        print(f"APIStatusError: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Exception: {e}")
    finally:
        print("Closing connection...\n")

    if not response:
        return None
    elif not response.choices[0].message.content:
        return None

    mag_content = response.choices[0].message.content

    return mag_content


def stream_response(
    client: Cerebras,
    model: str = "llama3.1-8b",
    content: str = "What are the most powerful chips for inference?",
    ) -> str | None:
    """
    Stream response from the Cerebras API.

    Args:
        client: The Cerebras client object
        model: The model to use for the completion
        content: The prompt to send to the model

    Returns:
        The generated text string

    Raises:
        ValueError: If the response format is invalid or missing required fields

    stream True has a few differences vs standard stream being off (False)
    - stream is an iteratable and can be gone through once
    - stream.choices[0] contains 'delta' instead of 'message' like non-streaming response
        - stream.choices[0].delta.content is None
        - stream.choices[0].message.content is None
    """
    try:
        # stream is an iterator and can be gone through once
        stream = client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": content
            }],
            model=model,
            stream=True
        )
    except APIConnectionError as e:
        print(f"APIConnectionError: {e}")
        sys.exit(1)
    except RateLimitError as e:
        print(f"RateLimitError: {e}")
        sys.exit(1)
    except APIStatusError as e:
        print(f"APIStatusError: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Exception: {e}")
    finally:
        print("Closing connection...\n")

    if not stream:
        return None

    msg_content = ""
    for chunk in stream:
        if chunk.choices[0].delta.content:
            # consider joining chunks with a space or newline
            msg_content += chunk.choices[0].delta.content

    return msg_content if len(msg_content) > 0 else None


def view_stream(
    client: Cerebras,
    model: str = "llama3.1-8b",
    content: str = "What are the most powerful chips for inference?",
    chunk_view_limit: int = 5
    ) -> bool | None:
    """
    View a stream response from the Cerebras API.
    Meant to be a debugging tool to explore the stream response.

    Args:
        client: The Cerebras client object
        model: The model to use for the completion
        content: The prompt to send to the model
        chunk_view_limit: The number of chunks to view (default: 5)

    Returns:
        True if the stream was viewable, False otherwise
    """
    try:
        # stream is an iterator and can be gone through once
        stream = client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": content
            }],
            model=model,
            stream=True
        )
    except APIConnectionError as e:
        print(f"APIConnectionError: {e}")
        return None
    except RateLimitError as e:
        print(f"RateLimitError: {e}")
        return None
    except APIStatusError as e:
        print(f"APIStatusError: {e}")
        return None
    except Exception as e:
        print(f"Exception: {e}")

    if not stream:
        return None

    # [ print(f'\nchunk #{idx} {chunk=}\n') for idx, chunk in enumerate(stream[:chunk_view_limit]) ]
    print()
    [
        print(f'chunk #{idx}: {chunk.choices[0]=}\n')
        for idx, chunk in enumerate(stream) if idx < chunk_view_limit
    ]
    # [ print(f'{chunk.choices[0].delta.content=}\n') for _, chunk in enumerate(stream) ]
    # [ print(f'{chunk.choices[0].delta.content=}\n') for _, chunk in enumerate(stream[:chunk_view_limit]) ]
    # print(chunk.choices[0].delta.content if chunk.choices[0].delta else "", end="")

    # save stream content to a data struct and return if it will be needed later

    return True


def query_cerebras(
    content: str = "test",
    model_name: str = "llama3.1-8b",
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
        # return response.choices[0].message.content # for body content only
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


#### Query ####
client = Cerebras(api_key=os.environ.get("CEREBRAS_API_KEY"),)

chat_completion = client.chat.completions.create(
    model="llama3.1-8b",
    messages=[
        {"role": "user", "content": "Hello!",}
    ],
)
print(chat_completion)

#### Response ####
{
  "id": "chatcmpl-292e278f-514e-4186-9010-91ce6a14168b",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "message": {
        "content": "Hello! How can I assist you today?",
        "role": "assistant"
      }
    }
  ],
  "created": 1723733419,
  "model": "llama3.1-8b",
  "system_fingerprint": "fp_70185065a4",
  "object": "chat.completion",
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 10,
    "total_tokens": 22
  },
  "time_info": {
    "queue_time": 0.000073161,
    "prompt_time": 0.0010744798888888889,
    "completion_time": 0.005658071111111111,
    "total_time": 0.022224903106689453,
    "created": 1723733419
  }
}




if __name__ == "__main__":

    client = get_client()
    # print(f'{client=}')
    debug_client(client)


    response_streamed = stream_response(client)
    print(f'{response_streamed=}')

    response_standard = std_response(client)
    print(f'{response_standard=}')


    sys.exit(1)

    test_cerebras_api(debug=True)

    response = client.chat.completions.create(
        model="llama3.1-8b",
        messages=[{"role": "user", "content": "test"}]
    )
    print(response)



"""
Cerebras api errors

Status Code	Error Type
400	BadRequestError
401	AuthenticationError
403	PermissionDeniedError
404	NotFoundError
422	UnprocessableEntityError
429	RateLimitError
>=500	InternalServerError
N/A	APIConnectionError


Chat Completions
messages                 object[]            required
model                    string              required
max_completion_tokens    integer | null
response_format          object | null
seed                     integer | null
stop                     string | null
stream                   boolean | null
temperature              number | null
top_p                    number | null
tool_choice              string | object
tools                    object | null



Chat Completions

messages                 object[]            required
A list of messages comprising the conversation so far.


model                    string              required
Available options: llama3.1-8b, llama-3.3-70b


max_completion_tokens    integer | null
The maximum number of tokens that can be generated in the completion. The total length of input tokens and generated tokens is limited by the model’s context length.


response_format          object | null
Setting to { "type": "json_object" } enables JSON mode, which ensures that the response is either a valid JSON object or an error response.

Note that enabling JSON mode does not guarantee that the model will successfully generate valid JSON. The model may fail to generate valid JSON due to various reasons such as incorrect formatting, missing or mismatched brackets, or exceeding the length limit.

In cases where the model fails to generate valid JSON, the error response will be a valid JSON object with a key failed_generation containing the string representing the invalid JSON. This allows you to re-submit the request with additional prompting to correct the issue. The error response will have a 400 server error status code.

Note that JSON mode is not compatible with streaming. "stream" must be set to false.

Important: When using JSON mode, you need to explicitly instruct the model to generate JSON through a system or user message.


seed                     integer | null
If specified, our system will make a best effort to sample deterministically, such that repeated requests with the same seed and parameters should return the same result. Determinism is not guaranteed.


stop                     string | null
Up to 4 sequences where the API will stop generating further tokens. The returned text will not contain the stop sequence.


stream                   boolean | null
If set, partial message deltas will be sent.


temperature              number | null
What sampling temperature to use, between 0 and 1.5. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. We generally recommend altering this or top_p but not both.


top_p                    number | null
An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So, 0.1 means only the tokens comprising the top 10% probability mass are considered. We generally recommend altering this or temperature but not both.


tool_choice              string | object
Controls which (if any) tool is called by the model. none means the model will not call any tool and instead generates a message. auto means the model can pick between generating a message or calling one or more tools. required means the model must call one or more tools. Specifying a particular tool via {"type": "function", "function": {"name": "my_function"}} forces the model to call that tool.

none is the default when no tools are present. auto is the default if tools are present.


tools                    object | null
A list of tools the model may call. Currently, only functions are supported as a tool. Use this to provide a list of functions the model may generate JSON inputs for.

Specifying tools consumes prompt tokens in the context. If too many are given, the model may perform poorly or you may hit context length limitations

tools.function.description   string
A description of what the function does, used by the model to choose when and how to call the function.

tools.function.name          string
The name of the function to be called. Must be a-z, A-Z, 0-9, or contain underscores and dashes, with a maximum length of 64.

tools.function.parameters    object
The parameters the functions accepts, described as a JSON Schema object. Omitting parameters defines a function with an empty parameter list.

tools.type                   string
The type of the tool. Currently, only function is supported.


user                         string | null
A unique identifier representing your end-user, which can help to monitor and detect abuse.
"""
