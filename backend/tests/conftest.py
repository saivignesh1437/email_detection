"""
Pytest Fixtures and Test Configuration
"""
import sys
import os
from pathlib import Path
import pytest
from starlette.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.services.auth_service import create_access_token

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture(scope="session")
def db():
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture(scope="session")
def admin_headers():
    token = create_access_token(data={"sub": "1", "email": "admin@emailmgmt.local"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def user_headers():
    token = create_access_token(data={"sub": "2", "email": "john.doe@emailmgmt.local"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def other_user_headers():
    token = create_access_token(data={"sub": "3", "email": "alice.smith@emailmgmt.local"})
    return {"Authorization": f"Bearer {token}"}

