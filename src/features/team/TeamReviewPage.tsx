import { useEffect, useState } from "react";
import { sendEmail, goalApprovedEmail, goalReturnedEmail } from "@/lib/email";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CheckCheck, Loader2, Lock, Link2, Undo2,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/lib/supabase";
import { useActiveCycle } from "@/hooks/useActiveCycle";
import { useAuth } from "@/stores/authStore";
import { fetchGoalsFor } from "@/features/goals/goalApi";
import { goalsQueryKey } from "@/features/goals/useEmployeeGoals";
import { approveAllGoals, returnGoal } from "./teamApi";
import { UOM_LABELS } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { UserRow } from "@/types/database";

export function TeamReviewPage() {
  const { employeeId } = useParams();
  const { data: cycle } = useActiveCycle();
  const me = useAuth((s) => s.profile);
  const cycleId = cycle?.id;
  const qc = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: employee } = useQuery({
    queryKey: ["user", employeeId],
    queryFn: async (): Promise<UserRow | null> => {
      const { data, error } = await supabase
        .from("users").select("*").eq("id", employeeId).single();
      if (error) throw error;
      return data as UserRow;
    },
    enabled: Boolean(employeeId),
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goals", employeeId, cycleId],
    queryFn: () => fetchGoalsFor(employeeId!, cycleId!),
    enabled: Boolean(employeeId && cycleId),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: goalsQueryKey(employeeId, cycleId) });
    qc.invalidateQueries({ queryKey: ["team-summary"] });
  };

  const approveAll = useMutation({
    mutationFn: () => approveAllGoals(employeeId!, cycleId!),
    onSuccess: async () => {
      invalidate();
      setSuccessMsg("All submitted goals approved & locked.");
      window.setTimeout(() => setSuccessMsg(null), 4000);
      if (employee?.email) {
        await sendEmail(goalApprovedEmail({
          employeeEmail: employee.email,
          employeeName: employee.name,
          cycleName: cycle?.name ?? "Active Cycle",
        }));
      }
    },
  });

  const totalWeight = goals.reduce((s, g) => s + Number(g.weightage ?? 0), 0);
  const submittedCount = goals.filter((g) => g.status === "submitted").length;
  const approvedCount = goals.filter((g) => g.status === "approved" || g.status === "locked").length;
  const canApprove = submittedCount > 0 && totalWeight === 100;

  if (!cycle) return <Notice>No active cycle.</Notice>;
  if (isLoading) {
    return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/team" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to team
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{employee?.name ?? "—"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {employee?.department ?? "—"} · {employee?.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <div className={cn(
              "text-2xl font-semibold tabular-nums",
              totalWeight === 100 ? "text-emerald-700" :
              totalWeight === 0   ? "text-muted-foreground" :
              "text-amber-700"
            )}>{totalWeight}%</div>
            <div className="text-xs text-muted-foreground">weightage</div>
          </div>
          <Button
            size="lg"
            onClick={() => approveAll.mutate()}
            disabled={!canApprove || approveAll.isPending}
            title={
              !canApprove
                ? totalWeight !== 100
                  ? `Weightage must total 100% (currently ${totalWeight}%)`
                  : "No submitted goals to approve"
                : undefined
            }
          >
            {approveAll.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            Approve all ({submittedCount})
          </Button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <Chip label="Total" n={goals.length} />
        <Chip label="Submitted" n={submittedCount} tone="amber" />
        <Chip label="Approved/Locked" n={approvedCount} tone="emerald" />
        <Chip label="Returned" n={goals.filter((g) => g.status === "returned").length} tone="red" />
        <Chip label="Draft" n={goals.filter((g) => g.status === "draft").length} />
      </div>

      {approveAll.isError && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {(approveAll.error as Error).message}
        </div>
      )}

      {goals.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No goals yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {goals.map((g, i) => (
            <ReviewGoalCard
              key={g.id}
              index={i}
              goal={g}
              onChanged={invalidate}
              employeeEmail={employee?.email ?? ""}
              employeeName={employee?.name ?? ""}
              cycleName={cycle?.name ?? "Active Cycle"}
            />
          ))}
        </div>
      )}

      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-lg">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div className="font-medium">{successMsg}</div>
        </div>
      )}
    </div>
  );
}

function ReviewGoalCard({
  index, goal, onChanged, employeeEmail, employeeName, cycleName,
}: {
  index: number;
  goal: import("@/types/database").GoalRow;
  onChanged: () => void;
  employeeEmail: string;
  employeeName: string;
  cycleName: string;
}) {
  const [showReturn, setShowReturn] = useState(false);
  const [reason, setReason] = useState("");
  const isLocked = goal.locked_at !== null;
  const isShared = goal.is_shared && goal.source_goal_id !== null;
  const canActionReturn = goal.status === "submitted";

  const ret = useMutation({
    mutationFn: () => returnGoal(goal.id, reason.trim()),
    onSuccess: async () => {
      onChanged();
      setShowReturn(false);
      if (employeeEmail) {
        await sendEmail(goalReturnedEmail({
          employeeEmail,
          employeeName,
          cycleName,
          reason: reason.trim(),
        }));
      }
      setReason("");
    },
  });

  return (
    <Card className={cn(
      isLocked && "bg-emerald-50/30 border-emerald-200",
      goal.status === "returned" && "border-red-300 bg-red-50/30"
    )}>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">{index + 1}</span>
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
          <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
            {goal.weightage}% weightage
          </span>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{goal.thrust_area}</div>
          <div className="mt-0.5 font-medium">{goal.title || <span className="italic text-muted-foreground">(no title)</span>}</div>
          {goal.description && (
            <div className="mt-1 text-sm text-muted-foreground">{goal.description}</div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <Meta label="UoM" value={UOM_LABELS[goal.uom_type]} />
          <Meta label="Target" value={String(goal.target)} />
        </div>

        {goal.status === "returned" && goal.returned_reason && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">
            <div className="font-medium text-red-900">Previously returned</div>
            <div className="mt-1 text-red-800">{goal.returned_reason}</div>
          </div>
        )}

        {/* Manager actions */}
        {canActionReturn && !isLocked && (
          <div className="border-t pt-3">
            {showReturn ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Why is this being returned? (e.g. target seems too low; redefine measurement)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                {ret.isError && (
                  <div className="text-xs text-red-700">{(ret.error as Error).message}</div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setShowReturn(false); setReason(""); }}>Cancel</Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => ret.mutate()}
                    disabled={!reason.trim() || ret.isPending}
                  >
                    {ret.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                    Return goal
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowReturn(true)}>
                <Undo2 className="h-3.5 w-3.5" />
                Return for rework
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Chip({ label, n, tone }: { label: string; n: number; tone?: "amber" | "emerald" | "red" }) {
  const color =
    tone === "amber"   ? "bg-amber-50 text-amber-800" :
    tone === "emerald" ? "bg-emerald-50 text-emerald-800" :
    tone === "red"     ? "bg-red-50 text-red-800" :
    "bg-muted text-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium", color)}>
      <span>{label}</span>
      <span className="rounded-full bg-white/60 px-1.5 tabular-nums">{n}</span>
    </span>
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
