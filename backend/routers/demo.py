import random
from datetime import datetime, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models import Department, Patient, Token, Message
from backend.schemas import DemoSimulateRequest
from backend.seed import seed_database
from backend.services.queue import (
    get_next_token_sequence,
    format_token_number,
    trigger_near_turn_notifications,
)

router = APIRouter(prefix="/api/demo", tags=["demo"])

SAMPLE_PATIENTS = [
    ("Vikram Deshmukh", "male", 41, "Chest heaviness and fatigue"),
    ("Sneha Kulkarni", "female", 32, "Migraine and light sensitivity"),
    ("Rajendra Shinde", "male", 65, "Knee joint stiffness"),
    ("Priyanka Jadhav", "female", 26, "Severe throat irritation and fever"),
    ("Baby Anvi Joshi", "female", 4, "High temperature and ear tugging"),
    ("Ganesh Narvekar", "male", 54, "Persistent cough and wheezing"),
    ("Sunil Chougule", "male", 48, "Backache after lifting weight"),
    ("Meenakshi Iyer", "female", 59, "Shortness of breath on walking"),
]

@router.post("/reset")
def reset_demo_data(db: Session = Depends(get_db)):
    """Wipe database and re-seed clean realistic demo data."""
    seed_database(db, force_reset=True)
    token_count = db.query(Token).count()
    return {
        "message": "reset done",
        "tokens": token_count
    }

@router.post("/simulate")
def simulate_traffic(payload: DemoSimulateRequest, db: Session = Depends(get_db)):
    """Simulate hospital traffic by adding random waiting patients."""
    count = payload.count or 5
    departments = db.query(Department).all()
    if not departments:
        return {"added": 0}

    today = date.today()
    added_count = 0

    for i in range(count):
        dept = random.choice(departments)
        name, gender, age, symptoms = random.choice(SAMPLE_PATIENTS)
        phone = f"98{random.randint(10000000, 99999999)}"

        patient = Patient(
            name=name,
            phone=phone,
            age=age,
            gender=gender,
            created_at=datetime.now()
        )
        db.add(patient)
        db.flush()

        seq = get_next_token_sequence(db, dept.id, today)
        token_num = format_token_number(dept.code, seq)
        priority = random.choice(["normal", "normal", "senior", "emergency"]) if age >= 60 else random.choice(["normal", "normal", "emergency"])

        now = datetime.now()
        token = Token(
            department_id=dept.id,
            doctor_id=None,
            patient_id=patient.id,
            token_date=today,
            seq=seq,
            token_number=token_num,
            priority=priority,
            status="waiting",
            source=random.choice(["online", "walk_in"]),
            symptoms=symptoms,
            sort_time=now,
            created_at=now,
            called_at=None,
            completed_at=None,
            near_notified=False
        )
        db.add(token)
        db.flush()

        db.add(Message(
            token_id=token.id,
            text=f"Token {token_num} created for {dept.name}.",
            kind="system",
            created_at=now
        ))

        trigger_near_turn_notifications(db, dept.id)
        added_count += 1

    db.commit()
    return {"added": added_count}
