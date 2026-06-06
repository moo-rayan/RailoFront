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
