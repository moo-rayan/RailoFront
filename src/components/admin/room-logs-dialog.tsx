"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/lib/api/contributors"
import type { RoomEvent } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface RoomLogsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trainId: string
}

const eventTypeLabels: Record<string, { label: string; color: string }> = {
  join: { label: "انضمام", color: "bg-green-500" },
  leave: { label: "مغادرة", color: "bg-gray-400" },
  kick: { label: "طرد", color: "bg-red-500" },
  ban: { label: "حظر", color: "bg-red-700" },
  leader_set: { label: "تعيين ليدر", color: "bg-blue-500" },
  leader_removed: { label: "إزالة ليدر", color: "bg-orange-500" },
  update: { label: "تحديث", color: "bg-emerald-400" },
  far_warning: { label: "تحذير بُعد", color: "bg-yellow-500" },
  silent_disconnect: { label: "قطع صامت", color: "bg-red-400" },
}

function formatTime(ts: number) {
  if (!ts) return "-"
  return new Date(ts * 1000).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function RoomLogsDialog({
  open,
  onOpenChange,
  trainId,
}: RoomLogsDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["room-logs", trainId],
    queryFn: () => dashboardApi.getRoomLogs(trainId),
    enabled: open && !!trainId,
    refetchInterval: open ? 5000 : false,
  })

  const logs = data?.logs ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            سجل الأحداث - قطار {trainId}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            جاري تحميل السجل...
          </div>
        )}

        {!isLoading && logs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد أحداث مسجلة
          </div>
        )}

        {logs.length > 0 && (
          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
            {[...logs].reverse().map((event: RoomEvent, idx: number) => {
              const meta = eventTypeLabels[event.event_type] || {
                label: event.event_type,
                color: "bg-gray-300",
              }
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card text-sm"
                >
                  <div className="flex flex-col items-center gap-1 min-w-[60px]">
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatTime(event.timestamp)}
                    </span>
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${meta.color}`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {meta.label}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {event.user_id.slice(0, 8)}...
                      </span>
                    </div>
                    {event.detail && (
                      <p className="text-xs text-muted-foreground">
                        {event.detail}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
