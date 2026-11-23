# HACKBYTE — STAGE 9: SECURITY, PRIVACY & COMPLIANCE REPORT
**Target Release:** `v2.6.0-analytics`  
**Partner Hospital:** Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal, Maharashtra  
**Compliance Standards:** Digital Personal Data Protection (DPDP) Act 2023, Meta Developer Data Policy, Hospital Privacy Guidelines  
**Auditor:** QA & Security Lead  
**Date:** November 23, 2026  
**Status:** PASS & COMPLIANT  

---

## 1. Security Architecture & Threat Model

Stage 9 introduces omnichannel messaging and physical hardware communications into the hospital workflow. The following security controls have been established:

### 1.1 Backend Secret Isolation
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, and `WHATSAPP_WEBHOOK_VERIFY_TOKEN` are kept strictly in backend environment configurations (`backend/.env`).
- Never bundled into Vite client builds, frontend source code, or transmitted in client API responses.
- Simulated mode produces deterministic pseudorandom message IDs (`sim_wa_...`) without simulating leaked authorization tokens.

### 1.2 Cryptographic Webhook Authentication (Meta Cloud API)
- Webhooks received at `POST /api/webhook/whatsapp` are verified against `WHATSAPP_APP_SECRET` using HMAC-SHA256:
  $$\text{HMAC-SHA256}(\text{body\_bytes}, \text{WHATSAPP\_APP\_SECRET})$$
- Evaluated with constant-time comparison `hmac.compare_digest()` to eliminate timing attack vectors.
- Malformed or tampered signatures immediately return HTTP 401 Unauthorized.

### 1.3 DPDP Act 2023 Patient Privacy & Consent Compliance
1. **Consent & Opt-Out Handling:**
   - In accordance with the Digital Personal Data Protection Act (DPDP) 2023, patients retain full authority over their communication preferences.
   - Any patient reply containing "STOP", "UNSUBSCRIBE", "CANCEL", or "OPTOUT" automatically flips `whatsapp_consent=False` and logs an opt-out event.
   - All subsequent notifications are halted with status `skipped_optout`.
2. **Zero Protected Health Information (PHI) in Messaging Payloads:**
   - WhatsApp and SMS notifications contain operational details only:
     - Hospital Name & Branch ("Sanjeevan Multispecialty Hospital, Yavatmal")
     - Patient First Name
     - Token Number (e.g. `C-012`)
     - Assigned Department & Room Number (e.g. `Cardiology`, `Room 105`)
     - Live Queue Tracking Link
   - **STRICT PROHIBITION:** Notifications NEVER include clinical diagnoses, clinical notes, medicine names, dosages, lab reports, or sensitive medical histories.
   - Full prescriptions and medical records remain gated behind the authenticated Digital Health Wallet with cryptographic hash verification (`Stage 8`).

### 1.4 Hardware Gateway Privacy & Air-Gapped Microcontrollers
- Physical cabin displays (ESP32/LED 7-segment displays) operate in public waiting areas.
- Hardware event protocol sends ONLY:
  - `token_number` (e.g. `C-014`)
  - `cabin_id` (e.g. `101`)
  - `event_type` (`CALL_NEXT`, `NOW_SERVING`, `RECALL`)
- Zero patient names, ages, genders, or medical records are ever sent to microcontroller endpoints or MQTT topics.

### 1.5 Rate Limiting & Deduplication
- Automatic 2-minute deduplication window per patient/event prevents accidental multi-triggering or notification flooding.
