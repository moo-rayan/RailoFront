export interface RoomContributor {
  user_id: string;
  display_name: string;
  avatar_url: string;
  lat: number;
  lng: number;
  speed: number;
  last_update: number;
  is_leader: boolean;
  is_captain: boolean;
  is_silent: boolean;
  is_stale: boolean;
  is_suspended: boolean;
  from_station: string;
  to_station: string;
  trip_distance_km: number;
  is_left?: boolean;
  left_at?: number;
}

export interface WaitingContributor {
  user_id: string;
  display_name: string;
  avatar_url: string;
  from_station: string;
  to_station: string;
  trip_distance_km: number;
  joined_at: number;
}

export interface LiveRoom {
  train_id: string;
  trip_id: number | null;
  status: string;
  lat: number;
  lng: number;
  speed: number;
  direction: string;
  start_station: string;
  end_station: string;
  contributors_count: number;
  listeners_count: number;
  waiting_count: number;
  max_active_contributors: number;
  leader_id: string | null;
  contributors: RoomContributor[];
  waiting_list: WaitingContributor[];
  empty_since: number | null;
  is_historical?: boolean;
  wrong_location_reports?: number;
}

export interface DashboardRoomsResponse {
  total_rooms: number;
  total_contributors: number;
  total_waiting: number;
  rooms: LiveRoom[];
}

export interface DashboardStats {
  stations: number;
  trains: number;
  trips: number;
  active_rooms: number;
}

export interface RoomEvent {
  timestamp: number;
  event_type: string;
  user_id: string;
  detail: string;
}

export interface RoomLogsResponse {
  train_id: string;
  total: number;
  logs: RoomEvent[];
}

export interface FeedEntry {
  ts: number;
  user_id: string;
  display_name: string;
  type: string; // "gps" | "far_warning"
  lat: number;
  lng: number;
  speed: number;
  bearing?: number;
  distance_m?: number | null;
  detail?: string;
}

export interface FeedResponse {
  train_id: string;
  total: number;
  feed: FeedEntry[];
}

export interface SuspensionInfo {
  user_id: string;
  train_id: string;
  reason: string;
  ttl_seconds: number | null; // null = permanent
}

export interface SuspensionListResponse {
  total: number;
  suspensions: SuspensionInfo[];
}

export interface BanInfo {
  user_id: string;
  reason: string;
  banned_at: number;
  duration_minutes: number;
  expires_at: number | null;
  banned_by: string;
}

export interface BanListResponse {
  total: number;
  bans: BanInfo[];
}

export interface CrowdVoter {
  user_id: string;
  display_name: string;
  avatar_url: string;
  vote: 'crowded' | 'not_crowded' | string;
}

export interface CrowdTrainReport {
  train_id: string;
  crowded: number;
  not_crowded: number;
  total_votes: number;
  voters: CrowdVoter[];
}

export interface CrowdReportsResponse {
  total: number;
  trains: CrowdTrainReport[];
}
