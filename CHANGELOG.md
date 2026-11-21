# 📜 HACKBYTE — CHANGELOG
## Record of Upgrades, Bug Fixes & Architectural Enhancements

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

### 🧪 QA & Test Metrics
- Vite production build in `frontend/` succeeds with exit code 0 (`dist/` generated in 6.27s).
- 17/17 FastAPI smoke tests passed (`backend/smoke_test.py`).
- 20/20 Express integration tests passed (`test_stage3_4.js`).
- Total verified tests: **38/38 passing (100%)**.

---

## [v2.1.0] - 2026-11-21 (Stage 1 & Stage 2 Milestone)

### 🐛 Fixed Critical Bugs
- **Frontend JSX Parse Failure:** Resolved unclosed `<div>` elements at lines 133–134 of `frontend/src/pages/PatientTrackPage.jsx`. Restored the Real-time Sync Indicator with active pulsing dot and Token ID tag. The React production Vite build now finishes with exit code 0.
- **Doctor Console Client API Discrepancies:** Resolved broken import bindings in `frontend/src/pages/DoctorConsole.jsx`. Fixed `verifyEmergencyToken` and `getPrescriptionByToken` to connect cleanly to `client.js`. Corrected `updateDoctorRoster` parameter passing.
- **Prescription Date Serialization:** Updated `DoctorConsole.jsx` prescription follow-up date formatting from ISO timestamp to `"YYYY-MM-DD"`, matching backend schema expectations.
- **Missing QR Check-in Page:** Built responsive, mobile-first `public/checkin.html` with Sanjeevan Hospital Yavatmal branding, real-time cryptographic validation, and lobby instructions.

### 🔒 Security Hardening
- **Secret Management:** Removed hardcoded development JWT fallbacks across `backend/auth.py` and `routes/auth.js`. Added environment validation on application startup.
- **Public Self Check-In Endpoint:** Implemented `POST /api/checkin/self-verify` in `routes/checkin.js` with HMAC-SHA256 signature verification, allowing patients to confirm arrival without exposing staff administrative JWT tokens.
- **Manual Verification Fallback:** Added `POST /api/checkin/manual-verify` for patients whose camera cannot scan QR passes directly.

### 📚 Documentation & Governance
- Established comprehensive platform architecture, schema, API, and QA repository:
  1. `PROJECT_OVERVIEW.md`
  2. `SYSTEM_ARCHITECTURE.md`
  3. `DATABASE_SCHEMA.md`
  4. `API_DOCUMENTATION.md`
  5. `DEVELOPMENT_ROADMAP.md`
  6. `SECURITY_REPORT.md`
  7. `TESTING_REPORT.md`
  8. `DEPLOYMENT_GUIDE.md`
  9. `CHANGELOG.md`
  10. `HACKBYTE_PROJECT_PROGRESS.md`

---

## [v2.0.0] - Baseline HackByte / HealPath Implementation
- Implemented Python 3.13 FastAPI backend with 21 modules covering appointments, prescriptions, feedback, and emergency workflow.
- Created React 18 SPA with 12 pages, Tailwind CSS design system, and PWA manifest.
- Established Sanjeevan Hospital Yavatmal (445001) real-world partner profile and doctor rosters.
- Built atomic slot reservation engine and 60-second missed slot auto-shifter cron daemon.
- Created trilingual translation dictionary in English, Hindi, and Marathi.
