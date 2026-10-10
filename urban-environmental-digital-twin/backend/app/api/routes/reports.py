"""
Urban Environmental Digital Twin - Citizen Pollution Reports API Router
========================================================================
Exposes endpoints for residents to report visible air pollution incidents,
upload optional supporting photos, receive tracking reference numbers,
and view their personal submitted reports.
"""

import os
from typing import List, Optional
from datetime import datetime
from fastapi import (
    APIRouter, Depends, HTTPException, Query, Form, File,
    UploadFile, status
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.citizen_report import (
    CitizenReportCreate, CitizenReportRead, CitizenReportSubmitResponse
)
from backend.app.services.citizen_report_service import (
    CitizenReportService, UPLOAD_DIR
)

router = APIRouter(prefix="/reports", tags=["Citizen Pollution Reports"])


@router.post(
    "",
    response_model=CitizenReportSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Pollution Report (JSON)",
    description="Registers a citizen pollution incident report without file attachment."
)
async def submit_report_json(
    report_in: CitizenReportCreate,
    db: Session = Depends(get_db)
):
    report = await CitizenReportService.create_report(
        db=db,
        report_data=report_in,
        file=None
    )
    return CitizenReportSubmitResponse(
        status="success",
        message="Pollution report successfully registered in AirLens incident log.",
        report_reference=report.report_reference,
        report=report
    )


@router.post(
    "/submit-form",
    response_model=CitizenReportSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Pollution Report with Optional Photo",
    description="Registers a citizen pollution incident report with an optional supporting photo attachment."
)
async def submit_report_form(
    category: str = Form(...),
    description: str = Form(...),
    location_name: str = Form(...),
    observed_at: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    nearest_station_id: Optional[int] = Form(None),
    client_device_token: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    try:
        dt = datetime.fromisoformat(observed_at.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid observed_at timestamp format. Please use ISO 8601."
        )

    report_create = CitizenReportCreate(
        category=category,
        description=description,
        location_name=location_name,
        observed_at=dt,
        latitude=latitude,
        longitude=longitude,
        nearest_station_id=nearest_station_id,
        client_device_token=client_device_token
    )

    report = await CitizenReportService.create_report(
        db=db,
        report_data=report_create,
        file=file
    )

    return CitizenReportSubmitResponse(
        status="success",
        message="Pollution report successfully registered in AirLens incident log.",
        report_reference=report.report_reference,
        report=report
    )


@router.get(
    "/my-reports",
    response_model=List[CitizenReportRead],
    summary="Get My Submitted Reports",
    description="Returns pollution incident reports submitted by the current resident device."
)
def get_my_reports(
    client_token: str = Query(..., min_length=8, description="Resident device token"),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db)
):
    return CitizenReportService.get_my_reports(db=db, client_device_token=client_token, limit=limit)


@router.get(
    "/{report_reference}",
    response_model=CitizenReportRead,
    summary="Get Report Details by Reference",
    description="Finds a single report using its unique tracking reference number."
)
def get_report(
    report_reference: str,
    db: Session = Depends(get_db)
):
    report = CitizenReportService.get_report_by_reference(db=db, report_reference=report_reference)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with reference '{report_reference}' was not found."
        )
    return report


@router.get(
    "/attachments/{filename}",
    summary="Retrieve Attached Incident Photo",
    description="Safely serves an attached incident photograph."
)
def get_attachment(filename: str):
    # Sanitize filename
    safe_name = os.path.basename(filename)
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found."
        )
    return FileResponse(file_path)
