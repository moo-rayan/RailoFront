"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  Layers3,
  RefreshCw,
  Search,
  Target,
  ThumbsDown,
  ThumbsUp,
  Users,
  Vote,
} from "lucide-react";

import { feedbackApi } from "@/lib/api/feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  formatDate,
  formatFeatureKey,
  formatNumber,
  formatTargetType,
} from "./vote-utils";

export default function FeedbackVotesPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["feature-votes-overview", search],
    queryFn: () =>
      feedbackApi.listVoteOverview({
        q: search.trim() || undefined,
      }),
    staleTime: 20000,
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const stats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.interested += item.interested_count;
        acc.notInterested += item.not_interested_count;
        return acc;
      },
      { interested: 0, notInterested: 0 },
    );
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">تصويت الميزات</h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            كل ميزة في بطاقة منفصلة، وافتح التفاصيل لمعرفة المستخدمين والتصويتات.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("ml-2 h-4 w-4", isFetching && "animate-spin")} />
          تحديث
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">أنواع التصويت</CardTitle>
            <Layers3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data?.total_features ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التصويتات</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data?.total_votes ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مهتم</CardTitle>
            <ThumbsUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.interested)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">غير مهتم</CardTitle>
            <ThumbsDown className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.notInterested)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              placeholder="ابحث باسم الميزة أو المستخدم أو المحطة..."
              className="pr-9"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            فشل تحميل تصويتات الميزات
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            لا توجد تصويتات مطابقة
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => {
            const positiveRatio = item.total > 0 ? Math.round((item.interested_count / item.total) * 100) : 0;
            return (
              <Link
                key={item.feature_key}
                href={`/admin/feedback-votes/${encodeURIComponent(item.feature_key)}`}
                className="group block"
              >
                <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{formatFeatureKey(item.feature_key)}</CardTitle>
                        <div className="mt-1 text-xs text-muted-foreground" dir="ltr">
                          {item.feature_key}
                        </div>
                      </div>
                      <div className="rounded-full bg-primary/10 p-2 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <ArrowLeft className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.target_types.map((targetType) => (
                        <Badge key={targetType} variant="secondary">
                          {formatTargetType(targetType)}
                        </Badge>
                      ))}
                      {item.sources.slice(0, 3).map((source) => (
                        <Badge key={source} variant="outline">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border bg-background/70 p-3">
                        <div className="text-xs text-muted-foreground">التصويتات</div>
                        <div className="mt-1 text-xl font-bold">{formatNumber(item.total)}</div>
                      </div>
                      <div className="rounded-lg border bg-background/70 p-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          المستخدمون
                        </div>
                        <div className="mt-1 text-xl font-bold">{formatNumber(item.users_count)}</div>
                      </div>
                      <div className="rounded-lg border bg-background/70 p-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Target className="h-3.5 w-3.5" />
                          الأهداف
                        </div>
                        <div className="mt-1 text-xl font-bold">{formatNumber(item.targets_count)}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">نسبة المهتمين</span>
                        <span className="font-semibold">{formatNumber(positiveRatio)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${positiveRatio}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-md bg-emerald-500/10 px-2 py-1 text-center text-emerald-700 dark:text-emerald-300">
                          مهتم {formatNumber(item.interested_count)}
                        </div>
                        <div className="rounded-md bg-rose-500/10 px-2 py-1 text-center text-rose-700 dark:text-rose-300">
                          غير مهتم {formatNumber(item.not_interested_count)}
                        </div>
                        <div className="rounded-md bg-sky-500/10 px-2 py-1 text-center text-sky-700 dark:text-sky-300">
                          أخرى {formatNumber(item.other_count)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      آخر تحديث: {formatDate(item.latest_at)}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
