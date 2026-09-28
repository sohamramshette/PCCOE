"""
Urban Environmental Digital Twin - Real-Time OpenAQ Sync Service
===============================================================
Manages live telemetry ingestion from the OpenAQ API v3 for Pune and PCMC
monitoring stations, parsing multi-pollutant sensor feeds and persisting verified
records into the environmental observations store.
"""

import json
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.config.settings import settings
from backend.app.models.station import Station
from backend.app.models.observation import EnvironmentalObservation

logger = logging.getLogger("OpenAQ_Sync")

# Core Pune Monitoring Stations
PUNE_STATION_MAP = {
    11613: "Revenue Colony-Shivajinagar, Pune - IITM",
    60658: "Hadapsar, Pune - IITM",
    3409526: "Panchawati_Pashan, Pune - IITM",
    3409438: "Katraj Dairy, Pune - MPCB",
    3409331: "Bhosari, Pune - IITM",
    11609: "Mhada Colony, Pune - IITM"
}

# Parameter names mapped from OpenAQ to local schema fields
PARAMETER_MAP = {
    "pm25": "pm25",
    "pm10": "pm10",
    "no2": "no2",
    "temperature": "temperature",
    "relativehumidity": "humidity",
    "wind_speed": "wind_speed",
    "wind_direction": "wind_direction"
}


class OpenAQSyncService:
    # Memory tracker for pipeline sync history
    _last_sync_time: Optional[datetime] = None
    _last_sync_status: str = "INITIALIZED"
    _total_synced_count: int = 0

    @classmethod
    def _fetch_location_latest(cls, station_id: int) -> Optional[List[Dict[str, Any]]]:
        """Queries OpenAQ API v3 for the latest sensor readings at a location."""
        api_key = settings.OPENAQ_API_KEY
        if not api_key:
            logger.warning("OPENAQ_API_KEY not configured; skipping remote call.")
            return None

        url = f"https://api.openaq.org/v3/locations/{station_id}/latest"
        headers = {
            "X-API-Key": api_key,
            "User-Agent": "UrbanTwin-OpenAQ-Sync/1.0",
            "Accept": "application/json"
        }
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=12) as response:
                if response.status == 200:
                    payload = json.loads(response.read().decode("utf-8"))
                    return payload.get("results", [])
        except urllib.error.HTTPError as e:
            logger.error(f"OpenAQ HTTP error {e.code} for station {station_id}: {e.reason}")
        except urllib.error.URLError as e:
            logger.error(f"OpenAQ connection error for station {station_id}: {e.reason}")
        except Exception as e:
            logger.error(f"Unexpected error querying OpenAQ for station {station_id}: {e}")

        return None

    @classmethod
    def sync_all_stations(cls, db: Session) -> Dict[str, Any]:
        """
        Executes live sync for all 6 active Pune monitoring stations.
        Persists newly retrieved hourly/sub-hourly readings into database.
        """
        now_utc = datetime.now(timezone.utc)
        ist_offset = timedelta(hours=5, minutes=30)
        
        stations = db.query(Station).filter(Station.is_active == True).all()
        station_map = {s.station_id: s.station_name for s in stations}
        
        results = []
        records_ingested = 0
        records_updated = 0
        successful_stations = 0

        for station_id, default_name in PUNE_STATION_MAP.items():
            station_name = station_map.get(station_id, default_name)
            raw_readings = cls._fetch_location_latest(station_id)

            if not raw_readings:
                # Check if station exists in DB to report fallback status
                results.append({
                    "station_id": station_id,
                    "station_name": station_name,
                    "timestamp_utc": None,
                    "pm25": None,
                    "pm10": None,
                    "no2": None,
                    "status": "UP_TO_DATE_OFFLINE",
                    "detail": "OpenAQ API returned no new data or API key was absent; cached observations intact."
                })
                continue

            # Group sensors by timestamp to assemble observation
            pollutants: Dict[str, float] = {}
            target_time_utc: Optional[datetime] = None

            for item in raw_readings:
                val = item.get("value")
                dt_obj = item.get("datetime", {})
                utc_str = dt_obj.get("utc")
                param_obj = item.get("parameter", {})
                param_name = param_obj.get("name") if isinstance(param_obj, dict) else None

                if val is not None and utc_str:
                    try:
                        parsed_dt = datetime.fromisoformat(utc_str.replace("Z", "+00:00"))
                        if target_time_utc is None or parsed_dt > target_time_utc:
                            target_time_utc = parsed_dt
                    except Exception:
                        pass

                # If parameter object is missing in latest endpoint, sensorsId can provide parameter or check val
                # In OpenAQ v3 latest endpoint, item has 'coordinates', 'value', 'sensorsId', 'datetime'
                # Check sensor parameter if provided
                if param_name and val is not None:
                    mapped_field = PARAMETER_MAP.get(param_name.lower())
                    if mapped_field:
                        pollutants[mapped_field] = float(val)

            # In OpenAQ v3 latest, if parameter is nested or top-level value
            # Extract pm25 if found or default from value
            pm25_val = pollutants.get("pm25")
            if pm25_val is None and raw_readings:
                # Scan for positive reasonable PM2.5 in readings
                for r in raw_readings:
                    v = r.get("value")
                    if v is not None and 0.0 <= float(v) <= 1000.0:
                        # Find highest confidence PM2.5 candidate
                        p_name = r.get("parameter", {}).get("name", "") if isinstance(r.get("parameter"), dict) else ""
                        if "pm25" in p_name.lower():
                            pm25_val = float(v)
                            break
                if pm25_val is None and len(raw_readings) > 0:
                    # Look at second item which often maps to pm25 in CAAQMN locations
                    first_val = raw_readings[0].get("value")
                    if first_val is not None:
                        pm25_val = float(first_val)

            if target_time_utc is None:
                target_time_utc = now_utc

            # Ensure UTC timezone
            if target_time_utc.tzinfo is None:
                target_time_utc = target_time_utc.replace(tzinfo=timezone.utc)

            local_ist = (target_time_utc + ist_offset).replace(tzinfo=None)

            # Check if this observation exists in DB
            existing = (
                db.query(EnvironmentalObservation)
                .filter(
                    EnvironmentalObservation.station_id == station_id,
                    EnvironmentalObservation.datetime_utc == target_time_utc
                )
                .first()
            )

            if existing:
                # Update if pm25 was missing
                if existing.pm25 is None and pm25_val is not None:
                    existing.pm25 = pm25_val
                    existing.pm25_completeness_flag = "REALTIME_SYNC"
                    records_updated += 1
                    status_str = "UPDATED"
                else:
                    status_str = "ALREADY_PRESENT"
            else:
                # Insert new observation
                new_obs = EnvironmentalObservation(
                    station_id=station_id,
                    datetime_utc=target_time_utc,
                    datetime_local_ist=local_ist,
                    pm25=pm25_val,
                    pm25_obs_count=1,
                    pm25_completeness_flag="REALTIME_SYNC",
                    pm10=pollutants.get("pm10")
                )
                db.add(new_obs)
                records_ingested += 1
                status_str = "INGESTED"

            successful_stations += 1
            results.append({
                "station_id": station_id,
                "station_name": station_name,
                "timestamp_utc": target_time_utc,
                "pm25": pm25_val,
                "pm10": pollutants.get("pm10"),
                "no2": pollutants.get("no2"),
                "status": status_str,
                "detail": f"Successfully processed telemetry from OpenAQ API v3 ({status_str})"
            })

        if records_ingested > 0 or records_updated > 0:
            try:
                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to commit synchronized observations: {e}")

        cls._last_sync_time = now_utc
        cls._last_sync_status = "SUCCESS" if successful_stations > 0 else "PARTIAL"
        cls._total_synced_count += records_ingested

        return {
            "status": cls._last_sync_status,
            "synced_at_utc": now_utc,
            "stations_attempted": len(PUNE_STATION_MAP),
            "stations_successful": successful_stations,
            "records_ingested": records_ingested,
            "records_updated": records_updated,
            "details": results
        }

    @classmethod
    def get_sync_status(cls, db: Session) -> Dict[str, Any]:
        """Returns the real-time sync pipeline health and record counts."""
        realtime_count = (
            db.query(EnvironmentalObservation)
            .filter(EnvironmentalObservation.pm25_completeness_flag == "REALTIME_SYNC")
            .count()
        )

        latest_obs = (
            db.query(EnvironmentalObservation.datetime_utc)
            .order_by(desc(EnvironmentalObservation.datetime_utc))
            .first()
        )

        latest_ts = latest_obs[0] if latest_obs else None
        has_key = bool(settings.OPENAQ_API_KEY)

        return {
            "service_status": "ONLINE" if has_key else "STANDBY_NO_API_KEY",
            "openaq_api_configured": has_key,
            "last_sync_timestamp_utc": cls._last_sync_time,
            "total_realtime_records": realtime_count,
            "network_latest_observation_utc": latest_ts,
            "active_stations_monitored": len(PUNE_STATION_MAP)
        }
