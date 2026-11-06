"""
Dashboard and Reports Pydantic Schemas
"""
from pydantic import BaseModel

class DashboardStatsResponse(BaseModel):
    total_users: int
    total_emails: int
    total_spam_detected: int
    total_legitimate_detected: int
    spam_ratio: float
    total_categories: int
    categories_breakdown: list[dict]
    status_breakdown: list[dict]
    audit_events_count: int
    total_dsa_detected: int = 0
    dsa_spam_count: int = 0
    dsa_legit_count: int = 0
    detector_comparison: dict = {}

class UserStatsResponse(BaseModel):
    total_emails: int
    total_received: int
    total_sent: int
    inbox_count: int
    spam_count: int
    trash_count: int
    read_count: int
    spam_ratio: float
    categories_breakdown: list[dict]
    status_breakdown: list[dict]

class AnalyticsReportResponse(BaseModel):
    system_stats: DashboardStatsResponse
    model_evaluation: dict
    spam_timeline: list[dict]
    dsa_risk_breakdown: list[dict] = []

