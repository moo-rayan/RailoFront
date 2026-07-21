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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

type MenuItemForm = {
  id: string;
  name: string;
  price: string;
  available: boolean;
};

type WorkingHoursForm = {
  from: string;
  to: string;
  closed: boolean;
  notes: string;
};

type PlatformLocation = "left" | "right";

type KioskFormState = {
  stationId: number | null;
  stationLabel: string;
  stationSearch: string;
  merchantName: string;
  sellerPhone: string;
  platformLocation: PlatformLocation;
  menuItems: MenuItemForm[];
  workingHours: WorkingHoursForm;
  isOpen: boolean;
  isActive: boolean;
  isPhoneVisible: boolean;
};

let menuItemSeed = 0;

function createMenuItem(item?: Partial<MenuItemForm>): MenuItemForm {
  menuItemSeed += 1;
  return {
    id: `menu-item-${menuItemSeed}`,
    name: "",
    price: "",
    available: true,
    ...item,
  };
}

function createEmptyForm(): KioskFormState {
  return {
    stationId: null,
    stationLabel: "",
    stationSearch: "",
    merchantName: "",
    sellerPhone: "",
    platformLocation: "right",
    menuItems: [createMenuItem()],
    workingHours: {
      from: "",
      to: "",
      closed: false,
      notes: "",
    },
    isOpen: true,
    isActive: true,
    isPhoneVisible: false,
  };
}

function stationLabel(station: KioskStation | null | undefined) {
  if (!station) return "";
  return `${station.name_ar} - ${station.name_en}`;
}

function normalizePlatformLocation(value: string | null | undefined): PlatformLocation {
  return value?.trim().toLowerCase() === "left" ? "left" : "right";
}

function platformLocationLabel(value: string | null | undefined) {
  return normalizePlatformLocation(value) === "left" ? "يسار المحطة" : "يمين المحطة";
}

function isJsonRecord(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function valueToString(value: JsonValue | undefined) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return "";
}

function valueToBoolean(value: JsonValue | undefined, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeMenuItems(value: JsonValue[] | Record<string, JsonValue>) {
  const source = Array.isArray(value)
    ? value
    : Array.isArray(value.items)
      ? value.items
      : [];

  const items = source
    .map((entry) => {
      if (!isJsonRecord(entry)) return null;
      return createMenuItem({
        name: valueToString(entry.name ?? entry.title),
        price: valueToString(entry.price),
        available: valueToBoolean(entry.available, true),
      });
    })
    .filter((entry): entry is MenuItemForm => Boolean(entry));

  return items.length > 0 ? items : [createMenuItem()];
}

function normalizeWorkingHours(value: JsonValue[] | Record<string, JsonValue>): WorkingHoursForm {
  if (!isJsonRecord(value)) {
    return { from: "", to: "", closed: false, notes: "" };
  }

  const daily = isJsonRecord(value.daily) ? value.daily : value;
  return {
    from: valueToString(daily.from),
    to: valueToString(daily.to),
    closed: valueToBoolean(daily.closed),
    notes: valueToString(value.notes ?? value.note),
  };
}

function normalizeDigits(value: string) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  return value
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)));
}

function priceToJson(value: string): JsonValue {
  const raw = value.trim();
  if (!raw) return null;
  const normalized = normalizeDigits(raw).replace(",", ".");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : raw;
}

function kioskToForm(kiosk: Kiosk): KioskFormState {
  const label = stationLabel(kiosk.station);
  return {
    stationId: kiosk.station_id,
    stationLabel: label,
    stationSearch: label,
    merchantName: kiosk.merchant_name,
    sellerPhone: kiosk.seller_phone,
    platformLocation: normalizePlatformLocation(kiosk.platform_location),
    menuItems: normalizeMenuItems(kiosk.menu),
    workingHours: normalizeWorkingHours(kiosk.working_hours),
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

  const menu = form.menuItems
    .map((item) => ({
      name: item.name.trim(),
      price: priceToJson(item.price),
      available: item.available,
    }))
    .filter((item) => item.name || item.price !== null);

  const workingHours: Record<string, JsonValue> = {
    daily: {
      from: form.workingHours.from || null,
      to: form.workingHours.to || null,
      closed: form.workingHours.closed,
    },
  };
  if (form.workingHours.notes.trim()) {
    workingHours.notes = form.workingHours.notes.trim();
  }

  return {
    station_id: form.stationId,
    merchant_name: form.merchantName.trim(),
    seller_phone: form.sellerPhone.trim(),
    platform_location: form.platformLocation,
    menu,
    working_hours: workingHours,
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
  const [form, setForm] = useState<KioskFormState>(() => createEmptyForm());

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
    setForm(createEmptyForm());
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
                    <TableHead className="text-right">مكان الأيقونة</TableHead>
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
                          <span>{platformLocationLabel(kiosk.platform_location)}</span>
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
        <DialogContent className="max-h-[92vh] w-[min(calc(100vw-2rem),1180px)] overflow-y-auto p-0 sm:max-w-[1180px]">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>{editingKiosk ? "تعديل كشك" : "إضافة كشك جديد"}</DialogTitle>
            <DialogDescription>
              اربط الكشك بمحطة، ثم أدخل بيانات التاجر والمنيو وساعات العمل.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 px-6 py-5 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.2fr)]">
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
                <Label>مكان أيقونة الكشك على الخريطة</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["right", "يمين المحطة"],
                    ["left", "يسار المحطة"],
                  ] as const).map(([value, label]) => {
                    const selected = form.platformLocation === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            platformLocation: value,
                          }))
                        }
                        className={cn(
                          "flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:bg-accent",
                        )}
                      >
                        <MapPin className="h-4 w-4" />
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  يحدد ظهور أيقونة الكشك يمين أو يسار أيقونة المحطة في الخريطة.
                </p>
              </div>

              <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3">
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
              <MenuEditor
                items={form.menuItems}
                onChange={(menuItems) =>
                  setForm((current) => ({ ...current, menuItems }))
                }
              />
              <WorkingHoursEditor
                value={form.workingHours}
                onChange={(workingHours) =>
                  setForm((current) => ({ ...current, workingHours }))
                }
              />
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-none px-6 py-4">
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

function MenuEditor({
  items,
  onChange,
}: {
  items: MenuItemForm[];
  onChange: (items: MenuItemForm[]) => void;
}) {
  const updateItem = (
    id: string,
    key: keyof Omit<MenuItemForm, "id">,
    value: string | boolean,
  ) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  };

  const removeItem = (id: string) => {
    const nextItems = items.filter((item) => item.id !== id);
    onChange(nextItems.length > 0 ? nextItems : [createMenuItem()]);
  };

  return (
    <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label className="flex items-center gap-2 text-base">
            <Utensils className="h-4 w-4" />
            المنيو
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            أضف الأصناف والأسعار بسرعة من صفوف بسيطة.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, createMenuItem()])}
        >
          <Plus className="ml-1 h-4 w-4" />
          إضافة صنف
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="grid gap-3 rounded-lg border bg-background/70 p-3 md:grid-cols-[minmax(0,1fr)_120px_120px_40px] md:items-end"
          >
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                الصنف {index + 1}
              </Label>
              <Input
                value={item.name}
                placeholder="مثال: شاي"
                onChange={(event) =>
                  updateItem(item.id, "name", event.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">السعر</Label>
              <Input
                value={item.price}
                inputMode="decimal"
                placeholder="10"
                dir="ltr"
                onChange={(event) =>
                  updateItem(item.id, "price", event.target.value)
                }
              />
            </div>
            <div className="flex h-10 items-center justify-between gap-2 rounded-md border px-3">
              <ToggleSwitchButton
                label="متاح"
                checked={item.available}
                className="h-full w-full"
                onCheckedChange={(checked) =>
                  updateItem(item.id, "available", checked)
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="حذف الصنف"
              onClick={() => removeItem(item.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkingHoursEditor({
  value,
  onChange,
}: {
  value: WorkingHoursForm;
  onChange: (value: WorkingHoursForm) => void;
}) {
  const updateValue = (patch: Partial<WorkingHoursForm>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <div>
        <Label className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          أوقات العمل
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">
          اختر وقت الفتح والغلق، أو علّم الكشك كمغلق مؤقتاً.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">من</Label>
          <Input
            type="time"
            dir="ltr"
            value={value.from}
            disabled={value.closed}
            onChange={(event) => updateValue({ from: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">إلى</Label>
          <Input
            type="time"
            dir="ltr"
            value={value.to}
            disabled={value.closed}
            onChange={(event) => updateValue({ to: event.target.value })}
          />
        </div>
        <div className="flex h-10 items-center justify-between gap-3 rounded-md border px-3">
          <ToggleSwitchButton
            label="مغلق مؤقتاً"
            checked={value.closed}
            className="h-full w-full"
            onCheckedChange={(checked) => updateValue({ closed: checked })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">ملاحظة اختيارية</Label>
        <Input
          value={value.notes}
          placeholder="مثال: الجمعة بعد الصلاة فقط"
          onChange={(event) => updateValue({ notes: event.target.value })}
        />
      </div>
    </section>
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
    <ToggleSwitchButton
      label={label}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="min-h-11 w-full rounded-md bg-background/70 px-3 py-2"
    />
  );
}

function ToggleSwitchButton({
  label,
  checked,
  onCheckedChange,
  className,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex items-center justify-between gap-3 rounded-md text-sm transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <span className="whitespace-nowrap">{label}</span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-input",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-0.5" : "translate-x-[18px]",
          )}
        />
      </span>
    </button>
  );
}
