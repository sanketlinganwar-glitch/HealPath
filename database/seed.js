import bcrypt from 'bcryptjs';
import db from './db.js';

export async function seedDatabase(force = false) {
  const store = db.store;

  if (store.data.departments.length > 0 && !force) {
    ensureSanjivaniData(store);
    return;
  }

  console.log('🌱 [Seed] Seeding HealPath initial departments, doctors, slots, and users...');

  // 1. Departments
  store.data.departments = [
    {
      id: 1,
      name: 'Cardiology',
      code: 'CARD',
      description: 'Comprehensive cardiovascular diagnosis, intervention, and preventive care.',
      icon: 'heart-pulse',
      default_consult_min: 15
    },
    {
      id: 2,
      name: 'Dental Specialist',
      code: 'DENT',
      description: 'Advanced dental surgery, orthodontic care, cosmetic dentistry, and dental diagnostics.',
      icon: 'smile',
      default_consult_min: 15
    },
    {
      id: 3,
      name: 'Radiology & Imaging',
      code: 'RAD',
      description: 'High-precision MRI, CT-Scan, ultrasound, and digital X-ray diagnostics.',
      icon: 'activity',
      default_consult_min: 15
    },
    {
      id: 4,
      name: 'Neurology',
      code: 'NEUR',
      description: 'World-class care for neurological conditions, spine disorders, and stroke management.',
      icon: 'cpu',
      default_consult_min: 20
    },
    {
      id: 5,
      name: 'Ophthalmology',
      code: 'OPHT',
      description: 'Advanced vision testing, laser eye surgery, cataract treatment, and retinal care.',
      icon: 'eye',
      default_consult_min: 15
    },
    {
      id: 6,
      name: 'Children Center',
      code: 'PED',
      description: 'Compassionate pediatric healthcare, newborn care, immunizations, and child wellness.',
      icon: 'baby',
      default_consult_min: 15
    },
    {
      id: 7,
      name: 'Sanjivani Hospital (Yavatmal 445001)',
      code: 'SANJ',
      description: 'Sanjeevan Multispecialty Hospital & Research Institute, Mahadev Mandir Road, Ratanlal Plots, Yavatmal 445001.',
      icon: 'hospital',
      default_consult_min: 15
    }
  ];

  // 2. Doctors
  store.data.doctors = [
    {
      id: 1,
      name: 'Dr. Rajesh Sharma',
      department_id: 1,
      department_name: 'Cardiology',
      specialization: 'Senior Cardiologist & Surgeon',
      room: 'Room 101 (Floor 1)',
      experience_years: 16,
      bio: 'Leading cardiologist with over 15 years experience in interventional cardiology and angiography.',
      image_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80',
      status: 'available',
      working_start: '10:00',
      working_end: '14:00',
      slot_duration: 15
    },
    {
      id: 2,
      name: 'Dr. Priya Nair',
      department_id: 6,
      department_name: 'Children Center',
      specialization: 'Consultant Pediatrician',
      room: 'Room 102 (Floor 1)',
      experience_years: 12,
      bio: 'Specialist in pediatric developmental health, immunization, and infant intensive care.',
      image_url: 'https://images.unsplash.com/photo-1594824813580-ff67fbf9303d?auto=format&fit=crop&w=600&q=80',
      status: 'available',
      working_start: '10:00',
      working_end: '14:00',
      slot_duration: 15
    },
    {
      id: 3,
      name: 'Dr. Meera Kulkarni',
      department_id: 4,
      department_name: 'Neurology',
      specialization: 'Neurosurgeon & Specialist',
      room: 'Room 201 (Floor 2)',
      experience_years: 18,
      bio: 'Renowned neurosurgeon specializing in micro-neurosurgery and neurological disorders.',
      image_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80',
      status: 'available',
      working_start: '10:00',
      working_end: '14:00',
      slot_duration: 20
    },
    {
      id: 4,
      name: 'Dr. Suresh Patil',
      department_id: 2,
      department_name: 'Dental Specialist',
      specialization: 'Dental Surgeon & Orthodontist',
      room: 'Room 202 (Floor 2)',
      experience_years: 14,
      bio: 'Expert in restorative dentistry, implants, smile corrections, and dental surgery.',
      image_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=600&q=80',
      status: 'available',
      working_start: '10:00',
      working_end: '14:00',
      slot_duration: 15
    },
    {
      id: 5,
      name: 'Dr. Vikram Malhotra',
      department_id: 3,
      department_name: 'Radiology & Imaging',
      specialization: 'Diagnostic Radiologist',
      room: 'Room 301 (Floor 3)',
      experience_years: 11,
      bio: 'Specialist in advanced diagnostic imaging, cross-sectional imaging, and ultrasound.',
      image_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=600&q=80',
      status: 'available',
      working_start: '10:00',
      working_end: '14:00',
      slot_duration: 15
    },
    {
      id: 6,
      name: 'Dr. Sunita Rao',
      department_id: 5,
      department_name: 'Ophthalmology',
      specialization: 'Cornea & Refractive Surgeon',
      room: 'Room 302 (Floor 3)',
      experience_years: 13,
      bio: 'Expert in LASIK, cataract procedures, corneal transplants, and retinal care.',
      image_url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
      status: 'available',
      working_start: '10:00',
      working_end: '14:00',
      slot_duration: 15
    },
    {
      id: 101,
      name: 'Dr. Sunil M. Agrawal',
      department_id: 7,
      department_name: 'Sanjivani Hospital (Yavatmal 445001)',
      specialization: 'Chief Surgeon & Laparoscopy Specialist',
      room: 'Room 1 (Consultant Suite)',
      experience_years: 22,
      bio: 'Managing Director at Sanjeevan Multispecialty Hospital Yavatmal. Pioneer in laparoscopic and general surgery in Vidarbha.',
      image_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600',
      status: 'available',
      working_start: '10:00',
      working_end: '14:00',
      slot_duration: 15
    },
    {
      id: 102,
      name: 'Dr. Vijay S. Kawalkar',
      department_id: 7,
      department_name: 'Sanjivani Hospital (Yavatmal 445001)',
      specialization: 'Senior Consultant Laparoscopic Surgeon',
      room: 'Room 2 (Surgical OPD)',
      experience_years: 19,
      bio: 'Senior surgeon specializing in minimally invasive abdominal surgeries, laser proctology, and trauma emergencies.',
      image_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600',
      status: 'available',
      working_start: '11:00',
      working_end: '14:00',
      slot_duration: 15
    },
    {
      id: 103,
      name: 'Dr. H. S. Bora',
      department_id: 7,
      department_name: 'Sanjivani Hospital (Yavatmal 445001)',
      specialization: 'MD General Medicine & Critical Care',
      room: 'Room 3 (Medicine Wing)',
      experience_years: 25,
      bio: 'Leading general physician with over two decades of critical care, diabetes management, and intensive therapy experience.',
      image_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600',
      status: 'available',
      working_start: '10:30',
      working_end: '14:30',
      slot_duration: 15
    },
    {
      id: 104,
      name: 'Dr. Vinay Pande',
      department_id: 7,
      department_name: 'Sanjivani Hospital (Yavatmal 445001)',
      specialization: 'Chest & Pulmonary Critical Care',
      room: 'Room 4 (Chest Clinic)',
      experience_years: 16,
      bio: 'Pulmonology and respiratory medicine expert specializing in asthma, COPD, and critical respiratory infections.',
      image_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=600',
      status: 'available',
      working_start: '10:00',
      working_end: '14:00',
      slot_duration: 15
    },
    {
      id: 105,
      name: 'Dr. Sheetal S. Agrawal',
      department_id: 7,
      department_name: 'Sanjivani Hospital (Yavatmal 445001)',
      specialization: 'MD Obstetrics & Gynecology',
      room: 'Room 5 (Women Clinic)',
      experience_years: 20,
      bio: 'Renowned obstetrician and gynecologist managing high-risk pregnancies, maternal care, and infertility treatments.',
      image_url: 'https://images.unsplash.com/photo-1594824813580-ff67fbf9303d?auto=format&fit=crop&q=80&w=600',
      status: 'available',
      working_start: '10:00',
      working_end: '14:00',
      slot_duration: 15
    },
    {
      id: 106,
      name: 'Dr. Lalit Paldiwal',
      department_id: 7,
      department_name: 'Sanjivani Hospital (Yavatmal 445001)',
      specialization: 'MD Radiology & Sonography',
      room: 'Room 6 (Imaging Suite)',
      experience_years: 14,
      bio: 'Chief radiologist specializing in color Doppler, 4D ultrasound, CT scans, and high-precision diagnostic imaging.',
      image_url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
      status: 'available',
      working_start: '09:30',
      working_end: '13:30',
      slot_duration: 15
    }
  ];

  // 3. Users (Bcrypt hashed)
  const salt = await bcrypt.genSalt(10);
  const adminPass = await bcrypt.hash('admin123', salt);
  const receptionPass = await bcrypt.hash('reception123', salt);
  const doctorPass = await bcrypt.hash('doctor123', salt);
  const patientPass = await bcrypt.hash('patient123', salt);

  store.data.users = [
    {
      id: 1,
      name: 'Hospital Administrator',
      email: 'admin@medicare.com',
      phone: '+919876543210',
      password_hash: adminPass,
      role: 'admin',
      doctor_id: null,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Sneha Patil (Reception Desk)',
      email: 'reception@medicare.com',
      phone: '+919876543211',
      password_hash: receptionPass,
      role: 'receptionist',
      doctor_id: null,
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      name: 'Dr. Rajesh Sharma',
      email: 'doctor.sharma@medicare.com',
      phone: '+919876543212',
      password_hash: doctorPass,
      role: 'doctor',
      doctor_id: 1,
      created_at: new Date().toISOString()
    },
    {
      id: 4,
      name: 'Dr. Priya Nair',
      email: 'doctor.nair@medicare.com',
      phone: '+919876543213',
      password_hash: doctorPass,
      role: 'doctor',
      doctor_id: 2,
      created_at: new Date().toISOString()
    },
    {
      id: 5,
      name: 'Rohan Gupta',
      email: 'patient@medicare.com',
      phone: '+919823011111',
      password_hash: patientPass,
      role: 'patient',
      doctor_id: null,
      created_at: new Date().toISOString()
    }
  ];

  // 4. Slots Generation (for today and tomorrow)
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const datesToGenerate = [todayStr, tomorrowStr];
  let slotIdCounter = 1;
  store.data.slots = [];

  for (const doc of store.data.doctors) {
    for (const d of datesToGenerate) {
      // 10:00 to 14:00 in increments of doc.slot_duration
      const startMin = 10 * 60; // 600
      const endMin = 14 * 60;   // 840
      const duration = doc.slot_duration;

      for (let m = startMin; m < endMin; m += duration) {
        const sh = Math.floor(m / 60);
        const sm = m % 60;
        const eh = Math.floor((m + duration) / 60);
        const em = (m + duration) % 60;

        const startTime = `${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}`;
        const endTime = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;

        store.data.slots.push({
          id: slotIdCounter++,
          doctor_id: doc.id,
          date: d,
          start_time: startTime,
          end_time: endTime,
          status: 'available',
          created_at: new Date().toISOString()
        });
      }
    }
  }

  // 5. Initial Seed Appointments & Queue
  const doc1Slots = store.data.slots.filter(s => s.doctor_id === 1 && s.date === todayStr);

  store.data.appointments = [];
  store.data.queue = [];
  store.data.messages = [];

  if (doc1Slots.length >= 4) {
    // Book slot 1 (In Progress)
    doc1Slots[0].status = 'booked';
    const appt1 = {
      id: 1,
      patient_id: 5,
      patient_name: 'Aarav Deshmukh',
      age: 48,
      disease: 'Routine cardiac follow-up and blood pressure check',
      whatsapp_no: '+919823011111',
      notes: 'Carrying previous ECG reports',
      slot_id: doc1Slots[0].id,
      token_no: 'CARD-001',
      doctor_id: 1,
      department_id: 1,
      date: todayStr,
      time: doc1Slots[0].start_time,
      checked_in: true,
      status: 'checked_in',
      created_at: new Date(Date.now() - 3600000).toISOString()
    };
    store.data.appointments.push(appt1);
    store.data.queue.push({
      id: 1,
      appointment_id: 1,
      token_no: 'CARD-001',
      doctor_id: 1,
      department_id: 1,
      patient_name: 'Aarav Deshmukh',
      status: 'in_progress',
      position: 1,
      called_at: new Date(Date.now() - 600000).toISOString(),
      completed_at: null,
      created_at: appt1.created_at
    });

    // Book slot 2 (Waiting)
    doc1Slots[1].status = 'booked';
    const appt2 = {
      id: 2,
      patient_id: null,
      patient_name: 'Sunita Shinde',
      age: 62,
      disease: 'Mild chest tightness on exertion',
      whatsapp_no: '+919823022222',
      notes: 'Diabetic history',
      slot_id: doc1Slots[1].id,
      token_no: 'CARD-002',
      doctor_id: 1,
      department_id: 1,
      date: todayStr,
      time: doc1Slots[1].start_time,
      checked_in: true,
      status: 'checked_in',
      created_at: new Date(Date.now() - 2400000).toISOString()
    };
    store.data.appointments.push(appt2);
    store.data.queue.push({
      id: 2,
      appointment_id: 2,
      token_no: 'CARD-002',
      doctor_id: 1,
      department_id: 1,
      patient_name: 'Sunita Shinde',
      status: 'waiting',
      position: 2,
      called_at: null,
      completed_at: null,
      created_at: appt2.created_at
    });

    // Book slot 3 (Waiting)
    doc1Slots[2].status = 'booked';
    const appt3 = {
      id: 3,
      patient_id: null,
      patient_name: 'Deepak More',
      age: 38,
      disease: 'Palpitations after workout',
      whatsapp_no: '+919823033333',
      notes: null,
      slot_id: doc1Slots[2].id,
      token_no: 'CARD-003',
      doctor_id: 1,
      department_id: 1,
      date: todayStr,
      time: doc1Slots[2].start_time,
      checked_in: false,
      status: 'booked',
      created_at: new Date(Date.now() - 1200000).toISOString()
    };
    store.data.appointments.push(appt3);
    store.data.queue.push({
      id: 3,
      appointment_id: 3,
      token_no: 'CARD-003',
      doctor_id: 1,
      department_id: 1,
      patient_name: 'Deepak More',
      status: 'waiting',
      position: 3,
      called_at: null,
      completed_at: null,
      created_at: appt3.created_at
    });

    // Seed confirmation message
    store.data.messages.push({
      id: 1,
      appointment_id: 1,
      recipient_phone: '+919823011111',
      message_text: `Hello Aarav Deshmukh, your appointment with Dr. Rajesh Sharma is confirmed on ${todayStr} at ${doc1Slots[0].start_time}. Token No: CARD-001. Please arrive 10 minutes early.`,
      provider: 'simulation',
      status: 'delivered',
      error_message: null,
      sent_at: appt1.created_at
    });
  }

  db.save();
  console.log('✅ [Seed] Successfully seeded HealPath database with doctors, slots, and demo appointments.');
}

export function ensureSanjivaniData(store) {
  if (!store.data.departments.some(d => d.id === 7)) {
    store.data.departments.push({
      id: 7,
      name: 'Sanjivani Hospital (Yavatmal 445001)',
      code: 'SANJ',
      description: 'Sanjeevan Multispecialty Hospital & Research Institute, Mahadev Mandir Road, Ratanlal Plots, Yavatmal 445001.',
      icon: 'hospital',
      default_consult_min: 15
    });
  }

  const sanjivaniDoctors = [
    {
      id: 101,
      name: 'Dr. Sunil M. Agrawal',
      department_id: 7,
      department_name: 'Sanjivani Hospital (Yavatmal 445001)',
      specialization: 'Chief Surgeon & Laparoscopy Specialist',
      room: 'Room 1 (Consultant Suite)',
      experience_years: 22,
      bio: 'Managing Director at Sanjeevan Multispecialty Hospital Yavatmal. Pioneer in laparoscopic and general surgery in Vidarbha.',
      image_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600',
      status: 'available',
      working_start: '10:00',
      working_end: '14:00',
      slot_duration: 15
    },
    {
      id: 102,
      name: 'Dr. Vijay S. Kawalkar',
      department_id: 7,
      department_name: 'Sanjivani Hospital (Yavatmal 445001)',
      specialization: 'Senior Consultant Laparoscopic Surgeon',
      room: 'Room 2 (Surgical OPD)',
      experience_years: 19,
      bio: 'Senior surgeon specializing in minimally invasive abdominal surgeries, laser proctology, and trauma emergencies.',
      image_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600',
      status: 'available',
      working_start: '11:00',
      working_end: '14:00',
      slot_duration: 15
    },
    {
      id: 103,
      name: 'Dr. H. S. Bora',
      department_id: 7,
      department_name: 'Sanjivani Hospital (Yavatmal 445001)',
      specialization: 'MD General Medicine & Critical Care',
      room: 'Room 3 (Medicine Wing)',
      experience_years: 25,
      bio: 'Leading general physician with over two decades of critical care, diabetes management, and intensive therapy experience.',
      image_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600',
      status: 'available',
      working_start: '10:30',
      working_end: '14:30',
      slot_duration: 15
    },
    {
      id: 104,
      name: 'Dr. Vinay Pande',
      department_id: 7,
      department_name: 'Sanjivani Hospital (Yavatmal 445001)',
      specialization: 'Chest & Pulmonary Critical Care',
      room: 'Room 4 (Chest Clinic)',
      experience_years: 16,
      bio: 'Pulmonology and respiratory medicine expert specializing in asthma, COPD, and critical respiratory infections.',
      image_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=600',
      status: 'available',
      working_start: '10:00',
      working_end: '14:00',
      slot_duration: 15
    },
    {
      id: 105,
      name: 'Dr. Sheetal S. Agrawal',
      department_id: 7,
      department_name: 'Sanjivani Hospital (Yavatmal 445001)',
      specialization: 'MD Obstetrics & Gynecology',
      room: 'Room 5 (Women Clinic)',
      experience_years: 20,
      bio: 'Renowned obstetrician and gynecologist managing high-risk pregnancies, maternal care, and infertility treatments.',
      image_url: 'https://images.unsplash.com/photo-1594824813580-ff67fbf9303d?auto=format&fit=crop&q=80&w=600',
      status: 'available',
      working_start: '10:00',
      working_end: '14:00',
      slot_duration: 15
    },
    {
      id: 106,
      name: 'Dr. Lalit Paldiwal',
      department_id: 7,
      department_name: 'Sanjivani Hospital (Yavatmal 445001)',
      specialization: 'MD Radiology & Sonography',
      room: 'Room 6 (Imaging Suite)',
      experience_years: 14,
      bio: 'Chief radiologist specializing in color Doppler, 4D ultrasound, CT scans, and high-precision diagnostic imaging.',
      image_url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=600&q=80',
      status: 'available',
      working_start: '09:30',
      working_end: '13:30',
      slot_duration: 15
    }
  ];

  let added = false;
  for (const doc of sanjivaniDoctors) {
    if (!store.data.doctors.some(d => d.id === doc.id)) {
      store.data.doctors.push(doc);
      added = true;
    }
  }

  if (added) {
    store.save();
    console.log('✅ [Seed] Sanjivani Hospital Yavatmal (445001) data verified and synced.');
  }
}

if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase(true).then(() => process.exit(0));
}
