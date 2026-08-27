import { apiClient } from "./client";
import type {
  RedemptionStatus,
  RewardContributorsParams,
  RewardContributorsResponse,
  RewardRedemptionsParams,
  RewardRedemptionsResponse,
} from "@/types";

export const contributionsApi = {
  listContributors: async (
    params: RewardContributorsParams = {},
  ): Promise<RewardContributorsResponse> => {
    const response = await apiClient.get("/admin/contributions/contributors", {
      params,
    });
    return response.data;
  },

  listRedemptions: async (
    params: RewardRedemptionsParams = {},
  ): Promise<RewardRedemptionsResponse> => {
    const response = await apiClient.get("/admin/contributions/redemptions", {
      params,
    });
    return response.data;
  },

  updateRedemptionStatus: async (
    requestId: string,
    status: Exclude<RedemptionStatus, "pending">,
    adminNote: string = "",
  ) => {
    const response = await apiClient.post(
      `/admin/contributions/redemptions/${requestId}/status`,
      {
        status,
        admin_note: adminNote,
      },
    );
    return response.data;
  },
};
