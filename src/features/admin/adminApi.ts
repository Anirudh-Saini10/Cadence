import { supabase } from "@/lib/supabase";
import type { CycleRow, AuditLogRow, UserRow, GoalRow } from "@/types/database";

/** Fetch all cycles for the admin dashboard. */
export async function fetchAllCycles(): Promise<CycleRow[]> {
  const { data, error } = await supabase
    .from("cycles")
    .select("*")
    .order("open_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CycleRow[];
}

/** Create a new performance cycle. */
export async function createCycle(input: Omit<CycleRow, "id" | "created_at">): Promise<CycleRow> {
  const { data, error } = await supabase
    .from("cycles")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as CycleRow;
}

/** Update an existing cycle's phase or status. */
export async function updateCycle(
  id: string,
  patch: Partial<Pick<CycleRow, "phase" | "status" | "name" | "open_date">>
): Promise<CycleRow> {
  const { data, error } = await supabase
    .from("cycles")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as CycleRow;
}

/** Fetch all users for admin management. */
export async function fetchAllUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase.from("users").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as UserRow[];
}

/** Update a user's name, email or role. */
export async function updateUser(
  id: string,
  patch: Partial<Pick<UserRow, "name" | "email" | "role">>
): Promise<void> {
  const { error } = await supabase.from("users").update(patch).eq("id", id);
  if (error) throw error;
}

/** Reset goal status back to draft and clear locked_at. */
export async function resetGoalStatus(goalId: string): Promise<void> {
  const { error } = await supabase
    .from("goals")
    .update({ status: "draft", locked_at: null })
    .eq("id", goalId);
  if (error) throw error;
}

/** Fetch goals for a user in a cycle. */
export async function fetchGoalsForAdmin(employeeId: string, cycleId: string): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("cycle_id", cycleId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as GoalRow[];
}

/** Fetch audit logs with actor name joined. */
export async function fetchAuditLogs(): Promise<Array<AuditLogRow & { actor_name: string }>> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*, actor:users!audit_logs_changed_by_fkey(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  
  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    actor_name: row.actor?.name ?? "System",
  }));
}
