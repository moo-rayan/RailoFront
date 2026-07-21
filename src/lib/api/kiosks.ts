import { apiClient } from "./client";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface KioskStation {
  id: number;
  name_ar: string;
  name_en: string;
}

export interface Kiosk {
  id: number;
  station_id: number;
  station: KioskStation | null;
  merchant_name: string;
  seller_phone: string;
  menu: JsonValue[] | Record<string, JsonValue>;
  working_hours: JsonValue[] | Record<string, JsonValue>;
  platform_location: string;
  is_open: boolean;
  is_active: boolean;
  is_phone_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface KioskListResponse {
  total: number;
  page: number;
  page_size: number;
  items: Kiosk[];
}

export interface KioskPayload {
  station_id: number;
  merchant_name: string;
  seller_phone: string;
  menu: JsonValue[] | Record<string, JsonValue>;
  working_hours: JsonValue[] | Record<string, JsonValue>;
  platform_location: string;
  is_open: boolean;
  is_active: boolean;
  is_phone_visible: boolean;
}

export const kiosksApi = {
  list: async (params?: {
    q?: string;
    station_id?: number;
    active_only?: boolean;
    open_only?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<KioskListResponse> => {
    const { data } = await apiClient.get<KioskListResponse>("/kiosks", {
      params,
    });
    return data;
  },

  create: async (payload: KioskPayload): Promise<Kiosk> => {
    const { data } = await apiClient.post<Kiosk>("/kiosks", payload);
    return data;
  },

  update: async (
    id: number,
    payload: Partial<KioskPayload>,
  ): Promise<Kiosk> => {
    const { data } = await apiClient.patch<Kiosk>(`/kiosks/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/kiosks/${id}`);
  },

  searchStations: async (q: string): Promise<KioskStation[]> => {
    const { data } = await apiClient.get<KioskStation[]>(
      "/kiosks/search-stations",
      { params: { q } },
    );
    return data;
  },
};
