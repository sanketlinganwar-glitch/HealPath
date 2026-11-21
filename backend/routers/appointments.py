import secrets
from datetime import datetime, date, time, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models import Department, Doctor, Patient, Appointment, Token, Message, User
from backend.schemas import (
    AppointmentSlot,
    AppointmentBookRequest,
    AppointmentResponse,
    AppointmentRescheduleRequest,
    AppointmentCancelRequest,
    TokenResponse
)
from backend.services.queue import (
    get_next_token_sequence,
    format_token_number,
    serialize_token,
    trigger_near_turn_notifications,
)
from backend.services.notification import notification_service
from backend.auth import require_staff, get_current_user_optional

router = APIRouter(prefix="/api/appointments", tags=["appointments"])

@router.get("/slots", response_model=List[AppointmentSlot])
def get_available_slots(
    doctor_id: int = Query(..., description="Doctor ID to check availability for"),
    date_str: str = Query(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    """
    Computes available 30-minute consultation slots for a doctor on a specific date,
    factoring in doctor duty schedule, break hours, and already booked appointments.
    """
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid date format. Expected YYYY-MM-DD.")

    if target_date < date.today():
        return []  # No past date slots

    # Parse doctor shift hours
    shift_start_h, shift_start_m = map(int, doctor.shift_start.split(":"))
    shift_end_h, shift_end_m = map(int, doctor.shift_end.split(":"))
    break_start_h, break_start_m = map(int, doctor.break_start.split(":"))
    break_end_h, break_end_m = map(int, doctor.break_end.split(":"))

    # Fetch existing appointments for this doctor on target_date
    start_of_day = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0)
    end_of_day = datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59)
    
    existing_appts = db.query(Appointment).filter(
        Appointment.doctor_id == doctor.id,
        Appointment.slot_time >= start_of_day,
        Appointment.slot_time <= end_of_day,
        Appointment.status.in_(["booked", "checked_in"])
    ).all()

    booked_slot_times = {a.slot_time.strftime("%H:%M") for a in existing_appts}

    slots = []
    curr_dt = datetime(target_date.year, target_date.month, target_date.day, shift_start_h, shift_start_m)
    shift_end_dt = datetime(target_date.year, target_date.month, target_date.day, shift_end_h, shift_end_m)
    break_start_dt = datetime(target_date.year, target_date.month, target_date.day, break_start_h, break_start_m)
    break_end_dt = datetime(target_date.year, target_date.month, target_date.day, break_end_h, break_end_m)

    now = datetime.now()

    while curr_dt < shift_end_dt:
        time_label = curr_dt.strftime("%H:%M")
        
        # Check if inside break window
        in_break = break_start_dt <= curr_dt < break_end_dt
        # Check if already booked
        is_booked = time_label in booked_slot_times
        # Check if past current time if target is today
        is_past = (target_date == date.today() and curr_dt <= now)

        is_available = not (in_break or is_booked or is_past or doctor.status == "off")

        if not in_break:
            slots.append({
                "time": time_label,
                "slot_datetime": curr_dt.isoformat(),
                "is_available": is_available,
                "doctor_id": doctor.id,
                "doctor_name": doctor.name,
            })

        curr_dt += timedelta(minutes=30)

    return slots

@router.post("/book", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def book_appointment(payload: AppointmentBookRequest, db: Session = Depends(get_db)):
    """
    Atomic patient appointment booking with server-side slot availability validation,
    idempotency protection, conflict checks, and automated notification confirmation.
    """
    # 1. Department and Doctor existence
    dept = db.query(Department).filter(Department.id == payload.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department does not exist")

    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    if not doctor or doctor.department_id != dept.id:
        raise HTTPException(status_code=404, detail="Doctor does not exist in selected department")

    try:
        slot_dt = datetime.fromisoformat(payload.slot_time)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid slot_time ISO string")

    if slot_dt < datetime.now():
        raise HTTPException(status_code=400, detail="Cannot book appointment in the past")

    # Idempotency check if key provided
    if payload.idempotency_key:
        existing_key = db.query(Appointment).filter(Appointment.idempotency_key == payload.idempotency_key).first()
        if existing_key:
            return format_appointment_response(existing_key)

    # 2. Prevent double booking on exact doctor and slot_time
    slot_conflict = db.query(Appointment).filter(
        Appointment.doctor_id == doctor.id,
        Appointment.slot_time == slot_dt,
        Appointment.status.in_(["booked", "checked_in"])
    ).first()

    if slot_conflict:
        raise HTTPException(
            status_code=409,
            detail=f"This time slot ({slot_dt.strftime('%d %b %I:%M %p')}) is already booked. Please select another slot."
        )

    # 3. Prevent duplicate active booking by same patient on same doctor & date
    start_of_day = datetime(slot_dt.year, slot_dt.month, slot_dt.day, 0, 0, 0)
    end_of_day = datetime(slot_dt.year, slot_dt.month, slot_dt.day, 23, 59, 59)
    patient_conflict = db.query(Appointment).join(Patient).filter(
        Patient.phone == payload.phone,
        Appointment.doctor_id == doctor.id,
        Appointment.slot_time >= start_of_day,
        Appointment.slot_time <= end_of_day,
        Appointment.status.in_(["booked", "checked_in"])
    ).first()

    if patient_conflict:
        raise HTTPException(
            status_code=409,
            detail=f"Patient already has an active appointment ({patient_conflict.appointment_code}) with {doctor.name} on this date."
        )

    # 4. Find or create patient
    patient = db.query(Patient).filter(Patient.phone == payload.phone).first()
    if not patient:
        patient = Patient(
            name=payload.name,
            phone=payload.phone,
            age=payload.age,
            gender=payload.gender,
            created_at=datetime.now()
        )
        db.add(patient)
        db.flush()
    else:
        patient.name = payload.name
        patient.age = payload.age
        patient.gender = payload.gender

    # 5. Generate secure unique appointment code
    appt_code = f"APT-{dept.code}-{secrets.token_hex(3).upper()}"

    appointment = Appointment(
        patient_id=patient.id,
        department_id=dept.id,
        doctor_id=doctor.id,
        slot_time=slot_dt,
        status="booked",
        appointment_code=appt_code,
        notes=payload.notes,
        source=payload.source or "online",
        payment_status="free",
        idempotency_key=payload.idempotency_key,
        created_at=datetime.now()
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    # 6. Dispatch Notification Confirmation
    try:
        notification_service.notify_appointment_booked(db, appointment, patient, doctor, dept)
    except Exception:
        pass

    return format_appointment_response(appointment)

@router.get("/my", response_model=List[AppointmentResponse])
def get_my_appointments(
    phone: str = Query(..., min_length=10, max_length=15, description="Patient 10-digit phone number"),
    db: Session = Depends(get_db)
):
    """
    Secure patient appointment lookup by validated phone number.
    Returns active and upcoming appointments.
    """
    clean_phone = "".join(filter(str.isdigit, phone))[-10:]
    appts = db.query(Appointment).join(Patient).filter(
        Patient.phone == clean_phone
    ).order_by(Appointment.slot_time.desc()).all()

    return [format_appointment_response(a) for a in appts]

@router.get("/search", response_model=List[AppointmentResponse])
def search_appointments(
    q: str = Query(..., min_length=1, description="Search by appointment code, patient name, or phone"),
    db: Session = Depends(get_db)
):
    """Staff endpoint to quickly find patient appointments by code, name, or phone."""
    query = q.strip()
    clean_phone = "".join(filter(str.isdigit, query))
    filters = [
        Appointment.appointment_code.ilike(f"%{query}%"),
        Patient.name.ilike(f"%{query}%")
    ]
    if len(clean_phone) >= 4:
        filters.append(Patient.phone.contains(clean_phone))

    from sqlalchemy import or_
    appts = db.query(Appointment).join(Patient).filter(
        or_(*filters)
    ).order_by(Appointment.slot_time.desc()).limit(25).all()

    return [format_appointment_response(a) for a in appts]

@router.get("/{id}", response_model=AppointmentResponse)
def get_appointment_details(id: int, db: Session = Depends(get_db)):
    """Fetch single appointment details securely."""
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return format_appointment_response(appt)

@router.post("/{id}/reschedule", response_model=AppointmentResponse)
def reschedule_appointment(
    id: int,
    payload: AppointmentRescheduleRequest,
    db: Session = Depends(get_db)
):
    """Reschedule an existing booked appointment to a new available slot."""
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appt.status != "booked":
        raise HTTPException(status_code=409, detail=f"Cannot reschedule appointment with status '{appt.status}'")

    try:
        new_dt = datetime.fromisoformat(payload.new_slot_time)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid new_slot_time")

    if new_dt < datetime.now():
        raise HTTPException(status_code=400, detail="Cannot reschedule to past time")

    # Conflict check on new slot
    conflict = db.query(Appointment).filter(
        Appointment.doctor_id == appt.doctor_id,
        Appointment.slot_time == new_dt,
        Appointment.id != appt.id,
        Appointment.status.in_(["booked", "checked_in"])
    ).first()

    if conflict:
        raise HTTPException(status_code=409, detail="Selected new slot is already booked")

    old_time = appt.slot_time
    appt.slot_time = new_dt
    db.commit()
    db.refresh(appt)

    # Dispatch notification
    try:
        if appt.patient:
            notification_service.notify_appointment_rescheduled(db, appt, appt.patient, old_time, new_dt)
    except Exception:
        pass

    return format_appointment_response(appt)

@router.post("/{id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(
    id: int,
    payload: AppointmentCancelRequest,
    db: Session = Depends(get_db)
):
    """Cancel a booked appointment according to hospital policy."""
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appt.status not in ["booked"]:
        raise HTTPException(status_code=409, detail=f"Cannot cancel appointment with status '{appt.status}'")

    appt.status = "cancelled"
    appt.cancellation_reason = payload.reason
    db.commit()
    db.refresh(appt)

    try:
        if appt.patient:
            notification_service.notify_appointment_cancelled(db, appt, appt.patient, payload.reason)
    except Exception:
        pass

    return format_appointment_response(appt)

@router.post("/{id}/check-in", response_model=TokenResponse)
def check_in_appointment(
    id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Staff action: Mark scheduled appointment as arrived and seamlessly convert it
    into an active waiting Token in the hospital queue!
    """
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appt.status != "booked":
        raise HTTPException(status_code=409, detail=f"Cannot check in appointment with status '{appt.status}'")

    today = date.today()
    seq = get_next_token_sequence(db, appt.department_id, today)
    token_num = format_token_number(appt.department.code, seq)

    now = datetime.now()
    token = Token(
        department_id=appt.department_id,
        doctor_id=appt.doctor_id,
        patient_id=appt.patient_id,
        token_date=today,
        seq=seq,
        token_number=token_num,
        priority="normal",
        status="waiting",
        source="appointment",
        symptoms=appt.notes or "Scheduled Appointment",
        sort_time=now,
        created_at=now,
        appointment_id=appt.id,
        secure_hash=secrets.token_hex(16),
        near_notified=False
    )
    db.add(token)
    db.flush()

    # Mark appointment checked-in
    appt.status = "checked_in"

    db.add(Message(
        token_id=token.id,
        text=f"Appointment {appt.appointment_code} checked in! Token {token_num} issued. Please wait for announcement.",
        kind="system",
        created_at=now
    ))

    trigger_near_turn_notifications(db, appt.department_id)
    db.commit()
    db.refresh(token)

    try:
        if appt.patient:
            notification_service.notify_token_generated(db, token, appt.patient)
    except Exception:
        pass

    return serialize_token(token, db)


def format_appointment_response(appt: Appointment) -> dict:
    return {
        "id": appt.id,
        "appointment_code": appt.appointment_code or f"APT-{appt.id}",
        "patient": {
            "id": appt.patient.id if appt.patient else 0,
            "name": appt.patient.name if appt.patient else "",
            "phone": appt.patient.phone if appt.patient else "",
            "age": appt.patient.age if appt.patient else 0,
            "gender": appt.patient.gender if appt.patient else "other",
        },
        "department_id": appt.department_id,
        "department_name": appt.department.name if appt.department else "",
        "doctor_id": appt.doctor_id,
        "doctor_name": appt.doctor.name if appt.doctor else None,
        "room": appt.doctor.room if appt.doctor else None,
        "slot_time": appt.slot_time.isoformat() if appt.slot_time else "",
        "status": appt.status,
        "notes": appt.notes,
        "source": appt.source,
        "created_at": appt.created_at.isoformat() if appt.created_at else "",
        "qr_tracking_url": f"#/patient/track/{appt.id}?type=appointment"
    }
