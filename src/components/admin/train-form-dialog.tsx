"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { trainsApi } from "@/lib/api/trains"
import { stationsApi } from "@/lib/api/stations"
import { Train, Station } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Search, X, Loader2, MapPin } from "lucide-react"

const trainSchema = z.object({
  train_id: z.string().min(1, "رقم القطار مطلوب"),
  type_ar: z.string().min(1, "النوع بالعربي مطلوب"),
  type_en: z.string().min(1, "النوع بالإنجليزي مطلوب"),
  start_station_ar: z.string().min(1, "محطة البداية مطلوبة"),
  start_station_en: z.string().min(1, "محطة البداية مطلوبة"),
  end_station_ar: z.string().min(1, "محطة النهاية مطلوبة"),
  end_station_en: z.string().min(1, "محطة النهاية مطلوبة"),
  stops_count: z.string().min(1, "عدد المحطات مطلوب"),
  departure_time: z.string().optional(),
  departure_period: z.string().optional(),
  arrival_time: z.string().optional(),
  arrival_period: z.string().optional(),
  note_ar: z.string().optional(),
  note_en: z.string().optional(),
})

type TrainFormValues = z.infer<typeof trainSchema>

interface TrainFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  train?: Train
  mode: "create" | "edit"
}

const trainTypes = [
  { ar: "محسن", en: "Improved" },
  { ar: "مكيف روسي", en: "AC Russian" },
  { ar: "روسي", en: "Russian" },
  { ar: "مكيف", en: "AC" },
  { ar: "خاص", en: "VIP" },
  { ar: "نوم", en: "Sleep" },
  { ar: "مختلط", en: "Mix" },
  { ar: "تالجو", en: "Talgo" },
  { ar: "إسباني", en: "Spanish" },
  { ar: "ثانية مكيفة فاخرة", en: "Premium AC" },
]

/** Parse "5:30 ص" or "5:30 AM" into { time: "5:30", period: "ص" } */
function parseTimeStr(str: string): { time: string; period: string } {
  if (!str || !str.trim()) return { time: "", period: "ص" }
  const trimmed = str.trim()
  const parts = trimmed.split(" ")
  if (parts.length === 2) {
    const p = parts[1]
    const period = (p === "م" || p === "PM" || p === "pm") ? "م" : "ص"
    return { time: parts[0], period }
  }
  return { time: trimmed, period: "ص" }
}

/** Station search dropdown component */
function StationSearchField({
  label,
  selectedStation,
  onSelect,
  placeholder,
}: {
  label: string
  selectedStation: { name_ar: string; name_en: string } | null
  onSelect: (station: Station) => void
  placeholder: string
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Station[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowResults(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await stationsApi.search(query.trim(), 1, 10)
        setResults(res.items)
        setShowResults(true)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  const handleClear = useCallback(() => {
    onSelect({ id: 0, name_ar: "", name_en: "", latitude: null, longitude: null, place_id: null, is_active: true, created_at: "", updated_at: "" })
    setQuery("")
  }, [onSelect])

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div ref={ref} className="relative">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={placeholder}
            value={selectedStation?.name_ar ? selectedStation.name_ar : query}
            onChange={(e) => {
              if (selectedStation?.name_ar) handleClear()
              setQuery(e.target.value)
            }}
            className="pr-9 text-right"
            onFocus={() => results.length > 0 && setShowResults(true)}
          />
          {selectedStation?.name_ar && (
            <button
              type="button"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={handleClear}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {isSearching && !selectedStation?.name_ar && (
            <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>

        {showResults && results.length > 0 && !selectedStation?.name_ar && (
          <div className="absolute top-full mt-1 w-full z-50 bg-card border rounded-lg shadow-lg max-h-52 overflow-y-auto">
            {results.map((station) => (
              <button
                type="button"
                key={station.id}
                className="w-full text-right px-3 py-2 hover:bg-accent flex items-center gap-2 text-sm border-b last:border-0"
                onClick={() => {
                  onSelect(station)
                  setQuery("")
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
        {showResults && results.length === 0 && !isSearching && query.length > 0 && !selectedStation?.name_ar && (
          <div className="absolute top-full mt-1 w-full z-50 bg-card border rounded-lg shadow-lg px-3 py-2 text-sm text-muted-foreground text-center">
            لا توجد نتائج
          </div>
        )}
      </div>
      {selectedStation?.name_en && (
        <p className="text-xs text-muted-foreground">{selectedStation.name_en}</p>
      )}
    </div>
  )
}

/** Time input with AM/PM toggle */
function TimeInput({
  label,
  time,
  period,
  onTimeChange,
  onPeriodChange,
}: {
  label: string
  time: string
  period: string
  onTimeChange: (v: string) => void
  onPeriodChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-1.5">
        <Input
          placeholder="5:30"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="text-center w-24"
        />
        <div className="flex rounded-md border overflow-hidden shrink-0">
          {(["ص", "م"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPeriodChange(p)}
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
    </div>
  )
}

export function TrainFormDialog({
  open,
  onOpenChange,
  train,
  mode,
}: TrainFormDialogProps) {
  const queryClient = useQueryClient()

  // Station selection state
  const [startStation, setStartStation] = useState<{ name_ar: string; name_en: string } | null>(null)
  const [endStation, setEndStation] = useState<{ name_ar: string; name_en: string } | null>(null)

  const form = useForm<TrainFormValues>({
    resolver: zodResolver(trainSchema),
    defaultValues: {
      train_id: "",
      type_ar: "",
      type_en: "",
      start_station_ar: "",
      start_station_en: "",
      end_station_ar: "",
      end_station_en: "",
      stops_count: "",
      departure_time: "",
      departure_period: "ص",
      arrival_time: "",
      arrival_period: "ص",
      note_ar: "",
      note_en: "",
    },
  })

  useEffect(() => {
    if (open) {
      const depParsed = parseTimeStr(train?.departure_ar ?? "")
      const arrParsed = parseTimeStr(train?.arrival_ar ?? "")

      form.reset({
        train_id: train?.train_id ?? "",
        type_ar: train?.type_ar ?? "",
        type_en: train?.type_en ?? "",
        start_station_ar: train?.start_station_ar ?? "",
        start_station_en: train?.start_station_en ?? "",
        end_station_ar: train?.end_station_ar ?? "",
        end_station_en: train?.end_station_en ?? "",
        stops_count: train?.stops_count?.toString() ?? "",
        departure_time: depParsed.time,
        departure_period: depParsed.period,
        arrival_time: arrParsed.time,
        arrival_period: arrParsed.period,
        note_ar: train?.note_ar ?? "",
        note_en: train?.note_en ?? "",
      })

      if (train?.start_station_ar) {
        setStartStation({ name_ar: train.start_station_ar, name_en: train.start_station_en })
      } else {
        setStartStation(null)
      }
      if (train?.end_station_ar) {
        setEndStation({ name_ar: train.end_station_ar, name_en: train.end_station_en })
      } else {
        setEndStation(null)
      }
    }
  }, [open, train, form])

  const createMutation = useMutation({
    mutationFn: trainsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trains"] })
      toast.success("تم إضافة القطار بنجاح")
      onOpenChange(false)
      form.reset()
      setStartStation(null)
      setEndStation(null)
    },
    onError: () => {
      toast.error("حدث خطأ أثناء إضافة القطار")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ trainNumber, data }: { trainNumber: string; data: any }) =>
      trainsApi.update(trainNumber, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trains"] })
      toast.success("تم تحديث القطار بنجاح")
      onOpenChange(false)
    },
    onError: () => {
      toast.error("حدث خطأ أثناء تحديث القطار")
    },
  })

  const onSubmit = (data: TrainFormValues) => {
    const depTime = data.departure_time?.trim() ?? ""
    const arrTime = data.arrival_time?.trim() ?? ""
    const depPeriod = data.departure_period ?? "ص"
    const arrPeriod = data.arrival_period ?? "ص"

    const payload = {
      train_id: data.train_id,
      type_ar: data.type_ar,
      type_en: data.type_en,
      start_station_ar: data.start_station_ar,
      start_station_en: data.start_station_en,
      end_station_ar: data.end_station_ar,
      end_station_en: data.end_station_en,
      stops_count: parseInt(data.stops_count),
      departure_ar: depTime ? `${depTime} ${depPeriod}` : "",
      departure_en: depTime ? `${depTime} ${depPeriod === "ص" ? "AM" : "PM"}` : "",
      arrival_ar: arrTime ? `${arrTime} ${arrPeriod}` : "",
      arrival_en: arrTime ? `${arrTime} ${arrPeriod === "ص" ? "AM" : "PM"}` : "",
      note_ar: data.note_ar ?? "",
      note_en: data.note_en ?? "",
    }

    if (mode === "create") {
      createMutation.mutate(payload)
    } else if (train?.train_id) {
      updateMutation.mutate({ trainNumber: train.train_id, data: payload })
    }
  }

  const handleStartStationSelect = useCallback((station: Station) => {
    if (station.name_ar) {
      setStartStation({ name_ar: station.name_ar, name_en: station.name_en })
      form.setValue("start_station_ar", station.name_ar)
      form.setValue("start_station_en", station.name_en)
    } else {
      setStartStation(null)
      form.setValue("start_station_ar", "")
      form.setValue("start_station_en", "")
    }
  }, [form])

  const handleEndStationSelect = useCallback((station: Station) => {
    if (station.name_ar) {
      setEndStation({ name_ar: station.name_ar, name_en: station.name_en })
      form.setValue("end_station_ar", station.name_ar)
      form.setValue("end_station_en", station.name_en)
    } else {
      setEndStation(null)
      form.setValue("end_station_ar", "")
      form.setValue("end_station_en", "")
    }
  }, [form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "إضافة قطار جديد" : "تعديل القطار"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "أدخل بيانات القطار الجديد"
              : "تعديل بيانات القطار"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Train ID */}
            <FormField
              control={form.control}
              name="train_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم القطار *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123"
                      disabled={mode === "edit"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Train Type */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>النوع (عربي) *</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val)
                        const match = trainTypes.find((t) => t.ar === val)
                        if (match) form.setValue("type_en", match.en)
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trainTypes.map((type) => (
                          <SelectItem key={type.ar} value={type.ar}>
                            {type.ar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>النوع (English) *</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val)
                        const match = trainTypes.find((t) => t.en === val)
                        if (match) form.setValue("type_ar", match.ar)
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trainTypes.map((type) => (
                          <SelectItem key={type.en} value={type.en}>
                            {type.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Start Station — searchable */}
            <div className="grid grid-cols-1 gap-4">
              <StationSearchField
                label="محطة البداية *"
                selectedStation={startStation}
                onSelect={handleStartStationSelect}
                placeholder="ابحث عن محطة البداية..."
              />
              <FormField
                control={form.control}
                name="start_station_ar"
                render={() => <FormItem className="hidden"><FormMessage /></FormItem>}
              />
            </div>

            {/* End Station — searchable */}
            <div className="grid grid-cols-1 gap-4">
              <StationSearchField
                label="محطة النهاية *"
                selectedStation={endStation}
                onSelect={handleEndStationSelect}
                placeholder="ابحث عن محطة النهاية..."
              />
              <FormField
                control={form.control}
                name="end_station_ar"
                render={() => <FormItem className="hidden"><FormMessage /></FormItem>}
              />
            </div>

            {/* Departure & Arrival Times */}
            <div className="grid grid-cols-2 gap-4">
              <TimeInput
                label="وقت القيام"
                time={form.watch("departure_time") ?? ""}
                period={form.watch("departure_period") ?? "ص"}
                onTimeChange={(v) => form.setValue("departure_time", v)}
                onPeriodChange={(v) => form.setValue("departure_period", v)}
              />
              <TimeInput
                label="وقت الوصول"
                time={form.watch("arrival_time") ?? ""}
                period={form.watch("arrival_period") ?? "ص"}
                onTimeChange={(v) => form.setValue("arrival_time", v)}
                onPeriodChange={(v) => form.setValue("arrival_period", v)}
              />
            </div>

            {/* Stops Count */}
            <FormField
              control={form.control}
              name="stops_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عدد المحطات *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="note_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات (عربي)</FormLabel>
                    <FormControl>
                      <Input placeholder="ملاحظات إضافية..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="note_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات (English)</FormLabel>
                    <FormControl>
                      <Input placeholder="Additional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {mode === "create" ? "إضافة" : "تحديث"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
