import db from './db.js';
import { getKolkataTime, shiftKolkataDate } from '../services/time.js';

const isClear = process.argv.includes('--clear');

async function run() {
  const store = db.store;
  if (!store || !store.data) {
    console.error('❌ Store not initialized');
    process.exit(1);
  }

  if (isClear) {
    const prevAppts = store.data.appointments?.length || 0;
    const prevQueue = store.data.queue?.length || 0;

    store.data.appointments = (store.data.appointments || []).filter(a => !a.demo);
    store.data.queue = (store.data.queue || []).filter(q => !q.demo);
    db.save();

    const removedAppts = prevAppts - store.data.appointments.length;
    const removedQueue = prevQueue - store.data.queue.length;

    console.log(`✨ [Demo Analytics] Cleaned up ${removedAppts} demo appointments and ${removedQueue} demo queue items.`);
    process.exit(0);
  }

  // Clear previous demo records first for idempotency
  store.data.appointments = (store.data.appointments || []).filter(a => !a.demo);
  store.data.queue = (store.data.queue || []).filter(q => !q.demo);

  const doctors = store.data.doctors || [];
  if (doctors.length === 0) {
    console.error('❌ No doctors found in database to attach demo appointments');
    process.exit(1);
  }

  const { dateStr: todayKolkata } = getKolkataTime();
  console.log(`🌱 [Demo Analytics] Seeding realistic demo data across past 14 days (up to ${todayKolkata})...`);

  const demoPatients = [
    { name: 'Suresh Patil', age: 52, disease: 'Hypertension Follow-up', phone: '+919822100001' },
    { name: 'Ananya Deshmukh', age: 29, disease: 'Migraine and Dizziness', phone: '+919822100002' },
    { name: 'Ganesh Jadhav', age: 44, disease: 'Type 2 Diabetes Routine Care', phone: '+919822100003' },
    { name: 'Meera Kulkarni', age: 36, disease: 'Seasonal Bronchitis', phone: '+919822100004' },
    { name: 'Rohan Shinde', age: 10, disease: 'Pediatric Viral Fever', phone: '+919822100005' },
    { name: 'Pooja Joshi', age: 61, disease: 'Osteoarthritis Knee Pain', phone: '+919822100006' },
    { name: 'Vikas Gaikwad', age: 38, disease: 'Gastric Acidity & Reflux', phone: '+919822100007' },
    { name: 'Sunita Chavan', age: 49, disease: 'Thyroid Monitoring', phone: '+919822100008' },
    { name: 'Nikhil Pawar', age: 24, disease: 'Sports Ankle Sprain', phone: '+919822100009' },
    { name: 'Kavita Salunkhe', age: 33, disease: 'Post-Op Surgical Review', phone: '+919822100010' }
  ];

  const slotTimes = ['09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
  let createdCount = 0;

  let currentApptId = Math.max(0, ...(store.data.appointments || []).map(a => a.id || 0)) + 1;
  let currentQueueId = Math.max(0, ...(store.data.queue || []).map(q => q.id || 0)) + 1;

  // Spread across days -13 to 0 (14 days)
  for (let dayOffset = -13; dayOffset <= 0; dayOffset++) {
    const targetDate = shiftKolkataDate(todayKolkata, dayOffset);
    // 4 to 8 appointments per day
    const apptsPerDay = 4 + Math.floor(Math.random() * 5);

    for (let i = 0; i < apptsPerDay; i++) {
      const p = demoPatients[(createdCount) % demoPatients.length];
      const doc = doctors[createdCount % doctors.length];
      const time = slotTimes[i % slotTimes.length];
      const apptId = currentApptId++;
      const queueId = currentQueueId++;
      const tokenNo = `DEMO-${String(apptId).padStart(3, '0')}`;

      // Realistic status distribution
      // For past days: ~72% completed, ~12% missed, ~8% cancelled, ~8% auto_shifted
      // For today: include some waiting/booked
      let status = 'completed';
      let autoShifted = false;
      let source = Math.random() < 0.28 ? 'walk_in' : 'online';

      const roll = Math.random();
      if (dayOffset === 0 && roll < 0.35) {
        status = 'booked';
      } else if (roll < 0.12) {
        status = 'missed';
      } else if (roll < 0.20) {
        status = 'cancelled';
      } else if (roll < 0.28) {
        status = 'rescheduled';
        autoShifted = true;
      } else {
        status = 'completed';
      }

      // Timestamps
      const [sh, sm] = time.split(':').map(Number);
      const slotHour = sh;
      const slotMin = sm;

      const createdDate = shiftKolkataDate(targetDate, -1);
      const createdAt = `${createdDate}T15:00:00.000Z`;

      let checkedIn = false;
      let checkedInAt = null;
      let calledAt = null;
      let startedAt = null;
      let completedAt = null;

      if (status === 'completed') {
        checkedIn = true;
        // Checked in 5-20 min before slot
        const checkInLeadMin = 5 + Math.floor(Math.random() * 15);
        const cinHour = slotHour;
        const cinMin = Math.max(0, slotMin - checkInLeadMin);
        checkedInAt = `${targetDate}T${String(cinHour).padStart(2, '0')}:${String(cinMin).padStart(2, '0')}:00.000Z`;

        // Called 8-22 min after check-in (wait time)
        const waitMin = 8 + Math.floor(Math.random() * 15);
        const callTotalMin = cinHour * 60 + cinMin + waitMin;
        const callH = Math.floor(callTotalMin / 60);
        const callM = callTotalMin % 60;
        calledAt = `${targetDate}T${String(callH).padStart(2, '0')}:${String(callM).padStart(2, '0')}:00.000Z`;
        startedAt = calledAt;

        // Consult duration 10-25 min
        const consultMin = 10 + Math.floor(Math.random() * 16);
        const compTotalMin = callTotalMin + consultMin;
        const compH = Math.floor(compTotalMin / 60);
        const compM = compTotalMin % 60;
        completedAt = `${targetDate}T${String(compH).padStart(2, '0')}:${String(compM).padStart(2, '0')}:00.000Z`;
      } else if (status === 'rescheduled') {
        source = 'online';
      }

      const apptRecord = {
        id: apptId,
        patient_id: 100 + (createdCount % 20),
        patient_name: p.name,
        age: p.age,
        disease: p.disease,
        whatsapp_no: p.phone,
        notes: 'Demo evaluation record',
        slot_id: 1000 + apptId,
        token_no: tokenNo,
        doctor_id: doc.id,
        department_id: doc.department_id,
        date: targetDate,
        time: time,
        source: source,
        checked_in: checkedIn,
        checked_in_at: checkedInAt,
        called_at: calledAt,
        started_at: startedAt,
        completed_at: completedAt,
        auto_shifted: autoShifted,
        status: status,
        reminder_sent_at: status === 'completed' ? `${targetDate}T09:00:00.000Z` : null,
        reminder_attempts: status === 'completed' ? 1 : 0,
        demo: true,
        created_at: createdAt
      };

      store.data.appointments.push(apptRecord);

      // Queue item
      const queueRecord = {
        id: queueId,
        appointment_id: apptId,
        token_no: tokenNo,
        doctor_id: doc.id,
        department_id: doc.department_id,
        patient_name: p.name,
        status: status === 'completed' ? 'completed' : (status === 'missed' ? 'missed' : 'waiting'),
        position: i + 1,
        checked_in_at: checkedInAt,
        called_at: calledAt,
        started_at: startedAt,
        completed_at: completedAt,
        demo: true,
        created_at: createdAt
      };

      store.data.queue.push(queueRecord);
      createdCount++;
    }
  }

  db.save();
  console.log(`✅ [Demo Analytics] Successfully seeded ${createdCount} realistic demo appointments across the last 14 days.`);
  console.log('💡 To clear these demo records at any time, run: npm run seed:demo-analytics -- --clear');
  process.exit(0);
}

run().catch(err => {
  console.error('Error seeding demo analytics:', err);
  process.exit(1);
});
