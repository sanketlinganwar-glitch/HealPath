import secrets
from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models import Department, Doctor, Patient, Token, Message, EmergencyAuditLog
from backend.schemas import (
    TokenCreate,
    TokenResponse,
    TokenDetailResponse,
    TokenRescheduleRequest,
    MessageResponse
)
from backend.services.queue import (
    get_next_token_sequence,
    format_token_number,
    serialize_token,
    trigger_near_turn_notifications,
)
from backend.services.notification import notification_service

router = APIRouter(prefix="/api/tokens", tags=["tokens"])

@router.post("", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def create_token(payload: TokenCreate, db: Session = Depends(get_db)):
    """Generate a new patient token and place into waiting queue with secure QR hash."""
    # 0. Check idempotency if key provided
    if payload.idempotency_key:
        existing_idem = db.query(Token).filter(Token.idempotency_key == payload.idempotency_key).first()
        if existing_idem:
            return serialize_token(existing_idem, db)

    # 1. Department must exist
    department = db.query(Department).filter(Department.id == payload.department_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department does not exist"
        )

    # 2. Check duplicate active token for this phone in this department
    active_token = db.query(Token).join(Patient).filter(
        Patient.phone == payload.phone,
        Token.department_id == payload.department_id,
        Token.status.in_(["waiting", "in_progress"])
    ).first()

    if active_token:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Patient with phone {payload.phone} already has an active token ({active_token.token_number}) in {department.name}"
        )

    # 3. Find or create patient
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
        # Update details if changed
        patient.name = payload.name
        patient.age = payload.age
        patient.gender = payload.gender

    # 4. Generate daily sequence and token number
    today = date.today()
    seq = get_next_token_sequence(db, department.id, today)
    token_number = format_token_number(department.code, seq)

    now = datetime.now()
    secure_hash = secrets.token_hex(16)

    token = Token(
        department_id=department.id,
        doctor_id=None,
        patient_id=patient.id,
        token_date=today,
        seq=seq,
        token_number=token_number,
        priority=payload.priority or "normal",
        status="waiting",
        source=payload.source or "online",
        symptoms=payload.symptoms,
        sort_time=now,
        created_at=now,
        called_at=None,
        completed_at=None,
        near_notified=False,
        secure_hash=secure_hash,
        emergency_reason=payload.emergency_reason if payload.priority == "emergency" else None,
        emergency_flagged_by="patient_intake" if payload.priority == "emergency" else None,
        emergency_flagged_at=now if payload.priority == "emergency" else None,
        idempotency_key=payload.idempotency_key
    )
    db.add(token)
    db.flush()

    if payload.priority == "emergency":
        db.add(EmergencyAuditLog(
            token_id=token.id,
            action="flagged",
            old_priority="normal",
            new_priority="emergency",
            staff_username="reception",
            staff_role="receptionist",
            reason=payload.emergency_reason or "Emergency flagged at patient registration",
            created_at=now
        ))

    # Create initial system message
    initial_msg = Message(
        token_id=token.id,
        text=f"Token {token_number} generated for {department.name}. We will notify you when your turn is near.",
        kind="system",
        created_at=now
    )
    db.add(initial_msg)

    # Trigger near turn checks
    trigger_near_turn_notifications(db, department.id)
    db.commit()
    db.refresh(token)

    # Dispatch notification to patient
    try:
        notification_service.notify_token_generated(db, token, patient)
    except Exception:
        pass

    return serialize_token(token, db)

@router.get("/lookup", response_model=List[TokenResponse])
def lookup_tokens_by_phone(
    phone: str = Query(..., min_length=10, max_length=15, description="10-digit patient phone number"),
    db: Session = Depends(get_db)
):
    """Find a patient's active tokens without login."""
    clean_phone = "".join(filter(str.isdigit, phone))[-10:]
    tokens = db.query(Token).join(Patient).filter(
        Patient.phone == clean_phone,
        Token.status.in_(["waiting", "in_progress"])
    ).order_by(Token.created_at.desc()).all()

    return [serialize_token(t, db) for t in tokens]

@router.get("/secure/{secure_hash}", response_model=TokenDetailResponse)
def get_token_by_secure_hash(secure_hash: str, db: Session = Depends(get_db)):
    """
    Secure QR Token verification endpoint.
    Retrieves token tracking details via unpredictable cryptographic hash,
    preventing sequential ID guessing or enumeration attacks.
    """
    token = db.query(Token).filter(Token.secure_hash == secure_hash).first()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired QR token"
        )
    return format_token_detail(token, db)

@router.get("/{id}", response_model=TokenDetailResponse)
def get_token_details(id: int, db: Session = Depends(get_db)):
    """Track a token live with position, wait time, and now serving details."""
    token = db.query(Token).filter(Token.id == id).first()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )

    # Trigger notifications if waiting
    if token.status == "waiting":
        trigger_near_turn_notifications(db, token.department_id)
        db.commit()
        db.refresh(token)

    return format_token_detail(token, db)

@router.post("/{id}/reschedule", response_model=TokenResponse)
def reschedule_token(id: int, payload: TokenRescheduleRequest, db: Session = Depends(get_db)):
    """Delay consultation turn by 15, 30, or 60 minutes."""
    token = db.query(Token).filter(Token.id == id).first()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )

    if token.status != "waiting":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot reschedule token with status '{token.status}'. Only waiting tokens can be rescheduled."
        )

    now = datetime.now()
    new_sort_time = now + timedelta(minutes=payload.delay_minutes)
    token.sort_time = new_sort_time
    token.near_notified = False  # Reset notification state

    # System message
    msg = Message(
        token_id=token.id,
        text=f"Your token has been rescheduled by {payload.delay_minutes} minutes.",
        kind="system",
        created_at=now
    )
    db.add(msg)
    db.commit()
    db.refresh(token)

    return serialize_token(token, db)

@router.get("/{id}/messages", response_model=List[MessageResponse])
def get_token_messages(id: int, db: Session = Depends(get_db)):
    """Get system and staff messages for a token, ordered newest first."""
    token = db.query(Token).filter(Token.id == id).first()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )

    messages = db.query(Message).filter(Message.token_id == id).order_by(Message.created_at.desc()).all()
    return [
        {
            "id": m.id,
            "token_id": m.token_id,
            "text": m.text,
            "kind": m.kind,
            "created_at": m.created_at.isoformat() if m.created_at else ""
        }
        for m in messages
    ]


def format_token_detail(token: Token, db: Session) -> dict:
    token_data = serialize_token(token, db)

    now_serving_token = db.query(Token).filter(
        Token.department_id == token.department_id,
        Token.status == "in_progress"
    ).first()

    waiting_count = db.query(Token).filter(
        Token.department_id == token.department_id,
        Token.status == "waiting"
    ).count()

    token_data["now_serving"] = now_serving_token.token_number if now_serving_token else None
    token_data["department_waiting_count"] = waiting_count
    token_data["qr_tracking_url"] = f"#/patient/track/{token.id}?secure={token.secure_hash or ''}"

    return token_data
