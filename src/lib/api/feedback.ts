import { apiClient } from "./client";

export interface FeatureVote {
  id: number;
  user_id: string;
  email: string | null;
  display_name: string | null;
  feature_key: string;
  vote_value: string;
  target_type: string;
  target_id: string;
  context_data: Record<string, unknown>;
  client_metadata: Record<string, unknown>;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface FeatureVoteSummaryItem {
  vote_value: string;
  count: number;
}

export interface FeatureVoteListResponse {
  total: number;
  users_count: number;
  page: number;
  page_size: number;
  summary: FeatureVoteSummaryItem[];
  items: FeatureVote[];
}

export interface FeatureVoteOverviewItem {
  feature_key: string;
  total: number;
  users_count: number;
  targets_count: number;
  interested_count: number;
  not_interested_count: number;
  other_count: number;
  latest_at: string | null;
  target_types: string[];
  sources: string[];
}

export interface FeatureVoteOverviewResponse {
  total_features: number;
  total_votes: number;
  items: FeatureVoteOverviewItem[];
}

export const feedbackApi = {
  listVoteOverview: async (params?: {
    q?: string;
  }): Promise<FeatureVoteOverviewResponse> => {
    const { data } = await apiClient.get<FeatureVoteOverviewResponse>(
      "/feedback/admin/votes/overview",
      { params },
    );
    return data;
  },

  listVotes: async (params?: {
    q?: string;
    feature_key?: string;
    vote_value?: string;
    target_type?: string;
    page?: number;
    page_size?: number;
  }): Promise<FeatureVoteListResponse> => {
    const { data } = await apiClient.get<FeatureVoteListResponse>(
      "/feedback/admin/votes",
      { params },
    );
    return data;
  },
};
