import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

// ─── Request interceptor — attach access token ────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { state?: { accessToken?: string } };
        const token = parsed?.state?.accessToken;
        if (token) {
          config.headers.set('Authorization', `Bearer ${token}`);
        }
      } catch {
        // ignore malformed storage
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor — normalise errors ──────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const status = error.response?.status ?? 0;

    // Attempt token refresh on 401
    if (status === 401) {
      try {
        const raw = localStorage.getItem('auth-storage');
        const parsed = raw
          ? (JSON.parse(raw) as { state?: { accessToken?: string } })
          : null;
        const token = parsed?.state?.accessToken;
        if (token) {
          const { data } = await axios.post<{ access_token: string }>(
            `${BASE_URL}/api/v1/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${token}` } },
          );
          // Store refreshed token back
          if (parsed?.state) {
            parsed.state.accessToken = data.access_token;
            localStorage.setItem('auth-storage', JSON.stringify(parsed));
          }
          // Retry original request
          if (error.config) {
            error.config.headers.set(
              'Authorization',
              `Bearer ${data.access_token}`,
            );
            return apiClient(error.config);
          }
        }
      } catch {
        // Refresh failed — clear storage so user is sent to login
        localStorage.removeItem('auth-storage');
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
