"""
Schemas package initialization.
"""
from backend.app.schemas.auth import LoginRequest, RegisterRequest, Token, TokenData
from backend.app.schemas.user import UserBase, UserResponse
from backend.app.schemas.category import CategoryBase, CategoryCreate, CategoryResponse
from backend.app.schemas.email import EmailCreate, EmailUpdateStatus, EmailResponse, EmailDetailResponse, EmailAuditResponse
from backend.app.schemas.spam import SpamPredictRequest, SpamPredictResponse, SpamDetectionResponse, SpamDetectionDetail
from backend.app.schemas.dashboard import DashboardStatsResponse, UserStatsResponse, AnalyticsReportResponse

__all__ = [
    "LoginRequest", "RegisterRequest", "Token", "TokenData",
    "UserBase", "UserResponse",
    "CategoryBase", "CategoryCreate", "CategoryResponse",
    "EmailCreate", "EmailUpdateStatus", "EmailResponse", "EmailDetailResponse", "EmailAuditResponse",
    "SpamPredictRequest", "SpamPredictResponse", "SpamDetectionResponse", "SpamDetectionDetail",
    "DashboardStatsResponse", "UserStatsResponse", "AnalyticsReportResponse"
]
