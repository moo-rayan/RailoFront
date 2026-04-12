import { apiClient } from './client';

export interface FareItem {
  id: number;
  train_number: string;
  from_station_id: number;
  from_station_ar: string;
  from_station_en: string;
  to_station_id: number;
  to_station_ar: string;
  to_station_en: string;
  class_name_ar: string;
  class_name_en: string;
  price: number;
}

export interface FareListResponse {
  total: number;
  page: number;
  page_size: number;
  items: FareItem[];
}

export interface FareClass {
  ar: string;
  en: string;
}

export interface FareSearchParams {
  page?: number;
  page_size?: number;
  from_station?: string;
  to_station?: string;
  train_number?: string;
  fare_class?: string;
}

export interface FareUpdatePayload {
  class_name_ar?: string;
  class_name_en?: string;
  price?: number;
}

export async function fetchFares(params: FareSearchParams): Promise<FareListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.from_station) searchParams.set('from_station', params.from_station);
  if (params.to_station) searchParams.set('to_station', params.to_station);
  if (params.train_number) searchParams.set('train_number', params.train_number);
  if (params.fare_class) searchParams.set('fare_class', params.fare_class);

  const { data } = await apiClient.get<FareListResponse>(`/fares?${searchParams.toString()}`);
  return data;
}

export async function fetchFareClasses(): Promise<FareClass[]> {
  const { data } = await apiClient.get<FareClass[]>('/fares/classes');
  return data;
}

export async function updateFare(fareId: number, payload: FareUpdatePayload): Promise<FareItem> {
  const { data } = await apiClient.patch<FareItem>(`/fares/${fareId}`, payload);
  return data;
}

export async function deleteFare(fareId: number): Promise<void> {
  await apiClient.delete(`/fares/${fareId}`);
}

export interface FareCreatePayload {
  train_number: string;
  from_station_id: number;
  to_station_id: number;
  class_name_ar: string;
  class_name_en: string;
  price: number;
}

export interface StationOption {
  id: number;
  name_ar: string;
  name_en: string;
}

export interface TrainOption {
  train_id: string;
  type_ar: string;
  type_en: string;
}

export async function createFare(payload: FareCreatePayload): Promise<FareItem> {
  const { data } = await apiClient.post<FareItem>('/fares', payload);
  return data;
}

export async function searchStations(q: string): Promise<StationOption[]> {
  const { data } = await apiClient.get<StationOption[]>(`/fares/search-stations?q=${encodeURIComponent(q)}`);
  return data;
}

export async function searchTrains(q: string): Promise<TrainOption[]> {
  const { data } = await apiClient.get<TrainOption[]>(`/fares/search-trains?q=${encodeURIComponent(q)}`);
  return data;
}
