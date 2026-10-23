import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
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

    // Show toast for 4xx and 5xx errors
    if (status !== 404 || !error.config.url.includes('/lookup')) {
      showToast(detail, status >= 500 ? 'error' : 'warning');
    }

    if (status === 401) {
      localStorage.removeItem('healpath_token');
      localStorage.removeItem('healpath_user');
      // Redirect to login if on protected route
      if (!window.location.hash.includes('/login') && !window.location.hash.includes('/patient')) {
        window.location.hash = '#/login';
      }
    }

    return Promise.reject(error);
  }
);

// --- Public APIs ---
export const getHealth = () => api.get('/api/health').then(r => r.data);
export const getDepartments = () => api.get('/api/departments').then(r => r.data);
export const getDoctors = (deptId) => api.get('/api/doctors', { params: { department_id: deptId } }).then(r => r.data);
export const getDisplay = (deptId) => api.get('/api/display', { params: { department_id: deptId } }).then(r => r.data);

// --- Auth APIs ---
export const login = (username, password) => api.post('/api/auth/login', { username, password }).then(r => r.data);

// --- Token & Patient APIs ---
export const createToken = (data) => api.post('/api/tokens', data).then(r => r.data);
export const getToken = (id) => api.get(`/api/tokens/${id}`).then(r => r.data);
export const lookupTokens = (phone) => api.get('/api/tokens/lookup', { params: { phone } }).then(r => r.data);
export const rescheduleToken = (id, delayMinutes) => api.post(`/api/tokens/${id}/reschedule`, { delay_minutes: delayMinutes }).then(r => r.data);
export const getTokenMessages = (id) => api.get(`/api/tokens/${id}/messages`).then(r => r.data);

// --- Staff APIs ---
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
