# 🔌 HACKBYTE — API DOCUMENTATION & CONTRACT SPECIFICATION
## Comprehensive REST Endpoint Reference (FastAPI & Express)

---

## 1. Conventions & Standards

- **Base URL (FastAPI):** `http://localhost:8000/api`
- **Base URL (Express):** `http://localhost:3000/api`
- **Content-Type:** `application/json` (except file uploads which use `multipart/form-data`)
- **Error Format:** All client and server errors return an error envelope:
  ```json
  { "detail": "Human-readable description of error" }
  ```
- **Authentication:** Bearer JWT token in HTTP request header:
  ```http
  Authorization: Bearer <JWT_TOKEN>
  ```

---

## 2. Core Endpoints Reference

### A. Reference & Discovery
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Returns system health, database type, and timestamp. |
| `GET` | `/api/departments` | Public | Returns active hospital departments with waiting counts. |
| `GET` | `/api/doctors` | Public | List specialists with query filter `?department_id=N`. |
| `GET` | `/api/display` | Public | Data payload for waiting room TV display board. |

### B. Patient & Token Management
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/tokens` | Public | Register patient and generate an OPD queue token. |
| `GET` | `/api/tokens/{id}` | Public | Real-time tracking of token position, people ahead, and wait time. |
| `GET` | `/api/tokens/secure/{hash}` | Public | Cryptographic QR lookup for patient tracking without login. |
| `GET` | `/api/tokens/lookup?phone=...` | Public | Find active tokens associated with a mobile phone number. |
| `POST` | `/api/tokens/{id}/reschedule` | Public | Delay waiting turn by 15, 30, or 60 minutes. |
| `GET` | `/api/tokens/{id}/messages` | Public | Fetch system and staff broadcast alerts for this token. |

### C. Online Appointment Booking
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/appointments/slots` | Public | Compute available 30-minute consultation slots by doctor and date. |
| `POST` | `/api/appointments/book` | Public | Atomic slot reservation; generates unique code (`APT-C-XXXXXX`). |
| `GET` | `/api/appointments/{id}` | Public | Retrieve appointment details and QR pass URL. |
| `POST` | `/api/appointments/{id}/check-in` | Staff | Convert confirmed appointment into live waiting queue token. |
| `POST` | `/api/appointments/{id}/reschedule`| Public | Move appointment to a new open date/time slot. |
| `POST` | `/api/appointments/{id}/cancel` | Public | Cancel appointment and free slot for other patients. |

### D. QR Arrival Check-In (Express)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/checkin/self-verify` | Public | Cryptographic HMAC-SHA256 arrival verification; halts grace timer. |
| `POST` | `/api/checkin/manual-verify`| Public | Fallback manual token check-in by token number and phone. |
| `POST` | `/api/checkin/scan` | Staff | Reception desk barcode scanner check-in with JWT auth. |
| `GET` | `/api/checkin/qr/{id}` | Public | Generates downloadable PNG QR arrival pass. |

### E. Clinical Staff & Doctor Console
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/doctors/{id}/current` | Doctor | Active consultation desk state, current patient, and next 3 in line. |
| `POST` | `/api/doctors/{id}/call-next`| Doctor | Assigns oldest waiting token to doctor; sets status `in_progress`. |
| `POST` | `/api/tokens/{id}/complete` | Doctor | Marks consultation complete; records `completed_at` timestamp. |
| `POST` | `/api/tokens/{id}/skip` | Staff | Marks no-show patient as `skipped`. |
| `POST` | `/api/tokens/{id}/requeue` | Staff | Returns skipped patient to queue with priority. |
| `PATCH`| `/api/doctors/{id}/roster` | Staff | Updates shift timings and duty status (`available`, `on_break`, `off_duty`). |
| `POST` | `/api/doctors/{id}/reassign-queue`| Staff | Transfers waiting queue from an off-duty doctor to an active colleague. |

### F. Digital Prescriptions
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/prescriptions` | Doctor | Author and digitally sign an official prescription with medication list. |
| `GET` | `/api/prescriptions/token/{id}`| Public | Retrieve prescription linked to a consultation turn. |
| `GET` | `/api/prescriptions/{id}` | Public | Fetch full prescription by prescription record ID. |

### G. Emergency Priority Workflow
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/tokens/{id}/emergency-flag` | Staff | Flag a patient as emergency; moves token to top of the queue. |
| `POST` | `/api/tokens/{id}/emergency-verify`| Doctor | Attending physician verifies or downgrades emergency tier with notes. |
| `GET` | `/api/tokens/{id}/emergency-audit` | Staff | View full audit trail of priority changes and clinical notes. |

### H. Patient Feedback & Reviews
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/feedback` | Public | Submit post-consultation 1–5 star ratings and comments. |
| `GET` | `/api/feedback/summary` | Public | Aggregated ratings breakdown and department averages. |

### I. AI Health Assistant & Triage (Stage 5 Upgraded)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/ai/suggest-department` | Public | Submits symptoms; returns recommended clinical department (backward-compatible). |
| `POST` | `/api/ai/triage` | Public | Stage 5 structured clinical symptom triage powered by Gemini 2.5 Flash with urgency scoring (`ROUTINE`, `MODERATE`, `URGENT`, `EMERGENCY`), hospital next steps, and automatic deterministic offline fallback. |
| `POST` | `/api/ai/conversation/reset` | Public | Resets multi-turn conversation session, clearing context history for user privacy. |
| `POST` | `/api/chat` | Public | Multilingual multi-turn conversational AI assistant (EN/HI/MR) with 20 req/min rate limiting, live token context injection, and emergency red-flag override. |
