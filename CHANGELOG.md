# 📜 HACKBYTE — CHANGELOG
## Record of Upgrades, Bug Fixes & Architectural Enhancements

---

## [v2.3.0] - 2026-11-21 (Stage 5 Milestone: AI Health Assistant with Gemini 2.5 Flash)

### ✨ Features Added & Upgraded
- **Google Gemini 2.5 Flash Integration:**
  - Integrated official Google Gen AI SDK (`google-genai` v2.33.0) configured with 15-second request timeouts and robust exception handling.
  - Read `GEMINI_API_KEY` and `GEMINI_MODEL` (`gemini-2.5-flash`) securely from `backend/.env`.
  - Zero API key exposure to frontend bundles or client responses.
- **AI Symptom Triage Engine (`POST /api/ai/triage`):**
  - Implemented structured clinical symptom triage collecting primary complaint, duration, severity (`mild`, `moderate`, `severe`), age group (`infant`, `child`, `adult`, `senior`), and associated symptoms.
  - Generates structured recommendations including recommended department, urgency classification (`ROUTINE`, `MODERATE`, `URGENT`, `EMERGENCY`), medical reasoning, hospital next steps, and follow-up questions.
  - Enforced strict healthcare guardrails: assistant functions as routing/navigation tool only and never claims clinical diagnosis or prescribes pharmaceutical dosages.
- **Emergency Red-Flag Intercept & Escalation:**
  - Hardened pattern-matching rules for acute cardiac, respiratory, neurological, trauma, and poisoning conditions.
  - Multi-lingual detection in English, Hindi, and Marathi (e.g., "crushing chest pain", "छाती में दर्द", "श्वास घेण्यास त्रास").
  - Emergency conditions automatically override AI urgency to `EMERGENCY` with Sanjeevan Hospital 24/7 Hotline (+91 95526 25262) callout.
- **Multi-Turn Conversational Session Engine:**
  - Built `ConversationStore` with UUID session isolation to guarantee complete privacy between patients.
  - Context window retaining the last 10 messages for conversational flow.
  - Rate limiting enforced at 20 requests/minute per conversation session.
  - Added `POST /api/ai/conversation/reset` to wipe chat history on demand.
  - Injected live token context (queue position, patients ahead, estimated wait time, doctor room) when `token_id` is supplied.
- **Deterministic Offline Fallback Protocol:**
  - Automated fallback when Gemini API key is absent, network fails, or request times out.
  - Evaluates patient symptoms against standard Sanjeevan Hospital OPD protocols with clear offline labeling (`is_offline_fallback: true`).
- **React AI Health Assistant Interface (`AIHealthAssistant.jsx`):**
  - Modern floating chat launcher with animated pulsing badge.
  - Chat bubbles distinguishing patient and AI messages with timestamps and avatars.
  - Quick symptom prompts (Chest Tightness, Knee Pain, Child Fever, Ear & Throat).
  - Prominent urgency badges with color-coded alerts (`ROUTINE` [green], `MODERATE` [cyan], `URGENT` [amber], `EMERGENCY` [pulsing red]).
  - Recommended department card with direct navigation actions.
  - Persistent healthcare disclaimer visible at all times.
  - Trilingual support (English, Hindi, Marathi) with instant switching.
  - Integrated Web Speech API for voice queries and audio playback.
  - Globally mounted in `AppLayout` and aliased through `ChatWidget.jsx`.

### 🧪 QA & Test Metrics
- Created `backend/test_ai_assistant.py` with 17 automated test cases (mocked Gemini success, offline fallback, timeouts, exceptions, emergency red flags across EN/HI/MR, department mappings, input validation, multi-turn retention, rate limiting, and session isolation).
- 17/17 Stage 5 AI Assistant tests passed (`backend/test_ai_assistant.py`).
- 17/17 FastAPI smoke tests passed (`backend/smoke_test.py`).
- 20/20 Express integration tests passed (`test_stage3_4.js`).
- Total verified tests: **54/54 passing (100%)**.
- Production Vite PWA build in `frontend/` succeeds with exit code 0 (`dist/` generated with 0 errors).

---

## [v2.2.0] - 2026-11-21 (Stage 3 & Stage 4 Milestone)

### ✨ Features Added & Upgraded
- **Doctor Roster Synchronization:** Synchronized verified Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal specialists across both FastAPI (`backend/seed.py`) and Express (`database/seed.js`):
  - Dr. Sunil M. Agrawal (Chief Surgeon & Laparoscopy Specialist)
  - Dr. Vijay S. Kawalkar (Senior Consultant Laparoscopic Surgeon)
  - Dr. H. S. Bora (MD General Medicine & Critical Care)
  - Dr. Vinay Pande (Chest & Pulmonary Critical Care)
  - Dr. Sheetal S. Agrawal (MD Obstetrics & Gynecology)
  - Dr. Lalit Paldiwal (MD Radiology & Sonography)
  - Extended doctor user authentication across both backends with uniform `doctor123` credentials.
- **Reception Dashboard Mobile Responsiveness:**
  - Designed touch-optimized **Mobile Patient Queue Cards** for phone displays (`< md`) in `ReceptionDashboard.jsx`.
  - Implemented **Doctor Queue Reassignment Modal** communicating with `reassignDoctorQueue(sourceId, targetId)` with patient SMS notice dispatch.
  - Added **Emergency Escalation Workflow** with visual urgency badges and instant triage queue promotion.
  - Implemented responsive horizontal scroll wrapper (`min-w-[700px]`) for desktop/tablet table view.
  - Upgraded **Walk-in Registration** modal with touch-friendly form fields and client-side validation.
- **Admin Dashboard Mobile Responsiveness:**
  - Upgraded KPI analytics grid to responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` in `AdminDashboard.jsx`.
  - Added horizontally scrollable navigation tabs (`overflow-x-auto scrollbar-none`) preventing layout breaks on small viewports.
  - Added mobile card view for Department Analytics and Scheduled Appointments.
  - Added Doctor Roster search and filter bar with real-time duty status toggle.
  - Added clean `@media print` daily report styling.
- **Camera-Based QR Scanner (`public/checkin.html`):**
  - Integrated maintained `html5-qrcode` library for real-time camera viewfinder scanning.
  - Implemented camera permission error handling with user fallback alerts.
  - Added camera flip button (environment/back camera vs front camera).
  - Built cryptographic token extraction (URL params, JSON, or raw token query).
  - Wired directly to `POST /api/checkin/self-verify` with server-side HMAC-SHA256 signature validation.
  - Added synthesized Web Audio API chime on successful scan.
  - Retained manual token entry fallback for devices without camera access.
  - Enforced duplicate check-in rejection (409 Conflict) and expired slot handling (410 Gone).
- **Live Queue & TV Display Integration:**
  - Implemented patient privacy masking (`maskPatientName`) across public displays (`public/js/queue.js` and `DisplayBoard.jsx`) to protect confidential healthcare information.
  - Verified Socket.io event listeners (`patient:checkedin`, `queue:patient_called`, `queue:updated`, `appointment:checked_in`) updating the board without full page refresh.
  - Added live WebSocket connection and auto-reconnection status badge on the TV display.
  - Synchronized Now Serving cards, Next In Line tickers, and multilingual speech announcements (EN, HI, MR).

---

## [v2.1.0] - 2026-11-21 (Stage 1 & Stage 2 Milestone)

### 🐛 Fixed Critical Bugs
- **Frontend JSX Parse Failure:** Resolved unclosed `<div>` elements at lines 133–134 of `frontend/src/pages/PatientTrackPage.jsx`. Restored the Real-time Sync Indicator with active pulsing dot and Token ID tag. The React production Vite build now finishes with exit code 0.
- **Doctor Console Client API Discrepancies:** Resolved broken import bindings in `frontend/src/pages/DoctorConsole.jsx`. Fixed `verifyEmergencyToken` and `getPrescriptionByToken` to connect cleanly to `client.js`. Corrected `updateDoctorRoster` parameter passing.
- **Prescription Date Serialization:** Updated `DoctorConsole.jsx` prescription follow-up date formatting from ISO timestamp to `"YYYY-MM-DD"`, matching backend schema expectations.
- **Missing QR Check-in Page:** Built responsive, mobile-first `public/checkin.html` with Sanjeevan Hospital Yavatmal branding, real-time cryptographic validation, and lobby instructions.

### 🔒 Security Hardening
- **Eliminated Hardcoded Fallback Secrets:** Removed hardcoded JWT and QR secret keys from `server.js` and `backend/auth.py`.
- **Environment Enforcements:** Validates existence of `JWT_SECRET` and `QR_SECRET` on startup.
- **Cryptographic QR Pass Generation:** Generated HMAC-SHA256 signature validating token ID, phone, timestamp, and purpose.
