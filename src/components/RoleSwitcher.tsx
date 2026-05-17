import { Users, Briefcase, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useEffectiveRole } from "@/stores/authStore";
import type { UserRole } from "@/types/database";

const OPTIONS: { role: UserRole; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { role: "employee", label: "Employee", icon: Users },
  { role: "manager",  label: "Manager",  icon: Briefcase },
  { role: "admin",    label: "Admin",    icon: Shield },
];

/**
 * Demo affordance per blueprint: only visible when logged in as an admin.
 * Lets judges flip between dashboards without re-authenticating.
 * Note: RLS still enforces the *real* role for any data writes — this only
 * swaps which UI is rendered.
 */
export function RoleSwitcher() {
  const profile = useAuth((s) => s.profile);
  const setDemoRole = useAuth((s) => s.setDemoRole);
  const effective = useEffectiveRole();

  if (!profile || profile.role !== "admin") return null;

  return (
    <div className="inline-flex items-center rounded-md border bg-card p-0.5 shadow-sm">
      <span className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Demo view
      </span>
      {OPTIONS.map(({ role, label, icon: Icon }) => {
        const active = effective === role;
        return (
          <button
            key={role}
            type="button"
            onClick={() => setDemoRole(role === "admin" ? null : role)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
