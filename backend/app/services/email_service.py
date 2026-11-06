"""
Email Management Service
Handles email persistence, status transitions, search, and stored function integration.
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_, text
from fastapi import HTTPException, status

from backend.app.models.email import Email
from backend.app.models.user import User
from backend.app.schemas.email import EmailCreate
from backend.app.services.spam_service import classify_and_persist_spam

def create_email(email_in: EmailCreate, sender_id: int, db: Session) -> Email:
    """
    Creates an email record and conditionally runs ML spam detection.
    """
    # Verify recipient exists
    recipient = db.query(User).filter(User.user_id == email_in.receiver_id).first()
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recipient user with ID {email_in.receiver_id} not found."
        )

    email = Email(
        sender_id=sender_id,
        receiver_id=email_in.receiver_id,
        subject=email_in.subject.strip(),
        body=email_in.body.strip(),
        category_id=email_in.category_id or 1,
        status="Inbox"
    )
    db.add(email)
    db.commit()
    db.refresh(email)

    # Trigger ML spam classification if requested
    if email_in.auto_detect_spam:
        classify_and_persist_spam(
            email_id=email.email_id,
            subject=email.subject,
            body=email.body,
            db=db
        )
        db.refresh(email)

    return email

def get_emails_for_user(
    user_id: int, 
    folder: str | None = None, 
    category_id: int | None = None, 
    search_query: str | None = None,
    db: Session = None
) -> list[Email]:
    """
    Retrieves filtered emails for a given user.
    """
    query = db.query(Email)

    if folder:
        folder_clean = folder.lower()
        if folder_clean == "inbox":
            query = query.filter(Email.receiver_id == user_id, Email.status == "Inbox")
        elif folder_clean == "sent":
            query = query.filter(Email.sender_id == user_id)
        elif folder_clean == "spam":
            query = query.filter(Email.receiver_id == user_id, Email.status == "Spam")
        elif folder_clean == "trash":
            query = query.filter(
                or_(Email.receiver_id == user_id, Email.sender_id == user_id),
                Email.status == "Trash"
            )
        elif folder_clean == "read":
            query = query.filter(Email.receiver_id == user_id, Email.status == "Read")
        else:
            query = query.filter(
                or_(Email.receiver_id == user_id, Email.sender_id == user_id),
                Email.status == folder
            )
    else:
        query = query.filter(or_(Email.receiver_id == user_id, Email.sender_id == user_id))

    if category_id:
        query = query.filter(Email.category_id == category_id)

    if search_query:
        search_pattern = f"%{search_query.strip()}%"
        query = query.filter(
            or_(
                Email.subject.ilike(search_pattern),
                Email.body.ilike(search_pattern)
            )
        )

    return query.order_by(Email.received_at.desc()).all()

def update_status(email_id: int, new_status: str, user_id: int, db: Session) -> Email:
    """Updates status of an email, firing PostgreSQL audit triggers."""
    email = db.query(Email).filter(
        Email.email_id == email_id,
        or_(Email.receiver_id == user_id, Email.sender_id == user_id)
    ).first()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Email not found or access denied."
        )

    email.status = new_status
    db.commit()
    db.refresh(email)
    return email

def delete_or_trash_email(email_id: int, user_id: int, db: Session):
    """
    If not already in trash, moves to Trash. If already in trash, hard deletes.
    """
    email = db.query(Email).filter(
        Email.email_id == email_id,
        or_(Email.receiver_id == user_id, Email.sender_id == user_id)
    ).first()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Email not found or access denied."
        )

    if email.status != "Trash":
        email.status = "Trash"
        db.commit()
        return {"message": "Email moved to trash", "email_id": email_id, "status": "Trash"}
    else:
        db.delete(email)
        db.commit()
        return {"message": "Email permanently deleted", "email_id": email_id, "deleted": True}
