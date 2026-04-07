import { apiClient } from './client';
import type { Trip, TripListResponse, TripStop } from '@/types/trip';

export interface AddStopInput {
  station_id: number;
  stop_order: number;
  time_ar: string;
  time_en?: string;
}

export interface CreateTripInput {
  train_number: string
  from_station_id?: number | null
  to_station_id?: number | null
  departure_ar?: string
  departure_en?: string
  arrival_ar?: string
  arrival_en?: string
  duration_ar?: string
  duration_en?: string
}

export const tripsApi = {
  getByTrainNumber: async (trainNumber: string): Promise<Trip[]> => {
    const response = await apiClient.get(`/trips/by-train/${trainNumber}`);
    return response.data;
  },

  create: async (data: CreateTripInput): Promise<Trip> => {
    const response = await apiClient.post('/trips', data);
    return response.data;
  },

  getById: async (tripId: number): Promise<Trip> => {
    const response = await apiClient.get(`/trips/${tripId}`);
    return response.data;
  },

  search: async (params: {
    from_station?: string;
    to_station?: string;
    from_station_id?: number;
    to_station_id?: number;
    station_id?: number;
    train_number?: string;
    skip?: number;
    limit?: number;
  }): Promise<TripListResponse> => {
    const response = await apiClient.get('/trips', { params });
    return response.data;
  },

  addStop: async (tripId: number, data: AddStopInput): Promise<TripStop> => {
    const response = await apiClient.post(`/trips/${tripId}/stops`, data);
    return response.data;
  },

  updateStop: async (tripId: number, stopId: number, data: { time_ar?: string; time_en?: string }): Promise<TripStop> => {
    const response = await apiClient.patch(`/trips/${tripId}/stops/${stopId}`, data);
    return response.data;
  },

  removeStop: async (tripId: number, stopId: number): Promise<void> => {
    await apiClient.delete(`/trips/${tripId}/stops/${stopId}`);
  },
};
