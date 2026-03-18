import apiClient from './client';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';

export const loginApi = async (payload: LoginRequest): Promise<AuthResponse> => {
  const form = new URLSearchParams();
  form.append('username', payload.email);
  form.append('password', payload.password);

  const { data } = await apiClient.post<AuthResponse>('/auth/token', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
};

export const registerApi = async (
  payload: RegisterRequest,
): Promise<AuthResponse> => {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
  return data;
};

export const refreshTokenApi = async (token: string): Promise<{ access_token: string }> => {
  const { data } = await apiClient.post<{ access_token: string }>(
    '/auth/refresh',
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data;
};

export const getMeApi = async (): Promise<User> => {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
};

export const updateMeApi = async (
  payload: Partial<Pick<User, 'region' | 'subscriptions' | 'notify_email' | 'notify_push'>>,
): Promise<User> => {
  const { data } = await apiClient.put<User>('/auth/me', payload);
  return data;
};
