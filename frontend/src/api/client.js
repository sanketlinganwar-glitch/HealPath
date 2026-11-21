import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Toast dispatch helper
export const showToast = (message, type = 'error') => {
  window.dispatchEvent(
    new CustomEvent('healpath-toast', { detail: { message, type } })
  );
};

// Request interceptor: Attach JWT bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('healpath_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Global error handling & 401 redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    const detail = error.response?.data?.detail || error.message || 'An unexpected error occurred';

    // Show toast for 4xx and 5xx errors (excluding silent lookup 404s)
    if (status !== 404 || !error.config?.url?.includes('/lookup')) {
      showToast(detail, status >= 500 ? 'error' : 'warning');
    }

    if (status === 401) {
      localStorage.removeItem('healpath_token');
      localStorage.removeItem('healpath_user');
      if (!window.location.hash.includes('/login') && !window.location.hash.includes('/patient')) {
        window.location.hash = '#/login';
      }
    }

    return Promise.reject(error);
  }
);

// Resilient API Fetcher with exponential backoff for flaky or offline connections
export async function resilientFetch(fn, maxRetries = 2, delayMs = 1000) {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries || !navigator.onLine) {
        throw err;
      }
      await new Promise((res) => setTimeout(res, delayMs * Math.pow(2, attempt - 1)));
    }
  }
}

// --- Public Reference APIs ---
export const getHealth = () => api.get('/api/health').then(r => r.data);
export const getDepartments = () => api.get('/api/departments').then(r => r.data);
export const getDoctors = (deptId) => api.get('/api/doctors', { params: { department_id: deptId } }).then(r => r.data);
export const getDisplay = (deptId) => api.get('/api/display', { params: { department_id: deptId } }).then(r => r.data);

// --- Auth APIs ---
export const login = (username, password) => api.post('/api/auth/login', { username, password }).then(r => r.data);

// --- Token & Patient APIs ---
export const createToken = (data) => api.post('/api/tokens', data).then(r => r.data);
export const getToken = (id) => api.get(`/api/tokens/${id}`).then(r => r.data);
export const getTokenBySecureHash = (hash) => api.get(`/api/tokens/secure/${hash}`).then(r => r.data);
export const lookupTokens = (phone) => api.get('/api/tokens/lookup', { params: { phone } }).then(r => r.data);
export const rescheduleToken = (id, delayMinutes) => api.post(`/api/tokens/${id}/reschedule`, { delay_minutes: delayMinutes }).then(r => r.data);
export const getTokenMessages = (id) => api.get(`/api/tokens/${id}/messages`).then(r => r.data);

// --- Feature 1: Online Appointment Booking APIs ---
export const getAppointmentSlots = (doctorId, dateStr) => api.get('/api/appointments/slots', { params: { doctor_id: doctorId, date_str: dateStr } }).then(r => r.data);
export const bookAppointment = (data) => api.post('/api/appointments/book', data).then(r => r.data);
export const getMyAppointments = (phone) => api.get('/api/appointments/my', { params: { phone } }).then(r => r.data);
export const getAppointmentDetails = (id) => api.get(`/api/appointments/${id}`).then(r => r.data);
export const rescheduleAppointment = (id, newSlotTime, reason) => api.post(`/api/appointments/${id}/reschedule`, { new_slot_time: newSlotTime, reason }).then(r => r.data);
export const cancelAppointment = (id, reason) => api.post(`/api/appointments/${id}/cancel`, { reason }).then(r => r.data);
export const checkInAppointment = (id) => api.post(`/api/appointments/${id}/check-in`).then(r => r.data);

// --- Feature 4: Emergency Patient Priority APIs ---
export const flagEmergency = (tokenId, reason) => api.post(`/api/tokens/${tokenId}/emergency-flag`, { reason }).then(r => r.data);
export const verifyEmergency = (tokenIdOrPayload, actionOrUndefined, clinicalNotes) => {
  if (typeof tokenIdOrPayload === 'object' && tokenIdOrPayload !== null) {
    const { token_id, verified, action, clinical_notes } = tokenIdOrPayload;
    const finalAction = action || (verified ? 'verify_emergency' : 'downgrade_normal');
    const notes = clinical_notes || 'Clinically evaluated by attending physician.';
    return api.post(`/api/tokens/${token_id}/emergency-verify`, { action: finalAction, clinical_notes: notes }).then(r => r.data);
  }
  return api.post(`/api/tokens/${tokenIdOrPayload}/emergency-verify`, { action: actionOrUndefined, clinical_notes: clinicalNotes || 'Clinically evaluated by attending physician.' }).then(r => r.data);
};
export const verifyEmergencyToken = verifyEmergency;
export const getEmergencyAudit = (tokenId) => api.get(`/api/tokens/${tokenId}/emergency-audit`).then(r => r.data);

// --- Feature 10: Digital Prescription Management APIs ---
export const createPrescription = (data) => api.post('/api/prescriptions', data).then(r => r.data);
export const getPrescriptionForToken = (tokenId) => api.get(`/api/prescriptions/token/${tokenId}`).then(r => r.data);
export const getPrescriptionByToken = getPrescriptionForToken;
export const getPrescriptionById = (id) => api.get(`/api/prescriptions/${id}`).then(r => r.data);

// --- Feature 9: Patient Feedback and Ratings APIs ---
export const submitFeedback = (data) => api.post('/api/feedback', data).then(r => r.data);
export const getFeedbackSummary = (deptId) => api.get('/api/feedback/summary', { params: { department_id: deptId } }).then(r => r.data);

// --- Feature 7: Doctor Availability and Duty Roster APIs ---
export const updateDoctorRoster = (doctorIdOrPayload, dataOrUndefined) => {
  if (typeof doctorIdOrPayload === 'object' && doctorIdOrPayload !== null) {
    const { doctor_id, ...rest } = doctorIdOrPayload;
    return api.patch(`/api/doctors/${doctor_id}/roster`, rest).then(r => r.data);
  }
  return api.patch(`/api/doctors/${doctorIdOrPayload}/roster`, dataOrUndefined).then(r => r.data);
};
export const reassignDoctorQueue = (doctorId, targetDoctorId) => api.post(`/api/doctors/${doctorId}/reassign-queue`, null, { params: { target_doctor_id: targetDoctorId } }).then(r => r.data);

// --- Feature 5 & 2: Advanced Hospital Analytics & Notification Logs ---
export const getAdminAnalytics = (range = 'today') => api.get('/api/admin/analytics', { params: { range } }).then(r => r.data);
export const getNotificationLogs = () => api.get('/api/admin/notifications').then(r => r.data);

// --- Staff Core APIs ---
export const getQueue = (deptId) => api.get('/api/queue', { params: { department_id: deptId } }).then(r => r.data);
export const getStats = (deptId) => api.get('/api/stats', { params: { department_id: deptId } }).then(r => r.data);
export const getDoctorCurrent = (doctorId) => api.get(`/api/doctors/${doctorId}/current`).then(r => r.data);
export const callNext = (doctorId) => api.post(`/api/doctors/${doctorId}/call-next`).then(r => r.data);
export const completeToken = (id) => api.post(`/api/tokens/${id}/complete`).then(r => r.data);
export const skipToken = (id) => api.post(`/api/tokens/${id}/skip`).then(r => r.data);
export const requeueToken = (id) => api.post(`/api/tokens/${id}/requeue`).then(r => r.data);
export const updateTokenPriority = (id, priority) => api.patch(`/api/tokens/${id}/priority`, { priority }).then(r => r.data);
export const sendMessage = (tokenId, text) => api.post('/api/messages', { token_id: tokenId, text }).then(r => r.data);
export const getAppointments = (deptId) => api.get('/api/appointments', { params: { department_id: deptId } }).then(r => r.data);
export const getOTSchedule = () => api.get('/api/ot-schedule').then(r => r.data);
export const updateDoctorStatus = (doctorId, status) => api.patch(`/api/doctors/${doctorId}/status`, { status }).then(r => r.data);

// --- AI & Chat APIs ---
export const suggestDepartment = (symptoms) => api.post('/api/ai/suggest-department', { symptoms }).then(r => r.data);
export const chat = (message, language = 'en', tokenId = null) => api.post('/api/chat', { message, language, token_id: tokenId }).then(r => r.data);

// --- Demo APIs ---
export const demoReset = () => api.post('/api/demo/reset').then(r => r.data);
export const demoSimulate = (count = 5) => api.post('/api/demo/simulate', { count }).then(r => r.data);

export default api;
