#!/usr/bin/env bash
# ==============================================================================
# START_PROJECT.command
# Intelligent Email Detection and Management Platform
# Automated One-Click System Launcher for macOS
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# `python3` may resolve to a separate system installation even when Conda is
# active in Terminal. Pick an interpreter that actually has the backend deps.
PYTHON_BIN=""
for candidate in "${PYTHON_BIN_OVERRIDE:-}" "$SCRIPT_DIR/.venv/bin/python" python3 python; do
    [ -n "$candidate" ] || continue
    if command -v "$candidate" >/dev/null 2>&1 && \
       "$candidate" -c 'import fastapi, uvicorn, sqlalchemy' >/dev/null 2>&1; then
        PYTHON_BIN="$(command -v "$candidate")"
        break
    fi
done

if [ -z "$PYTHON_BIN" ]; then
    echo "[ERROR] No Python interpreter with FastAPI, Uvicorn, and SQLAlchemy was found."
    echo "        Install backend/requirements.txt in your Python environment, then retry."
    echo "        For example: python -m pip install -r backend/requirements.txt"
    exit 1
fi
echo "  -> Using Python: $PYTHON_BIN"

echo "======================================================================"
echo " INTELLIGENT EMAIL DETECTION AND MANAGEMENT PLATFORM"
echo " Starting System Services (PostgreSQL + Java DSA + FastAPI + React)"
echo "======================================================================"

# 1. Verify PostgreSQL is available on port 5432
echo "[1/5] Checking PostgreSQL connectivity on port 5432..."
if nc -z 127.0.0.1 5432 2>/dev/null || nc -z localhost 5432 2>/dev/null; then
    echo "  -> PostgreSQL is online on port 5432."
else
    echo "  [ERROR] PostgreSQL is not responding on port 5432."
    echo "  Please ensure PostgreSQL service is active without resetting data."
    exit 1
fi

# 2. Build and Start Java DSA Engine (Port 8080)
echo "[2/5] Checking Java DSA Spam Engine..."
if nc -z 127.0.0.1 8080 2>/dev/null; then
    echo "  -> Port 8080 is already active. Checking health..."
    if curl -s http://127.0.0.1:8080/health | grep -q "online"; then
        echo "  -> Java DSA Engine is already running and healthy."
    else
        echo "  [WARNING] Port 8080 is occupied by another process. Please free port 8080."
    fi
else
    echo "  -> Compiling Java DSA source files..."
    (cd dsa-engine && javac -d out $(find src -name "*.java"))
    echo "  -> Launching Java DSA Spam API on http://127.0.0.1:8080..."
    nohup java -cp dsa-engine/out main.SpamApi > dsa_engine.log 2>&1 &
    JAVA_PID=$!
    echo $JAVA_PID > .dsa_engine.pid

    # Health check loop
    echo "  -> Waiting for Java DSA API to become ready..."
    READY=0
    for i in {1..15}; do
        if curl -s http://127.0.0.1:8080/health | grep -q "online" 2>/dev/null; then
            READY=1
            break
        fi
        sleep 1
    done

    if [ $READY -eq 1 ]; then
        echo "  -> Java DSA Engine is online and verified."
    else
        echo "  [ERROR] Java DSA API failed to respond on http://127.0.0.1:8080."
        cat dsa_engine.log
        exit 1
    fi
fi

# 3. Start FastAPI Backend (Port 8000)
echo "[3/5] Checking FastAPI Backend..."
if nc -z 127.0.0.1 8000 2>/dev/null; then
    echo "  -> Port 8000 is already active. Checking health..."
    if curl -s http://127.0.0.1:8000/api/health | grep -q "online"; then
        echo "  -> FastAPI Backend is already running and healthy."
    else
        echo "  [WARNING] Port 8000 is occupied by another process."
    fi
else
    echo "  -> Launching FastAPI Backend on http://127.0.0.1:8000..."
    : > backend.log
    nohup "$PYTHON_BIN" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 > backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > .backend.pid

    # Health check loop
    echo "  -> Waiting for FastAPI to become ready..."
    READY=0
    for i in {1..20}; do
        if curl -s http://127.0.0.1:8000/api/health | grep -q "online" 2>/dev/null; then
            READY=1
            break
        fi
        sleep 1
    done

    if [ $READY -eq 1 ]; then
        echo "  -> FastAPI Backend is online and verified."
    else
        echo "  [ERROR] FastAPI failed to respond on http://127.0.0.1:8000."
        echo "  -> Backend startup log: $SCRIPT_DIR/backend.log"
        cat backend.log
        exit 1
    fi
fi

# 4. Start React Frontend (Port 5173)
echo "[4/5] Checking React Frontend Client..."
if nc -z 127.0.0.1 5173 2>/dev/null; then
    echo "  -> Port 5173 is already active. React Frontend is running."
else
    # Build if dist/ does not exist
    if [ ! -d "frontend/dist" ]; then
        echo "  -> Building React production bundle..."
        (cd frontend && npm run build)
    fi
    echo "  -> Launching React Frontend on http://127.0.0.1:5173..."
    nohup python3 -m http.server 5173 -d frontend/dist --bind 127.0.0.1 > frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > .frontend.pid

    # Readiness wait
    echo "  -> Waiting for React server to bind..."
    READY=0
    for i in {1..15}; do
        if nc -z 127.0.0.1 5173 2>/dev/null; then
            READY=1
            break
        fi
        sleep 1
    done

    if [ $READY -eq 1 ]; then
        echo "  -> React Frontend is online on http://127.0.0.1:5173."
    else
        echo "  [WARNING] Frontend may still be starting. Check frontend.log."
    fi
fi




# 5. Open Browser
echo "[5/5] Launching user interface in browser..."
sleep 1
if which open >/dev/null 2>&1; then
    open "http://localhost:5173"
fi

echo "======================================================================"
echo " SYSTEM SUCCESSFULLY LAUNCHED"
echo " - React Frontend:   http://localhost:5173"
echo " - FastAPI Backend:  http://localhost:8000/docs"
echo " - Java DSA Engine:  http://localhost:8080/health"
echo " - PostgreSQL DB:    localhost:5432 (email_management_db)"
echo " To safely stop all services, run: ./STOP_PROJECT.command"
echo "======================================================================"
