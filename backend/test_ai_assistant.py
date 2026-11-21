"""
HACKBYTE (HealPath / QueueCare) - Stage 5 AI Health Assistant Test Suite
Validates Google Gemini 2.5 Flash Integration, Offline Fallback, Medical Safety Red-Flags,
Rate Limiting, Multi-Turn Isolation, and Trilingual OPD Triage.
"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# Ensure root is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app
from backend.services.ai_service import (
    conversation_store,
    detect_emergency_red_flags,
    get_offline_triage_fallback,
    HEALTHCARE_DISCLAIMER
)

client = TestClient(app)


class TestAIHealthAssistant(unittest.TestCase):
    def setUp(self):
        # Reset database to known seed state
        client.post("/api/demo/reset")

    # 1. Mocked Successful Gemini Triage
    @patch("backend.services.ai_service.get_gemini_client")
    def test_01_gemini_api_success_mocked(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = '''```json
        {
            "symptom_summary": "Substernal chest pain with left shoulder radiation",
            "recommended_department_id": 2,
            "recommended_department_name": "Cardiology",
            "urgency_category": "URGENT",
            "reason": "Cardiovascular evaluation recommended for radiating chest discomfort.",
            "suggested_next_step": "Proceed to Cardiology OPD Room 102 for ECG screening.",
            "follow_up_questions": ["Does the pain increase with exertion?", "Any family history of heart disease?"],
            "emergency_warning_indicators": []
        }
        ```'''
        mock_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        payload = {
            "main_symptom": "Chest discomfort radiating to left shoulder",
            "duration": "3 hours",
            "severity": "moderate",
            "age_group": "adult",
            "associated_symptoms": ["Mild sweating"],
            "language": "en"
        }
        r = client.post("/api/ai/triage", json=payload)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["recommended_department_id"], 2)
        self.assertEqual(data["recommended_department_name"], "Cardiology")
        self.assertEqual(data["is_offline_fallback"], False)
        self.assertIn("ECG", data["suggested_next_step"])
        self.assertIn(HEALTHCARE_DISCLAIMER, data["disclaimer"])

    # 2. Offline Fallback when Key is Unset / Empty
    @patch("backend.services.ai_service.get_gemini_client", return_value=None)
    def test_02_fallback_when_gemini_key_unset(self, mock_get_client):
        payload = {
            "main_symptom": "Severe knee joint pain and swelling",
            "duration": "1 day",
            "severity": "moderate",
            "age_group": "adult",
            "associated_symptoms": ["Difficulty bending leg"],
            "language": "en"
        }
        r = client.post("/api/ai/triage", json=payload)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data["is_offline_fallback"])
        self.assertEqual(data["recommended_department_name"], "Orthopedics")
        self.assertIn("Orthopedics", data["reason"])
        self.assertIn("Offline", data["disclaimer"])

    # 3. Fallback when Gemini API raises an exception
    @patch("backend.services.ai_service.get_gemini_client")
    def test_03_fallback_when_gemini_raises_exception(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = RuntimeError("Gemini API connection error")
        mock_get_client.return_value = mock_client

        payload = {
            "main_symptom": "Earache and reduced hearing",
            "duration": "3 days",
            "severity": "mild",
            "age_group": "adult",
            "associated_symptoms": [],
            "language": "en"
        }
        r = client.post("/api/ai/triage", json=payload)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data["is_offline_fallback"])
        self.assertEqual(data["recommended_department_name"], "ENT")

    # 4. Fallback when Gemini API times out
    @patch("backend.services.ai_service.get_gemini_client")
    def test_04_fallback_when_gemini_times_out(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = TimeoutError("Request timed out after 15000ms")
        mock_get_client.return_value = mock_client

        payload = {
            "main_symptom": "Child has fever and persistent vomiting",
            "duration": "2 days",
            "severity": "moderate",
            "age_group": "child",
            "associated_symptoms": ["Low appetite"],
            "language": "en"
        }
        r = client.post("/api/ai/triage", json=payload)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data["is_offline_fallback"])
        self.assertEqual(data["recommended_department_name"], "Pediatrics")

    # 5. Emergency Red-Flag Detection (English)
    def test_05_emergency_red_flags_english(self):
        payload = {
            "main_symptom": "Crushing chest pain radiating to left arm with severe shortness of breath",
            "duration": "20 minutes",
            "severity": "severe",
            "age_group": "adult",
            "language": "en"
        }
        r = client.post("/api/ai/triage", json=payload)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["urgency_category"], "EMERGENCY")
        self.assertTrue(len(data["emergency_warning_indicators"]) > 0)
        self.assertIn("Emergency", data["suggested_next_step"])

    # 6. Emergency Red-Flag Detection (Hindi)
    def test_06_emergency_red_flags_hindi(self):
        payload = {
            "main_symptom": "छाती में दर्द और सांस लेने में बहुत तकलीफ हो रही है",
            "duration": "10 min",
            "severity": "severe",
            "age_group": "adult",
            "language": "hi"
        }
        r = client.post("/api/ai/triage", json=payload)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["urgency_category"], "EMERGENCY")
        self.assertIn("आपातकालीन", data["suggested_next_step"])

    # 7. Emergency Red-Flag Detection (Marathi)
    def test_07_emergency_red_flags_marathi(self):
        payload = {
            "main_symptom": "छातीत तीव्र वेदना आणि श्वास घेण्यास खूप त्रास होत आहे",
            "duration": "15 min",
            "severity": "severe",
            "age_group": "adult",
            "language": "mr"
        }
        r = client.post("/api/ai/triage", json=payload)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["urgency_category"], "EMERGENCY")
        self.assertIn("आपत्कालीन", data["suggested_next_step"])

    # 8. Department Recommendation Mapping: Cardiology
    def test_08_department_mapping_cardiology(self):
        payload = {"symptoms": "High blood pressure and heart palpitations"}
        r = client.post("/api/ai/suggest-department", json=payload)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["department_name"], "Cardiology")

    # 9. Department Recommendation Mapping: Orthopedics
    def test_09_department_mapping_orthopedics(self):
        payload = {"symptoms": "Severe knee joint pain and ankle sprain after fall"}
        r = client.post("/api/ai/suggest-department", json=payload)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["department_name"], "Orthopedics")

    # 10. Department Recommendation Mapping: Pediatrics
    def test_10_department_mapping_pediatrics(self):
        payload = {"symptoms": "Infant vaccination and pediatric baby checkup"}
        r = client.post("/api/ai/suggest-department", json=payload)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["department_name"], "Pediatrics")

    # 11. Department Recommendation Mapping: ENT
    def test_11_department_mapping_ent(self):
        payload = {"symptoms": "Severe ear discharge and sinus blockage"}
        r = client.post("/api/ai/suggest-department", json=payload)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["department_name"], "ENT")

    # 12. Input Validation (Empty String / Invalid Payload)
    def test_12_invalid_input_validation(self):
        # Empty string violates min_length=2
        r_empty = client.post("/api/ai/triage", json={"main_symptom": ""})
        self.assertEqual(r_empty.status_code, 422)

        # Missing required field
        r_missing = client.post("/api/ai/triage", json={})
        self.assertEqual(r_missing.status_code, 422)

    # 13. Multi-Turn Conversation Context Retention
    def test_13_multi_turn_conversation_context(self):
        # Turn 1
        r1 = client.post("/api/chat", json={
            "message": "Hello, my name is Rahul and I need doctor advice.",
            "language": "en"
        })
        self.assertEqual(r1.status_code, 200)
        d1 = r1.json()
        conv_id = d1.get("conversation_id")
        self.assertIsNotNone(conv_id)

        # Turn 2 using the same conversation_id
        r2 = client.post("/api/chat", json={
            "message": "Which department should I visit for ear pain?",
            "conversation_id": conv_id,
            "language": "en"
        })
        self.assertEqual(r2.status_code, 200)
        d2 = r2.json()
        self.assertEqual(d2["conversation_id"], conv_id)

        # Verify session messages stored in memory
        session = conversation_store.get_or_create(conv_id)
        self.assertTrue(len(session.messages) >= 2)

    # 14. Rate Limiter Blocks Rapid Requests (>20 req/min)
    def test_14_rate_limiting(self):
        session = conversation_store.get_or_create()
        cid = session.conversation_id

        # Fire 20 requests
        for i in range(20):
            session.is_rate_limited(max_requests=20, window_seconds=60)

        # 21st request should be rate-limited
        r = client.post("/api/chat", json={
            "message": "Are you there?",
            "conversation_id": cid,
            "language": "en"
        })
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn("too quickly", data["reply"])

    # 15. Conversation Reset Clears History
    def test_15_conversation_reset(self):
        r1 = client.post("/api/chat", json={"message": "First message before reset", "language": "en"})
        cid = r1.json().get("conversation_id")
        self.assertIsNotNone(cid)

        # Reset conversation
        r_reset = client.post("/api/ai/conversation/reset", json={"conversation_id": cid})
        self.assertEqual(r_reset.status_code, 200)
        self.assertTrue(r_reset.json()["success"])

        # Resetting again should gracefully report inactive
        r_reset2 = client.post("/api/ai/conversation/reset", json={"conversation_id": cid})
        self.assertEqual(r_reset2.status_code, 200)

    # 16. Conversation Session Isolation (Two Users Do Not Leak Context)
    def test_16_conversation_isolation(self):
        r_user1 = client.post("/api/chat", json={"message": "Patient A: Knee pain", "language": "en"})
        cid1 = r_user1.json()["conversation_id"]

        r_user2 = client.post("/api/chat", json={"message": "Patient B: Eye irritation", "language": "en"})
        cid2 = r_user2.json()["conversation_id"]

        self.assertNotEqual(cid1, cid2)

        s1 = conversation_store.get_or_create(cid1)
        s2 = conversation_store.get_or_create(cid2)

        # Ensure messages are completely separate
        msgs1 = [m["text"] for m in s1.messages]
        msgs2 = [m["text"] for m in s2.messages]

        self.assertTrue(any("Patient A" in m for m in msgs1))
        self.assertFalse(any("Patient A" in m for m in msgs2))

    # 17. Live Token Context Injection
    def test_17_token_context_injection(self):
        # Create a real token
        r_token = client.post("/api/tokens", json={
            "name": "Sunita Patil",
            "phone": "9822334455",
            "age": 42,
            "gender": "female",
            "department_id": 1,
            "priority": "normal",
            "symptoms": "Routine checkup",
            "source": "online"
        })
        self.assertEqual(r_token.status_code, 201)
        token_id = r_token.json()["id"]

        # Ask about queue wait passing the token_id
        r_chat = client.post("/api/chat", json={
            "message": "What is my wait time?",
            "token_id": token_id,
            "language": "en"
        })
        self.assertEqual(r_chat.status_code, 200)
        data = r_chat.json()
        self.assertEqual(data["intent"], "queue_status")


if __name__ == "__main__":
    unittest.main()
