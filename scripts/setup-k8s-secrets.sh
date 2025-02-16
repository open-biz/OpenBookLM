#!/bin/bash

# Load environment variables from .env
set -a
source .env
set +a

# Create namespace if it doesn't exist
kubectl create namespace openbooklm --dry-run=client -o yaml | kubectl apply -f -

# Create secret for Clerk credentials
kubectl create secret generic clerk-credentials \
  --from-literal=NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
  --from-literal=CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
  --namespace openbooklm \
  --dry-run=client -o yaml | kubectl apply -f -

# Create secret for API credentials
kubectl create secret generic api-credentials \
  --from-literal=CEREBRAS_API_KEY="$CEREBRAS_API_KEY" \
  --from-literal=LLAMA_API_KEY="$LLAMA_API_KEY" \
  --from-literal=OPENAI_API_KEY="$OPENAI_API_KEY" \
  --namespace openbooklm \
  --dry-run=client -o yaml | kubectl apply -f -