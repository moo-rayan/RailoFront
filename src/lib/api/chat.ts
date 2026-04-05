import { apiClient } from './client';

export interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  text: string;
  type: string; // normal | lost_item | found_item | admin
  is_pinned: boolean;
  is_admin?: boolean;
  timestamp: string;
}

export interface ChatReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reported_user_name: string;
  reported_user_avatar: string;
  train_id: string;
  message_id: string;
  message_text: string;
  report_reason: string;
  status: string; // pending | reviewed | dismissed
  admin_notes: string;
  created_at: string;
}

export interface ChatBan {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  reason: string;
  ban_type: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export const chatApi = {
  getMessages: async (trainId: string, limit = 50) => {
    const response = await apiClient.get(`/admin/chat/${trainId}/messages`, {
      params: { limit },
    });
    return response.data as {
      train_id: string;
      messages: ChatMessage[];
      total: number;
      chat_enabled: boolean;
      online_users: number;
    };
  },

  getChatStatus: async (trainId: string) => {
    const response = await apiClient.get(`/admin/chat/${trainId}/status`);
    return response.data as {
      train_id: string;
      chat_enabled: boolean;
      online_users: number;
      message_count: number;
    };
  },

  toggleChat: async (trainId: string, enabled: boolean) => {
    const response = await apiClient.post(
      `/admin/chat/${trainId}/toggle`,
      { enabled },
    );
    return response.data;
  },

  getReports: async (trainId?: string, status = 'pending', limit = 50) => {
    const response = await apiClient.get('/admin/chat/reports/list', {
      params: { train_id: trainId, report_status: status, limit },
    });
    return response.data as { total: number; reports: ChatReport[] };
  },

  reviewReport: async (reportId: string, status: 'reviewed' | 'dismissed', adminNotes = '') => {
    const response = await apiClient.post(
      `/admin/chat/reports/${reportId}/review`,
      { status, admin_notes: adminNotes },
    );
    return response.data;
  },

  banChatUser: async (userId: string, reason = '', banType = 'temporary', durationHours = 24) => {
    const response = await apiClient.post(
      '/admin/chat/ban',
      { user_id: userId, reason, ban_type: banType, duration_hours: durationHours },
    );
    return response.data;
  },

  unbanChatUser: async (userId: string) => {
    const response = await apiClient.post(
      '/admin/chat/unban',
      { user_id: userId },
    );
    return response.data;
  },

  getChatBans: async (activeOnly = true, limit = 50) => {
    const response = await apiClient.get('/admin/chat/bans', {
      params: { active_only: activeOnly, limit },
    });
    return response.data as { total: number; bans: ChatBan[] };
  },

  sendAdminMessage: async (trainId: string, text: string, adminName = 'المشرف') => {
    const response = await apiClient.post(`/admin/chat/${trainId}/send`, {
      text,
      admin_name: adminName,
    });
    return response.data as { ok: boolean; message?: ChatMessage };
  },

  deleteMessage: async (trainId: string, messageId: string) => {
    const response = await apiClient.delete(`/admin/chat/${trainId}/messages/${messageId}`);
    return response.data as { ok: boolean; message_id: string };
  },

  clearChat: async (trainId: string) => {
    const response = await apiClient.delete(`/admin/chat/${trainId}/clear`);
    return response.data as { ok: boolean; train_id: string };
  },

  /** Build admin WebSocket URL for real-time chat observation (still uses legacy admin_key for WS) */
  getAdminWsUrl: (trainId: string): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const adminKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'change-me-admin-key';
    const httpUri = new URL(baseUrl);
    const wsScheme = httpUri.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsScheme}//${httpUri.host}${httpUri.pathname}/admin/chat/${trainId}/ws?admin_key=${encodeURIComponent(adminKey)}`;
  },
};
