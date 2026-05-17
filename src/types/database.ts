// Minimal hand-written Database types. We can regenerate via `supabase gen types`
// once the project is connected, but this is enough to drive the UI typesafely.

export type UserRole = "employee" | "manager" | "admin";
export type CyclePhase = "goal_setting" | "q1" | "q2" | "q3" | "q4_annual";
export type CycleStatus = "upcoming" | "active" | "closed";
export type UoMType = "min" | "max" | "timeline" | "zero";
export type GoalStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "locked"
  | "returned";
export type CheckinStatus = "not_started" | "on_track" | "completed";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  manager_id: string | null;
  department: string | null;
  created_at: string;
}

export interface CycleRow {
  id: string;
  name: string;
  phase: CyclePhase;
  open_date: string;
  close_date: string;
  status: CycleStatus;
  created_at: string;
}

export interface GoalRow {
  id: string;
  employee_id: string;
  cycle_id: string;
  thrust_area: string;
  title: string;
  description: string | null;
  uom_type: UoMType;
  target: number;
  weightage: number;
  status: GoalStatus;
  is_shared: boolean;
  source_goal_id: string | null;
  locked_at: string | null;
  returned_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckinRow {
  id: string;
  goal_id: string;
  quarter: Exclude<CyclePhase, "goal_setting">;
  actual_achievement: number;
  status: CheckinStatus;
  computed_score: number;
  submitted_at: string;
}

export interface CheckinCommentRow {
  id: string;
  checkin_id: string;
  manager_id: string;
  comment: string;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  goal_id: string | null;
  changed_by: string | null;
  change_type: string;
  old_value: unknown;
  new_value: unknown;
  reason: string | null;
  created_at: string;
}

export interface EscalationRuleRow {
  id: string;
  rule_type: string;
  threshold_days: number;
  target_role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface EscalationLogRow {
  id: string;
  rule_id: string;
  target_user_id: string;
  triggered_at: string;
  resolved_at: string | null;
  status: "open" | "resolved";
  detail: unknown;
}

// Supabase generic Database shape (rough — we mainly use untyped `.from`)
export interface Database {
  public: {
    Tables: {
      users: { Row: UserRow; Insert: Partial<UserRow>; Update: Partial<UserRow> };
      cycles: { Row: CycleRow; Insert: Partial<CycleRow>; Update: Partial<CycleRow> };
      goals: { Row: GoalRow; Insert: Partial<GoalRow>; Update: Partial<GoalRow> };
      checkins: { Row: CheckinRow; Insert: Partial<CheckinRow>; Update: Partial<CheckinRow> };
      checkin_comments: {
        Row: CheckinCommentRow;
        Insert: Partial<CheckinCommentRow>;
        Update: Partial<CheckinCommentRow>;
      };
      audit_logs: { Row: AuditLogRow; Insert: Partial<AuditLogRow>; Update: Partial<AuditLogRow> };
      escalation_rules: {
        Row: EscalationRuleRow;
        Insert: Partial<EscalationRuleRow>;
        Update: Partial<EscalationRuleRow>;
      };
      escalation_logs: {
        Row: EscalationLogRow;
        Insert: Partial<EscalationLogRow>;
        Update: Partial<EscalationLogRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
