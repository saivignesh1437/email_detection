"""
Models package initialization.
Exports all ORM models for SQLAlchemy metadata discovery.
"""
from backend.app.models.user import User
from backend.app.models.category import Category
from backend.app.models.email import Email
from backend.app.models.spam import SpamDetection
from backend.app.models.audit import EmailAuditLog
from backend.app.models.dsa import DsaDetection

__all__ = ["User", "Category", "Email", "SpamDetection", "EmailAuditLog", "DsaDetection"]

