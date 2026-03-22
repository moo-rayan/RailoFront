import { apiClient } from './client';
import type { Station, StationListResponse, CreateStationInput, UpdateStationInput } from '@/types';

export const stationsApi = {
  getAll: async (page = 1, pageSize = 1000, activeOnly = true): Promise<StationListResponse> => {
    const response = await apiClient.get('/stations', {
      params: { page, page_size: pageSize, active_only: activeOnly },
    });
    return response.data;
  },

  getById: async (id: number): Promise<Station> => {
    const response = await apiClient.get(`/stations/${id}`);
    return response.data;
  },

  create: async (data: CreateStationInput): Promise<Station> => {
    const response = await apiClient.post('/stations', data);
    return response.data;
  },

  update: async (id: number, data: UpdateStationInput): Promise<Station> => {
    const response = await apiClient.patch(`/stations/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/stations/${id}`);
  },

  search: async (query: string, page = 1, pageSize = 100): Promise<StationListResponse> => {
    const response = await apiClient.get('/stations/search', {
      params: { q: query, page, page_size: pageSize },
    });
    return response.data;
  },
};
