from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.services.analytics_service import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["Advanced Analytics"])


@router.get("/department-heatmap")
def get_department_heatmap(
    range: str = Query("today", description="Time range: today, 7d, 30d, custom"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD for custom range"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD for custom range"),
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    db: Session = Depends(get_db)
):
    """
    Returns hourly OPD arrival, completion, and bottleneck congestion heatmaps.
    Congestion rated as Normal, Moderate, High, or Critical.
    """
    return analytics_service.get_department_bottleneck_heatmap(
        db=db,
        time_range=range,
        start_date=start_date,
        end_date=end_date,
        department_id=department_id,
        doctor_id=doctor_id
    )


@router.get("/consultation-velocity")
def get_consultation_velocity(
    range: str = Query("today", description="Time range: today, 7d, 30d, custom"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD for custom range"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD for custom range"),
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    db: Session = Depends(get_db)
):
    """
    Returns consultation velocity metrics including completions/hour,
    average consultation duration, doctor workloads, and walk-in vs. appointment ratios.
    """
    return analytics_service.get_consultation_velocity(
        db=db,
        time_range=range,
        start_date=start_date,
        end_date=end_date,
        department_id=department_id,
        doctor_id=doctor_id
    )


@router.get("/summary")
def get_analytics_summary(
    range: str = Query("today"),
    db: Session = Depends(get_db)
):
    """Combined summary of heatmap and velocity for dashboard rendering."""
    heatmap = analytics_service.get_department_bottleneck_heatmap(db, time_range=range)
    velocity = analytics_service.get_consultation_velocity(db, time_range=range)
    return {
        "heatmap": heatmap,
        "velocity": velocity
    }
