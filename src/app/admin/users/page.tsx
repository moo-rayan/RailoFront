"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usersApi } from "@/lib/api/users"
import type { UserProfile, UsersListParams } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Search,
  Ban,
  ShieldCheck,
  Crown,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  AlertTriangle,
  Clock,
  Star,
  Filter,
  X,
} from "lucide-react"
import { toast } from "sonner"

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "-"
  return new Date(iso).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatBanExpiry(expiresAt: number | null): string {
  if (!expiresAt) return "دائم"
  const remaining = expiresAt - Date.now() / 1000
  if (remaining <= 0) return "منتهي"
  if (remaining < 3600) return `${Math.ceil(remaining / 60)} دقيقة`
  if (remaining < 86400) return `${Math.ceil(remaining / 3600)} ساعة`
  return `${Math.ceil(remaining / 86400)} يوم`
}

function getInitials(name: string | null, email: string | null): string {
  if (name) return name.charAt(0).toUpperCase()
  if (email) return email.charAt(0).toUpperCase()
  return "?"
}

// ── Ban Dialog Component ─────────────────────────────────────────────────────

function BanUserDialog({
  user,
  open,
  onClose,
}: {
  user: UserProfile | null
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState("")
  const [duration, setDuration] = useState("0")

  const banMutation = useMutation({
    mutationFn: () =>
      usersApi.ban(user!.id, reason, parseInt(duration)),
    onSuccess: () => {
      toast.success("تم حظر المستخدم بنجاح")
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      onClose()
      setReason("")
      setDuration("0")
    },
    onError: () => {
      toast.error("فشل حظر المستخدم")
    },
  })

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            حظر المستخدم
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>{getInitials(user.display_name, user.email)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{user.display_name || "بدون اسم"}</p>
              <p className="text-xs text-muted-foreground">{user.email || "بدون بريد"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">سبب الحظر</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب سبب الحظر..."
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">مدة الحظر</label>
            <Select value={duration} onValueChange={(v) => v && setDuration(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">دائم</SelectItem>
                <SelectItem value="30">30 دقيقة</SelectItem>
                <SelectItem value="60">ساعة</SelectItem>
                <SelectItem value="360">6 ساعات</SelectItem>
                <SelectItem value="1440">يوم واحد</SelectItem>
                <SelectItem value="4320">3 أيام</SelectItem>
                <SelectItem value="10080">أسبوع</SelectItem>
                <SelectItem value="43200">شهر</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose>
            <Button variant="outline">إلغاء</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => banMutation.mutate()}
            disabled={banMutation.isPending}
          >
            {banMutation.isPending ? "جاري الحظر..." : "حظر"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── User Detail Dialog ───────────────────────────────────────────────────────

function UserDetailDialog({
  user,
  open,
  onClose,
  onBan,
  onUnban,
  onToggleCaptain,
}: {
  user: UserProfile | null
  open: boolean
  onClose: () => void
  onBan: (user: UserProfile) => void
  onUnban: (userId: string) => void
  onToggleCaptain: (userId: string, isCaptain: boolean) => void
}) {
  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>تفاصيل المستخدم</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Profile header */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="text-lg">{getInitials(user.display_name, user.email)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{user.display_name || "بدون اسم"}</h3>
              <p className="text-sm text-muted-foreground truncate">{user.email || "بدون بريد"}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {user.is_admin && (
                  <Badge variant="default" className="text-[10px]">
                    {user.admin_level === "fulladmin" ? "مسؤول كامل" : "مراقب"}
                  </Badge>
                )}
                {user.is_captain && (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                    كابتن
                  </Badge>
                )}
                {user.is_contributor && (
                  <Badge variant="secondary" className="text-[10px]">مساهم</Badge>
                )}
                {user.is_banned && (
                  <Badge variant="destructive" className="text-[10px]">محظور</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{user.contribution_count}</p>
              <p className="text-[11px] text-muted-foreground">المساهمات</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{user.reputation_score.toFixed(1)}</p>
              <p className="text-[11px] text-muted-foreground">السمعة</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{formatDate(user.created_at)}</p>
              <p className="text-[11px] text-muted-foreground">تاريخ الانضمام</p>
            </div>
          </div>

          {/* Ban info */}
          {user.is_banned && user.ban_info && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">هذا المستخدم محظور</span>
              </div>
              <div className="text-xs space-y-1 text-muted-foreground">
                {user.ban_info.reason && <p>السبب: {user.ban_info.reason}</p>}
                <p>المدة المتبقية: {formatBanExpiry(user.ban_info.expires_at)}</p>
              </div>
            </div>
          )}

          {/* Info grid */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-muted-foreground">المعرف</span>
              <span className="font-mono text-xs">{user.id.slice(0, 12)}...</span>
            </div>
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-muted-foreground">آخر مساهمة</span>
              <span>{formatDate(user.last_contribution_at)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-muted-foreground">آخر تحديث</span>
              <span>{formatDate(user.updated_at)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {user.is_banned ? (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { onUnban(user.id); onClose() }}
              >
                <ShieldCheck className="h-4 w-4 ml-2" />
                إلغاء الحظر
              </Button>
            ) : (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => { onBan(user); onClose() }}
              >
                <Ban className="h-4 w-4 ml-2" />
                حظر
              </Button>
            )}
            <Button
              variant={user.is_captain ? "secondary" : "outline"}
              className="flex-1"
              onClick={() => { onToggleCaptain(user.id, !user.is_captain); onClose() }}
            >
              <Crown className="h-4 w-4 ml-2" />
              {user.is_captain ? "إزالة الكابتن" : "ترقية لكابتن"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useState<UsersListParams>({
    page: 1,
    limit: 20,
    search: "",
    sort_by: "created_at",
    sort_order: "desc",
  })
  const [searchInput, setSearchInput] = useState("")
  const [banDialog, setBanDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null })
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null })
  const [activeFilter, setActiveFilter] = useState<string>("all")

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", params],
    queryFn: () => usersApi.list(params),
    staleTime: 30_000,
  })

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => usersApi.unban(userId),
    onSuccess: () => {
      toast.success("تم إلغاء حظر المستخدم")
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
    },
    onError: () => toast.error("فشل إلغاء الحظر"),
  })

  const captainMutation = useMutation({
    mutationFn: ({ userId, isCaptain }: { userId: string; isCaptain: boolean }) =>
      usersApi.toggleCaptain(userId, isCaptain),
    onSuccess: (_, vars) => {
      toast.success(vars.isCaptain ? "تم ترقية المستخدم لكابتن" : "تمت إزالة رتبة الكابتن")
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
    },
    onError: () => toast.error("فشلت العملية"),
  })

  const handleSearch = () => {
    setParams((p) => ({ ...p, page: 1, search: searchInput }))
  }

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    const newParams: UsersListParams = { ...params, page: 1, filter_contributors: undefined, filter_captains: undefined, filter_admins: undefined }
    if (filter === "contributors") newParams.filter_contributors = true
    if (filter === "captains") newParams.filter_captains = true
    if (filter === "admins") newParams.filter_admins = true
    setParams(newParams)
  }

  const users = data?.users ?? []
  const total = data?.total ?? 0
  const totalPages = data?.total_pages ?? 0

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            المستخدمين
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            إجمالي {total} مستخدم مسجل
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="بحث بالاسم أو البريد..."
                  className="pr-9"
                  dir="rtl"
                />
              </div>
              <Button onClick={handleSearch} variant="secondary" size="sm" className="h-10">
                بحث
              </Button>
              {params.search && (
                <Button
                  onClick={() => { setSearchInput(""); setParams((p) => ({ ...p, page: 1, search: "" })) }}
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Filter buttons */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { key: "all", label: "الكل", icon: Users },
                { key: "contributors", label: "المساهمين", icon: UserCheck },
                { key: "captains", label: "الكباتن", icon: Crown },
                { key: "admins", label: "المسؤولين", icon: ShieldCheck },
              ].map((f) => (
                <Button
                  key={f.key}
                  variant={activeFilter === f.key ? "default" : "outline"}
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={() => handleFilterChange(f.key)}
                >
                  <f.icon className="h-3.5 w-3.5" />
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-30" />
              <p>لا يوجد مستخدمين</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-right p-3 font-medium">المستخدم</th>
                    <th className="text-center p-3 font-medium hidden md:table-cell">الدور</th>
                    <th className="text-center p-3 font-medium hidden lg:table-cell">المساهمات</th>
                    <th className="text-center p-3 font-medium hidden lg:table-cell">السمعة</th>
                    <th className="text-center p-3 font-medium hidden sm:table-cell">الانضمام</th>
                    <th className="text-center p-3 font-medium">الحالة</th>
                    <th className="text-center p-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => setDetailDialog({ open: true, user })}
                    >
                      {/* User info */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.display_name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px]">
                              {user.display_name || "بدون اسم"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {user.email || "بدون بريد"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role badges */}
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex justify-center gap-1 flex-wrap">
                          {user.is_admin && (
                            <Badge variant="default" className="text-[10px]">
                              {user.admin_level === "fulladmin" ? "مسؤول" : "مراقب"}
                            </Badge>
                          )}
                          {user.is_captain && (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                              كابتن
                            </Badge>
                          )}
                          {user.is_contributor && !user.is_captain && (
                            <Badge variant="secondary" className="text-[10px]">مساهم</Badge>
                          )}
                          {!user.is_admin && !user.is_captain && !user.is_contributor && (
                            <span className="text-xs text-muted-foreground">مستخدم</span>
                          )}
                        </div>
                      </td>

                      {/* Contribution count */}
                      <td className="p-3 text-center hidden lg:table-cell">
                        <span className="font-mono">{user.contribution_count}</span>
                      </td>

                      {/* Reputation */}
                      <td className="p-3 text-center hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-3 w-3 text-amber-500" />
                          <span className="font-mono">{user.reputation_score.toFixed(1)}</span>
                        </div>
                      </td>

                      {/* Join date */}
                      <td className="p-3 text-center hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">{formatDate(user.created_at)}</span>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        {user.is_banned ? (
                          <Badge variant="destructive" className="text-[10px]">محظور</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">نشط</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-1">
                          {user.is_banned ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs gap-1"
                              onClick={() => unbanMutation.mutate(user.id)}
                              disabled={unbanMutation.isPending}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              إلغاء الحظر
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs gap-1 text-destructive hover:text-destructive"
                              onClick={() => setBanDialog({ open: true, user })}
                            >
                              <Ban className="h-3.5 w-3.5" />
                              حظر
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-xs text-muted-foreground">
                صفحة {params.page} من {totalPages} — إجمالي {total}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={params.page === 1}
                  onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) - 1 }))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={params.page === totalPages}
                  onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) + 1 }))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ban Dialog */}
      <BanUserDialog
        user={banDialog.user}
        open={banDialog.open}
        onClose={() => setBanDialog({ open: false, user: null })}
      />

      {/* Detail Dialog */}
      <UserDetailDialog
        user={detailDialog.user}
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, user: null })}
        onBan={(user) => setBanDialog({ open: true, user })}
        onUnban={(userId) => unbanMutation.mutate(userId)}
        onToggleCaptain={(userId, isCaptain) => captainMutation.mutate({ userId, isCaptain })}
      />
    </div>
  )
}
