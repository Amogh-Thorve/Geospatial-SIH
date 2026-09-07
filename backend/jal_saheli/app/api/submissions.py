"""
app/api/submissions.py
Ground observation submission endpoints.
Full CRUD against real database records.
Supports photo upload, coordinate validation, status polling, and pagination.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db_session
from app.models.profile import CadreProfile
from app.schemas.submission import (
    SubmissionResponse,
    SubmissionStatusResponse,
)
from app.services import submission_service
from app.utils.auth import get_current_cadre
from app.utils.rate_limiter import rate_limit

logger = logging.getLogger("jal_saheli.api.submissions")

router = APIRouter(tags=["Submissions"])


@router.get(
    "/submissions",
    response_model=list[SubmissionResponse],
    summary="List observations for authenticated cadre",
)
async def list_cadre_submissions(
    response: Response,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Optional status filter: pending, processing, verified, rejected"),
    cadre: CadreProfile = Depends(get_current_cadre),
    db: AsyncSession = Depends(get_db_session),
) -> list[SubmissionResponse]:
    """
    Return list of field observations submitted by the authenticated cadre.
    Returns real database records only (empty array if no submissions exist).
    Total count is exposed via X-Total-Count response header.
    """
    try:
        items, total = await submission_service.list_submissions(
            cadre=cadre,
            db=db,
            page=page,
            page_size=page_size,
            status_filter=status,
        )
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Page-Size"] = str(page_size)
        return items
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_filter", "message": str(exc)},
        ) from exc


@router.post(
    "/submissions",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new ground observation",
    dependencies=[Depends(rate_limit(30, 60))],
)
async def create_new_submission(
    request: Request,
    cadre: CadreProfile = Depends(get_current_cadre),
    db: AsyncSession = Depends(get_db_session),
) -> SubmissionResponse:
    """
    Record a new field observation with optional photo and location coordinates.
    Accepts both multipart/form-data (for photo upload) and application/json.
    Validates observation type, coordinates, and photo MIME/size.
    Writes real database record with status PENDING.
    """
    content_type = request.headers.get("content-type", "")

    obs_type: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    location_label: Optional[str] = None
    location_json: Optional[str] = None
    description: Optional[str] = None
    capture_time_str: Optional[str] = None
    photo_file: Optional[UploadFile] = None

    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        obs_type = form.get("observation_type") or form.get("observationType")
        description = form.get("description") or form.get("notes")
        capture_time_str = form.get("capture_time") or form.get("captureTime")
        location_raw = form.get("location")

        if location_raw:
            if isinstance(location_raw, str):
                location_json = location_raw
            else:
                location_json = str(location_raw)

        lat_form = form.get("latitude") or form.get("lat")
        if lat_form is not None:
            try:
                lat = float(lat_form)
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail={"error": "validation_error", "message": f"Invalid latitude: {lat_form}"})

        lng_form = form.get("longitude") or form.get("lng")
        if lng_form is not None:
            try:
                lng = float(lng_form)
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail={"error": "validation_error", "message": f"Invalid longitude: {lng_form}"})

        location_label = form.get("location_label") or form.get("locationLabel")

        uploaded = form.get("photo")
        if uploaded is not None and hasattr(uploaded, "filename") and hasattr(uploaded, "read") and uploaded.filename:
            photo_file = uploaded

    else:
        # Assume JSON payload
        try:
            body = await request.json()
        except Exception:
            body = {}

        obs_type = body.get("observation_type") or body.get("observationType")
        description = body.get("description") or body.get("notes")
        capture_time_str = body.get("capture_time") or body.get("captureTime")

        loc_body = body.get("location")
        if isinstance(loc_body, dict):
            lat = loc_body.get("lat")
            lng = loc_body.get("lng")
            location_label = loc_body.get("label")
        elif isinstance(loc_body, str):
            location_json = loc_body

        if lat is None and body.get("latitude") is not None:
            lat = float(body["latitude"])
        if lng is None and body.get("longitude") is not None:
            lng = float(body["longitude"])
        if location_label is None and body.get("location_label") is not None:
            location_label = body.get("location_label")

    if not obs_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "validation_error", "message": "observation_type is required"},
        )

    try:
        submission = await submission_service.create_submission(
            cadre=cadre,
            db=db,
            observation_type=str(obs_type),
            location_json=location_json,
            latitude=lat,
            longitude=lng,
            location_label=location_label,
            description=description,
            capture_time_str=capture_time_str,
            photo=photo_file,
        )
        return submission
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "validation_error", "message": str(exc)},
        ) from exc


@router.get(
    "/submissions/{submission_id}",
    response_model=SubmissionResponse,
    summary="Get single submission by ID",
)
async def get_submission(
    submission_id: str,
    cadre: CadreProfile = Depends(get_current_cadre),
    db: AsyncSession = Depends(get_db_session),
) -> SubmissionResponse:
    """
    Fetch full detail of a single ground observation by its ID (GW-XXXXXX).
    Only returns records owned by the authenticated cadre.
    """
    sub = await submission_service.get_submission_by_id(
        cadre=cadre, db=db, submission_id=submission_id
    )
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "not_found",
                "message": f"Submission {submission_id} not found or not accessible",
            },
        )
    return sub


@router.get(
    "/submissions/{submission_id}/status",
    response_model=SubmissionStatusResponse,
    summary="Get lightweight submission status for polling",
)
async def get_status(
    submission_id: str,
    cadre: CadreProfile = Depends(get_current_cadre),
    db: AsyncSession = Depends(get_db_session),
) -> SubmissionStatusResponse:
    """
    Fetch lightweight status and verification confidence for polling during
    AI and satellite analysis.
    """
    sub_status = await submission_service.get_submission_status(
        cadre=cadre, db=db, submission_id=submission_id
    )
    if sub_status is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "not_found",
                "message": f"Submission {submission_id} not found or not accessible",
            },
        )
    return sub_status
