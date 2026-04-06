export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_contributor: boolean;
  contribution_count: number;
  reputation_score: number;
  last_contribution_at: string | null;
  is_captain: boolean;
  is_admin: boolean;
  admin_level: string | null;
  is_active: boolean;
  is_banned: boolean;
  ban_info: UserBanInfo | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserBanInfo {
  user_id: string;
  reason: string;
  banned_at: number;
  duration_minutes: number;
  expires_at: number | null;
  banned_by: string;
}

export interface UsersListResponse {
  users: UserProfile[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface UserStatsDailyEntry {
  date: string;
  count: number;
}

export interface UserStatsWeeklyEntry {
  week: string;
  count: number;
}

export interface UserStatsResponse {
  total_users: number;
  weekly_new: number;
  monthly_new: number;
  daily: UserStatsDailyEntry[];
  weekly: UserStatsWeeklyEntry[];
}

export interface UsersListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  filter_contributors?: boolean;
  filter_captains?: boolean;
  filter_admins?: boolean;
}
