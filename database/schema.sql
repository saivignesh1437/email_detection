-- =============================================================================
-- Intelligent Email Management and Spam Detection Platform
-- Database Schema Definition (PostgreSQL)
-- Normalized to 3rd Normal Form (3NF)
-- =============================================================================

-- Clean up existing objects if recreating
DROP TABLE IF EXISTS email_audit_log CASCADE;
DROP TABLE IF EXISTS spam_detection CASCADE;
DROP TABLE IF EXISTS emails CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores registered system users with hashed passwords
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- Predefined or custom classification categories (Primary, Social, Spam, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE
);

-- -----------------------------------------------------------------------------
-- 3. EMAILS TABLE
-- Stores email metadata and message contents with relational integrity
-- -----------------------------------------------------------------------------
CREATE TABLE emails (
    email_id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'Inbox', -- 'Inbox', 'Read', 'Spam', 'Trash', 'Archived'
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
-- 4. SPAM_DETECTION TABLE
-- Stores NLP / ML classification results, confidence scores, and rationales
-- -----------------------------------------------------------------------------
CREATE TABLE spam_detection (
    detection_id SERIAL PRIMARY KEY,
    email_id INT NOT NULL UNIQUE,
    spam_score DOUBLE PRECISION NOT NULL,
    classification VARCHAR(20) NOT NULL, -- 'Spam', 'Not Spam'
    reason TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_spam_email FOREIGN KEY (email_id) 
        REFERENCES emails (email_id) ON DELETE CASCADE,
    CONSTRAINT chk_spam_score_range CHECK (spam_score >= 0.0 AND spam_score <= 1.0),
    CONSTRAINT chk_classification_valid CHECK (classification IN ('Spam', 'Not Spam'))
);

-- -----------------------------------------------------------------------------
-- 5. EMAIL_AUDIT_LOG TABLE (Supporting Table for DBMS Trigger Demo)
-- Records changes to email states for accountability and audit trails
-- -----------------------------------------------------------------------------
CREATE TABLE email_audit_log (
    audit_id SERIAL PRIMARY KEY,
    email_id INT NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'CREATED', 'STATUS_CHANGED', 'AUTO_SPAM_FLAGGED'
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    details TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 6. DSA_DETECTION TABLE
-- Stores Java DSA pattern analysis: Aho-Corasick exact matches & Damerau-Levenshtein fuzzy matches
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

-- =============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =============================================================================
CREATE INDEX idx_emails_sender ON emails(sender_id);
CREATE INDEX idx_emails_receiver ON emails(receiver_id);
CREATE INDEX idx_emails_status ON emails(status);
CREATE INDEX idx_emails_category ON emails(category_id);
CREATE INDEX idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX idx_spam_detection_classification ON spam_detection(classification);
CREATE INDEX idx_spam_detection_email ON spam_detection(email_id);
CREATE INDEX idx_email_audit_log_email ON email_audit_log(email_id);
CREATE INDEX idx_dsa_detection_email ON dsa_detection(email_id);
CREATE INDEX idx_dsa_detection_classification ON dsa_detection(classification);
CREATE INDEX idx_dsa_detection_risk_level ON dsa_detection(risk_level);

-- Full-text search index for high performance searching across subject & body
CREATE INDEX idx_emails_fts ON emails USING gin(to_tsvector('english', subject || ' ' || body));

