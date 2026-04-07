export interface Train {
  id: number;
  train_id: string;
  type_ar: string;
  type_en: string;
  start_station_ar: string;
  start_station_en: string;
  end_station_ar: string;
  end_station_en: string;
  stops_count: number;
  departure_ar: string;
  departure_en: string;
  arrival_ar: string;
  arrival_en: string;
  note_ar: string;
  note_en: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTrainInput {
  train_id: string;
  type_ar: string;
  type_en: string;
  start_station_ar: string;
  start_station_en: string;
  end_station_ar: string;
  end_station_en: string;
  stops_count: number;
  departure_ar?: string;
  departure_en?: string;
  arrival_ar?: string;
  arrival_en?: string;
  note_ar?: string;
  note_en?: string;
}

export interface UpdateTrainInput {
  type_ar?: string;
  type_en?: string;
  start_station_ar?: string;
  start_station_en?: string;
  end_station_ar?: string;
  end_station_en?: string;
  stops_count?: number;
  departure_ar?: string;
  departure_en?: string;
  arrival_ar?: string;
  arrival_en?: string;
  note_ar?: string;
  note_en?: string;
  is_active?: boolean;
}

export interface TrainListResponse {
  total: number;
  page: number;
  page_size: number;
  items: Train[];
}
