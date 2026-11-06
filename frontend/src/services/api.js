/**
 * API Service for Intelligent Email Management Platform
 * Handles HTTP requests to the FastAPI backend with token injection.
 */

const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').trim().replace(/\/+$/, '');
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorMsg = 'An error occurred';
      try {
        const errData = await res.json();
        errorMsg = errData.detail || JSON.stringify(errData);
      } catch {
        errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
      }
      throw new Error(errorMsg);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name, email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  getMe: () => request('/auth/me'),

  // Users
  getUsers: () => request('/users'),
  getUserById: (id) => request(`/users/${id}`),

  // Categories
  getCategories: () => request('/categories'),
  createCategory: (name) =>
    request('/categories', {
      method: 'POST',
      body: JSON.stringify({ category_name: name }),
    }),

  // Emails
  getEmails: (params = {}) => {
    const query = new URLSearchParams();
    if (params.folder) query.append('folder', params.folder);
    if (params.category_id) query.append('category_id', params.category_id);
    if (params.q) query.append('q', params.q);
    if (params.user_id) query.append('user_id', params.user_id);
    const qs = query.toString();
    return request(`/emails${qs ? `?${qs}` : ''}`);
  },

  getEmailById: (id) => request(`/emails/${id}`),

  createEmail: (data) =>
    request('/emails', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEmailStatus: (id, status) =>
    request(`/emails/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  deleteEmail: (id) =>
    request(`/emails/${id}`, {
      method: 'DELETE',
    }),

  // Spam Detection
  predictSpam: (subject, body) =>
    request('/spam/predict', {
      method: 'POST',
      body: JSON.stringify({ subject, body }),
    }),

  predictCombinedSpam: (subject, body) =>
    request('/spam/predict-combined', {
      method: 'POST',
      body: JSON.stringify({ subject, body }),
    }),

  detectForEmail: (emailId) =>
    request(`/spam/detect/${emailId}`, {
      method: 'POST',
    }),

  combinedDetectForEmail: (emailId) =>
    request(`/spam/combined/${emailId}`, {
      method: 'POST',
    }),

  getDetections: () => request('/spam/detections'),


  // Search
  searchEmails: (params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    }
    return request(`/search?${query.toString()}`);
  },

  // Dashboard & Analytics
  getDashboardStats: () => request('/dashboard/stats'),
  getUserStats: () => request('/dashboard/user-stats'),
  getReports: () => request('/dashboard/reports'),

  // Health
  checkHealth: () => request('/health'),
};
