"""
Database Verification and Relational DBMS Tests
Verifies tables, constraints, trigger automation, stored functions, and referential integrity.
"""
from sqlalchemy import text

def test_database_tables_exist(db):
    """Verifies that all normalized relational tables are present in PostgreSQL."""
    query = text("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('users', 'categories', 'emails', 'spam_detection', 'email_audit_log');
    """)
    rows = db.execute(query).scalars().all()
    assert set(rows) == {'users', 'categories', 'emails', 'spam_detection', 'email_audit_log'}

def test_system_dashboard_stored_function(db):
    """Executes and tests stored function fn_get_system_dashboard_stats()."""
    query = text("SELECT * FROM fn_get_system_dashboard_stats();")
    row = db.execute(query).mappings().first()
    assert row is not None
    assert row["total_users"] >= 6
    assert row["total_emails"] >= 11
    assert row["total_spam_detected"] >= 5
    assert row["total_categories"] >= 5

def test_user_email_stats_stored_function(db):
    """Executes and tests stored function fn_get_user_email_stats()."""
    query = text("SELECT * FROM fn_get_user_email_stats(2);") # John Doe
    row = db.execute(query).mappings().first()
    assert row is not None
    assert row["total_received"] >= 1

def test_email_audit_trigger_on_status_change(db):
    """
    Tests that PostgreSQL trigger trg_audit_email automatically writes
    an entry to email_audit_log when an email status is updated.
    """
    # 1. Insert a temporary test email
    ins_query = text("""
        INSERT INTO emails (sender_id, receiver_id, subject, body, status, category_id)
        VALUES (2, 3, 'Trigger Test Subject', 'Testing trigger execution', 'Inbox', 1)
        RETURNING email_id;
    """)
    email_id = db.execute(ins_query).scalar()
    db.commit()

    # Verify creation audit log was inserted by trigger
    audit_create = db.execute(
        text("SELECT action, new_status FROM email_audit_log WHERE email_id = :eid AND action = 'CREATED';"),
        {"eid": email_id}
    ).mappings().first()
    assert audit_create is not None
    assert audit_create["action"] == "CREATED"
    assert audit_create["new_status"] == "Inbox"

    # 2. Update status to 'Read'
    db.execute(
        text("UPDATE emails SET status = 'Read' WHERE email_id = :eid;"),
        {"eid": email_id}
    )
    db.commit()

    # Verify status changed audit log was inserted by trigger
    audit_update = db.execute(
        text("SELECT action, previous_status, new_status FROM email_audit_log WHERE email_id = :eid AND action = 'STATUS_CHANGED';"),
        {"eid": email_id}
    ).mappings().first()
    assert audit_update is not None
    assert audit_update["previous_status"] == "Inbox"
    assert audit_update["new_status"] == "Read"

    # Cleanup
    db.execute(text("DELETE FROM emails WHERE email_id = :eid;"), {"eid": email_id})
    db.commit()

def test_spam_detection_trigger_auto_categorization(db):
    """
    Tests that trigger trg_spam_detection_sync automatically updates
    the email's status to 'Spam' and category to 'Spam' when a Spam record is inserted.
    """
    # 1. Insert an unclassified email
    ins_query = text("""
        INSERT INTO emails (sender_id, receiver_id, subject, body, status, category_id)
        VALUES (5, 2, 'Urgent Wire Transfer', 'Wire money now', 'Inbox', 1)
        RETURNING email_id;
    """)
    email_id = db.execute(ins_query).scalar()
    db.commit()

    # 2. Insert spam detection record
    db.execute(
        text("""
            INSERT INTO spam_detection (email_id, spam_score, classification, reason)
            VALUES (:eid, 0.99, 'Spam', 'Test trigger phishing rule');
        """),
        {"eid": email_id}
    )
    db.commit()

    # 3. Check that emails table was automatically updated by the trigger
    email_row = db.execute(
        text("SELECT status, category_id FROM emails WHERE email_id = :eid;"),
        {"eid": email_id}
    ).mappings().first()
    assert email_row["status"] == "Spam"
    assert email_row["category_id"] == 5 # Spam category ID

    # 4. Check that trigger wrote to email_audit_log
    audit_row = db.execute(
        text("SELECT action, details FROM email_audit_log WHERE email_id = :eid AND action = 'AUTO_SPAM_FLAGGED';"),
        {"eid": email_id}
    ).mappings().first()
    assert audit_row is not None
    assert "Automated ML Spam Classifier" in audit_row["details"]

    # Cleanup
    db.execute(text("DELETE FROM emails WHERE email_id = :eid;"), {"eid": email_id})
    db.commit()
