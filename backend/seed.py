import secrets
import json
import hashlib
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session

from backend.models import (
    Department, Doctor, User, Patient, Token, Appointment, OTSchedule, Message,
    EmergencyAuditLog, NotificationLog, Prescription, Feedback
)
from backend.auth import hash_password

DEPARTMENTS_DATA = [
    {"name": "General Medicine", "code": "G", "default_consult_min": 8},
    {"name": "Cardiology", "code": "C", "default_consult_min": 10},
    {"name": "Orthopedics", "code": "O", "default_consult_min": 9},
    {"name": "Pediatrics", "code": "P", "default_consult_min": 7},
    {"name": "ENT", "code": "E", "default_consult_min": 8},
]

DOCTORS_DATA = [
    # General Medicine / Surgery (Sanjeevan Hospital & Multispecialty)
    {"name": "Dr. Rajesh Sharma", "dept_code": "G", "specialization": "General Physician & Critical Care", "room": "Room 101", "status": "available", "duty_status": "available", "shift_start": "09:00", "shift_end": "17:00", "registration_number": "MMC 62114", "qualification": "M.D. (General Medicine)"},
    {"name": "Dr. Anita Desai", "dept_code": "G", "specialization": "Internal Medicine", "room": "Room 102", "status": "off", "duty_status": "off_duty", "shift_start": "14:00", "shift_end": "20:00", "registration_number": "MMC 59402", "qualification": "M.B.B.S., D.N.B."},
    {"name": "Dr. Sunil M. Agrawal", "dept_code": "G", "specialization": "Chief Surgeon & Laparoscopy Specialist", "room": "Room 1 (Consultant Suite)", "status": "available", "duty_status": "available", "shift_start": "10:00", "shift_end": "14:00", "registration_number": "MMC 74218", "qualification": "M.S. (Orthopedics & Surgery)"},
    {"name": "Dr. Vijay S. Kawalkar", "dept_code": "G", "specialization": "Senior Consultant Laparoscopic Surgeon", "room": "Room 2 (Surgical OPD)", "status": "available", "duty_status": "available", "shift_start": "11:00", "shift_end": "14:00", "registration_number": "MMC 65192", "qualification": "M.S. (Gen Surgery), FIAGES"},
    {"name": "Dr. H. S. Bora", "dept_code": "G", "specialization": "MD General Medicine & Critical Care", "room": "Room 3 (Medicine Wing)", "status": "available", "duty_status": "available", "shift_start": "10:30", "shift_end": "14:30", "registration_number": "MMC 58910", "qualification": "M.D. (Medicine & Critical Care)"},
    {"name": "Dr. Vinay Pande", "dept_code": "G", "specialization": "Chest & Pulmonary Critical Care", "room": "Room 4 (Chest Clinic)", "status": "available", "duty_status": "available", "shift_start": "10:00", "shift_end": "14:00", "registration_number": "MMC 81290", "qualification": "M.D. (Pulmonary Medicine)"},
    # Cardiology
    {"name": "Dr. Meera Kulkarni", "dept_code": "C", "specialization": "Cardiologist", "room": "Room 201", "status": "available", "duty_status": "available", "shift_start": "09:00", "shift_end": "16:00", "registration_number": "MMC 71042", "qualification": "M.D., D.M. (Cardiology)"},
    {"name": "Dr. Vikram Malhotra", "dept_code": "C", "specialization": "Cardiac Surgeon", "room": "Room 202", "status": "off", "duty_status": "off_duty", "shift_start": "11:00", "shift_end": "19:00", "registration_number": "MMC 80112", "qualification": "M.Ch. (Cardiothoracic Surgery)"},
    # Orthopedics & Diagnostic Imaging
    {"name": "Dr. Suresh Patil", "dept_code": "O", "specialization": "Orthopedic Surgeon", "room": "Room 301", "status": "available", "duty_status": "available", "shift_start": "09:00", "shift_end": "17:00", "registration_number": "MMC 64320", "qualification": "M.S. (Orthopedics)"},
    {"name": "Dr. Sunita Rao", "dept_code": "O", "specialization": "Spine Specialist", "room": "Room 302", "status": "off", "duty_status": "off_duty", "shift_start": "10:00", "shift_end": "18:00", "registration_number": "MMC 73501", "qualification": "M.S. (Ortho), Fellowship Spine"},
    {"name": "Dr. Lalit Paldiwal", "dept_code": "O", "specialization": "MD Radiology & Sonography", "room": "Room 6 (Imaging Suite)", "status": "available", "duty_status": "available", "shift_start": "09:30", "shift_end": "13:30", "registration_number": "MMC 68904", "qualification": "M.D. (Radiodiagnosis)"},
    # Pediatrics & Maternal Care
    {"name": "Dr. Priya Nair", "dept_code": "P", "specialization": "Pediatrician", "room": "Room 401", "status": "available", "duty_status": "available", "shift_start": "08:30", "shift_end": "15:30", "registration_number": "MMC 76240", "qualification": "M.D. (Pediatrics)"},
    {"name": "Dr. Amit Verma", "dept_code": "P", "specialization": "Neonatologist", "room": "Room 402", "status": "off", "duty_status": "off_duty", "shift_start": "13:00", "shift_end": "21:00", "registration_number": "MMC 83410", "qualification": "M.D. (Pediatrics), Neonatology"},
    {"name": "Dr. Sheetal S. Agrawal", "dept_code": "P", "specialization": "MD Obstetrics & Gynecology", "room": "Room 5 (Women Clinic)", "status": "available", "duty_status": "available", "shift_start": "10:00", "shift_end": "14:00", "registration_number": "MMC 79331", "qualification": "M.D. (Obstetrics & Gynecology)"},
    # ENT
    {"name": "Dr. Rohan Joshi", "dept_code": "E", "specialization": "ENT Specialist", "room": "Room 501", "status": "available", "duty_status": "available", "shift_start": "10:00", "shift_end": "18:00", "registration_number": "MMC 72890", "qualification": "M.S. (ENT)"},
    {"name": "Dr. Kavita Iyer", "dept_code": "E", "specialization": "Head & Neck Surgeon", "room": "Room 502", "status": "off", "duty_status": "off_duty", "shift_start": "12:00", "shift_end": "19:00", "registration_number": "MMC 69120", "qualification": "M.S. (ENT), Head & Neck Surgery"},
]

def seed_database(db: Session, force_reset: bool = False):
    """Seed initial data if empty or on force_reset."""
    if force_reset:
        db.query(EmergencyAuditLog).delete()
        db.query(NotificationLog).delete()
        db.query(Prescription).delete()
        db.query(Feedback).delete()
        db.query(Message).delete()
        db.query(Token).delete()
        db.query(Appointment).delete()
        db.query(OTSchedule).delete()
        db.query(Patient).delete()
        db.query(User).delete()
        db.query(Doctor).delete()
        db.query(Department).delete()
        db.commit()

    dept_count = db.query(Department).count()
    if dept_count > 0 and not force_reset:
        return

    # 1. Departments
    dept_objs = {}
    for d in DEPARTMENTS_DATA:
        dept = Department(name=d["name"], code=d["code"], default_consult_min=d["default_consult_min"])
        db.add(dept)
        db.flush()
        dept_objs[d["code"]] = dept

    # 2. Doctors
    doc_objs = []
    for d in DOCTORS_DATA:
        doctor = Doctor(
            name=d["name"],
            department_id=dept_objs[d["dept_code"]].id,
            specialization=d["specialization"],
            room=d["room"],
            status=d["status"],
            duty_status=d.get("duty_status", "available"),
            shift_start=d.get("shift_start", "09:00"),
            shift_end=d.get("shift_end", "17:00"),
            break_start="13:00",
            break_end="14:00",
            registration_number=d.get("registration_number", "MMC 74218"),
            qualification=d.get("qualification", "MBBS, MD")
        )
        db.add(doctor)
        db.flush()
        doc_objs.append(doctor)

    # 3. Users (admin, receptionist, doctors)
    admin_user = User(
        username="admin",
        password_hash=hash_password("admin123"),
        role="admin",
        name="Hospital Administrator",
        doctor_id=None
    )
    reception_user = User(
        username="reception",
        password_hash=hash_password("reception123"),
        role="receptionist",
        name="Sneha Patil (Reception)",
        doctor_id=None
    )
    db.add(admin_user)
    db.add(reception_user)

    for idx, doc in enumerate(doc_objs, start=1):
        doc_user = User(
            username=f"doctor{idx}",
            password_hash=hash_password("doctor123"),
            role="doctor",
            name=doc.name,
            doctor_id=doc.id
        )
        db.add(doc_user)
    db.flush()

    # 4. Patients & Sample Tokens
    today = date.today()
    now = datetime.now()

    sample_patients_tokens = [
        # Completed tokens (General Medicine)
        {
            "name": "Aarav Deshmukh", "phone": "9823011111", "age": 45, "gender": "male",
            "dept_code": "G", "priority": "normal", "status": "completed", "symptoms": "Mild viral fever",
            "created_offset": -120, "called_offset": -105, "completed_offset": -95, "doctor_idx": 0
        },
        {
            "name": "Sunita Shinde", "phone": "9823022222", "age": 62, "gender": "female",
            "dept_code": "G", "priority": "senior", "status": "completed", "symptoms": "High blood pressure checkup",
            "created_offset": -100, "called_offset": -85, "completed_offset": -75, "doctor_idx": 0
        },
        # In progress (General Medicine)
        {
            "name": "Rohan Gupta", "phone": "9823033333", "age": 34, "gender": "male",
            "dept_code": "G", "priority": "normal", "status": "in_progress", "symptoms": "Chronic cough and fatigue",
            "created_offset": -50, "called_offset": -10, "completed_offset": None, "doctor_idx": 0
        },
        # Waiting (General Medicine)
        {
            "name": "Manish Kale", "phone": "9823044444", "age": 29, "gender": "male",
            "dept_code": "G", "priority": "emergency", "symptoms": "Severe acute abdominal cramps",
            "status": "waiting", "created_offset": -25, "called_offset": None, "completed_offset": None,
            "emergency_reason": "Acute excruciating abdominal pain and tachycardia",
            "emergency_flagged_by": "reception",
            "emergency_verified_by": "Dr. Rajesh Sharma"
        },
        {
            "name": "Lata Joshi", "phone": "9823055555", "age": 68, "gender": "female",
            "dept_code": "G", "priority": "senior", "symptoms": "Joint swelling and fever",
            "status": "waiting", "created_offset": -40, "called_offset": None, "completed_offset": None
        },
        {
            "name": "Vijay Rathi", "phone": "9823066666", "age": 42, "gender": "male",
            "dept_code": "G", "priority": "normal", "symptoms": "Headache and acidity",
            "status": "waiting", "created_offset": -30, "called_offset": None, "completed_offset": None
        },
        # Skipped (General Medicine)
        {
            "name": "Deepak More", "phone": "9823077777", "age": 51, "gender": "male",
            "dept_code": "G", "priority": "normal", "status": "skipped", "symptoms": "Routine wellness check",
            "created_offset": -90, "called_offset": None, "completed_offset": None
        },
        # Cardiology
        {
            "name": "Ramesh Pawar", "phone": "9876543210", "age": 58, "gender": "male",
            "dept_code": "C", "priority": "senior", "status": "completed", "symptoms": "Chest tightness on stairs",
            "created_offset": -110, "called_offset": -95, "completed_offset": -82, "doctor_idx": 2
        },
        {
            "name": "Ananya Sen", "phone": "9876543211", "age": 49, "gender": "female",
            "dept_code": "C", "priority": "normal", "status": "in_progress", "symptoms": "Palpitations and dizziness",
            "created_offset": -60, "called_offset": -15, "completed_offset": None, "doctor_idx": 2
        },
        {
            "name": "Dilip Kadam", "phone": "9876543212", "age": 67, "gender": "male",
            "dept_code": "C", "priority": "senior", "status": "waiting", "symptoms": "Shortness of breath",
            "created_offset": -35, "called_offset": None, "completed_offset": None
        },
        {
            "name": "Prateek Shah", "phone": "9876543213", "age": 38, "gender": "male",
            "dept_code": "C", "priority": "normal", "status": "waiting", "symptoms": "Post-exercise chest discomfort",
            "created_offset": -20, "called_offset": None, "completed_offset": None
        },
        # Orthopedics
        {
            "name": "Balkrishna Gite", "phone": "9811122233", "age": 60, "gender": "male",
            "dept_code": "O", "priority": "senior", "status": "in_progress", "symptoms": "Severe knee arthritis",
            "created_offset": -45, "called_offset": -8, "completed_offset": None, "doctor_idx": 4
        },
        {
            "name": "Kiran Salunkhe", "phone": "9811122234", "age": 28, "gender": "female",
            "dept_code": "O", "priority": "normal", "status": "waiting", "symptoms": "Ankle twist during jogging",
            "created_offset": -15, "called_offset": None, "completed_offset": None
        },
        # Pediatrics
        {
            "name": "Master Vihaan Shinde", "phone": "9822233344", "age": 6, "gender": "male",
            "dept_code": "P", "priority": "normal", "status": "waiting", "symptoms": "High fever and throat redness",
            "created_offset": -20, "called_offset": None, "completed_offset": None
        },
        # ENT
        {
            "name": "Shubhangi Tawade", "phone": "9833344455", "age": 31, "gender": "female",
            "dept_code": "E", "priority": "normal", "status": "waiting", "symptoms": "Ear ache and hearing block",
            "created_offset": -18, "called_offset": None, "completed_offset": None
        },
    ]

    dept_seq_counters = {code: 0 for code in dept_objs.keys()}

    for item in sample_patients_tokens:
        patient = Patient(
            name=item["name"],
            phone=item["phone"],
            age=item["age"],
            gender=item["gender"],
            uhid=f"SH-445001-{item['phone'][-4:]}",
            blood_group="B+",
            allergies="None reported",
            created_at=now + timedelta(minutes=item["created_offset"])
        )
        db.add(patient)
        db.flush()

        dept = dept_objs[item["dept_code"]]
        dept_seq_counters[item["dept_code"]] += 1
        seq = dept_seq_counters[item["dept_code"]]
        token_num = f"{dept.code}-{seq:03d}"

        created_dt = now + timedelta(minutes=item["created_offset"])
        called_dt = now + timedelta(minutes=item["called_offset"]) if item["called_offset"] is not None else None
        completed_dt = now + timedelta(minutes=item["completed_offset"]) if item["completed_offset"] is not None else None
        doc_id = doc_objs[item["doctor_idx"]].id if "doctor_idx" in item else None

        token = Token(
            department_id=dept.id,
            doctor_id=doc_id,
            patient_id=patient.id,
            token_date=today,
            seq=seq,
            token_number=token_num,
            priority=item["priority"],
            status=item["status"],
            source="online" if seq % 2 == 1 else "walk_in",
            symptoms=item["symptoms"],
            sort_time=created_dt,
            created_at=created_dt,
            called_at=called_dt,
            completed_at=completed_dt,
            near_notified=False,
            secure_hash=secrets.token_hex(16),
            emergency_reason=item.get("emergency_reason"),
            emergency_flagged_by=item.get("emergency_flagged_by"),
            emergency_verified_by=item.get("emergency_verified_by"),
            emergency_flagged_at=created_dt if item.get("emergency_reason") else None
        )
        db.add(token)
        db.flush()

        if item.get("emergency_reason"):
            db.add(EmergencyAuditLog(
                token_id=token.id,
                action="verified",
                old_priority="normal",
                new_priority="emergency",
                staff_username="reception",
                staff_role="receptionist",
                reason=item["emergency_reason"],
                created_at=created_dt
            ))

        # Add initial system messages
        if item["status"] == "in_progress" and doc_id:
            assigned_doc = next(d for d in doc_objs if d.id == doc_id)
            db.add(Message(
                token_id=token.id,
                text=f"Please go to {assigned_doc.room}",
                kind="system",
                created_at=called_dt or now
            ))
        elif item["status"] == "completed":
            db.add(Message(
                token_id=token.id,
                text="Consultation completed. Take care!",
                kind="system",
                created_at=completed_dt or now
            ))
            # Seed sample prescription for completed consultation
            if doc_id:
                sample_meds = [
                    {"name": "Paracetamol", "dosage": "650mg", "frequency": "1-0-1", "duration": "3 days", "instructions": "After meals"},
                    {"name": "Cetirizine", "dosage": "10mg", "frequency": "0-0-1", "duration": "5 days", "instructions": "Before sleep"}
                ]
                rx_count = idx + 1
                rx_num = f"RX-2026-{rx_count:04d}"
                v_tok = secrets.token_hex(16)
                sig_h = hashlib.sha256(f"{rx_num}:{doc_id}:{patient.id}:{v_tok}".encode()).hexdigest()
                db.add(Prescription(
                    prescription_number=rx_num,
                    verification_token=v_tok,
                    token_id=token.id,
                    appointment_id=None,
                    doctor_id=doc_id,
                    patient_id=patient.id,
                    diagnosis="Viral Upper Respiratory Infection",
                    medicines=json.dumps(sample_meds),
                    clinical_notes="Patient advised adequate rest and hydration. Monitor temperature.",
                    tests_recommended="CBC if fever persists beyond 3 days",
                    follow_up_date=today + timedelta(days=5),
                    is_signed=True,
                    signed_at=completed_dt or now,
                    signature_hash=sig_h,
                    created_at=completed_dt or now,
                    status="active"
                ))
                # Seed sample feedback
                db.add(Feedback(
                    token_id=token.id,
                    patient_id=patient.id,
                    department_id=dept.id,
                    doctor_id=doc_id,
                    rating=5,
                    wait_time_rating=4,
                    staff_rating=5,
                    comments="Doctor Sharma was very thorough and attentive. Excellent queue management!",
                    is_anonymous=False,
                    is_moderated=True,
                    created_at=completed_dt or now
                ))

    # 5. OT Schedule
    ot_items = [
        {"theatre": "OT-1 (Major)", "procedure": "Total Knee Replacement", "surgeon": "Dr. Suresh Patil", "start_h": 9, "end_h": 11, "status": "Completed"},
        {"theatre": "Cath Lab", "procedure": "Coronary Angioplasty", "surgeon": "Dr. Meera Kulkarni", "start_h": 11, "end_h": 13, "status": "In Progress"},
        {"theatre": "OT-2 (Minor)", "procedure": "Tonsillectomy", "surgeon": "Dr. Rohan Joshi", "start_h": 14, "end_h": 15, "status": "Scheduled"},
        {"theatre": "OT-3", "procedure": "Pediatric Hernia Repair", "surgeon": "Dr. Priya Nair", "start_h": 16, "end_h": 17, "status": "Scheduled"},
    ]
    for ot in ot_items:
        st = datetime(today.year, today.month, today.day, ot["start_h"], 0, 0)
        et = datetime(today.year, today.month, today.day, ot["end_h"], 0, 0)
        db.add(OTSchedule(
            theatre=ot["theatre"],
            procedure=ot["procedure"],
            surgeon=ot["surgeon"],
            start_time=st,
            end_time=et,
            status=ot["status"]
        ))

    # 6. Appointments with unique codes
    appt_patients = [
        {"name": "Govind Narang", "phone": "9899011111", "age": 52, "gender": "male", "dept": "C", "hour": 11, "status": "booked", "doc_idx": 2},
        {"name": "Pooja Hegde", "phone": "9899022222", "age": 27, "gender": "female", "dept": "G", "hour": 12, "status": "checked_in", "doc_idx": 0},
        {"name": "Siddharth Roy", "phone": "9899033333", "age": 36, "gender": "male", "dept": "O", "hour": 14, "status": "booked", "doc_idx": 4},
        {"name": "Nandini Sen", "phone": "9899044444", "age": 64, "gender": "female", "dept": "E", "hour": 15, "status": "booked", "doc_idx": 8},
    ]
    for ap in appt_patients:
        p = Patient(name=ap["name"], phone=ap["phone"], age=ap["age"], gender=ap["gender"], created_at=now)
        db.add(p)
        db.flush()
        slot = datetime(today.year, today.month, today.day, ap["hour"], 30, 0)
        assigned_doc_id = doc_objs[ap["doc_idx"]].id if "doc_idx" in ap else None
        db.add(Appointment(
            patient_id=p.id,
            department_id=dept_objs[ap["dept"]].id,
            doctor_id=assigned_doc_id,
            slot_time=slot,
            status=ap["status"],
            appointment_code=f"APT-{dept_objs[ap['dept']].code}-{secrets.token_hex(3).upper()}",
            notes="Regular outpatient consultation",
            source="online",
            payment_status="free",
            created_at=now
        ))

    # 7. Sample Notification Logs
    db.add(NotificationLog(
        recipient_phone="9876543210",
        recipient_name="Ramesh Pawar",
        channel="whatsapp",
        event_type="token_created",
        message_body="Hello Ramesh, your token C-001 has been registered for Cardiology at HealPath.",
        status="simulated",
        reference_type="token",
        reference_id=1,
        created_at=now - timedelta(minutes=100)
    ))

    db.commit()
