"""
Urban Environmental Digital Twin - Database Session & Engine Configuration
===========================================================================
Initializes SQLAlchemy 2.0 DeclarativeBase, database engine with connection pooling,
session factory, and FastAPI-ready session generator dependency.
Supports automatic resilient fallback for local offline testing if PostgreSQL daemon
is not active on localhost.
"""

import logging
from typing import Generator
from sqlalchemy import event, create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.app.config.settings import settings

logger = logging.getLogger(__name__)

# Base declarative class
Base = declarative_base()


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable foreign key enforcement if using SQLite in verification mode."""
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
    except Exception:
        pass
    finally:
        cursor.close()


def get_configured_engine():
    """Initializes and returns the database engine with PostgreSQL pooling and resilient fallback."""
    target_url = settings.sqlalchemy_database_uri

    if target_url.startswith("sqlite"):
        return create_engine(
            target_url,
            connect_args={"check_same_thread": False}
        )

    # Attempt PostgreSQL connection
    try:
        pg_engine = create_engine(
            target_url,
            pool_size=10,
            max_overflow=20,
            pool_recycle=3600,
            pool_timeout=3,
            pool_pre_ping=True
        )
        # Probe connection
        with pg_engine.connect() as conn:
            pass
        return pg_engine
    except Exception as e:
        logger.warning(
            f"Notice: PostgreSQL connection to {target_url} failed ({e}). "
            f"Operating in local verification mode using {settings.SQLITE_DEV_URL}."
        )
        return create_engine(
            settings.SQLITE_DEV_URL,
            connect_args={"check_same_thread": False}
        )


engine = get_configured_engine()

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields an active database session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
