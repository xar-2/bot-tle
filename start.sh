#!/bin/bash

# Bot-tle Launcher
echo "🚀 Starting Bot-tle Hybrid Services..."

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found! Please create one based on .env.example"
    exit 1
fi

# Function to stop services
cleanup() {
    echo -e "\n🛑 Stopping services..."
    kill $PYTHON_PID $NODE_PID 2>/dev/null
    fuser -k 8000/tcp 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Kill any existing process on port 8000
fuser -k 8000/tcp 2>/dev/null || true

# Use Railway's PORT or fallback to 8000
API_PORT=${PORT:-8000}
echo -e "${BLUE}[Python]${NC} Starting AI Engine on port ${API_PORT}..."

cd python
if [ -f "/opt/venv/bin/activate" ]; then
    source /opt/venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
fi
python3 -m uvicorn app.main:app --host 0.0.0.0 --port ${API_PORT} &
PYTHON_PID=$!
cd ..

# Wait for Python API to be ready
echo "Waiting for AI Engine to initialize..."
sleep 5

# Start Node.js Bot
echo -e "${GREEN}[Node]${NC} Starting Telegram Bot..."
cd node
export PYTHON_API_URL="http://localhost:${API_PORT}"
npm start &
NODE_PID=$!
cd ..

echo -e "${GREEN}✅ All services are running!${NC}"
wait
