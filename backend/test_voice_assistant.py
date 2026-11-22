"""
HACKBYTE (HealPath / QueueCare) - Stage 7 Multilingual AI Voice Assistant Test Suite
Validates Speech Recognition intents, deterministic operational facts, doctor availability,
live queue predictive waiting times, emergency red-flags, and trilingual voice synthesis (EN, HI, MR).
"""

import sys
import os
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app
from backend.services.ai_service import (
    classify_voice_intent,
    detect_emergency_red_flags,
    build_spoken_text,
    conversation_store
)

client = TestClient(app)


class TestVoiceAssistant(unittest.TestCase):
    def setUp(self):
        client.post("/api/demo/reset")

    # 1. Intent Classification: Hospital Contact & Location
    def test_01_intent_hospital_contact_trilingual(self):
        queries = [
            ("Where is Sanjeevan hospital located?", "en"),
            ("अस्पताल का पता क्या है और फोन नंबर?", "hi"),
            ("संजीवन रुग्णालयाचा पत्ता काय आहे?", "mr")
        ]
        for q, lang in queries:
            intent = classify_voice_intent(q)
            self.assertEqual(intent, "hospital_contact", f"Failed for {q}")
            r = client.post("/api/chat", json={"message": q, "language": lang})
            self.assertEqual(r.status_code, 200)
            data = r.json()
            self.assertEqual(data["intent"], "hospital_contact")
            self.assertIn("445001", data["reply"])
            self.assertIn("95526", data["reply"])
            self.assertIsNotNone(data.get("spoken_text"))

    # 2. Intent Classification: Hospital Timings & OPD Hours
    def test_02_intent_hospital_timings_trilingual(self):
        queries = [
            ("What are the OPD timings and opening hours?", "en"),
            ("ओपीडी का समय क्या है और अस्पताल कब खुलता है?", "hi"),
            ("दवाखाना कधी उघडतो आणि ओपीडी वेळ काय आहे?", "mr")
        ]
        for q, lang in queries:
            intent = classify_voice_intent(q)
            self.assertEqual(intent, "hospital_timings", f"Failed for {q}")
            r = client.post("/api/chat", json={"message": q, "language": lang})
            self.assertEqual(r.status_code, 200)
            data = r.json()
            self.assertEqual(data["intent"], "hospital_timings")
            self.assertIn("08:30", data["reply"])
            self.assertIsNotNone(data.get("spoken_text"))

    # 3. Intent Classification: Doctor Availability
    def test_03_intent_doctor_availability_live(self):
        queries = [
            ("Which doctors are available on duty right now?", "en"),
            ("वर्तमान में कौन से डॉक्टर उपलब्ध हैं?", "hi"),
            ("सध्या कोणते तज्ज्ञ डॉक्टर उपस्थित आहेत?", "mr")
        ]
        for q, lang in queries:
            intent = classify_voice_intent(q)
            self.assertEqual(intent, "doctor_availability", f"Failed for {q}")
            r = client.post("/api/chat", json={"message": q, "language": lang})
            self.assertEqual(r.status_code, 200)
            data = r.json()
            self.assertEqual(data["intent"], "doctor_availability")
            self.assertTrue(len(data["reply"]) > 10)
            self.assertIn("Room", data["reply"])

    # 4. Intent Classification: Department Information
    def test_04_intent_department_info(self):
        q = "Which medical departments and specialities do you have?"
        r = client.post("/api/chat", json={"message": q, "language": "en"})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["intent"], "department_info")
        self.assertIn("General Medicine", data["reply"])

    # 5. Live Queue Token Status & Predictive Waiting Time Query
    def test_05_live_queue_prediction_via_voice_query(self):
        # Create a token first
        r_token = client.post("/api/tokens", json={
            "name": "Babanrao Deshmukh",
            "phone": "9422899112",
            "age": 68,
            "gender": "male",
            "department_id": 1,
            "priority": "senior",
            "symptoms": "Hypertension routine check",
            "source": "walk_in"
        })
        self.assertEqual(r_token.status_code, 201)
        tok_data = r_token.json()
        tok_num = tok_data["token_number"]
        tok_id = tok_data["id"]

        # Query in Marathi mentioning token number
        r_voice = client.post("/api/chat", json={
            "message": f"माझा टोकन नंबर {tok_num} आहे, माझा नंबर कधी येईल?",
            "token_id": tok_id,
            "language": "mr"
        })
        self.assertEqual(r_voice.status_code, 200)
        data = r_voice.json()
        self.assertEqual(data["intent"], "queue_status")
        self.assertIn(tok_num, data["reply"])
        self.assertIn("प्रतीक्षा वेळ", data["reply"])
        self.assertIsNotNone(data.get("structured_data"))
        self.assertEqual(data["structured_data"]["token_number"], tok_num)
        self.assertIn("wait_time_range_min", data["structured_data"])

    # 6. Intent Classification: Patient Registration Voice Draft
    def test_06_voice_patient_registration_intent(self):
        q = "I want to register new patient: my name is Ramesh Patil, age 45, General Medicine, phone 9822334455"
        r = client.post("/api/chat", json={"message": q, "language": "en"})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["intent"], "patient_registration")
        self.assertIsNotNone(data.get("structured_data"))
        s_data = data["structured_data"]
        self.assertEqual(s_data["type"], "patient_registration_draft")
        self.assertIn("Ramesh", s_data.get("name", ""))
        self.assertEqual(s_data.get("age"), 45)
        self.assertEqual(s_data.get("phone"), "9822334455")
        self.assertTrue(s_data.get("ready_to_confirm"))

    # 7. Emergency Intercept in Marathi
    def test_07_emergency_voice_red_flag_marathi(self):
        q = "मला छातीत तीव्र वेदना होत आहेत आणि चक्कर येऊन पडलो"
        r = client.post("/api/chat", json={"message": q, "language": "mr"})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["intent"], "emergency")
        self.assertEqual(data["urgency"], "EMERGENCY")
        self.assertIn("आपत्कालीन", data["reply"])
        self.assertIn("95526 25262", data["suggested_actions"][0]["label"])

    # 8. Emergency Intercept in Hindi
    def test_08_emergency_voice_red_flag_hindi(self):
        q = "मरीज बेहोश हो गया है और बहुत खून बह रहा है"
        r = client.post("/api/chat", json={"message": q, "language": "hi"})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["intent"], "emergency")
        self.assertEqual(data["urgency"], "EMERGENCY")
        self.assertIn("आपातकालीन", data["reply"])

    # 9. Spoken Text Sanitization for Text-to-Speech
    def test_09_spoken_text_sanitization(self):
        raw = "⚠️ **EMERGENCY!** Please visit [Emergency Desk](http://localhost) immediately! 🚨📞"
        clean = build_spoken_text(raw)
        self.assertNotIn("*", clean)
        self.assertNotIn("⚠️", clean)
        self.assertNotIn("🚨", clean)
        self.assertNotIn("http", clean)
        self.assertIn("EMERGENCY! Please visit Emergency Desk immediately!", clean)

    # 10. General FAQ & Hospital Schemes
    def test_10_general_faq_schemes(self):
        q = "Do you accept Ayushman Bharat and cashless insurance?"
        r = client.post("/api/chat", json={"message": q, "language": "en"})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["intent"], "general_faq")
        self.assertIn("Cashless Mediclaim", data["reply"])


if __name__ == "__main__":
    unittest.main()
