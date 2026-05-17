import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth, useEffectiveRole } from "@/stores/authStore";
import { AppShell } from "@/components/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import type { UserRole } from "@/types/database";

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = useAuth((s) => s.session);
  const initialized = useAuth((s) => s.initialized);
  if (!initialized) {
    return (
      <div className="grid h-full place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleHome() {
  const role = useEffectiveRole();
  const map: Record<UserRole, string> = {
    employee: "/goals",
    manager: "/team",
    admin: "/admin/cycles",
  };
  if (!role) return null;
  return <Navigate to={map[role]} replace />;
}

export default function App() {
  const init = useAuth((s) => s.init);
  useEffect(() => { void init(); }, [init]);

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<RoleHome />} />
            <Route path="goals"             element={<PlaceholderPage title="My Goals"         description="Create up to 8 goals totaling 100% weightage. Draft auto-saves." phase="3–4 Goal Sheet" />} />
            <Route path="checkins"          element={<PlaceholderPage title="Check-ins"        description="Quarterly achievement entry. UoM auto-scores on save."          phase="6 Check-ins" />} />
            <Route path="team"              element={<PlaceholderPage title="Team"             description="Review and approve direct reports' goal sheets."                phase="5 Approval Workflow" />} />
            <Route path="team/checkins"     element={<PlaceholderPage title="Team Check-ins"   description="Planned vs. Actual per report, with structured comments."       phase="6 Check-ins" />} />
            <Route path="admin/cycles"      element={<PlaceholderPage title="Cycle Management" description="Open/close cycles, configure dates, unlock goals."              phase="7 Audit + Cycles" />} />
            <Route path="admin/audit"       element={<PlaceholderPage title="Audit Log"        description="Every post-lock change with diff and actor."                    phase="7 Audit + Cycles" />} />
            <Route path="analytics"         element={<PlaceholderPage title="Analytics"        description="QoQ trends, completion heatmap, goal distribution."             phase="8 Analytics" />} />
            <Route path="escalations"       element={<PlaceholderPage title="Escalations"      description="Rule-based reminders + email notifications via Resend."         phase="9 Escalation" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
