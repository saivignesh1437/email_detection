-- =============================================================================
-- Intelligent Email Management and Spam Detection Platform
-- Database Functions and Stored Procedures (PostgreSQL)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FUNCTION 1: fn_get_user_email_stats
-- Computes aggregated statistics for a specific user via relational queries
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_user_email_stats(p_user_id INT)
RETURNS TABLE (
    total_received BIGINT,
    total_sent BIGINT,
    inbox_count BIGINT,
    spam_count BIGINT,
    trash_count BIGINT,
    read_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(CASE WHEN receiver_id = p_user_id THEN 1 END) AS total_received,
        COUNT(CASE WHEN sender_id = p_user_id THEN 1 END) AS total_sent,
        COUNT(CASE WHEN receiver_id = p_user_id AND status = 'Inbox' THEN 1 END) AS inbox_count,
        COUNT(CASE WHEN receiver_id = p_user_id AND status = 'Spam' THEN 1 END) AS spam_count,
        COUNT(CASE WHEN receiver_id = p_user_id AND status = 'Trash' THEN 1 END) AS trash_count,
        COUNT(CASE WHEN receiver_id = p_user_id AND status = 'Read' THEN 1 END) AS read_count
    FROM emails
    WHERE sender_id = p_user_id OR receiver_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- FUNCTION 2: fn_get_system_dashboard_stats
-- Computes global platform metrics directly from normalized tables
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_system_dashboard_stats()
RETURNS TABLE (
    total_users BIGINT,
    total_emails BIGINT,
    total_spam_detected BIGINT,
    total_legitimate_detected BIGINT,
    spam_ratio NUMERIC,
    total_categories BIGINT
) AS $$
DECLARE
    v_users BIGINT;
    v_emails BIGINT;
    v_spam BIGINT;
    v_legit BIGINT;
    v_cats BIGINT;
    v_ratio NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_users FROM users;
    SELECT COUNT(*) INTO v_emails FROM emails;
    SELECT COUNT(*) INTO v_spam FROM spam_detection WHERE classification = 'Spam';
    SELECT COUNT(*) INTO v_legit FROM spam_detection WHERE classification = 'Not Spam';
    SELECT COUNT(*) INTO v_cats FROM categories;

    IF (v_spam + v_legit) > 0 THEN
        v_ratio := ROUND(((v_spam::NUMERIC / (v_spam + v_legit)::NUMERIC) * 100), 2);
    ELSE
        v_ratio := 0.00;
    END IF;

    RETURN QUERY SELECT v_users, v_emails, v_spam, v_legit, v_ratio, v_cats;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- FUNCTION 3: fn_search_emails
-- Performs multi-table relational search joining users, categories, and spam scores
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_search_emails(
    p_user_id INT,
    p_keyword TEXT DEFAULT NULL,
    p_folder TEXT DEFAULT NULL,
    p_category_id INT DEFAULT NULL,
    p_classification TEXT DEFAULT NULL
)
RETURNS TABLE (
    email_id INT,
    sender_id INT,
    sender_name VARCHAR(100),
    sender_email VARCHAR(255),
    receiver_id INT,
    receiver_name VARCHAR(100),
    receiver_email VARCHAR(255),
    subject VARCHAR(255),
    body TEXT,
    received_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30),
    category_id INT,
    category_name VARCHAR(50),
    spam_score DOUBLE PRECISION,
    classification VARCHAR(20),
    detection_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.email_id,
        e.sender_id,
        u_sender.name AS sender_name,
        u_sender.email AS sender_email,
        e.receiver_id,
        u_recv.name AS receiver_name,
        u_recv.email AS receiver_email,
        e.subject,
        e.body,
        e.received_at,
        e.status,
        e.category_id,
        c.category_name,
        sd.spam_score,
        sd.classification,
        sd.reason AS detection_reason
    FROM emails e
    JOIN users u_sender ON e.sender_id = u_sender.user_id
    JOIN users u_recv ON e.receiver_id = u_recv.user_id
    LEFT JOIN categories c ON e.category_id = c.category_id
    LEFT JOIN spam_detection sd ON e.email_id = sd.email_id
    WHERE (e.sender_id = p_user_id OR e.receiver_id = p_user_id)
      AND (p_folder IS NULL 
           OR (p_folder = 'inbox' AND e.receiver_id = p_user_id AND e.status = 'Inbox')
           OR (p_folder = 'sent' AND e.sender_id = p_user_id)
           OR (p_folder = 'spam' AND e.receiver_id = p_user_id AND e.status = 'Spam')
           OR (p_folder = 'trash' AND (e.receiver_id = p_user_id OR e.sender_id = p_user_id) AND e.status = 'Trash')
           OR (e.status = p_folder))
      AND (p_category_id IS NULL OR e.category_id = p_category_id)
      AND (p_classification IS NULL OR sd.classification = p_classification)
      AND (
          p_keyword IS NULL 
          OR p_keyword = ''
          OR e.subject ILIKE ('%' || p_keyword || '%')
          OR e.body ILIKE ('%' || p_keyword || '%')
          OR u_sender.name ILIKE ('%' || p_keyword || '%')
          OR u_sender.email ILIKE ('%' || p_keyword || '%')
          OR to_tsvector('english', e.subject || ' ' || e.body) @@ plainto_tsquery('english', p_keyword)
      )
    ORDER BY e.received_at DESC;
END;
$$ LANGUAGE plpgsql;
