USER_PROMPT = """You are a precise summarization assistant.
Your task is to create a DETAILED summary of {TARGET_TOKENS} tokens.
Your summary MUST be very close to {TARGET_TOKENS} tokens long.

Instructions:
1. Keep title and author if available
2. Use a conversational tone
3. Include all key points, main arguments, and important details
4. Expand each point with relevant examples and context
5. If your summary is too short, add more details until you reach {TARGET_TOKENS} tokens
6. Do not include: references, citations, release notes, trademarks, source code, logos, disclaimers, legal notices, or appendices

Required summary length: {TARGET_TOKENS} tokens. You MUST hit this target.

Text to summarize: {TEXT}
"""