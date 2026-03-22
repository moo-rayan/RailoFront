"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onConfirm: (reason: string, durationMinutes: number) => void
  isLoading?: boolean
}

const BAN_DURATIONS = [
  { label: "30 دقيقة", value: "30" },
  { label: "ساعة واحدة", value: "60" },
  { label: "3 ساعات", value: "180" },
  { label: "6 ساعات", value: "360" },
  { label: "12 ساعة", value: "720" },
  { label: "24 ساعة", value: "1440" },
  { label: "أسبوع", value: "10080" },
  { label: "حظر دائم", value: "0" },
]

export function BanDialog({
  open,
  onOpenChange,
  userId,
  onConfirm,
  isLoading,
}: BanDialogProps) {
  const [reason, setReason] = useState("")
  const [duration, setDuration] = useState("60")

  const handleConfirm = () => {
    onConfirm(reason, parseInt(duration))
    setReason("")
    setDuration("60")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>حظر مساهم</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            المستخدم: <span className="font-mono font-medium text-foreground">{userId.slice(0, 12)}...</span>
          </div>

          <div className="space-y-2">
            <Label>مدة الحظر</Label>
            <Select value={duration} onValueChange={(v) => v && setDuration(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BAN_DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>السبب (اختياري)</Label>
            <Input
              placeholder="سبب الحظر..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "جاري الحظر..." : "تأكيد الحظر"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
