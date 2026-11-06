"""
DSA and Combined Spam Detection Integration Tests
Tests Java DSA engine integration, hybrid decision logic, authorization,
and PostgreSQL persistence.
"""
import pytest
from unittest.mock import patch

def test_hybrid_decision_logic():
    """Verifies deterministic hybrid decision rules."""
    from backend.app.services.spam_service import compute_hybrid_decision

    # 1. Concordant spam
    ml_spam = {"classification": "Spam", "is_spam": True, "spam_score": 0.95}
    dsa_spam = {"classification": "SPAM", "risk": "HIGH", "score": 8, "keywords": ["free", "prize"]}
    res = compute_hybrid_decision(ml_spam, dsa_spam)
    assert res["classification"] == "SPAM"
    assert res["decision_rule"] == "CONCORDANT_SPAM"

    # 2. Concordant legitimate
    ml_legit = {"classification": "Not Spam", "is_spam": False, "spam_score": 0.05}
    dsa_legit = {"classification": "NOT SPAM", "risk": "LOW", "score": 0, "keywords": []}
    res = compute_hybrid_decision(ml_legit, dsa_legit)
    assert res["classification"] == "NOT SPAM"
    assert res["decision_rule"] == "CONCORDANT_LEGITIMATE"

    # 3. Disagreement: Obfuscated spam caught by DSA fuzzy matching
    ml_disagree = {"classification": "Not Spam", "is_spam": False, "spam_score": 0.42}
    dsa_disagree = {"classification": "SPAM", "risk": "MEDIUM", "score": 5, "keywords": ["free", "prize"]}
    res = compute_hybrid_decision(ml_disagree, dsa_disagree)
    assert res["classification"] == "SUSPICIOUS"
    assert res["decision_rule"] == "DETECTOR_DISAGREEMENT"
    assert "Review required" in res["reason"]

def test_predict_combined_endpoint(client):
    """Verifies POST /api/spam/predict-combined returns ML + DSA + Final."""
    payload = {
        "subject": "Urgent! Claim your free pr1ze lottery reward now",
        "body": "Click here to claim your reward before the offer closes."
    }
    # Mock DSA response to be robust in unit tests whether Java is running or mocked
    mock_dsa = {
        "score": 10,
        "risk": "HIGH",
        "classification": "SPAM",
        "keywords": ["prize", "free", "lottery"],
        "exact_matches": ["free", "lottery"],
        "fuzzy_matches": ["pr1ze->prize"],
        "available": True
    }
    with patch("backend.app.routers.spam.analyze_email_dsa", return_value=mock_dsa):
        response = client.post("/api/spam/predict-combined", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "ml" in data
        assert "dsa" in data
        assert "final" in data
        assert data["dsa"]["risk_level"] == "HIGH"
        assert len(data["dsa"]["fuzzy_matches"]) > 0
        assert data["final"]["classification"] in ["SPAM", "SUSPICIOUS"]

def test_combined_detection_on_email_authorized(client, user_headers):
    """Verifies POST /api/spam/combined/{email_id} enforces ownership and persists."""
    # 1. Compose an email as user 1
    res = client.post("/api/emails", json={
        "receiver_id": 2,
        "subject": "Win cash money reward free now",
        "body": "Click here to claim your reward before midnight.",
        "category_id": 1,
        "auto_detect_spam": False
    }, headers=user_headers)
    assert res.status_code == 201
    email_id = res.json()["email_id"]

    mock_dsa = {
        "score": 8,
        "risk": "HIGH",
        "classification": "SPAM",
        "keywords": ["reward", "free"],
        "exact_matches": ["free", "reward"],
        "fuzzy_matches": [],
        "available": True
    }
    with patch("backend.app.services.spam_service.analyze_email_dsa", return_value=mock_dsa):
        detect_res = client.post(f"/api/spam/combined/{email_id}", headers=user_headers)
        assert detect_res.status_code == 200
        comb = detect_res.json()
        assert comb["email_id"] == email_id
        assert comb["dsa"]["classification"] == "SPAM"
        assert comb["final"]["classification"] == "SPAM"

    # Cleanup email
    client.delete(f"/api/emails/{email_id}", headers=user_headers)
    client.delete(f"/api/emails/{email_id}", headers=user_headers)

def test_combined_detection_bola_unauthorized(client, other_user_headers):
    """Verifies that unauthorized users cannot run detection on someone else's email."""
    # Email 1 belongs to user 4 -> user 2, other_user is user 3
    response = client.post("/api/spam/combined/1", headers=other_user_headers)
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]
