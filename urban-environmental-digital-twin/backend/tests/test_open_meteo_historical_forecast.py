from datetime import date

import httpx
import pandas as pd
import pytest
from sqlalchemy import create_engine, func, select

from ml.src.data.ingest_weather_historical_forecast import (
    SOURCE,
    WEATHER_VARIABLES,
    WeatherIngestionError,
    fetch_response,
    normalize_response,
    persist_records,
)


def make_payload(times=None):
    timestamps = times or ["2025-01-01T00:00", "2025-01-01T01:00"]
    hourly = {"time": timestamps}
    for variable in WEATHER_VARIABLES:
        hourly[variable] = [None, 2.0][: len(timestamps)]
    return {
        "latitude": 18.523726,
        "longitude": 73.86876,
        "hourly": hourly,
    }


def test_normalize_response_preserves_metadata_and_missing_values():
    frame, quality = normalize_response(
        make_payload(),
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 1),
    )

    assert len(frame) == 2
    assert frame.loc[0, "datetime_utc"].isoformat() == "2025-01-01T00:00:00+00:00"
    assert frame.loc[0, "date_utc"] == date(2025, 1, 1)
    assert frame.loc[0, "latitude"] == 18.5196
    assert frame.loc[0, "longitude"] == 73.8554
    assert frame.loc[0, "grid_latitude"] == 18.523726
    assert frame.loc[0, "source"] == SOURCE
    assert frame.loc[0, "location_name"] == "Pune, Maharashtra, India"
    assert pd.isna(frame.loc[0, "temperature_2m"])
    assert quality["missing_timestamps"] == 22
    assert quality["missing_values_by_variable"]["temperature_2m"] == 1


def test_normalize_response_removes_identical_duplicates():
    payload = make_payload(["2025-01-01T00:00", "2025-01-01T00:00"])
    for variable in WEATHER_VARIABLES:
        payload["hourly"][variable] = [2.0, 2.0]

    frame, quality = normalize_response(
        payload,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 1),
    )

    assert len(frame) == 1
    assert quality["duplicate_timestamps_removed"] == 1


def test_normalize_response_rejects_conflicting_duplicates():
    payload = make_payload(["2025-01-01T00:00", "2025-01-01T00:00"])
    payload["hourly"]["temperature_2m"] = [1.0, 2.0]

    with pytest.raises(WeatherIngestionError, match="conflicting duplicate timestamps"):
        normalize_response(
            payload,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 1),
        )


def test_normalize_response_rejects_inconsistent_arrays():
    payload = make_payload()
    payload["hourly"]["wind_speed_10m"] = [1.0]

    with pytest.raises(WeatherIngestionError, match="inconsistent lengths"):
        normalize_response(
            payload,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 1),
        )


def test_fetch_response_retries_rate_limit():
    request = httpx.Request("GET", "https://example.test/weather")
    client = type(
        "FakeClient",
        (),
        {
            "responses": iter(
                [
                    httpx.Response(
                        429,
                        headers={"Retry-After": "1"},
                        request=request,
                    ),
                    httpx.Response(
                        200,
                        json=make_payload(),
                        request=request,
                    ),
                ]
            ),
            "get": lambda self, *args, **kwargs: next(self.responses),
        },
    )()
    delays = []

    payload, raw = fetch_response(
        client,
        "https://example.test/weather",
        {},
        sleep=delays.append,
        max_retries=2,
    )

    assert payload["hourly"]["time"][0] == "2025-01-01T00:00"
    assert raw
    assert delays == [1.0]


def test_persist_records_upserts_without_duplicate_timestamps():
    from backend.app.models.weather_hourly_observation import WeatherHourlyObservation

    engine = create_engine("sqlite:///:memory:")
    WeatherHourlyObservation.__table__.create(engine)
    row = {
        "datetime_utc": pd.Timestamp("2025-01-01T00:00:00Z"),
        "date_utc": date(2025, 1, 1),
        "latitude": 18.5196,
        "longitude": 73.8554,
        "grid_latitude": 18.523726,
        "grid_longitude": 73.86876,
        "source": SOURCE,
        "location_name": "Pune, Maharashtra, India",
        **{variable: 1.0 for variable in WEATHER_VARIABLES},
    }
    frame = pd.DataFrame([row])

    first = persist_records(frame, response_sha256="a" * 64, engine=engine)
    second = persist_records(frame, response_sha256="b" * 64, engine=engine)

    with engine.connect() as connection:
        count = connection.execute(
            select(func.count()).select_from(WeatherHourlyObservation)
        ).scalar_one()
        digest = connection.execute(
            select(WeatherHourlyObservation.source_response_sha256)
        ).scalar_one()

    assert first == {"inserted": 1, "updated": 0, "upserted": 1}
    assert second == {"inserted": 0, "updated": 1, "upserted": 1}
    assert count == 1
    assert digest == "b" * 64
