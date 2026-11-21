import os
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from backend.models import NotificationLog

logger = logging.getLogger(__name__)
load_dotenv()

class NotificationService:
    """
    Hospital Notification Service with WhatsApp and SMS adapters.
    Includes safe simulation mode for local development and staging environments.
    """

    def __init__(self):
        # WhatsApp Cloud API / Meta credentials
        self.wa_token = os.getenv("WHATSAPP_TOKEN")
        self.wa_phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
        
        # SMS Provider (e.g. Twilio / Fast2SMS) credentials
        self.sms_account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.sms_auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.sms_from_number = os.getenv("TWILIO_FROM_NUMBER")

        # Dev / Simulation mode flag (defaults to True if credentials are not configured)
        self.is_production = bool(self.wa_token and self.wa_phone_id)

    def dispatch(
        self,
        db: Session,
        recipient_phone: str,
        recipient_name: str,
        channel: str,  # "whatsapp" | "sms"
        event_type: str,
        message_body: str,
        reference_type: Optional[str] = None,
        reference_id: Optional[int] = None,
    ) -> NotificationLog:
        """
        Dispatches notification via WhatsApp or SMS, falling back safely to simulation mode.
        Guarantees that simulation mode is recorded accurately without claiming false delivery.
        """
        # Deduplication check: Do not re-send identical message within 2 minutes
        recent_log = db.query(NotificationLog).filter(
            NotificationLog.recipient_phone == recipient_phone,
            NotificationLog.event_type == event_type,
            NotificationLog.reference_type == reference_type,
            NotificationLog.reference_id == reference_id,
        ).order_by(NotificationLog.created_at.desc()).first()

        if recent_log and (datetime.now() - recent_log.created_at).total_seconds() < 120:
            logger.info(f"Duplicate notification prevented for {recipient_phone} ({event_type})")
            return recent_log

        status = "simulated"
        error_detail = None

        if channel == "whatsapp":
            if self.is_production:
                try:
                    import requests
                    url = f"https://graph.facebook.com/v18.0/{self.wa_phone_id}/messages"
                    headers = {
                        "Authorization": f"Bearer {self.wa_token}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "messaging_product": "whatsapp",
                        "to": f"91{recipient_phone}" if len(recipient_phone) == 10 else recipient_phone,
                        "type": "text",
                        "text": {"body": message_body}
                    }
                    res = requests.post(url, headers=headers, json=payload, timeout=10)
                    if res.status_code in [200, 201]:
                        status = "sent"
                    else:
                        status = "failed"
                        error_detail = res.text
                except Exception as e:
                    logger.error(f"WhatsApp dispatch error: {e}")
                    status = "failed"
                    error_detail = str(e)
            else:
                # Simulation mode
                status = "simulated"
                logger.info(f"[SIMULATED WHATSAPP] to {recipient_phone} ({recipient_name}): {message_body}")

        elif channel == "sms":
            if self.sms_account_sid and self.sms_auth_token:
                try:
                    from twilio.rest import Client
                    client = Client(self.sms_account_sid, self.sms_auth_token)
                    target_phone = f"+91{recipient_phone}" if not recipient_phone.startswith("+") else recipient_phone
                    client.messages.create(
                        body=message_body,
                        from_=self.sms_from_number,
                        to=target_phone
                    )
                    status = "sent"
                except Exception as e:
                    logger.error(f"SMS dispatch error: {e}")
                    status = "failed"
                    error_detail = str(e)
            else:
                status = "simulated"
                logger.info(f"[SIMULATED SMS] to {recipient_phone} ({recipient_name}): {message_body}")

        # Persist notification history
        log_entry = NotificationLog(
            recipient_phone=recipient_phone,
            recipient_name=recipient_name,
            channel=channel,
            event_type=event_type,
            message_body=message_body,
            status=status,
            reference_type=reference_type,
            reference_id=reference_id,
            error_detail=error_detail,
            created_at=datetime.now()
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

    # --- Convenience Event Triggers ---

    def notify_token_generated(self, db: Session, token, patient):
        body = (
            f"🏥 HealPath: Hello {patient.name}, your Token {token.token_number} is registered "
            f"in {token.department.name}. Estimated wait: ~{token.seq * 8} mins. "
            f"Track live at: http://localhost:5173/#/patient/track/{token.id}"
        )
        return self.dispatch(
            db, patient.phone, patient.name, "whatsapp", "token_created", body, "token", token.id
        )

    def notify_turn_approaching(self, db: Session, token, patient, people_ahead: int):
        body = (
            f"🔔 HealPath Alert: Token {token.token_number} for {patient.name} is approaching! "
            f"Only {people_ahead} patient(s) ahead in {token.department.name}. "
            f"Please be seated near the consultation area."
        )
        return self.dispatch(
            db, patient.phone, patient.name, "whatsapp", "turn_approaching", body, "token", token.id
        )

    def notify_doctor_called(self, db: Session, token, patient, doctor):
        body = (
            f"📢 HealPath: Token {token.token_number}! {patient.name}, your turn is now! "
            f"Please proceed to Dr. {doctor.name} at {doctor.room}."
        )
        return self.dispatch(
            db, patient.phone, patient.name, "whatsapp", "doctor_called", body, "token", token.id
        )

    def notify_appointment_booked(self, db: Session, appointment, patient, doctor, dept):
        time_str = appointment.slot_time.strftime("%d %b %Y at %I:%M %p")
        body = (
            f"📅 HealPath: Appointment Confirmed! Code: {appointment.appointment_code}. "
            f"Patient: {patient.name}. Doctor: Dr. {doctor.name if doctor else 'Assigned Specialist'} ({dept.name}). "
            f"Scheduled for: {time_str}. Room: {doctor.room if doctor else 'OPD Desk'}."
        )
        return self.dispatch(
            db, patient.phone, patient.name, "whatsapp", "appointment_booked", body, "appointment", appointment.id
        )

    def notify_appointment_rescheduled(self, db: Session, appointment, patient, old_time, new_time):
        body = (
            f"🗓️ HealPath: Appointment {appointment.appointment_code} for {patient.name} has been rescheduled "
            f"from {old_time.strftime('%I:%M %p')} to {new_time.strftime('%d %b %Y at %I:%M %p')}."
        )
        return self.dispatch(
            db, patient.phone, patient.name, "whatsapp", "appointment_rescheduled", body, "appointment", appointment.id
        )

    def notify_appointment_cancelled(self, db: Session, appointment, patient, reason: str):
        body = (
            f"❌ HealPath: Appointment {appointment.appointment_code} for {patient.name} has been cancelled. "
            f"Reason: {reason}. Contact hospital reception if you need assistance."
        )
        return self.dispatch(
            db, patient.phone, patient.name, "whatsapp", "appointment_cancelled", body, "appointment", appointment.id
        )

notification_service = NotificationService()
