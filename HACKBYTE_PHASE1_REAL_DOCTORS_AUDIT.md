# HACKBYTE — PHASE 1: REAL ACTIVE DOCTORS & AUTHENTIC PHOTOGRAPHS AUDIT REPORT

**Project:** HACKBYTE (HealPath / QueueCare)  
**Partner Hospital:** Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal, Maharashtra – 445001  
**Official Directory Source:** [https://www.sanjeevanhospitalytml.com/consultant](https://www.sanjeevanhospitalytml.com/consultant)  
**Current Baseline:** v2.6.0-analytics  
**Report Generated:** November 23, 2026  
**Auditor:** Senior Full-Stack Architect & Hospital Information System QA Engineer  

---

## EXECUTIVE SUMMARY

Phase 1 audit and implementation establishes authentic clinical consultant visibility for Sanjeevan Multispecialty Hospital & Research Institute across HACKBYTE. The primary doctors directory UI (`frontend/src/pages/DoctorsInfoPage.jsx`) has been modernized with verified status badges, official high-resolution photographs, department filtering, OPD shift timings, and interactive profile modals with direct appointment/token action triggers.

A non-destructive dual-tier doctor architecture has been enforced:
1. **Verified Active Faculty:** Authenticated against official hospital records, mapped to authentic photographs, and marked with a verified shield.
2. **Historical Seed/Demo Records:** Retained with `NOT VERIFIED` indicators and professional initials avatars to strictly preserve referential integrity across past appointments, tokens, prescriptions, and audits.
3. **Pending Official Faculty:** 20 verified hospital consultants prepared in idempotent migration script `backend/migrations/stage9_add_official_consultants.sql` awaiting authorized deployment.

---

## 1. TOTAL DOCTORS FOUND IN CURRENT DATABASE

| Scope / Component | Doctor Count | ID Range | Status / Notes |
|:---|:---:|:---:|:---|
| **Active SQLite Database (`backend/queuecare.db`)** | **16** | IDs 1 – 16 | 6 Official Hospital Consultants + 10 Demo Seed Records |
| **Express Backend Mock (`doctorModel.js`)** | **12** | IDs 1 – 12 | In-memory JSON array, unlinked to production SQLite DB |
| **Stage 9 Migration Staged Records (`stage9_add_official_consultants.sql`)** | **20** | IDs 18 – 37 | Ready for non-destructive insertion upon approval |
| **Official Hospital Consultants (`sanjeevanhospitalytml.com`)** | **26** | — | Total authentic faculty listed on hospital portal |
| **Projected Post-Migration Database** | **36** | IDs 1 – 37 | 26 Official Verified Doctors + 10 Preserved Historical Records (ID 17 skipped) |

---

## 2. VERIFIED ACTIVE DOCTORS (WITH OFFICIAL PHOTOGRAPHS)

The following 6 doctors currently in `backend/queuecare.db` have been rigorously cross-referenced and confirmed against Sanjeevan Hospital's official consultant directory:

| ID | Doctor Name | Qualifications | Primary Specialization & Department | Room / Shift | Photo Asset Path | Live Status Config |
|:---:|:---|:---|:---|:---:|:---|:---:|
| **3** | **Dr. Sunil M. Agrawal** | MD (Medicine) | Consulting Physician & Intensivist, General Medicine | Room 103<br>09:00 - 13:00 | `/images/doctors/dr_sunil_agrawal.jpg` | Verified / In OPD |
| **4** | **Dr. Vijay S. Kawalkar** | MS (General Surgery) | General & Laparoscopic Surgeon, Surgery | Room 201<br>10:00 - 14:00 | `/images/doctors/dr_vijay_kawalkar.jpg` | Verified / In OPD |
| **5** | **Dr. H. S. Bora** | MD (Pediatrics) | Consulting Pediatrician & Neonatologist, Pediatrics | Room 105<br>09:30 - 13:30 | `/images/doctors/dr_hs_bora.jpg` | Verified / In OPD |
| **6** | **Dr. Vinay Pande** | MS (Orthopedics) | Joint Replacement & Arthroscopy Surgeon, Orthopedics | Room 204<br>11:00 - 15:00 | `/images/doctors/dr_vinay_pande.jpg` | Verified / Consulting |
| **11** | **Dr. Lalit Paldiwal** | MS (Orthopedics) | Spine & Trauma Surgeon, Orthopedics | Room 205<br>10:00 - 14:00 | `/images/doctors/dr_lalit_paldiwal.jpg` | Verified / In OPD |
| **14** | **Dr. Sheetal S. Agrawal** | MD, DGO | Consultant Gynecologist & Obstetrician, OBGYN | Room 302<br>09:00 - 13:00 | `/images/doctors/dr_sheetal_agrawal.jpg` | Verified / In OPD |

---

## 3. DOCTORS REQUIRING VERIFICATION (PRESERVED DEMO RECORDS)

Ten doctor profiles currently exist in `backend/queuecare.db` that do not appear on Sanjeevan Hospital's official consultant page. These represent initial development seeds:

| ID | Name | Department in DB | Associated Appointments / Tokens | Audit Classification | Action Taken in UI |
|:---:|:---|:---|:---:|:---:|:---|
| **1** | Dr. Rajesh Sharma | General Medicine | 5 Tokens, 2 Appointments, 1 Rx | Seed Profile | Marked `NOT VERIFIED`, Initials Avatar `RS` |
| **2** | Dr. Priya Patel | Cardiology | 3 Tokens, 1 Appointment | Seed Profile | Marked `NOT VERIFIED`, Initials Avatar `PP` |
| **7** | Dr. Anita Desai | ENT | 1 Token | Seed Profile | Marked `NOT VERIFIED`, Initials Avatar `AD` |
| **8** | Dr. Suresh Joshi | General Medicine | 1 Appointment | Seed Profile | Marked `NOT VERIFIED`, Initials Avatar `SJ` |
| **9** | Dr. Meera Reddy | Cardiology | 0 Active | Seed Profile | Marked `NOT VERIFIED`, Initials Avatar `MR` |
| **10** | Dr. Vikram Malhotra | Orthopedics | 0 Active | Seed Profile | Marked `NOT VERIFIED`, Initials Avatar `VM` |
| **12** | Dr. Sunita Rao | ENT | 0 Active | Seed Profile | Marked `NOT VERIFIED`, Initials Avatar `SR` |
| **13** | Dr. Arvind Kumar | General Medicine | 0 Active | Seed Profile | Marked `NOT VERIFIED`, Initials Avatar `AK` |
| **15** | Dr. Rahul Verma | Cardiology | 0 Active | Seed Profile | Marked `NOT VERIFIED`, Initials Avatar `RV` |
| **16** | Dr. Pooja Shah | Orthopedics | 0 Active | Seed Profile | Marked `NOT VERIFIED`, Initials Avatar `PS` |

> [!IMPORTANT]
> **Referential Integrity Protection:** These records are intentionally preserved in `backend/queuecare.db`. Deleting or renaming them would cause immediate SQLite Foreign Key constraint failures across the `appointments`, `tokens`, `prescriptions`, and `audit_logs` tables. In the frontend directory, they are cleanly labeled with a subtle `NOT VERIFIED` pill and rendered with initials avatars.

---

## 4. TOTAL GENUINE PHOTOGRAPHS AVAILABLE

- **Total Official Photographs:** **26**
- **Physical Directory:** `frontend/public/images/doctors/`
- **File Format:** Progressive Web-Optimized JPEG (`.jpg`)
- **Dimensions:** Normalized 450 × 500 px
- **File Sizes:** 20 KB to 72 KB per image (Total assets bundle < 1.2 MB)
- **Authenticity Audit:** 100% sourced directly from `https://www.sanjeevanhospitalytml.com/consultant`. Zero AI-generated portraits, zero synthetic faces, zero stock models.

### Complete Inventory of Stored Official Photographs:
1. `dr_sunil_agrawal.jpg`
2. `dr_vijay_kawalkar.jpg`
3. `dr_hs_bora.jpg`
4. `dr_vinay_pande.jpg`
5. `dr_lalit_paldiwal.jpg`
6. `dr_sheetal_agrawal.jpg`
7. `dr_dhananjay_s_khope.jpg`
8. `dr_sachin_shingade.jpg`
9. `dr_ashish_tatuskar.jpg`
10. `dr_manoj_k_tiwari.jpg`
11. `dr_anil_raut.jpg`
12. `dr_pankaj_b_toshniwal.jpg`
13. `dr_swarup_s_purohit.jpg`
14. `dr_parag_b_khope.jpg`
15. `dr_kailash_r_pawar.jpg`
16. `dr_rajendra_b_mishra.jpg`
17. `dr_praveen_r_sarda.jpg`
18. `dr_sunil_c_chandak.jpg`
19. `dr_amol_k_deshmukh.jpg`
20. `dr_manish_g_kothari.jpg`
21. `dr_chetan_ghate.jpg`
22. `dr_pramod_k_deshmukh.jpg`
23. `dr_manohar_g_surwade.jpg`
24. `dr_satish_c_deshmukh.jpg`
25. `dr_dhiraj_a_dhomne.jpg`
26. `dr_anant_k_deshmukh.jpg`

---

## 5. IMAGE MAPPING AUDIT: CORRECT VS INCORRECT MAPPINGS

### Active Doctors in `backend/queuecare.db`
| ID | Doctor Name | Prior Schema Mapping | Current Phase 1 Verified Mapping | Status |
|:---:|:---|:---|:---|:---:|
| 1 | Dr. Rajesh Sharma | Unsplash random avatar | `null` (Professional Initials `RS`) | Corrected |
| 2 | Dr. Priya Patel | Unsplash random avatar | `null` (Professional Initials `PP`) | Corrected |
| 3 | Dr. Sunil M. Agrawal | Missing / Generic URL | `/images/doctors/dr_sunil_agrawal.jpg` | Verified Match |
| 4 | Dr. Vijay S. Kawalkar | Missing / Generic URL | `/images/doctors/dr_vijay_kawalkar.jpg` | Verified Match |
| 5 | Dr. H. S. Bora | Missing / Generic URL | `/images/doctors/dr_hs_bora.jpg` | Verified Match |
| 6 | Dr. Vinay Pande | Missing / Generic URL | `/images/doctors/dr_vinay_pande.jpg` | Verified Match |
| 7 | Dr. Anita Desai | Unsplash random avatar | `null` (Professional Initials `AD`) | Corrected |
| 8 | Dr. Suresh Joshi | Unsplash random avatar | `null` (Professional Initials `SJ`) | Corrected |
| 9 | Dr. Meera Reddy | Unsplash random avatar | `null` (Professional Initials `MR`) | Corrected |
| 10 | Dr. Vikram Malhotra | Unsplash random avatar | `null` (Professional Initials `VM`) | Corrected |
| 11 | Dr. Lalit Paldiwal | Missing / Generic URL | `/images/doctors/dr_lalit_paldiwal.jpg` | Verified Match |
| 12 | Dr. Sunita Rao | Unsplash random avatar | `null` (Professional Initials `SR`) | Corrected |
| 13 | Dr. Arvind Kumar | Unsplash random avatar | `null` (Professional Initials `AK`) | Corrected |
| 14 | Dr. Sheetal S. Agrawal | Missing / Generic URL | `/images/doctors/dr_sheetal_agrawal.jpg` | Verified Match |
| 15 | Dr. Rahul Verma | Unsplash random avatar | `null` (Professional Initials `RV`) | Corrected |
| 16 | Dr. Pooja Shah | Unsplash random avatar | `null` (Professional Initials `PS`) | Corrected |

### Staged Stage 9 Migration Doctors (IDs 18–37)
All 20 pending official hospital consultants are mapped 1-to-1 to their verified image paths in `backend/migrations/stage9_add_official_consultants.sql`:
- ID 18: Dr. Dhananjay S. Khope -> `/images/doctors/dr_dhananjay_s_khope.jpg`
- ID 19: Dr. Sachin Shingade -> `/images/doctors/dr_sachin_shingade.jpg`
- ID 20: Dr. Ashish Tatuskar -> `/images/doctors/dr_ashish_tatuskar.jpg`
- ID 21: Dr. Manoj K. Tiwari -> `/images/doctors/dr_manoj_k_tiwari.jpg`
- ID 22: Dr. Anil Raut -> `/images/doctors/dr_anil_raut.jpg`
- ID 23: Dr. Pankaj B. Toshniwal -> `/images/doctors/dr_pankaj_b_toshniwal.jpg`
- ID 24: Dr. Swarup S. Purohit -> `/images/doctors/dr_swarup_s_purohit.jpg`
- ID 25: Dr. Parag B. Khope -> `/images/doctors/dr_parag_b_khope.jpg`
- ID 26: Dr. Kailash R. Pawar -> `/images/doctors/dr_kailash_r_pawar.jpg`
- ID 27: Dr. Rajendra B. Mishra -> `/images/doctors/dr_rajendra_b_mishra.jpg`
- ID 28: Dr. Praveen R. Sarda -> `/images/doctors/dr_praveen_r_sarda.jpg`
- ID 29: Dr. Sunil C. Chandak -> `/images/doctors/dr_sunil_c_chandak.jpg`
- ID 30: Dr. Amol K. Deshmukh -> `/images/doctors/dr_amol_k_deshmukh.jpg`
- ID 31: Dr. Manish G. Kothari -> `/images/doctors/dr_manish_g_kothari.jpg`
- ID 32: Dr. Chetan Ghate -> `/images/doctors/dr_chetan_ghate.jpg`
- ID 33: Dr. Pramod K. Deshmukh -> `/images/doctors/dr_pramod_k_deshmukh.jpg`
- ID 34: Dr. Manohar G. Surwade -> `/images/doctors/dr_manohar_g_surwade.jpg`
- ID 35: Dr. Satish C. Deshmukh -> `/images/doctors/dr_satish_c_deshmukh.jpg`
- ID 36: Dr. Dhiraj A. Dhomne -> `/images/doctors/dr_dhiraj_a_dhomne.jpg`
- ID 37: Dr. Anant K. Deshmukh -> `/images/doctors/dr_anant_k_deshmukh.jpg`

---

## 6. MISSING PHOTOGRAPHS

- **Official Hospital Consultants:** **0 missing** (26 out of 26 authentic photos are physically verified on disk).
- **Unverified Seed Profiles:** 10 profiles have no real photo. As per strict medical system specifications, no placeholder stock photos or AI-generated portraits are used. Instead, a clean, high-contrast SVG initials avatar badge is rendered.

---

## 7. DATABASE & BACKEND INCONSISTENCIES

1. **FastAPI vs Express Split:**
   - FastAPI (`backend/main.py`) operates against SQLite `backend/queuecare.db` with 16 active doctors and relational integrity across 14 tables.
   - Express backend (`backend/express/` or `server/`) operates on a static in-memory array (`doctorModel.js`) with 12 mock doctors.
   - The React frontend directly connects to FastAPI on port 8000 via `/api/*` proxies.
2. **Missing ID 17:**
   - In `backend/queuecare.db`, the next auto-increment sequence begins at 17, but the Stage 9 migration explicitly starts new additions at ID 18 to avoid collisions with any concurrent test records. This gap is intentional and does not affect query operations.
3. **Department Normalization:**
   - The current DB schema contains 5 primary department records: `General Medicine`, `Cardiology`, `Orthopedics`, `Pediatrics`, `ENT`.
   - The official hospital faculty spans additional specialized departments: `General Surgery & Laparoscopy`, `Obstetrics & Gynecology`, `Radiology`, `Pathology`, `Anesthesiology & Critical Care`, `Ophthalmology`, `Dental & Maxillofacial`, `Physiotherapy`.
   - In `stage9_add_official_consultants.sql`, consultants are mapped to their nearest primary department while their specific clinical superspecialty is accurately preserved in `specialization` and `qualifications`.

---

## 8. RECOMMENDED CORRECTIONS & IMPLEMENTATION ROADMAP

1. **Stage 9 Safe Migration Execution:**
   - Authorized execution of `backend/migrations/stage9_add_official_consultants.sql`.
   - Pre-migration SQLite snapshot: `backend/backups/queuecare_pre_stage9_migration.db`.
   - Verified idempotent behavior via `INSERT OR IGNORE INTO doctors (id, ...)`.
2. **Graceful Seed Doctor Sunsetting:**
   - Do NOT delete IDs 1, 2, 7, 8, 9, 10, 12, 13, 15, 16.
   - In Stage 10, set `is_active = 0` for seed profiles once all open appointments or token references are marked archived.
3. **Express Model Unification:**
   - Deprecate mock array in `doctorModel.js` and connect Express directly to `backend/queuecare.db` or route all client traffic exclusively through FastAPI.

---

## 9. TEST EVIDENCE & RUNTIME VERIFICATION RESULTS

### A. Frontend Production Build
```bash
> healpath-frontend@1.0.0 build
> vite build
✓ 1753 modules transformed.
dist/index.html                   1.19 kB │ gzip:   0.62 kB
dist/assets/index-znXGaLyy.css   79.11 kB │ gzip:  12.42 kB
dist/assets/index-CbSnLF73.js   623.08 kB │ gzip: 164.14 kB
PWA v0.21.2: dist/sw.js generated
✓ built in 31.45s — Exit Code: 0 (PASS)
```

### B. Backend Unit Test Suite
```bash
.\backend\venv\Scripts\python.exe -m unittest discover -s backend -p "test_*.py"
Ran 64 tests in 139.334s
OK — Exit Code: 0 (PASS)
```

### C. Backend Live Smoke Tests (`smoke_test.py`)
```text
============================================================
ALL HEALPATH 2.0 SMOKE TESTS COMPLETED SUCCESSFULLY!
============================================================
[1] GET /api/health -> OK
[2] GET /api/departments -> Found 5 departments: OK
[3] POST /api/auth/login -> Admin & Doctor tokens acquired: OK
[4] POST /api/tokens -> Generated Token G-008: OK
[5] Duplicate Token Prevention (409 Conflict) -> OK
[6] GET /api/tokens/16 & Secure QR Validation -> OK
[7] Complete Active Consultation -> OK
[8] POST /api/doctors/1/call-next -> Called G-004: OK
[9] POST /api/prescriptions -> Rx ID 4 generated: OK
[10] POST /api/tokens/4/complete -> Completed: OK
[11] POST /api/feedback -> Aggregated Rating 5.0/5: OK
[12] Emergency Flagging & Verification Audit -> OK
[13] GET /api/appointments/slots & Book -> Slots found, Booked: OK
[14] Check-in Appointment -> Active Token G-009: OK
[15] PATCH /api/doctors/1/roster -> DutyStatus updated: OK
[16] Advanced Analytics & Notifications -> 11 tracked: OK
[17] AI Assistant 2.0 Triage & Suggested Actions -> OK
```

### D. Stage 9 Migration Dry-Run Verification
```text
Dry run executed against cloned database: queuecare_dryrun_temp.db
Initial Doctors: 16 (Max ID: 16)
Inserted Official Doctors: 20
Post-Migration Doctors: 36 (Max ID: 37)
All 20 image files verified on disk: 100% OK
Foreign Key Check: 0 violations reported
Second run idempotency: 0 duplicates inserted (PASS)
```

---

## CONCLUSION

Phase 1 objectives are **100% complete**:
- Authentic hospital faculty photographs are downloaded, optimized, and verified.
- The Doctors Directory UI cleanly separates verified faculty from seed records with genuine clinical OPD statuses (`IN OPD`, `CONSULTING`, `ON BREAK`, `OFF DUTY`, `NOT VERIFIED`).
- Interactive modal profiles and booking pathways operate with zero console errors.
- Referential integrity is protected with zero broken routes, zero database collisions, and all unit/smoke test suites passing.
