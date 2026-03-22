import { apiClient } from './client';

export interface SendNotificationRequest {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface SendNotificationResponse {
  status: string;
  total_tokens: number;
  success: number;
  failure: number;
  invalid_removed: number;
}

export interface TokenCountResponse {
  total_tokens: number;
  unique_users: number;
}

export interface NotificationHistoryItem {
  id: number;
  title: string;
  body: string;
  sent_by: string;
  total_tokens: number;
  success_count: number;
  failure_count: number;
  invalid_removed: number;
  created_at: string;
}

export interface NotificationHistoryResponse {
  total: number;
  items: NotificationHistoryItem[];
}

export interface AdminAlertItem {
  id: number;
  alert_type: 'report' | 'contribution';
  title: string;
  body: string;
  metadata: Record<string, string>;
  navigate_to: string;
  is_read: boolean;
  created_at: string;
}

export interface AdminAlertsResponse {
  unread_count: number;
  items: AdminAlertItem[];
}

export const notificationsApi = {
  send: async (payload: SendNotificationRequest): Promise<SendNotificationResponse> => {
    const response = await apiClient.post('/notifications/send', payload);
    return response.data;
  },

  getTokenCount: async (): Promise<TokenCountResponse> => {
    const response = await apiClient.get('/notifications/token-count');
    return response.data;
  },

  getHistory: async (limit = 20, offset = 0): Promise<NotificationHistoryResponse> => {
    const response = await apiClient.get('/notifications/history', {
      params: { limit, offset },
    });
    return response.data;
  },

  // Admin Alerts
  getAlerts: async (limit = 30, offset = 0, unreadOnly = false): Promise<AdminAlertsResponse> => {
    const response = await apiClient.get('/notifications/alerts', {
      params: { limit, offset, unread_only: unreadOnly },
    });
    return response.data;
  },

  markAlertRead: async (alertId: number): Promise<void> => {
    await apiClient.post(`/notifications/alerts/${alertId}/read`);
  },

  markAllAlertsRead: async (): Promise<void> => {
    await apiClient.post('/notifications/alerts/read-all');
  },
};
