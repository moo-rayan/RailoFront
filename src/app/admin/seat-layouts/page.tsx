"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Armchair,
  CheckCircle2,
  Copy,
  DownloadCloud,
  Grid3X3,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Train as TrainIcon,
} from "lucide-react";
import { toast } from "sonner";

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
import { dataBundleApi } from "@/lib/api/data-bundle";
import type {
  AdminSeatLayoutDetail,
  AdminSeatLayoutsResponse,
  AdminSeatLayoutSummary,
  EditableCoachLayout,
  EditableSeat,
  EditableSeatLayout,
  SeatPositionType,
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
const SEAT_POSITION_OPTIONS: Array<{
  value: SeatPositionType;
  label: string;
}> = [
  { value: "window", label: "شباك" },
  { value: "aisle", label: "ممر" },
  { value: "window_aisle", label: "شباك + ممر" },
  { value: "inner", label: "داخلي" },
];

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

function detailToSummary(layout: AdminSeatLayoutDetail): AdminSeatLayoutSummary {
  return {
    id: layout.id,
    train_number: layout.train_number,
    class_code: layout.class_code,
    class_name_ar: layout.class_name_ar,
    class_name_en: layout.class_name_en,
    enr_train_id: layout.enr_train_id,
    coach_count: layout.coach_count,
    seat_count: layout.seat_count,
    window_seat_count: layout.window_seat_count,
    aisle_seat_count: layout.aisle_seat_count,
    layout_hash: layout.layout_hash,
    source_file: layout.source_file,
    imported_at: layout.imported_at,
    updated_at: layout.updated_at,
  };
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

function normalizeSeatPositionType(seat: EditableSeat | null): SeatPositionType {
  if (!seat) return "inner";
  if (isWindowSeat(seat) && isAisleSeat(seat)) return "window_aisle";
  if (isWindowSeat(seat)) return "window";
  if (isAisleSeat(seat)) return "aisle";
  return "inner";
}

function applySeatPositionType(
  seat: EditableSeat,
  positionType: SeatPositionType,
) {
  seat.position_type = positionType;
  seat.is_window = positionType === "window" || positionType === "window_aisle";
  seat.is_aisle = positionType === "aisle" || positionType === "window_aisle";
}

function updateCoachSeatCounts(coach: EditableCoachLayout) {
  coach.seat_count = coach.seats.length;
  coach.window_seat_count = coach.seats.filter(isWindowSeat).length;
  coach.aisle_seat_count = coach.seats.filter(isAisleSeat).length;
}

function nextSeatNumber(coach: EditableCoachLayout): string {
  const existing = new Set(coach.seats.map((seat) => String(seat.number)));
  const numericValues = coach.seats
    .map((seat) => Number.parseInt(String(seat.number).replace(/\D/g, ""), 10))
    .filter(Number.isFinite);
  let next = (numericValues.length > 0 ? Math.max(...numericValues) : coach.seats.length) + 1;
  while (existing.has(String(next))) next += 1;
  return String(next);
}

function newSeatCoordinates(coach: EditableCoachLayout, selectedSeat: EditableSeat | null) {
  if (selectedSeat) {
    return {
      x: Number(selectedSeat.x) + GRID_STEP,
      y: Number(selectedSeat.y) + GRID_STEP,
    };
  }
  if (coach.seats.length === 0) return { x: 0, y: 0 };
  const avgX =
    coach.seats.reduce((sum, seat) => sum + (Number(seat.x) || 0), 0) /
    coach.seats.length;
  const avgY =
    coach.seats.reduce((sum, seat) => sum + (Number(seat.y) || 0), 0) /
    coach.seats.length;
  return { x: snap(avgX, true), y: snap(avgY, true) };
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
    () => {
      if (typeof window === "undefined") return null;
      return new URLSearchParams(window.location.search).get("train");
    },
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
  const [newSeatPositionType, setNewSeatPositionType] =
    useState<SeatPositionType>("window");
  const [manualClassCode, setManualClassCode] = useState("MANUAL");
  const [manualClassNameAr, setManualClassNameAr] = useState("توزيع يدوي");
  const [manualClassNameEn, setManualClassNameEn] = useState("Manual layout");
  const [manualCoachCount, setManualCoachCount] = useState("1");
  const [manualSeatsPerCoach, setManualSeatsPerCoach] = useState("24");
  const [copySourceLayoutId, setCopySourceLayoutId] = useState("");
  const [copySourceTypeClassKey, setCopySourceTypeClassKey] = useState("");

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
  const trainByNumber = useMemo(() => {
    const map = new Map<string, Train>();
    for (const train of trainRows) {
      map.set(train.train_id, train);
    }
    return map;
  }, [trainRows]);

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

  const activeTrainNumber =
    selectedTrainNumber &&
    (trainRows.length === 0 ||
      trainRows.some((train) => train.train_id === selectedTrainNumber))
      ? selectedTrainNumber
      : firstTrainNumber;

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

  const targetClassCodes = useMemo(
    () => new Set(selectedTrainLayouts.map((layout) => layout.class_code)),
    [selectedTrainLayouts],
  );

  const copySourceLayoutOptions = useMemo(
    () =>
      layoutRows
        .filter(
          (layout) =>
            layout.train_number !== activeTrainNumber &&
            !targetClassCodes.has(layout.class_code),
        )
        .map((layout) => ({
          layout,
          train: trainByNumber.get(layout.train_number) ?? null,
        })),
    [activeTrainNumber, layoutRows, targetClassCodes, trainByNumber],
  );

  const copySourceTypeClassOptions = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string;
        trainTypeAr: string;
        classCode: string;
        className: string;
        count: number;
        seatCount: number;
      }
    >();

    for (const layout of layoutRows) {
      if (layout.train_number === activeTrainNumber) continue;
      if (targetClassCodes.has(layout.class_code)) continue;
      const train = trainByNumber.get(layout.train_number);
      if (!train) continue;
      const value = JSON.stringify([train.type_ar, layout.class_code]);
      const current = grouped.get(value);
      if (current) {
        current.count += 1;
        current.seatCount = Math.max(current.seatCount, layout.seat_count);
      } else {
        grouped.set(value, {
          key: value,
          trainTypeAr: train.type_ar,
          classCode: layout.class_code,
          className: classLabel(layout),
          count: 1,
          seatCount: layout.seat_count,
        });
      }
    }

    return [...grouped.values()].sort((a, b) =>
      `${a.trainTypeAr} ${a.className}`.localeCompare(
        `${b.trainTypeAr} ${b.className}`,
        "ar",
      ),
    );
  }, [activeTrainNumber, layoutRows, targetClassCodes, trainByNumber]);

  const sameTypeTrains = useMemo(() => {
    if (!selectedTrain) return [];
    return trainRows.filter((train) => train.type_ar === selectedTrain.type_ar);
  }, [selectedTrain, trainRows]);

  const activeLayoutId = useMemo(() => {
    if (
      selectedLayoutId != null &&
      selectedTrainLayouts.some((layout) => layout.id === selectedLayoutId)
    ) {
      return selectedLayoutId;
    }
    return selectedTrainLayouts[0]?.id ?? null;
  }, [selectedLayoutId, selectedTrainLayouts]);

  const activeLayoutSummary = useMemo(
    () =>
      selectedTrainLayouts.find((layout) => layout.id === activeLayoutId) ??
      null,
    [activeLayoutId, selectedTrainLayouts],
  );

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

  const activateCreatedLayout = (
    layout: AdminSeatLayoutDetail,
    versionInfo: {
      version: string;
      total: number;
      trains_count: number;
    },
  ) => {
    queryClient.setQueryData(["admin-seat-layout", layout.id], layout);
    queryClient.setQueryData<AdminSeatLayoutsResponse>(
      ["admin-seat-layouts"],
      (current) => {
        if (!current) return current;
        const summary = detailToSummary(layout);
        const layouts = [
          ...current.layouts.filter((item) => item.id !== layout.id),
          summary,
        ].sort((a, b) =>
          `${a.train_number} ${a.class_code}`.localeCompare(
            `${b.train_number} ${b.class_code}`,
            "ar",
          ),
        );
        return {
          ...current,
          ...versionInfo,
          layouts,
        };
      },
    );
    queryClient.invalidateQueries({ queryKey: ["admin-seat-layouts"] });
    queryClient.invalidateQueries({ queryKey: ["seat-layouts"] });
    setSelectedTrainNumber(layout.train_number);
    setSelectedLayoutId(layout.id);
    setSelectedCoachOrder(null);
    setSelectedSeatId(null);
    setDraftState({
      sourceKey: `${layout.id}:${layout.layout_hash}`,
      layout: cloneLayout(layout.layout),
    });
  };

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

  const createLayoutMutation = useMutation({
    mutationFn: ({
      trainNumber,
      classCode,
      classNameAr,
      classNameEn,
      coachCount,
      seatsPerCoach,
    }: {
      trainNumber: string;
      classCode: string;
      classNameAr: string;
      classNameEn: string;
      coachCount: number;
      seatsPerCoach: number;
    }) =>
      dataBundleApi.createAdminSeatLayout({
        train_number: trainNumber,
        class_code: classCode,
        class_name_ar: classNameAr,
        class_name_en: classNameEn,
        coach_count: coachCount,
        seats_per_coach: seatsPerCoach,
      }),
    onSuccess: (result) => {
      activateCreatedLayout(result.layout, result.version_info);
      toast.success("تم إنشاء توزيع جديد وفتح المحرر");
    },
    onError: () => {
      toast.error("تعذر إنشاء التوزيع");
    },
  });

  const copyLayoutMutation = useMutation({
    mutationFn: dataBundleApi.copyAdminSeatLayout,
    onSuccess: (result) => {
      activateCreatedLayout(result.layout, result.version_info);
      setCopySourceLayoutId("");
      setCopySourceTypeClassKey("");
      toast.success(
        `تم نسخ توزيع ${classLabel(result.source_layout)} إلى القطار ${result.layout.train_number}`,
      );
    },
    onError: () => {
      toast.error("تعذر نسخ التوزيع");
    },
  });

  const applyTypeMutation = useMutation({
    mutationFn: ({
      layoutId,
      trainTypeAr,
      layout,
    }: {
      layoutId: number;
      trainTypeAr: string;
      layout: EditableSeatLayout;
    }) => dataBundleApi.applyAdminSeatLayoutToType(layoutId, trainTypeAr, layout),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-seat-layouts"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-seat-layout", result.source_layout_id],
      });
      queryClient.invalidateQueries({ queryKey: ["seat-layouts"] });
      setDraftState(null);
      toast.success(
        `تم تطبيق التوزيع على ${result.target_trains_count} قطار (${result.inserted} جديد، ${result.updated} تحديث)`,
      );
    },
    onError: () => {
      toast.error("تعذر تطبيق التوزيع على نوع القطار");
    },
  });

  const deleteLayoutMutation = useMutation({
    mutationFn: (layoutId: number) =>
      dataBundleApi.deleteAdminSeatLayout(layoutId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-seat-layouts"] });
      queryClient.invalidateQueries({ queryKey: ["seat-layouts"] });
      if (result.layout_id) {
        queryClient.removeQueries({
          queryKey: ["admin-seat-layout", result.layout_id],
        });
      }
      setSelectedLayoutId(null);
      setSelectedCoachOrder(null);
      setSelectedSeatId(null);
      setDraftState(null);
      toast.success("تم حذف التوزيع من القطار الحالي");
    },
    onError: () => {
      toast.error("تعذر حذف التوزيع");
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: ({
      layoutId,
      trainTypeAr,
    }: {
      layoutId: number;
      trainTypeAr: string;
    }) => dataBundleApi.deleteAdminSeatLayoutForType(layoutId, trainTypeAr),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-seat-layouts"] });
      queryClient.invalidateQueries({ queryKey: ["seat-layouts"] });
      setSelectedLayoutId(null);
      setSelectedCoachOrder(null);
      setSelectedSeatId(null);
      setDraftState(null);
      toast.success(`تم حذف ${result.deleted} توزيع من نوع ${result.train_type_ar}`);
    },
    onError: () => {
      toast.error("تعذر حذف توزيعات هذا النوع");
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
    setCopySourceLayoutId("");
    setCopySourceTypeClassKey("");
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

  const addSeatToCoach = () => {
    if (selectedCoachIndex < 0 || !selectedCoach) return;
    const position = newSeatCoordinates(selectedCoach, selectedSeat);
    const nextNumber = nextSeatNumber(selectedCoach);
    const newSeat: EditableSeat = {
      enr_place_id: `manual:${Date.now()}:${nextNumber}`,
      number: nextNumber,
      x: position.x,
      y: position.y,
      row_index: selectedSeat?.row_index ?? -1,
      position_type: newSeatPositionType,
      is_window: false,
      is_aisle: false,
    };
    applySeatPositionType(newSeat, newSeatPositionType);
    setDraftState((current) => {
      const base =
        current?.sourceKey === detailKey ? current.layout : draftLayout;
      if (!base || !detailKey) return current;
      const next = cloneLayout(base);
      const coach = next.coaches[selectedCoachIndex];
      if (!coach) return current;
      coach.seats = [...coach.seats, newSeat];
      updateCoachSeatCounts(coach);
      return { sourceKey: detailKey, layout: next };
    });
    setSelectedSeatId(seatKey(newSeat));
  };

  const updateSelectedSeatPositionType = (positionType: SeatPositionType) => {
    if (selectedCoachIndex < 0 || !selectedSeatId) return;
    setDraftState((current) => {
      const base =
        current?.sourceKey === detailKey ? current.layout : draftLayout;
      if (!base || !detailKey) return current;
      const next = cloneLayout(base);
      const coach = next.coaches[selectedCoachIndex];
      const seat = coach?.seats.find((item) => seatKey(item) === selectedSeatId);
      if (!coach || !seat) return current;
      applySeatPositionType(seat, positionType);
      updateCoachSeatCounts(coach);
      return { sourceKey: detailKey, layout: next };
    });
  };

  const deleteSelectedSeat = () => {
    if (selectedCoachIndex < 0 || !selectedSeatId || !selectedCoach) return;
    const selectedNumber = selectedSeat?.number ?? "";
    const confirmed = window.confirm(
      `سيتم حذف المقعد ${selectedNumber || selectedSeatId} من العربة الحالية. هل تريد المتابعة؟`,
    );
    if (!confirmed) return;
    setDraftState((current) => {
      const base =
        current?.sourceKey === detailKey ? current.layout : draftLayout;
      if (!base || !detailKey) return current;
      const next = cloneLayout(base);
      const coach = next.coaches[selectedCoachIndex];
      if (!coach || coach.seats.length <= 1) return current;
      coach.seats = coach.seats.filter((seat) => seatKey(seat) !== selectedSeatId);
      updateCoachSeatCounts(coach);
      return { sourceKey: detailKey, layout: next };
    });
    setSelectedSeatId(null);
  };

  const saveDraft = () => {
    if (!activeLayoutId || !draftLayout || !isDirty) return;
    saveMutation.mutate({ layoutId: activeLayoutId, layout: draftLayout });
  };

  const applyDraftToType = () => {
    if (!activeLayoutId || !draftLayout || !selectedTrain || !activeLayoutSummary) {
      return;
    }
    const confirmed = window.confirm(
      `سيتم تطبيق توزيع ${classLabel(activeLayoutSummary)} على ${sameTypeTrains.length} قطار من نوع "${selectedTrain.type_ar}". هل تريد المتابعة؟`,
    );
    if (!confirmed) return;
    applyTypeMutation.mutate({
      layoutId: activeLayoutId,
      trainTypeAr: selectedTrain.type_ar,
      layout: draftLayout,
    });
  };

  const deleteCurrentLayout = () => {
    if (!activeLayoutId || !activeLayoutSummary) return;
    const confirmed = window.confirm(
      `سيتم حذف توزيع ${classLabel(activeLayoutSummary)} من القطار ${activeTrainNumber}. هل تريد المتابعة؟`,
    );
    if (!confirmed) return;
    deleteLayoutMutation.mutate(activeLayoutId);
  };

  const deleteCurrentLayoutForType = () => {
    if (!activeLayoutId || !selectedTrain || !activeLayoutSummary) return;
    const confirmed = window.confirm(
      `سيتم حذف توزيع ${classLabel(activeLayoutSummary)} من ${sameTypeTrains.length} قطار من نوع "${selectedTrain.type_ar}". هل تريد المتابعة؟`,
    );
    if (!confirmed) return;
    deleteTypeMutation.mutate({
      layoutId: activeLayoutId,
      trainTypeAr: selectedTrain.type_ar,
    });
  };

  const createManualLayout = () => {
    if (!activeTrainNumber) return;
    const classCode = manualClassCode.trim();
    const classNameAr = manualClassNameAr.trim();
    const classNameEn = manualClassNameEn.trim();
    const coachCount = Number.parseInt(manualCoachCount, 10);
    const seatsPerCoach = Number.parseInt(manualSeatsPerCoach, 10);

    if (!classCode || !classNameAr) {
      toast.error("اكتب كود الدرجة واسمها أولا");
      return;
    }
    if (!Number.isFinite(coachCount) || coachCount < 1 || coachCount > 40) {
      toast.error("عدد العربات يجب أن يكون بين 1 و 40");
      return;
    }
    if (
      !Number.isFinite(seatsPerCoach) ||
      seatsPerCoach < 1 ||
      seatsPerCoach > 120
    ) {
      toast.error("عدد المقاعد لكل عربة يجب أن يكون بين 1 و 120");
      return;
    }

    createLayoutMutation.mutate({
      trainNumber: activeTrainNumber,
      classCode,
      classNameAr,
      classNameEn,
      coachCount,
      seatsPerCoach,
    });
  };

  const copyFromSelectedLayout = () => {
    if (!activeTrainNumber || !copySourceLayoutId) return;
    const sourceLayoutId = Number.parseInt(copySourceLayoutId, 10);
    if (!Number.isFinite(sourceLayoutId)) return;
    if (
      !copySourceLayoutOptions.some(({ layout }) => layout.id === sourceLayoutId)
    ) {
      toast.error("اختر توزيعا لدرجة غير موجودة على القطار الحالي");
      return;
    }
    copyLayoutMutation.mutate({
      target_train_number: activeTrainNumber,
      source_layout_id: sourceLayoutId,
    });
  };

  const copyFromSelectedType = () => {
    if (!activeTrainNumber || !copySourceTypeClassKey) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(copySourceTypeClassKey);
    } catch {
      toast.error("اختيار النوع غير صحيح");
      return;
    }
    if (
      !Array.isArray(parsed) ||
      typeof parsed[0] !== "string" ||
      typeof parsed[1] !== "string"
    ) {
      toast.error("اختيار النوع غير صحيح");
      return;
    }
    if (!copySourceTypeClassOptions.some((option) => option.key === copySourceTypeClassKey)) {
      toast.error("اختر نوعا ودرجة غير موجودين على القطار الحالي");
      return;
    }
    copyLayoutMutation.mutate({
      target_train_number: activeTrainNumber,
      source_train_type_ar: parsed[0],
      source_class_code: parsed[1],
    });
  };

  const totalSeatCount = selectedCoach?.seats.length ?? 0;
  const windowCount = selectedCoach?.seats.filter(isWindowSeat).length ?? 0;
  const aisleCount = selectedCoach?.seats.filter(isAisleSeat).length ?? 0;
  const hasCopySources =
    copySourceLayoutOptions.length > 0 || copySourceTypeClassOptions.length > 0;
  const canCopyFromLayout = copySourceLayoutOptions.some(
    ({ layout }) => String(layout.id) === copySourceLayoutId,
  );
  const canCopyFromType = copySourceTypeClassOptions.some(
    (option) => option.key === copySourceTypeClassKey,
  );
  const copyLayoutPanel = (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center gap-2 font-semibold">
        <Copy className="h-4 w-4 text-primary" />
        نسخ توزيع جاهز
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        اختر توزيعا من درجة غير موجودة حاليا على القطار، وسيتم إضافته كتوزيع
        جديد لنفس القطار.
      </p>

      {!hasCopySources ? (
        <div className="mt-4 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          لا توجد درجات أخرى متاحة للنسخ إلى هذا القطار حاليا.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">من قطار محدد</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={copySourceLayoutId}
                onValueChange={(value) => setCopySourceLayoutId(value ?? "")}
                disabled={copySourceLayoutOptions.length === 0}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="اختر قطار ودرجة" />
                </SelectTrigger>
                <SelectContent align="end" className="max-h-72">
                  {copySourceLayoutOptions.map(({ layout, train }) => (
                    <SelectItem key={layout.id} value={String(layout.id)}>
                      {layout.train_number} - {classLabel(layout)}
                      {train ? ` - ${train.type_ar}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                onClick={copyFromSelectedLayout}
                disabled={
                  !canCopyFromLayout ||
                  copyLayoutMutation.isPending ||
                  createLayoutMutation.isPending ||
                  importMutation.isPending
                }
                className="gap-2"
              >
                {copyLayoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                نسخ
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">من نوع قطار</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={copySourceTypeClassKey}
                onValueChange={(value) => setCopySourceTypeClassKey(value ?? "")}
                disabled={copySourceTypeClassOptions.length === 0}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="اختر النوع والدرجة" />
                </SelectTrigger>
                <SelectContent align="end" className="max-h-72">
                  {copySourceTypeClassOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.trainTypeAr} - {option.className}
                      {` (${option.count} قطار)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                onClick={copyFromSelectedType}
                disabled={
                  !canCopyFromType ||
                  copyLayoutMutation.isPending ||
                  createLayoutMutation.isPending ||
                  importMutation.isPending
                }
                className="gap-2"
              >
                {copyLayoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Layers className="h-4 w-4" />
                )}
                نسخ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

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
                <Button
                  variant="destructive"
                  onClick={deleteCurrentLayout}
                  disabled={
                    !activeLayoutId ||
                    deleteLayoutMutation.isPending ||
                    deleteTypeMutation.isPending
                  }
                  className="gap-2"
                >
                  {deleteLayoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  حذف للقطار
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteCurrentLayoutForType}
                  disabled={
                    !activeLayoutId ||
                    !selectedTrain ||
                    deleteLayoutMutation.isPending ||
                    deleteTypeMutation.isPending
                  }
                  className="gap-2"
                >
                  {deleteTypeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  حذف للنوع
                </Button>
              </div>
            </CardContent>
          </Card>

          {selectedTrain && activeLayoutSummary && draftLayout && (
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-2 font-semibold">
                      <Layers className="h-4 w-4 text-primary" />
                      تطبيق حسب نوع القطار
                    </span>
                    <Badge variant="outline">{selectedTrain.type_ar}</Badge>
                    <Badge variant="secondary">
                      {sameTypeTrains.length} قطار
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    يطبق توزيع درجة {classLabel(activeLayoutSummary)} الحالي على
                    كل القطارات النشطة من نفس النوع.
                    {isDirty ? " سيتم استخدام التعديل الحالي غير المحفوظ." : ""}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={applyDraftToType}
                  disabled={
                    !activeLayoutId ||
                    !draftLayout ||
                    applyTypeMutation.isPending ||
                    saveMutation.isPending
                  }
                  className="gap-2"
                >
                  {applyTypeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Layers className="h-4 w-4" />
                  )}
                  تطبيق على النوع
                </Button>
              </CardContent>
            </Card>
          )}

          {layoutsError ? (
            <Card>
              <CardContent className="pt-6 text-sm text-destructive">
                تعذر تحميل توزيعات المقاعد.
              </CardContent>
            </Card>
          ) : activeTrainNumber && selectedTrainLayouts.length === 0 ? (
            <Card>
              <CardContent className="space-y-5 pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold">لا يوجد توزيع لهذا القطار</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      يمكنك جلب التوزيع من ENR، أو إنشاء قالب يدوي، أو نسخ توزيع
                      جاهز من قطار أو نوع آخر.
                    </p>
                  </div>
                  <Button
                    onClick={() => importMutation.mutate(activeTrainNumber)}
                    disabled={
                      importMutation.isPending ||
                      createLayoutMutation.isPending ||
                      copyLayoutMutation.isPending
                    }
                    className="gap-2"
                  >
                    {importMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <DownloadCloud className="h-4 w-4" />
                    )}
                    جلب من ENR
                  </Button>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex items-center gap-2 font-semibold">
                      <Plus className="h-4 w-4 text-primary" />
                      إنشاء توزيع يدوي
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">
                          كود الدرجة
                        </label>
                        <Input
                          value={manualClassCode}
                          onChange={(event) =>
                            setManualClassCode(event.target.value)
                          }
                          placeholder="AC 2"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">
                          اسم الدرجة
                        </label>
                        <Input
                          value={manualClassNameAr}
                          onChange={(event) =>
                            setManualClassNameAr(event.target.value)
                          }
                          placeholder="ثانية مكيفة"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">
                          الاسم الإنجليزي
                        </label>
                        <Input
                          value={manualClassNameEn}
                          onChange={(event) =>
                            setManualClassNameEn(event.target.value)
                          }
                          placeholder="AC Second"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">
                            العربات
                          </label>
                          <Input
                            inputMode="numeric"
                            value={manualCoachCount}
                            onChange={(event) =>
                              setManualCoachCount(event.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">
                            مقاعد/عربة
                          </label>
                          <Input
                            inputMode="numeric"
                            value={manualSeatsPerCoach}
                            onChange={(event) =>
                              setManualSeatsPerCoach(event.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={createManualLayout}
                      disabled={
                        createLayoutMutation.isPending ||
                        importMutation.isPending ||
                        copyLayoutMutation.isPending
                      }
                      className="mt-4 gap-2"
                    >
                      {createLayoutMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      إنشاء وفتح المحرر
                    </Button>
                  </div>

                  {copyLayoutPanel}
                </div>
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

              <Card>
                <CardContent className="pt-6">{copyLayoutPanel}</CardContent>
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
                        <>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>طولي X: {Number(selectedSeat.x).toFixed(0)}</div>
                            <div>عرضي Y: {Number(selectedSeat.y).toFixed(0)}</div>
                          </div>
                          <div className="mt-3 space-y-1.5">
                            <label className="text-xs text-muted-foreground">
                              نوع المقعد
                            </label>
                            <Select
                              value={normalizeSeatPositionType(selectedSeat)}
                              onValueChange={(value) =>
                                updateSelectedSeatPositionType(
                                  value as SeatPositionType,
                                )
                              }
                            >
                              <SelectTrigger className="h-9 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent align="end">
                                {SEAT_POSITION_OPTIONS.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="rounded-lg border p-3">
                      <div className="text-xs font-medium text-muted-foreground">
                        إدارة الكراسي
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <label className="text-xs text-muted-foreground">
                          نوع الكرسي الجديد
                        </label>
                        <Select
                          value={newSeatPositionType}
                          onValueChange={(value) =>
                            setNewSeatPositionType(value as SeatPositionType)
                          }
                        >
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent align="end">
                            {SEAT_POSITION_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          variant="secondary"
                          onClick={addSeatToCoach}
                          disabled={!selectedCoach || saveMutation.isPending}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          إضافة كرسي
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={deleteSelectedSeat}
                          disabled={
                            !selectedSeat ||
                            !selectedCoach ||
                            selectedCoach.seats.length <= 1 ||
                            saveMutation.isPending
                          }
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف كرسي
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        الإضافة والحذف يتمان على النسخة الحالية، ثم تحتاج إلى حفظ
                        التوزيع أو تطبيقه على النوع.
                      </p>
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
