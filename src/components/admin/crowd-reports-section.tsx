"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/lib/api/contributors"
import type { CrowdReportsResponse, CrowdVoter } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, UserCheck, UserX, Clock } from "lucide-react"

interface CrowdReportsSectionProps {
  trainId: string
}

export function CrowdReportsSection({ trainId }: CrowdReportsSectionProps) {
  const { data: crowdData, isLoading } = useQuery<CrowdReportsResponse>({
    queryKey: ["crowd-reports", trainId],
    queryFn: () => dashboardApi.getCrowdReports(trainId),
    refetchInterval: 10000, // Refresh every 10 seconds
    enabled: !!trainId,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            بلاغات الازدحام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            جاري التحميل...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!crowdData || crowdData.total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            بلاغات الازدحام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            لا توجد بلاغات ازدحام لهذا القطار
          </div>
        </CardContent>
      </Card>
    )
  }

  const crowdedVoters = crowdData.voters.filter((v: CrowdVoter) => v.vote === "crowded")
  const notCrowdedVoters = crowdData.voters.filter((v: CrowdVoter) => v.vote === "not_crowded")

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          بلاغات الازدحام
          <Badge variant="outline" className="mr-auto">
            {crowdData.total} تصويت
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
            <UserX className="h-4 w-4 text-red-500" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">مزدحم</div>
              <div className="text-lg font-bold text-red-600">{crowdData.crowded}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
            <UserCheck className="h-4 w-4 text-green-500" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">غير مزدحم</div>
              <div className="text-lg font-bold text-green-600">{crowdData.not_crowded}</div>
            </div>
          </div>
        </div>

        {/* Voters List */}
        {crowdData.voters.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">قائمة المصوتين</h4>
            <div className="max-h-[250px] overflow-y-auto space-y-1">
              {crowdData.voters.map((voter: CrowdVoter) => (
                <div
                  key={voter.user_id}
                  className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback>
                      {voter.display_name?.charAt(0) || voter.user_id.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {voter.display_name || `مستخدم ${voter.user_id.slice(0, 8)}...`}
                    </div>
                    {voter.ttl_seconds && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        ينتهي خلال {formatTtl(voter.ttl_seconds)}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={voter.vote === "crowded" ? "destructive" : "default"}
                    className={`text-[10px] h-5 ${
                      voter.vote === "crowded"
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    {voter.vote === "crowded" ? "مزدحم" : "عادي"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatTtl(seconds: number): string {
  if (seconds > 3600) {
    return `${Math.ceil(seconds / 3600)} ساعة`
  }
  if (seconds > 60) {
    return `${Math.ceil(seconds / 60)} دقيقة`
  }
  return `${seconds} ثانية`
}
