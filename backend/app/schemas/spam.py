"""
Spam Detection Pydantic Schemas
"""
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

class SpamPredictRequest(BaseModel):
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)

class SpamPredictResponse(BaseModel):
    is_spam: bool
    classification: str
    spam_score: float
    confidence_percentage: float
    reason: str

class SpamDetectionResponse(BaseModel):
    detection_id: int
    email_id: int
    spam_score: float
    classification: str
    reason: str | None = None
    detected_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

class SpamDetectionDetail(SpamDetectionResponse):
    subject: str | None = None
    sender_email: str | None = None
    receiver_email: str | None = None

class DsaDetectionResponse(BaseModel):
    detection_id: int | None = None
    email_id: int | None = None
    spam_score: int
    risk_level: str
    classification: str
    detected_keywords: list[str] = []
    exact_matches: list[str] = []
    fuzzy_matches: list[str] = []
    detected_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

class HybridClassification(BaseModel):
    classification: str # 'SPAM', 'NOT SPAM', 'SUSPICIOUS'
    reason: str
    decision_rule: str

class CombinedSpamAnalysisResponse(BaseModel):
    email_id: int | None = None
    ml: dict[str, Any]
    dsa: DsaDetectionResponse
    final: HybridClassification

