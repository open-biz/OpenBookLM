#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Listing all containers in openbooklm namespace...${NC}"
echo -e "${YELLOW}=======================${NC}"

kubectl get pods -n openbooklm -o wide

echo -e "\n${GREEN}Container Details:${NC}"
echo -e "${YELLOW}=======================${NC}"

kubectl describe pods -n openbooklm