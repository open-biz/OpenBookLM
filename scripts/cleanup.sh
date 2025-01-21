#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Cleaning up development environment...${NC}"

# Stop containers
docker compose down

# Remove development database volume
docker volume rm openbooklm_postgres_data

echo -e "${GREEN}Cleanup complete!${NC}" 