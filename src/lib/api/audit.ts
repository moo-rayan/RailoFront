import { apiClient } from './client';
import type { AuditLogsResponse, AuditStats, TopIpsResponse } from '@/types';

export interface AuditLogsParams {
  event_type?: string;
  severity?: string;
  ip_address?: string;
  limit?: number;
  offset?: number;
}

export const auditApi = {
  getLogs: async (params: AuditLogsParams = {}): Promise<AuditLogsResponse> => {
    const response = await apiClient.get('/admin/audit/logs', { params });
    return response.data;
  },

  getStats: async (hours: number = 24): Promise<AuditStats> => {
    const response = await apiClient.get('/admin/audit/stats', { params: { hours } });
    return response.data;
  },

  getTopIps: async (hours: number = 24, limit: number = 20): Promise<TopIpsResponse> => {
    const response = await apiClient.get('/admin/audit/top-ips', { params: { hours, limit } });
    return response.data;
  },
};
