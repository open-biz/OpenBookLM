SYSTEM_PROMPT = """Your generated summary should be {TARGET_TOKENS} tokens long.
Ensure token count is measured in the same language as the input.
Maintain a natural and engaging tone while avoiding impersonal phrases like 'this summary'.
Exclude irrelevant metadata (e.g., page numbers, copyright info, legal disclaimers).
Ensure completeness while strictly adhering to the required token length.
"""