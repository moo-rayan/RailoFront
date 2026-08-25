"use client"

import { useEffect, useRef, useState } from "react"
import type { ComponentType } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Ban,
  Check,
  Clock,
  Flag,
  Heart,
  Loader2,
  MessageCircle,
  Reply,
  Send,
  Shield,
  ShieldOff,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react"

import { chatApi, type ChatBan, type ChatMessage, type ChatReport } from "@/lib/api/chat"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type Section = "chat" | "reports" | "bans"

function messageText(message: ChatMessage) {
  return message.admin_text ?? message.text
}

function formatTime(value: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("ar-EG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatShortTime(value: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
}

function shortId(id: string) {
  if (!id) return "-"
  return `${id.slice(0, 8)}...${id.slice(-4)}`
}

function initials(name?: string | null, fallback?: string | null) {
  const value = (name || fallback || "?").trim()
  return value.charAt(0).toUpperCase()
}

function mergeMessages(previous: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map<string, ChatMessage>()
  for (const message of previous) byId.set(message.id, message)
  for (const message of incoming) byId.set(message.id, message)
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string | number
  tone: string
}) {
  return (
    <Card size="sm" className="bg-card/80">
      <CardContent className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}

function MessageCard({
  message,
  onReply,
  onDelete,
  onBan,
  deleting,
  banning,
}: {
  message: ChatMessage
  onReply: (message: ChatMessage) => void
  onDelete: (messageId: string) => void
  onBan: (message: ChatMessage) => void
  deleting: boolean
  banning: boolean
}) {
  const isAdmin = message.is_admin || message.type === "admin"
  return (
    <div className="rounded-xl border bg-background/55 p-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 border">
          {message.user_avatar ? <AvatarImage src={message.user_avatar} /> : null}
          <AvatarFallback>{initials(message.user_name, message.user_id)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold">{message.user_name || "مجهول"}</p>
            {isAdmin ? (
              <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/15">
                إدارة
              </Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">{formatShortTime(message.timestamp)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{shortId(message.user_id)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onReply(message)} title="رد">
            <Reply className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(message.id)}
            disabled={deleting}
            title="حذف"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-500" />}
          </Button>
          {!isAdmin ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onBan(message)}
              disabled={banning}
              title="حظر"
            >
              {banning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4 text-orange-500" />}
            </Button>
          ) : null}
        </div>
      </div>

      {message.reply_to_text ? (
        <div className="mt-3 rounded-lg border-r-4 border-primary bg-primary/10 p-2">
          <p className="text-xs font-bold text-primary">{message.reply_to_user_name || "رسالة"}</p>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{message.reply_to_text}</p>
        </div>
      ) : null}

      <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{messageText(message)}</p>
      {(message.love_count ?? 0) > 0 ? (
        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-rose-500">
          <Heart className="h-4 w-4 fill-current" />
          {message.love_count}
        </div>
      ) : null}
    </div>
  )
}

function ReportCard({
  report,
  onBan,
}: {
  report: ChatReport
  onBan: (userId: string, userName: string, reason: string) => void
}) {
  return (
    <Card size="sm" className="bg-card/85">
      <CardContent className="space-y-4 pt-1">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border">
            {report.reported_user_avatar ? <AvatarImage src={report.reported_user_avatar} /> : null}
            <AvatarFallback>{initials(report.reported_user_name, report.reported_user_id)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold">{report.reported_user_name || "مستخدم"}</p>
              <Badge variant="destructive" className="bg-red-500/15 text-red-500">
                بلاغ
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{formatTime(report.created_at)}</p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/45 p-3">
          <p className="text-xs text-muted-foreground">الرسالة</p>
          <p className="mt-1 text-sm font-medium leading-6">{report.message_text}</p>
        </div>

        <div className="rounded-lg bg-orange-500/10 p-3">
          <p className="text-xs text-muted-foreground">سبب البلاغ</p>
          <p className="mt-1 text-sm font-semibold">{report.report_reason || "لم يتم تحديد سبب"}</p>
        </div>

        <Button
          variant="outline"
          className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10"
          onClick={() => onBan(report.reported_user_id, report.reported_user_name, report.report_reason)}
        >
          <Ban className="h-4 w-4" />
          حظر المستخدم
        </Button>
      </CardContent>
    </Card>
  )
}

function BanCard({
  ban,
  onUnban,
  pending,
}: {
  ban: ChatBan
  onUnban: (userId: string) => void
  pending: boolean
}) {
  return (
    <Card size="sm" className="bg-card/85">
      <CardContent className="space-y-4 pt-1">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border">
            {ban.user_avatar ? <AvatarImage src={ban.user_avatar} /> : null}
            <AvatarFallback>{initials(ban.user_name, ban.user_id)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{ban.user_name || "مستخدم محظور"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{shortId(ban.user_id)}</p>
          </div>
          <Badge variant={ban.ban_type === "permanent" ? "destructive" : "outline"}>
            {ban.ban_type === "permanent" ? "دائم" : "مؤقت"}
          </Badge>
        </div>

        <div className="rounded-lg bg-muted/45 p-3">
          <p className="text-xs text-muted-foreground">سبب الحظر</p>
          <p className="mt-1 text-sm font-medium leading-6">{ban.reason || "لم يتم تحديد سبب"}</p>
        </div>

        <Button
          variant="outline"
          className="w-full border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
          onClick={() => onUnban(ban.user_id)}
          disabled={pending}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
          إلغاء الحظر
        </Button>
      </CardContent>
    </Card>
  )
}

export default function GlobalChatAdminPage() {
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const [activeSection, setActiveSection] = useState<Section>("chat")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [chatEnabled, setChatEnabled] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [adminInput, setAdminInput] = useState("")
  const [adminRole, setAdminRole] = useState<"مشرف" | "مسؤول">("مشرف")
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null)
  const [banTarget, setBanTarget] = useState<ChatMessage | null>(null)
  const [banReason, setBanReason] = useState("مخالفة قواعد الشات")
  const [banType, setBanType] = useState<"temporary" | "permanent">("temporary")
  const [pendingBanUserId, setPendingBanUserId] = useState<string | null>(null)

  const { data: pollData } = useQuery({
    queryKey: ["global-chat-messages"],
    queryFn: () => chatApi.getGlobalMessages(80),
    refetchInterval: wsConnected ? 15000 : 5000,
    enabled: activeSection === "chat",
  })

  const { data: statusData } = useQuery({
    queryKey: ["global-chat-status"],
    queryFn: chatApi.getGlobalStatus,
    refetchInterval: 10000,
  })

  const { data: reportsData } = useQuery({
    queryKey: ["global-chat-reports"],
    queryFn: () => chatApi.getGlobalReports("pending", 50),
    refetchInterval: 10000,
    enabled: activeSection === "reports",
  })

  const { data: bansData } = useQuery({
    queryKey: ["chat-bans-global-admin"],
    queryFn: () => chatApi.getChatBans(true, 80),
    refetchInterval: 15000,
    enabled: activeSection === "bans",
  })

  useEffect(() => {
    if (!pollData) return
    const timer = window.setTimeout(() => {
      setMessages(prev => mergeMessages(prev, pollData.messages || []))
      setChatEnabled(pollData.chat_enabled)
      setOnlineUsers(pollData.online_users)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [pollData])

  useEffect(() => {
    if (!statusData) return
    const timer = window.setTimeout(() => {
      setChatEnabled(statusData.chat_enabled)
      setOnlineUsers(statusData.online_users)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [statusData])

  useEffect(() => {
    let closedByUnmount = false

    const connectWs = () => {
      if (closedByUnmount || wsRef.current?.readyState === WebSocket.OPEN) return
      const ws = new WebSocket(chatApi.getGlobalAdminWsUrl())
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0
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
            setMessages(prev => mergeMessages(prev, [data.data]))
          } else if (data.type === "message_deleted") {
            setMessages(prev => prev.filter(message => message.id !== data.data.message_id))
            setReplyToMessage(prev => prev?.id === data.data.message_id ? null : prev)
          } else if (data.type === "chat_cleared") {
            setMessages([])
            setReplyToMessage(null)
          } else if (data.type === "status_changed") {
            setChatEnabled(data.data.chat_enabled ?? true)
          } else if (data.type === "message_reaction") {
            setMessages(prev => prev.map(message => {
              if (message.id !== data.data.message_id) return message
              return { ...message, love_count: data.data.love_count ?? message.love_count }
            }))
          }
        } catch {
          // Ignore malformed WS events.
        }
      }

      ws.onclose = () => {
        setWsConnected(false)
        if (closedByUnmount || reconnectAttemptsRef.current >= 8) return
        reconnectAttemptsRef.current += 1
        const delay = Math.min(3000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000)
        reconnectTimerRef.current = setTimeout(connectWs, delay)
      }

      ws.onerror = () => ws.close()

      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }))
        }
      }, 25000)

      const originalClose = ws.onclose
      ws.onclose = (event) => {
        clearInterval(pingInterval)
        originalClose?.call(ws, event)
      }
    }

    connectWs()
    return () => {
      closedByUnmount = true
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [])

  useEffect(() => {
    if (activeSection === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages.length, activeSection])

  const sendMutation = useMutation({
    mutationFn: () => chatApi.sendGlobalAdminMessage(adminInput.trim(), adminRole, replyToMessage),
    onSuccess: (data) => {
      if (data.message) setMessages(prev => mergeMessages(prev, [data.message!]))
      setAdminInput("")
      setReplyToMessage(null)
      toast.success("تم إرسال الرسالة")
    },
    onError: () => toast.error("تعذر إرسال الرسالة"),
  })

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => chatApi.toggleGlobalChat(enabled),
    onSuccess: (_, enabled) => {
      setChatEnabled(enabled)
      queryClient.invalidateQueries({ queryKey: ["global-chat-status"] })
      toast.success(enabled ? "تم تشغيل الشات" : "تم إيقاف الشات")
    },
    onError: () => toast.error("تعذر تحديث حالة الشات"),
  })

  const deleteMutation = useMutation({
    mutationFn: chatApi.deleteGlobalMessage,
    onSuccess: (_, messageId) => {
      setMessages(prev => prev.filter(message => message.id !== messageId))
      toast.success("تم حذف الرسالة")
    },
    onError: () => toast.error("تعذر حذف الرسالة"),
  })

  const clearMutation = useMutation({
    mutationFn: chatApi.clearGlobalChat,
    onSuccess: () => {
      setMessages([])
      toast.success("تم مسح الشات")
    },
    onError: () => toast.error("تعذر مسح الشات"),
  })

  const banMutation = useMutation({
    mutationFn: ({ userId, reason, type }: { userId: string; reason: string; type: string }) =>
      chatApi.banGlobalChatUser(userId, reason, type, 24),
    onMutate: ({ userId }) => setPendingBanUserId(userId),
    onSuccess: () => {
      setBanTarget(null)
      queryClient.invalidateQueries({ queryKey: ["chat-bans-global-admin"] })
      toast.success("تم حظر المستخدم")
    },
    onError: () => toast.error("تعذر حظر المستخدم"),
    onSettled: () => setPendingBanUserId(null),
  })

  const unbanMutation = useMutation({
    mutationFn: chatApi.unbanChatUser,
    onMutate: (userId) => setPendingBanUserId(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-bans-global-admin"] })
      toast.success("تم إلغاء الحظر")
    },
    onError: () => toast.error("تعذر إلغاء الحظر"),
    onSettled: () => setPendingBanUserId(null),
  })

  const reports = reportsData?.reports ?? []
  const bans = bansData?.bans ?? []

  const handleSend = () => {
    if (!adminInput.trim() || sendMutation.isPending) return
    sendMutation.mutate()
  }

  const handleBanTarget = (message: ChatMessage) => {
    setBanTarget(message)
    setBanReason("مخالفة قواعد الشات")
  }

  return (
    <div dir="rtl" className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">الشات الجماعي</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            إدارة الغرفة العامة، الرسائل، البلاغات، والحظر.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={wsConnected ? "default" : "outline"} className="gap-2 px-3 py-1.5">
            {wsConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {wsConnected ? "متصل مباشر" : "غير متصل"}
          </Badge>
          <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
            <span className="text-sm font-semibold">{chatEnabled ? "الشات مفعل" : "الشات متوقف"}</span>
            <Switch
              checked={chatEnabled}
              onCheckedChange={(checked) => toggleMutation.mutate(checked)}
              disabled={toggleMutation.isPending}
            />
          </div>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("هل تريد مسح كل رسائل الشات الجماعي؟")) clearMutation.mutate()
            }}
            disabled={clearMutation.isPending}
          >
            {clearMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            مسح الشات
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={MessageCircle} label="الرسائل" value={statusData?.message_count ?? messages.length} tone="bg-blue-500/15 text-blue-500" />
        <StatCard icon={Users} label="المتصلون الآن" value={onlineUsers} tone="bg-emerald-500/15 text-emerald-500" />
        <StatCard icon={Flag} label="بلاغات معلقة" value={reportsData?.total ?? 0} tone="bg-orange-500/15 text-orange-500" />
        <StatCard icon={ShieldOff} label="محظورون نشطون" value={bansData?.total ?? 0} tone="bg-red-500/15 text-red-500" />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "chat" as const, label: "المحادثة", icon: MessageCircle },
          { key: "reports" as const, label: "البلاغات", icon: Flag },
          { key: "bans" as const, label: "المحظورين", icon: ShieldOff },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeSection === key ? "default" : "outline"}
            onClick={() => setActiveSection(key)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {activeSection === "chat" ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              المحادثة المباشرة
            </CardTitle>
            <Badge variant={chatEnabled ? "default" : "destructive"}>
              {chatEnabled ? "مفتوح" : "متوقف"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[58vh] min-h-[360px] space-y-3 overflow-y-auto rounded-2xl border bg-muted/20 p-4">
              {messages.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                  <MessageCircle className="mb-3 h-10 w-10" />
                  <p className="text-sm font-semibold">لا توجد رسائل حتى الآن</p>
                </div>
              ) : (
                messages.map(message => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onReply={setReplyToMessage}
                    onDelete={(messageId) => deleteMutation.mutate(messageId)}
                    onBan={handleBanTarget}
                    deleting={deleteMutation.isPending}
                    banning={pendingBanUserId === message.user_id}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {replyToMessage ? (
              <div className="flex items-center gap-3 rounded-xl border-r-4 border-primary bg-primary/10 p-3">
                <Reply className="h-4 w-4 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-primary">رد على {replyToMessage.user_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{messageText(replyToMessage)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setReplyToMessage(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-[160px_1fr_auto]">
              <Select value={adminRole} onValueChange={(value) => setAdminRole(value as "مشرف" | "مسؤول")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="مشرف">مشرف</SelectItem>
                  <SelectItem value="مسؤول">مسؤول</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={adminInput}
                maxLength={150}
                onChange={(event) => setAdminInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) handleSend()
                }}
                placeholder="اكتب رسالة إدارية..."
              />
              <Button onClick={handleSend} disabled={!adminInput.trim() || sendMutation.isPending}>
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                إرسال
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "reports" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.length === 0 ? (
            <Card className="col-span-full border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
                <Check className="mb-3 h-10 w-10 text-emerald-500" />
                <p className="font-semibold">لا توجد بلاغات معلقة</p>
              </CardContent>
            </Card>
          ) : (
            reports.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                onBan={(userId, userName, reason) => {
                  setBanTarget({
                    id: "",
                    user_id: userId,
                    user_name: userName,
                    user_avatar: "",
                    text: "",
                    type: "normal",
                    is_pinned: false,
                    timestamp: new Date().toISOString(),
                  })
                  setBanReason(reason || "بلاغ على رسالة في الشات الجماعي")
                }}
              />
            ))
          )}
        </div>
      ) : null}

      {activeSection === "bans" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bans.length === 0 ? (
            <Card className="col-span-full border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
                <Shield className="mb-3 h-10 w-10 text-emerald-500" />
                <p className="font-semibold">لا يوجد مستخدمون محظورون من الشات</p>
              </CardContent>
            </Card>
          ) : (
            bans.map(ban => (
              <BanCard
                key={ban.id}
                ban={ban}
                onUnban={(userId) => unbanMutation.mutate(userId)}
                pending={pendingBanUserId === ban.user_id}
              />
            ))
          )}
        </div>
      ) : null}

      {banTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-red-500" />
                حظر مستخدم من الشات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-sm font-bold">{banTarget.user_name || "مستخدم"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{shortId(banTarget.user_id)}</p>
              </div>
              <Textarea
                value={banReason}
                onChange={(event) => setBanReason(event.target.value)}
                placeholder="سبب الحظر"
                rows={3}
              />
              <Select value={banType} onValueChange={(value) => setBanType(value as "temporary" | "permanent")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temporary">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      مؤقت 24 ساعة
                    </div>
                  </SelectItem>
                  <SelectItem value="permanent">
                    <div className="flex items-center gap-2">
                      <ShieldOff className="h-4 w-4" />
                      دائم
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBanTarget(null)}>
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
                  disabled={banMutation.isPending || !banTarget.user_id}
                  onClick={() => banMutation.mutate({
                    userId: banTarget.user_id,
                    reason: banReason,
                    type: banType,
                  })}
                >
                  {banMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  حظر
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
