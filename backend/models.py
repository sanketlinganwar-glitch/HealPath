from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Date, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.db import Base

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(5), unique=True, nullable=False)
    default_consult_min = Column(Integer, default=8, nullable=False)

    doctors = relationship("Doctor", back_populates="department")
    tokens = relationship("Token", back_populates="department")
    appointments = relationship("Appointment", back_populates="department")
    feedbacks = relationship("Feedback", back_populates="department")


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    specialization = Column(String(100), nullable=False)
    room = Column(String(50), nullable=False)
    status = Column(String(20), default="available", nullable=False)  # "available" | "off"
    
    # Doctor Availability & Duty Roster
    shift_start = Column(String(10), default="09:00", nullable=False)
    shift_end = Column(String(10), default="17:00", nullable=False)
    break_start = Column(String(10), default="13:00", nullable=False)
    break_end = Column(String(10), default="14:00", nullable=False)
    duty_status = Column(String(20), default="available", nullable=False)  # "available" | "busy" | "on_break" | "off_duty"
    registration_number = Column(String(50), nullable=True, default="MMC-2015/08/4120")
    qualification = Column(String(100), nullable=True, default="MBBS, MD")

    department = relationship("Department", back_populates="doctors")
    tokens = relationship("Token", back_populates="doctor")
    user = relationship("User", back_populates="doctor", uselist=False)
    appointments = relationship("Appointment", back_populates="doctor")
    prescriptions = relationship("Prescription", back_populates="doctor")
    feedbacks = relationship("Feedback", back_populates="doctor")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # "admin" | "receptionist" | "doctor"
    name = Column(String(100), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)

    doctor = relationship("Doctor", back_populates="user")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)  # "male" | "female" | "other"
    uhid = Column(String(30), unique=True, index=True, nullable=True)  # e.g. "SH-445001-0042"
    blood_group = Column(String(10), nullable=True)
    allergies = Column(String(200), nullable=True)
    medical_history = Column(Text, nullable=True)
    whatsapp_consent = Column(Boolean, default=True, nullable=False)
    opted_out_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    tokens = relationship("Token", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")
    prescriptions = relationship("Prescription", back_populates="patient")
    feedbacks = relationship("Feedback", back_populates="patient")


class Token(Base):
    __tablename__ = "tokens"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    token_date = Column(Date, default=date.today, nullable=False)
    seq = Column(Integer, nullable=False)
    token_number = Column(String(20), nullable=False)  # e.g. "C-012"
    priority = Column(String(20), default="normal", nullable=False)  # "normal" | "senior" | "emergency"
    status = Column(String(20), default="waiting", nullable=False)  # "waiting" | "in_progress" | "completed" | "skipped"
    source = Column(String(20), default="online", nullable=False)  # "online" | "walk_in" | "appointment"
    symptoms = Column(String(300), nullable=True)
    sort_time = Column(DateTime, default=datetime.now, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    called_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    near_notified = Column(Boolean, default=False, nullable=False)

    # Secure QR Token identifier
    secure_hash = Column(String(64), unique=True, index=True, nullable=True)

    # Controlled Emergency Priority Workflow
    emergency_reason = Column(String(300), nullable=True)
    emergency_flagged_by = Column(String(100), nullable=True)
    emergency_verified_by = Column(String(100), nullable=True)
    emergency_flagged_at = Column(DateTime, nullable=True)

    # Offline / network resilience idempotency key
    idempotency_key = Column(String(64), nullable=True, index=True)

    __table_args__ = (
        UniqueConstraint("department_id", "token_date", "seq", name="uq_dept_date_seq"),
        Index("ix_tokens_dept_status", "department_id", "status"),
    )

    department = relationship("Department", back_populates="tokens")
    doctor = relationship("Doctor", back_populates="tokens")
    patient = relationship("Patient", back_populates="tokens")
    appointment = relationship("Appointment", back_populates="tokens")
    messages = relationship("Message", back_populates="token", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="token")
    feedback = relationship("Feedback", back_populates="token", uselist=False)
    emergency_audit_logs = relationship("EmergencyAuditLog", back_populates="token", cascade="all, delete-orphan")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    slot_time = Column(DateTime, nullable=False)
    status = Column(String(20), default="booked", nullable=False)  # "booked" | "checked_in" | "cancelled" | "missed"
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    # Unique appointment code & tracking
    appointment_code = Column(String(30), unique=True, index=True, nullable=True)
    notes = Column(String(300), nullable=True)
    source = Column(String(20), default="online", nullable=False)
    payment_status = Column(String(20), default="free", nullable=False)
    cancellation_reason = Column(String(200), nullable=True)
    idempotency_key = Column(String(64), nullable=True, index=True)

    patient = relationship("Patient", back_populates="appointments")
    department = relationship("Department", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    tokens = relationship("Token", back_populates="appointment")
    prescriptions = relationship("Prescription", back_populates="appointment")


class OTSchedule(Base):
    __tablename__ = "ot_schedule"

    id = Column(Integer, primary_key=True, index=True)
    theatre = Column(String(50), nullable=False)
    procedure = Column(String(150), nullable=False)
    surgeon = Column(String(100), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(String(30), default="Scheduled", nullable=False)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(Integer, ForeignKey("tokens.id"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    kind = Column(String(20), default="system", nullable=False)  # "system" | "staff"
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    token = relationship("Token", back_populates="messages")


class EmergencyAuditLog(Base):
    __tablename__ = "emergency_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(Integer, ForeignKey("tokens.id"), nullable=False, index=True)
    action = Column(String(50), nullable=False)  # "flagged" | "verified" | "cancelled" | "priority_changed"
    old_priority = Column(String(20), nullable=False)
    new_priority = Column(String(20), nullable=False)
    staff_username = Column(String(50), nullable=False)
    staff_role = Column(String(20), nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    token = relationship("Token", back_populates="emergency_audit_logs")


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient_phone = Column(String(20), nullable=False, index=True)
    recipient_name = Column(String(100), nullable=False)
    channel = Column(String(20), nullable=False)  # "whatsapp" | "sms"
    event_type = Column(String(50), nullable=False)  # "token_created", "turn_approaching", "appointment_booked", etc.
    message_body = Column(Text, nullable=False)
    status = Column(String(20), default="simulated", nullable=False)  # "simulated" | "sent" | "failed" | "pending"
    reference_type = Column(String(20), nullable=True)  # "token" | "appointment"
    reference_id = Column(Integer, nullable=True)
    error_detail = Column(Text, nullable=True)
    meta_message_id = Column(String(100), nullable=True, index=True)
    delivery_status = Column(String(30), default="sent", nullable=False)  # "simulated" | "sent" | "delivered" | "read" | "failed"
    delivered_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    is_opted_out = Column(Boolean, default=False, nullable=False)
    language = Column(String(10), default="en", nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)


class HardwareDevice(Base):
    __tablename__ = "hardware_devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(50), unique=True, index=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    cabin_id = Column(String(30), nullable=True)
    device_type = Column(String(50), default="led_7segment", nullable=False)
    status = Column(String(20), default="online", nullable=False)  # "online" | "offline"
    last_heartbeat = Column(DateTime, default=datetime.now, nullable=False)
    firmware_version = Column(String(20), default="v1.0.0", nullable=False)
    ip_address = Column(String(50), nullable=True)


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    prescription_number = Column(String(30), unique=True, index=True, nullable=True)  # e.g. "RX-2026-0004"
    verification_token = Column(String(64), unique=True, index=True, nullable=True)
    token_id = Column(Integer, ForeignKey("tokens.id"), nullable=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    diagnosis = Column(Text, nullable=False)
    medicines = Column(Text, nullable=False)  # JSON-encoded array of {name, dosage, frequency, duration, instructions}
    clinical_notes = Column(Text, nullable=True)
    tests_recommended = Column(Text, nullable=True)
    follow_up_date = Column(Date, nullable=True)
    is_signed = Column(Boolean, default=True, nullable=False)
    signed_at = Column(DateTime, default=datetime.now, nullable=False)
    signature_hash = Column(String(64), nullable=True)
    status = Column(String(20), default="active", nullable=False)  # "active" | "dispensed" | "archived"
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    doctor = relationship("Doctor", back_populates="prescriptions")
    patient = relationship("Patient", back_populates="prescriptions")
    token = relationship("Token", back_populates="prescriptions")
    appointment = relationship("Appointment", back_populates="prescriptions")
    verification_logs = relationship("PrescriptionVerificationLog", back_populates="prescription", cascade="all, delete-orphan")


class PrescriptionVerificationLog(Base):
    __tablename__ = "prescription_verification_logs"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=False, index=True)
    verification_token = Column(String(64), nullable=False)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(200), nullable=True)
    status = Column(String(20), default="valid", nullable=False)
    verified_at = Column(DateTime, default=datetime.now, nullable=False)

    prescription = relationship("Prescription", back_populates="verification_logs")


class Feedback(Base):
    __tablename__ = "patient_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(Integer, ForeignKey("tokens.id"), unique=True, nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    rating = Column(Integer, nullable=False)  # 1 to 5
    wait_time_rating = Column(Integer, nullable=True)  # 1 to 5
    staff_rating = Column(Integer, nullable=True)  # 1 to 5
    comments = Column(Text, nullable=True)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    is_moderated = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    patient = relationship("Patient", back_populates="feedbacks")
    department = relationship("Department", back_populates="feedbacks")
    doctor = relationship("Doctor", back_populates="feedbacks")
    token = relationship("Token", back_populates="feedback")
