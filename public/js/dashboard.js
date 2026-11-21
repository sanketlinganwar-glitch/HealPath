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
  const token = localStorage.getItem('healpath_token') || localStorage.getItem('medicare_token');
  const userJson = localStorage.getItem('healpath_user') || localStorage.getItem('medicare_user');

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
              <th>Token & QR Pass</th>
              <th>Doctor</th>
              <th>Date & Time</th>
              <th>Queue Position</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Check-in</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="patient-appts-tbody">
            <tr><td colspan="8" style="text-align: center; padding: 2rem;">Loading appointments...</td></tr>
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
          <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--charcoal-light);">
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

      // Payment badge for patient
      let paymentBadge = '<span class="badge" style="background: rgba(15, 59, 100, 0.08); color: var(--deep-blue); font-weight: 600; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;"><i class="fas fa-hospital"></i> Pay at Hospital</span>';
      if (appt.payment_status === 'paid') {
        const amtStr = appt.amount ? ` (Rs. ${appt.amount / 100})` : '';
        paymentBadge = `<span class="badge" style="background: rgba(20, 187, 166, 0.15); color: var(--teal); font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;"><i class="fas fa-check-circle"></i> Paid${amtStr}</span>`;
      } else if (appt.payment_status === 'refund_due') {
        paymentBadge = `<span class="badge" style="background: rgba(234, 88, 12, 0.15); color: #EA580C; font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;"><i class="fas fa-undo"></i> Refund Due</span>`;
      } else if (appt.payment_status === 'refunded') {
        paymentBadge = `<span class="badge" style="background: rgba(100, 116, 139, 0.15); color: #64748B; font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;"><i class="fas fa-receipt"></i> Refunded</span>`;
      } else if (appt.status === 'pending_payment') {
        paymentBadge = `<span class="badge" style="background: rgba(245, 165, 36, 0.15); color: #D97706; font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;"><i class="fas fa-clock"></i> Payment Pending</span>`;
      }

      tr.innerHTML = `
        <td>
          <strong style="color: var(--teal); font-size: 1.05rem;">${appt.token_no}</strong><br>
          <button type="button" class="btn btn-sm btn-outline-white" style="color: var(--teal); border: 1.5px solid var(--teal); margin-top: 4px; padding: 0.15rem 0.5rem; font-size: 0.75rem; border-radius: 6px; cursor: pointer;" onclick="viewAppointmentQR('${appt.token_no}')">
            <i class="fas fa-qrcode"></i> View QR
          </button><br>
          <button type="button" class="btn btn-sm" style="color: var(--deep-blue); background: rgba(15, 59, 100, 0.08); border: 1px solid rgba(15, 59, 100, 0.2); margin-top: 4px; padding: 0.15rem 0.5rem; font-size: 0.75rem; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="openPatientReportsModal(${appt.id}, '${appt.token_no}', '${(appt.doctor_name || 'Doctor').replace(/'/g, "\\'")}', '${appt.status}')">
            <i class="fas fa-file-medical" style="color: var(--teal);"></i> Upload reports
          </button>
        </td>

        <td>
          <strong>${appt.doctor_name}</strong><br>
          <small style="color: var(--charcoal-light);">${appt.department_name} &bull; ${appt.room_no}</small>
        </td>
        <td><strong>${appt.date}</strong><br><small style="color: var(--teal); font-weight: 600;">${appt.time}</small></td>
        <td><strong>#${appt.queue_position}</strong></td>
        <td>${paymentBadge}</td>
        <td><span class="queue-status-badge status-${appt.status}">${appt.status}</span></td>
        <td>
          ${appt.checked_in
            ? '<span style="color: var(--teal); font-weight: 700;"><i class="fas fa-check-circle"></i> Yes</span>'
            : `<button class="btn btn-sm btn-primary" onclick="handlePatientCheckIn(${appt.id})">Check In</button>`}
        </td>
        <td>
          ${appt.status !== 'completed' && appt.status !== 'cancelled' ? `
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
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
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="handleDoctorCallNext(${doctorId})">
          <i class="fas fa-bullhorn"></i> Call Next Patient
        </button>
        <button class="btn btn-secondary" onclick="openDoctorSelfEditProfileModal(${doctorId})">
          <i class="fas fa-user-edit"></i> Edit Profile
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
          <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
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
            <button class="btn btn-sm btn-outline-white" style="color: var(--teal); border: 1.5px solid var(--teal); padding: 0.2rem 0.5rem; font-size: 0.78rem; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="openDoctorReportsViewer(${item.appointment_id}, '${(item.patient_name || 'Patient').replace(/'/g, "\\'")}', '${item.token_no}')">
              <i class="fas fa-file-medical"></i> Reports
            </button>
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
        'Authorization': `Bearer ${localStorage.getItem('healpath_token') || localStorage.getItem('medicare_token')}`
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
    <!-- Sub-tab Navigation between Operations and Analytics -->
    <div class="admin-subtab-nav" style="margin-bottom: 1.75rem;">
      <button type="button" id="btn-admin-tab-ops" class="admin-subtab-btn ${currentAdminTab === 'operations' ? 'active' : ''}" onclick="switchAdminSubTab('operations')">
        <i class="fas fa-tasks"></i> <span data-i18n="admin.tab_operations">Hospital Operations</span>
      </button>
      <button type="button" id="btn-admin-tab-analytics" class="admin-subtab-btn ${currentAdminTab === 'analytics' ? 'active' : ''}" onclick="switchAdminSubTab('analytics')">
        <i class="fas fa-chart-line"></i> <span data-i18n="admin.tab_analytics">Analytics & Trends</span>
      </button>
    </div>

    <!-- Subview 1: Operations -->
    <div id="admin-subview-operations" style="${currentAdminTab === 'operations' ? 'display: block;' : 'display: none;'}">
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

    <!-- Receptionist QR Check-in Desk Panel (HTML5-QRCode Camera + Manual Fallback) -->
    <div class="card" style="margin-bottom: 2rem; border-top: 3px solid var(--teal); padding: 1.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <h3 style="font-size: 1.2rem; color: var(--deep-blue); display: flex; align-items: center; gap: 0.6rem;">
            <i class="fas fa-qrcode" style="color: var(--teal);"></i> Receptionist Arrival QR Check-in Desk
          </h3>
          <p style="font-size: 0.88rem; color: var(--charcoal-light); margin: 0.2rem 0 0;">
            Scan patient digital QR pass or enter token manually. Immediately confirms arrival and halts the 10-minute missed-slot timer.
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span id="qr-scan-status-badge" class="tag-mint" style="font-size: 0.75rem;">Scanner Ready</span>
          <button type="button" class="btn btn-sm btn-outline-white" style="color: var(--deep-blue); border-color: var(--light-gray); font-size: 0.75rem;" onclick="ensureReceptionistAuth()">
            <i class="fas fa-user-shield"></i> Auth: <span id="auth-role-display">Staff</span>
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; align-items: start;">
        
        <!-- Left: Live Optical Camera Viewport -->
        <div style="background: var(--light-gray); border-radius: 12px; padding: 1.25rem; text-align: center;">
          <h4 style="font-size: 0.95rem; color: var(--deep-blue); margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <i class="fas fa-camera"></i> Live Optical Camera Scanner
          </h4>

          <div id="qr-reader" style="width: 100%; max-width: 360px; min-height: 240px; margin: 0 auto; border-radius: 10px; overflow: hidden; background: #FFF; box-shadow: 0 2px 8px rgba(0,0,0,0.06);"></div>

          <div style="display: flex; justify-content: center; gap: 0.75rem; margin-top: 1rem;">
            <button id="btn-start-scanner" type="button" class="btn btn-sm btn-primary" onclick="startQRScanner()">
              <i class="fas fa-video"></i> Start Camera Scan
            </button>
            <button id="btn-stop-scanner" type="button" class="btn btn-sm btn-secondary" onclick="stopQRScanner()" style="display: none;">
              <i class="fas fa-stop-circle"></i> Stop Camera
            </button>
          </div>
          <p id="qr-camera-hint" style="font-size: 0.75rem; color: var(--charcoal-light); margin-top: 0.5rem;">
            Hold patient QR code steadily in front of the lens.
          </p>
        </div>

        <!-- Right: Manual Fallback Input & Live Scan Status Feedback -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- Manual Fallback Form -->
          <div style="background: #FFF; border: 1.5px solid var(--light-gray); border-radius: 12px; padding: 1.25rem;">
            <h4 style="font-size: 0.95rem; color: var(--deep-blue); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-keyboard" style="color: var(--teal);"></i> Manual Token Check-in Fallback
            </h4>
            <form id="manual-qr-form" onsubmit="handleManualCheckin(event)">
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label class="form-label" style="font-size: 0.82rem;">Token Number or Scan URL</label>
                <input type="text" id="manual-token-input" class="form-control" placeholder="e.g. CARD-001 or /checkin.html?token=...&sig=..." required>
              </div>
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label class="form-label" style="font-size: 0.82rem;">HMAC Signature (Auto-fetched if empty)</label>
                <input type="text" id="manual-sig-input" class="form-control" placeholder="Optional if entering token only">
              </div>
              <button type="submit" id="btn-manual-checkin" class="btn btn-primary" style="width: 100%;">
                <i class="fas fa-check-double"></i> Verify & Check In Patient
              </button>
            </form>
          </div>

          <!-- Live Scan Status Card (Success / Error alerts) -->
          <div id="scan-result-card" style="display: none; border-radius: 12px; padding: 1.25rem; text-align: left;">
            <!-- Injected dynamically on scan -->
          </div>

        </div>

      </div>
    </div>

    <!-- Edit Doctors Section (Doctor Profiles Management) -->
    <div class="card" style="margin-bottom: 2rem; border-top: 3px solid var(--deep-blue); padding: 1.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <h3 style="font-size: 1.2rem; color: var(--deep-blue); display: flex; align-items: center; gap: 0.6rem;">
            <i class="fas fa-user-md" style="color: var(--teal);"></i> Edit Doctors & Profile Directory
          </h3>
          <p style="font-size: 0.88rem; color: var(--charcoal-light); margin: 0.2rem 0 0;">
            Update qualifications, clinical experience, languages spoken, consultation fee, and OPD schedules.
          </p>
        </div>
        <button type="button" class="btn btn-sm btn-secondary" onclick="loadAdminDoctorProfilesTable()">
          <i class="fas fa-sync"></i> Refresh Doctors
        </button>
      </div>

      <div style="overflow-x: auto;">
        <table class="medicare-table">
          <thead>
            <tr>
              <th>Doctor</th>
              <th>Department</th>
              <th>Qualification</th>
              <th>Exp</th>
              <th>Fee</th>
              <th>OPD Schedule</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="admin-doctors-tbody">
            <tr><td colspan="7" style="text-align: center; padding: 1.5rem;">Loading doctors directory...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Hospital Configuration Settings (Slot Duration & Grace Period) -->
    <div style="background: var(--white); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); border-top: 3px solid var(--teal); padding: 1.75rem; margin-bottom: 2rem;">
      <h3 style="font-size: 1.15rem; color: var(--deep-blue); margin-bottom: 1rem;">
        <i class="fas fa-sliders-h" style="color: var(--teal);"></i> System Slot & Queue Configuration
      </h3>

      <form id="admin-settings-form" onsubmit="saveHospitalSettings(event)" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; align-items: flex-end;">
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
          <label class="form-label">Reminder Minutes Before (5 - 1440)</label>
          <input type="number" id="setting-reminder-minutes" class="form-control" min="5" max="1440" value="60" placeholder="60">
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

    <!-- Upcoming Appointments & Reminder Operations -->
    <div class="card" style="margin-bottom: 2rem; border-top: 3px solid var(--deep-blue); padding: 1.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <h3 style="font-size: 1.2rem; color: var(--deep-blue); display: flex; align-items: center; gap: 0.6rem;">
            <i class="fas fa-bell" style="color: var(--teal);"></i> Upcoming Appointments & Automated Reminders
          </h3>
          <p style="font-size: 0.88rem; color: var(--charcoal-light); margin: 0.2rem 0 0;">
            Automated reminders trigger within configured minutes before slot. Filter by payment status and manage visits.
          </p>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <label for="admin-appt-payment-filter" style="font-size: 0.82rem; font-weight: 600; color: var(--charcoal); margin: 0;">Payment Filter:</label>
          <select id="admin-appt-payment-filter" class="form-control" style="width: auto; padding: 0.25rem 0.6rem; font-size: 0.82rem; height: auto;" onchange="filterAdminAppointments(this.value)">
            <option value="all">All Payments</option>
            <option value="paid">Paid Online</option>
            <option value="hospital">Pay at Hospital</option>
            <option value="refund_due">Refund Due</option>
            <option value="refunded">Refunded</option>
          </select>
          <button type="button" class="btn btn-sm btn-secondary" onclick="loadAdminAppointmentsTable()">
            <i class="fas fa-sync"></i> Refresh Appointments
          </button>
        </div>
      </div>

      <div style="overflow-x: auto;">
        <table class="medicare-table">
          <thead>
            <tr>
              <th>Token</th>
              <th>Patient</th>
              <th>Phone & Lang</th>
              <th>Doctor & Room</th>
              <th>Date & Time</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Reminder Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="admin-appts-tbody">
            <tr><td colspan="9" style="text-align: center; padding: 1.5rem;">Loading appointments...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Online OPD Payments Audit & Refund Management -->
    <div class="card" style="margin-bottom: 2rem; border-top: 3px solid var(--teal); padding: 1.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <h3 style="font-size: 1.2rem; color: var(--deep-blue); display: flex; align-items: center; gap: 0.6rem;">
            <i class="fas fa-credit-card" style="color: var(--teal);"></i> Online OPD Payments & Refund Management
          </h3>
          <p style="font-size: 0.88rem; color: var(--charcoal-light); margin: 0.2rem 0 0;">
            Audit trail of Razorpay test orders and transactions. Process cancellations and instant refunds.
          </p>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <span class="tag-mint" style="font-size: 0.75rem;"><i class="fas fa-vial"></i> Razorpay Test Mode</span>
          <button type="button" class="btn btn-sm btn-secondary" onclick="loadAdminPaymentsTable()">
            <i class="fas fa-sync"></i> Refresh Payments
          </button>
        </div>
      </div>

      <div style="overflow-x: auto;">
        <table class="medicare-table">
          <thead>
            <tr>
              <th>Payment ID & Order</th>
              <th>Token & Patient</th>
              <th>Doctor</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date & Time</th>
              <th>Refund Action</th>
            </tr>
          </thead>
          <tbody id="admin-payments-tbody">
            <tr><td colspan="7" style="text-align: center; padding: 1.5rem;">Loading payments audit...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- WhatsApp Logs & Notification Monitor -->
    <div class="medicare-table-wrapper" style="margin-bottom: 2rem;">
      <div style="padding: 1.25rem; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <h3 style="font-size: 1.15rem; color: var(--deep-blue); display: flex; align-items: center; gap: 0.5rem; margin: 0;">
          <i class="fab fa-whatsapp" style="color: #25D366;"></i> Message & Notification Delivery Audit
        </h3>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <label for="admin-msg-type-filter" style="font-size: 0.82rem; font-weight: 600; color: var(--charcoal); margin: 0;">Filter:</label>
          <select id="admin-msg-type-filter" class="form-control" style="width: auto; padding: 0.25rem 0.6rem; font-size: 0.82rem; height: auto;" onchange="filterAdminMessages(this.value)">
            <option value="all">All Messages</option>
            <option value="reminder">Reminders</option>
            <option value="booking">Booking Confirmations</option>
            <option value="reschedule">Reschedules</option>
            <option value="auto_shift">Auto Shifts</option>
          </select>
          <span class="tag-mint" style="font-size: 0.72rem;">Multi-Channel Audit</span>
        </div>
      </div>
      <div style="overflow-x: auto;">
        <table class="medicare-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Recipient Phone</th>
              <th>Type</th>
              <th>Channel</th>
              <th>Message Content</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody id="admin-messages-tbody">
            <tr><td colspan="8" style="text-align: center; padding: 2rem;">Loading messages...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    </div>

    <!-- Subview 2: Analytics -->
    <div id="admin-subview-analytics" style="${currentAdminTab === 'analytics' ? 'display: block;' : 'display: none;'}"></div>
  `;

  if (currentAdminTab === 'operations') {
    loadAdminDashboardData();
  } else {
    initAnalyticsDashboard();
  }
}

let allAdminMessages = [];

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
    const remMin = document.getElementById('setting-reminder-minutes');
    const phone = document.getElementById('setting-hospital-phone');

    if (slotDur && stats.settings.slot_duration_min) slotDur.value = stats.settings.slot_duration_min;
    if (grace && stats.settings.grace_period_min) grace.value = stats.settings.grace_period_min;
    if (remMin && stats.settings.reminder_minutes_before) remMin.value = stats.settings.reminder_minutes_before;
    if (phone && stats.settings.hospital_phone) phone.value = stats.settings.hospital_phone;

    // Load messages audit
    const resMsg = await fetch('/api/admin/messages');
    const dataMsg = await resMsg.json();
    if (dataMsg.success && Array.isArray(dataMsg.messages)) {
      allAdminMessages = dataMsg.messages;
      const filterSelect = document.getElementById('admin-msg-type-filter');
      const currentFilter = filterSelect ? filterSelect.value : 'all';
      filterAdminMessages(currentFilter);
    }

    // Load Doctor Profiles Directory Table
    loadAdminDoctorProfilesTable();

    // Load Admin Appointments Table
    loadAdminAppointmentsTable();

    // Load Online Payments Table
    loadAdminPaymentsTable();
  } catch (err) {
    console.error('Error loading admin data:', err);
  }
}

function filterAdminMessages(filterType = 'all') {
  const msgTbody = document.getElementById('admin-messages-tbody');
  if (!msgTbody) return;

  const filtered = filterType === 'all'
    ? allAdminMessages
    : allAdminMessages.filter(m => (m.type || 'notification') === filterType);

  if (filtered.length === 0) {
    msgTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--charcoal-light);">No ${filterType === 'all' ? '' : filterType + ' '}messages recorded yet.</td></tr>`;
    return;
  }

  msgTbody.innerHTML = '';
  filtered.slice(0, 30).forEach(m => {
    const tr = document.createElement('tr');
    const msgType = m.type || 'notification';
    const msgChannel = m.channel || 'whatsapp-sim';
    const typeBadge = `<span class="badge-type type-${msgType}">${msgType}</span>`;
    const channelBadge = `<span class="badge-channel channel-${msgChannel}">${msgChannel}</span>`;
    
    tr.innerHTML = `
      <td>#${m.id}</td>
      <td><strong>${m.recipient_phone || '-'}</strong></td>
      <td>${typeBadge}</td>
      <td>${channelBadge}</td>
      <td style="max-width: 320px; font-size: 0.82rem; line-height: 1.35;">${m.message_text || ''}</td>
      <td><span class="tag-mint" style="font-size: 0.72rem;">${m.provider || 'simulation'}</span></td>
      <td><span style="color: ${m.status === 'sent' || m.status === 'delivered' ? '#059669' : '#DC2626'}; font-weight: 700; text-transform: uppercase; font-size: 0.75rem;">${m.status || 'sent'}</span></td>
      <td style="font-size: 0.8rem; color: var(--charcoal-light);">${m.sent_at ? new Date(m.sent_at).toLocaleTimeString() : '-'}</td>
    `;
    msgTbody.appendChild(tr);
  });
}

let allAdminAppointments = [];

async function loadAdminAppointmentsTable() {
  const tbody = document.getElementById('admin-appts-tbody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/admin/appointments');
    const data = await res.json();
    if (!data.success || !Array.isArray(data.appointments)) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color: red;">Failed to load appointments.</td></tr>';
      return;
    }

    allAdminAppointments = data.appointments;
    const filterSelect = document.getElementById('admin-appt-payment-filter');
    const currentFilter = filterSelect ? filterSelect.value : 'all';
    renderFilteredAdminAppointments(currentFilter);

  } catch (err) {
    console.error('Error loading admin appointments table:', err);
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color: red;">Error loading appointments.</td></tr>';
  }
}

function filterAdminAppointments(filterType) {
  renderFilteredAdminAppointments(filterType);
}

function renderFilteredAdminAppointments(filterType = 'all') {
  const tbody = document.getElementById('admin-appts-tbody');
  if (!tbody) return;

  let filtered = allAdminAppointments;
  if (filterType === 'paid') {
    filtered = allAdminAppointments.filter(a => a.payment_status === 'paid');
  } else if (filterType === 'hospital') {
    filtered = allAdminAppointments.filter(a => a.payment_mode === 'hospital' || a.payment_status === 'not_required' || !a.payment_status);
  } else if (filterType === 'refund_due') {
    filtered = allAdminAppointments.filter(a => a.payment_status === 'refund_due');
  } else if (filterType === 'refunded') {
    filtered = allAdminAppointments.filter(a => a.payment_status === 'refunded');
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 1.5rem; color: var(--charcoal-light);">No appointments matching "${filterType}" payment filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  filtered.forEach(a => {
    const tr = document.createElement('tr');

    // Reminder status badge
    let reminderHtml = '<span style="color: var(--charcoal-light); font-size: 0.75rem;">Not Sent</span>';
    if (a.reminder_sent_at) {
      reminderHtml = `<span class="tag-mint" style="font-size: 0.75rem;"><i class="fas fa-check"></i> Sent ${new Date(a.reminder_sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
    } else if (a.reminder_attempts > 0) {
      reminderHtml = `<span style="color: #ef4444; font-size: 0.75rem; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> Failed (${a.reminder_attempts}/3)</span>`;
    }

    const phoneDisplay = a.whatsapp_no || a.patient_phone || '<span style="color:#ef4444; font-size:0.75rem;">No phone</span>';
    const langDisplay = `<span style="text-transform: uppercase; font-size: 0.72rem; color: var(--charcoal-light);">${a.language || 'en'}</span>`;

    // Payment badge
    let paymentBadge = '<span class="badge" style="background: rgba(15, 59, 100, 0.08); color: var(--deep-blue); font-weight: 600; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;"><i class="fas fa-hospital"></i> Hospital</span>';
    if (a.payment_status === 'paid') {
      const amtStr = a.amount ? ` (Rs. ${a.amount / 100})` : '';
      paymentBadge = `<span class="badge" style="background: rgba(20, 187, 166, 0.15); color: var(--teal); font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;"><i class="fas fa-check-circle"></i> Paid${amtStr}</span>`;
    } else if (a.payment_status === 'refund_due') {
      paymentBadge = `<span class="badge" style="background: rgba(234, 88, 12, 0.15); color: #EA580C; font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;"><i class="fas fa-undo"></i> Refund Due</span>`;
    } else if (a.payment_status === 'refunded') {
      paymentBadge = `<span class="badge" style="background: rgba(100, 116, 139, 0.15); color: #64748B; font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;"><i class="fas fa-receipt"></i> Refunded</span>`;
    } else if (a.status === 'pending_payment') {
      paymentBadge = `<span class="badge" style="background: rgba(245, 165, 36, 0.15); color: #D97706; font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;"><i class="fas fa-clock"></i> Hold Pending</span>`;
    }

    tr.innerHTML = `
      <td>
        <strong style="color: var(--teal); font-size: 1.05rem;">${a.token_no}</strong>
      </td>
      <td>
        <strong>${a.patient_name || 'Patient'}</strong>
      </td>
      <td>
        ${phoneDisplay}<br>${langDisplay}
      </td>
      <td>
        <strong>${a.doctor_name || 'Doctor'}</strong><br>
        <small style="color: var(--charcoal-light);">${a.department_name || ''} &bull; ${a.room_no || '-'}</small>
      </td>
      <td>
        <strong>${a.date}</strong><br>
        <small style="color: var(--teal); font-weight: 600;">${a.time}</small>
      </td>
      <td>
        ${paymentBadge}
      </td>
      <td>
        <span class="queue-status-badge status-${a.status}">${a.status}</span>
      </td>
      <td>
        ${reminderHtml}
      </td>
      <td>
        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-sm btn-primary" onclick="sendAdminReminder(${a.id}, this)" style="padding: 0.25rem 0.6rem; font-size: 0.78rem; white-space: nowrap;">
            <i class="fas fa-paper-plane"></i> Send reminder
          </button>
          <button type="button" class="btn btn-sm btn-secondary" onclick="openReceptionistReportsModal(${a.id}, '${a.token_no}', '${(a.patient_name || 'Walk-in Patient').replace(/'/g, "\\'")}', '${a.status}')" style="padding: 0.25rem 0.5rem; font-size: 0.78rem; white-space: nowrap;">
            <i class="fas fa-file-medical"></i> Reports
          </button>
        </div>
      </td>

    `;
    tbody.appendChild(tr);
  });
}

async function loadAdminPaymentsTable() {
  const tbody = document.getElementById('admin-payments-tbody');
  if (!tbody) return;

  const token = localStorage.getItem('healpath_token') || localStorage.getItem('medicare_token');

  try {
    const res = await fetch('/api/admin/payments', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (!res.ok || !data.success || !Array.isArray(data.payments)) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: red;">Failed to load online payments audit.</td></tr>';
      return;
    }

    if (data.payments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--charcoal-light);">No online Razorpay payments recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.payments.forEach(p => {
      const tr = document.createElement('tr');
      const amountRupees = p.amount ? (p.amount / 100) : 0;
      
      let statusBadge = `<span class="queue-status-badge status-${p.status}">${p.status}</span>`;
      if (p.status === 'paid') {
        statusBadge = `<span class="tag-mint" style="font-size: 0.75rem;"><i class="fas fa-check"></i> Paid</span>`;
      } else if (p.status === 'refund_due') {
        statusBadge = `<span class="badge" style="background: rgba(234, 88, 12, 0.15); color: #EA580C; font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;"><i class="fas fa-undo"></i> Refund Due</span>`;
      } else if (p.status === 'refunded') {
        statusBadge = `<span class="badge" style="background: rgba(100, 116, 139, 0.15); color: #64748B; font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;"><i class="fas fa-receipt"></i> Refunded</span>`;
      } else if (p.status === 'failed') {
        statusBadge = `<span style="color: #EF4444; font-weight: 700; font-size: 0.75rem; text-transform: uppercase;">Failed</span>`;
      }

      let actionHtml = `<span style="color: var(--charcoal-light); font-size: 0.78rem;">-</span>`;
      if (p.can_refund) {
        actionHtml = `
          <button type="button" class="btn btn-sm" style="background: rgba(239, 68, 68, 0.12); color: #DC2626; border: 1.5px solid #DC2626; font-weight: 700; padding: 0.25rem 0.6rem; font-size: 0.75rem; border-radius: 6px; cursor: pointer; white-space: nowrap;" onclick="processPaymentRefund('${p.id}', ${amountRupees})">
            <i class="fas fa-undo"></i> Issue Refund (Rs. ${amountRupees})
          </button>
        `;
      } else if (p.status === 'refunded') {
        actionHtml = `<span style="color: #64748B; font-size: 0.75rem; font-weight: 600;"><i class="fas fa-check-double"></i> Refund Processed</span>`;
      }

      tr.innerHTML = `
        <td>
          <strong style="color: var(--deep-blue); font-size: 0.85rem;">${p.payment_id || 'Pending ID'}</strong><br>
          <small style="color: var(--charcoal-light); font-size: 0.74rem;">Order: ${p.order_id || '-'}</small>
        </td>
        <td>
          <strong style="color: var(--teal); font-size: 0.95rem;">${p.token_no || '-'}</strong><br>
          <span style="font-size: 0.82rem;">${p.patient_name || 'Patient'}</span>
        </td>
        <td>
          <strong style="font-size: 0.85rem;">${p.doctor_name || 'Doctor'}</strong>
        </td>
        <td>
          <strong style="color: var(--deep-blue); font-size: 0.95rem;">Rs. ${amountRupees}</strong>
        </td>
        <td>
          ${statusBadge}
        </td>
        <td>
          <small style="color: var(--charcoal-light); font-size: 0.8rem;">
            ${p.created_at ? new Date(p.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}
          </small>
        </td>
        <td>
          ${actionHtml}
        </td>
      `;

      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error('Error loading payments table:', err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: red;">Error loading payments table.</td></tr>';
  }
}

async function processPaymentRefund(paymentRecordId, amountRupees) {
  if (!confirm(`Are you sure you want to execute an official Razorpay refund of Rs. ${amountRupees} for payment record #${paymentRecordId}? This action cannot be reversed.`)) {
    return;
  }

  const token = localStorage.getItem('healpath_token') || localStorage.getItem('medicare_token');

  try {
    const res = await fetch(`/api/admin/payments/${paymentRecordId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || `Refund failed (HTTP ${res.status})`);
    }

    if (window.showToast) {
      window.showToast(data.message || 'Refund successfully processed via Razorpay!', 'success');
    } else {
      alert(data.message || 'Refund successfully processed!');
    }

    // Refresh both tables
    loadAdminPaymentsTable();
    loadAdminAppointmentsTable();

  } catch (err) {
    alert('Refund Error: ' + err.message);
  }
}

async function sendAdminReminder(apptId, btn) {
  const token = localStorage.getItem('healpath_token') || localStorage.getItem('medicare_token');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  }

  try {
    const res = await fetch(`/api/admin/appointments/${apptId}/remind`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || `Failed to send reminder (HTTP ${res.status})`);
    }

    if (window.showToast) {
      window.showToast(data.message || 'Reminder sent successfully!', 'success');
    } else {
      alert(data.message || 'Reminder sent successfully!');
    }

    // Refresh tables
    loadAdminAppointmentsTable();
    const resMsg = await fetch('/api/admin/messages');
    const dataMsg = await resMsg.json();
    if (dataMsg.success && Array.isArray(dataMsg.messages)) {
      allAdminMessages = dataMsg.messages;
      const filterSelect = document.getElementById('admin-msg-type-filter');
      filterAdminMessages(filterSelect ? filterSelect.value : 'all');
    }
  } catch (err) {
    console.error('Admin manual reminder failed:', err);
    if (window.showToast) {
      window.showToast(err.message, 'error');
    } else {
      alert(err.message);
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send reminder now';
    }
  }
}

async function saveHospitalSettings(e) {
  e.preventDefault();
  const slot_duration_min = document.getElementById('setting-slot-duration').value;
  const grace_period_min = document.getElementById('setting-grace-period').value;
  const reminder_minutes_before = document.getElementById('setting-reminder-minutes')?.value || 60;
  const hospital_phone = document.getElementById('setting-hospital-phone').value;

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_duration_min, grace_period_min, reminder_minutes_before, hospital_phone })
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
      link.setAttribute('download', `healpath_report_${report.report_date}.csv`);
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
          <title>HealPath Hospital Daily Report - ${report.report_date}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2D3748; padding: 2rem; }
            h1, h2, h3 { color: #1B3B6F; margin-bottom: 0.5rem; }
            table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
            th, td { border: 1px solid #CBD5E0; padding: 0.6rem; text-align: left; font-size: 0.9rem; }
            th { background: #1B3B6F; color: #FFF; }
            .badge { padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>HealPath Hospital System</h2>
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
            <button onclick="window.print()" style="padding: 0.6rem 1.2rem; background: #2563EB; color: #FFF; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
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

/* ==========================================================================
   DOCTOR PROFILES MANAGEMENT (ADMIN & DOCTOR SELF-EDIT)
   ========================================================================== */
async function loadAdminDoctorProfilesTable() {
  const tbody = document.getElementById('admin-doctors-tbody');
  if (!tbody) return;

  try {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 1.5rem;"><i class="fas fa-spinner fa-spin" style="color: var(--teal);"></i> Loading doctors...</td></tr>';
    const res = await fetch('/api/doctors');
    const data = await res.json();
    if (!data.success || !data.doctors) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Failed to load doctors.</td></tr>';
      return;
    }

    if (data.doctors.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No doctors configured.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.doctors.forEach(doc => {
      const tr = document.createElement('tr');
      const photo = doc.photo_url || doc.avatar || doc.image_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=100';
      const qual = doc.qualification ? doc.qualification : '<span style="color: #94a3b8; font-style: italic;">Not set</span>';
      const exp = (doc.experience_years !== null && doc.experience_years !== undefined) ? `${doc.experience_years} yrs` : '<span style="color: #94a3b8; font-style: italic;">Not set</span>';
      const fee = (doc.consultation_fee !== null && doc.consultation_fee !== undefined) ? (doc.consultation_fee > 0 ? `₹${doc.consultation_fee}` : 'Free') : '<span style="color: #94a3b8; font-style: italic;">Not set</span>';
      const schedule = doc.opd_hours || (doc.working_start && doc.working_end ? `${doc.working_start}-${doc.working_end}` : '10:00-14:00');

      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="${photo}" alt="${doc.name}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid var(--teal);" onerror="this.src='https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=100';">
            <div>
              <strong style="color: var(--deep-blue);">${doc.name}</strong>
              <div style="font-size: 0.78rem; color: var(--charcoal-light);">${doc.specialization || doc.specialty || ''}</div>
            </div>
          </div>
        </td>
        <td><span class="tag-mint" style="font-size: 0.75rem;">${doc.department_name}</span></td>
        <td style="font-size: 0.85rem;">${qual}</td>
        <td style="font-size: 0.85rem; font-weight: 600;">${exp}</td>
        <td style="font-size: 0.88rem; font-weight: 700; color: var(--deep-blue);">${fee}</td>
        <td style="font-size: 0.82rem; color: var(--charcoal-light);">${doc.opd_days ? doc.opd_days + ' &bull; ' : ''}${schedule}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-sm btn-primary" onclick="openAdminEditDoctorModal(${doc.id})" title="Edit Doctor Profile" style="padding: 0.35rem 0.65rem; font-size: 0.78rem;">
              <i class="fas fa-edit"></i> Edit
            </button>
            <a href="doctor.html?id=${doc.id}" target="_blank" class="btn btn-sm btn-outline-white" title="View Public Profile" style="color: var(--deep-blue); border-color: #cbd5e1; padding: 0.35rem 0.65rem; font-size: 0.78rem;">
              <i class="fas fa-external-link-alt"></i>
            </a>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load admin doctor profiles:', err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error loading doctors table.</td></tr>';
  }
}

async function openAdminEditDoctorModal(doctorId) {
  let modal = document.getElementById('admin-edit-doc-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'admin-edit-doc-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  try {
    const res = await fetch(`/api/doctors/${doctorId}`);
    const data = await res.json();
    if (!data.success || !data.doctor) throw new Error('Doctor details could not be retrieved');
    const doc = data.doctor;

    const langsStr = Array.isArray(doc.languages) ? doc.languages.join(', ') : '';

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 650px;">
        <div class="modal-header">
          <h3 style="color: var(--deep-blue); display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-user-md" style="color: var(--teal);"></i> Edit Profile: ${doc.name}
          </h3>
          <button class="modal-close-btn" onclick="closeModal('admin-edit-doc-modal')">&times;</button>
        </div>

        <form id="admin-doc-edit-form" onsubmit="submitAdminDoctorProfile(event, ${doc.id})" style="margin-top: 1rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Doctor Name</label>
              <input type="text" id="edit-doc-name" class="form-control" value="${doc.name || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Specialization / Role</label>
              <input type="text" id="edit-doc-specialization" class="form-control" value="${doc.specialization || doc.specialty || ''}">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Qualifications (e.g. MBBS, MD, MS)</label>
              <input type="text" id="edit-doc-qual" class="form-control" value="${doc.qualification || ''}" placeholder="e.g. MBBS, MD (Medicine)">
            </div>
            <div class="form-group">
              <label class="form-label">Experience (Years, 0-70)</label>
              <input type="number" id="edit-doc-exp" class="form-control" min="0" max="70" value="${doc.experience_years !== null && doc.experience_years !== undefined ? doc.experience_years : ''}" placeholder="e.g. 15">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Consultation Fee (₹, >= 0)</label>
              <input type="number" id="edit-doc-fee" class="form-control" min="0" value="${doc.consultation_fee !== null && doc.consultation_fee !== undefined ? doc.consultation_fee : ''}" placeholder="e.g. 500">
            </div>
            <div class="form-group">
              <label class="form-label">Room / Suite</label>
              <input type="text" id="edit-doc-room" class="form-control" value="${doc.room_no || doc.room || ''}" placeholder="e.g. Room 101 (Floor 1)">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Languages Spoken (comma-separated)</label>
            <input type="text" id="edit-doc-languages" class="form-control" value="${langsStr}" placeholder="e.g. English, Hindi, Marathi">
          </div>

          <div class="form-group">
            <label class="form-label">Photo URL (starts with http://, https://, or /)</label>
            <input type="text" id="edit-doc-photo" class="form-control" value="${doc.photo_url || doc.avatar || doc.image_url || ''}" placeholder="https://images.unsplash.com/...">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">OPD Days</label>
              <input type="text" id="edit-doc-opd-days" class="form-control" value="${doc.opd_days || ''}" placeholder="e.g. Mon-Sat or Mon, Wed, Fri">
            </div>
            <div class="form-group">
              <label class="form-label">OPD Hours (e.g. 10:00-14:00)</label>
              <input type="text" id="edit-doc-opd-hours" class="form-control" value="${doc.opd_hours || (doc.working_start && doc.working_end ? doc.working_start + '-' + doc.working_end : '')}" placeholder="10:00-14:00">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Doctor Bio / Background</label>
            <textarea id="edit-doc-bio" class="form-control" rows="3" placeholder="Enter clinical background and specializations...">${doc.bio || ''}</textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="closeModal('admin-edit-doc-modal')">Cancel</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Profile</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.add('active');
  } catch (err) {
    alert(err.message);
  }
}

async function submitAdminDoctorProfile(event, doctorId) {
  event.preventDefault();
  const token = localStorage.getItem('healpath_token') || localStorage.getItem('medicare_token');

  const name = document.getElementById('edit-doc-name').value;
  const specialization = document.getElementById('edit-doc-specialization').value;
  const qualification = document.getElementById('edit-doc-qual').value;
  const expVal = document.getElementById('edit-doc-exp').value;
  const feeVal = document.getElementById('edit-doc-fee').value;
  const room = document.getElementById('edit-doc-room').value;
  const langsRaw = document.getElementById('edit-doc-languages').value;
  const photo_url = document.getElementById('edit-doc-photo').value;
  const opd_days = document.getElementById('edit-doc-opd-days').value;
  const opd_hours = document.getElementById('edit-doc-opd-hours').value;
  const bio = document.getElementById('edit-doc-bio').value;

  const languages = langsRaw.split(',').map(s => s.trim()).filter(Boolean);

  const payload = {
    name,
    specialization,
    qualification: qualification || null,
    experience_years: expVal !== '' ? Number(expVal) : null,
    consultation_fee: feeVal !== '' ? Number(feeVal) : null,
    room,
    languages,
    photo_url: photo_url || null,
    opd_days: opd_days || null,
    opd_hours: opd_hours || null,
    bio: bio || null
  };

  try {
    const res = await fetch(`/api/admin/doctors/${doctorId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    closeModal('admin-edit-doc-modal');
    if (window.showToast) window.showToast('Doctor profile updated successfully!', 'success');
    loadAdminDoctorProfilesTable();
  } catch (err) {
    if (window.showToast) window.showToast(err.message, 'error');
    else alert(err.message);
  }
}

async function openDoctorSelfEditProfileModal(doctorId) {
  let modal = document.getElementById('doc-self-edit-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'doc-self-edit-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  try {
    const res = await fetch(`/api/doctors/${doctorId}`);
    const data = await res.json();
    if (!data.success || !data.doctor) throw new Error('Doctor profile could not be loaded');
    const doc = data.doctor;

    const langsStr = Array.isArray(doc.languages) ? doc.languages.join(', ') : '';

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 580px;">
        <div class="modal-header">
          <h3 style="color: var(--deep-blue); display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-user-edit" style="color: var(--teal);"></i> Edit My Clinical Profile
          </h3>
          <button class="modal-close-btn" onclick="closeModal('doc-self-edit-modal')">&times;</button>
        </div>
        <p style="font-size: 0.88rem; color: var(--charcoal-light); margin: 0.5rem 0 1rem;">
          Update your clinical summary, languages spoken, and OPD hours. (Official name and fee are managed by hospital administration).
        </p>

        <form id="doc-self-edit-form" onsubmit="submitDoctorSelfProfile(event, ${doc.id})">
          <div class="form-group">
            <label class="form-label">Languages Spoken (comma-separated)</label>
            <input type="text" id="self-doc-languages" class="form-control" value="${langsStr}" placeholder="e.g. English, Hindi, Marathi">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">OPD Days</label>
              <input type="text" id="self-doc-opd-days" class="form-control" value="${doc.opd_days || ''}" placeholder="e.g. Mon-Sat">
            </div>
            <div class="form-group">
              <label class="form-label">OPD Hours (e.g. 10:00-14:00)</label>
              <input type="text" id="self-doc-opd-hours" class="form-control" value="${doc.opd_hours || (doc.working_start && doc.working_end ? doc.working_start + '-' + doc.working_end : '')}" placeholder="10:00-14:00">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Clinical Background & Bio</label>
            <textarea id="self-doc-bio" class="form-control" rows="4" placeholder="Brief summary of your clinical practice, specializations, and patient care focus...">${doc.bio || ''}</textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="closeModal('doc-self-edit-modal')">Cancel</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Changes</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.add('active');
  } catch (err) {
    alert(err.message);
  }
}

async function submitDoctorSelfProfile(event, doctorId) {
  event.preventDefault();
  const token = localStorage.getItem('healpath_token') || localStorage.getItem('medicare_token');

  const langsRaw = document.getElementById('self-doc-languages').value;
  const opd_days = document.getElementById('self-doc-opd-days').value;
  const opd_hours = document.getElementById('self-doc-opd-hours').value;
  const bio = document.getElementById('self-doc-bio').value;

  const languages = langsRaw.split(',').map(s => s.trim()).filter(Boolean);

  const payload = {
    languages,
    opd_days: opd_days || null,
    opd_hours: opd_hours || null,
    bio: bio || null
  };

  try {
    const res = await fetch(`/api/doctors/${doctorId}/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    closeModal('doc-self-edit-modal');
    if (window.showToast) window.showToast('Profile updated successfully!', 'success');
  } catch (err) {
    if (window.showToast) window.showToast(err.message, 'error');
    else alert(err.message);
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
window.loadAdminDoctorProfilesTable = loadAdminDoctorProfilesTable;
window.openAdminEditDoctorModal = openAdminEditDoctorModal;
window.submitAdminDoctorProfile = submitAdminDoctorProfile;
window.openDoctorSelfEditProfileModal = openDoctorSelfEditProfileModal;
window.submitDoctorSelfProfile = submitDoctorSelfProfile;
window.loadAdminAppointmentsTable = loadAdminAppointmentsTable;
window.sendAdminReminder = sendAdminReminder;
window.filterAdminMessages = filterAdminMessages;

/* ==========================================================================
   ADMIN ANALYTICS DASHBOARD & CHARTS (Chart.js 4.4.x)
   ========================================================================== */

let currentAdminTab = 'operations'; // 'operations' | 'analytics'
let chartJsLoaded = false;
let chartJsLoadingPromise = null;
let chartInstances = {
  daily: null,
  peak: null,
  sources: null,
  doctor: null
};

// In-memory filter cache only (not localStorage)
let lastAnalyticsFilter = {
  preset: '7d',
  from: '',
  to: '',
  doctor_id: '',
  department_id: ''
};

let currentAnalyticsData = null;
let analyticsDoctorsList = [];
let analyticsDepartmentsList = [];

function loadChartJs() {
  if (window.Chart) {
    chartJsLoaded = true;
    return Promise.resolve();
  }
  if (chartJsLoadingPromise) return chartJsLoadingPromise;

  chartJsLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
    script.async = true;
    script.onload = () => {
      chartJsLoaded = true;
      resolve();
    };
    script.onerror = () => {
      chartJsLoadingPromise = null;
      reject(new Error('Failed to load Chart.js library'));
    };
    document.head.appendChild(script);
  });
  return chartJsLoadingPromise;
}

function getKolkataDateString(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch (e) {
    const dt = new Date(d.getTime() + (330 * 60 * 1000));
    return dt.toISOString().split('T')[0];
  }
}

function getShiftedKolkataDate(baseDateStr, deltaDays) {
  const parts = baseDateStr.split('-');
  const dt = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().split('T')[0];
}

function switchAdminSubTab(tab) {
  currentAdminTab = tab;
  const opsBtn = document.getElementById('btn-admin-tab-ops');
  const anaBtn = document.getElementById('btn-admin-tab-analytics');
  const opsView = document.getElementById('admin-subview-operations');
  const anaView = document.getElementById('admin-subview-analytics');
  const navAnalytics = document.getElementById('nav-analytics');
  const navAdmin = document.getElementById('nav-admin');

  if (tab === 'operations') {
    if (opsBtn) opsBtn.classList.add('active');
    if (anaBtn) anaBtn.classList.remove('active');
    if (opsView) opsView.style.display = 'block';
    if (anaView) anaView.style.display = 'none';
    if (navAdmin) navAdmin.classList.add('active');
    if (navAnalytics) navAnalytics.classList.remove('active');
    loadAdminDashboardData();
  } else if (tab === 'analytics') {
    if (anaBtn) anaBtn.classList.add('active');
    if (opsBtn) opsBtn.classList.remove('active');
    if (anaView) anaView.style.display = 'block';
    if (opsView) opsView.style.display = 'none';
    if (navAnalytics) navAnalytics.classList.add('active');
    if (navAdmin) navAdmin.classList.remove('active');
    initAnalyticsDashboard();
  }
}

function openAdminAnalyticsTab() {
  currentAdminTab = 'analytics';
  setupRoleView('admin');
  switchAdminSubTab('analytics');
}

async function initAnalyticsDashboard() {
  const container = document.getElementById('admin-subview-analytics');
  if (!container) return;

  // Initialize date range defaults if not yet set
  if (!lastAnalyticsFilter.to) {
    const today = getKolkataDateString();
    lastAnalyticsFilter.to = today;
    lastAnalyticsFilter.from = getShiftedKolkataDate(today, -6);
    lastAnalyticsFilter.preset = '7d';
  }

  container.innerHTML = `
    <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
      <div>
        <h2 style="color: var(--deep-blue);"><i class="fas fa-chart-line" style="color: var(--teal); margin-right: 0.5rem;"></i><span data-i18n="admin.analytics_title">Analytics & Operational Intelligence</span></h2>
        <p data-i18n="admin.analytics_subtitle">Comprehensive patient throughput, doctor workloads, peak registration patterns, and wait times.</p>
      </div>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button class="btn btn-secondary" onclick="printAnalyticsReport()">
          <i class="fas fa-print"></i> <span data-i18n="admin.btn_print_report">Print Report</span>
        </button>
        <button class="btn btn-primary" onclick="exportAnalyticsCSV()">
          <i class="fas fa-file-download"></i> <span data-i18n="admin.btn_export_csv">Export CSV</span>
        </button>
      </div>
    </div>

    <!-- Filters Bar Card -->
    <div class="analytics-filter-card" style="margin-bottom: 2rem;">
      <div style="display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: flex-end; justify-content: space-between;">
        
        <!-- Presets -->
        <div>
          <label class="form-label" style="font-size: 0.8rem; font-weight: 700; color: var(--deep-blue); margin-bottom: 0.4rem; display: block;" data-i18n="admin.filter_range">DATE RANGE PRESETS</label>
          <div class="preset-pills-group">
            <button type="button" id="btn-preset-today" class="preset-pill ${lastAnalyticsFilter.preset === 'today' ? 'active' : ''}" onclick="setAnalyticsPreset('today')" data-i18n="admin.filter_preset_today">Today</button>
            <button type="button" id="btn-preset-7d" class="preset-pill ${lastAnalyticsFilter.preset === '7d' ? 'active' : ''}" onclick="setAnalyticsPreset('7d')" data-i18n="admin.filter_preset_7d">Last 7 Days</button>
            <button type="button" id="btn-preset-30d" class="preset-pill ${lastAnalyticsFilter.preset === '30d' ? 'active' : ''}" onclick="setAnalyticsPreset('30d')" data-i18n="admin.filter_preset_30d">Last 30 Days</button>
          </div>
        </div>

        <!-- Custom Date Range -->
        <div style="display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 0.78rem;" data-i18n="admin.filter_from">From</label>
            <input type="date" id="analytics-from-date" class="form-control" style="padding: 0.45rem 0.6rem; font-size: 0.85rem;" value="${lastAnalyticsFilter.from}" onchange="onCustomDateChange()">
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 0.78rem;" data-i18n="admin.filter_to">To</label>
            <input type="date" id="analytics-to-date" class="form-control" style="padding: 0.45rem 0.6rem; font-size: 0.85rem;" value="${lastAnalyticsFilter.to}" onchange="onCustomDateChange()">
          </div>
        </div>

        <!-- Doctor & Department Dropdowns -->
        <div style="display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 0.78rem;" data-i18n="admin.filter_doctor">Doctor</label>
            <select id="analytics-doctor-filter" class="form-control" style="padding: 0.45rem 0.6rem; font-size: 0.85rem; min-width: 160px;">
              <option value="" data-i18n="admin.all_doctors">All Doctors</option>
            </select>
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 0.78rem;" data-i18n="admin.filter_dept">Department</label>
            <select id="analytics-dept-filter" class="form-control" style="padding: 0.45rem 0.6rem; font-size: 0.85rem; min-width: 160px;">
              <option value="" data-i18n="admin.all_departments">All Departments</option>
            </select>
          </div>
          <button type="button" class="btn btn-primary" style="height: 38px; padding: 0 1.25rem;" onclick="applyAnalyticsFilters()">
            <i class="fas fa-filter"></i> <span data-i18n="admin.filter_apply">Apply</span>
          </button>
        </div>

      </div>
    </div>

    <!-- 6 KPI Cards Grid -->
    <div class="analytics-kpis-grid" style="margin-bottom: 2rem;">
      <div class="kpi-card">
        <div>
          <div class="kpi-label" data-i18n="admin.kpi_total_bookings">Total Bookings</div>
          <div class="kpi-value" id="kpi-total-bookings"><span class="analytics-skeleton" style="width: 60px; height: 28px;"></span></div>
        </div>
        <div class="kpi-icon" style="background: rgba(15,59,100,0.1); color: var(--deep-blue);"><i class="fas fa-calendar-check"></i></div>
      </div>
      <div class="kpi-card">
        <div>
          <div class="kpi-label" data-i18n="admin.kpi_completion_rate">Completion Rate</div>
          <div class="kpi-value" id="kpi-completion-rate"><span class="analytics-skeleton" style="width: 60px; height: 28px;"></span></div>
        </div>
        <div class="kpi-icon" style="background: rgba(20,187,166,0.15); color: var(--teal);"><i class="fas fa-user-check"></i></div>
      </div>
      <div class="kpi-card kpi-card-danger">
        <div>
          <div class="kpi-label" data-i18n="admin.kpi_noshow_rate">No-Show Rate</div>
          <div class="kpi-value" id="kpi-noshow-rate"><span class="analytics-skeleton" style="width: 60px; height: 28px;"></span></div>
        </div>
        <div class="kpi-icon" style="background: rgba(239,68,68,0.12); color: #EF4444;"><i class="fas fa-user-slash"></i></div>
      </div>
      <div class="kpi-card">
        <div>
          <div class="kpi-label" data-i18n="admin.kpi_avg_wait">Avg Wait Time</div>
          <div class="kpi-value" id="kpi-avg-wait"><span class="analytics-skeleton" style="width: 60px; height: 28px;"></span></div>
        </div>
        <div class="kpi-icon" style="background: rgba(20,187,166,0.15); color: var(--teal);"><i class="fas fa-hourglass-half"></i></div>
      </div>
      <div class="kpi-card">
        <div>
          <div class="kpi-label" data-i18n="admin.kpi_avg_consult">Avg Consult Duration</div>
          <div class="kpi-value" id="kpi-avg-consult"><span class="analytics-skeleton" style="width: 60px; height: 28px;"></span></div>
        </div>
        <div class="kpi-icon" style="background: rgba(15,59,100,0.1); color: var(--deep-blue);"><i class="fas fa-stethoscope"></i></div>
      </div>
      <div class="kpi-card">
        <div>
          <div class="kpi-label" data-i18n="admin.kpi_auto_shifted">Auto-Shifted Slots</div>
          <div class="kpi-value" id="kpi-auto-shifted"><span class="analytics-skeleton" style="width: 60px; height: 28px;"></span></div>
        </div>
        <div class="kpi-icon" style="background: rgba(167,216,209,0.3); color: var(--deep-blue);"><i class="fas fa-history"></i></div>
      </div>
    </div>

    <!-- Empty State Alert Banner (hidden by default) -->
    <div id="analytics-empty-state" style="display: none; background: #FFF; border: 1.5px dashed var(--teal); border-radius: 12px; padding: 2.5rem; text-align: center; margin-bottom: 2rem;">
      <i class="fas fa-chart-pie" style="font-size: 2.75rem; color: var(--teal); margin-bottom: 1rem; opacity: 0.85;"></i>
      <h3 style="color: var(--deep-blue); margin-bottom: 0.5rem;" data-i18n="admin.empty_title">No Appointment Data in Selected Range</h3>
      <p style="color: var(--charcoal-light); max-width: 500px; margin: 0 auto;" data-i18n="admin.empty_desc">There are no bookings or queue events matching your current filter criteria. Adjust your date range or select a different doctor/department.</p>
    </div>

    <!-- Reminder Delivery Audit Tag (if available) -->
    <div id="analytics-reminders-badge" style="display: none; margin-bottom: 1.5rem; background: rgba(20,187,166,0.08); border: 1px solid var(--mint); border-radius: 8px; padding: 0.75rem 1rem; color: var(--deep-blue); font-size: 0.85rem; font-weight: 600;">
      <i class="fab fa-whatsapp" style="color: #25D366; margin-right: 0.4rem;"></i>
      <span id="analytics-reminders-text">Automated Reminders: 0 Sent</span>
    </div>

    <!-- 4 Charts Grid -->
    <div class="analytics-charts-grid" id="analytics-charts-container" style="margin-bottom: 2rem;">
      
      <!-- Chart 1: Daily Bookings vs Completed (Line) -->
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <h3 class="chart-card-title" data-i18n="admin.chart_daily_title">Daily Appointment Throughput</h3>
            <p class="chart-card-subtitle" data-i18n="admin.chart_daily_desc">Volume of booked, completed, and missed consultations over time</p>
          </div>
          <span class="tag-mint" style="font-size: 0.72rem;">Line Trend</span>
        </div>
        <div class="chart-canvas-wrapper">
          <canvas id="chart-daily-bookings" aria-label="Daily appointment throughput line chart" role="img"></canvas>
        </div>
        <div class="chart-accessible-summary" id="desc-daily-bookings" aria-live="polite">Loading daily throughput summary...</div>
      </div>

      <!-- Chart 2: Peak Hours (Bar) -->
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <h3 class="chart-card-title" data-i18n="admin.chart_peak_title">Peak Appointment Arrival Hours</h3>
            <p class="chart-card-subtitle" data-i18n="admin.chart_peak_desc">Distribution of scheduled appointments across the 24-hour clock</p>
          </div>
          <span class="tag-mint" style="font-size: 0.72rem;">24-Hr Clock</span>
        </div>
        <div class="chart-canvas-wrapper">
          <canvas id="chart-peak-hours" aria-label="Peak appointment arrival hours bar chart" role="img"></canvas>
        </div>
        <div class="chart-accessible-summary" id="desc-peak-hours" aria-live="polite">Loading peak hours summary...</div>
      </div>

      <!-- Chart 3: Booking Sources (Doughnut) -->
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <h3 class="chart-card-title" data-i18n="admin.chart_sources_title">Patient Registration Channels</h3>
            <p class="chart-card-subtitle" data-i18n="admin.chart_sources_desc">Breakdown between online bookings, reception walk-ins, and auto-shifted slots</p>
          </div>
          <span class="tag-mint" style="font-size: 0.72rem;">Channel Split</span>
        </div>
        <div class="chart-canvas-wrapper">
          <canvas id="chart-booking-sources" aria-label="Patient registration channels doughnut chart" role="img"></canvas>
        </div>
        <div class="chart-accessible-summary" id="desc-booking-sources" aria-live="polite">Loading booking channels summary...</div>
      </div>

      <!-- Chart 4: Doctor Consultation Load (Horizontal Bar) -->
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <h3 class="chart-card-title" data-i18n="admin.chart_doctor_title">Doctor Workload & Completion</h3>
            <p class="chart-card-subtitle" data-i18n="admin.chart_doctor_desc">Total booked visits and completed consultations per physician</p>
          </div>
          <span class="tag-mint" style="font-size: 0.72rem;">Specialist Load</span>
        </div>
        <div class="chart-canvas-wrapper">
          <canvas id="chart-doctor-load" aria-label="Doctor workload horizontal bar chart" role="img"></canvas>
        </div>
        <div class="chart-accessible-summary" id="desc-doctor-load" aria-live="polite">Loading doctor workload summary...</div>
      </div>

    </div>

    <!-- Department Efficiency Table -->
    <div class="card" style="margin-bottom: 2rem; border-top: 3px solid var(--deep-blue); padding: 1.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <h3 style="font-size: 1.2rem; color: var(--deep-blue); display: flex; align-items: center; gap: 0.6rem;">
            <i class="fas fa-clinic-medical" style="color: var(--teal);"></i> <span data-i18n="admin.dept_table_title">Department Turnaround & Wait Times</span>
          </h3>
          <p style="font-size: 0.88rem; color: var(--charcoal-light); margin: 0.2rem 0 0;" data-i18n="admin.dept_table_desc">
            Operational efficiency, average patient waiting duration, and consultation duration per department.
          </p>
        </div>
      </div>

      <div style="overflow-x: auto;">
        <table class="medicare-table">
          <thead>
            <tr>
              <th data-i18n="admin.col_dept_name">Department</th>
              <th data-i18n="admin.col_total">Total Patients</th>
              <th data-i18n="admin.col_completed">Completed</th>
              <th data-i18n="admin.col_missed">Missed</th>
              <th data-i18n="admin.col_avg_wait">Avg Wait Time</th>
              <th data-i18n="admin.col_avg_consult">Avg Consult Duration</th>
            </tr>
          </thead>
          <tbody id="analytics-dept-tbody">
            <tr><td colspan="6" style="text-align: center; padding: 1.5rem;">Loading department metrics...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.applyTranslations) window.applyTranslations();
  await loadAnalyticsFilterOptions();
  await fetchAnalytics();
}

async function loadAnalyticsFilterOptions() {
  try {
    if (analyticsDoctorsList.length === 0) {
      const docRes = await fetch('/api/doctors');
      const docData = await docRes.json();
      if (docData.success && Array.isArray(docData.doctors)) {
        analyticsDoctorsList = docData.doctors;
      }
    }

    if (analyticsDepartmentsList.length === 0) {
      const deptRes = await fetch('/api/departments');
      const deptData = await deptRes.json();
      if (deptData.success && Array.isArray(deptData.departments)) {
        analyticsDepartmentsList = deptData.departments;
      }
    }

    const docSelect = document.getElementById('analytics-doctor-filter');
    if (docSelect && docSelect.options.length <= 1) {
      analyticsDoctorsList.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = doc.name;
        if (lastAnalyticsFilter.doctor_id == doc.id) opt.selected = true;
        docSelect.appendChild(opt);
      });
    }

    const deptSelect = document.getElementById('analytics-dept-filter');
    if (deptSelect && deptSelect.options.length <= 1) {
      analyticsDepartmentsList.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept.id;
        opt.textContent = dept.name;
        if (lastAnalyticsFilter.department_id == dept.id) opt.selected = true;
        deptSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.warn('Could not populate analytics filters:', err);
  }
}

async function fetchAnalytics() {
  const token = localStorage.getItem('healpath_token') || localStorage.getItem('medicare_token');

  if (!token) {
    if (window.showToast) window.showToast('Authentication required. Please log in as an administrator.', 'error');
    if (window.openAuthModal) window.openAuthModal('login');
    return;
  }

  // Ensure Chart.js is loaded
  try {
    await loadChartJs();
  } catch (err) {
    if (window.showToast) window.showToast('Failed to load chart visualization library. Please check network.', 'error');
    return;
  }

  const queryParams = new URLSearchParams();
  if (lastAnalyticsFilter.from) queryParams.set('from', lastAnalyticsFilter.from);
  if (lastAnalyticsFilter.to) queryParams.set('to', lastAnalyticsFilter.to);
  if (lastAnalyticsFilter.doctor_id) queryParams.set('doctor_id', lastAnalyticsFilter.doctor_id);
  if (lastAnalyticsFilter.department_id) queryParams.set('department_id', lastAnalyticsFilter.department_id);

  try {
    const res = await fetch(`/api/admin/analytics?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      if (window.showToast) window.showToast('Session expired or unauthenticated. Please log in as an administrator.', 'error');
      if (window.openAuthModal) window.openAuthModal('login');
      return;
    }

    if (res.status === 403) {
      if (window.showToast) window.showToast('Access denied: Administrator privileges required to access analytics.', 'error');
      return;
    }

    if (res.status === 400) {
      const errData = await res.json().catch(() => ({}));
      if (window.showToast) window.showToast(errData.message || 'Invalid date range or parameters.', 'error');
      return;
    }

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to retrieve analytics data');
    }

    currentAnalyticsData = data;
    renderAnalyticsView(data);

  } catch (err) {
    console.error('Error fetching analytics:', err);
    if (window.showToast) window.showToast('Failed to load analytics: ' + err.message, 'error');
  }
}

function renderAnalyticsView(data) {
  const { summary, daily, peak_hours, by_department, by_doctor, sources, reminders } = data;

  // 1. Populate 6 KPI Cards (Show "No data yet" when a value is null)
  const elTotal = document.getElementById('kpi-total-bookings');
  const elComp = document.getElementById('kpi-completion-rate');
  const elMiss = document.getElementById('kpi-noshow-rate');
  const elWait = document.getElementById('kpi-avg-wait');
  const elConsult = document.getElementById('kpi-avg-consult');
  const elShift = document.getElementById('kpi-auto-shifted');

  if (elTotal) {
    elTotal.textContent = summary.total_bookings !== null ? summary.total_bookings : 'No data yet';
  }
  if (elComp) {
    elComp.textContent = summary.completion_rate !== null ? (summary.completion_rate * 100).toFixed(1) + '%' : 'No data yet';
  }
  if (elMiss) {
    elMiss.textContent = summary.no_show_rate !== null ? (summary.no_show_rate * 100).toFixed(1) + '%' : 'No data yet';
  }
  if (elWait) {
    elWait.textContent = summary.avg_wait_min !== null ? summary.avg_wait_min + ' mins' : 'No data yet';
  }
  if (elConsult) {
    elConsult.textContent = summary.avg_consult_min !== null ? summary.avg_consult_min + ' mins' : 'No data yet';
  }
  if (elShift) {
    elShift.textContent = summary.auto_shifted !== null ? summary.auto_shifted : 'No data yet';
  }

  // 2. Empty State Toggle
  const emptyStateEl = document.getElementById('analytics-empty-state');
  if (emptyStateEl) {
    emptyStateEl.style.display = summary.total_bookings === 0 ? 'block' : 'none';
  }

  // 3. Reminders Banner
  const remBadge = document.getElementById('analytics-reminders-badge');
  const remText = document.getElementById('analytics-reminders-text');
  if (remBadge && remText) {
    if (reminders && reminders.sent !== undefined) {
      remBadge.style.display = 'block';
      remText.textContent = `Automated Reminders: ${reminders.sent} Sent (${reminders.sms_fallback} SMS Fallbacks)`;
    } else {
      remBadge.style.display = 'none';
    }
  }

  // 4. Destroy previous chart instances before rendering
  ['daily', 'peak', 'sources', 'doctor'].forEach(k => {
    if (chartInstances[k]) {
      chartInstances[k].destroy();
      chartInstances[k] = null;
    }
  });

  if (!window.Chart) return;

  // Chart 1: Daily Line Chart
  const dailyCanvas = document.getElementById('chart-daily-bookings');
  if (dailyCanvas) {
    const dailyCtx = dailyCanvas.getContext('2d');
    chartInstances.daily = new Chart(dailyCtx, {
      type: 'line',
      data: {
        labels: daily.map(d => d.date),
        datasets: [
          {
            label: 'Booked',
            data: daily.map(d => d.booked),
            borderColor: '#1B3B6F',
            backgroundColor: 'rgba(27, 59, 111, 0.08)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#1B3B6F'
          },
          {
            label: 'Completed',
            data: daily.map(d => d.completed),
            borderColor: '#2563EB',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#2563EB'
          },
          {
            label: 'Missed (No-Show)',
            data: daily.map(d => d.missed),
            borderColor: '#DC2626',
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            borderDash: [5, 5],
            fill: false,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#DC2626'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans, sans-serif' } } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { grid: { display: false } }
        }
      }
    });

    const descDaily = document.getElementById('desc-daily-bookings');
    if (descDaily) {
      descDaily.textContent = `Between ${data.range.from} and ${data.range.to}, total ${summary.total_bookings} appointments were booked, ${summary.completed} completed, and ${summary.missed} missed.`;
    }
  }

  // Chart 2: Peak Hours Bar Chart
  const peakCanvas = document.getElementById('chart-peak-hours');
  if (peakCanvas) {
    const peakCtx = peakCanvas.getContext('2d');
    chartInstances.peak = new Chart(peakCtx, {
      type: 'bar',
      data: {
        labels: peak_hours.map(p => String(p.hour).padStart(2, '0') + ':00'),
        datasets: [{
          label: 'Scheduled Slots',
          data: peak_hours.map(p => p.count),
          backgroundColor: '#2563EB',
          hoverBackgroundColor: '#1B3B6F',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { grid: { display: false } }
        }
      }
    });

    let peakMax = { hour: 0, count: 0 };
    peak_hours.forEach(p => {
      if (p.count > peakMax.count) peakMax = p;
    });
    const descPeak = document.getElementById('desc-peak-hours');
    if (descPeak) {
      descPeak.textContent = peakMax.count > 0
        ? `Peak patient arrival is at ${String(peakMax.hour).padStart(2, '0')}:00 with ${peakMax.count} appointments.`
        : 'No scheduled appointment distribution recorded for this period.';
    }
  }

  // Chart 3: Booking Sources Doughnut Chart
  const sourcesCanvas = document.getElementById('chart-booking-sources');
  if (sourcesCanvas) {
    const sourcesCtx = sourcesCanvas.getContext('2d');
    const totalSources = (sources.online || 0) + (sources.walk_in || 0) + (sources.auto_shifted || 0);
    chartInstances.sources = new Chart(sourcesCtx, {
      type: 'doughnut',
      data: {
        labels: ['Online Booking', 'Reception Walk-in', 'Auto-Shifted'],
        datasets: [{
          data: totalSources > 0 ? [sources.online, sources.walk_in, sources.auto_shifted] : [0, 0, 0],
          backgroundColor: ['#1B3B6F', '#2563EB', '#BAE6FD'],
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12 } }
        },
        cutout: '65%'
      }
    });

    const descSources = document.getElementById('desc-booking-sources');
    if (descSources) {
      descSources.textContent = `Patient acquisition split: ${sources.online || 0} online, ${sources.walk_in || 0} walk-in, and ${sources.auto_shifted || 0} auto-shifted.`;
    }
  }

  // Chart 4: Doctor Load Horizontal Bar Chart
  const docCanvas = document.getElementById('chart-doctor-load');
  if (docCanvas) {
    const docCtx = docCanvas.getContext('2d');
    const activeDocs = by_doctor.length > 0 ? by_doctor.slice(0, 8) : [];
    chartInstances.doctor = new Chart(docCtx, {
      type: 'bar',
      data: {
        labels: activeDocs.map(d => d.name),
        datasets: [
          {
            label: 'Total Bookings',
            data: activeDocs.map(d => d.total),
            backgroundColor: '#1B3B6F',
            borderRadius: 4
          },
          {
            label: 'Completed Visits',
            data: activeDocs.map(d => d.completed),
            backgroundColor: '#2563EB',
            borderRadius: 4
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12 } }
        },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 } },
          y: { grid: { display: false } }
        }
      }
    });

    const descDoc = document.getElementById('desc-doctor-load');
    if (descDoc) {
      descDoc.textContent = `Consultation distribution across ${activeDocs.length} physicians.`;
    }
  }

  // 5. Populate Department Turnaround Table
  const deptTbody = document.getElementById('analytics-dept-tbody');
  if (deptTbody) {
    if (by_department.length === 0) {
      deptTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--charcoal-light);">No departments found</td></tr>`;
    } else {
      deptTbody.innerHTML = by_department.map(dp => `
        <tr>
          <td style="font-weight: 600; color: var(--deep-blue);">${dp.name}</td>
          <td><span class="badge" style="background: rgba(15,59,100,0.08); color: var(--deep-blue); font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 4px;">${dp.total}</span></td>
          <td style="color: #059669; font-weight: 600;">${dp.completed}</td>
          <td style="color: #DC2626; font-weight: 600;">${dp.missed}</td>
          <td>${dp.avg_wait_min !== null ? dp.avg_wait_min + ' mins' : '<span style="color: var(--charcoal-light); font-style: italic;">No data yet</span>'}</td>
          <td>${dp.avg_consult_min !== null ? dp.avg_consult_min + ' mins' : '<span style="color: var(--charcoal-light); font-style: italic;">No data yet</span>'}</td>
        </tr>
      `).join('');
    }
  }
}

function setAnalyticsPreset(preset) {
  const today = getKolkataDateString();
  let from = today;
  let to = today;

  if (preset === 'today') {
    from = today;
    to = today;
  } else if (preset === '7d') {
    from = getShiftedKolkataDate(today, -6);
    to = today;
  } else if (preset === '30d') {
    from = getShiftedKolkataDate(today, -29);
    to = today;
  }

  lastAnalyticsFilter.preset = preset;
  lastAnalyticsFilter.from = from;
  lastAnalyticsFilter.to = to;

  const fromInput = document.getElementById('analytics-from-date');
  const toInput = document.getElementById('analytics-to-date');
  if (fromInput) fromInput.value = from;
  if (toInput) toInput.value = to;

  ['today', '7d', '30d'].forEach(p => {
    const btn = document.getElementById(`btn-preset-${p}`);
    if (btn) {
      if (p === preset) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });

  fetchAnalytics();
}

function onCustomDateChange() {
  lastAnalyticsFilter.preset = 'custom';
  ['today', '7d', '30d'].forEach(p => {
    const btn = document.getElementById(`btn-preset-${p}`);
    if (btn) btn.classList.remove('active');
  });
}

function applyAnalyticsFilters() {
  const fromInput = document.getElementById('analytics-from-date');
  const toInput = document.getElementById('analytics-to-date');
  const docSelect = document.getElementById('analytics-doctor-filter');
  const deptSelect = document.getElementById('analytics-dept-filter');

  const from = fromInput ? fromInput.value.trim() : '';
  const to = toInput ? toInput.value.trim() : '';
  const docId = docSelect ? docSelect.value : '';
  const deptId = deptSelect ? deptSelect.value : '';

  if (!from || !to) {
    if (window.showToast) window.showToast('Please select both start and end dates', 'error');
    return;
  }

  if (from > to) {
    if (window.showToast) window.showToast('Start date cannot be after end date', 'error');
    return;
  }

  const dt1 = new Date(from);
  const dt2 = new Date(to);
  const diffDays = Math.round((dt2 - dt1) / (1000 * 60 * 60 * 24));
  if (diffDays > 90) {
    if (window.showToast) window.showToast('Maximum allowable date range is 90 days', 'error');
    return;
  }

  lastAnalyticsFilter.from = from;
  lastAnalyticsFilter.to = to;
  lastAnalyticsFilter.doctor_id = docId;
  lastAnalyticsFilter.department_id = deptId;

  fetchAnalytics();
}

function printAnalyticsReport() {
  window.print();
}

function exportAnalyticsCSV() {
  if (!currentAnalyticsData) {
    if (window.showToast) window.showToast('No analytics data available to export.', 'warning');
    return;
  }

  const { range, summary, daily, by_doctor, by_department, reminders } = currentAnalyticsData;
  const rows = [];

  rows.push(['=== SANJEEVAN HOSPITAL ANALYTICS REPORT ===']);
  rows.push(['From', range.from, 'To', range.to, 'Days', range.days]);
  rows.push([]);

  rows.push(['--- SUMMARY METRICS ---']);
  rows.push(['Metric', 'Value']);
  rows.push(['Total Bookings', summary.total_bookings]);
  rows.push(['Completed Consultations', summary.completed]);
  rows.push(['Cancelled Appointments', summary.cancelled]);
  rows.push(['Missed / No-Show Appointments', summary.missed]);
  rows.push(['Auto-Shifted Slots', summary.auto_shifted]);
  rows.push(['Walk-in Registrations', summary.walk_ins]);
  rows.push(['Completion Rate', summary.completion_rate !== null ? (summary.completion_rate * 100).toFixed(1) + '%' : 'N/A']);
  rows.push(['No-Show Rate', summary.no_show_rate !== null ? (summary.no_show_rate * 100).toFixed(1) + '%' : 'N/A']);
  rows.push(['Average Patient Wait (min)', summary.avg_wait_min !== null ? summary.avg_wait_min : 'N/A']);
  rows.push(['Average Doctor Consult (min)', summary.avg_consult_min !== null ? summary.avg_consult_min : 'N/A']);
  if (reminders) {
    rows.push(['Reminders Sent', reminders.sent]);
    rows.push(['SMS Fallbacks', reminders.sms_fallback]);
  }
  rows.push([]);

  rows.push(['--- DAILY BREAKDOWN ---']);
  rows.push(['Date', 'Booked', 'Completed', 'Cancelled', 'Missed']);
  daily.forEach(d => {
    rows.push([d.date, d.booked, d.completed, d.cancelled, d.missed]);
  });
  rows.push([]);

  rows.push(['--- DOCTOR PERFORMANCE ---']);
  rows.push(['Doctor ID', 'Doctor Name', 'Department', 'Total Bookings', 'Completed', 'Missed', 'Avg Wait (min)', 'Avg Consult (min)']);
  by_doctor.forEach(d => {
    rows.push([
      d.id,
      `"${(d.name || '').replace(/"/g, '""')}"`,
      `"${(d.department_name || '').replace(/"/g, '""')}"`,
      d.total,
      d.completed,
      d.missed,
      d.avg_wait_min !== null ? d.avg_wait_min : '',
      d.avg_consult_min !== null ? d.avg_consult_min : ''
    ]);
  });
  rows.push([]);

  rows.push(['--- DEPARTMENT PERFORMANCE ---']);
  rows.push(['Department ID', 'Department Name', 'Total Patients', 'Completed', 'Missed', 'Avg Wait (min)', 'Avg Consult (min)']);
  by_department.forEach(dp => {
    rows.push([
      dp.id,
      `"${(dp.name || '').replace(/"/g, '""')}"`,
      dp.total,
      dp.completed,
      dp.missed,
      dp.avg_wait_min !== null ? dp.avg_wait_min : '',
      dp.avg_consult_min !== null ? dp.avg_consult_min : ''
    ]);
  });

  const csvContent = rows.map(r => r.join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sanjeevan_analytics_${range.from}_to_${range.to}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (window.showToast) window.showToast('Analytics CSV exported successfully', 'success');
}

// Global exposes for Admin Analytics
window.switchAdminSubTab = switchAdminSubTab;
window.openAdminAnalyticsTab = openAdminAnalyticsTab;
window.setAnalyticsPreset = setAnalyticsPreset;
window.onCustomDateChange = onCustomDateChange;
window.applyAnalyticsFilters = applyAnalyticsFilters;
window.exportAnalyticsCSV = exportAnalyticsCSV;
window.printAnalyticsReport = printAnalyticsReport;
window.initAnalyticsDashboard = initAnalyticsDashboard;
window.fetchAnalytics = fetchAnalytics;
window.loadAdminPaymentsTable = loadAdminPaymentsTable;
window.processPaymentRefund = processPaymentRefund;
window.filterAdminAppointments = filterAdminAppointments;

