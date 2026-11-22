"""
HACKBYTE (HealPath / QueueCare) - Stage 6: Predictive Queue Waiting Time AI Endpoints
Provides real-time multi-factor waiting time forecasts, statistical ranges,
doctor queue clearance predictions, and department throughput analysis.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models import Token, Doctor, Department
from backend.schemas import (
    QueuePredictionResponse,
    DoctorQueuePredictionResponse,
    DepartmentQueuePredictionResponse
)
from backend.services.queue_prediction import queue_prediction_service

router = APIRouter(prefix="/api/queue", tags=["queue-prediction"])


@router.get("/prediction/{token_id}", response_model=QueuePredictionResponse)
def get_token_queue_prediction(
    token_id: int,
    phone: Optional[str] = Query(None, description="Optional phone validation for patient security"),
    secure_hash: Optional[str] = Query(None, description="Optional secure hash validation"),
    db: Session = Depends(get_db)
):
    """
    Returns AI/Baseline estimated wait time, dynamic uncertainty range [min, max],
    confidence tier, and explanation for an individual patient token.
    Validates token ownership if phone or secure_hash is passed.
    """
    token = db.query(Token).filter(Token.id == token_id).first()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )

    # Validate ownership if provided
    if phone and token.patient and token.patient.phone != phone.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: Phone number does not match registered token"
        )

    if secure_hash and token.secure_hash and token.secure_hash != secure_hash.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: Invalid secure token hash"
        )

    prediction = queue_prediction_service.predict_token_waiting_time(db, token)
    return prediction


@router.get("/doctor-predictions/{doctor_id}", response_model=DoctorQueuePredictionResponse)
def get_doctor_queue_prediction(
    doctor_id: int,
    db: Session = Depends(get_db)
):
    """
    Returns doctor-specific queue workload, active consultation elapsed time,
    historical consultation velocity, and estimated queue clearance time.
    """
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )

    try:
        prediction = queue_prediction_service.predict_doctor_queue(db, doctor_id)
        return prediction
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction calculation error: {str(e)}"
        )


@router.get("/department-predictions/{department_id}", response_model=DepartmentQueuePredictionResponse)
def get_department_queue_prediction(
    department_id: int,
    db: Session = Depends(get_db)
):
    """
    Returns department-wide queue velocity, rush-hour factors,
    and estimated wait time for an incoming patient registering now.
    """
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    try:
        prediction = queue_prediction_service.predict_department_queue(db, department_id)
        return prediction
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction calculation error: {str(e)}"
        )
