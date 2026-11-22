import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.db import SessionLocal
from backend.models import Patient, Doctor, Prescription

class TestDigitalHealthWalletAndPrescriptionPDF(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_patient_login_and_jwt(self):
        """Test patient authentication by 10-digit mobile number."""
        res = self.client.post("/api/patient/auth/login", json={"phone": "9876543210", "pin": "1234"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["role"], "patient")
        self.assertEqual(data["phone"], "9876543210")
        self.assertTrue(data["uhid"].startswith("SH-445001-"))

    def test_02_get_patient_profile(self):
        """Test fetching patient profile with UHID."""
        res = self.client.get("/api/patient/profile?phone=9876543210")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["phone"], "9876543210")
        self.assertTrue(len(data["uhid"]) > 5)

    def test_03_update_patient_profile(self):
        """Test updating patient blood group and allergies."""
        payload = {
            "blood_group": "O+",
            "allergies": "Penicillin",
            "medical_history": "Hypertension (controlled)"
        }
        res = self.client.put("/api/patient/profile?phone=9876543210", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["blood_group"], "O+")
        self.assertEqual(data["allergies"], "Penicillin")
        self.assertEqual(data["medical_history"], "Hypertension (controlled)")

    def test_04_patient_digital_wallet_aggregation(self):
        """Test complete health wallet aggregation endpoint."""
        res = self.client.get("/api/patient/wallet?phone=9876543210")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("patient", data)
        self.assertIn("prescriptions", data)
        self.assertIn("appointments", data)
        self.assertIn("tokens_history", data)
        self.assertIn("medical_history_summary", data)
        self.assertEqual(data["patient"]["phone"], "9876543210")

    def test_05_get_my_prescriptions(self):
        """Test fetching patient-specific prescriptions chronologically."""
        res = self.client.get("/api/prescriptions/patient/my?phone=9876543210")
        self.assertEqual(res.status_code, 200)
        prescriptions = res.json()
        self.assertIsInstance(prescriptions, list)
        if prescriptions:
            first_rx = prescriptions[0]
            self.assertIn("prescription_number", first_rx)
            self.assertIn("verification_token", first_rx)
            self.assertTrue(first_rx["is_signed"])

    def test_06_prescription_pdf_download_stream(self):
        """Test streaming of signed prescription PDF."""
        # Find any existing prescription in DB
        rx = self.db.query(Prescription).first()
        self.assertIsNotNone(rx, "At least one prescription should exist from seeds")

        res = self.client.get(f"/api/prescriptions/{rx.id}/pdf")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("content-type"), "application/pdf")
        self.assertIn("HealPath_Prescription_", res.headers.get("content-disposition", ""))
        # Verify valid PDF magic bytes (%PDF-)
        self.assertTrue(res.content.startswith(b"%PDF-"), "Streamed content must be a valid PDF document")

    def test_07_public_qr_prescription_verification(self):
        """Test public QR verification endpoint with valid token."""
        rx = self.db.query(Prescription).first()
        self.assertIsNotNone(rx.verification_token)

        res = self.client.get(f"/api/prescriptions/verify/{rx.verification_token}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["valid"])
        self.assertEqual(data["status"], "verified")
        self.assertIn("Sanjeevan Multispecialty Hospital", data["hospital_name"])
        self.assertIn("Dr.", data["doctor_name"])
        self.assertIn("MMC", data["doctor_registration"])
        self.assertTrue(data["is_signed"])
        self.assertIn("SHA256:", data["signature_hash"])

    def test_08_public_qr_tampered_token_rejection(self):
        """Test rejection of non-existent or tampered verification token."""
        res = self.client.get("/api/prescriptions/verify/tampered_fake_token_12345")
        self.assertEqual(res.status_code, 404)

    def test_09_public_qr_privacy_enforcement(self):
        """Verify that public QR endpoint NEVER leaks private clinical diagnosis or medicines."""
        rx = self.db.query(Prescription).first()
        res = self.client.get(f"/api/prescriptions/verify/{rx.verification_token}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertNotIn("diagnosis", data)
        self.assertNotIn("medicines", data)
        self.assertNotIn("clinical_notes", data)
        self.assertNotIn("patient_phone", data)

    def test_10_prescription_verification_audit_logged(self):
        """Verify that scanning a prescription QR code creates an audit log entry."""
        rx = self.db.query(Prescription).first()
        initial_logs_count = len(rx.verification_logs)
        res = self.client.get(f"/api/prescriptions/verify/{rx.verification_token}")
        self.assertEqual(res.status_code, 200)

        self.db.refresh(rx)
        self.assertGreater(len(rx.verification_logs), initial_logs_count)

if __name__ == "__main__":
    unittest.main()
