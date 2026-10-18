import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'https://internconph.onrender.com/api';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
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
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
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
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (!err.status) {
        err.message = 'Unable to connect to InternConPH live servers. Please check your internet connection.';
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

export const api = new ApiClient(API_BASE_URL);
export default api;
