#!/bin/bash

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting AI Time Management Assistant services...${NC}"

# Get directory path
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Kill any existing processes on port 8000 and 3000 to avoid conflicts
echo "Cleaning up existing processes..."
kill -9 $(lsof -t -i:8000) 2>/dev/null
kill -9 $(lsof -t -i:3000) 2>/dev/null
pkill -f "python agent.py" 2>/dev/null
sleep 1

# Start Backend
echo -e "${BLUE}Starting FastAPI Backend on http://localhost:8000...${NC}"
cd "$DIR/backend"
source venv/bin/activate
nohup uvicorn app.main:app --port 8000 --reload > "$DIR/backend/backend.log" 2>&1 &
BACKEND_PID=$!

# Start Next.js Frontend
echo -e "${BLUE}Starting Next.js Frontend on http://localhost:3000...${NC}"
cd "$DIR/frontend"
nohup npm run dev > "$DIR/frontend/frontend.log" 2>&1 &
FRONTEND_PID=$!

# Start MacOS Agent
echo -e "${BLUE}Starting MacOS Activity Tracking Agent...${NC}"
cd "$DIR/backend"
source venv/bin/activate
nohup python agent.py > "$DIR/backend/agent.log" 2>&1 &
AGENT_PID=$!

echo -e "${GREEN}All services launched in background!${NC}"
echo -e "Next.js Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "Backend API: ${GREEN}http://localhost:8000/docs${NC}"
echo ""
echo -e "Logs are being redirected to:"
echo -e "  - Backend log: ${BLUE}$DIR/backend/backend.log${NC}"
echo -e "  - Next.js log: ${BLUE}$DIR/frontend/frontend.log${NC}"
echo -e "  - Agent log: ${BLUE}$DIR/backend/agent.log${NC}"
echo ""

# Write a stop script for easy cleanup
echo "#!/bin/bash" > "$DIR/stop.sh"
echo "echo 'Stopping all AI Time Management services...'" >> "$DIR/stop.sh"
echo "kill -9 $BACKEND_PID $FRONTEND_PID $AGENT_PID 2>/dev/null" >> "$DIR/stop.sh"
echo "kill -9 \$(lsof -t -i:8000) \$(lsof -t -i:3000) 2>/dev/null" >> "$DIR/stop.sh"
echo "pkill -f 'python agent.py' 2>/dev/null" >> "$DIR/stop.sh"
echo "echo 'All services stopped!'" >> "$DIR/stop.sh"
chmod +x "$DIR/stop.sh"

echo -e "To stop all services, run: ${RED}./stop.sh${NC}"
