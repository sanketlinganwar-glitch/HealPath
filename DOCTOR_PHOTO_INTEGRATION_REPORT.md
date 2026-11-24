# DOCTOR PHOTO INTEGRATION & VERIFICATION REPORT
**Project:** HACKBYTE (HealPath / QueueCare)  
**Partner Facility:** Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal, Maharashtra – 445001  
**Official Image Source:** `https://www.sanjeevanhospitalytml.com/consultant`  
**Date of Audit & Integration:** November 23, 2026  
**Status:** **Completed & Verified**

---

## 1. EXECUTIVE SUMMARY

| Metric | Count | Description |
| :--- | :---: | :--- |
| **Total Doctors in Active OPD Roster** | **17** | Active doctors in `backend/queuecare.db` |
| **Authentic Photos Found on Official Site** | **26** | Official consultants listed on `sanjeevanhospitalytml.com/consultant` |
| **Direct Verified Photo Matches Integrated** | **6** | Exact verified faculty matches in active OPD roster |
| **Photos Unavailable / Verification Pending** | **11** | Remaining seed doctors assigned clean neutral initials placeholder |
| **Total Official Photos Downloaded & Stored** | **26** | Available in `frontend/public/images/doctors/` for future faculty expansion |
| **Optimization Method** | **Progressive JPEG** | Fixed (450×500) portrait aspect ratio, ~20–41 KB each, `loading="lazy"` |

---

## 2. OFFICIAL IMAGE SOURCE & USAGE PERMISSION

- **Primary Source URL:** `https://www.sanjeevanhospitalytml.com/consultant`
- **Asset Storage Path on Official Server:** `http://sanjeevanhospitalytml.com/public/storage/sanjeevan/director/...`
- **Hospital Affiliation:** Sanjeevan Multispecialty Hospital & Research Institute (Mahadev Mandir Road, Ratanlal Plots, Yavatmal, Maharashtra 445001).
- **Usage & Permission Status:**
  - The photographs were retrieved directly from the public consultant directory of Sanjeevan Hospital.
  - Used strictly for the official HackByte HealPath hospital smart queue and appointment system representing Sanjeevan Hospital.
  - All images are hosted locally within `frontend/public/images/doctors/` to prevent external bandwidth drain, hotlinking failures, or CORS blocks.
  - No AI-generated faces or third-party stock photos are used.

---

## 3. VERIFIED DOCTOR-PHOTO INTEGRATION MAPPING

### A. Doctors with Verified Authentic Photos (Active in OPD)

| Doctor ID | Doctor Name | Specialization / Department | Qualifications & Registration | Local Image Path | File Size | Dimensions |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: |
| **3** | **Dr. Sunil M. Agrawal** | Chief Surgeon & Laparoscopy Specialist (Gen Surgery) | M.S. (Ortho & Surgery) • MMC 74218 | `/images/doctors/dr_sunil_agrawal.jpg` | 27.9 KB | 450×500 |
| **4** | **Dr. Vijay S. Kawalkar** | Senior Consultant Laparoscopic Surgeon (Gen Surgery) | M.S. (Gen Surgery), FIAGES • MMC 65192 | `/images/doctors/dr_vijay_kawalkar.jpg` | 31.0 KB | 450×500 |
| **5** | **Dr. H. S. Bora** | MD General Medicine & Critical Care (Medicine) | M.D. (Medicine & Critical Care) • MMC 58910 | `/images/doctors/dr_hs_bora.jpg` | 27.6 KB | 450×500 |
| **6** | **Dr. Vinay Pande** | Chest & Pulmonary Critical Care (Pulmonary Medicine) | M.D. (Pulmonary Medicine) • MMC 81290 | `/images/doctors/dr_vinay_pande.jpg` | 31.5 KB | 450×500 |
| **11** | **Dr. Lalit Paldiwal** | MD Radiology & Sonography (Diagnostic Imaging) | M.D. (Radiodiagnosis) • MMC 68904 | `/images/doctors/dr_lalit_paldiwal.jpg` | 32.2 KB | 450×500 |
| **14** | **Dr. Sheetal S. Agrawal** | MD Obstetrics & Gynecology (Women Clinic) | M.D. (Obstetrics & Gynecology) • MMC 79331 | `/images/doctors/dr_sheetal_agrawal.jpg` | 37.9 KB | 450×500 |

### B. Doctors with Photos Unavailable (Neutral Initials Placeholder)

Per instruction 6, 7, and 8, no stock photos or unverified portraits were guessed or substituted. These doctors render a professional clinical avatar with medical badges and uppercase initials:

| Doctor ID | Doctor Name | Department | Specialization | Fallback Rendering | Hospital Verification Status |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | Dr. Rajesh Sharma | General Medicine | General Physician & Critical Care | Neutral Initials `RS` | Baseline demo profile; requires hospital roster photo |
| **2** | Dr. Anita Desai | General Medicine | Internal Medicine | Neutral Initials `AD` | Baseline demo profile; requires hospital roster photo |
| **7** | Dr. Meera Kulkarni | Cardiology | Cardiologist | Neutral Initials `MK` | Roster update pending (Official consultant: Dr. Piyush Kalantri) |
| **8** | Dr. Vikram Malhotra | Cardiology | Cardiac Surgeon | Neutral Initials `VM` | Requires hospital roster photo |
| **9** | Dr. Suresh Patil | Orthopedics | Orthopedic Surgeon | Neutral Initials `SP` | Roster update pending (Official consultants: Dr. Tushar Chhattani, Dr. Chetan Singhania) |
| **10** | Dr. Sunita Rao | Orthopedics | Spine Specialist | Neutral Initials `SR` | Requires hospital roster photo |
| **12** | Dr. Priya Nair | Pediatrics | Pediatrician | Neutral Initials `PN` | Roster update pending (Official consultant: Dr. Anil Loya) |
| **13** | Dr. Amit Verma | Pediatrics | Neonatologist | Neutral Initials `AV` | Requires hospital roster photo |
| **15** | Dr. Rohan Joshi | ENT | ENT Specialist | Neutral Initials `RJ` | Requires hospital roster photo |
| **16** | Dr. Kavita Iyer | ENT | Head & Neck Surgeon | Neutral Initials `KI` | Requires hospital roster photo |
| **17** | Dr. Anand Saraswat | Dermatology | Dermatology & Skin Care | Neutral Initials `AS` | Requires hospital roster photo |

---

## 4. ADDITIONAL VERIFIED OFFICIAL CONSULTANTS READY IN ASSET REPOSITORY

All 26 official consultants listed on `sanjeevanhospitalytml.com/consultant` have been downloaded, optimized, and saved into `frontend/public/images/doctors/` for immediate binding whenever new clinical departments are expanded:

| Consultant Name | Department / Specialty | Qualifications | Stored File Name |
| :--- | :--- | :--- | :--- |
| Dr. Amol Deshpande | Surgery | MBBS, MS, D.N.B., F.M.A.S. | `dr_amol_deshpande.jpg` |
| Dr. Rajendra Kadukar | Surgery | MBBS, MS, F.M.A.S. | `dr_rajendra_kadukar.jpg` |
| Dr. Durgesh Mahajan | Medicine | MBBS, MD (Medicine) | `dr_durgesh_mahajan.jpg` |
| Dr. Rekha Mundhada | Obstetrics & Gynecology | MBBS, MD (Obst & Gyn) | `dr_rekha_mundhada.jpg` |
| Dr. Piyush Kalantri | Cardiology | MBBS, MD (Med), DM (Cardiology) | `dr_piyush_kalantri.jpg` |
| Dr. S. Mundhada | Anesthesiology | MBBS, MD (Anesthesiology) | `dr_s_mundhada.jpg` |
| Dr. Pradip Bhojne | Anesthesia | MBBS, MD (Anesthesia) | `dr_pradip_bhojne.jpg` |
| Dr. Gauri Bule | Anesthesia | MBBS, MD (Anesthesia) | `dr_gauri_bule.jpg` |
| Dr. Anil Loya | Pediatrics | MBBS, D.C.H. | `dr_anil_loya.jpg` |
| Dr. Tushar Chhattani | Orthopedics | MBBS, M.S. (Ortho) FIJR, FIAIS | `dr_tushar_chhattani.jpg` |
| Dr. Chetan Singhania | Orthopedics | MBBS, MS (Ortho), FIJR, FIAS | `dr_chetan_singhania.jpg` |
| Dr. Vijaya Kawalkar | Pathology | MBBS, MD (Pathology) | `dr_vijaya_kawalkar.jpg` |
| Dr. Virendra Bubna | Biochemistry | MBBS, MD (Biochemistry) | `dr_virendra_bubna.jpg` |
| Dr. Trupti Saraswat | Pathology | MBBS, DPB (Pathology) | `dr_trupti_saraswat.jpg` |
| Dr. Ashish Potphode | Ophthalmology | MBBS, MS (Ophthal) | `dr_ashish_potphode.jpg` |
| Dr. Pramod Jethwani | Urology | MBBS, DNB (Surgery), DrNB (Urology) | `dr_pramod_jethwani.jpg` |
| Dr. Navin Chhattani | Nephrology | MBBS, DNB (Med), DNB (Nephrology) | `dr_navin_chhattani.jpg` |
| Dr. Kalyani Gandhi (Patil) | Dental | BDS, MDS, Prosthodontist | `dr_kalyani_gandhi.jpg` |
| Dr. Ankush M. Sune | Dental | BDS, MDS | `dr_ankush_sune.jpg` |
| Dr. Hitesh Dudhe | Gastroenterology | MBBS, DNB (Med), DrNB (Gastro) | `dr_hitesh_dudhe.jpg` |

---

## 5. TECHNICAL IMPLEMENTATION & ARCHITECTURE

### 1. Database Model & Schema Enhancement
- **Model:** [Doctor](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/backend/models.py#L22-L41) model in `backend/models.py` updated with `image_url = Column(String(255), nullable=True, default=None)`.
- **Migration:** [migrate_db](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/backend/db.py#L17-L40) in `backend/db.py` executes `ALTER TABLE doctors ADD COLUMN image_url VARCHAR(255)` safely without data loss.
- **Pydantic Schema:** [DoctorResponse](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/backend/schemas.py#L108-L125) in `backend/schemas.py` includes `image_url: Optional[str] = None`.
- **API Endpoint:** [GET /api/doctors](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/backend/routers/public.py#L52-L76) serializes `image_url` for all consumers.
- **Express Backend:** [routes/sanjivaniHospital.js](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/routes/sanjivaniHospital.js#L50-L125) replaced generic Unsplash stock URLs with local authentic `/images/doctors/dr_...` paths.

### 2. Frontend UI Upgrades
- **Doctor Directory Page:** [DoctorsInfoPage.jsx](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/frontend/src/pages/DoctorsInfoPage.jsx#L205-L250) renders responsive 450×500 portrait cards with `loading="lazy"`, `object-cover object-top`, and automatic error fallback to `getDoctorInitials(doc.name)`.
- **Homepage Hero Snapshot Card:** [LandingPage.jsx](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/frontend/src/pages/LandingPage.jsx#L210-L260) displays authentic circular doctor portraits for Chief Surgeon Dr. Sunil M. Agrawal, Dr. Vijay S. Kawalkar, and Dr. Vinay Pande.
- **Appointment Booking Flow:** [AppointmentBookingPage.jsx](file:///c:/Users/Sanket/OneDrive/Attachments/HackByte1.0/frontend/src/pages/AppointmentBookingPage.jsx#L370-L390) displays doctor thumbnails in Step 1 specialist selection.

---

## 6. VERIFICATION & QUALITY CHECKS

1. **HTTP Endpoint Verification:**
   ```bash
   GET http://127.0.0.1:8000/api/doctors
   HTTP/1.1 200 OK
   # Verified responses include image_url for all verified doctors:
   - Dr. Sunil M. Agrawal -> /images/doctors/dr_sunil_agrawal.jpg
   - Dr. Vijay S. Kawalkar -> /images/doctors/dr_vijay_kawalkar.jpg
   - Dr. H. S. Bora -> /images/doctors/dr_hs_bora.jpg
   - Dr. Vinay Pande -> /images/doctors/dr_vinay_pande.jpg
   - Dr. Lalit Paldiwal -> /images/doctors/dr_lalit_paldiwal.jpg
   - Dr. Sheetal S. Agrawal -> /images/doctors/dr_sheetal_agrawal.jpg
   ```

2. **Frontend Production Build:**
   ```bash
   npm run build
   ✓ 1753 modules transformed.
   ✓ built in 52.86s
   dist/assets/index-DmGSZNVY.css   78.18 kB
   dist/assets/index-yjSfuc1H.js   615.88 kB
   Exit Code: 0 (PASSED)
   ```

3. **Backend Unit & Integration Tests:**
   ```bash
   Ran 64 tests in 27.968s
   OK (0 failures, 0 errors)
   ```
