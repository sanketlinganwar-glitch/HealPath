import os
import hmac
import hashlib
import json
import logging
from typing import Optional
from fastapi import APIRouter, Request, Response, HTTPException, status, Depends, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.services.notification import notification_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhook", tags=["Webhook"])
notifications_router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "healpath_wa_verify_secret_2026")
WHATSAPP_APP_SECRET = os.getenv("WHATSAPP_APP_SECRET")


@router.get("/whatsapp")
def verify_whatsapp_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """
    Meta WhatsApp Cloud API Webhook Verification Endpoint.
    Responds to Meta's GET verification challenge handshake.
    """
    verify_token = os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN") or WHATSAPP_VERIFY_TOKEN
    if hub_mode == "subscribe" and hub_verify_token == verify_token:
        logger.info("Meta WhatsApp Webhook subscription verified successfully.")
        return PlainTextResponse(content=hub_challenge or "", status_code=status.HTTP_200_OK)

    logger.warning("Meta WhatsApp Webhook verification failed. Token mismatch.")
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Verification token mismatch"
    )


@router.post("/whatsapp")
async def handle_whatsapp_webhook_event(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Receives real-time delivery receipts and incoming messages from Meta WhatsApp.
    Validates X-Hub-Signature-256 HMAC-SHA256 signature when WHATSAPP_APP_SECRET is set.
    """
    body_bytes = await request.body()
    signature_header = request.headers.get("X-Hub-Signature-256")
    app_secret = os.getenv("WHATSAPP_APP_SECRET") or WHATSAPP_APP_SECRET

    # Cryptographic signature validation if app secret is configured
    if app_secret:
        if not signature_header or not signature_header.startswith("sha256="):
            logger.warning("Missing or malformed X-Hub-Signature-256 header.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing X-Hub-Signature-256 header"
            )

        received_sig = signature_header.split("sha256=")[1]
        expected_sig = hmac.new(
            app_secret.encode("utf-8"),
            msg=body_bytes,
            digestmod=hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(received_sig, expected_sig):
            logger.warning("X-Hub-Signature-256 HMAC verification failed.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature"
            )

    try:
        payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
    except Exception as e:
        logger.error(f"Malformed JSON in webhook body: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload")

    result = notification_service.handle_webhook_payload(db, payload)
    return {"status": "EVENT_RECEIVED", "processed": result}


# =============================================================================
# Omnichannel Notification Management & Opt-Out Preferences
# =============================================================================

class PhoneRequest(BaseModel):
    phone: str
    reason: Optional[str] = "User requested opt-out"


@notifications_router.get("/status")
def get_notifications_status(db: Session = Depends(get_db)):
    """Returns live mode status, notification counters, and recent dispatch logs."""
    return notification_service.get_notification_stats(db)


@notifications_router.post("/opt-out")
def opt_out_patient(req: PhoneRequest, db: Session = Depends(get_db)):
    """Registers patient opt-out under DPDP Act requirements."""
    notification_service.opt_out_patient(db, req.phone, req.reason)
    return {"status": "success", "message": f"Phone {req.phone} opted out successfully."}


@notifications_router.post("/opt-in")
def opt_in_patient(req: PhoneRequest, db: Session = Depends(get_db)):
    """Restores patient notification consent."""
    notification_service.opt_in_patient(db, req.phone)
    return {"status": "success", "message": f"Phone {req.phone} consent restored."}


@notifications_router.post("/{id}/retry")
def retry_failed_notification(id: int, db: Session = Depends(get_db)):
    """Retries dispatching a failed notification."""
    retried = notification_service.retry_notification(db, id)
    if not retried:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification log not found")
    return {
        "status": "success",
        "notification_id": retried.id,
        "delivery_status": retried.delivery_status,
        "mode": retried.status
    }
