"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supportApi, type ContactMessage, type ProblemReport } from "@/lib/api/support"
import {
  Mail, Bug, Clock, CheckCircle2, AlertCircle, MessageSquare,
  ChevronDown, User, Filter,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الدعم والتواصل</h1>
        <p className="text-muted-foreground text-sm mt-1">إدارة رسائل التواصل وبلاغات المشاكل</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Mail className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-2xl font-bold">{contacts?.total ?? 0}</p>
              <p className="text-xs text-muted-foreground">رسائل التواصل</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><Bug className="h-5 w-5 text-red-500" /></div>
            <div>
              <p className="text-2xl font-bold">{reports?.total ?? 0}</p>
              <p className="text-xs text-muted-foreground">بلاغات المشاكل</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="h-5 w-5 text-amber-500" /></div>
            <div>
              <p className="text-2xl font-bold">{newContactsCount}</p>
              <p className="text-xs text-muted-foreground">رسائل جديدة</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><AlertCircle className="h-5 w-5 text-orange-500" /></div>
            <div>
              <p className="text-2xl font-bold">{newReportsCount}</p>
              <p className="text-xs text-muted-foreground">بلاغات جديدة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contacts" dir="rtl">
        <TabsList>
          <TabsTrigger value="contacts" className="gap-1.5">
            <Mail className="h-4 w-4" /> رسائل التواصل
            {newContactsCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{newContactsCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <Bug className="h-4 w-4" /> بلاغات المشاكل
            {newReportsCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{newReportsCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Contacts Tab ── */}
        <TabsContent value="contacts" className="mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              {["all", "new", "in_progress", "resolved", "closed"].map(s => (
                <Button
                  key={s}
                  variant={contactFilter === s ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setContactFilter(s)}
                >
                  {s === "all" ? "الكل" : STATUS_MAP[s]?.label ?? s}
                </Button>
              ))}
            </div>
          </div>

          {loadingContacts ? (
            <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
          ) : !contacts?.items.length ? (
            <div className="text-center py-12 text-muted-foreground">لا توجد رسائل</div>
          ) : (
            <div className="space-y-3">
              {contacts.items.map((c: ContactMessage) => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm truncate">{c.display_name}</span>
                          <span className="text-xs text-muted-foreground">{c.email}</span>
                          <StatusBadge status={c.status} />
                        </div>
                        <h3 className="font-semibold text-sm">{c.subject}</h3>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{c.message}</p>
                        {c.admin_notes && (
                          <div className="mt-2 p-2 rounded bg-muted text-xs">
                            <span className="font-medium">ملاحظات الإدارة:</span> {c.admin_notes}
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-2">{formatDate(c.created_at)}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background px-2 h-7 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
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
                          className="h-7 text-xs gap-1"
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
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              {["all", "new", "in_progress", "resolved", "closed"].map(s => (
                <Button
                  key={s}
                  variant={reportFilter === s ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setReportFilter(s)}
                >
                  {s === "all" ? "الكل" : STATUS_MAP[s]?.label ?? s}
                </Button>
              ))}
            </div>
            <span className="text-muted-foreground text-xs">|</span>
            <div className="flex gap-1 flex-wrap">
              <Button
                variant={reportCatFilter === "all" ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setReportCatFilter("all")}
              >
                كل الفئات
              </Button>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <Button
                  key={key}
                  variant={reportCatFilter === key ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setReportCatFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {loadingReports ? (
            <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
          ) : !reports?.items.length ? (
            <div className="text-center py-12 text-muted-foreground">لا توجد بلاغات</div>
          ) : (
            <div className="space-y-3">
              {reports.items.map((r: ProblemReport) => (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm truncate">{r.display_name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {CATEGORY_LABELS[r.category] || r.category_label}
                          </Badge>
                          <StatusBadge status={r.status} />
                        </div>
                        {r.details && (
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{r.details}</p>
                        )}
                        {r.admin_notes && (
                          <div className="mt-2 p-2 rounded bg-muted text-xs">
                            <span className="font-medium">ملاحظات الإدارة:</span> {r.admin_notes}
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-2">{formatDate(r.created_at)}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background px-2 h-7 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
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
                          className="h-7 text-xs gap-1"
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
