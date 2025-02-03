#!/bin/bash

# Function to check if redis is running
check_redis() {
  docker exec openbooklm-redis-1 redis-cli ping > /dev/null 2>&1
  return $?
}

# Test data
USER_ID="test_user_123"
NOTEBOOK_ID="test_notebook_456"
CHAT_HISTORY='[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi there! How can I help you today?"}]'
NOTEBOOK_DATA='{"id":"test_notebook_456","title":"Test Notebook","content":"This is a test notebook"}'

echo "🧪 Starting Redis tests..."

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
while ! check_redis; do
  sleep 1
done

# Clear any existing test data
echo "Clearing existing test data..."
docker exec openbooklm-redis-1 redis-cli DEL "chat:${USER_ID}:${NOTEBOOK_ID}"
docker exec openbooklm-redis-1 redis-cli DEL "notebook:${USER_ID}:${NOTEBOOK_ID}"

# Test 1: Set chat history
echo "Test 1: Setting chat history..."
docker exec openbooklm-redis-1 redis-cli SET "chat:${USER_ID}:${NOTEBOOK_ID}" "$CHAT_HISTORY"

# Test 2: Get chat history
echo "Test 2: Getting chat history..."
docker exec openbooklm-redis-1 redis-cli GET "chat:${USER_ID}:${NOTEBOOK_ID}"

# Test 3: Set notebook data
echo "Test 3: Setting notebook data..."
docker exec openbooklm-redis-1 redis-cli SET "notebook:${USER_ID}:${NOTEBOOK_ID}" "$NOTEBOOK_DATA"

# Test 4: Get notebook data
echo "Test 4: Getting notebook data..."
docker exec openbooklm-redis-1 redis-cli GET "notebook:${USER_ID}:${NOTEBOOK_ID}"

# Test 5: Check keys
echo "Test 5: Listing all keys..."
docker exec openbooklm-redis-1 redis-cli KEYS "*"

# Test 6: Check TTL
echo "Test 6: Checking TTL for chat history..."
docker exec openbooklm-redis-1 redis-cli TTL "chat:${USER_ID}:${NOTEBOOK_ID}"

echo "✅ Tests completed!" 