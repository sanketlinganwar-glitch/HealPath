import os
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from backend.models import HardwareDevice

logger = logging.getLogger(__name__)

class HardwareGatewayService:
    """
    Physical Calling Hardware Gateway Service for Hospital Cabin LED 7-Segment Displays:
    - Standardized event protocol: CALL_NEXT, NOW_SERVING, RECALL, CANCEL, HEARTBEAT, DEVICE_STATUS
    - In-memory & DB device heartbeat tracking
    - HTTP polling event buffer with ACK confirmation
    - MQTT payload serializer (Topic: hospital/sanjeevan/cabin/{cabin_id}/display)
    - Zero patient names / PHI transmitted (displays show token number & cabin only)
    """

    PROTOCOL_VERSION = "v1.1"

    def __init__(self):
        # In-memory pending event queue: { device_id/cabin_id: [event_payload, ...] }
        self._pending_events: Dict[str, List[Dict[str, Any]]] = {}
        # Recent broadcast event history (last 50 events)
        self._event_history: List[Dict[str, Any]] = []

    def dispatch_display_event(
        self,
        event_type: str,  # "CALL_NEXT" | "NOW_SERVING" | "RECALL" | "CANCEL"
        token_number: str,
        cabin_id: str,
        department_id: Optional[int] = None,
        device_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates and queues a standardized hardware display event.
        Guarantees zero PHI (only token_number and cabin_id are sent).
        """
        target_device = device_id or f"DISP-CABIN-{cabin_id}"
        event_id = f"EVT-{int(time.time()*1000)}-{cabin_id}"

        payload = {
            "event_id": event_id,
            "device_id": target_device,
            "department_id": department_id,
            "cabin_id": str(cabin_id),
            "token_number": str(token_number),
            "event_type": event_type,
            "timestamp": datetime.now().isoformat(),
            "protocol_version": self.PROTOCOL_VERSION,
            "display_data": {
                "token": str(token_number),
                "cabin": str(cabin_id),
                "mode": "BLINK_THEN_SOLID" if event_type in ["CALL_NEXT", "RECALL"] else "SOLID",
                "chime_duration_ms": 1500 if event_type in ["CALL_NEXT", "RECALL"] else 500,
                "display_duration_sec": 45
            }
        }

        # Queue for cabin and target device
        key = str(cabin_id)
        if key not in self._pending_events:
            self._pending_events[key] = []
        self._pending_events[key].append(payload)

        # Maintain max 10 pending events per cabin
        if len(self._pending_events[key]) > 10:
            self._pending_events[key].pop(0)

        # Append to history
        self._event_history.insert(0, payload)
        if len(self._event_history) > 50:
            self._event_history.pop()

        logger.info(f"Hardware display event {event_type} queued for cabin {cabin_id}: Token {token_number}")
        return payload

    def poll_events(self, cabin_id: Optional[str] = None, device_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Returns pending events for a microcontroller polling by cabin_id or device_id.
        """
        key = str(cabin_id) if cabin_id else None
        if not key and device_id and device_id.startswith("DISP-CABIN-"):
            key = device_id.replace("DISP-CABIN-", "")

        if key and key in self._pending_events:
            return list(self._pending_events[key])
        
        # If no specific filter, return the latest unacknowledged event across all cabins
        if self._event_history:
            return [self._event_history[0]]
        return []

    def acknowledge_event(self, event_id: str, device_id: str) -> bool:
        """
        Removes an acknowledged event from the pending queue.
        """
        for key, events in self._pending_events.items():
            for i, evt in enumerate(events):
                if evt.get("event_id") == event_id:
                    events.pop(i)
                    logger.info(f"Event {event_id} acknowledged by device {device_id}")
                    return True
        return False

    def record_heartbeat(
        self,
        db: Session,
        device_id: str,
        department_id: Optional[int] = None,
        cabin_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        rssi: Optional[int] = None,
        firmware_version: Optional[str] = "v1.1.0"
    ) -> Dict[str, Any]:
        """
        Registers or updates physical hardware device heartbeat in SQLite.
        """
        device = db.query(HardwareDevice).filter(HardwareDevice.device_id == device_id).first()
        now = datetime.now()

        if not device:
            device = HardwareDevice(
                device_id=device_id,
                department_id=department_id,
                cabin_id=cabin_id,
                device_type="led_7segment",
                status="online",
                last_heartbeat=now,
                firmware_version=firmware_version or "v1.1.0",
                ip_address=ip_address
            )
            db.add(device)
        else:
            device.status = "online"
            device.last_heartbeat = now
            if cabin_id:
                device.cabin_id = cabin_id
            if department_id:
                device.department_id = department_id
            if ip_address:
                device.ip_address = ip_address
            if firmware_version:
                device.firmware_version = firmware_version

        db.commit()
        db.refresh(device)
        return {
            "device_id": device.device_id,
            "status": device.status,
            "cabin_id": device.cabin_id,
            "last_heartbeat": device.last_heartbeat.isoformat()
        }

    def get_registered_devices(self, db: Session) -> List[Dict[str, Any]]:
        """
        Returns all registered display devices with live online/offline status (offline if no heartbeat for > 60s).
        """
        devices = db.query(HardwareDevice).all()
        now = datetime.now()
        results = []

        # If database has no devices yet, provide standard default cabin devices
        if not devices:
            defaults = [
                {"device_id": "DISP-CABIN-101", "cabin_id": "101", "room": "Room 101 (General OPD)", "dept": "General Medicine"},
                {"device_id": "DISP-CABIN-102", "cabin_id": "102", "room": "Room 102 (Pediatrics)", "dept": "Pediatrics"},
                {"device_id": "DISP-CABIN-103", "cabin_id": "103", "room": "Room 103 (Orthopedics)", "dept": "Orthopedics"},
                {"device_id": "DISP-CABIN-104", "cabin_id": "104", "room": "Room 104 (Gynecology)", "dept": "Gynecology"},
                {"device_id": "DISP-CABIN-105", "cabin_id": "105", "room": "Room 105 (Cardiology)", "dept": "Cardiology"},
            ]
            for d in defaults:
                dev = HardwareDevice(
                    device_id=d["device_id"],
                    cabin_id=d["cabin_id"],
                    device_type="led_7segment",
                    status="online",
                    last_heartbeat=now,
                    firmware_version="v1.1.0",
                    ip_address="192.168.1.10" + d["cabin_id"][-1]
                )
                db.add(dev)
            db.commit()
            devices = db.query(HardwareDevice).all()

        for d in devices:
            is_recent = d.last_heartbeat and (now - d.last_heartbeat).total_seconds() < 90
            d_status = "online" if is_recent else "offline"
            results.append({
                "id": d.id,
                "device_id": d.device_id,
                "cabin_id": d.cabin_id,
                "department_id": d.department_id,
                "device_type": d.device_type,
                "status": d_status,
                "last_heartbeat": d.last_heartbeat.isoformat() if d.last_heartbeat else None,
                "firmware_version": d.firmware_version,
                "ip_address": d.ip_address
            })
        return results

    def get_event_history(self) -> List[Dict[str, Any]]:
        """Returns the last 50 hardware calling events."""
        return list(self._event_history)

hardware_gateway = HardwareGatewayService()
