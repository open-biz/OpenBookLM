#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test data
USER_ID="test_user_123"
NOTEBOOK_ID="test_notebook_456"
CHAT_HISTORY='[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi there! How can I help you today?"}]'
LARGE_CHAT='['
for i in {1..100}; do
  LARGE_CHAT+='{"role":"user","content":"Message '${i}'"},'
  LARGE_CHAT+='{"role":"assistant","content":"Response to message '${i}'"},'
done
LARGE_CHAT=${LARGE_CHAT%,}']'

echo -e "${YELLOW}Starting Redis Performance Tests...${NC}\n"

# Function to measure operation time
measure() {
  local start=$(gdate +%s.%N 2>/dev/null || date +%s.%N)
  eval "$1"
  local end=$(gdate +%s.%N 2>/dev/null || date +%s.%N)
  local duration=$(echo "$end - $start" | bc)
  local ms=$(echo "$duration * 1000" | bc)
  echo -e "${BLUE}Operation:${NC} $2"
  echo -e "${GREEN}Time taken:${NC} ${ms%.*}ms\n"
}

# Test 1: Simple SET/GET
echo -e "${YELLOW}Test 1: Simple SET/GET Performance${NC}"
measure "docker exec openbooklm-redis-1 redis-cli SET test:key 'Hello World'" "SET small string"
measure "docker exec openbooklm-redis-1 redis-cli GET test:key" "GET small string"

# Test 2: JSON Operations
echo -e "${YELLOW}Test 2: JSON Data Performance${NC}"
measure "docker exec openbooklm-redis-1 redis-cli SET chat:$USER_ID:$NOTEBOOK_ID '$CHAT_HISTORY'" "SET JSON chat history"
measure "docker exec openbooklm-redis-1 redis-cli GET chat:$USER_ID:$NOTEBOOK_ID" "GET JSON chat history"

# Test 3: Large Data
echo -e "${YELLOW}Test 3: Large Data Performance${NC}"
measure "docker exec openbooklm-redis-1 redis-cli SET chat:large '$LARGE_CHAT'" "SET large chat history (200 messages)"
measure "docker exec openbooklm-redis-1 redis-cli GET chat:large" "GET large chat history"

# Test 4: Pipeline Performance
echo -e "${YELLOW}Test 4: Pipeline Performance${NC}"
measure "printf 'SET key1 value1\nSET key2 value2\nSET key3 value3\n' | docker exec -i openbooklm-redis-1 redis-cli --pipe" "Pipeline SET multiple keys"

# Test 5: Multiple Operations
echo -e "${YELLOW}Test 5: Multiple Operations Performance${NC}"
measure "for i in {1..10}; do docker exec openbooklm-redis-1 redis-cli SET test:key:\$i value\$i > /dev/null; done" "SET 10 keys sequentially"
measure "for i in {1..10}; do docker exec openbooklm-redis-1 redis-cli GET test:key:\$i > /dev/null; done" "GET 10 keys sequentially"

# Test 6: Redis Info
echo -e "${YELLOW}Test 6: Redis Server Stats${NC}"
echo -e "${BLUE}Memory Usage:${NC}"
docker exec openbooklm-redis-1 redis-cli INFO memory | grep "used_memory_human"
echo -e "\n${BLUE}Keyspace Stats:${NC}"
docker exec openbooklm-redis-1 redis-cli INFO keyspace

# Cleanup
echo -e "\n${YELLOW}Cleaning up test data...${NC}"
docker exec openbooklm-redis-1 redis-cli KEYS "test:*" | xargs -r docker exec openbooklm-redis-1 redis-cli DEL
docker exec openbooklm-redis-1 redis-cli DEL chat:large

echo -e "\n${GREEN}Performance tests completed!${NC}" 