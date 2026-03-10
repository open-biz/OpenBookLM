"""Utility decorators for the OpenBookLM project."""

from typing import Callable, Any

def timeit(func: Callable) -> Callable:
    """Decorator to measure and print the execution time of functions.

    Args:
        func: The function to be timed

    Returns:
        Wrapped function that prints execution time
    """
    import functools
    import time
    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()

        # Format duration nicely
        duration = end_time - start_time
        if duration < 1:
            duration_str = f"{duration*1000:.1f}ms"
        elif duration < 60:
            duration_str = f"{duration:.1f}s"
        else:
            minutes = int(duration // 60)
            seconds = duration % 60
            duration_str = f"{minutes}m {seconds:.1f}s"

        print(f" {func.__name__} took {duration_str}")
        return result
    return wrapper
