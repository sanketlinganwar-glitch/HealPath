from datetime import datetime, date
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models import Department, Doctor, Patient, Token, Message

PRIORITY_MAP = {
    "emergency": 0,
    "senior": 1,
    "normal": 2,
}

def get_priority_rank(priority: str) -> int:
    return PRIORITY_MAP.get(priority.lower() if priority else "normal", 2)

def get_next_token_sequence(db: Session, department_id: int, target_date: date) -> int:
    """Finds maximum sequence for the given department and date, returning next sequence int."""
    max_seq = db.query(func.max(Token.seq)).filter(
        Token.department_id == department_id,
        Token.token_date == target_date
    ).scalar()
    return (max_seq or 0) + 1

def format_token_number(dept_code: str, seq: int) -> str:
    """Format token string e.g. C-012."""
    return f"{dept_code}-{seq:03d}"

def get_active_doctors_count(db: Session, department_id: int) -> int:
    """Counts doctors in department whose status in DB is not 'off'."""
    return db.query(Doctor).filter(
        Doctor.department_id == department_id,
        Doctor.status != "off"
    ).count()

def get_avg_consult_minutes(db: Session, department_id: int) -> int:
    """
    Average duration of the last 10 completed consultations in this department.
    Defaults to department.default_consult_min (typically 8 min).
    """
    completed_tokens = db.query(Token).filter(
        Token.department_id == department_id,
        Token.status == "completed",
        Token.called_at.isnot(None),
        Token.completed_at.isnot(None)
    ).order_by(Token.completed_at.desc()).limit(10).all()

    if not completed_tokens:
        dept = db.query(Department).filter(Department.id == department_id).first()
        return dept.default_consult_min if dept and dept.default_consult_min else 8

    durations = [
        (t.completed_at - t.called_at).total_seconds() / 60.0
        for t in completed_tokens
        if t.completed_at and t.called_at and t.completed_at >= t.called_at
    ]

    if not durations:
        dept = db.query(Department).filter(Department.id == department_id).first()
        return dept.default_consult_min if dept and dept.default_consult_min else 8

    avg_val = sum(durations) / len(durations)
    return max(1, round(avg_val))

def get_waiting_queue_tokens(db: Session, department_id: int) -> List[Token]:
    """
    Returns sorted list of waiting tokens for department:
    Order: Priority rank (emergency 0, senior 1, normal 2), then sort_time asc.
    """
    tokens = db.query(Token).filter(
        Token.department_id == department_id,
        Token.status == "waiting"
    ).all()

    # Sort in Python to handle priority mapping reliably
    tokens.sort(key=lambda t: (get_priority_rank(t.priority), t.sort_time or t.created_at or datetime.min))
    return tokens

def trigger_near_turn_notifications(db: Session, department_id: int):
    """
    Checks waiting queue. When a waiting token reaches people_ahead <= 2,
    creates a system message (once) and sets near_notified = True.
    """
    waiting = get_waiting_queue_tokens(db, department_id)
    for idx, token in enumerate(waiting):
        people_ahead = idx
        if people_ahead <= 2 and not token.near_notified:
            msg = Message(
                token_id=token.id,
                text="Your turn is near. Please be ready near the consultation room.",
                kind="system",
                created_at=datetime.now()
            )
            db.add(msg)
            token.near_notified = True

def get_token_position_and_wait(db: Session, token: Token) -> Tuple[Optional[int], Optional[int], Optional[int]]:
    """
    Returns (position, people_ahead, est_wait_min) for waiting token,
    or (None, None, None) if not waiting.
    """
    if token.status != "waiting":
        return None, None, None

    waiting_list = get_waiting_queue_tokens(db, token.department_id)
    for idx, t in enumerate(waiting_list):
        if t.id == token.id:
            position = idx + 1
            people_ahead = idx
            avg_consult = get_avg_consult_minutes(db, token.department_id)
            active_docs = max(1, get_active_doctors_count(db, token.department_id))
            est_wait = round((people_ahead * avg_consult) / active_docs)
            return position, people_ahead, est_wait

    return None, None, None

def get_doctor_runtime_status(db: Session, doctor: Doctor) -> str:
    """
    Doctor status:
    - 'off' if doctor.status in DB is 'off'
    - 'busy' if doctor currently has an in_progress token
    - 'available' otherwise
    """
    if doctor.status == "off":
        return "off"
    
    in_progress = db.query(Token).filter(
        Token.doctor_id == doctor.id,
        Token.status == "in_progress"
    ).first()
    if in_progress:
        return "busy"
    return "available"

def serialize_token(
    token: Token,
    db: Session,
    pos_info: Optional[Tuple[Optional[int], Optional[int], Optional[int]]] = None
) -> dict:
    """Converts Token model to dictionary matching TokenResponse schema."""
    if pos_info is not None:
        position, people_ahead, est_wait_min = pos_info
    else:
        position, people_ahead, est_wait_min = get_token_position_and_wait(db, token)

    patient_dict = {
        "id": token.patient.id if token.patient else 0,
        "name": token.patient.name if token.patient else "",
        "phone": token.patient.phone if token.patient else "",
        "age": token.patient.age if token.patient else 0,
        "gender": token.patient.gender if token.patient else "other",
    }

    room = token.doctor.room if token.doctor else None

    return {
        "id": token.id,
        "token_number": token.token_number,
        "department_id": token.department_id,
        "department_name": token.department.name if token.department else "",
        "doctor_id": token.doctor_id,
        "doctor_name": token.doctor.name if token.doctor else None,
        "patient": patient_dict,
        "priority": token.priority,
        "status": token.status,
        "source": token.source,
        "symptoms": token.symptoms,
        "position": position,
        "people_ahead": people_ahead,
        "est_wait_min": est_wait_min,
        "created_at": token.created_at.isoformat() if token.created_at else "",
        "called_at": token.called_at.isoformat() if token.called_at else None,
        "completed_at": token.completed_at.isoformat() if token.completed_at else None,
        "room": room,
    }
