/**
 * MediCare Main Script
 * Handles Navigation, Real-time Socket Indicator, Toast Notifications, Modals & Auth State
 */

// Initialize Socket.io connection
let socket = null;
if (typeof io !== 'undefined') {
  socket = io();

  socket.on('connect', () => {
    updateOnlineStatus(true);
    console.log('✅ [Socket.io] Connected to MediCare Realtime Server');
  });

  socket.on('disconnect', () => {
    updateOnlineStatus(false);
    console.warn('⚠️ [Socket.io] Disconnected from server');
  });

  // Listen for WhatsApp notifications broadcasted by server
  socket.on('whatsapp:sent', (data) => {
    showWhatsAppNotification(data);
  });
}

function updateOnlineStatus(isOnline) {
  const dot = document.querySelector('.online-dot');
  const text = document.querySelector('.online-status-text');
  if (dot) {
    if (isOnline) {
      dot.classList.remove('offline');
      if (text) text.textContent = window.medicareI18n ? window.medicareI18n.t('online') : 'Online';
    } else {
      dot.classList.add('offline');
      if (text) text.textContent = window.medicareI18n ? window.medicareI18n.t('offline') : 'Offline';
    }
  }
}

// Toast notification helper
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 90px;
      right: 25px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: #0F3B64;
    color: #FFFFFF;
    border-left: 4px solid #14BBA6;
    padding: 1rem 1.25rem;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    font-size: 0.9rem;
    max-width: 380px;
    pointer-events: auto;
    animation: slideInRight 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  `;

  toast.innerHTML = `
    <i class="fas fa-bell" style="color: #14BBA6; font-size: 1.1rem;"></i>
    <div style="flex: 1;">${message}</div>
    <button style="background: none; border: none; color: #A7D8D1; cursor: pointer; font-size: 1rem;" onclick="this.parentElement.remove()">&times;</button>
  `;

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// WhatsApp Live Pop-up Simulation
function showWhatsAppNotification(data) {
  const toastContainer = document.getElementById('toast-container') || (() => {
    const c = document.createElement('div');
    c.id = 'toast-container';
    c.style.cssText = 'position: fixed; top: 90px; right: 25px; z-index: 9999; display: flex; flex-direction: column; gap: 0.75rem;';
    document.body.appendChild(c);
    return c;
  })();

  const waToast = document.createElement('div');
  waToast.style.cssText = `
    background: #075E54;
    color: #FFFFFF;
    border-left: 4px solid #25D366;
    padding: 1rem 1.25rem;
    border-radius: 12px;
    box-shadow: 0 12px 30px rgba(0,0,0,0.3);
    font-size: 0.88rem;
    max-width: 400px;
    animation: slideInRight 0.4s ease;
  `;

  waToast.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
      <span style="font-weight: 700; color: #25D366; display: flex; align-items: center; gap: 0.4rem;">
        <i class="fab fa-whatsapp" style="font-size: 1.1rem;"></i> WhatsApp Confirmation Sent
      </span>
      <span style="font-size: 0.75rem; color: #A7D8D1;">Just Now</span>
    </div>
    <div style="font-size: 0.84rem; line-height: 1.4; color: #ECE5DD;">
      <strong>To:</strong> ${data.recipientPhone || 'Patient'}<br>
      "${data.messageText || data.text || ''}"
    </div>
    <div style="margin-top: 0.6rem; display: flex; justify-content: flex-end;">
      <a href="https://wa.me/${(data.recipientPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(data.messageText || '')}" target="_blank" style="color: #25D366; font-size: 0.78rem; font-weight: 700; text-decoration: underline;">
        Open in WhatsApp &rarr;
      </a>
    </div>
  `;

  toastContainer.appendChild(waToast);
  setTimeout(() => waToast.remove(), 8000);
}

// DOM Setup on Load
document.addEventListener('DOMContentLoaded', () => {
  // Dismiss Page Loader
  const loader = document.getElementById('page-loader');
  if (loader) {
    setTimeout(() => {
      loader.style.opacity = '0';
      loader.style.visibility = 'hidden';
      setTimeout(() => loader.remove(), 600);
    }, 400);
  }

  // Mobile Hamburger Menu
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const icon = mobileToggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
      }
    });
  }

  // Scroll To Top Button
  const scrollTopBtn = document.querySelector('.scroll-top-btn');
  if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    });
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Language Selector
  const langSelect = document.getElementById('lang-select');
  if (langSelect && window.medicareI18n) {
    langSelect.value = window.medicareI18n.getLang();
    langSelect.addEventListener('change', (e) => {
      window.medicareI18n.setLang(e.target.value);
    });
  }

  // Check Login State and update Auth Buttons in Header
  checkAuthState();
});

// Auth state management in header
function checkAuthState() {
  const token = localStorage.getItem('medicare_token');
  const userJson = localStorage.getItem('medicare_user');
  const authContainer = document.getElementById('header-auth-container');

  if (authContainer) {
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        authContainer.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <a href="dashboard.html" class="btn btn-sm btn-secondary" style="font-weight: 700;">
              <i class="fas fa-columns"></i> ${user.name.split(' ')[0]} (${user.role.toUpperCase()})
            </a>
            <button class="btn btn-sm btn-outline-white" style="color: var(--status-booked); border-color: rgba(229,72,77,0.4);" onclick="handleLogout()">
              <i class="fas fa-sign-out-alt"></i>
            </button>
          </div>
        `;
      } catch (e) {
        localStorage.removeItem('medicare_token');
        localStorage.removeItem('medicare_user');
      }
    } else {
      authContainer.innerHTML = `
        <button class="btn btn-sm btn-secondary" onclick="openAuthModal('login')">
          <i class="fas fa-user-circle"></i> <span data-i18n="login_register">Login / Register</span>
        </button>
      `;
    }
  }
}

function handleLogout() {
  localStorage.removeItem('medicare_token');
  localStorage.removeItem('medicare_user');
  showToast('Logged out successfully', 'info');
  setTimeout(() => window.location.reload(), 500);
}

// Help Modal
function openHelpModal() {
  let modal = document.getElementById('help-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'help-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 style="color: var(--deep-blue); display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-circle-question" style="color: var(--teal);"></i> MediCare Help & Guidance
          </h3>
          <button class="modal-close-btn" onclick="closeModal('help-modal')">&times;</button>
        </div>
        <div style="margin-bottom: 1.25rem;">
          <h4 style="margin-bottom: 0.4rem; color: var(--deep-blue);">1. Booking an Appointment</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0.8rem;">Click on <strong>Book Appointment</strong>, select your desired Department, choose a Doctor, pick a date, and select an <em>Available (Teal)</em> slot.</p>
          
          <h4 style="margin-bottom: 0.4rem; color: var(--deep-blue);">2. Live Queue & Missed Slot Protection</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0.8rem;">Check your token status in real-time on the <strong>Live Queue</strong> screen. We offer an automatic <strong>10-minute grace period</strong>. If you arrive late, you are automatically shifted to the next slot.</p>
          
          <h4 style="margin-bottom: 0.4rem; color: var(--deep-blue);">3. Immediate WhatsApp Notifications</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0.8rem;">Every booking, reschedule, and queue shift is instantly confirmed via WhatsApp message with your token and doctor details.</p>
          
          <h4 style="margin-bottom: 0.4rem; color: var(--deep-blue);">4. Emergency Assistance</h4>
          <p style="font-size: 0.9rem; color: var(--status-booked); font-weight: 700;">Hotline: +91 98765 43210 (24x7 Ambulance Dispatch)</p>
        </div>
        <button class="btn btn-primary" style="width: 100%;" onclick="closeModal('help-modal')">Got It</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.classList.add('active');
}

// Auth Modal (Login / Register)
function openAuthModal(mode = 'login') {
  let modal = document.getElementById('auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  const isLogin = mode === 'login';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 style="color: var(--deep-blue); display: flex; align-items: center; gap: 0.5rem;">
          <i class="fas fa-user-shield" style="color: var(--teal);"></i> ${isLogin ? 'Login to MediCare' : 'Create Patient Account'}
        </h3>
        <button class="modal-close-btn" onclick="closeModal('auth-modal')">&times;</button>
      </div>

      <!-- Quick Demo Role Switcher for Hackathon Testing -->
      <div style="background: var(--light-gray); padding: 0.75rem; border-radius: 8px; margin-bottom: 1.25rem;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--deep-blue); display: block; margin-bottom: 0.4rem;">QUICK DEMO CREDENTIALS:</span>
        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
          <button class="btn btn-sm btn-secondary" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;" onclick="fillDemoCredentials('patient')">Patient</button>
          <button class="btn btn-sm btn-secondary" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;" onclick="fillDemoCredentials('doctor')">Doctor</button>
          <button class="btn btn-sm btn-secondary" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;" onclick="fillDemoCredentials('reception')">Receptionist</button>
          <button class="btn btn-sm btn-secondary" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;" onclick="fillDemoCredentials('admin')">Admin</button>
        </div>
      </div>

      <form id="auth-form" onsubmit="handleAuthSubmit(event, '${mode}')">
        ${!isLogin ? `
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" id="auth-name" class="form-control" required placeholder="e.g. John Doe">
          </div>
          <div class="form-group">
            <label class="form-label">Phone / WhatsApp</label>
            <input type="tel" id="auth-phone" class="form-control" required placeholder="+91 9876543210">
          </div>
        ` : ''}

        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" id="auth-email" class="form-control" required placeholder="your.name@email.com">
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" id="auth-password" class="form-control" required placeholder="••••••••">
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">
          ${isLogin ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div style="text-align: center; margin-top: 1.25rem; font-size: 0.88rem;">
        ${isLogin ? `
          Don't have an account? <a href="javascript:void(0)" onclick="openAuthModal('register')" style="font-weight: 700;">Register here</a>
        ` : `
          Already have an account? <a href="javascript:void(0)" onclick="openAuthModal('login')" style="font-weight: 700;">Sign in</a>
        `}
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function fillDemoCredentials(role) {
  const emailInput = document.getElementById('auth-email');
  const passInput = document.getElementById('auth-password');
  if (!emailInput || !passInput) return;

  if (role === 'patient') {
    emailInput.value = 'patient@medicare.com';
    passInput.value = 'patient123';
  } else if (role === 'doctor') {
    emailInput.value = 'doctor.sharma@medicare.com';
    passInput.value = 'doctor123';
  } else if (role === 'reception') {
    emailInput.value = 'reception@medicare.com';
    passInput.value = 'reception123';
  } else if (role === 'admin') {
    emailInput.value = 'admin@medicare.com';
    passInput.value = 'admin123';
  }
}

async function handleAuthSubmit(e, mode) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  try {
    let url = '/api/auth/login';
    let body = { email, password };

    if (mode === 'register') {
      url = '/api/auth/register';
      const name = document.getElementById('auth-name').value;
      const phone = document.getElementById('auth-phone').value;
      body = { name, email, phone, password };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Authentication failed');
    }

    localStorage.setItem('medicare_token', data.token);
    localStorage.setItem('medicare_user', JSON.stringify(data.user));

    showToast(`Welcome back, ${data.user.name}!`, 'success');
    closeModal('auth-modal');
    checkAuthState();

    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 600);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Global expose
window.openHelpModal = openHelpModal;
window.openAuthModal = openAuthModal;
window.closeModal = closeModal;
window.fillDemoCredentials = fillDemoCredentials;
window.handleAuthSubmit = handleAuthSubmit;
window.handleLogout = handleLogout;
window.showToast = showToast;
