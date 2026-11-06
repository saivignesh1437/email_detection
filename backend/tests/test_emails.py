"""
Email Management API Tests
Verifies creating, listing, viewing, updating status, and deleting emails.
"""
def test_list_inbox_emails(client, user_headers):
    """Verifies listing user inbox emails."""
    response = client.get("/api/emails?folder=inbox", headers=user_headers)
    assert response.status_code == 200
    emails = response.json()
    assert isinstance(emails, list)
    for email in emails:
        assert email["receiver_id"] == 2
        assert email["status"] == "Inbox"

def test_compose_and_deliver_email(client, user_headers):
    """Verifies composing and delivering an email with automatic ML classification."""
    payload = {
        "receiver_id": 3, # Alice Smith
        "subject": "Automated Test Email via API",
        "body": "Hi Alice, please confirm receipt of the automated test suite execution report.",
        "category_id": 1,
        "auto_detect_spam": True
    }
    response = client.post("/api/emails", json=payload, headers=user_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["subject"] == payload["subject"]
    assert data["sender_id"] == 2
    assert data["receiver_id"] == 3
    assert data["spam_detection"] is not None
    assert data["spam_detection"]["classification"] == "Not Spam"

    # View created email details
    email_id = data["email_id"]
    detail_res = client.get(f"/api/emails/{email_id}", headers=user_headers)
    assert detail_res.status_code == 200
    assert len(detail_res.json()["audit_logs"]) >= 1

    # Cleanup
    client.delete(f"/api/emails/{email_id}", headers=user_headers)

def test_update_email_status(client, user_headers):
    """Verifies updating email status to 'Read' and 'Trash'."""
    # Compose email
    res = client.post("/api/emails", json={
        "receiver_id": 3,
        "subject": "Status Change Test",
        "body": "Checking status change trigger logging.",
        "category_id": 1,
        "auto_detect_spam": False
    }, headers=user_headers)
    email_id = res.json()["email_id"]

    # Update to Read
    update_res = client.put(f"/api/emails/{email_id}/status", json={"status": "Read"}, headers=user_headers)
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "Read"

    # Move to Trash
    del_res = client.delete(f"/api/emails/{email_id}", headers=user_headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "Trash"

    # Hard delete from Trash
    perm_del_res = client.delete(f"/api/emails/{email_id}", headers=user_headers)
    assert perm_del_res.status_code == 200
    assert perm_del_res.json()["deleted"] is True

def test_non_admin_cannot_access_other_user_mailbox(client, user_headers):
    """Verifies that non-admin receives 403 Forbidden when requesting another user's emails."""
    response = client.get("/api/emails?user_id=3", headers=user_headers)
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]

def test_admin_can_access_other_user_mailbox(client, admin_headers):
    """Verifies that administrator can view another user's emails for evaluation."""
    response = client.get("/api/emails?user_id=2", headers=admin_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_non_admin_cannot_spoof_sender(client, user_headers):
    """Verifies that non-admin receives 403 Forbidden when trying to override sender_id."""
    payload = {
        "receiver_id": 3,
        "subject": "Spoof Attempt",
        "body": "Attempting to send as admin",
        "category_id": 1,
        "auto_detect_spam": False
    }
    response = client.post("/api/emails?sender_id=1", json=payload, headers=user_headers)
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]

def test_category_selection_persists(client, user_headers):
    """Verifies that selected category_id (e.g. 2 for Social) is persisted."""
    payload = {
        "receiver_id": 3,
        "subject": "Category Persistence Test",
        "body": "Checking that category ID is saved accurately.",
        "category_id": 2,
        "auto_detect_spam": False
    }
    response = client.post("/api/emails", json=payload, headers=user_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["category_id"] == 2
    assert data["category"] is not None
    assert data["category"]["category_name"] == "Social"

    # Cleanup
    client.delete(f"/api/emails/{data['email_id']}", headers=user_headers)
    client.delete(f"/api/emails/{data['email_id']}", headers=user_headers)

