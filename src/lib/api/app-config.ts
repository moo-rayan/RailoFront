import { apiClient } from './client';

export interface AppConfig {
  is_maintenance_mode: boolean;
  maintenance_message_ar: string;
  maintenance_message_en: string;
  force_update: boolean;
  min_version: string;
  latest_version: string;
  update_message_ar: string;
  update_message_en: string;
  store_url_android: string;
  store_url_ios: string;
  station_schedule_check_enabled: boolean;
}

export async function getAppConfig(): Promise<AppConfig> {
  const res = await apiClient.get<AppConfig>('/app/config');
  return res.data;
}

export async function updateAppConfig(data: Partial<AppConfig>): Promise<AppConfig> {
  const res = await apiClient.put<AppConfig>('/app/config', data);
  return res.data;
}
