import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ChevronRight, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/stores/authStore";
import { useActiveCycle } from "@/hooks/useActiveCycle";
import { fetchReportSummaries, type ReportSummary } from "./teamApi";
import { cn } from "@/lib/utils";

export function TeamListPage() {
  const profile = useAuth((s) => s.profile);
  const { data: cycle } = useActiveCycle();
  const managerId = profile?.id;
  const cycleId = cycle?.id;

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["team-summary", managerId, cycleId],
    queryFn: () => fetchReportSummaries(managerId!, cycleId!),
    enabled: Boolean(managerId && cycleId),
  });

  if (!cycle) return <Notice>No active cycle. Ask Admin to open one.</Notice>;
  if (isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) return <Notice>Failed to load team: {(error as Error).message}</Notice>;

  const totalPending = rows.reduce((s, r) => s + r.submitted, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} direct report{rows.length === 1 ? "" : "s"}
            {totalPending > 0 && (
              <>
                {" · "}
                <span className="font-medium text-amber-700">
                  {totalPending} goal{totalPending === 1 ? "" : "s"} waiting for review
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Users className="mx-auto mb-3 h-8 w-8 opacity-40" />
            No direct reports assigned.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <ReportRow key={r.employee.id} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportRow({ row }: { row: ReportSummary }) {
  const hasPending = row.submitted > 0;
  return (
    <Link
      to={`/team/${row.employee.id}`}
      className={cn(
        "group block rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary/30 hover:shadow",
        hasPending && "border-amber-300 bg-amber-50/30"
      )}
    >
      <div className="flex items-center gap-4">
        <Avatar name={row.employee.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate font-medium">{row.employee.name}</div>
            {hasPending && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                {row.submitted} pending review
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.employee.department ?? "—"} · {row.employee.email}
          </div>
        </div>
        <div className="hidden gap-4 text-center text-xs text-muted-foreground sm:flex">
          <Counter n={row.drafts} label="Draft" />
          <Counter n={row.submitted} label="Submitted" tone={hasPending ? "amber" : undefined} />
          <Counter n={row.approved} label="Approved" tone="emerald" />
          {row.returned > 0 && <Counter n={row.returned} label="Returned" tone="red" />}
          <div className="border-l pl-4">
            <div className={cn(
              "text-base font-semibold tabular-nums",
              row.totalWeight === 100 ? "text-emerald-700" :
              row.totalWeight === 0 ? "text-muted-foreground" :
              "text-amber-700"
            )}>
              {row.totalWeight}%
            </div>
            <div>weightage</div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}

function Counter({ n, label, tone }: { n: number; label: string; tone?: "amber" | "emerald" | "red" }) {
  const color =
    tone === "amber"   ? "text-amber-700" :
    tone === "emerald" ? "text-emerald-700" :
    tone === "red"     ? "text-red-700" :
    "text-foreground";
  return (
    <div>
      <div className={cn("text-base font-semibold tabular-nums", color)}>{n}</div>
      <div>{label}</div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
      {initials}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
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
