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

  // Check URL params (e.g. ?doctor=101 or ?doc=101 or ?dept=1)
  const urlParams = new URLSearchParams(window.location.search);
  const paramDept = urlParams.get('dept');
  const paramDoc = urlParams.get('doctor') || urlParams.get('doc');

  if (paramDoc) {
    try {
      const res = await fetch(`/api/doctors/${paramDoc}`);
      const data = await res.json();
      if (data.success && data.doctor) {
        const doc = data.doctor;
        if (deptSelect && doc.department_id) {
          deptSelect.value = doc.department_id;
        }
        selectedDoctorId = Number(doc.id);
        await loadDoctorsByDepartment(doc.department_id);
        if (doctorSelect) {
          doctorSelect.value = doc.id;
        }
        fetchAndRenderSlots(selectedDoctorId, selectedDate);
      } else {
        await loadDoctorsByDepartment(paramDept || null);
      }
    } catch (e) {
      console.error('Failed to preselect doctor from URL param:', e);
      await loadDoctorsByDepartment(paramDept || null);
    }
  } else if (paramDept && deptSelect) {
    deptSelect.value = paramDept;
    await loadDoctorsByDepartment(paramDept);
  } else {
    // By default load all doctors
    await loadDoctorsByDepartment(null);
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
        const spec = doc.specialty || doc.specialization || doc.department_name;
        const rm = doc.room_no || doc.room || 'OPD';
        opt.textContent = `${doc.name} - ${spec} (${rm})`;
        doctorSelect.appendChild(opt);
      });

      // If doctor is already specified (e.g. from URL param), select them
      if (selectedDoctorId && data.doctors.some(d => d.id === selectedDoctorId)) {
        doctorSelect.value = selectedDoctorId;
      } else if (data.doctors.length > 0 && !selectedDoctorId) {
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
let currentDoctor = null;
let activeHoldTimer = null;

// Dynamically load Razorpay Checkout SDK only when needed
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const existing = document.getElementById('razorpay-checkout-js');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Razorpay));
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay SDK')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error('Unable to connect to Razorpay Payment Gateway. Check internet connection.'));
    document.head.appendChild(script);
  });
}

// Payment mode toggle helper
function onPaymentModeChange(mode) {
  const btn = document.getElementById('btn-submit-booking');
  const labelHosp = document.getElementById('label-pay-hospital');
  const labelOnline = document.getElementById('label-pay-online');
  const fee = (currentDoctor && currentDoctor.consultation_fee && Number(currentDoctor.consultation_fee) > 0)
    ? Number(currentDoctor.consultation_fee)
    : 0;

  if (mode === 'online') {
    if (labelOnline) {
      labelOnline.style.borderColor = 'var(--teal)';
      labelOnline.style.background = 'rgba(20, 187, 166, 0.06)';
      labelOnline.style.borderWidth = '2px';
    }
    if (labelHosp) {
      labelHosp.style.borderColor = 'var(--border-color)';
      labelHosp.style.background = '#FFF';
      labelHosp.style.borderWidth = '1px';
    }
    if (btn) {
      btn.innerHTML = `<i class="fas fa-lock"></i> Pay Rs. ${fee} & Confirm Slot`;
    }
  } else {
    if (labelHosp) {
      labelHosp.style.borderColor = 'var(--teal)';
      labelHosp.style.background = 'rgba(20, 187, 166, 0.06)';
      labelHosp.style.borderWidth = '2px';
    }
    if (labelOnline) {
      labelOnline.style.borderColor = 'var(--border-color)';
      labelOnline.style.background = '#FFF';
      labelOnline.style.borderWidth = '1px';
    }
    if (btn) {
      btn.innerHTML = `<i class="fas fa-check-double"></i> Confirm & Generate Token`;
    }
  }
}

// Open Booking Popup Modal for Selected Slot
function openBookingModal(slot, doctor) {
  selectedSlot = slot;
  currentDoctor = doctor;

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

  // Check if doctor has a valid consultation fee > 0
  const fee = (doctor && doctor.consultation_fee && Number(doctor.consultation_fee) > 0)
    ? Number(doctor.consultation_fee)
    : 0;

  // Build Payment Mode HTML:
  // Payment is OPTIONAL. Default is "Pay at hospital".
  // Show "Pay online" ONLY if fee > 0. If fee is empty/0, hide online payment completely!
  let paymentHtml = '<input type="hidden" name="payment_mode" value="hospital">';
  if (fee > 0) {
    paymentHtml = `
      <div class="form-group" style="margin-top: 1.25rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
        <label class="form-label" style="font-weight: 700; color: var(--deep-blue); display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
          <span><i class="fas fa-credit-card" style="color: var(--teal); margin-right: 6px;"></i> Payment Method</span>
          <span class="tag-mint" style="font-size: 0.75rem;">OPD Fee: Rs. ${fee}</span>
        </label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <label id="label-pay-hospital" class="payment-method-option" style="display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.75rem 0.85rem; border: 2px solid var(--teal); border-radius: 8px; cursor: pointer; background: rgba(20, 187, 166, 0.06); transition: all 0.2s ease;">
            <input type="radio" name="payment_mode" value="hospital" checked style="margin-top: 3px;" onchange="onPaymentModeChange('hospital')">
            <div>
              <strong style="display: block; font-size: 0.88rem; color: var(--deep-blue);">Pay at hospital</strong>
              <small style="color: var(--text-muted); font-size: 0.75rem; line-height: 1.3; display: block;">Default &bull; Pay cash / UPI at OPD counter on arrival</small>
            </div>
          </label>
          <label id="label-pay-online" class="payment-method-option" style="display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.75rem 0.85rem; border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; background: #FFF; transition: all 0.2s ease;">
            <input type="radio" name="payment_mode" value="online" style="margin-top: 3px;" onchange="onPaymentModeChange('online')">
            <div>
              <strong style="display: block; font-size: 0.88rem; color: var(--deep-blue);">Pay online (Rs. ${fee})</strong>
              <small style="color: var(--text-muted); font-size: 0.75rem; line-height: 1.3; display: block;">Instant confirmed pass via Razorpay</small>
            </div>
          </label>
        </div>
      </div>
    `;
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
      <div style="background: var(--light-gray); border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; border-left: 4px solid var(--teal);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
          <strong style="color: var(--deep-blue);">${doctor.name}</strong>
          <span style="color: var(--teal); font-weight: 700;">${formatTime(slot.start_time)}</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--charcoal-light);">
          Date: <strong>${slot.date}</strong> &bull; Location: <strong>${doctor.room_no || 'Room 101'}</strong>
          ${fee > 0 ? ` &bull; OPD Fee: <strong>Rs. ${fee}</strong>` : ''}
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

        ${paymentHtml}

        <button type="submit" id="btn-submit-booking" class="btn btn-primary" style="width: 100%; font-size: 1.05rem; padding: 0.85rem; margin-top: 1rem;">
          <i class="fas fa-check-double"></i> Confirm & Generate Token
        </button>
      </form>
    </div>
  `;

  modal.classList.add('active');
}

// Submit Booking to Backend (Pay at Hospital or Razorpay Online Payment)
async function submitAppointment(e) {
  e.preventDefault();
  if (!selectedSlot) return;

  const btn = document.getElementById('btn-submit-booking');
  const patientName = document.getElementById('appt-name').value.trim();
  const age = document.getElementById('appt-age').value.trim();
  const phone = document.getElementById('appt-phone').value.trim();
  const disease = document.getElementById('appt-disease').value.trim();
  const notes = document.getElementById('appt-notes').value.trim();

  // Validate E.164 phone
  if (!phone.match(/^\+?[1-9]\d{9,14}$/)) {
    alert('Please enter a valid WhatsApp number with country code (e.g. +91 9876543210)');
    return;
  }

  const modeEl = document.querySelector('input[name="payment_mode"]:checked') || document.querySelector('input[name="payment_mode"]');
  const paymentMode = modeEl ? modeEl.value : 'hospital';

  // 1. DEFAULT FLOW: Pay at hospital
  if (paymentMode === 'hospital') {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reserving Slot & Issuing Token...';
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
      showBookingSuccessModal(data, false);
      fetchAndRenderSlots(selectedDoctorId, selectedDate);
    } catch (err) {
      alert(err.message);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-double"></i> Confirm & Generate Token';
      }
    }
    return;
  }

  // 2. OPTIONAL ONLINE PAYMENT FLOW: Razorpay TEST MODE
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reserving Slot & Launching Payment...';
  }

  const payload = {
    slot_id: selectedSlot.id,
    patient_name: patientName,
    age: Number(age),
    disease,
    whatsapp_no: phone,
    notes
  };

  try {
    const res = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const orderData = await res.json();
    if (!res.ok || !orderData.success) {
      throw new Error(orderData.message || 'Failed to initialize online payment order.');
    }

    // Slot is now held with status: 'pending_payment' for 10 minutes
    closeModal('booking-modal');

    // Load Razorpay Checkout SDK dynamically
    let RazorpaySDK;
    try {
      RazorpaySDK = await loadRazorpayScript();
    } catch (sdkErr) {
      // If SDK fails to load, prompt user with hold modal so they don't lose the slot
      showHoldCountdownModal(orderData, currentDoctor, selectedSlot, payload, sdkErr.message);
      return;
    }

    // Launch Razorpay Checkout
    launchRazorpayCheckout(orderData, currentDoctor, selectedSlot, payload, RazorpaySDK);

  } catch (err) {
    alert(err.message);
    if (btn) {
      btn.disabled = false;
      const fee = (currentDoctor && currentDoctor.consultation_fee) || 0;
      btn.innerHTML = `<i class="fas fa-lock"></i> Pay Rs. ${fee} & Confirm Slot`;
    }
    fetchAndRenderSlots(selectedDoctorId, selectedDate);
  }
}

// Launch Razorpay Checkout Modal
function launchRazorpayCheckout(orderData, doctor, slot, patientData, RazorpaySDK) {
  const options = {
    key: orderData.key_id,
    amount: orderData.amount,
    currency: orderData.currency || 'INR',
    name: 'Sanjeevan Hospital',
    description: `OPD Consultation - ${doctor.name}`,
    image: '/images/sanjeevan-logo.svg',
    order_id: orderData.order_id,
    prefill: {
      name: patientData.patient_name,
      contact: patientData.whatsapp_no
    },
    theme: {
      color: '#2563EB'
    },
    handler: async function (response) {
      // response: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
      await verifyPaymentAndShowSuccess(response, orderData, doctor, slot);
    },
    modal: {
      ondismiss: function () {
        // Patient closed popup without paying - show 10-minute hold countdown modal
        showHoldCountdownModal(orderData, doctor, slot, patientData);
      }
    }
  };

  const rzp = new RazorpaySDK(options);
  rzp.on('payment.failed', function (resp) {
    const errorMsg = resp.error?.description || 'Payment was declined or failed.';
    showHoldCountdownModal(orderData, doctor, slot, patientData, errorMsg);
  });
  rzp.open();
}

// Verify Payment with Backend
async function verifyPaymentAndShowSuccess(paymentResponse, orderData, doctor, slot) {
  try {
    const res = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature
      })
    });

    const verifyData = await res.json();
    if (!res.ok || !verifyData.success) {
      throw new Error(verifyData.message || 'Payment verification failed');
    }

    // Clear any active hold countdown timer
    if (activeHoldTimer) {
      clearInterval(activeHoldTimer);
      activeHoldTimer = null;
    }
    closeModal('hold-modal');

    // Display confirmation success modal with PAID badge
    showBookingSuccessModal(verifyData, true);
    fetchAndRenderSlots(selectedDoctorId, selectedDate);

  } catch (err) {
    alert('Payment verification issue: ' + err.message);
    showHoldCountdownModal(orderData, doctor, slot, {}, err.message);
  }
}

// 10-Minute Hold Countdown Modal with Retry & Release Slot Options
function showHoldCountdownModal(orderData, doctor, slot, patientData, errorMsg = null) {
  let modal = document.getElementById('hold-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hold-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  const fee = orderData.amount ? (orderData.amount / 100) : (doctor.consultation_fee || 0);

  modal.innerHTML = `
    <div class="modal-content" style="text-align: center; max-width: 480px;">
      <div style="width: 58px; height: 58px; border-radius: 50%; background: rgba(245, 165, 36, 0.15); color: #D97706; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; margin: 0 auto 0.75rem;">
        <i class="fas fa-hourglass-half"></i>
      </div>

      <span class="tag-mint" style="background: rgba(245, 165, 36, 0.15); color: #D97706; font-weight: 700; margin-bottom: 0.35rem;">
        Payment Pending &bull; Slot Held
      </span>
      <h3 style="color: var(--deep-blue); margin-bottom: 0.25rem;">Slot Reserved Exclusively</h3>
      <p style="font-size: 0.88rem; color: var(--charcoal-light); margin-bottom: 1rem;">
        Your consultation slot with <strong>${doctor.name}</strong> on <strong>${slot.date} (${formatTime(slot.start_time)})</strong> is on hold for 10 minutes so no other patient can take it.
      </p>

      ${errorMsg ? `
        <div style="background: #FEE2E2; border: 1px solid #FCA5A5; color: #B91C1C; padding: 0.75rem; border-radius: 8px; font-size: 0.84rem; margin-bottom: 1rem; text-align: left;">
          <i class="fas fa-exclamation-circle" style="margin-right: 5px;"></i> ${errorMsg}
        </div>
      ` : ''}

      <!-- Countdown Display -->
      <div style="background: var(--light-gray); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem; border: 1.5px dashed var(--teal);">
        <div style="font-size: 0.78rem; text-transform: uppercase; color: var(--charcoal-light); font-weight: 700; letter-spacing: 0.05em; margin-bottom: 0.25rem;">
          Hold Expires In
        </div>
        <div id="hold-countdown-timer" style="font-size: 2.4rem; font-weight: 800; color: var(--teal); letter-spacing: 0.05em;">
          10:00
        </div>
        <small style="color: var(--charcoal-light); font-size: 0.75rem;">If not paid before expiry, the slot is automatically released to other patients.</small>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; flex-direction: column; gap: 0.6rem;">
        <button type="button" id="btn-retry-payment" class="btn btn-primary" style="width: 100%; font-size: 1rem; padding: 0.75rem;" onclick="retryHeldPayment()">
          <i class="fas fa-redo"></i> Complete Payment (Rs. ${fee})
        </button>
        <button type="button" class="btn btn-outline-white" style="width: 100%; border-color: var(--border-color); color: var(--status-booked); font-size: 0.88rem; padding: 0.6rem;" onclick="releaseHeldSlot(${orderData.appointment_id})">
          <i class="fas fa-times-circle"></i> Cancel & Release Slot Now
        </button>
      </div>
    </div>
  `;

  modal.classList.add('active');

  // Start countdown
  if (activeHoldTimer) clearInterval(activeHoldTimer);

  const expiresAtMs = orderData.hold_expires_at
    ? new Date(orderData.hold_expires_at).getTime()
    : Date.now() + 10 * 60 * 1000;

  function updateTimer() {
    const now = Date.now();
    const remainingSec = Math.max(0, Math.floor((expiresAtMs - now) / 1000));
    const m = Math.floor(remainingSec / 60);
    const s = remainingSec % 60;
    const timerEl = document.getElementById('hold-countdown-timer');
    if (timerEl) {
      timerEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    if (remainingSec <= 0) {
      clearInterval(activeHoldTimer);
      activeHoldTimer = null;
      if (timerEl) {
        timerEl.textContent = '00:00 (Expired)';
        timerEl.style.color = '#EF4444';
      }
      const retryBtn = document.getElementById('btn-retry-payment');
      if (retryBtn) {
        retryBtn.disabled = true;
        retryBtn.textContent = 'Hold Expired';
      }
      fetchAndRenderSlots(selectedDoctorId, selectedDate);
    }
  }

  updateTimer();
  activeHoldTimer = setInterval(updateTimer, 1000);

  // Store for retry
  window._activeOrderForRetry = { orderData, doctor, slot, patientData };
}

// Retry payment on held slot
async function retryHeldPayment() {
  if (!window._activeOrderForRetry) return;
  const { orderData, doctor, slot, patientData } = window._activeOrderForRetry;
  try {
    const RazorpaySDK = await loadRazorpayScript();
    launchRazorpayCheckout(orderData, doctor, slot, patientData, RazorpaySDK);
  } catch (err) {
    alert(err.message);
  }
}

// Release held slot immediately
async function releaseHeldSlot(appointmentId) {
  if (activeHoldTimer) {
    clearInterval(activeHoldTimer);
    activeHoldTimer = null;
  }
  closeModal('hold-modal');

  try {
    await fetch('/api/payments/release-hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: appointmentId })
    });
    if (window.showToast) {
      window.showToast('Slot released successfully', 'info');
    }
  } catch (e) {
    console.warn('Could not release slot:', e);
  }

  fetchAndRenderSlots(selectedDoctorId, selectedDate);
}

// Download QR code helper
function downloadQRCode(dataUrl, token) {
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `HealPath-QR-Checkin-${token}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Success Modal with QR Check-in Card, Token, WhatsApp details and Paid Badge
async function showBookingSuccessModal(data, isPaid = false) {
  let modal = document.getElementById('success-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'success-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  const appt = data.appointment || {};
  let qrUrl = data.qr || appt.qr;

  // Determine if paid online
  const isOnlinePaid = isPaid || appt.payment_status === 'paid' || data.payment_status === 'paid';
  const paidAmount = appt.amount ? (appt.amount / 100) : (data.amount ? (data.amount / 100) : 0);

  // If QR is not in response, fetch on-demand
  if (!qrUrl && data.token) {
    try {
      const qrRes = await fetch(`/api/appointments/${encodeURIComponent(data.token)}/qr`);
      const qrData = await qrRes.json();
      if (qrData.success && qrData.qr) {
        qrUrl = qrData.qr;
      }
    } catch (e) {
      console.warn('Could not fetch QR code:', e);
    }
  }

  const checkinFullUrl = `${window.location.origin}/checkin.html?token=${encodeURIComponent(data.token || appt.token_no)}&sig=${encodeURIComponent(data.sig || '')}`;

  const shareText = `🏥 *HealPath Hospital - Fast Check-in QR Pass*
👤 *Patient:* ${appt.patient_name} (${appt.age} yrs)
🔖 *Token Number:* ${data.token || appt.token_no}
👨‍⚕️ *Doctor:* ${appt.doctor_name}
⏰ *Slot Time:* ${formatTime(appt.time)} (${appt.date})
📍 *Room:* ${appt.room_no || 'Room 101'}
💳 *Payment:* ${isOnlinePaid ? 'Paid Online (Rs. ' + paidAmount + ')' : 'Pay at Hospital Counter'}
📲 *Self Check-in Pass:* ${checkinFullUrl}

Please present this QR at the reception desk for instant arrival check-in.`;

  const shareWhatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  modal.innerHTML = `
    <div class="modal-content" style="text-align: center; max-width: 520px; max-height: 90vh; overflow-y: auto;">
      <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(20, 187, 166, 0.15); color: var(--teal); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto 0.75rem;">
        <i class="fas fa-check"></i>
      </div>

      <div style="display: flex; justify-content: center; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
        <span class="tag-mint">Appointment Confirmed</span>
        ${isOnlinePaid ? `
          <span class="badge" style="background: rgba(20, 187, 166, 0.15); color: var(--teal); font-weight: 700; font-size: 0.8rem; padding: 0.25rem 0.65rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.35rem;">
            <i class="fas fa-shield-alt"></i> Paid Online (Rs. ${paidAmount})
          </span>
        ` : `
          <span class="badge" style="background: rgba(15, 59, 100, 0.08); color: var(--deep-blue); font-weight: 600; font-size: 0.8rem; padding: 0.25rem 0.65rem; border-radius: 6px;">
            <i class="fas fa-hospital"></i> Pay at Hospital
          </span>
        `}
      </div>

      <h2 style="color: var(--deep-blue); margin-bottom: 0.2rem; font-size: 1.5rem;">Your Token Number</h2>
      <div style="font-size: 2.6rem; font-weight: 800; color: var(--teal); letter-spacing: 0.08em; margin: 0.25rem 0;">
        ${data.token || appt.token_no}
      </div>

      <!-- QR Check-in Card (Mandated in Spec) -->
      <div style="background: #FFFFFF; border: 2px solid var(--teal); border-radius: 16px; padding: 1.25rem; margin: 1rem 0; box-shadow: 0 4px 18px rgba(20, 187, 166, 0.12);">
        <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 0.75rem; color: var(--deep-blue);">
          <i class="fas fa-qrcode" style="color: var(--teal); font-size: 1.15rem;"></i>
          <strong style="font-size: 0.95rem;">Arrival QR Check-in Pass</strong>
        </div>

        ${qrUrl ? `
          <img id="booking-qr-img" src="${qrUrl}" alt="Check-in QR Code" style="width: 180px; height: 180px; display: block; margin: 0 auto; border-radius: 10px; border: 1px solid var(--light-gray); padding: 5px; background: #FFF;">
        ` : `
          <div style="padding: 2rem; color: var(--charcoal-light);">Generating QR Pass...</div>
        `}

        <div style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--charcoal-light); line-height: 1.4;">
          Present this QR pass to the receptionist upon hospital arrival to immediately stop the 10-minute missed slot timer.
        </div>

        <!-- Download QR & Share on WhatsApp Buttons -->
        <div style="display: flex; gap: 0.6rem; margin-top: 1rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-sm btn-secondary" style="flex: 1; min-width: 140px;" onclick="downloadQRCode('${qrUrl}', '${data.token || appt.token_no}')">
            <i class="fas fa-download"></i> Download QR
          </button>
          <a href="${shareWhatsappUrl}" target="_blank" class="btn btn-sm" style="flex: 1; min-width: 140px; background: #25D366; color: #FFF;">
            <i class="fab fa-whatsapp"></i> Share on WhatsApp
          </a>
        </div>
      </div>

      <!-- Appointment Details Summary -->
      <div style="background: var(--light-gray); border-radius: 12px; padding: 1rem 1.25rem; text-align: left; margin: 1rem 0; font-size: 0.88rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
          <span style="color: var(--charcoal-light);">Patient:</span>
          <strong>${appt.patient_name} (${appt.age} yrs)</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
          <span style="color: var(--charcoal-light);">Doctor:</span>
          <strong>${appt.doctor_name}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
          <span style="color: var(--charcoal-light);">Slot Time:</span>
          <strong>${formatTime(appt.time)} (${appt.date})</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
          <span style="color: var(--charcoal-light);">Consultation Room:</span>
          <strong>${appt.room_no || 'Room 101'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding-top: 0.35rem; border-top: 1px dashed var(--border-color); margin-top: 0.35rem;">
          <span style="color: var(--charcoal-light);">OPD Fee & Payment:</span>
          <strong style="color: ${isOnlinePaid ? 'var(--teal)' : 'var(--deep-blue)'};">
            ${isOnlinePaid ? `Paid Online (Rs. ${paidAmount})` : 'Pay at Hospital Counter'}
          </strong>
        </div>
      </div>

      <!-- Actions -->
      <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
        <a href="queue.html" class="btn btn-primary" style="flex: 1;">
          <i class="fas fa-list-ol"></i> View Live Queue
        </a>
        <button class="btn btn-outline-white" style="color: var(--charcoal-light); border-color: var(--light-gray);" onclick="closeModal('success-modal')">
          Close
        </button>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

// Global expose
window.openBookingModal = openBookingModal;
window.downloadQRCode = downloadQRCode;
window.onPaymentModeChange = onPaymentModeChange;
window.retryHeldPayment = retryHeldPayment;
window.releaseHeldSlot = releaseHeldSlot;
window.submitAppointment = submitAppointment;
window.closeModal = closeModal;
window.fetchAndRenderSlots = fetchAndRenderSlots;

