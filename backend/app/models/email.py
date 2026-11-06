"""
Email Model Definition
Maps to emails table with foreign key relationships.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Email(Base):
    __tablename__ = "emails"

    email_id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    received_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    status = Column(String(30), nullable=False, default="Inbox", index=True)
    category_id = Column(Integer, ForeignKey("categories.category_id", ondelete="SET NULL"), nullable=True, index=True)

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_emails")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_emails")
    category = relationship("Category", back_populates="emails")
    spam_detection = relationship("SpamDetection", back_populates="email", uselist=False, cascade="all, delete-orphan")
    dsa_detection = relationship("DsaDetection", back_populates="email", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("EmailAuditLog", back_populates="email", cascade="all, delete-orphan")

