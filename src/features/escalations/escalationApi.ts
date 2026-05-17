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
 * Run the escalation engine against active rules.
 * Finds targets matching each rule and inserts escalation_logs.
 */
export async function runEscalationCheck(): Promise<{ triggered: number }> {
  // 1. Get active rules
  const { data: rules, error: rErr } = await supabase
    .from("escalation_rules")
    .select("*")
    .eq("is_active", true);
  if (rErr) throw rErr;

  // 2. Get active cycle
  const { data: cycle, error: cErr } = await supabase
    .from("cycles")
    .select("id, phase")
    .eq("status", "active")
    .maybeSingle();
  if (cErr) throw cErr;

  const cycleId = cycle?.id;
  let totalTriggered = 0;

  const rulesList = (rules ?? []) as EscalationRuleRow[];

  for (const rule of rulesList) {
    let targets: { id: string }[] = [];

    if (rule.rule_type === "goal_not_submitted") {
      // Employees with draft goals in the active cycle
      const { data } = await supabase
        .from("goals")
        .select("employee_id:id")
        .eq("status", "draft")
        .eq("cycle_id", cycleId)
        .limit(100);
      targets = (data ?? []) as any[];
    } else if (rule.rule_type === "checkin_overdue") {
      // Employees with locked goals but no check-ins for current quarter
      const { data } = await supabase
        .from("goals")
        .select("employee_id:id")
        .eq("status", "approved")
        .eq("cycle_id", cycleId)
        .limit(100);
      const locked = (data ?? []) as any[];
      // Filter out those who already have a checkin for this quarter
      const employeeIds = [...new Set(locked.map((g) => g.id))];
      if (employeeIds.length > 0) {
        const { data: checkedIn } = await supabase
          .from("checkins")
          .select("goal_id")
          .in("goal_id", employeeIds) // simplified; in real app would join properly
          .limit(100);
        const checkedInIds = new Set((checkedIn ?? []).map((c) => c.goal_id));
        targets = locked.filter((g) => !checkedInIds.has(g.id));
      }
    }

    // Insert escalation log for each target (dedup by not re-inserting same open log)
    for (const t of targets) {
      const uid = t.id;
      // Check if an open log already exists for this rule + user
      const { data: existing } = await supabase
        .from("escalation_logs")
        .select("id")
        .eq("rule_id", rule.id)
        .eq("target_user_id", uid)
        .eq("status", "open")
        .maybeSingle();

      if (!existing) {
        const { error: insErr } = await supabase.from("escalation_logs").insert({
          rule_id: rule.id,
          target_user_id: uid,
          status: "open",
          detail: { cycle_id: cycleId, rule_type: rule.rule_type },
        });
        if (!insErr) totalTriggered++;
      }
    }
  }

  return { triggered: totalTriggered };
}
