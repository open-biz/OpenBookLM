#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Deploying OpenBookLM...${NC}"

# Create namespace
echo -e "${GREEN}Creating namespace...${NC}"
kubectl create namespace openbooklm

# Create Clerk credentials secret
echo -e "${GREEN}Creating Clerk credentials secret...${NC}"
kubectl create secret generic clerk-credentials \
    --namespace openbooklm \
    --from-literal=NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
    --from-literal=CLERK_SECRET_KEY="$CLERK_SECRET_KEY"

# Apply Kubernetes configurations
echo -e "${GREEN}Applying Kubernetes configurations...${NC}"
kubectl apply -f k8s/ -n openbooklm

# Wait for deployment
echo -e "${GREEN}Waiting for deployment to be ready...${NC}"
kubectl rollout status deployment/openbooklm -n openbooklm

echo -e "${GREEN}Deployment complete!${NC}"
kubectl get service openbooklm -n openbooklm 