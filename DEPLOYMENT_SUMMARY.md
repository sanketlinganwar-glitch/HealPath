# 🏆 HACKBYTE (HealPath / QueueCare) — Master Production Deployment Summary

**Deployment Date:** November 25, 2026  
**Project:** HACKBYTE (HealPath / QueueCare)  
**Partner Hospital:** Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal, Maharashtra, India – 445001  
**Release Baseline:** v2.6.2-production  
**Author:** Senior DevOps & Release Engineering  

---

## 1. Production URLs & Endpoints

| Environment | Service | Public URL | Status |
| :--- | :--- | :--- | :--- |
| **Production Cloud** | **Frontend (GitHub Pages Edge CDN)** | **[https://sanketlinganwar-glitch.github.io/HealPath/](https://sanketlinganwar-glitch.github.io/HealPath/)** | 🟢 **ACTIVE & LIVE** |
| **Production Cloud** | **Backend API (Render Web Service)** | **[https://healpath-2.onrender.com](https://healpath-2.onrender.com)** | 🟢 **ACTIVE & LIVE** |
| **Production Cloud** | **API Documentation (Swagger UI)** | **[https://healpath-2.onrender.com/docs](https://healpath-2.onrender.com/docs)** | 🟢 **INTERACTIVE SWAGGER** |
| **Production Cloud** | **API Health Check** | **[https://healpath-2.onrender.com/api/health](https://healpath-2.onrender.com/api/health)** | 🟢 **HTTP 200 OK (`{"status":"ok"}`)** |
| **Production Cloud** | **Frontend (Vercel Ready)** | Pre-configured via `vercel.json` | 🟢 **Ready for 1-click import** |
| **Production Cloud** | **Docker Container** | `Dockerfile` (Python 3.11-slim multi-stage) | 🟢 **Built & Verified** |
| **Local Offline** | **Frontend SPA Portal** | [http://localhost:5173](http://localhost:5173) | 🟢 **Running (Daemon)** |
| **Local Offline** | **FastAPI Backend & Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | 🟢 **Running (Daemon)** |
| **Local Offline** | **Express Queue Server** | [http://localhost:3000/index.html](http://localhost:3000/index.html) | 🟢 **Running (Daemon)** |

---

## 2. Infrastructure & Hosting Architecture

| Architectural Tier | Selected Provider | Plan / Tier | Cost | Persistence Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Web App** | **GitHub Pages Edge CDN** | Free / Unlimited | ₹0 | Static Edge CDN with PWA service worker caching (`skipWaiting: true`) |
| **Alternative Frontend**| **Vercel** | Hobby (Free) | ₹0 | Global Serverless Edge Network (`vercel.json`) |
| **Clinical Backend API**| **Render.com** | Free Web Service (Linux container) | ₹0 | Python 3.11 container running Uvicorn ASGI server with Gunicorn workers |
| **Production Database** | **SQLite (`backend/queuecare.db`)** | Embedded + Auto-Seeding | ₹0 | Seed script creates default schema & clinical records; verified backup preserved |
| **Database Migration Bridge** | **Neon.tech (Cloud Postgres)** | Free Tier (0.5 GB) | ₹0 | Zero-downtime persistence via `backend/migrate_sqlite_to_postgres.py` |
| **Pre-Deployment Backup**| **Local Verified Backup** | File Archive | ₹0 | Stored at `backend/backups/queuecare_pre_deployment_backup_20261124.db` |

---

## 3. Build & Test Verification Results

| Verification Phase | Metric / Category | Result | Details |
| :--- | :--- | :---: | :--- |
| **Frontend Production Build** | Vite v5.4.21 | 🟢 **PASS** | 0 compilation errors, chunk size optimized, PWA manifest & service worker generated |
| **Frontend GitHub Actions** | `Deploy Frontend to GitHub Pages` | 🟢 **PASS** | Run #45645570293 completed with status `success` on commit `95309f4` |
| **Backend Deployment Build** | Render Deploy Engine | 🟢 **PASS** | Requirements installed, database seeded cleanly, Uvicorn listening on `$PORT` |
| **Cross-Origin Resource Sharing (CORS)** | `Access-Control-Allow-Origin` | 🟢 **PASS** | Preflight `OPTIONS` and `GET` requests return HTTP 200 with credentials enabled |
| **Asset Path Resolution** | Subpath asset resolver | 🟢 **PASS** | `resolveAssetUrl()` verified on GitHub Pages subpath (`/HealPath/`) |
| **Backend Integration Tests** | `backend/smoke_test.py` | 🟢 **PASS** | **17/17 (100%)** comprehensive integration tests passed |
| **Backend Unit Test Suites** | `unittest` test suites | 🟢 **PASS** | **54/54 (100%)** tests passed across triage, queue, and analytics |
| **Total Automated Tests** | All backend test suites | 🟢 **PASS** | **71/71 (100%) passing with 0 failures** |
| **Live CDN Availability** | HTTPS response code | 🟢 **PASS** | `https://sanketlinganwar-glitch.github.io/HealPath/` returns **200 OK** |

---

## 4. Key Deployment Engineering Fixes

1. **Database Seeding Prescription Counter Collision (`UNIQUE constraint failed: prescriptions.prescription_number`):**
   - *Problem:* In `backend/seed.py`, `rx_count` variable reused the doctor index loop variable, leading to duplicate prescription ID `RX-2026-0017` on multiple completed patient tokens.
   - *Fix:* Implemented a dedicated monotonically increasing counter `rx_counter = 0` generating sequential IDs (`RX-2026-0001`, `RX-2026-0002`, `RX-2026-0003`). Render deployment succeeded immediately.

2. **Frontend Doctor Photos on GitHub Pages Subpath:**
   - *Problem:* Direct absolute image paths like `/images/doctors/...` broke on GitHub Pages repository subpath `/HealPath/`.
   - *Fix:* Built and imported `resolveAssetUrl()` utility across all React components, prefixing paths with Vite's `BASE_URL`.

3. **API Client URL Resolution & PWA Service Worker Invalidation:**
   - *Problem:* Stale service worker cache in user browsers sent requests to `https://sanketlinganwar-glitch.github.io/api/departments` instead of the Render backend, causing 404 toast warnings.
   - *Fix:* Added `API_BASE` fallback to `https://healpath-2.onrender.com` in `client.js`, created `frontend/.env.production`, and configured `skipWaiting: true` / `clientsClaim: true` in `vite.config.js` to immediately activate updated workers.

---

## 5. Security Audit Results

- [x] **No Secrets in Frontend:** Scanned all `.jsx`, `.js`, and `.html` files — zero API keys or secrets embedded.
- [x] **Environment File Exclusion:** `.env` and `*.local` excluded from Git via `.gitignore`.
- [x] **Production HTTP Security Headers:** Injected on all FastAPI responses:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- [x] **Authentication & Role-Based Access:** Protected staff and doctor routes return HTTP 401/403 for unauthorized requests.
- [x] **Patient Privacy:** Test suites utilize sanitized simulated records; no real patient PHI exposed.

---

## 6. Features Successfully Tested & Verified in Production

1. **Official Doctor Directory (`/#/doctors-info`):** All 16 hospital medical specialists across 5 clinical departments with authentic qualifications, room allocations, and duty statuses.
2. **OPD Appointment Booking (`/#/book-appointment`):** Cascading department & doctor selection with slot duration options and atomic token generation.
3. **Queue Prediction Engine (`/#/track-token`):** Dynamic waiting time point estimates and confidence intervals for patient queue tracking.
4. **Digital Display Board (`/#/display`):** Real-time lobby TV screen with calling chimes and current token numbers.
5. **Doctor Consultation Desk (`/#/doctor-console`):** Real-time patient queue, "Call Next" control, and digital prescription builder.
6. **QR Self Check-In Kiosk:** Tamper-proof HMAC signed QR pass verification.
7. **Admin Dashboard (`/#/staff`):** Real-time patient counts, department load heatmaps, and doctor duty rosters.
8. **Patient Health Wallet (`/#/health-wallet`):** Secure phone-based login, digital prescription history, and official PDF download.

---

## 7. Known Limitations & Operational Considerations

1. **Render Free Tier Cold Starts:** Free web services on Render spin down after 15 minutes of inactivity. The first request after sleep takes 30-45 seconds to wake up the container. A free external ping service (such as Cron-Job.org or UptimeRobot) pinging `https://healpath-2.onrender.com/api/health` every 10 minutes keeps the service permanently warm.
2. **Ephemeral SQLite Storage on Free Cloud Containers:** Free-tier container restarts on Render re-seed SQLite from scratch if redeployed. For permanent, persistent writes in high-volume production, connect a free Cloud PostgreSQL instance (Neon.tech or Supabase) using the pre-built `backend/migrate_sqlite_to_postgres.py` script.

---

## 8. Master Deliverables Index

1. [`DEPLOYMENT_AUDIT.md`](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/DEPLOYMENT_AUDIT.md) — Comprehensive repository, route, and dependency audit.
2. [`DEPLOYMENT_GUIDE.md`](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/DEPLOYMENT_GUIDE.md) — Step-by-step cloud production & local operations guide.
3. [`PRODUCTION_ENV_TEMPLATE.md`](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/PRODUCTION_ENV_TEMPLATE.md) — Environment variables schema and security template.
4. [`LIVE_TEST_REPORT.md`](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/LIVE_TEST_REPORT.md) — 17-category live test matrix with 71/71 passing automated tests.
5. [`DEPLOYMENT_SUMMARY.md`](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/DEPLOYMENT_SUMMARY.md) — Executive release sign-off and architecture summary.
