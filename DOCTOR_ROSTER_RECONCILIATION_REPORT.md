# DOCTOR ROSTER RECONCILIATION & PHOTO INTEGRATION REPORT
**Project:** HACKBYTE (HealPath / QueueCare)  
**Partner Hospital:** Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal, Maharashtra – 445001  
**Official Verification Source:** `https://www.sanjeevanhospitalytml.com/consultant`  
**Date of Audit & Reconciliation:** November 23, 2026  
**Status:** **Audit Completed & Verified Photo Integration Active**

---

## 1. EXECUTIVE SUMMARY & KEY METRICS

| Audit Metric | Count | Details |
| :--- | :---: | :--- |
| **Total Official Doctors Identified** | **26** | Publicly listed on official Sanjeevan Hospital consultant directory |
| **Total Existing Database Doctors** | **16 (FastAPI) / 17 (Express)** | 16 active in `backend/queuecare.db`; 17th (Dermatology) in Express |
| **Verified Identity Matches in Active DB** | **6** | Exact verified matches between database and official roster |
| **Real Authentic Photos Integrated in DB** | **6** | Linked via local optimized web assets (`/images/doctors/*.jpg`) |
| **Total Authentic Photos Downloaded & Ready** | **26** | Downloaded from official server & optimized (450×500 progressive JPEG) |
| **Doctors Still Using Placeholders** | **10–11** | Unverified / demo profiles assigned clean initials/stethoscope fallback |
| **Missing Official Doctors from DB** | **20** | Verified hospital consultants currently not present in active database |
| **Frontend Production Build Status** | **Passed** | Vite v5.4.21 built in 19.34s, 0 errors (`dist/assets/index-D31-4eqK.js`) |
| **Backend Test Suite Status** | **64/64 Passed** | Ran 64 unit tests in 33.42s; 17/17 smoke test checks passed |

---

## 2. OFFICIAL DOCTOR IDENTIFICATION & VERIFICATION

All 26 consultant profiles were fetched and cataloged directly from Sanjeevan Hospital's official portal (`https://www.sanjeevanhospitalytml.com/consultant`):

| # | Official Consultant Name | Qualifications | Specialty / Department | Photo Filename in Repo |
| :-: | :--- | :--- | :--- | :--- |
| 1 | **Dr. Sunil M. Agrawal** | M.B.B.S., M.S. | General Surgery & Ortho | `dr_sunil_agrawal.jpg` |
| 2 | **Dr. Vijay S. Kawalkar** | M.B.B.S., M.S., F.M.A.S. | General Surgery / Laparoscopy | `dr_vijay_kawalkar.jpg` |
| 3 | **Dr. H. S. Bora** | M.B.B.S., M.D. | Medicine & Critical Care | `dr_hs_bora.jpg` |
| 4 | **Dr. Vinay Pande** | M.B.B.S., T.D.D., P.G.D.C.E. | Chest & Pulmonary Critical Care | `dr_vinay_pande.jpg` |
| 5 | **Dr. Lalit Paldiwal** | M.B.B.S., M.D. | Radiology & Sonography | `dr_lalit_paldiwal.jpg` |
| 6 | **Dr. Sheetal S. Agrawal** | M.B.B.S., M.D. | Obstetrics & Gynecology | `dr_sheetal_agrawal.jpg` |
| 7 | **Dr. Amol Deshpande** | M.B.B.S., M.D. | Medicine | `dr_amol_deshpande.jpg` |
| 8 | **Dr. Rajendra Kadukar** | M.B.B.S., M.D. | Medicine | `dr_rajendra_kadukar.jpg` |
| 9 | **Dr. Durgesh Mahajan** | M.B.B.S., M.D. | Medicine | `dr_durgesh_mahajan.jpg` |
| 10 | **Dr. Rekha Mundhada** | M.B.B.S., D.G.O. | Gynecology & Obstetrics | `dr_rekha_mundhada.jpg` |
| 11 | **Dr. Piyush Kalantri** | M.B.B.S., M.D., D.M. | Cardiology | `dr_piyush_kalantri.jpg` |
| 12 | **Dr. S. Mundhada** | M.B.B.S., M.D. | Pathology | `dr_s_mundhada.jpg` |
| 13 | **Dr. Pradip Bhojne** | M.B.B.S., D.C.H. | Pediatrics | `dr_pradip_bhojne.jpg` |
| 14 | **Dr. Gauri Bule** | M.B.B.S., M.S. | Ophthalmology | `dr_gauri_bule.jpg` |
| 15 | **Dr. Anil Loya** | M.B.B.S., D.C.H. | Pediatrics | `dr_anil_loya.jpg` |
| 16 | **Dr. Tushar Chhattani** | M.B.B.S., M.S. | Orthopedics | `dr_tushar_chhattani.jpg` |
| 17 | **Dr. Chetan Singhania** | M.B.B.S., M.S. | Orthopedics | `dr_chetan_singhania.jpg` |
| 18 | **Dr. Vijaya Kawalkar** | M.B.B.S., D.A. | Anesthesiology | `dr_vijaya_kawalkar.jpg` |
| 19 | **Dr. Virendra Bubna** | M.B.B.S., D.N.B. | Nephrology | `dr_virendra_bubna.jpg` |
| 20 | **Dr. Trupti Saraswat** | M.B.B.S., D.D.V. | Dermatology | `dr_trupti_saraswat.jpg` |
| 21 | **Dr. Ashish Potphode** | M.B.B.S., M.S. | General Surgery | `dr_ashish_potphode.jpg` |
| 22 | **Dr. Pramod Jethwani** | M.B.B.S., M.S. | ENT | `dr_pramod_jethwani.jpg` |
| 23 | **Dr. Navin Chhattani** | M.B.B.S., M.S. | General Surgery | `dr_navin_chhattani.jpg` |
| 24 | **Dr. Kalyani Gandhi** | M.B.B.S., M.D. | Microbiology | `dr_kalyani_gandhi.jpg` |
| 25 | **Dr. Ankush M. Sune** | M.B.B.S., D.N.B. | General Surgery | `dr_ankush_sune.jpg` |
| 26 | **Dr. Hitesh Dudhe** | M.B.B.S., M.D. | Psychiatry | `dr_hitesh_dudhe.jpg` |

---

## 3. ACTIVE DATABASE DOCTOR AUDIT & RECONCILIATION MATRIX

Comparison of all 17 doctors currently in `backend/queuecare.db`:

| DB ID | Doctor Name | Department | Specialization | Match Status | Assigned Image URL / Fallback |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | Dr. Rajesh Sharma | General Medicine | Senior Physician | Unverified Seed | Initial Placeholder (`RS`) |
| **2** | Dr. Anita Desai | General Medicine | Consultant Physician | Unverified Seed | Initial Placeholder (`AD`) |
| **3** | **Dr. Sunil M. Agrawal** | General Medicine | Chief Surgeon & Laparoscopy | **Verified** | `/images/doctors/dr_sunil_agrawal.jpg` |
| **4** | **Dr. Vijay S. Kawalkar** | General Medicine | Senior Consultant Laparoscopic Surgeon | **Verified** | `/images/doctors/dr_vijay_kawalkar.jpg` |
| **5** | **Dr. H. S. Bora** | General Medicine | MD General Medicine & Critical Care | **Verified** | `/images/doctors/dr_hs_bora.jpg` |
| **6** | **Dr. Vinay Pande** | General Medicine | Chest & Pulmonary Critical Care | **Verified** | `/images/doctors/dr_vinay_pande.jpg` |
| **7** | Dr. Meera Kulkarni | Cardiology | Cardiologist | Unverified Seed | Initial Placeholder (`MK`) |
| **8** | Dr. Vikram Malhotra | Cardiology | Cardiac Surgeon | Unverified Seed | Initial Placeholder (`VM`) |
| **9** | Dr. Suresh Patil | Orthopedics | Orthopedic Surgeon | Unverified Seed | Initial Placeholder (`SP`) |
| **10** | Dr. Sunita Rao | Orthopedics | Spine Specialist | Unverified Seed | Initial Placeholder (`SR`) |
| **11** | **Dr. Lalit Paldiwal** | General Medicine | MD Radiology & Sonography | **Verified** | `/images/doctors/dr_lalit_paldiwal.jpg` |
| **12** | Dr. Priya Nair | Pediatrics | Pediatrician | Unverified Seed | Initial Placeholder (`PN`) |
| **13** | Dr. Amit Verma | Pediatrics | Neonatologist | Unverified Seed | Initial Placeholder (`AV`) |
| **14** | **Dr. Sheetal S. Agrawal** | General Medicine | MD Obstetrics & Gynecology | **Verified** | `/images/doctors/dr_sheetal_agrawal.jpg` |
| **15** | Dr. Rohan Joshi | ENT | ENT Specialist | Unverified Seed | Initial Placeholder (`RJ`) |
| **16** | Dr. Kavita Iyer | ENT | Head & Neck Surgeon | Unverified Seed | Initial Placeholder (`KI`) |
| **17** | Dr. Anand Saraswat | General Medicine | Dermatologist | Unverified Seed | Initial Placeholder (`AS`) |

---

## 4. ASSET SPECIFICATIONS & PERFORMANCE OPTIMIZATION

- **Storage Location:** `frontend/public/images/doctors/`
- **Asset Count:** 26 authentic portrait images.
- **Image Format:** Progressive Web JPEG.
- **Dimensions:** Normalized to standard 450 × 500 px (9:10 healthcare portrait ratio).
- **File Sizes:** 20.4 KB – 41.2 KB per image (Total footprint: ~750 KB for all 26 doctors).
- **Loading Strategy:** `loading="lazy"`, native browser caching, zero external third-party CDN latency.
- **Aspect Ratio Control:** CSS `object-cover object-top` ensures consistent face framing without distortion.
- **Fallback Protocol:** Clean SVG Stethoscope icon + bold initials avatar (`onError` & missing image handler).

---

## 5. PROPOSED DATABASE CHANGES FOR USER APPROVAL

To respect data integrity and prevent breaking existing foreign key relationships (appointments, queue tokens, duty status, prescriptions), two reconciliation paths are presented for your decision:

### Option A: Non-Destructive Extension (Recommended)
1. **Preserve Current DB Records (IDs 1–17):**
   - Retain existing IDs 1–17 and all their relational links to existing test appointments and tokens.
   - Keep authentic photos for the 6 verified doctors (IDs 3, 4, 5, 6, 11, 14).
   - Retain neutral initials placeholders for the 11 demo doctors.
2. **Append Missing Official Consultants (IDs 18–37):**
   - Insert the 20 official hospital consultants as new records in `doctors` table with authentic names, qualifications, room assignments, shifts, and local `image_url` paths.
   - Map them to appropriate departments (Cardiology, Orthopedics, Pediatrics, ENT, Medicine, Surgery, etc.).
3. **Benefits:** 100% backward compatible, zero risk of foreign key constraint violations or broken test suites.

### Option B: Departmental In-Place Reconciliation
1. **In-Place Update of the 11 Demo Records:**
   - Map demo doctors to official hospital consultants in the same department, updating name, qualifications, and `image_url` while **preserving their primary key IDs**:
     - ID 7: `Dr. Meera Kulkarni` &rarr; `Dr. Piyush Kalantri` (Cardiology, MD, DM)
     - ID 9: `Dr. Suresh Patil` &rarr; `Dr. Tushar Chhattani` (Orthopedics, MS)
     - ID 10: `Dr. Sunita Rao` &rarr; `Dr. Chetan Singhania` (Orthopedics, MS)
     - ID 12: `Dr. Priya Nair` &rarr; `Dr. Anil Loya` (Pediatrics, DCH)
     - ID 13: `Dr. Amit Verma` &rarr; `Dr. Pradip Bhojne` (Pediatrics, DCH)
     - ID 15: `Dr. Rohan Joshi` &rarr; `Dr. Pramod Jethwani` (ENT, MS)
     - ID 17: `Dr. Anand Saraswat` &rarr; `Dr. Trupti Saraswat` (Dermatology, DDV)
     - ID 1: `Dr. Rajesh Sharma` &rarr; `Dr. Amol Deshpande` (General Medicine, MD)
     - ID 2: `Dr. Anita Desai` &rarr; `Dr. Rajendra Kadukar` (General Medicine, MD)
     - ID 8: `Dr. Vikram Malhotra` &rarr; `Dr. Virendra Bubna` (Nephrology / Medicine, DNB)
     - ID 16: `Dr. Kavita Iyer` &rarr; `Dr. Rekha Mundhada` (Gynecology, DGO)
2. **Append Remaining 9 Official Consultants (IDs 18–26):**
   - Dr. Durgesh Mahajan, Dr. S. Mundhada, Dr. Gauri Bule, Dr. Vijaya Kawalkar, Dr. Ashish Potphode, Dr. Navin Chhattani, Dr. Kalyani Gandhi, Dr. Ankush Sune, Dr. Hitesh Dudhe.
3. **Benefits:** Produces a 100% authentic hospital staff roster with 0 demo names while preserving all ID-based relations.

---

## 6. FILES MODIFIED & ARCHITECTURAL UPDATES

| File | Nature of Changes |
| :--- | :--- |
| `backend/models.py` | Added `image_url = Column(String(255), nullable=True, default=None)` to SQLAlchemy `Doctor` model. |
| `backend/db.py` | Updated `migrate_db()` to automatically execute `ALTER TABLE doctors ADD COLUMN image_url VARCHAR(255)` if missing. |
| `backend/schemas.py` | Added `image_url: Optional[str] = None` to Pydantic `DoctorResponse`. |
| `backend/seed.py` | Updated `DOCTORS_DATA` with authentic local photo paths for verified doctors and `None` for unverified doctors. |
| `backend/routers/public.py` | Updated `get_doctors()` to serialize `image_url` across all public query responses. |
| `backend/routers/staff.py` | Updated `get_doctor_current_console()` to include `image_url`, `qualification`, and `registration_number` in `doc_data`. |
| `routes/sanjivaniHospital.js` | Updated Express fallback endpoints to reference authentic local doctor photo assets. |
| `frontend/src/pages/DoctorsInfoPage.jsx` | Implemented responsive 450×500 cards, `loading="lazy"`, object-top framing, and clean initials fallback on load error or missing image. |
| `frontend/src/pages/LandingPage.jsx` | Updated "Featured Specialists" cards with authentic circular portraits, degrees, and MMC registrations. |
| `frontend/src/pages/AppointmentBookingPage.jsx` | Added doctor photo thumbnails to Step 1 selection grid with initials fallback. |
| `frontend/src/pages/DoctorConsole.jsx` | Updated doctor banner to render official doctor portrait with Stethoscope fallback. |
| `frontend/src/pages/AdminDashboard.jsx` | Updated "Staff & Doctors" tab to render doctor thumbnail portraits alongside toggle switches. |

---

## 7. VERIFICATION TEST RESULTS

### Frontend Production Build
```
vite v5.4.21 building for production...
✓ 1753 modules transformed.
dist/index.html                   1.19 kB │ gzip:   0.62 kB
dist/assets/index-DmGSZNVY.css   78.18 kB │ gzip:  12.34 kB
dist/assets/index-D31-4eqK.js   617.45 kB │ gzip: 163.26 kB
✓ built in 19.34s
Status: PASS (0 errors, 0 broken imports)
```

### Backend Automated Test Suite
- **Unit Tests:** `python -m unittest discover -s backend -p "test_*.py"`
  - `test_ai_assistant.py`: 12 tests passed
  - `test_health_wallet.py`: 10 tests passed
  - `test_queue_prediction.py`: 16 tests passed
  - `test_voice_assistant.py`: 12 tests passed
  - `test_stage9_analytics_whatsapp.py`: 14 tests passed
  - **Result:** **64 tests passed in 33.424s (100% OK)**

### Backend Smoke Test (`backend/smoke_test.py`)
- Health check: OK
- Departments listing: OK (5 departments)
- Auth login (Admin & Doctor): OK
- Token creation, duplicate prevention & QR verification: OK
- Doctor console status & call next patient: OK
- Digital prescription generation: OK
- Consultation completion & patient feedback: OK
- Emergency verification audit trail: OK
- Appointment booking, slot checks, double-booking prevention & check-in: OK
- Doctor roster update: OK
- Analytics & notification logs: OK
- AI Assistant triage: OK
- **Result:** **17/17 Integration checks passed**

---

## 8. REMAINING DECISION FOR USER

The application is fully operational and verified with genuine hospital photographs for all verified faculty members and professional initials placeholders for the remaining profiles. 

Please review Section 5 above and confirm your preference:
- **Proceed with Option A** (Extend database with 20 official doctors as IDs 18–37, preserving all demo records)?
- **Proceed with Option B** (Reconcile the 11 demo records in-place with their official departmental counterparts, creating a 100% authentic hospital roster)?
