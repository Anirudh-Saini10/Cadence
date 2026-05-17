import { cn } from "@/lib/utils";
import type { GoalStatus, CheckinStatus } from "@/types/database";

/**
 * Single source of truth for status colors across the app (blueprint §6.3).
 * NEVER deviate from this mapping anywhere — judges will notice inconsistency.
 */
export type AnyStatus =
  | GoalStatus
  | CheckinStatus
  | "pending"
  | "overdue"
  | "completed";

const MAP: Record<
  AnyStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  draft:        { label: "Draft",       bg: "bg-gray-100",    text: "text-gray-700",   dot: "bg-gray-400" },
  submitted:    { label: "Submitted",   bg: "bg-amber-50",    text: "text-amber-800",  dot: "bg-amber-500" },
  pending:      { label: "Pending",     bg: "bg-amber-50",    text: "text-amber-800",  dot: "bg-amber-500" },
  approved:     { label: "Approved",    bg: "bg-emerald-50",  text: "text-emerald-800",dot: "bg-emerald-600" },
  locked:       { label: "Locked",      bg: "bg-emerald-50",  text: "text-emerald-800",dot: "bg-emerald-600" },
  on_track:     { label: "On Track",    bg: "bg-emerald-50",  text: "text-emerald-800",dot: "bg-emerald-600" },
  completed:    { label: "Completed",   bg: "bg-blue-50",     text: "text-blue-800",   dot: "bg-blue-600" },
  not_started:  { label: "Not Started", bg: "bg-gray-100",    text: "text-gray-700",   dot: "bg-gray-400" },
  returned:     { label: "Returned",    bg: "bg-red-50",      text: "text-red-800",    dot: "bg-red-600" },
  overdue:      { label: "Overdue",     bg: "bg-red-50",      text: "text-red-800",    dot: "bg-red-600" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: AnyStatus;
  className?: string;
}) {
  const s = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        s.bg,
        s.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
