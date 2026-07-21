"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  RefreshCw,
  Search,
  Target,
  ThumbsDown,
  ThumbsUp,
  Vote,
} from "lucide-react";

import { feedbackApi, type FeatureVote } from "@/lib/api/feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

function formatNumber(value: number) {
  return value.toLocaleString("ar-EG");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatFeatureKey(value: string) {
  if (value === "station_kiosk_ordering") return "طلبات أكشاك المحطات";
  return value.replace(/_/g, " ");
}

function formatVoteValue(value: string) {
  if (value === "interested") return "مهتم";
  if (value === "not_interested") return "غير مهتم";
  return value.replace(/_/g, " ");
}

function voteBadgeClass(value: string) {
  if (value === "interested") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (value === "not_interested") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
}

function readText(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return "";
}

function targetLabel(vote: FeatureVote) {
  const stationName = readText(vote.context_data, "station_name");
  const stationId = readText(vote.context_data, "station_id") || vote.target_id;
  if (vote.target_type === "station" && stationName) {
    return `${stationName}${stationId ? ` (#${stationId})` : ""}`;
  }
  if (!vote.target_id) return vote.target_type === "global" ? "عام" : vote.target_type;
  return `${vote.target_type}: ${vote.target_id}`;
}

function compactContext(vote: FeatureVote) {
  const parts = [
    readText(vote.context_data, "station_name"),
    readText(vote.context_data, "kiosk_id")
      ? `كشك #${readText(vote.context_data, "kiosk_id")}`
      : "",
    readText(vote.client_metadata, "surface"),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export default function FeedbackVotesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [featureKey, setFeatureKey] = useState("");
  const [voteValue, setVoteValue] = useState("");

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["feature-votes", page, search, featureKey, voteValue],
    queryFn: () =>
      feedbackApi.listVotes({
        page,
        page_size: PAGE_SIZE,
        q: search.trim() || undefined,
        feature_key: featureKey.trim() || undefined,
        vote_value: voteValue || undefined,
      }),
    staleTime: 20000,
  });

  const votes = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const summary = useMemo(() => {
    return new Map((data?.summary ?? []).map((item) => [item.vote_value, item.count]));
  }, [data?.summary]);

  const interestedCount = summary.get("interested") ?? 0;
  const notInterestedCount = summary.get("not_interested") ?? 0;
  const otherCount = Math.max(0, total - interestedCount - notInterestedCount);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">تصويت الميزات</h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            متابعة آراء المستخدمين في الميزات التجريبية ومعرفة سياق كل تصويت.
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
            <CardTitle className="text-sm font-medium">إجمالي التصويتات</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(total)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مهتم</CardTitle>
            <ThumbsUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(interestedCount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">غير مهتم</CardTitle>
            <ThumbsDown className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(notInterestedCount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تصويتات أخرى</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(otherCount)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                placeholder="ابحث بالمستخدم أو المحطة أو الكشك أو الميزة..."
                className="pr-9"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Input
              value={featureKey}
              placeholder="مفتاح الميزة"
              dir="ltr"
              onChange={(event) => {
                setFeatureKey(event.target.value);
                setPage(1);
              }}
            />
            <select
              value={voteValue}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => {
                setVoteValue(event.target.value);
                setPage(1);
              }}
            >
              <option value="">كل التصويتات</option>
              <option value="interested">مهتم</option>
              <option value="not_interested">غير مهتم</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">سجل التصويتات</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="py-8 text-center text-destructive">فشل تحميل التصويتات</div>
          ) : isLoading ? (
            <div className="py-8 text-center text-muted-foreground">جارٍ التحميل...</div>
          ) : votes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              لا توجد تصويتات مطابقة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التوقيت</TableHead>
                    <TableHead className="text-right">الميزة</TableHead>
                    <TableHead className="text-right">التصويت</TableHead>
                    <TableHead className="text-right">الهدف</TableHead>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">السياق</TableHead>
                    <TableHead className="text-right">المصدر</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {votes.map((vote) => (
                    <TableRow key={vote.id}>
                      <TableCell className="min-w-40">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(vote.updated_at || vote.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{formatFeatureKey(vote.feature_key)}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {vote.feature_key}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={voteBadgeClass(vote.vote_value)}>
                          {formatVoteValue(vote.vote_value)}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-44">
                        <div className="font-medium">{targetLabel(vote)}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {vote.target_type}:{vote.target_id || "global"}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-52">
                        <div className="font-medium">
                          {vote.display_name || vote.email || "مستخدم بدون اسم"}
                        </div>
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {vote.user_id}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-56 text-sm text-muted-foreground">
                        {compactContext(vote)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{vote.source || "—"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                السابق
              </Button>
              <span className="text-sm text-muted-foreground">
                صفحة {formatNumber(page)} من {formatNumber(totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                التالي
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
