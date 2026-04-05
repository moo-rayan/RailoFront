"use client"

import { useState, useRef } from "react"
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
  Headphones,
  Bell,
} from "lucide-react"

export default function ContributorsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  // Client-side session cache: remember rooms that had contributors during this session
  const cachedRoomsRef = useRef<Record<string, LiveRoom>>({})

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ["live-rooms"],
    queryFn: () => dashboardApi.getRooms(),
    refetchInterval: 5000,
  })

  // Merge API rooms with client-side cache
  const apiRooms = roomsData?.rooms ?? []
  const activeIds = new Set<string>()

  // Update cache with latest API data
  for (const room of apiRooms) {
    activeIds.add(room.train_id)
    cachedRoomsRef.current[room.train_id] = room
  }

  // For rooms not in current API response but in cache, mark as historical
  for (const tid of Object.keys(cachedRoomsRef.current)) {
    if (!activeIds.has(tid)) {
      cachedRoomsRef.current[tid] = {
        ...cachedRoomsRef.current[tid],
        contributors_count: 0,
        contributors: [],
        waiting_count: 0,
        waiting_list: [],
        listeners_count: 0,
        status: "ended",
        is_historical: true,
      }
    }
  }

  // Sort: active contributors first → active rooms → historical
  const rooms = Object.values(cachedRoomsRef.current).sort((a, b) => {
    if (a.contributors_count > 0 && b.contributors_count === 0) return -1
    if (a.contributors_count === 0 && b.contributors_count > 0) return 1
    if (!a.is_historical && b.is_historical) return -1
    if (a.is_historical && !b.is_historical) return 1
    return a.train_id.localeCompare(b.train_id)
  })
  const totalContributors = roomsData?.total_contributors ?? 0
  const totalWaiting = roomsData?.total_waiting ?? 0
  const totalListeners = rooms.reduce((sum, room) => sum + (room.listeners_count || 0), 0)

  const filteredRooms = rooms.filter((room: LiveRoom) =>
    room.train_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusLabel = (s: string) => {
    switch (s) {
      case "moving": return "متحرك"
      case "stopped": return "متوقف"
      case "ended": return "انتهت المساهمة"
      default: return "في الانتظار"
    }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case "moving": return "bg-green-500"
      case "stopped": return "bg-yellow-500"
      case "ended": return "bg-gray-500"
      default: return "bg-gray-400"
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">التتبع الحي</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          إدارة غرف التتبع والمساهمين في الوقت الحقيقي
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">غرف نشطة</CardTitle>
            <Radio className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-primary">{rooms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">مساهمين</CardTitle>
            <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{totalContributors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">مستمعين</CardTitle>
            <Headphones className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-blue-600">{totalListeners}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">في الانتظار</CardTitle>
            <Hourglass className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{totalWaiting}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">بيانات حية</CardTitle>
            <Zap className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xs md:text-sm text-muted-foreground">تحديث كل 5 ثوانٍ</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative w-full md:max-w-sm">
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
              className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${
                room.is_historical ? "opacity-60 border-dashed" : ""
              }`}
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
                  {room.listeners_count > 0 && (
                    <div className="flex items-center gap-1">
                      <Headphones className="h-3.5 w-3.5 text-blue-500" />
                      <span className="font-medium text-blue-600">{room.listeners_count}</span>
                      <span className="text-muted-foreground">مستمع</span>
                    </div>
                  )}
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
                {room.contributors.length > 0 ? (
                  <div className="flex items-center justify-between pt-1">
                    <AvatarGroup>
                      {room.contributors.slice(0, 5).map((c) => (
                        <div key={c.user_id} className="relative">
                          <Avatar size="sm">
                            {c.avatar_url ? <AvatarImage src={c.avatar_url} /> : null}
                            <AvatarFallback>
                              {c.display_name?.charAt(0) || c.user_id.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {c.is_silent && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-900" title="مساهمة صامتة">
                              <Bell className="h-2 w-2 text-white" />
                            </span>
                          )}
                        </div>
                      ))}
                    </AvatarGroup>
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground opacity-60">
                    <span>لا يوجد مساهمين حالياً — الغرفة محفوظة مؤقتاً</span>
                    <ChevronLeft className="h-4 w-4" />
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
