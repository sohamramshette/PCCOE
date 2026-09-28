"""Fetch and persist hourly Pune weather from the Open-Meteo Historical Forecast API."""

import argparse
from datetime import date, datetime, time, timedelta, timezone
from email.utils import parsedate_to_datetime
import hashlib
import json
import logging
import math
from pathlib import Path
import sys
import time as time_module
from typing import Any

import httpx
import pandas as pd
from sqlalchemy import inspect, select


PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.config.settings import settings


LOGGER = logging.getLogger("ingest_open_meteo_historical_forecast")
SOURCE = "Open-Meteo Historical Forecast API"
WEATHER_VARIABLES = [
    "temperature_2m",
    "dew_point_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "surface_pressure",
    "cloud_cover",
    "precipitation",
    "wind_speed_10m",
    "evapotranspiration",
    "wind_gusts_10m",
    "wind_direction_10m",
]
UPDATE_COLUMNS = [
    "date_utc",
    "latitude",
    "longitude",
    "grid_latitude",
    "grid_longitude",
    *WEATHER_VARIABLES,
    "source_response_sha256",
]
MAX_RETRIES = 5
MAX_RETRY_DELAY_SECONDS = 60


class WeatherIngestionError(RuntimeError):
    """Raised when the provider response cannot be safely ingested."""


def request_parameters(
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict[str, str]:
    start = start_date or settings.WEATHER_START_DATE
    end = end_date or settings.WEATHER_END_DATE
    if start > end:
        raise ValueError("WEATHER_START_DATE must be on or before WEATHER_END_DATE")
    return {
        "latitude": str(settings.WEATHER_LATITUDE),
        "longitude": str(settings.WEATHER_LONGITUDE),
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "hourly": ",".join(WEATHER_VARIABLES),
        "timezone": "UTC",
    }


def _retry_delay(response: httpx.Response | None, attempt: int) -> float:
    retry_after = response.headers.get("Retry-After") if response is not None else None
    if retry_after:
        try:
            delay = float(retry_after)
        except ValueError:
            try:
                retry_at = parsedate_to_datetime(retry_after)
                delay = (retry_at - datetime.now(timezone.utc)).total_seconds()
            except (TypeError, ValueError, OverflowError):
                delay = -1.0
        if delay >= 0:
            return min(delay, MAX_RETRY_DELAY_SECONDS)
    return min(2**attempt, MAX_RETRY_DELAY_SECONDS)


def fetch_response(
    client: httpx.Client,
    endpoint: str,
    params: dict[str, str],
    *,
    sleep=time_module.sleep,
    max_retries: int = MAX_RETRIES,
) -> tuple[dict[str, Any], bytes]:
    """Fetch one complete API response, retrying transient network/rate-limit errors."""
    for attempt in range(1, max_retries + 1):
        response: httpx.Response | None = None
        try:
            response = client.get(endpoint, params=params)
            if response.status_code == 429 or response.status_code >= 500:
                if attempt == max_retries:
                    response.raise_for_status()
                    raise WeatherIngestionError(
                        f"Open-Meteo returned retryable HTTP status {response.status_code}"
                    )
                delay = _retry_delay(response, attempt)
                LOGGER.warning(
                    "Open-Meteo returned HTTP %s; retrying in %.1f seconds (%s/%s)",
                    response.status_code,
                    delay,
                    attempt,
                    max_retries,
                )
                sleep(delay)
                continue

            response.raise_for_status()
            try:
                payload = response.json()
            except (ValueError, json.JSONDecodeError) as exc:
                raise WeatherIngestionError("Open-Meteo returned invalid JSON") from exc
            if not isinstance(payload, dict):
                raise WeatherIngestionError("Open-Meteo response must be a JSON object")
            if payload.get("error"):
                raise WeatherIngestionError(
                    f"Open-Meteo API error: {payload.get('reason', 'unspecified error')}"
                )
            return payload, response.content
        except httpx.RequestError as exc:
            if attempt == max_retries:
                raise WeatherIngestionError(
                    f"Open-Meteo request failed after {max_retries} attempts "
                    f"({type(exc).__name__})"
                ) from exc
            delay = _retry_delay(response, attempt)
            LOGGER.warning(
                "Open-Meteo request failed (%s); retrying in %.1f seconds (%s/%s)",
                type(exc).__name__,
                delay,
                attempt,
                max_retries,
            )
            sleep(delay)
    raise WeatherIngestionError("Open-Meteo request exhausted its retry limit")


def normalize_response(
    payload: dict[str, Any],
    *,
    start_date: date,
    end_date: date,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Validate the provider payload and normalize it without imputing missing data."""
    hourly = payload.get("hourly")
    if not isinstance(hourly, dict) or not isinstance(hourly.get("time"), list):
        raise WeatherIngestionError("Open-Meteo response is missing hourly.time")

    times = hourly["time"]
    if not times:
        raise WeatherIngestionError("Open-Meteo returned no hourly timestamps")
    missing_variables = [name for name in WEATHER_VARIABLES if name not in hourly]
    if missing_variables:
        raise WeatherIngestionError(
            "Open-Meteo response is missing required variables: "
            + ", ".join(missing_variables)
        )
    mismatched = {
        name: len(hourly[name])
        for name in WEATHER_VARIABLES
        if not isinstance(hourly[name], list) or len(hourly[name]) != len(times)
    }
    if mismatched:
        raise WeatherIngestionError(
            f"Open-Meteo hourly arrays have inconsistent lengths: {mismatched}"
        )

    try:
        grid_latitude = float(payload["latitude"])
        grid_longitude = float(payload["longitude"])
    except (KeyError, TypeError, ValueError) as exc:
        raise WeatherIngestionError(
            "Open-Meteo response is missing valid resolved grid coordinates"
        ) from exc
    if (
        not math.isfinite(grid_latitude)
        or not math.isfinite(grid_longitude)
        or not -90 <= grid_latitude <= 90
        or not -180 <= grid_longitude <= 180
    ):
        raise WeatherIngestionError("Open-Meteo returned invalid resolved grid coordinates")

    timestamps = pd.to_datetime(pd.Series(times), utc=True, errors="coerce")
    if timestamps.isna().any():
        raise WeatherIngestionError("Open-Meteo returned invalid hourly timestamps")

    frame = pd.DataFrame({"datetime_utc": timestamps})
    for name in WEATHER_VARIABLES:
        original = pd.Series(hourly[name])
        numeric = pd.to_numeric(original, errors="coerce")
        invalid = original.notna() & numeric.isna()
        if invalid.any():
            raise WeatherIngestionError(
                f"Open-Meteo returned non-numeric values for {name}"
            )
        if not numeric.dropna().map(math.isfinite).all():
            raise WeatherIngestionError(f"Open-Meteo returned non-finite values for {name}")
        frame[name] = numeric

    duplicate_mask = frame.duplicated("datetime_utc", keep=False)
    duplicate_count = int(frame.duplicated("datetime_utc", keep="last").sum())
    if duplicate_mask.any():
        duplicate_rows = frame.loc[duplicate_mask]
        conflicting = duplicate_rows.groupby("datetime_utc", dropna=False)[
            WEATHER_VARIABLES
        ].nunique(dropna=False).gt(1).any(axis=1)
        if conflicting.any():
            timestamps_text = ", ".join(
                duplicate_rows.loc[
                    duplicate_rows["datetime_utc"].isin(conflicting[conflicting].index),
                    "datetime_utc",
                ]
                .astype(str)
                .drop_duplicates()
                .tolist()
            )
            raise WeatherIngestionError(
                f"Open-Meteo returned conflicting duplicate timestamps: {timestamps_text}"
            )
        LOGGER.warning(
            "Dropping %d identical duplicate weather timestamps",
            duplicate_count,
        )
        frame = frame.drop_duplicates("datetime_utc", keep="last")

    frame = frame.sort_values("datetime_utc").reset_index(drop=True)
    requested_start = pd.Timestamp(datetime.combine(start_date, time.min), tz="UTC")
    requested_end = pd.Timestamp(
        datetime.combine(end_date + timedelta(days=1), time.min), tz="UTC"
    )
    outside_range = (frame["datetime_utc"] < requested_start) | (
        frame["datetime_utc"] >= requested_end
    )
    if outside_range.any():
        raise WeatherIngestionError(
            "Open-Meteo returned timestamps outside the requested date range"
        )

    expected_hours = pd.date_range(
        requested_start,
        requested_end - pd.Timedelta(hours=1),
        freq="h",
    )
    present_hours = pd.DatetimeIndex(frame["datetime_utc"])
    missing_timestamps = expected_hours.difference(present_hours)
    frame["date_utc"] = frame["datetime_utc"].dt.date
    frame["latitude"] = float(settings.WEATHER_LATITUDE)
    frame["longitude"] = float(settings.WEATHER_LONGITUDE)
    frame["grid_latitude"] = grid_latitude
    frame["grid_longitude"] = grid_longitude
    frame["source"] = SOURCE
    frame["location_name"] = settings.WEATHER_LOCATION_NAME

    columns = [
        "datetime_utc",
        "date_utc",
        "latitude",
        "longitude",
        "grid_latitude",
        "grid_longitude",
        "source",
        "location_name",
        *WEATHER_VARIABLES,
    ]
    frame = frame[columns]
    report = {
        "duplicate_timestamps_removed": duplicate_count,
        "missing_timestamps": len(missing_timestamps),
        "missing_values_by_variable": {
            name: int(frame[name].isna().sum()) for name in WEATHER_VARIABLES
        },
        "grid_latitude": grid_latitude,
        "grid_longitude": grid_longitude,
    }
    return frame, report


def _record_value(value: Any) -> Any:
    if pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime()
    return value


def persist_records(
    frame: pd.DataFrame,
    *,
    response_sha256: str,
    engine=None,
    batch_size: int = 500,
) -> dict[str, int]:
    """Upsert normalized records while reporting inserts separately from updates."""
    from backend.app.models.weather_hourly_observation import WeatherHourlyObservation
    from backend.app.database.session import engine as configured_engine

    if frame.empty:
        raise WeatherIngestionError("No weather records are available to persist")

    target_engine = engine or configured_engine
    if target_engine.dialect.name not in {"postgresql", "sqlite"}:
        raise WeatherIngestionError(
            f"Unsupported database dialect for weather upsert: {target_engine.dialect.name}"
        )
    if not inspect(target_engine).has_table(WeatherHourlyObservation.__tablename__):
        raise WeatherIngestionError(
            "weather_hourly_observations does not exist; apply backend Alembic migrations first"
        )

    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from sqlalchemy.dialects.sqlite import insert as sqlite_insert

    rows = []
    for record in frame.to_dict(orient="records"):
        row = {key: _record_value(value) for key, value in record.items()}
        row["source_response_sha256"] = response_sha256
        rows.append(row)

    timestamp_column = WeatherHourlyObservation.datetime_utc
    source_column = WeatherHourlyObservation.source
    location_column = WeatherHourlyObservation.location_name
    first_timestamp = rows[0]["datetime_utc"]
    last_timestamp = rows[-1]["datetime_utc"]
    with target_engine.begin() as connection:
        existing_values = connection.execute(
            select(timestamp_column).where(
                source_column == SOURCE,
                location_column == settings.WEATHER_LOCATION_NAME,
                timestamp_column >= first_timestamp,
                timestamp_column <= last_timestamp,
            )
        ).scalars()
        existing_timestamps = {
            pd.Timestamp(value).tz_localize("UTC")
            if pd.Timestamp(value).tzinfo is None
            else pd.Timestamp(value).tz_convert("UTC")
            for value in existing_values
        }

        inserted = sum(
            pd.Timestamp(row["datetime_utc"]).tz_convert("UTC") not in existing_timestamps
            for row in rows
        )
        updated = len(rows) - inserted
        insert_function = (
            pg_insert
            if target_engine.dialect.name == "postgresql"
            else sqlite_insert
        )
        for offset in range(0, len(rows), batch_size):
            batch = rows[offset : offset + batch_size]
            statement = insert_function(WeatherHourlyObservation).values(batch)
            statement = statement.on_conflict_do_update(
                index_elements=[
                    WeatherHourlyObservation.source,
                    WeatherHourlyObservation.location_name,
                    WeatherHourlyObservation.datetime_utc,
                ],
                set_={column: getattr(statement.excluded, column) for column in UPDATE_COLUMNS},
            )
            connection.execute(statement)

    return {"inserted": inserted, "updated": updated, "upserted": len(rows)}


def _write_new_file(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("xb") as output:
        output.write(content)


def ingest() -> dict[str, Any]:
    params = request_parameters()
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    raw_dir = PROJECT_ROOT / "ml" / "data" / "raw" / "weather" / "openmeteo" / "historical_forecast"
    processed_dir = (
        PROJECT_ROOT / "ml" / "data" / "processed" / "weather" / "historical_forecast"
    )
    raw_path = raw_dir / f"pune_hourly_{run_id}.json"
    processed_path = processed_dir / f"pune_hourly_{run_id}.csv"
    manifest_path = raw_dir / f"manifest_{run_id}.json"

    with httpx.Client(
        timeout=httpx.Timeout(60.0, connect=15.0),
        headers={"User-Agent": "PCCOE-UrbanDigitalTwin-WeatherIngestion/1.0"},
    ) as client:
        payload, raw_response = fetch_response(
            client,
            settings.OPEN_METEO_HISTORICAL_FORECAST_API_URL,
            params,
        )

    response_sha256 = hashlib.sha256(raw_response).hexdigest()
    _write_new_file(raw_path, raw_response)
    frame, quality = normalize_response(
        payload,
        start_date=settings.WEATHER_START_DATE,
        end_date=settings.WEATHER_END_DATE,
    )

    processed_frame = frame.copy()
    processed_frame["datetime_utc"] = processed_frame["datetime_utc"].map(
        lambda timestamp: timestamp.isoformat().replace("+00:00", "Z")
    )
    processed_frame["date_utc"] = processed_frame["date_utc"].astype(str)
    _write_new_file(
        processed_path,
        processed_frame.to_csv(index=False, na_rep="").encode("utf-8"),
    )

    manifest: dict[str, Any] = {
        "run_id": run_id,
        "manifest_file": str(manifest_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "provider": SOURCE,
        "api_url": settings.OPEN_METEO_HISTORICAL_FORECAST_API_URL,
        "request_parameters": params,
        "location_name": settings.WEATHER_LOCATION_NAME,
        "requested_latitude": settings.WEATHER_LATITUDE,
        "requested_longitude": settings.WEATHER_LONGITUDE,
        "resolved_grid_latitude": quality["grid_latitude"],
        "resolved_grid_longitude": quality["grid_longitude"],
        "date_range": {
            "start": frame["datetime_utc"].min().isoformat().replace("+00:00", "Z"),
            "end": frame["datetime_utc"].max().isoformat().replace("+00:00", "Z"),
        },
        "record_count": len(frame),
        "columns": list(frame.columns),
        "duplicate_timestamps_removed": quality["duplicate_timestamps_removed"],
        "missing_timestamps": quality["missing_timestamps"],
        "missing_values_by_variable": quality["missing_values_by_variable"],
        "raw_response_sha256": response_sha256,
        "raw_response_file": str(raw_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "processed_csv_file": str(processed_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
    }

    try:
        manifest["database"] = persist_records(frame, response_sha256=response_sha256)
        manifest["database_status"] = "complete"
    except Exception as exc:
        manifest["database_status"] = "failed"
        manifest["database_error"] = type(exc).__name__
        _write_new_file(
            manifest_path,
            json.dumps(manifest, indent=2, allow_nan=False).encode("utf-8"),
        )
        raise

    _write_new_file(
        manifest_path,
        json.dumps(manifest, indent=2, allow_nan=False).encode("utf-8"),
    )
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest hourly Pune weather from Open-Meteo Historical Forecast API."
    )
    parser.parse_args()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    result = ingest()
    LOGGER.info(
        "Imported %(upserted)s hourly records (%(inserted)s inserted, %(updated)s updated)",
        result["database"],
    )
    LOGGER.info(
        "Date range: %s through %s",
        result["date_range"]["start"],
        result["date_range"]["end"],
    )
    LOGGER.info("Raw response: %s", result["raw_response_file"])
    LOGGER.info("Processed CSV: %s", result["processed_csv_file"])
    LOGGER.info("Manifest: %s", result["manifest_file"])
    total_missing = sum(result["missing_values_by_variable"].values())
    LOGGER.info(
        "Missing hourly timestamps: %s; missing variable values: %s",
        result["missing_timestamps"],
        total_missing,
    )


if __name__ == "__main__":
    main()
