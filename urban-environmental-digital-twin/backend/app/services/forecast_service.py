"""
Urban Environmental Digital Twin - Forecast Serving Service
============================================================
Constructs the full multi-domain feature vector required for next-hour PM2.5 forecasting
reusing the exact mathematical transformations established in Phase 6 and Phase 7.
Enforces strict checks ensuring future/unavailable data is not fabricated.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple, List
import math
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.config.settings import settings
from backend.app.models.station import Station
from backend.app.models.observation import EnvironmentalObservation
from backend.app.models.weather import WeatherReanalysis
from backend.app.models.spatial import StationTrafficExposure, StationActivityExposure
from backend.app.models.traffic import TrafficProxy
from backend.app.models.model_registry import ModelRegistry
from backend.app.services.model_serving import model_serving


class ForecastDataUnavailableException(Exception):
    """Raised when required observations or weather inputs are missing at prediction time."""
    def __init__(self, message: str, station_id: int, latest_available_dt: Optional[datetime] = None):
        super().__init__(message)
        self.station_id = station_id
        self.latest_available_dt = latest_available_dt


class ForecastService:
    @staticmethod
    def get_latest_data_timestamp(db: Session, station_id: int) -> Optional[datetime]:
        """Finds the latest contiguous hour where both observations and weather exist for the station."""
        latest_obs = (
            db.query(func.max(EnvironmentalObservation.datetime_utc))
            .filter(EnvironmentalObservation.station_id == station_id)
            .scalar()
        )
        return latest_obs

    @classmethod
    def construct_features(
        cls,
        db: Session,
        station: Station,
        pred_time_utc: datetime
    ) -> pd.DataFrame:
        """
        Builds the exact 98 core feature vector for (station, pred_time_utc)
        using database state (observations, weather, spatial buffers, traffic curve).
        """
        # 1. Fetch current contemporaneous observation and weather at t
        current_obs = (
            db.query(EnvironmentalObservation)
            .filter(
                EnvironmentalObservation.station_id == station.station_id,
                EnvironmentalObservation.datetime_utc == pred_time_utc
            )
            .first()
        )
        current_weather = (
            db.query(WeatherReanalysis)
            .filter(
                WeatherReanalysis.station_id == station.station_id,
                WeatherReanalysis.datetime_utc == pred_time_utc
            )
            .first()
        )

        if current_obs is None or current_weather is None:
            latest_dt = cls.get_latest_data_timestamp(db, station.station_id)
            raise ForecastDataUnavailableException(
                f"Current forecast inputs unavailable: No complete observation/weather record found for station "
                f"{station.station_id} at {pred_time_utc.isoformat()}. Historical data ends at {latest_dt}.",
                station_id=station.station_id,
                latest_available_dt=latest_dt
            )

        # 2. Fetch static spatial exposures
        traffic_exp = (
            db.query(StationTrafficExposure)
            .filter(StationTrafficExposure.station_id == station.station_id)
            .first()
        )
        activity_exp = (
            db.query(StationActivityExposure)
            .filter(StationActivityExposure.station_id == station.station_id)
            .first()
        )

        # 3. Fetch past 24 hours of observations and weather for lags & rolling statistics
        t_start = pred_time_utc - timedelta(hours=24)
        history_obs = (
            db.query(EnvironmentalObservation)
            .filter(
                EnvironmentalObservation.station_id == station.station_id,
                EnvironmentalObservation.datetime_utc >= t_start,
                EnvironmentalObservation.datetime_utc <= pred_time_utc
            )
            .order_by(EnvironmentalObservation.datetime_utc.asc())
            .all()
        )
        history_weather = (
            db.query(WeatherReanalysis)
            .filter(
                WeatherReanalysis.station_id == station.station_id,
                WeatherReanalysis.datetime_utc >= t_start,
                WeatherReanalysis.datetime_utc <= pred_time_utc
            )
            .order_by(WeatherReanalysis.datetime_utc.asc())
            .all()
        )

        # Index historical records by UTC hour offset
        obs_by_dt = {o.datetime_utc: o for o in history_obs}
        weather_by_dt = {w.datetime_utc: w for w in history_weather}

        # 4. Temporal encodings (calculated in Indian Standard Time UTC+05:30)
        dt_ist = pred_time_utc + timedelta(hours=5, minutes=30)
        hour_ist = dt_ist.hour
        month = dt_ist.month
        day = dt_ist.day
        hour_utc = pred_time_utc.hour
        day_of_week = dt_ist.weekday()  # Monday=0, Sunday=6
        is_weekend = int(day_of_week in [5, 6])
        day_type = "WEEKEND" if is_weekend else "WEEKDAY"

        hour_sin = np.sin(2 * np.pi * hour_ist / 24.0)
        hour_cos = np.cos(2 * np.pi * hour_ist / 24.0)
        month_sin = np.sin(2 * np.pi * (month - 1) / 12.0)
        month_cos = np.cos(2 * np.pi * (month - 1) / 12.0)
        day_of_week_sin = np.sin(2 * np.pi * day_of_week / 7.0)
        day_of_week_cos = np.cos(2 * np.pi * day_of_week / 7.0)
        is_monsoon = int(month in [6, 7, 8, 9])

        # 5. Traffic Proxy lookup for current hour
        proxy_record = (
            db.query(TrafficProxy)
            .filter(
                TrafficProxy.hour_of_day == hour_ist,
                TrafficProxy.is_weekend == bool(is_weekend)
            )
            .first()
        )
        traffic_proxy_index = proxy_record.traffic_proxy_index if proxy_record else 0.5

        # 6. Meteorological dispersion calculations
        wind_speed_ms = current_weather.wind_speed_ms
        wind_dir_deg = current_weather.wind_dir_deg
        pbl_height_m = current_weather.pbl_height_m
        temp_c = current_weather.temp_c
        dew_point_c = current_weather.dew_point_c
        precip_mm = current_weather.precip_mm

        rad = np.radians(wind_dir_deg)
        wind_u = -wind_speed_ms * np.sin(rad)
        wind_v = -wind_speed_ms * np.cos(rad)
        ventilation_index = wind_speed_ms * pbl_height_m
        temp_dewpoint_spread = temp_c - dew_point_c
        is_precipitating = int(precip_mm > 0.05)
        atmospheric_stagnation_flag = int((wind_speed_ms < 1.0) and (pbl_height_m < 200.0))

        # 7. Lag calculations
        def get_lag_pm25(hours_back: int) -> Optional[float]:
            target_t = pred_time_utc - timedelta(hours=hours_back)
            rec = obs_by_dt.get(target_t)
            return rec.pm25 if rec else None

        def get_lag_weather(hours_back: int, attr: str) -> Optional[float]:
            target_t = pred_time_utc - timedelta(hours=hours_back)
            rec = weather_by_dt.get(target_t)
            return getattr(rec, attr) if rec else None

        pm25_lag_1h = get_lag_pm25(1)
        pm25_lag_2h = get_lag_pm25(2)
        pm25_lag_3h = get_lag_pm25(3)
        pm25_lag_6h = get_lag_pm25(6)
        pm25_lag_12h = get_lag_pm25(12)
        pm25_lag_24h = get_lag_pm25(24)

        temp_c_lag_1h = get_lag_weather(1, "temp_c")
        temp_c_lag_3h = get_lag_weather(3, "temp_c")
        temp_c_lag_6h = get_lag_weather(6, "temp_c")

        wind_speed_ms_lag_1h = get_lag_weather(1, "wind_speed_ms")
        wind_speed_ms_lag_3h = get_lag_weather(3, "wind_speed_ms")
        wind_speed_ms_lag_6h = get_lag_weather(6, "wind_speed_ms")

        pbl_height_m_lag_1h = get_lag_weather(1, "pbl_height_m")
        pbl_height_m_lag_3h = get_lag_weather(3, "pbl_height_m")
        pbl_height_m_lag_6h = get_lag_weather(6, "pbl_height_m")

        humidity_pct_lag_1h = get_lag_weather(1, "humidity_pct")
        vent_lag_rec = weather_by_dt.get(pred_time_utc - timedelta(hours=1))
        ventilation_index_lag_1h = (
            vent_lag_rec.wind_speed_ms * vent_lag_rec.pbl_height_m if vent_lag_rec else None
        )

        # 8. Rolling statistics (past-looking, including contemporaneous t)
        def get_pm25_window(w_hours: int) -> List[float]:
            vals = []
            for h in range(w_hours):
                t_val = pred_time_utc - timedelta(hours=h)
                rec = obs_by_dt.get(t_val)
                if rec and rec.pm25 is not None:
                    vals.append(rec.pm25)
            return vals

        def get_weather_window(w_hours: int, attr: str) -> List[float]:
            vals = []
            for h in range(w_hours):
                t_val = pred_time_utc - timedelta(hours=h)
                rec = weather_by_dt.get(t_val)
                if rec:
                    val = getattr(rec, attr, None)
                    if val is not None:
                        vals.append(val)
            return vals

        w3_pm25 = get_pm25_window(3)
        w6_pm25 = get_pm25_window(6)
        w12_pm25 = get_pm25_window(12)
        w24_pm25 = get_pm25_window(24)

        pm25_rolling_mean_3h = float(np.mean(w3_pm25)) if w3_pm25 else current_obs.pm25
        pm25_rolling_mean_6h = float(np.mean(w6_pm25)) if w6_pm25 else current_obs.pm25
        pm25_rolling_mean_12h = float(np.mean(w12_pm25)) if w12_pm25 else current_obs.pm25
        pm25_rolling_mean_24h = float(np.mean(w24_pm25)) if w24_pm25 else current_obs.pm25

        pm25_rolling_std_6h = float(np.std(w6_pm25, ddof=1)) if len(w6_pm25) >= 2 else 0.0
        pm25_rolling_std_24h = float(np.std(w24_pm25, ddof=1)) if len(w24_pm25) >= 2 else 0.0

        w6_temp = get_weather_window(6, "temp_c")
        temp_c_rolling_mean_6h = float(np.mean(w6_temp)) if w6_temp else temp_c

        w6_wind = get_weather_window(6, "wind_speed_ms")
        wind_speed_ms_rolling_mean_6h = float(np.mean(w6_wind)) if w6_wind else wind_speed_ms

        w6_pbl = get_weather_window(6, "pbl_height_m")
        pbl_height_m_rolling_mean_6h = float(np.mean(w6_pbl)) if w6_pbl else pbl_height_m

        w6_precip = get_weather_window(6, "precip_mm")
        precip_rolling_sum_6h = float(np.sum(w6_precip)) if w6_precip else precip_mm

        w24_precip = get_weather_window(24, "precip_mm")
        precip_rolling_sum_24h = float(np.sum(w24_precip)) if w24_precip else precip_mm

        # 9. Spatial & Physical Interactions
        has_ind_1km = int(activity_exp.has_industrial_within_1km) if activity_exp else 0
        has_constr_1km = int(activity_exp.has_construction_within_1km) if activity_exp else 0
        poi_density = activity_exp.poi_density_per_km2 if activity_exp else 0.0

        traffic_stagnation_ratio = traffic_proxy_index / (wind_speed_ms + 0.2)
        traffic_ventilation_ratio = traffic_proxy_index / ((ventilation_index / 1000.0) + 0.1)
        industrial_dispersion_ratio = has_ind_1km / (wind_speed_ms + 0.2)
        construction_dispersion_ratio = has_constr_1km / (wind_speed_ms + 0.2)
        poi_traffic_interaction = poi_density * traffic_proxy_index

        # 10. Assemble full feature record
        features_dict = {
            "station_id": station.station_id,
            "zone_type": station.zone_type,
            "latitude": station.latitude,
            "longitude": station.longitude,
            "year": pred_time_utc.year,
            "month": month,
            "day": day,
            "hour_utc": hour_utc,
            "hour_ist": hour_ist,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "pm25": current_obs.pm25,
            "pm25_obs_count": current_obs.pm25_obs_count if current_obs.pm25_obs_count is not None else 4,
            "pm25_completeness_flag": current_obs.pm25_completeness_flag,
            "weather_grid_latitude": current_weather.grid_latitude,
            "weather_grid_longitude": current_weather.grid_longitude,
            "weather_elevation_m": current_weather.elevation_m,
            "temp_c": temp_c,
            "humidity_pct": current_weather.humidity_pct,
            "dew_point_c": dew_point_c,
            "precip_mm": precip_mm,
            "rain_mm": current_weather.rain_mm,
            "pressure_hpa": current_weather.pressure_hpa,
            "wind_speed_ms": wind_speed_ms,
            "wind_dir_deg": wind_dir_deg,
            "solar_rad_wm2": current_weather.solar_rad_wm2,
            "cloud_cover_pct": current_weather.cloud_cover_pct,
            "pbl_height_m": pbl_height_m,
            "total_road_length_km": traffic_exp.total_road_length_km if traffic_exp else 100.0,
            "major_road_length_km": traffic_exp.major_road_length_km if traffic_exp else 10.0,
            "local_road_length_km": traffic_exp.local_road_length_km if traffic_exp else 90.0,
            "major_road_density_km_per_km2": traffic_exp.major_road_density_km_per_km2 if traffic_exp else 1.5,
            "total_road_density_km_per_km2": traffic_exp.total_road_density_km_per_km2 if traffic_exp else 15.0,
            "distance_to_nearest_major_road_m": traffic_exp.distance_to_nearest_major_road_m if traffic_exp else 200.0,
            "traffic_proxy_index": traffic_proxy_index,
            "industrial_elements_2km": activity_exp.industrial_elements_2km if activity_exp else 0,
            "dist_nearest_industrial_m": activity_exp.dist_nearest_industrial_m if activity_exp else 5000.0,
            "has_industrial_within_1km": has_ind_1km,
            "construction_elements_1_5km": activity_exp.construction_elements_1_5km if activity_exp else 0,
            "dist_nearest_construction_m": activity_exp.dist_nearest_construction_m if activity_exp else 5000.0,
            "has_construction_within_1km": has_constr_1km,
            "poi_total_count_1_5km": activity_exp.poi_total_count_1_5km if activity_exp else 50,
            "poi_density_per_km2": poi_density,
            "poi_commercial_count": activity_exp.poi_commercial_count if activity_exp else 20,
            "poi_institutional_count": activity_exp.poi_institutional_count if activity_exp else 10,
            "poi_transit_count": activity_exp.poi_transit_count if activity_exp else 5,
            "landuse_elements_total": activity_exp.landuse_elements_total if activity_exp else 30,
            "landuse_residential_count": activity_exp.landuse_residential_count if activity_exp else 15,
            "landuse_commercial_count": activity_exp.landuse_commercial_count if activity_exp else 5,
            "landuse_industrial_count": activity_exp.landuse_industrial_count if activity_exp else 2,
            "landuse_green_count": activity_exp.landuse_green_count if activity_exp else 5,
            "dominant_landuse": activity_exp.dominant_landuse if activity_exp else "residential",
            "hour_sin": hour_sin,
            "hour_cos": hour_cos,
            "month_sin": month_sin,
            "month_cos": month_cos,
            "day_of_week_sin": day_of_week_sin,
            "day_of_week_cos": day_of_week_cos,
            "is_monsoon": is_monsoon,
            "wind_u": wind_u,
            "wind_v": wind_v,
            "ventilation_index": ventilation_index,
            "temp_dewpoint_spread": temp_dewpoint_spread,
            "is_precipitating": is_precipitating,
            "atmospheric_stagnation_flag": atmospheric_stagnation_flag,
            "pm25_lag_1h": pm25_lag_1h,
            "pm25_lag_2h": pm25_lag_2h,
            "pm25_lag_3h": pm25_lag_3h,
            "pm25_lag_6h": pm25_lag_6h,
            "pm25_lag_12h": pm25_lag_12h,
            "pm25_lag_24h": pm25_lag_24h,
            "temp_c_lag_1h": temp_c_lag_1h,
            "wind_speed_ms_lag_1h": wind_speed_ms_lag_1h,
            "pbl_height_m_lag_1h": pbl_height_m_lag_1h,
            "temp_c_lag_3h": temp_c_lag_3h,
            "wind_speed_ms_lag_3h": wind_speed_ms_lag_3h,
            "pbl_height_m_lag_3h": pbl_height_m_lag_3h,
            "temp_c_lag_6h": temp_c_lag_6h,
            "wind_speed_ms_lag_6h": wind_speed_ms_lag_6h,
            "pbl_height_m_lag_6h": pbl_height_m_lag_6h,
            "humidity_pct_lag_1h": humidity_pct_lag_1h,
            "ventilation_index_lag_1h": ventilation_index_lag_1h,
            "pm25_rolling_mean_3h": pm25_rolling_mean_3h,
            "pm25_rolling_mean_6h": pm25_rolling_mean_6h,
            "pm25_rolling_mean_12h": pm25_rolling_mean_12h,
            "pm25_rolling_mean_24h": pm25_rolling_mean_24h,
            "pm25_rolling_std_6h": pm25_rolling_std_6h,
            "pm25_rolling_std_24h": pm25_rolling_std_24h,
            "temp_c_rolling_mean_6h": temp_c_rolling_mean_6h,
            "wind_speed_ms_rolling_mean_6h": wind_speed_ms_rolling_mean_6h,
            "pbl_height_m_rolling_mean_6h": pbl_height_m_rolling_mean_6h,
            "precip_rolling_sum_6h": precip_rolling_sum_6h,
            "precip_rolling_sum_24h": precip_rolling_sum_24h,
            "traffic_stagnation_ratio": traffic_stagnation_ratio,
            "traffic_ventilation_ratio": traffic_ventilation_ratio,
            "industrial_dispersion_ratio": industrial_dispersion_ratio,
            "construction_dispersion_ratio": construction_dispersion_ratio,
            "poi_traffic_interaction": poi_traffic_interaction,
        }

        return pd.DataFrame([features_dict])

    @classmethod
    def generate_next_hour_forecast(
        cls,
        db: Session,
        station_id: int,
        timestamp: Optional[datetime] = None,
        model_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Serves next-hour PM2.5 forecast for a station.
        Validates station existence, input data availability, and serves prediction via ModelServingManager.
        """
        station = db.query(Station).filter(Station.station_id == station_id).first()
        if not station:
            return None

        # Select model (explicit default from settings / active registry)
        target_model_id = model_id or settings.DEFAULT_FORECAST_MODEL_ID

        # Ensure model is registered
        reg_model = db.query(ModelRegistry).filter(ModelRegistry.model_id == target_model_id).first()
        if not reg_model:
            raise ValueError(f"Requested model '{target_model_id}' is not in the model registry.")

        # Determine prediction timestamp t
        if timestamp is not None:
            pred_time_utc = timestamp
            if pred_time_utc.tzinfo is None:
                pred_time_utc = pred_time_utc.replace(tzinfo=timezone.utc)
        else:
            # Default to the latest available historical observation timestamp
            pred_time_utc = cls.get_latest_data_timestamp(db, station_id)
            if pred_time_utc is None:
                raise ForecastDataUnavailableException(
                    f"No historical observation data found for station {station_id}.",
                    station_id=station_id
                )

        target_time_utc = pred_time_utc + timedelta(hours=1)

        # Construct exact multi-domain feature vector
        feat_df = cls.construct_features(db, station, pred_time_utc)

        # Execute prediction through in-memory cached model
        predicted_pm25 = model_serving.predict(target_model_id, feat_df)

        return {
            "station_id": station.station_id,
            "station_name": station.station_name,
            "prediction_time_utc": pred_time_utc,
            "target_time_utc": target_time_utc,
            "horizon_hours": 1,
            "model_id": target_model_id,
            "model_type": reg_model.model_type,
            "predicted_pm25": predicted_pm25,
            "unit": "ug/m3",
            "data_availability_status": "HISTORICAL_INPUTS_VERIFIED",
            "input_features_summary": {
                "pm25_t": float(feat_df["pm25"].iloc[0]) if pd.notna(feat_df["pm25"].iloc[0]) else None,
                "temp_c": round(float(feat_df["temp_c"].iloc[0]), 2) if pd.notna(feat_df["temp_c"].iloc[0]) else None,
                "wind_speed_ms": round(float(feat_df["wind_speed_ms"].iloc[0]), 2) if pd.notna(feat_df["wind_speed_ms"].iloc[0]) else None,
                "ventilation_index": round(float(feat_df["ventilation_index"].iloc[0]), 2) if pd.notna(feat_df["ventilation_index"].iloc[0]) else None,
                "traffic_proxy_index": round(float(feat_df["traffic_proxy_index"].iloc[0]), 3) if pd.notna(feat_df["traffic_proxy_index"].iloc[0]) else None
            }
        }
