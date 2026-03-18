import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { loginApi, registerApi, refreshTokenApi } from '../api/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  setUser: (user: User) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // ─── Initial State ──────────────────────────────────────────────────────
      user: null,
      accessToken: null,
      isAuthenticated: false,

      // ─── Actions ────────────────────────────────────────────────────────────
      login: async (email, password) => {
        const response = await loginApi({ email, password });
        set({
          user: response.user,
          accessToken: response.access_token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },

      register: async (email, password) => {
        const response = await registerApi({ email, password });
        set({
          user: response.user,
          accessToken: response.access_token,
          isAuthenticated: true,
        });
      },

      refreshToken: async () => {
        const { accessToken } = get();
        if (!accessToken) {
          set({ user: null, accessToken: null, isAuthenticated: false });
          return;
        }
        try {
          const response = await refreshTokenApi(accessToken);
          set({ accessToken: response.access_token });
        } catch {
          set({ user: null, accessToken: null, isAuthenticated: false });
        }
      },

      setUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
