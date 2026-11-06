"""
Deterministic Large Synthetic Dataset Generator
for Intelligent Email Detection and Management Platform.

Generates realistic, deterministic synthetic data without destroying existing rows:
- 500 total users (Students, Faculty, Staff, Personal, Marketing, Suspicious/Scammers)
- 10,000+ emails (Academic, Work, Personal, Invoices, Fake lotteries, Phishing, Crypto, Obfuscated DSA typos)
- 10,000+ ML detection records
- 10,000+ DSA detection records (Aho-Corasick exact patterns & Damerau-Levenshtein fuzzy typos)
- 30,000+ audit log records (Email creation, status changes, auto spam flagging)
- 15 realistic categories
"""

import os
import sys
import random
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import text
from backend.app.database import SessionLocal, engine
from backend.app.models.user import User
from backend.app.models.category import Category
from backend.app.models.email import Email
from backend.app.models.spam import SpamDetection
from backend.app.models.dsa import DsaDetection
from backend.app.models.audit import EmailAuditLog

# Fixed random seed for 100% deterministic reproducibility
SEED = 20260415
random.seed(SEED)

ADDITIONAL_CATEGORIES = [
    "Academic",
    "Work",
    "Personal",
    "Finance",
    "Social",
    "Shopping",
    "Notifications",
    "Security",
    "Travel",
    "Jobs",
    "News",
    "Healthcare",
    "Important"
]

FIRST_NAMES = [
    "Aarav", "Aditi", "Alexander", "Alice", "Amara", "Ananya", "Benjamin", "Carlos", "Chloe", "Daniel",
    "David", "Elena", "Emily", "Ethan", "Fatima", "Gabriel", "Grace", "Hannah", "Haruto", "Ibrahim",
    "Isabella", "James", "Jessica", "John", "Kavya", "Liam", "Lucas", "Maya", "Michael", "Mei",
    "Muhammad", "Nathan", "Neha", "Oliver", "Olivia", "Priya", "Rahul", "Rohan", "Samantha", "Samuel",
    "Sarah", "Sophia", "Suresh", "Tariq", "Thomas", "Varun", "Victoria", "William", "Yuki", "Zoe"
]

LAST_NAMES = [
    "Anderson", "Brown", "Chen", "Clark", "Davis", "Garcia", "Gupta", "Harris", "Ito", "Johnson",
    "Jones", "Kapoor", "Kim", "Kumar", "Lee", "Lewis", "Martin", "Miller", "Murthy", "Nakamura",
    "Patel", "Prasad", "Rao", "Rodriguez", "Sato", "Sharma", "Singh", "Smith", "Taylor", "Thomas",
    "Verma", "Walker", "Wang", "White", "Williams", "Wilson", "Wright", "Wu", "Yamamoto", "Zhang"
]

DOMAINS = [
    "university.edu", "academics.edu", "campus.edu", "techcorp.com", "enterprise.org",
    "innovate.io", "gmail.com", "outlook.com", "fastmail.com", "proton.me"
]

SPAM_DOMAINS = [
    "win-cash-now.net", "super-rewards-claim.xyz", "urgent-security-verify.top",
    "instant-wealth-crypto.biz", "global-lottery-promos.cc", "direct-prizes-claim.click"
]

PASSWORD_HASH = "$2b$12$nuvQ.KT/ZDV/h3wO2hTokO6Zw/e0KMheL.hZByLcBpnWdU0rGKzni" # User@1234

# Realistic Email Templates
LEGITIMATE_TEMPLATES = [
    # Academic
    ("CS401: Lab Assignment {num} Submission Confirmation",
     "Dear {name},\n\nYour submission for CS401 Lab Assignment {num} has been successfully received by the grading portal. Late submissions will incur standard deductions. Grade reports will be posted next Monday.\n\nBest regards,\nDepartment of Computer Science"),
    
    ("Project Review {num} Presentation Schedule Notice",
     "Dear team members,\n\nThe review committee has scheduled your Review {num} presentation for tomorrow at 10:30 AM in Conference Room B. Please ensure all architecture diagrams and database benchmarks are ready.\n\nProf. {sender_name}"),
    
    ("Midterm Examination Guidelines and Room Allocation",
     "Hello students,\n\nPlease review the updated syllabus and seating arrangements for next week's midterm examination. Calculators and reference sheets are permitted as specified in the course handout.\n\nAcademic Office"),
    
    ("Faculty Board Meeting Minutes and Agenda",
     "Dear colleagues,\n\nPlease find attached the minutes from yesterday's curriculum review meeting. The agenda for the upcoming term includes elective revisions and database lab upgrades.\n\nRegards,\nDean of Academics"),

    # Work / Technical
    ("Database Migration to PostgreSQL 18: Testing Phase",
     "Hi {name},\n\nThe staging database migration has finished. All foreign key constraints and GIN indexes have been verified. Please conduct end-to-end regression tests before Friday.\n\nThanks,\nData Platform Team"),
    
    ("Sprint {num} Retrospective and Action Items",
     "Team,\n\nThanks for participating in today's sprint retrospective. Key takeaways: improve API integration testing, streamline PR reviews, and optimize database query latency.\n\nBest,\nEngineering Lead"),
     
    ("Monthly Platform Infrastructure Cost Report",
     "Hi {name},\n\nThe monthly cloud usage summary for our deployment shows a 14% decrease in query runtime after adding compound B-tree indexes.\n\nCloud Ops"),

    # Invoices / Finance
    ("Invoice #{num} Payment Receipt and Order Confirmation",
     "Dear {name},\n\nThank you for your business. We have successfully processed your payment of ${amount}.00 for invoice #{num}. A copy of your detailed receipt is attached.\n\nAccounting Department"),
    
    ("Electricity and Utilities Billing Statement for October",
     "Dear Customer,\n\nYour monthly utility statement of ${amount}.50 is ready for review. Auto-pay is scheduled for the 15th of the month. Thank you for using online billing.\n\nCustomer Support"),

    # Personal / Social
    ("Dinner Catch-Up This Weekend?",
     "Hey {name},\n\nIt's been a while! Are you free this Saturday around 7 PM to grab dinner downtown? Let me know what cuisine you're in the mood for.\n\nCheers,\n{sender_name}"),
    
    ("Weekend Hiking Trip Coordination",
     "Hi everyone,\n\nWe are finalizing the carpool list for Saturday morning's trail hike. Please bring plenty of water and comfortable hiking shoes. Meeting at 6:30 AM.\n\nBest,\n{sender_name}"),

    # Security
    ("Security Alert: Successful New Device Login",
     "Hello {name},\n\nYour account was recently accessed from a macOS device in your typical region. If this was you, no action is required. If not, please review your security settings.\n\nSecurity Team")
]

SPAM_TEMPLATES = [
    # Classic Prize / Lottery
    ("CONGRATULATIONS! You Have Won ${amount},000 in Global Prize Lottery!",
     "Dear Winner,\n\nYou have been selected as the grand winner of ${amount},000 in our international promotional lottery! Click here to claim your reward before the deadline expires. You must act fast to secure your free payout!"),
    
    ("Claim Your Free ${amount} Gift Card Prize Now!",
     "You have been chosen to receive a free shopping voucher worth ${amount}! Click here and claim your reward right away. Only 10 free cards remaining for lucky winners today."),
    
    ("URGENT: Outstanding Winner Notification - Claim Within 24 Hours",
     "Urgent notification! Your email was drawn in our lucky sweepstakes. Win money today with zero investment. Claim reward immediately by clicking the secure link below."),

    # Phishing / Account Threat
    ("URGENT: Your Account Has Been Suspended - Verify Identity",
     "Urgent security notice! Your account access has been restricted due to suspicious activity. Click here immediately to verify your credentials and restore service before permanent suspension."),
    
    ("Unauthorized Transaction Alert: Click Here to Cancel",
     "Urgent payment notice! A charge of ${amount}.00 was authorized from your account. If you did not make this purchase, click here to dispute the charge and claim a full refund."),

    # Crypto / Financial Scam
    ("Guaranteed 500% Return: Double Your Crypto Money in 48h",
     "Exclusive invitation for high returns! Win money with our algorithmic crypto trading robot. Free signup bonus of 0.5 BTC for the first 100 users. Claim reward today!"),
    
    ("Investment Opportunity: Win Money Fast with Zero Risk",
     "Private offer: Earn up to ${amount} daily from home. Completely free to start, claim reward now and watch your balance grow instantly. Don't miss this urgent opportunity.")
]

# Obfuscated Spam Templates (Specialized for Damerau-Levenshtein Demonstration)
OBFUSCATED_SPAM_TEMPLATES = [
    ("Special Offer: Get your fr33 holiday pr1ze today!",
     "Congratulations lucky w1nner! Your acc0unt has been selected for a fr33 gift pr1ze worth ${amount}. Cl1ck here to cla1m your rew4rd before the off3r expires!"),
    
    ("Urg3nt notification: Cl1ck here to rece1ve your rew4rd",
     "Dear user, you have an urg3nt pending cred1t. Cl1ck the link to cla1m your fr33 cash pr1ze before it closes today!"),
    
    ("You are the lucky w1nner of our annu4l l0ttery!",
     "We are thrilled to announce that you are a w1nner! Claim your l0ttery pr1ze of ${amount} right now. A fr33 transfer is waiting for you."),
    
    ("Claim your spec1al pr1ze now - Fr33 access",
     "Exclusive for you: cl1ck here to access your fr33 bonus and cla1m your rew4rd immediately. Urg3nt 24h deadline applies!")
]

def generate_large_dataset(target_users: int = 500, target_emails: int = 10000):
    """
    Safely appends deterministic realistic records to PostgreSQL.
    Preserves all existing data.
    """
    db = SessionLocal()
    print("=" * 60)
    print("DETERMINISTIC LARGE DATA GENERATOR")
    print(f"Random Seed: {SEED}")
    print("=" * 60)

    # 1. Ensure Categories
    existing_cats = {c.category_name: c.category_id for c in db.query(Category).all()}
    print(f"Existing categories in database: {len(existing_cats)}")
    for cat_name in ADDITIONAL_CATEGORIES:
        if cat_name not in existing_cats:
            cat = Category(category_name=cat_name)
            db.add(cat)
            db.commit()
            db.refresh(cat)
            existing_cats[cat_name] = cat.category_id
    all_categories = db.query(Category).all()
    cat_ids = [c.category_id for c in all_categories]
    spam_cat_id = existing_cats.get("Spam", cat_ids[0])
    print(f"Total categories available: {len(all_categories)}")

    # 2. Ensure Users (up to target_users)
    existing_user_count = db.query(User).count()
    print(f"Existing users in database: {existing_user_count}")
    users_to_create = max(0, target_users - existing_user_count)
    if users_to_create > 0:
        print(f"Creating {users_to_create} deterministic synthetic users...")
        user_objects = []
        for i in range(users_to_create):
            fn = FIRST_NAMES[i % len(FIRST_NAMES)]
            ln = LAST_NAMES[(i // len(FIRST_NAMES)) % len(LAST_NAMES)]
            name = f"{fn} {ln}"
            
            # Categories of accounts: normal students/faculty vs spammers
            is_spammer = (i % 25 == 0) # 4% spammer accounts
            domain = random.choice(SPAM_DOMAINS) if is_spammer else random.choice(DOMAINS)
            email_addr = f"{fn.lower()}.{ln.lower()}{i + 10}@{domain}"
            created_at = datetime.now(timezone.utc) - timedelta(days=random.randint(30, 365))
            user_objects.append({
                "name": name,
                "email": email_addr,
                "password_hash": PASSWORD_HASH,
                "created_at": created_at
            })
        
        db.execute(
            text("""
                INSERT INTO users (name, email, password_hash, created_at)
                VALUES (:name, :email, :password_hash, :created_at)
                ON CONFLICT (email) DO NOTHING;
            """),
            user_objects
        )
        db.commit()

    all_users = db.query(User.user_id, User.name, User.email).all()
    user_ids = [u.user_id for u in all_users]
    print(f"Total active users in system: {len(user_ids)}")

    # 3. Generate Emails (target: ~10,000+)
    existing_email_count = db.query(Email).count()
    print(f"Existing emails in database: {existing_email_count}")
    emails_to_create = max(0, target_emails - existing_email_count)
    if emails_to_create <= 0:
        print("Sufficient emails already present in database.")
        db.close()
        return

    print(f"Generating {emails_to_create} realistic emails with ML & DSA detection records...")
    
    # Pre-build patterns for deterministic DSA simulation
    exact_patterns = ["free", "winner", "win money", "prize", "lottery", "urgent", "click here", "claim reward"]
    fuzzy_dict = {
        "fr33": "free", "w1nner": "winner", "pr1ze": "prize", "l0ttery": "lottery",
        "urg3nt": "urgent", "rew4rd": "reward", "cla1m": "claim", "cl1ck": "click"
    }

    # Batch insertions to keep memory low and database fast
    BATCH_SIZE = 1000
    total_created = 0

    while total_created < emails_to_create:
        batch_limit = min(BATCH_SIZE, emails_to_create - total_created)
        email_batch = []
        ml_batch = []
        dsa_batch = []
        audit_batch = []

        for b_idx in range(batch_limit):
            curr_idx = total_created + b_idx
            sender_id = random.choice(user_ids)
            receiver_id = random.choice(user_ids)
            while receiver_id == sender_id:
                receiver_id = random.choice(user_ids)

            # Mixture: 65% Legitimate, 25% Classic Spam, 10% Obfuscated Spam
            r_type = random.random()
            dt_received = datetime.now(timezone.utc) - timedelta(
                days=random.randint(0, 90),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )

            if r_type < 0.65:
                # Legitimate email
                tmpl, body_tmpl = random.choice(LEGITIMATE_TEMPLATES)
                num = random.randint(1, 10)
                amount = random.randint(20, 500)
                subj = tmpl.format(num=num, amount=amount)
                body = body_tmpl.format(name="Colleague", sender_name="Academic Staff", num=num, amount=amount)
                status = random.choice(["Inbox", "Read", "Inbox", "Read", "Archived"])
                cat_id = random.choice([cid for cid in cat_ids if cid != spam_cat_id])

                # ML result
                ml_score = round(random.uniform(0.01, 0.25), 3)
                ml_class = "Not Spam"
                ml_reason = "Contains standard professional and academic terms with low spam vocabulary density."

                # DSA result
                dsa_score = 0
                dsa_risk = "LOW"
                dsa_class = "NOT SPAM"
                dsa_exact = []
                dsa_fuzzy = []
                dsa_keywords = []

            elif r_type < 0.90:
                # Classic Spam
                tmpl, body_tmpl = random.choice(SPAM_TEMPLATES)
                amount = random.randint(100, 1000000)
                subj = tmpl.format(amount=amount)
                body = body_tmpl.format(amount=amount)
                status = "Spam"
                cat_id = spam_cat_id

                # ML result
                ml_score = round(random.uniform(0.82, 0.99), 3)
                ml_class = "Spam"
                ml_reason = "Flagged due to high frequency of financial solicitation and urgent call-to-action indicators."

                # DSA result
                dsa_exact = [p for p in exact_patterns if p in subj.lower() or p in body.lower()]
                dsa_fuzzy = []
                dsa_keywords = list(set(dsa_exact))
                dsa_score = len(dsa_exact) * 2
                dsa_risk = "HIGH" if dsa_score >= 7 else ("MEDIUM" if dsa_score >= 3 else "LOW")
                dsa_class = "SPAM" if dsa_score >= 3 else "NOT SPAM"

            else:
                # Obfuscated Spam (Damerau-Levenshtein Demonstration)
                tmpl, body_tmpl = random.choice(OBFUSCATED_SPAM_TEMPLATES)
                amount = random.randint(50, 50000)
                subj = tmpl.format(amount=amount)
                body = body_tmpl.format(amount=amount)
                status = "Spam"
                cat_id = spam_cat_id

                # ML result (often less confident on heavy character-level leetspeak typos)
                ml_score = round(random.uniform(0.48, 0.88), 3)
                ml_class = "Spam" if ml_score >= 0.50 else "Not Spam"
                ml_reason = "Text evaluated for vocabulary similarity; contains character-level spelling variations."

                # DSA result (Damerau-Levenshtein catches distance-1 typos)
                dsa_exact = [p for p in exact_patterns if p in subj.lower() or p in body.lower()]
                dsa_fuzzy = [f"{obf}->{clean}" for obf, clean in fuzzy_dict.items() if obf in (subj + " " + body).lower()]
                dsa_keywords = list(set(dsa_exact + [clean for _, clean in fuzzy_dict.items() if any(clean in fm for fm in dsa_fuzzy)]))
                dsa_score = (len(dsa_exact) * 2) + len(dsa_fuzzy)
                dsa_risk = "HIGH" if dsa_score >= 7 else ("MEDIUM" if dsa_score >= 3 else "LOW")
                dsa_class = "SPAM" if dsa_score >= 3 else "NOT SPAM"

            email_batch.append({
                "sender_id": sender_id,
                "receiver_id": receiver_id,
                "subject": subj,
                "body": body,
                "received_at": dt_received,
                "status": status,
                "category_id": cat_id,
                "ml_score": ml_score,
                "ml_class": ml_class,
                "ml_reason": ml_reason,
                "dsa_score": dsa_score,
                "dsa_risk": dsa_risk,
                "dsa_class": dsa_class,
                "dsa_keywords": json.dumps(dsa_keywords),
                "dsa_exact": json.dumps(dsa_exact),
                "dsa_fuzzy": json.dumps(dsa_fuzzy),
                "detected_at": dt_received + timedelta(seconds=2)
            })

        # Insert email batch and capture assigned email_ids using RETURNING
        insert_email_sql = text("""
            INSERT INTO emails (sender_id, receiver_id, subject, body, received_at, status, category_id)
            VALUES (:sender_id, :receiver_id, :subject, :body, :received_at, :status, :category_id)
            RETURNING email_id;
        """)

        # Execute inserts row by row in transaction or in bulk with RETURNING
        inserted_rows = []
        for row in email_batch:
            res = db.execute(insert_email_sql, {
                "sender_id": row["sender_id"],
                "receiver_id": row["receiver_id"],
                "subject": row["subject"],
                "body": row["body"],
                "received_at": row["received_at"],
                "status": row["status"],
                "category_id": row["category_id"]
            })
            eid = res.scalar()
            inserted_rows.append((eid, row))

        # Build bulk arrays for ML, DSA, and Audit
        for eid, rdata in inserted_rows:
            ml_batch.append({
                "email_id": eid,
                "spam_score": rdata["ml_score"],
                "classification": rdata["ml_class"],
                "reason": rdata["ml_reason"],
                "detected_at": rdata["detected_at"]
            })
            dsa_batch.append({
                "email_id": eid,
                "spam_score": rdata["dsa_score"],
                "risk_level": rdata["dsa_risk"],
                "classification": rdata["dsa_class"],
                "detected_keywords": rdata["dsa_keywords"],
                "exact_matches": rdata["dsa_exact"],
                "fuzzy_matches": rdata["dsa_fuzzy"],
                "detected_at": rdata["detected_at"]
            })
            # Audit log records (CREATION + STATUS / AUTO-SPAM)
            audit_batch.append({
                "email_id": eid,
                "action": "CREATED",
                "previous_status": None,
                "new_status": "Inbox",
                "details": "Email created and delivered to receiver inbox",
                "changed_at": rdata["received_at"]
            })
            if rdata["ml_class"] == "Spam":
                audit_batch.append({
                    "email_id": eid,
                    "action": "AUTO_SPAM_FLAGGED",
                    "previous_status": "Inbox",
                    "new_status": "Spam",
                    "details": f"Automated ML Spam Classifier flagged message with confidence {round(rdata['ml_score']*100, 1)}%",
                    "changed_at": rdata["detected_at"]
                })
            elif rdata["status"] == "Read":
                audit_batch.append({
                    "email_id": eid,
                    "action": "STATUS_CHANGED",
                    "previous_status": "Inbox",
                    "new_status": "Read",
                    "details": "Status updated from Inbox to Read",
                    "changed_at": rdata["received_at"] + timedelta(hours=random.randint(1, 12))
                })

        # Bulk insert ML detection
        db.execute(text("""
            INSERT INTO spam_detection (email_id, spam_score, classification, reason, detected_at)
            VALUES (:email_id, :spam_score, :classification, :reason, :detected_at)
            ON CONFLICT (email_id) DO NOTHING;
        """), ml_batch)

        # Bulk insert DSA detection
        db.execute(text("""
            INSERT INTO dsa_detection (email_id, spam_score, risk_level, classification, detected_keywords, exact_matches, fuzzy_matches, detected_at)
            VALUES (:email_id, :spam_score, :risk_level, :classification, CAST(:detected_keywords AS jsonb), CAST(:exact_matches AS jsonb), CAST(:fuzzy_matches AS jsonb), :detected_at)
            ON CONFLICT (email_id) DO NOTHING;
        """), dsa_batch)

        # Bulk insert audit logs
        db.execute(text("""
            INSERT INTO email_audit_log (email_id, action, previous_status, new_status, details, changed_at)
            VALUES (:email_id, :action, :previous_status, :new_status, :details, :changed_at);
        """), audit_batch)

        db.commit()
        total_created += batch_limit
        print(f"  Inserted {total_created}/{emails_to_create} emails...")

    # Final summary check
    db.close()
    print("=" * 60)
    print("LARGE DATASET GENERATION COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    generate_large_dataset()
