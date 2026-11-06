"""
Search and Dashboard API Tests
Verifies multi-criteria search, aggregations, and dashboard report metrics.
"""
def test_search_emails_by_keyword(client, user_headers):
    """Verifies searching emails by subject/body keyword."""
    response = client.get("/api/search?q=Review", headers=user_headers)
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert len(results) >= 1
    assert any("Review" in r["subject"] or "Review" in r["body"] for r in results)

def test_search_emails_by_spam_status(client, user_headers):
    """Verifies searching emails by spam classification."""
    response = client.get("/api/search?spam_status=Spam", headers=user_headers)
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    for r in results:
        assert r["classification"] == "Spam"

def test_dashboard_system_stats(client, admin_headers):
    """Verifies that dashboard stats return actual real database figures."""
    response = client.get("/api/dashboard/stats", headers=admin_headers)
    assert response.status_code == 200
    stats = response.json()
    assert stats["total_users"] >= 6
    assert stats["total_emails"] >= 10
    assert stats["total_spam_detected"] >= 4
    assert stats["total_categories"] >= 5
    assert len(stats["categories_breakdown"]) >= 1

def test_dashboard_user_stats(client, user_headers):
    """Verifies retrieving user stats for John Doe."""
    response = client.get("/api/dashboard/user-stats", headers=user_headers)
    assert response.status_code == 200
    stats = response.json()
    assert stats["total_received"] >= 1

def test_dashboard_analytics_report(client, admin_headers):
    """Verifies analytics report contains system stats and model evaluation."""
    response = client.get("/api/dashboard/reports", headers=admin_headers)
    assert response.status_code == 200
    report = response.json()
    assert "system_stats" in report
    assert "model_evaluation" in report
    assert "accuracy" in report["model_evaluation"]
    assert report["model_evaluation"]["accuracy"] > 0.80

def test_search_user_isolation(client, user_headers):
    """Verifies that non-admin search results only contain emails where the user is sender or receiver."""
    response = client.get("/api/search", headers=user_headers)
    assert response.status_code == 200
    results = response.json()
    for r in results:
        assert r["sender_id"] == 2 or r["receiver_id"] == 2

