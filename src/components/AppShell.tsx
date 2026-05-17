import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Target,
  ClipboardCheck,
  CalendarCheck2,
  BarChart3,
  ShieldAlert,
  History,
  LogOut,
  Sparkles,
  CalendarRange,
} from "lucide-react";
import { useAuth, useEffectiveRole } from "@/stores/authStore";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { useActiveCycle } from "@/hooks/useActiveCycle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const NAV: NavItem[] = [
  { to: "/goals",       label: "My Goals",      icon: Target,         roles: ["employee"] },
  { to: "/checkins",    label: "Check-ins",     icon: CalendarCheck2, roles: ["employee"] },
  { to: "/team",        label: "Team",          icon: ClipboardCheck, roles: ["manager"] },
  { to: "/team/checkins", label: "Team Check-ins", icon: CalendarCheck2, roles: ["manager"] },
  { to: "/admin/cycles",label: "Cycles",        icon: CalendarRange,  roles: ["admin"] },
  { to: "/admin/audit", label: "Audit Log",     icon: History,        roles: ["admin"] },
  { to: "/analytics",   label: "Analytics",     icon: BarChart3,      roles: ["admin","manager"] },
  { to: "/escalations", label: "Escalations",   icon: ShieldAlert,    roles: ["admin"] },
];

export function AppShell() {
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);
  const role = useEffectiveRole();
  const navigate = useNavigate();
  const { data: cycle } = useActiveCycle();

  const items = NAV.filter((n) => role && n.roles.includes(role));

  return (
    <div className="grid h-full grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="flex flex-col border-r bg-card">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight">Cadence</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">{profile?.name}</div>
            <div>{profile?.email}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              // Don't await — signOut clears local state synchronously; the
              // server round-trip runs in the background.
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
      <div className="flex min-w-0 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card px-6">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">{profile?.name}</span>
            <RoleBadge role={role} />
            {cycle && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {cycle.name} · {cycle.phase.toUpperCase().replace("_", " ")}
              </span>
            )}
          </div>
          <RoleSwitcher />
        </header>
        <main className="flex-1 overflow-auto bg-muted/30 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole | null }) {
  if (!role) return null;
  const map: Record<UserRole, string> = {
    employee: "bg-blue-50 text-blue-800",
    manager: "bg-purple-50 text-purple-800",
    admin: "bg-emerald-50 text-emerald-800",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", map[role])}>
      {role}
    </span>
  );
}
