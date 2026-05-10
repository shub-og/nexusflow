#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# Team Task Manager — Local Development Startup Script
# Run: chmod +x run.sh && ./run.sh
# ─────────────────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🚀 Team Task Manager — Local Dev${NC}"
echo "────────────────────────────────────"

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found. Install from https://nodejs.org${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check if .env exists for server
if [ ! -f "server/.env" ]; then
  echo -e "${YELLOW}⚠️  server/.env not found — copying from .env.example${NC}"
  cp server/.env.example server/.env
  echo -e "${YELLOW}   → Edit server/.env and set DATABASE_URL, FIREBASE_* etc.${NC}"
fi

# Check if client .env.local exists
if [ ! -f "client/.env.local" ]; then
  echo -e "${YELLOW}⚠️  client/.env.local not found — copying from .env.example${NC}"
  cp client/.env.example client/.env.local
  echo -e "${YELLOW}   → Edit client/.env.local and set REACT_APP_FIREBASE_* etc.${NC}"
fi

# Install dependencies if needed
if [ ! -d "server/node_modules" ]; then
  echo -e "${BLUE}📦 Installing server dependencies...${NC}"
  cd server && npm install && cd ..
fi

if [ ! -d "client/node_modules" ]; then
  echo -e "${BLUE}📦 Installing client dependencies...${NC}"
  cd client && npm install && cd ..
fi

echo ""
echo -e "${GREEN}Starting servers...${NC}"
echo -e "  Backend  → ${BLUE}http://localhost:5000${NC}"
echo -e "  Frontend → ${BLUE}http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Start both servers concurrently
(cd server && npm run dev) &
SERVER_PID=$!

(cd client && npm start) &
CLIENT_PID=$!

# Handle Ctrl+C
trap "echo ''; echo 'Stopping servers...'; kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit 0" INT

wait
