"""
Database Initialization Utility for Production & Staging
Executes non-destructive database schema, functions, triggers, and baseline categories.
Usage:
    python -m database.init_db
"""
import os
import sys
from pathlib import Path

# Ensure repo root is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from sqlalchemy import text
from backend.app.database import engine
from backend.app.config import DATABASE_URL, ENVIRONMENT

def run_production_init():
    print("=" * 70)
    print(" INTELLIGENT EMAIL MANAGEMENT - DATABASE INITIALIZATION")
    print(f" Environment : {ENVIRONMENT}")
    # Mask password in URL printout
    safe_url = DATABASE_URL
    if "@" in safe_url and ":" in safe_url.split("@")[0]:
        prefix, rest = safe_url.split("@", 1)
        proto_user = prefix.rsplit(":", 1)[0]
        safe_url = f"{proto_user}:****@{rest}"
    print(f" Target DB   : {safe_url}")
    print("=" * 70)

    sql_file = REPO_ROOT / "database" / "init_production.sql"
    if not sql_file.exists():
        print(f"[ERROR] SQL file not found at {sql_file}")
        sys.exit(1)

    print(f"[1/3] Reading SQL commands from {sql_file.name}...")
    sql_content = sql_file.read_text(encoding="utf-8")

    print("[2/3] Executing non-destructive schema, functions, triggers, and categories...")
    # Execute through raw DBAPI connection to support multiple DDL statements, DO blocks, and triggers
    raw_conn = engine.raw_connection()
    try:
        with raw_conn.cursor() as cursor:
            cursor.execute(sql_content)
        raw_conn.commit()
        print("  -> Schema DDL and taxonomy applied successfully.")
    except Exception as e:
        raw_conn.rollback()
        print(f"  [ERROR] Database execution failed: {e}")
        sys.exit(1)
    finally:
        raw_conn.close()

    print("[3/3] Verifying database objects...")
    with engine.connect() as conn:
        tables = [
            "users",
            "categories",
            "emails",
            "spam_detection",
            "email_audit_log",
            "dsa_detection",
        ]
        for tbl in tables:
            cnt = conn.execute(
                text(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = :t AND table_schema = 'public';"
                ),
                {"t": tbl},
            ).scalar()
            if cnt > 0:
                print(f"  [OK] Table '{tbl}' verified.")
            else:
                print(f"  [WARN] Table '{tbl}' could not be verified.")

        cat_count = conn.execute(text("SELECT COUNT(*) FROM categories;")).scalar()
        print(f"  [OK] Categories populated: {cat_count} baseline categories.")

        # Test stored functions
        try:
            conn.execute(text("SELECT * FROM fn_get_system_dashboard_stats();"))
            print("  [OK] Stored function 'fn_get_system_dashboard_stats()' verified.")
        except Exception as e:
            print(f"  [WARN] Function test failed: {e}")

    print("\n[SUCCESS] Database initialization completed successfully.")
    print("=" * 70)

if __name__ == "__main__":
    run_production_init()
