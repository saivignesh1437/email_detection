-- =============================================================================
-- Intelligent Email Management and Spam Detection Platform
-- Database Triggers Definition (PostgreSQL)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TRIGGER FUNCTION 1: Log Email Status Changes & Creation
-- Demonstrates audit logging whenever email records are manipulated
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

-- -----------------------------------------------------------------------------
-- TRIGGER FUNCTION 2: Auto-sync Email Status and Category on Spam Detection
-- When ML spam detection flags an email as 'Spam', this trigger automatically:
-- 1. Updates emails.status = 'Spam'
-- 2. Sets emails.category_id = (Spam Category ID)
-- 3. Writes an explanatory record to email_audit_log
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auto_categorize_spam()
RETURNS TRIGGER AS $$
DECLARE
    v_spam_category_id INT;
BEGIN
    IF (NEW.classification = 'Spam') THEN
        -- Find or default to Spam category
        SELECT category_id INTO v_spam_category_id 
        FROM categories 
        WHERE category_name = 'Spam' 
        LIMIT 1;

        -- Update the underlying email record
        UPDATE emails
        SET status = 'Spam',
            category_id = COALESCE(v_spam_category_id, emails.category_id)
        WHERE email_id = NEW.email_id;

        -- Record automated security action
        INSERT INTO email_audit_log (email_id, action, previous_status, new_status, details)
        VALUES (
            NEW.email_id, 
            'AUTO_SPAM_FLAGGED', 
            'Inbox', 
            'Spam', 
            CONCAT('Automated ML Spam Classifier flagged message with confidence ', ROUND((NEW.spam_score * 100)::numeric, 1), '%')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_spam_detection_sync ON spam_detection;
CREATE TRIGGER trg_spam_detection_sync
AFTER INSERT OR UPDATE ON spam_detection
FOR EACH ROW
EXECUTE FUNCTION fn_auto_categorize_spam();
