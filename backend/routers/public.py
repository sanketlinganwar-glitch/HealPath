from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models import Department, Doctor, Token
from backend.schemas import DepartmentResponse, DoctorResponse, DisplayResponse, DisplayDepartment, DisplayServing
from backend.services.queue import (
    get_avg_consult_minutes,
    get_active_doctors_count,
    get_waiting_queue_tokens,
    get_doctor_runtime_status,
)

router = APIRouter(prefix="/api", tags=["public"])

@router.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}

@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(db: Session = Depends(get_db)):
    """List all hospital departments with active queue statistics."""
    departments = db.query(Department).all()
    result = []
    for dept in departments:
        waiting_count = db.query(Token).filter(
            Token.department_id == dept.id,
            Token.status == "waiting"
        ).count()
        in_progress_count = db.query(Token).filter(
            Token.department_id == dept.id,
            Token.status == "in_progress"
        ).count()
        active_docs = get_active_doctors_count(db, dept.id)
        avg_consult = get_avg_consult_minutes(db, dept.id)
        est_wait = round((waiting_count * avg_consult) / max(active_docs, 1)) if waiting_count > 0 else 0

        result.append({
            "id": dept.id,
            "name": dept.name,
            "code": dept.code,
            "waiting_count": waiting_count,
            "in_progress_count": in_progress_count,
            "active_doctors": active_docs,
            "avg_consult_min": avg_consult,
            "est_wait_min": est_wait,
        })
    return result

@router.get("/doctors", response_model=List[DoctorResponse])
def get_doctors(
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    db: Session = Depends(get_db)
):
    """List doctors with runtime status (available, busy, off)."""
    query = db.query(Doctor)
    if department_id:
        query = query.filter(Doctor.department_id == department_id)
    doctors = query.all()

    result = []
    for doc in doctors:
        rt_status = get_doctor_runtime_status(db, doc)
        result.append({
            "id": doc.id,
            "name": doc.name,
            "department_id": doc.department_id,
            "department_name": doc.department.name if doc.department else "",
            "specialization": doc.specialization,
            "room": doc.room,
            "status": rt_status,
        })
    return result

@router.get("/display", response_model=DisplayResponse)
def get_display_board(
    department_id: Optional[int] = Query(None, description="Optional department filter"),
    db: Session = Depends(get_db)
):
    """Full-screen digital display board data for waiting areas."""
    dept_query = db.query(Department)
    if department_id:
        dept_query = dept_query.filter(Department.id == department_id)
    departments = dept_query.all()

    dept_displays = []
    for dept in departments:
        # Currently in-progress consultations
        in_progress_tokens = db.query(Token).filter(
            Token.department_id == dept.id,
            Token.status == "in_progress"
        ).all()

        now_serving = []
        for t in in_progress_tokens:
            now_serving.append({
                "token_number": t.token_number,
                "doctor_name": t.doctor.name if t.doctor else "Doctor",
                "room": t.doctor.room if t.doctor else "Consultation Room"
            })

        # Next waiting tokens
        waiting_tokens = get_waiting_queue_tokens(db, dept.id)
        next_up = [t.token_number for t in waiting_tokens[:5]]
        waiting_count = len(waiting_tokens)

        active_docs = get_active_doctors_count(db, dept.id)
        avg_consult = get_avg_consult_minutes(db, dept.id)
        est_wait = round((waiting_count * avg_consult) / max(active_docs, 1)) if waiting_count > 0 else 0

        dept_displays.append({
            "department_id": dept.id,
            "department_name": dept.name,
            "now_serving": now_serving,
            "next_up": next_up,
            "waiting_count": waiting_count,
            "est_wait_min": est_wait,
        })

    return {"departments": dept_displays}
