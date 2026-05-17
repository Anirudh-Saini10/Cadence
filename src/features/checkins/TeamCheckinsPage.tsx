import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, MessageSquare, Send, ChevronDown, ChevronRight,
  Lock, TrendingUp, Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/stores/authStore";
import { useActiveCycle } from "@/hooks/useActiveCycle";
import { fetchDirectReports } from "@/features/team/teamApi";
import {
  QUARTERS, QUARTER_LABEL, activeQuarter,
  fetchCheckinsByGoals, fetchLockedGoals,
  fetchCommentsByCheckins, addComment,
} from "./checkinApi";
import { UOM_LABELS } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { GoalRow, CheckinRow, UserRow } from "@/types/database";

export function TeamCheckinsPage() {
  const me = useAuth((s) => s.profile);
  const { data: cycle } = useActiveCycle();
  const cycleId = cycle?.id;
  const quarter = cycle ? activeQuarter(cycle.phase) : null;
  const qc = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ["direct-reports", me?.id],
    queryFn: () => fetchDirectReports(me!.id),
    enabled: Boolean(me?.id),
  });

  if (!cycle) return <Notice>No active cycle.</Notice>;
  if (!quarter) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="space-y-2 py-12 text-center">
            <Info className="mx-auto h-8 w-8 text-amber-500" />
            <div className="font-medium">Check-ins not open</div>
            <p className="text-sm text-muted-foreground">
              Cycle {cycle.name} is in goal-setting phase. Once Admin advances to Q1, your team's check-ins will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Team Check-ins</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reviewing <span className="font-medium text-foreground">{QUARTER_LABEL[quarter]}</span> across {reports.length} report{reports.length === 1 ? "" : "s"}.
        </p>
      </div>

      {reports.length === 0 ? (
        <Notice>No direct reports.</Notice>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <ReportSection
              key={r.id}
              employee={r}
              cycleId={cycleId!}
              quarter={quarter}
              managerId={me!.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportSection({
  employee, cycleId, quarter, managerId,
}: {
  employee: UserRow;
  cycleId: string;
  quarter: Exclude<import("@/types/database").CyclePhase, "goal_setting">;
  managerId: string;
}) {
  const [open, setOpen] = useState(true);

  const { data: goals = [], isLoading: gLoading } = useQuery({
    queryKey: ["locked-goals", employee.id, cycleId],
    queryFn: () => fetchLockedGoals(employee.id, cycleId),
  });

  const goalIds = goals.map((g) => g.id);
  const { data: checkins = [] } = useQuery({
    queryKey: ["checkins", goalIds.join(",")],
    queryFn: () => fetchCheckinsByGoals(goalIds),
    enabled: goalIds.length > 0,
  });

  const overall = useMemo(() => {
    let s = 0;
    for (const g of goals) {
      const c = checkins.find((x) => x.goal_id === g.id && x.quarter === quarter);
      if (c) s += (c.computed_score * Number(g.weightage)) / 100;
    }
    return s;
  }, [goals, checkins, quarter]);

  const submittedCount = checkins.filter((c) => c.quarter === quarter).length;

  return (
    <Card>
      <CardContent className="pt-4">
        <button
          className="flex w-full items-center gap-3 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Avatar name={employee.name} />
          <div className="min-w-0 flex-1">
            <div className="font-medium">{employee.name}</div>
            <div className="text-xs text-muted-foreground">
              {employee.department ?? "—"} · {submittedCount}/{goals.length} check-ins for {QUARTER_LABEL[quarter]}
            </div>
          </div>
          <div className="text-right">
            <div className={cn(
              "flex items-center gap-1 text-base font-semibold tabular-nums",
              overall >= 100 ? "text-emerald-700" :
              overall >= 70  ? "text-amber-700" :
              overall > 0    ? "text-red-700" :
              "text-muted-foreground"
            )}>
              <TrendingUp className="h-4 w-4" />
              {overall.toFixed(1)}
            </div>
            <div className="text-[11px] text-muted-foreground">{QUARTER_LABEL[quarter]} overall</div>
          </div>
        </button>

        {open && (
          <div className="mt-4 space-y-3 border-t pt-4">
            {gLoading ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            ) : goals.length === 0 ? (
              <div className="text-sm text-muted-foreground">No locked goals yet.</div>
            ) : (
              goals.map((g) => (
                <GoalCheckinReview
                  key={g.id}
                  goal={g}
                  quarter={quarter}
                  checkins={checkins.filter((c) => c.goal_id === g.id)}
                  managerId={managerId}
                />
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GoalCheckinReview({
  goal, quarter, checkins, managerId,
}: {
  goal: GoalRow;
  quarter: Exclude<import("@/types/database").CyclePhase, "goal_setting">;
  checkins: CheckinRow[];
  managerId: string;
}) {
  const qc = useQueryClient();
  const current = checkins.find((c) => c.quarter === quarter);

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", current?.id ?? "none"],
    queryFn: () => fetchCommentsByCheckins(current ? [current.id] : []),
    enabled: Boolean(current?.id),
  });

  const [draft, setDraft] = useState("");
  const post = useMutation({
    mutationFn: () => addComment(current!.id, managerId, draft.trim()),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["comments"] });
    },
    onError: () => {}, // un-sticks button on failure
  });

  const variancePct = current
    ? ((current.computed_score - 100) / 100) * 100
    : null;

  return (
    <div className="rounded-lg border bg-card/50 p-4">
      {/* Goal info */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{goal.thrust_area}</div>
          <div className="mt-0.5 font-medium">{goal.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium">UoM:</span> {UOM_LABELS[goal.uom_type]} · <span className="font-medium">Target:</span> {goal.target} · <span className="font-medium">Weight:</span> {goal.weightage}%
          </div>
        </div>
        <PlannedVsActual current={current} target={Number(goal.target)} />
      </div>

      {/* Variance + chips */}
      {current && variancePct !== null && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
            current.computed_score >= 100 ? "bg-emerald-50 text-emerald-800" :
            current.computed_score >= 70  ? "bg-amber-50 text-amber-800" :
            "bg-red-50 text-red-800"
          )}>
            Score {current.computed_score}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
            Variance {variancePct >= 0 ? "+" : ""}{variancePct.toFixed(1)}%
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 capitalize">
            {current.status.replace("_", " ")}
          </span>
        </div>
      )}

      {!current && (
        <div className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Not submitted yet for {QUARTER_LABEL[quarter]}.
        </div>
      )}

      {/* Comments */}
      {current && (
        <div className="mt-3 border-t pt-3">
          <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            Comments ({comments.length})
          </div>
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                <div className="mb-0.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{c.manager_name}</span>{" "}
                  · {new Date(c.created_at).toLocaleDateString()}
                </div>
                <div>{c.comment}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Textarea
              placeholder="Add a comment to the employee…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[44px]"
            />
            <Button
              onClick={() => post.mutate()}
              disabled={!draft.trim() || post.isPending}
            >
              {post.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {post.isError && (
            <div className="mt-1 text-xs text-red-700">{(post.error as Error).message}</div>
          )}
        </div>
      )}
    </div>
  );
}

function PlannedVsActual({ current, target }: { current: CheckinRow | undefined; target: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-right">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Target</div>
        <div className="text-base font-semibold tabular-nums">{target}</div>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Actual</div>
        <div className={cn(
          "text-base font-semibold tabular-nums",
          !current && "text-muted-foreground"
        )}>
          {current ? current.actual_achievement : "—"}
        </div>
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials}
    </div>
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
