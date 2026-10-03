const RAW_API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : '';
const API_BASE = RAW_API_URL ? (RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL}/api`) : '/api';

let isRedirectingToLogin = false;

export async function apiRequest(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;

  const token = localStorage.getItem('auth_token');
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      cache: 'no-store',
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (error) {
    console.error('API Connection Error:', error);
    return { success: false, message: 'Cannot connect to server. Please ensure the backend is running.' };
  }

  const data = await response.json().catch(() => ({ success: false, message: 'Invalid response from server' }));

  if (!response.ok && response.status === 401) {
    // If unauthorized, clean up stale session state
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');

    // Only redirect to login if the user is currently on a protected route.
    // Passive session checks (/auth/me, /auth/session) and public routes must never force a login redirect.
    const isAuthCheck = endpoint.includes('/auth/login') || endpoint.includes('/auth/me') || endpoint.includes('/auth/session') || endpoint.includes('/public/');
    const isProtectedRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard');

    if (!isAuthCheck && isProtectedRoute && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      window.location.href = '/login';
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
