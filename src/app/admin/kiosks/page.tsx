"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Eye,
  EyeOff,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  Search,
  Store,
  Trash2,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";

import {
  kiosksApi,
  type JsonValue,
  type Kiosk,
  type KioskPayload,
  type KioskStation,
} from "@/lib/api/kiosks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type KioskFormState = {
  stationId: number | null;
  stationLabel: string;
  stationSearch: string;
  merchantName: string;
  sellerPhone: string;
  platformLocation: string;
  menuText: string;
  workingHoursText: string;
  isOpen: boolean;
  isActive: boolean;
  isPhoneVisible: boolean;
};

const emptyForm: KioskFormState = {
  stationId: null,
  stationLabel: "",
  stationSearch: "",
  merchantName: "",
  sellerPhone: "",
  platformLocation: "",
  menuText: '[\n  {"name": "شاي", "price": 10, "available": true}\n]',
  workingHoursText:
    '{\n  "daily": {"from": "08:00", "to": "22:00"}\n}',
  isOpen: true,
  isActive: true,
  isPhoneVisible: false,
};

function stationLabel(station: KioskStation | null | undefined) {
  if (!station) return "";
  return `${station.name_ar} - ${station.name_en}`;
}

function formatJson(value: JsonValue[] | Record<string, JsonValue> | null | undefined) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJsonField(text: string, fallback: JsonValue[] | Record<string, JsonValue>) {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  return JSON.parse(trimmed) as JsonValue[] | Record<string, JsonValue>;
}

function kioskToForm(kiosk: Kiosk): KioskFormState {
  const label = stationLabel(kiosk.station);
  return {
    stationId: kiosk.station_id,
    stationLabel: label,
    stationSearch: label,
    merchantName: kiosk.merchant_name,
    sellerPhone: kiosk.seller_phone,
    platformLocation: kiosk.platform_location,
    menuText: formatJson(kiosk.menu),
    workingHoursText: formatJson(kiosk.working_hours),
    isOpen: kiosk.is_open,
    isActive: kiosk.is_active,
    isPhoneVisible: kiosk.is_phone_visible,
  };
}

function buildPayload(form: KioskFormState): KioskPayload {
  if (!form.stationId) {
    throw new Error("اختر المحطة المرتبطة بالكشك أولاً");
  }
  if (!form.merchantName.trim()) {
    throw new Error("اسم التاجر مطلوب");
  }

  return {
    station_id: form.stationId,
    merchant_name: form.merchantName.trim(),
    seller_phone: form.sellerPhone.trim(),
    platform_location: form.platformLocation.trim(),
    menu: parseJsonField(form.menuText, []),
    working_hours: parseJsonField(form.workingHoursText, {}),
    is_open: form.isOpen,
    is_active: form.isActive,
    is_phone_visible: form.isPhoneVisible,
  };
}

export default function KiosksPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<Kiosk | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Kiosk | null>(null);
  const [form, setForm] = useState<KioskFormState>(emptyForm);

  const { data, isLoading, error } = useQuery({
    queryKey: ["kiosks", page, search, activeOnly, openOnly],
    queryFn: () =>
      kiosksApi.list({
        page,
        page_size: 30,
        q: search || undefined,
        active_only: activeOnly,
        open_only: openOnly,
      }),
    staleTime: 20000,
  });

  const stationSearchEnabled =
    formOpen && form.stationSearch.trim().length >= 2;
  const { data: stationOptions = [], isFetching: searchingStations } = useQuery({
    queryKey: ["kiosk-station-search", form.stationSearch],
    queryFn: () => kiosksApi.searchStations(form.stationSearch.trim()),
    enabled: stationSearchEnabled,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: kiosksApi.create,
    onSuccess: () => {
      toast.success("تم إضافة الكشك بنجاح");
      queryClient.invalidateQueries({ queryKey: ["kiosks"] });
      setFormOpen(false);
    },
    onError: () => toast.error("فشل إضافة الكشك"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<KioskPayload> }) =>
      kiosksApi.update(id, payload),
    onSuccess: () => {
      toast.success("تم تحديث بيانات الكشك");
      queryClient.invalidateQueries({ queryKey: ["kiosks"] });
      setFormOpen(false);
      setEditingKiosk(null);
    },
    onError: () => toast.error("فشل تحديث الكشك"),
  });

  const deleteMutation = useMutation({
    mutationFn: kiosksApi.delete,
    onSuccess: () => {
      toast.success("تم حذف الكشك");
      queryClient.invalidateQueries({ queryKey: ["kiosks"] });
      setDeleteTarget(null);
    },
    onError: () => toast.error("فشل حذف الكشك"),
  });

  const total = data?.total ?? 0;
  const kiosks = useMemo(() => data?.items ?? [], [data?.items]);
  const totalPages = Math.max(1, Math.ceil(total / 30));
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const stats = useMemo(() => {
    return {
      open: kiosks.filter((item) => item.is_open && item.is_active).length,
      hiddenPhones: kiosks.filter((item) => !item.is_phone_visible).length,
    };
  }, [kiosks]);

  const openCreate = () => {
    setEditingKiosk(null);
    setForm({ ...emptyForm });
    setFormOpen(true);
  };

  const openEdit = (kiosk: Kiosk) => {
    setEditingKiosk(kiosk);
    setForm(kioskToForm(kiosk));
    setFormOpen(true);
  };

  const selectStation = (station: KioskStation) => {
    const label = stationLabel(station);
    setForm((current) => ({
      ...current,
      stationId: station.id,
      stationLabel: label,
      stationSearch: label,
    }));
  };

  const submitForm = () => {
    try {
      const payload = buildPayload(form);
      if (editingKiosk) {
        updateMutation.mutate({ id: editingKiosk.id, payload });
      } else {
        createMutation.mutate(payload);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "راجع بيانات الكشك");
    }
  };

  const quickToggle = (kiosk: Kiosk, key: "is_open" | "is_active") => {
    updateMutation.mutate({
      id: kiosk.id,
      payload: { [key]: !kiosk[key] },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">أكشاك المحطات</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            إدارة الأكشاك المرتبطة بالمحطات وتجهيزها لطلبات الركاب المستقبلية
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة كشك
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأكشاك</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total.toLocaleString("ar-EG")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مفتوحة في الصفحة</CardTitle>
            <Power className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open.toLocaleString("ar-EG")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">هواتف مخفية</CardTitle>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hiddenPhones.toLocaleString("ar-EG")}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ابحث باسم التاجر أو المحطة أو رقم الهاتف..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="pr-9"
              />
            </div>
            <Button
              variant={activeOnly ? "default" : "outline"}
              onClick={() => {
                setActiveOnly((value) => !value);
                setPage(1);
              }}
            >
              النشط فقط
            </Button>
            <Button
              variant={openOnly ? "default" : "outline"}
              onClick={() => {
                setOpenOnly((value) => !value);
                setPage(1);
              }}
            >
              المفتوح فقط
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">قائمة الأكشاك</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="py-8 text-center text-destructive">فشل تحميل الأكشاك</div>
          ) : isLoading ? (
            <div className="py-8 text-center text-muted-foreground">جارٍ التحميل...</div>
          ) : kiosks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              لا توجد أكشاك مسجلة بعد
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاجر</TableHead>
                    <TableHead className="text-right">المحطة</TableHead>
                    <TableHead className="text-right">الرصيف / المكان</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kiosks.map((kiosk) => (
                    <TableRow key={kiosk.id}>
                      <TableCell>
                        <div className="font-semibold">{kiosk.merchant_name || "بدون اسم"}</div>
                        <div className="text-xs text-muted-foreground">#{kiosk.id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{kiosk.station?.name_ar ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{kiosk.station?.name_en ?? ""}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{kiosk.platform_location || "غير محدد"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{kiosk.seller_phone || "—"}</span>
                          {kiosk.is_phone_visible ? (
                            <Eye className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant={kiosk.is_active ? "default" : "secondary"}>
                            {kiosk.is_active ? "نشط" : "متوقف"}
                          </Badge>
                          <Badge variant={kiosk.is_open ? "default" : "outline"}>
                            {kiosk.is_open ? "مفتوح" : "مغلق"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={kiosk.is_open ? "إغلاق الكشك" : "فتح الكشك"}
                            onClick={() => quickToggle(kiosk, "is_open")}
                          >
                            <Power className={cn("h-4 w-4", kiosk.is_open ? "text-emerald-600" : "text-muted-foreground")} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={kiosk.is_active ? "إيقاف الكشك" : "تفعيل الكشك"}
                            onClick={() => quickToggle(kiosk, "is_active")}
                          >
                            {kiosk.is_active ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(kiosk)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(kiosk)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
                صفحة {page} من {totalPages}
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingKiosk ? "تعديل كشك" : "إضافة كشك جديد"}</DialogTitle>
            <DialogDescription>
              اربط الكشك بمحطة، ثم أدخل بيانات التاجر والمنيو وساعات العمل.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>المحطة *</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={form.stationSearch}
                    placeholder="ابحث باسم المحطة..."
                    className="pr-9"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        stationId: null,
                        stationLabel: "",
                        stationSearch: event.target.value,
                      }))
                    }
                  />
                  {stationSearchEnabled && form.stationSearch !== form.stationLabel && (
                    <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                      {searchingStations ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">جارٍ البحث...</div>
                      ) : stationOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">لا توجد محطات مطابقة</div>
                      ) : (
                        stationOptions.map((station) => (
                          <button
                            key={station.id}
                            type="button"
                            className="flex w-full flex-col rounded px-3 py-2 text-right text-sm hover:bg-accent"
                            onClick={() => selectStation(station)}
                          >
                            <span className="font-semibold">{station.name_ar}</span>
                            <span className="text-xs text-muted-foreground">{station.name_en}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {form.stationId && (
                  <p className="text-xs text-primary">تم اختيار: {form.stationLabel}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>اسم التاجر *</Label>
                  <Input
                    value={form.merchantName}
                    placeholder="مثال: كشك عم محمد"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        merchantName: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم هاتف البائع</Label>
                  <Input
                    value={form.sellerPhone}
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sellerPhone: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>مكان الكشك / الرصيف</Label>
                <Input
                  value={form.platformLocation}
                  placeholder="مثال: رصيف 2 بجوار السلم"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      platformLocation: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
                <ToggleRow
                  label="الكشك مفتوح"
                  checked={form.isOpen}
                  onCheckedChange={(value) =>
                    setForm((current) => ({ ...current, isOpen: value }))
                  }
                />
                <ToggleRow
                  label="نشط"
                  checked={form.isActive}
                  onCheckedChange={(value) =>
                    setForm((current) => ({ ...current, isActive: value }))
                  }
                />
                <ToggleRow
                  label="إظهار الهاتف"
                  checked={form.isPhoneVisible}
                  onCheckedChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      isPhoneVisible: value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  المنيو JSON
                </Label>
                <Textarea
                  value={form.menuText}
                  dir="ltr"
                  className="min-h-48 font-mono text-xs"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      menuText: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  أوقات العمل JSON
                </Label>
                <Textarea
                  value={form.workingHoursText}
                  dir="ltr"
                  className="min-h-36 font-mono text-xs"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      workingHoursText: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={submitForm} disabled={isSubmitting}>
              {editingKiosk ? "حفظ التعديل" : "إضافة الكشك"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الكشك</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد حذف كشك &quot;{deleteTarget?.merchant_name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
