#!/bin/bash

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/openbooklm"
REDIS_URL="redis://localhost:6379"
# Add your Clerk keys here
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
# Add your AI API keys here
CEREBRAS_API_KEY=""
LLAMA_API_KEY=""
OPENAI_API_KEY=""
EOL
    echo "Created .env file. Please fill in your API keys."
fi

# Start PostgreSQL and Redis containers
echo "Starting PostgreSQL and Redis..."
docker-compose up -d db redis

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until docker-compose exec db pg_isready -U postgres; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 1
done

# Run database migrations
echo "Running database migrations..."
pnpm prisma migrate dev

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

echo "Development environment is ready!"
echo "You can now run 'pnpm dev' to start the development server."
echo ""
echo "Database connection: postgresql://postgres:postgres@localhost:5432/openbooklm"
echo "Redis connection: redis://localhost:6379"
echo ""
echo "Don't forget to add your API keys to the .env file!"
