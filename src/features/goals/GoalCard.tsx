import { useEffect, useRef, useState } from "react";
import { Lock, Trash2, Link2, Loader2, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { THRUST_AREAS, UOM_OPTIONS, MIN_WEIGHTAGE } from "@/lib/constants";
import type { GoalRow } from "@/types/database";

export type GoalDraft = Pick<
  GoalRow,
  "thrust_area" | "title" | "description" | "uom_type" | "target" | "weightage"
>;

interface Props {
  goal: GoalRow;
  index: number;
  /** Local draft override for any unsaved field edits (parent-managed so
   *  WeightageBar can react instantly). */
  draft: Partial<GoalDraft>;
  /** Save status indicator. */
  saveState: "idle" | "saving" | "saved" | "error";
  saveError?: string | null;
  onDraftChange: (patch: Partial<GoalDraft>) => void;
  onFlush: () => void;
  onDelete: () => void;
}

/** A single goal row. Heavy lifting:
 *  - shared goals: title + target read-only, weightage editable
 *  - locked goals: everything read-only
 *  - returned goals: editable + show the returned reason
 *  - draft auto-save: parent flushes on blur via onFlush */
export function GoalCard({
  goal, index, draft, saveState, saveError, onDraftChange, onFlush, onDelete,
}: Props) {
  const isLocked = goal.status === "locked" || goal.locked_at !== null;
  const isShared = goal.is_shared && goal.source_goal_id !== null;
  const isReturned = goal.status === "returned";
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Auto-cancel the "click again to confirm" state after 3s
  useEffect(() => {
    if (!confirmingDelete) return;
    const t = window.setTimeout(() => setConfirmingDelete(false), 3000);
    return () => window.clearTimeout(t);
  }, [confirmingDelete]);

  // Effective values to render (draft over server state)
  const v = (k: keyof GoalDraft) => (draft[k] ?? goal[k]) as string | number | null;

  const weightageNum = Number(v("weightage")) || 0;
  const belowMin = weightageNum > 0 && weightageNum < MIN_WEIGHTAGE;

  return (
    <Card
      className={cn(
        "transition-shadow",
        isLocked && "bg-emerald-50/30 border-emerald-200",
        isReturned && "border-red-300 bg-red-50/30"
      )}
    >
      <CardContent className="space-y-4 pt-6">
        {/* Header: number + status + actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
              {index + 1}
            </span>
            <StatusBadge status={goal.status} />
            {isShared && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                <Link2 className="h-3 w-3" />
                Shared
              </span>
            )}
            {isLocked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SaveIndicator state={saveState} error={saveError} />
            {!isLocked && !isShared && goal.status !== "submitted" && (
              confirmingDelete ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => { setConfirmingDelete(false); onDelete(); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete?
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setConfirmingDelete(false)}
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmingDelete(true)}
                  title="Delete goal"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )
            )}
          </div>
        </div>

        {/* Returned reason banner */}
        {isReturned && goal.returned_reason && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">
            <div className="font-medium text-red-900">Returned for rework</div>
            <div className="mt-1 text-red-800">{goal.returned_reason}</div>
          </div>
        )}

        {/* Grid: thrust + uom + target + weightage */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-4 space-y-1.5">
            <Label>Thrust area</Label>
            <Select
              value={String(v("thrust_area") ?? "")}
              disabled={isLocked || isShared}
              onChange={(e) => onDraftChange({ thrust_area: e.target.value })}
              onBlur={onFlush}
            >
              <option value="" disabled>Select…</option>
              {THRUST_AREAS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <Label>
              UoM type
              {isShared && <Lock className="ml-1 inline h-3 w-3 text-muted-foreground" />}
            </Label>
            <Select
              value={String(v("uom_type") ?? "min")}
              disabled={isLocked || isShared}
              onChange={(e) => onDraftChange({ uom_type: e.target.value as GoalDraft["uom_type"] })}
              onBlur={onFlush}
            >
              {UOM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label>
              Target
              {isShared && <Lock className="ml-1 inline h-3 w-3 text-muted-foreground" />}
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              disabled={isLocked || isShared}
              value={Number(v("target") ?? 0)}
              onChange={(e) => onDraftChange({ target: Number(e.target.value) })}
              onBlur={onFlush}
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label className={cn(belowMin && "text-red-700")}>Weightage %</Label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              disabled={isLocked}
              className={cn(belowMin && "border-red-400 focus-visible:ring-red-400")}
              value={Number(v("weightage") ?? 0)}
              onChange={(e) => onDraftChange({ weightage: Number(e.target.value) })}
              onBlur={onFlush}
            />
            {belowMin && (
              <p className="text-[11px] text-red-700">Min {MIN_WEIGHTAGE}%</p>
            )}
          </div>
        </div>

        {/* Title + description full-width */}
        <div className="space-y-1.5">
          <Label>
            Goal title
            {isShared && <Lock className="ml-1 inline h-3 w-3 text-muted-foreground" />}
          </Label>
          <Input
            disabled={isLocked || isShared}
            value={String(v("title") ?? "")}
            placeholder="e.g. Reduce average ticket TAT to under 24 hours"
            onChange={(e) => onDraftChange({ title: e.target.value })}
            onBlur={onFlush}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea
            disabled={isLocked}
            value={String(v("description") ?? "")}
            placeholder="What does success look like? How will it be measured?"
            onChange={(e) => onDraftChange({ description: e.target.value })}
            onBlur={onFlush}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SaveIndicator({
  state, error,
}: { state: "idle" | "saving" | "saved" | "error"; error?: string | null }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
        <Check className="h-3 w-3" />
        Saved
      </span>
    );
  }
  if (state === "error") {
    return (
      <span title={error ?? undefined} className="text-xs font-medium text-red-700">
        Save failed
      </span>
    );
  }
  return null;
}

// Hook export so the page can also debounce flushes itself — kept the
// component dumb (no internal timers) to make the data flow explicit.
export function useDebounce<T>(value: T, ms = 600) {
  const [debounced, setDebounced] = useState(value);
  const t = useRef<number | null>(null);
  useEffect(() => {
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setDebounced(value), ms);
    return () => { if (t.current) window.clearTimeout(t.current); };
  }, [value, ms]);
  return debounced;
}
