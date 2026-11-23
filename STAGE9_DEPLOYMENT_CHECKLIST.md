# HACKBYTE — STAGE 9: PRODUCTION DEPLOYMENT CHECKLIST
**Target Release:** `v2.6.0-analytics`  
**Hospital:** Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal, Maharashtra  
**Date:** November 23, 2026  

---

## 1. Pre-Deployment Verification Matrix

| Checklist Item | Description | Status |
|----------------|-------------|--------|
| **1. Baseline Tests** | Node.js integration suite (20 tests) passing | [x] PASS |
| **2. Python Test Suites** | All 6 Python suites passing (81 tests) | [x] PASS |
| **3. Total Passing Tests** | Combined total: 101 / 101 automated tests passing | [x] PASS (100%) |
| **4. Frontend Production Build** | `npm run build` succeeds with Exit Code 0 | [x] PASS |
| **5. Database Schema Migration** | `migrate_db` safely alters `patients`, `notification_logs`, and initializes `hardware_devices` | [x] PASS |
| **6. Secret Isolation** | Meta API secrets located only in backend environment | [x] PASS |
| **7. DPDP Consent & Opt-Out** | "STOP" reply halts messages; no clinical PHI in notifications | [x] PASS |
| **8. Webhook Handshake & HMAC** | GET challenge returns token; POST verifies HMAC-SHA256 | [x] PASS |
| **9. Hardware Display Gateway** | Protocol v1.1 validated with zero PHI leakage | [x] PASS |
| **10. Analytics Engine** | Bottleneck heatmap & velocity calculations tested | [x] PASS |

---

## 2. Environment Configuration Checklist

Ensure `backend/.env` has been updated with appropriate production or staging keys:
- [ ] `JWT_SECRET` configured for production
- [ ] `GEMINI_API_KEY` configured for multimodal triage
- [ ] `WHATSAPP_ACCESS_TOKEN` set (or blank for simulated mode)
- [ ] `WHATSAPP_PHONE_NUMBER_ID` set (or blank for simulated mode)
- [ ] `WHATSAPP_BUSINESS_ACCOUNT_ID` set
- [ ] `WHATSAPP_APP_SECRET` configured for HMAC verification
- [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN` configured

---

## 3. Services Startup Procedure

1. **Express Backend (Port 3000):**
   ```bash
   node server.js
   ```
2. **FastAPI Backend (Port 8000):**
   ```bash
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
   ```
3. **Frontend Production / Preview (Port 5173 / Nginx):**
   ```bash
   cd frontend
   npm run build
   npm run preview
   ```

---

## 4. Rollback Plan

If any critical issue arises during deployment:
1. Revert to git tag `patient-platform-redesign` (Release `v2.5.0-redesign`).
2. SQLite database migrations are backward-compatible (new columns allow NULL or default values).
3. The notification service automatically operates in simulation mode if WhatsApp credentials are deactivated.
