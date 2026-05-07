"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { newsApi, type NewsArticle } from "@/lib/api/news"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, Search, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { NewsFormDialog } from "@/components/admin/news-form-dialog"
import { RequireAdminLevel } from "@/components/auth/require-admin-level"

export default function NewsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NewsArticle | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["admin-news", page],
    queryFn: () => newsApi.list(page, 20),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => newsApi.delete(id),
    onSuccess: () => {
      toast.success("تم حذف الخبر بنجاح")
      queryClient.invalidateQueries({ queryKey: ["admin-news"] })
      setDeleteTarget(null)
    },
    onError: () => toast.error("فشل حذف الخبر"),
  })

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, is_published }: { id: number; is_published: boolean }) =>
      newsApi.update(id, { is_published }),
    onSuccess: () => {
      toast.success("تم تحديث حالة النشر")
      queryClient.invalidateQueries({ queryKey: ["admin-news"] })
    },
    onError: () => toast.error("فشل تحديث حالة النشر"),
  })

  const articles = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const filteredArticles = search
    ? articles.filter(
        (a) =>
          a.title.includes(search) ||
          a.body.includes(search)
      )
    : articles

  const handleEdit = (article: NewsArticle) => {
    setEditingArticle(article)
    setFormOpen(true)
  }

  const handleCreate = () => {
    setEditingArticle(null)
    setFormOpen(true)
  }

  return (
    <RequireAdminLevel level="monitor">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">الأخبار</h1>
            <p className="text-sm text-muted-foreground">
              إدارة الأخبار والمقالات التي تظهر في التطبيق ({total} خبر)
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 ml-2" />
            خبر جديد
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في الأخبار..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead className="w-20">الصورة</TableHead>
                <TableHead>العنوان</TableHead>
                <TableHead className="w-24">الحالة</TableHead>
                <TableHead className="w-40">تاريخ النشر</TableHead>
                <TableHead className="w-40">تاريخ الإنشاء</TableHead>
                <TableHead className="w-32">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    جارٍ التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredArticles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا توجد أخبار
                  </TableCell>
                </TableRow>
              ) : (
                filteredArticles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-mono text-xs">{article.id}</TableCell>
                    <TableCell>
                      {article.image_url ? (
                        <img
                          src={article.image_url}
                          alt=""
                          className="w-14 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-14 h-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          —
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium line-clamp-1">{article.title}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={article.is_published ? "default" : "secondary"}>
                        {article.is_published ? "منشور" : "مسودة"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {article.published_at
                        ? new Date(article.published_at).toLocaleString("ar-EG")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(article.created_at).toLocaleString("ar-EG")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            togglePublishMutation.mutate({
                              id: article.id,
                              is_published: !article.is_published,
                            })
                          }
                          title={article.is_published ? "إلغاء النشر" : "نشر"}
                        >
                          {article.is_published ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(article)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(article)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              السابق
            </Button>
            <span className="text-sm text-muted-foreground">
              صفحة {page} من {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              التالي
            </Button>
          </div>
        )}

        {/* Form Dialog */}
        <NewsFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          article={editingArticle}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف الخبر</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف &quot;{deleteTarget?.title}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequireAdminLevel>
  )
}
