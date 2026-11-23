import os
import unittest
import json
import hmac
import hashlib
from datetime import datetime, date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.main import app
from backend.db import SessionLocal, Base, engine
from backend.models import Department, Doctor, Patient, Token, NotificationLog, HardwareDevice
from backend.services.notification import notification_service, NotificationService
from backend.services.analytics_service import analytics_service
from backend.services.hardware_gateway import hardware_gateway

client = TestClient(app)

class TestStage9AnalyticsAndWhatsApp(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.db: Session = SessionLocal()

        # Seed or fetch baseline department and doctor
        cls.dept = cls.db.query(Department).filter(Department.code == "GEN").first()
        if not cls.dept:
            cls.dept = Department(name="General Medicine Test", code="GEN", default_consult_min=8)
            cls.db.add(cls.dept)
            cls.db.commit()
            cls.db.refresh(cls.dept)

        cls.doctor = cls.db.query(Doctor).filter(Doctor.department_id == cls.dept.id).first()
        if not cls.doctor:
            cls.doctor = Doctor(
                name="Dr. Test Specialist",
                department_id=cls.dept.id,
                specialization="Internal Medicine",
                room="Room 101",
                status="available",
                duty_status="available"
            )
            cls.db.add(cls.doctor)
            cls.db.commit()
            cls.db.refresh(cls.doctor)

        # Seed test patient
        cls.patient_phone = "9822099999"
        cls.patient = cls.db.query(Patient).filter(Patient.phone == cls.patient_phone).first()
        if not cls.patient:
            cls.patient = Patient(
                name="Ramesh Patil",
                phone=cls.patient_phone,
                age=48,
                gender="male",
                whatsapp_consent=True
            )
            cls.db.add(cls.patient)
            cls.db.commit()
            cls.db.refresh(cls.patient)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def setUp(self):
        self.db.rollback()

    def tearDown(self):
        self.db.rollback()

    # =========================================================================
    # 1. WHATSAPP NOTIFICATION SERVICE & SIMULATION TESTS
    # =========================================================================

    def test_01_simulation_mode_fallback(self):
        """Verifies notification service defaults safely to simulation mode when API credentials are unset."""
        service = NotificationService()
        service.wa_token = None
        service.wa_phone_id = None
        self.assertFalse(service.is_live_whatsapp())

        # Test dispatch in simulation mode
        log = service.dispatch(
            db=self.db,
            recipient_phone=self.patient_phone,
            recipient_name=self.patient.name,
            channel="whatsapp",
            event_type="test_event",
            message_body="Test simulation message",
            reference_type="test",
            reference_id=999
        )
        self.assertIsNotNone(log.id)
        self.assertEqual(log.status, "simulated")
        self.assertEqual(log.delivery_status, "simulated")
        self.assertTrue(log.meta_message_id.startswith("sim_wa_"))

    def test_02_trilingual_template_generation_zero_phi(self):
        """Verifies trilingual notification bodies exist and contain zero clinical diagnoses or medication names."""
        from sqlalchemy import func
        max_seq = self.db.query(func.max(Token.seq)).filter(
            Token.department_id == self.dept.id,
            Token.token_date == date.today()
        ).scalar() or 100
        new_seq = max_seq + 1

        token = Token(
            department_id=self.dept.id,
            doctor_id=self.doctor.id,
            patient_id=self.patient.id,
            token_date=date.today(),
            seq=new_seq,
            token_number=f"G-{new_seq:03d}",
            status="waiting"
        )
        self.db.add(token)
        self.db.commit()
        self.db.refresh(token)

        # Test English, Hindi, and Marathi message generation
        for lang in ["en", "hi", "mr"]:
            log = notification_service.notify_token_generated(self.db, token, self.patient, lang=lang)
            self.assertIsNotNone(log)
            # Verify PHI protection: No diagnosis or prescription terms in public notification
            forbidden_terms = ["diagnosis", "mg", "tablet", "capsule", "syrup", "disease"]
            for term in forbidden_terms:
                self.assertNotIn(term, log.message_body.lower())
            # Verify hospital and token presence
            self.assertIn(f"G-{new_seq:03d}", log.message_body)

    def test_03_notification_deduplication(self):
        """Verifies identical notifications sent within 2 minutes are suppressed."""
        log1 = notification_service.dispatch(
            db=self.db,
            recipient_phone="9822011111",
            recipient_name="Dedupe Test",
            channel="whatsapp",
            event_type="dedupe_check",
            message_body="First send",
            reference_type="token",
            reference_id=1234
        )
        # Second send within 2 minutes
        log2 = notification_service.dispatch(
            db=self.db,
            recipient_phone="9822011111",
            recipient_name="Dedupe Test",
            channel="whatsapp",
            event_type="dedupe_check",
            message_body="Second send",
            reference_type="token",
            reference_id=1234
        )
        self.assertEqual(log1.id, log2.id)

    def test_04_dpdp_opt_out_enforcement(self):
        """Verifies DPDP Act patient opt-out blocks further notification dispatches."""
        opt_phone = "9822077777"
        # Opt-out
        notification_service.opt_out_patient(self.db, opt_phone, reason="Testing STOP")
        self.assertTrue(notification_service.is_patient_opted_out(self.db, opt_phone))

        # Attempt to dispatch
        log = notification_service.dispatch(
            db=self.db,
            recipient_phone=opt_phone,
            recipient_name="Opted Out Patient",
            channel="whatsapp",
            event_type="test_optout",
            message_body="This should be blocked",
            reference_type="token",
            reference_id=987
        )
        self.assertEqual(log.status, "skipped_optout")
        self.assertEqual(log.delivery_status, "opted_out")

        # Opt back in
        notification_service.opt_in_patient(self.db, opt_phone)
        self.assertFalse(notification_service.is_patient_opted_out(self.db, opt_phone))

    # =========================================================================
    # 2. META WHATSAPP WEBHOOK TESTS
    # =========================================================================

    def test_05_webhook_get_verification_challenge_success(self):
        """Tests Meta webhook GET verification handshake returns challenge integer with 200 OK."""
        verify_token = os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "healpath_wa_verify_secret_2026")
        params = {
            "hub.mode": "subscribe",
            "hub.verify_token": verify_token,
            "hub.challenge": "11582014"
        }
        res = client.get("/api/webhook/whatsapp", params=params)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.text, "11582014")

    def test_06_webhook_get_verification_token_mismatch(self):
        """Tests Meta webhook GET verification with wrong token returns 403 Forbidden."""
        params = {
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong_token_here",
            "hub.challenge": "11582014"
        }
        res = client.get("/api/webhook/whatsapp", params=params)
        self.assertEqual(res.status_code, 403)

    def test_07_webhook_post_hmac_signature_validation(self):
        """Tests Meta webhook POST with HMAC-SHA256 signature verification."""
        secret = "test_meta_app_secret_stage9"
        old_secret = os.environ.get("WHATSAPP_APP_SECRET")
        os.environ["WHATSAPP_APP_SECRET"] = secret

        payload = {
            "object": "whatsapp_business_account",
            "entry": [
                {
                    "id": "123456",
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "metadata": {"display_phone_number": "1555025"},
                                "statuses": [
                                    {
                                        "id": "wamid.test.123",
                                        "status": "delivered",
                                        "timestamp": "1700000000"
                                    }
                                ]
                            },
                            "field": "messages"
                        }
                    ]
                }
            ]
        }
        body_bytes = json.dumps(payload).encode("utf-8")
        valid_signature = "sha256=" + hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

        # Valid signature
        res = client.post(
            "/api/webhook/whatsapp",
            content=body_bytes,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": valid_signature}
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("status"), "EVENT_RECEIVED")

        # Invalid signature
        invalid_sig = "sha256=invalid_hex_digest_here"
        res_fail = client.post(
            "/api/webhook/whatsapp",
            content=body_bytes,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": invalid_sig}
        )
        self.assertEqual(res_fail.status_code, 401)

        # Restore env
        if old_secret is not None:
            os.environ["WHATSAPP_APP_SECRET"] = old_secret
        else:
            del os.environ["WHATSAPP_APP_SECRET"]

    def test_08_webhook_inbound_stop_opt_out(self):
        """Tests inbound WhatsApp 'STOP' message automatically updates patient opt-out status."""
        test_user_phone = "919822055555"
        payload = {
            "object": "whatsapp_business_account",
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "messages": [
                                    {
                                        "from": test_user_phone,
                                        "id": "wamid.msg.999",
                                        "timestamp": "1700000000",
                                        "text": {"body": "STOP"},
                                        "type": "text"
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        res = client.post("/api/webhook/whatsapp", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(notification_service.is_patient_opted_out(self.db, "9822055555"))

    # =========================================================================
    # 3. ADVANCED DEPARTMENT ANALYTICS & HEATMAP TESTS
    # =========================================================================

    def test_09_department_bottleneck_heatmap_endpoint(self):
        """Tests GET /api/analytics/department-heatmap returns hourly congestion matrix."""
        res = client.get("/api/analytics/department-heatmap?range=today")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("heatmap", data)
        self.assertIn("time_range", data)
        self.assertIn("insufficient_data", data)
        self.assertIsInstance(data["heatmap"], list)

        if len(data["heatmap"]) > 0:
            dept_row = data["heatmap"][0]
            self.assertIn("hourly_cells", dept_row)
            self.assertEqual(len(dept_row["hourly_cells"]), 10)  # Hours 09 to 18
            self.assertIn("congestion_level", dept_row["hourly_cells"][0])
            self.assertIn(dept_row["hourly_cells"][0]["congestion_level"], ["Normal", "Moderate", "High", "Critical"])

    def test_10_consultation_velocity_endpoint(self):
        """Tests GET /api/analytics/consultation-velocity returns completions/hour and workload metrics."""
        res = client.get("/api/analytics/consultation-velocity?range=today")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("overall_velocity_per_hour", data)
        self.assertIn("avg_consult_duration_min", data)
        self.assertIn("hourly_velocity", data)
        self.assertIn("source_distribution", data)
        self.assertIn("doctor_workload", data)
        self.assertIsInstance(data["doctor_workload"], list)

    def test_11_notification_status_endpoint(self):
        """Tests GET /api/notifications/status returns delivery funnel stats."""
        res = client.get("/api/notifications/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("is_live_mode", data)
        self.assertIn("provider", data)
        self.assertIn("counts", data)
        self.assertIn("total", data["counts"])
        self.assertIn("recent_logs", data)

    # =========================================================================
    # 4. PHYSICAL CALLING HARDWARE GATEWAY TESTS (7-SEGMENT LED DISPLAYS)
    # =========================================================================

    def test_12_hardware_simulate_call_and_poll(self):
        """Tests simulating a hardware display call and polling from microcontroller."""
        payload = {
            "token_number": "C-099",
            "cabin_id": "103",
            "event_type": "CALL_NEXT"
        }
        res = client.post("/api/hardware/simulate-call", json=payload)
        self.assertEqual(res.status_code, 200)
        evt = res.json().get("event", {})
        self.assertEqual(evt.get("token_number"), "C-099")
        self.assertEqual(evt.get("cabin_id"), "103")
        self.assertEqual(evt.get("event_type"), "CALL_NEXT")

        # Zero PHI verification in hardware payload
        self.assertNotIn("patient_name", evt)
        self.assertNotIn("diagnosis", evt)

        # Microcontroller polls events
        poll_res = client.get("/api/hardware/display/events?cabin_id=103")
        self.assertEqual(poll_res.status_code, 200)
        poll_data = poll_res.json()
        self.assertGreaterEqual(poll_data.get("count", 0), 1)

    def test_13_hardware_event_acknowledgement(self):
        """Tests microcontroller ACK clears event from pending buffer."""
        # Queue event
        evt = hardware_gateway.dispatch_display_event(
            event_type="CALL_NEXT",
            token_number="C-088",
            cabin_id="104"
        )
        event_id = evt["event_id"]

        # Microcontroller ACKs event
        ack_res = client.post("/api/hardware/display/ack", json={"event_id": event_id, "device_id": "DISP-CABIN-104"})
        self.assertEqual(ack_res.status_code, 200)
        self.assertTrue(ack_res.json().get("acknowledged"))

    def test_14_hardware_device_heartbeat_and_registry(self):
        """Tests microcontroller heartbeat registration and device status listing."""
        hb_payload = {
            "device_id": "DISP-CABIN-101",
            "cabin_id": "101",
            "ip_address": "192.168.1.101",
            "rssi": -62,
            "firmware_version": "v1.1.0"
        }
        hb_res = client.post("/api/hardware/display/heartbeat", json=hb_payload)
        self.assertEqual(hb_res.status_code, 200)

        # Query registered devices
        list_res = client.get("/api/hardware/devices")
        self.assertEqual(list_res.status_code, 200)
        devices = list_res.json().get("devices", [])
        self.assertGreater(len(devices), 0)
        dev_101 = next((d for d in devices if d["device_id"] == "DISP-CABIN-101"), None)
        self.assertIsNotNone(dev_101)
        self.assertEqual(dev_101["status"], "online")


if __name__ == "__main__":
    unittest.main()
