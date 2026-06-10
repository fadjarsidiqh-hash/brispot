export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'RM' | 'ADK' | 'BOH' | 'MANAGER' | 'ADMIN'
export type DNStatus = 'DRAFT' | 'SUBMITTED' | 'DECIDED_MANAGER' | 'DECIDED_BOH' | 'VERIFIED_ADK' | 'COMPLETED' | 'ESCALATED' | 'REJECTED' | 'NEEDS_REVISION'
export type Confidentiality = 'UMUM' | 'RAHASIA'
export type SlikStatus = 'HIJAU' | 'KUNING' | 'MERAH'
export type ConditionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'WAIVED'
export type PicType = 'RM' | 'ADK' | 'BOTH'
export type RequirementType = 'EVIDENCE' | 'CHECKLIST'
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type NotificationChannel = 'EMAIL' | 'WHATSAPP' | 'IN_APP'

export type BrimosSchema = {
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
        Insert: {
          id: string
          full_name: string
          nip?: string | null
          role: UserRole
          branch_code?: string | null
          branch_name?: string | null
          email: string
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
        }
        Update: Partial<Database['brimos']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      decision_notes: {
        Row: {
          id: string
          dn_number: string
          title: string
          debtor_name: string
          debtor_cif: string
          debtor_nik: string | null
          debtor_phone: string | null
          credit_amount: number
          credit_type: string
          credit_application_date: string | null
          approval_date: string
          approval_number: string | null
          approver_id: string | null
          rm_id: string
          adk_id: string | null
          boh_id: string | null
          manager_id: string | null
          status: DNStatus
          priority: PriorityLevel
          notes: string | null
          slik_status: SlikStatus | null
          pic_type: PicType
          slik_file_path: string | null
          branch_code: string
          due_date: string | null
          escalation_date: string | null
          submitted_at: string | null
          decided_manager_at: string | null
          decided_boh_at: string | null
          verified_adk_at: string | null
          completed_at: string | null
          reject_reason: string | null
          rejected_at: string | null
          boh_notes: string | null
          manager_notes: string | null
          adk_notes: string | null
          confidentiality: Confidentiality
          revision_requested_by: string | null
          revision_requested_at: string | null
          revision_notes: string | null
          revision_from_status: DNStatus | null
          created_at: string
          updated_at: string
        }
        Insert: {
          dn_number: string
          title: string
          debtor_name: string
          debtor_cif: string
          debtor_nik?: string | null
          debtor_phone?: string | null
          credit_amount: number
          credit_type: string
          credit_application_date?: string | null
          approval_date: string
          approval_number?: string | null
          approver_id?: string | null
          rm_id: string
          adk_id?: string | null
          boh_id?: string | null
          manager_id?: string | null
          status?: DNStatus
          priority?: PriorityLevel
          notes?: string | null
          slik_status?: SlikStatus | null
          pic_type?: PicType
          slik_file_path?: string | null
          branch_code: string
          due_date?: string | null
          escalation_date?: string | null
          submitted_at?: string | null
          decided_manager_at?: string | null
          decided_boh_at?: string | null
          verified_adk_at?: string | null
          completed_at?: string | null
          reject_reason?: string | null
          rejected_at?: string | null
          boh_notes?: string | null
          manager_notes?: string | null
          adk_notes?: string | null
          confidentiality?: Confidentiality
          revision_requested_by?: string | null
          revision_requested_at?: string | null
          revision_notes?: string | null
          revision_from_status?: DNStatus | null
        }
        Update: Partial<Database['brimos']['Tables']['decision_notes']['Insert']>
        Relationships: []
      }
      dn_conditions: {
        Row: {
          id: string
          dn_id: string
          condition_text: string
          condition_type: string
          requirement_type: RequirementType
          due_date: string | null
          status: ConditionStatus
          assigned_to: string | null
          completed_at: string | null
          notes: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          dn_id: string
          condition_text: string
          condition_type?: string
          requirement_type?: RequirementType
          due_date?: string | null
          status?: ConditionStatus
          assigned_to?: string | null
          completed_at?: string | null
          notes?: string | null
          sort_order?: number
        }
        Update: Partial<Database['brimos']['Tables']['dn_conditions']['Insert']>
        Relationships: []
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
        Insert: {
          dn_id: string
          condition_id?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by: string
          description?: string | null
        }
        Update: Partial<Database['brimos']['Tables']['dn_evidences']['Insert']>
        Relationships: []
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
        Insert: {
          dn_id: string
          condition_id?: string | null
          action_text: string
          due_date: string
          status?: ConditionStatus
          assigned_to: string
          created_by: string
          completed_at?: string | null
          notes?: string | null
        }
        Update: Partial<Database['brimos']['Tables']['followup_actions']['Insert']>
        Relationships: []
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
        Insert: {
          period_year: number
          period_month: number
          branch_code: string
          target_dn: number
          target_completed: number
          target_overdue_pct: number
          created_by?: string | null
        }
        Update: Partial<Database['brimos']['Tables']['kpi_targets']['Insert']>
        Relationships: []
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
        Insert: {
          target_id: string
          total_dn: number
          completed_dn: number
          overdue_dn: number
          escalated_dn: number
          calculated_at?: string
        }
        Update: Partial<Database['brimos']['Tables']['kpi_realizations']['Insert']>
        Relationships: []
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
        Insert: {
          entity_type: string
          entity_id: string
          action: string
          old_values?: Json | null
          new_values?: Json | null
          performed_by?: string | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: Record<string, never>
        Relationships: []
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
        Insert: {
          recipient_id: string
          dn_id?: string | null
          channel: NotificationChannel
          subject: string
          body: string
          is_read?: boolean
          sent_at?: string | null
          read_at?: string | null
        }
        Update: Partial<Database['brimos']['Tables']['notifications']['Insert']>
        Relationships: []
      }
      holidays: {
        Row: {
          id: string
          date: string
          name: string
          is_national: boolean
        }
        Insert: {
          date: string
          name: string
          is_national?: boolean
        }
        Update: Partial<Database['brimos']['Tables']['holidays']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_email_by_nip: {
        Args: { p_nip: string }
        Returns: string | null
      }
    }
    Enums: {
      user_role: UserRole
      dn_status: DNStatus
      condition_status: ConditionStatus
      priority_level: PriorityLevel
      notification_channel: NotificationChannel
      confidentiality: Confidentiality
    }
}

export interface Database {
  public: BrimosSchema
  brimos: BrimosSchema
}
