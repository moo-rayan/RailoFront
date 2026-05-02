"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { stationsApi } from "@/lib/api/stations"
import { Station } from "@/types"
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
import { toast } from "sonner"

const stationSchema = z.object({
  name_ar: z.string().min(1, "الاسم بالعربي مطلوب"),
  name_en: z.string().min(1, "الاسم بالإنجليزي مطلوب"),
  audio_id: z.string().min(1, "Audio ID مطلوب").max(10, "Audio ID أقصى 10 حروف"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  place_id: z.string().optional(),
})

type StationFormValues = z.infer<typeof stationSchema>

interface StationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  station?: Station
  mode: "create" | "edit"
}

export function StationFormDialog({
  open,
  onOpenChange,
  station,
  mode,
}: StationFormDialogProps) {
  const queryClient = useQueryClient()

  const form = useForm<StationFormValues>({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      name_ar: "",
      name_en: "",
      audio_id: "",
      latitude: "",
      longitude: "",
      place_id: "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name_ar: station?.name_ar ?? "",
        name_en: station?.name_en ?? "",
        audio_id: station?.audio_id ?? "",
        latitude: station?.latitude?.toString() ?? "",
        longitude: station?.longitude?.toString() ?? "",
        place_id: station?.place_id ?? "",
      })
    }
  }, [open, station, form])

  const createMutation = useMutation({
    mutationFn: stationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations"] })
      toast.success("تم إضافة المحطة بنجاح")
      onOpenChange(false)
      form.reset()
    },
    onError: () => {
      toast.error("حدث خطأ أثناء إضافة المحطة")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      stationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations"] })
      toast.success("تم تحديث المحطة بنجاح")
      onOpenChange(false)
    },
    onError: () => {
      toast.error("حدث خطأ أثناء تحديث المحطة")
    },
  })

  const onSubmit = (data: StationFormValues) => {
    const payload = {
      name_ar: data.name_ar,
      name_en: data.name_en,
      audio_id: data.audio_id,
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
      place_id: data.place_id || null,
    }

    if (mode === "create") {
      createMutation.mutate(payload)
    } else if (station?.id) {
      updateMutation.mutate({ id: station.id, data: payload })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "إضافة محطة جديدة" : "تعديل المحطة"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "أدخل بيانات المحطة الجديدة"
              : "تعديل بيانات المحطة"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Arabic Name */}
            <FormField
              control={form.control}
              name="name_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم بالعربي *</FormLabel>
                  <FormControl>
                    <Input placeholder="القاهرة" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* English Name */}
            <FormField
              control={form.control}
              name="name_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم بالإنجليزي *</FormLabel>
                  <FormControl>
                    <Input placeholder="Cairo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Audio ID */}
            <FormField
              control={form.control}
              name="audio_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Audio ID *</FormLabel>
                  <FormControl>
                    <Input placeholder="0001" className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>خط العرض (Latitude)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="30.0444"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>خط الطول (Longitude)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="31.2357"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Place ID */}
            <FormField
              control={form.control}
              name="place_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Place ID (Google Maps)</FormLabel>
                  <FormControl>
                    <Input placeholder="ChIJ..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
