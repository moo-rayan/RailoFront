export interface Station {
  id: number;
  name_ar: string;
  name_en: string;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStationInput {
  name_ar: string;
  name_en: string;
  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
}

export interface UpdateStationInput {
  name_ar?: string;
  name_en?: string;
  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
  is_active?: boolean;
}

export interface StationListResponse {
  total: number;
  page: number;
  page_size: number;
  items: Station[];
}
