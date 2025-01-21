#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory of the script and move to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_ROOT"

echo -e "${GREEN}Deploying to Fly.io...${NC}\n"

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo -e "${YELLOW}Error: flyctl is not installed. Please install it first:${NC}"
    echo "curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if user is logged in
if ! flyctl auth whoami &> /dev/null; then
    echo "Please log in to Fly.io:"
    flyctl auth login
fi

# Check if app exists, if not create it
if ! flyctl status &> /dev/null; then
    echo "Creating new Fly.io app..."
    flyctl launch --no-deploy
fi

# Check if PostgreSQL is attached and properly configured
echo "Checking database configuration..."
if ! flyctl postgres list | grep -q "openbooklm-db"; then
    echo "Creating PostgreSQL database..."
    flyctl postgres create openbooklm-db --name openbooklm-db --region dfw
fi

# Get current DATABASE_URL
echo "Checking database connection..."
DB_URL=$(flyctl secrets list | grep DATABASE_URL | sed 's/DATABASE_URL=//')

if [[ -z "$DB_URL" ]]; then
    echo "No DATABASE_URL found. Attaching database..."
    # Generate a unique database user name using timestamp
    DB_USER="user_$(date +%s)"
    echo "Creating new database user: $DB_USER"
    
    # Attach database and capture the output
    ATTACH_OUTPUT=$(flyctl postgres attach openbooklm-db --app openbooklm --database-user "$DB_USER")
    
    # Extract the new DATABASE_URL from the attachment output
    DB_URL=$(echo "$ATTACH_OUTPUT" | grep "DATABASE_URL=" | sed 's/DATABASE_URL=//')
fi

# Validate DATABASE_URL format
if [[ ! "$DB_URL" =~ ^postgres(ql)?:// ]]; then
    echo -e "${RED}Error: Invalid DATABASE_URL format${NC}"
    exit 1
fi

# Set DATABASE_URL for subsequent commands
export DATABASE_URL="$DB_URL"

# Load and set other environment variables
echo "Setting up other secrets..."
if [ -f "$PROJECT_ROOT/.env" ]; then
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ $key =~ ^#.*$ ]] || [ -z "$key" ] && continue
        
        # Clean up key and value
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs | sed -e 's/^["\x27]//' -e 's/["\x27]$//')
        
        # Skip DATABASE_URL as we handle it separately
        [[ "$key" == "DATABASE_URL" ]] && continue
        
        echo "Setting $key..."
        flyctl secrets set "$key=$value"
    done < "$PROJECT_ROOT/.env"
fi

# Verify database connection and run migrations
echo "Running database migrations..."
if ! npx prisma migrate deploy; then
    echo -e "${RED}Error: Database migration failed${NC}"
    exit 1
fi

# Deploy the application
echo "Deploying application..."
if flyctl deploy; then
    echo -e "\n${GREEN}Deployment successful!${NC}"
    echo -e "To view your app: ${YELLOW}flyctl open${NC}"
    echo -e "To view logs: ${YELLOW}flyctl logs${NC}"
else
    echo -e "${RED}Error: Deployment failed${NC}"
    exit 1
fi 