"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, User, LogOut, Settings, AlertTriangle, MapPin, CheckCheck } from "lucide-react"
import { notificationsApi, type AdminAlertItem } from "@/lib/api/notifications"
import { useAuthStore } from "@/lib/stores/auth-store"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "الآن"
  if (mins < 60) return `منذ ${mins} د`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} س`
  const days = Math.floor(hours / 24)
  return `منذ ${days} ي`
}

export function AdminNavbar() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { admin, clearAuth } = useAuthStore()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
    } catch {}
    clearAuth()
    router.replace("/login")
  }

  const { data: alertsData } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: () => notificationsApi.getAlerts(20),
    refetchInterval: 10000,
  })

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markAlertRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-alerts"] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAlertsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-alerts"] }),
  })

  const unreadCount = alertsData?.unread_count ?? 0
  const alerts = alertsData?.items ?? []
  // null = first load not yet seen (avoids false notification on page load)
  const prevUnreadRef = useRef<number | null>(null)

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  // Show browser notification only when unread count *increases* after first load
  useEffect(() => {
    if (!alertsData) return          // query not yet returned
    const prev = prevUnreadRef.current
    if (prev !== null && unreadCount > prev) {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const newest = alerts.find((a) => !a.is_read)
        if (newest) {
          new Notification(newest.title, {
            body: newest.body,
            icon: "/favicon.ico",
            dir: "rtl",
            tag: `admin-alert-${newest.id}`,
          })
        }
      }
    }
    prevUnreadRef.current = unreadCount
  }, [alertsData, unreadCount, alerts])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const handleAlertClick = (alert: AdminAlertItem) => {
    if (!alert.is_read) {
      markReadMutation.mutate(alert.id)
    }
    setOpen(false)
    if (alert.navigate_to) {
      router.push(alert.navigate_to)
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">لوحة التحكم</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications Bell */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="outline"
            size="icon"
            className="relative"
            onClick={() => setOpen(!open)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>

          {open && (
            <div className="absolute left-0 top-12 z-50 w-96 rounded-xl border bg-card shadow-xl" dir="rtl">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-sm font-semibold">الإشعارات</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <CheckCheck className="h-3 w-3" />
                    قراءة الكل
                  </button>
                )}
              </div>

              {/* Alert List */}
              <div className="max-h-80 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Bell className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-xs">لا توجد إشعارات</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <button
                      key={alert.id}
                      onClick={() => handleAlertClick(alert)}
                      className={`w-full text-right flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors border-b last:border-0 ${
                        !alert.is_read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className={`mt-0.5 rounded-lg p-2 shrink-0 ${
                        alert.alert_type === "report"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-blue-500/10 text-blue-500"
                      }`}>
                        {alert.alert_type === "report" ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-tight truncate ${!alert.is_read ? "font-semibold" : ""}`}>
                          {alert.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {alert.body}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatTimeAgo(alert.created_at)}
                        </p>
                      </div>
                      {!alert.is_read && (
                        <div className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="relative h-10 w-10 rounded-full cursor-pointer outline-none"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src="" alt={admin?.display_name || ""} />
              <AvatarFallback>
                {admin?.display_name?.charAt(0) || admin?.email?.charAt(0) || "أ"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{admin?.display_name || "المسؤول"}</p>
                <p className="text-xs text-muted-foreground">{admin?.email}</p>
                <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  admin?.is_fulladmin
                    ? "bg-primary/10 text-primary"
                    : "bg-amber-500/10 text-amber-600"
                }`}>
                  {admin?.is_fulladmin ? "مسؤول كامل" : "مراقب"}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
              <LogOut className="ml-2 h-4 w-4" />
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
