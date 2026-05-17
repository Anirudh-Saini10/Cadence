import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Calendar, 
  ChevronRight, 
  Loader2, 
  Plus, 
  Settings2, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchAllCycles, updateCycle } from "./adminApi";
import { cn } from "@/lib/utils";
import type { CycleRow, CyclePhase } from "@/types/database";

const PHASE_ORDER: CyclePhase[] = ["goal_setting", "q1", "q2", "q3", "q4_annual"];

export function CycleAdminPage() {
  const qc = useQueryClient();
  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ["admin-cycles"],
    queryFn: fetchAllCycles,
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => updateCycle(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cycles"] });
      qc.invalidateQueries({ queryKey: ["active-cycle"] });
    },
  });

  if (isLoading) {
    return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const activeCycle = cycles.find((c) => c.status === "active");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cycle Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control the company-wide performance timeline. Only one cycle can be active at a time.
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          New Cycle
        </Button>
      </div>

      {activeCycle && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <CardTitle>Current Active Cycle: {activeCycle.name}</CardTitle>
                </div>
                <CardDescription>Started on {new Date(activeCycle.open_date).toLocaleDateString()}</CardDescription>
              </div>
              <div className="rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                Active
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mt-4">
              {/* Progress Line */}
              <div className="absolute left-0 top-5 h-0.5 w-full bg-muted" />
              <div className="relative flex justify-between">
                {PHASE_ORDER.map((phase, idx) => {
                  const isCurrent = activeCycle.phase === phase;
                  const isPast = PHASE_ORDER.indexOf(activeCycle.phase) > idx;
                  const canAdvance = PHASE_ORDER.indexOf(activeCycle.phase) === idx - 1;

                  return (
                    <div key={phase} className="z-10 flex flex-col items-center">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-4 bg-background transition-all",
                        isCurrent ? "border-primary scale-110 shadow-lg" : 
                        isPast ? "border-emerald-500 bg-emerald-50" : "border-muted"
                      )}>
                        {isPast ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : 
                         <span className={cn("text-xs font-bold", isCurrent ? "text-primary" : "text-muted-foreground")}>
                           {idx + 1}
                         </span>
                        }
                      </div>
                      <div className="mt-3 text-center">
                        <div className={cn("text-xs font-bold uppercase tracking-tighter", isCurrent ? "text-primary" : "text-muted-foreground")}>
                          {phase.replace("_", " ")}
                        </div>
                        {canAdvance && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-2 h-7 text-[10px]"
                            onClick={() => update.mutate({ id: activeCycle.id, patch: { phase } })}
                            disabled={update.isPending}
                          >
                            Advance <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-12 flex flex-col gap-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold">Advance Phase with Caution</p>
                    <p className="mt-1">
                      Moving the phase to <span className="font-bold">Q1/Q2/Q3/Q4</span> will open check-ins for all employees.
                      This cannot be undone easily through the UI.
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-fit gap-2"
                onClick={() => update.mutate({ id: activeCycle.id, patch: { phase: "goal_setting" } })}
                disabled={update.isPending || activeCycle.phase === "goal_setting"}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to Goal Setting
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Historical Cycles</h3>
        <div className="grid gap-4">
          {cycles.filter(c => c.status !== "active").length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No historical cycles found.
            </div>
          ) : (
            cycles.filter(c => c.status !== "active").map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(c.open_date).getFullYear()} · {c.phase.replace("_", " ")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium capitalize text-muted-foreground">{c.status}</span>
                    <Button variant="ghost" size="icon"><Settings2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
