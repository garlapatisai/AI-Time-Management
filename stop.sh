#!/bin/bash
echo 'Stopping all AI Time Management services...'
kill -9 12972 12973 12974 2>/dev/null
kill -9 $(lsof -t -i:8000) $(lsof -t -i:3000) 2>/dev/null
pkill -f 'python agent.py' 2>/dev/null
echo 'All services stopped!'
