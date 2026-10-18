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

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      cache: 'no-store',
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (networkError) {
    console.error('[API Network Error]', networkError);
    return {
      success: false,
      message: 'Cannot reach the backend server. The server may be asleep (Render free-tier cold start) or starting up. Please wait 30 seconds and try again.',
      isNetworkError: true
    };
  }

  let data;
  try {
    data = await response.json();
  } catch (jsonParseError) {
    console.warn(`[API Non-JSON Response] Status ${response.status}:`, jsonParseError);

    if (response.status === 502 || response.status === 503 || response.status === 504) {
      return {
        success: false,
        message: `Backend service is currently waking up (HTTP ${response.status} from Render). Please wait ~30 seconds for the container to start, then try again.`,
        isColdStart: true
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        message: 'API endpoint not found (HTTP 404). Please verify that VITE_API_URL is configured in your deployment settings.',
        status: 404
      };
    }

    return {
      success: false,
      message: `Invalid server response (HTTP ${response.status}). Please check your backend connection.`,
      status: response.status
    };
  }

  if (!response.ok && response.status === 401) {
    // If unauthorized, clean up stale tokens
    localStorage.removeItem('token');
    localStorage.removeItem('user');

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
