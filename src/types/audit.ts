export interface AuditLogEntry {
  id: number
  created_at: string
  event_type: string
  severity: 'info' | 'warning' | 'critical'
  ip_address: string | null
  user_agent: string | null
  method: string | null
  path: string | null
  status_code: number | null
  user_id: string | null
  description: string
  metadata: Record<string, unknown>
  country_code: string | null
}

export interface AuditLogsResponse {
  total: number
  items: AuditLogEntry[]
}

export interface AuditStats {
  window_hours: number
  total: number
  by_severity: {
    critical: number
    warning: number
    info: number
  }
  by_type: {
    rate_limit: number
    auth_failure: number
    brute_force: number
    bot_detected: number
    path_scan: number
    spam: number
    attack: number
    suspicious: number
    admin_action: number
    forbidden_access: number
  }
  unique_ips: number
}

export interface TopIpEntry {
  ip_address: string
  event_count: number
  event_types: number
  max_severity: string
  first_seen: string | null
  last_seen: string | null
  country_code: string | null
}

export interface TopIpsResponse {
  window_hours: number
  items: TopIpEntry[]
}
