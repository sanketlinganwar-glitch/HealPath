import logging
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from backend.models import Token, Department, Doctor, Appointment

logger = logging.getLogger(__name__)

class AnalyticsService:
    """
    Hospital Department Analytics & Congestion Bottleneck Service:
    - Hourly OPD arrival & consultation throughput
    - Department Bottleneck Heatmap with 4-tier congestion scoring (Normal, Moderate, High, Critical)
    - Consultation Velocity (completions/hour, average consult duration, wait times)
    - Multi-window filtering (today, 7d, 30d, custom range)
    - Doctor-wise workload distribution & walk-in vs. appointment ratios
    - Graceful insufficient data tagging with sample size alerts
    """

    # Congestion thresholds in minutes
    THRESHOLDS = {
        "normal": {"wait_min": 15, "queue_len": 5},
        "moderate": {"wait_min": 30, "queue_len": 10},
        "high": {"wait_min": 45, "queue_len": 15},
    }

    def _determine_congestion_level(self, avg_wait_min: float, queue_len: int) -> str:
        """Categorizes congestion into Normal, Moderate, High, or Critical."""
        if avg_wait_min > self.THRESHOLDS["high"]["wait_min"] or queue_len > self.THRESHOLDS["high"]["queue_len"]:
            return "Critical"
        elif avg_wait_min > self.THRESHOLDS["moderate"]["wait_min"] or queue_len > self.THRESHOLDS["moderate"]["queue_len"]:
            return "High"
        elif avg_wait_min > self.THRESHOLDS["normal"]["wait_min"] or queue_len > self.THRESHOLDS["normal"]["queue_len"]:
            return "Moderate"
        return "Normal"

    def get_department_bottleneck_heatmap(
        self,
        db: Session,
        time_range: str = "today",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        department_id: Optional[int] = None,
        doctor_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Computes department bottleneck heatmap across hours of the day (09:00 to 18:00).
        """
        today = date.today()
        if time_range == "today":
            filter_start = today
            filter_end = today
        elif time_range == "7d":
            filter_start = today - timedelta(days=7)
            filter_end = today
        elif time_range == "30d":
            filter_start = today - timedelta(days=30)
            filter_end = today
        elif time_range == "custom" and start_date and end_date:
            try:
                filter_start = datetime.strptime(start_date, "%Y-%m-%d").date()
                filter_end = datetime.strptime(end_date, "%Y-%m-%d").date()
            except ValueError:
                filter_start = today
                filter_end = today
        else:
            filter_start = today
            filter_end = today

        # Base token query
        query = db.query(Token).filter(
            Token.token_date >= filter_start,
            Token.token_date <= filter_end
        )

        if department_id:
            query = query.filter(Token.department_id == department_id)
        if doctor_id:
            query = query.filter(Token.doctor_id == doctor_id)

        tokens = query.all()
        sample_size = len(tokens)
        insufficient_data = sample_size < 5

        departments = db.query(Department).all()
        if department_id:
            departments = [d for d in departments if d.id == department_id]

        # Operating hours: 9 AM to 6 PM (9 to 18)
        hours = list(range(9, 19))
        heatmap_data = []

        dept_summary = {}

        for dept in departments:
            dept_tokens = [t for t in tokens if t.department_id == dept.id]
            hourly_cells = []

            for h in hours:
                # Tokens created in hour h
                h_arrivals = [t for t in dept_tokens if t.created_at and t.created_at.hour == h]
                # Tokens completed in hour h
                h_completions = [t for t in dept_tokens if t.completed_at and t.completed_at.hour == h]
                # Tokens in progress or waiting
                h_waiting = [t for t in dept_tokens if t.status == "waiting" and t.created_at and t.created_at.hour <= h]

                # Calculate avg wait for completed tokens in this hour
                waits = []
                for t in h_completions:
                    if t.called_at and t.created_at:
                        diff = (t.called_at - t.created_at).total_seconds() / 60.0
                        if diff >= 0:
                            waits.append(diff)

                avg_wait = round(sum(waits) / len(waits), 1) if waits else (dept.default_consult_min if h_arrivals else 0.0)
                congestion = self._determine_congestion_level(avg_wait, len(h_arrivals))

                hourly_cells.append({
                    "hour": h,
                    "hour_label": f"{h:02d}:00",
                    "arrivals": len(h_arrivals),
                    "completions": len(h_completions),
                    "waiting": len(h_waiting),
                    "avg_wait_min": avg_wait,
                    "congestion_level": congestion
                })

            total_dept_tokens = len(dept_tokens)
            completed_dept_tokens = [t for t in dept_tokens if t.status == "completed"]
            waiting_dept_tokens = [t for t in dept_tokens if t.status == "waiting"]
            in_progress_dept_tokens = [t for t in dept_tokens if t.status == "in_progress"]

            dept_summary[dept.name] = {
                "department_id": dept.id,
                "department_code": dept.code,
                "total": total_dept_tokens,
                "completed": len(completed_dept_tokens),
                "waiting": len(waiting_dept_tokens),
                "in_progress": len(in_progress_dept_tokens),
                "peak_hour": max(hourly_cells, key=lambda x: x["arrivals"])["hour_label"] if hourly_cells else "N/A"
            }

            heatmap_data.append({
                "department_id": dept.id,
                "department_name": dept.name,
                "department_code": dept.code,
                "hourly_cells": hourly_cells,
                "summary": dept_summary[dept.name]
            })

        # Overall congestion alerts
        alerts = []
        for h_row in heatmap_data:
            critical_hours = [c["hour_label"] for c in h_row["hourly_cells"] if c["congestion_level"] in ["High", "Critical"]]
            if critical_hours:
                alerts.append({
                    "department": h_row["department_name"],
                    "severity": "critical" if any(c["congestion_level"] == "Critical" for c in h_row["hourly_cells"]) else "warning",
                    "message": f"{h_row['department_name']} experienced high congestion around {', '.join(critical_hours[:3])}.",
                    "hours": critical_hours
                })

        return {
            "time_range": time_range,
            "start_date": str(filter_start),
            "end_date": str(filter_end),
            "sample_size": sample_size,
            "insufficient_data": insufficient_data,
            "insufficient_data_note": "Sample size is under 5 tokens. Metrics reflect simulated baseline estimates." if insufficient_data else None,
            "heatmap": heatmap_data,
            "department_summaries": dept_summary,
            "bottleneck_alerts": alerts
        }

    def get_consultation_velocity(
        self,
        db: Session,
        time_range: str = "today",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        department_id: Optional[int] = None,
        doctor_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Calculates consultation velocity:
        - Completions per hour
        - Average consultation duration (called_at to completed_at)
        - Average queue wait time (created_at to called_at)
        - Doctor-wise workload distribution
        - Walk-in vs. scheduled appointment ratio
        """
        today = date.today()
        if time_range == "today":
            filter_start = today
            filter_end = today
        elif time_range == "7d":
            filter_start = today - timedelta(days=7)
            filter_end = today
        elif time_range == "30d":
            filter_start = today - timedelta(days=30)
            filter_end = today
        elif time_range == "custom" and start_date and end_date:
            try:
                filter_start = datetime.strptime(start_date, "%Y-%m-%d").date()
                filter_end = datetime.strptime(end_date, "%Y-%m-%d").date()
            except ValueError:
                filter_start = today
                filter_end = today
        else:
            filter_start = today
            filter_end = today

        query = db.query(Token).filter(
            Token.token_date >= filter_start,
            Token.token_date <= filter_end
        )

        if department_id:
            query = query.filter(Token.department_id == department_id)
        if doctor_id:
            query = query.filter(Token.doctor_id == doctor_id)

        tokens = query.all()
        sample_size = len(tokens)
        insufficient_data = sample_size < 5

        # Durations
        consult_durations = []
        wait_durations = []

        completed_tokens = [t for t in tokens if t.status == "completed"]
        for t in completed_tokens:
            if t.called_at and t.completed_at:
                c_min = (t.completed_at - t.called_at).total_seconds() / 60.0
                if 1.0 <= c_min <= 120.0:  # Reasonable doctor consult range
                    consult_durations.append(c_min)

            if t.created_at and t.called_at:
                w_min = (t.called_at - t.created_at).total_seconds() / 60.0
                if w_min >= 0:
                    wait_durations.append(w_min)

        avg_consult_duration = round(sum(consult_durations) / len(consult_durations), 1) if consult_durations else 8.5
        avg_wait_duration = round(sum(wait_durations) / len(wait_durations), 1) if wait_durations else 12.0

        # Hourly velocity across the operating day (9 to 18)
        hourly_velocity = []
        for h in range(9, 19):
            h_completed = [t for t in completed_tokens if t.completed_at and t.completed_at.hour == h]
            hourly_velocity.append({
                "hour": h,
                "hour_label": f"{h:02d}:00",
                "completions": len(h_completed),
                "throughput_rate": round(len(h_completed), 1)
            })

        total_completions = len(completed_tokens)
        active_hours = max(1, len([h for h in hourly_velocity if h["completions"] > 0]))
        velocity_per_hour = round(total_completions / active_hours, 1)

        # Source breakdown: Walk-in vs. Online / Appointment
        walk_in_count = len([t for t in tokens if t.source == "walk_in"])
        appointment_count = len([t for t in tokens if t.source in ["appointment", "online"]])
        emergency_count = len([t for t in tokens if t.priority == "emergency"])

        # Doctor workload distribution
        doctors = db.query(Doctor).all()
        doctor_metrics = []
        for doc in doctors:
            doc_tokens = [t for t in tokens if t.doctor_id == doc.id]
            doc_completed = [t for t in doc_tokens if t.status == "completed"]
            doc_consult_times = []
            for t in doc_completed:
                if t.called_at and t.completed_at:
                    diff = (t.completed_at - t.called_at).total_seconds() / 60.0
                    if 1 <= diff <= 120:
                        doc_consult_times.append(diff)

            doctor_metrics.append({
                "doctor_id": doc.id,
                "doctor_name": doc.name,
                "specialization": doc.specialization,
                "room": doc.room,
                "assigned_tokens": len(doc_tokens),
                "completed_tokens": len(doc_completed),
                "waiting_tokens": len([t for t in doc_tokens if t.status == "waiting"]),
                "avg_consult_min": round(sum(doc_consult_times) / len(doc_consult_times), 1) if doc_consult_times else 8.0,
                "duty_status": getattr(doc, "duty_status", doc.status)
            })

        return {
            "time_range": time_range,
            "sample_size": sample_size,
            "insufficient_data": insufficient_data,
            "total_tokens": sample_size,
            "completed_consultations": total_completions,
            "completion_rate_pct": round((total_completions / sample_size) * 100, 1) if sample_size > 0 else 0.0,
            "overall_velocity_per_hour": velocity_per_hour,
            "avg_consult_duration_min": avg_consult_duration,
            "avg_wait_duration_min": avg_wait_duration,
            "hourly_velocity": hourly_velocity,
            "source_distribution": {
                "walk_in": walk_in_count,
                "appointment_online": appointment_count,
                "emergency": emergency_count
            },
            "doctor_workload": doctor_metrics
        }

analytics_service = AnalyticsService()
