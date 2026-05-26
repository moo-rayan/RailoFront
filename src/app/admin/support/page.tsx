"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supportApi, type ContactMessage, type ProblemReport } from "@/lib/api/support"
import {
  Mail, Bug, Clock, CheckCircle2, AlertCircle, MessageSquare,
  ChevronDown, User, Filter, Inbox, ClipboardList, AtSign, CalendarClock,
  type LucideIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  new: { label: "جديد", color: "bg-blue-500", icon: Clock },
  in_progress: { label: "قيد المراجعة", color: "bg-amber-500", icon: AlertCircle },
  resolved: { label: "تم الحل", color: "bg-green-500", icon: CheckCircle2 },
  closed: { label: "مغلق", color: "bg-gray-500", icon: CheckCircle2 },
}

const CATEGORY_LABELS: Record<string, string> = {
  broadcast_not_working: "البث لا يعمل",
  station_missing: "محطة غير موجودة",
  wrong_route: "مسار خاطئ",
  wrong_schedule: "مواعيد خاطئة",
  chat_issue: "مشكلة في الشات",
  app_crash: "التطبيق بطيء/يتوقف",
  login_issue: "مشكلة تسجيل دخول",
  suggestion: "اقتراح تحسين",
  other: "أخرى",
}

const statusOptions = ["all", "new", "in_progress", "resolved", "closed"]

const statCardStyles = {
  blue: "bg-blue-500/10 text-blue-500",
  red: "bg-red-500/10 text-red-500",
  amber: "bg-amber-500/10 text-amber-500",
  orange: "bg-orange-500/10 text-orange-500",
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "الآن"
  if (mins < 60) return `منذ ${mins} د`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} س`
  const days = Math.floor(hours / 24)
  if (days < 7) return `منذ ${days} يوم`
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.new
  return (
    <Badge variant="secondary" className="gap-1 text-[10px]">
      <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
      {s.label}
    </Badge>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: LucideIcon
  value: number
  label: string
  tone: keyof typeof statCardStyles
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${statCardStyles[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-card p-1">
      {statusOptions.map((status) => (
        <Button
          key={status}
          variant={value === status ? "default" : "ghost"}
          size="sm"
          className="h-8 rounded-lg px-3 text-xs"
          onClick={() => onChange(status)}
        >
          {status === "all" ? "الكل" : STATUS_MAP[status]?.label ?? status}
        </Button>
      ))}
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Icon className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default function SupportPage() {
  const queryClient = useQueryClient()
  const [contactFilter, setContactFilter] = useState("all")
  const [reportFilter, setReportFilter] = useState("all")
  const [reportCatFilter, setReportCatFilter] = useState("all")
  const [notesDialog, setNotesDialog] = useState<{
    open: boolean; type: "contact" | "report"; id: number; currentNotes: string
  }>({ open: false, type: "contact", id: 0, currentNotes: "" })
  const [notesText, setNotesText] = useState("")

  const { data: contacts, isLoading: loadingContacts } = useQuery({
    queryKey: ["support-contacts", contactFilter],
    queryFn: () => supportApi.getContacts(contactFilter),
    refetchInterval: 15000,
  })

  const { data: reports, isLoading: loadingReports } = useQuery({
    queryKey: ["support-reports", reportFilter, reportCatFilter],
    queryFn: () => supportApi.getReports(reportFilter, reportCatFilter),
    refetchInterval: 15000,
  })

  const updateContactMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status?: string; notes?: string }) =>
      supportApi.updateContact(id, status, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-contacts"] }),
  })

  const updateReportMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status?: string; notes?: string }) =>
      supportApi.updateReport(id, status, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-reports"] }),
  })

  const saveNotes = () => {
    if (notesDialog.type === "contact") {
      updateContactMutation.mutate({ id: notesDialog.id, notes: notesText })
    } else {
      updateReportMutation.mutate({ id: notesDialog.id, notes: notesText })
    }
    setNotesDialog({ ...notesDialog, open: false })
  }

  const newContactsCount = contacts?.items.filter(c => c.status === "new").length ?? 0
  const newReportsCount = reports?.items.filter(r => r.status === "new").length ?? 0
  const totalOpenCount = newContactsCount + newReportsCount
  const categoryEntries = useMemo(() => Object.entries(CATEGORY_LABELS), [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">الدعم والتواصل</h1>
              <p className="text-sm text-muted-foreground">إدارة رسائل المستخدمين وبلاغات المشاكل من مكان واحد</p>
            </div>
          </div>
        </div>
        <Badge variant={totalOpenCount > 0 ? "destructive" : "secondary"} className="w-fit px-3 py-1">
          {totalOpenCount > 0 ? `${totalOpenCount} عنصر جديد` : "لا توجد عناصر جديدة"}
        </Badge>
      </div>

      <Tabs defaultValue="contacts" dir="rtl" className="flex flex-col gap-4">
        <div className="flex justify-start">
          <TabsList className="h-11 w-fit rounded-xl border bg-card p-1 shadow-sm">
            <TabsTrigger value="contacts" className="h-9 gap-1.5 rounded-lg px-4 text-sm">
              <Mail className="h-4 w-4" /> رسائل التواصل
              {newContactsCount > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{newContactsCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="h-9 gap-1.5 rounded-lg px-4 text-sm">
              <Bug className="h-4 w-4" /> بلاغات المشاكل
              {newReportsCount > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{newReportsCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Mail} value={contacts?.total ?? 0} label="رسائل التواصل" tone="blue" />
          <StatCard icon={Bug} value={reports?.total ?? 0} label="بلاغات المشاكل" tone="red" />
          <StatCard icon={Clock} value={newContactsCount} label="رسائل جديدة" tone="amber" />
          <StatCard icon={AlertCircle} value={newReportsCount} label="بلاغات جديدة" tone="orange" />
        </div>

        {/* ── Contacts Tab ── */}
        <TabsContent value="contacts" className="mt-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4 text-muted-foreground" />
              تصفية الرسائل
            </div>
            <StatusFilter value={contactFilter} onChange={setContactFilter} />
          </div>

          {loadingContacts ? (
            <EmptyState icon={Inbox} title="جاري تحميل الرسائل" description="يتم تحديث بيانات الدعم الآن" />
          ) : !contacts?.items.length ? (
            <EmptyState icon={Inbox} title="لا توجد رسائل" description="لا توجد رسائل تواصل مطابقة للتصفية الحالية" />
          ) : (
            <div className="grid gap-3">
              {contacts.items.map((c: ContactMessage) => (
                <Card key={c.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <StatusBadge status={c.status} />
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {formatDate(c.created_at)}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold">{c.subject}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {c.display_name || "مستخدم"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <AtSign className="h-3.5 w-3.5" />
                            {c.email || "لا يوجد بريد"}
                          </span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm leading-6 text-foreground/90">
                          {c.message}
                        </p>
                        {c.admin_notes && (
                          <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs">
                            <span className="font-semibold text-primary">ملاحظات الإدارة:</span>{" "}
                            <span className="text-muted-foreground">{c.admin_notes}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
                            الحالة <ChevronDown className="h-3 w-3" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {Object.entries(STATUS_MAP).map(([key, val]) => (
                              <DropdownMenuItem
                                key={key}
                                onClick={() => updateContactMutation.mutate({ id: c.id, status: key })}
                              >
                                <span className={`w-2 h-2 rounded-full ${val.color} ml-2`} />
                                {val.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => {
                            setNotesText(c.admin_notes || "")
                            setNotesDialog({ open: true, type: "contact", id: c.id, currentNotes: c.admin_notes || "" })
                          }}
                        >
                          <MessageSquare className="h-3 w-3" /> ملاحظات
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Reports Tab ── */}
        <TabsContent value="reports" className="mt-4">
          <div className="mb-4 space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4 text-muted-foreground" />
                تصفية البلاغات
              </div>
              <StatusFilter value={reportFilter} onChange={setReportFilter} />
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-xl border bg-card p-1">
              <Button
                variant={reportCatFilter === "all" ? "default" : "ghost"}
                size="sm"
                className="h-8 rounded-lg px-3 text-xs"
                onClick={() => setReportCatFilter("all")}
              >
                كل الفئات
              </Button>
              {categoryEntries.map(([key, label]) => (
                <Button
                  key={key}
                  variant={reportCatFilter === key ? "default" : "ghost"}
                  size="sm"
                  className="h-8 rounded-lg px-3 text-xs"
                  onClick={() => setReportCatFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {loadingReports ? (
            <EmptyState icon={ClipboardList} title="جاري تحميل البلاغات" description="يتم تحديث بلاغات المشاكل الآن" />
          ) : !reports?.items.length ? (
            <EmptyState icon={ClipboardList} title="لا توجد بلاغات" description="لا توجد بلاغات مطابقة للتصفية الحالية" />
          ) : (
            <div className="grid gap-3">
              {reports.items.map((r: ProblemReport) => (
                <Card key={r.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {CATEGORY_LABELS[r.category] || r.category_label}
                          </Badge>
                          <StatusBadge status={r.status} />
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {formatDate(r.created_at)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {r.display_name || "مستخدم"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <AtSign className="h-3.5 w-3.5" />
                            {r.email || "لا يوجد بريد"}
                          </span>
                        </div>
                        {r.details && (
                          <p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm leading-6 text-foreground/90">
                            {r.details}
                          </p>
                        )}
                        {r.admin_notes && (
                          <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs">
                            <span className="font-semibold text-primary">ملاحظات الإدارة:</span>{" "}
                            <span className="text-muted-foreground">{r.admin_notes}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
                            الحالة <ChevronDown className="h-3 w-3" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {Object.entries(STATUS_MAP).map(([key, val]) => (
                              <DropdownMenuItem
                                key={key}
                                onClick={() => updateReportMutation.mutate({ id: r.id, status: key })}
                              >
                                <span className={`w-2 h-2 rounded-full ${val.color} ml-2`} />
                                {val.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => {
                            setNotesText(r.admin_notes || "")
                            setNotesDialog({ open: true, type: "report", id: r.id, currentNotes: r.admin_notes || "" })
                          }}
                        >
                          <MessageSquare className="h-3 w-3" /> ملاحظات
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Notes Dialog */}
      <Dialog open={notesDialog.open} onOpenChange={(o) => setNotesDialog({ ...notesDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ملاحظات الإدارة</DialogTitle>
          </DialogHeader>
          <textarea
            value={notesText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotesText(e.target.value)}
            placeholder="اكتب ملاحظاتك هنا..."
            rows={4}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog({ ...notesDialog, open: false })}>
              إلغاء
            </Button>
            <Button onClick={saveNotes}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
