"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { tripsApi } from "@/lib/api/trips"
import { Trip } from "@/types"
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
import { Clock, MapPin, Map as MapIcon, List } from "lucide-react"
import { TrainRouteMap } from "./train-route-map"

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
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)

  const { data: trips, isLoading, error } = useQuery({
    queryKey: ["train-trips", trainNumber],
    queryFn: () => tripsApi.getByTrainNumber(trainNumber),
    enabled: open && !!trainNumber,
  })

  // Auto-select the first trip for map display
  const activeTripId = selectedTripId ?? trips?.[0]?.id ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[95vw] xl:max-w-7xl max-h-[92vh] overflow-y-auto">
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
          <div className="space-y-4">
            {/* Trip selector if multiple trips */}
            {trips.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {trips.map((trip, i) => (
                  <button
                    key={trip.id}
                    onClick={() => setSelectedTripId(trip.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                      activeTripId === trip.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:bg-accent"
                    }`}
                  >
                    رحلة {i + 1}: {trip.from_station_ar} → {trip.to_station_ar}
                  </button>
                ))}
              </div>
            )}

            {/* Active trip content */}
            {trips
              .filter((t) => t.id === activeTripId)
              .map((trip) => (
                <TripDetail key={trip.id} trip={trip} />
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

function TripDetail({ trip }: { trip: Trip }) {
  return (
    <div className="space-y-4">
      {/* Trip header */}
      <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/30">
        <div>
          <h3 className="text-lg font-semibold">
            {trip.from_station_ar} → {trip.to_station_ar}
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
          <Badge variant="outline">{trip.stops_count} محطة</Badge>
          <div className="text-sm text-muted-foreground mt-1">{trip.type_ar}</div>
        </div>
      </div>

      {/* Map + Stops side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Map column */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <MapIcon className="h-4 w-4" />
            الخريطة
          </div>
          <TrainRouteMap
            tripId={trip.id}
            className="w-full h-[480px] rounded-lg overflow-hidden border"
          />
          <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-green-600 border border-white" />
              محطة الانطلاق
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-600 border border-white" />
              محطة وسطى
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-600 border border-white" />
              محطة الوصول
            </span>
          </div>
        </div>

        {/* Stops column */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <List className="h-4 w-4" />
            المحطات
          </div>
          {trip.stops && trip.stops.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-right w-16">#</TableHead>
                      <TableHead className="text-right">المحطة</TableHead>
                      <TableHead className="text-right">الوقت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trip.stops
                      .sort((a, b) => a.stop_order - b.stop_order)
                      .map((stop, i) => (
                        <TableRow
                          key={stop.id}
                          className={
                            i === 0
                              ? "bg-green-50 dark:bg-green-950/20"
                              : i === trip.stops.length - 1
                                ? "bg-red-50 dark:bg-red-950/20"
                                : ""
                          }
                        >
                          <TableCell className="text-center font-mono text-sm">
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
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              لا توجد بيانات وقفات لهذه الرحلة
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
