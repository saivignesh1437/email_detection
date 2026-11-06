"""
Search Router
Multi-criteria relational search utilizing PostgreSQL indexes, JOIN operations, and filters.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.email import EmailSearchResult
from backend.app.services.auth_service import get_current_user, is_admin_user

router = APIRouter(prefix="/api/search", tags=["Search"])

@router.get("", response_model=list[EmailSearchResult])
def search_emails(
    q: str | None = Query(None, description="Keyword in subject or body"),
    sender: str | None = Query(None, description="Sender name or email address"),
    receiver: str | None = Query(None, description="Receiver name or email address"),
    category_id: int | None = Query(None, description="Category ID"),
    spam_status: str | None = Query(None, description="Classification: Spam or Not Spam"),
    status: str | None = Query(None, description="Email status: Inbox, Read, Spam, Trash"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes a multi-table JOIN query in PostgreSQL with flexible parameter filters.
    """
    sql = """
    SELECT 
        e.email_id,
        e.sender_id,
        u_send.name AS sender_name,
        u_send.email AS sender_email,
        e.receiver_id,
        u_recv.name AS receiver_name,
        u_recv.email AS receiver_email,
        e.subject,
        e.body,
        e.received_at,
        e.status,
        e.category_id,
        c.category_name,
        sd.spam_score,
        sd.classification,
        sd.reason AS detection_reason
    FROM emails e
    JOIN users u_send ON e.sender_id = u_send.user_id
    JOIN users u_recv ON e.receiver_id = u_recv.user_id
    LEFT JOIN categories c ON e.category_id = c.category_id
    LEFT JOIN spam_detection sd ON e.email_id = sd.email_id
    WHERE 1=1
    """
    params = {}

    # If not admin, restrict to user's incoming or outgoing mail
    if not is_admin_user(current_user):
        sql += " AND (e.sender_id = :curr_user OR e.receiver_id = :curr_user)"
        params["curr_user"] = current_user.user_id

    if q and q.strip():
        sql += """ AND (
            e.subject ILIKE :q_like 
            OR e.body ILIKE :q_like
            OR to_tsvector('english', COALESCE(e.subject, '') || ' ' || COALESCE(e.body, '')) @@ plainto_tsquery('english', :q_term)
        )"""
        params["q_like"] = f"%{q.strip()}%"
        params["q_term"] = q.strip()

    if sender and sender.strip():
        sql += " AND (u_send.name ILIKE :sender_like OR u_send.email ILIKE :sender_like)"
        params["sender_like"] = f"%{sender.strip()}%"

    if receiver and receiver.strip():
        sql += " AND (u_recv.name ILIKE :receiver_like OR u_recv.email ILIKE :receiver_like)"
        params["receiver_like"] = f"%{receiver.strip()}%"

    if category_id:
        sql += " AND e.category_id = :cat_id"
        params["cat_id"] = category_id

    if spam_status and spam_status.strip():
        sql += " AND sd.classification = :spam_class"
        params["spam_class"] = spam_status.strip()

    if status and status.strip():
        sql += " AND e.status = :status_filter"
        params["status_filter"] = status.strip()

    sql += " ORDER BY e.received_at DESC"

    rows = db.execute(text(sql), params).mappings().all()
    results = [dict(r) for r in rows]
    return results
