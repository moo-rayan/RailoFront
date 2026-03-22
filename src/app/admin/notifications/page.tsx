"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notificationsApi, type NotificationHistoryItem } from "@/lib/api/notifications"
import { Bell, Send, Users, Smartphone, Loader2, CheckCircle2, AlertCircle, Clock, History } from "lucide-react"

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "الآن"
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days < 7) return `منذ ${days} يوم`
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [result, setResult] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const { data: tokenCount, isLoading: isLoadingCount } = useQuery({
    queryKey: ["token-count"],
    queryFn: notificationsApi.getTokenCount,
    refetchInterval: 30000,
  })

  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["notification-history"],
    queryFn: () => notificationsApi.getHistory(50),
    refetchInterval: 15000,
  })

  const sendMutation = useMutation({
    mutationFn: notificationsApi.send,
    onSuccess: (data) => {
      setResult({
        type: "success",
        message: `تم الإرسال بنجاح! ${data.success} نجح، ${data.failure} فشل${data.invalid_removed > 0 ? `، ${data.invalid_removed} توكن غير صالح تم حذفه` : ""}`,
      })
      setTitle("")
      setBody("")
      queryClient.invalidateQueries({ queryKey: ["token-count"] })
      queryClient.invalidateQueries({ queryKey: ["notification-history"] })
    },
    onError: (error: any) => {
      setResult({
        type: "error",
        message: error?.response?.data?.detail || "فشل إرسال الإشعار",
      })
    },
  })

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      setResult({ type: "error", message: "يجب ملء العنوان والنص" })
      return
    }
    setResult(null)
    sendMutation.mutate({ title: title.trim(), body: body.trim() })
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الإشعارات</h1>
          <p className="text-muted-foreground text-sm mt-1">
            إرسال إشعارات فورية لجميع مستخدمي التطبيق
          </p>
        </div>
        <Bell className="h-8 w-8 text-primary" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الأجهزة المسجلة</p>
              <p className="text-2xl font-bold">
                {isLoadingCount ? "..." : tokenCount?.total_tokens ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2.5">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">المستخدمون الفريدون</p>
              <p className="text-2xl font-bold">
                {isLoadingCount ? "..." : tokenCount?.unique_users ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Notification Form */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Send className="h-5 w-5" />
            إرسال إشعار جديد
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                العنوان <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان الإشعار..."
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1 text-left">
                {title.length}/100
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                نص الإشعار <span className="text-destructive">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="محتوى الإشعار..."
                rows={4}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-left">
                {body.length}/500
              </p>
            </div>

            {result && (
              <div
                className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
                  result.type === "success"
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {result.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                {result.message}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sendMutation.isPending || !title.trim() || !body.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  إرسال لجميع المستخدمين ({tokenCount?.total_tokens ?? 0} جهاز)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notification History */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <History className="h-5 w-5" />
            سجل الإشعارات المرسلة
            {history && (
              <span className="text-xs font-normal text-muted-foreground mr-auto">
                ({history.total} إجمالي)
              </span>
            )}
          </h2>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !history?.items?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">لم يتم إرسال أي إشعارات بعد</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {history.items.map((item: NotificationHistoryItem) => (
                <div
                  key={item.id}
                  className="rounded-lg border bg-background p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {item.body}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(item.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {item.sent_by}
                    </span>
                    <span className="flex items-center gap-1">
                      <Smartphone className="h-3 w-3" />
                      {item.total_tokens} جهاز
                    </span>
                    <span className="text-green-600 dark:text-green-400">
                      ✓ {item.success_count}
                    </span>
                    {item.failure_count > 0 && (
                      <span className="text-destructive">
                        ✗ {item.failure_count}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
