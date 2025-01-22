#!/bin/bash

# Load environment variables from .env file
set -a
source .env
set +a

# Configuration
GITHUB_REPO=${1:-"OpenBookLM/openbooklm"}

# Set the new image tag
export TAG=$(git rev-parse HEAD)
export GITHUB_REPOSITORY=$GITHUB_REPO

# Login to GitHub Container Registry
echo "Logging in to GitHub Container Registry..."
docker login ghcr.io

# Build and push the Docker image
echo "Building and pushing Docker image..."
docker build \
    --build-arg DATABASE_URL="$DATABASE_URL" \
    --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
    --build-arg CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
    --build-arg NEXT_PUBLIC_CLERK_SIGN_IN_URL="$NEXT_PUBLIC_CLERK_SIGN_IN_URL" \
    --build-arg NEXT_PUBLIC_CLERK_SIGN_UP_URL="$NEXT_PUBLIC_CLERK_SIGN_UP_URL" \
    --build-arg NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL" \
    --build-arg NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL" \
    --build-arg CEREBRAS_API_KEY="$CEREBRAS_API_KEY" \
    --build-arg LLAMA_API_KEY="$LLAMA_API_KEY" \
    --build-arg OPENAI_API_KEY="$OPENAI_API_KEY" \
    --build-arg UPSTASH_REDIS_REST_URL="$UPSTASH_REDIS_REST_URL" \
    --build-arg UPSTASH_REDIS_REST_TOKEN="$UPSTASH_REDIS_REST_TOKEN" \
    --build-arg NODE_ENV="$NODE_ENV" \
    --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
    -t ghcr.io/${GITHUB_REPOSITORY}:${TAG} .

if [ $? -eq 0 ]; then
    echo "Build successful, pushing image..."
    docker push ghcr.io/${GITHUB_REPOSITORY}:${TAG}
    docker push ghcr.io/${GITHUB_REPOSITORY}:latest
    echo "Build and push completed successfully!"
else
    echo "Build failed!"
    exit 1
fi
