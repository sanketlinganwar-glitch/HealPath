# QueueCare API Contract (v1)

Backend: FastAPI + SQLite. Frontend: React (PWA, mobile-first). Base path: `/api`.
Put this file in the repo root. If anything must change, tell the other person first, then update this file and push.

## 0. Conventions
- JSON everywhere. Timestamps are ISO-8601 strings, e.g. `"2026-10-23T10:15:00"`.
- Live screens poll every **5 seconds** (no websockets).
- Errors: HTTP 4xx with body `{"detail": "human readable message"}`.
  - 404 not found, 409 conflict (wrong state / duplicate), 422 validation failed.
- CORS is open for the hackathon.

## 1. Enums and objects

**status**: `"waiting" | "in_progress" | "completed" | "skipped"`
**priority**: `"normal" | "senior" | "emergency"`
**source**: `"online" | "walk_in" | "appointment"`
**doctor.status**: `"available" | "busy" | "off"`

### Token object (returned by most endpoints)
```json
{
  "id": 12,
  "token_number": "C-012",
  "department_id": 2,
  "department_name": "Cardiology",
  "doctor_id": null,
  "doctor_name": null,
  "patient": { "id": 5, "name": "Ramesh Pawar", "phone": "9876543210", "age": 58, "gender": "male" },
  "priority": "senior",
  "status": "waiting",
  "source": "online",
  "symptoms": "chest pain",
  "position": 3,
  "people_ahead": 2,
  "est_wait_min": 14,
  "created_at": "2026-10-23T10:15:00",
  "called_at": null,
  "completed_at": null
}
```
`position`, `people_ahead`, `est_wait_min` are only meaningful while `status == "waiting"`; otherwise they are `null`.

### Department object
```json
{ "id": 2, "name": "Cardiology", "code": "C", "waiting_count": 6, "in_progress_count": 1,
  "active_doctors": 2, "avg_consult_min": 9, "est_wait_min": 27 }
```

### Doctor object
```json
{ "id": 4, "name": "Dr. Meera Kulkarni", "department_id": 2, "department_name": "Cardiology",
  "room": "Room 12", "status": "busy" }
```

## 2. Endpoints

### A. Reference data
| Method | Path | Response |
|---|---|---|
| GET | `/api/health` | `{"status":"ok"}` |
| GET | `/api/departments` | `[Department]` |
| GET | `/api/doctors?department_id=2` | `[Doctor]` (filter optional) |

### B. Patient module
**POST `/api/tokens`**: register and generate a token (also used by reception for walk-ins).
```json
{
  "name": "Ramesh Pawar",
  "phone": "9876543210",
  "age": 58,
  "gender": "male",
  "department_id": 2,
  "priority": "normal",
  "symptoms": "chest pain",
  "source": "online"
}
```
`gender`: `"male" | "female" | "other"`. `symptoms` and `source` are optional (source defaults to `"online"`).
Response `201`: `Token`.
Validation: name 2-60 chars; phone exactly 10 digits; age 0-120; department must exist; 409 if this phone already has an active (waiting or in_progress) token in the same department.

**GET `/api/tokens/{id}`**: track one token (poll every 5s). Response: `Token`, plus
```json
{ "now_serving": "C-009", "department_waiting_count": 6 }
```
(these two extra fields are added at the top level of the Token object).

**GET `/api/tokens/lookup?phone=9876543210`**: find a patient's active tokens without login. Response: `[Token]` (empty array if none).

### C. Receptionist module
**GET `/api/queue?department_id=2`**: live queue of one department, already sorted.
```json
{
  "department_id": 2,
  "department_name": "Cardiology",
  "in_progress": [Token],
  "waiting": [Token],
  "counts": { "waiting": 6, "in_progress": 1, "completed": 14, "skipped": 1 }
}
```
**PATCH `/api/tokens/{id}/priority`**, body `{"priority": "emergency"}`. Response: `Token` (queue order updates immediately). Only for `waiting` tokens (else 409).
**POST `/api/tokens/{id}/skip`**: no-show. Status becomes `skipped`. Response: `Token`.
**POST `/api/tokens/{id}/requeue`**: skipped patient returns, goes to the back of their priority group. Status becomes `waiting`. Response: `Token`.

### D. Doctor module
**GET `/api/doctors/{id}/current`**
```json
{ "doctor": Doctor, "current": Token | null, "next_up": [Token], "waiting_count": 6 }
```
`next_up` = next 3 waiting tokens of the doctor's department.

**POST `/api/doctors/{id}/call-next`**: takes the first waiting token of the doctor's department, assigns the doctor, sets `in_progress`.
Response `200`: `{ "token": Token | null, "message": "Calling C-010" }`. If nobody is waiting: `token` is `null`, message `"No patients waiting"`. 409 if the doctor already has an `in_progress` token.

**POST `/api/tokens/{id}/complete`**: finish consultation. Status becomes `completed`. Response: `Token`. 409 if not `in_progress`.

### E. Display board and statistics
**GET `/api/display`** (optional `?department_id=2`):
```json
{
  "departments": [
    {
      "department_id": 2, "department_name": "Cardiology",
      "now_serving": [ { "token_number": "C-009", "doctor_name": "Dr. Meera Kulkarni", "room": "Room 12" } ],
      "next_up": ["C-010", "C-011", "C-012", "C-013", "C-014"],
      "waiting_count": 6, "est_wait_min": 27
    }
  ]
}
```
**GET `/api/stats`** (optional `?department_id=2`), for today:
```json
{
  "date": "2026-10-23",
  "total_tokens": 48, "waiting": 9, "in_progress": 3, "completed": 34, "skipped": 2,
  "avg_wait_min": 17, "avg_consult_min": 8, "longest_wait_min": 41,
  "by_department": [ { "department_id": 2, "department_name": "Cardiology", "waiting": 6, "completed": 14, "avg_wait_min": 19 } ],
  "hourly": [ { "hour": 9, "count": 7 }, { "hour": 10, "count": 11 } ]
}
```
`avg_wait_min` = average of (called_at - created_at) for tokens already called.

### F. AI helper
**POST `/api/ai/suggest-department`**, body `{"symptoms": "chest pain and breathlessness"}`
```json
{
  "department_id": 2, "department_name": "Cardiology",
  "reason": "Chest pain and breathlessness are usually checked by a heart specialist.",
  "disclaimer": "This is a suggestion, not a medical diagnosis. Emergency? Go to the emergency desk.",
  "fallback": false
}
```
If the AI call fails, return General Medicine with `"fallback": true` (never an error).

### G. Demo helpers
| Method | Path | What it does |
|---|---|---|
| POST | `/api/demo/reset` | Wipes and re-seeds sample data. Response `{"message":"reset done","tokens":N}` |
| POST | `/api/demo/simulate` | Body `{"count": 5}` adds random waiting patients. Response `{"added": 5}` |

### H. Stretch (build only after everything above works)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/appointments?date=2026-10-23&department_id=2` | `[Appointment]` |
| POST | `/api/appointments` | body: patient fields + `department_id`, `doctor_id` (optional), `slot_time` |
| POST | `/api/appointments/{id}/check-in` | creates a Token (`source: "appointment"`), returns `Token` |
| GET | `/api/ot-schedule` | seed data: `[{id, theatre, procedure, surgeon, start, end, status}]` |

Appointment: `{ "id": 1, "patient": {...}, "department_id": 2, "doctor_id": 4, "slot_time": "2026-10-23T11:30:00", "status": "booked" }` (status: `booked | checked_in | cancelled`).

## 3. Business rules (backend implements, frontend just displays)
- **Token number**: department code + daily sequence, e.g. `C-012`. Resets every day.
- **Queue order** (waiting tokens): emergency first, then senior, then normal; same priority sorted by `created_at`.
- **Estimated wait** = `people_ahead x avg_consult_min / max(active_doctors, 1)`, rounded to whole minutes.
  `avg_consult_min` = rolling average of the last 10 completed consultations in that department (default 8 until data exists).
- **Doctor busy/available** is derived from whether they have an `in_progress` token (`off` comes from seed data).

## 4. Screen to endpoint map (for the frontend)
| Screen | Endpoints |
|---|---|
| Patient: register | `GET /departments`, `POST /ai/suggest-department` (optional), `POST /tokens` |
| Patient: track token | `GET /tokens/{id}` every 5s, `GET /tokens/lookup` |
| Receptionist: dashboard | `GET /queue`, `GET /stats`, `POST /tokens` (walk-in), `PATCH /tokens/{id}/priority`, skip, requeue |
| Doctor: console | `GET /doctors/{id}/current`, `POST /doctors/{id}/call-next`, `POST /tokens/{id}/complete` |
| Display board (TV) | `GET /display` every 5s |
| Demo controls (hidden page) | `POST /demo/reset`, `POST /demo/simulate` |

## v1.1 additions

### A. Authentication
- **POST `/api/auth/login`**: Body `{"username": "...", "password": "..."}` -> `{"access_token": "...", "token_type": "bearer", "role": "admin" | "receptionist" | "doctor", "name": "...", "doctor_id": int | null}`.
- JWT HS256, 12h expiration (PyJWT).
- Seed users: `admin`/`admin123`, `reception`/`reception123`, `doctor1`..`doctorN`/`doctor123` mapped to seeded doctors.

### B. Messages
- Message object: `{"id": int, "token_id": int, "text": string, "kind": "system" | "staff", "created_at": "ISO-8601"}`.
- **POST `/api/messages`**: Body `{"token_id": int, "text": string}` -> `Message` (kind is "staff"). Staff only.
- **GET `/api/tokens/{id}/messages`**: Public. Returns `[Message]`, ordered newest first.
- System messages (kind "system") are created automatically:
  - When token becomes `in_progress`: "Please go to <room>"
  - When a waiting token reaches `people_ahead <= 2`: "Your turn is near. Please be ready near the consultation room." (sent once, using `near_notified` flag)
  - After a reschedule: "Your token has been rescheduled by <delay_minutes> minutes."

### C. Reschedule Turn
- **POST `/api/tokens/{id}/reschedule`**: Public. Body `{"delay_minutes": 15 | 30 | 60}`.
- Waiting tokens only (else 409).
- Sets `sort_time = now + delay_minutes`.
- Returns `Token`.

### D. Chat & AI Assistants
- **POST `/api/chat`**: Body `{"message": string, "language": "en" | "hi" | "mr", "token_id": int | null}` -> `{"reply": string, "intent": "queue_status" | "department_help" | "general" | "emergency", "suggested_actions": [{"label": string, "action": string}]}`.
- Gemini with strict system instruction: hospital helper, reply in requested language, short, never diagnose, emergencies -> emergency desk or call 112.
- Injects real token status, position, and wait if `token_id` provided.
- Rule-based fallback if Gemini fails.
- **POST `/api/ai/suggest-department`**: Body `{"symptoms": string}` -> `{"department_id": int, "department_name": string, "reason": string, "disclaimer": string, "fallback": bool}`. Always includes `"disclaimer"`.

### E. Queue Updates & Admin Controls
- **GET `/api/queue?department_id=2`**: Now returns `"skipped": [Token]` along with `"waiting"` and `"in_progress"`.
- **PATCH `/api/doctors/{id}/status`**: Admin only. Body `{"status": "available" | "off"}` -> `Doctor`.

### F. Appointment Slots & OT Schedule
- **GET `/api/appointments/slots?department_id=2&date=2026-10-23`**: 15-minute slots between 10:00 and 16:00.
- **PATCH `/api/appointments/{id}/reschedule`**: Body `{"slot_time": "..."}` -> `Appointment`. 409 if slot is already booked.
- **GET `/api/appointments`**: Staff only.
- **GET `/api/ot-schedule`**: Staff only.

