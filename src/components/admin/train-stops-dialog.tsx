"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { tripsApi } from "@/lib/api/trips"
import { Trip, TripStop } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin } from "lucide-react"

interface TrainStopsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trainNumber: string
  trainName: string
}

export function TrainStopsDialog({
  open,
  onOpenChange,
  trainNumber,
  trainName,
}: TrainStopsDialogProps) {
  const { data: trips, isLoading, error } = useQuery({
    queryKey: ["train-trips", trainNumber],
    queryFn: () => tripsApi.getByTrainNumber(trainNumber),
    enabled: open && !!trainNumber,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            وقفات القطار {trainNumber} - {trainName}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="text-center py-8">
            <div className="text-destructive mb-2">حدث خطأ في تحميل البيانات</div>
            <div className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "خطأ غير معروف"}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            جاري تحميل وقفات القطار...
          </div>
        )}

        {trips && trips.length > 0 && (
          <div className="space-y-6">
            {trips.map((trip, tripIndex) => (
              <div key={trip.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      رحلة {tripIndex + 1}: {trip.from_station_ar} → {trip.to_station_ar}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        المغادرة: {trip.departure_ar}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        الوصول: {trip.arrival_ar}
                      </span>
                      <span>المدة: {trip.duration_ar}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <Badge variant="outline">
                      {trip.stops_count} محطة
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">
                      {trip.type_ar}
                    </div>
                  </div>
                </div>

                {trip.stops && trip.stops.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right w-16">#</TableHead>
                        <TableHead className="text-right">المحطة</TableHead>
                        <TableHead className="text-right">الوقت</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trip.stops
                        .sort((a, b) => a.stop_order - b.stop_order)
                        .map((stop) => (
                          <TableRow key={stop.id}>
                            <TableCell className="text-center font-mono">
                              {stop.stop_order}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{stop.station_ar}</div>
                                <div className="text-sm text-muted-foreground">
                                  {stop.station_en}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono">{stop.time_ar}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    لا توجد بيانات وقفات لهذه الرحلة
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {trips && trips.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد رحلات مسجلة لهذا القطار
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
