import { apiClient } from './client';
import type { Train, TrainListResponse, CreateTrainInput, UpdateTrainInput } from '@/types';

export const trainsApi = {
  getAll: async (page = 1, pageSize = 1000, activeOnly = true): Promise<TrainListResponse> => {
    const response = await apiClient.get('/trains', {
      params: { page, page_size: pageSize, active_only: activeOnly },
    });
    return response.data;
  },

  getById: async (trainNumber: string): Promise<Train> => {
    const response = await apiClient.get(`/trains/${trainNumber}`);
    return response.data;
  },

  create: async (data: CreateTrainInput): Promise<Train> => {
    const response = await apiClient.post('/trains', data);
    return response.data;
  },

  update: async (trainNumber: string, data: UpdateTrainInput): Promise<Train> => {
    const response = await apiClient.patch(`/trains/${trainNumber}`, data);
    return response.data;
  },

  delete: async (trainNumber: string): Promise<void> => {
    await apiClient.delete(`/trains/${trainNumber}`);
  },

  search: async (params: { from_station?: string; to_station?: string; train_type?: string }): Promise<TrainListResponse> => {
    const response = await apiClient.get('/trains/search', { params });
    return response.data;
  },
};
