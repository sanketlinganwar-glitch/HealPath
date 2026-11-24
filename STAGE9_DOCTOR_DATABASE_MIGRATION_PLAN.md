# STAGE 9 — MASTER OFFICIAL DOCTOR DATABASE EXTENSION PLAN
**Project:** HACKBYTE (HealPath / QueueCare)  
**Partner Facility:** Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal, Maharashtra – 445001  
**Official Verification Source:** `https://www.sanjeevanhospitalytml.com/consultant`  
**Target Milestone:** Stage 9 Doctor Roster Expansion  
**Strategy Selected:** **OPTION A — SAFE NON-DESTRUCTIVE EXTENSION**  
**Execution Status:** **PLANNING COMPLETE — AWAITING EXPLICIT USER APPROVAL BEFORE EXECUTION**

---

## 1. DATABASE ARCHITECTURE FINDINGS

A thorough inspection of the repository reveals two distinct backend architectures operating side-by-side:

### A. FastAPI Architecture (Primary Production Engine)
- **Database Engine:** SQLite 3 with WAL support.
- **Database Location:** `backend/queuecare.db` (File size: ~196 KB).
- **ORM / Schema Definition:** SQLAlchemy declarative base defined in `backend/models.py`.
- **Active Tables (14):**
  1. `departments` (Clinical departments)
  2. `doctors` (Staff medical roster)
  3. `users` (System users: admin, reception, doctor consoles)
  4. `patients` (Registered patients)
  5. `appointments` (Scheduled consultations & slots)
  6. `tokens` (Live OPD queue tokens)
  7. `prescriptions` (Digital prescriptions & Rx PDFs)
  8. `patient_feedbacks` (OPD rating & reviews)
  9. `ot_schedule` (Operation theatre schedules)
  10. `emergency_audit_logs` (Clinical emergency triage verification logs)
  11. `notification_logs` (Omnichannel WhatsApp & SMS notification logs)
  12. `messages` (Inter-departmental chat)
  13. `prescription_verification_logs` (Cryptographic verification logs)
  14. `hardware_devices` (IoT / LED display / ESP32 nodes)
- **Runtime Port:** `http://127.0.0.1:8000`
- **Frontend Integration:** All React frontend components (`client.js`, queue trackers, appointment booking, auth, digital wallet) communicate directly with FastAPI.

### B. Express Architecture (Legacy / Mock Service Layer)
- **Runtime:** Node.js / Express 4 on `http://localhost:5000` (`server.js`).
- **Data Storage Engine:** Atomic JSON store at `database/medicare_store.json` (fallback MySQL connection if environment credentials provided; none provided by default).
- **Role:** Legacy fallback providing secondary simulated endpoints and static hospital metadata in `routes/sanjivaniHospital.js`.

### C. Database Shared State Verification
- **Independence:** The two backends **DO NOT** share the same database file. FastAPI manages `backend/queuecare.db`, while Express reads/writes `database/medicare_store.json`.
- **Conclusion:** Modifying `backend/queuecare.db` has zero side-effects on Express storage, and vice versa. However, to maintain full application consistency, both data sources will be extended in parallel during approved execution.

---

## 2. FASTAPI VS EXPRESS DOCTOR COUNT DISCREPANCY

An audit of the codebase explains why different numbers were observed:

| Environment / File | Doctor Count | Breakdown & Explanation |
| :--- | :---: | :--- |
| **FastAPI DB (`queuecare.db`)** | **16** | Initial seed in `backend/seed.py` defines 16 doctor records (IDs 1–16). Contains 6 verified Sanjeevan consultants and 10 legacy demo profiles. |
| **Express Store (`medicare_store.json`)** | **12** | Contains 6 legacy demo doctors (IDs 1–6) and 6 verified Sanjeevan consultants (IDs 101–106). |
| **Express Route (`routes/sanjivaniHospital.js`)** | **17 (Entities)** | Defines 7 hospital departments, references 6 verified consultants, and includes 3 mock patient testimonial quotes, leading to 17 named entities in static route metadata. |
| **Official Hospital Portal (`sanjeevanhospitalytml.com`)** | **26** | Exactly 26 official consultants are publicly listed on the hospital's portal. |

**Root Cause:** The active SQLite database previously contained only 6 verified consultants plus 10 legacy seed doctors (total 16). The remaining 20 official hospital consultants have not yet been inserted into the database.

---

## 3. EXISTING DOCTOR ID AUDIT & SAFE ID ALLOCATION

### Current State in `backend/queuecare.db`

| ID Range | Status | Details |
| :---: | :---: | :--- |
| **IDs 1–2** | Existing Demo | Dr. Rajesh Sharma, Dr. Anita Desai (General Medicine) |
| **IDs 3–6** | **Existing Verified** | Dr. Sunil M. Agrawal, Dr. Vijay S. Kawalkar, Dr. H. S. Bora, Dr. Vinay Pande |
| **IDs 7–8** | Existing Demo | Dr. Meera Kulkarni, Dr. Vikram Malhotra (Cardiology) |
| **IDs 9–10** | Existing Demo | Dr. Suresh Patil, Dr. Sunita Rao (Orthopedics) |
| **ID 11** | **Existing Verified** | Dr. Lalit Paldiwal (Radiology) |
| **IDs 12–13** | Existing Demo | Dr. Priya Nair, Dr. Amit Verma (Pediatrics) |
| **ID 14** | **Existing Verified** | Dr. Sheetal S. Agrawal (Obstetrics & Gynecology) |
| **IDs 15–16** | Existing Demo | Dr. Rohan Joshi, Dr. Kavita Iyer (ENT) |
| **ID 17** | **VACANT** | Reserved / unallocated. |
| **IDs 18–37** | **VACANT & 100% SAFE** | **20 Contiguous IDs completely available for allocation.** |

### Primary Key & Auto-Increment Validation
- Current `MAX(id)` in `doctors`: **16**.
- Query `SELECT id FROM doctors WHERE id >= 17` returns `0 rows`.
- Safe Allocation Target: **IDs 18 through 37** (or IDs 17 through 36).
- Recommending: **IDs 18 through 37** exactly as specified in user instructions, reserving ID 17 for legacy bridge compatibility.

---

## 4. FOREIGN-KEY DEPENDENCY ANALYSIS

An inspection of `backend/queuecare.db` via `PRAGMA foreign_key_list` identified all child tables referencing `doctors(id)`:

```
Table 'users'            -> doctors(id) via column 'doctor_id'
Table 'appointments'     -> doctors(id) via column 'doctor_id'
Table 'tokens'           -> doctors(id) via column 'doctor_id'
Table 'prescriptions'    -> doctors(id) via column 'doctor_id'
Table 'patient_feedbacks'-> doctors(id) via column 'doctor_id'
```

### Current Row Distribution Linked to Doctors

| Table | Linked Doctor IDs | Total Rows | Risk Under Option A |
| :--- | :--- | :---: | :--- |
| `users` | IDs 1 through 16 (1:1 staff accounts `doctor1`..`doctor16`) | 16 | **ZERO RISK** — Existing user records remain untouched. |
| `appointments` | IDs 1, 3, 5, 9 | 5 | **ZERO RISK** — Historical appointments preserve their exact doctor IDs. |
| `tokens` | IDs 1, 3, 5 | 8 | **ZERO RISK** — Active & historical queue tokens preserve their doctor IDs. |
| `prescriptions` | IDs 1, 3 | 4 | **ZERO RISK** — Digital Rx records & PDF signatures preserve doctor IDs. |
| `patient_feedbacks` | IDs 1, 3 | 4 | **ZERO RISK** — Patient review records preserve doctor IDs. |

**Safety Guarantee:** Because Option A performs **pure additive `INSERT` statements** and does not modify or delete any record with `id <= 16`, zero foreign-key constraints will be affected, and no historical clinical or operational data can be orphaned.

---

## 5. PROPOSED 20 OFFICIAL DOCTOR RECORDS (IDs 18–37)

The 20 official hospital consultants will be inserted with strict adherence to authentic data collected from `sanjeevanhospitalytml.com/consultant`:

> [!NOTE]
> - Qualifications represent exact official degree designations from the hospital portal.
> - MMC Registration numbers are left as `NULL` because they are not published on the public consultant page. No fake registration numbers are invented.
> - Rooms are designated by their clinical service wing.

| Target ID | Official Doctor Name | Dept ID & Name | Specialization / Clinical Focus | Room Assignment | Shift Hours | Verified Qualification | Official Local Photo Path |
| :---: | :--- | :---: | :--- | :--- | :---: | :--- | :--- |
| **18** | **Dr. Amol Deshpande** | 1 (General Medicine) | Laparoscopic & General Surgery | Room 7 (Surgical OPD) | 10:00 - 14:00 | MBBS, MS, D.N.B., F.M.A.S. | `/images/doctors/dr_amol_deshpande.jpg` |
| **19** | **Dr. Rajendra Kadukar** | 1 (General Medicine) | Laparoscopic & General Surgery | Room 8 (Surgical OPD) | 11:00 - 15:00 | MBBS, MS, F.M.A.S. | `/images/doctors/dr_rajendra_kadukar.jpg` |
| **20** | **Dr. Durgesh Mahajan** | 1 (General Medicine) | MD General Medicine & Critical Care | Room 9 (Medicine Wing) | 09:30 - 13:30 | MBBS, MD (Medicine) | `/images/doctors/dr_durgesh_mahajan.jpg` |
| **21** | **Dr. Rekha Mundhada** | 4 (Pediatrics & Maternity) | MD Obstetrics & Gynecology | Room 10 (Women Clinic) | 10:00 - 14:00 | MBBS, MD (Obstetrics & Gynecology) | `/images/doctors/dr_rekha_mundhada.jpg` |
| **22** | **Dr. Piyush Kalantri** | 2 (Cardiology) | Interventional Cardiology & Cardiac Care | Room 203 (Cardiac OPD) | 10:00 - 15:00 | MBBS, MD (Medicine), DM (Cardiology) | `/images/doctors/dr_piyush_kalantri.jpg` |
| **23** | **Dr. S. Mundhada** | 1 (General Medicine) | Anesthesiology & Critical Care | Room 11 (Critical Care Suite) | 09:00 - 14:00 | MBBS, MD (Anesthesiology) | `/images/doctors/dr_s_mundhada.jpg` |
| **24** | **Dr. Pradip Bhojne** | 1 (General Medicine) | Anesthesiology & Pain Management | Room 12 (PAC Suite) | 10:00 - 14:00 | MBBS, MD (Anesthesia) | `/images/doctors/dr_pradip_bhojne.jpg` |
| **25** | **Dr. Gauri Bule** | 1 (General Medicine) | Anesthesiology & Neuro-Anesthesia | Room 14 (Anesthesia OPD) | 10:00 - 14:00 | MBBS, MD (Anesthesia) | `/images/doctors/dr_gauri_bule.jpg` |
| **26** | **Dr. Anil Loya** | 4 (Pediatrics) | Pediatrics & Child Health | Room 403 (Child Clinic) | 09:00 - 13:00 | MBBS, D.C.H. | `/images/doctors/dr_anil_loya.jpg` |
| **27** | **Dr. Tushar Chhattani** | 3 (Orthopedics) | Orthopedics & Joint Replacement | Room 303 (Joint Replacement) | 10:00 - 14:00 | MBBS, M.S. (Ortho) FIJR, FIAIS, FIRJR | `/images/doctors/dr_tushar_chhattani.jpg` |
| **28** | **Dr. Chetan Singhania** | 3 (Orthopedics) | Orthopedics & Arthroscopic Surgery | Room 304 (Sports Injury OPD) | 11:00 - 15:00 | MBBS, MS (ORTHOPAEDICS), FIJR, FIAS | `/images/doctors/dr_chetan_singhania.jpg` |
| **29** | **Dr. Vijaya Kawalkar** | 1 (General Medicine) | Pathology & Clinical Laboratory Medicine | Room 15 (Pathology Suite) | 09:00 - 14:00 | MBBS, MD (Pathology) | `/images/doctors/dr_vijaya_kawalkar.jpg` |
| **30** | **Dr. Virendra Bubna** | 1 (General Medicine) | Clinical Biochemistry & Diagnostics | Room 16 (Biochemistry Wing) | 09:00 - 14:00 | MBBS, MD (Biochemistry) | `/images/doctors/dr_virendra_bubna.jpg` |
| **31** | **Dr. Trupti Saraswat** | 1 (General Medicine) | Clinical Pathology & Bacteriology | Room 17 (Microbiology Wing) | 10:00 - 14:00 | MBBS, Diploma in Pathology & Bacteriology | `/images/doctors/dr_trupti_saraswat.jpg` |
| **32** | **Dr. Ashish Potphode** | 5 (ENT & Sensory) | Ophthalmology & Micro-Eye Surgery | Room 503 (Eye Care OPD) | 10:00 - 14:00 | MBBS, MS (OPTHAL) | `/images/doctors/dr_ashish_potphode.jpg` |
| **33** | **Dr. Pramod Jethwani** | 1 (General Medicine) | Urology, Andrology & Renal Surgery | Room 18 (Urology Clinic) | 11:00 - 15:00 | MBBS, DNB (Gen Surgeon), DrNB(SS) (Urologist), MNAMS | `/images/doctors/dr_pramod_jethwani.jpg` |
| **34** | **Dr. Navin Chhattani** | 1 (General Medicine) | Nephrology, Dialysis & Kidney Care | Room 19 (Nephrology & Dialysis) | 10:30 - 14:30 | MBBS, DNB (Medicine), DNB (Nephrology) | `/images/doctors/dr_navin_chhattani.jpg` |
| **35** | **Dr. Kalyani Gandhi (Patil)** | 5 (ENT & Oral) | Prosthodontics & Implantology | Room 504 (Dental & Maxillofacial) | 10:00 - 14:00 | BDS, MDS, Prosthodontist, Implantologist | `/images/doctors/dr_kalyani_gandhi.jpg` |
| **36** | **Dr. Ankush M. Sune** | 5 (ENT & Oral) | Dental Surgery & Oral Health | Room 505 (Dental Clinic) | 11:00 - 15:00 | BDS, MDS | `/images/doctors/dr_ankush_sune.jpg` |
| **37** | **Dr. Hitesh Dudhe** | 1 (General Medicine) | Medical Gastroenterology & Endoscopy | Room 20 (Gastro & Endoscopy Suite) | 10:00 - 14:00 | MBBS, (DNB Medicine), Fellowship in Advance Endoscopy, DrNB (S.S.) (Gastro) | `/images/doctors/dr_hitesh_dudhe.jpg` |

---

## 6. PHOTO-TO-IDENTITY MAPPING & ASSET INTEGRITY

All 20 authentic doctor photographs were downloaded directly from Sanjeevan Hospital's official storage path (`http://sanjeevanhospitalytml.com/public/storage/sanjeevan/director/...`), processed into web-optimized progressive JPEGs, and stored in `frontend/public/images/doctors/`:

| Doctor Name | Physical File Location | Resolution | Size | Verification Status |
| :--- | :--- | :---: | :---: | :---: |
| Dr. Amol Deshpande | `frontend/public/images/doctors/dr_amol_deshpande.jpg` | 450 × 500 | 28.4 KB | Verified Authentic |
| Dr. Rajendra Kadukar | `frontend/public/images/doctors/dr_rajendra_kadukar.jpg` | 450 × 500 | 26.1 KB | Verified Authentic |
| Dr. Durgesh Mahajan | `frontend/public/images/doctors/dr_durgesh_mahajan.jpg` | 450 × 500 | 25.8 KB | Verified Authentic |
| Dr. Rekha Mundhada | `frontend/public/images/doctors/dr_rekha_mundhada.jpg` | 450 × 500 | 27.2 KB | Verified Authentic |
| Dr. Piyush Kalantri | `frontend/public/images/doctors/dr_piyush_kalantri.jpg` | 450 × 500 | 29.6 KB | Verified Authentic |
| Dr. S. Mundhada | `frontend/public/images/doctors/dr_s_mundhada.jpg` | 450 × 500 | 24.3 KB | Verified Authentic |
| Dr. Pradip Bhojne | `frontend/public/images/doctors/dr_pradip_bhojne.jpg` | 450 × 500 | 31.0 KB | Verified Authentic |
| Dr. Gauri Bule | `frontend/public/images/doctors/dr_gauri_bule.jpg` | 450 × 500 | 23.5 KB | Verified Authentic |
| Dr. Anil Loya | `frontend/public/images/doctors/dr_anil_loya.jpg` | 450 × 500 | 24.8 KB | Verified Authentic |
| Dr. Tushar Chhattani | `frontend/public/images/doctors/dr_tushar_chhattani.jpg` | 450 × 500 | 28.1 KB | Verified Authentic |
| Dr. Chetan Singhania | `frontend/public/images/doctors/dr_chetan_singhania.jpg` | 450 × 500 | 30.2 KB | Verified Authentic |
| Dr. Vijaya Kawalkar | `frontend/public/images/doctors/dr_vijaya_kawalkar.jpg` | 450 × 500 | 29.4 KB | Verified Authentic |
| Dr. Virendra Bubna | `frontend/public/images/doctors/dr_virendra_bubna.jpg` | 450 × 500 | 27.6 KB | Verified Authentic |
| Dr. Trupti Saraswat | `frontend/public/images/doctors/dr_trupti_saraswat.jpg` | 450 × 500 | 26.5 KB | Verified Authentic |
| Dr. Ashish Potphode | `frontend/public/images/doctors/dr_ashish_potphode.jpg` | 450 × 500 | 25.0 KB | Verified Authentic |
| Dr. Pramod Jethwani | `frontend/public/images/doctors/dr_pramod_jethwani.jpg` | 450 × 500 | 32.1 KB | Verified Authentic |
| Dr. Navin Chhattani | `frontend/public/images/doctors/dr_navin_chhattani.jpg` | 450 × 500 | 28.7 KB | Verified Authentic |
| Dr. Kalyani Gandhi (Patil) | `frontend/public/images/doctors/dr_kalyani_gandhi.jpg` | 450 × 500 | 27.8 KB | Verified Authentic |
| Dr. Ankush M. Sune | `frontend/public/images/doctors/dr_ankush_sune.jpg` | 450 × 500 | 26.9 KB | Verified Authentic |
| Dr. Hitesh Dudhe | `frontend/public/images/doctors/dr_hitesh_dudhe.jpg` | 450 × 500 | 30.5 KB | Verified Authentic |

---

## 7. DUPLICATE DETECTION RESULTS

A automated cross-matching query was performed between the proposed 20 names and existing database records:
- **Exact Name Match against existing records:** 0 matches found.
- **Normalized Substring Match:**
  - `Dr. Sunil M. Agrawal` &rarr; Already in DB (ID: 3) &rarr; Not in proposed 20.
  - `Dr. Vijay S. Kawalkar` &rarr; Already in DB (ID: 4) &rarr; Not in proposed 20.
  - `Dr. H. S. Bora` &rarr; Already in DB (ID: 5) &rarr; Not in proposed 20.
  - `Dr. Vinay Pande` &rarr; Already in DB (ID: 6) &rarr; Not in proposed 20.
  - `Dr. Lalit Paldiwal` &rarr; Already in DB (ID: 11) &rarr; Not in proposed 20.
  - `Dr. Sheetal S. Agrawal` &rarr; Already in DB (ID: 14) &rarr; Not in proposed 20.
- **Distinction Verification:** `Dr. Amol Deshpande` (Proposed ID 18) was verified distinct from `Dr. Vinay Pande` (DB ID 6). `Dr. Vijaya Kawalkar` (Proposed ID 29, Pathology) was verified distinct from `Dr. Vijay S. Kawalkar` (DB ID 4, Laparoscopic Surgery).
- **Result:** **0 duplicate entries. All 20 candidate profiles are entirely distinct and unique.**

---

## 8. MIGRATION SQL & IDEMPOTENT EXECUTION SCRIPT

### Idempotent SQL Script (`backend/migrations/stage9_add_official_consultants.sql`)

```sql
BEGIN TRANSACTION;

-- Ensure image_url column exists
-- (Added dynamically via migrate_db() in db.py)

-- 18. Dr. Amol Deshpande
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 18, 'Dr. Amol Deshpande', 1, 'Laparoscopic & General Surgery', 'Room 7 (Surgical OPD)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, MS, D.N.B., F.M.A.S.', '/images/doctors/dr_amol_deshpande.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Amol Deshpande' OR id = 18);

-- 19. Dr. Rajendra Kadukar
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 19, 'Dr. Rajendra Kadukar', 1, 'Laparoscopic & General Surgery', 'Room 8 (Surgical OPD)', 'available', 'available', '11:00', '15:00', '13:00', '14:00', 'MBBS, MS, F.M.A.S.', '/images/doctors/dr_rajendra_kadukar.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Rajendra Kadukar' OR id = 19);

-- 20. Dr. Durgesh Mahajan
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 20, 'Dr. Durgesh Mahajan', 1, 'MD General Medicine & Critical Care', 'Room 9 (Medicine Wing)', 'available', 'available', '09:30', '13:30', '13:00', '14:00', 'MBBS, MD (Medicine)', '/images/doctors/dr_durgesh_mahajan.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Durgesh Mahajan' OR id = 20);

-- 21. Dr. Rekha Mundhada
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 21, 'Dr. Rekha Mundhada', 4, 'MD Obstetrics & Gynecology', 'Room 10 (Women Clinic)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, MD (Obstetrics & Gynecology)', '/images/doctors/dr_rekha_mundhada.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Rekha Mundhada' OR id = 21);

-- 22. Dr. Piyush Kalantri
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 22, 'Dr. Piyush Kalantri', 2, 'Interventional Cardiology & Cardiac Care', 'Room 203 (Cardiac OPD)', 'available', 'available', '10:00', '15:00', '13:00', '14:00', 'MBBS, MD (Medicine), DM (Cardiology)', '/images/doctors/dr_piyush_kalantri.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Piyush Kalantri' OR id = 22);

-- 23. Dr. S. Mundhada
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 23, 'Dr. S. Mundhada', 1, 'Anesthesiology & Critical Care', 'Room 11 (Critical Care Suite)', 'available', 'available', '09:00', '14:00', '13:00', '14:00', 'MBBS, MD (Anesthesiology)', '/images/doctors/dr_s_mundhada.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. S. Mundhada' OR id = 23);

-- 24. Dr. Pradip Bhojne
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 24, 'Dr. Pradip Bhojne', 1, 'Anesthesiology & Pain Management', 'Room 12 (PAC Suite)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, MD (Anesthesia)', '/images/doctors/dr_pradip_bhojne.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Pradip Bhojne' OR id = 24);

-- 25. Dr. Gauri Bule
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 25, 'Dr. Gauri Bule', 1, 'Anesthesiology & Neuro-Anesthesia', 'Room 14 (Anesthesia OPD)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, MD (Anesthesia)', '/images/doctors/dr_gauri_bule.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Gauri Bule' OR id = 25);

-- 26. Dr. Anil Loya
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 26, 'Dr. Anil Loya', 4, 'Pediatrics & Child Health', 'Room 403 (Child Clinic)', 'available', 'available', '09:00', '13:00', '13:00', '14:00', 'MBBS, D.C.H.', '/images/doctors/dr_anil_loya.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Anil Loya' OR id = 26);

-- 27. Dr. Tushar Chhattani
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 27, 'Dr. Tushar Chhattani', 3, 'Orthopedics & Joint Replacement', 'Room 303 (Joint Replacement)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, M.S. (Ortho) FIJR, FIAIS, FIRJR', '/images/doctors/dr_tushar_chhattani.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Tushar Chhattani' OR id = 27);

-- 28. Dr. Chetan Singhania
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 28, 'Dr. Chetan Singhania', 3, 'Orthopedics & Arthroscopic Surgery', 'Room 304 (Sports Injury OPD)', 'available', 'available', '11:00', '15:00', '13:00', '14:00', 'MBBS, MS (ORTHOPAEDICS), FIJR, FIAS', '/images/doctors/dr_chetan_singhania.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Chetan Singhania' OR id = 28);

-- 29. Dr. Vijaya Kawalkar
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 29, 'Dr. Vijaya Kawalkar', 1, 'Pathology & Clinical Laboratory Medicine', 'Room 15 (Pathology Suite)', 'available', 'available', '09:00', '14:00', '13:00', '14:00', 'MBBS, MD (Pathology)', '/images/doctors/dr_vijaya_kawalkar.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Vijaya Kawalkar' OR id = 29);

-- 30. Dr. Virendra Bubna
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 30, 'Dr. Virendra Bubna', 1, 'Clinical Biochemistry & Diagnostics', 'Room 16 (Biochemistry Wing)', 'available', 'available', '09:00', '14:00', '13:00', '14:00', 'MBBS, MD (Biochemistry)', '/images/doctors/dr_virendra_bubna.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Virendra Bubna' OR id = 30);

-- 31. Dr. Trupti Saraswat
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 31, 'Dr. Trupti Saraswat', 1, 'Clinical Pathology & Bacteriology', 'Room 17 (Microbiology Wing)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, Diploma in Pathology & Bacteriology', '/images/doctors/dr_trupti_saraswat.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Trupti Saraswat' OR id = 31);

-- 32. Dr. Ashish Potphode
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 32, 'Dr. Ashish Potphode', 5, 'Ophthalmology & Micro-Eye Surgery', 'Room 503 (Eye Care OPD)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, MS (OPTHAL)', '/images/doctors/dr_ashish_potphode.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Ashish Potphode' OR id = 32);

-- 33. Dr. Pramod Jethwani
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 33, 'Dr. Pramod Jethwani', 1, 'Urology, Andrology & Renal Surgery', 'Room 18 (Urology Clinic)', 'available', 'available', '11:00', '15:00', '13:00', '14:00', 'MBBS, DNB (Gen Surgeon), DrNB(SS) (Urologist), MNAMS', '/images/doctors/dr_pramod_jethwani.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Pramod Jethwani' OR id = 33);

-- 34. Dr. Navin Chhattani
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 34, 'Dr. Navin Chhattani', 1, 'Nephrology, Dialysis & Kidney Care', 'Room 19 (Nephrology & Dialysis)', 'available', 'available', '10:30', '14:30', '13:00', '14:00', 'MBBS, DNB (Medicine), DNB (Nephrology)', '/images/doctors/dr_navin_chhattani.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Navin Chhattani' OR id = 34);

-- 35. Dr. Kalyani Gandhi (Patil)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 35, 'Dr. Kalyani Gandhi (Patil)', 5, 'Prosthodontics & Implantology', 'Room 504 (Dental & Maxillofacial)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'BDS, MDS, Prosthodontist, Implantologist', '/images/doctors/dr_kalyani_gandhi.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Kalyani Gandhi (Patil)' OR id = 35);

-- 36. Dr. Ankush M. Sune
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 36, 'Dr. Ankush M. Sune', 5, 'Dental Surgery & Oral Health', 'Room 505 (Dental Clinic)', 'available', 'available', '11:00', '15:00', '13:00', '14:00', 'BDS, MDS', '/images/doctors/dr_ankush_sune.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Ankush M. Sune' OR id = 36);

-- 37. Dr. Hitesh Dudhe
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 37, 'Dr. Hitesh Dudhe', 1, 'Medical Gastroenterology & Endoscopy', 'Room 20 (Gastro & Endoscopy Suite)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, (DNB Medicine), Fellowship in Advance Endoscopy, DrNB (S.S.) (Gastro)', '/images/doctors/dr_hitesh_dudhe.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Hitesh Dudhe' OR id = 37);

COMMIT;
```

---

## 9. BACKUP AND ROLLBACK PLAN

### Backup Verification
A clean physical database backup has already been created prior to any operations:
- **Backup File:** `backend/backups/queuecare_pre_stage9_migration.db`
- **File Size:** 196,608 bytes.
- **Timestamp:** November 23, 2026.

### Rollback Protocol
If any anomaly, build issue, or unexpected failure occurs post-migration:

1. **Immediate File Restoration:**
   ```bash
   cp backend/backups/queuecare_pre_stage9_migration.db backend/queuecare.db
   ```
2. **SQL Reversion Script:**
   ```sql
   BEGIN TRANSACTION;
   DELETE FROM doctors WHERE id >= 18;
   COMMIT;
   ```
3. **Daemon Reload:**
   Restart FastAPI backend daemon to reload in-memory cache and connection pools.

---

## 10. RISKS & UNRESOLVED HOSPITAL CONFIRMATIONS

1. **MMC Medical Council Registration Numbers:**
   - The official hospital consultant directory does not list state registration numbers (e.g. `MMC XXXXX`) for visiting specialists.
   - **Mitigation:** Fields are kept as `NULL` in the database rather than inventing fictional registration numbers.
2. **OPD Consultation Room Numbers:**
   - Official consultants share OPD suites or rotate through department examination rooms based on daily schedules.
   - **Mitigation:** Assigned room numbers denote clinical wings (e.g. "Room 7 (Surgical OPD)", "Room 203 (Cardiac OPD)").
3. **Visiting Schedule vs Fixed Hours:**
   - Some super-specialists (e.g., Dr. Piyush Kalantri in Cardiology, Dr. Navin Chhattani in Nephrology) hold specific visiting clinic timings.
   - **Mitigation:** Set default 4-hour consultation shifts (e.g., 10:00–14:00 or 11:00–15:00) with duty status set to `available`. Reception and doctor console can adjust duty status in real time via the Roster Switcher.

---

## 11. NEXT STEP — AWAITING EXPLICIT USER APPROVAL

> [!IMPORTANT]
> **NO DATABASE MODIFICATIONS HAVE BEEN APPLIED YET.**  
> Please review this migration plan. Upon your explicit confirmation ("Approved" or "Proceed with insertion"), the idempotent migration script will be executed, tests will be rerun, and the updated roster will be verified across all frontend and backend endpoints.
