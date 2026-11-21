# 🚀 HACKBYTE — DEPLOYMENT & OPERATIONS GUIDE

---

## 1. Prerequisites

- **Node.js:** v18.x or v20.x LTS
- **Python:** v3.11, v3.12, or v3.13
- **Package Managers:** `npm` (v9+) and `pip` (v23+)
- **OS:** Windows 10/11, macOS, or Ubuntu 22.04 LTS

---

## 2. Environment Configuration

### Root `.env` (Express Application)
Create or verify `.env` in the project root:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=healpath_master_secure_jwt_secret_key_2026_gcoey_hackbite
QR_SECRET=healpath_qr_checkin_secret_key_2026

# Meta WhatsApp Cloud API (Optional - operates in Simulation Mode if unset)
WHATSAPP_CLOUD_TOKEN=
WHATSAPP_PHONE_ID=

# Twilio WhatsApp API (Alternative provider)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Fast2SMS API (Optional - simulation mode if unset)
FAST2SMS_API_KEY=

# Razorpay Test Mode (Must start with rzp_test_)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

### Backend `.env` (`backend/.env` - FastAPI Application)
```env
JWT_SECRET=healpath_master_secure_jwt_secret_key_2026_gcoey_hackbite
GEMINI_MODEL=gemini-2.5-flash
# Optional: Set your Google Gemini API key to activate live LLM symptom triage
GEMINI_API_KEY=
```

---

## 3. Running the Platform Locally

### A. Start the Express Real-Time Server (Port 3000)
```bash
# In project root
npm install
npm run seed       # Seeds initial hospital departments, doctors, and demo appointments
npm start          # Runs on http://localhost:3000
```
- **Public Portal:** `http://localhost:3000/index.html`
- **Slot Reservation:** `http://localhost:3000/booking.html`
- **QR Self Check-In:** `http://localhost:3000/checkin.html`
- **Live Queue TV Screen:** `http://localhost:3000/queue.html`
- **Role Portals:** `http://localhost:3000/dashboard.html`

### B. Start the FastAPI Clinical Backend (Port 8000)
```bash
# In backend virtual environment
.\backend\venv\Scripts\activate   # On Windows
pip install -r backend/requirements.txt
python backend/main.py            # Runs on http://localhost:8000
```
- **Interactive OpenAPI Docs:** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/api/health`

### C. Start the React 18 SPA (Port 5173)
```bash
cd frontend
npm install
npm run dev                       # Runs on http://localhost:5173
```
- **PWA Portal:** `http://localhost:5173`
- **Build Production:** `npm run build`

---

## 4. Production Containerization Blueprint (Docker Compose)

```yaml
version: '3.8'

services:
  fastapi-backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    restart: unless-stopped

  express-server:
    build:
      context: .
      dockerfile: Dockerfile.express
    ports:
      - "3000:3000"
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - QR_SECRET=${QR_SECRET}
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - fastapi-backend
      - express-server
    restart: unless-stopped
```
