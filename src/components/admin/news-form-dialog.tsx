"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { newsApi, type NewsArticle } from "@/lib/api/news"
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

  const [title, setTitle] = useState("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [uploading, setUploading] = useState(false)

  const isEdit = !!article

  useEffect(() => {
    if (open) {
      if (article) {
        setTitle(article.title)
        setImageUrl(article.image_url)
        setIsPublished(article.is_published)
        // Set body HTML in the editor after DOM render
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = article.body || ""
          }
        }, 50)
      } else {
        setTitle("")
        setImageUrl(null)
        setIsPublished(false)
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = ""
          }
        }, 50)
      }
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
    mutationFn: ({ id, ...data }: { id: number; title?: string; body?: string; image_url?: string | null; is_published?: boolean }) =>
      newsApi.update(id, data),
    onSuccess: () => {
      toast.success("تم تحديث الخبر بنجاح")
      queryClient.invalidateQueries({ queryKey: ["admin-news"] })
      onOpenChange(false)
    },
    onError: () => toast.error("فشل تحديث الخبر"),
  })

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("يجب أن يكون الملف صورة")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجا")
      return
    }
    setUploading(true)
    try {
      const url = await newsApi.uploadImage(file)
      setImageUrl(url)
      toast.success("تم رفع الصورة بنجاح")
    } catch {
      toast.error("فشل رفع الصورة")
    } finally {
      setUploading(false)
    }
  }, [])

  const handleSubmit = () => {
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
        is_published: isPublished,
      })
    } else {
      createMutation.mutate({
        title: title.trim(),
        body,
        image_url: imageUrl,
        is_published: isPublished,
      })
    }
  }

  const handleBold = () => {
    document.execCommand("bold", false)
    editorRef.current?.focus()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل الخبر" : "خبر جديد"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Title */}
          <div className="space-y-2">
            <Label>العنوان *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان الخبر..."
              dir="auto"
            />
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>الصورة</Label>
            {imageUrl ? (
              <div className="relative group">
                <img
                  src={imageUrl}
                  alt="preview"
                  className="w-full max-h-48 object-cover rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 left-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setImageUrl(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      اضغط لرفع صورة (حد أقصى 5 ميجا)
                    </span>
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageUpload(file)
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
                  className="h-8 w-8 p-0"
                  title="غامق"
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </div>
              {/* Editor */}
              <div
                ref={editorRef}
                contentEditable
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
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
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
