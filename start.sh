#!/bin/bash

# SplitMint - Start Script
# Starts both backend (FastAPI) and frontend (Next.js) servers

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null && echo -e "${GREEN}✓ Backend stopped${NC}"
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null && echo -e "${GREEN}✓ Frontend stopped${NC}"
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# ── Check PostgreSQL ──────────────────────────────────
echo -e "${YELLOW}Checking PostgreSQL...${NC}"
if command -v pg_isready &>/dev/null && pg_isready -q 2>/dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}✗ PostgreSQL is not running. Start it with: brew services start postgresql@14${NC}"
    exit 1
fi

# ── Backend Setup ─────────────────────────────────────
echo -e "${YELLOW}Setting up backend...${NC}"

if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo "Creating Python virtual environment..."
    python3.11 -m venv "$BACKEND_DIR/venv"
fi

echo "Installing backend dependencies..."
"$BACKEND_DIR/venv/bin/pip" install -q -r "$BACKEND_DIR/requirements.txt"

if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "Creating .env file..."
    cat > "$BACKEND_DIR/.env" <<EOF
DATABASE_URL=postgresql://splitmint:splitmint@localhost:5432/splitmint
SECRET_KEY=supersecretkey_splitmint_2024_change_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_URL=http://localhost:3000
EOF
fi

echo -e "${GREEN}✓ Backend ready${NC}"

# ── Frontend Setup ────────────────────────────────────
echo -e "${YELLOW}Setting up frontend...${NC}"

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd "$FRONTEND_DIR" && npm install
fi

echo -e "${GREEN}✓ Frontend ready${NC}"

# ── Start Servers ─────────────────────────────────────
echo ""
echo -e "${YELLOW}Starting servers...${NC}"

# Start backend
cd "$BACKEND_DIR"
"$BACKEND_DIR/venv/bin/uvicorn" app.main:app --reload --port 8000 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend starting on http://localhost:8000${NC}"

# Start frontend
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend starting on http://localhost:3000${NC}"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  SplitMint is running!${NC}"
echo -e "${GREEN}  Frontend:  http://localhost:3000${NC}"
echo -e "${GREEN}  Backend:   http://localhost:8000${NC}"
echo -e "${GREEN}  API Docs:  http://localhost:8000/docs${NC}"
echo -e "${GREEN}  Press Ctrl+C to stop all servers${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""

# Wait for both processes
wait
