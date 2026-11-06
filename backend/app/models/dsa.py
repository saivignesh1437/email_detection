"""
DSA Detection Model Definition
Maps to dsa_detection table storing Java DSA pattern analysis metrics.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from backend.app.database import Base

class DsaDetection(Base):
    __tablename__ = "dsa_detection"

    detection_id = Column(Integer, primary_key=True, index=True)
    email_id = Column(Integer, ForeignKey("emails.email_id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    spam_score = Column(Integer, nullable=False)
    risk_level = Column(String(20), nullable=False, index=True) # 'LOW', 'MEDIUM', 'HIGH'
    classification = Column(String(20), nullable=False, index=True) # 'SPAM' or 'NOT SPAM'
    detected_keywords = Column(JSONB, default=list)
    exact_matches = Column(JSONB, default=list)
    fuzzy_matches = Column(JSONB, default=list)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())

    email = relationship("Email", back_populates="dsa_detection")
