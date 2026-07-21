import type { FeatureVote } from "@/lib/api/feedback";

export function formatNumber(value: number) {
  return value.toLocaleString("ar-EG");
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatFeatureKey(value: string) {
  if (value === "station_kiosk_ordering") return "طلبات أكشاك المحطات";
  if (value === "train_onboard_service_ordering") return "طلبات خدمة القطار";
  return value.replace(/_/g, " ");
}

export function formatVoteValue(value: string) {
  if (value === "interested") return "مهتم";
  if (value === "not_interested") return "غير مهتم";
  return value.replace(/_/g, " ");
}

export function formatTargetType(value: string) {
  if (value === "station") return "محطة";
  if (value === "train") return "قطار";
  if (value === "global") return "عام";
  return value;
}

export function voteBadgeClass(value: string) {
  if (value === "interested") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (value === "not_interested") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
}

export function readText(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return "";
}

export function targetLabel(vote: FeatureVote) {
  const stationName = readText(vote.context_data, "station_name");
  const stationId = readText(vote.context_data, "station_id") || vote.target_id;
  if (vote.target_type === "station" && stationName) {
    return `${stationName}${stationId ? ` (#${stationId})` : ""}`;
  }

  const trainNumber = readText(vote.context_data, "train_number") || vote.target_id;
  if (vote.target_type === "train" && trainNumber) {
    return `قطار ${trainNumber}`;
  }

  if (!vote.target_id) return vote.target_type === "global" ? "عام" : vote.target_type;
  return `${vote.target_type}: ${vote.target_id}`;
}

export function compactContext(vote: FeatureVote) {
  const isTrainVote = vote.target_type === "train";
  const parts = [
    isTrainVote
      ? readText(vote.context_data, "route_label")
      : readText(vote.context_data, "station_name"),
    !isTrainVote && readText(vote.context_data, "kiosk_id")
      ? `كشك #${readText(vote.context_data, "kiosk_id")}`
      : "",
    readText(vote.client_metadata, "surface"),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}
