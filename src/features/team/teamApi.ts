import { supabase } from "@/lib/supabase";
import type { UserRow, GoalRow } from "@/types/database";

/** All direct reports of the currently-logged-in manager. RLS handles scoping. */
export async function fetchDirectReports(managerId: string): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("manager_id", managerId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as UserRow[];
}

/** Approve every submitted goal for a given employee+cycle. DB trigger
 *  stamps locked_at and writes audit log entries. */
export async function approveAllGoals(employeeId: string, cycleId: string): Promise<void> {
  const { error } = await supabase
    .from("goals")
    .update({ status: "approved" })
    .eq("employee_id", employeeId)
    .eq("cycle_id", cycleId)
    .eq("status", "submitted");
  if (error) throw error;
}

/** Return a single goal back to the employee with a reason. */
export async function returnGoal(goalId: string, reason: string): Promise<GoalRow> {
  const { data, error } = await supabase
    .from("goals")
    .update({ status: "returned", returned_reason: reason })
    .eq("id", goalId)
    .select()
    .single();
  if (error) throw error;
  return data as GoalRow;
}

/** Lightweight summary used on the team list page. */
export interface ReportSummary {
  employee: UserRow;
  total: number;
  drafts: number;
  submitted: number;
  approved: number;
  returned: number;
  totalWeight: number;
}

export async function fetchReportSummaries(
  managerId: string,
  cycleId: string
): Promise<ReportSummary[]> {
  const reports = await fetchDirectReports(managerId);
  if (reports.length === 0) return [];

  const ids = reports.map((r) => r.id);
  const { data: goals, error } = await supabase
    .from("goals")
    .select("employee_id,status,weightage")
    .in("employee_id", ids)
    .eq("cycle_id", cycleId);
  if (error) throw error;

  return reports.map((emp) => {
    const mine = ((goals ?? []) as Pick<GoalRow, "employee_id" | "status" | "weightage">[]).filter(
      (g) => g.employee_id === emp.id
    );
    return {
      employee: emp,
      total: mine.length,
      drafts: mine.filter((g) => g.status === "draft").length,
      submitted: mine.filter((g) => g.status === "submitted").length,
      approved: mine.filter((g) => g.status === "approved" || g.status === "locked").length,
      returned: mine.filter((g) => g.status === "returned").length,
      totalWeight: mine.reduce((s, g) => s + Number(g.weightage ?? 0), 0),
    };
  });
}
