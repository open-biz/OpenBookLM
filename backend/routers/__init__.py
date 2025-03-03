from backend.groq.api.audio_generation import router as groq_audio_router
from backend.groq.api.sources import router as groq_sources_router
from backend.groq.api.health import router as groq_health_router
from backend.cerebras.api.sources import router as cerebras_sources_router
# from backend.cerebras.api.audio_generation import router as cerebras_audio_router
from backend.cerebras.api.health import router as cerebras_health_router

# Create router registry
routers = {
    "groq": {
        "router": groq_audio_router,
        "prefix": "/python/api/groq",
        "tags": ["groq"]
    },
    "groq_sources": {
        "router": groq_sources_router,
        "prefix": "/python/api/groq",
        "tags": ["groq"]
    },
    "groq_health": {
        "router": groq_health_router,
        "prefix": "/python/api/groq",
        "tags": ["groq"]
    },
    # "cerebras": {
    #     "router": cerebras_audio_router,
    #     "prefix": "/python/api/cerebras",
    #     "tags": ["cerebras"]
    # },
    "cerebras_sources": {
        "router": cerebras_sources_router,
        "prefix": "/python/api/cerebras",
        "tags": ["cerebras"]
    },
    "cerebras_health": {
        "router": cerebras_health_router,
        "prefix": "/python/api/cerebras",
        "tags": ["cerebras"]
    }
}