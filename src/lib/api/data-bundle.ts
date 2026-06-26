import { apiClient } from "./client";

export interface BundleVersionInfo {
  version: string;
  stations_count: number;
  trips_count: number;
  trains_count: number;
  trip_paths_count: number;
}

export interface BundleRebuildResult extends BundleVersionInfo {
  ok: boolean;
  old_version: string;
  size_kb: number;
  r2_uploaded: boolean;
}

export interface SeatLayoutsResponse {
  version: string;
  total: number;
  trains_count: number;
  layouts: Record<string, unknown[]>;
}

export type SeatPositionType = "inner" | "window" | "aisle" | "window_aisle";

export interface EditableSeat {
  enr_place_id?: string;
  number: string;
  x: number;
  y: number;
  row_index?: number;
  position_type: SeatPositionType;
  is_window?: boolean;
  is_aisle?: boolean;
  [key: string]: unknown;
}

export interface EditableCoachLayout {
  coach_order: number;
  coach_name: string;
  enr_coach_id?: string;
  type?: string;
  code?: string;
  row_count?: number;
  aisle_before_row?: number;
  seat_count: number;
  window_seat_count: number;
  aisle_seat_count: number;
  rows?: unknown[];
  seats: EditableSeat[];
  [key: string]: unknown;
}

export interface EditableSeatLayout {
  schema_version: number;
  train_number: string;
  enr_train_id?: string;
  class?: {
    code?: string;
    name_ar?: string;
    name_en?: string;
    enr_class_id?: string;
    pax_class?: string;
    [key: string]: unknown;
  };
  coach_count: number;
  seat_count: number;
  window_seat_count: number;
  aisle_seat_count: number;
  coaches: EditableCoachLayout[];
  [key: string]: unknown;
}

export interface AdminSeatLayoutSummary {
  id: number;
  train_number: string;
  class_code: string;
  class_name_ar: string;
  class_name_en: string;
  enr_train_id: string;
  coach_count: number;
  seat_count: number;
  window_seat_count: number;
  aisle_seat_count: number;
  layout_hash: string;
  source_file: string;
  imported_at: string | null;
  updated_at: string | null;
}

export interface AdminSeatLayoutsResponse {
  version: string;
  total: number;
  trains_count: number;
  layouts: AdminSeatLayoutSummary[];
}

export interface AdminSeatLayoutDetail extends AdminSeatLayoutSummary {
  layout: EditableSeatLayout;
}

export interface UpdateSeatLayoutResult {
  ok: boolean;
  layout: AdminSeatLayoutDetail;
  version_info: {
    version: string;
    total: number;
    trains_count: number;
  };
}

export interface ImportSeatLayoutFromEnrResult {
  ok: boolean;
  train_number: string;
  departure_date: string;
  request_url: string;
  target_train_found: boolean;
  steps: number;
  extracted_layouts: number;
  valid_layouts: number;
  inserted: number;
  updated: number;
  unchanged: number;
  missing_train_numbers: string[];
  inserted_train_numbers: string[];
  updated_train_numbers: string[];
  unchanged_train_numbers: string[];
}

export const dataBundleApi = {
  getVersion: async (): Promise<BundleVersionInfo> => {
    const response = await apiClient.get("/data/version");
    return response.data;
  },

  getSeatLayouts: async (): Promise<SeatLayoutsResponse> => {
    const response = await apiClient.get("/data/seat-layouts");
    return response.data;
  },

  getAdminSeatLayouts: async (): Promise<AdminSeatLayoutsResponse> => {
    const response = await apiClient.get("/data/seat-layouts/admin");
    return response.data;
  },

  getAdminSeatLayout: async (
    layoutId: number,
  ): Promise<AdminSeatLayoutDetail> => {
    const response = await apiClient.get(`/data/seat-layouts/admin/${layoutId}`);
    return response.data;
  },

  updateAdminSeatLayout: async (
    layoutId: number,
    layout: EditableSeatLayout,
  ): Promise<UpdateSeatLayoutResult> => {
    const response = await apiClient.patch(
      `/data/seat-layouts/admin/${layoutId}`,
      { layout },
    );
    return response.data;
  },

  importSeatLayoutFromEnr: async (
    trainNumber: string,
  ): Promise<ImportSeatLayoutFromEnrResult> => {
    const response = await apiClient.post(
      `/data/seat-layouts/import-from-enr/${trainNumber}`,
    );
    return response.data;
  },

  rebuild: async (): Promise<BundleRebuildResult> => {
    const response = await apiClient.post("/data/rebuild", null, {
      timeout: 300_000,
    });
    return response.data;
  },
};
