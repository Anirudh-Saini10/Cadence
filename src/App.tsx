import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/stores/authStore";
import { AppShell } from "@/components/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { LandingPage } from "@/pages/LandingPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { GoalSheetPage } from "@/features/goals/GoalSheetPage";
import { TeamListPage } from "@/features/team/TeamListPage";
import { TeamReviewPage } from "@/features/team/TeamReviewPage";
import { CheckinsPage } from "@/features/checkins/CheckinsPage";
import { TeamCheckinsPage } from "@/features/checkins/TeamCheckinsPage";
import { CycleAdminPage } from "@/features/admin/CycleAdminPage";
import { AuditLogPage } from "@/features/admin/AuditLogPage";
import { UsersAdminPage } from "@/features/admin/UsersAdminPage";
import { AnalyticsPage } from "@/features/analytics/AnalyticsPage";
import { EscalationsPage } from "@/features/escalations/EscalationsPage";

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      // 5s staleTime = data is fresh for 5s after fetch.
      // This prevents the infinite re-render loop that staleTime:0 causes,
      // while still feeling responsive. Mutations call invalidateQueries()
      // to force immediate refreshes after writes.
      staleTime: 5_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
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

function HomeRoute() {
  const session = useAuth((s) => s.session);
  if (session) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

export default function App() {
  const init = useAuth((s) => s.init);
  useEffect(() => { void init(); }, [init]);

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="goals"             element={<GoalSheetPage />} />
            <Route path="checkins"          element={<CheckinsPage />} />
            <Route path="team"              element={<TeamListPage />} />
            <Route path="team/:employeeId"  element={<TeamReviewPage />} />
            <Route path="team/checkins"     element={<TeamCheckinsPage />} />
            <Route path="admin/cycles"      element={<CycleAdminPage />} />
            <Route path="admin/audit"       element={<AuditLogPage />} />
            <Route path="admin/users"       element={<UsersAdminPage />} />
            <Route path="analytics"         element={<AnalyticsPage />} />
            <Route path="escalations"       element={<EscalationsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
