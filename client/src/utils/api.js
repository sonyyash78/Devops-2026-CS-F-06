import axios from 'axios';

const rawUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim().replace(/\/+$/, '');
const baseURL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
