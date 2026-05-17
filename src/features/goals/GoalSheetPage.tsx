import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Send, Loader2, Info, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/stores/authStore";
import { useActiveCycle } from "@/hooks/useActiveCycle";
import { useEmployeeGoals, goalsQueryKey } from "./useEmployeeGoals";
import { createGoal, deleteGoal, submitAllGoals, updateGoal } from "./goalApi";
import { GoalCard, type GoalDraft } from "./GoalCard";
import { WeightageBar } from "./WeightageBar";
import {
  MAX_GOALS,
  MIN_WEIGHTAGE,
  TARGET_WEIGHTAGE_TOTAL,
  THRUST_AREAS,
} from "@/lib/constants";
import type { GoalRow } from "@/types/database";

type SaveState = "idle" | "saving" | "saved" | "error";

export function GoalSheetPage() {
  const profile = useAuth((s) => s.profile);
  const { data: cycle } = useActiveCycle();
  const employeeId = profile?.id ?? null;
  const cycleId = cycle?.id ?? null;
  const qc = useQueryClient();

  const { data: goals = [], isLoading, error } = useEmployeeGoals(employeeId, cycleId);

  // Local unsaved-edit overlay per goal id
  const [drafts, setDrafts] = useState<Record<string, Partial<GoalDraft>>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Effective goals (server merged with local drafts) for weightage math
  const effectiveGoals = useMemo(() => {
    return goals.map((g) => ({ ...g, ...(drafts[g.id] ?? {}) }));
  }, [goals, drafts]);

  const totalWeight = effectiveGoals.reduce(
    (s, g) => s + (Number(g.weightage) || 0),
    0
  );

  const anyLocked = goals.some((g) => g.locked_at);
  const allLocked = goals.length > 0 && goals.every((g) => g.locked_at);
  const submittable =
    goals.length > 0 &&
    totalWeight === TARGET_WEIGHTAGE_TOTAL &&
    effectiveGoals.every((g) => Number(g.weightage) >= MIN_WEIGHTAGE) &&
    effectiveGoals.every((g) => String(g.title ?? "").trim().length > 0) &&
    goals.every((g) => g.status === "draft" || g.status === "returned");

  // ---- mutations ----
  const update = useMutation({
    mutationFn: (args: { id: string; patch: Partial<GoalRow> }) =>
      updateGoal(args.id, args.patch),
    onMutate: ({ id }) => {
      setSaveStates((s) => ({ ...s, [id]: "saving" }));
    },
    onSuccess: (row) => {
      setSaveStates((s) => ({ ...s, [row.id]: "saved" }));
      setSaveErrors((e) => { const { [row.id]: _, ...rest } = e; return rest; });
      setDrafts((d) => { const { [row.id]: _, ...rest } = d; return rest; });
      qc.invalidateQueries({ queryKey: goalsQueryKey(employeeId, cycleId) });
      window.setTimeout(() => {
        setSaveStates((s) => (s[row.id] === "saved" ? { ...s, [row.id]: "idle" } : s));
      }, 1500);
    },
    onError: (err: Error, vars) => {
      setSaveStates((s) => ({ ...s, [vars.id]: "error" }));
      setSaveErrors((e) => ({ ...e, [vars.id]: err.message }));
    },
  });

  const create = useMutation({
    mutationFn: createGoal,
    onSuccess: () => qc.invalidateQueries({ queryKey: goalsQueryKey(employeeId, cycleId) }),
  });

  const remove = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => qc.invalidateQueries({ queryKey: goalsQueryKey(employeeId, cycleId) }),
  });

  const submit = useMutation({
    mutationFn: () => submitAllGoals(employeeId!, cycleId!),
    onMutate: () => { setSubmitError(null); setSubmitSuccess(false); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalsQueryKey(employeeId, cycleId) });
      setSubmitSuccess(true);
      window.setTimeout(() => setSubmitSuccess(false), 4000);
    },
    onError: (e: Error) => setSubmitError(e.message),
  });
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ---- handlers ----
  const handleDraftChange = (id: string, patch: Partial<GoalDraft>) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  };

  const handleFlush = (g: GoalRow) => {
    const patch = drafts[g.id];
    if (!patch || Object.keys(patch).length === 0) return;
    update.mutate({ id: g.id, patch: patch as Partial<GoalRow> });
  };

  const handleAdd = () => {
    if (!employeeId || !cycleId) return;
    if (goals.length >= MAX_GOALS) return;
    create.mutate({
      employee_id: employeeId,
      cycle_id: cycleId,
      thrust_area: THRUST_AREAS[0],
      title: "",
      description: "",
      uom_type: "min",
      target: 0,
      weightage: 0,
    });
  };

  // ---- rendering ----
  if (!cycle) {
    return <EmptyState>No active cycle. Ask Admin to open one.</EmptyState>;
  }

  if (isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <EmptyState>Failed to load goals: {(error as Error).message}</EmptyState>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Goals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create up to {MAX_GOALS} goals totaling exactly {TARGET_WEIGHTAGE_TOTAL}% weightage. Drafts auto-save on blur.
          </p>
        </div>
      </div>

      <WeightageBar total={totalWeight} goalCount={goals.length} />

      <div className="space-y-4">
        {goals.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No goals yet. Click <span className="font-medium text-foreground">Add Goal</span> to start.
            </CardContent>
          </Card>
        ) : (
          goals.map((g, idx) => (
            <GoalCard
              key={g.id}
              goal={g}
              index={idx}
              draft={drafts[g.id] ?? {}}
              saveState={saveStates[g.id] ?? "idle"}
              saveError={saveErrors[g.id]}
              onDraftChange={(patch) => handleDraftChange(g.id, patch)}
              onFlush={() => handleFlush(g)}
              onDelete={() => remove.mutate(g.id)}
            />
          ))
        )}
      </div>

      {/* Footer actions — sticky at the bottom so Submit is always reachable */}
      <div className="sticky bottom-0 mt-6 -mx-6 border-t bg-card/95 px-6 py-4 shadow-[0_-2px_8px_-2px_rgba(0,0,0,0.05)] backdrop-blur">
        {/* Validation hint always renders above buttons */}
        {!submittable && goals.length > 0 && !anyLocked && (
          <div className="mb-3 inline-flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              {totalWeight !== 100
                ? `Total weightage must equal 100% to submit (currently ${totalWeight}%).`
                : "Each goal needs a title and at least 10% weightage."}
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleAdd}
            disabled={goals.length >= MAX_GOALS || allLocked || create.isPending}
            title={
              goals.length >= MAX_GOALS
                ? `Maximum ${MAX_GOALS} goals reached`
                : allLocked
                ? "All goals are locked"
                : undefined
            }
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Goal
            <span className="ml-1 text-xs text-muted-foreground">
              {goals.length}/{MAX_GOALS}
            </span>
          </Button>

          <Button
            onClick={() => submit.mutate()}
            disabled={!submittable || submit.isPending}
            size="lg"
          >
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit for approval
          </Button>
        </div>
      </div>

      {submitError && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="font-medium">Submit failed:</span> {submitError}
        </div>
      )}
      {submitSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-lg">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <div className="font-semibold">Goals submitted</div>
            <div className="text-xs text-emerald-800">Your manager will review and approve.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
