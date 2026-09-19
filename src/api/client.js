const RAW_API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : '';
const API_BASE = RAW_API_URL ? (RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL}/api`) : '/api';

let isRedirectingToLogin = false;

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // On login requests, never send stale Authorization header from a previous session
  if (endpoint.includes('/login')) {
    delete headers['Authorization'];
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    cache: 'no-store',
    ...options,
    credentials: 'include',
    headers,
  });

  const data = await response.json().catch(() => ({ success: false, message: 'Invalid response from server' }));

  if (!response.ok && response.status === 401) {
    // If unauthorized and not logging in, safely clear auth and redirect once
    if (!endpoint.includes('/auth/login') && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      } else {
        isRedirectingToLogin = false;
      }
    }
  }

  return data;
}

export const api = {
  get: (url) => apiRequest(url, { method: 'GET' }),
  post: (url, body) => apiRequest(url, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (url, body) => apiRequest(url, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: (url) => apiRequest(url, { method: 'DELETE' }),
};

export default api;
