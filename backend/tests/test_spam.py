"""
Spam Detection API Tests
Verifies real-time NLP inference, confidence metrics, and database persistence.
"""
def test_spam_predict_legitimate_email(client):
    """Verifies that academic email text is classified as 'Not Spam'."""
    payload = {
        "subject": "Discussion on Database Normalization and Project Review",
        "body": "Hello John, let us review the 3NF relational schema and trigger execution results before our faculty meeting."
    }
    response = client.post("/api/spam/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_spam"] is False
    assert data["classification"] == "Not Spam"
    assert data["spam_score"] < 0.50
    assert "reason" in data

def test_spam_predict_phishing_spam_email(client):
    """Verifies that high-risk phishing scam is classified as 'Spam'."""
    payload = {
        "subject": "CONGRATULATIONS! You Won $1,000,000 Lottery Cash Prize!",
        "body": "Dear Winner, claim your $1,000,000 cash reward now! Provide your bank account, credit card, and SSN immediately!"
    }
    response = client.post("/api/spam/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_spam"] is True
    assert data["classification"] == "Spam"
    assert data["spam_score"] >= 0.50
    assert "reason" in data and len(data["reason"]) > 10

def test_spam_detection_on_existing_email(client, user_headers):
    """Verifies running detection on existing email and persisting into database."""
    # Compose spam email
    res = client.post("/api/emails", json={
        "receiver_id": 2,
        "subject": "Exclusive Discount on Replica Luxury Watches",
        "body": "Buy cheap fake Rolex watches 90% off with free overnight shipping now!",
        "category_id": 1,
        "auto_detect_spam": False
    }, headers=user_headers)
    email_id = res.json()["email_id"]

    # Trigger detection
    detect_res = client.post(f"/api/spam/detect/{email_id}", headers=user_headers)
    assert detect_res.status_code == 200
    detection = detect_res.json()
    assert detection["email_id"] == email_id
    assert detection["classification"] == "Spam"

    # Cleanup
    client.delete(f"/api/emails/{email_id}", headers=user_headers)
    client.delete(f"/api/emails/{email_id}", headers=user_headers)
