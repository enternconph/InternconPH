import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@fontsource-variable/work-sans';
import 'material-symbols/outlined.css';
import './index.css';
import { API_URL } from './config';

if (API_URL) {
  const originalFetch = window.fetch;
  window.fetch = async function () {
    let [resource, config] = arguments;
    if (typeof resource === 'string' && (resource.startsWith('/api') || resource.startsWith('/uploads'))) {
      resource = `${API_URL}${resource}`;
      const token = localStorage.getItem('auth_token');
      if (token) {
        config = config || {};
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`
        };
      }
    }
    return originalFetch(resource, config);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
