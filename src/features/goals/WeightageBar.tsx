import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TARGET_WEIGHTAGE_TOTAL } from "@/lib/constants";

/**
 * Sticky, live-updating weightage tracker.
 * Color shifts: gray (0) → amber (1–99) → red (>100) → emerald (=100).
 * Per blueprint §4.2 + §6.4: must update on every keystroke, not on blur.
 */
export function WeightageBar({
  total,
  goalCount,
}: {
  total: number;
  goalCount: number;
}) {
  const isComplete = total === TARGET_WEIGHTAGE_TOTAL;
  const isOver = total > TARGET_WEIGHTAGE_TOTAL;

  let barColor = "bg-gray-300";
  let textColor = "text-muted-foreground";
  if (isComplete) {
    barColor = "bg-emerald-500";
    textColor = "text-emerald-700";
  } else if (isOver) {
    barColor = "bg-red-500";
    textColor = "text-red-700";
  } else if (total > 0) {
    barColor = "bg-amber-500";
    textColor = "text-amber-700";
  }

  const pct = Math.min(total, 100);

  return (
    <div className="-mx-6 mb-6 border-b bg-card px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : isOver ? (
            <AlertCircle className="h-5 w-5 text-red-600" />
          ) : (
            <span className="inline-block h-5 w-5 rounded-full border-2 border-dashed border-amber-500" />
          )}
          <div className="text-sm">
            <span className={cn("text-lg font-semibold tabular-nums", textColor)}>
              {total.toFixed(0)}
            </span>
            <span className="text-muted-foreground"> / {TARGET_WEIGHTAGE_TOTAL}% weightage</span>
            <span className="ml-3 text-xs text-muted-foreground">
              {goalCount} goal{goalCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className={cn("text-xs font-medium", textColor)}>
          {isComplete
            ? "Ready to submit"
            : isOver
            ? `Over by ${(total - 100).toFixed(0)}%`
            : `Add ${(100 - total).toFixed(0)}% more to submit`}
        </div>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-200", barColor)}
          style={{ width: `${pct}%` }}
        />
        {isOver && (
          <div
            className="-mt-2 h-2 rounded-r-full bg-red-700/40"
            style={{ width: `${Math.min(total - 100, 100)}%`, marginLeft: "100%" }}
          />
        )}
      </div>
    </div>
  );
}
