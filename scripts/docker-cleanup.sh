#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Docker cleanup...${NC}"

# Stop all running containers
echo "Stopping all containers..."
docker compose down

# Remove all unused containers, networks, images and volumes
echo "Removing all unused Docker resources..."
docker system prune -af --volumes

# Remove all volumes
echo "Removing all volumes..."
docker volume rm $(docker volume ls -q) 2>/dev/null || true

# Clean up data directories
echo "Cleaning up data directories..."
sudo rm -rf data/postgres data/redis

# Recreate data directories with proper permissions
echo "Creating fresh data directories..."
mkdir -p data/postgres data/redis
chmod 777 data/postgres data/redis

# Show current space usage
echo -e "\n${GREEN}Current Docker space usage:${NC}"
docker system df

echo -e "\n${GREEN}Cleanup complete!${NC}" 