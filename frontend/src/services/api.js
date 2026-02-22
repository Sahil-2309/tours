import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Template APIs
export const templateAPI = {
  getAll: () => api.get('/templates'),
  getById: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.put(`/templates/${id}`, data),
  delete: (id) => api.delete(`/templates/${id}`),
};

// WordPress APIs
export const wordpressAPI = {
  getConfig: () => api.get('/wordpress/config'),
  saveConfig: (data) => api.post('/wordpress/config', data),
  testConnection: (data) => api.post('/wordpress/test', data),
  deleteConfig: (id) => api.delete(`/wordpress/config/${id}`),
};

// WooCommerce APIs
export const woocommerceAPI = {
  getConfig: () => api.get('/woocommerce/config'),
  saveConfig: (data) => api.post('/woocommerce/config', data),
  testConnection: (data) => api.post('/woocommerce/test', data),
  deleteConfig: (id) => api.delete(`/woocommerce/config/${id}`),
};

// Process APIs
export const processAPI = {
  processExcel: (formData) => {
    const base = import.meta.env.VITE_API_URL || '/api';
    return axios.post(`${base}/process/process`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getStatus: (id) => api.get(`/process/status/${id}`),
  getHistory: () => api.get('/process/history'),
  retryFailed: (processId) => api.post('/process/retry', { processId }),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;
