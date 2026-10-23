/**
 * HealPath Live Hospital Queue & Token System
 * Real-time updates via Socket.io, estimated wait calculations, audio token announcements
 */

let socket = null;
let currentFilterDoctor = '';

document.addEventListener('DOMContentLoaded', () => {
  initQueue();
});

function initQueue() {
  loadDoctorsFilter();
  fetchQueueData();

  // Initialize Socket.io
  if (typeof io !== 'undefined') {
    socket = io();

    socket.on('queue:updated', () => {
      fetchQueueData();
    });

    socket.on('queue:patient_called', (data) => {
      announceTokenCall(data);
      fetchQueueData();
    });

    socket.on('queue:patient_completed', () => {
      fetchQueueData();
    });

    socket.on('appointment:checked_in', (data) => {
      if (window.showToast) {
        window.showToast(`Token ${data.tokenNo} checked in successfully! Missed-slot timer paused.`, 'success');
      }
      fetchQueueData();
    });
  }

  // Doctor filter change
  const doctorSelect = document.getElementById('queue-doctor-filter');
  if (doctorSelect) {
    doctorSelect.addEventListener('change', (e) => {
      currentFilterDoctor = e.target.value;
      fetchQueueData();
    });
  }

  // Auto-refresh fallback every 20 seconds
  setInterval(fetchQueueData, 20000);
}

async function loadDoctorsFilter() {
  const select = document.getElementById('queue-doctor-filter');
  if (!select) return;

  try {
    const res = await fetch('/api/doctors');
    const data = await res.json();
    if (data.success && data.doctors) {
      select.innerHTML = '<option value="">-- All Doctors & Departments --</option>';
      data.doctors.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = `${doc.name} (${doc.specialty})`;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Failed to load doctors filter:', err);
  }
}

async function fetchQueueData() {
  const boardContainer = document.getElementById('queue-live-board');
  const tableContainer = document.getElementById('queue-table-body');
  const statsWaiting = document.getElementById('stat-queue-waiting');
  const statsConsulting = document.getElementById('stat-queue-consulting');
  const statsCompleted = document.getElementById('stat-queue-completed');

  try {
    // 1. Fetch Board Data
    const resBoard = await fetch('/api/queue/live-board');
    const dataBoard = await resBoard.json();

    if (dataBoard.success && boardContainer) {
      let filteredDoctors = dataBoard.board;
      if (currentFilterDoctor) {
        filteredDoctors = filteredDoctors.filter(d => d.doctor_id === Number(currentFilterDoctor));
      }

      boardContainer.innerHTML = '';
      filteredDoctors.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'queue-doctor-card';

        const callingToken = doc.current_calling?.token_no || 'NONE';
        const callingPatient = doc.current_calling?.patient_name || 'Waiting for next patient';

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div>
              <h3 style="font-size: 1.15rem; color: var(--deep-blue);">${doc.doctor_name}</h3>
              <p style="font-size: 0.82rem; color: var(--teal); font-weight: 600;">${doc.specialty} &bull; ${doc.room_no}</p>
            </div>
            <span class="tag-mint" style="font-size: 0.72rem;">${doc.department_name}</span>
          </div>

          <div class="now-calling-box">
            <span style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--mint);">Now Calling</span>
            <div class="now-calling-token">${callingToken}</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: rgba(255,255,255,0.9);">${callingPatient}</div>
          </div>

          <div style="margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; color: var(--charcoal); margin-bottom: 0.4rem;">
              <span>Next in Queue (${doc.next_tokens.length})</span>
              <span style="color: var(--teal);">Completed: ${doc.total_completed}</span>
            </div>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
              ${doc.next_tokens.length > 0
                ? doc.next_tokens.map(t => `<span class="tag-mint" style="font-size: 0.78rem;">${t.token_no}</span>`).join('')
                : '<span style="font-size: 0.8rem; color: var(--charcoal-light); font-style: italic;">No patients waiting</span>'}
            </div>
          </div>
        `;
        boardContainer.appendChild(card);
      });
    }

    // 2. Fetch Detailed Queue Table
    const url = currentFilterDoctor ? `/api/queue?doctor_id=${currentFilterDoctor}` : '/api/queue';
    const resTable = await fetch(url);
    const dataTable = await resTable.json();

    if (dataTable.success && tableContainer) {
      tableContainer.innerHTML = '';

      if (dataTable.queue.length === 0) {
        tableContainer.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 2rem; color: var(--charcoal-light);">
              No appointments registered in the queue today.
            </td>
          </tr>
        `;
      } else {
        dataTable.queue.forEach(item => {
          const tr = document.createElement('tr');
          const isCalling = item.status === 'in_progress';
          if (isCalling) tr.style.backgroundColor = 'rgba(20, 187, 166, 0.08)';

          tr.innerHTML = `
            <td><strong style="color: var(--teal); font-size: 1.05rem;">${item.token_no}</strong></td>
            <td>
              <strong>${item.patient_name}</strong>
              ${item.age ? `<span style="font-size: 0.8rem; color: var(--charcoal-light); margin-left: 4px;">(${item.age}y)</span>` : ''}
            </td>
            <td>${item.doctor_name} <br><small style="color: var(--charcoal-light);">${item.room_no}</small></td>
            <td>${item.slot_time || '-'}</td>
            <td>
              <span class="queue-status-badge status-${item.status}">
                ${formatStatus(item.status)}
              </span>
            </td>
            <td>
              ${item.status === 'waiting'
                ? `<strong>~${item.est_wait_minutes} mins</strong>`
                : item.status === 'in_progress' ? '<span style="color: var(--teal); font-weight: 700;">In Room Now</span>' : '-'}
            </td>
            <td>
              ${!item.checked_in && item.status === 'waiting' ? `
                <button class="btn btn-sm btn-primary" onclick="handleCheckIn(${item.appointment_id})">
                  <i class="fas fa-check"></i> Check In
                </button>
              ` : `
                <span style="color: var(--teal); font-size: 0.82rem; font-weight: 700;">
                  <i class="fas fa-check-circle"></i> Checked In
                </span>
              `}
            </td>
          `;
          tableContainer.appendChild(tr);
        });
      }
    }

    // 3. Fetch Counters
    const resStats = await fetch('/api/queue/stats');
    const dataStats = await resStats.json();
    if (dataStats.success) {
      if (statsWaiting) statsWaiting.textContent = dataStats.stats.waiting;
      if (statsConsulting) statsConsulting.textContent = dataStats.stats.in_progress;
      if (statsCompleted) statsCompleted.textContent = dataStats.stats.completed;
    }

  } catch (err) {
    console.error('Error fetching queue data:', err);
  }
}

function formatStatus(status) {
  switch (status) {
    case 'waiting': return 'Waiting';
    case 'in_progress': return 'In Consultation';
    case 'completed': return 'Completed';
    case 'missed': return 'Missed';
    default: return status;
  }
}

// Token Announcement Audio / Speech
function announceTokenCall(data) {
  // Voice Synthesis if enabled
  if ('speechSynthesis' in window) {
    const text = `Token number ${data.tokenNo}, patient ${data.patientName}, please proceed to your consultation room.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  // Display Announcement Banner
  let banner = document.getElementById('announcement-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'announcement-banner';
    banner.style.cssText = `
      position: fixed;
      top: 90px;
      left: 50%;
      transform: translateX(-50%);
      background: #0F3B64;
      color: #FFFFFF;
      border: 3px solid #14BBA6;
      border-radius: 14px;
      padding: 1.25rem 2.5rem;
      box-shadow: 0 15px 40px rgba(0,0,0,0.4);
      z-index: 9999;
      text-align: center;
      animation: bounceIn 0.5s ease;
    `;
    document.body.appendChild(banner);
  }

  banner.innerHTML = `
    <div style="font-size: 0.85rem; color: #A7D8D1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">
      <i class="fas fa-bullhorn" style="color: #14BBA6;"></i> Now Calling Next Patient
    </div>
    <div style="font-size: 2.4rem; font-weight: 800; color: #14BBA6; margin: 0.2rem 0;">
      ${data.tokenNo}
    </div>
    <div style="font-size: 1.15rem; font-weight: 600;">
      ${data.patientName}
    </div>
  `;
  banner.style.display = 'block';

  setTimeout(() => {
    banner.style.display = 'none';
  }, 9000);
}

// Check-in Action
async function handleCheckIn(appointmentId) {
  try {
    const res = await fetch(`/api/appointments/${appointmentId}/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message);
    }
    fetchQueueData();
  } catch (err) {
    alert(err.message);
  }
}

// Check-in by Token Input
async function handleCheckInByToken() {
  const tokenInput = document.getElementById('checkin-token-input');
  if (!tokenInput || !tokenInput.value.trim()) {
    alert('Please enter your Token Number (e.g. CARD-001)');
    return;
  }

  const tokenNo = tokenInput.value.trim().toUpperCase();

  try {
    const res = await fetch('/api/queue');
    const data = await res.json();
    if (data.success) {
      const match = data.queue.find(q => q.token_no.toUpperCase() === tokenNo);
      if (match) {
        await handleCheckIn(match.appointment_id);
        tokenInput.value = '';
        if (window.showToast) {
          window.showToast(`Welcome! Token ${tokenNo} has been marked checked-in.`, 'success');
        }
      } else {
        alert(`Token ${tokenNo} not found in today's active appointments.`);
      }
    }
  } catch (err) {
    alert(err.message);
  }
}

// Global expose
window.handleCheckIn = handleCheckIn;
window.handleCheckInByToken = handleCheckInByToken;
window.fetchQueueData = fetchQueueData;
