"""
HACKBYTE (HealPath / QueueCare) - Stage 6: Predictive Queue Waiting Time AI Test Suite
Validates Multi-Factor Waiting Time Simulation, Elapsed Time Deduction,
Emergency Interruption Shifting, Doctor Queue Clearance, and Range Integrity.
"""

import sys
import os
import unittest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

# Ensure root is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app
from backend.db import SessionLocal
from backend.models import Department, Doctor, Patient, Token
from backend.services.queue_prediction import queue_prediction_service

client = TestClient(app)


class TestQueuePrediction(unittest.TestCase):
    def setUp(self):
        # Reset database to known baseline state before each test
        client.post("/api/demo/reset")

    # 1. Empty Queue Verification
    def test_01_empty_queue_wait_time(self):
        # Clean department with no waiting tokens (e.g. Department 5 ENT)
        db = SessionLocal()
        try:
            # Complete or delete any waiting tokens in Dept 5
            waiting_in_dept5 = db.query(Token).filter(Token.department_id == 5, Token.status == "waiting").all()
            for t in waiting_in_dept5:
                t.status = "completed"
                t.called_at = datetime.now() - timedelta(minutes=10)
                t.completed_at = datetime.now()
            db.commit()

            pred = queue_prediction_service.predict_department_queue(db, department_id=5)
            self.assertEqual(pred["total_waiting_count"], 0)
            self.assertEqual(pred["est_wait_per_new_patient_min"], 0)
            self.assertIn("BASELINE", pred["prediction_mode"])
            self.assertEqual(pred["confidence"], "HIGH")
        finally:
            db.close()

    # 2. Single Waiting Patient
    def test_02_single_patient_prediction(self):
        # Create a single token
        r_create = client.post("/api/tokens", json={
            "name": "Ananya Joshi",
            "phone": "9811223344",
            "age": 28,
            "gender": "female",
            "department_id": 2,  # Cardiology
            "priority": "normal",
            "symptoms": "Mild palpitations",
            "source": "online"
        })
        self.assertEqual(r_create.status_code, 201)
        token_id = r_create.json()["id"]

        r_pred = client.get(f"/api/queue/prediction/{token_id}")
        self.assertEqual(r_pred.status_code, 200)
        data = r_pred.json()

        self.assertEqual(data["token_id"], token_id)
        self.assertEqual(data["status"], "waiting")
        self.assertGreaterEqual(data["estimated_wait_min"], 0)
        self.assertEqual(len(data["wait_time_range_min"]), 2)
        self.assertLessEqual(data["wait_time_range_min"][0], data["estimated_wait_min"])
        self.assertGreaterEqual(data["wait_time_range_min"][1], data["estimated_wait_min"])
        self.assertEqual(data["prediction_mode"], "BASELINE")
        self.assertIn(data["confidence"], ["HIGH", "MODERATE"])

    # 3. Multiple Waiting Patients Sequential Queue Simulation
    def test_03_multiple_patients_wait_escalation(self):
        # Create 3 sequential tokens in Department 3 (Orthopedics)
        tokens = []
        for i, name in enumerate(["Patient One", "Patient Two", "Patient Three"]):
            r = client.post("/api/tokens", json={
                "name": name,
                "phone": f"987650000{i}",
                "age": 30 + i,
                "gender": "male",
                "department_id": 3,
                "priority": "normal",
                "symptoms": f"Joint pain {i}",
                "source": "online"
            })
            self.assertEqual(r.status_code, 201)
            tokens.append(r.json()["id"])

        p1 = client.get(f"/api/queue/prediction/{tokens[0]}").json()
        p2 = client.get(f"/api/queue/prediction/{tokens[1]}").json()
        p3 = client.get(f"/api/queue/prediction/{tokens[2]}").json()

        # Each subsequent patient should have equal or greater wait time
        self.assertLessEqual(p1["people_ahead"], p2["people_ahead"])
        self.assertLessEqual(p2["people_ahead"], p3["people_ahead"])
        self.assertLessEqual(p1["estimated_wait_min"], p2["estimated_wait_min"])
        self.assertLessEqual(p2["estimated_wait_min"], p3["estimated_wait_min"])

    # 4. In-Progress Consultation Elapsed Time Deduction
    def test_04_in_progress_consultation_deduction(self):
        db = SessionLocal()
        try:
            # Assign an in_progress token to Doctor 1 that started 7 minutes ago
            doc = db.query(Doctor).filter(Doctor.id == 1).first()
            active_token = db.query(Token).filter(Token.doctor_id == 1, Token.status == "in_progress").first()
            if not active_token:
                active_token = Token(
                    department_id=1,
                    doctor_id=1,
                    patient_id=1,
                    token_number="G-TEST",
                    priority="normal",
                    status="in_progress",
                    called_at=datetime.now() - timedelta(minutes=7),
                    seq=999
                )
                db.add(active_token)
            else:
                active_token.called_at = datetime.now() - timedelta(minutes=7)
            db.commit()

            # Create waiting token
            r = client.post("/api/tokens", json={
                "name": "Waiting Next",
                "phone": "9876543210",
                "age": 40,
                "gender": "male",
                "department_id": 1,
                "priority": "normal",
                "symptoms": "Checkup",
                "source": "online"
            })
            token_id = r.json()["id"]

            pred = client.get(f"/api/queue/prediction/{token_id}").json()
            # Because 7 minutes have already elapsed of the consultation,
            # remaining time should be significantly lower than full consultation duration
            self.assertLess(pred["estimated_wait_min"], 10)
        finally:
            db.close()

    # 5. Emergency Queue Interruption Impact
    def test_05_emergency_interruption_shift(self):
        # Create 6 normal patients in Department 1 so all doctor cabins have demand
        norm_tokens = []
        for i in range(6):
            r = client.post("/api/tokens", json={
                "name": f"Normal Patient {i}",
                "phone": f"981234567{i}",
                "age": 30 + i,
                "gender": "female",
                "department_id": 1,
                "priority": "normal",
                "symptoms": "Routine cough",
                "source": "online"
            })
            self.assertEqual(r.status_code, 201)
            norm_tokens.append(r.json()["id"])

        target_id = norm_tokens[-1]
        pred_before = client.get(f"/api/queue/prediction/{target_id}").json()

        # Insert Emergency Patient
        r_emerg = client.post("/api/tokens", json={
            "name": "Acute Emergency Patient",
            "phone": "9899887766",
            "age": 55,
            "gender": "male",
            "department_id": 1,
            "priority": "emergency",
            "emergency_reason": "Acute cardiac arrest symptoms",
            "symptoms": "Severe chest pain",
            "source": "online"
        })
        self.assertEqual(r_emerg.status_code, 201)

        pred_after = client.get(f"/api/queue/prediction/{target_id}").json()

        # Target patient's people_ahead must increase, emergency_ahead >= 1, and wait time range must expand
        self.assertGreater(pred_after["people_ahead"], pred_before["people_ahead"])
        self.assertGreaterEqual(pred_after["emergency_patients_ahead"], 1)
        self.assertGreaterEqual(pred_after["estimated_wait_min"], pred_before["estimated_wait_min"])
        self.assertGreater(pred_after["wait_time_range_min"][1], pred_before["wait_time_range_min"][1])

    # 6. Doctor Off-Duty / On-Break Handling
    def test_06_doctors_off_duty_handling(self):
        db = SessionLocal()
        try:
            # Set all doctors in Department 4 (Pediatrics) to off_duty
            peds_docs = db.query(Doctor).filter(Doctor.department_id == 4).all()
            for d in peds_docs:
                d.duty_status = "off_duty"
            db.commit()

            # Create pediatric token
            r = client.post("/api/tokens", json={
                "name": "Baby Child",
                "phone": "9855443322",
                "age": 3,
                "gender": "other",
                "department_id": 4,
                "priority": "normal",
                "symptoms": "Routine vaccination",
                "source": "online"
            })
            token_id = r.json()["id"]

            pred = client.get(f"/api/queue/prediction/{token_id}").json()
            self.assertEqual(pred["active_doctors_count"], 0)
            self.assertEqual(pred["confidence"], "LOW")
            self.assertTrue(pred["is_approximate"])
            self.assertIn("break or between shifts", pred["explanation"])
        finally:
            db.close()

    # 7. Missing Historical Data Graceful Fallback
    def test_07_missing_historical_data_fallback(self):
        db = SessionLocal()
        try:
            # For a new or cold doctor with 0 completed records
            pace, std, count = queue_prediction_service.get_doctor_pace_and_variance(db, doctor_id=999, department_id=1)
            # Should gracefully return default consult time (8 mins) and sensible std
            self.assertEqual(pace, 8.0)
            self.assertGreaterEqual(std, 1.0)
            self.assertEqual(count, 0)
        finally:
            db.close()

    # 8. Invalid Token ID (404 Not Found)
    def test_08_invalid_token_id_404(self):
        r = client.get("/api/queue/prediction/999999")
        self.assertEqual(r.status_code, 404)
        self.assertIn("Token not found", r.json()["detail"])

    # 9. Token Ownership Security Validation
    def test_09_token_ownership_validation(self):
        r = client.post("/api/tokens", json={
            "name": "Private Patient",
            "phone": "9800112233",
            "age": 45,
            "gender": "female",
            "department_id": 1,
            "priority": "normal",
            "symptoms": "Confidential symptom",
            "source": "online"
        })
        token_id = r.json()["id"]
        sec_hash = r.json()["secure_hash"]

        # Valid phone should succeed (200)
        r_valid = client.get(f"/api/queue/prediction/{token_id}?phone=9800112233")
        self.assertEqual(r_valid.status_code, 200)

        # Valid hash should succeed (200)
        r_hash_valid = client.get(f"/api/queue/prediction/{token_id}?secure_hash={sec_hash}")
        self.assertEqual(r_hash_valid.status_code, 200)

        # Mismatched phone should fail (403 Forbidden)
        r_invalid_phone = client.get(f"/api/queue/prediction/{token_id}?phone=9999999999")
        self.assertEqual(r_invalid_phone.status_code, 403)
        self.assertIn("Unauthorized", r_invalid_phone.json()["detail"])

        # Mismatched hash should fail (403 Forbidden)
        r_invalid_hash = client.get(f"/api/queue/prediction/{token_id}?secure_hash=bad_hash_123")
        self.assertEqual(r_invalid_hash.status_code, 403)
        self.assertIn("Unauthorized", r_invalid_hash.json()["detail"])

    # 10. Doctor Predictions Endpoint
    def test_10_doctor_predictions_endpoint(self):
        r = client.get("/api/queue/doctor-predictions/1")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["doctor_id"], 1)
        self.assertIn("clearance_time_range_min", data)
        self.assertGreaterEqual(data["avg_consult_duration_min"], 1.0)
        self.assertEqual(data["prediction_mode"], "BASELINE")

        # Invalid doctor
        r_bad = client.get("/api/queue/doctor-predictions/9999")
        self.assertEqual(r_bad.status_code, 404)

    # 11. Department Predictions Endpoint
    def test_11_department_predictions_endpoint(self):
        r = client.get("/api/queue/department-predictions/1")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["department_id"], 1)
        self.assertIn("department_name", data)
        self.assertIn("est_wait_per_new_patient_min", data)
        self.assertIn("wait_time_range_min", data)
        self.assertGreaterEqual(len(data["wait_time_range_min"]), 2)
        self.assertGreaterEqual(data["rush_hour_factor"], 0.8)

        # Invalid department
        r_bad = client.get("/api/queue/department-predictions/9999")
        self.assertEqual(r_bad.status_code, 404)

    # 12. Range Integrity Check (min <= est <= max)
    def test_12_range_integrity_invariant(self):
        # Create token
        r = client.post("/api/tokens", json={
            "name": "Range Check Patient",
            "phone": "9811992288",
            "age": 33,
            "gender": "male",
            "department_id": 1,
            "priority": "normal",
            "symptoms": "Cold",
            "source": "online"
        })
        token_id = r.json()["id"]

        pred = client.get(f"/api/queue/prediction/{token_id}").json()
        est = pred["estimated_wait_min"]
        r_min, r_max = pred["wait_time_range_min"]

        self.assertLessEqual(r_min, est, "Minimum range cannot exceed point estimate")
        self.assertGreaterEqual(r_max, est, "Maximum range cannot be less than point estimate")
        self.assertGreaterEqual(r_min, 0, "Minimum wait time cannot be negative")

    # 13. Prediction Mode & Non-Fabrication Reality Check
    def test_13_prediction_mode_integrity(self):
        # Given our database sample is < 50 real completed records,
        # prediction mode must be BASELINE (no fake ML claims)
        db = SessionLocal()
        try:
            mode = queue_prediction_service.get_prediction_mode(db, department_id=1)
            self.assertEqual(mode, "BASELINE")
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
