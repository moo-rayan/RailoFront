import { apiClient } from './client';

export interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  text: string;
  admin_text?: string;
  type: string; // normal | emergency | lost_item | found_item | ticket_sale | admin
  is_pinned: boolean;
  is_admin?: boolean;
  reply_to_message_id?: string;
  reply_to_user_name?: string;
  reply_to_text?: string;
  love_count?: number;
  loved_by_me?: boolean;
  is_deleted?: boolean;
  edited_at?: string | null;
  updated_at?: string;
  revision?: number;
  timestamp: string;
}

export interface ChatMessageMutation {
  message_id: string;
  text: string;
  is_deleted: boolean;
  edited_at: string | null;
  updated_at: string;
  revision: number;
  reply_to_text?: string | null;
  reply_updates?: { message_id: string; text?: string; edited_at?: string | null; reply_to_text: string; revision: number; updated_at: string }[];
}

export function applyChatMessageMutation(messages: ChatMessage[], mutation: ChatMessageMutation): ChatMessage[] {
  return messages.map(message => {
    if (message.id === mutation.message_id && mutation.revision > (message.revision ?? 0) && !(message.is_deleted && !mutation.is_deleted)) {
      return {
        ...message, text: mutation.is_deleted ? '' : mutation.text,
        is_deleted: mutation.is_deleted, edited_at: mutation.edited_at,
        updated_at: mutation.updated_at, revision: mutation.revision,
        ...(mutation.reply_to_text != null ? { reply_to_text: mutation.reply_to_text } : {}),
        ...(mutation.is_deleted ? { reply_to_message_id: undefined, reply_to_text: undefined, love_count: 0 } : {}),
      };
    }
    const reply = mutation.reply_updates?.find(update => update.message_id === message.id);
    if (reply && !message.is_deleted && message.reply_to_message_id === mutation.message_id && reply.revision > (message.revision ?? 0)) {
      return { ...message, text: reply.text ?? message.text,
        edited_at: reply.edited_at === undefined ? message.edited_at : reply.edited_at,
        reply_to_text: reply.reply_to_text, updated_at: reply.updated_at, revision: reply.revision };
    }
    return message;
  });
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

  sendAdminMessage: async (
    trainId: string,
    text: string,
    adminName = 'مشرف',
    replyTo?: ChatMessage | null,
  ) => {
    const response = await apiClient.post(`/admin/chat/${trainId}/send`, {
      text,
      admin_name: adminName,
      ...(replyTo
        ? {
            reply_to: {
              message_id: replyTo.id,
              user_name: replyTo.user_name,
              text: replyTo.admin_text ?? replyTo.text,
            },
          }
        : {}),
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

  getGlobalMessages: async (limit = 80) => {
    const response = await apiClient.get('/admin/global-chat/messages', {
      params: { limit },
    });
    return response.data as {
      messages: ChatMessage[];
      total: number;
      chat_enabled: boolean;
      online_users: number;
    };
  },

  getGlobalStatus: async () => {
    const response = await apiClient.get('/admin/global-chat/status');
    return response.data as {
      chat_enabled: boolean;
      online_users: number;
      message_count: number;
    };
  },

  toggleGlobalChat: async (enabled: boolean) => {
    const response = await apiClient.post('/admin/global-chat/toggle', { enabled });
    return response.data;
  },

  sendGlobalAdminMessage: async (
    text: string,
    adminName = 'مشرف',
    replyTo?: ChatMessage | null,
  ) => {
    const response = await apiClient.post('/admin/global-chat/send', {
      text,
      admin_name: adminName,
      ...(replyTo
        ? {
            reply_to: {
              message_id: replyTo.id,
              user_name: replyTo.user_name,
              text: replyTo.admin_text ?? replyTo.text,
            },
          }
        : {}),
    });
    return response.data as { ok: boolean; message?: ChatMessage };
  },

  deleteGlobalMessage: async (messageId: string) => {
    const response = await apiClient.delete(`/admin/global-chat/messages/${messageId}`);
    return response.data as { ok: boolean; message_id: string };
  },

  clearGlobalChat: async () => {
    const response = await apiClient.delete('/admin/global-chat/clear');
    return response.data as { ok: boolean };
  },

  getGlobalReports: async (status = 'pending', limit = 50) => {
    const response = await apiClient.get('/admin/global-chat/reports', {
      params: { report_status: status, limit },
    });
    return response.data as { total: number; reports: ChatReport[] };
  },

  banGlobalChatUser: async (
    userId: string,
    reason = '',
    banType = 'temporary',
    durationHours = 24,
  ) => {
    const response = await apiClient.post(
      '/admin/global-chat/ban',
      { user_id: userId, reason, ban_type: banType, duration_hours: durationHours },
    );
    return response.data;
  },

  getGlobalAdminWsUrl: (): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const adminKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'change-me-admin-key';
    const httpUri = new URL(baseUrl);
    const wsScheme = httpUri.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsScheme}//${httpUri.host}${httpUri.pathname}/admin/global-chat/ws?admin_key=${encodeURIComponent(adminKey)}`;
  },
};
