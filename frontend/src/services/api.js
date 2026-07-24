import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── JWT Interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sentinel_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sentinel_token');
      localStorage.removeItem('sentinel_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth Service ──────────────────────────────────────────────────────────
export const authService = {
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  async register(username, email, password) {
    const res = await api.post('/auth/register', { username, email, password });
    return res.data;
  },
  async me() {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

// ── KYC Service ───────────────────────────────────────────────────────────
export const kycService = {
  async submit(payload) {
    const res = await api.post('/kyc/submit', payload);
    return res.data;
  },
  async getStatus() {
    const res = await api.get('/kyc/status');
    return res.data;
  },
  async verify(payload) {
    const res = await api.post('/kyc/verify', payload);
    return res.data;
  },
};

// ── Admin Service ─────────────────────────────────────────────────────────
export const adminService = {
  async getStats() {
    const res = await api.get('/admin/stats');
    return res.data;
  },
  async getUsers(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const res = await api.get(`/admin/users?${params}`);
    return res.data;
  },
  async getAlerts(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const res = await api.get(`/admin/alerts?${params}`);
    return res.data;
  },
  async getActivity(page = 1) {
    const res = await api.get(`/admin/activity?page=${page}&limit=20`);
    return res.data;
  },
  async approveKyc(userId) {
    const res = await api.post(`/admin/kyc/${userId}/approve`);
    return res.data;
  },
  async rejectKyc(userId) {
    const res = await api.post(`/admin/kyc/${userId}/reject`);
    return res.data;
  },
  async resolveAlert(alertId) {
    const res = await api.post(`/admin/alerts/${alertId}/resolve`);
    return res.data;
  },
  async getDbStatus() {
    const res = await api.get('/admin/db/status');
    return res.data;
  },
  async getTableData(tableName, page = 1, limit = 50) {
    const res = await api.get(`/admin/db/table/${tableName}?page=${page}&limit=${limit}`);
    return res.data;
  },
  async deleteRow(tableName, rowId) {
    const res = await api.delete(`/admin/db/table/${tableName}/${rowId}`);
    return res.data;
  },
  async clearTable(tableName) {
    const res = await api.post(`/admin/db/table/${tableName}/clear`);
    return res.data;
  },
};

// ── Legacy Services (preserved) ───────────────────────────────────────────
export const predictService = {
  async runPrediction(features = null, model_type = null) {
    const res = await api.post('/predict', { features, model_type });
    return res.data;
  },
  async runBulkPrediction(packets = [], model_type = null) {
    const res = await api.post('/predict/bulk', { packets, model_type });
    return res.data;
  },
  async parsePacketStr(packet_str) {
    const res = await api.post('/parse-packet', { packet_str });
    return res.data;
  },
};

export const logsService = {
  async getLogs(page = 1, limit = 10) {
    const res = await api.get(`/logs?page=${page}&limit=${limit}`);
    return res.data;
  },
};

export const statusService = {
  async getStatus() {
    const res = await api.get('/status');
    return res.data;
  },
  async getModels() {
    const res = await api.get('/models');
    return res.data;
  },
  async toggleSimulation(active) {
    const res = await api.post('/simulation/toggle', { active });
    return res.data;
  },
};
