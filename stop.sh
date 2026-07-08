#!/bin/bash
echo 'Stopping all AI Time Management services...'
kill -9 9404 9405 9406 9407 2>/dev/null
kill -9 $(lsof -t -i:8000) $(lsof -t -i:3000) $(lsof -t -i:8501) 2>/dev/null
pkill -f 'python agent.py' 2>/dev/null
pkill -f 'streamlit run' 2>/dev/null
echo 'All services stopped!'
