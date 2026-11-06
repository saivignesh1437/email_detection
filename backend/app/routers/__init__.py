"""
Routers package initialization.
"""
from backend.app.routers.auth import router as auth_router
from backend.app.routers.users import router as users_router
from backend.app.routers.categories import router as categories_router
from backend.app.routers.emails import router as emails_router
from backend.app.routers.spam import router as spam_router
from backend.app.routers.search import router as search_router
from backend.app.routers.dashboard import router as dashboard_router

__all__ = [
    "auth_router", "users_router", "categories_router",
    "emails_router", "spam_router", "search_router", "dashboard_router"
]
