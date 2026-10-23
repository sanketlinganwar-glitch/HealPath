from datetime import datetime, date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.db import get_db
from backend.models import Department, Doctor, Patient, Token, Message, Appointment, OTSchedule, User
from backend.schemas import (
    QueueResponse,
    StatsResponse,
    DoctorCurrentResponse,
    DoctorResponse,
    TokenResponse,
    TokenPriorityUpdate,
    MessageCreate,
    MessageResponse,
    AppointmentResponse,
    OTScheduleResponse,
    DoctorStatusUpdate,
)
from backend.services.queue import (
    get_waiting_queue_tokens,
    serialize_token,
    get_doctor_runtime_status,
    trigger_near_turn_notifications,
    get_avg_consult_minutes,
)
from backend.auth import require_staff, require_admin

router = APIRouter(prefix="/api", tags=["staff"])

@router.get("/queue", response_model=QueueResponse)
def get_department_queue(
    department_id: int = Query(..., description="Department ID to fetch queue for"),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Live queue of one department, ordered by priority and sort time."""
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    # In-progress tokens
    in_progress_tokens = db.query(Token).filter(
        Token.department_id == department_id,
        Token.status == "in_progress"
    ).all()

    # Waiting tokens (properly sorted)
    waiting_tokens = get_waiting_queue_tokens(db, department_id)

    # Skipped tokens
    skipped_tokens = db.query(Token).filter(
        Token.department_id == department_id,
        Token.status == "skipped"
    ).order_by(Token.created_at.desc()).all()

    # Completed count
    completed_count = db.query(Token).filter(
        Token.department_id == department_id,
        Token.status == "completed"
    ).count()

    return {
        "department_id": dept.id,
        "department_name": dept.name,
        "in_progress": [serialize_token(t, db) for t in in_progress_tokens],
        "waiting": [serialize_token(t, db) for t in waiting_tokens],
        "skipped": [serialize_token(t, db) for t in skipped_tokens],
        "counts": {
            "waiting": len(waiting_tokens),
            "in_progress": len(in_progress_tokens),
            "completed": completed_count,
            "skipped": len(skipped_tokens),
        }
    }

@router.get("/stats", response_model=StatsResponse)
def get_stats(
    department_id: Optional[int] = Query(None, description="Optional filter by department"),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Hospital statistics and wait metrics for today."""
    today = date.today()
    base_query = db.query(Token).filter(Token.token_date == today)
    if department_id:
        base_query = base_query.filter(Token.department_id == department_id)

    tokens_today = base_query.all()
    total = len(tokens_today)
    waiting = sum(1 for t in tokens_today if t.status == "waiting")
    in_prog = sum(1 for t in tokens_today if t.status == "in_progress")
    completed = sum(1 for t in tokens_today if t.status == "completed")
    skipped = sum(1 for t in tokens_today if t.status == "skipped")

    # Wait times (called_at - created_at)
    wait_durations = [
        (t.called_at - t.created_at).total_seconds() / 60.0
        for t in tokens_today
        if t.called_at and t.created_at and t.called_at >= t.created_at
    ]
    avg_wait = round(sum(wait_durations) / len(wait_durations)) if wait_durations else 0
    longest_wait = round(max(wait_durations)) if wait_durations else 0

    # Consult times (completed_at - called_at)
    consult_durations = [
        (t.completed_at - t.called_at).total_seconds() / 60.0
        for t in tokens_today
        if t.completed_at and t.called_at and t.completed_at >= t.called_at
    ]
    avg_consult = round(sum(consult_durations) / len(consult_durations)) if consult_durations else 8

    # By department stats
    dept_stats = []
    departments = db.query(Department).all()
    for dept in departments:
        d_tokens = [t for t in tokens_today if t.department_id == dept.id]
        d_waiting = sum(1 for t in d_tokens if t.status == "waiting")
        d_completed = sum(1 for t in d_tokens if t.status == "completed")
        d_waits = [
            (t.called_at - t.created_at).total_seconds() / 60.0
            for t in d_tokens
            if t.called_at and t.created_at and t.called_at >= t.created_at
        ]
        d_avg_wait = round(sum(d_waits) / len(d_waits)) if d_waits else 0
        dept_stats.append({
            "department_id": dept.id,
            "department_name": dept.name,
            "waiting": d_waiting,
            "completed": d_completed,
            "avg_wait_min": d_avg_wait,
        })

    # Hourly distribution
    hourly_counts = {}
    for t in tokens_today:
        h = t.created_at.hour if t.created_at else 9
        hourly_counts[h] = hourly_counts.get(h, 0) + 1
    hourly = [
        {"hour": h, "count": hourly_counts[h]}
        for h in sorted(hourly_counts.keys())
    ]

    return {
        "date": today.isoformat(),
        "total_tokens": total,
        "waiting": waiting,
        "in_progress": in_prog,
        "completed": completed,
        "skipped": skipped,
        "avg_wait_min": avg_wait,
        "avg_consult_min": avg_consult,
        "longest_wait_min": longest_wait,
        "by_department": dept_stats,
        "hourly": hourly,
    }

@router.get("/doctors/{id}/current", response_model=DoctorCurrentResponse)
def get_doctor_current_console(
    id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Doctor console state: current patient, next 3 waiting patients, and queue count."""
    doctor = db.query(Doctor).filter(Doctor.id == id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )

    current_token = db.query(Token).filter(
        Token.doctor_id == doctor.id,
        Token.status == "in_progress"
    ).first()

    waiting_tokens = get_waiting_queue_tokens(db, doctor.department_id)
    next_up = waiting_tokens[:3]

    doc_data = {
        "id": doctor.id,
        "name": doctor.name,
        "department_id": doctor.department_id,
        "department_name": doctor.department.name if doctor.department else "",
        "specialization": doctor.specialization,
        "room": doctor.room,
        "status": get_doctor_runtime_status(db, doctor),
    }

    return {
        "doctor": doc_data,
        "current": serialize_token(current_token, db) if current_token else None,
        "next_up": [serialize_token(t, db) for t in next_up],
        "waiting_count": len(waiting_tokens),
    }

@router.post("/doctors/{id}/call-next")
def call_next_patient(
    id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Doctor calls the next patient in their department.
    Single DB transaction; assigns doctor, marks in_progress, sets called_at.
    409 if doctor already has an in_progress consultation.
    """
    doctor = db.query(Doctor).filter(Doctor.id == id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )

    # Check if doctor is already seeing a patient
    active_token = db.query(Token).filter(
        Token.doctor_id == doctor.id,
        Token.status == "in_progress"
    ).first()
    if active_token:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Doctor {doctor.name} already has an active patient ({active_token.token_number}). Please complete or skip it first."
        )

    # Get first waiting token
    waiting_tokens = get_waiting_queue_tokens(db, doctor.department_id)
    if not waiting_tokens:
        return {
            "token": None,
            "message": "No patients waiting"
        }

    token = waiting_tokens[0]
    now = datetime.now()
    token.doctor_id = doctor.id
    token.status = "in_progress"
    token.called_at = now

    # Auto system message for patient
    system_msg = Message(
        token_id=token.id,
        text=f"Please go to {doctor.room}",
        kind="system",
        created_at=now
    )
    db.add(system_msg)

    # Notify next patients in line
    trigger_near_turn_notifications(db, doctor.department_id)

    db.commit()
    db.refresh(token)

    return {
        "token": serialize_token(token, db),
        "message": f"Calling {token.token_number}"
    }

@router.post("/tokens/{id}/complete", response_model=TokenResponse)
def complete_consultation(
    id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Complete an in-progress consultation."""
    token = db.query(Token).filter(Token.id == id).first()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )

    if token.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot complete token with status '{token.status}'. Must be 'in_progress'."
        )

    now = datetime.now()
    token.status = "completed"
    token.completed_at = now

    db.add(Message(
        token_id=token.id,
        text="Consultation completed. Take care!",
        kind="system",
        created_at=now
    ))

    trigger_near_turn_notifications(db, token.department_id)
    db.commit()
    db.refresh(token)

    return serialize_token(token, db)

@router.post("/tokens/{id}/skip", response_model=TokenResponse)
def skip_patient(
    id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Mark patient as skipped (no-show) from waiting or in_progress status."""
    token = db.query(Token).filter(Token.id == id).first()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )

    if token.status not in ["waiting", "in_progress"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot skip token with status '{token.status}'."
        )

    now = datetime.now()
    token.status = "skipped"
    token.near_notified = False

    db.add(Message(
        token_id=token.id,
        text="Patient did not respond when called and was marked as skipped. Please contact reception to requeue.",
        kind="system",
        created_at=now
    ))

    trigger_near_turn_notifications(db, token.department_id)
    db.commit()
    db.refresh(token)

    return serialize_token(token, db)

@router.post("/tokens/{id}/requeue", response_model=TokenResponse)
def requeue_patient(
    id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Requeue a skipped patient back to waiting queue."""
    token = db.query(Token).filter(Token.id == id).first()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )

    if token.status != "skipped":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot requeue token with status '{token.status}'. Only skipped tokens can be requeued."
        )

    now = datetime.now()
    token.status = "waiting"
    token.sort_time = now
    token.called_at = None
    token.near_notified = False

    db.add(Message(
        token_id=token.id,
        text="Patient has been requeued to the waiting queue.",
        kind="system",
        created_at=now
    ))

    trigger_near_turn_notifications(db, token.department_id)
    db.commit()
    db.refresh(token)

    return serialize_token(token, db)

@router.patch("/tokens/{id}/priority", response_model=TokenResponse)
def update_token_priority(
    id: int,
    payload: TokenPriorityUpdate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Update priority of a waiting token (emergency, senior, normal)."""
    token = db.query(Token).filter(Token.id == id).first()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )

    if token.status != "waiting":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot change priority for token with status '{token.status}'. Only waiting tokens allowed."
        )

    token.priority = payload.priority
    db.add(Message(
        token_id=token.id,
        text=f"Priority updated to '{payload.priority}'.",
        kind="staff",
        created_at=datetime.now()
    ))

    trigger_near_turn_notifications(db, token.department_id)
    db.commit()
    db.refresh(token)

    return serialize_token(token, db)

@router.post("/messages", response_model=MessageResponse)
def send_staff_message(
    payload: MessageCreate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff sends custom message or instruction to a patient token."""
    token = db.query(Token).filter(Token.id == payload.token_id).first()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )

    now = datetime.now()
    msg = Message(
        token_id=payload.token_id,
        text=payload.text,
        kind="staff",
        created_at=now
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return {
        "id": msg.id,
        "token_id": msg.token_id,
        "text": msg.text,
        "kind": msg.kind,
        "created_at": msg.created_at.isoformat()
    }

@router.get("/appointments", response_model=List[AppointmentResponse])
def get_appointments(
    department_id: Optional[int] = Query(None),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """List scheduled hospital appointments."""
    query = db.query(Appointment)
    if department_id:
        query = query.filter(Appointment.department_id == department_id)
    appts = query.order_by(Appointment.slot_time.asc()).all()

    result = []
    for a in appts:
        result.append({
            "id": a.id,
            "patient": {
                "id": a.patient.id if a.patient else 0,
                "name": a.patient.name if a.patient else "",
                "phone": a.patient.phone if a.patient else "",
                "age": a.patient.age if a.patient else 0,
                "gender": a.patient.gender if a.patient else "other",
            },
            "department_id": a.department_id,
            "doctor_id": a.doctor_id,
            "slot_time": a.slot_time.isoformat() if a.slot_time else "",
            "status": a.status,
        })
    return result

@router.get("/ot-schedule", response_model=List[OTScheduleResponse])
def get_ot_schedule(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """List operation theatre schedule."""
    ots = db.query(OTSchedule).order_by(OTSchedule.start_time.asc()).all()
    return [
        {
            "id": ot.id,
            "theatre": ot.theatre,
            "procedure": ot.procedure,
            "surgeon": ot.surgeon,
            "start_time": ot.start_time.isoformat() if ot.start_time else "",
            "end_time": ot.end_time.isoformat() if ot.end_time else "",
            "status": ot.status,
        }
        for ot in ots
    ]

@router.patch("/doctors/{id}/status", response_model=DoctorResponse)
def update_doctor_status(
    id: int,
    payload: DoctorStatusUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin only: toggle doctor availability status (available or off)."""
    doctor = db.query(Doctor).filter(Doctor.id == id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )

    doctor.status = payload.status
    db.commit()
    db.refresh(doctor)

    return {
        "id": doctor.id,
        "name": doctor.name,
        "department_id": doctor.department_id,
        "department_name": doctor.department.name if doctor.department else "",
        "specialization": doctor.specialization,
        "room": doctor.room,
        "status": get_doctor_runtime_status(db, doctor),
    }
