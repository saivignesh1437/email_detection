"""
Main FastAPI Application Entrypoint
Intelligent Email Management and Spam Detection Platform Backend
"""
import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app.config import BACKEND_HOST, BACKEND_PORT, ALLOWED_ORIGINS, IS_PRODUCTION
from backend.app.routers import (
    auth_router,
    users_router,
    categories_router,
    emails_router,
    spam_router,
    search_router,
    dashboard_router,
)
from backend.app.database import engine, Base
import backend.app.models # ensures all models are loaded

# Initialize database schema tables if not present
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Intelligent Email Management and Spam Detection Platform",
    description="Integrated relational email management, ML text classification, and DBMS features demonstration API",
    version="1.0.0"
)

# Enable CORS for deployed frontend origin and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(categories_router)
app.include_router(emails_router)
app.include_router(spam_router)
app.include_router(search_router)
app.include_router(dashboard_router)

@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend service and database connectivity."""
    from sqlalchemy import text
    from backend.app.database import SessionLocal
    db_status = "unhealthy"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1;"))
        db.close()
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "online",
        "service": "Intelligent Email Management Platform API",
        "database": db_status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=BACKEND_HOST, port=BACKEND_PORT, reload=(not IS_PRODUCTION))
