import { apiClient } from './client';

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

export const dataBundleApi = {
  getVersion: async (): Promise<BundleVersionInfo> => {
    const response = await apiClient.get('/data/version');
    return response.data;
  },

  rebuild: async (): Promise<BundleRebuildResult> => {
    const response = await apiClient.post('/data/rebuild', null, {
      timeout: 300_000,
    });
    return response.data;
  },
};
