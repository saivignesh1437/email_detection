"""
Application Configuration Settings
Loads environment variables from .env with secure production defaults.
"""
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass

# 1. Environment Detection
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT in ("production", "prod") or bool(os.getenv("RENDER"))

# 2. Database Connection
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+psycopg2://postgres@localhost:5432/email_management_db"
)
# Normalizes Render / cloud database URLs to SQLAlchemy's psycopg2 dialect
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)

# 3. Security & JWT Settings
DEFAULT_DEV_SECRET = "student_super_secret_jwt_key_email_management_2026"
SECRET_KEY = os.getenv("SECRET_KEY", "").strip()

if not SECRET_KEY:
    if IS_PRODUCTION:
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: SECRET_KEY environment variable is missing. "
            "A cryptographically strong random SECRET_KEY must be provided for production/deployed environments."
        )
    SECRET_KEY = DEFAULT_DEV_SECRET
elif IS_PRODUCTION and SECRET_KEY == DEFAULT_DEV_SECRET:
    raise RuntimeError(
        "CRITICAL SECURITY CONFIGURATION ERROR: Default sample SECRET_KEY cannot be used in a deployed environment. "
        "Please provide a secure, unique SECRET_KEY environment variable."
    )

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# 4. Host & Port Configuration (honors Render's dynamic $PORT)
BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("PORT", os.getenv("BACKEND_PORT", "8000")))
FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", "5173"))

# 5. Java DSA Spam Engine Service URL
dsa_host = os.getenv("DSA_ENGINE_HOST")
if dsa_host:
    dsa_port = os.getenv("DSA_ENGINE_PORT", "8080")
    DSA_ENGINE_URL = f"http://{dsa_host}:{dsa_port}"
else:
    DSA_ENGINE_URL = os.getenv("DSA_ENGINE_URL", "http://127.0.0.1:8080")

# 6. CORS Allowed Origins (retains local dev origins and adds deployed frontend)
raw_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

if raw_origins:
    configured_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
    ALLOWED_ORIGINS = default_origins + [o for o in configured_origins if o not in default_origins]
else:
    ALLOWED_ORIGINS = list(default_origins)

frontend_url = os.getenv("FRONTEND_URL", "").strip()
if frontend_url and frontend_url not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(frontend_url)


