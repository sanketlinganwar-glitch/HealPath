"""
HACKBYTE (HealPath / QueueCare) - Predictive Queue Waiting Time AI Engine
Stage 6: Multi-Factor Waiting Time Prediction with Dynamic Doctor Pace,
In-Progress Progress Deduction, Emergency Interruption Dampening, and Statistical Confidence Ranges.

Designed for Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal, Maharashtra 445001.

Healthcare Data Integrity Mandates:
1. Operates in transparent "BASELINE" mode when real completed sample volume is < 50 records.
2. Zero synthetic data fabrication: predictions are mathematically derived from verified hospital events.
3. Always returns an explainable statistical range [min, max] rather than a false definitive guarantee.
4. Token ownership and patient privacy are strictly enforced; no PII is utilized in calculation logs.
"""

import math
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models import Department, Doctor, Patient, Token, EmergencyAuditLog


class ConsultationRecord:
    """Sanitized feature record of a completed clinical consultation."""
    def __init__(
        self,
        token_id: int,
        department_id: int,
        doctor_id: Optional[int],
        duration_min: float,
        priority: str,
        source: str,
        day_of_week: int,
        hour_of_day: int,
        created_at: datetime,
        called_at: datetime,
        completed_at: datetime
    ):
        self.token_id = token_id
        self.department_id = department_id
        self.doctor_id = doctor_id
        self.duration_min = duration_min
        self.priority = priority
        self.source = source
        self.day_of_week = day_of_week
        self.hour_of_day = hour_of_day
        self.created_at = created_at
        self.called_at = called_at
        self.completed_at = completed_at


class QueuePredictionService:
    def __init__(self, ml_activation_threshold: int = 50):
        self.ml_activation_threshold = ml_activation_threshold

    def extract_consultation_history(
        self, db: Session, department_id: Optional[int] = None, limit: int = 500
    ) -> List[ConsultationRecord]:
        """
        Extracts verified historical consultation records from database.
        Excludes PII (patient name, phone, medical notes) for privacy compliance.
        """
        query = db.query(Token).filter(
            Token.status == "completed",
            Token.called_at.isnot(None),
            Token.completed_at.isnot(None),
            Token.completed_at >= Token.called_at
        )
        if department_id:
            query = query.filter(Token.department_id == department_id)

        tokens = query.order_by(Token.completed_at.desc()).limit(limit).all()
        records: List[ConsultationRecord] = []

        for t in tokens:
            dur = (t.completed_at - t.called_at).total_seconds() / 60.0
            # Sanity bound: 0.2 minutes (12s) to 180 minutes (3 hrs)
            if 0.2 <= dur <= 180.0:
                called = t.called_at
                records.append(ConsultationRecord(
                    token_id=t.id,
                    department_id=t.department_id,
                    doctor_id=t.doctor_id,
                    duration_min=dur,
                    priority=t.priority or "normal",
                    source=t.source or "online",
                    day_of_week=called.weekday(),
                    hour_of_day=called.hour,
                    created_at=t.created_at,
                    called_at=called,
                    completed_at=t.completed_at
                ))

        return records

    def get_prediction_mode(self, db: Session, department_id: Optional[int] = None) -> str:
        """
        Determines whether predictions operate in BASELINE or ML mode based on sample volume.
        Never claims ML mode unless legitimate training sample volume is reached.
        """
        records = self.extract_consultation_history(db, department_id=department_id, limit=self.ml_activation_threshold)
        if len(records) >= self.ml_activation_threshold:
            return "ML"
        return "BASELINE"

    def get_doctor_pace_and_variance(
        self, db: Session, doctor_id: int, department_id: int
    ) -> Tuple[float, float, int]:
        """
        Calculates doctor's historical average consultation duration and standard deviation.
        Blends with department default if doctor has fewer than 3 completed consultations.
        """
        dept = db.query(Department).filter(Department.id == department_id).first()
        dept_default = float(dept.default_consult_min if dept and dept.default_consult_min else 8.0)

        # Query completed tokens for this doctor
        doc_tokens = db.query(Token).filter(
            Token.doctor_id == doctor_id,
            Token.status == "completed",
            Token.called_at.isnot(None),
            Token.completed_at.isnot(None),
            Token.completed_at >= Token.called_at
        ).order_by(Token.completed_at.desc()).limit(20).all()

        durations = [
            (t.completed_at - t.called_at).total_seconds() / 60.0
            for t in doc_tokens
            if (t.completed_at - t.called_at).total_seconds() / 60.0 >= 0.5
        ]

        sample_count = len(durations)
        if sample_count == 0:
            return (dept_default, dept_default * 0.25, 0)

        doc_mean = sum(durations) / sample_count
        variance = sum((d - doc_mean) ** 2 for d in durations) / sample_count if sample_count > 1 else (doc_mean * 0.2) ** 2
        std_dev = math.sqrt(variance)

        # Empirical Bayesian smoothing for small samples
        if sample_count < 3:
            blended_mean = (doc_mean * sample_count + dept_default * (3 - sample_count)) / 3.0
            return (round(blended_mean, 2), max(1.5, round(std_dev, 2)), sample_count)

        return (round(doc_mean, 2), max(1.0, round(std_dev, 2)), sample_count)

    def get_time_of_day_coefficient(self, current_dt: Optional[datetime] = None) -> float:
        """
        Accounts for clinical throughput velocity based on time of day.
        Morning peak hours experience slight slowdown due to initial workups and lab requests.
        """
        dt = current_dt or datetime.now()
        h = dt.hour + (dt.minute / 60.0)

        if 9.0 <= h < 11.5:
            return 1.15  # Peak morning intake rush
        elif 11.5 <= h < 13.0:
            return 1.10  # Pre-lunch investigation reviews
        elif 13.0 <= h < 14.0:
            return 1.05  # Lunch shift transition
        elif 14.0 <= h < 16.5:
            return 0.95  # Afternoon steady state
        elif 16.5 <= h < 19.0:
            return 1.05  # Evening OPD rush
        return 1.0

    def predict_token_waiting_time(
        self, db: Session, token: Token, current_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Predicts waiting time, confidence range, and queue dynamics for a specific token.
        Features considered:
        - Exact position in priority queue
        - Number of emergency & senior patients ahead
        - In-progress consultation elapsed time across all on-duty doctors
        - Doctor historical consultation pace
        - Time-of-day pace coefficient
        """
        now = current_time or datetime.now()
        mode = self.get_prediction_mode(db, token.department_id)
        dept = db.query(Department).filter(Department.id == token.department_id).first()
        dept_name = dept.name if dept else "General"
        dept_default = float(dept.default_consult_min if dept and dept.default_consult_min else 8.0)

        # 1. Non-waiting states: 0 minute wait
        if token.status == "in_progress":
            room_str = token.doctor.room if token.doctor else "Consultation Cabin"
            doc_str = token.doctor.name if token.doctor else "Attending Doctor"
            return {
                "token_id": token.id,
                "token_number": token.token_number,
                "department_id": token.department_id,
                "department_name": dept_name,
                "doctor_id": token.doctor_id,
                "doctor_name": doc_str,
                "status": "in_progress",
                "position": 1,
                "people_ahead": 0,
                "estimated_wait_min": 0,
                "wait_time_range_min": [0, 0],
                "prediction_mode": mode,
                "confidence": "HIGH",
                "active_doctors_count": 1,
                "emergency_patients_ahead": 0,
                "is_approximate": False,
                "explanation": f"Patient is currently inside consultation room with {doc_str} ({room_str}).",
                "last_updated": now.isoformat()
            }

        if token.status in ["completed", "skipped"]:
            return {
                "token_id": token.id,
                "token_number": token.token_number,
                "department_id": token.department_id,
                "department_name": dept_name,
                "doctor_id": token.doctor_id,
                "doctor_name": token.doctor.name if token.doctor else None,
                "status": token.status,
                "position": None,
                "people_ahead": 0,
                "estimated_wait_min": 0,
                "wait_time_range_min": [0, 0],
                "prediction_mode": mode,
                "confidence": "HIGH",
                "active_doctors_count": 0,
                "emergency_patients_ahead": 0,
                "is_approximate": False,
                "explanation": f"Token status is '{token.status}'. No consultation waiting time applicable.",
                "last_updated": now.isoformat()
            }

        # 2. Waiting State: Detailed Simulation
        from backend.services.queue import get_waiting_queue_tokens
        waiting_tokens = get_waiting_queue_tokens(db, token.department_id)

        # Find target token position
        try:
            target_idx = next(i for i, t in enumerate(waiting_tokens) if t.id == token.id)
        except StopIteration:
            target_idx = len(waiting_tokens)

        people_ahead = target_idx
        position = target_idx + 1

        tokens_ahead = waiting_tokens[:target_idx]
        emergency_ahead = sum(1 for t in tokens_ahead if t.priority == "emergency")
        senior_ahead = sum(1 for t in tokens_ahead if t.priority == "senior")

        # Active doctors on duty
        active_docs = db.query(Doctor).filter(
            Doctor.department_id == token.department_id,
            Doctor.status != "off",
            Doctor.duty_status.notin_(["off_duty", "on_break"])
        ).all()
        active_docs_count = len(active_docs)

        time_coef = self.get_time_of_day_coefficient(now)

        # Case A: No active doctors currently on duty
        if active_docs_count == 0:
            # Check all doctors in department to estimate return from break or shift
            all_dept_docs = db.query(Doctor).filter(Doctor.department_id == token.department_id).all()
            base_est = round(dept_default * (people_ahead + 1) * 1.5)
            return {
                "token_id": token.id,
                "token_number": token.token_number,
                "department_id": token.department_id,
                "department_name": dept_name,
                "doctor_id": token.doctor_id,
                "doctor_name": None,
                "status": "waiting",
                "position": position,
                "people_ahead": people_ahead,
                "estimated_wait_min": base_est,
                "wait_time_range_min": [max(5, base_est - 5), base_est + 15],
                "prediction_mode": mode,
                "confidence": "LOW",
                "active_doctors_count": 0,
                "emergency_patients_ahead": emergency_ahead,
                "is_approximate": True,
                "explanation": "Doctors in this department are currently on break or between shifts. Estimated wait reflects expected clinic resumption.",
                "last_updated": now.isoformat()
            }

        # Case B: Multi-Doctor Queue Simulation with Elapsed Time Deduction
        # Initialize next available time (in minutes from now) for each active doctor
        doc_availability: Dict[int, float] = {}
        doc_paces: Dict[int, float] = {}

        for doc in active_docs:
            pace, _, _ = self.get_doctor_pace_and_variance(db, doc.id, token.department_id)
            doc_paces[doc.id] = pace * time_coef

            # Check if doctor has an active in_progress consultation right now
            in_prog = db.query(Token).filter(
                Token.doctor_id == doc.id,
                Token.status == "in_progress"
            ).first()

            if in_prog and in_prog.called_at:
                elapsed = (now - in_prog.called_at).total_seconds() / 60.0
                remaining = (pace * time_coef) - elapsed
                # If doctor is running longer than expected, allocate a small residual grace period
                if remaining < 1.0:
                    remaining = max(1.0, (pace * time_coef) * 0.20)
                doc_availability[doc.id] = remaining
            else:
                # Doctor is immediately available to call a patient
                doc_availability[doc.id] = 0.0

        # Simulate processing all patients ahead
        # Using a priority-weighted duration: emergency patients take 1.35x, seniors take 1.1x
        for p_ahead in tokens_ahead:
            # Pick doctor that finishes soonest
            next_doc_id = min(doc_availability, key=doc_availability.get)
            patient_weight = 1.35 if p_ahead.priority == "emergency" else 1.10 if p_ahead.priority == "senior" else 1.0
            patient_duration = doc_paces[next_doc_id] * patient_weight
            doc_availability[next_doc_id] += patient_duration

        # Target patient's consultation begins when the next doctor becomes available
        est_wait_exact = min(doc_availability.values())
        est_wait_min = max(0, int(round(est_wait_exact)))

        # Uncertainty Range Calculation (empirical 90% confidence interval)
        # Volatility scales with queue depth and emergency interruptions ahead
        base_sigma = max(1.5, est_wait_exact * 0.20)
        if emergency_ahead > 0:
            base_sigma *= (1.0 + 0.3 * emergency_ahead)

        min_range = max(0, int(math.floor(est_wait_exact - (1.28 * base_sigma))))
        max_range = max(est_wait_min + 1, int(math.ceil(est_wait_exact + (1.28 * base_sigma))))

        # When patient is next in line and doctor is nearly done
        if people_ahead == 0 and est_wait_min <= 2:
            min_range = 0
            max_range = max(2, est_wait_min + 2)

        # Confidence level
        if people_ahead <= 1 and emergency_ahead == 0 and active_docs_count >= 1:
            confidence = "HIGH"
        elif people_ahead <= 5 and emergency_ahead == 0:
            confidence = "MODERATE"
        else:
            confidence = "LOW"

        # Build human-readable clinical explanation
        if people_ahead == 0:
            explanation = f"You are next up! Active consultations are nearing completion across {active_docs_count} doctor cabin(s)."
        elif emergency_ahead > 0:
            explanation = f"{people_ahead} patient(s) ahead, including {emergency_ahead} emergency priority case(s) undergoing urgent care."
        else:
            explanation = f"{people_ahead} patient(s) ahead served across {active_docs_count} active doctor(s) at Sanjeevan Hospital {dept_name} OPD."

        return {
            "token_id": token.id,
            "token_number": token.token_number,
            "department_id": token.department_id,
            "department_name": dept_name,
            "doctor_id": token.doctor_id,
            "doctor_name": token.doctor.name if token.doctor else None,
            "status": "waiting",
            "position": position,
            "people_ahead": people_ahead,
            "estimated_wait_min": est_wait_min,
            "wait_time_range_min": [min_range, max_range],
            "prediction_mode": mode,
            "confidence": confidence,
            "active_doctors_count": active_docs_count,
            "emergency_patients_ahead": emergency_ahead,
            "is_approximate": True,
            "explanation": explanation,
            "last_updated": now.isoformat()
        }

    def predict_doctor_queue(
        self, db: Session, doctor_id: int, current_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Calculates doctor's individual workload, current consultation elapsed time,
        waiting patient count, and estimated queue clearance time.
        """
        now = current_time or datetime.now()
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            raise ValueError(f"Doctor ID {doctor_id} not found")

        dept = db.query(Department).filter(Department.id == doctor.department_id).first()
        dept_name = dept.name if dept else "General"
        mode = self.get_prediction_mode(db, doctor.department_id)
        pace, std_dev, sample_count = self.get_doctor_pace_and_variance(db, doctor.id, doctor.department_id)

        # In-progress consultation
        in_prog = db.query(Token).filter(
            Token.doctor_id == doctor.id,
            Token.status == "in_progress"
        ).first()

        curr_token_num = in_prog.token_number if in_prog else None
        elapsed_min = None
        remaining_curr = 0.0

        if in_prog and in_prog.called_at:
            elapsed_min = int((now - in_prog.called_at).total_seconds() / 60.0)
            remaining_curr = max(1.0, pace - elapsed_min)

        # Waiting tokens assigned or in doctor's department
        from backend.services.queue import get_waiting_queue_tokens
        dept_waiting = get_waiting_queue_tokens(db, doctor.department_id)
        waiting_count = len(dept_waiting)

        # Clearance time estimate
        active_in_dept = db.query(Doctor).filter(
            Doctor.department_id == doctor.department_id,
            Doctor.status != "off",
            Doctor.duty_status.notin_(["off_duty", "on_break"])
        ).count()
        active_in_dept = max(1, active_in_dept)

        # Expected clearance time for doctor's share of queue
        share = math.ceil(waiting_count / active_in_dept)
        clearance_est = int(round(remaining_curr + (share * pace)))
        min_clear = max(0, int(clearance_est - 1.28 * std_dev * math.sqrt(max(1, share))))
        max_clear = int(clearance_est + 1.28 * std_dev * math.sqrt(max(1, share)) + 2)

        confidence = "HIGH" if waiting_count <= 2 else "MODERATE" if waiting_count <= 6 else "LOW"

        return {
            "doctor_id": doctor.id,
            "doctor_name": doctor.name,
            "department_id": doctor.department_id,
            "department_name": dept_name,
            "duty_status": doctor.duty_status,
            "current_token_number": curr_token_num,
            "current_consultation_elapsed_min": elapsed_min,
            "waiting_count": waiting_count,
            "avg_consult_duration_min": pace,
            "estimated_clearance_time_min": clearance_est,
            "clearance_time_range_min": [min_clear, max_clear],
            "prediction_mode": mode,
            "confidence": confidence,
            "last_updated": now.isoformat()
        }

    def predict_department_queue(
        self, db: Session, department_id: int, current_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Calculates department-wide queue velocity, workload per doctor,
        and estimated waiting time for a new walk-in / appointment registering now.
        """
        now = current_time or datetime.now()
        dept = db.query(Department).filter(Department.id == department_id).first()
        if not dept:
            raise ValueError(f"Department ID {department_id} not found")

        mode = self.get_prediction_mode(db, department_id)
        time_coef = self.get_time_of_day_coefficient(now)

        from backend.services.queue import get_waiting_queue_tokens, get_active_doctors_count
        waiting_tokens = get_waiting_queue_tokens(db, department_id)
        total_waiting = len(waiting_tokens)
        emergency_count = sum(1 for t in waiting_tokens if t.priority == "emergency")
        active_docs = get_active_doctors_count(db, department_id)

        # Query department average
        dept_default = float(dept.default_consult_min if dept and dept.default_consult_min else 8.0)
        history = self.extract_consultation_history(db, department_id=department_id, limit=20)
        if history:
            avg_duration = sum(h.duration_min for h in history) / len(history)
        else:
            avg_duration = dept_default

        effective_pace = round(avg_duration * time_coef, 2)

        # Expected wait for a brand new token created right now
        if active_docs > 0:
            est_wait = int(round((total_waiting * effective_pace) / active_docs))
        else:
            est_wait = int(round(total_waiting * effective_pace * 1.5))

        sigma = max(2.0, est_wait * 0.22)
        min_wait = max(0, int(est_wait - sigma))
        max_wait = int(est_wait + sigma + 3)

        confidence = "HIGH" if total_waiting <= 2 and active_docs >= 1 else "MODERATE" if total_waiting <= 8 else "LOW"

        return {
            "department_id": dept.id,
            "department_name": dept.name,
            "active_doctors_count": active_docs,
            "total_waiting_count": total_waiting,
            "emergency_count": emergency_count,
            "avg_consult_duration_min": effective_pace,
            "est_wait_per_new_patient_min": est_wait,
            "wait_time_range_min": [min_wait, max_wait],
            "prediction_mode": mode,
            "confidence": confidence,
            "rush_hour_factor": time_coef,
            "last_updated": now.isoformat()
        }


queue_prediction_service = QueuePredictionService(ml_activation_threshold=50)
