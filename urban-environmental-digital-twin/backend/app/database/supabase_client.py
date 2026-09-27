"""
Urban Environmental Digital Twin - Supabase Client Factory
===========================================================
Initializes and provides an optional client for interacting with Supabase services
(Storage, Auth, Realtime, REST) when SUPABASE_URL and SUPABASE_ANON_KEY are defined.
"""

import logging
from typing import Optional
from supabase import create_client, Client
from backend.app.config.settings import settings

logger = logging.getLogger(__name__)

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """
    Returns an initialized Supabase Client if credentials are provided in settings.
    Returns None if Supabase credentials have not been configured.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        logger.debug("Supabase URL or Anon Key not configured. Supabase client unavailable.")
        return None

    try:
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        return _supabase_client
    except Exception as exc:
        logger.error(f"Failed to initialize Supabase client: {exc}")
        return None
