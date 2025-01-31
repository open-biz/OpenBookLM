#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Environment variables
PROJECT_ROOT=$(pwd)
ENV_FILE="$PROJECT_ROOT/.env"

echo -e "${GREEN}Deploying OpenBookLM to Linode...${NC}"

# Check for required environment variables
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Load environment variables
set -a
source "$ENV_FILE"
set +a

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
pnpm install

# Generate Prisma client
echo -e "${GREEN}Generating Prisma client...${NC}"
npx prisma generate

# Run database migrations
echo -e "${GREEN}Running database migrations...${NC}"
npx prisma migrate deploy

# Build the application
echo -e "${GREEN}Building the application...${NC}"
pnpm build

# Start the application with PM2
echo -e "${GREEN}Starting the application...${NC}"
if pm2 list | grep -q "openbooklm"; then
    pm2 reload openbooklm
else
    pm2 start npm --name "openbooklm" -- start
fi

# Start the FastAPI backend
echo -e "${GREEN}Starting the backend server...${NC}"
if pm2 list | grep -q "openbooklm-backend"; then
    pm2 reload openbooklm-backend
else
    pm2 start "python3 backend/api/main.py" --name "openbooklm-backend"
fi

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "Your application should now be running at: ${YELLOW}http://YOUR_LINODE_IP:3000${NC}"
echo -e "\nUseful commands:"
echo -e "View logs: ${YELLOW}pm2 logs${NC}"
echo -e "Monitor: ${YELLOW}pm2 monit${NC}"
echo -e "Stop app: ${YELLOW}pm2 stop all${NC}" 