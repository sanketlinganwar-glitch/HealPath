# HACKBYTE — STAGE 9: PHYSICAL CALLING HARDWARE GATEWAY SPECIFICATION
**Target Release:** `v2.6.0-analytics`  
**Device Target:** ESP32 / ESP8266 / Arduino WiFi 7-Segment LED Cabin Displays  
**Protocol Version:** `v1.1`  
**Partner Hospital:** Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal  

---

## 1. Overview & Privacy Principles

In busy hospital outpatient departments (OPDs), elderly and rural patients rely heavily on large, bright 7-segment LED displays situated directly above doctor cabin doors.

**CRITICAL PRIVACY RULE (Zero PHI):**
Under hospital healthcare regulations and Indian DPDP guidelines, physical displays in public hallways receive **ONLY** the `token_number` (e.g. `C-014`) and `cabin_id` (e.g. `101`). Patient names, ages, diagnoses, and medical histories are strictly forbidden from hardware display payloads.

---

## 2. Event Payload Schema

All hardware display events follow this JSON schema:

```json
{
  "event_id": "EVT-1700000000-101",
  "device_id": "DISP-CABIN-101",
  "department_id": 1,
  "cabin_id": "101",
  "token_number": "C-012",
  "event_type": "CALL_NEXT",
  "timestamp": "2026-11-23T10:00:00Z",
  "protocol_version": "v1.1",
  "display_data": {
    "token": "C-012",
    "cabin": "101",
    "mode": "BLINK_THEN_SOLID",
    "chime_duration_ms": 1500,
    "display_duration_sec": 45
  }
}
```

### Event Types:
- `CALL_NEXT`: Flashes token on display for 15 seconds, triggers audible 2-tone chime, then holds steady.
- `NOW_SERVING`: Solid static display indicating patient is currently in consultation.
- `RECALL`: Fast flashing pulse (3 Hz) + repeating chime to alert absent patient.
- `CANCEL`: Clears display to default idle dash pattern (`----`).
- `HEARTBEAT`: Periodic health ping from microcontroller.

---

## 3. Communication Protocols

### 3.1 HTTP REST Polling (Default / Fallback)
Microcontrollers connect to the local hospital WiFi (`Sanjeevan-OPD-Internal`) and poll:

1. **Poll Pending Events:**
   ```http
   GET /api/hardware/display/events?cabin_id=101 HTTP/1.1
   Host: 192.168.1.100:8000
   ```
2. **Acknowledge Display Event:**
   ```http
   POST /api/hardware/display/ack HTTP/1.1
   Host: 192.168.1.100:8000
   Content-Type: application/json

   {
     "event_id": "EVT-1700000000-101",
     "device_id": "DISP-CABIN-101"
   }
   ```
3. **Heartbeat & Telemetry:**
   ```http
   POST /api/hardware/display/heartbeat HTTP/1.1
   Host: 192.168.1.100:8000
   Content-Type: application/json

   {
     "device_id": "DISP-CABIN-101",
     "cabin_id": "101",
     "rssi": -58,
     "ip_address": "192.168.1.101",
     "firmware_version": "v1.1.0"
   }
   ```

### 3.2 MQTT Broker Integration (Optional Low-Latency)
- **Broker Host:** `192.168.1.100:1883`
- **Topic Hierarchy:** `hospital/sanjeevan/cabin/{cabin_id}/display`
- **QoS Level:** 1 (At least once)
- **Payload:** Standard Event Payload Schema

---

## 4. Hardware Reference Wiring (ESP32 + TM1637 / MAX7219)

| Pin on ESP32 | Peripheral | Function |
|--------------|------------|----------|
| `GPIO 18` | TM1637 CLK | 7-Segment Clock |
| `GPIO 19` | TM1637 DIO | 7-Segment Data |
| `GPIO 23` | Piezo Buzzer / Speaker | Audio Chime Frequency |
| `3V3 / 5V` | VCC | Power Supply |
| `GND` | GND | Ground |
