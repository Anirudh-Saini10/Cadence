import { useQuery } from "@tanstack/react-query";
import {
  Target, TrendingUp, Users, Calendar, CheckCircle2, Clock,
  ArrowRight, Loader2, BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth, useEffectiveRole } from "@/stores/authStore";
import { useActiveCycle } from "@/hooks/useActiveCycle";
import { fetchLockedGoals } from "@/features/checkins/checkinApi";
import { fetchDirectReports } from "@/features/team/teamApi";
import { fetchDeptStats } from "@/features/analytics/analyticsApi";
import { DemoSeeder } from "@/features/admin/DemoSeeder";

export function DashboardPage() {
  const role = useEffectiveRole();
  const profile = useAuth((s) => s.profile);
  const { data: cycle } = useActiveCycle();

  if (!role || !profile) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cycle ? `${cycle.name} · ${cycle.phase.replace("_", " ")}` : "No active cycle"}
        </p>
      </div>

      {/* Role-specific widgets */}
      {role === "employee" && <EmployeeDashboard profile={profile} cycle={cycle} />}
      {role === "manager" && <ManagerDashboard profile={profile} cycle={cycle} />}
      {role === "admin" && <AdminDashboard cycle={cycle} />}
    </div>
  );
}

function EmployeeDashboard({ profile, cycle }: { profile: { id: string; name?: string }; cycle: any }) {
  const { data: goals = [] } = useQuery({
    queryKey: ["locked-goals", profile.id, cycle?.id],
    queryFn: () => fetchLockedGoals(profile.id, cycle!.id),
    enabled: !!cycle?.id,
  });

  const totalWeight = goals.reduce((s, g) => s + Number(g.weightage), 0);
  const submittedCount = goals.filter((g) => g.status === "submitted" || g.status === "locked").length;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Target} label="Goals" value={String(goals.length)} sub="approved & locked" />
        <StatCard icon={BarChart3} label="Weightage" value={`${totalWeight}%`} sub="of 100%" />
        <StatCard icon={CheckCircle2} label="Submitted" value={String(submittedCount)} sub="check-ins" />
        <StatCard icon={Clock} label="Phase" value={cycle?.phase.replace("_", " ") ?? "—"} sub="current" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/goals" className="flex items-center justify-between rounded-md border px-4 py-3 text-sm hover:bg-accent transition-colors">
              <span>Manage My Goals</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/checkins" className="flex items-center justify-between rounded-md border px-4 py-3 text-sm hover:bg-accent transition-colors">
              <span>Record Check-ins</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ManagerDashboard({ profile, cycle }: { profile: { id: string; name?: string }; cycle: any }) {
  const { data: reports = [] } = useQuery({
    queryKey: ["direct-reports", profile.id],
    queryFn: () => fetchDirectReports(profile.id),
  });

  const pendingApproval = reports.filter((r: any) => r.submitted > 0 && r.approved === 0).length;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Direct Reports" value={String(reports.length)} sub="team members" />
        <StatCard icon={Target} label="Pending Review" value={String(pendingApproval)} sub="goal sheets" />
        <StatCard icon={CheckCircle2} label="Approved" value={String(reports.reduce((s: number, r: any) => s + r.approved, 0))} sub="total locked" />
        <StatCard icon={Clock} label="Phase" value={cycle?.phase.replace("_", " ") ?? "—"} sub="current" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/team" className="flex items-center justify-between rounded-md border px-4 py-3 text-sm hover:bg-accent transition-colors">
              <span>Review Team Goals</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/team/checkins" className="flex items-center justify-between rounded-md border px-4 py-3 text-sm hover:bg-accent transition-colors">
              <span>Review Check-ins</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function AdminDashboard({ cycle }: { cycle: any }) {
  const { data: stats = [] } = useQuery({
    queryKey: ["analytics-dept", cycle?.id],
    queryFn: () => fetchDeptStats(cycle!.id),
    enabled: !!cycle?.id,
  });

  const totalGoals = stats.reduce((s: number, d: any) => s + d.total, 0);
  const approvedGoals = stats.reduce((s: number, d: any) => s + d.approved, 0);
  const completionRate = totalGoals > 0 ? Math.round((approvedGoals / totalGoals) * 100) : 0;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Target} label="Total Goals" value={String(totalGoals)} sub="across org" />
        <StatCard icon={CheckCircle2} label="Approved" value={String(approvedGoals)} sub="locked goals" />
        <StatCard icon={TrendingUp} label="Completion" value={`${completionRate}%`} sub="org-wide" />
        <StatCard icon={Calendar} label="Phase" value={cycle?.phase.replace("_", " ") ?? "—"} sub="current" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/admin/cycles" className="flex items-center justify-between rounded-md border px-4 py-3 text-sm hover:bg-accent transition-colors">
              <span>Manage Cycles</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/admin/users" className="flex items-center justify-between rounded-md border px-4 py-3 text-sm hover:bg-accent transition-colors">
              <span>Manage Users</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/escalations" className="flex items-center justify-between rounded-md border px-4 py-3 text-sm hover:bg-accent transition-colors">
              <span>Escalation Rules</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
        <DemoSeeder />
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}
