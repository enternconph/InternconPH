export function getApiServerUrl() {
  const custom = localStorage.getItem('custom_server_url') || localStorage.getItem('server_url');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }
  const rawEnv = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : '';
  return rawEnv;
}

export function getApiBaseUrl(overrideServerUrl) {
  const serverUrl = overrideServerUrl !== undefined ? overrideServerUrl.replace(/\/+$/, '') : getApiServerUrl();
  if (serverUrl) {
    return serverUrl.endsWith('/api') ? serverUrl : `${serverUrl}/api`;
  }
  return '/api';
}

let isRedirectingToLogin = false;

// Default fallback candidates to auto-discover on local network, USB ADB reverse, or emulator
export const DEFAULT_CANDIDATES = [
  'http://localhost:3000',
  'http://192.168.254.137:3000',
  'http://10.0.2.2:3000'
];

export async function autoDiscoverServerUrl() {
  for (const candidate of DEFAULT_CANDIDATES) {
    const works = await testServerConnection(candidate);
    if (works) {
      localStorage.setItem('custom_server_url', candidate);
      localStorage.setItem('server_url', candidate);
      return candidate;
    }
  }
  return null;
}

export async function testServerConnection(targetUrl) {
  try {
    const cleanUrl = targetUrl.replace(/\/+$/, '');
    const baseUrl = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${baseUrl}/public/institutions`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      return data && data.success === true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;

  const token = localStorage.getItem('auth_token');
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let primaryApiBase = getApiBaseUrl();

  let response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);

    response = await fetch(`${primaryApiBase}${endpoint}`, {
      cache: 'no-store',
      ...options,
      credentials: 'include',
      headers,
      signal: options.signal || controller.signal
    });
    clearTimeout(timeoutId);
  } catch (error) {
    console.warn(`[API] Connection failed to ${primaryApiBase}${endpoint}. Attempting server auto-discovery...`);

    // Auto-discovery: Try candidate endpoints if primary fails
    for (const candidate of DEFAULT_CANDIDATES) {
      const candidateBase = getApiBaseUrl(candidate);
      if (candidateBase === primaryApiBase) continue;

      const works = await testServerConnection(candidate);
      if (works) {
        console.log(`[API] Auto-discovered working server: ${candidate}`);
        localStorage.setItem('custom_server_url', candidate);
        localStorage.setItem('server_url', candidate);
        try {
          response = await fetch(`${candidateBase}${endpoint}`, {
            cache: 'no-store',
            ...options,
            credentials: 'include',
            headers,
          });
          break;
        } catch (_) {}
      }
    }

    if (!response) {
      return {
        success: false,
        message: 'Cannot connect to server. Please ensure the backend is running or check Server Settings.',
        isNetworkError: true,
        currentServerUrl: getApiServerUrl()
      };
    }
  }

  const data = await response.json().catch(() => ({ success: false, message: 'Invalid response from server' }));

  if (!response.ok && response.status === 401) {
    // If unauthorized, clean up stale session state
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');

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
