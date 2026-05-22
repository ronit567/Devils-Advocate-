#!/bin/bash
set -e

cd "$(dirname "$0")/backend"

if [ ! -d ".venv" ]; then
  echo "Creating virtualenv..."
  python3 -m venv .venv
fi

source .venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt -q

if [ ! -f ".env" ]; then
  echo "ERROR: No .env file found. Copy .env.example to .env and add your ANTHROPIC_API_KEY."
  exit 1
fi

echo "Starting FastAPI backend on http://localhost:8000"
uvicorn main:app --reload --port 8000
