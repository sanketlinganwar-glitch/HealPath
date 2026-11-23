import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "queuecare.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def migrate_db(eng):
    """Safe schema migrations to add missing columns to SQLite database without losing data."""
    with eng.connect() as conn:
        # Check doctors table
        res = conn.execute(text("PRAGMA table_info(doctors)")).fetchall()
        cols = {row[1] for row in res}
        if cols:
            if "shift_start" not in cols:
                conn.execute(text("ALTER TABLE doctors ADD COLUMN shift_start VARCHAR(10) DEFAULT '09:00'"))
            if "shift_end" not in cols:
                conn.execute(text("ALTER TABLE doctors ADD COLUMN shift_end VARCHAR(10) DEFAULT '17:00'"))
            if "break_start" not in cols:
                conn.execute(text("ALTER TABLE doctors ADD COLUMN break_start VARCHAR(10) DEFAULT '13:00'"))
            if "break_end" not in cols:
                conn.execute(text("ALTER TABLE doctors ADD COLUMN break_end VARCHAR(10) DEFAULT '14:00'"))
            if "duty_status" not in cols:
                conn.execute(text("ALTER TABLE doctors ADD COLUMN duty_status VARCHAR(20) DEFAULT 'available'"))
            if "registration_number" not in cols:
                conn.execute(text("ALTER TABLE doctors ADD COLUMN registration_number VARCHAR(50) DEFAULT 'MMC-2015/08/4120'"))
            if "qualification" not in cols:
                conn.execute(text("ALTER TABLE doctors ADD COLUMN qualification VARCHAR(100) DEFAULT 'MBBS, MD'"))

        # Check tokens table
        res = conn.execute(text("PRAGMA table_info(tokens)")).fetchall()
        cols = {row[1] for row in res}
        if cols:
            if "secure_hash" not in cols:
                conn.execute(text("ALTER TABLE tokens ADD COLUMN secure_hash VARCHAR(64)"))
            if "emergency_reason" not in cols:
                conn.execute(text("ALTER TABLE tokens ADD COLUMN emergency_reason VARCHAR(300)"))
            if "emergency_flagged_by" not in cols:
                conn.execute(text("ALTER TABLE tokens ADD COLUMN emergency_flagged_by VARCHAR(100)"))
            if "emergency_verified_by" not in cols:
                conn.execute(text("ALTER TABLE tokens ADD COLUMN emergency_verified_by VARCHAR(100)"))
            if "emergency_flagged_at" not in cols:
                conn.execute(text("ALTER TABLE tokens ADD COLUMN emergency_flagged_at DATETIME"))
            if "idempotency_key" not in cols:
                conn.execute(text("ALTER TABLE tokens ADD COLUMN idempotency_key VARCHAR(64)"))

        # Check appointments table
        res = conn.execute(text("PRAGMA table_info(appointments)")).fetchall()
        cols = {row[1] for row in res}
        if cols:
            if "appointment_code" not in cols:
                conn.execute(text("ALTER TABLE appointments ADD COLUMN appointment_code VARCHAR(30)"))
            if "notes" not in cols:
                conn.execute(text("ALTER TABLE appointments ADD COLUMN notes VARCHAR(300)"))
            if "source" not in cols:
                conn.execute(text("ALTER TABLE appointments ADD COLUMN source VARCHAR(20) DEFAULT 'online'"))
            if "payment_status" not in cols:
                conn.execute(text("ALTER TABLE appointments ADD COLUMN payment_status VARCHAR(20) DEFAULT 'free'"))
            if "cancellation_reason" not in cols:
                conn.execute(text("ALTER TABLE appointments ADD COLUMN cancellation_reason VARCHAR(200)"))
            if "idempotency_key" not in cols:
                conn.execute(text("ALTER TABLE appointments ADD COLUMN idempotency_key VARCHAR(64)"))

        # Check patients table
        res = conn.execute(text("PRAGMA table_info(patients)")).fetchall()
        cols = {row[1] for row in res}
        if cols:
            if "uhid" not in cols:
                conn.execute(text("ALTER TABLE patients ADD COLUMN uhid VARCHAR(30)"))
            if "blood_group" not in cols:
                conn.execute(text("ALTER TABLE patients ADD COLUMN blood_group VARCHAR(10)"))
            if "allergies" not in cols:
                conn.execute(text("ALTER TABLE patients ADD COLUMN allergies VARCHAR(200)"))
            if "medical_history" not in cols:
                conn.execute(text("ALTER TABLE patients ADD COLUMN medical_history TEXT"))
            if "whatsapp_consent" not in cols:
                conn.execute(text("ALTER TABLE patients ADD COLUMN whatsapp_consent BOOLEAN DEFAULT 1"))
            if "opted_out_at" not in cols:
                conn.execute(text("ALTER TABLE patients ADD COLUMN opted_out_at DATETIME"))

        # Check notification_logs table
        res = conn.execute(text("PRAGMA table_info(notification_logs)")).fetchall()
        cols = {row[1] for row in res}
        if cols:
            if "meta_message_id" not in cols:
                conn.execute(text("ALTER TABLE notification_logs ADD COLUMN meta_message_id VARCHAR(100)"))
            if "delivery_status" not in cols:
                conn.execute(text("ALTER TABLE notification_logs ADD COLUMN delivery_status VARCHAR(30) DEFAULT 'sent'"))
            if "delivered_at" not in cols:
                conn.execute(text("ALTER TABLE notification_logs ADD COLUMN delivered_at DATETIME"))
            if "read_at" not in cols:
                conn.execute(text("ALTER TABLE notification_logs ADD COLUMN read_at DATETIME"))
            if "is_opted_out" not in cols:
                conn.execute(text("ALTER TABLE notification_logs ADD COLUMN is_opted_out BOOLEAN DEFAULT 0"))
            if "language" not in cols:
                conn.execute(text("ALTER TABLE notification_logs ADD COLUMN language VARCHAR(10) DEFAULT 'en'"))

        # Check prescriptions table
        res = conn.execute(text("PRAGMA table_info(prescriptions)")).fetchall()
        cols = {row[1] for row in res}
        if cols:
            if "prescription_number" not in cols:
                conn.execute(text("ALTER TABLE prescriptions ADD COLUMN prescription_number VARCHAR(30)"))
            if "verification_token" not in cols:
                conn.execute(text("ALTER TABLE prescriptions ADD COLUMN verification_token VARCHAR(64)"))
            if "is_signed" not in cols:
                conn.execute(text("ALTER TABLE prescriptions ADD COLUMN is_signed BOOLEAN DEFAULT 1"))
            if "signed_at" not in cols:
                conn.execute(text("ALTER TABLE prescriptions ADD COLUMN signed_at DATETIME"))
            if "signature_hash" not in cols:
                conn.execute(text("ALTER TABLE prescriptions ADD COLUMN signature_hash VARCHAR(64)"))

        conn.commit()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
