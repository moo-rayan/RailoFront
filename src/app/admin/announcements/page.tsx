"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  announcementsApi,
  defaultAnnouncementInput,
  type AnnouncementInput,
  type AppAnnouncement,
} from "@/lib/api/announcements"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  ExternalLink,
  ImageIcon,
  Loader2,
  Megaphone,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react"

function toLocalInput(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => `${n}`.padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalInput(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizeInput(input: AnnouncementInput): AnnouncementInput {
  return {
    ...input,
    version: Number(input.version) || 1,
    priority: Number(input.priority) || 0,
    width_ratio: Math.min(1, Math.max(0.1, Number(input.width_ratio) || 0.92)),
    max_height_ratio: Math.min(1, Math.max(0.2, Number(input.max_height_ratio) || 0.82)),
    image_url: input.image_url?.trim() || null,
    action_url: input.action_url.trim(),
    display_mode: input.display_mode,
    image_fit: input.image_fit,
  }
}

function toInput(item: AppAnnouncement): AnnouncementInput {
  return {
    version: item.version,
    is_active: item.is_active,
    priority: item.priority,
    title_ar: item.title_ar,
    title_en: item.title_en,
    body_ar: item.body_ar,
    body_en: item.body_en,
    image_url: item.image_url,
    display_mode: item.display_mode,
    width_ratio: item.width_ratio,
    max_height_ratio: item.max_height_ratio,
    image_fit: item.image_fit,
    show_action_button: item.show_action_button,
    action_text_ar: item.action_text_ar,
    action_text_en: item.action_text_en,
    action_url: item.action_url,
    show_dismiss_button: item.show_dismiss_button,
    dismiss_text_ar: item.dismiss_text_ar,
    dismiss_text_en: item.dismiss_text_en,
    dismissible: item.dismissible,
    start_at: item.start_at,
    end_at: item.end_at,
  }
}

export default function AnnouncementsPage() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<AnnouncementInput>(defaultAnnouncementInput)
  const [uploading, setUploading] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ["announcements"],
    queryFn: announcementsApi.list,
  })

  const activeItem = useMemo(
    () => data?.items.find((item) => item.is_active) ?? null,
    [data],
  )

  const saveMutation = useMutation({
    mutationFn: (input: AnnouncementInput) => {
      const payload = normalizeInput(input)
      return editingId
        ? announcementsApi.update(editingId, payload)
        : announcementsApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: announcementsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] })
      setEditingId(null)
      setForm(defaultAnnouncementInput)
    },
  })

  useEffect(() => {
    if (!editingId) return
    const selected = data?.items.find((item) => item.id === editingId)
    if (selected) setForm(toInput(selected))
  }, [data, editingId])

  const updateField = <K extends keyof AnnouncementInput>(
    key: K,
    value: AnnouncementInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const resetForm = () => {
    setEditingId(null)
    setForm({ ...defaultAnnouncementInput })
  }

  const handleUpload = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const url = await announcementsApi.uploadImage(file)
      updateField("image_url", url)
    } finally {
      setUploading(false)
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
        <p className="text-destructive">فشل تحميل إعلانات التطبيق</p>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Megaphone className="h-6 w-6 text-primary" />
            إعلانات التطبيق
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            تحكم كامل في الإعلان الذي يظهر للمستخدم عند فتح التطبيق.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={activeItem ? "default" : "secondary"}>
            {activeItem ? `نشط: نسخة ${activeItem.version}` : "لا يوجد إعلان نشط"}
          </Badge>
          <Button variant="outline" onClick={resetForm}>
            <Plus className="ml-2 h-4 w-4" />
            إعلان جديد
          </Button>
        </div>
      </div>

      {saveMutation.isSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          تم حفظ الإعلان بنجاح.
        </div>
      )}
      {saveMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          فشل حفظ الإعلان.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? `تعديل إعلان #${editingId}` : "إضافة إعلان جديد"}</CardTitle>
            <CardDescription>
              غيّر رقم النسخة لإظهار نفس الإعلان مرة أخرى لكل المستخدمين.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>رقم النسخة</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.version}
                  onChange={(e) => updateField("version", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>الأولوية</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => updateField("priority", Number(e.target.value))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
                <div>
                  <Label className="text-base">تفعيل الإعلان</Label>
                  <p className="text-xs text-muted-foreground">
                    سيتم عرض أعلى إعلان نشط حسب الأولوية.
                  </p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(value) => updateField("is_active", value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>العنوان بالعربية</Label>
                <Input
                  value={form.title_ar}
                  onChange={(e) => updateField("title_ar", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>العنوان بالإنجليزية</Label>
                <Input
                  value={form.title_en}
                  dir="ltr"
                  onChange={(e) => updateField("title_en", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>النص بالعربية</Label>
                <Textarea
                  rows={5}
                  value={form.body_ar}
                  onChange={(e) => updateField("body_ar", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>النص بالإنجليزية</Label>
                <Textarea
                  rows={5}
                  dir="ltr"
                  value={form.body_en}
                  onChange={(e) => updateField("body_en", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">الصورة</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Input
                  value={form.image_url ?? ""}
                  dir="ltr"
                  placeholder="https://..."
                  onChange={(e) => updateField("image_url", e.target.value || null)}
                />
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => handleUpload(e.target.files?.[0])}
                  />
                  <Button type="button" variant="outline" disabled={uploading}>
                    {uploading ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="ml-2 h-4 w-4" />
                    )}
                    رفع صورة
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                {(["cover", "contain"] as const).map((fit) => (
                  <Button
                    key={fit}
                    type="button"
                    size="sm"
                    variant={form.image_fit === fit ? "default" : "outline"}
                    onClick={() => updateField("image_fit", fit)}
                  >
                    {fit === "cover" ? "ملء المساحة" : "احتواء كامل"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-xl border p-4">
                <h3 className="font-semibold">طريقة العرض</h3>
                <div className="flex gap-2">
                  {(["dialog", "fullscreen"] as const).map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      size="sm"
                      variant={form.display_mode === mode ? "default" : "outline"}
                      onClick={() => updateField("display_mode", mode)}
                    >
                      {mode === "dialog" ? "نافذة" : "كامل الشاشة"}
                    </Button>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>عرض النافذة</Label>
                    <Input
                      type="number"
                      min={0.1}
                      max={1}
                      step={0.01}
                      value={form.width_ratio}
                      onChange={(e) => updateField("width_ratio", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>أقصى ارتفاع</Label>
                    <Input
                      type="number"
                      min={0.2}
                      max={1}
                      step={0.01}
                      value={form.max_height_ratio}
                      onChange={(e) => updateField("max_height_ratio", Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border p-4">
                <h3 className="font-semibold">الإغلاق والإخفاء</h3>
                <div className="flex items-center justify-between">
                  <Label>إغلاق بالضغط خارج النافذة</Label>
                  <Switch
                    checked={form.dismissible}
                    onCheckedChange={(value) => updateField("dismissible", value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>إظهار زر الإخفاء</Label>
                  <Switch
                    checked={form.show_dismiss_button}
                    onCheckedChange={(value) => updateField("show_dismiss_button", value)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={form.dismiss_text_ar}
                    onChange={(e) => updateField("dismiss_text_ar", e.target.value)}
                  />
                  <Input
                    dir="ltr"
                    value={form.dismiss_text_en}
                    onChange={(e) => updateField("dismiss_text_en", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">زر الإجراء</h3>
                  <p className="text-xs text-muted-foreground">اختياري، يمكن فتح رابط خارجي من خلاله.</p>
                </div>
                <Switch
                  checked={form.show_action_button}
                  onCheckedChange={(value) => updateField("show_action_button", value)}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  placeholder="نص الزر"
                  value={form.action_text_ar}
                  onChange={(e) => updateField("action_text_ar", e.target.value)}
                />
                <Input
                  dir="ltr"
                  placeholder="Button text"
                  value={form.action_text_en}
                  onChange={(e) => updateField("action_text_en", e.target.value)}
                />
                <Input
                  dir="ltr"
                  placeholder="https://..."
                  value={form.action_url}
                  onChange={(e) => updateField("action_url", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>بداية العرض</Label>
                <Input
                  type="datetime-local"
                  value={toLocalInput(form.start_at)}
                  onChange={(e) => updateField("start_at", fromLocalInput(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>نهاية العرض</Label>
                <Input
                  type="datetime-local"
                  value={toLocalInput(form.end_at)}
                  onChange={(e) => updateField("end_at", fromLocalInput(e.target.value))}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              {editingId && (
                <Button
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(editingId)}
                >
                  <Trash2 className="ml-2 h-4 w-4" />
                  حذف
                </Button>
              )}
              <Button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || uploading}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="ml-2 h-4 w-4" />
                )}
                حفظ الإعلان
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>معاينة سريعة</CardTitle>
              <CardDescription>تقريب لشكل الإعلان داخل التطبيق</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                {form.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.image_url}
                    alt=""
                    className={`h-44 w-full ${form.image_fit === "cover" ? "object-cover" : "object-contain"} bg-muted`}
                  />
                )}
                <div className="space-y-3 p-4">
                  <Badge variant={form.display_mode === "fullscreen" ? "default" : "secondary"}>
                    {form.display_mode === "fullscreen" ? "كامل الشاشة" : "نافذة"}
                  </Badge>
                  <h2 className="text-xl font-bold">{form.title_ar || "عنوان الإعلان"}</h2>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {form.body_ar || "نص الإعلان يظهر هنا."}
                  </p>
                  <div className="flex gap-2">
                    {form.show_action_button && (
                      <Button size="sm">
                        {form.action_text_ar || "متابعة"}
                        {form.action_url && <ExternalLink className="mr-2 h-3.5 w-3.5" />}
                      </Button>
                    )}
                    {form.show_dismiss_button && (
                      <Button size="sm" variant="outline">
                        {form.dismiss_text_ar || "إخفاء"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الإعلانات الحالية</CardTitle>
              <CardDescription>{data?.total ?? 0} إعلان</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.items.length ? (
                data.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setEditingId(item.id)}
                    className={`w-full rounded-xl border p-3 text-right transition hover:bg-accent ${
                      editingId === item.id ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-semibold">{item.title_ar || `إعلان #${item.id}`}</span>
                      <Badge variant={item.is_active ? "default" : "secondary"}>
                        {item.is_active ? "نشط" : "معطل"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>نسخة {item.version}</span>
                      <span>أولوية {item.priority}</span>
                      <span>{item.display_mode === "fullscreen" ? "كامل الشاشة" : "نافذة"}</span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  لا توجد إعلانات بعد.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
