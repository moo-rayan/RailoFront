import { apiClient } from './client';

export interface TripPathResponse {
  path: [number, number][];
  points: number;
  from_station: string;
  to_station: string;
  from_lat: number;
  from_lon: number;
  to_lat: number;
  to_lon: number;
}

export interface TripStationPoint {
  order: number;
  name_ar: string;
  name_en: string;
  lat: number;
  lon: number;
  time_ar: string;
  time_en: string;
}

export interface TripStationsResponse {
  stations: TripStationPoint[];
  count: number;
}

export const railwayApi = {
  getTripPath: async (tripId: number): Promise<TripPathResponse> => {
    const response = await apiClient.get(`/railway/trip-path/${tripId}`);
    return response.data;
  },

  getTripStations: async (tripId: number): Promise<TripStationsResponse> => {
    const response = await apiClient.get(`/railway/trip-stations/${tripId}`);
    return response.data;
  },
};
