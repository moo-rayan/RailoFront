"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Trash2,
  X,
  Check,
  Filter,
  DollarSign,
  Train,
  MapPin,
} from "lucide-react"
import {
  fetchFares,
  fetchFareClasses,
  updateFare,
  deleteFare,
  type FareItem,
  type FareClass,
  type FareSearchParams,
} from "@/lib/api/fares"

export default function FaresPage() {
  // Data
  const [fares, setFares] = useState<FareItem[]>([])
  const [total, setTotal] = useState(0)
  const [classes, setClasses] = useState<FareClass[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [page, setPage] = useState(1)
  const [pageSize] = useState(30)
  const [fromStation, setFromStation] = useState("")
  const [toStation, setToStation] = useState("")
  const [trainNumber, setTrainNumber] = useState("")
  const [fareClass, setFareClass] = useState("")

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPrice, setEditPrice] = useState("")
  const [editClassAr, setEditClassAr] = useState("")
  const [editClassEn, setEditClassEn] = useState("")

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const totalPages = Math.ceil(total / pageSize)

  const loadFares = useCallback(async () => {
    setLoading(true)
    try {
      const params: FareSearchParams = {
        page,
        page_size: pageSize,
      }
      if (fromStation.trim()) params.from_station = fromStation.trim()
      if (toStation.trim()) params.to_station = toStation.trim()
      if (trainNumber.trim()) params.train_number = trainNumber.trim()
      if (fareClass) params.fare_class = fareClass

      const res = await fetchFares(params)
      setFares(res.items)
      setTotal(res.total)
    } catch (err) {
      console.error("Failed to load fares:", err)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, fromStation, toStation, trainNumber, fareClass])

  const loadClasses = useCallback(async () => {
    try {
      const res = await fetchFareClasses()
      setClasses(res)
    } catch (err) {
      console.error("Failed to load classes:", err)
    }
  }, [])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  useEffect(() => {
    loadFares()
  }, [loadFares])

  // Debounced search
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null)
  const handleSearchChange = (setter: (v: string) => void, value: string) => {
    setter(value)
    setPage(1)
    if (searchTimer) clearTimeout(searchTimer)
    setSearchTimer(setTimeout(() => {}, 400))
  }

  // Edit handlers
  const startEdit = (fare: FareItem) => {
    setEditingId(fare.id)
    setEditPrice(String(fare.price))
    setEditClassAr(fare.class_name_ar)
    setEditClassEn(fare.class_name_en)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async () => {
    if (!editingId) return
    try {
      await updateFare(editingId, {
        price: Number(editPrice),
        class_name_ar: editClassAr,
        class_name_en: editClassEn,
      })
      setEditingId(null)
      loadFares()
    } catch (err) {
      console.error("Failed to update fare:", err)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteFare(id)
      setDeletingId(null)
      loadFares()
    } catch (err) {
      console.error("Failed to delete fare:", err)
    }
  }

  const clearFilters = () => {
    setFromStation("")
    setToStation("")
    setTrainNumber("")
    setFareClass("")
    setPage(1)
  }

  const hasFilters = fromStation || toStation || trainNumber || fareClass

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الأسعار</h1>
          <p className="text-sm text-muted-foreground mt-1">
            إجمالي {total.toLocaleString()} سعر مسجل
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-full">
          <DollarSign className="h-4 w-4" />
          <span>{total.toLocaleString()} سجل</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-card rounded-xl border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* From Station */}
          <div className="relative">
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="محطة المغادرة..."
              value={fromStation}
              onChange={(e) => handleSearchChange(setFromStation, e.target.value)}
              className="w-full rounded-lg border bg-background px-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* To Station */}
          <div className="relative">
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="محطة الوصول..."
              value={toStation}
              onChange={(e) => handleSearchChange(setToStation, e.target.value)}
              className="w-full rounded-lg border bg-background px-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Train Number */}
          <div className="relative">
            <Train className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="رقم القطار..."
              value={trainNumber}
              onChange={(e) => handleSearchChange(setTrainNumber, e.target.value)}
              className="w-full rounded-lg border bg-background px-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Class filter */}
          <div className="relative">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={fareClass}
              onChange={(e) => {
                setFareClass(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border bg-background px-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
            >
              <option value="">كل الدرجات</option>
              {classes.map((c) => (
                <option key={c.en} value={c.en}>
                  {c.ar} ({c.en})
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-destructive hover:underline"
          >
            <X className="h-3 w-3" />
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">رقم القطار</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">من</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">إلى</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">الدرجة</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">السعر (ج.م)</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground w-24">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      جاري التحميل...
                    </div>
                  </td>
                </tr>
              ) : fares.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    لا توجد نتائج
                  </td>
                </tr>
              ) : (
                fares.map((fare) => (
                  <tr
                    key={fare.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    {/* Train Number */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-mono font-bold">
                        <Train className="h-3 w-3" />
                        {fare.train_number}
                      </span>
                    </td>

                    {/* From */}
                    <td className="py-3 px-4">
                      <div className="text-xs text-muted-foreground">{fare.from_station_en}</div>
                      <div className="font-medium">{fare.from_station_ar}</div>
                    </td>

                    {/* To */}
                    <td className="py-3 px-4">
                      <div className="text-xs text-muted-foreground">{fare.to_station_en}</div>
                      <div className="font-medium">{fare.to_station_ar}</div>
                    </td>

                    {/* Class */}
                    <td className="py-3 px-4">
                      {editingId === fare.id ? (
                        <select
                          value={editClassEn}
                          onChange={(e) => {
                            const selected = classes.find((c) => c.en === e.target.value)
                            if (selected) {
                              setEditClassEn(selected.en)
                              setEditClassAr(selected.ar)
                            }
                          }}
                          className="w-full rounded border px-2 py-1.5 text-xs bg-background"
                        >
                          {classes.map((c) => (
                            <option key={c.en} value={c.en}>
                              {c.ar} ({c.en})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <div className="font-medium">{fare.class_name_ar}</div>
                          <div className="text-xs text-muted-foreground">{fare.class_name_en}</div>
                        </>
                      )}
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4">
                      {editingId === fare.id ? (
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-20 rounded border px-2 py-1 text-sm bg-background font-bold"
                          dir="ltr"
                          min={0}
                        />
                      ) : (
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {fare.price.toLocaleString()} ج.م
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {editingId === fare.id ? (
                          <>
                            <button
                              onClick={saveEdit}
                              className="p-1.5 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-colors"
                              title="حفظ"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                              title="إلغاء"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : deletingId === fare.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(fare.id)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors text-xs font-medium"
                              title="تأكيد الحذف"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                              title="إلغاء"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(fare)}
                              className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                              title="تعديل"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingId(fare.id)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-xs text-muted-foreground">
              صفحة {page} من {totalPages} ({total.toLocaleString()} نتيجة)
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`min-w-[32px] h-8 rounded-md text-xs font-medium transition-colors ${
                      page === pageNum
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
