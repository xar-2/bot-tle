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
    kill $PYTHON_PID $NODE_PID
    exit
}

trap cleanup SIGINT SIGTERM

# Start Python API
echo -e "${BLUE}[Python]${NC} Starting AI Engine..."
cd python && source venv/bin/activate 2>/dev/null || echo "No venv found, using system python"
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
PYTHON_PID=$!
cd ..

# Wait for Python API to be ready
echo "Waiting for AI Engine to initialize..."
sleep 3

# Start Node.js Bot
echo -e "${GREEN}[Node]${NC} Starting Telegram Bot..."
cd node
npm start &
NODE_PID=$!
cd ..

echo -e "${GREEN}✅ All services are running!${NC}"
wait
