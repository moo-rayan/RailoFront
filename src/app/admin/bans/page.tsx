"use client"

import { useMemo, useState } from "react"
import type { ComponentType } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { dashboardApi } from "@/lib/api/contributors"
import { chatApi, type ChatBan } from "@/lib/api/chat"
import type { BanInfo } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Ban,
  Clock,
  Loader2,
  MapPinned,
  MessageCircle,
  ShieldOff,
  Undo2,
  UserX,
} from "lucide-react"
import { toast } from "sonner"

type BanTab = "contribution" | "chat"

function formatDateTime(value: number | string | null | undefined): string {
  if (!value) return "-"
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatContributionExpiry(expiresAt: number | null): string {
  if (!expiresAt) return "دائم"
  const remaining = expiresAt - Date.now() / 1000
  if (remaining <= 0) return "منتهي"
  if (remaining < 3600) return `${Math.ceil(remaining / 60)} دقيقة`
  if (remaining < 86400) return `${Math.ceil(remaining / 3600)} ساعة`
  return `${Math.ceil(remaining / 86400)} يوم`
}

function formatChatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "دائم"
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return "-"
  const remaining = date.getTime() - Date.now()
  if (remaining <= 0) return "منتهي"
  if (remaining < 3600000) return `${Math.ceil(remaining / 60000)} دقيقة`
  if (remaining < 86400000) return `${Math.ceil(remaining / 3600000)} ساعة`
  return `${Math.ceil(remaining / 86400000)} يوم`
}

function getInitials(name?: string | null, fallback?: string | null): string {
  const value = (name || fallback || "?").trim()
  return value.charAt(0).toUpperCase()
}

function shortId(id: string): string {
  if (!id) return "-"
  return `${id.slice(0, 8)}...${id.slice(-4)}`
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed bg-card/70">
      <CardContent className="flex flex-col items-center justify-center py-14 text-center">
        <div className="mb-3 rounded-full bg-emerald-500/10 p-3 text-emerald-500">
          <ShieldOff className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function LoadingList() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} size="sm">
          <CardContent className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
            <Skeleton className="h-16 w-full rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
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
  value: number
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

function ContributionBanCard({
  ban,
  onUnban,
  isPending,
}: {
  ban: BanInfo
  onUnban: (userId: string) => void
  isPending: boolean
}) {
  const displayName = ban.user_name || "مستخدم محظور"
  const secondary = ban.user_email || shortId(ban.user_id)

  return (
    <Card size="sm" className="bg-card/85">
      <CardContent className="space-y-4 pt-1">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border border-border">
            {ban.user_avatar ? <AvatarImage src={ban.user_avatar} /> : null}
            <AvatarFallback>{getInitials(displayName, ban.user_email || ban.user_id)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <Badge variant="destructive" className="bg-orange-500/15 text-orange-500">
                مساهمة
              </Badge>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">{secondary}</p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/45 p-3">
          <p className="text-xs text-muted-foreground">سبب الحظر</p>
          <p className="mt-1 text-sm font-medium leading-6">{ban.reason || "لم يتم تحديد سبب"}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border bg-background/40 p-2">
            <p className="text-muted-foreground">بدأ في</p>
            <p className="mt-1 font-medium">{formatDateTime(ban.banned_at)}</p>
          </div>
          <div className="rounded-lg border bg-background/40 p-2">
            <p className="text-muted-foreground">ينتهي بعد</p>
            <p className="mt-1 font-medium">{formatContributionExpiry(ban.expires_at)}</p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
          onClick={() => onUnban(ban.user_id)}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
          إلغاء حظر المساهمة
        </Button>
      </CardContent>
    </Card>
  )
}

function ChatBanCard({
  ban,
  onUnban,
  isPending,
}: {
  ban: ChatBan
  onUnban: (userId: string) => void
  isPending: boolean
}) {
  const displayName = ban.user_name || "مستخدم محظور"

  return (
    <Card size="sm" className="bg-card/85">
      <CardContent className="space-y-4 pt-1">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border border-border">
            {ban.user_avatar ? <AvatarImage src={ban.user_avatar} /> : null}
            <AvatarFallback>{getInitials(displayName, ban.user_id)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <Badge className="bg-blue-500/15 text-blue-400 hover:bg-blue-500/15">
                شات
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                {ban.ban_type === "permanent" ? "دائم" : "مؤقت"}
              </Badge>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">{shortId(ban.user_id)}</p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/45 p-3">
          <p className="text-xs text-muted-foreground">سبب الحظر</p>
          <p className="mt-1 text-sm font-medium leading-6">{ban.reason || "لم يتم تحديد سبب"}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border bg-background/40 p-2">
            <p className="text-muted-foreground">بدأ في</p>
            <p className="mt-1 font-medium">{formatDateTime(ban.created_at)}</p>
          </div>
          <div className="rounded-lg border bg-background/40 p-2">
            <p className="text-muted-foreground">ينتهي بعد</p>
            <p className="mt-1 font-medium">{formatChatExpiry(ban.expires_at)}</p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
          onClick={() => onUnban(ban.user_id)}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
          إلغاء حظر الشات
        </Button>
      </CardContent>
    </Card>
  )
}

export default function BansPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<BanTab>("contribution")
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  const contributionQuery = useQuery({
    queryKey: ["contributor-bans"],
    queryFn: dashboardApi.getBans,
  })

  const chatQuery = useQuery({
    queryKey: ["chat-bans", "active"],
    queryFn: () => chatApi.getChatBans(true, 200),
  })

  const contributionBans = contributionQuery.data?.bans ?? []
  const chatBans = chatQuery.data?.bans ?? []

  const permanentCount = useMemo(
    () =>
      contributionBans.filter((ban) => !ban.expires_at).length +
      chatBans.filter((ban) => ban.ban_type === "permanent").length,
    [contributionBans, chatBans],
  )

  const contributionUnbanMutation = useMutation({
    mutationFn: dashboardApi.unbanContributor,
    onMutate: (userId: string) => setPendingUserId(`contribution:${userId}`),
    onSuccess: () => {
      toast.success("تم إلغاء حظر المساهمة")
      queryClient.invalidateQueries({ queryKey: ["contributor-bans"] })
    },
    onError: () => toast.error("فشل إلغاء حظر المساهمة"),
    onSettled: () => setPendingUserId(null),
  })

  const chatUnbanMutation = useMutation({
    mutationFn: chatApi.unbanChatUser,
    onMutate: (userId: string) => setPendingUserId(`chat:${userId}`),
    onSuccess: () => {
      toast.success("تم إلغاء حظر الشات")
      queryClient.invalidateQueries({ queryKey: ["chat-bans"] })
    },
    onError: () => toast.error("فشل إلغاء حظر الشات"),
    onSettled: () => setPendingUserId(null),
  })

  const isLoading = contributionQuery.isLoading || chatQuery.isLoading
  const activeTotal = activeTab === "contribution" ? contributionBans.length : chatBans.length

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-destructive/10 p-2 text-destructive">
              <ShieldOff className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">المحظورين</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            إدارة محظوري المساهمة ومحظوري شات القطار من مكان واحد.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          icon={MapPinned}
          label="محظورون من المساهمة"
          value={contributionBans.length}
          tone="bg-orange-500/10 text-orange-500"
        />
        <StatCard
          icon={MessageCircle}
          label="محظورون من الشات"
          value={chatBans.length}
          tone="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          icon={Ban}
          label="حظر دائم"
          value={permanentCount}
          tone="bg-destructive/10 text-destructive"
        />
      </div>

      <Card>
        <CardHeader className="gap-3 border-b pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-primary" />
              قائمة الحظر النشطة
            </CardTitle>
            <div className="flex w-full rounded-xl bg-muted p-1 lg:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab("contribution")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition lg:flex-none ${
                  activeTab === "contribution"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MapPinned className="h-4 w-4" />
                المساهمة
                <Badge variant="secondary">{contributionBans.length}</Badge>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition lg:flex-none ${
                  activeTab === "chat"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                الشات
                <Badge variant="secondary">{chatBans.length}</Badge>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-4 w-4" />
            يتم عرض الحظر النشط فقط، والإلغاء يطبق فورًا على المستخدم.
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {isLoading ? (
            <LoadingList />
          ) : activeTotal === 0 ? (
            <EmptyState
              title={activeTab === "contribution" ? "لا يوجد محظورون من المساهمة" : "لا يوجد محظورون من الشات"}
              description="عند وجود حظر نشط سيظهر هنا مع سبب الحظر ووقت الانتهاء وزر إلغاء الحظر."
            />
          ) : activeTab === "contribution" ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {contributionBans.map((ban) => (
                <ContributionBanCard
                  key={ban.user_id}
                  ban={ban}
                  onUnban={(userId) => contributionUnbanMutation.mutate(userId)}
                  isPending={pendingUserId === `contribution:${ban.user_id}`}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {chatBans.map((ban) => (
                <ChatBanCard
                  key={ban.id}
                  ban={ban}
                  onUnban={(userId) => chatUnbanMutation.mutate(userId)}
                  isPending={pendingUserId === `chat:${ban.user_id}`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
