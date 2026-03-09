FROM python:3.12-slim

WORKDIR /app

# Install system dependencies required for audio processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    libportaudio2 \
    && rm -rf /var/lib/apt/lists/*

# Copy python dependency list
COPY requirements.txt .

# Install heavy core dependencies first to cache the layer
RUN pip install --no-cache-dir torch transformers scipy numpy

# Install the rest of the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ ./backend/
# Any other shared modules needed by the backend

EXPOSE 8000

ENV PYTHONPATH=/app

CMD ["python", "backend/main.py"]