import { apiClient } from './client';

export interface ContactMessage {
  id: number;
  user_id: string;
  display_name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProblemReport {
  id: number;
  user_id: string;
  display_name: string;
  email: string;
  category: string;
  category_label: string;
  details: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export const supportApi = {
  async getContacts(status = 'all', limit = 50, offset = 0): Promise<PaginatedResponse<ContactMessage>> {
    const { data } = await apiClient.get('/support/admin/contacts', {
      params: { status, limit, offset },
    });
    return data;
  },

  async getReports(status = 'all', category = 'all', limit = 50, offset = 0): Promise<PaginatedResponse<ProblemReport>> {
    const { data } = await apiClient.get('/support/admin/reports', {
      params: { status, category, limit, offset },
    });
    return data;
  },

  async updateContact(id: number, status?: string, adminNotes?: string): Promise<void> {
    await apiClient.patch(`/support/admin/contacts/${id}`, null, {
      params: { ...(status && { status }), ...(adminNotes !== undefined && { admin_notes: adminNotes }) },
    });
  },

  async updateReport(id: number, status?: string, adminNotes?: string): Promise<void> {
    await apiClient.patch(`/support/admin/reports/${id}`, null, {
      params: { ...(status && { status }), ...(adminNotes !== undefined && { admin_notes: adminNotes }) },
    });
  },
};
