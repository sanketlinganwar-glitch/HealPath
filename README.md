# MediCare - Hospital Website, Appointment & Queue System

> **Tagline:** *"Health Today. Brighter Tomorrow."*  
> **Secondary:** *"Your Health. Our Priority."*

---

## 🏥 Overview

**MediCare** is a production-grade, responsive full-stack hospital web application built with a **modern brand aesthetic** and an intelligent **role-based appointment, slot-booking, and live-queue management system**.

It addresses the fundamental flaw of traditional hospitals—**long, agonizing waiting times and chaotic lobbies**—by combining **atomic color-coded slot bookings**, **instant WhatsApp confirmations**, a **10-minute auto-shift algorithm for missed slots**, and a **real-time Socket.io live token queue**.

---

## 🌟 Key Features

### Part 1: Brand & Design System (Strict Visual Guide Alignment)
- **Palette**: Deep Blue (`#0F3B64`), Teal (`#14BBA6`), Soft Mint (`#A7D8D1`), Light Gray (`#E8F1F5`), Charcoal (`#2D3748`).
- **Typography**: Google Font **Plus Jakarta Sans** (Weights: 400, 600, 700, 800).
- **Logo**: Dual-color "MediCare" text with rounded-square "M" icon tile and spaced capital tagline.
- **Components**: 3px teal top-border cards, hover transitions to deep blue with white text, pill tags, pulsing loader, fixed scroll-to-top button, organic background curves/leaf overlays.

### Part 2: Public Website Pages
- **Sticky Global Header**: Logo, language selector (English / Hindi / Marathi), online/offline connectivity indicator, Help button, and Login/Register.
- **Home Page (9-Section Strict Layout)**:
  1. Hero section with heading *"Your Health. Our Priority."* and doctor/nurse leaf overlay.
  2. Quick appointment bar overlapping the hero.
  3. Trust icons strip (Trusted Care, Better Living, Healthy Communities, Life Long Wellness).
  4. About section with circular play button, checklist, and "More About Us".
  5. 3x2 Services Grid (Fast Ambulance, Dental Specialist, Modern Laboratory, Children Center, Heart Surgery, Care Advice).
  6. Specialities tabs (Cardiology, Stomatology, Radiology, Neurology, Ophthalmology) with dynamic doctor details.
  7. Full-width deep blue Testimonials slider.
  8. Doctors Team (4 interactive cards with hover social slider).
  9. 4-Column Deep Blue Footer with 24/7 hotline and newsletter subscribe.
- **Inner Pages**:
  - `services.html`: Sidebar with search and category list with arrows, image, text, and quote block.
  - `doctors.html`: Full doctors directory with department filtering and room details.
  - `about.html`: Hospital vision, smart queue benefits, and quality care pillars.
  - `contact.html`: *"We're Connected All Time To Help Our Patients"*, form, contact card, embedded Google Map.
  - `blog.html`: Health articles and popular feeds sidebar.

### Part 3: Roles & Auth
- **JWT + bcrypt authentication** with role protection:
  - **Patient**: View appointments, track live tokens, reschedule, cancel, chat.
  - **Doctor**: Consultation desk, "Call Next Patient" audio/visual broadcast, complete consultation, status toggle (available, in consultation, on break), schedule settings.
  - **Receptionist / Admin**: Staff & patient counts, daily queue load, slot duration settings (15/20 min), grace period settings (10 min), message logs, and printable/exportable Daily Reports (PDF/CSV).

### Part 4: Atomic Slot Booking
- Cascading: **Department $\rightarrow$ Doctor $\rightarrow$ Date $\rightarrow$ Slot Grid**.
- Color-coded slots:
  - 🟢 **Available (Teal `#14BBA6`)**: Clickable to open booking popup.
  - 🔴 **Booked (Red `#E5484D`)**: Disabled.
  - ⚪ **Missed (Grey `#9AA5B1`)**: Disabled.
- Double-booking prevention via atomic database transactions with row-level reservation checks.
- Unique token numbers generated per doctor per day (e.g., `CARD-001`, `DENT-002`).

### Part 5: Instant WhatsApp Notifications
- Automatically fires on:
  1. **Slot Confirmation**: *"Hello {name}, your appointment with Dr. {doctor} is confirmed on {date} at {time}. Token No: {token}. Please arrive 10 minutes early."*
  2. **Reschedule**: Instant notification with new slot and updated token.
  3. **Missed-Slot Auto-Shift**: Notification detailing shifted time slot.
- Supports **WhatsApp Cloud API (Meta)**, **Twilio WhatsApp API**, and an interactive **live UI simulation with direct click-to-chat links**.

### Part 6: Missed Slot Auto-Shift (Scheduled Background Cron)
- `node-cron` job executes every 60 seconds (`* * * * *`).
- Checks if a patient hasn't checked in within the **10-minute grace period** after slot start time.
- Idempotently and safely auto-shifts the patient to the next available slot today for the same doctor, issues an updated token, and notifies them on WhatsApp.

### Part 7: Live Queue & Real-Time Sync
- Powered by **Socket.io**.
- Real-time TV board displaying "Now Calling" token with audio voice synthesis chime (`SpeechSynthesisUtterance`).
- Estimated waiting time dynamically computed based on queue depth and doctor consultation duration.
- **Fast Check-in Action** by Token Number or button that halts the missed-slot timer.

### Part 8: Extra AI Features
- **AI Health Chatbot & Voice Assistant**: Answers FAQs, explains booking steps, and provides symptom triage in English, Hindi, and Marathi.
- **Web Speech API**: Tap microphone to speak your question directly.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (MediCare Brand System), Vanilla JavaScript (ES6+), FontAwesome 6, Socket.io client.
- **Backend:** Node.js, Express.js.
- **Realtime:** Socket.io (bidirectional WebSockets).
- **Scheduled Automation:** `node-cron`.
- **Database:** MySQL2 compatible schema + Zero-config atomic JSON persistence engine (`database/medicare_store.json`).
- **Security:** Helmet, CORS, Express-Rate-Limit, bcryptjs, JSON Web Tokens (JWT).

---

## 🚀 Quick Setup & Run Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Initial Database
Seeds initial departments, doctors, working hours, bcrypt users, and demo slots for today:
```bash
npm run seed
```

### 3. Start the MediCare Server
```bash
npm start
```
*Or for live development:*
```bash
npm run dev
```

The application will be live at: **`http://localhost:3000`**

---

## 🔑 Demo Login Credentials

For quick evaluation during testing, click any of the preset buttons in the **Login / Register Modal**:

| Role | Email | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- |
| **Patient** | `patient@medicare.com` | `patient123` | My Bookings, Live Token Tracking, Reschedule, Check-in |
| **Doctor** | `doctor.sharma@medicare.com` | `doctor123` | Call Next Patient, Complete Visit, Change Status, Set Hours |
| **Receptionist** | `reception@medicare.com` | `reception123` | Check-in Patients, View Live Queue, Hospital Stats |
| **Admin** | `admin@medicare.com` | `admin123` | Full Access, Slot Duration (15/20 min), Grace Period, Export Reports |

---

## 📁 Project Structure

```
├── database/
│   ├── db.js                 # Dual-mode DB adapter (MySQL + Zero-config atomic fallback)
│   ├── schema.sql            # Full MySQL schema with constraints, indexes, foreign keys
│   ├── seed.js               # Database seeder with departments, doctors, and users
│   └── medicare_store.json   # Zero-config atomic data store
├── public/
│   ├── css/
│   │   └── styles.css        # Central MediCare brand stylesheet & design tokens
│   ├── js/
│   │   ├── i18n.js           # Multi-language dictionary (English, Hindi, Marathi)
│   │   ├── main.js           # Global navigation, auth state, socket alerts, modals
│   │   ├── booking.js        # Cascading dropdowns, slot matrix, booking modal
│   │   ├── queue.js          # Live Queue monitor, audio token announcements
│   │   ├── dashboard.js      # Role-based dashboard (Patient, Doctor, Admin)
│   │   └── chat.js           # AI Health Bot & Web Speech API Voice Assistant
│   ├── index.html            # Public website homepage (9 sections)
│   ├── booking.html          # Dedicated slot reservation flow
│   ├── queue.html            # Real-time Live Queue display board
│   ├── dashboard.html        # Role-based dashboard portal
│   ├── services.html         # Clinical services & department details
│   ├── doctors.html          # Specialist doctor directory
│   ├── about.html            # Hospital vision & zero-wait waiting room
│   ├── contact.html          # Contact form & embedded map
│   └── blog.html             # Medical wellness blog & popular feeds
├── routes/
│   ├── auth.js               # JWT login, register, token verification
│   ├── departments.js        # Department listings and doctor counts
│   ├── doctors.js            # Doctor profiles, status updates, schedule
│   ├── slots.js              # Time slot query and auto-generator
│   ├── appointments.js       # Atomic booking, reschedule, check-in, cancel
│   ├── queue.js              # Live board, call-next, status, wait-time stats
│   ├── admin.js              # Settings, reports generation, message audit
│   └── chat.js               # Multilingual AI triage & FAQ endpoint
├── services/
│   ├── cron.js               # Idempotent 60-second missed slot auto-shifter
│   ├── queueService.js       # Core business logic: atomic reservation & auto-shift
│   └── whatsapp.js           # WhatsApp Cloud API, Twilio, and Live Simulation
├── socket/
│   └── socketHandler.js      # Realtime WebSockets for live queue sync & calls
├── .env.example              # Environment variables template
├── package.json              # Project dependencies and npm scripts
└── server.js                 # Express + Socket.io main application server
```

---

## 📱 WhatsApp Integration

Configure your credentials in `.env` (optional):
```env
# Meta WhatsApp Cloud API
WHATSAPP_CLOUD_TOKEN=your_token_here
WHATSAPP_PHONE_ID=your_phone_id_here

# OR Twilio WhatsApp
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_auth_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```
*If keys are omitted, the system operates in **Live Simulation Mode**, presenting interactive on-screen WhatsApp message bubbles with a 1-click **"Open in WhatsApp Web"** link.*

---

## 🔒 Security & Performance
- **Atomic Transactions:** Prevents duplicate slot bookings through synchronized in-memory and database mutex locking.
- **Helmet & CORS:** Strict HTTP headers with configured policies.
- **Express Rate Limiting:** Protects `/api/*` endpoints from abuse (500 req / 15 mins).
- **Password Hashing:** Industry-standard `bcryptjs` with salt rounds = 10.
- **JWT Protection:** Signed tokens with 7-day expiration.
- **Responsive Layout:** Optimized for mobile smartphones, tablets, and high-resolution desktops.

---

&copy; 2026 MediCare Hospital. *"Health Today. Brighter Tomorrow."*
