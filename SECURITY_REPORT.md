# 🔒 HACKBYTE — SECURITY AUDIT & HARDENING REPORT

---

## 1. Security Architecture Overview

Healthcare data platforms require rigorous confidentiality, integrity, and availability controls. HealPath / QueueCare implements layered security across authentication, authorization, cryptographic verification, file handling, and network layers.

---

## 2. Identified Vulnerabilities & Implemented Hardening

| # | Vulnerability Identified | Risk Tier | Remediation Implemented | Status |
|---|---|:---:|---|:---:|
| **1** | Hardcoded JWT Secret Fallbacks (`supersecretdevkey...`) | **High** | Replaced with strict environment variable validation (`process.env.JWT_SECRET` / `os.getenv("JWT_SECRET")`). Warns on insecure defaults. | **RESOLVED** |
| **2** | Unauthenticated QR Check-in Endpoint Missing | **High** | Added `POST /api/checkin/self-verify` with cryptographic HMAC-SHA256 signature verification so patients check in without exposing staff JWTs. | **RESOLVED** |
| **3** | Unvalidated Token Arrival Pass URLs | **Medium** | QR check-in URLs require timing-safe HMAC token signatures (`crypto.timingSafeEqual`) to prevent parameter tampering. | **RESOLVED** |
| **4** | Broken Frontend Build (`PatientTrackPage.jsx`) | **Critical** | Fixed unclosed JSX tags at lines 133–134; production Vite builds now compile cleanly. | **RESOLVED** |
| **5** | Permissive Cross-Origin Resource Sharing (CORS) | **Medium** | CORS open for hackathon rapid development; production configuration requires restricting `allow_origins` to hospital domain whitelist. | **FLAGGED FOR PROD** |
| **6** | Helmet Content-Security-Policy Disabled | **Medium** | CSP disabled temporarily to permit Google Fonts & CDNs; requires explicit nonce-based CSP before public hosting. | **FLAGGED FOR PROD** |
| **7** | Memory Buffer File Uploads in Reports | **Low** | Multer capped with 5MB ceiling per file and 5 files per batch; MIME validated via magic bytes (`file-type`). | **MITIGATED** |

---

## 3. Cryptographic Implementation Details

### A. JWT Bearer Tokens
- **Algorithm:** HMAC SHA-256 (`HS256`).
- **Expiration:** 12 hours from issuance.
- **Claims:** `sub` (username), `role` (`admin` | `receptionist` | `doctor`), `name`, `doctor_id`, `exp`.
- **Validation:** Enforced via FastAPI dependency `get_current_user` and Express middleware `authenticateToken`.

### B. Password Hashing
- **Algorithm:** PBKDF2 with HMAC-SHA256, 100,000 iterations, 16-byte cryptographically secure random salt (`os.urandom(16)`).
- **Format:** `<salt_hex>:<hash_hex>`.
- **Node.js Stack:** `bcryptjs` with salt rounds = 10.

### C. QR Arrival Token Signatures
- **Algorithm:** HMAC-SHA256 using server-side `QR_SECRET`.
- **Signature Input:** `token_no` (e.g. `CARD-002`, `SANJ-101`).
- **Verification:** Timing-safe comparison to prevent side-channel timing attacks:
  ```javascript
  crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(sig, 'utf8'));
  ```

---

## 4. Privacy & Healthcare Compliance

1. **Public Display Board Anonymization:** Lobby screens never show full patient names, mobile numbers, or diagnostic notes. Only token numbers (`C-012`) and doctor room designations are broadcast.
2. **AI Assistant Healthcare Safety Boundaries (Stage 5):**
   - The AI Assistant strictly operates as a navigation, routing, and preliminary symptom triage assistant.
   - Strictly forbidden from generating definitive clinical diagnoses or prescribing medications/dosages.
   - Persistent healthcare disclaimers rendered in all client views and API payloads.
   - Emergency Red-Flag Intercept: Hardened multi-lingual keyword patterns (cardiac, respiratory, neurological, trauma) automatically force `EMERGENCY` status regardless of model response, providing immediate direct dialing to the Sanjeevan Hospital 24/7 Hotline (+91 95526 25262) or 112.
3. **AI Session Isolation & Data Privacy:**
   - Multi-turn sessions isolated by cryptographically random UUIDs; zero cross-session leakage.
   - In-memory sliding context window (last 10 turns) with automatic 60-minute TTL cleanup.
   - Explicit `POST /api/ai/conversation/reset` endpoint allowing patients to wipe their conversational context anytime.
   - Backend-only `GEMINI_API_KEY` handling with zero client exposure or debug logging.
   - Rate limiting enforced at 20 requests/minute per session to guard against model exhaustion and DDoS abuse.
2. **Medical Report Obfuscation:** Uploaded patient reports are stripped of original filenames, renamed to cryptographically random UUIDs (`fileStore.saveFile`), and stored outside the public document root.
3. **Emergency Audit Trail:** Any priority escalation from normal to emergency is recorded in `emergency_audit_logs` with staff username, timestamp, and clinical justification.
