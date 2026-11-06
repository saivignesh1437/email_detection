-- =============================================================================
-- Intelligent Email Management and Spam Detection Platform
-- Academic Demonstration SQL Queries
-- Demonstrating Relational DBMS Concepts: Normalization, PK/FK Joins, Triggers,
-- Stored Functions, Grouping, Window Functions, and Full-Text Search
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. JOIN QUERY: Complete Email View with Sender, Receiver, Category & Spam Score
-- Demonstrates multi-table INNER and LEFT JOINs with alias projection
-- -----------------------------------------------------------------------------
SELECT 
    e.email_id,
    e.received_at,
    u_send.name AS sender_name,
    u_send.email AS sender_address,
    u_recv.name AS recipient_name,
    u_recv.email AS recipient_address,
    c.category_name,
    e.subject,
    e.status,
    COALESCE(sd.classification, 'Pending') AS spam_status,
    COALESCE(sd.spam_score, 0.0) AS spam_score
FROM emails e
JOIN users u_send ON e.sender_id = u_send.user_id
JOIN users u_recv ON e.receiver_id = u_recv.user_id
LEFT JOIN categories c ON e.category_id = c.category_id
LEFT JOIN spam_detection sd ON e.email_id = sd.email_id
ORDER BY e.received_at DESC;

-- -----------------------------------------------------------------------------
-- 2. AGGREGATE & GROUP BY: Spam Detection Ratio by Sender Domain
-- Demonstrates string functions, grouping, conditional aggregation & sorting
-- -----------------------------------------------------------------------------
SELECT 
    SPLIT_PART(u.email, '@', 2) AS sender_domain,
    COUNT(e.email_id) AS total_emails_sent,
    COUNT(CASE WHEN sd.classification = 'Spam' THEN 1 END) AS spam_count,
    COUNT(CASE WHEN sd.classification = 'Not Spam' THEN 1 END) AS legitimate_count,
    ROUND(
        (COUNT(CASE WHEN sd.classification = 'Spam' THEN 1 END)::NUMERIC / 
         NULLIF(COUNT(e.email_id), 0) * 100), 1
    ) AS spam_rate_percentage
FROM emails e
JOIN users u ON e.sender_id = u.user_id
LEFT JOIN spam_detection sd ON e.email_id = sd.email_id
GROUP BY SPLIT_PART(u.email, '@', 2)
ORDER BY spam_count DESC, total_emails_sent DESC;

-- -----------------------------------------------------------------------------
-- 3. STORED FUNCTION INVOCATION: Retrieve User Statistics
-- Demonstrates execution of PostgreSQL stored function
-- -----------------------------------------------------------------------------
SELECT * FROM fn_get_user_email_stats(2); -- Stats for John Doe

-- -----------------------------------------------------------------------------
-- 4. SYSTEM DASHBOARD FUNCTION INVOCATION: Global Platform Metrics
-- -----------------------------------------------------------------------------
SELECT * FROM fn_get_system_dashboard_stats();

-- -----------------------------------------------------------------------------
-- 5. TRIGGER AUDIT VERIFICATION: Inspect Automated Security & State Transitions
-- Demonstrates the execution proof of trg_audit_email and trg_spam_detection_sync
-- -----------------------------------------------------------------------------
SELECT 
    al.audit_id,
    al.email_id,
    e.subject,
    al.action,
    al.previous_status,
    al.new_status,
    al.details,
    al.changed_at
FROM email_audit_log al
JOIN emails e ON al.email_id = e.email_id
ORDER BY al.changed_at DESC;

-- -----------------------------------------------------------------------------
-- 6. FULL-TEXT SEARCH QUERY WITH RANKING
-- Demonstrates PostgreSQL GIN Index and ts_rank text search
-- -----------------------------------------------------------------------------
SELECT 
    e.email_id,
    e.subject,
    e.status,
    ts_rank(to_tsvector('english', e.subject || ' ' || e.body), plainto_tsquery('english', 'lottery prize')) AS rank
FROM emails e
WHERE to_tsvector('english', e.subject || ' ' || e.body) @@ plainto_tsquery('english', 'lottery prize')
ORDER BY rank DESC;

-- -----------------------------------------------------------------------------
-- 7. SUBQUERY / WINDOW FUNCTION: Rank Most Active Correspondents per User
-- -----------------------------------------------------------------------------
WITH user_traffic AS (
    SELECT 
        e.receiver_id,
        e.sender_id,
        u.name AS sender_name,
        COUNT(*) AS message_count,
        DENSE_RANK() OVER (PARTITION BY e.receiver_id ORDER BY COUNT(*) DESC) as rank
    FROM emails e
    JOIN users u ON e.sender_id = u.user_id
    GROUP BY e.receiver_id, e.sender_id, u.name
)
SELECT * FROM user_traffic WHERE rank <= 3;
