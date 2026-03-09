#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if required environment variables are set
# if [ -z "$CEREBRAS_API_KEY" ] || [ -z "$LLAMA_API_KEY" ] || [ -z "$OPENAI_API_KEY" ]; then
#     echo -e "${RED}Error: API credentials are not set in environment${NC}"
#     echo "Please set the following environment variables:"
#     echo "CEREBRAS_API_KEY"
#     echo "LLAMA_API_KEY"
#     echo "OPENAI_API_KEY"
#     exit 1
# fi

echo -e "${GREEN}Deploying OpenBookLM...${NC}"

# Create namespace if it doesn't exist
echo -e "${GREEN}Creating namespace...${NC}"
kubectl create namespace openbooklm --dry-run=client -o yaml | kubectl apply -f -

# Create API credentials secret
echo -e "${GREEN}Creating API credentials secret...${NC}"
# kubectl create secret generic api-credentials \
#     --namespace openbooklm \
#     --from-literal=CEREBRAS_API_KEY="$CEREBRAS_API_KEY" \
#     --from-literal=LLAMA_API_KEY="$LLAMA_API_KEY" \
#     --from-literal=OPENAI_API_KEY="$OPENAI_API_KEY"

# Verify API credentials secret creation
# if ! kubectl get secret api-credentials -n openbooklm > /dev/null 2>&1; then
#     echo -e "${RED}Error: Failed to create API credentials secret${NC}"
#     exit 1
# fi

# Apply Kubernetes configurations
echo -e "${GREEN}Applying Kubernetes configurations...${NC}"
kubectl apply -f k8s/ -n openbooklm

# Wait for pod creation
echo -e "${YELLOW}Waiting for pod creation...${NC}"
sleep 15

# Get the pod name and show logs
POD_NAME=$(kubectl get pods -n openbooklm -l app=openbooklm -o jsonpath='{.items[0].metadata.name}')
if [ -n "$POD_NAME" ]; then
    echo -e "${YELLOW}Pod logs for $POD_NAME:${NC}"
    kubectl logs -n openbooklm $POD_NAME --follow &
    LOGS_PID=$!

    # Wait for deployment with increased timeout
    if ! kubectl rollout status deployment/openbooklm -n openbooklm --timeout=600s; then
        echo -e "${RED}Deployment failed. Pod details:${NC}"
        kubectl describe pod -n openbooklm $POD_NAME
        kill $LOGS_PID
        exit 1
    fi
    kill $LOGS_PID
else
    echo -e "${RED}No pods found${NC}"
    exit 1
fi

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${YELLOW}Service details:${NC}"
kubectl get service openbooklm -n openbooklm