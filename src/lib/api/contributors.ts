import { apiClient } from './client';
import type { DashboardRoomsResponse, DashboardStats, RoomLogsResponse, FeedResponse, BanListResponse } from '@/types';

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/live/dashboard/stats');
    return response.data;
  },

  getRooms: async (): Promise<DashboardRoomsResponse> => {
    const response = await apiClient.get('/live/admin/rooms');
    return response.data;
  },

  getRoomLogs: async (trainId: string): Promise<RoomLogsResponse> => {
    const response = await apiClient.get(`/live/admin/logs/${trainId}`);
    return response.data;
  },

  getRoomFeed: async (trainId: string): Promise<FeedResponse> => {
    const response = await apiClient.get(`/live/admin/feed/${trainId}`);
    return response.data;
  },

  banContributor: async (userId: string, reason: string = '', durationMinutes: number = 0) => {
    const response = await apiClient.post('/live/admin/ban', { user_id: userId, reason, duration_minutes: durationMinutes });
    return response.data;
  },

  unbanContributor: async (userId: string) => {
    const response = await apiClient.post('/live/admin/unban', { user_id: userId });
    return response.data;
  },

  getBans: async (): Promise<BanListResponse> => {
    const response = await apiClient.get('/live/admin/bans');
    return response.data;
  },

  setLeader: async (trainId: string, userId: string) => {
    const response = await apiClient.post('/live/admin/set-leader', { train_id: trainId, user_id: userId });
    return response.data;
  },

  removeLeader: async (trainId: string) => {
    const response = await apiClient.post('/live/admin/remove-leader', { train_id: trainId });
    return response.data;
  },

  setMaxContributors: async (trainId: string, maxActive: number) => {
    const response = await apiClient.post('/live/admin/set-max-contributors', { train_id: trainId, max_active: maxActive });
    return response.data;
  },

  suspendContributor: async (trainId: string, userId: string, reason: string = '', durationMinutes: number = 0) => {
    const response = await apiClient.post('/live/admin/suspend', { train_id: trainId, user_id: userId, reason, duration_minutes: durationMinutes });
    return response.data;
  },

  unsuspendContributor: async (trainId: string, userId: string) => {
    const response = await apiClient.post('/live/admin/unsuspend', { train_id: trainId, user_id: userId });
    return response.data;
  },
};
