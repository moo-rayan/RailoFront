export type RedemptionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "fulfilled"
  | "cancelled";

export interface RewardContributor {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  contribution_count: number;
  total_contribution_distance_km: number;
  reward_points_balance: number;
  reward_points_reserved: number;
  reward_points_lifetime: number;
  reward_points_redeemed: number;
  reputation_score: number;
  last_contribution_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RewardContributorStats {
  contributors_count: number;
  total_contributions: number;
  total_distance_km: number;
  total_points: number;
  available_points: number;
  reserved_points: number;
  redeemed_points: number;
}

export interface RewardContributorsResponse {
  items: RewardContributor[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  stats: RewardContributorStats;
}

export interface RewardRedemptionUser {
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  reward_points_balance: number;
  reward_points_reserved: number;
  reward_points_lifetime: number;
  reward_points_redeemed: number;
  contribution_count: number;
  total_contribution_distance_km: number;
}

export interface RewardRedemptionRequest {
  id: string;
  user_id: string;
  reward_key: string;
  reward_title_ar: string;
  reward_title_en: string;
  points_required: number;
  status: RedemptionStatus;
  user_note: string;
  admin_note: string;
  reviewed_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  reviewed_at: string | null;
  fulfilled_at: string | null;
  user: RewardRedemptionUser;
}

export interface RewardRedemptionsResponse {
  items: RewardRedemptionRequest[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  status_counts: Partial<Record<RedemptionStatus, number>>;
}

export interface RewardContributorsParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: "points" | "balance" | "reserved" | "redeemed" | "contributions" | "distance" | "last";
  sort_order?: "asc" | "desc";
}

export interface RewardRedemptionsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: RedemptionStatus | "all";
}
