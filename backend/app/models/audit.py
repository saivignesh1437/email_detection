"""
Email Audit Log Model Definition
Maps to email_audit_log table populated via PostgreSQL triggers.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from backend.app.database import Base

class EmailAuditLog(Base):
    __tablename__ = "email_audit_log"

    audit_id = Column(Integer, primary_key=True, index=True)
    email_id = Column(Integer, ForeignKey("emails.email_id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(50), nullable=False)
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=True)
    details = Column(Text, nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())

    email = relationship("Email", back_populates="audit_logs")
