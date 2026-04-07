"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { tripsApi } from "@/lib/api/trips"
import { stationsApi } from "@/lib/api/stations"
import { Trip, TripStop } from "@/types"
import type { Station } from "@/types"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Clock, MapPin, Map as MapIcon, List, Plus, Trash2, Search, X, Loader2, Check, Train, Pencil } from "lucide-react"
import { TrainRouteMap } from "./train-route-map"
import { toast } from "sonner"

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
  const queryClient = useQueryClient()

  const { data: trips, isLoading, error } = useQuery({
    queryKey: ["train-trips", trainNumber],
    queryFn: () => tripsApi.getByTrainNumber(trainNumber),
    enabled: open && !!trainNumber,
  })

  const createTripMutation = useMutation({
    mutationFn: () => tripsApi.create({ train_number: trainNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["train-trips", trainNumber] })
      toast.success("تم إنشاء الرحلة بنجاح، يمكنك الآن إضافة الوقفات")
    },
    onError: () => {
      toast.error("حدث خطأ أثناء إنشاء الرحلة")
    },
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
          <div className="text-center py-12 space-y-4">
            <Train className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <div>
              <p className="text-lg font-medium">لا توجد رحلات مسجلة لهذا القطار</p>
              <p className="text-sm text-muted-foreground mt-1">
                أنشئ رحلة جديدة لتتمكن من إضافة الوقفات والمحطات
              </p>
            </div>
            <Button
              onClick={() => createTripMutation.mutate()}
              disabled={createTripMutation.isPending}
              size="lg"
            >
              {createTripMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Plus className="h-4 w-4 ml-2" />
              )}
              إنشاء رحلة وإضافة الوقفات
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Add Stop Form ─────────────────────────────────────────────────────────────

function AddStopForm({ trip, onSuccess }: { trip: Trip; onSuccess: () => void }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Station[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [timeHHMM, setTimeHHMM] = useState("")
  const [period, setPeriod] = useState<"ص" | "م">("ص")
  // insertAfter: -1 = at the very start, N = after stop with stop_order=N
  const sortedExisting = [...trip.stops].sort((a, b) => a.stop_order - b.stop_order)
  const [insertAfter, setInsertAfter] = useState<number>(
    sortedExisting.length > 0 ? sortedExisting[sortedExisting.length - 1].stop_order : -1
  )
  const [error, setError] = useState("")
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queryClient = useQueryClient()

  // Debounced station search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await stationsApi.search(searchQuery.trim(), 1, 10)
        setSearchResults(res.items)
        setShowResults(true)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  // Close results on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  const timeAr = timeHHMM ? `${timeHHMM} ${period}` : ""
  const timeEn = timeHHMM ? `${timeHHMM} ${period === "ص" ? "AM" : "PM"}` : ""
  // stop_order to send = insertAfter + 1  (-1 → 0+1=1 = beginning)
  const stopOrderToSend = insertAfter + 1

  const addMutation = useMutation({
    mutationFn: () =>
      tripsApi.addStop(trip.id, {
        station_id: selectedStation!.id,
        stop_order: stopOrderToSend,
        time_ar: timeAr,
        time_en: timeEn,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["train-trips"] })
      setSelectedStation(null)
      setSearchQuery("")
      setTimeHHMM("")
      setPeriod("ص")
      setError("")
      onSuccess()
    },
    onError: () => setError("فشل إضافة الوقفة، حاول مرة أخرى"),
  })

  function handleSubmit() {
    if (!selectedStation) { setError("يجب اختيار محطة"); return }
    if (!timeHHMM.trim()) { setError("يجب إدخال الوقت"); return }
    setError("")
    addMutation.mutate()
  }

  return (
    <div className="border rounded-lg p-4 bg-muted/20 space-y-3" dir="rtl">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Plus className="h-4 w-4 text-primary" />
        إضافة وقفة جديدة
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-start">
        {/* Station search */}
        <div ref={searchRef} className="relative">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="ابحث عن محطة..."
              value={selectedStation ? selectedStation.name_ar : searchQuery}
              onChange={(e) => {
                setSelectedStation(null)
                setSearchQuery(e.target.value)
              }}
              className="pr-9 text-right"
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
            />
            {selectedStation && (
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => { setSelectedStation(null); setSearchQuery("") }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {isSearching && !selectedStation && (
              <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Search results dropdown */}
          {showResults && searchResults.length > 0 && !selectedStation && (
            <div className="absolute top-full mt-1 w-full z-50 bg-card border rounded-lg shadow-lg max-h-52 overflow-y-auto">
              {searchResults.map((station) => (
                <button
                  key={station.id}
                  className="w-full text-right px-3 py-2 hover:bg-accent flex items-center gap-2 text-sm border-b last:border-0"
                  onClick={() => {
                    setSelectedStation(station)
                    setSearchQuery("")
                    setShowResults(false)
                  }}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{station.name_ar}</span>
                  <span className="text-muted-foreground text-xs">{station.name_en}</span>
                </button>
              ))}
            </div>
          )}
          {showResults && searchResults.length === 0 && !isSearching && searchQuery.length > 0 && !selectedStation && (
            <div className="absolute top-full mt-1 w-full z-50 bg-card border rounded-lg shadow-lg px-3 py-2 text-sm text-muted-foreground text-center">
              لا توجد نتائج
            </div>
          )}
        </div>

        {/* Time input: HH:MM + ص/م */}
        <div className="flex items-center gap-1.5">
          <Input
            placeholder="5:30"
            value={timeHHMM}
            onChange={(e) => setTimeHHMM(e.target.value)}
            className="text-center w-24"
          />
          <div className="flex rounded-md border overflow-hidden shrink-0">
            {(["ص", "م"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm font-semibold transition-colors ${
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Insert position select */}
        <div className="shrink-0">
          <select
            value={insertAfter}
            onChange={(e) => setInsertAfter(Number(e.target.value))}
            className="h-9 rounded-md border bg-background px-2 text-sm text-right w-44 focus:outline-none focus:ring-2 focus:ring-ring"
            dir="rtl"
          >
            <option value={-1}>في البداية (أول وقفة)</option>
            {sortedExisting.map((s) => (
              <option key={s.id} value={s.stop_order}>
                بعد: {s.station_ar || `وقفة ${s.stop_order}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {selectedStation && (
          <span className="text-xs text-muted-foreground flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5">
            <Check className="h-3 w-3" />
            {selectedStation.name_ar}
          </span>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={addMutation.isPending || !selectedStation || !timeAr.trim()}
          className="mr-auto"
        >
          {addMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
          ) : (
            <Plus className="h-3.5 w-3.5 ml-1" />
          )}
          إضافة الوقفة
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ── Trip Detail ───────────────────────────────────────────────────────────────

/** Parse "5:30 ص" into { hhmm: "5:30", period: "ص" } */
function parseStopTime(timeAr: string): { hhmm: string; period: "ص" | "م" } {
  if (!timeAr?.trim()) return { hhmm: "", period: "ص" }
  const parts = timeAr.trim().split(" ")
  if (parts.length === 2) {
    const p = parts[1] === "م" || parts[1] === "PM" || parts[1] === "pm" ? "م" : "ص"
    return { hhmm: parts[0], period: p as "ص" | "م" }
  }
  return { hhmm: timeAr.trim(), period: "ص" }
}

function StopTimeCell({ stop, tripId }: { stop: TripStop; tripId: number }) {
  const [editing, setEditing] = useState(false)
  const parsed = parseStopTime(stop.time_ar)
  const [hhmm, setHhmm] = useState(parsed.hhmm)
  const [period, setPeriod] = useState<"ص" | "م">(parsed.period)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: () => {
      const timeAr = hhmm.trim() ? `${hhmm.trim()} ${period}` : ""
      const timeEn = hhmm.trim() ? `${hhmm.trim()} ${period === "ص" ? "AM" : "PM"}` : ""
      return tripsApi.updateStop(tripId, stop.id, { time_ar: timeAr, time_en: timeEn })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["train-trips"] })
      setEditing(false)
      toast.success("تم تحديث الوقت")
    },
    onError: () => toast.error("فشل تحديث الوقت"),
  })

  if (!editing) {
    return (
      <div className="flex items-center gap-1 group">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-sm">{stop.time_ar}</span>
        <button
          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
          onClick={() => {
            const p = parseStopTime(stop.time_ar)
            setHhmm(p.hhmm)
            setPeriod(p.period)
            setEditing(true)
          }}
          title="تعديل الوقت"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={hhmm}
        onChange={(e) => setHhmm(e.target.value)}
        placeholder="5:30"
        className="h-7 w-16 text-center text-xs px-1"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") updateMutation.mutate()
          if (e.key === "Escape") setEditing(false)
        }}
      />
      <div className="flex rounded-md border overflow-hidden shrink-0">
        {(["ص", "م"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`px-1.5 py-0.5 text-xs font-semibold transition-colors ${
              period === p
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-accent"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        className="p-0.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-colors"
        onClick={() => updateMutation.mutate()}
        disabled={updateMutation.isPending}
        title="حفظ"
      >
        {updateMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        className="p-0.5 rounded hover:bg-accent text-muted-foreground transition-colors"
        onClick={() => setEditing(false)}
        title="إلغاء"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function TripDetail({ trip }: { trip: Trip }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const queryClient = useQueryClient()

  const removeMutation = useMutation({
    mutationFn: (stopId: number) => tripsApi.removeStop(trip.id, stopId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["train-trips"] }),
  })

  const sortedStops = [...(trip.stops ?? [])].sort((a, b) => a.stop_order - b.stop_order)

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
        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline">{trip.stops_count} محطة</Badge>
          <div className="text-sm text-muted-foreground">{trip.type_ar}</div>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <List className="h-4 w-4" />
              المحطات ({sortedStops.length})
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm((v) => !v)}
              className="h-7 gap-1 text-xs"
            >
              {showAddForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {showAddForm ? "إلغاء" : "إضافة وقفة"}
            </Button>
          </div>

          {/* Add Stop Form */}
          {showAddForm && (
            <AddStopForm
              trip={trip}
              onSuccess={() => setShowAddForm(false)}
            />
          )}

          {/* Stops table */}
          {sortedStops.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-right w-12">#</TableHead>
                      <TableHead className="text-right">المحطة</TableHead>
                      <TableHead className="text-right">الوقت</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStops.map((stop, i) => (
                      <TableRow
                        key={stop.id}
                        className={
                          i === 0
                            ? "bg-green-50 dark:bg-green-950/20"
                            : i === sortedStops.length - 1
                              ? "bg-red-50 dark:bg-red-950/20"
                              : ""
                        }
                      >
                        <TableCell className="text-center font-mono text-sm">
                          {stop.stop_order}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{stop.station_ar}</div>
                          <div className="text-xs text-muted-foreground">{stop.station_en}</div>
                        </TableCell>
                        <TableCell>
                          <StopTimeCell stop={stop} tripId={trip.id} />
                        </TableCell>
                        <TableCell>
                          <button
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => removeMutation.mutate(stop.id)}
                            disabled={removeMutation.isPending}
                            title="حذف الوقفة"
                          >
                            {removeMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              لا توجد وقفات مسجلة لهذه الرحلة
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
