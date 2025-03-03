#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting PostgreSQL port forwarding...${NC}"

# Check if port 5432 is already in use
if lsof -i :5432 > /dev/null; then
    echo -e "${RED}Port 5432 is already in use. Killing existing process...${NC}"
    sudo kill $(lsof -t -i:5432)
    sleep 2
fi

# Start port forwarding
echo "Forwarding PostgreSQL port..."
kubectl port-forward service/postgres 5432:5432 -n openbooklm

# Handle script interruption
trap 'echo -e "\n${RED}Port forwarding stopped${NC}"; exit' INT