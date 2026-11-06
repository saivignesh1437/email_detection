"""
Email Pydantic Schemas
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from backend.app.schemas.user import UserResponse
from backend.app.schemas.category import CategoryResponse
from backend.app.schemas.spam import SpamDetectionResponse, DsaDetectionResponse

class EmailCreate(BaseModel):
    receiver_id: int
    subject: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1)
    category_id: int | None = 1
    auto_detect_spam: bool = True

class EmailUpdateStatus(BaseModel):
    status: str = Field(..., pattern="^(Inbox|Read|Spam|Trash|Archived)$")

class EmailResponse(BaseModel):
    email_id: int
    sender_id: int
    receiver_id: int
    subject: str
    body: str
    received_at: datetime | None = None
    status: str
    category_id: int | None = None
    
    sender: UserResponse | None = None
    receiver: UserResponse | None = None
    category: CategoryResponse | None = None
    spam_detection: SpamDetectionResponse | None = None
    dsa_detection: DsaDetectionResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class EmailAuditResponse(BaseModel):
    audit_id: int
    email_id: int
    action: str
    previous_status: str | None = None
    new_status: str | None = None
    details: str | None = None
    changed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

class EmailDetailResponse(EmailResponse):
    audit_logs: list[EmailAuditResponse] = []

class EmailSearchResult(BaseModel):
    email_id: int
    sender_id: int
    sender_name: str
    sender_email: str
    receiver_id: int
    receiver_name: str
    receiver_email: str
    subject: str
    body: str
    received_at: datetime | None = None
    status: str
    category_id: int | None = None
    category_name: str | None = None
    spam_score: float | None = None
    classification: str | None = None
    detection_reason: str | None = None

    model_config = ConfigDict(from_attributes=True)

