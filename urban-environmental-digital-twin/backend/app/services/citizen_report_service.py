"""
Urban Environmental Digital Twin - Citizen Report Service
==========================================================
Handles business logic for pollution reporting, input sanitization,
secure local file attachment storage, reference code generation,
and resident report retrieval.
"""

import os
import uuid
import secrets
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.models.citizen_report import CitizenReport
from backend.app.schemas.citizen_report import CitizenReportCreate

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads", "reports")
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


class CitizenReportService:
    @staticmethod
    def _generate_report_reference(db: Session) -> str:
        """Generates a memorable and collision-free reference: AIR-YYYYMMDD-XXXX."""
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        for _ in range(10):
            suffix = secrets.token_hex(2).upper()
            ref = f"AIR-{date_str}-{suffix}"
            existing = db.query(CitizenReport).filter(CitizenReport.report_reference == ref).first()
            if not existing:
                return ref
        return f"AIR-{date_str}-{uuid.uuid4().hex[:6].upper()}"

    @classmethod
    async def create_report(
        cls,
        db: Session,
        report_data: CitizenReportCreate,
        file: Optional[UploadFile] = None,
        user_id: Optional[int] = None
    ) -> CitizenReport:
        """Creates and persists a new citizen pollution report with optional photo attachment."""
        ref = cls._generate_report_reference(db)

        attachment_filename = None
        attachment_path = None
        attachment_mime = None
        attachment_size = None

        if file and file.filename:
            content_type = file.content_type or ""
            if content_type.lower() not in ALLOWED_MIME_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid file type '{content_type}'. Permitted image formats: JPEG, PNG, WebP."
                )

            contents = await file.read()
            if len(contents) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File exceeds maximum allowed size of 5 MB."
                )

            os.makedirs(UPLOAD_DIR, exist_ok=True)
            ext = os.path.splitext(file.filename)[1].lower()
            if not ext or ext not in {".jpg", ".jpeg", ".png", ".webp"}:
                ext = ".jpg" if "jpeg" in content_type else ".png"

            safe_filename = f"{ref}_{uuid.uuid4().hex[:8]}{ext}"
            saved_disk_path = os.path.join(UPLOAD_DIR, safe_filename)

            with open(saved_disk_path, "wb") as f:
                f.write(contents)

            attachment_filename = file.filename
            attachment_path = f"/api/v1/reports/attachments/{safe_filename}"
            attachment_mime = content_type.lower()
            attachment_size = len(contents)

        report = CitizenReport(
            report_reference=ref,
            category=report_data.category,
            description=report_data.description,
            location_name=report_data.location_name,
            latitude=report_data.latitude,
            longitude=report_data.longitude,
            nearest_station_id=report_data.nearest_station_id,
            observed_at=report_data.observed_at,
            status="SUBMITTED",
            attachment_filename=attachment_filename,
            attachment_path=attachment_path,
            attachment_mime=attachment_mime,
            attachment_size_bytes=attachment_size,
            client_device_token=report_data.client_device_token,
            user_id=user_id,
        )

        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def get_my_reports(db: Session, client_device_token: str, limit: int = 30) -> List[CitizenReport]:
        """Returns reports submitted by the given device token to protect resident privacy."""
        if not client_device_token or len(client_device_token.strip()) < 8:
            return []
        return (
            db.query(CitizenReport)
            .filter(CitizenReport.client_device_token == client_device_token.strip())
            .order_by(desc(CitizenReport.submitted_at))
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_report_by_reference(db: Session, report_reference: str) -> Optional[CitizenReport]:
        """Finds a report by reference code."""
        return (
            db.query(CitizenReport)
            .filter(CitizenReport.report_reference == report_reference.strip().upper())
            .first()
        )
