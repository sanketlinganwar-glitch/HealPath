/**
 * MediCare - Slot Booking System
 * Cascading Department -> Doctor -> Date -> Slot Matrix
 */

let selectedDoctorId = null;
let selectedDate = new Date().toISOString().split('T')[0];
let selectedSlot = null;

document.addEventListener('DOMContentLoaded', () => {
  initBookingSystem();
});

async function initBookingSystem() {
  const deptSelect = document.getElementById('book-department');
  const doctorSelect = document.getElementById('book-doctor');
  const dateInput = document.getElementById('book-date');

  // Set min date to today
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
    selectedDate = today;

    dateInput.addEventListener('change', (e) => {
      selectedDate = e.target.value;
      if (selectedDoctorId) {
        fetchAndRenderSlots(selectedDoctorId, selectedDate);
      }
    });
  }

  // Load Departments
  try {
    const res = await fetch('/api/departments');
    const data = await res.json();
    if (data.success && deptSelect) {
      deptSelect.innerHTML = '<option value="">-- Choose Department --</option>';
      data.departments.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept.id;
        opt.textContent = `${dept.name} (${dept.code})`;
        deptSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Failed to load departments:', err);
  }

  // Department change listener
  if (deptSelect) {
    deptSelect.addEventListener('change', (e) => {
      const deptId = e.target.value;
      loadDoctorsByDepartment(deptId);
    });
  }

  // Doctor change listener
  if (doctorSelect) {
    doctorSelect.addEventListener('change', (e) => {
      selectedDoctorId = e.target.value ? Number(e.target.value) : null;
      if (selectedDoctorId && selectedDate) {
        fetchAndRenderSlots(selectedDoctorId, selectedDate);
      } else {
        clearSlotsGrid();
      }
    });
  }

  // Check URL params (e.g. ?dept=1 or ?doc=1)
  const urlParams = new URLSearchParams(window.location.search);
  const paramDept = urlParams.get('dept');
  const paramDoc = urlParams.get('doc');

  if (paramDept && deptSelect) {
    deptSelect.value = paramDept;
    await loadDoctorsByDepartment(paramDept);
    if (paramDoc && doctorSelect) {
      doctorSelect.value = paramDoc;
      selectedDoctorId = Number(paramDoc);
      fetchAndRenderSlots(selectedDoctorId, selectedDate);
    }
  } else {
    // By default load all doctors
    loadDoctorsByDepartment(null);
  }

  // Listen to Socket.io slot updates
  if (typeof io !== 'undefined') {
    const socket = io();
    socket.on('slot:booked', (data) => {
      if (data.doctorId === selectedDoctorId && data.date === selectedDate) {
        fetchAndRenderSlots(selectedDoctorId, selectedDate);
      }
    });
    socket.on('slot:updated', () => {
      if (selectedDoctorId && selectedDate) {
        fetchAndRenderSlots(selectedDoctorId, selectedDate);
      }
    });
  }
}

async function loadDoctorsByDepartment(deptId) {
  const doctorSelect = document.getElementById('book-doctor');
  if (!doctorSelect) return;

  try {
    const url = deptId ? `/api/doctors?department_id=${deptId}` : '/api/doctors';
    const res = await fetch(url);
    const data = await res.json();

    doctorSelect.innerHTML = '<option value="">-- Choose Specialist Doctor --</option>';
    if (data.success && data.doctors) {
      data.doctors.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = `${doc.name} - ${doc.specialty} (${doc.room_no})`;
        doctorSelect.appendChild(opt);
      });

      // If there's at least one doctor and none selected, auto-select first
      if (data.doctors.length > 0 && !selectedDoctorId) {
        doctorSelect.value = data.doctors[0].id;
        selectedDoctorId = data.doctors[0].id;
        fetchAndRenderSlots(selectedDoctorId, selectedDate);
      }
    }
  } catch (err) {
    console.error('Failed to load doctors:', err);
  }
}

async function fetchAndRenderSlots(doctorId, dateStr) {
  const container = document.getElementById('slots-container');
  const loader = document.getElementById('slots-loading');
  const summaryBox = document.getElementById('doctor-summary-box');

  if (loader) loader.style.display = 'block';
  if (container) container.innerHTML = '';

  try {
    const res = await fetch(`/api/slots?doctor_id=${doctorId}&date=${dateStr}`);
    const data = await res.json();

    if (loader) loader.style.display = 'none';

    if (!data.success) {
      throw new Error(data.message);
    }

    // Update doctor summary header
    if (summaryBox) {
      summaryBox.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h3 style="color: var(--deep-blue);">${data.doctor.name}</h3>
            <p style="color: var(--teal); font-weight: 600;">${data.doctor.specialty} &bull; ${data.doctor.room_no}</p>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <span class="tag-mint"><i class="fas fa-calendar-day"></i> ${dateStr}</span>
            <span class="tag-mint" style="background: rgba(20, 187, 166, 0.15); color: var(--teal);"><i class="fas fa-clock"></i> ${data.stats.available} Available</span>
          </div>
        </div>
      `;
    }

    // Render Slots Grid
    if (container) {
      if (data.slots.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: var(--charcoal-light);">
            <i class="fas fa-calendar-times" style="font-size: 2.5rem; color: var(--mint); margin-bottom: 0.75rem;"></i>
            <p>No consultation slots scheduled for this doctor on selected date.</p>
          </div>
        `;
        return;
      }

      const grid = document.createElement('div');
      grid.className = 'slot-grid-matrix';

      data.slots.forEach(slot => {
        const slotBtn = document.createElement('button');
        slotBtn.type = 'button';
        slotBtn.className = `slot-btn slot-${slot.status}`;
        slotBtn.innerHTML = `
          <span>${formatTime(slot.start_time)}</span>
          <small style="font-size: 0.72rem; text-transform: uppercase;">${slot.status}</small>
        `;

        if (slot.status === 'available') {
          slotBtn.onclick = () => openBookingModal(slot, data.doctor);
        } else {
          slotBtn.disabled = true;
          slotBtn.title = slot.status === 'booked' ? 'Slot already booked' : 'Slot missed/unavailable';
        }

        grid.appendChild(slotBtn);
      });

      container.appendChild(grid);
    }
  } catch (err) {
    if (loader) loader.style.display = 'none';
    if (container) {
      container.innerHTML = `<div style="color: var(--status-booked); text-align: center; padding: 1.5rem;">${err.message}</div>`;
    }
  }
}

function clearSlotsGrid() {
  const container = document.getElementById('slots-container');
  const summaryBox = document.getElementById('doctor-summary-box');
  if (container) container.innerHTML = '<p style="text-align: center; color: var(--charcoal-light); padding: 2rem;">Please select a doctor to view time slots.</p>';
  if (summaryBox) summaryBox.innerHTML = '';
}

function formatTime(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Open Booking Popup Modal for Selected Slot
function openBookingModal(slot, doctor) {
  selectedSlot = slot;
  let modal = document.getElementById('booking-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'booking-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  // Pre-fill user data if logged in
  const userJson = localStorage.getItem('healpath_user') || localStorage.getItem('medicare_user');
  let prefillName = '';
  let prefillPhone = '';
  let prefillAge = '';
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      prefillName = user.name || '';
      prefillPhone = user.phone || '';
      prefillAge = user.age || '';
    } catch (e) {}
  }

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <span class="tag-mint"><i class="fas fa-check-circle"></i> Slot Selected</span>
          <h3 style="color: var(--deep-blue); margin-top: 0.4rem;">Confirm Appointment</h3>
        </div>
        <button class="modal-close-btn" onclick="closeModal('booking-modal')">&times;</button>
      </div>

      <!-- Slot Details Banner -->
      <div style="background: var(--light-gray); border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; border-left: 4px solid var(--teal);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
          <strong style="color: var(--deep-blue);">${doctor.name}</strong>
          <span style="color: var(--teal); font-weight: 700;">${formatTime(slot.start_time)}</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--charcoal-light);">
          Date: <strong>${slot.date}</strong> &bull; Location: <strong>${doctor.room_no || 'Room 101'}</strong>
        </div>
      </div>

      <form id="appointment-form" onsubmit="submitAppointment(event)">
        <div class="form-group">
          <label class="form-label">Patient Full Name *</label>
          <input type="text" id="appt-name" class="form-control" required value="${prefillName}" placeholder="e.g. Ramesh Kulkarni">
          <i class="fas fa-user form-icon"></i>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Patient Age *</label>
            <input type="number" id="appt-age" class="form-control" required min="1" max="120" value="${prefillAge}" placeholder="e.g. 34">
            <i class="fas fa-id-card form-icon"></i>
          </div>

          <div class="form-group">
            <label class="form-label">WhatsApp Number *</label>
            <input type="tel" id="appt-phone" class="form-control" required value="${prefillPhone}" placeholder="+91 9876543210">
            <i class="fab fa-whatsapp form-icon"></i>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Problem / Symptoms / Reason for Visit *</label>
          <input type="text" id="appt-disease" class="form-control" required placeholder="e.g. Chest pain, High fever, Routine checkup">
          <i class="fas fa-stethoscope form-icon"></i>
        </div>

        <div class="form-group">
          <label class="form-label">Additional Medical Notes (Optional)</label>
          <textarea id="appt-notes" class="form-control" rows="2" style="resize: none;" placeholder="Any allergies, previous medications or medical history..."></textarea>
        </div>

        <button type="submit" id="btn-submit-booking" class="btn btn-primary" style="width: 100%; font-size: 1.05rem; padding: 0.85rem;">
          <i class="fas fa-check-double"></i> Confirm & Generate Token
        </button>
      </form>
    </div>
  `;

  modal.classList.add('active');
}

// Submit Booking to Backend
async function submitAppointment(e) {
  e.preventDefault();
  if (!selectedSlot) return;

  const btn = document.getElementById('btn-submit-booking');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reserving Slot & Issuing Token...';
  }

  const patientName = document.getElementById('appt-name').value.trim();
  const age = document.getElementById('appt-age').value.trim();
  const phone = document.getElementById('appt-phone').value.trim();
  const disease = document.getElementById('appt-disease').value.trim();
  const notes = document.getElementById('appt-notes').value.trim();

  // Validate E.164 phone
  if (!phone.match(/^\+?[1-9]\d{9,14}$/)) {
    alert('Please enter a valid WhatsApp number with country code (e.g. +91 9876543210)');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check-double"></i> Confirm & Generate Token';
    }
    return;
  }

  try {
    const res = await fetch('/api/appointments/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_id: selectedSlot.id,
        patient_name: patientName,
        age: Number(age),
        disease,
        whatsapp_no: phone,
        notes
      })
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Slot booking failed');
    }

    closeModal('booking-modal');
    showBookingSuccessModal(data);
    fetchAndRenderSlots(selectedDoctorId, selectedDate);
  } catch (err) {
    alert(err.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check-double"></i> Confirm & Generate Token';
    }
  }
}

// Success Modal with Token and WhatsApp details
function showBookingSuccessModal(data) {
  let modal = document.getElementById('success-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'success-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  const appt = data.appointment;
  const whatsappUrl = `https://wa.me/${appt.whatsapp_no.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Hello ${appt.patient_name}, your appointment with ${appt.doctor_name} is confirmed on ${appt.date} at ${formatTime(appt.time)}. Token No: ${data.token}. Please arrive 10 minutes early.`
  )}`;

  modal.innerHTML = `
    <div class="modal-content" style="text-align: center;">
      <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(20, 187, 166, 0.15); color: var(--teal); display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin: 0 auto 1.25rem;">
        <i class="fas fa-check"></i>
      </div>

      <span class="tag-mint" style="margin-bottom: 0.5rem;">Appointment Confirmed</span>
      <h2 style="color: var(--deep-blue); margin-bottom: 0.25rem;">Your Token Number</h2>
      <div style="font-size: 3rem; font-weight: 800; color: var(--teal); letter-spacing: 0.08em; margin: 0.5rem 0;">
        ${data.token}
      </div>

      <div style="background: var(--light-gray); border-radius: 12px; padding: 1.25rem; text-align: left; margin: 1.25rem 0; font-size: 0.9rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
          <span style="color: var(--charcoal-light);">Patient:</span>
          <strong>${appt.patient_name} (${appt.age} yrs)</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
          <span style="color: var(--charcoal-light);">Doctor:</span>
          <strong>${appt.doctor_name}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
          <span style="color: var(--charcoal-light);">Time Slot:</span>
          <strong>${formatTime(appt.time)} (${appt.date})</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--charcoal-light);">Room:</span>
          <strong>${appt.room_no || 'Room 101'}</strong>
        </div>
      </div>

      <!-- WhatsApp Delivery Notice -->
      <div style="background: #E8F8F5; border: 1.5px solid #25D366; border-radius: 10px; padding: 0.9rem; margin-bottom: 1.5rem; text-align: left; display: flex; align-items: center; gap: 0.85rem;">
        <i class="fab fa-whatsapp" style="color: #25D366; font-size: 1.8rem; flex-shrink: 0;"></i>
        <div style="font-size: 0.82rem; color: #075E54; line-height: 1.35;">
          <strong>Instant WhatsApp Notification Sent:</strong><br>
          Confirmation with token and directions sent to <em>${appt.whatsapp_no}</em>.
        </div>
      </div>

      <div style="display: flex; gap: 0.75rem;">
        <a href="${whatsappUrl}" target="_blank" class="btn" style="flex: 1; background: #25D366; color: #FFF;">
          <i class="fab fa-whatsapp"></i> Chat on WhatsApp
        </a>
        <a href="queue.html" class="btn btn-secondary" style="flex: 1;">
          <i class="fas fa-list-ol"></i> View Live Queue
        </a>
      </div>
      <button class="btn btn-sm btn-outline-white" style="color: var(--charcoal-light); margin-top: 1rem;" onclick="closeModal('success-modal')">Close</button>
    </div>
  `;

  modal.classList.add('active');
}

// Global expose
window.openBookingModal = openBookingModal;
window.submitAppointment = submitAppointment;
window.closeModal = closeModal;
window.fetchAndRenderSlots = fetchAndRenderSlots;
