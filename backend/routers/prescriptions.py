import json
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models import Prescription, Doctor, Patient, Token, Appointment, User
from backend.schemas import PrescriptionCreate, PrescriptionResponse, MedicineItem
from backend.auth import require_staff, get_current_user_optional

router = APIRouter(prefix="/api/prescriptions", tags=["prescriptions"])

@router.post("", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED)
def create_digital_prescription(
    payload: PrescriptionCreate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Clinician action: Issue an official digital prescription linked to an active or completed consultation.
    Stores structured medicine dosages, clinical advice, recommended tests, and follow-up timeline.
    """
    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Serialize medicines into JSON string
    meds_data = [m.model_dump() for m in payload.medicines]

    follow_up = None
    if payload.follow_up_date:
        try:
            follow_up = datetime.strptime(payload.follow_up_date, "%Y-%m-%d").date()
        except ValueError:
            pass

    rx = Prescription(
        token_id=payload.token_id,
        appointment_id=payload.appointment_id,
        doctor_id=doctor.id,
        patient_id=patient.id,
        diagnosis=payload.diagnosis,
        medicines=json.dumps(meds_data),
        clinical_notes=payload.clinical_notes,
        tests_recommended=payload.tests_recommended,
        follow_up_date=follow_up,
        status="active",
        created_at=datetime.now()
    )
    db.add(rx)
    db.commit()
    db.refresh(rx)

    return format_prescription_response(rx)

@router.get("/token/{token_id}", response_model=Optional[PrescriptionResponse])
def get_prescription_for_token(token_id: int, db: Session = Depends(get_db)):
    """Fetch digital prescription associated with a consultation token."""
    rx = db.query(Prescription).filter(Prescription.token_id == token_id).order_by(Prescription.created_at.desc()).first()
    if not rx:
        return None
    return format_prescription_response(rx)

@router.get("/{id}", response_model=PrescriptionResponse)
def get_prescription_by_id(id: int, db: Session = Depends(get_db)):
    """Retrieve full prescription details by prescription ID."""
    rx = db.query(Prescription).filter(Prescription.id == id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return format_prescription_response(rx)


def format_prescription_response(rx: Prescription) -> dict:
    try:
        meds_list = json.loads(rx.medicines) if rx.medicines else []
    except Exception:
        meds_list = []

    return {
        "id": rx.id,
        "token_id": rx.token_id,
        "appointment_id": rx.appointment_id,
        "patient": {
            "id": rx.patient.id if rx.patient else 0,
            "name": rx.patient.name if rx.patient else "",
            "phone": rx.patient.phone if rx.patient else "",
            "age": rx.patient.age if rx.patient else 0,
            "gender": rx.patient.gender if rx.patient else "other",
        },
        "doctor_name": rx.doctor.name if rx.doctor else "Doctor",
        "doctor_specialization": rx.doctor.specialization if rx.doctor else "Specialist",
        "doctor_room": rx.doctor.room if rx.doctor else "Consultation Room",
        "diagnosis": rx.diagnosis,
        "medicines": meds_list,
        "clinical_notes": rx.clinical_notes,
        "tests_recommended": rx.tests_recommended,
        "follow_up_date": rx.follow_up_date.isoformat() if rx.follow_up_date else None,
        "created_at": rx.created_at.isoformat() if rx.created_at else "",
        "status": rx.status,
    }
