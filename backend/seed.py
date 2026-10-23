from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session

from backend.models import Department, Doctor, User, Patient, Token, Appointment, OTSchedule, Message
from backend.auth import hash_password

DEPARTMENTS_DATA = [
    {"name": "General Medicine", "code": "G", "default_consult_min": 8},
    {"name": "Cardiology", "code": "C", "default_consult_min": 10},
    {"name": "Orthopedics", "code": "O", "default_consult_min": 9},
    {"name": "Pediatrics", "code": "P", "default_consult_min": 7},
    {"name": "ENT", "code": "E", "default_consult_min": 8},
]

DOCTORS_DATA = [
    # General Medicine
    {"name": "Dr. Rajesh Sharma", "dept_code": "G", "specialization": "General Physician", "room": "Room 101", "status": "available"},
    {"name": "Dr. Anita Desai", "dept_code": "G", "specialization": "Internal Medicine", "room": "Room 102", "status": "off"},
    # Cardiology
    {"name": "Dr. Meera Kulkarni", "dept_code": "C", "specialization": "Cardiologist", "room": "Room 201", "status": "available"},
    {"name": "Dr. Vikram Malhotra", "dept_code": "C", "specialization": "Cardiac Surgeon", "room": "Room 202", "status": "off"},
    # Orthopedics
    {"name": "Dr. Suresh Patil", "dept_code": "O", "specialization": "Orthopedic Surgeon", "room": "Room 301", "status": "available"},
    {"name": "Dr. Sunita Rao", "dept_code": "O", "specialization": "Spine Specialist", "room": "Room 302", "status": "off"},
    # Pediatrics
    {"name": "Dr. Priya Nair", "dept_code": "P", "specialization": "Pediatrician", "room": "Room 401", "status": "available"},
    {"name": "Dr. Amit Verma", "dept_code": "P", "specialization": "Neonatologist", "room": "Room 402", "status": "off"},
    # ENT
    {"name": "Dr. Rohan Joshi", "dept_code": "E", "specialization": "ENT Specialist", "room": "Room 501", "status": "available"},
    {"name": "Dr. Kavita Iyer", "dept_code": "E", "specialization": "Head & Neck Surgeon", "room": "Room 502", "status": "off"},
]

def seed_database(db: Session, force_reset: bool = False):
    """Seed initial data if empty or on force_reset."""
    if force_reset:
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
            status=d["status"]
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
            "status": "waiting", "created_offset": -25, "called_offset": None, "completed_offset": None
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
            near_notified=False
        )
        db.add(token)
        db.flush()

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

    # 5. OT Schedule (4 rows)
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

    # 6. Appointments (4 rows)
    appt_patients = [
        {"name": "Govind Narang", "phone": "9899011111", "age": 52, "gender": "male", "dept": "C", "hour": 11, "status": "booked"},
        {"name": "Pooja Hegde", "phone": "9899022222", "age": 27, "gender": "female", "dept": "G", "hour": 12, "status": "checked_in"},
        {"name": "Siddharth Roy", "phone": "9899033333", "age": 36, "gender": "male", "dept": "O", "hour": 14, "status": "booked"},
        {"name": "Nandini Sen", "phone": "9899044444", "age": 64, "gender": "female", "dept": "E", "hour": 15, "status": "booked"},
    ]
    for ap in appt_patients:
        p = Patient(name=ap["name"], phone=ap["phone"], age=ap["age"], gender=ap["gender"], created_at=now)
        db.add(p)
        db.flush()
        slot = datetime(today.year, today.month, today.day, ap["hour"], 30, 0)
        db.add(Appointment(
            patient_id=p.id,
            department_id=dept_objs[ap["dept"]].id,
            doctor_id=None,
            slot_time=slot,
            status=ap["status"],
            created_at=now
        ))

    db.commit()
