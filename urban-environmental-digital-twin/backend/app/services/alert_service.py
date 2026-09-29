"""
Urban Environmental Digital Twin - Alert Lifecycle & Evaluation Service
========================================================================
Manages the evaluation of environmental observations, deduplication of alerts,
automatic resolution when conditions normalize, and database persistence.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from backend.app.config.alert_thresholds import alert_thresholds, AlertThresholdSettings
from backend.app.models.station import Station
from backend.app.models.observation import EnvironmentalObservation
from backend.app.models.weather import WeatherReanalysis
from backend.app.models.prediction import ModelPrediction
from backend.app.models.alert import Alert, AlertStatus, AlertSeverity, AlertType
from backend.app.schemas.alert import AlertSummary, AlertEvaluationResult, AlertRead
from backend.app.services.anomaly_service import AnomalyDetector

logger = logging.getLogger("Alert_Service")


class AlertService:
    """Orchestrates alert generation, deduplication, and lifecycle transitions."""

    _last_sweep_time: Optional[datetime] = None

    @classmethod
    def evaluate_station(
        cls,
        db: Session,
        station_id: int,
        evaluation_time: Optional[datetime] = None,
        thresholds: AlertThresholdSettings = alert_thresholds,
        check_freshness: bool = True
    ) -> Dict[str, Any]:
        """
        Evaluates a single monitoring station across all anomaly and threshold rules.
        Applies strict deduplication against existing active alerts and auto-resolves
        alerts whose triggering conditions have ceased.
        """
        now_utc = evaluation_time or datetime.now(timezone.utc)
        if now_utc.tzinfo is None:
            now_utc = now_utc.replace(tzinfo=timezone.utc)

        station = db.query(Station).filter(Station.station_id == station_id).first()
        if not station:
            logger.warning(f"Station {station_id} not found during alert evaluation.")
            return {"station_id": station_id, "created": 0, "updated": 0, "resolved": 0, "active": 0}

        # 1. Fetch latest and recent observations
        obs_records = (
            db.query(EnvironmentalObservation)
            .filter(EnvironmentalObservation.station_id == station_id)
            .order_by(desc(EnvironmentalObservation.datetime_utc))
            .limit(25)
            .all()
        )
        latest_obs = obs_records[0] if obs_records else None
        previous_obs = obs_records[1] if len(obs_records) > 1 else None

        # 2. Fetch latest weather reanalysis
        latest_weather = (
            db.query(WeatherReanalysis)
            .filter(WeatherReanalysis.station_id == station_id)
            .order_by(desc(WeatherReanalysis.datetime_utc))
            .first()
        )

        # 3. Fetch recent prediction for the target hour (if available)
        latest_pred = None
        if latest_obs and latest_obs.datetime_utc:
            latest_pred = (
                db.query(ModelPrediction)
                .filter(
                    ModelPrediction.station_id == station_id,
                    ModelPrediction.target_time_utc == latest_obs.datetime_utc
                )
                .order_by(desc(ModelPrediction.created_at))
                .first()
            )

        candidate_alerts: List[Dict[str, Any]] = []

        # Run detection functions if observations exist
        if latest_obs:
            # A. Pollutant thresholds
            candidate_alerts.extend(
                AnomalyDetector.detect_pollutant_thresholds(latest_obs, thresholds=thresholds)
            )

            # B. PM2.5 Sudden Spike
            spike = AnomalyDetector.detect_pm25_spike(latest_obs, previous_obs, thresholds=thresholds)
            if spike:
                candidate_alerts.append(spike)

            # C. Statistical Anomaly (Z-score against window)
            stat_anomaly = AnomalyDetector.detect_statistical_anomaly(
                latest_obs, obs_records, thresholds=thresholds
            )
            if stat_anomaly:
                candidate_alerts.append(stat_anomaly)

            # D. Forecast Deviation
            if latest_pred:
                fc_dev = AnomalyDetector.detect_forecast_deviation(
                    latest_obs, latest_pred, thresholds=thresholds
                )
                if fc_dev:
                    candidate_alerts.append(fc_dev)

        # E. Atmospheric Conditions (from weather)
        if latest_weather:
            candidate_alerts.extend(
                AnomalyDetector.detect_atmospheric_conditions(
                    station_id, latest_weather, thresholds=thresholds
                )
            )

        # F. Sensor Freshness & Telemetry Health
        if check_freshness:
            # If evaluation_time is historical (e.g. testing with canonical timestamps),
            # use canonical benchmark time or evaluation time passed
            freshness_alert = AnomalyDetector.detect_sensor_freshness(
                station_id, latest_obs, evaluation_time_utc=now_utc, thresholds=thresholds
            )
            if freshness_alert:
                candidate_alerts.append(freshness_alert)

        # 4. Deduplication & State Management
        created_count = 0
        updated_count = 0
        resolved_count = 0
        triggered_alert_types = set()

        for cand in candidate_alerts:
            a_type = cand["alert_type"]
            triggered_alert_types.add(a_type)

            # Check if active or acknowledged alert already exists for (station, alert_type)
            existing_alert = (
                db.query(Alert)
                .filter(
                    Alert.station_id == station_id,
                    Alert.alert_type == a_type,
                    Alert.status.in_([AlertStatus.ACTIVE.value, AlertStatus.ACKNOWLEDGED.value])
                )
                .first()
            )

            if existing_alert:
                # Update existing active alert with latest observed values and diagnostics
                existing_alert.observed_value = cand["observed_value"]
                existing_alert.deviation = cand["deviation"]
                existing_alert.severity = cand["severity"]
                existing_alert.message = cand["message"]
                existing_alert.alert_metadata = cand.get("alert_metadata")
                existing_alert.detected_at = now_utc
                existing_alert.updated_at = now_utc
                updated_count += 1
            else:
                # Create brand new alert
                new_alert = Alert(
                    station_id=station_id,
                    alert_type=a_type,
                    severity=cand["severity"],
                    pollutant=cand.get("pollutant"),
                    observed_value=cand.get("observed_value"),
                    threshold_value=cand.get("threshold_value"),
                    expected_value=cand.get("expected_value"),
                    deviation=cand.get("deviation"),
                    message=cand["message"],
                    source=cand.get("source", "DERIVED"),
                    status=AlertStatus.ACTIVE.value,
                    started_at=cand.get("started_at", now_utc),
                    detected_at=now_utc,
                    alert_metadata=cand.get("alert_metadata"),
                )
                db.add(new_alert)
                created_count += 1

        # 5. Automatic Resolution
        # Only ACTIVE (not ACKNOWLEDGED) continuous condition alerts auto-resolve
        # when telemetry confirms the physical parameter is back within safe limits.
        active_untriggered = (
            db.query(Alert)
            .filter(
                Alert.station_id == station_id,
                Alert.status == AlertStatus.ACTIVE.value
            )
            .all()
        )

        for active_alert in active_untriggered:
            meta = active_alert.alert_metadata or {}
            # Do not auto-resolve if explicitly disabled in metadata or flagged as active watch
            if meta.get("auto_resolve") is False or meta.get("is_active_watch") is True:
                continue

            # Event-based and diagnostic alerts remain active for their operational observation window (24h)
            event_types = {
                AlertType.PM25_SPIKE.value,
                AlertType.PM25_ANOMALY.value,
                AlertType.FORECAST_DEVIATION.value,
                AlertType.DATA_GAP.value,
                AlertType.SENSOR_OFFLINE.value,
                AlertType.SENSOR_ANOMALY.value,
            }
            if active_alert.alert_type in event_types:
                alert_time = active_alert.detected_at or active_alert.started_at
                if alert_time:
                    if alert_time.tzinfo is None:
                        alert_time = alert_time.replace(tzinfo=timezone.utc)
                    if now_utc - alert_time < timedelta(hours=24):
                        continue

            if active_alert.alert_type not in triggered_alert_types:
                active_alert.status = AlertStatus.RESOLVED.value
                active_alert.ended_at = now_utc
                active_alert.updated_at = now_utc
                resolved_count += 1

        db.flush()

        active_remaining = (
            db.query(func.count(Alert.alert_id))
            .filter(
                Alert.station_id == station_id,
                Alert.status.in_([AlertStatus.ACTIVE.value, AlertStatus.ACKNOWLEDGED.value])
            )
            .scalar()
        )

        return {
            "station_id": station_id,
            "station_name": station.station_name,
            "created": created_count,
            "updated": updated_count,
            "resolved": resolved_count,
            "active": active_remaining or 0
        }

    @classmethod
    def evaluate_all_stations(
        cls,
        db: Session,
        evaluation_time: Optional[datetime] = None,
        thresholds: AlertThresholdSettings = alert_thresholds,
        check_freshness: bool = False
    ) -> AlertEvaluationResult:
        """
        Executes an alert evaluation sweep across all active monitoring stations.
        """
        now_utc = evaluation_time or datetime.now(timezone.utc)
        if now_utc.tzinfo is None:
            now_utc = now_utc.replace(tzinfo=timezone.utc)

        stations = db.query(Station).filter(Station.is_active == True).all()
        total_created = 0
        total_updated = 0
        total_resolved = 0
        details = []

        for stn in stations:
            try:
                res = cls.evaluate_station(
                    db=db,
                    station_id=stn.station_id,
                    evaluation_time=now_utc,
                    thresholds=thresholds,
                    check_freshness=check_freshness
                )
                total_created += res["created"]
                total_updated += res["updated"]
                total_resolved += res["resolved"]
                details.append(res)
            except Exception as e:
                logger.error(f"Error evaluating alerts for station {stn.station_id}: {e}")
                details.append({
                    "station_id": stn.station_id,
                    "error": str(e)
                })

        try:
            db.commit()
            cls._last_sweep_time = now_utc
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to commit alert evaluation: {e}")
            raise

        active_total = (
            db.query(func.count(Alert.alert_id))
            .filter(Alert.status.in_([AlertStatus.ACTIVE.value, AlertStatus.ACKNOWLEDGED.value]))
            .scalar()
        ) or 0

        return AlertEvaluationResult(
            status="SUCCESS",
            evaluated_at=now_utc,
            stations_evaluated=len(stations),
            alerts_created=total_created,
            alerts_updated=total_updated,
            alerts_resolved=total_resolved,
            active_total=active_total,
            details=details
        )

    @classmethod
    def get_alerts(
        cls,
        db: Session,
        station_id: Optional[int] = None,
        alert_type: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
        order: str = "desc"
    ) -> Tuple[List[AlertRead], int]:
        """
        Queries paginated alerts with flexible filtering.
        """
        query = db.query(Alert, Station.station_name).join(Station, Alert.station_id == Station.station_id)

        if station_id is not None:
            query = query.filter(Alert.station_id == station_id)
        if alert_type:
            query = query.filter(Alert.alert_type == alert_type)
        if severity:
            query = query.filter(Alert.severity == severity.upper())
        if status:
            query = query.filter(Alert.status == status.upper())
        if start:
            query = query.filter(Alert.detected_at >= start)
        if end:
            query = query.filter(Alert.detected_at <= end)

        total = query.count()

        if order == "asc":
            query = query.order_by(Alert.detected_at.asc(), Alert.alert_id.asc())
        else:
            query = query.order_by(Alert.detected_at.desc(), Alert.alert_id.desc())

        results = query.offset(offset).limit(limit).all()

        items: List[AlertRead] = []
        for alert, station_name in results:
            alert_dict = {
                "alert_id": alert.alert_id,
                "station_id": alert.station_id,
                "station_name": station_name,
                "alert_type": alert.alert_type,
                "severity": alert.severity,
                "pollutant": alert.pollutant,
                "observed_value": alert.observed_value,
                "threshold_value": alert.threshold_value,
                "expected_value": alert.expected_value,
                "deviation": alert.deviation,
                "message": alert.message,
                "source": alert.source,
                "status": alert.status,
                "detected_at": alert.detected_at,
                "started_at": alert.started_at,
                "ended_at": alert.ended_at,
                "alert_metadata": alert.alert_metadata,
                "created_at": alert.created_at,
                "updated_at": alert.updated_at,
            }
            items.append(AlertRead.model_validate(alert_dict))

        return items, total

    @classmethod
    def get_active_alerts(
        cls,
        db: Session,
        station_id: Optional[int] = None
    ) -> List[AlertRead]:
        """
        Returns all currently active and acknowledged alerts across stations.
        """
        items, _ = cls.get_alerts(
            db=db,
            station_id=station_id,
            status=AlertStatus.ACTIVE.value,
            limit=500,
            offset=0,
            order="desc"
        )
        return items

    @classmethod
    def get_station_alerts(
        cls,
        db: Session,
        station_id: int,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[AlertRead]:
        """
        Returns list of alerts for a specific monitoring station.
        """
        items, _ = cls.get_alerts(
            db=db,
            station_id=station_id,
            status=status,
            limit=limit,
            offset=offset,
            order="desc"
        )
        return items

    @classmethod
    def get_alert_by_id(cls, db: Session, alert_id: int) -> Optional[AlertRead]:
        """
        Returns a single alert record by primary key.
        """
        row = (
            db.query(Alert, Station.station_name)
            .join(Station, Alert.station_id == Station.station_id)
            .filter(Alert.alert_id == alert_id)
            .first()
        )
        if not row:
            return None
        alert, station_name = row
        alert_dict = {
            "alert_id": alert.alert_id,
            "station_id": alert.station_id,
            "station_name": station_name,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "pollutant": alert.pollutant,
            "observed_value": alert.observed_value,
            "threshold_value": alert.threshold_value,
            "expected_value": alert.expected_value,
            "deviation": alert.deviation,
            "message": alert.message,
            "source": alert.source,
            "status": alert.status,
            "detected_at": alert.detected_at,
            "started_at": alert.started_at,
            "ended_at": alert.ended_at,
            "alert_metadata": alert.alert_metadata,
            "created_at": alert.created_at,
            "updated_at": alert.updated_at,
        }
        return AlertRead.model_validate(alert_dict)

    @classmethod
    def get_alert_summary(cls, db: Session) -> AlertSummary:
        """
        Returns aggregated counts by severity, type, and lifecycle status.
        """
        total = db.query(func.count(Alert.alert_id)).scalar() or 0
        active = (
            db.query(func.count(Alert.alert_id))
            .filter(Alert.status == AlertStatus.ACTIVE.value)
            .scalar()
        ) or 0
        acknowledged = (
            db.query(func.count(Alert.alert_id))
            .filter(Alert.status == AlertStatus.ACKNOWLEDGED.value)
            .scalar()
        ) or 0
        resolved = (
            db.query(func.count(Alert.alert_id))
            .filter(Alert.status == AlertStatus.RESOLVED.value)
            .scalar()
        ) or 0

        # Severity breakdown for active/acknowledged
        severity_rows = (
            db.query(Alert.severity, func.count(Alert.alert_id))
            .filter(Alert.status.in_([AlertStatus.ACTIVE.value, AlertStatus.ACKNOWLEDGED.value]))
            .group_by(Alert.severity)
            .all()
        )
        by_severity = {s.value: 0 for s in AlertSeverity}
        for sev, count in severity_rows:
            by_severity[sev] = count

        # Type breakdown for active/acknowledged
        type_rows = (
            db.query(Alert.alert_type, func.count(Alert.alert_id))
            .filter(Alert.status.in_([AlertStatus.ACTIVE.value, AlertStatus.ACKNOWLEDGED.value]))
            .group_by(Alert.alert_type)
            .all()
        )
        by_type = {t: count for t, count in type_rows}

        last_evaluated = (
            cls._last_sweep_time or db.query(func.max(Alert.detected_at)).scalar()
        )

        return AlertSummary(
            total_alerts=total,
            active_alerts=active,
            acknowledged_alerts=acknowledged,
            resolved_alerts=resolved,
            by_severity=by_severity,
            by_type=by_type,
            last_evaluated_at=last_evaluated
        )

    @classmethod
    def acknowledge_alert(
        cls,
        db: Session,
        alert_id: int,
        note: Optional[str] = None
    ) -> Optional[AlertRead]:
        """
        Transitions an alert from ACTIVE to ACKNOWLEDGED.
        """
        alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
        if not alert:
            return None

        alert.status = AlertStatus.ACKNOWLEDGED.value
        alert.updated_at = datetime.now(timezone.utc)
        if note:
            meta = dict(alert.alert_metadata or {})
            meta["acknowledgment_note"] = note
            meta["acknowledged_at"] = alert.updated_at.isoformat()
            alert.alert_metadata = meta

        db.commit()
        return cls.get_alert_by_id(db, alert_id)

    @classmethod
    def resolve_alert(
        cls,
        db: Session,
        alert_id: int,
        note: Optional[str] = None
    ) -> Optional[AlertRead]:
        """
        Transitions an alert to RESOLVED with ended_at timestamp.
        """
        alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
        if not alert:
            return None

        now = datetime.now(timezone.utc)
        alert.status = AlertStatus.RESOLVED.value
        alert.ended_at = now
        alert.updated_at = now
        if note:
            meta = dict(alert.alert_metadata or {})
            meta["resolution_note"] = note
            meta["resolved_manually_at"] = now.isoformat()
            alert.alert_metadata = meta

        db.commit()
        return cls.get_alert_by_id(db, alert_id)


# Singleton instance
alert_service = AlertService()
