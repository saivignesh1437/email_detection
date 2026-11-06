-- =============================================================================
-- Intelligent Email Management and Spam Detection Platform
-- Seed Data (PostgreSQL)
-- =============================================================================

-- Clear existing data
TRUNCATE TABLE email_audit_log, spam_detection, emails, categories, users RESTART IDENTITY CASCADE;

-- -----------------------------------------------------------------------------
-- 1. SEED CATEGORIES
-- -----------------------------------------------------------------------------
INSERT INTO categories (category_id, category_name) VALUES
(1, 'Primary'),
(2, 'Social'),
(3, 'Promotions'),
(4, 'Updates'),
(5, 'Spam');

SELECT setval('categories_category_id_seq', (SELECT MAX(category_id) FROM categories));

-- -----------------------------------------------------------------------------
-- 2. SEED USERS
-- Passwords:
-- admin@emailmgmt.local -> Admin@1234
-- All other demo users -> User@1234
-- -----------------------------------------------------------------------------
INSERT INTO users (user_id, name, email, password_hash, created_at) VALUES
(1, 'Admin Evaluator', 'admin@emailmgmt.local', '$2b$12$NmQRzTbR1GxHFcSfr4KbJO4GzDhh64EuQi8BhYDPKgskiIqhYUjYm', CURRENT_TIMESTAMP - INTERVAL '30 days'),
(2, 'John Doe', 'john.doe@emailmgmt.local', '$2b$12$nuvQ.KT/ZDV/h3wO2hTokO6Zw/e0KMheL.hZByLcBpnWdU0rGKzni', CURRENT_TIMESTAMP - INTERVAL '25 days'),
(3, 'Alice Smith', 'alice.smith@emailmgmt.local', '$2b$12$nuvQ.KT/ZDV/h3wO2hTokO6Zw/e0KMheL.hZByLcBpnWdU0rGKzni', CURRENT_TIMESTAMP - INTERVAL '20 days'),
(4, 'Bob Wilson (Guide)', 'bob.wilson@emailmgmt.local', '$2b$12$nuvQ.KT/ZDV/h3wO2hTokO6Zw/e0KMheL.hZByLcBpnWdU0rGKzni', CURRENT_TIMESTAMP - INTERVAL '15 days'),
(5, 'Phishing Spammer', 'spammer@win-cash-now.net', '$2b$12$nuvQ.KT/ZDV/h3wO2hTokO6Zw/e0KMheL.hZByLcBpnWdU0rGKzni', CURRENT_TIMESTAMP - INTERVAL '10 days'),
(6, 'Deals Marketing', 'deals@superdiscounts-online.xyz', '$2b$12$nuvQ.KT/ZDV/h3wO2hTokO6Zw/e0KMheL.hZByLcBpnWdU0rGKzni', CURRENT_TIMESTAMP - INTERVAL '8 days');

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

-- -----------------------------------------------------------------------------
-- 3. SEED EMAILS
-- Includes legitimate academic conversations and realistic spam emails
-- -----------------------------------------------------------------------------
INSERT INTO emails (email_id, sender_id, receiver_id, subject, body, received_at, status, category_id) VALUES
-- Legitimate Academic / Work Emails
(1, 4, 2, 'PBL Project Review 4 Demonstration Schedule', 
 'Dear John, Please be ready with your project demonstration slides and database query execution proof for Review 4 tomorrow at 10:00 AM in Lab 3. Best regards, Prof. Bob Wilson.', 
 CURRENT_TIMESTAMP - INTERVAL '3 days', 'Inbox', 1),

(2, 3, 2, 'Database Schema Normalization Discussion Notes', 
 'Hey John, I reviewed the 3NF schema for the email management platform. Foreign key cascade rules and indexes on sender_id/receiver_id look solid. Let me know when the trigger tests are ready.', 
 CURRENT_TIMESTAMP - INTERVAL '2 days', 'Read', 1),

(3, 1, 2, 'Department Seminar on Distributed Machine Learning Systems', 
 'All students are invited to attend the guest lecture on scalable text classification and vector indexing architectures this Friday.', 
 CURRENT_TIMESTAMP - INTERVAL '36 hours', 'Inbox', 4),

(4, 2, 4, 'Submitted Review 4 Presentation Slides and SQL Artifacts', 
 'Dear Professor Wilson, Attached are the final presentation slides covering normalized schema, ML pipeline evaluation, and trigger execution tests.', 
 CURRENT_TIMESTAMP - INTERVAL '24 hours', 'Inbox', 1),

(5, 3, 2, 'Team lunch after project presentation', 
 'Hey John, everyone in the team is heading out to celebration lunch right after the PBL committee presentation wraps up. Hope to see you there!', 
 CURRENT_TIMESTAMP - INTERVAL '18 hours', 'Inbox', 2),

(6, 4, 3, 'Guidelines for final thesis submission', 
 'Dear Alice, ensure you format the bibliography following IEEE citations and verify your dataset preprocessing steps are clearly documented.', 
 CURRENT_TIMESTAMP - INTERVAL '12 hours', 'Inbox', 1),

-- Spam & Phishing Emails
(7, 5, 2, 'CONGRATULATIONS! You Won $1,000,000 Cash Prize in Lottery Promotion!', 
 'Dear Lucky Winner, Your email account has been randomly chosen as the top winner of our worldwide sweepstakes lottery! Claim your cash prize immediately by clicking here and submitting your social security and credit card details. Urgent 24 hours deadline!', 
 CURRENT_TIMESTAMP - INTERVAL '5 days', 'Inbox', 1),

(8, 5, 2, 'URGENT: Your Bank Account Access Is Suspended - Verify Password Now', 
 'Security Alert: We detected unauthorized login attempts from IP 192.168.1.99. Your bank account has been locked. Verify your credentials and PIN immediately by clicking the secure link below to avoid permanent account termination.', 
 CURRENT_TIMESTAMP - INTERVAL '4 days', 'Inbox', 1),

(9, 6, 2, 'Exclusive Offer: Cheap Meds, Weight Loss Miracle Pills 80% Discount', 
 'Order generic pharmaceuticals online without prescription! Lowest prices guaranteed on weight loss pills, energy boosters, and wellness supplements. Limited stock, click now to order with free worldwide delivery!', 
 CURRENT_TIMESTAMP - INTERVAL '3 days', 'Inbox', 3),

(10, 5, 3, 'Claim Your Unclaimed Inheritance of $5.5M USD from Overseas Trustee', 
 'Dear Sir/Madam, I represent an estate with $5,500,000 in escrow funds waiting for immediate wire transfer. Contact me with your full banking coordinates and passport scan to release funds today.', 
 CURRENT_TIMESTAMP - INTERVAL '2 days', 'Inbox', 1),

(11, 6, 1, 'Double Your Crypto Investment in 48 Hours Guaranteed Return!', 
 'Automated AI trading bot guarantees 300% weekly return on Bitcoin and Ethereum. Deposit $250 today and withdraw $1000 tomorrow. Risk-free guaranteed profits!', 
 CURRENT_TIMESTAMP - INTERVAL '1 day', 'Inbox', 3);

SELECT setval('emails_email_id_seq', (SELECT MAX(email_id) FROM emails));

-- -----------------------------------------------------------------------------
-- 4. SEED SPAM DETECTION
-- -----------------------------------------------------------------------------
-- We insert spam detection records for seeded emails. Note that our trigger
-- fn_auto_categorize_spam() will automatically execute when classification = 'Spam',
-- updating emails.status = 'Spam', emails.category_id = 5 (Spam), and logging to email_audit_log!
-- -----------------------------------------------------------------------------
INSERT INTO spam_detection (email_id, spam_score, classification, reason, detected_at) VALUES
(1, 0.02, 'Not Spam', 'Genuine academic correspondence containing standard institutional vocabulary.', CURRENT_TIMESTAMP - INTERVAL '3 days'),
(2, 0.04, 'Not Spam', 'Legitimate technical communication regarding database schemas and project design.', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(3, 0.05, 'Not Spam', 'Informational departmental notification regarding seminar schedule.', CURRENT_TIMESTAMP - INTERVAL '36 hours'),
(4, 0.01, 'Not Spam', 'Project submission and student-advisor academic correspondence.', CURRENT_TIMESTAMP - INTERVAL '24 hours'),
(5, 0.06, 'Not Spam', 'Social informal peer communication regarding lunch event.', CURRENT_TIMESTAMP - INTERVAL '18 hours'),
(6, 0.03, 'Not Spam', 'Academic guidelines regarding thesis formatting and IEEE citation.', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
(7, 0.98, 'Spam', 'Triggered high-risk keywords: [winner, lottery, cash prize, sweepstakes, credit card, urgent]. Exceeds spam threshold (0.50).', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(8, 0.96, 'Spam', 'Identified credential phishing indicators: [urgent, bank account, suspended, verify password, permanent termination].', CURRENT_TIMESTAMP - INTERVAL '4 days'),
(9, 0.92, 'Spam', 'Commercial spam patterns detected: [cheap meds, miracle pills, discount, free worldwide delivery].', CURRENT_TIMESTAMP - INTERVAL '3 days'),
(10, 0.97, 'Spam', 'Financial advance-fee scam markers identified: [unclaimed inheritance, escrow funds, wire transfer, banking coordinates].', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(11, 0.94, 'Spam', 'High-confidence fraudulent investment scheme: [crypto investment, guaranteed return, double, risk-free profits].', CURRENT_TIMESTAMP - INTERVAL '1 day');

SELECT setval('spam_detection_detection_id_seq', (SELECT MAX(detection_id) FROM spam_detection));
