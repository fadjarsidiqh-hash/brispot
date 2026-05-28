export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'AO' | 'DK' | 'BOH' | 'ADMIN'
export type DNStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED_DK' | 'VERIFIED_BOH' | 'COMPLETED' | 'ESCALATED' | 'REJECTED'
export type ConditionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'WAIVED'
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type NotificationChannel = 'EMAIL' | 'WHATSAPP' | 'IN_APP'

export interface Database {
  brimos: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          nip: string | null
          role: UserRole
          branch_code: string | null
          branch_name: string | null
          email: string
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['brimos']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['brimos']['Tables']['profiles']['Insert']>
      }
      decision_notes: {
        Row: {
          id: string
          dn_number: string
          title: string
          debtor_name: string
          debtor_cif: string
          credit_amount: number
          credit_type: string
          approval_date: string
          approval_number: string | null
          approver_id: string | null
          ao_id: string
          dk_id: string | null
          boh_id: string | null
          status: DNStatus
          priority: PriorityLevel
          notes: string | null
          branch_code: string
          due_date: string | null
          escalation_date: string | null
          submitted_at: string | null
          verified_dk_at: string | null
          verified_boh_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['brimos']['Tables']['decision_notes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['brimos']['Tables']['decision_notes']['Insert']>
      }
      dn_conditions: {
        Row: {
          id: string
          dn_id: string
          condition_text: string
          condition_type: string
          due_date: string | null
          status: ConditionStatus
          assigned_to: string | null
          completed_at: string | null
          notes: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['brimos']['Tables']['dn_conditions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['brimos']['Tables']['dn_conditions']['Insert']>
      }
      dn_evidences: {
        Row: {
          id: string
          dn_id: string
          condition_id: string | null
          file_name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          uploaded_by: string
          description: string | null
          created_at: string
        }
        Insert: Omit<Database['brimos']['Tables']['dn_evidences']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['brimos']['Tables']['dn_evidences']['Insert']>
      }
      followup_actions: {
        Row: {
          id: string
          dn_id: string
          condition_id: string | null
          action_text: string
          due_date: string
          status: ConditionStatus
          assigned_to: string
          created_by: string
          completed_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['brimos']['Tables']['followup_actions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['brimos']['Tables']['followup_actions']['Insert']>
      }
      kpi_targets: {
        Row: {
          id: string
          period_year: number
          period_month: number
          branch_code: string
          target_dn: number
          target_completed: number
          target_overdue_pct: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['brimos']['Tables']['kpi_targets']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['brimos']['Tables']['kpi_targets']['Insert']>
      }
      kpi_realizations: {
        Row: {
          id: string
          target_id: string
          total_dn: number
          completed_dn: number
          overdue_dn: number
          escalated_dn: number
          completion_rate: number
          calculated_at: string
        }
        Insert: Omit<Database['brimos']['Tables']['kpi_realizations']['Row'], 'id' | 'completion_rate'>
        Update: Partial<Database['brimos']['Tables']['kpi_realizations']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          action: string
          old_values: Json | null
          new_values: Json | null
          performed_by: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: Omit<Database['brimos']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>
        Update: never
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          dn_id: string | null
          channel: NotificationChannel
          subject: string
          body: string
          is_read: boolean
          sent_at: string | null
          read_at: string | null
          created_at: string
        }
        Insert: Omit<Database['brimos']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['brimos']['Tables']['notifications']['Insert']>
      }
      holidays: {
        Row: {
          id: string
          date: string
          name: string
          is_national: boolean
        }
        Insert: Omit<Database['brimos']['Tables']['holidays']['Row'], 'id'>
        Update: Partial<Database['brimos']['Tables']['holidays']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      dn_status: DNStatus
      condition_status: ConditionStatus
      priority_level: PriorityLevel
      notification_channel: NotificationChannel
    }
  }
}
