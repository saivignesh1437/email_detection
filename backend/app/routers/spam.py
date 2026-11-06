"""
Spam Detection Router
Provides real-time ML inference and PostgreSQL spam_detection persistence.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.database import get_db
from backend.app.models.email import Email
from backend.app.models.spam import SpamDetection
from backend.app.models.user import User
from backend.app.schemas.spam import (
    SpamPredictRequest, 
    SpamPredictResponse, 
    SpamDetectionResponse, 
    SpamDetectionDetail,
    CombinedSpamAnalysisResponse,
    DsaDetectionResponse,
    HybridClassification
)
from backend.app.services.auth_service import get_current_user, is_admin_user
from backend.app.services.spam_service import (
    classify_and_persist_spam,
    run_combined_analysis,
    compute_hybrid_decision
)
from ml.predict import predict_email_spam
from backend.app.services.dsa_service import analyze_email_dsa

router = APIRouter(prefix="/api/spam", tags=["Spam Detection"])

@router.post("/predict", response_model=SpamPredictResponse)
def predict_raw_text(req: SpamPredictRequest):
    """
    Direct NLP inference endpoint: Preprocesses input subject and body,
    vectorizes via TF-IDF, predicts with trained classifier, and explains decision.
    """
    res = predict_email_spam(req.subject, req.body)
    return res

@router.post("/predict-combined", response_model=CombinedSpamAnalysisResponse)
def predict_combined_raw_text(req: SpamPredictRequest):
    """
    Runs both ML and Java DSA detection on arbitrary subject and body text without requiring saved email.
    """
    ml_res = predict_email_spam(req.subject, req.body)
    dsa_res = analyze_email_dsa(req.subject, req.body)
    hybrid = compute_hybrid_decision(ml_res, dsa_res)

    return {
        "email_id": None,
        "ml": {
            "classification": ml_res.get("classification"),
            "spam_score": ml_res.get("spam_score"),
            "confidence_percentage": ml_res.get("confidence_percentage"),
            "reason": ml_res.get("reason"),
            "is_spam": ml_res.get("is_spam")
        },
        "dsa": {
            "detection_id": None,
            "email_id": None,
            "spam_score": dsa_res.get("score", 0),
            "risk_level": dsa_res.get("risk", "LOW"),
            "classification": dsa_res.get("classification", "NOT SPAM"),
            "detected_keywords": dsa_res.get("keywords", []),
            "exact_matches": dsa_res.get("exact_matches", []),
            "fuzzy_matches": dsa_res.get("fuzzy_matches", []),
            "detected_at": None
        },
        "final": hybrid
    }

@router.post("/detect/{email_id}", response_model=SpamDetectionResponse)
def detect_and_store_for_email(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Runs classification for an existing email and stores the detection in PostgreSQL.
    Automatically triggers database trigger `trg_spam_detection_sync` if classified as Spam.
    """
    email = db.query(Email).filter(Email.email_id == email_id).first()
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")

    if not is_admin_user(current_user) and (email.sender_id != current_user.user_id and email.receiver_id != current_user.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    detection = classify_and_persist_spam(
        email_id=email.email_id,
        subject=email.subject,
        body=email.body,
        db=db
    )
    return detection

@router.post("/combined/{email_id}", response_model=CombinedSpamAnalysisResponse)
def run_combined_analysis_for_email(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Runs both ML and Java DSA detection for an email, stores both in PostgreSQL,
    and returns combined analysis with transparent hybrid classification.
    """
    email = db.query(Email).filter(Email.email_id == email_id).first()
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")

    if not is_admin_user(current_user) and (email.sender_id != current_user.user_id and email.receiver_id != current_user.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    combined = run_combined_analysis(
        email_id=email.email_id,
        subject=email.subject,
        body=email.body,
        db=db
    )
    return combined

@router.get("/detections", response_model=list[SpamDetectionDetail])
def list_all_detections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves recorded spam detections with joined email subject and sender/receiver emails.
    Restricted to user's emails unless caller is administrator.
    """
    query = db.query(SpamDetection).join(Email)
    if not is_admin_user(current_user):
        query = query.filter(
            or_(Email.sender_id == current_user.user_id, Email.receiver_id == current_user.user_id)
        )
    results = query.order_by(SpamDetection.detected_at.desc()).all()
    out = []
    for d in results:
        out.append({
            "detection_id": d.detection_id,
            "email_id": d.email_id,
            "spam_score": d.spam_score,
            "classification": d.classification,
            "reason": d.reason,
            "detected_at": d.detected_at,
            "subject": d.email.subject if d.email else None,
            "sender_email": d.email.sender.email if d.email and d.email.sender else None,
            "receiver_email": d.email.receiver.email if d.email and d.email.receiver else None
        })
    return out

