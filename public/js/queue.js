/**
 * HealPath Live Hospital Queue & Token System
 * Real-time updates via Socket.io, estimated wait calculations, audio token announcements,
 * privacy-preserving patient masking, and automatic reconnection handling.
 */

let socket = null;
let currentFilterDoctor = '';
let isAudioEnabled = true;

// Helper to mask patient name for public display privacy (e.g. "Rohan Gupta" -> "Rohan G***")
function maskPatientName(name) {
  if (!name || typeof name !== 'string') return 'Patient';
  const clean = name.trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].length > 2 ? `${parts[0].slice(0, 2)}***` : `${parts[0]}*`;
  }
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first} ${last.charAt(0)}***`;
}

document.addEventListener('DOMContentLoaded', () => {
  initQueue();
});

function initQueue() {
  loadDoctorsFilter();
  fetchQueueData();

  // Initialize Socket.io with auto-reconnection
  if (typeof io !== 'undefined') {
    socket = io({
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    socket.on('connect', () => {
      console.log('🟢 [Queue TV] Socket connected to realtime server');
      updateLiveSyncBadge(true);
      fetchQueueData();
    });

    socket.on('disconnect', () => {
      console.warn('🟡 [Queue TV] Socket disconnected. Reconnecting...');
      updateLiveSyncBadge(false);
    });

    socket.on('connect_error', () => {
      updateLiveSyncBadge(false);
    });

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
        window.showToast(`Token ${data.tokenNo || ''} checked in! Grace period stopped.`, 'success');
      }
      fetchQueueData();
    });

    socket.on('patient:checkedin', (data) => {
      const maskedName = maskPatientName(data.patientName);
      if (window.showToast) {
        window.showToast(`✅ Token ${data.tokenNo || data.token} (${maskedName}) arrived at OPD.`, 'success');
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

  // Fallback auto-refresh every 15 seconds (keeps data fresh even if socket drops)
  setInterval(fetchQueueData, 15000);
}

function updateLiveSyncBadge(isConnected) {
  let badge = document.getElementById('tv-live-sync-indicator');
  if (!badge) {
    const brandSub = document.querySelector('.tv-brand-sub');
    if (brandSub) {
      badge = document.createElement('span');
      badge.id = 'tv-live-sync-indicator';
      badge.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; margin-left: 8px; font-weight: 700;';
      brandSub.appendChild(badge);
    }
  }

  if (badge) {
    if (isConnected) {
      badge.innerHTML = `<span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981; display: inline-block;"></span> <span style="color: #6EE7B7;">Live Connected</span>`;
    } else {
      badge.innerHTML = `<span style="width: 8px; height: 8px; border-radius: 50%; background: #F59E0B; display: inline-block;"></span> <span style="color: #FCD34D;">Reconnecting...</span>`;
    }
  }
}

async function loadDoctorsFilter() {
  const select = document.getElementById('queue-doctor-filter');
  if (!select) return;

  try {
    const res = await fetch('/api/doctors');
    const data = await res.json();
    if (data.success && data.doctors) {
      select.innerHTML = '<option value="">-- All Hospital Doctors & Rooms --</option>';
      data.doctors.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = `${doc.name} (${doc.specialty || doc.specialization}) - ${doc.room_no || doc.room}`;
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

        const callingToken = doc.current_calling?.token_no || 'STANDBY';
        const rawCallingPatient = doc.current_calling?.patient_name || null;
        const callingPatient = rawCallingPatient
          ? maskPatientName(rawCallingPatient)
          : 'Ready for next patient';

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div>
              <h3 style="font-size: 1.15rem; color: #FFFFFF; font-weight: 800; margin: 0;">${doc.doctor_name}</h3>
              <p style="font-size: 0.82rem; color: var(--teal); font-weight: 600; margin-top: 2px;">
                ${doc.specialty || 'OPD'} &bull; ${doc.room_no || 'Consultation Suite'}
              </p>
            </div>
            <span class="tag-mint" style="font-size: 0.72rem; background: rgba(20, 187, 166, 0.2); color: #A7F3D0; padding: 2px 8px; border-radius: 6px;">
              ${doc.department_name}
            </span>
          </div>

          <div class="now-calling-box">
            <span style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--mint); font-weight: 700;">
              <i class="fas fa-bullhorn" style="margin-right: 4px;"></i> Now Calling
            </span>
            <div class="now-calling-token">${callingToken}</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: rgba(255,255,255,0.9);">${callingPatient}</div>
          </div>

          <div style="margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; color: #CBD5E1; margin-bottom: 0.4rem;">
              <span>Next in Queue (${doc.next_tokens ? doc.next_tokens.length : 0})</span>
              <span style="color: var(--teal);">Completed: ${doc.total_completed || 0}</span>
            </div>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
              ${doc.next_tokens && doc.next_tokens.length > 0
                ? doc.next_tokens.map(t => `<span class="tag-mint" style="font-size: 0.78rem; font-weight: 700; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); padding: 3px 8px; border-radius: 6px;">${t.token_no}</span>`).join('')
                : '<span style="font-size: 0.8rem; color: #94A3B8; font-style: italic;">No patients waiting</span>'}
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
            <td colspan="7" style="text-align: center; padding: 2.5rem; color: #94A3B8;">
              No active appointments registered in the queue today.
            </td>
          </tr>
        `;
      } else {
        dataTable.queue.forEach(item => {
          const tr = document.createElement('tr');
          const isCalling = item.status === 'in_progress';
          if (isCalling) tr.style.backgroundColor = 'rgba(20, 187, 166, 0.12)';

          const maskedName = maskPatientName(item.patient_name);

          tr.innerHTML = `
            <td><strong style="color: var(--teal); font-size: 1.05rem; font-family: monospace;">${item.token_no}</strong></td>
            <td>
              <strong style="color: #F8FAFC;">${maskedName}</strong>
              ${item.age ? `<span style="font-size: 0.8rem; color: #94A3B8; margin-left: 4px;">(${item.age}y)</span>` : ''}
            </td>
            <td>
              ${item.doctor_name || 'Assigned Doctor'}<br>
              <small style="color: #94A3B8;">${item.room_no || 'Consultation Suite'}</small>
            </td>
            <td>${item.slot_time || item.time || '-'}</td>
            <td>
              <span class="queue-status-badge status-${item.status}">
                ${formatStatus(item.status)}
              </span>
            </td>
            <td>
              ${item.status === 'waiting'
                ? `<strong style="color: #38BDF8;">~${item.est_wait_minutes || 10}m</strong>`
                : item.status === 'in_progress' ? '<span style="color: #10B981; font-weight: 700;">In Room Now</span>' : '-'}
            </td>
            <td>
              ${!item.checked_in && item.status === 'waiting' ? `
                <button class="btn btn-sm btn-primary" onclick="handleCheckIn(${item.appointment_id})">
                  <i class="fas fa-check"></i> Check In
                </button>
              ` : `
                <span style="color: #10B981; font-size: 0.82rem; font-weight: 700;">
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
    if (dataStats.success && dataStats.stats) {
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

// Token Announcement Audio / Speech & Visual Overlay
function announceTokenCall(data) {
  const maskedName = maskPatientName(data.patientName);
  const tokenNo = data.tokenNo || data.token;
  const room = data.roomNo || data.room || 'assigned consultation room';

  // Voice Announcement via Web Speech API
  if (isAudioEnabled && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const text = `Token number ${tokenNo}. Patient ${maskedName}, please proceed to your consultation room.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis warning:', e);
    }
  }

  // Display Announcement On-Screen Banner
  let banner = document.getElementById('announcement-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'announcement-banner';
    banner.style.cssText = `
      position: fixed;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: #061120;
      color: #FFFFFF;
      border: 3px solid var(--primary-teal, #14BBA6);
      border-radius: 20px;
      padding: 1.5rem 3rem;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
      z-index: 9999;
      text-align: center;
      min-width: 320px;
      max-width: 90vw;
      animation: bounceIn 0.4s ease;
    `;
    document.body.appendChild(banner);
  }

  banner.innerHTML = `
    <div style="font-size: 0.85rem; color: #93C5FD; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 0.35rem;">
      <i class="fas fa-bullhorn" style="color: #14BBA6; margin-right: 6px;"></i> Now Calling Next Turn
    </div>
    <div style="font-size: 3rem; font-weight: 900; color: #14BBA6; font-family: monospace; letter-spacing: 0.05em; line-height: 1.1;">
      ${tokenNo}
    </div>
    <div style="font-size: 1.1rem; font-weight: 700; color: #F8FAFC; margin-top: 0.35rem;">
      ${maskedName}
    </div>
    <div style="font-size: 0.85rem; color: #A7F3D0; font-weight: 600; margin-top: 0.25rem;">
      Please proceed to ${room}
    </div>
  `;
  banner.style.display = 'block';

  setTimeout(() => {
    banner.style.display = 'none';
  }, 8000);
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
    alert('Please enter your Token Number (e.g. CARD-001 or SANJ-101)');
    return;
  }

  const tokenNo = tokenInput.value.trim().toUpperCase();

  try {
    const res = await fetch('/api/checkin/manual-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenNo })
    });
    const data = await res.json();
    if (res.status === 200) {
      tokenInput.value = '';
      if (window.showToast) {
        window.showToast(`Arrival confirmed for Token ${tokenNo}!`, 'success');
      } else {
        alert(`Arrival confirmed for Token ${tokenNo}! Please proceed to room.`);
      }
      fetchQueueData();
    } else {
      alert(data.message || `Token ${tokenNo} could not be checked in.`);
    }
  } catch (err) {
    alert(err.message || 'Error processing check-in.');
  }
}

// Global expose
window.handleCheckIn = handleCheckIn;
window.handleCheckInByToken = handleCheckInByToken;
window.fetchQueueData = fetchQueueData;
