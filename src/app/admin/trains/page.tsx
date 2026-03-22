"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { trainsApi } from "@/lib/api/trains"
import { Train } from "@/types"
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
import { Plus, Search, Edit, Trash2, Train as TrainIcon, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { TrainFormDialog } from "@/components/admin/train-form-dialog"
import { TrainStopsDialog } from "@/components/admin/train-stops-dialog"
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

export default function TrainsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [stopsDialogOpen, setStopsDialogOpen] = useState(false)
  const [selectedTrain, setSelectedTrain] = useState<Train | undefined>()
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const queryClient = useQueryClient()

  // Fetch trains
  const { data: trainsData, isLoading, error } = useQuery({
    queryKey: ["trains"],
    queryFn: async () => {
      console.log("Fetching trains...");
      try {
        const result = await trainsApi.getAll();
        console.log("Trains fetched:", result);
        return result;
      } catch (err) {
        console.error("Error fetching trains:", err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 30000,
  })

  const trains = trainsData?.items ?? []

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (trainNumber: string) => trainsApi.delete(trainNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trains"] })
      toast.success("تم حذف القطار بنجاح")
      setDeleteDialogOpen(false)
      setSelectedTrain(undefined)
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حذف القطار")
    },
  })

  // Filter trains
  const filteredTrains = trains.filter(
    (train) =>
      train.train_id.includes(searchQuery) ||
      train.type_ar.includes(searchQuery) ||
      train.type_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      train.start_station_ar.includes(searchQuery) ||
      train.end_station_ar.includes(searchQuery)
  )

  const handleCreate = () => {
    setSelectedTrain(undefined)
    setDialogMode("create")
    setDialogOpen(true)
  }

  const handleEdit = (train: Train) => {
    setSelectedTrain(train)
    setDialogMode("edit")
    setDialogOpen(true)
  }

  const handleDeleteClick = (train: Train) => {
    setSelectedTrain(train)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedTrain?.train_id) {
      deleteMutation.mutate(selectedTrain.train_id)
    }
  }

  const handleViewStops = (train: Train) => {
    setSelectedTrain(train)
    setStopsDialogOpen(true)
  }

  const getTrainTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      "روسي": "default",
      "مكيف": "secondary",
      "خاص": "outline",
      "تالجو": "default",
    }
    return variants[type] || "secondary"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة القطارات</h1>
          <p className="text-muted-foreground mt-2">
            {trainsData?.total ?? 0} قطار في النظام
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة قطار جديد
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن قطار (رقم، نوع، محطة)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trains Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة القطارات</CardTitle>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم القطار</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">من</TableHead>
                  <TableHead className="text-right">إلى</TableHead>
                  <TableHead className="text-right">عدد المحطات</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrains.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد قطارات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrains.map((train) => (
                    <TableRow key={train.id}>
                      <TableCell className="font-medium font-mono">
                        <div className="flex items-center gap-2">
                          <TrainIcon className="h-4 w-4 text-primary" />
                          {train.train_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTrainTypeBadge(train.type_ar)}>
                          {train.type_ar}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {train.start_station_ar}
                      </TableCell>
                      <TableCell className="font-medium">
                        {train.end_station_ar}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {train.stops_count} محطة
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={train.is_active ? "default" : "secondary"}>
                          {train.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewStops(train)}
                            title="عرض وقفات القطار"
                          >
                            <MapPin className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(train)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(train)}
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
          )}
        </CardContent>
      </Card>

      {/* Train Form Dialog */}
      <TrainFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        train={selectedTrain}
        mode={dialogMode}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف القطار رقم &quot;{selectedTrain?.train_id}&quot; نهائياً. هذا الإجراء لا يمكن التراجع عنه.
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

      {/* Train Stops Dialog */}
      <TrainStopsDialog
        open={stopsDialogOpen}
        onOpenChange={setStopsDialogOpen}
        trainNumber={selectedTrain?.train_id || ""}
        trainName={`${selectedTrain?.start_station_ar || ""} - ${selectedTrain?.end_station_ar || ""}`}
      />
    </div>
  )
}
