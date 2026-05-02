"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { stationsApi } from "@/lib/api/stations"
import { Station } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Search, Edit, Trash2, MapPin, Filter, ArrowUpDown, Volume2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { StationFormDialog } from "@/components/admin/station-form-dialog"
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
import { toast } from "sonner"

export default function StationsPage() {
  const [nameFilter, setNameFilter] = useState("")
  const [latFilter, setLatFilter] = useState("")
  const [lngFilter, setLngFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedStation, setSelectedStation] = useState<Station | undefined>()
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [sortByAudioId, setSortByAudioId] = useState(false)
  const queryClient = useQueryClient()

  // Fetch stations
  const { data: stationsData, isLoading, error } = useQuery({
    queryKey: ["stations"],
    queryFn: async () => {
      console.log("Fetching stations...");
      try {
        const result = await stationsApi.getAll();
        console.log("Stations fetched:", result);
        return result;
      } catch (err) {
        console.error("Error fetching stations:", err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 30000,
  })

  const stations = stationsData?.items ?? []

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => stationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations"] })
      toast.success("تم حذف المحطة بنجاح")
      setDeleteDialogOpen(false)
      setSelectedStation(undefined)
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حذف المحطة")
    },
  })

  // Filter stations by name, coordinates, or audio_id
  const filteredStations = stations.filter((station) => {
    // Name filter (Arabic, English, or audio_id)
    const nameMatch =
      nameFilter === "" ||
      station.name_ar.includes(nameFilter) ||
      station.name_en.toLowerCase().includes(nameFilter.toLowerCase()) ||
      station.audio_id.includes(nameFilter)

    // Latitude filter
    const latMatch =
      latFilter === "" ||
      (station.latitude != null &&
        station.latitude.toString().includes(latFilter))

    // Longitude filter
    const lngMatch =
      lngFilter === "" ||
      (station.longitude != null &&
        station.longitude.toString().includes(lngFilter))

    return nameMatch && latMatch && lngMatch
  })

  // Sort by audio_id if toggled
  const displayedStations = sortByAudioId
    ? [...filteredStations].sort((a, b) => a.audio_id.localeCompare(b.audio_id))
    : filteredStations

  const handleCreate = () => {
    setSelectedStation(undefined)
    setDialogMode("create")
    setDialogOpen(true)
  }

  const handleEdit = (station: Station) => {
    setSelectedStation(station)
    setDialogMode("edit")
    setDialogOpen(true)
  }

  const handleDeleteClick = (station: Station) => {
    setSelectedStation(station)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedStation?.id) {
      deleteMutation.mutate(selectedStation.id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">إدارة المحطات</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            {stationsData?.total ?? 0} محطة في النظام
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant={sortByAudioId ? "default" : "outline"}
            onClick={() => setSortByAudioId(!sortByAudioId)}
            className="w-full sm:w-auto"
          >
            <ArrowUpDown className="ml-2 h-4 w-4" />
            ترتيب بـ Audio ID
          </Button>
          <Button onClick={handleCreate} className="w-full sm:w-auto">
            <Plus className="ml-2 h-4 w-4" />
            إضافة محطة
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>فلترة البحث</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Name filter */}
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث بالاسم (عربي/إنجليزي)..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="pr-9"
                />
              </div>
              {/* Latitude filter */}
              <div className="relative">
                <MapPin className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="خط العرض (Latitude)..."
                  value={latFilter}
                  onChange={(e) => setLatFilter(e.target.value)}
                  className="pr-9"
                  type="number"
                  step="any"
                />
              </div>
              {/* Longitude filter */}
              <div className="relative">
                <MapPin className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="خط الطول (Longitude)..."
                  value={lngFilter}
                  onChange={(e) => setLngFilter(e.target.value)}
                  className="pr-9"
                  type="number"
                  step="any"
                />
              </div>
            </div>
            {(nameFilter || latFilter || lngFilter) && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNameFilter("")
                    setLatFilter("")
                    setLngFilter("")
                  }}
                >
                  مسح الفلاتر
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">قائمة المحطات</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8">
              <div className="text-destructive mb-2">حدث خطأ في تحميل البيانات</div>
              <div className="text-sm text-muted-foreground">{error.message}</div>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              جاري التحميل...
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-12 hidden md:table-cell">#</TableHead>
                    <TableHead className="text-right">الاسم بالعربي</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">الاسم بالإنجليزي</TableHead>
                    <TableHead className="text-right w-20">Audio ID</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">الإحداثيات</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        لا توجد محطات
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedStations.map((station) => (
                      <TableRow key={station.id}>
                        <TableCell className="text-muted-foreground font-mono hidden md:table-cell">
                          {station.id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {station.name_ar}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell">
                          {station.name_en}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                              {station.audio_id}
                            </code>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {station.latitude != null && station.longitude != null ? (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-accent shrink-0" />
                              <span className="text-sm text-muted-foreground font-mono whitespace-nowrap">
                                {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              غير متوفر
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={station.is_active ? "default" : "secondary"} className="whitespace-nowrap">
                            {station.is_active ? "نشط" : "غير نشط"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 md:gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(station)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(station)}
                              className="h-8 w-8"
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
          )}
        </CardContent>
      </Card>

      {/* Station Form Dialog */}
      <StationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        station={selectedStation}
        mode={dialogMode}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف المحطة &quot;{selectedStation?.name_ar}&quot; نهائياً. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
