export interface TripStop {
  id: number;
  stop_order: number;
  station_id: number | null;
  station_ar: string;
  station_en: string;
  time_ar: string;
  time_en: string;
}

export interface Trip {
  id: number;
  train_number: string;
  type_ar: string;
  type_en: string;
  from_station_id: number | null;
  from_station_ar: string;
  from_station_en: string;
  to_station_id: number | null;
  to_station_ar: string;
  to_station_en: string;
  departure_ar: string;
  departure_en: string;
  arrival_ar: string;
  arrival_en: string;
  duration_ar: string;
  duration_en: string;
  stops_count: number;
  fares: Record<string, any> | null;
  has_fares: boolean;
  stops: TripStop[];
  created_at?: string;
}

export interface TripListResponse {
  total: number;
  skip: number;
  limit: number;
  items: Trip[];
}
