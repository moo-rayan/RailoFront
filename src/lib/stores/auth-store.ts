import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AdminLevel = 'fulladmin' | 'monitor'

export interface AdminProfile {
  user_id: string
  email: string
  display_name: string
  admin_level: AdminLevel
  is_fulladmin: boolean
}

interface AuthState {
  admin: AdminProfile | null
  accessToken: string | null
  isLoading: boolean
  setAdmin: (admin: AdminProfile, token: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      accessToken: null,
      isLoading: true,
      setAdmin: (admin, token) =>
        set({ admin, accessToken: token, isLoading: false }),
      clearAuth: () =>
        set({ admin: null, accessToken: null, isLoading: false }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({
        admin: state.admin,
        accessToken: state.accessToken,
      }),
    }
  )
)
