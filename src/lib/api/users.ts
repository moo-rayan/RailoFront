import { apiClient } from './client';
import type { UsersListResponse, UsersListParams, UserProfile, UserStatsResponse } from '@/types';

export const usersApi = {
  getStats: async (): Promise<UserStatsResponse> => {
    const response = await apiClient.get('/admin/users/stats');
    return response.data;
  },

  list: async (params: UsersListParams = {}): Promise<UsersListResponse> => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },

  getById: async (userId: string): Promise<UserProfile> => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  ban: async (userId: string, reason: string = '', durationMinutes: number = 0) => {
    const response = await apiClient.post('/admin/users/ban', {
      user_id: userId,
      reason,
      duration_minutes: durationMinutes,
    });
    return response.data;
  },

  unban: async (userId: string) => {
    const response = await apiClient.post('/admin/users/unban', {
      user_id: userId,
    });
    return response.data;
  },

  toggleCaptain: async (userId: string, isCaptain: boolean) => {
    const response = await apiClient.post('/admin/users/toggle-captain', {
      user_id: userId,
      is_captain: isCaptain,
    });
    return response.data;
  },
};
