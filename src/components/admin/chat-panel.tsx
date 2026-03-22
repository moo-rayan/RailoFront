"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { chatApi, type ChatMessage, type ChatReport, type ChatBan } from "@/lib/api/chat"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import {
  MessageCircle,
  AlertTriangle,
  Ban,
  ShieldOff,
  Clock,
  Flag,
  Check,
  X,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react"

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatChatTime(ts: string) {
  if (!ts) return "-"
  const d = new Date(ts)
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
}

function formatRelativeTime(ts: string) {
  if (!ts) return "-"
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `منذ ${diff} ث`
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`
  return new Date(ts).toLocaleDateString("ar-EG")
}

function formatBanExpiry(expiresAt: string | null) {
  if (!expiresAt) return "دائم"
  const remaining = (new Date(expiresAt).getTime() - Date.now()) / 1000
  if (remaining <= 0) return "منتهي"
  if (remaining < 3600) return `${Math.ceil(remaining / 60)} دقيقة`
  if (remaining < 86400) return `${Math.ceil(remaining / 3600)} ساعة`
  return `${Math.ceil(remaining / 86400)} يوم`
}

// ── Chat Panel Props ─────────────────────────────────────────────────────────

interface ChatPanelProps {
  trainId: string
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ChatPanel({ trainId }: ChatPanelProps) {
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const reconnectAttemptsRef = useRef(0)
  const MAX_RECONNECT_ATTEMPTS = 8
  const [chatEnabled, setChatEnabled] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [activeSection, setActiveSection] = useState<"chat" | "reports" | "bans">("chat")

  // ── WebSocket connection ──────────────────────────────────────────────

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const url = chatApi.getAdminWsUrl(trainId)
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0 // Reset on successful connection
      setWsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === "init") {
          setMessages(data.data.messages || [])
          setChatEnabled(data.data.chat_enabled ?? true)
          setOnlineUsers(data.data.online_users ?? 0)
        } else if (data.type === "chat_message") {
          setMessages(prev => [...prev, data.data])
        } else if (data.type === "system") {
          // System messages (chat enabled/disabled notifications)
          setMessages(prev => [...prev, {
            id: data.data.id,
            user_id: "system",
            user_name: "النظام",
            user_avatar: "",
            text: data.data.text,
            type: "system",
            is_pinned: false,
            timestamp: data.data.timestamp,
          }])
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      setWsConnected(false)
      // Auto-reconnect with exponential backoff
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++
        const delay = Math.min(3000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000)
        reconnectTimerRef.current = setTimeout(() => {
          connectWs()
        }, delay)
      }
    }

    ws.onerror = () => {
      ws.close()
    }

    // Ping every 25s to keep alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }))
      }
    }, 25000)

    const origClose = ws.onclose
    ws.onclose = (event) => {
      clearInterval(pingInterval)
      if (origClose) origClose.call(ws, event)
    }
  }, [trainId])

  useEffect(() => {
    connectWs()
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [connectWs])

  // Auto-scroll messages
  useEffect(() => {
    if (activeSection === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages.length, activeSection])

  // ── Reports query ─────────────────────────────────────────────────────

  const { data: reportsData } = useQuery({
    queryKey: ["chat-reports", trainId],
    queryFn: () => chatApi.getReports(trainId, "pending"),
    refetchInterval: 10000,
    enabled: activeSection === "reports",
  })

  const reports = reportsData?.reports ?? []

  // ── Bans query ────────────────────────────────────────────────────────

  const { data: bansData } = useQuery({
    queryKey: ["chat-bans"],
    queryFn: () => chatApi.getChatBans(),
    refetchInterval: 10000,
    enabled: activeSection === "bans",
  })

  const bans = bansData?.bans ?? []

  // ── Mutations ─────────────────────────────────────────────────────────

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => chatApi.toggleChat(trainId, enabled),
    onSuccess: (_, enabled) => {
      setChatEnabled(enabled)
    },
  })

  const reviewMutation = useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: "reviewed" | "dismissed" }) =>
      chatApi.reviewReport(reportId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-reports", trainId] })
    },
  })

  const banMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      chatApi.banChatUser(userId, reason, "temporary", 24),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-bans"] })
      queryClient.invalidateQueries({ queryKey: ["chat-reports", trainId] })
    },
  })

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => chatApi.unbanChatUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-bans"] })
    },
  })

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Chat Header + Toggle */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-5 w-5" />
              شات القطار
              <Badge variant="outline" className="font-mono text-xs">{trainId}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Connection status */}
              <div className="flex items-center gap-1.5 text-xs">
                {wsConnected ? (
                  <>
                    <Wifi className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-green-600">متصل</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-red-500">غير متصل</span>
                  </>
                )}
              </div>
              {/* Online users */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {onlineUsers}
              </div>
              {/* Chat toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {chatEnabled ? "مفعّل" : "متوقف"}
                </span>
                <Switch
                  checked={chatEnabled}
                  onCheckedChange={(checked) => toggleMutation.mutate(checked)}
                  disabled={toggleMutation.isPending}
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Section tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveSection("chat")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeSection === "chat"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          الرسائل ({messages.length})
        </button>
        <button
          onClick={() => setActiveSection("reports")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeSection === "reports"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Flag className="h-4 w-4" />
          البلاغات ({reports.length})
        </button>
        <button
          onClick={() => setActiveSection("bans")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeSection === "bans"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Ban className="h-4 w-4" />
          المحظورون ({bans.length})
        </button>
      </div>

      {/* Content area */}
      <Card className="flex-1 min-h-0">
        <CardContent className="p-0 h-full">
          {/* ── Chat Messages ── */}
          {activeSection === "chat" && (
            <div className="flex flex-col h-full max-h-[500px]">
              {!chatEnabled && (
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  الشات متوقف حالياً — المستخدمون لا يمكنهم إرسال رسائل
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    لا توجد رسائل بعد
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${
                        msg.user_id === "system"
                          ? "justify-center"
                          : "items-start"
                      }`}
                    >
                      {msg.user_id === "system" ? (
                        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                          {msg.text}
                        </div>
                      ) : (
                        <>
                          <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                            {msg.user_avatar ? <AvatarImage src={msg.user_avatar} /> : null}
                            <AvatarFallback className="text-[10px]">
                              {msg.user_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-medium truncate max-w-[120px]">
                                {msg.user_name || "مجهول"}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatChatTime(msg.timestamp)}
                              </span>
                              {msg.type === "lost_item" && (
                                <Badge variant="destructive" className="text-[9px] h-4 px-1">مفقود</Badge>
                              )}
                              {msg.type === "found_item" && (
                                <Badge className="bg-green-500 text-[9px] h-4 px-1">موجود</Badge>
                              )}
                            </div>
                            <p className="text-sm break-words">{msg.text}</p>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* ── Reports Section ── */}
          {activeSection === "reports" && (
            <div className="p-4 max-h-[500px] overflow-y-auto">
              {reports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <Flag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  لا توجد بلاغات معلّقة
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report: ChatReport) => (
                    <div
                      key={report.id}
                      className="p-3 rounded-lg border bg-orange-50/50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-800"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          {report.reported_user_avatar ? (
                            <AvatarImage src={report.reported_user_avatar} />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {report.reported_user_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {report.reported_user_name || report.reported_user_id.slice(0, 8)}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {formatRelativeTime(report.created_at)}
                            </Badge>
                          </div>
                          <div className="mt-1 p-2 bg-white dark:bg-gray-900 rounded border text-sm">
                            &ldquo;{report.message_text}&rdquo;
                          </div>
                          {report.report_reason && (
                            <div className="text-xs text-muted-foreground mt-1">
                              السبب: {report.report_reason}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 text-red-500 hover:text-red-600"
                          onClick={() => {
                            banMutation.mutate({
                              userId: report.reported_user_id,
                              reason: `بلاغ: ${report.report_reason || report.message_text.slice(0, 50)}`,
                            })
                            reviewMutation.mutate({ reportId: report.id, status: "reviewed" })
                          }}
                          disabled={banMutation.isPending}
                        >
                          <Ban className="h-3 w-3" />
                          حظر
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => reviewMutation.mutate({ reportId: report.id, status: "reviewed" })}
                          disabled={reviewMutation.isPending}
                        >
                          <Check className="h-3 w-3" />
                          تمت المراجعة
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-muted-foreground"
                          onClick={() => reviewMutation.mutate({ reportId: report.id, status: "dismissed" })}
                          disabled={reviewMutation.isPending}
                        >
                          <X className="h-3 w-3" />
                          تجاهل
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Bans Section ── */}
          {activeSection === "bans" && (
            <div className="p-4 max-h-[500px] overflow-y-auto">
              {bans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <ShieldOff className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  لا يوجد محظورون من الشات حالياً
                </div>
              ) : (
                <div className="space-y-3">
                  {bans.map((ban: ChatBan) => (
                    <div
                      key={ban.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        {ban.user_avatar ? <AvatarImage src={ban.user_avatar} /> : null}
                        <AvatarFallback className="text-xs">
                          {ban.user_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {ban.user_name || ban.user_id.slice(0, 12)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {ban.reason && <span>السبب: {ban.reason}</span>}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {ban.ban_type === "permanent" ? "دائم" : formatBanExpiry(ban.expires_at)}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 shrink-0"
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
