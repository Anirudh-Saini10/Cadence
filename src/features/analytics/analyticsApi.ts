import { supabase } from "@/lib/supabase";

export interface DeptStats {
  department: string;
  total_goals: number;
  approved_goals: number;
  completion_pct: number;
}

export interface ScoreTrend {
  quarter: string;
  avg_score: number;
}

export interface GoalDistribution {
  status: string;
  count: number;
}

/** Fetch completion stats grouped by department. */
export async function fetchDeptStats(cycleId: string): Promise<DeptStats[]> {
  const { data: goals, error } = await supabase
    .from("goals")
    .select("status, employee:users!goals_employee_id_fkey(department)")
    .eq("cycle_id", cycleId);

  if (error) throw error;

  const statsMap: Record<string, { total: number; approved: number }> = {};
  
  (goals as any[]).forEach((g) => {
    const dept = g.employee?.department || "Unknown";
    if (!statsMap[dept]) statsMap[dept] = { total: 0, approved: 0 };
    statsMap[dept].total++;
    if (g.status === "approved" || g.status === "locked") statsMap[dept].approved++;
  });

  return Object.entries(statsMap).map(([dept, s]) => ({
    department: dept,
    total_goals: s.total,
    approved_goals: s.approved,
    completion_pct: Math.round((s.approved / s.total) * 100) || 0,
  }));
}

/** Fetch scoring trends across quarters for the active cycle. */
export async function fetchScoreTrends(cycleId: string): Promise<ScoreTrend[]> {
  const { data: checkins, error } = await supabase
    .from("checkins")
    .select("quarter, computed_score")
    .order("quarter");

  if (error) throw error;

  const quarters = ["q1", "q2", "q3", "q4_annual"];
  const trends = quarters.map((q) => {
    const qCheckins = checkins.filter((c) => c.quarter === q);
    const avg = qCheckins.reduce((sum, c) => sum + c.computed_score, 0) / qCheckins.length || 0;
    return { quarter: q.toUpperCase(), avg_score: Math.round(avg) };
  });

  return trends;
}

/** Fetch overall goal status distribution. */
export async function fetchGoalDistribution(cycleId: string): Promise<GoalDistribution[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("status")
    .eq("cycle_id", cycleId);

  if (error) throw error;

  const counts: Record<string, number> = {};
  data.forEach((g) => {
    counts[g.status] = (counts[g.status] || 0) + 1;
  });

  return Object.entries(counts).map(([status, count]) => ({ status, count }));
}
