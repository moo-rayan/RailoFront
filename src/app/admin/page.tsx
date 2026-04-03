"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/lib/api/contributors"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Train, Calendar, Radio } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardApi.getStats(),
    refetchInterval: 30000,
  })

  const { data: roomsData } = useQuery({
    queryKey: ["live-rooms-summary"],
    queryFn: () => dashboardApi.getRooms(),
    refetchInterval: 15000,
  })

  const rooms = roomsData?.rooms ?? []

  const statCards = [
    {
      title: "إجمالي المحطات",
      value: stats?.stations ?? "-",
      icon: MapPin,
      description: "محطة في النظام",
    },
    {
      title: "إجمالي القطارات",
      value: stats?.trains ?? "-",
      icon: Train,
      description: "قطار مسجل",
    },
    {
      title: "إجمالي الرحلات",
      value: stats?.trips ?? "-",
      icon: Calendar,
      description: "رحلة في النظام",
    },
    {
      title: "تتبع حي",
      value: stats?.active_rooms ?? "-",
      icon: Radio,
      description: "قطار يُتتبع الآن",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          نظرة عامة على نظام السكك الحديدية المصرية
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-xl md:text-2xl font-bold">{stat.value}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Tracking Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Radio className="h-5 w-5 text-primary" />
            التتبع الحي
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              لا يوجد قطارات يتم تتبعها حالياً
            </div>
          ) : (
            <div className="space-y-4">
              {rooms.map((room) => (
                <div key={room.train_id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Train className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium font-mono">قطار {room.train_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {room.contributors_count} مساهم
                        {room.waiting_count > 0 && ` • ${room.waiting_count} انتظار`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:mr-auto">
                    {room.speed > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {room.speed.toFixed(1)} كم/س
                      </span>
                    )}
                    <Badge variant={room.status === "moving" ? "default" : "secondary"} className="text-xs">
                      {room.status === "moving" ? "متحرك" : room.status === "stopped" ? "متوقف" : "انتظار"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
