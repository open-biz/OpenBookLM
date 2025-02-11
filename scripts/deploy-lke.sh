#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${GREEN}Deploying to Linode Kubernetes Engine...${NC}"

# Check kubectl connection
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Cannot connect to Kubernetes cluster${NC}"
    echo "Please ensure your kubeconfig is set up correctly for Linode"
    exit 1
fi

# Create namespace if it doesn't exist
echo -e "${GREEN}Creating namespace...${NC}"
kubectl create namespace openbooklm --dry-run=client -o yaml | kubectl apply -f -

# Create Clerk credentials secret
echo -e "${GREEN}Creating Clerk credentials secret...${NC}"
kubectl create secret generic clerk-credentials \
    --namespace openbooklm \
    --from-literal=NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
    --from-literal=CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
    --dry-run=client -o yaml | kubectl apply -f -

# Create API credentials secret
echo -e "${GREEN}Creating API credentials secret...${NC}"
kubectl create secret generic api-credentials \
    --namespace openbooklm \
    --from-literal=CEREBRAS_API_KEY="$CEREBRAS_API_KEY" \
    --from-literal=LLAMA_API_KEY="$LLAMA_API_KEY" \
    --from-literal=OPENAI_API_KEY="$OPENAI_API_KEY" \
    --dry-run=client -o yaml | kubectl apply -f -

# Create GitHub Container Registry secret
echo -e "${GREEN}Creating Container Registry secret...${NC}"
kubectl create secret docker-registry ghcr-secret \
    --namespace openbooklm \
    --docker-server=ghcr.io \
    --docker-username="$GITHUB_USERNAME" \
    --docker-password="$GITHUB_TOKEN" \
    --dry-run=client -o yaml | kubectl apply -f -

# Apply Kubernetes configurations
echo -e "${GREEN}Applying Kubernetes configurations...${NC}"
kubectl apply -f k8s/ -n openbooklm

# Wait for deployment
echo -e "${GREEN}Waiting for deployment to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/openbooklm -n openbooklm

# Get service details
echo -e "${GREEN}Deployment complete! Service details:${NC}"
kubectl get service openbooklm -n openbooklm

echo -e "\nUseful commands:"
echo -e "View pods: ${YELLOW}kubectl get pods -n openbooklm${NC}"
echo -e "View logs: ${YELLOW}kubectl logs -f deployment/openbooklm -n openbooklm${NC}"
echo -e "Get service IP: ${YELLOW}kubectl get service openbooklm -n openbooklm${NC}"