import * as React from "react";
import { useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  Sparkles,
  ClipboardList,
  CalendarCheck2,
  ClipboardCheck,
  CalendarRange,
  History,
  BarChart3,
  ShieldAlert,
  LogOut,
  UserCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, useEffectiveRole } from "@/stores/authStore";
import { useActiveCycle } from "@/hooks/useActiveCycle";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const HOME_MAP: Record<UserRole, string> = {
  employee: "/goals",
  manager: "/team",
  admin: "/admin/cycles",
};

function SidebarLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const location = useLocation();
  const active = location.pathname === to || location.pathname.startsWith(to + "/") || (to !== "/" && location.pathname === to);
  // Special case: home paths should also be active when exactly on that path
  const isHome = ["/goals", "/team", "/admin/cycles"].includes(to);
  const isExactHome = isHome && location.pathname === to;
  const finalActive = active || isExactHome;
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
        finalActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export function AppShell() {
  const profile = useAuth((s) => s.profile);
  const role = useEffectiveRole();
  const navigate = useNavigate();
  const location = useLocation();
  const signOut = useAuth((s) => s.signOut);
  const { data: cycle } = useActiveCycle();

  const homePath = role ? HOME_MAP[role] : "/";

  // When role changes via the demo switcher, redirect to the home page
  // for the new role. Use a ref to avoid re-running on every pathname change.
  const lastRole = React.useRef<string | null>(null);
  useEffect(() => {
    if (!role) return;
    if (lastRole.current !== role) {
      lastRole.current = role;
      // Only redirect if we're not already on this role's home page
      if (location.pathname !== homePath) {
        navigate(homePath, { replace: true });
      }
    }
  }, [role, homePath, navigate, location.pathname]);

  const user = useAuth((s) => s.user);

  if (!profile) {
    if (user) {
      return (
        <div className="grid h-screen place-items-center text-center">
          <div className="space-y-3">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
            <p className="text-sm text-muted-foreground">Could not load profile.</p>
            <Button size="sm" variant="outline" onClick={() => useAuth.getState().init()}>
              Retry
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="grid h-screen place-items-center text-center">
        <div>
          <Sparkles className="mx-auto h-8 w-8 animate-pulse text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="flex flex-col border-r bg-card">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight">Cadence</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {/* ---- Employee nav ---- */}
          {role === "employee" && (
            <>
              <SidebarLink to="/goals" icon={ClipboardList} label="Dashboard" />
              <SidebarLink to="/goals" icon={ClipboardList} label="My Goals" />
              <SidebarLink to="/checkins" icon={CalendarCheck2} label="Check-ins" />
            </>
          )}
          {/* ---- Manager nav ---- */}
          {role === "manager" && (
            <>
              <SidebarLink to="/team" icon={ClipboardList} label="Dashboard" />
              <SidebarLink to="/goals" icon={ClipboardList} label="My Goals" />
              <SidebarLink to="/checkins" icon={CalendarCheck2} label="Check-ins" />
              <SidebarLink to="/team" icon={ClipboardCheck} label="Team" />
              <SidebarLink to="/team/checkins" icon={CalendarCheck2} label="Team Check-ins" />
              <SidebarLink to="/analytics" icon={BarChart3} label="Analytics" />
            </>
          )}
          {/* ---- Admin nav ---- */}
          {role === "admin" && (
            <>
              <SidebarLink to="/admin/cycles" icon={ClipboardList} label="Dashboard" />
              <SidebarLink to="/goals" icon={ClipboardList} label="My Goals" />
              <SidebarLink to="/checkins" icon={CalendarCheck2} label="Check-ins" />
              <SidebarLink to="/admin/cycles" icon={CalendarRange} label="Cycles" />
              <SidebarLink to="/admin/users" icon={UserCircle} label="Users" />
              <SidebarLink to="/admin/audit" icon={History} label="Audit Log" />
              <SidebarLink to="/analytics" icon={BarChart3} label="Analytics" />
              <SidebarLink to="/escalations" icon={ShieldAlert} label="Escalations" />
            </>
          )}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <UserCircle className="h-4 w-4" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-foreground">{profile?.name}</div>
              <div className="truncate">{profile?.email}</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              void signOut();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-3">
            {cycle && (
              <div className="flex items-center gap-2 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span className="text-foreground">{cycle.name}</span>
                <span className="opacity-40">/</span>
                <span className="text-primary">{cycle.phase.replace("_", " ")}</span>
              </div>
            )}
          </div>
          {/* Role Switcher (Judge Mode) */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-1">
            <span className="px-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/60">Demo View</span>
            {(["employee", "manager", "admin"] as const).map((r) => (
              <button
                key={r}
                onClick={() => useAuth.getState().setDemoRole(r)}
                className={cn(
                  "rounded px-2 py-1 text-[11px] font-semibold capitalize transition-all",
                  role === r ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
            <button
              onClick={() => useAuth.getState().setDemoRole(null)}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
              title="Clear override"
            >
              <History className="h-3 w-3" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <React.Suspense fallback={<div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
            <Outlet />
          </React.Suspense>
        </div>
      </main>
    </div>
  );
}
