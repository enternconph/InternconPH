import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_API_BASE_URL = 'https://internconph.onrender.com/api';
export const SERVER_URL_STORAGE_KEY = '@internconph_server_url';

class ApiClient {
  constructor(baseUrl = DEFAULT_API_BASE_URL) {
    this.defaultBaseUrl = baseUrl;
    this.cachedBaseUrl = null;
  }

  async getBaseUrl() {
    if (this.cachedBaseUrl) return this.cachedBaseUrl;
    try {
      const stored = await AsyncStorage.getItem(SERVER_URL_STORAGE_KEY);
      if (stored && stored.trim()) {
        this.cachedBaseUrl = stored.trim().replace(/\/+$/, '');
        return this.cachedBaseUrl;
      }
    } catch (_) {}
    this.cachedBaseUrl = this.defaultBaseUrl;
    return this.cachedBaseUrl;
  }

  async setBaseUrl(newUrl) {
    const formatted = (newUrl || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, '');
    this.cachedBaseUrl = formatted;
    await AsyncStorage.setItem(SERVER_URL_STORAGE_KEY, formatted);
    return formatted;
  }

  async resetBaseUrl() {
    this.cachedBaseUrl = this.defaultBaseUrl;
    await AsyncStorage.removeItem(SERVER_URL_STORAGE_KEY);
    return this.defaultBaseUrl;
  }

  async getHeaders(customHeaders = {}) {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    try {
      const token = await AsyncStorage.getItem('@internconph_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Failed to read auth token from AsyncStorage', e);
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const baseUrl = await this.getBaseUrl();
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers = await this.getHeaders(options.headers || {});
    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const contentType = response.headers.get('content-type');
      let data = {};

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          await AsyncStorage.removeItem('@internconph_token');
          await AsyncStorage.removeItem('@internconph_user');
        }

        let errMsg = data.message;
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          errMsg = 'The cloud server is waking up from standby (~30 seconds). Please tap retry in a moment.';
        } else if (response.status === 404) {
          errMsg = `Requested endpoint (${endpoint}) was not found on server.`;
        } else if (!errMsg) {
          errMsg = `Request failed with status ${response.status}`;
        }

        const error = new Error(errMsg);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (!err.status) {
        err.message = 'Unable to connect to InternConPH live servers. If using free-tier cloud hosting, the server may be warming up. Please check your internet connection or retry in a few seconds.';
      }
      throw err;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const API_BASE_URL = DEFAULT_API_BASE_URL;
export const api = new ApiClient(DEFAULT_API_BASE_URL);
export default api;
