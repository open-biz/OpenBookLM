#!/bin/sh
set -e

# Wait for database to be ready
echo "Waiting for database to be ready..."
npx wait-on tcp:db:5432 -t 60000

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Then run the main container command
exec "$@"