import { supabase } from "@/lib/supabase";
import type { EscalationRuleRow, EscalationLogRow } from "@/types/database";

/** Fetch all escalation rules. */
export async function fetchEscalationRules(): Promise<EscalationRuleRow[]> {
  const { data, error } = await supabase
    .from("escalation_rules")
    .select("*")
    .order("rule_type");
  if (error) throw error;
  return (data ?? []) as EscalationRuleRow[];
}

/** Update an escalation rule (toggle active, change threshold). */
export async function updateEscalationRule(
  id: string,
  patch: Partial<Pick<EscalationRuleRow, "is_active" | "threshold_days" | "target_role">>
): Promise<EscalationRuleRow> {
  const { data, error } = await supabase
    .from("escalation_rules")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as EscalationRuleRow;
}

/** Fetch recent escalation logs with target user joined. */
export async function fetchEscalationLogs(): Promise<Array<EscalationLogRow & { target_name: string }>> {
  const { data, error } = await supabase
    .from("escalation_logs")
    .select("*, target:users!escalation_logs_target_user_id_fkey(name)")
    .order("triggered_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    target_name: row.target?.name ?? "Unknown User",
  }));
}

/** 
 * Trigger a mock escalation check. 
 * In a real app, this would be a CRON job or Edge Function.
 */
export async function runEscalationCheck(): Promise<{ triggered: number }> {
  // Mock behavior: just wait a bit and return a result.
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return { triggered: Math.floor(Math.random() * 3) };
}
