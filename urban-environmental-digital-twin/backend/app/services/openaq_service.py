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
from backend.app.models.weather import WeatherReanalysis

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

    @classmethod
    def _fetch_openmeteo_live(cls, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """
        Fetches real-time atmospheric and air quality parameters from Open-Meteo Air Quality
        when official hardware feeds experience upstream network ingestion delay.
        """
        url = (
            f"https://air-quality-api.open-meteo.com/v1/air-quality?"
            f"latitude={lat}&longitude={lon}&current=pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone"
        )
        headers = {"User-Agent": "UrbanTwin-LiveTelemetry/1.0", "Accept": "application/json"}
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    payload = json.loads(response.read().decode("utf-8"))
                    return payload.get("current", {})
        except Exception as e:
            logger.warning(f"Failed to query Open-Meteo live fallback for ({lat}, {lon}): {e}")
        return None

    @classmethod
    def _fetch_openmeteo_weather(cls, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """
        Fetches real-time surface meteorology from Open-Meteo Weather API.
        """
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,rain,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover"
        )
        headers = {"User-Agent": "UrbanTwin-LiveTelemetry/1.0", "Accept": "application/json"}
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    payload = json.loads(response.read().decode("utf-8"))
                    return payload.get("current", {})
        except Exception as e:
            logger.warning(f"Failed to query Open-Meteo weather fallback for ({lat}, {lon}): {e}")
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
        station_coords = {s.station_id: (float(s.latitude), float(s.longitude)) for s in stations}
        
        results = []
        records_ingested = 0
        records_updated = 0
        successful_stations = 0

        for station_id, default_name in PUNE_STATION_MAP.items():
            station_name = station_map.get(station_id, default_name)
            lat, lon = station_coords.get(station_id, (18.5204, 73.8567))
            raw_readings = cls._fetch_location_latest(station_id)

            pollutants: Dict[str, float] = {}
            target_time_utc: Optional[datetime] = None
            pm25_val: Optional[float] = None

            if raw_readings:
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

                    if param_name and val is not None:
                        mapped_field = PARAMETER_MAP.get(param_name.lower())
                        if mapped_field:
                            pollutants[mapped_field] = float(val)

                pm25_val = pollutants.get("pm25")
                if pm25_val is None:
                    for r in raw_readings:
                        v = r.get("value")
                        if v is not None and 0.0 <= float(v) <= 1000.0:
                            p_name = r.get("parameter", {}).get("name", "") if isinstance(r.get("parameter"), dict) else ""
                            if "pm25" in p_name.lower():
                                pm25_val = float(v)
                                break
                    if pm25_val is None and len(raw_readings) > 0:
                        first_val = raw_readings[0].get("value")
                        if first_val is not None:
                            pm25_val = float(first_val)

            # Detect if OpenAQ upstream hardware readings are absent or lagged (> 6 hours old)
            is_stale = False
            if target_time_utc is None or (now_utc - target_time_utc) > timedelta(hours=6):
                is_stale = True

            completeness_flag = "REALTIME_SYNC"
            provenance_status = "INGESTED"

            # Hybrid Live Bridge: Use real-time Open-Meteo Air Quality & CAMS when upstream CPCB feed has lag
            if is_stale:
                live_aq = cls._fetch_openmeteo_live(lat, lon)
                if live_aq and live_aq.get("pm2_5") is not None:
                    time_str = live_aq.get("time")
                    if time_str:
                        try:
                            parsed_live_dt = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
                            if parsed_live_dt.tzinfo is None:
                                parsed_live_dt = parsed_live_dt.replace(tzinfo=timezone.utc)
                            target_time_utc = parsed_live_dt
                        except Exception:
                            target_time_utc = now_utc
                    else:
                        target_time_utc = now_utc
                    pm25_val = float(live_aq.get("pm2_5"))
                    if live_aq.get("pm10") is not None:
                        pollutants["pm10"] = float(live_aq.get("pm10"))
                    if live_aq.get("nitrogen_dioxide") is not None:
                        pollutants["no2"] = float(live_aq.get("nitrogen_dioxide"))
                    completeness_flag = "REALTIME_LIVE"
                    provenance_status = "HYBRID_LIVE_INGESTED"

            if target_time_utc is None:
                target_time_utc = now_utc

            if target_time_utc.tzinfo is None:
                target_time_utc = target_time_utc.replace(tzinfo=timezone.utc)

            local_ist = (target_time_utc + ist_offset).replace(tzinfo=None)

            # Sync real-time weather alongside pollution
            existing_wx = (
                db.query(WeatherReanalysis)
                .filter(
                    WeatherReanalysis.station_id == station_id,
                    WeatherReanalysis.datetime_utc == target_time_utc
                )
                .first()
            )
            if not existing_wx:
                live_wx = cls._fetch_openmeteo_weather(lat, lon)
                if live_wx and live_wx.get("temperature_2m") is not None:
                    new_wx = WeatherReanalysis(
                        station_id=station_id,
                        datetime_utc=target_time_utc,
                        temp_c=float(live_wx.get("temperature_2m", 25.0)),
                        humidity_pct=float(live_wx.get("relative_humidity_2m", 60.0)),
                        dew_point_c=float(live_wx.get("dew_point_2m", 18.0)),
                        precip_mm=float(live_wx.get("precipitation", 0.0)),
                        rain_mm=float(live_wx.get("rain", 0.0)),
                        pressure_hpa=float(live_wx.get("surface_pressure", 950.0)),
                        wind_speed_ms=float(live_wx.get("wind_speed_10m", 2.0)),
                        wind_dir_deg=float(live_wx.get("wind_direction_10m", 180.0)),
                        solar_rad_wm2=0.0,
                        cloud_cover_pct=float(live_wx.get("cloud_cover", 0.0)),
                        pbl_height_m=350.0,
                        grid_latitude=lat,
                        grid_longitude=lon,
                        elevation_m=560.0,
                        data_provenance="REALTIME (Open-Meteo Atmospheric Telemetry)"
                    )
                    db.add(new_wx)

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
                if existing.pm25 is None and pm25_val is not None:
                    existing.pm25 = pm25_val
                    existing.pm25_completeness_flag = completeness_flag
                    records_updated += 1
                    status_str = "UPDATED"
                else:
                    status_str = "ALREADY_PRESENT"
            else:
                new_obs = EnvironmentalObservation(
                    station_id=station_id,
                    datetime_utc=target_time_utc,
                    datetime_local_ist=local_ist,
                    pm25=pm25_val,
                    pm25_obs_count=1,
                    pm25_completeness_flag=completeness_flag,
                    pm10=pollutants.get("pm10")
                )
                db.add(new_obs)
                records_ingested += 1
                status_str = provenance_status

            successful_stations += 1
            results.append({
                "station_id": station_id,
                "station_name": station_name,
                "timestamp_utc": target_time_utc,
                "pm25": pm25_val,
                "pm10": pollutants.get("pm10"),
                "no2": pollutants.get("no2"),
                "status": status_str,
                "detail": f"Processed telemetry via {completeness_flag} ({status_str})"
            })

        if records_ingested > 0 or records_updated > 0:
            try:
                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to commit synchronized observations: {e}")

        # Trigger Environmental Alert & Anomaly Engine evaluation
        alert_summary = None
        try:
            from backend.app.services.alert_service import AlertService
            alert_eval_res = AlertService.evaluate_all_stations(db=db, evaluation_time=now_utc)
            alert_summary = {
                "alerts_created": alert_eval_res.alerts_created,
                "alerts_updated": alert_eval_res.alerts_updated,
                "alerts_resolved": alert_eval_res.alerts_resolved,
                "active_total": alert_eval_res.active_total
            }
            logger.info(
                f"Alert evaluation completed after sync: {alert_eval_res.alerts_created} created, "
                f"{alert_eval_res.alerts_updated} updated, {alert_eval_res.alerts_resolved} resolved. "
                f"Active alerts: {alert_eval_res.active_total}."
            )
        except Exception as alert_err:
            logger.warning(f"Non-fatal alert evaluation failure following sync: {alert_err}")

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
            "alerts": alert_summary,
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
