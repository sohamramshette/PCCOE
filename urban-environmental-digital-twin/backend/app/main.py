"""
Urban Environmental Digital Twin - FastAPI Serving Application
==============================================================
Production-ready FastAPI application layer providing:
  - Station metadata and spatial exposures
  - Historical environmental observations (NULL-preserved)
  - Atmospheric meteorological reanalysis (ECMWF ERA5-Land)
  - Historical model predictions and validation metrics
  - MLOps model registry governance
  - Next-hour PM2.5 real-time model inference
  - Live database health probes and OpenAPI documentation
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.app.config.settings import settings
from backend.app.services.model_serving import model_serving
from backend.app.api.router import api_router
from backend.app.api.routes.health import router as health_router
from backend.app.database.session import SessionLocal
from backend.app.services.openaq_service import OpenAQSyncService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("digital_twin_api")


async def scheduled_telemetry_sync():
    """Runs periodic telemetry sync in the background every 15 minutes."""
    await asyncio.sleep(25)
    while True:
        try:
            logger.info("Executing scheduled OpenAQ background telemetry sync...")
            with SessionLocal() as db:
                res = OpenAQSyncService.sync_all_stations(db=db)
                logger.info(
                    f"Scheduled OpenAQ sync completed: "
                    f"{res.get('stations_successful', 0)} stations checked, "
                    f"{res.get('records_ingested', 0)} ingested, "
                    f"{res.get('records_updated', 0)} updated."
                )
        except asyncio.CancelledError:
            logger.info("Scheduled OpenAQ sync task cancelled.")
            break
        except Exception as e:
            logger.error(f"Error during scheduled OpenAQ sync: {e}")

        try:
            await asyncio.sleep(900)
        except asyncio.CancelledError:
            break


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Loads trained ML model artifacts and preprocessors once during startup into memory,
    and runs background telemetry ingestion scheduler.
    """
    logger.info("Initializing Urban Environmental Digital Twin Application...")
    try:
        model_serving.initialize()
        logger.info(
            f"Successfully initialized ModelServingManager with models: "
            f"{list(model_serving.loaded_models.keys())}"
        )
    except Exception as e:
        logger.error(f"Failed to initialize model serving artifacts during startup: {e}")

    # Ensure canonical environmental alerts are populated if table is empty
    try:
        from backend.app.models.alert import Alert
        with SessionLocal() as db:
            if db.query(Alert).count() == 0:
                from backend.scripts.seed_alerts import seed_alerts
                logger.info("Alerts table empty. Seeding canonical environmental alerts...")
                seed_alerts(db)
    except Exception as e:
        logger.warning(f"Non-fatal alert auto-seed check skipped: {e}")

    sync_task = None
    if settings.APP_ENV != "testing":
        sync_task = asyncio.create_task(scheduled_telemetry_sync())

    yield

    if sync_task:
        sync_task.cancel()
        try:
            await sync_task
        except asyncio.CancelledError:
            pass

    logger.info("Shutting down Urban Environmental Digital Twin Application.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description=(
        "Urban Environmental Digital Twin Serving API for Pune & PCMC, Maharashtra, India. "
        "Provides air quality observations, atmospheric reanalysis, ML predictions, "
        "model governance registry, and next-hour ambient PM2.5 forecasting."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# ---------------------------------------------------------------------------
# CORS Middleware Configuration
# ---------------------------------------------------------------------------
logger.info(f"Configuring CORS with allowed origins: {settings.cors_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_cors_headers(request: Request) -> dict:
    origin = request.headers.get("origin")
    if origin and (
        origin in settings.cors_origins
        or "*" in settings.cors_origins
        or origin.endswith(".vercel.app")
    ):
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    return {}


# ---------------------------------------------------------------------------
# Standardized Error Handling
# ---------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Formats 422 validation errors without exposing internal data structures."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "code": "VALIDATION_ERROR",
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        headers=_get_cors_headers(request),
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Formats standard HTTP errors cleanly."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "code": f"HTTP_{exc.status_code}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        headers=_get_cors_headers(request),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catches unhandled server errors and logs internally without leaking stack traces or secrets."""
    logger.exception(f"Unhandled server error processing {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected internal server error occurred. Please consult system logs.",
            "code": "INTERNAL_SERVER_ERROR",
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        headers=_get_cors_headers(request),
    )


# ---------------------------------------------------------------------------
# Route Mounting
# ---------------------------------------------------------------------------
# Root health endpoint (GET /health)
app.include_router(health_router)

# Versioned API routes (GET /api/v1/...)
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def root_info():
    """Service metadata and interactive documentation entrypoint."""
    return {
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "status": "operational",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "api_v1_prefix": settings.API_V1_STR,
        "active_stations_count": 6,
        "default_model": settings.DEFAULT_FORECAST_MODEL_ID
    }
