-- HACKBYTE — Stage 9.2: Department Normalization & Official Doctor Extension Migration
-- Facility: Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal, Maharashtra (445001)
-- Description:
--   1. Expands departments table with 10 official clinical departments (IDs 6–15) alongside existing IDs 1–5.
--   2. Re-aligns existing verified doctors (IDs 3, 4, 14) to their true clinical departments.
--   3. Idempotently inserts 20 verified official hospital consultants (IDs 18–37) with normalized department IDs.
--   4. Preserves all existing historical records, appointments, tokens, prescriptions, and foreign keys.

BEGIN TRANSACTION;

-- ============================================================================
-- PART 1: CLINICAL DEPARTMENT EXPANSION (IDs 6–15)
-- ============================================================================

-- 6. General Surgery
INSERT INTO departments (id, name, code, default_consult_min)
SELECT 6, 'General Surgery', 'GS', 10
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'General Surgery' OR id = 6 OR code = 'GS');

-- 7. Obstetrics & Gynecology
INSERT INTO departments (id, name, code, default_consult_min)
SELECT 7, 'Obstetrics & Gynecology', 'OG', 10
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Obstetrics & Gynecology' OR id = 7 OR code = 'OG');

-- 8. Anesthesiology
INSERT INTO departments (id, name, code, default_consult_min)
SELECT 8, 'Anesthesiology', 'AN', 8
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Anesthesiology' OR id = 8 OR code = 'AN');

-- 9. Pathology
INSERT INTO departments (id, name, code, default_consult_min)
SELECT 9, 'Pathology', 'PA', 8
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Pathology' OR id = 9 OR code = 'PA');

-- 10. Ophthalmology
INSERT INTO departments (id, name, code, default_consult_min)
SELECT 10, 'Ophthalmology', 'OP', 8
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Ophthalmology' OR id = 10 OR code = 'OP');

-- 11. Dental
INSERT INTO departments (id, name, code, default_consult_min)
SELECT 11, 'Dental', 'D', 10
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Dental' OR id = 11 OR code = 'D');

-- 12. Nephrology
INSERT INTO departments (id, name, code, default_consult_min)
SELECT 12, 'Nephrology', 'NP', 10
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Nephrology' OR id = 12 OR code = 'NP');

-- 13. Urology
INSERT INTO departments (id, name, code, default_consult_min)
SELECT 13, 'Urology', 'UR', 10
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Urology' OR id = 13 OR code = 'UR');

-- 14. Gastroenterology
INSERT INTO departments (id, name, code, default_consult_min)
SELECT 14, 'Gastroenterology', 'GI', 10
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Gastroenterology' OR id = 14 OR code = 'GI');

-- 15. Superspecialty
INSERT INTO departments (id, name, code, default_consult_min)
SELECT 15, 'Superspecialty', 'SS', 10
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Superspecialty' OR id = 15 OR code = 'SS');

-- 16. Radiology
INSERT INTO departments (id, name, code, default_consult_min)
SELECT 16, 'Radiology', 'RAD', 10
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Radiology' OR id = 16 OR code = 'RAD');

-- ============================================================================
-- PART 2: ALIGN EXISTING VERIFIED FACULTY TO TRUE DEPARTMENTS
-- ============================================================================

-- Dr. Sunil M. Agrawal (ID 3): General Medicine (1) -> General Surgery (6)
UPDATE doctors SET department_id = 6 WHERE id = 3;

-- Dr. Vijay S. Kawalkar (ID 4): General Medicine (1) -> General Surgery (6)
UPDATE doctors SET department_id = 6 WHERE id = 4;

-- Dr. Sheetal S. Agrawal (ID 14): Pediatrics (4) -> Obstetrics & Gynecology (7)
UPDATE doctors SET department_id = 7 WHERE id = 14;

-- Dr. Lalit Paldiwal (ID 11): Orthopedics (3) -> Radiology (16)
UPDATE doctors SET department_id = 16, specialization = 'MD Radiology & Sonography' WHERE id = 11;

-- ============================================================================
-- PART 3: INSERT 20 PROPOSED OFFICIAL CONSULTANTS (IDs 18–37)
-- ============================================================================

-- 18. Dr. Amol Deshpande -> General Surgery (6)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 18, 'Dr. Amol Deshpande', 6, 'Laparoscopic & General Surgery', 'Room 7 (Surgical OPD)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, MS, D.N.B., F.M.A.S.', '/images/doctors/dr_amol_deshpande.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Amol Deshpande' OR id = 18);

-- 19. Dr. Rajendra Kadukar -> General Surgery (6)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 19, 'Dr. Rajendra Kadukar', 6, 'Laparoscopic & General Surgery', 'Room 8 (Surgical OPD)', 'available', 'available', '11:00', '15:00', '13:00', '14:00', 'MBBS, MS, F.M.A.S.', '/images/doctors/dr_rajendra_kadukar.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Rajendra Kadukar' OR id = 19);

-- 20. Dr. Durgesh Mahajan -> General Medicine (1)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 20, 'Dr. Durgesh Mahajan', 1, 'MD General Medicine & Critical Care', 'Room 9 (Medicine Wing)', 'available', 'available', '09:30', '13:30', '13:00', '14:00', 'MBBS, MD (Medicine)', '/images/doctors/dr_durgesh_mahajan.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Durgesh Mahajan' OR id = 20);

-- 21. Dr. Rekha Mundhada -> Obstetrics & Gynecology (7)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 21, 'Dr. Rekha Mundhada', 7, 'MD Obstetrics & Gynecology', 'Room 10 (Women Clinic)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, MD (Obstetrics & Gynecology)', '/images/doctors/dr_rekha_mundhada.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Rekha Mundhada' OR id = 21);

-- 22. Dr. Piyush Kalantri -> Cardiology (2)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 22, 'Dr. Piyush Kalantri', 2, 'Interventional Cardiology & Cardiac Care', 'Room 203 (Cardiac OPD)', 'available', 'available', '10:00', '15:00', '13:00', '14:00', 'MBBS, MD (Medicine), DM (Cardiology)', '/images/doctors/dr_piyush_kalantri.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Piyush Kalantri' OR id = 22);

-- 23. Dr. S. Mundhada -> Anesthesiology (8)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 23, 'Dr. S. Mundhada', 8, 'Anesthesiology & Critical Care', 'Room 11 (Critical Care Suite)', 'available', 'available', '09:00', '14:00', '13:00', '14:00', 'MBBS, MD (Anesthesiology)', '/images/doctors/dr_s_mundhada.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. S. Mundhada' OR id = 23);

-- 24. Dr. Pradip Bhojne -> Anesthesiology (8)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 24, 'Dr. Pradip Bhojne', 8, 'Anesthesiology & Pain Management', 'Room 12 (PAC Suite)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, MD (Anesthesia)', '/images/doctors/dr_pradip_bhojne.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Pradip Bhojne' OR id = 24);

-- 25. Dr. Gauri Bule -> Anesthesiology (8)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 25, 'Dr. Gauri Bule', 8, 'Anesthesiology & Neuro-Anesthesia', 'Room 14 (Anesthesia OPD)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, MD (Anesthesia)', '/images/doctors/dr_gauri_bule.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Gauri Bule' OR id = 25);

-- 26. Dr. Anil Loya -> Pediatrics (4)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 26, 'Dr. Anil Loya', 4, 'Pediatrics & Child Health', 'Room 403 (Child Clinic)', 'available', 'available', '09:00', '13:00', '13:00', '14:00', 'MBBS, D.C.H.', '/images/doctors/dr_anil_loya.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Anil Loya' OR id = 26);

-- 27. Dr. Tushar Chhattani -> Orthopedics (3)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 27, 'Dr. Tushar Chhattani', 3, 'Orthopedics & Joint Replacement', 'Room 303 (Joint Replacement)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, M.S. (Ortho) FIJR, FIAIS, FIRJR', '/images/doctors/dr_tushar_chhattani.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Tushar Chhattani' OR id = 27);

-- 28. Dr. Chetan Singhania -> Orthopedics (3)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 28, 'Dr. Chetan Singhania', 3, 'Orthopedics & Arthroscopic Surgery', 'Room 304 (Sports Injury OPD)', 'available', 'available', '11:00', '15:00', '13:00', '14:00', 'MBBS, MS (ORTHOPAEDICS), FIJR, FIAS', '/images/doctors/dr_chetan_singhania.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Chetan Singhania' OR id = 28);

-- 29. Dr. Vijaya Kawalkar -> Pathology (9)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 29, 'Dr. Vijaya Kawalkar', 9, 'Pathology & Clinical Laboratory Medicine', 'Room 15 (Pathology Suite)', 'available', 'available', '09:00', '14:00', '13:00', '14:00', 'MBBS, MD (Pathology)', '/images/doctors/dr_vijaya_kawalkar.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Vijaya Kawalkar' OR id = 29);

-- 30. Dr. Virendra Bubna -> Pathology (9)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 30, 'Dr. Virendra Bubna', 9, 'Clinical Biochemistry & Diagnostics', 'Room 16 (Biochemistry Wing)', 'available', 'available', '09:00', '14:00', '13:00', '14:00', 'MBBS, MD (Biochemistry)', '/images/doctors/dr_virendra_bubna.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Virendra Bubna' OR id = 30);

-- 31. Dr. Trupti Saraswat -> Pathology (9)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 31, 'Dr. Trupti Saraswat', 9, 'Clinical Pathology & Bacteriology', 'Room 17 (Microbiology Wing)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, Diploma in Pathology & Bacteriology', '/images/doctors/dr_trupti_saraswat.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Trupti Saraswat' OR id = 31);

-- 32. Dr. Ashish Potphode -> Ophthalmology (10)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 32, 'Dr. Ashish Potphode', 10, 'Ophthalmology & Micro-Eye Surgery', 'Room 503 (Eye Care OPD)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, MS (OPTHAL)', '/images/doctors/dr_ashish_potphode.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Ashish Potphode' OR id = 32);

-- 33. Dr. Pramod Jethwani -> Urology (13)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 33, 'Dr. Pramod Jethwani', 13, 'Urology, Andrology & Renal Surgery', 'Room 18 (Urology Clinic)', 'available', 'available', '11:00', '15:00', '13:00', '14:00', 'MBBS, DNB (Gen Surgeon), DrNB(SS) (Urologist), MNAMS', '/images/doctors/dr_pramod_jethwani.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Pramod Jethwani' OR id = 33);

-- 34. Dr. Navin Chhattani -> Nephrology (12)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 34, 'Dr. Navin Chhattani', 12, 'Nephrology, Dialysis & Kidney Care', 'Room 19 (Nephrology & Dialysis)', 'available', 'available', '10:30', '14:30', '13:00', '14:00', 'MBBS, DNB (Medicine), DNB (Nephrology)', '/images/doctors/dr_navin_chhattani.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Navin Chhattani' OR id = 34);

-- 35. Dr. Kalyani Gandhi (Patil) -> Dental (11)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 35, 'Dr. Kalyani Gandhi (Patil)', 11, 'Prosthodontics & Implantology', 'Room 504 (Dental & Maxillofacial)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'BDS, MDS, Prosthodontist, Implantologist', '/images/doctors/dr_kalyani_gandhi.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Kalyani Gandhi (Patil)' OR id = 35);

-- 36. Dr. Ankush M. Sune -> Dental (11)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 36, 'Dr. Ankush M. Sune', 11, 'Dental Surgery & Oral Health', 'Room 505 (Dental Clinic)', 'available', 'available', '11:00', '15:00', '13:00', '14:00', 'BDS, MDS', '/images/doctors/dr_ankush_sune.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Ankush M. Sune' OR id = 36);

-- 37. Dr. Hitesh Dudhe -> Gastroenterology (14)
INSERT INTO doctors (id, name, department_id, specialization, room, status, duty_status, shift_start, shift_end, break_start, break_end, qualification, image_url)
SELECT 37, 'Dr. Hitesh Dudhe', 14, 'Medical Gastroenterology & Endoscopy', 'Room 20 (Gastro & Endoscopy Suite)', 'available', 'available', '10:00', '14:00', '13:00', '14:00', 'MBBS, (DNB Medicine), Fellowship in Advance Endoscopy, DrNB (S.S.) (Gastro)', '/images/doctors/dr_hitesh_dudhe.jpg'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Hitesh Dudhe' OR id = 37);

COMMIT;
