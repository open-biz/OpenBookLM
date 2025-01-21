#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up OpenBookLM development environment...${NC}\n"

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}Warning: .env file already exists. Skipping copy.${NC}"
else
    echo "Creating .env file from template..."
    cp .env.example .env
    echo -e "${GREEN}Created .env file. Please update it with your values.${NC}"
fi

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}Error: Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Start development environment
echo "Starting development environment..."
docker compose up -d

# Check if containers are running
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}Development environment is ready!${NC}"
    echo -e "Access the application at: ${GREEN}http://localhost:3000${NC}"
    echo -e "\nTo view logs: ${YELLOW}docker compose logs -f${NC}"
    echo -e "To stop: ${YELLOW}docker compose down${NC}"
    echo -e "\nUseful commands:"
    echo -e "View logs: ${YELLOW}docker compose logs -f${NC}"
    echo -e "View app logs: ${YELLOW}docker compose logs -f app${NC}"
    echo -e "View database logs: ${YELLOW}docker compose logs -f postgres${NC}"
    echo -e "\nNext.js App Logs:"
    echo -e "All logs: ${YELLOW}docker compose logs -f app${NC}"
    echo -e "Error logs: ${YELLOW}docker compose logs -f app 2>&1 | grep -i error${NC}"
    echo -e "API logs: ${YELLOW}docker compose logs -f app 2>&1 | grep -i '\[api\]'${NC}"
    echo -e "Build logs: ${YELLOW}docker compose logs -f app 2>&1 | grep -i 'compiled'${NC}"
else
    echo -e "${YELLOW}Error: Failed to start development environment${NC}"
    exit 1
fi 