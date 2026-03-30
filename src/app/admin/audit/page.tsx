"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { auditApi } from "@/lib/api/audit"
import type { AuditLogEntry, AuditStats, TopIpEntry } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Ban,
  Bot,
  Scan,
  Zap,
  Lock,
  Globe,
  Activity,
  Search,
  ChevronRight,
  ChevronLeft,
  Clock,
  Info,
  Flame,
  Eye,
  UserX,
  Shield,
} from "lucide-react"

// ── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  rate_limit:       { label: "تجاوز الحد",    icon: Ban,          color: "bg-orange-500/10 text-orange-600" },
  auth_failure:     { label: "فشل مصادقة",     icon: Lock,         color: "bg-red-500/10 text-red-600" },
  brute_force:      { label: "هجوم تخمين",     icon: Flame,        color: "bg-red-600/10 text-red-700" },
  bot_detected:     { label: "بوت مكتشف",      icon: Bot,          color: "bg-purple-500/10 text-purple-600" },
  path_scan:        { label: "مسح مسارات",     icon: Scan,         color: "bg-yellow-500/10 text-yellow-700" },
  spam:             { label: "سبام",           icon: Zap,          color: "bg-pink-500/10 text-pink-600" },
  attack:           { label: "هجوم",           icon: ShieldAlert,  color: "bg-red-700/10 text-red-800" },
  suspicious:       { label: "نشاط مشبوه",     icon: Eye,          color: "bg-amber-500/10 text-amber-700" },
  admin_action:     { label: "إجراء إداري",    icon: ShieldCheck,  color: "bg-blue-500/10 text-blue-600" },
  forbidden_access: { label: "وصول ممنوع",     icon: UserX,        color: "bg-rose-500/10 text-rose-600" },
  token_abuse:      { label: "إساءة توكن",     icon: AlertTriangle,color: "bg-orange-600/10 text-orange-700" },
  invalid_input:    { label: "إدخال غير صالح", icon: Info,         color: "bg-gray-500/10 text-gray-600" },
}

const SEVERITY_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  info:     { label: "معلومات", variant: "secondary" },
  warning:  { label: "تحذير",   variant: "outline" },
  critical: { label: "حرج",    variant: "destructive" },
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "الآن"
  if (mins < 60) return `منذ ${mins} د`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} س`
  return d.toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

function formatFullTime(iso: string): string {
  return new Date(iso).toLocaleString("ar-EG", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

// ── Filter Buttons ───────────────────────────────────────────────────────────

const EVENT_FILTERS = [
  { value: "", label: "الكل" },
  { value: "rate_limit", label: "تجاوز الحد" },
  { value: "auth_failure", label: "فشل مصادقة" },
  { value: "brute_force", label: "هجوم تخمين" },
  { value: "bot_detected", label: "بوت" },
  { value: "path_scan", label: "مسح مسارات" },
  { value: "spam", label: "سبام" },
  { value: "attack", label: "هجوم" },
  { value: "suspicious", label: "مشبوه" },
  { value: "admin_action", label: "إداري" },
  { value: "forbidden_access", label: "وصول ممنوع" },
]

const SEVERITY_FILTERS = [
  { value: "", label: "الكل" },
  { value: "critical", label: "حرج" },
  { value: "warning", label: "تحذير" },
  { value: "info", label: "معلومات" },
]

const TIME_WINDOWS = [
  { value: 1, label: "ساعة" },
  { value: 6, label: "6 ساعات" },
  { value: 24, label: "24 ساعة" },
  { value: 72, label: "3 أيام" },
  { value: 168, label: "أسبوع" },
]

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [eventFilter, setEventFilter] = useState("")
  const [severityFilter, setSeverityFilter] = useState("")
  const [ipFilter, setIpFilter] = useState("")
  const [timeWindow, setTimeWindow] = useState(24)
  const [page, setPage] = useState(0)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const pageSize = 30

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["audit-stats", timeWindow],
    queryFn: () => auditApi.getStats(timeWindow),
    refetchInterval: 30000,
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["audit-logs", eventFilter, severityFilter, ipFilter, page],
    queryFn: () =>
      auditApi.getLogs({
        event_type: eventFilter || undefined,
        severity: severityFilter || undefined,
        ip_address: ipFilter || undefined,
        limit: pageSize,
        offset: page * pageSize,
      }),
    refetchInterval: 15000,
  })

  const { data: topIps, isLoading: ipsLoading } = useQuery({
    queryKey: ["audit-top-ips", timeWindow],
    queryFn: () => auditApi.getTopIps(timeWindow, 10),
    refetchInterval: 30000,
  })

  const logs = logsData?.items ?? []
  const totalLogs = logsData?.total ?? 0
  const totalPages = Math.ceil(totalLogs / pageSize)

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">السجل الأمني</h1>
          <p className="text-muted-foreground mt-1">
            مراقبة الأحداث الأمنية والتهديدات والنشاط المشبوه
          </p>
        </div>
        <Shield className="h-8 w-8 text-primary" />
      </div>

      {/* Time Window Selector */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">الفترة الزمنية:</span>
        <div className="flex gap-1">
          {TIME_WINDOWS.map((tw) => (
            <button
              key={tw.value}
              onClick={() => setTimeWindow(tw.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                timeWindow === tw.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {tw.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="إجمالي الأحداث"
          value={stats?.total}
          icon={Activity}
          loading={statsLoading}
          color="text-primary"
        />
        <StatsCard
          title="حرج"
          value={stats?.by_severity.critical}
          icon={Flame}
          loading={statsLoading}
          color="text-red-600"
          highlight={!!stats?.by_severity.critical}
        />
        <StatsCard
          title="تحذيرات"
          value={stats?.by_severity.warning}
          icon={AlertTriangle}
          loading={statsLoading}
          color="text-amber-500"
        />
        <StatsCard
          title="معلومات"
          value={stats?.by_severity.info}
          icon={Info}
          loading={statsLoading}
          color="text-blue-500"
        />
        <StatsCard
          title="IPs فريدة"
          value={stats?.unique_ips}
          icon={Globe}
          loading={statsLoading}
          color="text-emerald-500"
        />
      </div>

      {/* Event Type Breakdown */}
      {stats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">توزيع الأحداث</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Object.entries(stats.by_type).map(([key, value]) => {
                const config = EVENT_TYPE_CONFIG[key]
                if (!config || value === 0) return null
                const Icon = config.icon
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setEventFilter(eventFilter === key ? "" : key)
                      setPage(0)
                    }}
                    className={`flex items-center gap-2 rounded-xl border p-3 transition-all hover:shadow-sm ${
                      eventFilter === key ? "ring-2 ring-primary border-primary" : ""
                    }`}
                  >
                    <div className={`rounded-lg p-1.5 ${config.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold leading-none">{value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{config.label}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two Column: Top IPs + Logs */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Offending IPs */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              أكثر IPs نشاطاً
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ipsLoading ? (
              <div className="space-y-3 p-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !topIps?.items.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                لا توجد بيانات
              </div>
            ) : (
              <div className="divide-y">
                {topIps.items.map((ip, idx) => (
                  <button
                    key={ip.ip_address}
                    onClick={() => {
                      setIpFilter(ipFilter === ip.ip_address ? "" : ip.ip_address)
                      setPage(0)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-right ${
                      ipFilter === ip.ip_address ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                      idx === 0 ? "bg-red-500/10 text-red-600" :
                      idx === 1 ? "bg-orange-500/10 text-orange-600" :
                      idx === 2 ? "bg-amber-500/10 text-amber-600" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate">{ip.ip_address}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {ip.event_count} حدث • {ip.event_types} نوع
                        {ip.country_code && ` • ${ip.country_code}`}
                      </p>
                    </div>
                    <SeverityDot severity={ip.max_severity} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                سجل الأحداث
                {totalLogs > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {totalLogs}
                  </Badge>
                )}
              </CardTitle>
            </div>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mt-3">
              {/* Severity Filter */}
              <div className="flex gap-1">
                {SEVERITY_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => { setSeverityFilter(f.value); setPage(0) }}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      severityFilter === f.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {/* Event Type Filter */}
              <div className="flex gap-1 flex-wrap">
                {EVENT_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => { setEventFilter(f.value); setPage(0) }}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      eventFilter === f.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {/* IP Filter */}
              {ipFilter && (
                <button
                  onClick={() => { setIpFilter(""); setPage(0) }}
                  className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                >
                  IP: {ipFilter}
                  <span className="text-primary/60">✕</span>
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ShieldCheck className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">لا توجد أحداث مطابقة</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الحدث</TableHead>
                      <TableHead className="text-right">الخطورة</TableHead>
                      <TableHead className="text-right">الوصف</TableHead>
                      <TableHead className="text-right">IP</TableHead>
                      <TableHead className="text-right">المسار</TableHead>
                      <TableHead className="text-right">الوقت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const config = EVENT_TYPE_CONFIG[log.event_type] ?? {
                        label: log.event_type,
                        icon: Info,
                        color: "bg-gray-500/10 text-gray-600",
                      }
                      const Icon = config.icon
                      const sevConfig = SEVERITY_CONFIG[log.severity] ?? SEVERITY_CONFIG.warning
                      const isExpanded = expandedRow === log.id

                      return (
                        <>
                          <TableRow
                            key={log.id}
                            className={`cursor-pointer ${isExpanded ? "bg-accent/30" : ""} ${
                              log.severity === "critical" ? "bg-red-500/5" : ""
                            }`}
                            onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`rounded-md p-1 ${config.color}`}>
                                  <Icon className="h-3 w-3" />
                                </div>
                                <span className="text-xs font-medium">{config.label}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={sevConfig.variant} className="text-[10px]">
                                {sevConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-xs max-w-[200px] truncate" title={log.description}>
                                {log.description}
                              </p>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono text-muted-foreground">
                                {log.ip_address ?? "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono text-muted-foreground max-w-[120px] truncate block">
                                {log.method && `${log.method} `}{log.path ?? "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-[11px] text-muted-foreground" title={log.created_at ? formatFullTime(log.created_at) : ""}>
                                {log.created_at ? formatTime(log.created_at) : "—"}
                              </span>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${log.id}-detail`}>
                              <TableCell colSpan={6} className="bg-accent/20">
                                <ExpandedDetail log={log} />
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      صفحة {page + 1} من {totalPages} ({totalLogs} حدث)
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="rounded-md p-1.5 hover:bg-accent disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                        disabled={page >= totalPages - 1}
                        className="rounded-md p-1.5 hover:bg-accent disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatsCard({
  title,
  value,
  icon: Icon,
  loading,
  color,
  highlight,
}: {
  title: string
  value: number | undefined
  icon: React.ComponentType<{ className?: string }>
  loading: boolean
  color: string
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? "ring-1 ring-red-500/30 bg-red-500/5" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className={`text-2xl font-bold ${highlight ? "text-red-600" : ""}`}>
            {value ?? 0}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SeverityDot({ severity }: { severity: string }) {
  const color =
    severity === "critical" ? "bg-red-500" :
    severity === "warning" ? "bg-amber-400" :
    "bg-blue-400"
  return <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${color}`} />
}

function ExpandedDetail({ log }: { log: AuditLogEntry }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 px-1 text-xs">
      <div className="space-y-2">
        <DetailRow label="الوصف الكامل" value={log.description} />
        <DetailRow label="IP" value={log.ip_address} mono />
        <DetailRow label="User-Agent" value={log.user_agent} mono />
        <DetailRow label="الدولة" value={log.country_code} />
      </div>
      <div className="space-y-2">
        <DetailRow label="المسار" value={log.path ? `${log.method ?? ""} ${log.path}` : null} mono />
        <DetailRow label="كود الاستجابة" value={log.status_code?.toString()} />
        <DetailRow label="معرف المستخدم" value={log.user_id} mono />
        {typeof log.metadata?.user_name === "string" && log.metadata.user_name && (
          <DetailRow label="اسم المستخدم" value={log.metadata.user_name} />
        )}
        {typeof log.metadata?.user_email === "string" && log.metadata.user_email && (
          <DetailRow label="البريد الإلكتروني" value={log.metadata.user_email} />
        )}
        <DetailRow
          label="الوقت الكامل"
          value={log.created_at ? formatFullTime(log.created_at) : null}
        />
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div>
            <span className="font-semibold text-muted-foreground">البيانات الإضافية:</span>
            <pre className="mt-1 rounded-md bg-muted p-2 text-[10px] font-mono overflow-x-auto max-h-32">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  if (!value) return null
  return (
    <div>
      <span className="font-semibold text-muted-foreground">{label}: </span>
      <span className={mono ? "font-mono break-all" : ""}>{value}</span>
    </div>
  )
}
