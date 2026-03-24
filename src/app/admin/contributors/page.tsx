"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { dashboardApi } from "@/lib/api/contributors"
import type { LiveRoom } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
import {
  Users,
  Train,
  MapPin,
  Radio,
  Search,
  Crown,
  Hourglass,
  Zap,
  ChevronLeft,
} from "lucide-react"

export default function ContributorsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ["live-rooms"],
    queryFn: () => dashboardApi.getRooms(),
    refetchInterval: 5000,
  })

  const rooms = roomsData?.rooms ?? []
  const totalContributors = roomsData?.total_contributors ?? 0
  const totalWaiting = roomsData?.total_waiting ?? 0

  const filteredRooms = rooms.filter((room: LiveRoom) =>
    room.train_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusLabel = (s: string) => {
    switch (s) {
      case "moving": return "متحرك"
      case "stopped": return "متوقف"
      default: return "في الانتظار"
    }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case "moving": return "bg-green-500"
      case "stopped": return "bg-yellow-500"
      default: return "bg-gray-400"
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">التتبع الحي</h1>
        <p className="text-muted-foreground mt-1">
          إدارة غرف التتبع والمساهمين في الوقت الحقيقي
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">غرف نشطة</CardTitle>
            <Radio className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{rooms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مساهمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContributors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">في الانتظار</CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWaiting}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">بيانات حية</CardTitle>
            <Zap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">تحديث كل 5 ثوانٍ</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث برقم القطار..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-9"
        />
      </div>

      {/* Train Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-24 mb-3" />
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Radio className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">لا توجد غرف تتبع نشطة</h3>
              <p className="text-muted-foreground text-sm">
                ستظهر هنا عندما يبدأ مساهم في تتبع قطار
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room: LiveRoom) => (
            <Card
              key={room.train_id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
              onClick={() => router.push(`/admin/contributors/${room.train_id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Train className="h-5 w-5 text-primary" />
                    <span className="font-mono text-lg font-bold">{room.train_id}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${statusColor(room.status)}`} />
                    <Badge variant="outline" className="text-xs">{statusLabel(room.status)}</Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Route */}
                {(room.start_station || room.end_station) && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{room.start_station || "?"} → {room.end_station || "?"}</span>
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{room.contributors_count}</span>
                    <span className="text-muted-foreground">مساهم</span>
                  </div>
                  {room.waiting_count > 0 && (
                    <div className="flex items-center gap-1">
                      <Hourglass className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{room.waiting_count}</span>
                      <span className="text-muted-foreground">انتظار</span>
                    </div>
                  )}
                  {room.speed > 0 && (
                    <span className="font-mono text-xs text-muted-foreground mr-auto">
                      {room.speed.toFixed(0)} كم/س
                    </span>
                  )}
                </div>

                {/* Leader indicator */}
                {room.leader_id && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded px-2 py-1">
                    <Crown className="h-3 w-3" />
                    <span>يوجد ليدر مُعيّن</span>
                  </div>
                )}

                {/* Contributor avatars */}
                {room.contributors.length > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <AvatarGroup>
                      {room.contributors.slice(0, 5).map((c) => (
                        <Avatar key={c.user_id} size="sm">
                          {c.avatar_url ? <AvatarImage src={c.avatar_url} /> : null}
                          <AvatarFallback>
                            {c.display_name?.charAt(0) || c.user_id.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </AvatarGroup>
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
