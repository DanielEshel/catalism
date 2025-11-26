import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Proxies to http://localhost:3000 via Vite config
  headers:{
    'Content-Type': 'application/json',
  },
});

// Interceptor: Automatically adds the "Authorization" header if you are logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;