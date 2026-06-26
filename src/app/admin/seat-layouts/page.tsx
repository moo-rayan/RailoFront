"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Armchair,
  CheckCircle2,
  DownloadCloud,
  Grid3X3,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Train as TrainIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dataBundleApi } from "@/lib/api/data-bundle";
import type {
  AdminSeatLayoutSummary,
  EditableCoachLayout,
  EditableSeat,
  EditableSeatLayout,
} from "@/lib/api/data-bundle";
import { trainsApi } from "@/lib/api/trains";
import { cn } from "@/lib/utils";
import type { Train } from "@/types";

type EditorFrame = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
};

type DragState = {
  pointerId: number;
  seatNumber: string;
  startClientX: number;
  startClientY: number;
  startSeatX: number;
  startSeatY: number;
};

const SEAT_WIDTH = 46;
const SEAT_HEIGHT = 48;
const GRID_STEP = 5;

function cloneLayout(layout: EditableSeatLayout): EditableSeatLayout {
  return JSON.parse(JSON.stringify(layout)) as EditableSeatLayout;
}

function layoutFingerprint(layout: EditableSeatLayout | null): string {
  return layout ? JSON.stringify(layout) : "";
}

function seatKey(seat: EditableSeat): string {
  return `${seat.enr_place_id || seat.number}`;
}

function classLabel(layout: AdminSeatLayoutSummary): string {
  return layout.class_name_ar || layout.class_name_en || layout.class_code;
}

function isWindowSeat(seat: EditableSeat): boolean {
  return Boolean(
    seat.is_window ||
      seat.position_type === "window" ||
      seat.position_type === "window_aisle",
  );
}

function isAisleSeat(seat: EditableSeat): boolean {
  return Boolean(
    seat.is_aisle ||
      seat.position_type === "aisle" ||
      seat.position_type === "window_aisle",
  );
}

function snap(value: number, enabled: boolean): number {
  if (!enabled) return Math.round(value * 100) / 100;
  return Math.round(value / GRID_STEP) * GRID_STEP;
}

function createEditorFrame(coach: EditableCoachLayout | null): EditorFrame {
  const seats = coach?.seats ?? [];
  const xs = seats.map((seat) => Number(seat.x) || 0);
  const ys = seats.map((seat) => Number(seat.y) || 0);
  const minX = Math.min(...xs, 0) - 90;
  const maxX = Math.max(...xs, 1) + 110;
  const minY = Math.min(...ys, 0) - 80;
  const maxY = Math.max(...ys, 1) + 80;
  const rawHeight = Math.max(1, maxX - minX);
  const rawWidth = Math.max(1, maxY - minY);

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(560, Math.min(880, rawWidth * 2.6)),
    height: Math.max(620, Math.min(1600, rawHeight * 1.28)),
  };
}

function positionSeat(
  seat: EditableSeat,
  frame: EditorFrame,
): { left: number; top: number; scaleX: number; scaleY: number } {
  const scaleX = frame.width / Math.max(1, frame.maxY - frame.minY);
  const scaleY = frame.height / Math.max(1, frame.maxX - frame.minX);
  return {
    left: (Number(seat.y) - frame.minY) * scaleX - SEAT_WIDTH / 2,
    top: (Number(seat.x) - frame.minX) * scaleY - SEAT_HEIGHT / 2,
    scaleX,
    scaleY,
  };
}

function selectedSeatLabel(seat: EditableSeat | null): string {
  if (!seat) return "لم يتم تحديد مقعد";
  if (isWindowSeat(seat) && isAisleSeat(seat)) return "شباك + ممر";
  if (isWindowSeat(seat)) return "شباك";
  if (isAisleSeat(seat)) return "ممر";
  return "داخلي";
}

function SeatMapEditor({
  coach,
  frame,
  selectedSeatId,
  snapToGrid,
  onSelectSeat,
  onMoveSeat,
}: {
  coach: EditableCoachLayout;
  frame: EditorFrame;
  selectedSeatId: string | null;
  snapToGrid: boolean;
  onSelectSeat: (seat: EditableSeat) => void;
  onMoveSeat: (seatNumber: string, x: number, y: number) => void;
}) {
  const dragRef = useRef<DragState | null>(null);
  const [draggingSeat, setDraggingSeat] = useState<string | null>(null);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    seat: EditableSeat,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      seatNumber: seat.number,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startSeatX: Number(seat.x) || 0,
      startSeatY: Number(seat.y) || 0,
    };
    setDraggingSeat(seatKey(seat));
    onSelectSeat(seat);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();

    const scaleX = frame.width / Math.max(1, frame.maxY - frame.minY);
    const scaleY = frame.height / Math.max(1, frame.maxX - frame.minX);
    const nextX = snap(
      drag.startSeatX + (event.clientY - drag.startClientY) / scaleY,
      snapToGrid,
    );
    const nextY = snap(
      drag.startSeatY + (event.clientX - drag.startClientX) / scaleX,
      snapToGrid,
    );
    onMoveSeat(drag.seatNumber, nextX, nextY);
  };

  const finishDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setDraggingSeat(null);
    }
  };

  return (
    <div className="overflow-auto rounded-lg border bg-background p-4">
      <div
        className="relative rounded-lg bg-zinc-950"
        style={{
          width: frame.width,
          height: frame.height,
          backgroundImage: snapToGrid
            ? "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)"
            : undefined,
          backgroundSize: "28px 28px",
        }}
      >
        <div className="pointer-events-none absolute inset-x-6 top-4 h-1.5 rounded-full bg-slate-600" />
        <div className="pointer-events-none absolute inset-x-6 bottom-4 h-1.5 rounded-full bg-slate-700" />
        <div className="pointer-events-none absolute left-1/2 top-10 bottom-10 w-px -translate-x-1/2 border-l border-dashed border-slate-600" />
        {coach.seats.map((seat) => {
          const id = seatKey(seat);
          const selected = id === selectedSeatId;
          const dragging = id === draggingSeat;
          const position = positionSeat(seat, frame);
          const isWindow = isWindowSeat(seat);
          const isAisle = isAisleSeat(seat);

          return (
            <button
              key={id}
              type="button"
              onPointerDown={(event) => handlePointerDown(event, seat)}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              onClick={() => onSelectSeat(seat)}
              className={cn(
                "absolute flex touch-none select-none flex-col items-center justify-center rounded-lg border text-[11px] font-black shadow-md transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isWindow
                  ? "border-cyan-300/70 bg-cyan-500 text-white"
                  : isAisle
                    ? "border-amber-300/70 bg-amber-500 text-zinc-950"
                    : "border-slate-400/60 bg-slate-600 text-white",
                selected && "ring-2 ring-primary ring-offset-2 ring-offset-zinc-950",
                dragging && "z-20 scale-105 cursor-grabbing shadow-xl",
              )}
              style={{
                left: position.left,
                top: position.top,
                width: SEAT_WIDTH,
                height: SEAT_HEIGHT,
              }}
              title={`مقعد ${seat.number} - ${selectedSeatLabel(seat)}`}
            >
              <Armchair className="h-5 w-5" />
              <span className="leading-none">{seat.number}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SeatLayoutsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrainNumber, setSelectedTrainNumber] = useState<string | null>(
    null,
  );
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
  const [selectedCoachOrder, setSelectedCoachOrder] = useState<number | null>(
    null,
  );
  const [draftState, setDraftState] = useState<{
    sourceKey: string;
    layout: EditableSeatLayout;
  } | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);

  const { data: trainsData, isLoading: trainsLoading } = useQuery({
    queryKey: ["trains"],
    queryFn: () => trainsApi.getAll(),
    retry: 2,
    staleTime: 30000,
  });

  const {
    data: layoutsData,
    isLoading: layoutsLoading,
    error: layoutsError,
  } = useQuery({
    queryKey: ["admin-seat-layouts"],
    queryFn: dataBundleApi.getAdminSeatLayouts,
    retry: 2,
    staleTime: 30000,
  });

  const trainRows = useMemo(() => trainsData?.items ?? [], [trainsData?.items]);
  const layoutRows = useMemo(
    () => layoutsData?.layouts ?? [],
    [layoutsData?.layouts],
  );

  const layoutsByTrain = useMemo(() => {
    const grouped = new Map<string, AdminSeatLayoutSummary[]>();
    for (const layout of layoutRows) {
      const list = grouped.get(layout.train_number) ?? [];
      list.push(layout);
      grouped.set(layout.train_number, list);
    }
    return grouped;
  }, [layoutRows]);

  const filteredTrains = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return trainRows;
    return trainRows.filter(
      (train) =>
        train.train_id.includes(q) ||
        train.type_ar.includes(searchQuery.trim()) ||
        train.type_en.toLowerCase().includes(q) ||
        train.start_station_ar.includes(searchQuery.trim()) ||
        train.end_station_ar.includes(searchQuery.trim()),
    );
  }, [searchQuery, trainRows]);

  const firstTrainNumber = useMemo(() => {
    if (trainRows.length === 0) return null;
    const firstWithLayout =
      trainRows.find((train) => layoutsByTrain.has(train.train_id)) ??
      trainRows[0];
    return firstWithLayout.train_id;
  }, [layoutsByTrain, trainRows]);

  const activeTrainNumber = selectedTrainNumber ?? firstTrainNumber;

  const selectedTrain = useMemo(
    () =>
      trainRows.find((train) => train.train_id === activeTrainNumber) ?? null,
    [activeTrainNumber, trainRows],
  );

  const selectedTrainLayouts = useMemo(
    () =>
      activeTrainNumber
        ? (layoutsByTrain.get(activeTrainNumber) ?? [])
        : [],
    [activeTrainNumber, layoutsByTrain],
  );

  const activeLayoutId = useMemo(() => {
    if (
      selectedLayoutId != null &&
      selectedTrainLayouts.some((layout) => layout.id === selectedLayoutId)
    ) {
      return selectedLayoutId;
    }
    return selectedTrainLayouts[0]?.id ?? null;
  }, [selectedLayoutId, selectedTrainLayouts]);

  const {
    data: layoutDetail,
    isLoading: layoutDetailLoading,
    error: layoutDetailError,
  } = useQuery({
    queryKey: ["admin-seat-layout", activeLayoutId],
    queryFn: () => dataBundleApi.getAdminSeatLayout(activeLayoutId!),
    enabled: activeLayoutId != null,
    retry: 2,
  });

  const detailKey = layoutDetail
    ? `${layoutDetail.id}:${layoutDetail.layout_hash}`
    : "";
  const draftLayout = useMemo(() => {
    if (!layoutDetail?.layout) return null;
    if (draftState?.sourceKey === detailKey) return draftState.layout;
    return cloneLayout(layoutDetail.layout);
  }, [detailKey, draftState, layoutDetail]);

  const originalFingerprint = useMemo(
    () => layoutFingerprint(layoutDetail?.layout ?? null),
    [layoutDetail],
  );
  const draftFingerprint = useMemo(
    () => layoutFingerprint(draftLayout),
    [draftLayout],
  );
  const isDirty =
    Boolean(draftState?.sourceKey === detailKey && draftLayout && layoutDetail) &&
    draftFingerprint !== originalFingerprint;

  const activeCoachOrder = useMemo(() => {
    if (!draftLayout?.coaches.length) return null;
    const exists = draftLayout.coaches.some(
      (coach) => coach.coach_order === selectedCoachOrder,
    );
    return exists ? selectedCoachOrder : draftLayout.coaches[0].coach_order;
  }, [draftLayout, selectedCoachOrder]);

  const selectedCoachIndex = useMemo(() => {
    if (!draftLayout?.coaches.length) return -1;
    const index = draftLayout.coaches.findIndex(
      (coach) => coach.coach_order === activeCoachOrder,
    );
    return index >= 0 ? index : 0;
  }, [activeCoachOrder, draftLayout]);

  const selectedCoach =
    selectedCoachIndex >= 0 ? draftLayout?.coaches[selectedCoachIndex] ?? null : null;

  const frameCoach = useMemo(() => {
    if (!layoutDetail?.layout || activeCoachOrder == null) return selectedCoach;
    return (
      layoutDetail.layout.coaches.find(
        (coach) => coach.coach_order === activeCoachOrder,
      ) ?? selectedCoach
    );
  }, [activeCoachOrder, layoutDetail, selectedCoach]);

  const editorFrame = useMemo(() => createEditorFrame(frameCoach), [frameCoach]);

  const selectedSeat = useMemo(() => {
    if (!selectedCoach || !selectedSeatId) return null;
    return (
      selectedCoach.seats.find((seat) => seatKey(seat) === selectedSeatId) ??
      null
    );
  }, [selectedCoach, selectedSeatId]);

  const saveMutation = useMutation({
    mutationFn: ({
      layoutId,
      layout,
    }: {
      layoutId: number;
      layout: EditableSeatLayout;
    }) => dataBundleApi.updateAdminSeatLayout(layoutId, layout),
    onSuccess: (result) => {
      queryClient.setQueryData(
        ["admin-seat-layout", result.layout.id],
        result.layout,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-seat-layouts"] });
      queryClient.invalidateQueries({ queryKey: ["seat-layouts"] });
      setDraftState({
        sourceKey: `${result.layout.id}:${result.layout.layout_hash}`,
        layout: cloneLayout(result.layout.layout),
      });
      toast.success(
        `تم حفظ التوزيع. النسخة الجديدة: ${result.version_info.version.slice(0, 8)}`,
      );
    },
    onError: () => {
      toast.error("تعذر حفظ توزيع المقاعد");
    },
  });

  const importMutation = useMutation({
    mutationFn: (trainNumber: string) =>
      dataBundleApi.importSeatLayoutFromEnr(trainNumber),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-seat-layouts"] });
      queryClient.invalidateQueries({ queryKey: ["seat-layouts"] });
      if (result.target_train_found) {
        toast.success(`تم جلب توزيع القطار ${result.train_number}`);
      } else {
        toast.warning("تم الفحص لكن لم يظهر هذا القطار في رد ENR");
      }
    },
    onError: () => {
      toast.error("تعذر جلب التوزيع من ENR");
    },
  });

  const canLeaveDraft = () => {
    if (!isDirty) return true;
    return window.confirm("لديك تعديلات غير محفوظة. هل تريد تجاهلها؟");
  };

  const selectTrain = (train: Train) => {
    if (!canLeaveDraft()) return;
    setSelectedTrainNumber(train.train_id);
    setSelectedLayoutId(null);
    setSelectedCoachOrder(null);
    setSelectedSeatId(null);
    setDraftState(null);
  };

  const selectLayout = (layout: AdminSeatLayoutSummary) => {
    if (!canLeaveDraft()) return;
    setSelectedLayoutId(layout.id);
    setSelectedCoachOrder(null);
    setSelectedSeatId(null);
    setDraftState(null);
  };

  const resetDraft = () => {
    if (!layoutDetail?.layout) return;
    setDraftState(null);
    setSelectedCoachOrder(null);
    setSelectedSeatId(null);
  };

  const moveSeat = (seatNumber: string, x: number, y: number) => {
    if (selectedCoachIndex < 0) return;
    setDraftState((current) => {
      const base =
        current?.sourceKey === detailKey ? current.layout : draftLayout;
      if (!base || !detailKey) return current;
      const next = cloneLayout(base);
      const coach = next.coaches[selectedCoachIndex];
      const seat = coach?.seats.find((item) => item.number === seatNumber);
      if (!seat) return current;
      seat.x = x;
      seat.y = y;
      return { sourceKey: detailKey, layout: next };
    });
  };

  const saveDraft = () => {
    if (!activeLayoutId || !draftLayout || !isDirty) return;
    saveMutation.mutate({ layoutId: activeLayoutId, layout: draftLayout });
  };

  const totalSeatCount = selectedCoach?.seats.length ?? 0;
  const windowCount = selectedCoach?.seats.filter(isWindowSeat).length ?? 0;
  const aisleCount = selectedCoach?.seats.filter(isAisleSeat).length ?? 0;

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">محرر توزيع المقاعد</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ترتيب بصري مرن لتوزيع الكراسي حسب القطار والدرجة والعربة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="h-8 px-3 font-mono">
            v{layoutsData?.version?.slice(0, 8) ?? "--------"}
          </Badge>
          <Badge variant="secondary" className="h-8 px-3">
            {layoutsData?.total ?? 0} توزيع
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="xl:sticky xl:top-4 xl:self-start">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrainIcon className="h-5 w-5 text-primary" />
              القطارات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="بحث برقم القطار أو المحطة"
                className="pr-9"
              />
            </div>

            <div className="max-h-[calc(100vh-250px)] space-y-2 overflow-y-auto pr-1">
              {trainsLoading || layoutsLoading ? (
                <div className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري تحميل القطارات...
                </div>
              ) : filteredTrains.length === 0 ? (
                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                  لا توجد قطارات مطابقة للبحث.
                </div>
              ) : (
                filteredTrains.map((train) => {
                  const count = layoutsByTrain.get(train.train_id)?.length ?? 0;
                  const active = train.train_id === activeTrainNumber;
                  return (
                    <button
                      type="button"
                      key={train.train_id}
                      onClick={() => selectTrain(train)}
                      className={cn(
                        "w-full rounded-lg border p-3 text-right transition",
                        active
                          ? "border-primary bg-primary/10"
                          : "bg-card hover:bg-muted/60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-bold">
                          {train.train_id}
                        </span>
                        <Badge variant={count > 0 ? "default" : "secondary"}>
                          {count > 0 ? `${count} درجة` : "بدون توزيع"}
                        </Badge>
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {train.start_station_ar} - {train.end_station_ar}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {train.type_ar}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {activeTrainNumber ?? "----"}
                  </Badge>
                  {selectedTrain && (
                    <span className="truncate text-sm font-medium">
                      {selectedTrain.start_station_ar} - {selectedTrain.end_station_ar}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  اسحب أي كرسي لتغيير مكانه، ثم احفظ التعديل لينزل للمستخدمين مع نسخة جديدة.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={snapToGrid ? "default" : "outline"}
                  onClick={() => setSnapToGrid((value) => !value)}
                  className="gap-2"
                >
                  <Grid3X3 className="h-4 w-4" />
                  الشبكة
                </Button>
                <Button
                  variant="outline"
                  onClick={resetDraft}
                  disabled={!isDirty || saveMutation.isPending}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  إلغاء التعديل
                </Button>
                <Button
                  onClick={saveDraft}
                  disabled={!isDirty || !draftLayout || saveMutation.isPending}
                  className="gap-2"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  حفظ التوزيع
                </Button>
              </div>
            </CardContent>
          </Card>

          {layoutsError ? (
            <Card>
              <CardContent className="pt-6 text-sm text-destructive">
                تعذر تحميل توزيعات المقاعد.
              </CardContent>
            </Card>
          ) : activeTrainNumber && selectedTrainLayouts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold">لا يوجد توزيع لهذا القطار</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    يمكن جلب التوزيع من ENR أولا، ثم تعديله من نفس الصفحة.
                  </p>
                </div>
                <Button
                  onClick={() => importMutation.mutate(activeTrainNumber)}
                  disabled={importMutation.isPending}
                  className="gap-2"
                >
                  {importMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <DownloadCloud className="h-4 w-4" />
                  )}
                  جلب التوزيع
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex flex-wrap gap-2">
                    {selectedTrainLayouts.map((layout) => (
                      <Button
                        key={layout.id}
                        variant={
                          layout.id === activeLayoutId ? "default" : "outline"
                        }
                        onClick={() => selectLayout(layout)}
                        className="h-auto min-h-10 gap-2 px-3 py-2"
                      >
                        <Armchair className="h-4 w-4" />
                        <span>{classLabel(layout)}</span>
                        <Badge
                          variant="secondary"
                          className="mr-1 bg-background/20"
                        >
                          {layout.seat_count}
                        </Badge>
                      </Button>
                    ))}
                  </div>

                  {draftLayout && (
                    <div className="flex flex-wrap gap-2">
                      {draftLayout.coaches.map((coach) => (
                        <Button
                          key={coach.coach_order}
                          variant={
                            coach.coach_order === activeCoachOrder
                              ? "secondary"
                              : "ghost"
                          }
                          onClick={() => {
                            setSelectedCoachOrder(coach.coach_order);
                            setSelectedSeatId(null);
                          }}
                          className="gap-2"
                        >
                          عربة {coach.coach_name || coach.coach_order}
                          <Badge variant="outline">{coach.seats.length}</Badge>
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_280px]">
                <Card className="min-w-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
                      <span className="flex items-center gap-2">
                        <Armchair className="h-5 w-5 text-primary" />
                        مساحة التعديل
                      </span>
                      {isDirty ? (
                        <Badge variant="secondary">تعديلات غير محفوظة</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          محفوظ
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {layoutDetailLoading ? (
                      <div className="flex h-80 items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري تحميل التوزيع...
                      </div>
                    ) : layoutDetailError ? (
                      <div className="text-sm text-destructive">
                        تعذر تحميل تفاصيل التوزيع.
                      </div>
                    ) : selectedCoach && editorFrame ? (
                      <SeatMapEditor
                        coach={selectedCoach}
                        frame={editorFrame}
                        selectedSeatId={selectedSeatId}
                        snapToGrid={snapToGrid}
                        onSelectSeat={(seat) => setSelectedSeatId(seatKey(seat))}
                        onMoveSeat={moveSeat}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        اختر درجة وعربة لبدء التعديل.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">تفاصيل سريعة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border p-2 text-center">
                        <div className="text-lg font-bold">{totalSeatCount}</div>
                        <div className="text-xs text-muted-foreground">مقعد</div>
                      </div>
                      <div className="rounded-lg border p-2 text-center">
                        <div className="text-lg font-bold text-cyan-500">
                          {windowCount}
                        </div>
                        <div className="text-xs text-muted-foreground">شباك</div>
                      </div>
                      <div className="rounded-lg border p-2 text-center">
                        <div className="text-lg font-bold text-amber-500">
                          {aisleCount}
                        </div>
                        <div className="text-xs text-muted-foreground">ممر</div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">
                        المقعد المحدد
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="font-mono text-base font-bold">
                          {selectedSeat?.number ?? "--"}
                        </span>
                        <Badge variant="secondary">
                          {selectedSeatLabel(selectedSeat)}
                        </Badge>
                      </div>
                      {selectedSeat && (
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>طولي X: {Number(selectedSeat.x).toFixed(0)}</div>
                          <div>عرضي Y: {Number(selectedSeat.y).toFixed(0)}</div>
                        </div>
                      )}
                    </div>

                    {layoutDetail && (
                      <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                        <div>Hash</div>
                        <div className="mt-1 break-all font-mono">
                          {layoutDetail.layout_hash.slice(0, 16)}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
