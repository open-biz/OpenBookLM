"""Utility decorators for the OpenBookLM project."""

import time
import functools
import logging
from typing import Callable, Any
import asyncio

logger = logging.getLogger(__name__)

def timeit(func: Callable) -> Callable:
    """Decorator to time function execution."""
    @functools.wraps(func)
    async def async_wrapper(*args, **kwargs) -> Any:
        start = time.time()
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            return result
        finally:
            end = time.time()
            logger.info(f"{func.__name__} took {(end-start)*1000:.1f}ms")
    
    @functools.wraps(func)
    def sync_wrapper(*args, **kwargs) -> Any:
        start = time.time()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            end = time.time()
            logger.info(f"{func.__name__} took {(end-start)*1000:.1f}ms")

    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    return sync_wrapper
