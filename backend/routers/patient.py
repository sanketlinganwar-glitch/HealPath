import secrets
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models import Patient, Token, Appointment, Prescription, Doctor, Department
from backend.schemas import (
    PatientLoginRequest,
    PatientLoginResponse,
    PatientProfileUpdateRequest,
    PatientResponse,
    PatientWalletResponse,
    TokenResponse,
    AppointmentResponse,
    PrescriptionResponse
)
from backend.auth import create_access_token, get_current_patient, get_current_actor
from backend.services.queue import serialize_token
from backend.routers.appointments import format_appointment_response
from backend.routers.prescriptions import format_prescription_response

router = APIRouter(prefix="/api/patient", tags=["patient"])

@router.post("/auth/login", response_model=PatientLoginResponse)
def patient_login(payload: PatientLoginRequest, db: Session = Depends(get_db)):
    """
    Patient Portal Authentication:
    Allows patients to sign in using their 10-digit registered mobile number.
    Generates a secure 12-hour Patient JWT token.
    """
    clean_phone = "".join(filter(str.isdigit, payload.phone))[-10:]
    if len(clean_phone) != 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Phone number must be exactly 10 digits"
        )

    patient = db.query(Patient).filter(Patient.phone == clean_phone).first()
    if not patient:
        # Create a new patient record if first time visiting
        patient = Patient(
            name=f"Patient {clean_phone[-4:]}",
            phone=clean_phone,
            age=35,
            gender="other",
            created_at=datetime.now()
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

    # Ensure patient has an official UHID
    if not patient.uhid:
        patient.uhid = f"SH-445001-{patient.id:04d}"
        db.commit()
        db.refresh(patient)

    access_token = create_access_token(
        data={
            "sub": f"patient_{patient.phone}",
            "role": "patient",
            "patient_id": patient.id,
            "name": patient.name,
            "phone": patient.phone
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": "patient",
        "patient_id": patient.id,
        "name": patient.name,
        "phone": patient.phone,
        "uhid": patient.uhid
    }


@router.get("/profile", response_model=PatientResponse)
def get_patient_profile(
    phone: Optional[str] = Query(None, description="Optional phone query for lookups"),
    current_patient: Optional[Patient] = Depends(lambda: None),
    db: Session = Depends(get_db)
):
    """Fetch patient profile with UHID, blood group, allergies, and contact details."""
    target_patient = None
    if phone:
        clean_phone = "".join(filter(str.isdigit, phone))[-10:]
        target_patient = db.query(Patient).filter(Patient.phone == clean_phone).first()

    if not target_patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    if not target_patient.uhid:
        target_patient.uhid = f"SH-445001-{target_patient.id:04d}"
        db.commit()
        db.refresh(target_patient)

    return {
        "id": target_patient.id,
        "name": target_patient.name,
        "phone": target_patient.phone,
        "age": target_patient.age,
        "gender": target_patient.gender,
        "uhid": target_patient.uhid,
        "blood_group": target_patient.blood_group,
        "allergies": target_patient.allergies,
        "medical_history": target_patient.medical_history
    }


@router.put("/profile", response_model=PatientResponse)
def update_patient_profile(
    payload: PatientProfileUpdateRequest,
    phone: str = Query(..., description="10-digit patient phone"),
    db: Session = Depends(get_db)
):
    """Update patient personal health details (blood group, allergies, medical history)."""
    clean_phone = "".join(filter(str.isdigit, phone))[-10:]
    patient = db.query(Patient).filter(Patient.phone == clean_phone).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if payload.name:
        patient.name = payload.name.strip()
    if payload.blood_group:
        patient.blood_group = payload.blood_group.strip()
    if payload.allergies is not None:
        patient.allergies = payload.allergies.strip()
    if payload.medical_history is not None:
        patient.medical_history = payload.medical_history.strip()

    db.commit()
    db.refresh(patient)

    return {
        "id": patient.id,
        "name": patient.name,
        "phone": patient.phone,
        "age": patient.age,
        "gender": patient.gender,
        "uhid": patient.uhid or f"SH-445001-{patient.id:04d}",
        "blood_group": patient.blood_group,
        "allergies": patient.allergies,
        "medical_history": patient.medical_history
    }


@router.get("/wallet", response_model=PatientWalletResponse)
def get_patient_digital_wallet(
    phone: str = Query(..., min_length=10, max_length=15, description="Patient 10-digit mobile number"),
    db: Session = Depends(get_db)
):
    """
    Unified Patient Digital Health Wallet:
    Aggregates full medical history, active token status, past visits,
    chronological prescriptions, and upcoming appointments.
    """
    clean_phone = "".join(filter(str.isdigit, phone))[-10:]
    patient = db.query(Patient).filter(Patient.phone == clean_phone).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No patient profile found for phone {clean_phone}."
        )

    if not patient.uhid:
        patient.uhid = f"SH-445001-{patient.id:04d}"
        db.commit()
        db.refresh(patient)

    # 1. Fetch active token
    active_token = db.query(Token).filter(
        Token.patient_id == patient.id,
        Token.status.in_(["waiting", "in_progress"])
    ).order_by(Token.created_at.desc()).first()

    active_token_serialized = serialize_token(active_token, db) if active_token else None

    # 2. Fetch all prescriptions
    prescriptions = db.query(Prescription).filter(
        Prescription.patient_id == patient.id
    ).order_by(Prescription.created_at.desc()).all()
    rx_responses = [format_prescription_response(rx) for rx in prescriptions]

    # 3. Fetch all appointments
    appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient.id
    ).order_by(Appointment.slot_time.desc()).all()
    appt_responses = [format_appointment_response(a) for a in appointments]

    # 4. Fetch all past tokens
    all_tokens = db.query(Token).filter(
        Token.patient_id == patient.id
    ).order_by(Token.created_at.desc()).all()
    tokens_serialized = [serialize_token(t, db) for t in all_tokens]

    # 5. Build structured medical history timeline
    medical_timeline = []
    for rx in prescriptions:
        medical_timeline.append({
            "type": "consultation",
            "date": rx.created_at.strftime("%d-%b-%Y"),
            "doctor": rx.doctor.name if rx.doctor else "Hospital Doctor",
            "department": rx.doctor.department.name if rx.doctor and rx.doctor.department else "Outpatient",
            "diagnosis": rx.diagnosis,
            "prescription_number": rx.prescription_number or f"RX-{rx.id:04d}",
            "tests_recommended": rx.tests_recommended,
            "follow_up_date": rx.follow_up_date.strftime("%d-%b-%Y") if rx.follow_up_date else None
        })

    for appt in appointments:
        if appt.status == "checked_in":
            medical_timeline.append({
                "type": "appointment_visit",
                "date": appt.slot_time.strftime("%d-%b-%Y %H:%M"),
                "doctor": appt.doctor.name if appt.doctor else "Doctor",
                "department": appt.department.name if appt.department else "OPD",
                "status": appt.status,
                "appointment_code": appt.appointment_code
            })

    # Sort timeline descending by date string or created_at
    medical_timeline = sorted(medical_timeline, key=lambda x: x.get("date", ""), reverse=True)

    return {
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "phone": patient.phone,
            "age": patient.age,
            "gender": patient.gender,
            "uhid": patient.uhid,
            "blood_group": patient.blood_group,
            "allergies": patient.allergies,
            "medical_history": patient.medical_history
        },
        "active_token": active_token_serialized,
        "total_visits": len(all_tokens),
        "prescriptions": rx_responses,
        "appointments": appt_responses,
        "tokens_history": tokens_serialized,
        "medical_history_summary": medical_timeline
    }
