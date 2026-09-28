"""
Urban Environmental Digital Twin - Database Session & Engine Configuration
===========================================================================
Initializes SQLAlchemy DeclarativeBase, engine with connection pooling,
session factory, and FastAPI-ready session generator dependency.
Supports both direct DATABASE_URL environment variables and resilient local verification mode.
"""

import os
import logging
from typing import Generator
from sqlalchemy import event, create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session
from backend.app.database.base import Base
from backend.app.config.settings import settings

logger = logging.getLogger(__name__)

# Re-export Base for compatibility
__all__ = ["Base", "engine", "SessionLocal", "get_db", "DATABASE_URL"]


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable foreign key enforcement if using SQLite in verification mode."""
    if type(dbapi_connection).__module__.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys=ON")
        except Exception:
            pass
        finally:
            cursor.close()


def get_configured_engine():
    """Initializes and returns the database engine with PostgreSQL pooling and resilient fallback."""
    # Priority: explicit DATABASE_URL env var, then settings URI
    target_url = os.environ.get("DATABASE_URL") or settings.sqlalchemy_database_uri

    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif target_url.startswith("postgresql://") and "+psycopg2" not in target_url and "+psycopg" not in target_url:
        target_url = target_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    if target_url.startswith("sqlite"):
        return create_engine(
            target_url,
            connect_args={"check_same_thread": False}
        )

    # Attempt PostgreSQL connection
    try:
        pg_engine = create_engine(
            target_url,
            pool_size=5,
            max_overflow=5,
            pool_recycle=300,
            pool_timeout=15,
            pool_pre_ping=True
        )
        # Probe connection
        with pg_engine.connect() as conn:
            pass
        return pg_engine
    except Exception as e:
        logger.warning(
            "PostgreSQL connection failed (%s). Operating in local verification mode using %s.",
            type(e).__name__,
            settings.SQLITE_DEV_URL,
        )
        return create_engine(
            settings.SQLITE_DEV_URL,
            connect_args={"check_same_thread": False}
        )


engine = get_configured_engine()
DATABASE_URL = str(engine.url)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields an active database session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
