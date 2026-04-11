export type { AuditLogEntry, AuditLogsResponse, AuditStats, TopIpEntry, TopIpsResponse } from './audit'
export type { Station, StationListResponse, CreateStationInput, UpdateStationInput } from './station'
export type { Train, TrainListResponse, CreateTrainInput, UpdateTrainInput } from './train'
export type { Trip, TripStop, TripListResponse } from './trip'
export type { DashboardStats, DashboardRoomsResponse, LiveRoom, RoomContributor, WaitingContributor, RoomEvent, RoomLogsResponse, FeedEntry, FeedResponse, SuspensionInfo, SuspensionListResponse, BanInfo, BanListResponse, CrowdVoter, CrowdReportsResponse } from './contributor'
export type { UserProfile, UserBanInfo, UsersListResponse, UsersListParams, UserStatsResponse, UserStatsDailyEntry, UserStatsWeeklyEntry } from './user'

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
