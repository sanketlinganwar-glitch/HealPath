from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.services.hardware_gateway import hardware_gateway

router = APIRouter(prefix="/api/hardware", tags=["Hardware Gateway"])


class AckRequest(BaseModel):
    event_id: str
    device_id: str


class HeartbeatRequest(BaseModel):
    device_id: str
    cabin_id: Optional[str] = None
    department_id: Optional[int] = None
    ip_address: Optional[str] = None
    rssi: Optional[int] = -65
    firmware_version: Optional[str] = "v1.1.0"


class RegisterDeviceRequest(BaseModel):
    device_id: str
    cabin_id: str
    department_id: Optional[int] = None
    ip_address: Optional[str] = None
    firmware_version: Optional[str] = "v1.1.0"


class SimulateCallRequest(BaseModel):
    token_number: str
    cabin_id: str
    event_type: Optional[str] = "CALL_NEXT"
    department_id: Optional[int] = None


@router.get("/display/events")
def poll_display_events(
    cabin_id: Optional[str] = Query(None, description="Cabin number (e.g. 101, 102)"),
    device_id: Optional[str] = Query(None, description="Hardware display unit device ID"),
):
    """
    Microcontroller polling endpoint (ESP32/ESP8266/Raspberry Pi).
    Returns pending calling events for 7-segment LED display.
    """
    events = hardware_gateway.poll_events(cabin_id=cabin_id, device_id=device_id)
    return {
        "status": "success",
        "count": len(events),
        "events": events
    }


@router.post("/display/ack")
def acknowledge_display_event(req: AckRequest):
    """
    Microcontroller acknowledges display rendering of a token event.
    """
    success = hardware_gateway.acknowledge_event(req.event_id, req.device_id)
    return {
        "status": "success" if success else "not_found",
        "event_id": req.event_id,
        "acknowledged": success
    }


@router.post("/display/heartbeat")
def device_heartbeat(req: HeartbeatRequest, db: Session = Depends(get_db)):
    """
    Device heartbeat endpoint for physical LED displays.
    """
    result = hardware_gateway.record_heartbeat(
        db=db,
        device_id=req.device_id,
        department_id=req.department_id,
        cabin_id=req.cabin_id,
        ip_address=req.ip_address,
        rssi=req.rssi,
        firmware_version=req.firmware_version
    )
    return {"status": "success", "device": result}


@router.get("/devices")
def list_hardware_devices(db: Session = Depends(get_db)):
    """
    Lists all registered LED 7-segment calling units and status.
    """
    devices = hardware_gateway.get_registered_devices(db)
    return {
        "status": "success",
        "total_devices": len(devices),
        "devices": devices
    }


@router.post("/devices/register")
def register_hardware_device(req: RegisterDeviceRequest, db: Session = Depends(get_db)):
    """
    Registers or updates a cabin display device in the hospital network.
    """
    res = hardware_gateway.record_heartbeat(
        db=db,
        device_id=req.device_id,
        department_id=req.department_id,
        cabin_id=req.cabin_id,
        ip_address=req.ip_address,
        firmware_version=req.firmware_version
    )
    return {"status": "success", "device": res}


@router.get("/events/history")
def get_hardware_event_history():
    """
    Returns the last 50 calling events dispatched to physical displays.
    """
    return {
        "status": "success",
        "history": hardware_gateway.get_event_history()
    }


@router.post("/simulate-call")
def simulate_hardware_call(req: SimulateCallRequest):
    """
    Dispatches a simulated hardware display call event for live testing in admin dashboard.
    """
    event = hardware_gateway.dispatch_display_event(
        event_type=req.event_type or "CALL_NEXT",
        token_number=req.token_number,
        cabin_id=req.cabin_id,
        department_id=req.department_id
    )
    return {
        "status": "dispatched",
        "event": event
    }
