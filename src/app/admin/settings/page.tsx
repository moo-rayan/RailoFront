"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { dataBundleApi, BundleRebuildResult } from "@/lib/api/data-bundle"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Cloud,
  MapPin,
  Train,
  Route,
  Map,
  Loader2,
  AlertTriangle,
} from "lucide-react"

export default function SettingsPage() {
  const [rebuildResult, setRebuildResult] = useState<BundleRebuildResult | null>(null)

  const { data: versionInfo, isLoading: versionLoading } = useQuery({
    queryKey: ["bundle-version"],
    queryFn: () => dataBundleApi.getVersion(),
    refetchInterval: 60_000,
  })

  const rebuildMutation = useMutation({
    mutationFn: () => dataBundleApi.rebuild(),
    onSuccess: (data) => {
      setRebuildResult(data)
    },
  })

  const stats = versionInfo
    ? [
        { label: "المحطات", value: versionInfo.stations_count, icon: MapPin },
        { label: "الرحلات", value: versionInfo.trips_count, icon: Route },
        { label: "القطارات", value: versionInfo.trains_count, icon: Train },
        { label: "مسارات الخريطة", value: versionInfo.trip_paths_count, icon: Map },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground mt-2">
          إدارة إعدادات النظام والتفضيلات
        </p>
      </div>

      {/* Data Bundle Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            حزمة البيانات (Data Bundle)
          </CardTitle>
          <CardDescription>
            حزمة البيانات المشفرة التي يتم تحميلها من التطبيق. عند تعديل المحطات أو
            القطارات أو الرحلات، يجب إعادة بناء الحزمة حتى تظهر التغييرات للمستخدمين.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Current Version */}
          {versionLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري التحميل...
            </div>
          ) : versionInfo ? (
            <>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">
                  v{versionInfo.version.slice(0, 8)}
                </Badge>
                <span className="text-sm text-muted-foreground">الإصدار الحالي</span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-2.5 rounded-lg border p-3 bg-muted/30"
                  >
                    <s.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-lg font-bold leading-none">{s.value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              حزمة البيانات غير جاهزة — قد يكون السيرفر يعمل على بنائها
            </div>
          )}

          {/* Rebuild Button */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={() => rebuildMutation.mutate()}
              disabled={rebuildMutation.isPending}
              size="lg"
            >
              {rebuildMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <RefreshCw className="h-4 w-4 ml-2" />
              )}
              {rebuildMutation.isPending ? "جاري إعادة البناء..." : "إعادة بناء الحزمة"}
            </Button>
            {rebuildMutation.isPending && (
              <span className="text-sm text-muted-foreground">
                قد يستغرق هذا بضع ثوانٍ...
              </span>
            )}
          </div>

          {/* Rebuild Result */}
          {rebuildResult && !rebuildMutation.isPending && (
            <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                تم إعادة بناء الحزمة بنجاح
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">الإصدار القديم: </span>
                  <span className="font-mono">{rebuildResult.old_version}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">الإصدار الجديد: </span>
                  <span className="font-mono">{rebuildResult.version.slice(0, 8)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">الحجم: </span>
                  <span className="font-mono">{rebuildResult.size_kb} KB</span>
                </div>
                <div>
                  <span className="text-muted-foreground">المحطات: </span>
                  <span className="font-bold">{rebuildResult.stations_count}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">الرحلات: </span>
                  <span className="font-bold">{rebuildResult.trips_count}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">R2: </span>
                  {rebuildResult.r2_uploaded ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {rebuildMutation.isError && (
            <div className="rounded-lg border border-destructive/30 bg-red-50 dark:bg-red-950/20 p-4">
              <div className="flex items-center gap-2 text-destructive font-medium">
                <XCircle className="h-4 w-4" />
                فشل إعادة بناء الحزمة
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {rebuildMutation.error instanceof Error
                  ? rebuildMutation.error.message
                  : "خطأ غير معروف"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
