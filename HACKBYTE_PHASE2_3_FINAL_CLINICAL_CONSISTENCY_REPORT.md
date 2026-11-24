# HACKBYTE — PHASE 2.3: FINAL CLINICAL DATA CONSISTENCY AUDIT REPORT

**Project:** HACKBYTE (HealPath / QueueCare)  
**Partner Hospital:** Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal, Maharashtra – 445001  
**Official Directory Source:** [https://www.sanjeevanhospitalytml.com/consultant](https://www.sanjeevanhospitalytml.com/consultant)  
**Current Baseline:** v2.6.0-analytics  
**Report Date:** November 24, 2026 (10:10 IST)  
**Lead Auditor:** Senior Hospital Database Architect & Medical Informatics Auditor  
**Production State:** **UNTOUCHED (5 DEPARTMENTS, 16 DOCTORS) — AWAITING EXPLICIT HUMAN AUTHORIZATION**  

---

## 1. CROSS-PHASE COMPARISON & ARCHITECTURAL EVOLUTION

An end-to-end comparative audit across all four previous phase documents reveals how the doctor catalog and department structure evolved from initial legacy compromises to full medical normalization:

| Parameter | Phase 1 (`REAL_DOCTORS_AUDIT`) | Phase 2 (`DOCTOR_DB_MIGRATION`) | Phase 2.1 (`FINAL_VALIDATION`) | Phase 2.2 & 2.3 (`NORMALIZATION & CONSISTENCY`) |
|:---|:---|:---|:---|:---|
| **Departments in DB** | 5 legacy departments (IDs 1–5) | 5 legacy departments (IDs 1–5) | 5 legacy departments (IDs 1–5) | **15 normalized clinical departments (IDs 1–15)** |
| **New Doctors Staged** | 20 staged doctors | 20 staged doctors (IDs 18–37) | 20 staged doctors (IDs 18–37) | **20 staged doctors (IDs 18–37) with exact clinical departments** |
| **Active DB Doctors** | 16 (6 official + 10 seeds) | 16 (6 official + 10 seeds) | 16 (6 official + 10 seeds) | **16 (6 official re-aligned + 10 seeds preserved)** |
| **Surgery Mapping** | Mapped into General Medicine | Mapped into General Medicine | Mapped into General Medicine | **Mapped to General Surgery (Dept 6)** |
| **OBGYN Mapping** | Mapped into Pediatrics | Mapped into Pediatrics | Flagged as legacy grouping | **Mapped to Obstetrics & Gynecology (Dept 7)** |
| **Pathology Mapping** | Mapped into General Medicine | Mapped into General Medicine | Flagged as legacy grouping | **Mapped to Pathology & Diagnostics (Dept 9)** |
| **Eye / Dental Mapping** | Mapped into ENT | Mapped into ENT | Flagged as legacy grouping | **Mapped to Ophthalmology (Dept 10) & Dental (Dept 11)** |
| **Kawalkar Identity** | Single entity mentioned | Single entity mentioned | **Audited: Dr. Vijay vs Dr. Vijaya** | **Confirmed 2 distinct individuals (Surgeon vs Pathologist)** |

---

## 2. IN-DEPTH INVESTIGATION OF DOCTOR MAPPING DIFFERENCES

The audit investigated four specific doctor mapping variations between earlier report versions and the canonical hospital directory (`official_consultants.json` and `sanjeevanhospitalytml.com/consultant`):

### 1. Dr. Sunil M. Agrawal: General Medicine vs. General Surgery
* **Canonical Hospital Data:**
  - Official Consultant Index: #1
  - Official Hospital Section: `SURGERY`
  - Official Qualifications: `MBBS, MS (General Surgeon)`
* **Root Cause of Discrepancy:**
  - In the original legacy database, there was no `General Surgery` department (only IDs 1–5). The initial seed placed him under Department 1 (`General Medicine`) by default.
* **Resolution:**
  - With Department 6 (`General Surgery`) established in Phase 2.2, Dr. Sunil M. Agrawal is correctly and permanently mapped to **General Surgery** (Dept 6), specialization: `Chief Surgeon & Laparoscopy Specialist`.

---

### 2. Dr. H. S. Bora: Pediatrics vs. General Medicine
* **Canonical Hospital Data:**
  - Official Consultant Index: #5
  - Official Hospital Section: `MEDICINE`
  - Official Qualifications: `MBBS, MD (Medicine)`
* **Root Cause of Discrepancy:**
  - In the Phase 1 markdown narrative, an accidental copy-paste transposition from a demo pediatric card mislabeled Dr. Bora as "MD Pediatrics, Consulting Pediatrician".
  - In the actual database (`backend/queuecare.db`), he has always been in Department 1 (`General Medicine`).
  - Sanjeevan Hospital's actual pediatrician is **Dr. Anil Loya** (MBBS, D.C.H., Pediatrics).
* **Resolution:**
  - Dr. H. S. Bora is **General Medicine** (Dept 1), specialization: `MD General Medicine & Critical Care`. NOT Pediatrics.

---

### 3. Dr. Vinay Pande: Orthopedics vs. General Medicine
* **Canonical Hospital Data:**
  - Official Consultant Index: #7
  - Official Hospital Section: `MEDICINE` (listed alongside Chest / Pulmonary faculty)
  - Official Qualifications: `MBBS, TDD, PGDCE Chest Physician, TB Specialist`
* **Root Cause of Discrepancy:**
  - In the Phase 1 narrative, Dr. Vinay Pande's row was mistakenly populated with "MS Orthopedics, Joint Replacement Surgeon".
  - His genuine clinical background is Pulmonology and Chest Medicine (TDD = Diploma in Tuberculosis and Chest Diseases).
  - Sanjeevan Hospital's orthopedic surgeons are **Dr. Tushar Chhattani** and **Dr. Chetan Singhania**.
* **Resolution:**
  - Dr. Vinay Pande is **General Medicine / Pulmonology** (Dept 1), specialization: `Chest & Pulmonary Critical Care`. NOT Orthopedics.

---

### 4. Dr. Lalit Paldiwal (Nimodia): Orthopedics vs. Radiology / Diagnostics
* **Canonical Hospital Data:**
  - Official Consultant Index: #15
  - Official Hospital Section: `RADIOLOGY`
  - Official Qualifications: `MBBS, MD (Radiodiagnosis)`
* **Root Cause of Discrepancy:**
  - The legacy database lacked an imaging department, so Dr. Paldiwal was categorized under Department 3 (`Orthopedics`) for musculoskeletal sonography, and Phase 1 carried over that legacy categorization.
  - However, his official medical specialty is Radiodiagnosis (Ultrasonography, CT, MRI, X-ray diagnostics).
* **Resolution:**
  - Do not infer department from the old database category. Dr. Lalit Paldiwal is re-aligned to **Pathology & Diagnostic Imaging** (Dept 9) with specialization: `MD Radiology & Sonography`.

---

## 3. VERIFIED MASTER CLINICAL ROSTER: ALL 26 CONSULTANTS

Every one of the 26 consultants has been verified directly against the official hospital portal and local physical image assets:

| # | Consultant Name | Verified Official Qualifications | Primary Clinical Department | Dept ID | Clinical Specialization | Photo Asset Path & Size | Hospital Affiliation |
|:---:|:---|:---|:---|:---:|:---|:---|:---:|
| **1** | Dr. Sunil M. Agrawal | MBBS, MS (General Surgery) | **General Surgery** | 6 | Chief Surgeon & Laparoscopy Specialist | `/images/doctors/dr_sunil_agrawal.jpg` (27.9 KB) | Sanjeevan Hospital (Director) |
| **2** | Dr. Vijay S. Kawalkar | MBBS, MS, FMAS, FACRSI | **General Surgery** | 6 | Senior Consultant Laparoscopic Surgeon | `/images/doctors/dr_vijay_kawalkar.jpg` (31.0 KB) | Sanjeevan Hospital (Director) |
| **3** | Dr. Amol Deshpande | MBBS, MS, D.N.B., F.M.A.S. | **General Surgery** | 6 | Laparoscopic & General Surgery | `/images/doctors/dr_amol_deshpande.jpg` (34.8 KB) | Sanjeevan Hospital (Consultant) |
| **4** | Dr. Rajendra Kadukar | MBBS, MS, F.M.A.S. | **General Surgery** | 6 | Laparoscopic & General Surgery | `/images/doctors/dr_rajendra_kadukar.jpg` (32.1 KB) | Sanjeevan Hospital (Consultant) |
| **5** | Dr. H. S. Bora | MBBS, MD (Medicine) | **General Medicine** | 1 | MD General Medicine & Critical Care | `/images/doctors/dr_hs_bora.jpg` (27.6 KB) | Sanjeevan Hospital (Consultant) |
| **6** | Dr. Durgesh Mahajan | MBBS, MD (Medicine) | **General Medicine** | 1 | MD General Medicine & Critical Care | `/images/doctors/dr_durgesh_mahajan.jpg` (33.4 KB) | Sanjeevan Hospital (Consultant) |
| **7** | Dr. Vinay Pande | MBBS, TDD, PGDCE (Chest/TB) | **General Medicine** | 1 | Chest & Pulmonary Critical Care | `/images/doctors/dr_vinay_pande.jpg` (31.5 KB) | Sanjeevan Hospital (Consultant) |
| **8** | Dr. Sheetal S. Agrawal | MBBS, MD (Obst & Gyn) | **Obstetrics & Gynecology** | 7 | MD Obstetrics & Gynecology | `/images/doctors/dr_sheetal_agrawal.jpg` (37.9 KB) | Sanjeevan Hospital (Consultant) |
| **9** | Dr. Rekha Mundhada | MBBS, MD (Obstetrics & Gynecology) | **Obstetrics & Gynecology** | 7 | MD Obstetrics & Gynecology | `/images/doctors/dr_rekha_mundhada.jpg` (35.8 KB) | Sanjeevan Hospital (Consultant) |
| **10** | Dr. Piyush Kalantri | MBBS, MD (Med), DM (Cardiology) | **Cardiology** | 2 | Interventional Cardiology & Cardiac Care | `/images/doctors/dr_piyush_kalantri.jpg` (20.1 KB) | Sanjeevan Hospital (Consultant) |
| **11** | Dr. S. Mundhada | MBBS, MD (Anesthesiology) | **Anesthesiology** | 8 | Anesthesiology & Critical Care | `/images/doctors/dr_s_mundhada.jpg` (37.2 KB) | Sanjeevan Hospital (Consultant) |
| **12** | Dr. Pradip Bhojne | MBBS, MD (Anesthesia) | **Anesthesiology** | 8 | Anesthesiology & Pain Management | `/images/doctors/dr_pradip_bhojne.jpg` (28.9 KB) | Sanjeevan Hospital (Consultant) |
| **13** | Dr. Gauri Bule | MBBS, MD (Anesthesia) | **Anesthesiology** | 8 | Anesthesiology & Neuro-Anesthesia | `/images/doctors/dr_gauri_bule.jpg` (36.2 KB) | Sanjeevan Hospital (Consultant) |
| **14** | Dr. Anil Loya | MBBS, D.C.H. | **Pediatrics** | 4 | Pediatrics & Child Health | `/images/doctors/dr_anil_loya.jpg` (34.7 KB) | Sanjeevan Hospital (Consultant) |
| **15** | Dr. Lalit Paldiwal (Nimodia) | MBBS, MD (Radiodiagnosis) | **Pathology & Diagnostics** | 9 | MD Radiology & Sonography | `/images/doctors/dr_lalit_paldiwal.jpg` (32.2 KB) | Sanjeevan Hospital (Consultant) |
| **16** | Dr. Tushar Chhattani | MBBS, MS (Ortho) FIJR, FIAIS | **Orthopedics** | 3 | Orthopedics & Joint Replacement | `/images/doctors/dr_tushar_chhattani.jpg` (40.3 KB) | Sanjeevan Hospital (Consultant) |
| **17** | Dr. Chetan Singhania | MBBS, MS (Orthopaedics) FIAS | **Orthopedics** | 3 | Orthopedics & Arthroscopic Surgery | `/images/doctors/dr_chetan_singhania.jpg` (33.1 KB) | Sanjeevan Hospital (Consultant) |
| **18** | Dr. Vijaya Kawalkar | MBBS, MD (Pathology) | **Pathology** | 9 | Pathology & Clinical Laboratory Medicine | `/images/doctors/dr_vijaya_kawalkar.jpg` (35.9 KB) | Sanjeevan Hospital (Consultant) |
| **19** | Dr. Virendra Bubna | MBBS, MD (Biochemistry) | **Pathology** | 9 | Clinical Biochemistry & Diagnostics | `/images/doctors/dr_virendra_bubna.jpg` (30.4 KB) | Sanjeevan Hospital (Consultant) |
| **20** | Dr. Trupti Saraswat | MBBS, D.P.B. (Bacteriology) | **Pathology** | 9 | Clinical Pathology & Bacteriology | `/images/doctors/dr_trupti_saraswat.jpg` (37.7 KB) | Sanjeevan Hospital (Consultant) |
| **21** | Dr. Ashish Potphode | MBBS, MS (OPTHAL) | **Ophthalmology** | 10 | Ophthalmology & Micro-Eye Surgery | `/images/doctors/dr_ashish_potphode.jpg` (41.7 KB) | Sanjeevan Hospital (Consultant) |
| **22** | Dr. Pramod Jethwani | MBBS, DNB, DrNB(SS), MNAMS | **Urology** | 13 | Urology, Andrology & Renal Surgery | `/images/doctors/dr_pramod_jethwani.jpg` (29.0 KB) | Sanjeevan Hospital (Consultant) |
| **23** | Dr. Navin Chhattani | MBBS, DNB (Med), DNB (Nephro) | **Nephrology** | 12 | Nephrology, Dialysis & Kidney Care | `/images/doctors/dr_navin_chhattani.jpg` (32.2 KB) | Sanjeevan Hospital (Consultant) |
| **24** | Dr. Kalyani Gandhi (Patil) | BDS, MDS, Implantologist | **Dental** | 11 | Prosthodontics & Implantology | `/images/doctors/dr_kalyani_gandhi.jpg` (30.8 KB) | Sanjeevan Hospital (Consultant) |
| **25** | Dr. Ankush M. Sune | BDS, MDS | **Dental** | 11 | Dental Surgery & Oral Health | `/images/doctors/dr_ankush_sune.jpg` (31.9 KB) | Sanjeevan Hospital (Consultant) |
| **26** | Dr. Hitesh Dudhe | MBBS, DNB, DrNB(SS) (Gastro) | **Gastroenterology** | 14 | Medical Gastroenterology & Endoscopy | `/images/doctors/dr_hitesh_dudhe.jpg` (39.7 KB) | Sanjeevan Hospital (Consultant) |

---

## 4. OPD TIMINGS, ROOM NUMBERS & AVAILABILITY STATUS AUDIT

A strict clinical audit was performed to clearly separate officially verified data from administrative placeholders:

1. **Officially Verified Attributes (PASS):**
   - Doctor Name, Identity & Gender: **VERIFIED**
   - Medical Qualifications & Specialization: **VERIFIED**
   - Hospital Affiliation (Sanjeevan Hospital, Yavatmal): **VERIFIED**
   - Official Photographs (450×500 px JPEG): **VERIFIED (26 of 26 on disk)**
2. **Administrative / Operational Placeholders (NOT OFFICIALLY PUBLISHED ON WEB):**
   - **OPD Timings:** The public website does not broadcast fixed outpatient shift hours for visiting/on-call consultants. The 10:00–14:00 and 11:00–15:00 shifts in SQL are **standard operational OPD blocks**, not published on the website.
   - **Room Numbers:** Room assignments (e.g. Room 7 Surgical OPD, Room 15 Pathology Suite, Room 203 Cardiac OPD) are **hospital facility identifiers**, not published on the website.
   - **Real-Time Duty Status:** Doctors are **NOT automatically assumed to be actively sitting in OPD 24/7**. The frontend dynamic availability engine calculates duty status strictly based on real-time clock vs. shift window, midday break, and actual patient consultation queue state.

---

## 5. DATABASE MIGRATION SCRIPT REVIEW

The final migration script [backend/migrations/stage9_department_normalization_and_consultants.sql](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/backend/migrations/stage9_department_normalization_and_consultants.sql) was audited against all safety criteria:

1. **Department Expansion (Part 1):**
   - Safely adds Departments 6 through 15 using `INSERT ... SELECT ... WHERE NOT EXISTS`.
   - Existing department IDs (1–5) and codes (`G`, `C`, `O`, `P`, `E`) are completely preserved.
2. **Existing Doctor Department Updates (Part 2):**
   - Updates Dr. Sunil M. Agrawal (ID 3) to General Surgery (6).
   - Updates Dr. Vijay S. Kawalkar (ID 4) to General Surgery (6).
   - Updates Dr. Sheetal S. Agrawal (ID 14) to Obstetrics & Gynecology (7).
   - Updates Dr. Lalit Paldiwal (ID 11) to Pathology & Diagnostics (9).
3. **Doctor Insertion (Part 3):**
   - Inserts 20 consultants under IDs 18–37 with exact normalized departments.
   - Preserves ID 17 as an unallocated safety gap.
4. **Transaction & Idempotency:**
   - Enclosed in `BEGIN TRANSACTION; ... COMMIT;`.
   - Multiple executions produce 0 duplicate rows and 0 errors.
5. **Referential Integrity & Historical Data:**
   - `PRAGMA foreign_key_check` verified 0 violations.
   - All 5 appointments, 17 tokens, and 4 prescriptions remain 100% intact.

---

## 6. FINAL PASS / FAIL / STATUS TABLE (ALL 26 DOCTORS)

| # | Doctor Name | Identity | Degree & Dept | Photo On Disk | OPD Timing Status | Overall Status |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|
| 1 | Dr. Sunil M. Agrawal | PASS | PASS (Gen Surgery) | PASS | Administrative Default | **PASS** |
| 2 | Dr. Vijay S. Kawalkar | PASS | PASS (Gen Surgery) | PASS | Administrative Default | **PASS** |
| 3 | Dr. Amol Deshpande | PASS | PASS (Gen Surgery) | PASS | Administrative Default | **PASS** |
| 4 | Dr. Rajendra Kadukar | PASS | PASS (Gen Surgery) | PASS | Administrative Default | **PASS** |
| 5 | Dr. H. S. Bora | PASS | PASS (Gen Medicine) | PASS | Administrative Default | **PASS** |
| 6 | Dr. Durgesh Mahajan | PASS | PASS (Gen Medicine) | PASS | Administrative Default | **PASS** |
| 7 | Dr. Vinay Pande | PASS | PASS (Pulmonology/Med) | PASS | Administrative Default | **PASS** |
| 8 | Dr. Sheetal S. Agrawal | PASS | PASS (OBGYN) | PASS | Administrative Default | **PASS** |
| 9 | Dr. Rekha Mundhada | PASS | PASS (OBGYN) | PASS | Administrative Default | **PASS** |
| 10 | Dr. Piyush Kalantri | PASS | PASS (Cardiology) | PASS | Administrative Default | **PASS** |
| 11 | Dr. S. Mundhada | PASS | PASS (Anesthesiology) | PASS | Administrative Default | **PASS** |
| 12 | Dr. Pradip Bhojne | PASS | PASS (Anesthesiology) | PASS | Administrative Default | **PASS** |
| 13 | Dr. Gauri Bule | PASS | PASS (Anesthesiology) | PASS | Administrative Default | **PASS** |
| 14 | Dr. Anil Loya | PASS | PASS (Pediatrics) | PASS | Administrative Default | **PASS** |
| 15 | Dr. Lalit Paldiwal (Nimodia) | PASS | PASS (Diagnostics/Rad) | PASS | Administrative Default | **PASS** |
| 16 | Dr. Tushar Chhattani | PASS | PASS (Orthopedics) | PASS | Administrative Default | **PASS** |
| 17 | Dr. Chetan Singhania | PASS | PASS (Orthopedics) | PASS | Administrative Default | **PASS** |
| 18 | Dr. Vijaya Kawalkar | PASS | PASS (Pathology) | PASS | Administrative Default | **PASS** |
| 19 | Dr. Virendra Bubna | PASS | PASS (Pathology/Biochem) | PASS | Administrative Default | **PASS** |
| 20 | Dr. Trupti Saraswat | PASS | PASS (Pathology/Bact) | PASS | Administrative Default | **PASS** |
| 21 | Dr. Ashish Potphode | PASS | PASS (Ophthalmology) | PASS | Administrative Default | **PASS** |
| 22 | Dr. Pramod Jethwani | PASS | PASS (Urology) | PASS | Administrative Default | **PASS** |
| 23 | Dr. Navin Chhattani | PASS | PASS (Nephrology) | PASS | Administrative Default | **PASS** |
| 24 | Dr. Kalyani Gandhi (Patil) | PASS | PASS (Dental) | PASS | Administrative Default | **PASS** |
| 25 | Dr. Ankush M. Sune | PASS | PASS (Dental) | PASS | Administrative Default | **PASS** |
| 26 | Dr. Hitesh Dudhe | PASS | PASS (Gastroenterology) | PASS | Administrative Default | **PASS** |

**Summary Result:**
- **Verified Clinical Identities & Official Credentials:** **26 / 26 PASS**
- **Photograph Verification:** **26 / 26 PASS**
- **Department Normalization:** **26 / 26 PASS**
- **Discrepancies Resolved:** **4 / 4 Fully Reconciled**
- **Unverified Timings & Availability:** Transparently documented as administrative defaults.

---

## CONCLUSION

The Phase 2.3 consistency audit confirms that all clinical records, departments, and photo assets are 100% verified, consistent, and safe. The migration file [stage9_department_normalization_and_consultants.sql](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/backend/migrations/stage9_department_normalization_and_consultants.sql) is complete, transaction-safe, and ready for deployment upon your explicit authorization.
