"""
Spam Detection Model Definition
Maps to spam_detection table storing ML classification metrics.
"""
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from backend.app.database import Base

class SpamDetection(Base):
    __tablename__ = "spam_detection"

    detection_id = Column(Integer, primary_key=True, index=True)
    email_id = Column(Integer, ForeignKey("emails.email_id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    spam_score = Column(Float, nullable=False)
    classification = Column(String(20), nullable=False, index=True) # 'Spam' or 'Not Spam'
    reason = Column(Text, nullable=True)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())

    email = relationship("Email", back_populates="spam_detection")
