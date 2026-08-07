import axios from 'axios';

// Base API URL config loading from environment or default port
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Crucial for receiving and sending HttpOnly cookies cross-origin
});

// Access token stored purely in-memory (rotated on expiry)
let inMemoryAccessToken = '';

export const setAccessToken = (token: string): void => {
  inMemoryAccessToken = token;
};

export const getAccessToken = (): string => {
  return inMemoryAccessToken;
};

// Request interceptor to automatically attach Authorization header
api.interceptors.request.use(
  (config) => {
    if (inMemoryAccessToken && config.headers) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to intercept 401s and rotate tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Verify if error is 401 and the request hasn't been retried yet
    if (
      error.response?.status === 401 && 
      originalRequest && 
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      try {
        // Call refresh endpoint
        const response = await axios.post(
          `${API_BASE}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data;
        setAccessToken(accessToken);

        // Update authorization header and retry original query
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token invalid or expired, clear in-memory state
        setAccessToken('');
        // Let AuthContext catch this and wipe user state
        window.dispatchEvent(new Event('auth-session-expired'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
