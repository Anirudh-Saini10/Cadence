import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Lock, Link2, Info, CheckCircle2, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/stores/authStore";
import { useActiveCycle } from "@/hooks/useActiveCycle";
import {
  QUARTERS, QUARTER_LABEL, activeQuarter,
  fetchCheckinsByGoals, fetchLockedGoals, upsertCheckin,
} from "./checkinApi";
import { computeScore, UOM_LABELS, UOM_HINT } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { CheckinRow, CheckinStatus, GoalRow } from "@/types/database";

export function CheckinsPage() {
  const profile = useAuth((s) => s.profile);
  const { data: cycle } = useActiveCycle();
  const employeeId = profile?.id;
  const cycleId = cycle?.id;
  const quarter = cycle ? activeQuarter(cycle.phase) : null;
  const qc = useQueryClient();

  const { data: goals = [], isLoading: gLoading, error: gError } = useQuery({
    queryKey: ["locked-goals", employeeId, cycleId],
    queryFn: () => fetchLockedGoals(employeeId!, cycleId!),
    enabled: Boolean(employeeId && cycleId),
  });

  const goalIds = goals.map((g) => g.id);
  const { data: checkins = [], isLoading: cLoading, error: cError } = useQuery({
    queryKey: ["checkins", goalIds.join(",")],
    queryFn: () => fetchCheckinsByGoals(goalIds),
    enabled: goalIds.length > 0,
  });

  if (!cycle) return <Notice>No active cycle. Ask Admin to open one.</Notice>;

  if (!quarter) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <Info className="mx-auto h-8 w-8 text-amber-500" />
            <div className="font-medium">Check-ins are not open yet</div>
            <p className="text-sm text-muted-foreground">
              Cycle <span className="font-medium text-foreground">{cycle.name}</span> is in{" "}
              <span className="font-medium text-foreground">Goal Setting</span> phase. Once Admin advances the cycle to Q1, you can record quarterly progress here.
            </p>
            <p className="rounded-md bg-muted/50 px-3 py-2 text-left text-xs font-mono text-muted-foreground">
              Demo tip: an admin can advance the cycle by running<br />
              <span className="text-foreground">update public.cycles set phase = 'q1' where id = '{cycle.id}';</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gError || cError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <Info className="mx-auto h-8 w-8 text-red-500" />
            <div className="font-medium text-red-700">Could not load check-ins</div>
            <p className="text-sm text-muted-foreground">
              {(gError as Error | null)?.message ?? (cError as Error | null)?.message ?? "Unknown error"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gLoading || cLoading) {
    return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (goals.length === 0) {
    return <Notice>No locked goals yet. Once your manager approves your goal sheet, they'll appear here.</Notice>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Check-ins</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record your achievement for <span className="font-medium text-foreground">{QUARTER_LABEL[quarter]}</span>. Score is auto-computed by Unit of Measure.
          </p>
        </div>
        <OverallScoreCard goals={goals} checkins={checkins} quarter={quarter} />
      </div>

      <div className="space-y-3">
        {goals.map((g) => (
          <CheckinRowCard
            key={g.id}
            goal={g}
            quarter={quarter}
            allCheckins={checkins.filter((c) => c.goal_id === g.id)}
          />
        ))}
      </div>
    </div>
  );
}

function OverallScoreCard({
  goals, checkins, quarter,
}: {
  goals: GoalRow[]; checkins: CheckinRow[];
  quarter: Exclude<import("@/types/database").CyclePhase, "goal_setting">;
}) {
  const overall = useMemo(() => {
    let score = 0;
    let weightCounted = 0;
    for (const g of goals) {
      const c = checkins.find((x) => x.goal_id === g.id && x.quarter === quarter);
      if (!c) continue;
      score += (c.computed_score * Number(g.weightage)) / 100;
      weightCounted += Number(g.weightage);
    }
    return { score, weightCounted };
  }, [goals, checkins, quarter]);

  const tone =
    overall.score >= 100 ? "text-emerald-700" :
    overall.score >= 70  ? "text-amber-700" :
    overall.score > 0    ? "text-red-700" :
    "text-muted-foreground";

  return (
    <div className="rounded-lg border bg-card px-4 py-3 text-right shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" />
        {QUARTER_LABEL[quarter]} overall
      </div>
      <div className={cn("text-2xl font-semibold tabular-nums", tone)}>
        {overall.score.toFixed(1)}
      </div>
      <div className="text-[11px] text-muted-foreground">
        {overall.weightCounted}% of weightage scored
      </div>
    </div>
  );
}

function CheckinRowCard({
  goal, quarter, allCheckins,
}: {
  goal: GoalRow;
  quarter: Exclude<import("@/types/database").CyclePhase, "goal_setting">;
  allCheckins: CheckinRow[];
}) {
  const qc = useQueryClient();
  const isShared = goal.is_shared && goal.source_goal_id !== null;
  const existing = allCheckins.find((c) => c.quarter === quarter);
  const [actual, setActual] = useState<number>(existing?.actual_achievement ?? 0);
  const [status, setStatus] = useState<CheckinStatus>(existing?.status ?? "not_started");
  const [savedNotice, setSavedNotice] = useState(false);

  // Live preview score (mirrors DB trigger formula)
  const previewScore = computeScore(goal.uom_type, Number(goal.target), actual);

  const save = useMutation({
    mutationFn: () =>
      upsertCheckin({
        goal_id: goal.id,
        quarter,
        actual_achievement: actual,
        status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkins"] });
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 2000);
    },
  });

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            <Lock className="h-3 w-3" />
            Locked
          </span>
          {isShared && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
              <Link2 className="h-3 w-3" />
              Shared
            </span>
          )}
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
            {goal.weightage}% weight
          </span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{goal.thrust_area}</span>
        </div>

        {/* Goal headline */}
        <div>
          <div className="font-medium">{goal.title}</div>
          {goal.description && <div className="mt-0.5 text-sm text-muted-foreground">{goal.description}</div>}
          <div className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium">UoM:</span> {UOM_LABELS[goal.uom_type]} · <span className="font-medium">Target:</span> {goal.target}
          </div>
        </div>

        {/* Quarter timeline */}
        <div className="flex flex-wrap gap-1.5">
          {QUARTERS.map((q) => {
            const c = allCheckins.find((x) => x.quarter === q);
            const isCurrent = q === quarter;
            return (
              <div
                key={q}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs",
                  isCurrent && "border-primary/40 bg-primary/5",
                  !isCurrent && c && "bg-muted/40",
                  !isCurrent && !c && "border-dashed text-muted-foreground"
                )}
              >
                <div className="font-medium">{QUARTER_LABEL[q]}</div>
                {c ? (
                  <div className="text-muted-foreground">
                    Actual: <span className="font-medium tabular-nums text-foreground">{c.actual_achievement}</span>
                    {" · "}
                    Score: <span className={cn(
                      "font-medium tabular-nums",
                      c.computed_score >= 100 ? "text-emerald-700" :
                      c.computed_score >= 70 ? "text-amber-700" :
                      "text-red-700"
                    )}>{c.computed_score}</span>
                  </div>
                ) : (
                  <div className="text-muted-foreground">{isCurrent ? "In progress" : "—"}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Entry form */}
        <div className="grid grid-cols-1 gap-3 border-t pt-4 md:grid-cols-12">
          <div className="md:col-span-3 space-y-1.5">
            <Label>{QUARTER_LABEL[quarter]} actual</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={actual}
              disabled={isShared}
              onChange={(e) => setActual(Number(e.target.value))}
            />
            <p className="text-[11px] text-muted-foreground">{UOM_HINT[goal.uom_type]}</p>
            {isShared && (
              <p className="text-[11px] text-blue-700">Auto-synced from source-goal owner</p>
            )}
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              disabled={isShared}
              onChange={(e) => setStatus(e.target.value as CheckinStatus)}
            >
              <option value="not_started">Not started</option>
              <option value="on_track">On track</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <Label className="text-xs">Live score preview</Label>
            <div className={cn(
              "flex h-10 items-center justify-center rounded-md border bg-muted/40 px-3 text-lg font-semibold tabular-nums",
              previewScore >= 100 ? "text-emerald-700" :
              previewScore >= 70  ? "text-amber-700" :
              previewScore > 0    ? "text-red-700" :
              "text-muted-foreground"
            )}>
              {previewScore.toFixed(1)}
            </div>
            <p className="text-[11px] text-muted-foreground">Capped at 150. DB writes the final value on save.</p>
          </div>
          <div className="md:col-span-3 flex items-end">
            <Button
              className="w-full"
              onClick={() => save.mutate()}
              disabled={save.isPending || isShared}
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> :
               savedNotice ? <CheckCircle2 className="h-4 w-4" /> :
               <Save className="h-4 w-4" />}
              {savedNotice ? "Saved" : existing ? "Update" : "Save"}
            </Button>
          </div>
        </div>

        {save.isError && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {(save.error as Error).message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">{children}</CardContent>
      </Card>
    </div>
  );
}
