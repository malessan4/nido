import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Endpoints que NO necesitan token JWT
const PUBLIC_ENDPOINTS = ['/auth/login', '/auth/register'];

// Interceptor: agrega JWT a cada petición, EXCEPTO las de auth
api.interceptors.request.use((config) => {
  const isPublic = PUBLIC_ENDPOINTS.some(endpoint => config.url?.includes(endpoint));

  if (!isPublic && typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

// Interceptor de respuesta: si el servidor responde 401 (token expirado),
// limpiamos el localStorage y redirigimos al login automáticamente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
