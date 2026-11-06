"""
User Model Definition
Maps to users table with relational integrity.
"""
from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sent_emails = relationship("Email", foreign_keys="Email.sender_id", back_populates="sender", cascade="all, delete-orphan")
    received_emails = relationship("Email", foreign_keys="Email.receiver_id", back_populates="receiver", cascade="all, delete-orphan")
