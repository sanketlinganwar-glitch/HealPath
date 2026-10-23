import sys
import os
from fastapi.testclient import TestClient

# Ensure root is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app

client = TestClient(app)

def run_smoke_tests():
    print("=" * 60)
    print("STARTING QUEUECARE / HEALPATH BACKEND SMOKE TESTS")
    print("=" * 60)

    # 0. Clean reset
    r_reset = client.post("/api/demo/reset")
    assert r_reset.status_code == 200, "Reset failed"
    print("  [OK] Demo reset: Clean database initialized")

    # 1. Health check
    print("\n[1] Testing GET /api/health...")
    r = client.get("/api/health")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    assert r.json() == {"status": "ok"}
    print("  [OK] Health check passed: status ok")

    # 2. Departments
    print("\n[2] Testing GET /api/departments...")
    r = client.get("/api/departments")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    departments = r.json()
    assert len(departments) == 5, f"Expected 5 departments, got {len(departments)}"
    print(f"  [OK] Found {len(departments)} departments: {[d['name'] for d in departments]}")

    # 3. Staff Login (admin & doctor)
    print("\n[3] Testing POST /api/auth/login (admin & doctor1)...")
    r_admin = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r_admin.status_code == 200, f"Admin login failed: {r_admin.text}"
    admin_data = r_admin.json()
    admin_token = admin_data["access_token"]
    assert admin_data["role"] == "admin"
    print("  [OK] Admin login successful, JWT token acquired")

    r_doc = client.post("/api/auth/login", json={"username": "doctor1", "password": "doctor123"})
    assert r_doc.status_code == 200, f"Doctor login failed: {r_doc.text}"
    doc_data = r_doc.json()
    doc_token = doc_data["access_token"]
    doctor_id = doc_data["doctor_id"]
    assert doc_data["role"] == "doctor"
    print(f"  [OK] Doctor login successful: Doctor ID {doctor_id}")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    # 4. Create Token (Patient registration)
    print("\n[4] Testing POST /api/tokens...")
    patient_payload = {
        "name": "Kavita Deshmukh",
        "phone": "9988776655",
        "age": 35,
        "gender": "female",
        "department_id": 1,
        "priority": "normal",
        "symptoms": "Mild fever and sore throat",
        "source": "online"
    }
    r = client.post("/api/tokens", json=patient_payload)
    assert r.status_code == 201, f"Create token failed: {r.text}"
    token_obj = r.json()
    token_id = token_obj["id"]
    token_number = token_obj["token_number"]
    print(f"  [OK] Token created successfully: {token_number} (ID: {token_id}, Position: {token_obj['position']})")

    # 5. Duplicate Phone check (409 Conflict)
    print("\n[5] Testing duplicate token prevention in same department (409 Conflict)...")
    r_dup = client.post("/api/tokens", json=patient_payload)
    assert r_dup.status_code == 409, f"Expected 409 Conflict, got {r_dup.status_code}"
    print(f"  [OK] Duplicate correctly rejected with 409: {r_dup.json()['detail']}")

    # 6. Track Token Details
    print(f"\n[6] Testing GET /api/tokens/{token_id}...")
    r = client.get(f"/api/tokens/{token_id}")
    assert r.status_code == 200, f"Get token failed: {r.text}"
    track_data = r.json()
    assert "now_serving" in track_data
    assert "department_waiting_count" in track_data
    print(f"  [OK] Token tracked: Status={track_data['status']}, Waiting In Dept={track_data['department_waiting_count']}")

    # 7. Complete any existing in_progress consultation for doctor1 first so call-next works cleanly
    print(f"\n[7] Checking Doctor {doctor_id} current console state...")
    r_curr = client.get(f"/api/doctors/{doctor_id}/current", headers=doc_headers)
    assert r_curr.status_code == 200, f"Doctor current failed: {r_curr.text}"
    curr_data = r_curr.json()
    if curr_data["current"]:
        active_id = curr_data["current"]["id"]
        print(f"  - Completing prior active consultation {curr_data['current']['token_number']} (ID: {active_id})...")
        r_comp = client.post(f"/api/tokens/{active_id}/complete", headers=doc_headers)
        assert r_comp.status_code == 200

    # 8. Call Next Patient
    print(f"\n[8] Testing POST /api/doctors/{doctor_id}/call-next...")
    r_call = client.post(f"/api/doctors/{doctor_id}/call-next", headers=doc_headers)
    assert r_call.status_code == 200, f"Call-next failed: {r_call.text}"
    call_res = r_call.json()
    assert call_res["token"] is not None
    called_token = call_res["token"]
    called_id = called_token["id"]
    print(f"  [OK] Called next patient: {called_token['token_number']} (Status: {called_token['status']})")

    # 9. Complete Consultation
    print(f"\n[9] Testing POST /api/tokens/{called_id}/complete...")
    r_comp = client.post(f"/api/tokens/{called_id}/complete", headers=doc_headers)
    assert r_comp.status_code == 200, f"Complete failed: {r_comp.text}"
    comp_res = r_comp.json()
    assert comp_res["status"] == "completed"
    assert comp_res["completed_at"] is not None
    print(f"  [OK] Consultation completed: {comp_res['token_number']} at {comp_res['completed_at']}")

    # 10. Check Stats
    print("\n[10] Testing GET /api/stats...")
    r_stats = client.get("/api/stats", headers=admin_headers)
    assert r_stats.status_code == 200, f"Stats failed: {r_stats.text}"
    stats_data = r_stats.json()
    print(f"  [OK] Stats retrieved: Total={stats_data['total_tokens']}, Completed={stats_data['completed']}, Waiting={stats_data['waiting']}, Avg Consult={stats_data['avg_consult_min']}m")

    # 11. AI Department Suggestion
    print("\n[11] Testing POST /api/ai/suggest-department...")
    r_ai = client.post("/api/ai/suggest-department", json={"symptoms": "sharp chest pain radiating to left arm"})
    assert r_ai.status_code == 200, f"AI suggest failed: {r_ai.text}"
    ai_data = r_ai.json()
    assert ai_data["department_name"] == "Cardiology"
    assert "disclaimer" in ai_data
    print(f"  [OK] AI Triage: {ai_data['department_name']} -> {ai_data['reason']}")

    # 12. Multilingual Chatbot
    print("\n[12] Testing POST /api/chat...")
    r_chat = client.post("/api/chat", json={"message": "When is my turn?", "language": "en", "token_id": token_id})
    assert r_chat.status_code == 200, f"Chat failed: {r_chat.text}"
    chat_res = r_chat.json()
    print(f"  [OK] Chat Response: {chat_res['reply']}")

    # 13. Token Reschedule Turn
    print(f"\n[13] Testing POST /api/tokens/{token_id}/reschedule...")
    # Create another waiting token to test reschedule
    r_resched_token = client.post("/api/tokens", json={
        "name": "Nilesh Shinde", "phone": "9977665544", "age": 40, "gender": "male",
        "department_id": 1, "priority": "normal", "symptoms": "Headache", "source": "online"
    })
    resched_id = r_resched_token.json()["id"]
    r_resched = client.post(f"/api/tokens/{resched_id}/reschedule", json={"delay_minutes": 15})
    assert r_resched.status_code == 200, f"Reschedule failed: {r_resched.text}"
    print(f"  [OK] Rescheduled turn by 15 mins for token ID {resched_id}")

    # 14. Token Messages
    print(f"\n[14] Testing GET /api/tokens/{resched_id}/messages...")
    r_msgs = client.get(f"/api/tokens/{resched_id}/messages")
    assert r_msgs.status_code == 200
    msgs = r_msgs.json()
    assert len(msgs) >= 2  # initial message + reschedule message
    print(f"  [OK] Found {len(msgs)} messages for token ID {resched_id}")

    print("\n" + "=" * 60)
    print("ALL SMOKE TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_smoke_tests()
