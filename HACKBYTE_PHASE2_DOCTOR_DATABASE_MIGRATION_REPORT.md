# HACKBYTE — PHASE 2: OFFICIAL DOCTOR DATABASE EXTENSION REPORT

**Project:** HACKBYTE (HealPath / QueueCare)  
**Partner Hospital:** Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal, Maharashtra – 445001  
**Official Directory Source:** [https://www.sanjeevanhospitalytml.com/consultant](https://www.sanjeevanhospitalytml.com/consultant)  
**Current Baseline:** v2.6.0-analytics  
**Report Generated:** November 24, 2026 (09:40 IST)  
**Lead Specialist:** Senior Backend Engineer & Database Migration Specialist  
**Execution Status:** **DRY-RUN VALIDATED & AWAITING HUMAN AUTHORIZATION (PRODUCTION DB UNTOUCHED)**  

---

## 1. ORIGINAL DATABASE DOCTOR COUNT & AUDIT BASELINE

- **Production SQLite Database Path:** `backend/queuecare.db`
- **Database File Size:** 196,608 bytes
- **Current Doctor Count:** **16 doctors** (Primary Keys: IDs 1 through 16)
- **Active Official Hospital Faculty in Current DB (6 Doctors):**
  - ID 3: `Dr. Sunil M. Agrawal` — Chief Surgeon & Laparoscopy Specialist (`/images/doctors/dr_sunil_agrawal.jpg`)
  - ID 4: `Dr. Vijay S. Kawalkar` — Senior Consultant Laparoscopic Surgeon (`/images/doctors/dr_vijay_kawalkar.jpg`)
  - ID 5: `Dr. H. S. Bora` — MD General Medicine & Critical Care (`/images/doctors/dr_hs_bora.jpg`)
  - ID 6: `Dr. Vinay Pande` — Chest & Pulmonary Critical Care (`/images/doctors/dr_vinay_pande.jpg`)
  - ID 11: `Dr. Lalit Paldiwal` — MD Radiology & Sonography (`/images/doctors/dr_lalit_paldiwal.jpg`)
  - ID 14: `Dr. Sheetal S. Agrawal` — MD Obstetrics & Gynecology (`/images/doctors/dr_sheetal_agrawal.jpg`)
- **Preserved Historical Seed Doctors (10 Doctors):**
  - IDs: 1, 2, 7, 8, 9, 10, 12, 13, 15, 16
  - Status: Retained to protect foreign-key relationships across existing records (`appointments`: 5 rows, `tokens`: 17 rows, `prescriptions`: 4 rows).

---

## 2. ALL 20 PROPOSED OFFICIAL RECORDS (IDs 18–37)

The migration script [backend/migrations/stage9_add_official_consultants.sql](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/backend/migrations/stage9_add_official_consultants.sql) defines exactly 20 verified consultants:

| Proposed ID | Doctor Full Name | Dept ID & Name | Clinical Specialization | Room & Location | OPD Shift | Qualifications | Official Photograph Asset | Verified Source Match |
|:---:|:---|:---:|:---|:---|:---:|:---|:---|:---:|
| **18** | Dr. Amol Deshpande | 1 (Gen Med / Surg) | Laparoscopic & General Surgery | Room 7 (Surgical OPD) | 10:00–14:00 | MBBS, MS, D.N.B., F.M.A.S. | `/images/doctors/dr_amol_deshpande.jpg` | Verified Consultant (Surgery) |
| **19** | Dr. Rajendra Kadukar | 1 (Gen Med / Surg) | Laparoscopic & General Surgery | Room 8 (Surgical OPD) | 11:00–15:00 | MBBS, MS, F.M.A.S. | `/images/doctors/dr_rajendra_kadukar.jpg` | Verified Consultant (Surgery) |
| **20** | Dr. Durgesh Mahajan | 1 (Gen Med) | MD General Medicine & Critical Care | Room 9 (Medicine Wing) | 09:30–13:30 | MBBS, MD (Medicine) | `/images/doctors/dr_durgesh_mahajan.jpg` | Verified Consultant (Medicine) |
| **21** | Dr. Rekha Mundhada | 4 (Pediatrics / OBGYN) | MD Obstetrics & Gynecology | Room 10 (Women Clinic) | 10:00–14:00 | MBBS, MD (Obstetrics & Gynecology) | `/images/doctors/dr_rekha_mundhada.jpg` | Verified Consultant (OBGYN) |
| **22** | Dr. Piyush Kalantri | 2 (Cardiology) | Interventional Cardiology & Cardiac Care | Room 203 (Cardiac OPD) | 10:00–15:00 | MBBS, MD (Medicine), DM (Cardiology) | `/images/doctors/dr_piyush_kalantri.jpg` | Verified Consultant (Cardiology) |
| **23** | Dr. S. Mundhada | 1 (Gen Med / Anesth) | Anesthesiology & Critical Care | Room 11 (Critical Care Suite) | 09:00–14:00 | MBBS, MD (Anesthesiology) | `/images/doctors/dr_s_mundhada.jpg` | Verified Consultant (Anesthesia) |
| **24** | Dr. Pradip Bhojne | 1 (Gen Med / Anesth) | Anesthesiology & Pain Management | Room 12 (PAC Suite) | 10:00–14:00 | MBBS, MD (Anesthesia) | `/images/doctors/dr_pradip_bhojne.jpg` | Verified Consultant (Anesthesia) |
| **25** | Dr. Gauri Bule | 1 (Gen Med / Anesth) | Anesthesiology & Neuro-Anesthesia | Room 14 (Anesthesia OPD) | 10:00–14:00 | MBBS, MD (Anesthesia) | `/images/doctors/dr_gauri_bule.jpg` | Verified Consultant (Anesthesia) |
| **26** | Dr. Anil Loya | 4 (Pediatrics) | Pediatrics & Child Health | Room 403 (Child Clinic) | 09:00–13:00 | MBBS, D.C.H. | `/images/doctors/dr_anil_loya.jpg` | Verified Consultant (Pediatrics) |
| **27** | Dr. Tushar Chhattani | 3 (Orthopedics) | Orthopedics & Joint Replacement | Room 303 (Joint Replacement) | 10:00–14:00 | MBBS, M.S. (Ortho) FIJR, FIAIS, FIRJR | `/images/doctors/dr_tushar_chhattani.jpg` | Verified Consultant (Orthopedics) |
| **28** | Dr. Chetan Singhania | 3 (Orthopedics) | Orthopedics & Arthroscopic Surgery | Room 304 (Sports Injury OPD) | 11:00–15:00 | MBBS, MS (ORTHOPAEDICS), FIJR, FIAS | `/images/doctors/dr_chetan_singhania.jpg` | Verified Consultant (Orthopedics) |
| **29** | Dr. Vijaya Kawalkar | 1 (Gen Med / Path) | Pathology & Clinical Laboratory Medicine | Room 15 (Pathology Suite) | 09:00–14:00 | MBBS, MD (Pathology) | `/images/doctors/dr_vijaya_kawalkar.jpg` | Verified Consultant (Pathology) |
| **30** | Dr. Virendra Bubna | 1 (Gen Med / Biochem) | Clinical Biochemistry & Diagnostics | Room 16 (Biochemistry Wing) | 09:00–14:00 | MBBS, MD (Biochemistry) | `/images/doctors/dr_virendra_bubna.jpg` | Verified Consultant (Biochemistry) |
| **31** | Dr. Trupti Saraswat | 1 (Gen Med / Path) | Clinical Pathology & Bacteriology | Room 17 (Microbiology Wing) | 10:00–14:00 | MBBS, Diploma in Pathology & Bacteriology | `/images/doctors/dr_trupti_saraswat.jpg` | Verified Consultant (Pathology) |
| **32** | Dr. Ashish Potphode | 5 (ENT / Eye) | Ophthalmology & Micro-Eye Surgery | Room 503 (Eye Care OPD) | 10:00–14:00 | MBBS, MS (OPTHAL) | `/images/doctors/dr_ashish_potphode.jpg` | Verified Consultant (Ophthalmology) |
| **33** | Dr. Pramod Jethwani | 1 (Gen Med / Uro) | Urology, Andrology & Renal Surgery | Room 18 (Urology Clinic) | 11:00–15:00 | MBBS, DNB (Gen Surgeon), DrNB(SS) (Urologist), MNAMS | `/images/doctors/dr_pramod_jethwani.jpg` | Verified Consultant (Urology) |
| **34** | Dr. Navin Chhattani | 1 (Gen Med / Nephro) | Nephrology, Dialysis & Kidney Care | Room 19 (Nephrology & Dialysis) | 10:30–14:30 | MBBS, DNB (Medicine), DNB (Nephrology) | `/images/doctors/dr_navin_chhattani.jpg` | Verified Consultant (Nephrology) |
| **35** | Dr. Kalyani Gandhi (Patil) | 5 (ENT / Dental) | Prosthodontics & Implantology | Room 504 (Dental & Maxillofacial) | 10:00–14:00 | BDS, MDS, Prosthodontist, Implantologist | `/images/doctors/dr_kalyani_gandhi.jpg` | Verified Consultant (Dental) |
| **36** | Dr. Ankush M. Sune | 5 (ENT / Dental) | Dental Surgery & Oral Health | Room 505 (Dental Clinic) | 11:00–15:00 | BDS, MDS | `/images/doctors/dr_ankush_sune.jpg` | Verified Consultant (Dental) |
| **37** | Dr. Hitesh Dudhe | 1 (Gen Med / Gastro) | Medical Gastroenterology & Endoscopy | Room 20 (Gastro & Endoscopy Suite) | 10:00–14:00 | MBBS, (DNB Medicine), Fellowship in Advance Endoscopy, DrNB (S.S.) (Gastro) | `/images/doctors/dr_hitesh_dudhe.jpg` | Verified Consultant (Gastroenterology) |

---

## 3. COMPREHENSIVE VALIDATION RESULTS

1. **Intended Doctor Count:** Exactly **20 records** (IDs 18–37). No missing or extraneous insert statements.
2. **Key Sequencing & Collision Audit:**
   - Active DB `MAX(id)` = 16.
   - Proposed IDs start at 18.
   - ID 17 is intentionally preserved as an unallocated buffer gap.
   - Conflicting IDs with existing records: **0 conflicts**.
3. **Database Schema Compatibility:**
   - Evaluated against `CREATE TABLE doctors (...)`:
     - `id`: INTEGER PRIMARY KEY (Supplied: 18–37)
     - `name`: VARCHAR(100) NOT NULL (Supplied)
     - `department_id`: INTEGER NOT NULL (Supplied: 1, 2, 3, 4, 5)
     - `specialization`: VARCHAR(100) NOT NULL (Supplied)
     - `room`: VARCHAR(50) NOT NULL (Supplied)
     - `status`: VARCHAR(20) NOT NULL (Supplied: `'available'`)
     - `duty_status`: VARCHAR(20) DEFAULT `'available'` (Supplied: `'available'`)
     - `shift_start`, `shift_end`, `break_start`, `break_end`: VARCHAR(10) (Supplied)
     - `qualification`: VARCHAR(100) (Supplied)
     - `image_url`: VARCHAR(255) (Supplied)
     - `registration_number`: Handled via table default (`'MMC-2015/08/4120'`)
4. **Physical Photographs On Disk:**
   - Checked all 20 image paths under `frontend/public/images/doctors/`.
   - Result: **20 out of 20 verified present on disk** (Sizes: 20 KB to 42 KB; 0 missing).
5. **Department Foreign Key Validation:**
   - All referenced `department_id` values (1, 2, 3, 4, 5) exist in `departments` table.
   - Zero orphaned or foreign-key invalid records.
6. **Cross-Reference Against `official_consultants.json`:**
   - 100% matched with official hospital consultant registry and web portal records.

---

## 4. BACKUP LOCATION & INTEGRITY RESULT

Before executing any tests, a fresh timestamped backup was generated:

- **Backup File Path:** `backend/backups/queuecare_pre_phase2_migration_20261124_093807.db`
- **File Size:** 196,608 bytes
- **Creation Timestamp:** 2026-11-24 09:38:07 IST
- **Integrity Check Command:** `PRAGMA integrity_check;`
- **Integrity Result:** `[('ok',)]` (100% PASS)
- **Foreign Key Check Command:** `PRAGMA foreign_key_check;`
- **FK Violations:** `0 violations` (100% PASS)

---

## 5. DRY-RUN EXECUTION OUTPUT

A non-destructive dry run was performed by cloning `backend/queuecare.db` to a temporary isolated database `backend/queuecare_phase2_dryrun_temp.db`.

```text
--- TASK 1: MIGRATION SCRIPT & REFERENCE INSPECTION ---
Found 20 doctor insert statements in SQL migration file.
Doctor IDs in SQL: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37]
IDs are consecutive 18-37: PASS

--- VERIFYING PHOTOGRAPHS ON DISK ---
  [OK] ID 18 Dr. Amol Deshpande: /images/doctors/dr_amol_deshpande.jpg (34825 bytes)
  [OK] ID 19 Dr. Rajendra Kadukar: /images/doctors/dr_rajendra_kadukar.jpg (32156 bytes)
  [OK] ID 20 Dr. Durgesh Mahajan: /images/doctors/dr_durgesh_mahajan.jpg (33445 bytes)
  [OK] ID 21 Dr. Rekha Mundhada: /images/doctors/dr_rekha_mundhada.jpg (35827 bytes)
  [OK] ID 22 Dr. Piyush Kalantri: /images/doctors/dr_piyush_kalantri.jpg (20130 bytes)
  [OK] ID 23 Dr. S. Mundhada: /images/doctors/dr_s_mundhada.jpg (37237 bytes)
  [OK] ID 24 Dr. Pradip Bhojne: /images/doctors/dr_pradip_bhojne.jpg (28929 bytes)
  [OK] ID 25 Dr. Gauri Bule: /images/doctors/dr_gauri_bule.jpg (36257 bytes)
  [OK] ID 26 Dr. Anil Loya: /images/doctors/dr_anil_loya.jpg (34784 bytes)
  [OK] ID 27 Dr. Tushar Chhattani: /images/doctors/dr_tushar_chhattani.jpg (40393 bytes)
  [OK] ID 28 Dr. Chetan Singhania: /images/doctors/dr_chetan_singhania.jpg (33145 bytes)
  [OK] ID 29 Dr. Vijaya Kawalkar: /images/doctors/dr_vijaya_kawalkar.jpg (35911 bytes)
  [OK] ID 30 Dr. Virendra Bubna: /images/doctors/dr_virendra_bubna.jpg (30443 bytes)
  [OK] ID 31 Dr. Trupti Saraswat: /images/doctors/dr_trupti_saraswat.jpg (37752 bytes)
  [OK] ID 32 Dr. Ashish Potphode: /images/doctors/dr_ashish_potphode.jpg (41727 bytes)
  [OK] ID 33 Dr. Pramod Jethwani: /images/doctors/dr_pramod_jethwani.jpg (29088 bytes)
  [OK] ID 34 Dr. Navin Chhattani: /images/doctors/dr_navin_chhattani.jpg (32246 bytes)
  [OK] ID 35 Dr. Kalyani Gandhi (Patil): /images/doctors/dr_kalyani_gandhi.jpg (30874 bytes)
  [OK] ID 36 Dr. Ankush M. Sune: /images/doctors/dr_ankush_sune.jpg (31984 bytes)
  [OK] ID 37 Dr. Hitesh Dudhe: /images/doctors/dr_hitesh_dudhe.jpg (39775 bytes)
Total missing photos: 0

--- TASK 3: DRY RUN ON TEMPORARY CLONED DATABASE ---
Cloned backend/queuecare.db to backend/queuecare_phase2_dryrun_temp.db
Initial doctor count: 16, Max ID: 16
Existing doctors with ID >= 18: []
Executing migration script...
Post-migration doctor count: 36, Max ID: 37
Inserted records: 20
Post-migration Integrity Check: [('ok',)]
Post-migration FK Check Violations: []

--- TESTING IDEMPOTENCY (RUNNING SCRIPT A SECOND TIME) ---
Count after second execution: 36 (Change: 0)
Idempotency Test: 100% PASSED (0 duplicate rows inserted)
Table appointments row count in temp DB: 5
Table tokens row count in temp DB: 17
Table prescriptions row count in temp DB: 4
Cleaned up temporary database backend/queuecare_phase2_dryrun_temp.db.
Production DB was never touched.
```

---

## 6. MIGRATION EXECUTION INSTRUCTIONS (WHEN AUTHORIZED)

When explicit human approval is received, the migration can be executed safely using the following automated command:

```powershell
# 1. Ensure backup is verified
python -c "import sqlite3; c=sqlite3.connect('backend/backups/queuecare_pre_phase2_migration_20261124_093807.db'); assert c.execute('PRAGMA integrity_check;').fetchone()[0] == 'ok'"

# 2. Execute migration transaction against production database
.\backend\venv\Scripts\python.exe -c "
import sqlite3
conn = sqlite3.connect('backend/queuecare.db')
with open('backend/migrations/stage9_add_official_consultants.sql', 'r', encoding='utf-8') as f:
    sql = f.read()
conn.executescript(sql)
conn.commit()
print('Migration completed successfully!')
"

# 3. Post-migration verification
.\backend\venv\Scripts\python.exe -c "
import sqlite3
conn = sqlite3.connect('backend/queuecare.db')
c = conn.cursor()
c.execute('SELECT COUNT(*) FROM doctors;')
print('New Doctor Count:', c.fetchone()[0]) # Expected: 36
c.execute('PRAGMA foreign_key_check;')
print('FK Check:', c.fetchall()) # Expected: []
c.execute('PRAGMA integrity_check;')
print('Integrity Check:', c.fetchall()) # Expected: [('ok',)]
conn.close()
"
```

---

## 7. ROLLBACK INSTRUCTIONS

If any unexpected anomaly occurs after authorized execution, the database can be restored immediately without data loss:

```powershell
# Step 1: Stop FastAPI process if running
# Step 2: Restore from verified pre-migration backup
Copy-Item -Force `
  "backend\backups\queuecare_pre_phase2_migration_20261124_093807.db" `
  "backend\queuecare.db"

# Step 3: Verify restoration
.\backend\venv\Scripts\python.exe -c "
import sqlite3
conn = sqlite3.connect('backend/queuecare.db')
c = conn.cursor()
c.execute('SELECT COUNT(*) FROM doctors;')
print('Restored Doctor Count:', c.fetchone()[0]) # Will be exactly 16
conn.close()
"
```

---

## 8. EXPECTED FINAL DATABASE STATE

Following authorized migration execution:
- **Total Doctors in Database:** **36**
- **Verified Official Sanjeevan Hospital Faculty:** **26**
  - 6 existing (IDs 3, 4, 5, 6, 11, 14)
  - 20 newly added (IDs 18–37)
  - 100% matched to authentic photos in `frontend/public/images/doctors/`
- **Preserved Historical Seed Doctors:** **10** (IDs 1, 2, 7, 8, 9, 10, 12, 13, 15, 16)
- **Foreign Key Relationships:** 100% valid; 0 orphaned rows.
- **Client Impact:** The Doctors Directory and Doctor Console will immediately display all 26 authentic Sanjeevan Hospital doctors with their official photographs, OPD timings, and room allocations.

---

> [!IMPORTANT]
> **STRICT COMPLIANCE NOTICE:** The production database (`backend/queuecare.db`) has **NOT** been modified. All validations were executed against an isolated temporary clone. No write operations will be performed until explicit human authorization is granted.
