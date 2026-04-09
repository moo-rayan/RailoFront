"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getAppConfig, updateAppConfig, type AppConfig } from "@/lib/api/app-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  Shield,
  Download,
  Loader2,
  Save,
  AlertTriangle,
  Smartphone,
  MapPin,
} from "lucide-react"

export default function AppConfigPage() {
  const queryClient = useQueryClient()

  const { data: config, isLoading, error } = useQuery({
    queryKey: ["app-config"],
    queryFn: getAppConfig,
  })

  const [form, setForm] = useState<Partial<AppConfig>>({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (config) {
      setForm(config)
      setHasChanges(false)
    }
  }, [config])

  const updateField = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const mutation = useMutation({
    mutationFn: updateAppConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-config"] })
      setHasChanges(false)
    },
  })

  const handleSave = () => {
    if (!config) return
    // Only send changed fields
    const changed: Partial<AppConfig> = {}
    for (const key of Object.keys(form) as (keyof AppConfig)[]) {
      if (form[key] !== config[key]) {
        (changed as Record<string, unknown>)[key] = form[key]
      }
    }
    if (Object.keys(changed).length > 0) {
      mutation.mutate(changed)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-destructive">فشل في تحميل إعدادات التطبيق</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            إعدادات التطبيق
          </h1>
          <p className="text-muted-foreground mt-1">
            التحكم في وضع الصيانة وإجبار التحديث
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || mutation.isPending}
        >
          {mutation.isPending ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="ml-2 h-4 w-4" />
          )}
          حفظ التغييرات
        </Button>
      </div>

      {/* Status Badges */}
      <div className="flex gap-3">
        <Badge variant={form.is_maintenance_mode ? "destructive" : "secondary"}>
          {form.is_maintenance_mode ? "🔴 وضع الصيانة مفعّل" : "🟢 التطبيق يعمل"}
        </Badge>
        <Badge variant={form.force_update ? "destructive" : "secondary"}>
          {form.force_update ? "🔴 تحديث إجباري مفعّل" : "🟢 لا يوجد تحديث إجباري"}
        </Badge>
      </div>

      {mutation.isSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          ✅ تم حفظ التغييرات بنجاح
        </div>
      )}

      {mutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          ❌ فشل في حفظ التغييرات
        </div>
      )}

      {/* Maintenance Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            وضع الصيانة
          </CardTitle>
          <CardDescription>
            عند تفعيل وضع الصيانة، سيظهر للمستخدمين شاشة صيانة ولن يتمكنوا من استخدام التطبيق
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="maintenance-mode" className="text-base font-medium">
              تفعيل وضع الصيانة
            </Label>
            <Switch
              id="maintenance-mode"
              checked={form.is_maintenance_mode ?? false}
              onCheckedChange={(v) => updateField("is_maintenance_mode", v)}
            />
          </div>
          <hr className="border-border" />
          <div className="space-y-2">
            <Label htmlFor="maintenance-ar">رسالة الصيانة (عربي)</Label>
            <Textarea
              id="maintenance-ar"
              value={form.maintenance_message_ar ?? ""}
              onChange={(e) => updateField("maintenance_message_ar", e.target.value)}
              dir="rtl"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maintenance-en">رسالة الصيانة (إنجليزي)</Label>
            <Textarea
              id="maintenance-en"
              value={form.maintenance_message_en ?? ""}
              onChange={(e) => updateField("maintenance_message_en", e.target.value)}
              dir="ltr"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Force Update */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-500" />
            التحديث الإجباري
          </CardTitle>
          <CardDescription>
            عند التفعيل، سيُمنع المستخدمون الذين لديهم إصدار أقل من الحد الأدنى من استخدام التطبيق حتى يقوموا بالتحديث
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="force-update" className="text-base font-medium">
              تفعيل التحديث الإجباري
            </Label>
            <Switch
              id="force-update"
              checked={form.force_update ?? false}
              onCheckedChange={(v) => updateField("force_update", v)}
            />
          </div>
          <hr className="border-border" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-version">الحد الأدنى للإصدار (min_version)</Label>
              <Input
                id="min-version"
                value={form.min_version ?? ""}
                onChange={(e) => updateField("min_version", e.target.value)}
                placeholder="1.0.0"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                أي إصدار أقل من هذا سيُجبر على التحديث
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="latest-version">أحدث إصدار (latest_version)</Label>
              <Input
                id="latest-version"
                value={form.latest_version ?? ""}
                onChange={(e) => updateField("latest_version", e.target.value)}
                placeholder="1.0.0"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                يظهر للمستخدم في شاشة التحديث
              </p>
            </div>
          </div>
          <hr className="border-border" />
          <div className="space-y-2">
            <Label htmlFor="update-ar">رسالة التحديث (عربي)</Label>
            <Textarea
              id="update-ar"
              value={form.update_message_ar ?? ""}
              onChange={(e) => updateField("update_message_ar", e.target.value)}
              dir="rtl"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="update-en">رسالة التحديث (إنجليزي)</Label>
            <Textarea
              id="update-en"
              value={form.update_message_en ?? ""}
              onChange={(e) => updateField("update_message_en", e.target.value)}
              dir="ltr"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Store URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-500" />
            روابط المتاجر
          </CardTitle>
          <CardDescription>
            روابط التطبيق على متاجر التطبيقات (يظهر زر التحديث للمستخدم)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store-android">رابط Google Play</Label>
            <Input
              id="store-android"
              value={form.store_url_android ?? ""}
              onChange={(e) => updateField("store_url_android", e.target.value)}
              placeholder="https://play.google.com/store/apps/details?id=..."
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-ios">رابط App Store</Label>
            <Input
              id="store-ios"
              value={form.store_url_ios ?? ""}
              onChange={(e) => updateField("store_url_ios", e.target.value)}
              placeholder="https://apps.apple.com/app/..."
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contribution Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            إعدادات المساهمة
          </CardTitle>
          <CardDescription>
            التحكم في شروط المساهمة في تتبع القطارات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="station-schedule-check" className="text-base font-medium">
                فحص الجدول الزمني عند المحطات
              </Label>
              <p className="text-xs text-muted-foreground">
                منع المساهمة إذا كان المستخدم قرب محطة وفات على موعد القطار بأكثر من 4 ساعات
              </p>
            </div>
            <Switch
              id="station-schedule-check"
              checked={form.station_schedule_check_enabled ?? true}
              onCheckedChange={(v) => updateField("station_schedule_check_enabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Version Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
            معلومات سريعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">وضع الصيانة</p>
              <p className="text-lg font-bold mt-1">
                {form.is_maintenance_mode ? "مفعّل 🔴" : "معطّل 🟢"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">تحديث إجباري</p>
              <p className="text-lg font-bold mt-1">
                {form.force_update ? "مفعّل 🔴" : "معطّل 🟢"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">الحد الأدنى</p>
              <p className="text-lg font-bold mt-1">{form.min_version}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">أحدث إصدار</p>
              <p className="text-lg font-bold mt-1">{form.latest_version}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
