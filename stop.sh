#!/bin/bash
echo 'Stopping all AI Time Management services...'
kill -9 11526 11527 11528 2>/dev/null
kill -9 $(lsof -t -i:8000) $(lsof -t -i:3000) 2>/dev/null
pkill -f 'python agent.py' 2>/dev/null
echo 'All services stopped!'
