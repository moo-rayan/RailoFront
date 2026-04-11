"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/lib/api/contributors"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Train, Users, ThumbsUp, ThumbsDown } from "lucide-react"
import type { CrowdVoter } from "@/types"

export function CrowdReportsSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["crowd-reports"],
    queryFn: () => dashboardApi.getCrowdReports(),
    refetchInterval: 30000,
    retry: 1,
  })

  const trains = data?.trains ?? []

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Users className="h-5 w-5 text-orange-500" />
            بلاغات الازدحام
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Users className="h-5 w-5 text-orange-500" />
            بلاغات الازدحام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            تعذر تحميل بلاغات الازدحام
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <Users className="h-5 w-5 text-orange-500" />
          بلاغات الازدحام
          {trains.length > 0 && (
            <Badge variant="secondary" className="text-xs mr-2">
              {trains.length} قطار
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trains.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            لا توجد بلاغات ازدحام حالياً
          </div>
        ) : (
          <div className="space-y-5">
            {trains.map((train) => (
              <div
                key={train.train_id}
                className="border rounded-lg p-4 space-y-3"
              >
                {/* Train header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                      <Train className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium font-mono">
                        قطار {train.train_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {train.total_votes} بلاغ
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:mr-auto">
                    {train.crowded > 0 && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <ThumbsDown className="h-3 w-3" />
                        مزدحم {train.crowded}
                      </Badge>
                    )}
                    {train.not_crowded > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs gap-1 border-green-500 text-green-600"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        غير مزدحم {train.not_crowded}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Voters list */}
                {train.voters.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      المبلّغون ({train.voters.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {train.voters.map((voter: CrowdVoter) => (
                        <div
                          key={voter.user_id}
                          className="flex items-center gap-2 bg-muted/50 rounded-full pl-1 pr-3 py-1"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={voter.avatar_url}
                              alt={voter.display_name}
                            />
                            <AvatarFallback className="text-[10px]">
                              {voter.display_name?.charAt(0) || "؟"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">
                            {voter.display_name}
                          </span>
                          {voter.vote === "crowded" ? (
                            <ThumbsDown className="h-3 w-3 text-red-500" />
                          ) : (
                            <ThumbsUp className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
