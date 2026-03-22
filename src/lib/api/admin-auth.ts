import { apiClient } from './client'

export interface AdminProfile {
  user_id: string
  email: string
  display_name: string
  admin_level: 'fulladmin' | 'monitor'
  is_fulladmin: boolean
}

/**
 * Verify that the current Supabase user is an admin.
 * Called after Google sign-in to confirm admin access.
 */
export async function verifyAdmin(accessToken: string): Promise<AdminProfile> {
  const response = await apiClient.post<AdminProfile>(
    '/admin/auth/verify',
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )
  return response.data
}

/**
 * Get current admin profile.
 */
export async function getAdminMe(accessToken: string): Promise<AdminProfile> {
  const response = await apiClient.get<AdminProfile>('/admin/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  return response.data
}
