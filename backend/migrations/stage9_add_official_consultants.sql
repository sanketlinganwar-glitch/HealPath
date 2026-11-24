-- HACKBYTE — Stage 9 Doctor Database Extension Migration
-- Facility: Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal, Maharashtra (445001)
-- Description: Idempotently inserts 20 verified official hospital consultants (IDs 18–37) under Option A.
-- Preserves existing doctors (IDs 1–16), appointments, tokens, prescriptions, and historical data.

BEGIN TRANSACTION;

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
