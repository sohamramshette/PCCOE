"""
Test and diagnose database connection (PostgreSQL / Supabase / SQLite fallback).
Usage:
    python backend/scripts/test_db_connection.py
"""

import sys
import os
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import inspect, text, create_engine
from backend.app.config.settings import settings


def test_connection():
    print("=" * 65)
    print("  DATABASE CONNECTIVITY TEST (SUPABASE / POSTGRESQL / SQLITE)")
    print("=" * 65)

    target_url = os.environ.get("DATABASE_URL") or settings.sqlalchemy_database_uri
    masked_url = target_url
    if "@" in masked_url:
        prefix, rest = masked_url.split("@", 1)
        if ":" in prefix:
            user_part = prefix.split("://")[0] + "://" + prefix.split("://")[1].split(":")[0]
            masked_url = f"{user_part}:****@{rest}"

    print(f"\n[1] Target URI: {masked_url}")

    # Check if target is postgres or sqlite
    is_postgres = "postgres" in target_url.lower()

    if is_postgres:
        print("[2] Attempting connection to PostgreSQL / Supabase...")
        try:
            # Normalize prefix if needed
            engine_url = target_url
            if engine_url.startswith("postgres://"):
                engine_url = engine_url.replace("postgres://", "postgresql+psycopg2://", 1)
            elif engine_url.startswith("postgresql://") and "+psycopg" not in engine_url:
                engine_url = engine_url.replace("postgresql://", "postgresql+psycopg2://", 1)

            engine = create_engine(
                engine_url,
                connect_args={"connect_timeout": 10},
                pool_pre_ping=True
            )

            with engine.connect() as conn:
                res = conn.execute(text("SELECT version();")).scalar()
                print(" -> SUCCESS: Connected successfully!")
                print(f" -> Database Version: {res[:70]}...")

            inspector = inspect(engine)
            tables = inspector.get_table_names()
            print(f" -> Existing Tables ({len(tables)}): {', '.join(tables) if tables else 'None yet (ready for migrations)'}")

            if len(tables) == 0:
                print("\n[NOTE] Tables have not been migrated to Supabase yet.")
                print("Run: alembic upgrade head (from backend/ directory)")
            else:
                print(f"\n[OK] Database is connected and populated with {len(tables)} tables.")

            return True

        except Exception as exc:
            print("\n[ERROR] Failed to connect to PostgreSQL / Supabase:")
            print(f"  {exc}")
            print("\nTroubleshooting tips for Supabase:")
            print("  1. Verify your password in DATABASE_URL (special characters must be URL-encoded).")
            print("  2. Ensure '?sslmode=require' is appended to the URI.")
            print("  3. Check if your project is active (not paused) in Supabase dashboard.")
            print("  4. If using Supabase Connection Pooler, make sure you use port 5432 (Session) or 6543 (Transaction).")
            return False
    else:
        print(f"[2] Using SQLite database: {settings.SQLITE_DEV_URL}")
        try:
            engine = create_engine(settings.SQLITE_DEV_URL)
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            print(" -> SUCCESS: SQLite database is accessible.")
            print(f" -> Existing Tables ({len(tables)}): {', '.join(tables)}")
            return True
        except Exception as exc:
            print(f"\n[ERROR] SQLite error: {exc}")
            return False


if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
