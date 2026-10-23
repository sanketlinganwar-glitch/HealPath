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


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    specialization = Column(String(100), nullable=False)
    room = Column(String(50), nullable=False)
    status = Column(String(20), default="available", nullable=False)  # "available" | "off"

    department = relationship("Department", back_populates="doctors")
    tokens = relationship("Token", back_populates="doctor")
    user = relationship("User", back_populates="doctor", uselist=False)
    appointments = relationship("Appointment", back_populates="doctor")


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
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    tokens = relationship("Token", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")


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

    __table_args__ = (
        UniqueConstraint("department_id", "token_date", "seq", name="uq_dept_date_seq"),
        Index("ix_tokens_dept_status", "department_id", "status"),
    )

    department = relationship("Department", back_populates="tokens")
    doctor = relationship("Doctor", back_populates="tokens")
    patient = relationship("Patient", back_populates="tokens")
    appointment = relationship("Appointment", back_populates="tokens")
    messages = relationship("Message", back_populates="token", cascade="all, delete-orphan")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    slot_time = Column(DateTime, nullable=False)
    status = Column(String(20), default="booked", nullable=False)  # "booked" | "checked_in" | "cancelled"
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    patient = relationship("Patient", back_populates="appointments")
    department = relationship("Department", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    tokens = relationship("Token", back_populates="appointment")


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
