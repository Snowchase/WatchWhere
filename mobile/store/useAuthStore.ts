import { create } from 'zustand'
import { User, loginUser, registerUser } from '@watchwhere/core'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

interface AuthState {
  token: string | null
  user: User | null
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { token, user } = await loginUser(email, password, API_BASE_URL)
      set({ token, user, isLoading: false })
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Login failed. Please try again.'
      set({ error: message, isLoading: false })
    }
  },

  register: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { token, user } = await registerUser(email, password, API_BASE_URL)
      set({ token, user, isLoading: false })
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Registration failed. Please try again.'
      set({ error: message, isLoading: false })
    }
  },

  logout: () => set({ token: null, user: null, error: null }),

  clearError: () => set({ error: null }),
}))
