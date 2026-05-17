import { supabase } from "@/lib/supabase";
import type { GoalRow, GoalStatus, UoMType } from "@/types/database";

export interface NewGoalInput {
  employee_id: string;
  cycle_id: string;
  thrust_area: string;
  title: string;
  description?: string | null;
  uom_type: UoMType;
  target: number;
  weightage: number;
  status?: GoalStatus;
  is_shared?: boolean;
  source_goal_id?: string | null;
}

export async function fetchGoalsFor(
  employeeId: string,
  cycleId: string
): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("cycle_id", cycleId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as GoalRow[];
}

export async function createGoal(input: NewGoalInput): Promise<GoalRow> {
  const { data, error } = await supabase
    .from("goals")
    .insert({ status: "draft", is_shared: false, ...input })
    .select()
    .single();
  if (error) throw error;
  return data as GoalRow;
}

export async function updateGoal(
  id: string,
  patch: Partial<GoalRow>
): Promise<GoalRow> {
  const { data, error } = await supabase
    .from("goals")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as GoalRow;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}

/** Bulk-update statuses to 'submitted'. The DB trigger enforces total==100. */
export async function submitAllGoals(
  employeeId: string,
  cycleId: string
): Promise<void> {
  const { error } = await supabase
    .from("goals")
    .update({ status: "submitted" })
    .eq("employee_id", employeeId)
    .eq("cycle_id", cycleId)
    .in("status", ["draft", "returned"]);
  if (error) throw error;
}
