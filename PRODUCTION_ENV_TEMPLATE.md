# 🔑 HealPath (QueueCare) — Production Environment Variables Template

This document outlines all environment variables required for cloud deployment. Never commit production `.env` files containing live secrets to version control.

---

## 1. Backend Service Configuration (FastAPI)

These variables must be configured in your cloud hosting provider (e.g. Render, Railway, Fly.io, or Docker):

| Variable | Required | Example Production Value | Description |
| :--- | :---: | :--- | :--- |
| `ENV` | Yes | `production` | Switches application mode to production (disables debug reloader). |
| `PORT` | Yes | `8000` *(or auto-assigned by host)* | The internal port the HTTP server binds to. |
| `PYTHONUNBUFFERED` | Yes | `1` | Forces stdout/stderr flushing for real-time container log streaming. |
| `JWT_SECRET` | **CRITICAL** | `h3alp4th_m4st3r_s3cur3_jwt_pr0ducti0n_k3y_9f82d1a` | 64+ character random secret used to sign and verify patient & staff JWT auth tokens. |
| `DATABASE_URL` | Optional | `postgresql://user:pass@ep-cool-db.neon.tech/healpath?sslmode=require` | 12-factor cloud database URL. If omitted, defaults to embedded SQLite (`backend/queuecare.db`). |
| `GEMINI_API_KEY` | Optional | `AIzaSy...` | Google Gemini API key for live LLM symptom triage and health query explanations. |
| `GEMINI_MODEL` | Optional | `gemini-2.5-flash` | The Gemini model version utilized for medical categorization. |

---

## 2. Frontend Build Configuration (Vite + React)

These variables are injected during the build step (`npm run build`) in GitHub Actions or Vercel:

| Variable | Required | Example Production Value | Description |
| :--- | :---: | :--- | :--- |
| `VITE_BASE` | Yes | `/HealPath/` *(for GitHub Pages)* or `/` *(for Vercel)* | Base path for static asset resolution. |
| `VITE_API_URL` | Yes | `https://healpath-api.onrender.com` | Full HTTPS URL of the deployed FastAPI backend. |

---

## 3. Real-Time / Kiosk Service Configuration (Optional Node.js Server)

| Variable | Required | Example Production Value | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | Yes | `3000` | Port for Express Socket.io server. |
| `JWT_SECRET` | Yes | `same_as_fastapi_jwt_secret` | Secret for verifying auth tokens across gateways. |
| `QR_SECRET` | Yes | `healpath_qr_checkin_hmac_secret_2026` | Secret for signing tamper-proof check-in QR codes. |
| `WHATSAPP_CLOUD_TOKEN`| Optional | `EAAG...` | Meta WhatsApp Cloud API access token. *(Operates in simulation mode if blank)*. |
| `WHATSAPP_PHONE_ID` | Optional | `1059381726...` | Meta WhatsApp Cloud Phone Number ID. |
| `RAZORPAY_KEY_ID` | Optional | `rzp_test_...` | Razorpay Test API Key. *(Defaults to offline Hospital Counter payment if blank)*. |
| `RAZORPAY_KEY_SECRET` | Optional | `sec_test_...` | Razorpay Test API Secret. |
