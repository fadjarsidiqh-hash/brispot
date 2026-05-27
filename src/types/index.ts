export type { Database, UserRole, DNStatus, ConditionStatus, PriorityLevel, NotificationChannel } from './database.types'
import type { Database } from './database.types'

// Table row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type DecisionNote = Database['public']['Tables']['decision_notes']['Row']
export type DNCondition = Database['public']['Tables']['dn_conditions']['Row']
export type DNEvidence = Database['public']['Tables']['dn_evidences']['Row']
export type FollowupAction = Database['public']['Tables']['followup_actions']['Row']
export type KPITarget = Database['public']['Tables']['kpi_targets']['Row']
export type KPIRealization = Database['public']['Tables']['kpi_realizations']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Holiday = Database['public']['Tables']['holidays']['Row']

// Insert types
export type InsertDN = Database['public']['Tables']['decision_notes']['Insert']
export type InsertCondition = Database['public']['Tables']['dn_conditions']['Insert']
export type InsertEvidence = Database['public']['Tables']['dn_evidences']['Insert']
export type InsertFollowup = Database['public']['Tables']['followup_actions']['Insert']

// Extended types (with joins)
export type DecisionNoteWithRelations = DecisionNote & {
  ao?: Pick<Profile, 'id' | 'full_name' | 'email'>
  dk?: Pick<Profile, 'id' | 'full_name' | 'email'>
  boh?: Pick<Profile, 'id' | 'full_name' | 'email'>
  conditions?: DNCondition[]
  evidences?: DNEvidence[]
  followup_actions?: FollowupAction[]
}

// Form types
export interface DNFormValues {
  // Step 1 – Debtor Info
  debtor_name: string
  debtor_cif: string
  credit_type: string
  credit_amount: number
  // Step 2 – Approval Info
  dn_number: string
  title: string
  approval_date: string
  approval_number: string
  approver_id: string
  // Step 3 – Conditions
  conditions: {
    condition_text: string
    condition_type: string
    due_date: string
    assigned_to: string
  }[]
  // Step 4 – Follow-up
  followup_actions: {
    action_text: string
    due_date: string
    assigned_to: string
  }[]
  // Step 5 – Review
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  notes: string
}

// KPI Dashboard
export interface KPIDashboardData {
  target: KPITarget
  realization: KPIRealization
  monthly_trend: { month: number; completed: number; total: number }[]
}

// Escalation info
export interface EscalationInfo {
  dn_id: string
  dn_number: string
  days_overdue: number
  escalation_date: string
  escalated_to: string
}

// Notification badge
export interface NotifBadge {
  total: number
  unread: number
  items: Notification[]
}
