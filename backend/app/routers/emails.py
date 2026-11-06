"""
Emails Router
Complete email lifecycle management: create, read, update status, delete, filter, and audit inspect.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.email import Email
from backend.app.models.user import User
from backend.app.schemas.email import EmailCreate, EmailResponse, EmailDetailResponse, EmailUpdateStatus
from backend.app.services.auth_service import get_current_user, is_admin_user
from backend.app.services.email_service import create_email, get_emails_for_user, update_status, delete_or_trash_email

router = APIRouter(prefix="/api/emails", tags=["Emails"])

@router.get("", response_model=list[EmailResponse])
def list_emails(
    folder: str | None = Query(None, description="Folder: inbox, sent, spam, trash, read"),
    category_id: int | None = Query(None, description="Filter by category ID"),
    q: str | None = Query(None, description="Search keyword in subject or body"),
    user_id: int | None = Query(None, description="Optional override for demo faculty evaluation (admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists emails filtered by folder, category, or search keywords."""
    if user_id is not None and not is_admin_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only administrators can view other users' mailboxes."
        )
    effective_user_id = user_id if (user_id is not None and is_admin_user(current_user)) else current_user.user_id
    emails = get_emails_for_user(
        user_id=effective_user_id,
        folder=folder,
        category_id=category_id,
        search_query=q,
        db=db
    )
    return emails

@router.get("/{email_id}", response_model=EmailDetailResponse)
def get_email_detail(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves full email details including spam score, classification reason, and trigger audit history."""
    email = db.query(Email).filter(Email.email_id == email_id).first()
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")
    
    # Check access permission (admin can view any email for evaluation; otherwise sender or receiver only)
    if not is_admin_user(current_user) and (email.sender_id != current_user.user_id and email.receiver_id != current_user.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return email

@router.post("", response_model=EmailDetailResponse, status_code=status.HTTP_201_CREATED)
def send_email(
    email_in: EmailCreate,
    sender_id: int | None = Query(None, description="Optional sender ID override (admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Composes and delivers an email, optionally triggering ML spam classification."""
    if sender_id is not None and not is_admin_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only administrators can send email on behalf of another user."
        )
    effective_sender_id = sender_id if (sender_id is not None and is_admin_user(current_user)) else current_user.user_id
    created = create_email(email_in=email_in, sender_id=effective_sender_id, db=db)
    return created

@router.put("/{email_id}/status", response_model=EmailResponse)
def update_email_state(
    email_id: int,
    payload: EmailUpdateStatus,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates email status (Inbox, Read, Spam, Trash). Triggers database audit log."""
    updated = update_status(
        email_id=email_id,
        new_status=payload.status,
        user_id=current_user.user_id,
        db=db
    )
    return updated

@router.delete("/{email_id}")
def delete_email(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Moves an email to Trash, or permanently deletes if already in Trash."""
    res = delete_or_trash_email(
        email_id=email_id,
        user_id=current_user.user_id,
        db=db
    )
    return res
