import io
import csv
from datetime import datetime, date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.db import get_db
from backend.models import (
    Department, Doctor, Patient, Token, Message, Appointment, OTSchedule, User,
    EmergencyAuditLog, NotificationLog, Feedback, Prescription
)
from backend.schemas import (
    QueueResponse,
    StatsResponse,
    DoctorCurrentResponse,
    DoctorResponse,
    DoctorStatusUpdate,
    DoctorRosterUpdate,
    TokenResponse,
    TokenPriorityUpdate,
    MessageCreate,
    MessageResponse,
    AppointmentResponse,
    OTScheduleResponse,
    EmergencyFlagRequest,
    EmergencyVerifyRequest,
    EmergencyAuditLogResponse,
    NotificationLogResponse,
    AdminAnalyticsResponse,
    DepartmentStat,
    DoctorAnalyticsStat,
    HourlyStat
)
from backend.services.queue import (
    get_waiting_queue_tokens,
    serialize_token,
    get_doctor_runtime_status,
    trigger_near_turn_notifications,
    get_avg_consult_minutes,
    get_active_doctors_count
)
from backend.services.notification import notification_service
from backend.auth import require_staff, require_admin

router = APIRouter(prefix="/api", tags=["staff"])

@router.get("/queue", response_model=QueueResponse)
def get_department_queue(
    department_id: int = Query(..., description="Department ID to fetch queue for"),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Live queue of one department, ordered by priority (emergency first) and sort time."""
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

    # Waiting tokens (properly sorted: emergency -> senior -> normal)
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

    emergency_count = sum(1 for t in waiting_tokens if t.priority == "emergency")

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
            "emergency": emergency_count,
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
    emergency_count = sum(1 for t in tokens_today if t.priority == "emergency")

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
        "emergency_count": emergency_count,
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
        "duty_status": getattr(doctor, "duty_status", "available"),
        "shift_start": getattr(doctor, "shift_start", "09:00"),
        "shift_end": getattr(doctor, "shift_end", "17:00"),
        "break_start": getattr(doctor, "break_start", "13:00"),
        "break_end": getattr(doctor, "break_end", "14:00"),
        "registration_number": getattr(doctor, "registration_number", None),
        "qualification": getattr(doctor, "qualification", None),
        "image_url": getattr(doctor, "image_url", None),
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
    Assigns doctor, marks in_progress, sets called_at, and dispatches real-time notification.
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

    # Get first waiting token (emergency will be first naturally)
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

    # Dispatch notification to called patient
    try:
        if token.patient:
            notification_service.notify_doctor_called(db, token, token.patient, doctor)
    except Exception:
        pass

    # Dispatch hardware display event for LED 7-segment cabin displays
    try:
        from backend.services.hardware_gateway import hardware_gateway
        cabin = doctor.room.replace("Room ", "").replace("Cabin ", "").strip() if doctor and doctor.room else "101"
        hardware_gateway.dispatch_display_event(
            event_type="CALL_NEXT",
            token_number=token.token_number,
            cabin_id=cabin,
            department_id=doctor.department_id if doctor else None
        )
    except Exception:
        pass

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

    # Dispatch consultation completed notification to patient
    try:
        if token.patient:
            notification_service.notify_consultation_completed(db, token, token.patient)
    except Exception:
        pass

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

    old_priority = token.priority
    token.priority = payload.priority

    db.add(Message(
        token_id=token.id,
        text=f"Priority updated to '{payload.priority}'.",
        kind="staff",
        created_at=datetime.now()
    ))

    db.add(EmergencyAuditLog(
        token_id=token.id,
        action="priority_changed",
        old_priority=old_priority,
        new_priority=payload.priority,
        staff_username=current_user.username,
        staff_role=current_user.role,
        reason=payload.reason or f"Priority manually set to {payload.priority} by staff",
        created_at=datetime.now()
    ))

    trigger_near_turn_notifications(db, token.department_id)
    db.commit()
    db.refresh(token)

    return serialize_token(token, db)

# --- Feature 4: Controlled Emergency Patient Priority ---

@router.post("/tokens/{id}/emergency-flag", response_model=TokenResponse)
def flag_emergency_patient(
    id: int,
    payload: EmergencyFlagRequest,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Authorized reception or triage staff flags patient for urgent assessment.
    Records justification, staff username, and timestamps an audit record.
    """
    token = db.query(Token).filter(Token.id == id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    if token.status != "waiting":
        raise HTTPException(status_code=409, detail="Only waiting tokens can be flagged for emergency assessment")

    old_priority = token.priority
    now = datetime.now()

    token.priority = "emergency"
    token.emergency_reason = payload.reason
    token.emergency_flagged_by = current_user.username
    token.emergency_flagged_at = now
    # Move token to the top of the queue immediately
    token.sort_time = now - timedelta(days=1)

    db.add(EmergencyAuditLog(
        token_id=token.id,
        action="flagged",
        old_priority=old_priority,
        new_priority="emergency",
        staff_username=current_user.username,
        staff_role=current_user.role,
        reason=payload.reason,
        created_at=now
    ))

    db.add(Message(
        token_id=token.id,
        text=f"EMERGENCY PRIORITY FLAGGED: {payload.reason}. Clinical verification pending.",
        kind="staff",
        created_at=now
    ))

    trigger_near_turn_notifications(db, token.department_id)
    db.commit()
    db.refresh(token)

    return serialize_token(token, db)

@router.post("/tokens/{id}/emergency-verify", response_model=TokenResponse)
def verify_emergency_patient(
    id: int,
    payload: EmergencyVerifyRequest,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Clinical staff (Doctor / Senior Triage) verifies, adjusts, or cancels an emergency flag.
    Maintains complete audit logging and adjusts queue sorting.
    """
    token = db.query(Token).filter(Token.id == id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    old_priority = token.priority
    now = datetime.now()

    if payload.action == "verify_emergency":
        token.priority = "emergency"
        token.emergency_verified_by = current_user.name
        action_name = "verified"
        msg_text = f"Emergency verified by {current_user.name}: {payload.clinical_notes}"
    elif payload.action == "downgrade_senior":
        token.priority = "senior"
        token.sort_time = now
        action_name = "downgraded_senior"
        msg_text = f"Triage adjusted to Senior Priority by {current_user.name}: {payload.clinical_notes}"
    else:
        token.priority = "normal"
        token.sort_time = now
        action_name = "cancelled_emergency"
        msg_text = f"Emergency flag cleared by {current_user.name}: {payload.clinical_notes}"

    db.add(EmergencyAuditLog(
        token_id=token.id,
        action=action_name,
        old_priority=old_priority,
        new_priority=token.priority,
        staff_username=current_user.username,
        staff_role=current_user.role,
        reason=payload.clinical_notes,
        created_at=now
    ))

    db.add(Message(
        token_id=token.id,
        text=msg_text,
        kind="staff",
        created_at=now
    ))

    trigger_near_turn_notifications(db, token.department_id)
    db.commit()
    db.refresh(token)

    return serialize_token(token, db)

@router.get("/tokens/{id}/emergency-audit", response_model=List[EmergencyAuditLogResponse])
def get_emergency_audit_logs(
    id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Fetches audit trail of emergency flags and clinical priority adjustments."""
    logs = db.query(EmergencyAuditLog).filter(EmergencyAuditLog.token_id == id).order_by(EmergencyAuditLog.created_at.desc()).all()
    return [
        {
            "id": l.id,
            "token_id": l.token_id,
            "action": l.action,
            "old_priority": l.old_priority,
            "new_priority": l.new_priority,
            "staff_username": l.staff_username,
            "staff_role": l.staff_role,
            "reason": l.reason,
            "created_at": l.created_at.isoformat() if l.created_at else ""
        }
        for l in logs
    ]

# --- Feature 7: Doctor Availability and Duty Roster ---

@router.patch("/doctors/{id}/roster", response_model=DoctorResponse)
def update_doctor_duty_roster(
    id: int,
    payload: DoctorRosterUpdate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Staff / Doctor updates duty roster: working hours, scheduled breaks, and current duty status
    ('available', 'busy', 'on_break', 'off_duty').
    """
    doctor = db.query(Doctor).filter(Doctor.id == id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    doctor.duty_status = payload.duty_status
    if payload.duty_status == "off_duty":
        doctor.status = "off"
    else:
        doctor.status = "available"

    if payload.shift_start:
        doctor.shift_start = payload.shift_start
    if payload.shift_end:
        doctor.shift_end = payload.shift_end
    if payload.break_start:
        doctor.break_start = payload.break_start
    if payload.break_end:
        doctor.break_end = payload.break_end

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
        "duty_status": doctor.duty_status,
        "shift_start": doctor.shift_start,
        "shift_end": doctor.shift_end,
        "break_start": doctor.break_start,
        "break_end": doctor.break_end,
    }

@router.post("/doctors/{id}/reassign-queue")
def reassign_doctor_queue(
    id: int,
    target_doctor_id: int = Query(..., description="Target doctor to reassign waiting queue to"),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Safely reassigns all active waiting tokens from an unavailable doctor to another available
    doctor within the same department.
    """
    source_doc = db.query(Doctor).filter(Doctor.id == id).first()
    target_doc = db.query(Doctor).filter(Doctor.id == target_doctor_id).first()

    if not source_doc or not target_doc:
        raise HTTPException(status_code=404, detail="Doctor not found")

    if source_doc.department_id != target_doc.department_id:
        raise HTTPException(status_code=400, detail="Can only reassign within the same medical department")

    waiting_tokens = db.query(Token).filter(
        Token.doctor_id == source_doc.id,
        Token.status == "waiting"
    ).all()

    for t in waiting_tokens:
        t.doctor_id = target_doc.id
        db.add(Message(
            token_id=t.id,
            text=f"Queue update: Dr. {source_doc.name} is off duty. You have been reassigned to Dr. {target_doc.name} at {target_doc.room}.",
            kind="system",
            created_at=datetime.now()
        ))

    db.commit()

    return {
        "success": True,
        "reassigned_count": len(waiting_tokens),
        "source_doctor": source_doc.name,
        "target_doctor": target_doc.name
    }

# --- Feature 5: Advanced Hospital Analytics ---

@router.get("/admin/analytics", response_model=AdminAnalyticsResponse)
def get_advanced_analytics(
    range: str = Query("today", pattern="^(today|weekly|monthly)$"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Advanced real-time analytics aggregating patient intake, consultation throughput,
    wait times, doctor workloads, and notification metrics over customizable date ranges.
    """
    today = date.today()
    if range == "weekly":
        start_date = today - timedelta(days=7)
    elif range == "monthly":
        start_date = today - timedelta(days=30)
    else:
        start_date = today

    tokens = db.query(Token).filter(Token.token_date >= start_date, Token.token_date <= today).all()
    appointments = db.query(Appointment).filter(Appointment.created_at >= datetime.combine(start_date, datetime.min.time())).all()
    notifications = db.query(NotificationLog).filter(NotificationLog.created_at >= datetime.combine(start_date, datetime.min.time())).all()

    total_registered_patients = db.query(Patient).count()
    total_tokens = len(tokens)
    waiting_count = sum(1 for t in tokens if t.status == "waiting")
    in_prog_count = sum(1 for t in tokens if t.status == "in_progress")
    completed_count = sum(1 for t in tokens if t.status == "completed")
    skipped_count = sum(1 for t in tokens if t.status == "skipped")
    emergency_count = sum(1 for t in tokens if t.priority == "emergency")

    # Wait times
    wait_durations = [
        (t.called_at - t.created_at).total_seconds() / 60.0
        for t in tokens
        if t.called_at and t.created_at and t.called_at >= t.created_at
    ]
    avg_wait = round(sum(wait_durations) / len(wait_durations)) if wait_durations else 0

    consult_durations = [
        (t.completed_at - t.called_at).total_seconds() / 60.0
        for t in tokens
        if t.completed_at and t.called_at and t.completed_at >= t.called_at
    ]
    avg_consult = round(sum(consult_durations) / len(consult_durations)) if consult_durations else 8

    appts_booked = len(appointments)
    appts_cancelled = sum(1 for a in appointments if a.status == "cancelled")

    notifs_sent = sum(1 for n in notifications if n.status == "sent")
    notifs_simulated = sum(1 for n in notifications if n.status == "simulated")

    # Department breakdown
    dept_stats = []
    departments = db.query(Department).all()
    for d in departments:
        d_tokens = [t for t in tokens if t.department_id == d.id]
        d_waits = [
            (t.called_at - t.created_at).total_seconds() / 60.0
            for t in d_tokens
            if t.called_at and t.created_at and t.called_at >= t.created_at
        ]
        dept_stats.append({
            "department_id": d.id,
            "department_name": d.name,
            "waiting": sum(1 for t in d_tokens if t.status == "waiting"),
            "completed": sum(1 for t in d_tokens if t.status == "completed"),
            "avg_wait_min": round(sum(d_waits) / len(d_waits)) if d_waits else 0
        })

    # Doctor breakdown
    doctor_stats = []
    doctors = db.query(Doctor).all()
    for doc in doctors:
        doc_tokens = [t for t in tokens if t.doctor_id == doc.id and t.status == "completed"]
        c_durations = [
            (t.completed_at - t.called_at).total_seconds() / 60.0
            for t in doc_tokens
            if t.completed_at and t.called_at and t.completed_at >= t.called_at
        ]
        doctor_stats.append({
            "doctor_id": doc.id,
            "doctor_name": doc.name,
            "department_name": doc.department.name if doc.department else "",
            "consultations_completed": len(doc_tokens),
            "avg_consult_duration_min": round(sum(c_durations) / len(c_durations)) if c_durations else 8,
            "status": doc.status
        })

    # Hourly distribution
    hourly_counts = {}
    for t in tokens:
        h = t.created_at.hour if t.created_at else 9
        hourly_counts[h] = hourly_counts.get(h, 0) + 1
    hourly = [{"hour": h, "count": hourly_counts[h]} for h in sorted(hourly_counts.keys())]

    return {
        "time_range": range,
        "start_date": start_date.isoformat(),
        "end_date": today.isoformat(),
        "total_registered_patients": total_registered_patients,
        "total_tokens_generated": total_tokens,
        "waiting_patients": waiting_count,
        "in_consultation_patients": in_prog_count,
        "completed_consultations": completed_count,
        "cancelled_or_skipped_tokens": skipped_count,
        "emergency_cases_count": emergency_count,
        "avg_wait_time_min": avg_wait,
        "avg_consult_time_min": avg_consult,
        "appointments_booked": appts_booked,
        "appointments_cancelled": appts_cancelled,
        "notifications_sent_count": notifs_sent,
        "notifications_simulated_count": notifs_simulated,
        "department_stats": dept_stats,
        "doctor_stats": doctor_stats,
        "hourly_trends": hourly,
    }

@router.get("/admin/analytics/export")
def export_analytics_csv(
    range: str = Query("today", pattern="^(today|weekly|monthly)$"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Generates and exports administrative hospital report as a CSV file."""
    analytics = get_advanced_analytics(range=range, current_user=current_user, db=db)
    
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["HEALPATH 2.0 - HOSPITAL MANAGEMENT ANALYTICS REPORT"])
    writer.writerow(["Report Range", analytics["time_range"]])
    writer.writerow(["From Date", analytics["start_date"], "To Date", analytics["end_date"]])
    writer.writerow([])

    writer.writerow(["METRIC", "VALUE"])
    writer.writerow(["Total Registered Patients", analytics["total_registered_patients"]])
    writer.writerow(["Total Tokens Generated", analytics["total_tokens_generated"]])
    writer.writerow(["Completed Consultations", analytics["completed_consultations"]])
    writer.writerow(["Currently Waiting", analytics["waiting_patients"]])
    writer.writerow(["Cancelled/Skipped Tokens", analytics["cancelled_or_skipped_tokens"]])
    writer.writerow(["Emergency Cases", analytics["emergency_cases_count"]])
    writer.writerow(["Avg Wait Time (Minutes)", analytics["avg_wait_time_min"]])
    writer.writerow(["Avg Consult Time (Minutes)", analytics["avg_consult_time_min"]])
    writer.writerow(["Appointments Booked", analytics["appointments_booked"]])
    writer.writerow(["Appointments Cancelled", analytics["appointments_cancelled"]])
    writer.writerow([])

    writer.writerow(["DEPARTMENT-WISE BREAKDOWN"])
    writer.writerow(["Department", "Waiting", "Completed", "Avg Wait (Min)"])
    for ds in analytics["department_stats"]:
        writer.writerow([ds["department_name"], ds["waiting"], ds["completed"], ds["avg_wait_min"]])
    writer.writerow([])

    writer.writerow(["DOCTOR CONSULTATION STATS"])
    writer.writerow(["Doctor", "Department", "Completed Consultations", "Avg Consult (Min)", "Status"])
    for doc in analytics["doctor_stats"]:
        writer.writerow([doc["doctor_name"], doc["department_name"], doc["consultations_completed"], doc["avg_consult_duration_min"], doc["status"]])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=healpath_report_{range}_{date.today().isoformat()}.csv"}
    )

@router.get("/admin/notifications", response_model=List[NotificationLogResponse])
def get_notification_logs(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """View recent notification delivery and simulation logs."""
    logs = db.query(NotificationLog).order_by(NotificationLog.created_at.desc()).limit(50).all()
    return [
        {
            "id": n.id,
            "recipient_phone": n.recipient_phone,
            "recipient_name": n.recipient_name,
            "channel": n.channel,
            "event_type": n.event_type,
            "message_body": n.message_body,
            "status": n.status,
            "reference_type": n.reference_type,
            "reference_id": n.reference_id,
            "error_detail": n.error_detail,
            "created_at": n.created_at.strftime("%d %b %Y, %I:%M %p") if n.created_at else ""
        }
        for n in logs
    ]

# --- Existing Staff Endpoints Preserved ---

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
    """List scheduled hospital appointments with staff authorization."""
    query = db.query(Appointment)
    if department_id:
        query = query.filter(Appointment.department_id == department_id)
    appts = query.order_by(Appointment.slot_time.asc()).all()

    result = []
    for a in appts:
        result.append({
            "id": a.id,
            "appointment_code": a.appointment_code or f"APT-{a.id}",
            "patient": {
                "id": a.patient.id if a.patient else 0,
                "name": a.patient.name if a.patient else "",
                "phone": a.patient.phone if a.patient else "",
                "age": a.patient.age if a.patient else 0,
                "gender": a.patient.gender if a.patient else "other",
            },
            "department_id": a.department_id,
            "department_name": a.department.name if a.department else "",
            "doctor_id": a.doctor_id,
            "doctor_name": a.doctor.name if a.doctor else None,
            "room": a.doctor.room if a.doctor else None,
            "slot_time": a.slot_time.isoformat() if a.slot_time else "",
            "status": a.status,
            "notes": a.notes,
            "source": a.source or "online",
            "created_at": a.created_at.isoformat() if a.created_at else "",
            "qr_tracking_url": f"#/patient/track/{a.id}?type=appointment"
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
    if payload.status == "off":
        doctor.duty_status = "off_duty"
    else:
        doctor.duty_status = "available"

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
        "duty_status": doctor.duty_status,
        "shift_start": doctor.shift_start,
        "shift_end": doctor.shift_end,
        "break_start": doctor.break_start,
        "break_end": doctor.break_end,
    }
