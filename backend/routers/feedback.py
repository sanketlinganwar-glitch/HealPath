from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.db import get_db
from backend.models import Feedback, Token, Patient, Department, Doctor, User
from backend.schemas import FeedbackCreate, FeedbackResponse, FeedbackSummaryResponse
from backend.auth import require_admin, get_current_user_optional

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_patient_feedback(payload: FeedbackCreate, db: Session = Depends(get_db)):
    """
    Patient submits feedback following a consultation.
    Validates that the token exists, has been completed, and has not already been reviewed.
    """
    token = db.query(Token).filter(Token.id == payload.token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    if token.status != "completed":
        raise HTTPException(
            status_code=400,
            detail="Feedback can only be submitted for completed consultations."
        )

    # Check for duplicate submission
    existing = db.query(Feedback).filter(Feedback.token_id == token.id).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Feedback has already been submitted for this consultation turn."
        )

    feedback = Feedback(
        token_id=token.id,
        patient_id=token.patient_id,
        department_id=token.department_id,
        doctor_id=token.doctor_id,
        rating=payload.rating,
        wait_time_rating=payload.wait_time_rating,
        staff_rating=payload.staff_rating,
        comments=payload.comments.strip() if payload.comments else None,
        is_anonymous=payload.is_anonymous or False,
        is_moderated=True,
        created_at=datetime.now()
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return format_feedback_response(feedback)

@router.get("/summary", response_model=FeedbackSummaryResponse)
def get_feedback_summary(
    department_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Calculates aggregated patient ratings, department summaries, and recent reviews.
    Anonymizes patient names for public or staff viewing.
    """
    query = db.query(Feedback).filter(Feedback.is_moderated == True)
    if department_id:
        query = query.filter(Feedback.department_id == department_id)

    feedbacks = query.order_by(Feedback.created_at.desc()).all()
    total = len(feedbacks)
    if total == 0:
        return {
            "average_rating": 5.0,
            "total_reviews": 0,
            "rating_breakdown": {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0},
            "department_ratings": [],
            "recent_feedback": []
        }

    avg_rating = round(sum(f.rating for f in feedbacks) / total, 1)

    breakdown = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
    for f in feedbacks:
        key = str(f.rating)
        if key in breakdown:
            breakdown[key] += 1

    # Department wise breakdown
    dept_ratings = []
    departments = db.query(Department).all()
    for d in departments:
        dept_fb = [f for f in feedbacks if f.department_id == d.id]
        if dept_fb:
            d_avg = round(sum(f.rating for f in dept_fb) / len(dept_fb), 1)
            dept_ratings.append({
                "department_id": d.id,
                "department_name": d.name,
                "average_rating": d_avg,
                "review_count": len(dept_fb)
            })

    recent = [format_feedback_response(f) for f in feedbacks[:10]]

    return {
        "average_rating": avg_rating,
        "total_reviews": total,
        "rating_breakdown": breakdown,
        "department_ratings": dept_ratings,
        "recent_feedback": recent
    }


def format_feedback_response(fb: Feedback) -> dict:
    if fb.is_anonymous or not fb.patient:
        pat_name = "Anonymous Patient"
    else:
        # Privacy-conscious masking
        name_parts = fb.patient.name.split()
        pat_name = f"{name_parts[0]} {name_parts[-1][0]}." if len(name_parts) > 1 else name_parts[0]

    return {
        "id": fb.id,
        "token_id": fb.token_id,
        "patient_name": pat_name,
        "department_name": fb.department.name if fb.department else "General",
        "doctor_name": fb.doctor.name if fb.doctor else None,
        "rating": fb.rating,
        "wait_time_rating": fb.wait_time_rating,
        "staff_rating": fb.staff_rating,
        "comments": fb.comments,
        "is_anonymous": fb.is_anonymous,
        "created_at": fb.created_at.strftime("%d %b %Y, %I:%M %p") if fb.created_at else "",
    }
