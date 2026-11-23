# HACKBYTE — STAGE 9: INITIAL ARCHITECTURAL AUDIT & IMPLEMENTATION PLAN
**Document ID:** `AUDIT-STAGE9-001`  
**Target Release:** `v2.6.0-analytics`  
**Partner Hospital:** Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal, Maharashtra  
**Author:** Senior Full-Stack Architect, Backend Engineer, QA/Security Lead  
**Audit Date:** November 23, 2026  
**Status:** APPROVED & BASELINE VERIFIED  

---

## 1. Executive Summary & Verification of Baseline

Prior to beginning Stage 9 implementation, the complete codebase was audited and verified against the established Stage 1–8 milestones. All underlying services are operational and running cleanly:
- **Express Backend (Port 3000):** Real-time doctor live-board, hospital directory, QR check-in HMAC verification.
- **FastAPI Backend (Port 8000):** Token generation, appointment booking, patient wallet, digital prescription crypto signatures, AI symptom triage (Gemini 2.5 Flash), multilingual voice assistant (Marathi, Hindi, English), and queue prediction.
- **Vite React Frontend (Port 5173):** Responsive SPA, PWA offline precaching, Tailwind CSS styling, Apollo-grade patient-centric UI redesign.
- **Automated Test Baseline:** **87 / 87 Automated Tests Passing (100%)** across Node.js and Python test suites.
- **Vite Production Build:** Exit Code 0 (clean, 582 kB JS, 72 kB CSS).

---

## 2. Existing Architecture & Stage 9 Gaps

### 2.1 Notification Infrastructure
- **Current State:**
  - `backend/services/notification.py` defines `NotificationService` with rudimentary simulation logging and basic requests-based WhatsApp stub.
  - `NotificationLog` model lacks fields for Meta message tracking (`meta_message_id`), real-time delivery status (`delivery_status`), timestamps (`delivered_at`, `read_at`), and user preferences (`is_opted_out`).
  - No Meta webhook router exists for `hub.challenge` verification or `X-Hub-Signature-256` HMAC validation.
  - No user opt-out or consent management mechanism complying with the Digital Personal Data Protection (DPDP) Act 2023.
- **Stage 9 Requirements:**
  - Standardized Meta WhatsApp Cloud API client (Graph API v18.0/v19.0) with exponential backoff and automatic simulation mode fallback when API credentials are absent.
  - Trilingual templating (English, Hindi, Marathi) formatted without Protected Health Information (PHI) — no clinical diagnoses or medication names in payloads.
  - Webhook router with constant-time HMAC-SHA256 signature verification and asynchronous delivery receipt processing.
  - Consent enforcement and opt-out registry (`STOP` / `UNSUBSCRIBE` keyword handling).

### 2.2 Department Analytics & Heatmaps
- **Current State:**
  - `backend/routers/staff.py` provides basic `/api/stats` and `/api/admin/analytics` returning simple token counts and averages.
  - No hourly breakdown for queue arrival vs. consultation throughput.
  - No department bottleneck heatmap with congestion thresholds (Normal, Moderate, High, Critical).
  - No consultation velocity calculation (completions per hour, average wait time vs. consult duration, appointment vs. walk-in volume).
  - Existing `AdminDashboard.jsx` does not render hourly heatmaps, velocity indicators, or bottleneck alert triggers.
- **Stage 9 Requirements:**
  - Advanced Department Analytics service delivering hourly congestion heatmaps, doctor-wise velocity, and bottleneck alerts.
  - Filter support for Time Window (`today`, `7d`, `30d`, custom range), Department, and Doctor.
  - Graceful handling of insufficient historical data (clear UI badges indicating sample size).
  - Integrated Heatmap and Velocity visualizer within the existing `AdminDashboard.jsx`.

### 2.3 Physical Calling Hardware Gateway (7-Segment LED Displays)
- **Current State:**
  - Patient calls are purely virtual (web UI and audio chime).
  - No standardized event protocol or hardware endpoint for physical cabin displays.
- **Stage 9 Requirements:**
  - Hardware calling protocol schema supporting `CALL_NEXT`, `NOW_SERVING`, `RECALL`, `CANCEL`, `HEARTBEAT`, and `DEVICE_STATUS`.
  - HTTP Gateway endpoints: `/api/hardware/display/events`, `/api/hardware/display/ack`, `/api/hardware/display/heartbeat`.
  - MQTT integration helper with structured topic hierarchy: `hospital/sanjeevan/cabin/{cabin_id}/display`.
  - Virtual Hardware Simulator panel in Admin/Demo controls for development testing without physical microcontrollers.
  - Zero PHI transmitted to hardware displays (token number and cabin ID only).

---

## 3. Database Schema Extensions

### 3.1 `notification_logs` Table
Add the following columns via `migrate_db`:
- `meta_message_id VARCHAR(100)` (Index)
- `delivery_status VARCHAR(30) DEFAULT 'sent'` (`sent`, `delivered`, `read`, `failed`, `simulated`)
- `delivered_at DATETIME`
- `read_at DATETIME`
- `is_opted_out BOOLEAN DEFAULT 0`

### 3.2 `patients` Table
Add:
- `whatsapp_consent BOOLEAN DEFAULT 1`
- `opted_out_at DATETIME`

### 3.3 `hardware_devices` Table (Optional / In-Memory & SQLite)
Track registered physical display units:
- `device_id`, `department_id`, `cabin_id`, `last_heartbeat`, `status`, `firmware_version`.

---

## 4. Security & Privacy Audit

1. **Backend Secret Isolation:** `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` stored strictly in backend `.env` and never leaked to frontend bundles or client logs.
2. **HMAC Webhook Verification:** Meta webhooks must validate `X-Hub-Signature-256` against `WHATSAPP_APP_SECRET` using `hmac.compare_digest`.
3. **Data Minimization (DPDP Compliance):**
   - WhatsApp messages contain: Hospital name, Patient first name, Token number, Department, Cabin/Doctor name, Live tracking link.
   - WhatsApp messages NEVER contain: Diagnosis, clinical notes, medications, or test results.
   - Hardware displays receive ONLY token number and cabin number.

---

## 5. Execution Roadmap

| Step | Component | Description |
|------|-----------|-------------|
| 1 | **Database & Model Migrations** | Update `models.py` & `db.py` for notification tracking & patient consent. |
| 2 | **WhatsApp Service & Webhook** | Meta Graph API v19.0 client, trilingual templates, simulation fallback, webhook handler. |
| 3 | **Advanced Analytics Engine** | Hourly heatmap aggregation, velocity metrics, congestion threshold classifier. |
| 4 | **Hardware Gateway Service** | Display event dispatcher, MQTT helper, HTTP polling and ack endpoints. |
| 5 | **Admin Dashboard Enhancement** | Add Heatmap, Velocity charts, Notification Manager, and Hardware Simulator to `AdminDashboard.jsx`. |
| 6 | **Automated Testing** | Comprehensive Stage 9 test suite (`backend/test_stage9_analytics_whatsapp.py`). |
| 7 | **Documentation & Release Tag** | Generate implementation, test, security, and setup reports; tag `v2.6.0-analytics`. |
