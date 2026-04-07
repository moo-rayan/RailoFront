"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { trainsApi } from "@/lib/api/trains"
import { Train } from "@/types"
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

const trainSchema = z.object({
  train_id: z.string().min(1, "رقم القطار مطلوب"),
  type_ar: z.string().min(1, "النوع بالعربي مطلوب"),
  type_en: z.string().min(1, "النوع بالإنجليزي مطلوب"),
  start_station_ar: z.string().min(1, "محطة البداية بالعربي مطلوبة"),
  start_station_en: z.string().min(1, "محطة البداية بالإنجليزي مطلوبة"),
  end_station_ar: z.string().min(1, "محطة النهاية بالعربي مطلوبة"),
  end_station_en: z.string().min(1, "محطة النهاية بالإنجليزي مطلوبة"),
  stops_count: z.string().min(1, "عدد المحطات مطلوب"),
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
]

export function TrainFormDialog({
  open,
  onOpenChange,
  train,
  mode,
}: TrainFormDialogProps) {
  const queryClient = useQueryClient()

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
      note_ar: "",
      note_en: "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        train_id: train?.train_id ?? "",
        type_ar: train?.type_ar ?? "",
        type_en: train?.type_en ?? "",
        start_station_ar: train?.start_station_ar ?? "",
        start_station_en: train?.start_station_en ?? "",
        end_station_ar: train?.end_station_ar ?? "",
        end_station_en: train?.end_station_en ?? "",
        stops_count: train?.stops_count?.toString() ?? "",
        note_ar: train?.note_ar ?? "",
        note_en: train?.note_en ?? "",
      })
    }
  }, [open, train, form])

  const createMutation = useMutation({
    mutationFn: trainsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trains"] })
      toast.success("تم إضافة القطار بنجاح")
      onOpenChange(false)
      form.reset()
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
    const payload = {
      ...data,
      stops_count: parseInt(data.stops_count),
    }

    if (mode === "create") {
      createMutation.mutate(payload)
    } else if (train?.train_id) {
      updateMutation.mutate({ trainNumber: train.train_id, data: payload })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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

            {/* Start Station */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_station_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>محطة البداية (عربي) *</FormLabel>
                    <FormControl>
                      <Input placeholder="القاهرة" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_station_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>محطة البداية (English) *</FormLabel>
                    <FormControl>
                      <Input placeholder="Cairo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* End Station */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="end_station_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>محطة النهاية (عربي) *</FormLabel>
                    <FormControl>
                      <Input placeholder="الإسكندرية" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_station_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>محطة النهاية (English) *</FormLabel>
                    <FormControl>
                      <Input placeholder="Alexandria" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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
