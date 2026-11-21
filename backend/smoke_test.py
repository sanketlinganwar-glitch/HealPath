import sys
import os
from datetime import datetime, date, timedelta
from fastapi.testclient import TestClient

# Ensure root is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app

client = TestClient(app)

def run_smoke_tests():
    print("=" * 60)
    print("STARTING HEALPATH 2.0 BACKEND COMPREHENSIVE SMOKE TESTS")
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

    # 4. Create Token (Patient registration) with Secure Hash
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
    secure_hash = token_obj.get("secure_hash")
    assert secure_hash is not None, "Token must have secure_hash for QR code tracking"
    print(f"  [OK] Token created successfully: {token_number} (ID: {token_id}, SecureHash: {secure_hash[:8]}...)")

    # 5. Duplicate Phone check (409 Conflict)
    print("\n[5] Testing duplicate token prevention in same department (409 Conflict)...")
    r_dup = client.post("/api/tokens", json=patient_payload)
    assert r_dup.status_code == 409, f"Expected 409 Conflict, got {r_dup.status_code}"
    print(f"  [OK] Duplicate correctly rejected with 409: {r_dup.json()['detail']}")

    # 6. Track Token Details & Secure QR Lookup
    print(f"\n[6] Testing GET /api/tokens/{token_id} and GET /api/tokens/secure/{secure_hash}...")
    r = client.get(f"/api/tokens/{token_id}")
    assert r.status_code == 200, f"Get token failed: {r.text}"
    track_data = r.json()
    assert "now_serving" in track_data
    assert "qr_tracking_url" in track_data

    r_sec = client.get(f"/api/tokens/secure/{secure_hash}")
    assert r_sec.status_code == 200, f"Secure QR token lookup failed: {r_sec.text}"
    sec_data = r_sec.json()
    assert sec_data["token_number"] == token_number
    print(f"  [OK] Token tracked & Secure QR validated: Status={track_data['status']}")

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

    # 9. Digital Prescription Management
    print(f"\n[9] Testing POST /api/prescriptions for active consultation...")
    rx_payload = {
        "token_id": called_id,
        "patient_id": called_token["patient"]["id"],
        "doctor_id": doctor_id,
        "diagnosis": "Acute Pharyngitis & Mild Bronchitis",
        "medicines": [
            {"name": "Azithromycin", "dosage": "500mg", "frequency": "1-0-0", "duration": "3 days", "instructions": "1 hour before food"},
            {"name": "Paracetamol", "dosage": "650mg", "frequency": "1-0-1", "duration": "5 days", "instructions": "After meals"}
        ],
        "clinical_notes": "Advised warm saline gargles twice daily. Keep hydrated.",
        "tests_recommended": "Chest X-ray if fever persists beyond 48 hours",
        "follow_up_date": (date.today() + timedelta(days=5)).isoformat()
    }
    r_rx = client.post("/api/prescriptions", json=rx_payload, headers=doc_headers)
    assert r_rx.status_code == 201, f"Prescription creation failed: {r_rx.text}"
    rx_res = r_rx.json()
    assert len(rx_res["medicines"]) == 2
    print(f"  [OK] Digital prescription created (Rx ID: {rx_res['id']}) for Doctor {rx_res['doctor_name']}")

    # 10. Complete Consultation
    print(f"\n[10] Testing POST /api/tokens/{called_id}/complete...")
    r_comp = client.post(f"/api/tokens/{called_id}/complete", headers=doc_headers)
    assert r_comp.status_code == 200, f"Complete failed: {r_comp.text}"
    comp_res = r_comp.json()
    assert comp_res["status"] == "completed"
    assert comp_res["completed_at"] is not None
    print(f"  [OK] Consultation completed: {comp_res['token_number']} at {comp_res['completed_at']}")

    # 11. Patient Feedback Submission
    print(f"\n[11] Testing POST /api/feedback for completed consultation...")
    fb_payload = {
        "token_id": called_id,
        "rating": 5,
        "wait_time_rating": 4,
        "staff_rating": 5,
        "comments": "Very quick and professional care. Digital prescription received seamlessly!",
        "is_anonymous": False
    }
    r_fb = client.post("/api/feedback", json=fb_payload)
    assert r_fb.status_code == 201, f"Feedback submission failed: {r_fb.text}"
    fb_res = r_fb.json()
    assert fb_res["rating"] == 5

    r_fbsum = client.get("/api/feedback/summary")
    assert r_fbsum.status_code == 200
    fbsum_data = r_fbsum.json()
    assert fbsum_data["total_reviews"] > 0
    print(f"  [OK] Patient feedback submitted & aggregated: Average Rating = {fbsum_data['average_rating']}/5")

    # 12. Controlled Emergency Priority Workflow & Audit Trail
    print(f"\n[12] Testing Emergency Flagging & Verification Audit...")
    # Flag emergency on token_id
    r_flag = client.post(f"/api/tokens/{token_id}/emergency-flag", json={"reason": "Sudden acute dyspnea and tachycardia"}, headers=admin_headers)
    assert r_flag.status_code == 200, f"Emergency flag failed: {r_flag.text}"
    flag_res = r_flag.json()
    assert flag_res["priority"] == "emergency"

    # Clinical verification
    r_verify = client.post(f"/api/tokens/{token_id}/emergency-verify", json={"action": "verify_emergency", "clinical_notes": "SpO2 88%, urgent ECG required"}, headers=doc_headers)
    assert r_verify.status_code == 200, f"Emergency verify failed: {r_verify.text}"

    # Check audit trail
    r_audit = client.get(f"/api/tokens/{token_id}/emergency-audit", headers=admin_headers)
    assert r_audit.status_code == 200
    audits = r_audit.json()
    assert len(audits) >= 2
    print(f"  [OK] Emergency verified with full audit trail ({len(audits)} audit entries)")

    # 13. Online Appointment Booking & Slot Availability
    print(f"\n[13] Testing GET /api/appointments/slots & POST /api/appointments/book...")
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    r_slots = client.get(f"/api/appointments/slots?doctor_id={doctor_id}&date_str={tomorrow}")
    assert r_slots.status_code == 200, f"Slots failed: {r_slots.text}"
    slots = r_slots.json()
    assert len(slots) > 0, "Doctor must have available slots tomorrow"
    chosen_slot = next(s for s in slots if s["is_available"])
    print(f"  [OK] Found {len(slots)} consultation slots. Selected: {chosen_slot['time']}")

    appt_payload = {
        "name": "Nitin Gadkari",
        "phone": "9822001122",
        "age": 55,
        "gender": "male",
        "department_id": 1,
        "doctor_id": doctor_id,
        "slot_time": chosen_slot["slot_datetime"],
        "notes": "Follow-up consultation for hypertension",
        "source": "online"
    }
    r_book = client.post("/api/appointments/book", json=appt_payload)
    assert r_book.status_code == 201, f"Appointment booking failed: {r_book.text}"
    book_res = r_book.json()
    appt_id = book_res["id"]
    appt_code = book_res["appointment_code"]
    assert "APT-" in appt_code
    print(f"  [OK] Appointment booked successfully: {appt_code} (ID: {appt_id})")

    # Conflict check
    r_conflict = client.post("/api/appointments/book", json=appt_payload)
    assert r_conflict.status_code == 409
    print(f"  [OK] Double booking correctly prevented with 409 Conflict")

    # 14. Convert Appointment to Live Queue Token (Staff check-in)
    print(f"\n[14] Testing POST /api/appointments/{appt_id}/check-in...")
    r_checkin = client.post(f"/api/appointments/{appt_id}/check-in", headers=admin_headers)
    assert r_checkin.status_code == 200, f"Check-in failed: {r_checkin.text}"
    checkin_tok = r_checkin.json()
    assert checkin_tok["source"] == "appointment"
    print(f"  [OK] Appointment checked in to active Token: {checkin_tok['token_number']}")

    # 15. Doctor Duty Roster Management
    print(f"\n[15] Testing PATCH /api/doctors/{doctor_id}/roster...")
    roster_payload = {
        "duty_status": "busy",
        "shift_start": "09:00",
        "shift_end": "18:00",
        "break_start": "13:00",
        "break_end": "14:00"
    }
    r_roster = client.patch(f"/api/doctors/{doctor_id}/roster", json=roster_payload, headers=admin_headers)
    assert r_roster.status_code == 200
    roster_res = r_roster.json()
    assert roster_res["duty_status"] == "busy"
    print(f"  [OK] Doctor duty roster updated: DutyStatus={roster_res['duty_status']}")

    # 16. Advanced Hospital Analytics & Notification Logs
    print(f"\n[16] Testing GET /api/admin/analytics and /api/admin/notifications...")
    r_analytics = client.get("/api/admin/analytics?range=weekly", headers=admin_headers)
    assert r_analytics.status_code == 200
    analytics_data = r_analytics.json()
    assert "total_registered_patients" in analytics_data
    assert "completed_consultations" in analytics_data
    assert "doctor_stats" in analytics_data

    r_notifs = client.get("/api/admin/notifications", headers=admin_headers)
    assert r_notifs.status_code == 200
    notifs = r_notifs.json()
    assert len(notifs) > 0
    print(f"  [OK] Advanced analytics & notification logs verified: {len(notifs)} notifications tracked")

    # 17. AI Suggestion & Chat
    print("\n[17] Testing AI Suggestion & Chatbot 2.0...")
    r_ai = client.post("/api/ai/suggest-department", json={"symptoms": "sharp chest pain radiating to left arm"})
    assert r_ai.status_code == 200
    assert r_ai.json()["department_name"] == "Cardiology"

    r_chat = client.post("/api/chat", json={"message": "I want to book an appointment with cardiologist", "language": "en"})
    assert r_chat.status_code == 200
    assert len(r_chat.json()["suggested_actions"]) > 0
    print("  [OK] AI Assistant 2.0 triage and suggested actions verified")

    print("\n" + "=" * 60)
    print("ALL HEALPATH 2.0 SMOKE TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_smoke_tests()
