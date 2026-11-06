#!/usr/bin/env bash
# ==============================================================================
# STOP_PROJECT.command
# Intelligent Email Detection and Management Platform
# Automated One-Click System Shutdown for macOS
# Safely stops project processes without stopping or resetting PostgreSQL!
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================================"
echo " INTELLIGENT EMAIL DETECTION AND MANAGEMENT PLATFORM"
echo " Safely Stopping Application Services (React, FastAPI, Java DSA)"
echo " Note: PostgreSQL is PRESERVED and remains untouched on port 5432."
echo "======================================================================"

# 1. Stop React Frontend
echo "[1/3] Stopping React Frontend (port 5173)..."
if [ -f .frontend.pid ]; then
    PID=$(cat .frontend.pid)
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
        echo "  -> Stopped React frontend process (PID $PID)."
    fi
    rm -f .frontend.pid
fi
# Secondary cleanup for any node process binding 5173
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# 2. Stop FastAPI Backend
echo "[2/3] Stopping FastAPI Backend (port 8000)..."
if [ -f .backend.pid ]; then
    PID=$(cat .backend.pid)
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
        echo "  -> Stopped FastAPI process (PID $PID)."
    fi
    rm -f .backend.pid
fi
# Secondary cleanup for uvicorn binding 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# 3. Stop Java DSA Engine
echo "[3/3] Stopping Java DSA Engine (port 8080)..."
if [ -f .dsa_engine.pid ]; then
    PID=$(cat .dsa_engine.pid)
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
        echo "  -> Stopped Java DSA process (PID $PID)."
    fi
    rm -f .dsa_engine.pid
fi
# Secondary cleanup for process binding 8080
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

echo "======================================================================"
echo " ALL PROJECT APPLICATION SERVICES STOPPED CLEANLY"
echo " - React (5173): Stopped"
echo " - FastAPI (8000): Stopped"
echo " - Java DSA (8080): Stopped"
echo " - PostgreSQL (5432): UNTOUCHED and RUNNING"
echo "======================================================================"
