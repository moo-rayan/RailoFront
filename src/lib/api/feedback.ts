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
  page: number;
  page_size: number;
  summary: FeatureVoteSummaryItem[];
  items: FeatureVote[];
}

export const feedbackApi = {
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
