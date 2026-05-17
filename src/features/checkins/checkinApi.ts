import { supabase } from "@/lib/supabase";
import type { CheckinRow, CheckinStatus, CyclePhase, GoalRow } from "@/types/database";

/** Quarters available for check-ins, in chronological order. */
export const QUARTERS: Exclude<CyclePhase, "goal_setting">[] = ["q1", "q2", "q3", "q4_annual"];

export const QUARTER_LABEL: Record<Exclude<CyclePhase, "goal_setting">, string> = {
  q1: "Q1",
  q2: "Q2",
  q3: "Q3",
  q4_annual: "Q4 / Annual",
};

/** Quarter currently open for entry, derived from cycle.phase.
 *  goal_setting → null (no checkins yet). */
export function activeQuarter(phase: CyclePhase): Exclude<CyclePhase, "goal_setting"> | null {
  return phase === "goal_setting" ? null : phase;
}

/** All check-ins for a list of goals (any quarter). */
export async function fetchCheckinsByGoals(goalIds: string[]): Promise<CheckinRow[]> {
  if (goalIds.length === 0) return [];
  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .in("goal_id", goalIds);
  if (error) throw error;
  return (data ?? []) as CheckinRow[];
}

/** Locked goals for an employee — the only ones eligible for check-ins. */
export async function fetchLockedGoals(employeeId: string, cycleId: string): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("cycle_id", cycleId)
    .not("locked_at", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as GoalRow[];
}

export interface UpsertCheckinInput {
  goal_id: string;
  quarter: Exclude<CyclePhase, "goal_setting">;
  actual_achievement: number;
  status: CheckinStatus;
}

export async function upsertCheckin(input: UpsertCheckinInput): Promise<CheckinRow> {
  // Use upsert with the unique (goal_id, quarter) constraint.
  const { data, error } = await supabase
    .from("checkins")
    .upsert(input, { onConflict: "goal_id,quarter" })
    .select()
    .single();
  if (error) throw error;
  return data as CheckinRow;
}

/** All comments for a list of checkins, joined to manager name. */
export async function fetchCommentsByCheckins(
  checkinIds: string[]
): Promise<Array<{ id: string; checkin_id: string; comment: string; created_at: string; manager_name: string }>> {
  if (checkinIds.length === 0) return [];
  const { data, error } = await supabase
    .from("checkin_comments")
    .select("id, checkin_id, comment, created_at, manager:users!checkin_comments_manager_id_fkey(name)")
    .in("checkin_id", checkinIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    checkin_id: String(r.checkin_id),
    comment: String(r.comment),
    created_at: String(r.created_at),
    manager_name:
      (r.manager as { name?: string } | null)?.name ?? "Manager",
  }));
}

export async function addComment(checkinId: string, managerId: string, comment: string) {
  const { error } = await supabase
    .from("checkin_comments")
    .insert({ checkin_id: checkinId, manager_id: managerId, comment });
  if (error) throw error;
}
