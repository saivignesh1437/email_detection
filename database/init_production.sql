-- =============================================================================
-- Intelligent Email Management and Spam Detection Platform
-- Safe Production Database Initialization Script (PostgreSQL)
--
-- NON-DESTRUCTIVE: Uses CREATE TABLE IF NOT EXISTS and ON CONFLICT DO NOTHING.
-- Does NOT drop tables.
-- Does NOT insert demo accounts or hardcoded passwords.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE
);

-- -----------------------------------------------------------------------------
-- 3. EMAILS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emails (
    email_id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'Inbox',
    category_id INT,
    CONSTRAINT fk_emails_sender FOREIGN KEY (sender_id) 
        REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_emails_receiver FOREIGN KEY (receiver_id) 
        REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_emails_category FOREIGN KEY (category_id) 
        REFERENCES categories (category_id) ON DELETE SET NULL,
    CONSTRAINT chk_status_valid CHECK (status IN ('Inbox', 'Read', 'Spam', 'Trash', 'Archived'))
);

-- -----------------------------------------------------------------------------
-- 4. SPAM_DETECTION TABLE (ML Classifications)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spam_detection (
    detection_id SERIAL PRIMARY KEY,
    email_id INT NOT NULL UNIQUE,
    spam_score DOUBLE PRECISION NOT NULL,
    classification VARCHAR(20) NOT NULL,
    reason TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_spam_email FOREIGN KEY (email_id) 
        REFERENCES emails (email_id) ON DELETE CASCADE,
    CONSTRAINT chk_spam_score_range CHECK (spam_score >= 0.0 AND spam_score <= 1.0),
    CONSTRAINT chk_classification_valid CHECK (classification IN ('Spam', 'Not Spam'))
);

-- -----------------------------------------------------------------------------
-- 5. EMAIL_AUDIT_LOG TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_audit_log (
    audit_id SERIAL PRIMARY KEY,
    email_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    details TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 6. DSA_DETECTION TABLE (Java DSA Pattern Engine)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsa_detection (
    detection_id SERIAL PRIMARY KEY,
    email_id INT NOT NULL UNIQUE,
    spam_score INT NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    classification VARCHAR(20) NOT NULL,
    detected_keywords JSONB DEFAULT '[]'::jsonb,
    exact_matches JSONB DEFAULT '[]'::jsonb,
    fuzzy_matches JSONB DEFAULT '[]'::jsonb,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dsa_email FOREIGN KEY (email_id) 
        REFERENCES emails (email_id) ON DELETE CASCADE,
    CONSTRAINT chk_dsa_classification_valid CHECK (classification IN ('SPAM', 'NOT SPAM')),
    CONSTRAINT chk_dsa_risk_level_valid CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH'))
);

-- -----------------------------------------------------------------------------
-- 7. PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_emails_sender ON emails(sender_id);
CREATE INDEX IF NOT EXISTS idx_emails_receiver ON emails(receiver_id);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);
CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(category_id);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_spam_detection_classification ON spam_detection(classification);
CREATE INDEX IF NOT EXISTS idx_spam_detection_email ON spam_detection(email_id);
CREATE INDEX IF NOT EXISTS idx_email_audit_log_email ON email_audit_log(email_id);
CREATE INDEX IF NOT EXISTS idx_dsa_detection_email ON dsa_detection(email_id);
CREATE INDEX IF NOT EXISTS idx_dsa_detection_classification ON dsa_detection(classification);
CREATE INDEX IF NOT EXISTS idx_dsa_detection_risk_level ON dsa_detection(risk_level);
CREATE INDEX IF NOT EXISTS idx_emails_fts ON emails USING gin(to_tsvector('english', subject || ' ' || body));

-- -----------------------------------------------------------------------------
-- 8. STORED PROCEDURES & ANALYTIC FUNCTIONS
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
        v_ratio := ROUND((v_spam::NUMERIC / (v_spam + v_legit)::NUMERIC) * 100, 2);
    ELSE
        v_ratio := 0.00;
    END IF;

    RETURN QUERY
    SELECT v_users, v_emails, v_spam, v_legit, v_ratio, v_cats;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 9. TRIGGERS & AUDIT AUTOMATION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_audit_email_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO email_audit_log (email_id, action, previous_status, new_status, details)
        VALUES (NEW.email_id, 'CREATED', NULL, NEW.status, 'Email created and delivered to receiver inbox');
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            INSERT INTO email_audit_log (email_id, action, previous_status, new_status, details)
            VALUES (NEW.email_id, 'STATUS_CHANGED', OLD.status, NEW.status, 
                    CONCAT('Status updated from ', OLD.status, ' to ', NEW.status));
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_email ON emails;
CREATE TRIGGER trg_audit_email
AFTER INSERT OR UPDATE ON emails
FOR EACH ROW
EXECUTE FUNCTION fn_audit_email_changes();

CREATE OR REPLACE FUNCTION fn_auto_categorize_spam()
RETURNS TRIGGER AS $$
DECLARE
    v_spam_category_id INT;
BEGIN
    IF (NEW.classification = 'Spam') THEN
        SELECT category_id INTO v_spam_category_id 
        FROM categories 
        WHERE category_name = 'Spam' 
        LIMIT 1;

        UPDATE emails
        SET status = 'Spam',
            category_id = COALESCE(v_spam_category_id, emails.category_id)
        WHERE email_id = NEW.email_id;

        INSERT INTO email_audit_log (email_id, action, previous_status, new_status, details)
        VALUES (
            NEW.email_id, 
            'AUTO_SPAM_FLAGGED', 
            'Inbox', 
            'Spam', 
            CONCAT('Automated trigger quarantine: ML score ', ROUND(NEW.spam_score::NUMERIC, 4), ' - Reason: ', NEW.reason)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_categorize_spam ON spam_detection;
CREATE TRIGGER trg_auto_categorize_spam
AFTER INSERT ON spam_detection
FOR EACH ROW
EXECUTE FUNCTION fn_auto_categorize_spam();

-- -----------------------------------------------------------------------------
-- 10. BASELINE ESSENTIAL TAXONOMY (Zero Demo Accounts)
-- -----------------------------------------------------------------------------
INSERT INTO categories (category_id, category_name) VALUES
(1, 'Primary'),
(2, 'Social'),
(3, 'Promotions'),
(4, 'Updates'),
(5, 'Spam')
ON CONFLICT (category_name) DO NOTHING;

SELECT setval('categories_category_id_seq', COALESCE((SELECT MAX(category_id) FROM categories), 1));
