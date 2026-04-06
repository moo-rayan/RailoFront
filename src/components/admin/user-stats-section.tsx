"use client"

import { useQuery } from "@tanstack/react-query"
import { usersApi } from "@/lib/api/users"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, UserPlus, TrendingUp, CalendarDays } from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useState } from "react"

type ChartView = "daily" | "weekly"

export function UserStatsSection() {
  const [chartView, setChartView] = useState<ChartView>("daily")

  const { data: stats, isLoading } = useQuery({
    queryKey: ["user-stats"],
    queryFn: () => usersApi.getStats(),
    refetchInterval: 60000,
  })

  const statCards = [
    {
      title: "إجمالي المستخدمين",
      value: stats?.total_users ?? "-",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "مستخدمون جدد (أسبوعي)",
      value: stats?.weekly_new ?? "-",
      icon: UserPlus,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "مستخدمون جدد (شهري)",
      value: stats?.monthly_new ?? "-",
      icon: TrendingUp,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
    {
      title: "متوسط يومي (30 يوم)",
      value: stats ? Math.round(stats.monthly_new / 30) : "-",
      icon: CalendarDays,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ]

  const chartData =
    chartView === "daily"
      ? (stats?.daily ?? []).map((d) => ({
          label: formatDailyLabel(d.date),
          count: d.count,
        }))
      : (stats?.weekly ?? []).map((w) => ({
          label: formatWeeklyLabel(w.week),
          count: w.count,
        }))

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-1 rounded-full bg-primary" />
        <h2 className="text-lg md:text-xl font-bold">إحصائيات المستخدمين</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <div className="text-2xl md:text-3xl font-bold tracking-tight">
                  {typeof stat.value === "number"
                    ? stat.value.toLocaleString("ar-EG")
                    : stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            نمو المستخدمين الجدد
          </CardTitle>
          <div className="flex gap-1 p-1 rounded-lg bg-muted">
            <button
              onClick={() => setChartView("daily")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                chartView === "daily"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              يومي (30 يوم)
            </button>
            <button
              onClick={() => setChartView("weekly")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                chartView === "weekly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              أسبوعي (12 أسبوع)
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <Skeleton className="h-[280px] w-full rounded-lg" />
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
              لا توجد بيانات
            </div>
          ) : chartView === "daily" ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.4} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorCount)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, fill: "hsl(var(--primary))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.4} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--primary))"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-primary font-bold">
        {payload[0].value.toLocaleString("ar-EG")} مستخدم جديد
      </p>
    </div>
  )
}

function formatDailyLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function formatWeeklyLabel(weekStr: string): string {
  const d = new Date(weekStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}
