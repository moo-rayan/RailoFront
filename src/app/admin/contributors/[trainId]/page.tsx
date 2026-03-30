"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { dashboardApi } from "@/lib/api/contributors"
import type { LiveRoom, RoomContributor, WaitingContributor, RoomEvent, FeedEntry, BanInfo } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  Train,
  MapPin,
  Crown,
  Ban,
  ArrowRight,
  Gauge,
  ScrollText,
  Radio,
  ShieldOff,
  Clock,
  AlertTriangle,
  Hourglass,
  Settings2,
  Route,
} from "lucide-react"
import { BanDialog } from "@/components/admin/ban-dialog"
import { ChatPanel } from "@/components/admin/chat-panel"
import { LiveTrainMap } from "@/components/admin/train-route-map"

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ts: number) {
  if (!ts) return "-"
  const diff = Math.floor(Date.now() / 1000 - ts)
  if (diff < 60) return `منذ ${diff} ثانية`
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`
  return new Date(ts * 1000).toLocaleDateString("ar-EG")
}

function formatLogTime(ts: number) {
  if (!ts) return "-"
  return new Date(ts * 1000).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatBanExpiry(expiresAt: number | null) {
  if (!expiresAt) return "دائم"
  const now = Date.now() / 1000
  const remaining = expiresAt - now
  if (remaining <= 0) return "منتهي"
  if (remaining < 3600) return `${Math.ceil(remaining / 60)} دقيقة`
  if (remaining < 86400) return `${Math.ceil(remaining / 3600)} ساعة`
  return `${Math.ceil(remaining / 86400)} يوم`
}

const statusMap: Record<string, { label: string; color: string }> = {
  moving: { label: "متحرك", color: "bg-green-500" },
  stopped: { label: "متوقف", color: "bg-yellow-500" },
  waiting: { label: "في الانتظار", color: "bg-gray-400" },
}

const eventLabels: Record<string, { label: string; color: string }> = {
  join: { label: "انضمام", color: "text-green-600" },
  leave: { label: "مغادرة", color: "text-gray-500" },
  kick: { label: "طرد", color: "text-red-500" },
  ban: { label: "حظر", color: "text-red-700" },
  leader_set: { label: "تعيين ليدر", color: "text-blue-600" },
  leader_removed: { label: "إزالة ليدر", color: "text-orange-500" },
  far_warning: { label: "تحذير بُعد", color: "text-yellow-600" },
  silent_disconnect: { label: "فصل تلقائي", color: "text-red-400" },
  waiting: { label: "قائمة انتظار", color: "text-purple-500" },
  promoted: { label: "ترقية", color: "text-emerald-600" },
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function TrainDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const trainId = params.trainId as string
  const feedEndRef = useRef<HTMLDivElement>(null)

  const [banDialog, setBanDialog] = useState<{ open: boolean; userId: string }>({ open: false, userId: "" })
  const [activeTab, setActiveTab] = useState<"events" | "feed" | "bans">("events")
  const lastRoomRef = useRef<LiveRoom | null>(null)

  // Fetch all rooms, find current train
  const { data: roomsData, isLoading } = useQuery({
    queryKey: ["live-rooms"],
    queryFn: () => dashboardApi.getRooms(),
    refetchInterval: 5000,
  })

  // Fetch logs
  const { data: logsData } = useQuery({
    queryKey: ["room-logs", trainId],
    queryFn: () => dashboardApi.getRoomLogs(trainId),
    refetchInterval: 5000,
    enabled: !!trainId,
  })

  // Fetch live feed
  const { data: feedData } = useQuery({
    queryKey: ["room-feed", trainId],
    queryFn: () => dashboardApi.getRoomFeed(trainId),
    refetchInterval: 3000,
    enabled: !!trainId && activeTab === "feed",
  })

  // Fetch bans
  const { data: bansData } = useQuery({
    queryKey: ["bans"],
    queryFn: () => dashboardApi.getBans(),
    refetchInterval: 10000,
    enabled: activeTab === "bans",
  })

  const liveRoom: LiveRoom | undefined = roomsData?.rooms?.find(
    (r: LiveRoom) => r.train_id === trainId
  )

  // Cache last known room data so the page stays visible when all participants leave
  if (liveRoom) {
    lastRoomRef.current = liveRoom
  }
  const room = liveRoom ?? lastRoomRef.current
  const isStaleData = !liveRoom && !!lastRoomRef.current
  const logs = logsData?.logs ?? []
  const feed = feedData?.feed ?? []
  const bans = bansData?.bans ?? []

  // Auto-scroll feed
  useEffect(() => {
    if (activeTab === "feed" && feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [feed.length, activeTab])

  // Mutations
  const banMutation = useMutation({
    mutationFn: ({ userId, reason, duration }: { userId: string; reason: string; duration: number }) =>
      dashboardApi.banContributor(userId, reason, duration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-rooms"] })
      queryClient.invalidateQueries({ queryKey: ["bans"] })
      setBanDialog({ open: false, userId: "" })
    },
  })

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => dashboardApi.unbanContributor(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bans"] })
    },
  })

  const leaderMutation = useMutation({
    mutationFn: ({ trainId, userId }: { trainId: string; userId: string }) =>
      dashboardApi.setLeader(trainId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["live-rooms"] }),
  })

  const removeLeaderMutation = useMutation({
    mutationFn: (trainId: string) => dashboardApi.removeLeader(trainId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["live-rooms"] }),
  })

  const setMaxMutation = useMutation({
    mutationFn: ({ trainId, maxActive }: { trainId: string; maxActive: number }) =>
      dashboardApi.setMaxContributors(trainId, maxActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["live-rooms"] }),
  })

  // ── Loading / Not found ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="space-y-6" dir="rtl">
        <Button variant="ghost" onClick={() => router.push("/admin/contributors")} className="gap-2">
          <ArrowRight className="h-4 w-4" />
          العودة للقطارات
        </Button>
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Train className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">القطار {trainId} غير نشط</h3>
              <p className="text-muted-foreground text-sm">
                لا توجد غرفة تتبع نشطة لهذا القطار حالياً
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const st = statusMap[room.status] || statusMap.waiting

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl">
      {/* Stale data banner */}
      {isStaleData && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/20 px-4 py-2.5 text-sm text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>الغرفة لم تعد نشطة — البيانات المعروضة هي آخر بيانات محفوظة</span>
        </div>
      )}

      {/* Back + Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/contributors")} className="gap-2 mb-3">
          <ArrowRight className="h-4 w-4" />
          العودة للقطارات
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          <Train className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold font-mono">{room.train_id}</h1>
          <span className={`inline-block w-3 h-3 rounded-full ${st.color}`} />
          <Badge variant="outline">{st.label}</Badge>
        </div>
        {(room.start_station || room.end_station) && (
          <div className="text-muted-foreground mt-1 flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {room.start_station || "?"} → {room.end_station || "?"}
          </div>
        )}
      </div>

      {/* Two-column layout: Main content + Chat */}
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* ── Left column: tracking info ── */}
      <div className="space-y-6">

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المساهمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {room.contributors_count}
              <span className="text-sm font-normal text-muted-foreground">/{room.max_active_contributors}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">في الانتظار</CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{room.waiting_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نمط التتبع</CardTitle>
            <Radio className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground pt-1">HTTP مستمر</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">السرعة</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {room.speed > 0 ? `${room.speed.toFixed(0)}` : "0"}
              <span className="text-sm font-normal text-muted-foreground mr-1">كم/س</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route Map with live position */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5 text-primary" />
            خريطة المسار
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LiveTrainMap
            tripId={room.trip_id}
            trainNumber={room.train_id}
            className="w-full h-[350px] rounded-lg overflow-hidden border"
            livePosition={{ lat: room.lat, lng: room.lng, speed: room.speed }}
          />
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground justify-center">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-orange-500 border border-white" />
              موقع القطار الحالي
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-green-600 border border-white" />
              محطة الانطلاق
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-600 border border-white" />
              محطة الوصول
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Max contributors control */}
      <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">الحد الأقصى للمساهمين النشطين:</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setMaxMutation.mutate({ trainId: room.train_id, maxActive: Math.max(1, room.max_active_contributors - 1) })}
            disabled={room.max_active_contributors <= 1 || setMaxMutation.isPending}
          >
            -
          </Button>
          <span className="w-8 text-center font-bold font-mono">{room.max_active_contributors}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setMaxMutation.mutate({ trainId: room.train_id, maxActive: Math.min(50, room.max_active_contributors + 1) })}
            disabled={room.max_active_contributors >= 50 || setMaxMutation.isPending}
          >
            +
          </Button>
        </div>
      </div>

      {/* Leader bar */}
      {room.leader_id && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
          <Crown className="h-5 w-5 text-amber-600" />
          <span className="text-sm font-medium">
            الليدر الحالي:{" "}
            <span className="font-mono">
              {room.contributors.find(c => c.user_id === room.leader_id)?.display_name || room.leader_id.slice(0, 8) + "..."}
            </span>
          </span>
          <Button
            variant="outline"
            size="sm"
            className="mr-auto text-xs"
            onClick={() => removeLeaderMutation.mutate(room.train_id)}
            disabled={removeLeaderMutation.isPending}
          >
            إزالة الليدر
          </Button>
        </div>
      )}

      {/* Contributors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            المساهمون ({room.contributors_count})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {room.contributors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              لا يوجد مساهمون حالياً
            </div>
          ) : (
            <div className="space-y-3">
              {room.contributors.map((c: RoomContributor) => (
                <div
                  key={c.user_id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    c.is_stale ? "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 opacity-60" :
                    c.is_captain ? "bg-yellow-50/50 dark:bg-yellow-950/10 border-yellow-300 dark:border-yellow-800" :
                    c.is_leader ? "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800" : "bg-card"
                  }`}
                >
                  <Avatar>
                    {c.avatar_url ? <AvatarImage src={c.avatar_url} /> : null}
                    <AvatarFallback>
                      {c.display_name?.charAt(0) || c.user_id.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {c.display_name || "مستخدم مجهول"}
                      </span>
                      {c.is_stale && (
                        <Badge variant="outline" className="text-[10px] h-5 text-gray-400 border-gray-300">
                          <Clock className="h-2.5 w-2.5 ml-0.5" />
                          قديم
                        </Badge>
                      )}
                      {c.is_captain && (
                        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-[10px] h-5">
                          <Train className="h-2.5 w-2.5 ml-0.5" />
                          كابتن
                        </Badge>
                      )}
                      {c.is_leader && (
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px] h-5">
                          <Crown className="h-2.5 w-2.5 ml-0.5" />
                          ليدر
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {(c.from_station || c.to_station) && (
                        <span className="flex items-center gap-1">
                          <Route className="h-3 w-3" />
                          {c.from_station || "?"} → {c.to_station || "?"}
                          {c.trip_distance_km > 0 && <span>({c.trip_distance_km} كم)</span>}
                        </span>
                      )}
                      <span className="font-mono">{c.lat.toFixed(4)}, {c.lng.toFixed(4)}</span>
                      {c.speed > 0 && <span>{c.speed.toFixed(0)} كم/س</span>}
                      <span>{formatTimestamp(c.last_update)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!c.is_leader && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => leaderMutation.mutate({ trainId: room.train_id, userId: c.user_id })}
                        disabled={leaderMutation.isPending}
                      >
                        <Crown className="h-3 w-3 text-amber-500" />
                        ليدر
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 text-red-500 hover:text-red-600 hover:border-red-300"
                      onClick={() => setBanDialog({ open: true, userId: c.user_id })}
                    >
                      <Ban className="h-3 w-3" />
                      حظر
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waiting List */}
      {room.waiting_list && room.waiting_list.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hourglass className="h-5 w-5 text-purple-500" />
              قائمة الانتظار ({room.waiting_list.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {room.waiting_list.map((w: WaitingContributor, idx: number) => (
                <div
                  key={w.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-purple-50/50 dark:bg-purple-950/10 border-purple-200 dark:border-purple-800"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold">
                    #{idx + 1}
                  </div>
                  <Avatar>
                    {w.avatar_url ? <AvatarImage src={w.avatar_url} /> : null}
                    <AvatarFallback>
                      {w.display_name?.charAt(0) || w.user_id.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">
                      {w.display_name || "مستخدم مجهول"}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {(w.from_station || w.to_station) && (
                        <span className="flex items-center gap-1">
                          <Route className="h-3 w-3" />
                          {w.from_station || "?"} → {w.to_station || "?"}
                          {w.trip_distance_km > 0 && <span>({w.trip_distance_km} كم)</span>}
                        </span>
                      )}
                      <span>{formatTimestamp(w.joined_at)}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 text-red-500 hover:text-red-600 hover:border-red-300 shrink-0"
                    onClick={() => setBanDialog({ open: true, userId: w.user_id })}
                  >
                    <Ban className="h-3 w-3" />
                    حظر
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Events / Feed / Bans */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("events")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "events"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <ScrollText className="h-4 w-4" />
              سجل الأحداث ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab("feed")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "feed"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Radio className="h-4 w-4" />
              البث الحي ({feed.length})
            </button>
            <button
              onClick={() => setActiveTab("bans")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "bans"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <ShieldOff className="h-4 w-4" />
              المحظورون ({bans.length})
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* ── Events Tab ── */}
          {activeTab === "events" && (
            <>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  لا توجد أحداث مسجلة بعد
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1">
                  {[...logs].reverse().map((event: RoomEvent, idx: number) => {
                    const meta = eventLabels[event.event_type] || { label: event.event_type, color: "text-gray-500" }
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-3 py-2 px-3 rounded text-sm hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-mono text-xs text-muted-foreground min-w-[65px] pt-0.5">
                          {formatLogTime(event.timestamp)}
                        </span>
                        <span className={`font-medium min-w-[80px] ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-muted-foreground flex-1">
                          {event.detail}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Feed Tab ── */}
          {activeTab === "feed" && (
            <>
              {feed.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Radio className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  لا توجد بيانات بث حالياً — في انتظار تحديثات من المساهمين
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1 font-mono text-xs">
                  {feed.map((entry: FeedEntry, idx: number) => {
                    const isWarning = entry.type === "far_warning"
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 py-1.5 px-3 rounded transition-colors ${
                          isWarning
                            ? "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-muted-foreground min-w-[55px]">
                          {formatLogTime(entry.ts)}
                        </span>
                        {isWarning ? (
                          <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                        )}
                        <span className="font-medium min-w-[80px] truncate">
                          {entry.display_name}
                        </span>
                        <span className="text-muted-foreground">
                          {entry.lat.toFixed(5)}, {entry.lng.toFixed(5)}
                        </span>
                        <span>{entry.speed.toFixed(0)} كم/س</span>
                        {entry.distance_m != null && (
                          <span className={`${isWarning ? "text-yellow-600 font-bold" : "text-muted-foreground"}`}>
                            {entry.distance_m.toFixed(0)}م
                          </span>
                        )}
                        {isWarning && entry.detail && (
                          <span className="text-yellow-600 truncate">{entry.detail}</span>
                        )}
                      </div>
                    )
                  })}
                  <div ref={feedEndRef} />
                </div>
              )}
            </>
          )}

          {/* ── Bans Tab ── */}
          {activeTab === "bans" && (
            <>
              {bans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <ShieldOff className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  لا يوجد مستخدمون محظورون حالياً
                </div>
              ) : (
                <div className="space-y-3">
                  {bans.map((ban: BanInfo) => (
                    <div
                      key={ban.user_id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900"
                    >
                      <Ban className="h-5 w-5 text-red-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm font-medium">
                          {ban.user_id.slice(0, 12)}...
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {ban.reason && <span>السبب: {ban.reason}</span>}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {ban.duration_minutes === 0 ? "دائم" : `${ban.duration_minutes} دقيقة`}
                          </span>
                          <span>
                            المتبقي: {formatBanExpiry(ban.expires_at)}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 shrink-0"
                        onClick={() => unbanMutation.mutate(ban.user_id)}
                        disabled={unbanMutation.isPending}
                      >
                        <ShieldOff className="h-3 w-3" />
                        فك الحظر
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      </div>
      {/* ── Right column: Chat ── */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <ChatPanel trainId={trainId} />
      </div>
      </div>{/* end grid */}

      {/* Ban Dialog */}
      <BanDialog
        open={banDialog.open}
        onOpenChange={(open) => setBanDialog(prev => ({ ...prev, open }))}
        userId={banDialog.userId}
        onConfirm={(reason, duration) =>
          banMutation.mutate({ userId: banDialog.userId, reason, duration })
        }
        isLoading={banMutation.isPending}
      />
    </div>
  )
}
