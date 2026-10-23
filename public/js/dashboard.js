/**
 * MediCare - Role-Based Dashboard Logic
 * Patient, Doctor, and Receptionist/Admin Dashboards
 */

let currentUser = null;
let currentRole = 'patient'; // 'patient' | 'doctor' | 'admin' | 'receptionist'

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});

async function initDashboard() {
  const token = localStorage.getItem('medicare_token');
  const userJson = localStorage.getItem('medicare_user');

  if (!token || !userJson) {
    // If not logged in, show default patient demo or prompt login
    if (window.openAuthModal) {
      window.openAuthModal('login');
    }
    return;
  }

  try {
    currentUser = JSON.parse(userJson);
    currentRole = currentUser.role || 'patient';
  } catch (e) {
    currentUser = { name: 'Demo Patient', role: 'patient' };
    currentRole = 'patient';
  }

  renderSidebarUser();
  setupRoleView(currentRole);
}

function renderSidebarUser() {
  const nameEl = document.getElementById('dash-user-name');
  const roleEl = document.getElementById('dash-user-role');
  if (nameEl) nameEl.textContent = currentUser?.name || 'User';
  if (roleEl) roleEl.textContent = (currentUser?.role || 'patient').toUpperCase();
}

// Switch between Patient, Doctor, and Admin views
function switchRoleView(role) {
  currentRole = role;
  setupRoleView(role);
}

function setupRoleView(role) {
  // Update sidebar active links
  document.querySelectorAll('.dash-nav-link').forEach(link => {
    link.classList.remove('active');
  });

  const activeLink = document.getElementById(`nav-${role}`);
  if (activeLink) activeLink.classList.add('active');

  const container = document.getElementById('dashboard-main-view');
  if (!container) return;

  if (role === 'doctor') {
    renderDoctorDashboard(container);
  } else if (role === 'admin' || role === 'receptionist') {
    renderAdminDashboard(container);
  } else {
    renderPatientDashboard(container);
  }
}

/* ==========================================================================
   PATIENT DASHBOARD
   ========================================================================== */
async function renderPatientDashboard(container) {
  container.innerHTML = `
    <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
      <div>
        <h2 style="color: var(--deep-blue);">My Patient Portal</h2>
        <p>Track your appointments, token status, and reschedule bookings.</p>
      </div>
      <a href="booking.html" class="btn btn-primary">
        <i class="fas fa-plus-circle"></i> Book New Appointment
      </a>
    </div>

    <!-- Quick Stats -->
    <div class="stat-cards-grid">
      <div class="stat-card">
        <div>
          <div class="stat-value" id="patient-stat-total">0</div>
          <div class="stat-label">Total Bookings</div>
        </div>
        <div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
      </div>
      <div class="stat-card">
        <div>
          <div class="stat-value" id="patient-stat-active">0</div>
          <div class="stat-label">Active / Waiting</div>
        </div>
        <div class="stat-icon" style="background: rgba(20,187,166,0.15); color: var(--teal);"><i class="fas fa-hourglass-half"></i></div>
      </div>
      <div class="stat-card">
        <div>
          <div class="stat-value" id="patient-stat-completed">0</div>
          <div class="stat-label">Completed Visits</div>
        </div>
        <div class="stat-icon" style="background: rgba(15,59,100,0.1); color: var(--deep-blue);"><i class="fas fa-user-check"></i></div>
      </div>
      <div class="stat-card">
        <div>
          <div class="stat-value" style="font-size: 1.25rem; color: var(--teal);">10 Mins</div>
          <div class="stat-label">Grace Period Allowed</div>
        </div>
        <div class="stat-icon"><i class="fas fa-shield-alt"></i></div>
      </div>
    </div>

    <!-- Appointments Table -->
    <div class="medicare-table-wrapper">
      <div style="padding: 1.25rem; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center;">
        <h3 style="font-size: 1.15rem; color: var(--deep-blue);">My Registered Appointments</h3>
        <span class="tag-mint" style="font-size: 0.75rem;"><i class="fas fa-sync"></i> Real-time Sync Active</span>
      </div>
      <div style="overflow-x: auto;">
        <table class="medicare-table">
          <thead>
            <tr>
              <th>Token No</th>
              <th>Doctor</th>
              <th>Date & Time</th>
              <th>Queue Position</th>
              <th>Status</th>
              <th>Check-in</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="patient-appts-tbody">
            <tr><td colspan="7" style="text-align: center; padding: 2rem;">Loading appointments...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  loadPatientAppointments();
}

async function loadPatientAppointments() {
  const tbody = document.getElementById('patient-appts-tbody');
  const statTotal = document.getElementById('patient-stat-total');
  const statActive = document.getElementById('patient-stat-active');
  const statCompleted = document.getElementById('patient-stat-completed');

  try {
    const res = await fetch('/api/appointments/my');
    const data = await res.json();

    if (!data.success || !tbody) return;

    const appts = data.appointments;
    if (statTotal) statTotal.textContent = appts.length;
    if (statActive) statActive.textContent = appts.filter(a => a.status === 'booked' || a.status === 'waiting').length;
    if (statCompleted) statCompleted.textContent = appts.filter(a => a.status === 'completed').length;

    if (appts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--charcoal-light);">
            <i class="fas fa-calendar-times" style="font-size: 2rem; color: var(--mint); margin-bottom: 0.5rem; display: block;"></i>
            You have no appointments booked yet. <a href="booking.html" style="font-weight: 700; color: var(--teal);">Book a Slot Now</a>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = '';
    appts.forEach(appt => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="color: var(--teal); font-size: 1.05rem;">${appt.token_no}</strong></td>
        <td>
          <strong>${appt.doctor_name}</strong><br>
          <small style="color: var(--charcoal-light);">${appt.department_name} &bull; ${appt.room_no}</small>
        </td>
        <td><strong>${appt.date}</strong><br><small style="color: var(--teal); font-weight: 600;">${appt.time}</small></td>
        <td><strong>#${appt.queue_position}</strong></td>
        <td><span class="queue-status-badge status-${appt.status}">${appt.status}</span></td>
        <td>
          ${appt.checked_in
            ? '<span style="color: var(--teal); font-weight: 700;"><i class="fas fa-check-circle"></i> Yes</span>'
            : `<button class="btn btn-sm btn-primary" onclick="handlePatientCheckIn(${appt.id})">Check In</button>`}
        </td>
        <td>
          ${appt.status !== 'completed' && appt.status !== 'cancelled' ? `
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-sm btn-secondary" onclick="openRescheduleModal(${appt.id}, ${appt.doctor_id}, '${appt.date}')">
                <i class="fas fa-calendar-alt"></i> Reschedule
              </button>
              <button class="btn btn-sm" style="color: var(--status-booked); background: rgba(229,72,77,0.1); border: none;" onclick="cancelAppointment(${appt.id})">
                Cancel
              </button>
            </div>
          ` : '-'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="color: red; text-align: center;">${err.message}</td></tr>`;
  }
}

async function handlePatientCheckIn(apptId) {
  try {
    const res = await fetch(`/api/appointments/${apptId}/check-in`, { method: 'POST' });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    if (window.showToast) window.showToast('You are checked in! Missed slot timer paused.', 'success');
    loadPatientAppointments();
  } catch (err) {
    alert(err.message);
  }
}

async function cancelAppointment(apptId) {
  if (!confirm('Are you sure you want to cancel this appointment and free the slot?')) return;
  try {
    const res = await fetch(`/api/appointments/${apptId}/cancel`, { method: 'POST' });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    if (window.showToast) window.showToast('Appointment cancelled successfully', 'info');
    loadPatientAppointments();
  } catch (err) {
    alert(err.message);
  }
}

// Reschedule Modal with Available Slot Grid
async function openRescheduleModal(appointmentId, doctorId, currentDate) {
  let modal = document.getElementById('reschedule-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'reschedule-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 style="color: var(--deep-blue);"><i class="fas fa-calendar-alt" style="color: var(--teal);"></i> Reschedule Appointment</h3>
        <button class="modal-close-btn" onclick="closeModal('reschedule-modal')">&times;</button>
      </div>
      <p style="font-size: 0.9rem; margin-bottom: 1rem;">Select an available time slot for your doctor to reschedule.</p>

      <div class="form-group">
        <label class="form-label">Select Date</label>
        <input type="date" id="reschedule-date" class="form-control" value="${currentDate}" min="${new Date().toISOString().split('T')[0]}">
      </div>

      <div id="reschedule-slots-box" style="margin: 1.25rem 0;">
        <p style="text-align: center; color: var(--charcoal-light);">Loading available slots...</p>
      </div>
    </div>
  `;
  modal.classList.add('active');

  const dateInput = document.getElementById('reschedule-date');
  const loadSlots = async (d) => {
    const box = document.getElementById('reschedule-slots-box');
    try {
      const res = await fetch(`/api/slots?doctor_id=${doctorId}&date=${d}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const availableSlots = data.slots.filter(s => s.status === 'available');
      if (availableSlots.length === 0) {
        box.innerHTML = '<p style="color: var(--status-booked); text-align: center;">No available slots on this date.</p>';
        return;
      }

      box.innerHTML = '<div class="slot-grid-matrix"></div>';
      const grid = box.querySelector('.slot-grid-matrix');
      availableSlots.forEach(s => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slot-btn slot-available';
        btn.innerHTML = `<span>${s.start_time}</span><small>Available</small>`;
        btn.onclick = () => confirmReschedule(appointmentId, s.id);
        grid.appendChild(btn);
      });
    } catch (e) {
      box.innerHTML = `<p style="color: red;">${e.message}</p>`;
    }
  };

  loadSlots(currentDate);
  dateInput.addEventListener('change', (e) => loadSlots(e.target.value));
}

async function confirmReschedule(appointmentId, newSlotId) {
  try {
    const res = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_slot_id: newSlotId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    closeModal('reschedule-modal');
    if (window.showToast) window.showToast('Appointment rescheduled! WhatsApp confirmation sent.', 'success');
    loadPatientAppointments();
  } catch (err) {
    alert(err.message);
  }
}

/* ==========================================================================
   DOCTOR DASHBOARD
   ========================================================================== */
async function renderDoctorDashboard(container) {
  const doctorId = currentUser?.doctor_id || 1;

  container.innerHTML = `
    <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
      <div>
        <h2 style="color: var(--deep-blue);">Doctor Consultation Desk</h2>
        <p>Call next patient, review clinical symptoms, and manage consultation status.</p>
      </div>
      <div style="display: flex; gap: 0.75rem;">
        <button class="btn btn-primary" onclick="handleDoctorCallNext(${doctorId})">
          <i class="fas fa-bullhorn"></i> Call Next Patient
        </button>
        <button class="btn btn-secondary" onclick="openDoctorScheduleModal(${doctorId})">
          <i class="fas fa-clock"></i> Working Hours
        </button>
      </div>
    </div>

    <!-- Doctor Live Status Panel -->
    <div style="background: var(--white); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); border-top: 3px solid var(--teal); padding: 1.5rem; margin-bottom: 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
      <div>
        <span class="tag-mint" style="margin-bottom: 0.4rem;">CONSULTATION ROOM ACTIVE</span>
        <h3 id="doc-active-name" style="color: var(--deep-blue);">Dr. Rajesh Sharma (Room 101)</h3>
      </div>
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <label style="font-size: 0.88rem; font-weight: 700; color: var(--deep-blue);">My Status:</label>
        <select id="doc-status-select" class="form-control" style="width: auto; padding: 0.5rem 1rem;" onchange="updateDoctorStatus(${doctorId}, this.value)">
          <option value="available">🟢 Available & Seeing Patients</option>
          <option value="in_consultation">🔵 In Consultation</option>
          <option value="on_break">🟡 On Short Break</option>
          <option value="off_duty">⚪ Off Duty</option>
        </select>
      </div>
    </div>

    <!-- Today's Queue for Doctor -->
    <div class="medicare-table-wrapper">
      <div style="padding: 1.25rem; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center;">
        <h3 style="font-size: 1.15rem; color: var(--deep-blue);">Today's Patient Queue</h3>
        <button class="btn btn-sm btn-secondary" onclick="loadDoctorQueue(${doctorId})"><i class="fas fa-sync"></i> Refresh</button>
      </div>
      <div style="overflow-x: auto;">
        <table class="medicare-table">
          <thead>
            <tr>
              <th>Token No</th>
              <th>Patient Name</th>
              <th>Age</th>
              <th>Symptoms / Disease</th>
              <th>Scheduled Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="doctor-queue-tbody">
            <tr><td colspan="7" style="text-align: center; padding: 2rem;">Loading doctor's queue...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  loadDoctorQueue(doctorId);
}

async function loadDoctorQueue(doctorId) {
  const tbody = document.getElementById('doctor-queue-tbody');
  try {
    const res = await fetch(`/api/queue?doctor_id=${doctorId}`);
    const data = await res.json();
    if (!data.success || !tbody) return;

    if (data.queue.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--charcoal-light);">
            No appointments scheduled for your room today.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = '';
    data.queue.forEach(item => {
      const tr = document.createElement('tr');
      const isCalling = item.status === 'in_progress';
      if (isCalling) tr.style.backgroundColor = 'rgba(20, 187, 166, 0.08)';

      tr.innerHTML = `
        <td><strong style="color: var(--teal); font-size: 1.05rem;">${item.token_no}</strong></td>
        <td><strong>${item.patient_name}</strong></td>
        <td>${item.age || '-'}</td>
        <td><span style="color: var(--deep-blue); font-weight: 500;">${item.disease || 'General Checkup'}</span></td>
        <td>${item.slot_time || '-'}</td>
        <td><span class="queue-status-badge status-${item.status}">${item.status}</span></td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            ${item.status === 'waiting' ? `
              <button class="btn btn-sm btn-primary" onclick="doctorCallSpecific(${item.id})">
                <i class="fas fa-phone-volume"></i> Call
              </button>
            ` : item.status === 'in_progress' ? `
              <button class="btn btn-sm btn-secondary" style="background: var(--deep-blue); color: #FFF;" onclick="doctorCompleteConsultation(${item.id})">
                <i class="fas fa-check"></i> Complete
              </button>
            ` : `
              <span style="color: var(--teal); font-size: 0.82rem; font-weight: 700;"><i class="fas fa-check-circle"></i> Done</span>
            `}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="color: red; text-align: center;">${err.message}</td></tr>`;
  }
}

async function handleDoctorCallNext(doctorId) {
  try {
    const res = await fetch('/api/queue/call-next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctor_id: doctorId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    if (data.patient) {
      if (window.showToast) window.showToast(`Now calling ${data.patient.patient_name} (${data.patient.token_no})`, 'success');
    } else {
      alert(data.message);
    }
    loadDoctorQueue(doctorId);
  } catch (err) {
    alert(err.message);
  }
}

async function doctorCallSpecific(queueId) {
  try {
    const res = await fetch('/api/queue/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue_id: queueId, status: 'in_progress' })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    loadDoctorQueue(currentUser?.doctor_id || 1);
  } catch (err) {
    alert(err.message);
  }
}

async function doctorCompleteConsultation(queueId) {
  try {
    const res = await fetch('/api/queue/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue_id: queueId, status: 'completed' })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    if (window.showToast) window.showToast('Consultation marked completed', 'info');
    loadDoctorQueue(currentUser?.doctor_id || 1);
  } catch (err) {
    alert(err.message);
  }
}

async function updateDoctorStatus(doctorId, status) {
  try {
    const res = await fetch(`/api/doctors/${doctorId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('medicare_token')}`
      },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    if (window.showToast) window.showToast(`Doctor status updated to ${status}`, 'success');
  } catch (err) {
    alert(err.message);
  }
}

/* ==========================================================================
   ADMIN / RECEPTIONIST DASHBOARD
   ========================================================================== */
async function renderAdminDashboard(container) {
  container.innerHTML = `
    <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
      <div>
        <h2 style="color: var(--deep-blue);">Hospital Operations & Queue Administration</h2>
        <p>Monitor patient flow, configure slot durations, grace periods, and export reports.</p>
      </div>
      <div style="display: flex; gap: 0.75rem;">
        <button class="btn btn-primary" onclick="exportDailyReport('print')">
          <i class="fas fa-print"></i> Print / PDF Report
        </button>
        <button class="btn btn-secondary" onclick="exportDailyReport('csv')">
          <i class="fas fa-file-excel"></i> Export Excel/CSV
        </button>
      </div>
    </div>

    <!-- Admin Counters -->
    <div class="stat-cards-grid">
      <div class="stat-card">
        <div>
          <div class="stat-value" id="admin-stat-staff">0</div>
          <div class="stat-label">Total Doctors & Staff</div>
        </div>
        <div class="stat-icon"><i class="fas fa-user-md"></i></div>
      </div>
      <div class="stat-card">
        <div>
          <div class="stat-value" id="admin-stat-patients">0</div>
          <div class="stat-label">Registered Patients</div>
        </div>
        <div class="stat-icon"><i class="fas fa-users"></i></div>
      </div>
      <div class="stat-card">
        <div>
          <div class="stat-value" id="admin-stat-today">0</div>
          <div class="stat-label">Today's Bookings</div>
        </div>
        <div class="stat-icon" style="background: rgba(20,187,166,0.15); color: var(--teal);"><i class="fas fa-calendar-day"></i></div>
      </div>
      <div class="stat-card">
        <div>
          <div class="stat-value" id="admin-stat-pending">0</div>
          <div class="stat-label">Pending Queue</div>
        </div>
        <div class="stat-icon" style="background: rgba(245,165,36,0.15); color: #D97706;"><i class="fas fa-user-clock"></i></div>
      </div>
    </div>

    <!-- Hospital Configuration Settings (Slot Duration & Grace Period) -->
    <div style="background: var(--white); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); border-top: 3px solid var(--teal); padding: 1.75rem; margin-bottom: 2rem;">
      <h3 style="font-size: 1.15rem; color: var(--deep-blue); margin-bottom: 1rem;">
        <i class="fas fa-sliders-h" style="color: var(--teal);"></i> System Slot & Queue Configuration
      </h3>
      <form id="admin-settings-form" onsubmit="saveHospitalSettings(event)" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; align-items: flex-end;">
        <div class="form-group" style="margin: 0;">
          <label class="form-label">Slot Duration (Minutes)</label>
          <select id="setting-slot-duration" class="form-control">
            <option value="15">15 Minutes per Slot</option>
            <option value="20">20 Minutes per Slot</option>
            <option value="30">30 Minutes per Slot</option>
          </select>
        </div>
        <div class="form-group" style="margin: 0;">
          <label class="form-label">Missed Slot Grace Period (Minutes)</label>
          <select id="setting-grace-period" class="form-control">
            <option value="5">5 Minutes</option>
            <option value="10">10 Minutes (Default)</option>
            <option value="15">15 Minutes</option>
          </select>
        </div>
        <div class="form-group" style="margin: 0;">
          <label class="form-label">Hospital Hotline</label>
          <input type="text" id="setting-hospital-phone" class="form-control" value="+91 98765 43210">
        </div>
        <div>
          <button type="submit" class="btn btn-primary" style="width: 100%;">
            <i class="fas fa-save"></i> Save Settings
          </button>
        </div>
      </form>
    </div>

    <!-- WhatsApp Logs & Notification Monitor -->
    <div class="medicare-table-wrapper" style="margin-bottom: 2rem;">
      <div style="padding: 1.25rem; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center;">
        <h3 style="font-size: 1.15rem; color: var(--deep-blue); display: flex; align-items: center; gap: 0.5rem;">
          <i class="fab fa-whatsapp" style="color: #25D366;"></i> WhatsApp Messages & Delivery Audit
        </h3>
        <span class="tag-mint" style="font-size: 0.72rem;">Cloud API / Twilio Simulation</span>
      </div>
      <div style="overflow-x: auto;">
        <table class="medicare-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Recipient Phone</th>
              <th>Message Content</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody id="admin-messages-tbody">
            <tr><td colspan="6" style="text-align: center; padding: 2rem;">Loading messages...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  loadAdminDashboardData();
}

async function loadAdminDashboardData() {
  try {
    const res = await fetch('/api/admin/dashboard');
    const data = await res.json();
    if (!data.success) return;

    const stats = data.stats;
    const staffEl = document.getElementById('admin-stat-staff');
    const patEl = document.getElementById('admin-stat-patients');
    const todayEl = document.getElementById('admin-stat-today');
    const pendEl = document.getElementById('admin-stat-pending');

    if (staffEl) staffEl.textContent = stats.total_staff;
    if (patEl) patEl.textContent = stats.total_patients;
    if (todayEl) todayEl.textContent = stats.today_appointments;
    if (pendEl) pendEl.textContent = stats.pending_queue;

    const slotDur = document.getElementById('setting-slot-duration');
    const grace = document.getElementById('setting-grace-period');
    const phone = document.getElementById('setting-hospital-phone');

    if (slotDur && stats.settings.slot_duration_min) slotDur.value = stats.settings.slot_duration_min;
    if (grace && stats.settings.grace_period_min) grace.value = stats.settings.grace_period_min;
    if (phone && stats.settings.hospital_phone) phone.value = stats.settings.hospital_phone;

    // Load WhatsApp messages
    const resMsg = await fetch('/api/admin/messages');
    const dataMsg = await resMsg.json();
    const msgTbody = document.getElementById('admin-messages-tbody');
    if (dataMsg.success && msgTbody) {
      if (dataMsg.messages.length === 0) {
        msgTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No messages sent yet.</td></tr>';
      } else {
        msgTbody.innerHTML = '';
        dataMsg.messages.slice(0, 10).forEach(m => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>#${m.id}</td>
            <td><strong>${m.recipient_phone}</strong></td>
            <td style="max-width: 320px; font-size: 0.82rem; line-height: 1.35;">${m.message_text}</td>
            <td><span class="tag-mint" style="font-size: 0.72rem;">${m.provider}</span></td>
            <td><span style="color: #25D366; font-weight: 700; text-transform: uppercase; font-size: 0.78rem;">${m.status}</span></td>
            <td style="font-size: 0.8rem; color: var(--charcoal-light);">${new Date(m.sent_at).toLocaleTimeString()}</td>
          `;
          msgTbody.appendChild(tr);
        });
      }
    }
  } catch (err) {
    console.error('Error loading admin data:', err);
  }
}

async function saveHospitalSettings(e) {
  e.preventDefault();
  const slot_duration_min = document.getElementById('setting-slot-duration').value;
  const grace_period_min = document.getElementById('setting-grace-period').value;
  const hospital_phone = document.getElementById('setting-hospital-phone').value;

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_duration_min, grace_period_min, hospital_phone })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    if (window.showToast) window.showToast('Hospital configuration updated successfully!', 'success');
  } catch (err) {
    alert(err.message);
  }
}

// Generate & Export Daily Report (Print / PDF / CSV)
async function exportDailyReport(type = 'print') {
  try {
    const res = await fetch('/api/admin/reports/daily');
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    const report = data.report;

    if (type === 'csv') {
      let csvContent = 'Token No,Patient Name,Doctor,Time,Status,Disease\n';
      report.appointments.forEach(a => {
        csvContent += `"${a.token_no}","${a.patient_name}","${a.doctor_name}","${a.time}","${a.status}","${a.disease}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `medicare_report_${report.report_date}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    // Print / PDF View Window
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html>
        <head>
          <title>MediCare Hospital Daily Report - ${report.report_date}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2D3748; padding: 2rem; }
            h1, h2, h3 { color: #0F3B64; margin-bottom: 0.5rem; }
            table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
            th, td { border: 1px solid #CBD5E0; padding: 0.6rem; text-align: left; font-size: 0.9rem; }
            th { background: #0F3B64; color: #FFF; }
            .badge { padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>MediCare Hospital & Medical Center</h2>
          <p><strong>Daily Operations & Queue Report</strong> &bull; Date: ${report.report_date} &bull; Generated: ${new Date().toLocaleTimeString()}</p>
          <hr>
          <h3>Summary Statistics</h3>
          <p>
            Total Bookings: <strong>${report.summary.total_booked}</strong> | 
            Completed: <strong>${report.summary.total_completed}</strong> | 
            Estimated Revenue: <strong>₹${report.summary.total_revenue}</strong> | 
            Avg Wait Time: <strong>~${report.summary.avg_wait_minutes} mins</strong>
          </p>
          
          <h3>Doctor Consultation Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialty</th>
                <th>Room</th>
                <th>Booked</th>
                <th>Completed</th>
                <th>Missed</th>
              </tr>
            </thead>
            <tbody>
              ${report.doctor_breakdown.map(d => `
                <tr>
                  <td>${d.doctor_name}</td>
                  <td>${d.specialty}</td>
                  <td>${d.room_no}</td>
                  <td>${d.total_appointments}</td>
                  <td>${d.completed}</td>
                  <td>${d.missed}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 2rem;">
            <button onclick="window.print()" style="padding: 0.6rem 1.2rem; background: #14BBA6; color: #FFF; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
              Print / Save as PDF
            </button>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
  } catch (err) {
    alert(err.message);
  }
}

// Global expose
window.switchRoleView = switchRoleView;
window.handlePatientCheckIn = handlePatientCheckIn;
window.cancelAppointment = cancelAppointment;
window.openRescheduleModal = openRescheduleModal;
window.confirmReschedule = confirmReschedule;
window.handleDoctorCallNext = handleDoctorCallNext;
window.doctorCallSpecific = doctorCallSpecific;
window.doctorCompleteConsultation = doctorCompleteConsultation;
window.updateDoctorStatus = updateDoctorStatus;
window.saveHospitalSettings = saveHospitalSettings;
window.exportDailyReport = exportDailyReport;
window.loadDoctorQueue = loadDoctorQueue;
