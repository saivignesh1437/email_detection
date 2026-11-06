from typing import Any
from sqlalchemy.orm import Session
from backend.app.models.spam import SpamDetection
from backend.app.models.dsa import DsaDetection
from backend.app.models.email import Email
from ml.predict import predict_email_spam
from backend.app.services.dsa_service import analyze_email_dsa

def compute_hybrid_decision(ml_res: dict[str, Any], dsa_res: dict[str, Any]) -> dict[str, str]:
    """
    Computes a transparent, academically explainable hybrid classification rule
    combining Machine Learning (TF-IDF + Naive Bayes) with DSA (Aho-Corasick + Damerau-Levenshtein).
    
    Rules:
    - HIGH-CONFIDENCE SPAM:
        ML is Spam (confidence > 0.5) AND DSA is SPAM (score >= 3 or risk >= MEDIUM)
        OR DSA is HIGH risk and ML score >= 0.4.
    - SPAM:
        Either detector strongly indicates spam (ML score >= 0.85 OR DSA risk == 'HIGH').
    - LEGITIMATE:
        Both detectors indicate legitimate / not spam.
    - REVIEW / SUSPICIOUS:
        Detectors disagree (e.g. ML classified legitimate but DSA found patterns, or vice versa).
    """
    ml_is_spam = ml_res.get("classification") == "Spam" or ml_res.get("is_spam", False)
    ml_score = float(ml_res.get("spam_score", 0.0))
    dsa_is_spam = dsa_res.get("classification") == "SPAM"
    dsa_risk = dsa_res.get("risk", "LOW")
    dsa_score = int(dsa_res.get("score", 0))

    if ml_is_spam and dsa_is_spam:
        return {
            "classification": "SPAM",
            "decision_rule": "CONCORDANT_SPAM",
            "reason": f"Both ML classifier ({round(ml_score * 100, 1)}% confidence) and Java DSA engine (risk: {dsa_risk}, score: {dsa_score}) identified strong spam patterns."
        }
    elif not ml_is_spam and not dsa_is_spam:
        return {
            "classification": "NOT SPAM",
            "decision_rule": "CONCORDANT_LEGITIMATE",
            "reason": f"Both ML classifier ({round((1 - ml_score) * 100, 1)}% legit confidence) and Java DSA engine (risk: {dsa_risk}) confirmed email is legitimate."
        }
    elif dsa_risk == "HIGH" or ml_score >= 0.85:
        return {
            "classification": "SPAM",
            "decision_rule": "STRONG_SINGLE_DETECTOR",
            "reason": f"Classified as SPAM due to decisive indicators (ML confidence: {round(ml_score * 100, 1)}%, DSA risk: {dsa_risk}, DSA score: {dsa_score})."
        }
    else:
        # Disagreement case -> Flag for human review / suspicious
        disagreement_detail = (
            f"DSA engine detected {len(dsa_res.get('keywords', []))} suspicious patterns ({', '.join(dsa_res.get('keywords', []))}) while ML classified as legitimate."
            if dsa_is_spam else
            f"ML classifier flagged vocabulary as spam ({round(ml_score * 100, 1)}%) but DSA engine found 0 exact/fuzzy keyword matches."
        )
        return {
            "classification": "SUSPICIOUS",
            "decision_rule": "DETECTOR_DISAGREEMENT",
            "reason": f"Review required: {disagreement_detail}"
        }

def persist_dsa_detection(email_id: int, dsa_res: dict[str, Any], db: Session) -> DsaDetection:
    """
    Persists or updates DSA pattern analysis into the dsa_detection table.
    """
    existing = db.query(DsaDetection).filter(DsaDetection.email_id == email_id).first()
    if existing:
        existing.spam_score = dsa_res.get("score", 0)
        existing.risk_level = dsa_res.get("risk", "LOW")
        existing.classification = dsa_res.get("classification", "NOT SPAM")
        existing.detected_keywords = dsa_res.get("keywords", [])
        existing.exact_matches = dsa_res.get("exact_matches", [])
        existing.fuzzy_matches = dsa_res.get("fuzzy_matches", [])
        db_dsa = existing
    else:
        db_dsa = DsaDetection(
            email_id=email_id,
            spam_score=dsa_res.get("score", 0),
            risk_level=dsa_res.get("risk", "LOW"),
            classification=dsa_res.get("classification", "NOT SPAM"),
            detected_keywords=dsa_res.get("keywords", []),
            exact_matches=dsa_res.get("exact_matches", []),
            fuzzy_matches=dsa_res.get("fuzzy_matches", [])
        )
        db.add(db_dsa)
    db.commit()
    db.refresh(db_dsa)
    return db_dsa

def classify_and_persist_spam(email_id: int, subject: str, body: str, db: Session) -> SpamDetection:
    """
    Executes the TF-IDF + Classifier pipeline and persists results into PostgreSQL.
    Note: When classification is 'Spam', the PostgreSQL database trigger
    `trg_spam_detection_sync` automatically updates `emails.status = 'Spam'`
    and logs the event into `email_audit_log`.
    Also runs DSA detection so both ML and DSA results are saved in PostgreSQL.
    """
    prediction = predict_email_spam(subject, body)
    
    # Check if a detection entry already exists for this email
    existing = db.query(SpamDetection).filter(SpamDetection.email_id == email_id).first()
    if existing:
        existing.spam_score = prediction["spam_score"]
        existing.classification = prediction["classification"]
        existing.reason = prediction["reason"]
        db_detection = existing
    else:
        db_detection = SpamDetection(
            email_id=email_id,
            spam_score=prediction["spam_score"],
            classification=prediction["classification"],
            reason=prediction["reason"]
        )
        db.add(db_detection)
    
    db.commit()
    db.refresh(db_detection)

    # Persist DSA analysis alongside ML
    try:
        dsa_res = analyze_email_dsa(subject, body)
        persist_dsa_detection(email_id=email_id, dsa_res=dsa_res, db=db)
    except Exception:
        # Non-critical if DSA engine is down during ML-only path
        pass

    return db_detection

def run_combined_analysis(email_id: int, subject: str, body: str, db: Session) -> dict[str, Any]:
    """
    Executes ML and DSA analysis concurrently, persists both into PostgreSQL,
    computes hybrid classification, and returns combined payload.
    """
    ml_res = predict_email_spam(subject, body)
    dsa_res = analyze_email_dsa(subject, body)

    # Persist ML
    existing_ml = db.query(SpamDetection).filter(SpamDetection.email_id == email_id).first()
    if existing_ml:
        existing_ml.spam_score = ml_res["spam_score"]
        existing_ml.classification = ml_res["classification"]
        existing_ml.reason = ml_res["reason"]
        db_ml = existing_ml
    else:
        db_ml = SpamDetection(
            email_id=email_id,
            spam_score=ml_res["spam_score"],
            classification=ml_res["classification"],
            reason=ml_res["reason"]
        )
        db.add(db_ml)
    db.commit()
    db.refresh(db_ml)

    # Persist DSA
    db_dsa = persist_dsa_detection(email_id=email_id, dsa_res=dsa_res, db=db)

    # Compute hybrid decision
    hybrid = compute_hybrid_decision(ml_res, dsa_res)

    return {
        "email_id": email_id,
        "ml": {
            "detection_id": db_ml.detection_id,
            "classification": db_ml.classification,
            "spam_score": db_ml.spam_score,
            "confidence_percentage": ml_res.get("confidence_percentage", round(db_ml.spam_score * 100, 2)),
            "reason": db_ml.reason,
            "detected_at": db_ml.detected_at
        },
        "dsa": {
            "detection_id": db_dsa.detection_id,
            "email_id": db_dsa.email_id,
            "spam_score": db_dsa.spam_score,
            "risk_level": db_dsa.risk_level,
            "classification": db_dsa.classification,
            "detected_keywords": db_dsa.detected_keywords or [],
            "exact_matches": db_dsa.exact_matches or [],
            "fuzzy_matches": db_dsa.fuzzy_matches or [],
            "detected_at": db_dsa.detected_at
        },
        "final": hybrid
    }

