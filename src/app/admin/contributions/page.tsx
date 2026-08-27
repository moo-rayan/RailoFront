"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock3,
  Coins,
  Gift,
  Hourglass,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Trophy,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

import { contributionsApi } from "@/lib/api/contributions";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RedemptionStatus, RewardRedemptionRequest } from "@/types";

const numberFormatter = new Intl.NumberFormat("ar-EG");
const distanceFormatter = new Intl.NumberFormat("ar-EG", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

function formatNumber(value: number | null | undefined) {
  return numberFormatter.format(Math.round(Number(value || 0)));
}

function formatDistance(value: number | null | undefined) {
  return `${distanceFormatter.format(Number(value || 0))} كم`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "غير متاح";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متاح";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(status: RedemptionStatus) {
  switch (status) {
    case "pending":
      return "قيد المراجعة";
    case "approved":
      return "مقبول";
    case "fulfilled":
      return "تم التنفيذ";
    case "rejected":
      return "مرفوض";
    case "cancelled":
      return "ملغي";
  }
}

function statusBadgeClass(status: RedemptionStatus) {
  switch (status) {
    case "pending":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "approved":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "fulfilled":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "rejected":
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    case "cancelled":
      return "border-muted bg-muted text-muted-foreground";
  }
}

function userInitial(name?: string | null, email?: string | null) {
  return (name?.trim()?.charAt(0) || email?.trim()?.charAt(0) || "U").toUpperCase();
}

function StatCard({
  title,
  value,
  icon: Icon,
  tone = "primary",
}: {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "primary" | "green" | "amber" | "blue" | "rose";
}) {
  const toneClass = {
    primary: "text-primary bg-primary/10",
    green: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300",
    amber: "text-amber-600 bg-amber-500/10 dark:text-amber-300",
    blue: "text-sky-600 bg-sky-500/10 dark:text-sky-300",
    rose: "text-rose-600 bg-rose-500/10 dark:text-rose-300",
  }[tone];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground md:text-sm">
          {title}
        </CardTitle>
        <div className={cn("rounded-full p-2", toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold md:text-2xl">{value}</div>
      </CardContent>
    </Card>
  );
}

function RedemptionActions({
  item,
  disabled,
  onUpdate,
}: {
  item: RewardRedemptionRequest;
  disabled: boolean;
  onUpdate: (id: string, status: Exclude<RedemptionStatus, "pending">) => void;
}) {
  if (item.status === "fulfilled" || item.status === "rejected" || item.status === "cancelled") {
    return <span className="text-xs text-muted-foreground">لا يوجد إجراء</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {item.status === "pending" && (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onUpdate(item.id, "approved")}
            className="h-8 border-sky-500/40 text-sky-700 hover:bg-sky-500/10 dark:text-sky-300"
          >
            قبول
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onUpdate(item.id, "rejected")}
            className="h-8 border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
          >
            رفض
          </Button>
        </>
      )}
      {item.status === "approved" && (
        <>
          <Button
            size="sm"
            disabled={disabled}
            onClick={() => onUpdate(item.id, "fulfilled")}
            className="h-8"
          >
            تنفيذ
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onUpdate(item.id, "rejected")}
            className="h-8 border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
          >
            رفض
          </Button>
        </>
      )}
    </div>
  );
}

export default function ContributionsPage() {
  const queryClient = useQueryClient();
  const isFullAdmin = useAuthStore((state) => state.admin?.admin_level === "fulladmin");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RedemptionStatus | "all">("all");

  const contributorsQuery = useQuery({
    queryKey: ["reward-contributors", search],
    queryFn: () =>
      contributionsApi.listContributors({
        search: search.trim(),
        sort_by: "points",
        sort_order: "desc",
        limit: 50,
      }),
    staleTime: 20000,
  });

  const redemptionsQuery = useQuery({
    queryKey: ["reward-redemptions", search, statusFilter],
    queryFn: () =>
      contributionsApi.listRedemptions({
        search: search.trim(),
        status: statusFilter,
        limit: 50,
      }),
    staleTime: 10000,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Exclude<RedemptionStatus, "pending">;
    }) => contributionsApi.updateRedemptionStatus(id, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["reward-contributors"] }),
        queryClient.invalidateQueries({ queryKey: ["reward-redemptions"] }),
      ]);
      toast.success("تم تحديث طلب الاستبدال");
    },
    onError: () => toast.error("تعذر تحديث طلب الاستبدال"),
  });

  const stats = contributorsQuery.data?.stats;
  const redemptions = useMemo(
    () => redemptionsQuery.data?.items ?? [],
    [redemptionsQuery.data?.items],
  );
  const contributors = useMemo(
    () => contributorsQuery.data?.items ?? [],
    [contributorsQuery.data?.items],
  );
  const pendingCount = redemptionsQuery.data?.status_counts?.pending ?? 0;

  const refreshAll = () => {
    contributorsQuery.refetch();
    redemptionsQuery.refetch();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">المساهمات</h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            متابعة نقاط المساهمين وطلبات استبدال المكافآت من مكان واحد.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refreshAll}
          disabled={contributorsQuery.isFetching || redemptionsQuery.isFetching}
        >
          <RefreshCw
            className={cn(
              "ml-2 h-4 w-4",
              (contributorsQuery.isFetching || redemptionsQuery.isFetching) && "animate-spin",
            )}
          />
          تحديث
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="المساهمون"
          value={formatNumber(stats?.contributors_count)}
          icon={UserRound}
          tone="primary"
        />
        <StatCard
          title="إجمالي النقاط"
          value={formatNumber(stats?.total_points)}
          icon={Coins}
          tone="amber"
        />
        <StatCard
          title="رصيد متاح"
          value={formatNumber(stats?.available_points)}
          icon={WalletCards}
          tone="green"
        />
        <StatCard
          title="نقاط محجوزة"
          value={formatNumber(stats?.reserved_points)}
          icon={Hourglass}
          tone="blue"
        />
        <StatCard
          title="طلبات معلقة"
          value={formatNumber(pendingCount)}
          icon={Gift}
          tone="rose"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم المستخدم أو البريد أو رقم الهاتف أو رقم المستخدم..."
              className="pr-9"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="contributors" dir="rtl" className="flex flex-col gap-4">
        <TabsList className="h-11 w-fit rounded-xl border bg-card p-1 shadow-sm">
          <TabsTrigger value="contributors" className="h-9 gap-1.5 rounded-lg px-4 text-sm">
            <Trophy className="h-4 w-4" />
            المساهمون
          </TabsTrigger>
          <TabsTrigger value="redemptions" className="h-9 gap-1.5 rounded-lg px-4 text-sm">
            <Gift className="h-4 w-4" />
            طلبات الاستبدال
            {pendingCount > 0 && (
              <Badge className="mr-1 h-5 bg-rose-600 px-1.5 text-white">
                {formatNumber(pendingCount)}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contributors" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ترتيب المساهمين</CardTitle>
            </CardHeader>
            <CardContent>
              {contributorsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-14" />
                  ))}
                </div>
              ) : contributors.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  لا توجد مساهمات مطابقة
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المستخدم</TableHead>
                      <TableHead className="text-right">المساهمات</TableHead>
                      <TableHead className="text-right">المسافة</TableHead>
                      <TableHead className="text-right">إجمالي النقاط</TableHead>
                      <TableHead className="text-right">المتاح</TableHead>
                      <TableHead className="text-right">محجوز</TableHead>
                      <TableHead className="text-right">مستبدل</TableHead>
                      <TableHead className="text-right">آخر مساهمة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contributors.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              {item.avatar_url ? <AvatarImage src={item.avatar_url} /> : null}
                              <AvatarFallback>
                                {userInitial(item.display_name, item.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate font-semibold">
                                {item.display_name || "مستخدم"}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {item.email || item.id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatNumber(item.contribution_count)}
                        </TableCell>
                        <TableCell>{formatDistance(item.total_contribution_distance_km)}</TableCell>
                        <TableCell className="font-semibold text-amber-600 dark:text-amber-300">
                          {formatNumber(item.reward_points_lifetime)}
                        </TableCell>
                        <TableCell className="text-emerald-600 dark:text-emerald-300">
                          {formatNumber(item.reward_points_balance)}
                        </TableCell>
                        <TableCell className="text-sky-600 dark:text-sky-300">
                          {formatNumber(item.reward_points_reserved)}
                        </TableCell>
                        <TableCell>{formatNumber(item.reward_points_redeemed)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(item.last_contribution_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redemptions" className="mt-0 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              الطلبات تخصم النقاط من الرصيد المتاح عند الإرسال وتحجزها حتى المراجعة.
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as RedemptionStatus | "all")}
            >
              <SelectTrigger className="h-9 w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="approved">مقبول</SelectItem>
                <SelectItem value="fulfilled">تم التنفيذ</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">طلبات الاستبدال</CardTitle>
            </CardHeader>
            <CardContent>
              {!isFullAdmin && (
                <div className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                  حساب المراقب يمكنه المتابعة فقط. تنفيذ أو رفض الطلبات يتطلب مسؤول كامل.
                </div>
              )}

              {redemptionsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-16" />
                  ))}
                </div>
              ) : redemptions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  لا توجد طلبات استبدال مطابقة
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المستخدم</TableHead>
                      <TableHead className="text-right">المكافأة</TableHead>
                      <TableHead className="text-right">رقم الشحن</TableHead>
                      <TableHead className="text-right">النقاط</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">تاريخ الطلب</TableHead>
                      <TableHead className="text-right">الملاحظة</TableHead>
                      <TableHead className="text-right">الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redemptions.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              {item.user.avatar_url ? (
                                <AvatarImage src={item.user.avatar_url} />
                              ) : null}
                              <AvatarFallback>
                                {userInitial(item.user.display_name, item.user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate font-semibold">
                                {item.user.display_name || "مستخدم"}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {item.user.email || item.user_id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{item.reward_title_ar}</div>
                          <div className="text-xs text-muted-foreground" dir="ltr">
                            {item.reward_key}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-sm font-semibold" dir="ltr">
                            <Phone className="h-3.5 w-3.5 text-primary" />
                            {item.target_phone || "غير متاح"}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatNumber(item.points_required)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClass(item.status)}>
                            {item.status === "pending" && <Clock3 className="h-3 w-3" />}
                            {item.status === "approved" && <ShieldCheck className="h-3 w-3" />}
                            {item.status === "fulfilled" && <CheckCircle2 className="h-3 w-3" />}
                            {(item.status === "rejected" || item.status === "cancelled") && (
                              <XCircle className="h-3 w-3" />
                            )}
                            {statusLabel(item.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(item.created_at)}
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-muted-foreground">
                          {item.user_note || item.admin_note || "لا توجد"}
                        </TableCell>
                        <TableCell>
                          <RedemptionActions
                            item={item}
                            disabled={!isFullAdmin || updateMutation.isPending}
                            onUpdate={(id, nextStatus) =>
                              updateMutation.mutate({ id, status: nextStatus })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
