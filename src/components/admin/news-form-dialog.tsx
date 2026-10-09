"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Image from "next/image"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { newsApi, type NewsArticle, type UpdateNewsInput } from "@/lib/api/news"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Upload, X, Bold, Image as ImageIcon, Loader2 } from "lucide-react"

interface NewsFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  article: NewsArticle | null
}

export function NewsFormDialog({ open, onOpenChange, article }: NewsFormDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const uploadControllerRef = useRef<AbortController | null>(null)

  const [title, setTitle] = useState("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isPublished, setIsPublished] = useState(false)
  const [uploading, setUploading] = useState(false)

  const isEdit = !!article

  useEffect(() => {
    uploadControllerRef.current?.abort()
    uploadControllerRef.current = null
    setUploading(false)
    let editorTimer: ReturnType<typeof setTimeout> | undefined
    if (open) {
      if (article) {
        setTitle(article.title)
        const images = article.image_urls?.length
          ? article.image_urls
          : article.image_url ? [article.image_url] : []
        setImageUrls(images)
        setImageUrl(images.includes(article.image_url ?? "") ? article.image_url : images[0] ?? null)
        setIsPublished(article.is_published)
        // Set body HTML in the editor after DOM render
        editorTimer = setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = article.body || ""
          }
        }, 50)
      } else {
        setTitle("")
        setImageUrl(null)
        setImageUrls([])
        setIsPublished(false)
        editorTimer = setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = ""
          }
        }, 50)
      }
    }
    return () => {
      clearTimeout(editorTimer)
      uploadControllerRef.current?.abort()
    }
  }, [open, article])

  const createMutation = useMutation({
    mutationFn: newsApi.create,
    onSuccess: () => {
      toast.success("تم إنشاء الخبر بنجاح")
      queryClient.invalidateQueries({ queryKey: ["admin-news"] })
      onOpenChange(false)
    },
    onError: () => toast.error("فشل إنشاء الخبر"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: UpdateNewsInput & { id: number }) =>
      newsApi.update(id, data),
    onSuccess: () => {
      toast.success("تم تحديث الخبر بنجاح")
      queryClient.invalidateQueries({ queryKey: ["admin-news"] })
      onOpenChange(false)
    },
    onError: () => toast.error("فشل تحديث الخبر"),
  })

  const handleImageUpload = useCallback(async (files: File[]) => {
    if (!files.length || uploadControllerRef.current) return
    if (imageUrls.length + files.length > 5) {
      toast.error("الحد الأقصى 5 صور للخبر الواحد")
      return
    }
    if (files.some(file => !file.type.startsWith("image/"))) {
      toast.error("يجب أن يكون الملف صورة")
      return
    }
    if (files.some(file => file.size === 0 || file.size > 5 * 1024 * 1024)) {
      toast.error("حجم كل صورة يجب أن يكون بين 1 بايت و5 ميجا")
      return
    }
    const controller = new AbortController()
    uploadControllerRef.current = controller
    setUploading(true)
    const uploaded: string[] = []
    let failed = 0
    try {
      for (const file of files) {
        if (controller.signal.aborted) return
        try {
          const url = await newsApi.uploadImage(file, controller.signal)
          uploaded.push(url)
        } catch {
          if (controller.signal.aborted) return
          failed++
        }
      }
      if (controller.signal.aborted) return
      if (uploaded.length) {
        setImageUrls([...imageUrls, ...uploaded])
        setImageUrl(current => current ?? uploaded[0])
        toast.success(`تم رفع ${uploaded.length} صورة`)
      }
      if (failed) toast.error(`تعذر رفع ${failed} صورة، يمكنك إعادة المحاولة`)
    } finally {
      if (!controller.signal.aborted) {
        uploadControllerRef.current = null
        setUploading(false)
      }
    }
  }, [imageUrls])

  const removeImage = (url: string) => {
    const remaining = imageUrls.filter(image => image !== url)
    setImageUrls(remaining)
    if (imageUrl === url) setImageUrl(remaining[0] ?? null)
  }

  const handleSubmit = () => {
    if (uploading || createMutation.isPending || updateMutation.isPending) return
    if (!title.trim()) {
      toast.error("العنوان مطلوب")
      return
    }

    const body = editorRef.current?.innerHTML || ""

    if (isEdit && article) {
      updateMutation.mutate({
        id: article.id,
        title: title.trim(),
        body,
        image_url: imageUrl,
        image_urls: imageUrls,
        is_published: isPublished,
      })
    } else {
      createMutation.mutate({
        title: title.trim(),
        body,
        image_url: imageUrl,
        image_urls: imageUrls,
        is_published: isPublished,
      })
    }
  }

  const handleBold = () => {
    document.execCommand("bold", false)
    editorRef.current?.focus()
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const busy = isPending || uploading

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value) }}>
      <DialogContent dir="rtl" showCloseButton={!busy} className="w-[calc(100vw_-_2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg [&>[data-slot=dialog-close]]:left-2 [&>[data-slot=dialog-close]]:right-auto">
        <DialogHeader className="pl-8">
          <DialogTitle>{isEdit ? "تعديل الخبر" : "خبر جديد"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="news-title">العنوان *</Label>
            <Input
              id="news-title"
              disabled={busy}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان الخبر..."
              dir="auto"
            />
          </div>

          {/* Image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>الصور ({imageUrls.length}/5)</Label>
              <Button type="button" variant="outline" size="sm" disabled={busy || imageUrls.length >= 5} onClick={() => fileInputRef.current?.click()} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "جارٍ رفع الصور" : "إضافة صور"}
              </Button>
            </div>
            {imageUrls.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {imageUrls.map((url, index) => (
                  <div key={url} className={`overflow-hidden rounded-lg border ${imageUrl === url ? "border-primary" : "border-border"}`}>
                    <div className="relative aspect-[4/3] bg-muted">
                      <Image src={url} alt={`صورة الخبر ${index + 1}`} fill unoptimized sizes="(max-width: 640px) 45vw, 200px" className="object-contain" />
                      <Button type="button" variant="destructive" size="icon" title={`حذف الصورة ${index + 1}`} aria-label={`حذف الصورة ${index + 1}`} disabled={busy} className="absolute left-1 top-1 h-7 w-7" onClick={() => removeImage(url)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 p-2 text-xs">
                      <input type="radio" name="news-cover" aria-label={`الصورة الرئيسية ${index + 1}`} checked={imageUrl === url} disabled={busy} onChange={() => setImageUrl(url)} className="accent-primary" />
                      الصورة الرئيسية
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              aria-label="رفع صور الخبر"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                void handleImageUpload(files)
                e.target.value = ""
              }}
            />
          </div>

          {/* Body (Rich Text) */}
          <div className="space-y-2">
            <Label>التفاصيل</Label>
            <div className="border rounded-lg overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center gap-1 border-b bg-muted/30 p-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBold}
                  disabled={busy}
                  className="h-8 w-8 p-0"
                  title="غامق"
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </div>
              {/* Editor */}
              <div
                ref={editorRef}
                contentEditable={!busy}
                dir="auto"
                className="min-h-[150px] max-h-[300px] overflow-y-auto p-3 text-sm focus:outline-none"
                style={{ whiteSpace: "pre-wrap" }}
              />
            </div>
          </div>

          {/* Publish toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">نشر الخبر</p>
              <p className="text-xs text-muted-foreground">
                سيظهر الخبر في التطبيق فور النشر
              </p>
            </div>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} disabled={busy} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={busy}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : null}
              {isEdit ? "حفظ التعديلات" : "إنشاء الخبر"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
