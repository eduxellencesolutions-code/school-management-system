export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academic_reviewer_scopes: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          faculty_id: string | null
          id: string
          organization_id: string
          scope_level: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          faculty_id?: string | null
          id?: string
          organization_id: string
          scope_level: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          faculty_id?: string | null
          id?: string
          organization_id?: string
          scope_level?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_reviewer_scopes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_reviewer_scopes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_reviewer_scopes_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_reviewer_scopes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_reviewer_scopes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closed_reason: string | null
          created_at: string
          end_date: string | null
          id: string
          instructor_id: string | null
          is_active: boolean
          metadata: Json | null
          name: string
          organization_id: string | null
          start_date: string | null
          status: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          instructor_id?: string | null
          is_active?: boolean
          metadata?: Json | null
          name: string
          organization_id?: string | null
          start_date?: string | null
          status?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          instructor_id?: string | null
          is_active?: boolean
          metadata?: Json | null
          name?: string
          organization_id?: string | null
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_import_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          organization_id: string
          status: string
          uploaded_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          organization_id: string
          status?: string
          uploaded_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          status?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_import_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_import_batches_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_import_pending_structures: {
        Row: {
          batch_id: string
          code: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          parent_department_name: string | null
          parent_faculty_name: string | null
          resolved_id: string | null
          status: string
          structure_type: string
        }
        Insert: {
          batch_id: string
          code?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          parent_department_name?: string | null
          parent_faculty_name?: string | null
          resolved_id?: string | null
          status?: string
          structure_type: string
        }
        Update: {
          batch_id?: string
          code?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          parent_department_name?: string | null
          parent_faculty_name?: string | null
          resolved_id?: string | null
          status?: string
          structure_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_import_pending_structures_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "admission_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_import_pending_structures_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_import_pending_structures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_import_rows: {
        Row: {
          batch_id: string
          created_at: string
          created_learner_id: string | null
          error_detail: string | null
          id: string
          raw_data: Json
          resolved_department_id: string | null
          resolved_faculty_id: string | null
          resolved_group_id: string | null
          resolved_programme_id: string | null
          resolved_session_id: string | null
          row_status: string
          updated_at: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          created_learner_id?: string | null
          error_detail?: string | null
          id?: string
          raw_data: Json
          resolved_department_id?: string | null
          resolved_faculty_id?: string | null
          resolved_group_id?: string | null
          resolved_programme_id?: string | null
          resolved_session_id?: string | null
          row_status?: string
          updated_at?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          created_learner_id?: string | null
          error_detail?: string | null
          id?: string
          raw_data?: Json
          resolved_department_id?: string | null
          resolved_faculty_id?: string | null
          resolved_group_id?: string | null
          resolved_programme_id?: string | null
          resolved_session_id?: string | null
          row_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "admission_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_import_rows_created_learner_id_fkey"
            columns: ["created_learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_import_rows_resolved_department_id_fkey"
            columns: ["resolved_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_import_rows_resolved_faculty_id_fkey"
            columns: ["resolved_faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_import_rows_resolved_group_id_fkey"
            columns: ["resolved_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_import_rows_resolved_programme_id_fkey"
            columns: ["resolved_programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_import_rows_resolved_session_id_fkey"
            columns: ["resolved_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: string
          body: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          organization_id: string | null
          title: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string | null
          title: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_components: {
        Row: {
          created_at: string
          id: string
          is_cumulative: boolean
          max_score: number
          metadata: Json | null
          name: string
          pass_mark: number | null
          sequence: number
          template_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_cumulative?: boolean
          max_score: number
          metadata?: Json | null
          name: string
          pass_mark?: number | null
          sequence?: number
          template_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_cumulative?: boolean
          max_score?: number
          metadata?: Json | null
          name?: string
          pass_mark?: number | null
          sequence?: number
          template_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_components_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "assessment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          instructor_id: string | null
          is_default: boolean
          metadata: Json | null
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          instructor_id?: string | null
          is_default?: boolean
          metadata?: Json | null
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          instructor_id?: string | null
          is_default?: boolean
          metadata?: Json | null
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_templates_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_alert_followups: {
        Row: {
          alert_type: string
          created_at: string
          followed_up_at: string
          followed_up_by: string | null
          id: string
          learner_id: string
          notes: string | null
          organization_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          followed_up_at?: string
          followed_up_by?: string | null
          id?: string
          learner_id: string
          notes?: string | null
          organization_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          followed_up_at?: string
          followed_up_by?: string | null
          id?: string
          learner_id?: string
          notes?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_alert_followups_followed_up_by_fkey"
            columns: ["followed_up_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_alert_followups_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_alert_followups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          created_at: string | null
          date: string
          group_id: string
          id: string
          learner_id: string
          organization_id: string | null
          recorded_by: string | null
          session_id: string
          status: string
          term_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          group_id: string
          id?: string
          learner_id: string
          organization_id?: string | null
          recorded_by?: string | null
          session_id: string
          status: string
          term_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          group_id?: string
          id?: string
          learner_id?: string
          organization_id?: string | null
          recorded_by?: string | null
          session_id?: string
          status?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_summary: {
        Row: {
          absent_count: number | null
          late_count: number | null
          learner_id: string
          present_count: number | null
          rate: number | null
          term_id: string
        }
        Insert: {
          absent_count?: number | null
          late_count?: number | null
          learner_id: string
          present_count?: number | null
          rate?: number | null
          term_id: string
        }
        Update: {
          absent_count?: number | null
          late_count?: number | null
          learner_id?: string
          present_count?: number | null
          rate?: number | null
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_summary_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_summary_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_role: string | null
          created_at: string
          department_id: string | null
          id: string
          ip_address: string | null
          learner_id: string | null
          new_data: Json | null
          old_data: Json | null
          organization_id: string | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          ip_address?: string | null
          learner_id?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          ip_address?: string | null
          learner_id?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string | null
          bank_name: string
          created_at: string
          id: string
          is_primary: boolean
          is_verified: boolean
          representative_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code?: string | null
          bank_name: string
          created_at?: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          representative_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string | null
          bank_name?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          representative_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_slot_counters: {
        Row: {
          campaign_key: string
          created_at: string
          is_active: boolean
          promo_duration_days: number
          qualifying_price: number
          slots_claimed: number
          slots_max: number
          updated_at: string
        }
        Insert: {
          campaign_key: string
          created_at?: string
          is_active?: boolean
          promo_duration_days: number
          qualifying_price: number
          slots_claimed?: number
          slots_max: number
          updated_at?: string
        }
        Update: {
          campaign_key?: string
          created_at?: string
          is_active?: boolean
          promo_duration_days?: number
          qualifying_price?: number
          slots_claimed?: number
          slots_max?: number
          updated_at?: string
        }
        Relationships: []
      }
      centre_payment_quotes: {
        Row: {
          active_learners: number
          amount_due: number
          band_capacity: number | null
          billing_cycle: string
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          expires_at: string
          id: string
          organization_id: string
          plan_key: string
          price_snapshot: Json
          reference: string
          status: string
        }
        Insert: {
          active_learners: number
          amount_due: number
          band_capacity?: number | null
          billing_cycle: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          expires_at?: string
          id?: string
          organization_id: string
          plan_key: string
          price_snapshot: Json
          reference: string
          status?: string
        }
        Update: {
          active_learners?: number
          amount_due?: number
          band_capacity?: number | null
          billing_cycle?: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          expires_at?: string
          id?: string
          organization_id?: string
          plan_key?: string
          price_snapshot?: Json
          reference?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "centre_payment_quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centre_payment_quotes_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "centre_plan_catalog"
            referencedColumns: ["plan_key"]
          },
        ]
      }
      centre_plan_catalog: {
        Row: {
          band_min_learners: number
          created_at: string
          is_purchasable: boolean
          label: string
          max_active_learners: number | null
          plan_key: string
          sort_order: number
          support_minutes_per_month: number
        }
        Insert: {
          band_min_learners: number
          created_at?: string
          is_purchasable?: boolean
          label: string
          max_active_learners?: number | null
          plan_key: string
          sort_order?: number
          support_minutes_per_month?: number
        }
        Update: {
          band_min_learners?: number
          created_at?: string
          is_purchasable?: boolean
          label?: string
          max_active_learners?: number | null
          plan_key?: string
          sort_order?: number
          support_minutes_per_month?: number
        }
        Relationships: []
      }
      centre_plan_prices: {
        Row: {
          annual_price: number
          approval_status: string
          approved_at: string | null
          currency: string
          is_purchasable: boolean
          monthly_price: number
          note: string | null
          plan_key: string
          quarterly_price: number
        }
        Insert: {
          annual_price: number
          approval_status?: string
          approved_at?: string | null
          currency: string
          is_purchasable?: boolean
          monthly_price: number
          note?: string | null
          plan_key: string
          quarterly_price: number
        }
        Update: {
          annual_price?: number
          approval_status?: string
          approved_at?: string | null
          currency?: string
          is_purchasable?: boolean
          monthly_price?: number
          note?: string | null
          plan_key?: string
          quarterly_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "centre_plan_prices_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "centre_plan_catalog"
            referencedColumns: ["plan_key"]
          },
        ]
      }
      commission_adjustments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          original_commission_id: string
          reason: string
          representative_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          original_commission_id: string
          reason: string
          representative_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          original_commission_id?: string
          reason?: string
          representative_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_adjustments_original_commission_id_fkey"
            columns: ["original_commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_adjustments_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          amount_paid: number | null
          campaign_key: string | null
          commission_rate: number
          created_at: string | null
          currency: string
          hold_until: string | null
          id: string
          paid_at: string | null
          referral_id: string
          representative_id: string
          source_payment_id: string | null
          source_type: string
          status: Database["public"]["Enums"]["commission_status"]
          subscription_plan: string
          voided_reason: string | null
          withdrawal_id: string | null
        }
        Insert: {
          amount: number
          amount_paid?: number | null
          campaign_key?: string | null
          commission_rate: number
          created_at?: string | null
          currency?: string
          hold_until?: string | null
          id?: string
          paid_at?: string | null
          referral_id: string
          representative_id: string
          source_payment_id?: string | null
          source_type?: string
          status?: Database["public"]["Enums"]["commission_status"]
          subscription_plan: string
          voided_reason?: string | null
          withdrawal_id?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          campaign_key?: string | null
          commission_rate?: number
          created_at?: string | null
          currency?: string
          hold_until?: string | null
          id?: string
          paid_at?: string | null
          referral_id?: string
          representative_id?: string
          source_payment_id?: string | null
          source_type?: string
          status?: Database["public"]["Enums"]["commission_status"]
          subscription_plan?: string
          voided_reason?: string | null
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_source_payment_id_fkey"
            columns: ["source_payment_id"]
            isOneToOne: false
            referencedRelation: "processed_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
      course_attendance_audit: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: number
          learner_id: string
          new_status: string | null
          old_status: string | null
          organization_id: string
          session_id: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: number
          learner_id: string
          new_status?: string | null
          old_status?: string | null
          organization_id: string
          session_id: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: number
          learner_id?: string
          new_status?: string | null
          old_status?: string | null
          organization_id?: string
          session_id?: string
        }
        Relationships: []
      }
      course_attendance_records: {
        Row: {
          id: string
          learner_id: string
          note: string | null
          organization_id: string
          recorded_at: string
          recorded_by: string | null
          session_id: string
          status: string
          subject_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          learner_id: string
          note?: string | null
          organization_id: string
          recorded_at?: string
          recorded_by?: string | null
          session_id: string
          status: string
          subject_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          learner_id?: string
          note?: string | null
          organization_id?: string
          recorded_at?: string
          recorded_by?: string | null
          session_id?: string
          status?: string
          subject_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_attendance_records_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "course_attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_attendance_records_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      course_attendance_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lecture_no: number
          organization_id: string
          session_date: string
          subject_id: string
          term_id: string
          topic: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lecture_no?: number
          organization_id: string
          session_date: string
          subject_id: string
          term_id: string
          topic?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lecture_no?: number
          organization_id?: string
          session_date?: string
          subject_id?: string
          term_id?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_attendance_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_attendance_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_attendance_sessions_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      course_registrations: {
        Row: {
          attempt_kind: string
          credit_unit_snapshot: number | null
          drop_reason: string | null
          dropped_at: string | null
          dropped_by: string | null
          grade_letter: string | null
          grade_outcome: string | null
          grade_outcome_mapping_id: string | null
          grade_outcome_scale_config_id: string | null
          grade_outcome_status: string | null
          grade_point: number | null
          id: string
          learner_id: string
          organization_id: string
          prior_attempt_id: string | null
          quality_points: number | null
          registered_at: string
          registered_by: string | null
          session_id: string
          status: string
          subject_id: string
          term_id: string
          total_score: number | null
        }
        Insert: {
          attempt_kind?: string
          credit_unit_snapshot?: number | null
          drop_reason?: string | null
          dropped_at?: string | null
          dropped_by?: string | null
          grade_letter?: string | null
          grade_outcome?: string | null
          grade_outcome_mapping_id?: string | null
          grade_outcome_scale_config_id?: string | null
          grade_outcome_status?: string | null
          grade_point?: number | null
          id?: string
          learner_id: string
          organization_id: string
          prior_attempt_id?: string | null
          quality_points?: number | null
          registered_at?: string
          registered_by?: string | null
          session_id: string
          status?: string
          subject_id: string
          term_id: string
          total_score?: number | null
        }
        Update: {
          attempt_kind?: string
          credit_unit_snapshot?: number | null
          drop_reason?: string | null
          dropped_at?: string | null
          dropped_by?: string | null
          grade_letter?: string | null
          grade_outcome?: string | null
          grade_outcome_mapping_id?: string | null
          grade_outcome_scale_config_id?: string | null
          grade_outcome_status?: string | null
          grade_point?: number | null
          id?: string
          learner_id?: string
          organization_id?: string
          prior_attempt_id?: string | null
          quality_points?: number | null
          registered_at?: string
          registered_by?: string | null
          session_id?: string
          status?: string
          subject_id?: string
          term_id?: string
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_registrations_dropped_by_fkey"
            columns: ["dropped_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_registrations_grade_outcome_mapping_fkey"
            columns: [
              "grade_outcome_mapping_id",
              "grade_outcome_scale_config_id",
            ]
            isOneToOne: false
            referencedRelation: "grade_outcome_mappings"
            referencedColumns: ["id", "grading_scale_config_id"]
          },
          {
            foreignKeyName: "course_registrations_grade_outcome_scale_config_fkey"
            columns: ["grade_outcome_scale_config_id"]
            isOneToOne: false
            referencedRelation: "grading_scale_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_registrations_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_registrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_registrations_prior_attempt_id_fkey"
            columns: ["prior_attempt_id"]
            isOneToOne: false
            referencedRelation: "course_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_registrations_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_registrations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_registrations_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      course_result_submissions: {
        Row: {
          created_at: string
          department_reviewed_at: string | null
          department_reviewed_by: string | null
          faculty_reviewed_at: string | null
          faculty_reviewed_by: string | null
          id: string
          organization_id: string
          published_at: string | null
          published_by: string | null
          registry_reviewed_at: string | null
          registry_reviewed_by: string | null
          return_reason: string | null
          returned_at: string | null
          returned_by: string | null
          senate_approved_at: string | null
          senate_approved_by: string | null
          status: string
          subject_id: string
          submitted_at: string | null
          submitted_by: string | null
          term_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_reviewed_at?: string | null
          department_reviewed_by?: string | null
          faculty_reviewed_at?: string | null
          faculty_reviewed_by?: string | null
          id?: string
          organization_id: string
          published_at?: string | null
          published_by?: string | null
          registry_reviewed_at?: string | null
          registry_reviewed_by?: string | null
          return_reason?: string | null
          returned_at?: string | null
          returned_by?: string | null
          senate_approved_at?: string | null
          senate_approved_by?: string | null
          status?: string
          subject_id: string
          submitted_at?: string | null
          submitted_by?: string | null
          term_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_reviewed_at?: string | null
          department_reviewed_by?: string | null
          faculty_reviewed_at?: string | null
          faculty_reviewed_by?: string | null
          id?: string
          organization_id?: string
          published_at?: string | null
          published_by?: string | null
          registry_reviewed_at?: string | null
          registry_reviewed_by?: string | null
          return_reason?: string | null
          returned_at?: string | null
          returned_by?: string | null
          senate_approved_at?: string | null
          senate_approved_by?: string | null
          status?: string
          subject_id?: string
          submitted_at?: string | null
          submitted_by?: string | null
          term_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_result_submissions_department_reviewed_by_fkey"
            columns: ["department_reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_result_submissions_faculty_reviewed_by_fkey"
            columns: ["faculty_reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_result_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_result_submissions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_result_submissions_registry_reviewed_by_fkey"
            columns: ["registry_reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_result_submissions_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_result_submissions_senate_approved_by_fkey"
            columns: ["senate_approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_result_submissions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_result_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_result_submissions_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          minor_unit: number
          name_en: string
          name_fr: string
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          minor_unit: number
          name_en: string
          name_fr: string
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          minor_unit?: number
          name_en?: string
          name_fr?: string
          symbol?: string
        }
        Relationships: []
      }
      curricula: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          level: string
          organization_id: string
          programme_id: string
          semester: string | null
          version_year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          level: string
          organization_id: string
          programme_id: string
          semester?: string | null
          version_year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          level?: string
          organization_id?: string
          programme_id?: string
          semester?: string | null
          version_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "curricula_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curricula_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curricula_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          faculty_id: string
          hod_user_id: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          faculty_id: string
          hod_user_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          faculty_id?: string
          hod_user_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_hod_user_id_fkey"
            columns: ["hod_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      device_push_tokens: {
        Row: {
          app_version: string | null
          consecutive_failure_count: number
          created_at: string
          deactivated_at: string | null
          deactivation_reason: string | null
          device_name: string | null
          expo_push_token: string
          id: string
          last_active_at: string
          last_failure_at: string | null
          organization_id: string | null
          platform: string
          status: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          consecutive_failure_count?: number
          created_at?: string
          deactivated_at?: string | null
          deactivation_reason?: string | null
          device_name?: string | null
          expo_push_token: string
          id?: string
          last_active_at?: string
          last_failure_at?: string | null
          organization_id?: string | null
          platform: string
          status?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          consecutive_failure_count?: number
          created_at?: string
          deactivated_at?: string | null
          deactivation_reason?: string | null
          device_name?: string | null
          expo_push_token?: string
          id?: string
          last_active_at?: string
          last_failure_at?: string | null
          organization_id?: string | null
          platform?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_push_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_ratings: {
        Row: {
          domain_type: string
          id: string
          learner_id: string
          organization_id: string
          rating: string
          term_id: string
          trait_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          domain_type: string
          id?: string
          learner_id: string
          organization_id: string
          rating: string
          term_id: string
          trait_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          domain_type?: string
          id?: string
          learner_id?: string
          organization_id?: string
          rating?: string
          term_id?: string
          trait_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_ratings_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_ratings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_ratings_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_ratings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_security_tests: {
        Row: {
          actual: string | null
          description: string
          detail: string | null
          expected: string
          id: string
          passed: boolean | null
          run_at: string
          test_id: string
        }
        Insert: {
          actual?: string | null
          description: string
          detail?: string | null
          expected: string
          id?: string
          passed?: boolean | null
          run_at?: string
          test_id: string
        }
        Update: {
          actual?: string | null
          description?: string
          detail?: string | null
          expected?: string
          id?: string
          passed?: boolean | null
          run_at?: string
          test_id?: string
        }
        Relationships: []
      }
      edux_correction_grants: {
        Row: {
          granted_at: string
          granted_by: string | null
          request_id: string
          txid: number
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          request_id: string
          txid: number
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          request_id?: string
          txid?: number
        }
        Relationships: [
          {
            foreignKeyName: "edux_correction_grants_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "result_correction_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      edux_function_backups: {
        Row: {
          def: string
          identity_args: string
          migration_id: string
          proname: string
          saved_at: string
        }
        Insert: {
          def: string
          identity_args: string
          migration_id: string
          proname: string
          saved_at?: string
        }
        Update: {
          def?: string
          identity_args?: string
          migration_id?: string
          proname?: string
          saved_at?: string
        }
        Relationships: []
      }
      edux_graduation_grants: {
        Row: {
          granted_at: string
          granted_by: string | null
          learner_id: string
          txid: number
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          learner_id: string
          txid: number
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          learner_id?: string
          txid?: number
        }
        Relationships: [
          {
            foreignKeyName: "edux_graduation_grants_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      edux_migrations: {
        Row: {
          applied_at: string
          applied_by: string
          description: string
          id: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string
          description: string
          id: string
        }
        Update: {
          applied_at?: string
          applied_by?: string
          description?: string
          id?: string
        }
        Relationships: []
      }
      elective_group_subjects: {
        Row: {
          elective_group_id: string
          subject_id: string
        }
        Insert: {
          elective_group_id: string
          subject_id: string
        }
        Update: {
          elective_group_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elective_group_subjects_elective_group_id_fkey"
            columns: ["elective_group_id"]
            isOneToOne: false
            referencedRelation: "elective_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_group_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      elective_groups: {
        Row: {
          choose_count: number | null
          choose_credit_units: number | null
          curriculum_id: string
          id: string
          name: string
        }
        Insert: {
          choose_count?: number | null
          choose_credit_units?: number | null
          curriculum_id: string
          id?: string
          name: string
        }
        Update: {
          choose_count?: number | null
          choose_credit_units?: number | null
          curriculum_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "elective_groups_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_shadow_log: {
        Row: {
          created_at: string
          feature: string
          hits: number
          id: number
          log_date: string
          mode: string
          organization_id: string
          reason: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feature: string
          hits?: number
          id?: number
          log_date?: string
          mode: string
          organization_id: string
          reason: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feature?: string
          hits?: number
          id?: number
          log_date?: string
          mode?: string
          organization_id?: string
          reason?: string
          user_id?: string | null
        }
        Relationships: []
      }
      faculties: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_overrides: {
        Row: {
          created_at: string | null
          created_by: string | null
          enabled: boolean
          expires_at: string | null
          feature_key: string
          id: string
          organization_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          enabled: boolean
          expires_at?: string | null
          feature_key: string
          id?: string
          organization_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean
          expires_at?: string | null
          feature_key?: string
          id?: string
          organization_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_adjustments: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          reason: string | null
          void_reason: string | null
          voided: boolean
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          reason?: string | null
          void_reason?: string | null
          voided?: boolean
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          reason?: string | null
          void_reason?: string | null
          voided?: boolean
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_adjustments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "credit_balances"
            referencedColumns: ["student_fee_account_id"]
          },
          {
            foreignKeyName: "fee_adjustments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "student_fee_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_adjustments_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_adjustments_v2: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          id: string
          invoice_line_item_id: string | null
          is_system_generated: boolean
          reason: string
          rejected_reason: string | null
          reversed_by_adjustment_id: string | null
          status: Database["public"]["Enums"]["adjustment_status"]
          student_fee_account_id: string
          system_job_name: string | null
          type: Database["public"]["Enums"]["adjustment_type"]
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_line_item_id?: string | null
          is_system_generated?: boolean
          reason: string
          rejected_reason?: string | null
          reversed_by_adjustment_id?: string | null
          status?: Database["public"]["Enums"]["adjustment_status"]
          student_fee_account_id: string
          system_job_name?: string | null
          type: Database["public"]["Enums"]["adjustment_type"]
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_line_item_id?: string | null
          is_system_generated?: boolean
          reason?: string
          rejected_reason?: string | null
          reversed_by_adjustment_id?: string | null
          status?: Database["public"]["Enums"]["adjustment_status"]
          student_fee_account_id?: string
          system_job_name?: string | null
          type?: Database["public"]["Enums"]["adjustment_type"]
        }
        Relationships: [
          {
            foreignKeyName: "fee_adjustments_v2_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_adjustments_v2_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_adjustments_v2_invoice_line_item_id_fkey"
            columns: ["invoice_line_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_adjustments_v2_reversed_by_adjustment_id_fkey"
            columns: ["reversed_by_adjustment_id"]
            isOneToOne: false
            referencedRelation: "fee_adjustments_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_adjustments_v2_student_fee_account_id_fkey"
            columns: ["student_fee_account_id"]
            isOneToOne: false
            referencedRelation: "credit_balances"
            referencedColumns: ["student_fee_account_id"]
          },
          {
            foreignKeyName: "fee_adjustments_v2_student_fee_account_id_fkey"
            columns: ["student_fee_account_id"]
            isOneToOne: false
            referencedRelation: "student_fee_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_charges: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          created_by: string | null
          description: string
          fee_structure_id: string | null
          id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          created_by?: string | null
          description: string
          fee_structure_id?: string | null
          id?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string
          fee_structure_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_charges_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "credit_balances"
            referencedColumns: ["student_fee_account_id"]
          },
          {
            foreignKeyName: "fee_charges_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "student_fee_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_charges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          id: string
          method: string
          paid_date: string
          proof_url: string | null
          recorded_by: string | null
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          void_reason: string | null
          voided: boolean
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          id?: string
          method: string
          paid_date?: string
          proof_url?: string | null
          recorded_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          void_reason?: string | null
          voided?: boolean
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          method?: string
          paid_date?: string
          proof_url?: string | null
          recorded_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          void_reason?: string | null
          voided?: boolean
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "credit_balances"
            referencedColumns: ["student_fee_account_id"]
          },
          {
            foreignKeyName: "fee_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "student_fee_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_receipts: {
        Row: {
          id: string
          issued_at: string | null
          issued_by: string | null
          payment_id: string
          receipt_number: string
        }
        Insert: {
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          payment_id: string
          receipt_number: string
        }
        Update: {
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          payment_id?: string
          receipt_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_receipts_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "fee_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_records: {
        Row: {
          due_date: string | null
          id: string
          learner_id: string
          term_id: string
          total_expected: number
          total_paid: number
          updated_at: string | null
        }
        Insert: {
          due_date?: string | null
          id?: string
          learner_id: string
          term_id: string
          total_expected?: number
          total_paid?: number
          updated_at?: string | null
        }
        Update: {
          due_date?: string | null
          id?: string
          learner_id?: string
          term_id?: string
          total_expected?: number
          total_paid?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_records_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_records_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structure_items: {
        Row: {
          amount: number
          category_id: string
          created_at: string | null
          description: string
          due_date: string | null
          fee_structure_id: string
          id: string
          is_mandatory: boolean
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string | null
          description: string
          due_date?: string | null
          fee_structure_id: string
          id?: string
          is_mandatory?: boolean
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string | null
          description?: string
          due_date?: string | null
          fee_structure_id?: string
          id?: string
          is_mandatory?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fee_structure_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structure_items_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string
          group_id: string | null
          id: string
          name: string
          organization_id: string
          session_id: string
          term_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency: string
          group_id?: string | null
          id?: string
          name: string
          organization_id: string
          session_id: string
          term_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string
          group_id?: string | null
          id?: string
          name?: string
          organization_id?: string
          session_id?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_currency_fk"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fee_structures_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_approval_rules: {
        Row: {
          adjustment_type: Database["public"]["Enums"]["adjustment_type"]
          auto_approve_below: number | null
          created_at: string | null
          id: string
          organization_id: string
          requires_approval: boolean
        }
        Insert: {
          adjustment_type: Database["public"]["Enums"]["adjustment_type"]
          auto_approve_below?: number | null
          created_at?: string | null
          id?: string
          organization_id: string
          requires_approval?: boolean
        }
        Update: {
          adjustment_type?: Database["public"]["Enums"]["adjustment_type"]
          auto_approve_below?: number | null
          created_at?: string | null
          id?: string
          organization_id?: string
          requires_approval?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "finance_approval_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after_value: Json | null
          before_value: Json | null
          created_at: string | null
          id: string
          ip_address: string | null
          is_system_generated: boolean
          organization_id: string
          reason: string | null
          system_job_name: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_system_generated?: boolean
          organization_id: string
          reason?: string | null
          system_job_name?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_system_generated?: boolean
          organization_id?: string
          reason?: string | null
          system_job_name?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          created_at: string | null
          id: string
          is_system_default: boolean
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_system_default?: boolean
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_system_default?: boolean
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      founding_institution_applications: {
        Row: {
          agreed_accepted_by: string | null
          agreed_currency: string | null
          agreed_locked_at: string | null
          agreed_price_per_student_per_term: number | null
          agreed_set_by: string | null
          agreed_tier_key: string | null
          application_notes: string | null
          attribution_note: string | null
          campaign_id: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          conversion_payment_id: string | null
          conversion_type: string | null
          converted_at: string | null
          created_at: string
          estimated_student_count: number | null
          founding_partner_consent: boolean
          id: string
          institution_name: string
          institution_type: string | null
          organization_id: string | null
          pilot_ends_at: string | null
          pilot_extended_at: string | null
          pilot_extended_by: string | null
          pilot_extension_count: number
          pilot_extension_reason: string | null
          pilot_started_at: string | null
          programmes_offered: string | null
          referral_code: string | null
          referral_id: string | null
          referral_review_reason: string | null
          representative_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          status_reason: string | null
          submitted_ip: string | null
          updated_at: string
          waived_by: string | null
          waiver_reason: string | null
        }
        Insert: {
          agreed_accepted_by?: string | null
          agreed_currency?: string | null
          agreed_locked_at?: string | null
          agreed_price_per_student_per_term?: number | null
          agreed_set_by?: string | null
          agreed_tier_key?: string | null
          application_notes?: string | null
          attribution_note?: string | null
          campaign_id: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          conversion_payment_id?: string | null
          conversion_type?: string | null
          converted_at?: string | null
          created_at?: string
          estimated_student_count?: number | null
          founding_partner_consent?: boolean
          id?: string
          institution_name: string
          institution_type?: string | null
          organization_id?: string | null
          pilot_ends_at?: string | null
          pilot_extended_at?: string | null
          pilot_extended_by?: string | null
          pilot_extension_count?: number
          pilot_extension_reason?: string | null
          pilot_started_at?: string | null
          programmes_offered?: string | null
          referral_code?: string | null
          referral_id?: string | null
          referral_review_reason?: string | null
          representative_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          status_reason?: string | null
          submitted_ip?: string | null
          updated_at?: string
          waived_by?: string | null
          waiver_reason?: string | null
        }
        Update: {
          agreed_accepted_by?: string | null
          agreed_currency?: string | null
          agreed_locked_at?: string | null
          agreed_price_per_student_per_term?: number | null
          agreed_set_by?: string | null
          agreed_tier_key?: string | null
          application_notes?: string | null
          attribution_note?: string | null
          campaign_id?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          conversion_payment_id?: string | null
          conversion_type?: string | null
          converted_at?: string | null
          created_at?: string
          estimated_student_count?: number | null
          founding_partner_consent?: boolean
          id?: string
          institution_name?: string
          institution_type?: string | null
          organization_id?: string | null
          pilot_ends_at?: string | null
          pilot_extended_at?: string | null
          pilot_extended_by?: string | null
          pilot_extension_count?: number
          pilot_extension_reason?: string | null
          pilot_started_at?: string | null
          programmes_offered?: string | null
          referral_code?: string | null
          referral_id?: string | null
          referral_review_reason?: string | null
          representative_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          status_reason?: string | null
          submitted_ip?: string | null
          updated_at?: string
          waived_by?: string | null
          waiver_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "founding_institution_applications_agreed_tier_key_fkey"
            columns: ["agreed_tier_key"]
            isOneToOne: false
            referencedRelation: "tertiary_pricing_tiers"
            referencedColumns: ["tier_key"]
          },
          {
            foreignKeyName: "founding_institution_applications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "founding_institution_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founding_institution_applications_conversion_payment_id_fkey"
            columns: ["conversion_payment_id"]
            isOneToOne: false
            referencedRelation: "processed_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founding_institution_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founding_institution_applications_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founding_institution_applications_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founding_institution_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      founding_institution_campaigns: {
        Row: {
          benefits: Json
          campaign_key: string
          created_at: string
          created_by: string | null
          description: string | null
          eligibility_criteria: Json
          ends_at: string | null
          id: string
          max_institutions: number
          name: string
          pilot_duration_days: number | null
          pricing_terms: Json
          starts_at: string
          status: string
          terms_and_notes: string | null
          updated_at: string
        }
        Insert: {
          benefits?: Json
          campaign_key: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          eligibility_criteria?: Json
          ends_at?: string | null
          id?: string
          max_institutions: number
          name: string
          pilot_duration_days?: number | null
          pricing_terms?: Json
          starts_at: string
          status?: string
          terms_and_notes?: string | null
          updated_at?: string
        }
        Update: {
          benefits?: Json
          campaign_key?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          eligibility_criteria?: Json
          ends_at?: string | null
          id?: string
          max_institutions?: number
          name?: string
          pilot_duration_days?: number | null
          pricing_terms?: Json
          starts_at?: string
          status?: string
          terms_and_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "founding_institution_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      founding_pilot_notices: {
        Row: {
          application_id: string
          notice_key: string
          sent_at: string
        }
        Insert: {
          application_id: string
          notice_key: string
          sent_at?: string
        }
        Update: {
          application_id?: string
          notice_key?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "founding_pilot_notices_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "founding_institution_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      founding500_enrollments: {
        Row: {
          amount_paid: number
          campaign_key: string
          created_at: string
          expired_at: string | null
          expired_notice_sent_at: string | null
          founding_slot_number: number
          id: string
          normal_plan_after_promo: string | null
          organization_id: string
          payment_provider: string | null
          payment_reference: string | null
          promo_expires_at: string
          promo_start_date: string
          referral_code: string | null
          referral_id: string | null
          reminder_14_sent_at: string | null
          reminder_3_sent_at: string | null
          reminder_30_sent_at: string | null
          reminder_7_sent_at: string | null
          representative_id: string | null
          status: string
        }
        Insert: {
          amount_paid: number
          campaign_key: string
          created_at?: string
          expired_at?: string | null
          expired_notice_sent_at?: string | null
          founding_slot_number: number
          id?: string
          normal_plan_after_promo?: string | null
          organization_id: string
          payment_provider?: string | null
          payment_reference?: string | null
          promo_expires_at: string
          promo_start_date: string
          referral_code?: string | null
          referral_id?: string | null
          reminder_14_sent_at?: string | null
          reminder_3_sent_at?: string | null
          reminder_30_sent_at?: string | null
          reminder_7_sent_at?: string | null
          representative_id?: string | null
          status?: string
        }
        Update: {
          amount_paid?: number
          campaign_key?: string
          created_at?: string
          expired_at?: string | null
          expired_notice_sent_at?: string | null
          founding_slot_number?: number
          id?: string
          normal_plan_after_promo?: string | null
          organization_id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          promo_expires_at?: string
          promo_start_date?: string
          referral_code?: string | null
          referral_id?: string | null
          reminder_14_sent_at?: string | null
          reminder_3_sent_at?: string | null
          reminder_30_sent_at?: string | null
          reminder_7_sent_at?: string | null
          representative_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "founding500_enrollments_campaign_key_fkey"
            columns: ["campaign_key"]
            isOneToOne: false
            referencedRelation: "campaign_slot_counters"
            referencedColumns: ["campaign_key"]
          },
          {
            foreignKeyName: "founding500_enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founding500_enrollments_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founding500_enrollments_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_test_runs: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          gateway: string
          gateway_status: string | null
          id: string
          payer_country: string | null
          payment_channel: string | null
          reference: string
          status: string
          verified_amount: number | null
          verified_at: string | null
          verified_currency: string | null
          webhook_received_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency: string
          gateway: string
          gateway_status?: string | null
          id?: string
          payer_country?: string | null
          payment_channel?: string | null
          reference: string
          status?: string
          verified_amount?: number | null
          verified_at?: string | null
          verified_currency?: string | null
          webhook_received_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          gateway?: string
          gateway_status?: string | null
          id?: string
          payer_country?: string | null
          payment_channel?: string | null
          reference?: string
          status?: string
          verified_amount?: number | null
          verified_at?: string | null
          verified_currency?: string | null
          webhook_received_at?: string | null
        }
        Relationships: []
      }
      grade_outcome_mappings: {
        Row: {
          approved_at: string
          approved_by: string
          band_max: number
          band_min: number
          grade_letter: string
          grade_point: number
          grade_remark: string | null
          grading_scale_config_id: string
          id: string
          organization_id: string
          outcome: string
          reason: string
          version: number
        }
        Insert: {
          approved_at?: string
          approved_by: string
          band_max: number
          band_min: number
          grade_letter: string
          grade_point: number
          grade_remark?: string | null
          grading_scale_config_id: string
          id?: string
          organization_id: string
          outcome: string
          reason: string
          version: number
        }
        Update: {
          approved_at?: string
          approved_by?: string
          band_max?: number
          band_min?: number
          grade_letter?: string
          grade_point?: number
          grade_remark?: string | null
          grading_scale_config_id?: string
          id?: string
          organization_id?: string
          outcome?: string
          reason?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "grade_outcome_mappings_grading_scale_config_id_fkey"
            columns: ["grading_scale_config_id"]
            isOneToOne: false
            referencedRelation: "grading_scale_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_outcome_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_scale_configs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_point: number
          name: string
          organization_id: string
          scale_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_point: number
          name: string
          organization_id: string
          scale_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_point?: number
          name?: string
          organization_id?: string
          scale_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "grading_scale_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_systems: {
        Row: {
          created_at: string
          grade_letter: string
          id: string
          is_active: boolean
          max_point: number | null
          max_score: number
          min_score: number
          name: string
          organization_id: string
          points: number | null
          remark: string
          scale_type: string
        }
        Insert: {
          created_at?: string
          grade_letter: string
          id?: string
          is_active?: boolean
          max_point?: number | null
          max_score: number
          min_score: number
          name: string
          organization_id: string
          points?: number | null
          remark: string
          scale_type?: string
        }
        Update: {
          created_at?: string
          grade_letter?: string
          id?: string
          is_active?: boolean
          max_point?: number | null
          max_score?: number
          min_score?: number
          name?: string
          organization_id?: string
          points?: number | null
          remark?: string
          scale_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "grading_systems_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          arm: string | null
          code: string | null
          created_at: string
          department_id: string | null
          id: string
          instructor_id: string | null
          is_active: boolean
          level: string | null
          metadata: Json | null
          name: string
          organization_id: string | null
          programme_id: string | null
          section: Database["public"]["Enums"]["school_section"] | null
          session_id: string | null
          teacher_id: string | null
          term_id: string | null
          training_programme_id: string | null
          type: Database["public"]["Enums"]["group_type"]
          updated_at: string
        }
        Insert: {
          arm?: string | null
          code?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          instructor_id?: string | null
          is_active?: boolean
          level?: string | null
          metadata?: Json | null
          name: string
          organization_id?: string | null
          programme_id?: string | null
          section?: Database["public"]["Enums"]["school_section"] | null
          session_id?: string | null
          teacher_id?: string | null
          term_id?: string | null
          training_programme_id?: string | null
          type?: Database["public"]["Enums"]["group_type"]
          updated_at?: string
        }
        Update: {
          arm?: string | null
          code?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          instructor_id?: string | null
          is_active?: boolean
          level?: string | null
          metadata?: Json | null
          name?: string
          organization_id?: string | null
          programme_id?: string | null
          section?: Database["public"]["Enums"]["school_section"] | null
          session_id?: string | null
          teacher_id?: string | null
          term_id?: string | null
          training_programme_id?: string | null
          type?: Database["public"]["Enums"]["group_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_training_programme_id_fkey"
            columns: ["training_programme_id"]
            isOneToOne: false
            referencedRelation: "training_programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_level_thresholds: {
        Row: {
          commission_rate: number
          label: string
          level: number
          min_schools: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          commission_rate: number
          label: string
          level: number
          min_schools: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          commission_rate?: number
          label?: string
          level?: number
          min_schools?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      homework_assignments: {
        Row: {
          created_at: string | null
          created_by: string | null
          due_date: string
          group_id: string
          id: string
          issued_date: string
          subject_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          due_date: string
          group_id: string
          id?: string
          issued_date: string
          subject_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          due_date?: string
          group_id?: string
          id?: string
          issued_date?: string
          subject_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          assignment_id: string
          id: string
          learner_id: string
          status: string
        }
        Insert: {
          assignment_id: string
          id?: string
          learner_id: string
          status?: string
        }
        Update: {
          assignment_id?: string
          id?: string
          learner_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "homework_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number
          category_id: string
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          invoice_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          invoice_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string
          fee_structure_id: string | null
          id: string
          issued_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          student_fee_account_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency: string
          fee_structure_id?: string | null
          id?: string
          issued_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          student_fee_account_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string
          fee_structure_id?: string | null
          id?: string
          issued_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          student_fee_account_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_currency_fk"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "invoices_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_fee_account_id_fkey"
            columns: ["student_fee_account_id"]
            isOneToOne: false
            referencedRelation: "credit_balances"
            referencedColumns: ["student_fee_account_id"]
          },
          {
            foreignKeyName: "invoices_student_fee_account_id_fkey"
            columns: ["student_fee_account_id"]
            isOneToOne: false
            referencedRelation: "student_fee_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      k12_payment_quotes: {
        Row: {
          amount_due: number
          billing_cycle: string
          capacity: number
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          expires_at: string
          id: string
          organization_id: string
          period_end: string
          period_label: string | null
          period_start: string
          plan_key: string
          price_snapshot: Json
          reference: string
          status: string
          teacher_count: number
          verified_student_count: number
        }
        Insert: {
          amount_due: number
          billing_cycle: string
          capacity: number
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          expires_at?: string
          id?: string
          organization_id: string
          period_end: string
          period_label?: string | null
          period_start: string
          plan_key: string
          price_snapshot: Json
          reference: string
          status?: string
          teacher_count?: number
          verified_student_count: number
        }
        Update: {
          amount_due?: number
          billing_cycle?: string
          capacity?: number
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          expires_at?: string
          id?: string
          organization_id?: string
          period_end?: string
          period_label?: string | null
          period_start?: string
          plan_key?: string
          price_snapshot?: Json
          reference?: string
          status?: string
          teacher_count?: number
          verified_student_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "k12_payment_quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "k12_payment_quotes_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "k12_plan_catalog"
            referencedColumns: ["plan_key"]
          },
        ]
      }
      k12_plan_catalog: {
        Row: {
          created_at: string
          is_purchasable: boolean
          label: string
          max_academic_sessions: number | null
          max_admins: number | null
          max_classes: number | null
          max_custom_templates: number | null
          max_students: number | null
          max_subjects: number | null
          max_teacher_signatures: number | null
          max_teachers: number | null
          plan_key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_purchasable?: boolean
          label: string
          max_academic_sessions?: number | null
          max_admins?: number | null
          max_classes?: number | null
          max_custom_templates?: number | null
          max_students?: number | null
          max_subjects?: number | null
          max_teacher_signatures?: number | null
          max_teachers?: number | null
          plan_key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_purchasable?: boolean
          label?: string
          max_academic_sessions?: number | null
          max_admins?: number | null
          max_classes?: number | null
          max_custom_templates?: number | null
          max_students?: number | null
          max_subjects?: number | null
          max_teacher_signatures?: number | null
          max_teachers?: number | null
          plan_key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      k12_plan_prices: {
        Row: {
          annual_price: number
          capacity: number
          created_at: string
          currency: string
          is_purchasable: boolean
          plan_key: string
          termly_price: number
        }
        Insert: {
          annual_price: number
          capacity: number
          created_at?: string
          currency?: string
          is_purchasable?: boolean
          plan_key: string
          termly_price: number
        }
        Update: {
          annual_price?: number
          capacity?: number
          created_at?: string
          currency?: string
          is_purchasable?: boolean
          plan_key?: string
          termly_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "k12_plan_prices_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "k12_plan_catalog"
            referencedColumns: ["plan_key"]
          },
        ]
      }
      learner_activation_tokens: {
        Row: {
          attempt_count: number
          consumed_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          learner_id: string
          max_attempts: number
          organization_id: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          token_hash: string
        }
        Insert: {
          attempt_count?: number
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          learner_id: string
          max_attempts?: number
          organization_id: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          token_hash: string
        }
        Update: {
          attempt_count?: number
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          learner_id?: string
          max_attempts?: number
          organization_id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_activation_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_activation_tokens_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_activation_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_activation_tokens_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_pins: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          learner_id: string
          pin: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          learner_id: string
          pin: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          learner_id?: string
          pin?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_pins_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_pins_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      learners: {
        Row: {
          address: string | null
          admission_number: string | null
          auth_user_id: string | null
          created_at: string
          date_of_birth: string | null
          destination_school: string | null
          email: string | null
          enrollment_date: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          group_id: string
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          id: string
          is_active: boolean
          last_name: string
          metadata: Json | null
          organization_id: string | null
          other_names: string | null
          phone: string | null
          photo_url: string | null
          portal_activated_at: string | null
          portal_credential_generated_at: string | null
          portal_credential_generated_by: string | null
          portal_status: string
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          status_effective_date: string | null
          status_reason: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admission_number?: string | null
          auth_user_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          destination_school?: string | null
          email?: string | null
          enrollment_date?: string | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          group_id: string
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          is_active?: boolean
          last_name: string
          metadata?: Json | null
          organization_id?: string | null
          other_names?: string | null
          phone?: string | null
          photo_url?: string | null
          portal_activated_at?: string | null
          portal_credential_generated_at?: string | null
          portal_credential_generated_by?: string | null
          portal_status?: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_effective_date?: string | null
          status_reason?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admission_number?: string | null
          auth_user_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          destination_school?: string | null
          email?: string | null
          enrollment_date?: string | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          group_id?: string
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          is_active?: boolean
          last_name?: string
          metadata?: Json | null
          organization_id?: string | null
          other_names?: string | null
          phone?: string | null
          photo_url?: string | null
          portal_activated_at?: string | null
          portal_credential_generated_at?: string | null
          portal_credential_generated_by?: string | null
          portal_status?: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_effective_date?: string | null
          status_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learners_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learners_portal_credential_generated_by_fkey"
            columns: ["portal_credential_generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          success: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      module_completions: {
        Row: {
          batch_group_id: string | null
          completed_at: string | null
          confirmed_by: string | null
          created_at: string
          final_score: number | null
          id: string
          learner_id: string
          organization_id: string
          return_reason: string | null
          returned_at: string | null
          returned_by: string | null
          status: string
          training_module_id: string
          updated_at: string
        }
        Insert: {
          batch_group_id?: string | null
          completed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          final_score?: number | null
          id?: string
          learner_id: string
          organization_id: string
          return_reason?: string | null
          returned_at?: string | null
          returned_by?: string | null
          status?: string
          training_module_id: string
          updated_at?: string
        }
        Update: {
          batch_group_id?: string | null
          completed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          final_score?: number | null
          id?: string
          learner_id?: string
          organization_id?: string
          return_reason?: string | null
          returned_at?: string | null
          returned_by?: string | null
          status?: string
          training_module_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_completions_batch_group_id_fkey"
            columns: ["batch_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_training_module_id_fkey"
            columns: ["training_module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel: string | null
          created_at: string | null
          enabled: boolean | null
          id: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          learner_id: string | null
          metadata: Json | null
          organization_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          learner_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          learner_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_deadlines: {
        Row: {
          created_at: string
          deadline_at: string
          department_id: string | null
          extended_at: string | null
          extended_by: string | null
          extension_reason: string | null
          id: string
          level: string | null
          organization_id: string
          programme_id: string | null
          session_id: string | null
          set_by: string | null
        }
        Insert: {
          created_at?: string
          deadline_at: string
          department_id?: string | null
          extended_at?: string | null
          extended_by?: string | null
          extension_reason?: string | null
          id?: string
          level?: string | null
          organization_id: string
          programme_id?: string | null
          session_id?: string | null
          set_by?: string | null
        }
        Update: {
          created_at?: string
          deadline_at?: string
          department_id?: string | null
          extended_at?: string | null
          extended_by?: string | null
          extension_reason?: string | null
          id?: string
          level?: string | null
          organization_id?: string
          programme_id?: string | null
          session_id?: string | null
          set_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_deadlines_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_deadlines_extended_by_fkey"
            columns: ["extended_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_deadlines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_deadlines_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_deadlines_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_deadlines_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_reminder_log: {
        Row: {
          deadline_id: string
          id: string
          learner_id: string
          reminder_date: string | null
          sent_at: string
          threshold: string
        }
        Insert: {
          deadline_id: string
          id?: string
          learner_id: string
          reminder_date?: string | null
          sent_at?: string
          threshold: string
        }
        Update: {
          deadline_id?: string
          id?: string
          learner_id?: string
          reminder_date?: string | null
          sent_at?: string
          threshold?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_reminder_log_deadline_id_fkey"
            columns: ["deadline_id"]
            isOneToOne: false
            referencedRelation: "onboarding_deadlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_reminder_log_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_requirements: {
        Row: {
          applies_to: Json | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          label: string
          organization_id: string
          sort_order: number
          step_key: string
        }
        Insert: {
          applies_to?: Json | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          label: string
          organization_id: string
          sort_order?: number
          step_key: string
        }
        Update: {
          applies_to?: Json | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          label?: string
          organization_id?: string
          sort_order?: number
          step_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_state: {
        Row: {
          created_at: string | null
          dismissed_at: string | null
          guide_started_at: string | null
          id: string
          last_step_viewed: string | null
          organization_id: string | null
          updated_at: string | null
          user_id: string
          welcome_seen_at: string | null
        }
        Insert: {
          created_at?: string | null
          dismissed_at?: string | null
          guide_started_at?: string | null
          id?: string
          last_step_viewed?: string | null
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
          welcome_seen_at?: string | null
        }
        Update: {
          created_at?: string | null
          dismissed_at?: string | null
          guide_started_at?: string | null
          id?: string
          last_step_viewed?: string | null
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
          welcome_seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_state_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_domains: {
        Row: {
          activated_at: string | null
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          domain_type: Database["public"]["Enums"]["domain_type"]
          hostname: string
          id: string
          is_primary: boolean
          organization_id: string
          ssl_provisioned_at: string | null
          ssl_status: string
          updated_at: string
          verification_attempted_at: string | null
          verification_method: string
          verification_status: Database["public"]["Enums"]["domain_verification_status"]
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          domain_type: Database["public"]["Enums"]["domain_type"]
          hostname: string
          id?: string
          is_primary?: boolean
          organization_id: string
          ssl_provisioned_at?: string | null
          ssl_status?: string
          updated_at?: string
          verification_attempted_at?: string | null
          verification_method?: string
          verification_status?: Database["public"]["Enums"]["domain_verification_status"]
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          domain_type?: Database["public"]["Enums"]["domain_type"]
          hostname?: string
          id?: string
          is_primary?: boolean
          organization_id?: string
          ssl_provisioned_at?: string | null
          ssl_status?: string
          updated_at?: string
          verification_attempted_at?: string | null
          verification_method?: string
          verification_status?: Database["public"]["Enums"]["domain_verification_status"]
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_domains_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          admin_signup_notified_at: string | null
          billing_country: string | null
          billing_country_verified_at: string | null
          billing_country_verified_by: string | null
          billing_currency: string | null
          billing_cycle: string | null
          billing_profile_reason: string | null
          billing_test_org: boolean
          billing_test_org_reason: string | null
          billing_test_org_set_at: string | null
          billing_test_org_set_by: string | null
          cancelled_at: string | null
          centre_billing_anchor: string | null
          centre_billing_cycle: string | null
          centre_billing_months: number
          centre_plan: string | null
          colors: Json | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          current_term_id: string | null
          email: string | null
          established_year: number | null
          grace_period_ends_at: string | null
          id: string
          ledger_migrated_at: string | null
          logo_url: string | null
          motto: string | null
          name: string
          phone: string | null
          principal_id: string | null
          principal_name: string | null
          principal_signature_url: string | null
          principal_title: string | null
          report_card_settings: Json | null
          school_name: string | null
          session_name: string | null
          student_capacity: number | null
          subscription_expires_at: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          subscription_start: string | null
          subscription_status: Database["public"]["Enums"]["sub_status"]
          suspended_at: string | null
          suspension_reason: string | null
          tax_id: string | null
          tax_treatment: string
          teacher_signature_url: string | null
          term_name: string | null
          tertiary_billing_currency: string
          tertiary_billing_cycle: string
          tertiary_custom_price_per_student: number | null
          tertiary_plan: string | null
          tertiary_plan_set_at: string | null
          tertiary_plan_set_by: string | null
          trial_end: string | null
          trial_start: string | null
          type: Database["public"]["Enums"]["org_type"]
          type_verification_decision: string | null
          type_verification_reason: string | null
          type_verification_status: string
          type_verified_at: string | null
          type_verified_by: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          admin_signup_notified_at?: string | null
          billing_country?: string | null
          billing_country_verified_at?: string | null
          billing_country_verified_by?: string | null
          billing_currency?: string | null
          billing_cycle?: string | null
          billing_profile_reason?: string | null
          billing_test_org?: boolean
          billing_test_org_reason?: string | null
          billing_test_org_set_at?: string | null
          billing_test_org_set_by?: string | null
          cancelled_at?: string | null
          centre_billing_anchor?: string | null
          centre_billing_cycle?: string | null
          centre_billing_months?: number
          centre_plan?: string | null
          colors?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          current_term_id?: string | null
          email?: string | null
          established_year?: number | null
          grace_period_ends_at?: string | null
          id?: string
          ledger_migrated_at?: string | null
          logo_url?: string | null
          motto?: string | null
          name: string
          phone?: string | null
          principal_id?: string | null
          principal_name?: string | null
          principal_signature_url?: string | null
          principal_title?: string | null
          report_card_settings?: Json | null
          school_name?: string | null
          session_name?: string | null
          student_capacity?: number | null
          subscription_expires_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_start?: string | null
          subscription_status?: Database["public"]["Enums"]["sub_status"]
          suspended_at?: string | null
          suspension_reason?: string | null
          tax_id?: string | null
          tax_treatment?: string
          teacher_signature_url?: string | null
          term_name?: string | null
          tertiary_billing_currency?: string
          tertiary_billing_cycle?: string
          tertiary_custom_price_per_student?: number | null
          tertiary_plan?: string | null
          tertiary_plan_set_at?: string | null
          tertiary_plan_set_by?: string | null
          trial_end?: string | null
          trial_start?: string | null
          type?: Database["public"]["Enums"]["org_type"]
          type_verification_decision?: string | null
          type_verification_reason?: string | null
          type_verification_status?: string
          type_verified_at?: string | null
          type_verified_by?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          admin_signup_notified_at?: string | null
          billing_country?: string | null
          billing_country_verified_at?: string | null
          billing_country_verified_by?: string | null
          billing_currency?: string | null
          billing_cycle?: string | null
          billing_profile_reason?: string | null
          billing_test_org?: boolean
          billing_test_org_reason?: string | null
          billing_test_org_set_at?: string | null
          billing_test_org_set_by?: string | null
          cancelled_at?: string | null
          centre_billing_anchor?: string | null
          centre_billing_cycle?: string | null
          centre_billing_months?: number
          centre_plan?: string | null
          colors?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          current_term_id?: string | null
          email?: string | null
          established_year?: number | null
          grace_period_ends_at?: string | null
          id?: string
          ledger_migrated_at?: string | null
          logo_url?: string | null
          motto?: string | null
          name?: string
          phone?: string | null
          principal_id?: string | null
          principal_name?: string | null
          principal_signature_url?: string | null
          principal_title?: string | null
          report_card_settings?: Json | null
          school_name?: string | null
          session_name?: string | null
          student_capacity?: number | null
          subscription_expires_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_start?: string | null
          subscription_status?: Database["public"]["Enums"]["sub_status"]
          suspended_at?: string | null
          suspension_reason?: string | null
          tax_id?: string | null
          tax_treatment?: string
          teacher_signature_url?: string | null
          term_name?: string | null
          tertiary_billing_currency?: string
          tertiary_billing_cycle?: string
          tertiary_custom_price_per_student?: number | null
          tertiary_plan?: string | null
          tertiary_plan_set_at?: string | null
          tertiary_plan_set_by?: string | null
          trial_end?: string | null
          trial_start?: string | null
          type?: Database["public"]["Enums"]["org_type"]
          type_verification_decision?: string | null
          type_verification_reason?: string | null
          type_verification_status?: string
          type_verified_at?: string | null
          type_verified_by?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_current_term_id_fkey"
            columns: ["current_term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_principal_id_fkey"
            columns: ["principal_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_tertiary_plan_fkey"
            columns: ["tertiary_plan"]
            isOneToOne: false
            referencedRelation: "tertiary_pricing_tiers"
            referencedColumns: ["tier_key"]
          },
          {
            foreignKeyName: "organizations_tertiary_plan_set_by_fkey"
            columns: ["tertiary_plan_set_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_accounts: {
        Row: {
          access_code: string | null
          access_code_active: boolean
          access_code_regenerated_at: string | null
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          access_code?: string | null
          access_code_active?: boolean
          access_code_regenerated_at?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
        }
        Update: {
          access_code?: string | null
          access_code_active?: boolean
          access_code_regenerated_at?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      parent_learner_links: {
        Row: {
          learner_id: string
          parent_id: string
          relationship: string | null
        }
        Insert: {
          learner_id: string
          parent_id: string
          relationship?: string | null
        }
        Update: {
          learner_id?: string
          parent_id?: string
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_learner_links_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_learner_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parent_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          allocated_by: string | null
          amount_allocated: number
          created_at: string | null
          id: string
          invoice_line_item_id: string
          payment_id: string
        }
        Insert: {
          allocated_by?: string | null
          amount_allocated: number
          created_at?: string | null
          id?: string
          invoice_line_item_id: string
          payment_id: string
        }
        Update: {
          allocated_by?: string | null
          amount_allocated?: number
          created_at?: string | null
          id?: string
          invoice_line_item_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_invoice_line_item_id_fkey"
            columns: ["invoice_line_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_countries: {
        Row: {
          country_code: string
          gateway: string
          is_supported: boolean
          note: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          country_code: string
          gateway: string
          is_supported?: boolean
          note?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          country_code?: string
          gateway?: string
          is_supported?: boolean
          note?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      payment_gateway_currencies: {
        Row: {
          currency: string
          gateway: string
          is_enabled: boolean
          note: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          currency: string
          gateway: string
          is_enabled?: boolean
          note?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          currency?: string
          gateway?: string
          is_enabled?: boolean
          note?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      payment_receipts: {
        Row: {
          account_id: string
          account_name: string | null
          account_type: string
          amount_paid: number
          billing_country: string | null
          currency: string
          description: string | null
          id: string
          issued_at: string
          net_amount: number | null
          payment_id: string
          period_end: string | null
          period_start: string | null
          plan: string | null
          receipt_number: string
          settings_snapshot: Json | null
          tax_amount: number | null
          tax_applied: boolean
          tax_id: string | null
          tax_note: string | null
          tax_rate: number | null
          tax_treatment: string | null
        }
        Insert: {
          account_id: string
          account_name?: string | null
          account_type: string
          amount_paid: number
          billing_country?: string | null
          currency: string
          description?: string | null
          id?: string
          issued_at?: string
          net_amount?: number | null
          payment_id: string
          period_end?: string | null
          period_start?: string | null
          plan?: string | null
          receipt_number: string
          settings_snapshot?: Json | null
          tax_amount?: number | null
          tax_applied?: boolean
          tax_id?: string | null
          tax_note?: string | null
          tax_rate?: number | null
          tax_treatment?: string | null
        }
        Update: {
          account_id?: string
          account_name?: string | null
          account_type?: string
          amount_paid?: number
          billing_country?: string | null
          currency?: string
          description?: string | null
          id?: string
          issued_at?: string
          net_amount?: number | null
          payment_id?: string
          period_end?: string | null
          period_start?: string | null
          plan?: string | null
          receipt_number?: string
          settings_snapshot?: Json | null
          tax_amount?: number | null
          tax_applied?: boolean
          tax_id?: string | null
          tax_note?: string | null
          tax_rate?: number | null
          tax_treatment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "processed_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reconciliation_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          note: string | null
          payment_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: number
          note?: string | null
          payment_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: number
          note?: string | null
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reconciliation_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "processed_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          method: string
          paid_date: string
          recorded_by: string | null
          reference: string | null
          status: string
          student_fee_account_id: string
          void_reason: string | null
          voided: boolean
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency: string
          id?: string
          method: string
          paid_date: string
          recorded_by?: string | null
          reference?: string | null
          status?: string
          student_fee_account_id: string
          void_reason?: string | null
          voided?: boolean
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          method?: string
          paid_date?: string
          recorded_by?: string | null
          reference?: string | null
          status?: string
          student_fee_account_id?: string
          void_reason?: string | null
          voided?: boolean
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_currency_fk"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_fee_account_id_fkey"
            columns: ["student_fee_account_id"]
            isOneToOne: false
            referencedRelation: "credit_balances"
            referencedColumns: ["student_fee_account_id"]
          },
          {
            foreignKeyName: "payments_student_fee_account_id_fkey"
            columns: ["student_fee_account_id"]
            isOneToOne: false
            referencedRelation: "student_fee_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      penalty_rules: {
        Row: {
          created_at: string | null
          enabled: boolean
          frequency: string
          grace_period_days: number
          id: string
          organization_id: string
          penalty_amount: number
          penalty_type: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          frequency?: string
          grace_period_days?: number
          id?: string
          organization_id: string
          penalty_amount?: number
          penalty_type?: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          frequency?: string
          grace_period_days?: number
          id?: string
          organization_id?: string
          penalty_amount?: number
          penalty_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalty_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          key: string
          label: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          key: string
          label: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      plan_change_events: {
        Row: {
          account_type: string
          change_type: string
          changed_at: string
          from_plan: string | null
          id: string
          organization_id: string | null
          to_plan: string
          user_id: string | null
        }
        Insert: {
          account_type: string
          change_type: string
          changed_at?: string
          from_plan?: string | null
          id?: string
          organization_id?: string | null
          to_plan: string
          user_id?: string | null
        }
        Update: {
          account_type?: string
          change_type?: string
          changed_at?: string
          from_plan?: string | null
          id?: string
          organization_id?: string | null
          to_plan?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_change_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_change_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string | null
          feature_key: string
          id: string
          is_enabled: boolean
          plan_tier: string
          student_limit: number | null
        }
        Insert: {
          created_at?: string | null
          feature_key: string
          id?: string
          is_enabled?: boolean
          plan_tier: string
          student_limit?: number | null
        }
        Update: {
          created_at?: string | null
          feature_key?: string
          id?: string
          is_enabled?: boolean
          plan_tier?: string
          student_limit?: number | null
        }
        Relationships: []
      }
      plan_org_type_eligibility: {
        Row: {
          note: string | null
          org_type: string
          plan_key: string
        }
        Insert: {
          note?: string | null
          org_type: string
          plan_key: string
        }
        Update: {
          note?: string | null
          org_type?: string
          plan_key?: string
        }
        Relationships: []
      }
      platform_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          reason: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_permissions: {
        Row: {
          category: string
          description: string | null
          key: string
          label: string
        }
        Insert: {
          category: string
          description?: string | null
          key: string
          label: string
        }
        Update: {
          category?: string
          description?: string | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      platform_role_permissions: {
        Row: {
          granted_at: string | null
          permission_key: string
          role_id: string
        }
        Insert: {
          granted_at?: string | null
          permission_key: string
          role_id: string
        }
        Update: {
          granted_at?: string | null
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "platform_permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "platform_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "platform_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system_default: boolean
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_default?: boolean
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_default?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_staff: {
        Row: {
          activated_at: string | null
          email: string
          full_name: string
          id: string
          invited_at: string | null
          invited_by: string | null
          role_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          email: string
          full_name: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role_id: string
          status?: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          email?: string
          full_name?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role_id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_staff_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_staff_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "platform_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_payments: {
        Row: {
          account_id: string
          amount: number | null
          billing_cycle: string | null
          centre_quote_id: string | null
          country_check: string | null
          currency: string | null
          evidence_ref: string | null
          gateway: string | null
          id: string
          is_test: boolean
          k12_quote_id: string | null
          paid_at: string | null
          payer_country: string | null
          payment_kind: string | null
          payment_status: string | null
          period_end: string | null
          period_start: string | null
          plan: string
          processed_at: string
          provider: string
          quote_id: string | null
          recorded_at: string
          reference: string
          resolution_evidence: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          review_reason: string | null
          review_recommendation: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          tier_key: string | null
          topup_quote_id: string | null
        }
        Insert: {
          account_id: string
          amount?: number | null
          billing_cycle?: string | null
          centre_quote_id?: string | null
          country_check?: string | null
          currency?: string | null
          evidence_ref?: string | null
          gateway?: string | null
          id?: string
          is_test?: boolean
          k12_quote_id?: string | null
          paid_at?: string | null
          payer_country?: string | null
          payment_kind?: string | null
          payment_status?: string | null
          period_end?: string | null
          period_start?: string | null
          plan: string
          processed_at?: string
          provider: string
          quote_id?: string | null
          recorded_at?: string
          reference: string
          resolution_evidence?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_reason?: string | null
          review_recommendation?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tier_key?: string | null
          topup_quote_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number | null
          billing_cycle?: string | null
          centre_quote_id?: string | null
          country_check?: string | null
          currency?: string | null
          evidence_ref?: string | null
          gateway?: string | null
          id?: string
          is_test?: boolean
          k12_quote_id?: string | null
          paid_at?: string | null
          payer_country?: string | null
          payment_kind?: string | null
          payment_status?: string | null
          period_end?: string | null
          period_start?: string | null
          plan?: string
          processed_at?: string
          provider?: string
          quote_id?: string | null
          recorded_at?: string
          reference?: string
          resolution_evidence?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_reason?: string | null
          review_recommendation?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tier_key?: string | null
          topup_quote_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processed_payments_centre_quote_id_fkey"
            columns: ["centre_quote_id"]
            isOneToOne: false
            referencedRelation: "centre_payment_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_payments_k12_quote_id_fkey"
            columns: ["k12_quote_id"]
            isOneToOne: false
            referencedRelation: "k12_payment_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "tertiary_payment_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_payments_topup_quote_id_fkey"
            columns: ["topup_quote_id"]
            isOneToOne: false
            referencedRelation: "topup_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_completions: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          learner_id: string
          organization_id: string
          status: string
          training_programme_id: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          learner_id: string
          organization_id: string
          status?: string
          training_programme_id: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          learner_id?: string
          organization_id?: string
          status?: string
          training_programme_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_completions_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_completions_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_completions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_completions_training_programme_id_fkey"
            columns: ["training_programme_id"]
            isOneToOne: false
            referencedRelation: "training_programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      programmes: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          degree_type: string | null
          department_id: string
          duration_years: number | null
          id: string
          is_active: boolean
          max_credit_units: number | null
          min_credit_units: number | null
          name: string
          organization_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          degree_type?: string | null
          department_id: string
          duration_years?: number | null
          id?: string
          is_active?: boolean
          max_credit_units?: number | null
          min_credit_units?: number | null
          name: string
          organization_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          degree_type?: string | null
          department_id?: string
          duration_years?: number | null
          id?: string
          is_active?: boolean
          max_credit_units?: number | null
          min_credit_units?: number | null
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programmes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programmes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programmes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_rules: {
        Row: {
          auto_promote_all: boolean | null
          max_failed_subjects: number | null
          min_attendance: number | null
          min_average: number | null
          organization_id: string
        }
        Insert: {
          auto_promote_all?: boolean | null
          max_failed_subjects?: number | null
          min_attendance?: number | null
          min_average?: number | null
          organization_id: string
        }
        Update: {
          auto_promote_all?: boolean | null
          max_failed_subjects?: number | null
          min_attendance?: number | null
          min_average?: number | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tickets: {
        Row: {
          batch_index: number
          created_at: string
          device_push_token_id: string | null
          expo_push_token: string
          id: string
          net_request_id: number
          notification_id: string | null
          receipt_check_attempts: number
          receipt_checked_at: string | null
          receipt_error_code: string | null
          receipt_last_requested_at: string | null
          receipt_message: string | null
          receipt_net_request_id: number | null
          receipt_status: string | null
          sent_at: string
          ticket_checked_at: string | null
          ticket_error_code: string | null
          ticket_id: string | null
          ticket_message: string | null
          ticket_status: string | null
        }
        Insert: {
          batch_index: number
          created_at?: string
          device_push_token_id?: string | null
          expo_push_token: string
          id?: string
          net_request_id: number
          notification_id?: string | null
          receipt_check_attempts?: number
          receipt_checked_at?: string | null
          receipt_error_code?: string | null
          receipt_last_requested_at?: string | null
          receipt_message?: string | null
          receipt_net_request_id?: number | null
          receipt_status?: string | null
          sent_at?: string
          ticket_checked_at?: string | null
          ticket_error_code?: string | null
          ticket_id?: string | null
          ticket_message?: string | null
          ticket_status?: string | null
        }
        Update: {
          batch_index?: number
          created_at?: string
          device_push_token_id?: string | null
          expo_push_token?: string
          id?: string
          net_request_id?: number
          notification_id?: string | null
          receipt_check_attempts?: number
          receipt_checked_at?: string | null
          receipt_error_code?: string | null
          receipt_last_requested_at?: string | null
          receipt_message?: string | null
          receipt_net_request_id?: number | null
          receipt_status?: string | null
          sent_at?: string
          ticket_checked_at?: string | null
          ticket_error_code?: string | null
          ticket_id?: string | null
          ticket_message?: string | null
          ticket_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_tickets_device_push_token_id_fkey"
            columns: ["device_push_token_id"]
            isOneToOne: false
            referencedRelation: "device_push_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_tickets_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_attempts: {
        Row: {
          created_at: string
          existing_representative_id: string | null
          id: number
          outcome: string
          representative_id: string | null
          submitted_code: string
          user_id: string
        }
        Insert: {
          created_at?: string
          existing_representative_id?: string | null
          id?: number
          outcome: string
          representative_id?: string | null
          submitted_code: string
          user_id: string
        }
        Update: {
          created_at?: string
          existing_representative_id?: string | null
          id?: number
          outcome?: string
          representative_id?: string | null
          submitted_code?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          id: string
          organization_id: string | null
          qualified_at: string | null
          referral_code: string
          referred_at: string | null
          referred_user_id: string | null
          rejection_reason: string | null
          representative_id: string
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          id?: string
          organization_id?: string | null
          qualified_at?: string | null
          referral_code: string
          referred_at?: string | null
          referred_user_id?: string | null
          rejection_reason?: string | null
          representative_id: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          id?: string
          organization_id?: string | null
          qualified_at?: string | null
          referral_code?: string
          referred_at?: string | null
          referred_user_id?: string | null
          rejection_reason?: string | null
          representative_id?: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Relationships: [
          {
            foreignKeyName: "referrals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      remark_templates: {
        Row: {
          created_at: string | null
          id: string
          instructor_id: string | null
          max_score: number
          min_score: number
          organization_id: string | null
          remark_text: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          instructor_id?: string | null
          max_score: number
          min_score: number
          organization_id?: string | null
          remark_text: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          instructor_id?: string | null
          max_score?: number
          min_score?: number
          organization_id?: string | null
          remark_text?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "remark_templates_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remark_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_cards: {
        Row: {
          created_at: string | null
          generated_at: string | null
          grade: string | null
          group_id: string | null
          id: string
          learner_id: string | null
          organization_id: string | null
          pdf_url: string | null
          percentage: number | null
          position: number | null
          principal_remark: string | null
          teacher_remark: string | null
          term_session_id: string | null
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          generated_at?: string | null
          grade?: string | null
          group_id?: string | null
          id?: string
          learner_id?: string | null
          organization_id?: string | null
          pdf_url?: string | null
          percentage?: number | null
          position?: number | null
          principal_remark?: string | null
          teacher_remark?: string | null
          term_session_id?: string | null
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          generated_at?: string | null
          grade?: string | null
          group_id?: string | null
          id?: string
          learner_id?: string | null
          organization_id?: string | null
          pdf_url?: string | null
          percentage?: number | null
          position?: number | null
          principal_remark?: string | null
          teacher_remark?: string | null
          term_session_id?: string | null
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_cards_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_term_session_id_fkey"
            columns: ["term_session_id"]
            isOneToOne: false
            referencedRelation: "term_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      report_pdf_settings: {
        Row: {
          organization_id: string
          show_admission: boolean | null
          show_components: boolean | null
          show_gender: boolean | null
          show_grade: boolean | null
          show_percentage: boolean | null
          show_position: boolean | null
          show_principal_remark: boolean | null
          show_principal_signature: boolean | null
          show_teacher_remark: boolean | null
          show_teacher_signature: boolean | null
          updated_at: string | null
        }
        Insert: {
          organization_id: string
          show_admission?: boolean | null
          show_components?: boolean | null
          show_gender?: boolean | null
          show_grade?: boolean | null
          show_percentage?: boolean | null
          show_position?: boolean | null
          show_principal_remark?: boolean | null
          show_principal_signature?: boolean | null
          show_teacher_remark?: boolean | null
          show_teacher_signature?: boolean | null
          updated_at?: string | null
        }
        Update: {
          organization_id?: string
          show_admission?: boolean | null
          show_components?: boolean | null
          show_gender?: boolean | null
          show_grade?: boolean | null
          show_percentage?: boolean | null
          show_position?: boolean | null
          show_principal_remark?: boolean | null
          show_principal_signature?: boolean | null
          show_teacher_remark?: boolean | null
          show_teacher_signature?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_pdf_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          deleted: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          download_url: string | null
          filters: Json | null
          group_id: string | null
          id: string
          learner_id: string | null
          locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          organization_id: string | null
          published_at: string | null
          published_by: string | null
          report_data: Json | null
          report_status: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          student_remarks: Json | null
          submitted_at: string | null
          submitted_by: string | null
          term_id: string | null
          type: Database["public"]["Enums"]["report_type"]
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          download_url?: string | null
          filters?: Json | null
          group_id?: string | null
          id?: string
          learner_id?: string | null
          locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          organization_id?: string | null
          published_at?: string | null
          published_by?: string | null
          report_data?: Json | null
          report_status?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          student_remarks?: Json | null
          submitted_at?: string | null
          submitted_by?: string | null
          term_id?: string | null
          type: Database["public"]["Enums"]["report_type"]
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          download_url?: string | null
          filters?: Json | null
          group_id?: string | null
          id?: string
          learner_id?: string | null
          locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          organization_id?: string | null
          published_at?: string | null
          published_by?: string | null
          report_data?: Json | null
          report_status?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          student_remarks?: Json | null
          submitted_at?: string | null
          submitted_by?: string | null
          term_id?: string | null
          type?: Database["public"]["Enums"]["report_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      representative_agreement_acceptances: {
        Row: {
          accepted_at: string
          agreement_version_id: string
          id: string
          ip_address: string | null
          representative_id: string
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string
          agreement_version_id: string
          id?: string
          ip_address?: string | null
          representative_id: string
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          agreement_version_id?: string
          id?: string
          ip_address?: string | null
          representative_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "representative_agreement_acceptances_agreement_version_id_fkey"
            columns: ["agreement_version_id"]
            isOneToOne: false
            referencedRelation: "representative_agreement_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representative_agreement_acceptances_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      representative_agreement_versions: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          version: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          version?: number
        }
        Relationships: []
      }
      representative_follow_ups: {
        Row: {
          action_taken: string | null
          challenge_issue: string | null
          contact_date: string
          contact_method: Database["public"]["Enums"]["follow_up_contact_method"]
          created_at: string
          created_by: string
          follow_up_required: boolean
          id: string
          next_follow_up_date: string | null
          notes: string | null
          organization_id: string
          reason: string | null
          representative_id: string
          school_reported: string | null
        }
        Insert: {
          action_taken?: string | null
          challenge_issue?: string | null
          contact_date?: string
          contact_method: Database["public"]["Enums"]["follow_up_contact_method"]
          created_at?: string
          created_by?: string
          follow_up_required?: boolean
          id?: string
          next_follow_up_date?: string | null
          notes?: string | null
          organization_id: string
          reason?: string | null
          representative_id: string
          school_reported?: string | null
        }
        Update: {
          action_taken?: string | null
          challenge_issue?: string | null
          contact_date?: string
          contact_method?: Database["public"]["Enums"]["follow_up_contact_method"]
          created_at?: string
          created_by?: string
          follow_up_required?: boolean
          id?: string
          next_follow_up_date?: string | null
          notes?: string | null
          organization_id?: string
          reason?: string | null
          representative_id?: string
          school_reported?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "representative_follow_ups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representative_follow_ups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representative_follow_ups_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      representative_performance_snapshots: {
        Row: {
          computed_at: string
          created_at: string
          feedback_metric: number
          followup_metric: number
          growth_level: number
          id: string
          performance_score: number
          qualifying_schools_count: number
          rank: number
          representative_id: string
          retention_metric: number
          revenue_metric: number
          score_breakdown: Json
          snapshot_date: string
          total_representatives: number
        }
        Insert: {
          computed_at?: string
          created_at?: string
          feedback_metric: number
          followup_metric: number
          growth_level: number
          id?: string
          performance_score: number
          qualifying_schools_count: number
          rank: number
          representative_id: string
          retention_metric: number
          revenue_metric: number
          score_breakdown: Json
          snapshot_date: string
          total_representatives: number
        }
        Update: {
          computed_at?: string
          created_at?: string
          feedback_metric?: number
          followup_metric?: number
          growth_level?: number
          id?: string
          performance_score?: number
          qualifying_schools_count?: number
          rank?: number
          representative_id?: string
          retention_metric?: number
          revenue_metric?: number
          score_breakdown?: Json
          snapshot_date?: string
          total_representatives?: number
        }
        Relationships: [
          {
            foreignKeyName: "representative_performance_snapshots_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      representative_recognitions: {
        Row: {
          category: Database["public"]["Enums"]["recognition_category"]
          created_at: string
          id: string
          metadata: Json | null
          performance_score: number | null
          period_end: string
          period_start: string
          period_type: string
          representative_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["recognition_category"]
          created_at?: string
          id?: string
          metadata?: Json | null
          performance_score?: number | null
          period_end: string
          period_start: string
          period_type: string
          representative_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["recognition_category"]
          created_at?: string
          id?: string
          metadata?: Json | null
          performance_score?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          representative_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "representative_recognitions_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      representative_resource_downloads: {
        Row: {
          downloaded_at: string
          id: string
          representative_id: string
          resource_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          representative_id: string
          resource_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          representative_id?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "representative_resource_downloads_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representative_resource_downloads_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "representative_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      representative_resources: {
        Row: {
          campaign_key: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          effective_date: string | null
          expiry_date: string | null
          external_url: string | null
          file_size_bytes: number | null
          id: string
          is_featured: boolean
          is_important: boolean
          mime_type: string | null
          product: string | null
          replaces_resource_id: string | null
          resource_type: string
          status: string
          storage_path: string | null
          title: string
          updated_at: string
          updated_by: string | null
          version: string | null
          visibility: string
          visible_group: string | null
        }
        Insert: {
          campaign_key?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          external_url?: string | null
          file_size_bytes?: number | null
          id?: string
          is_featured?: boolean
          is_important?: boolean
          mime_type?: string | null
          product?: string | null
          replaces_resource_id?: string | null
          resource_type: string
          status?: string
          storage_path?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: string | null
          visibility?: string
          visible_group?: string | null
        }
        Update: {
          campaign_key?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          external_url?: string | null
          file_size_bytes?: number | null
          id?: string
          is_featured?: boolean
          is_important?: boolean
          mime_type?: string | null
          product?: string | null
          replaces_resource_id?: string | null
          resource_type?: string
          status?: string
          storage_path?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: string | null
          visibility?: string
          visible_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "representative_resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representative_resources_replaces_resource_id_fkey"
            columns: ["replaces_resource_id"]
            isOneToOne: false
            referencedRelation: "representative_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      representative_school_relationships: {
        Row: {
          created_at: string
          follow_up_status: string
          health_note: string | null
          health_set_at: string | null
          health_set_by: string | null
          health_status: Database["public"]["Enums"]["relationship_health_status"]
          id: string
          last_contact_at: string | null
          next_follow_up_at: string | null
          organization_id: string
          representative_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          follow_up_status?: string
          health_note?: string | null
          health_set_at?: string | null
          health_set_by?: string | null
          health_status?: Database["public"]["Enums"]["relationship_health_status"]
          id?: string
          last_contact_at?: string | null
          next_follow_up_at?: string | null
          organization_id: string
          representative_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          follow_up_status?: string
          health_note?: string | null
          health_set_at?: string | null
          health_set_by?: string | null
          health_status?: Database["public"]["Enums"]["relationship_health_status"]
          id?: string
          last_contact_at?: string | null
          next_follow_up_at?: string | null
          organization_id?: string
          representative_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "representative_school_relationships_health_set_by_fkey"
            columns: ["health_set_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representative_school_relationships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representative_school_relationships_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      representatives: {
        Row: {
          admin_signup_notified_at: string | null
          commission_rate: number
          created_by: string | null
          email: string
          full_name: string
          id: string
          joined_at: string | null
          level: Database["public"]["Enums"]["representative_level"]
          phone: string | null
          photo_rejection_reason: string | null
          photo_reviewed_at: string | null
          photo_reviewed_by: string | null
          photo_status: string
          photo_url: string | null
          qualified_customers_count: number
          recruited_by: string | null
          referral_code: string
          status: Database["public"]["Enums"]["representative_status"]
          territory_state: string | null
          territory_zone: string | null
          total_commission_earned: number
          total_commission_paid: number
          user_id: string | null
        }
        Insert: {
          admin_signup_notified_at?: string | null
          commission_rate?: number
          created_by?: string | null
          email: string
          full_name: string
          id?: string
          joined_at?: string | null
          level?: Database["public"]["Enums"]["representative_level"]
          phone?: string | null
          photo_rejection_reason?: string | null
          photo_reviewed_at?: string | null
          photo_reviewed_by?: string | null
          photo_status?: string
          photo_url?: string | null
          qualified_customers_count?: number
          recruited_by?: string | null
          referral_code: string
          status?: Database["public"]["Enums"]["representative_status"]
          territory_state?: string | null
          territory_zone?: string | null
          total_commission_earned?: number
          total_commission_paid?: number
          user_id?: string | null
        }
        Update: {
          admin_signup_notified_at?: string | null
          commission_rate?: number
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          joined_at?: string | null
          level?: Database["public"]["Enums"]["representative_level"]
          phone?: string | null
          photo_rejection_reason?: string | null
          photo_reviewed_at?: string | null
          photo_reviewed_by?: string | null
          photo_status?: string
          photo_url?: string | null
          qualified_customers_count?: number
          recruited_by?: string | null
          referral_code?: string
          status?: Database["public"]["Enums"]["representative_status"]
          territory_state?: string | null
          territory_zone?: string | null
          total_commission_earned?: number
          total_commission_paid?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "representatives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representatives_recruited_by_fkey"
            columns: ["recruited_by"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representatives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      result_correction_requests: {
        Row: {
          applied_at: string | null
          existing_grade_letter: string | null
          existing_grade_point: number | null
          existing_total_score: number | null
          id: string
          learner_id: string
          new_grade_letter: string | null
          new_grade_point: number | null
          new_total_score: number | null
          organization_id: string
          proposed_components: Json
          reason: string
          requested_at: string
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subject_id: string
          supporting_evidence_url: string | null
          term_id: string
        }
        Insert: {
          applied_at?: string | null
          existing_grade_letter?: string | null
          existing_grade_point?: number | null
          existing_total_score?: number | null
          id?: string
          learner_id: string
          new_grade_letter?: string | null
          new_grade_point?: number | null
          new_total_score?: number | null
          organization_id: string
          proposed_components: Json
          reason: string
          requested_at?: string
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject_id: string
          supporting_evidence_url?: string | null
          term_id: string
        }
        Update: {
          applied_at?: string | null
          existing_grade_letter?: string | null
          existing_grade_point?: number | null
          existing_total_score?: number | null
          id?: string
          learner_id?: string
          new_grade_letter?: string | null
          new_grade_point?: number | null
          new_total_score?: number | null
          organization_id?: string
          proposed_components?: Json
          reason?: string
          requested_at?: string
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject_id?: string
          supporting_evidence_url?: string | null
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "result_correction_requests_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_correction_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_correction_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_correction_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_correction_requests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_correction_requests_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          permission_key: string
          role_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          permission_key: string
          role_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "school_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_feedback: {
        Row: {
          biggest_challenge: string | null
          category: Database["public"]["Enums"]["feedback_category"]
          created_at: string
          created_by: string
          id: string
          notes: string | null
          organization_id: string
          representative_id: string
          responded_at: string | null
          responded_by: string | null
          response: string | null
          satisfaction:
            | Database["public"]["Enums"]["feedback_satisfaction_level"]
            | null
          status: Database["public"]["Enums"]["feedback_status"]
          subtype: string | null
        }
        Insert: {
          biggest_challenge?: string | null
          category?: Database["public"]["Enums"]["feedback_category"]
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          organization_id: string
          representative_id: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          satisfaction?:
            | Database["public"]["Enums"]["feedback_satisfaction_level"]
            | null
          status?: Database["public"]["Enums"]["feedback_status"]
          subtype?: string | null
        }
        Update: {
          biggest_challenge?: string | null
          category?: Database["public"]["Enums"]["feedback_category"]
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          organization_id?: string
          representative_id?: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          satisfaction?:
            | Database["public"]["Enums"]["feedback_satisfaction_level"]
            | null
          status?: Database["public"]["Enums"]["feedback_status"]
          subtype?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_feedback_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_feedback_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_feedback_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      school_portfolio_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          organization_id: string
          reason: string | null
          representative_id: string
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          organization_id: string
          reason?: string | null
          representative_id: string
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          reason?: string | null
          representative_id?: string
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_portfolio_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_portfolio_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_portfolio_assignments_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      school_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system_default: boolean
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_default?: boolean
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_default?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          component_id: string
          credit_unit_snapshot: number | null
          entered_at: string
          entered_by: string
          grade_letter: string | null
          grade_point: number | null
          id: string
          is_final: boolean
          last_modified: string
          learner_id: string
          metadata: Json | null
          quality_points: number | null
          remarks: string | null
          score: number | null
          subject_id: string
        }
        Insert: {
          component_id: string
          credit_unit_snapshot?: number | null
          entered_at?: string
          entered_by: string
          grade_letter?: string | null
          grade_point?: number | null
          id?: string
          is_final?: boolean
          last_modified?: string
          learner_id: string
          metadata?: Json | null
          quality_points?: number | null
          remarks?: string | null
          score?: number | null
          subject_id: string
        }
        Update: {
          component_id?: string
          credit_unit_snapshot?: number | null
          entered_at?: string
          entered_by?: string
          grade_letter?: string | null
          grade_point?: number | null
          id?: string
          is_final?: boolean
          last_modified?: string
          learner_id?: string
          metadata?: Json | null
          quality_points?: number | null
          remarks?: string | null
          score?: number | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "assessment_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_notification_outbox: {
        Row: {
          attempt_count: number
          created_at: string
          entity_id: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          next_attempt_at: string | null
          payload: Json
          sent_at: string | null
          signup_type: string
          status: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          entity_id: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          next_attempt_at?: string | null
          payload: Json
          sent_at?: string | null
          signup_type: string
          status?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          entity_id?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          next_attempt_at?: string | null
          payload?: Json
          sent_at?: string | null
          signup_type?: string
          status?: string
        }
        Relationships: []
      }
      staff_role_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          is_active: boolean
          organization_id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_role_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "school_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_academic_history: {
        Row: {
          average: number | null
          class_id: string
          corrected_at: string | null
          corrected_by: string | null
          correction_note: string | null
          created_at: string | null
          id: string
          learner_id: string
          position: number | null
          promoted_to_class_id: string | null
          session_id: string
          status: string
          term_id: string | null
        }
        Insert: {
          average?: number | null
          class_id: string
          corrected_at?: string | null
          corrected_by?: string | null
          correction_note?: string | null
          created_at?: string | null
          id?: string
          learner_id: string
          position?: number | null
          promoted_to_class_id?: string | null
          session_id: string
          status: string
          term_id?: string | null
        }
        Update: {
          average?: number | null
          class_id?: string
          corrected_at?: string | null
          corrected_by?: string | null
          correction_note?: string | null
          created_at?: string | null
          id?: string
          learner_id?: string
          position?: number | null
          promoted_to_class_id?: string | null
          session_id?: string
          status?: string
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_academic_history_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_academic_history_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_academic_history_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_academic_history_promoted_to_class_id_fkey"
            columns: ["promoted_to_class_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_academic_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_academic_history_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fee_accounts: {
        Row: {
          created_at: string | null
          currency: string
          id: string
          learner_id: string
          organization_id: string
          term_id: string
        }
        Insert: {
          created_at?: string | null
          currency: string
          id?: string
          learner_id: string
          organization_id: string
          term_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string
          id?: string
          learner_id?: string
          organization_id?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fee_accounts_currency_fk"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "student_fee_accounts_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_accounts_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      student_onboarding_documents: {
        Row: {
          document_type: string
          file_url: string
          id: string
          learner_id: string
          organization_id: string
          rejection_reason: string | null
          uploaded_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          document_type: string
          file_url: string
          id?: string
          learner_id: string
          organization_id: string
          rejection_reason?: string | null
          uploaded_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          document_type?: string
          file_url?: string
          id?: string
          learner_id?: string
          organization_id?: string
          rejection_reason?: string | null
          uploaded_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_onboarding_documents_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_onboarding_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_onboarding_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_onboarding_progress: {
        Row: {
          completed_at: string | null
          data: Json | null
          id: string
          learner_id: string
          step_key: string
        }
        Insert: {
          completed_at?: string | null
          data?: Json | null
          id?: string
          learner_id: string
          step_key: string
        }
        Update: {
          completed_at?: string | null
          data?: Json | null
          id?: string
          learner_id?: string
          step_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_onboarding_progress_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      student_reports: {
        Row: {
          created_at: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          is_published: boolean | null
          learner_id: string | null
          organization_id: string | null
          pdf_url: string | null
          published_at: string | null
          report_data: Json | null
          session_id: string | null
          status: string | null
          term_id: string | null
        }
        Insert: {
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          is_published?: boolean | null
          learner_id?: string | null
          organization_id?: string | null
          pdf_url?: string | null
          published_at?: string | null
          report_data?: Json | null
          session_id?: string | null
          status?: string | null
          term_id?: string | null
        }
        Update: {
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          is_published?: boolean | null
          learner_id?: string | null
          organization_id?: string | null
          pdf_url?: string | null
          published_at?: string | null
          report_data?: Json | null
          session_id?: string | null
          status?: string | null
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_reports_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_reports_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          course_id: string | null
          course_status: string | null
          course_type: string | null
          created_at: string
          credit_unit: number | null
          curriculum_id: string | null
          description: string | null
          group_id: string
          id: string
          instructor_id: string | null
          is_active: boolean
          name: string
          offering_kind: string
          organization_id: string | null
          prerequisite_subject_id: string | null
          teacher_id: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          course_id?: string | null
          course_status?: string | null
          course_type?: string | null
          created_at?: string
          credit_unit?: number | null
          curriculum_id?: string | null
          description?: string | null
          group_id: string
          id?: string
          instructor_id?: string | null
          is_active?: boolean
          name: string
          offering_kind?: string
          organization_id?: string | null
          prerequisite_subject_id?: string | null
          teacher_id?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          course_id?: string | null
          course_status?: string | null
          course_type?: string | null
          created_at?: string
          credit_unit?: number | null
          curriculum_id?: string | null
          description?: string | null
          group_id?: string
          id?: string
          instructor_id?: string | null
          is_active?: boolean
          name?: string
          offering_kind?: string
          organization_id?: string | null
          prerequisite_subject_id?: string | null
          teacher_id?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "tertiary_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_prerequisite_subject_id_fkey"
            columns: ["prerequisite_subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "assessment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          paid_at: string | null
          plan_key: string
          status: string
          tx_ref: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          plan_key: string
          status?: string
          tx_ref?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          plan_key?: string
          status?: string
          tx_ref?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          added_by: string | null
          created_at: string | null
          email: string
          id: string
          name: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_internal_note: boolean
          sender_user_id: string | null
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_internal_note?: boolean
          sender_user_id?: string | null
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_internal_note?: boolean
          sender_user_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          attachment_url: string | null
          category: string | null
          closed_at: string | null
          created_at: string | null
          id: string
          issue_type:
            | Database["public"]["Enums"]["escalation_issue_type"]
            | null
          linked_ticket_id: string | null
          organization_id: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          representative_id: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          submitted_by_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachment_url?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string | null
          id?: string
          issue_type?:
            | Database["public"]["Enums"]["escalation_issue_type"]
            | null
          linked_ticket_id?: string | null
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          representative_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          submitted_by_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachment_url?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string | null
          id?: string
          issue_type?:
            | Database["public"]["Enums"]["escalation_issue_type"]
            | null
          linked_ticket_id?: string | null
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          representative_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          submitted_by_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "platform_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_linked_ticket_id_fkey"
            columns: ["linked_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_settings: {
        Row: {
          auto_apply_vat: boolean
          id: boolean
          notes: string | null
          prices_tax_inclusive: boolean | null
          updated_at: string
          updated_by: string | null
          vat_effective_from: string | null
          vat_rate: number
          vat_registered: boolean
          vat_registration_number: string | null
        }
        Insert: {
          auto_apply_vat?: boolean
          id?: boolean
          notes?: string | null
          prices_tax_inclusive?: boolean | null
          updated_at?: string
          updated_by?: string | null
          vat_effective_from?: string | null
          vat_rate?: number
          vat_registered?: boolean
          vat_registration_number?: string | null
        }
        Update: {
          auto_apply_vat?: boolean
          id?: boolean
          notes?: string | null
          prices_tax_inclusive?: boolean | null
          updated_at?: string
          updated_by?: string | null
          vat_effective_from?: string | null
          vat_rate?: number
          vat_registered?: boolean
          vat_registration_number?: string | null
        }
        Relationships: []
      }
      tax_settings_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: number
          reason: string | null
          snapshot: Json
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: number
          reason?: string | null
          snapshot: Json
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: number
          reason?: string | null
          snapshot?: Json
        }
        Relationships: []
      }
      teacher_assignments: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          role: string | null
          subject_id: string | null
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          role?: string | null
          subject_id?: string | null
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          role?: string | null
          subject_id?: string | null
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_connectors: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          id: string
          kind: string
          label: string
          organization_id: string
          provider: string
          secret_id: string | null
          status: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          label?: string
          organization_id: string
          provider: string
          secret_id?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          label?: string
          organization_id?: string
          provider?: string
          secret_id?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_connectors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          created_at: string
          default_locale: string
          fee_currency: string | null
          operating_country: string | null
          organization_id: string
          settings: Json
          supported_locales: string[]
          timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_locale?: string
          fee_currency?: string | null
          operating_country?: string | null
          organization_id: string
          settings?: Json
          supported_locales?: string[]
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_locale?: string
          fee_currency?: string | null
          operating_country?: string | null
          organization_id?: string
          settings?: Json
          supported_locales?: string[]
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_fee_currency_fkey"
            columns: ["fee_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tenant_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      term_sessions: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          session_id: string | null
          start_date: string | null
          term_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          session_id?: string | null
          start_date?: string | null
          term_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          session_id?: string | null
          start_date?: string | null
          term_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "term_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_sessions_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      term_settings: {
        Row: {
          closing_date: string | null
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          resumption_date: string | null
          start_date: string | null
          term_id: string | null
        }
        Insert: {
          closing_date?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          resumption_date?: string | null
          start_date?: string | null
          term_id?: string | null
        }
        Update: {
          closing_date?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          resumption_date?: string | null
          start_date?: string | null
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "term_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_settings_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closed_reason: string | null
          created_at: string
          end_date: string | null
          id: string
          instructor_id: string | null
          is_active: boolean
          name: string
          organization_id: string | null
          session_id: string
          start_date: string | null
          status: string
          tertiary_grading_scale_config_id: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          instructor_id?: string | null
          is_active?: boolean
          name: string
          organization_id?: string | null
          session_id: string
          start_date?: string | null
          status?: string
          tertiary_grading_scale_config_id?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          instructor_id?: string | null
          is_active?: boolean
          name?: string
          organization_id?: string | null
          session_id?: string
          start_date?: string | null
          status?: string
          tertiary_grading_scale_config_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "terms_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_tertiary_grading_scale_config_id_fkey"
            columns: ["tertiary_grading_scale_config_id"]
            isOneToOne: false
            referencedRelation: "grading_scale_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      tertiary_course_equivalencies: {
        Row: {
          approved_at: string
          approved_by: string
          effective_from: string | null
          from_course_id: string
          id: string
          organization_id: string
          reason: string
          relation: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          to_course_id: string
        }
        Insert: {
          approved_at?: string
          approved_by: string
          effective_from?: string | null
          from_course_id: string
          id?: string
          organization_id: string
          reason: string
          relation: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          to_course_id: string
        }
        Update: {
          approved_at?: string
          approved_by?: string
          effective_from?: string | null
          from_course_id?: string
          id?: string
          organization_id?: string
          reason?: string
          relation?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          to_course_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tertiary_course_equivalencies_from_course_id_fkey"
            columns: ["from_course_id"]
            isOneToOne: false
            referencedRelation: "tertiary_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tertiary_course_equivalencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tertiary_course_equivalencies_to_course_id_fkey"
            columns: ["to_course_id"]
            isOneToOne: false
            referencedRelation: "tertiary_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      tertiary_courses: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          department_id: string | null
          id: string
          is_active: boolean
          organization_id: string
          retire_reason: string | null
          retired_at: string | null
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          retire_reason?: string | null
          retired_at?: string | null
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          retire_reason?: string | null
          retired_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tertiary_courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tertiary_courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tertiary_payment_quotes: {
        Row: {
          amount_due: number
          annual_discount_rate: number | null
          billable_quantity: number | null
          billing_cycle: string | null
          calculated_amount: number | null
          confirmed_at: string | null
          created_at: string
          currency: string
          expires_at: string
          founding_application_id: string | null
          id: string
          minimum_adjusted: boolean
          organization_id: string
          period_end: string | null
          period_label: string | null
          period_start: string | null
          price_per_student_per_term: number | null
          quote_kind: string
          reference: string
          status: string
          student_count_at_quote: number | null
          termly_amount: number | null
          tier_key: string | null
        }
        Insert: {
          amount_due: number
          annual_discount_rate?: number | null
          billable_quantity?: number | null
          billing_cycle?: string | null
          calculated_amount?: number | null
          confirmed_at?: string | null
          created_at?: string
          currency: string
          expires_at?: string
          founding_application_id?: string | null
          id?: string
          minimum_adjusted?: boolean
          organization_id: string
          period_end?: string | null
          period_label?: string | null
          period_start?: string | null
          price_per_student_per_term?: number | null
          quote_kind?: string
          reference: string
          status?: string
          student_count_at_quote?: number | null
          termly_amount?: number | null
          tier_key?: string | null
        }
        Update: {
          amount_due?: number
          annual_discount_rate?: number | null
          billable_quantity?: number | null
          billing_cycle?: string | null
          calculated_amount?: number | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          founding_application_id?: string | null
          id?: string
          minimum_adjusted?: boolean
          organization_id?: string
          period_end?: string | null
          period_label?: string | null
          period_start?: string | null
          price_per_student_per_term?: number | null
          quote_kind?: string
          reference?: string
          status?: string
          student_count_at_quote?: number | null
          termly_amount?: number | null
          tier_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tertiary_payment_quotes_founding_application_id_fkey"
            columns: ["founding_application_id"]
            isOneToOne: false
            referencedRelation: "founding_institution_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tertiary_payment_quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tertiary_plan_capabilities: {
        Row: {
          capability_key: string
          created_at: string
          customer_visible: boolean
          id: string
          is_enabled: boolean
          tier_key: string
          visibility_note: string | null
        }
        Insert: {
          capability_key: string
          created_at?: string
          customer_visible?: boolean
          id?: string
          is_enabled?: boolean
          tier_key: string
          visibility_note?: string | null
        }
        Update: {
          capability_key?: string
          created_at?: string
          customer_visible?: boolean
          id?: string
          is_enabled?: boolean
          tier_key?: string
          visibility_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tertiary_plan_capabilities_tier_key_fkey"
            columns: ["tier_key"]
            isOneToOne: false
            referencedRelation: "tertiary_pricing_tiers"
            referencedColumns: ["tier_key"]
          },
        ]
      }
      tertiary_pricing_tiers: {
        Row: {
          created_at: string
          currency: string
          is_active: boolean
          is_custom: boolean
          max_students: number | null
          min_students: number
          name: string
          price_per_student_per_term: number | null
          tier_key: string
        }
        Insert: {
          created_at?: string
          currency?: string
          is_active?: boolean
          is_custom?: boolean
          max_students?: number | null
          min_students: number
          name: string
          price_per_student_per_term?: number | null
          tier_key: string
        }
        Update: {
          created_at?: string
          currency?: string
          is_active?: boolean
          is_custom?: boolean
          max_students?: number | null
          min_students?: number
          name?: string
          price_per_student_per_term?: number | null
          tier_key?: string
        }
        Relationships: []
      }
      tertiary_student_records: {
        Row: {
          academic_status: string
          classification: string | null
          created_at: string
          current_level: string | null
          entry_session_id: string | null
          expected_graduation_session_id: string | null
          final_cgpa: number | null
          graduation_approved_at: string | null
          graduation_approved_by: string | null
          graduation_session_id: string | null
          id: string
          jamb_registration_number: string | null
          learner_id: string
          organization_id: string
          programme_id: string
          status_changed_at: string | null
          status_changed_by: string | null
          status_effective_date: string | null
          status_reason: string | null
          student_type: string | null
          updated_at: string
        }
        Insert: {
          academic_status?: string
          classification?: string | null
          created_at?: string
          current_level?: string | null
          entry_session_id?: string | null
          expected_graduation_session_id?: string | null
          final_cgpa?: number | null
          graduation_approved_at?: string | null
          graduation_approved_by?: string | null
          graduation_session_id?: string | null
          id?: string
          jamb_registration_number?: string | null
          learner_id: string
          organization_id: string
          programme_id: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_effective_date?: string | null
          status_reason?: string | null
          student_type?: string | null
          updated_at?: string
        }
        Update: {
          academic_status?: string
          classification?: string | null
          created_at?: string
          current_level?: string | null
          entry_session_id?: string | null
          expected_graduation_session_id?: string | null
          final_cgpa?: number | null
          graduation_approved_at?: string | null
          graduation_approved_by?: string | null
          graduation_session_id?: string | null
          id?: string
          jamb_registration_number?: string | null
          learner_id?: string
          organization_id?: string
          programme_id?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_effective_date?: string | null
          status_reason?: string | null
          student_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tertiary_student_records_entry_session_id_fkey"
            columns: ["entry_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tertiary_student_records_expected_graduation_session_id_fkey"
            columns: ["expected_graduation_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tertiary_student_records_graduation_approved_by_fkey"
            columns: ["graduation_approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tertiary_student_records_graduation_session_id_fkey"
            columns: ["graduation_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tertiary_student_records_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: true
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tertiary_student_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tertiary_student_records_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tertiary_student_records_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tertiary_tier_prices: {
        Row: {
          created_at: string
          currency: string
          price_per_student_per_term: number
          tier_key: string
        }
        Insert: {
          created_at?: string
          currency: string
          price_per_student_per_term: number
          tier_key: string
        }
        Update: {
          created_at?: string
          currency?: string
          price_per_student_per_term?: number
          tier_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "tertiary_tier_prices_tier_key_fkey"
            columns: ["tier_key"]
            isOneToOne: false
            referencedRelation: "tertiary_pricing_tiers"
            referencedColumns: ["tier_key"]
          },
        ]
      }
      tertiary_transcript_issues: {
        Row: {
          code_hash: string
          id: string
          issued_at: string
          issued_by: string
          learner_id: string
          organization_id: string
          reference: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          snapshot: Json
          snapshot_hash: string
          status: string
          student_may_download: boolean
        }
        Insert: {
          code_hash: string
          id?: string
          issued_at?: string
          issued_by: string
          learner_id: string
          organization_id: string
          reference: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          snapshot: Json
          snapshot_hash: string
          status?: string
          student_may_download?: boolean
        }
        Update: {
          code_hash?: string
          id?: string
          issued_at?: string
          issued_by?: string
          learner_id?: string
          organization_id?: string
          reference?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          snapshot?: Json
          snapshot_hash?: string
          status?: string
          student_may_download?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tertiary_transcript_issues_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tertiary_transcript_issues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tertiary_transcript_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          issue_id: string | null
          learner_id: string
          organization_id: string
          purpose: string
          recipient: string | null
          rejection_reason: string | null
          requested_by: string
          status: string
          updated_at: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          issue_id?: string | null
          learner_id: string
          organization_id: string
          purpose: string
          recipient?: string | null
          rejection_reason?: string | null
          requested_by: string
          status?: string
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          issue_id?: string | null
          learner_id?: string
          organization_id?: string
          purpose?: string
          recipient?: string | null
          rejection_reason?: string | null
          requested_by?: string
          status?: string
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tertiary_transcript_requests_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "tertiary_transcript_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tertiary_transcript_requests_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tertiary_transcript_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tertiary_transcript_verify_attempts: {
        Row: {
          failed_count: number
          last_attempt_at: string | null
          locked_until: string | null
          reference: string
        }
        Insert: {
          failed_count?: number
          last_attempt_at?: string | null
          locked_until?: string | null
          reference: string
        }
        Update: {
          failed_count?: number
          last_attempt_at?: string | null
          locked_until?: string | null
          reference?: string
        }
        Relationships: []
      }
      topup_notices: {
        Row: {
          notice_key: string
          sent_at: string
          topup_id: string
        }
        Insert: {
          notice_key: string
          sent_at?: string
          topup_id: string
        }
        Update: {
          notice_key?: string
          sent_at?: string
          topup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topup_notices_topup_id_fkey"
            columns: ["topup_id"]
            isOneToOne: false
            referencedRelation: "topup_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      topup_quotes: {
        Row: {
          amount_due: number
          billing_cycle: string
          cancelled_reason: string | null
          created_at: string
          currency: string
          current_capacity: number
          current_plan: string
          current_price: number
          dispute_reason: string | null
          dispute_resolution: string | null
          dispute_resolved_at: string | null
          dispute_resolved_by: string | null
          disputed_at: string | null
          due_at: string
          formula: string
          id: string
          issued_at: string
          issued_by: string | null
          org_type: string
          organization_id: string
          paid_at: string | null
          period_days: number
          period_end: string
          period_start: string
          reference: string
          remaining_days: number
          snapshot: Json
          source_payment_id: string
          status: string
          target_capacity: number
          target_plan: string
          target_price: number
          tolerance_limit: number
          verified_count: number
        }
        Insert: {
          amount_due: number
          billing_cycle: string
          cancelled_reason?: string | null
          created_at?: string
          currency: string
          current_capacity: number
          current_plan: string
          current_price: number
          dispute_reason?: string | null
          dispute_resolution?: string | null
          dispute_resolved_at?: string | null
          dispute_resolved_by?: string | null
          disputed_at?: string | null
          due_at: string
          formula: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          org_type: string
          organization_id: string
          paid_at?: string | null
          period_days: number
          period_end: string
          period_start: string
          reference: string
          remaining_days: number
          snapshot: Json
          source_payment_id: string
          status?: string
          target_capacity: number
          target_plan: string
          target_price: number
          tolerance_limit: number
          verified_count: number
        }
        Update: {
          amount_due?: number
          billing_cycle?: string
          cancelled_reason?: string | null
          created_at?: string
          currency?: string
          current_capacity?: number
          current_plan?: string
          current_price?: number
          dispute_reason?: string | null
          dispute_resolution?: string | null
          dispute_resolved_at?: string | null
          dispute_resolved_by?: string | null
          disputed_at?: string | null
          due_at?: string
          formula?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          org_type?: string
          organization_id?: string
          paid_at?: string | null
          period_days?: number
          period_end?: string
          period_start?: string
          reference?: string
          remaining_days?: number
          snapshot?: Json
          source_payment_id?: string
          status?: string
          target_capacity?: number
          target_plan?: string
          target_price?: number
          tolerance_limit?: number
          verified_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "topup_quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topup_quotes_source_payment_id_fkey"
            columns: ["source_payment_id"]
            isOneToOne: false
            referencedRelation: "processed_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      training_enrolments: {
        Row: {
          batch_group_id: string
          enrolled_at: string
          id: string
          learner_id: string
          organization_id: string
          status: string
          training_programme_id: string
          updated_at: string
        }
        Insert: {
          batch_group_id: string
          enrolled_at?: string
          id?: string
          learner_id: string
          organization_id: string
          status?: string
          training_programme_id: string
          updated_at?: string
        }
        Update: {
          batch_group_id?: string
          enrolled_at?: string
          id?: string
          learner_id?: string
          organization_id?: string
          status?: string
          training_programme_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_enrolments_batch_group_id_fkey"
            columns: ["batch_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrolments_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrolments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrolments_training_programme_id_fkey"
            columns: ["training_programme_id"]
            isOneToOne: false
            referencedRelation: "training_programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          sequence: number
          template_id: string | null
          trainer_id: string | null
          training_programme_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          sequence?: number
          template_id?: string | null
          trainer_id?: string | null
          training_programme_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          sequence?: number
          template_id?: string | null
          trainer_id?: string | null
          training_programme_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_modules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "assessment_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_modules_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_modules_training_programme_id_fkey"
            columns: ["training_programme_id"]
            isOneToOne: false
            referencedRelation: "training_programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programmes: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          duration: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_programmes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_scores: {
        Row: {
          batch_group_id: string | null
          component_id: string | null
          created_at: string
          entered_by: string | null
          id: string
          is_final: boolean
          learner_id: string
          organization_id: string
          score: number | null
          training_module_id: string
          updated_at: string
        }
        Insert: {
          batch_group_id?: string | null
          component_id?: string | null
          created_at?: string
          entered_by?: string | null
          id?: string
          is_final?: boolean
          learner_id: string
          organization_id: string
          score?: number | null
          training_module_id: string
          updated_at?: string
        }
        Update: {
          batch_group_id?: string | null
          component_id?: string | null
          created_at?: string
          entered_by?: string | null
          id?: string
          is_final?: boolean
          learner_id?: string
          organization_id?: string
          score?: number | null
          training_module_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_scores_batch_group_id_fkey"
            columns: ["batch_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_scores_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "assessment_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_scores_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_scores_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_scores_training_module_id_fkey"
            columns: ["training_module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          account_status: string
          admin_signup_notified_at: string | null
          billing_country: string | null
          billing_country_set_at: string | null
          billing_country_source: string | null
          billing_currency: string | null
          billing_cycle: string | null
          billing_profile_reason: string | null
          cancelled_at: string | null
          created_at: string
          current_term_id: string | null
          email: string
          grace_period_ends_at: string | null
          id: string
          invitation_accepted_at: string | null
          invited_by: string | null
          is_active: boolean
          is_super_admin: boolean
          last_login: string | null
          lock_reason: string | null
          locked_at: string | null
          locked_by: string | null
          name: string
          organization_id: string | null
          phone: string | null
          preferences: Json | null
          profile_pic_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          signature_name: string | null
          signature_url: string | null
          subscription_expires_at: string | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_start: string | null
          subscription_status: Database["public"]["Enums"]["sub_status"] | null
          suspended_at: string | null
          suspension_reason: string | null
          trial_end: string | null
          trial_start: string | null
          unlocked_at: string | null
          unlocked_by: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          admin_signup_notified_at?: string | null
          billing_country?: string | null
          billing_country_set_at?: string | null
          billing_country_source?: string | null
          billing_currency?: string | null
          billing_cycle?: string | null
          billing_profile_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_term_id?: string | null
          email: string
          grace_period_ends_at?: string | null
          id: string
          invitation_accepted_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          is_super_admin?: boolean
          last_login?: string | null
          lock_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          name: string
          organization_id?: string | null
          phone?: string | null
          preferences?: Json | null
          profile_pic_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          signature_name?: string | null
          signature_url?: string | null
          subscription_expires_at?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_start?: string | null
          subscription_status?: Database["public"]["Enums"]["sub_status"] | null
          suspended_at?: string | null
          suspension_reason?: string | null
          trial_end?: string | null
          trial_start?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          admin_signup_notified_at?: string | null
          billing_country?: string | null
          billing_country_set_at?: string | null
          billing_country_source?: string | null
          billing_currency?: string | null
          billing_cycle?: string | null
          billing_profile_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_term_id?: string | null
          email?: string
          grace_period_ends_at?: string | null
          id?: string
          invitation_accepted_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          is_super_admin?: boolean
          last_login?: string | null
          lock_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          name?: string
          organization_id?: string | null
          phone?: string | null
          preferences?: Json | null
          profile_pic_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          signature_name?: string | null
          signature_url?: string | null
          subscription_expires_at?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_start?: string | null
          subscription_status?: Database["public"]["Enums"]["sub_status"] | null
          suspended_at?: string | null
          suspension_reason?: string | null
          trial_end?: string | null
          trial_start?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_current_term_id_fkey"
            columns: ["current_term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_unlocked_by_fkey"
            columns: ["unlocked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      v_target_date: {
        Row: {
          max: string | null
        }
        Insert: {
          max?: string | null
        }
        Update: {
          max?: string | null
        }
        Relationships: []
      }
      weekly_school_briefs: {
        Row: {
          brief_data: Json
          created_at: string
          id: string
          organization_id: string
          week_ending: string
        }
        Insert: {
          brief_data: Json
          created_at?: string
          id?: string
          organization_id: string
          week_ending: string
        }
        Update: {
          brief_data?: Json
          created_at?: string
          id?: string
          organization_id?: string
          week_ending?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_school_briefs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount_claimed: number | null
          amount_requested: number
          bank_account_id: string
          bank_account_name_snapshot: string | null
          bank_account_number_snapshot: string | null
          bank_name_snapshot: string | null
          created_at: string
          date_paid: string | null
          date_requested: string
          date_reviewed: string | null
          id: string
          payment_reference: string | null
          payout_verified_at: string | null
          payout_verified_by: string | null
          rejection_reason: string | null
          representative_id: string
          requires_finance_approval: boolean
          reviewed_by_user_id: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
        }
        Insert: {
          amount_claimed?: number | null
          amount_requested: number
          bank_account_id: string
          bank_account_name_snapshot?: string | null
          bank_account_number_snapshot?: string | null
          bank_name_snapshot?: string | null
          created_at?: string
          date_paid?: string | null
          date_requested?: string
          date_reviewed?: string | null
          id?: string
          payment_reference?: string | null
          payout_verified_at?: string | null
          payout_verified_by?: string | null
          rejection_reason?: string | null
          representative_id: string
          requires_finance_approval?: boolean
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
        }
        Update: {
          amount_claimed?: number | null
          amount_requested?: number
          bank_account_id?: string
          bank_account_name_snapshot?: string | null
          bank_account_number_snapshot?: string | null
          bank_name_snapshot?: string | null
          created_at?: string
          date_paid?: string | null
          date_requested?: string
          date_reviewed?: string | null
          id?: string
          payment_reference?: string | null
          payout_verified_at?: string | null
          payout_verified_by?: string | null
          rejection_reason?: string | null
          representative_id?: string
          requires_finance_approval?: boolean
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      zz_anon_exec_revoked: {
        Row: {
          fn: string
          revoked_at: string
        }
        Insert: {
          fn: string
          revoked_at?: string
        }
        Update: {
          fn?: string
          revoked_at?: string
        }
        Relationships: []
      }
      zz_results_hotfix_backup_20261019: {
        Row: {
          def: string | null
          identity_args: string | null
          proname: string | null
          saved_at: string | null
        }
        Insert: {
          def?: string | null
          identity_args?: string | null
          proname?: string | null
          saved_at?: string | null
        }
        Update: {
          def?: string | null
          identity_args?: string | null
          proname?: string | null
          saved_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      active_subscriptions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string | null
          paid_at: string | null
          plan_key: string | null
          status: string | null
          tx_ref: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          paid_at?: string | null
          plan_key?: string | null
          status?: string | null
          tx_ref?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          paid_at?: string | null
          plan_key?: string | null
          status?: string | null
          tx_ref?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_balances: {
        Row: {
          credit_balance: number | null
          learner_id: string | null
          organization_id: string | null
          student_fee_account_id: string | null
        }
        Insert: {
          credit_balance?: never
          learner_id?: string | null
          organization_id?: string | null
          student_fee_account_id?: string | null
        }
        Update: {
          credit_balance?: never
          learner_id?: string | null
          organization_id?: string | null
          student_fee_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_fee_accounts_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_representative_verification: {
        Row: {
          full_name: string | null
          level: Database["public"]["Enums"]["representative_level"] | null
          photo_status: string | null
          referral_code: string | null
          status: Database["public"]["Enums"]["representative_status"] | null
        }
        Insert: {
          full_name?: string | null
          level?: Database["public"]["Enums"]["representative_level"] | null
          photo_status?: string | null
          referral_code?: string | null
          status?: Database["public"]["Enums"]["representative_status"] | null
        }
        Update: {
          full_name?: string | null
          level?: Database["public"]["Enums"]["representative_level"] | null
          photo_status?: string | null
          referral_code?: string | null
          status?: Database["public"]["Enums"]["representative_status"] | null
        }
        Relationships: []
      }
      v_group_pins: {
        Row: {
          admission_number: string | null
          created_at: string | null
          first_name: string | null
          group_id: string | null
          last_name: string | null
          learner_id: string | null
          pin: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learner_pins_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_pins_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      v_group_statistics: {
        Row: {
          class_average: number | null
          group_id: string | null
          highest_score: number | null
          lowest_score: number | null
          pass_rate: number | null
          total_students: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      v_learner_group_totals: {
        Row: {
          grand_total: number | null
          group_id: string | null
          learner_id: string | null
          max_possible: number | null
          overall_percentage: number | null
          subject_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      v_learner_subject_totals: {
        Row: {
          components_entered: number | null
          components_total: number | null
          group_id: string | null
          learner_id: string | null
          max_possible: number | null
          percentage: number | null
          subject_id: string | null
          subject_name: string | null
          total_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _compute_onboarding_status: {
        Args: { p_learner_id: string }
        Returns: Json
      }
      _current_paid_period: { Args: { p_org_id: string }; Returns: Json }
      _derive_grade_outcome: {
        Args: {
          p_grade_letter: string
          p_grade_point: number
          p_org_id: string
          p_term_id: string
        }
        Returns: Record<string, unknown>
      }
      _edux_request_role: { Args: never; Returns: string }
      _entitlement_decision: {
        Args: { p_feature: string; p_org_id: string }
        Returns: Json
      }
      _issue_topup: {
        Args: { p_issued_by: string; p_org_id: string }
        Returns: Json
      }
      _learner_billing_classification: {
        Args: { p_org_id: string }
        Returns: {
          adm_key: string
          admission_number: string
          bucket: string
          date_of_birth: string
          first_name: string
          last_name: string
          learner_id: string
        }[]
      }
      _registration_is_protected: {
        Args: { p_org_id: string; p_subject_id: string; p_term_id: string }
        Returns: boolean
      }
      _resolve_grade_for_total: {
        Args: { p_org_id: string; p_term_id: string; p_total: number }
        Returns: Record<string, unknown>
      }
      _tertiary_attempt_authority: {
        Args: { p_level: string; p_org: string }
        Returns: boolean
      }
      _tertiary_entitlement_core: { Args: { p_org_id: string }; Returns: Json }
      _tertiary_graduation_blockers: {
        Args: { p_bundle: Json }
        Returns: string[]
      }
      _tertiary_parent_results_enabled: {
        Args: { p_org_id: string }
        Returns: boolean
      }
      _tertiary_result_scope: {
        Args: { p_admin_only?: boolean; p_learner_id: string }
        Returns: string
      }
      _tertiary_results_bundle: {
        Args: { p_learner_id: string }
        Returns: Json
      }
      _tertiary_scale_in_use: {
        Args: {
          p_org_id: string
          p_scale_active: boolean
          p_scale_type: string
        }
        Returns: boolean
      }
      _tertiary_transcript_authority: {
        Args: { p_kind: string; p_org: string }
        Returns: boolean
      }
      accept_founding_agreement: {
        Args: { p_application_id: string }
        Returns: undefined
      }
      accept_representative_agreement: {
        Args: { p_ip: string; p_user_agent: string; p_version: number }
        Returns: undefined
      }
      activate_learner_account: {
        Args: {
          p_admission_number: string
          p_new_email: string
          p_new_password: string
          p_organization_id: string
          p_token: string
        }
        Returns: Json
      }
      activate_organization_domain: {
        Args: { p_domain_id: string }
        Returns: {
          activated_at: string | null
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          domain_type: Database["public"]["Enums"]["domain_type"]
          hostname: string
          id: string
          is_primary: boolean
          organization_id: string
          ssl_provisioned_at: string | null
          ssl_status: string
          updated_at: string
          verification_attempted_at: string | null
          verification_method: string
          verification_status: Database["public"]["Enums"]["domain_verification_status"]
          verification_token: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organization_domains"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_organization_domain: {
        Args: {
          p_domain_type: Database["public"]["Enums"]["domain_type"]
          p_hostname: string
        }
        Returns: {
          activated_at: string | null
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          domain_type: Database["public"]["Enums"]["domain_type"]
          hostname: string
          id: string
          is_primary: boolean
          organization_id: string
          ssl_provisioned_at: string | null
          ssl_status: string
          updated_at: string
          verification_attempted_at: string | null
          verification_method: string
          verification_status: Database["public"]["Enums"]["domain_verification_status"]
          verification_token: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organization_domains"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      advance_result_stage: {
        Args: { p_action: string; p_reason?: string; p_submission_id: string }
        Returns: Json
      }
      allocate_payment_fifo: {
        Args: { p_payment_id: string }
        Returns: undefined
      }
      apply_min_invoice: {
        Args: { p_amount: number; p_currency: string }
        Returns: Json
      }
      approve_commission: {
        Args: { p_commission_id: string }
        Returns: undefined
      }
      approve_tertiary_graduation: {
        Args: {
          p_classification?: string
          p_graduation_session_id: string
          p_learner_id: string
          p_override_reason?: string
        }
        Returns: Json
      }
      approve_withdrawal: {
        Args: { p_withdrawal_id: string }
        Returns: undefined
      }
      assert_entitlement: {
        Args: { p_feature: string; p_org_id: string }
        Returns: undefined
      }
      assert_org_type_verified: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      assign_group_pins: {
        Args: { group_id: string; pin_length?: number }
        Returns: undefined
      }
      assign_subject_to_curriculum: {
        Args: { p_curriculum_id: string; p_subject_id: string }
        Returns: undefined
      }
      auto_close_resolved_tickets: { Args: never; Returns: undefined }
      billing_resolve_payment: {
        Args: {
          p_create_commission?: boolean
          p_decision: string
          p_evidence_ref?: string
          p_note: string
          p_payment_id: string
        }
        Returns: Json
      }
      billing_review_payment: {
        Args: { p_note: string; p_payment_id: string; p_recommendation: string }
        Returns: undefined
      }
      bind_term_grading_scale: {
        Args: { p_config_id?: string; p_term_id: string }
        Returns: Json
      }
      bulk_generate_activation_tokens: {
        Args: { p_expires_in_hours?: number; p_group_id: string }
        Returns: {
          expires_at: string
          learner_id: string
          skipped_reason: string
          token: string
        }[]
      }
      bulk_issue_invoices: {
        Args: {
          p_actor_id: string
          p_fee_structure_id: string
          p_group_id: string
          p_org_id: string
          p_override?: boolean
        }
        Returns: {
          failed: number
          failed_details: Json
          invoices_created: number
          skipped: number
        }[]
      }
      bulk_register_cohort_courses: {
        Args: { p_group_id: string; p_subject_ids: string[] }
        Returns: {
          already_registered: number
          failed: number
          failed_details: Json
          registrations_created: number
          students_processed: number
        }[]
      }
      bulk_upload_students: {
        Args: { p_group_id: string; p_students: Json }
        Returns: {
          failed: number
          failed_details: Json
          skipped_duplicates: number
          students_created: number
        }[]
      }
      calc_topup_amount: {
        Args: {
          p_paid: number
          p_remaining: number
          p_target: number
          p_total: number
        }
        Returns: number
      }
      calc_topup_proposal: {
        Args: { p_on?: string; p_org_id: string }
        Returns: Json
      }
      calculate_cgpa: {
        Args: { p_learner_id: string; p_published_only?: boolean }
        Returns: Json
      }
      calculate_fee_balance: { Args: { p_account_id: string }; Returns: Json }
      calculate_tax: {
        Args: {
          p_currency: string
          p_gross: number
          p_on?: string
          p_org_id: string
        }
        Returns: Json
      }
      calculate_term_gpa: {
        Args: {
          p_learner_id: string
          p_published_only?: boolean
          p_term_id: string
        }
        Returns: Json
      }
      can_manage_course_attendance: {
        Args: { p_subject_id: string }
        Returns: boolean
      }
      can_manage_training_batches: {
        Args: { p_org_id: string }
        Returns: boolean
      }
      can_mark_attendance: { Args: { p_group_id: string }; Returns: boolean }
      can_view_course_attendance: {
        Args: { p_subject_id: string }
        Returns: boolean
      }
      cancel_centre_payment_quote: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      cancel_k12_payment_quote: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      cancel_tertiary_payment_quote: {
        Args: { p_quote_id: string }
        Returns: undefined
      }
      cancel_tertiary_transcript_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      cancel_topup_quote: {
        Args: { p_quote_id: string; p_reason: string }
        Returns: undefined
      }
      check_duplicate_admission_numbers: {
        Args: { p_admission_numbers: string[]; p_org_id: string }
        Returns: {
          admission_number: string
        }[]
      }
      close_founding_application: {
        Args: { p_application_id: string; p_outcome: string; p_reason: string }
        Returns: undefined
      }
      close_session: { Args: { p_session_id: string }; Returns: Json }
      close_term: {
        Args: { p_force?: boolean; p_term_id: string }
        Returns: Json
      }
      complete_founding_application_pilot: {
        Args: { p_application_id: string; p_notes?: string }
        Returns: undefined
      }
      complete_learner_activation: {
        Args: { p_auth_user_id: string; p_learner_id: string }
        Returns: undefined
      }
      compute_monthly_representative_recognitions: {
        Args: { p_month?: string }
        Returns: Json
      }
      compute_representative_leaderboard_snapshot: {
        Args: { p_snapshot_date?: string }
        Returns: Json
      }
      configure_onboarding_requirements: {
        Args: { p_requirements: Json }
        Returns: Json
      }
      confirm_centre_payment: {
        Args: {
          p_amount: number
          p_currency: string
          p_gateway_reference: string
          p_org_id: string
          p_provider: string
          p_quote_reference: string
        }
        Returns: Json
      }
      confirm_k12_payment: {
        Args: {
          p_amount: number
          p_currency: string
          p_gateway_reference: string
          p_org_id: string
          p_provider: string
          p_quote_reference: string
        }
        Returns: Json
      }
      confirm_module_completion: {
        Args: { p_action: string; p_completion_id: string; p_reason?: string }
        Returns: Json
      }
      confirm_new_academic_structures: {
        Args: { p_batch_id: string; p_structure_ids: string[] }
        Returns: Json
      }
      confirm_solo_payment: {
        Args: {
          p_account_type?: string
          p_amount: number
          p_currency: string
          p_cycle: string
          p_payer_country?: string
          p_plan: string
          p_provider: string
          p_reference: string
          p_user_id: string
        }
        Returns: Json
      }
      confirm_tertiary_payment: {
        Args: {
          p_amount: number
          p_currency: string
          p_gateway_reference: string
          p_org_id: string
          p_provider: string
          p_quote_reference: string
        }
        Returns: Json
      }
      confirm_topup_payment: {
        Args: {
          p_amount: number
          p_currency: string
          p_gateway_reference: string
          p_org_id: string
          p_provider: string
          p_quote_reference: string
        }
        Returns: Json
      }
      convert_founding_application: {
        Args: { p_application_id: string; p_notes?: string }
        Returns: Json
      }
      correct_founding_agreement: {
        Args: {
          p_application_id: string
          p_currency: string
          p_price: number
          p_reason: string
          p_tier_key: string
        }
        Returns: undefined
      }
      correct_promotion_decision: {
        Args: {
          p_corrected_by: string
          p_learner_id: string
          p_new_status: string
          p_note: string
          p_org_id: string
          p_to_class_id: string
        }
        Returns: Json
      }
      create_admission_import_batch: {
        Args: never
        Returns: {
          completed_at: string | null
          created_at: string
          id: string
          organization_id: string
          status: string
          uploaded_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "admission_import_batches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_centre_payment_quote: {
        Args: {
          p_cycle: string
          p_org_id: string
          p_plan: string
          p_reference: string
        }
        Returns: Json
      }
      create_commission_adjustment: {
        Args: { p_amount: number; p_commission_id: string; p_reason: string }
        Returns: string
      }
      create_curriculum: {
        Args: {
          p_level: string
          p_programme_id: string
          p_semester?: string
          p_version_year: number
        }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          level: string
          organization_id: string
          programme_id: string
          semester: string | null
          version_year: number
        }
        SetofOptions: {
          from: "*"
          to: "curricula"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_default_grading: { Args: { p_org_id: string }; Returns: undefined }
      create_elective_group: {
        Args: {
          p_choose_count?: number
          p_choose_credit_units?: number
          p_curriculum_id: string
          p_name: string
          p_subject_ids?: string[]
        }
        Returns: {
          choose_count: number | null
          choose_credit_units: number | null
          curriculum_id: string
          id: string
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "elective_groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_founding_conversion_quote: {
        Args: { p_application_id: string; p_reference: string }
        Returns: Json
      }
      create_gateway_test_run: {
        Args: {
          p_amount: number
          p_currency: string
          p_gateway: string
          p_reference: string
        }
        Returns: Json
      }
      create_k12_payment_quote: {
        Args: {
          p_cycle: string
          p_org_id: string
          p_plan: string
          p_reference: string
        }
        Returns: Json
      }
      create_notification: {
        Args: {
          p_body: string
          p_metadata?: Json
          p_org_id: string
          p_recipient_id: string
          p_recipient_learner_id?: string
          p_title: string
        }
        Returns: string
      }
      create_school_escalation: {
        Args: {
          p_attachment_url?: string
          p_description: string
          p_issue_type: Database["public"]["Enums"]["escalation_issue_type"]
          p_organization_id: string
          p_priority: Database["public"]["Enums"]["ticket_priority"]
          p_title: string
        }
        Returns: string
      }
      create_tertiary_course: {
        Args: { p_code: string; p_department_id?: string; p_title: string }
        Returns: string
      }
      create_tertiary_grading: {
        Args: { p_org_id: string; p_scale?: string }
        Returns: undefined
      }
      create_tertiary_payment_quote: {
        Args: { p_org_id: string; p_reference: string }
        Returns: Json
      }
      deactivate_organization_domain: {
        Args: { p_domain_id: string }
        Returns: {
          activated_at: string | null
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          domain_type: Database["public"]["Enums"]["domain_type"]
          hostname: string
          id: string
          is_primary: boolean
          organization_id: string
          ssl_provisioned_at: string | null
          ssl_status: string
          updated_at: string
          verification_attempted_at: string | null
          verification_method: string
          verification_status: Database["public"]["Enums"]["domain_verification_status"]
          verification_token: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organization_domains"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_organization_domain: {
        Args: { p_domain_id: string }
        Returns: undefined
      }
      dismiss_onboarding_guide: {
        Args: never
        Returns: {
          created_at: string | null
          dismissed_at: string | null
          guide_started_at: string | null
          id: string
          last_step_viewed: string | null
          organization_id: string | null
          updated_at: string | null
          user_id: string
          welcome_seen_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "onboarding_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dispute_topup_quote: {
        Args: { p_quote_id: string; p_reason: string }
        Returns: undefined
      }
      disqualify_referral: {
        Args: { p_reason: string; p_referral_id: string }
        Returns: undefined
      }
      e2e_count_live_signup_notifications: {
        Args: { p_ids: string[] }
        Returns: number
      }
      e2e_preclaim_signup_notifications: {
        Args: { p_ids: string[] }
        Returns: undefined
      }
      early_release_commission: {
        Args: {
          p_commission_id: string
          p_ip_address?: string
          p_reason: string
        }
        Returns: undefined
      }
      enqueue_signup_notification: {
        Args: { p_entity_id: string; p_payload: Json; p_signup_type: string }
        Returns: undefined
      }
      enroll_founding_500: {
        Args: {
          p_amount_paid: number
          p_org_id: string
          p_payment_reference: string
          p_provider: string
          p_referral_code: string
        }
        Returns: Json
      }
      entitlement_allows: {
        Args: { p_feature: string; p_org_id: string }
        Returns: boolean
      }
      execute_admission_import: { Args: { p_batch_id: string }; Returns: Json }
      expire_founding_500_entitlements: { Args: never; Returns: undefined }
      expire_founding_500_grace_periods: { Args: never; Returns: undefined }
      extend_founding_application_pilot: {
        Args: { p_application_id: string; p_new_end: string; p_reason: string }
        Returns: Json
      }
      fee_currency_allowed: {
        Args: { p_currency: string; p_org_id: string }
        Returns: boolean
      }
      generate_learner_activation_token: {
        Args: { p_expires_in_hours?: number; p_learner_id: string }
        Returns: Json
      }
      generate_referral_code: {
        Args: { p_name: string; p_state: string }
        Returns: string
      }
      generate_weekly_school_brief: {
        Args: { p_org_id: string; p_week_ending?: string }
        Returns: Json
      }
      get_active_tertiary_scale: { Args: { p_org_id: string }; Returns: Json }
      get_admission_import_summary: {
        Args: { p_batch_id: string }
        Returns: Json
      }
      get_all_representative_portfolios_overview: { Args: never; Returns: Json }
      get_all_representatives_management_summary: { Args: never; Returns: Json }
      get_all_school_portfolios: { Args: never; Returns: Json }
      get_attendance_alerts: { Args: { p_org_id: string }; Returns: Json }
      get_attendance_report_data: {
        Args: {
          p_end_date: string
          p_group_id: string
          p_learner_id?: string
          p_start_date: string
          p_term_id: string
        }
        Returns: Json
      }
      get_available_gateways: {
        Args: { p_currency: string; p_scope?: string }
        Returns: Json
      }
      get_billable_student_summary: {
        Args: { p_org_id: string }
        Returns: Json
      }
      get_billing_ops_list: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: Json
      }
      get_billing_ops_org: { Args: { p_org_id: string }; Returns: Json }
      get_billing_wizard_state: { Args: { p_org_id: string }; Returns: Json }
      get_capacity_status: { Args: { p_org_id: string }; Returns: Json }
      get_class_health: {
        Args: { p_org_id: string; p_term_id?: string }
        Returns: Json
      }
      get_course_attendance_report: {
        Args: {
          p_from?: string
          p_subject_id: string
          p_term_id: string
          p_to?: string
        }
        Returns: Json
      }
      get_course_attendance_roster: {
        Args: { p_session_id: string }
        Returns: Json
      }
      get_curriculum_detail: {
        Args: { p_curriculum_id: string }
        Returns: Json
      }
      get_defaulters_by_class: {
        Args: { p_org_id: string; p_term_id?: string }
        Returns: Json
      }
      get_defaulters_in_class: {
        Args: { p_group_id: string; p_term_id?: string }
        Returns: Json
      }
      get_domain_verification_target: {
        Args: { p_domain_id: string }
        Returns: Json
      }
      get_domains_pending_ssl: {
        Args: never
        Returns: {
          domain_type: Database["public"]["Enums"]["domain_type"]
          hostname: string
          id: string
          org_name: string
          organization_id: string
          ssl_status: string
          verified_at: string
        }[]
      }
      get_executive_overview: { Args: { p_org_id: string }; Returns: Json }
      get_gateway_countries: { Args: never; Returns: Json }
      get_gateway_test_runs: { Args: never; Returns: Json }
      get_grade_outcome_review: {
        Args: { p_org_id: string; p_term_id?: string }
        Returns: {
          grade_letter: string
          grade_outcome: string
          grade_point: number
          learner_id: string
          live_status: string
          registration_id: string
          review_state: string
          snapshot_protected: boolean
          snapshot_status: string
          subject_id: string
          term_id: string
        }[]
      }
      get_leaderboard: { Args: { p_limit?: number }; Returns: Json }
      get_leaderboard_admin: { Args: { p_period?: string }; Returns: Json }
      get_leaderboard_category: {
        Args: {
          p_category: string
          p_end: string
          p_limit?: number
          p_start: string
        }
        Returns: Json
      }
      get_leaderboard_falling: {
        Args: { p_days?: number; p_limit?: number }
        Returns: Json
      }
      get_leaderboard_rising: {
        Args: { p_days?: number; p_limit?: number }
        Returns: Json
      }
      get_my_assigned_class_ids: { Args: never; Returns: string[] }
      get_my_assigned_subject_ids: { Args: never; Returns: string[] }
      get_my_attendance_courses: { Args: never; Returns: Json }
      get_my_founding_application: { Args: never; Returns: Json }
      get_my_leaderboard_summary: { Args: never; Returns: Json }
      get_my_learner_id: { Args: never; Returns: string }
      get_my_linked_group_ids: { Args: never; Returns: string[] }
      get_my_linked_historical_class_ids: { Args: never; Returns: string[] }
      get_my_linked_learner_ids: { Args: never; Returns: string[] }
      get_my_linked_tertiary_bundles: { Args: never; Returns: Json }
      get_my_linked_tertiary_results: { Args: never; Returns: Json }
      get_my_org_id: { Args: never; Returns: string }
      get_my_owned_group_ids: { Args: never; Returns: string[] }
      get_my_parent_account_id: { Args: never; Returns: string }
      get_my_receipts: { Args: never; Returns: Json }
      get_my_representative_id: { Args: never; Returns: string }
      get_my_representative_portfolio_summary: { Args: never; Returns: Json }
      get_my_review_queue: {
        Args: never
        Returns: {
          action: string
          cohort_name: string
          credit_unit: number
          department_name: string
          faculty_name: string
          lecturer_name: string
          status: string
          student_count: number
          subject_code: string
          subject_id: string
          subject_name: string
          submission_id: string
          submitted_at: string
        }[]
      }
      get_my_role: { Args: never; Returns: string }
      get_my_taught_group_ids: { Args: never; Returns: string[] }
      get_my_tertiary_academic_record: { Args: never; Returns: Json }
      get_my_tertiary_results_bundle: { Args: never; Returns: Json }
      get_my_transcript_requests: { Args: never; Returns: Json }
      get_onboarding_dashboard: { Args: never; Returns: Json }
      get_onboarding_monitor: {
        Args: {
          p_department_id?: string
          p_level?: string
          p_programme_id?: string
          p_session_id?: string
        }
        Returns: Json
      }
      get_org_course_attendance_summary: {
        Args: { p_term_id?: string }
        Returns: Json
      }
      get_org_entitlement: { Args: { p_org_id: string }; Returns: Json }
      get_org_topups: { Args: { p_org_id: string }; Returns: Json }
      get_organization_delete_dependencies: {
        Args: { p_org_id: string }
        Returns: Json
      }
      get_pending_tertiary_quote: { Args: { p_org_id: string }; Returns: Json }
      get_plan_options_for_org: { Args: { p_org_id: string }; Returns: Json }
      get_platform_founding500_analytics: { Args: never; Returns: Json }
      get_platform_referral_analytics: { Args: never; Returns: Json }
      get_platform_subscription_analytics: { Args: never; Returns: Json }
      get_public_campaign_status: {
        Args: { p_campaign_key: string }
        Returns: Json
      }
      get_public_tertiary_pricing: { Args: never; Returns: Json }
      get_representative_followup_performance: {
        Args: { p_representative_id: string }
        Returns: Json
      }
      get_representative_leaderboard_detail: {
        Args: { p_representative_id: string }
        Returns: Json
      }
      get_representative_leaderboard_history: {
        Args: { p_days?: number; p_representative_id: string }
        Returns: Json
      }
      get_representative_portfolio_admin: {
        Args: { p_representative_id: string }
        Returns: Json
      }
      get_school_activity_timeline: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_school_portfolio_history: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_setup_progress: { Args: { p_org_id: string }; Returns: Json }
      get_solo_plan_options: { Args: { p_user_id?: string }; Returns: Json }
      get_solo_review_queue: { Args: never; Returns: Json }
      get_solo_setup_progress: { Args: { p_user_id: string }; Returns: Json }
      get_student_attendance_report: {
        Args: { p_learner_id?: string; p_term_id?: string }
        Returns: Json
      }
      get_student_curriculum: {
        Args: { p_learner_id: string }
        Returns: string
      }
      get_student_distribution: { Args: { p_org_id: string }; Returns: Json }
      get_student_movement: { Args: { p_org_id: string }; Returns: Json }
      get_student_onboarding_status: {
        Args: { p_learner_id: string }
        Returns: Json
      }
      get_student_registration_options: {
        Args: { p_learner_id: string }
        Returns: Json
      }
      get_submission_score_detail: {
        Args: { p_submission_id: string }
        Returns: Json
      }
      get_tax_settings: { Args: never; Returns: Json }
      get_tertiary_academic_record_for: {
        Args: { p_learner_id: string }
        Returns: Json
      }
      get_tertiary_attempt_history: {
        Args: { p_learner_id: string }
        Returns: Json
      }
      get_tertiary_billing_estimate: {
        Args: { p_org_id: string }
        Returns: Json
      }
      get_tertiary_entitlement: { Args: { p_org_id: string }; Returns: Json }
      get_tertiary_graduation_overview: {
        Args: { p_limit?: number; p_search?: string }
        Returns: Json
      }
      get_tertiary_plan_options: { Args: { p_org_id: string }; Returns: Json }
      get_tertiary_results_bundle_for: {
        Args: { p_learner_id: string }
        Returns: Json
      }
      get_tertiary_setup_gaps: { Args: { p_org_id: string }; Returns: Json }
      get_tertiary_transcript_issue: {
        Args: { p_issue_id: string }
        Returns: Json
      }
      get_topup_overview: { Args: never; Returns: Json }
      get_type_verification_queue: {
        Args: { p_status?: string }
        Returns: Json
      }
      get_unassigned_schools: { Args: never; Returns: Json }
      get_unassigned_schools_count: { Args: never; Returns: number }
      group_belongs_to_org: {
        Args: { p_group_id: string; p_org_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { p_permission_key: string; p_user_id: string }
        Returns: boolean
      }
      has_platform_permission: {
        Args: { p_permission_key: string; p_user_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_linked_via_parent: {
        Args: { p_parent_id: string }
        Returns: boolean
      }
      is_admin_of_fee_account: {
        Args: { p_account_id: string }
        Returns: boolean
      }
      is_admin_of_fee_payment: {
        Args: { p_payment_id: string }
        Returns: boolean
      }
      is_admin_of_learner_org: {
        Args: { p_learner_id: string }
        Returns: boolean
      }
      is_admin_of_role_org: { Args: { p_role_id: string }; Returns: boolean }
      is_linked_parent_of_fee_account: {
        Args: { p_account_id: string }
        Returns: boolean
      }
      is_my_attributed_school: { Args: { p_org_id: string }; Returns: boolean }
      is_solo_teacher: { Args: { p_user_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      issue_due_topup_quotes: { Args: never; Returns: number }
      issue_tertiary_transcript: {
        Args: {
          p_override_reason?: string
          p_request_id: string
          p_student_may_download?: boolean
        }
        Returns: Json
      }
      issue_topup_quote: { Args: { p_org_id: string }; Returns: Json }
      k12_period_is_paid: {
        Args: { p_end: string; p_org: string; p_plan: string; p_start: string }
        Returns: boolean
      }
      k12_plan_options: {
        Args: {
          p_allowed_plans?: string[]
          p_class_count?: number
          p_currency?: string
          p_student_count: number
          p_teacher_count?: number
        }
        Returns: Json
      }
      link_centre_pilot_organization: {
        Args: { p_application_id: string; p_org_id: string }
        Returns: Json
      }
      link_founding_application_organization: {
        Args: { p_application_id: string; p_org_id: string }
        Returns: Json
      }
      link_or_create_parent: {
        Args: {
          p_email: string
          p_full_name: string
          p_learner_id: string
          p_phone: string
        }
        Returns: string
      }
      list_payment_reconciliation: {
        Args: { p_status?: string }
        Returns: Json
      }
      list_tertiary_transcript_issues: { Args: never; Returns: Json }
      list_tertiary_transcript_requests: {
        Args: { p_status?: string }
        Returns: Json
      }
      log_academic_action: {
        Args: {
          p_action: string
          p_department_id?: string
          p_learner_id?: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id: string
          p_table_name: string
        }
        Returns: undefined
      }
      log_finance_action: {
        Args: {
          p_action: string
          p_actor_id: string
          p_after_value: Json
          p_before_value: Json
          p_ip_address: string
          p_is_system_generated: boolean
          p_org_id: string
          p_reason: string
          p_system_job_name: string
          p_target_id: string
          p_target_type: string
        }
        Returns: undefined
      }
      log_platform_action: {
        Args: {
          p_action: string
          p_actor_id: string
          p_metadata?: Json
          p_reason?: string
          p_target_id: string
          p_target_type: string
        }
        Returns: undefined
      }
      log_representative_follow_up: {
        Args: {
          p_action_taken: string
          p_challenge_issue: string
          p_contact_date: string
          p_contact_method: Database["public"]["Enums"]["follow_up_contact_method"]
          p_follow_up_required: boolean
          p_next_follow_up_date: string
          p_notes: string
          p_organization_id: string
          p_reason: string
          p_school_reported: string
        }
        Returns: string
      }
      log_school_profile_view: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      lookup_auth_user_id: { Args: { p_email: string }; Returns: string }
      mark_domain_ssl_active_manually: {
        Args: { p_domain_id: string }
        Returns: {
          activated_at: string | null
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          domain_type: Database["public"]["Enums"]["domain_type"]
          hostname: string
          id: string
          is_primary: boolean
          organization_id: string
          ssl_provisioned_at: string | null
          ssl_status: string
          updated_at: string
          verification_attempted_at: string | null
          verification_method: string
          verification_status: Database["public"]["Enums"]["domain_verification_status"]
          verification_token: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organization_domains"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_domain_verified: {
        Args: { p_domain_id: string; p_presented_token: string }
        Returns: {
          activated_at: string | null
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          domain_type: Database["public"]["Enums"]["domain_type"]
          hostname: string
          id: string
          is_primary: boolean
          organization_id: string
          ssl_provisioned_at: string | null
          ssl_status: string
          updated_at: string
          verification_attempted_at: string | null
          verification_method: string
          verification_status: Database["public"]["Enums"]["domain_verification_status"]
          verification_token: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organization_domains"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_onboarding_step_viewed: {
        Args: { p_step_key: string }
        Returns: {
          created_at: string | null
          dismissed_at: string | null
          guide_started_at: string | null
          id: string
          last_step_viewed: string | null
          organization_id: string | null
          updated_at: string | null
          user_id: string
          welcome_seen_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "onboarding_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_withdrawal_failed: {
        Args: { p_reason: string; p_withdrawal_id: string }
        Returns: undefined
      }
      mark_withdrawal_paid: {
        Args: { p_payment_reference: string; p_withdrawal_id: string }
        Returns: undefined
      }
      migrate_org_to_new_ledger: {
        Args: { p_org_id: string }
        Returns: {
          accounts_processed: number
          adjustments_migrated: number
          allocations_created: number
          invoices_created: number
          line_items_created: number
          payments_migrated: number
        }[]
      }
      my_org_id: { Args: never; Returns: string }
      open_course_attendance_session: {
        Args: {
          p_date: string
          p_lecture_no?: number
          p_subject_id: string
          p_term_id: string
          p_topic?: string
        }
        Returns: Json
      }
      org_has_feature: {
        Args: { p_feature_key: string; p_org_id: string }
        Returns: boolean
      }
      org_has_locked_tertiary_results: {
        Args: { p_org_id: string }
        Returns: boolean
      }
      org_has_tertiary_capability: {
        Args: {
          p_capability_key: string
          p_default_if_unset?: boolean
          p_org_id: string
        }
        Returns: boolean
      }
      org_is_centre: { Args: { p_org_id: string }; Returns: boolean }
      org_plan_eligibility: {
        Args: { p_org_id: string; p_plan: string }
        Returns: boolean
      }
      org_type_is_verified: { Args: { p_org_id: string }; Returns: boolean }
      organization_type_is_locked: {
        Args: { p_org_id: string }
        Returns: boolean
      }
      plan_rank: { Args: { p_plan: string }; Returns: number }
      process_push_receipts: { Args: never; Returns: undefined }
      process_push_send_responses: { Args: never; Returns: undefined }
      publish_course_result: {
        Args: { p_submission_id: string }
        Returns: undefined
      }
      purge_old_push_tickets: { Args: never; Returns: undefined }
      qualify_founding_application: {
        Args: { p_application_id: string; p_reason?: string }
        Returns: Json
      }
      qualify_referral: { Args: { p_referral_id: string }; Returns: undefined }
      reassign_school_portfolio: {
        Args: {
          p_new_representative_id: string
          p_organization_id: string
          p_reason: string
        }
        Returns: string
      }
      record_commission: {
        Args: {
          p_amount: number
          p_amount_paid?: number
          p_campaign_key?: string
          p_plan: string
          p_referral_id: string
          p_source_payment_id?: string
          p_source_type?: string
        }
        Returns: string
      }
      record_course_attendance: {
        Args: { p_entries: Json; p_session_id: string }
        Returns: Json
      }
      record_gateway_test_result: {
        Args: {
          p_channel: string
          p_from_webhook: boolean
          p_gateway_status: string
          p_payer_country: string
          p_reference: string
          p_verified_amount: number
          p_verified_currency: string
        }
        Returns: Json
      }
      record_login_attempt: {
        Args: {
          p_ip: string
          p_success: boolean
          p_user_agent: string
          p_user_id: string
        }
        Returns: undefined
      }
      record_tertiary_export: {
        Args: { p_details?: Json; p_kind: string; p_learner_id: string }
        Returns: string
      }
      refresh_programme_completion: {
        Args: { p_learner_id: string; p_training_programme_id: string }
        Returns: undefined
      }
      register_attempt: {
        Args: {
          p_kind: string
          p_learner_id: string
          p_prior_registration_id: string
          p_subject_id: string
        }
        Returns: string
      }
      register_student_courses: {
        Args: { p_learner_id: string; p_subject_ids: string[] }
        Returns: Json
      }
      reject_founding_application: {
        Args: { p_application_id: string; p_reason: string }
        Returns: undefined
      }
      reject_tertiary_transcript_request: {
        Args: { p_reason: string; p_request_id: string }
        Returns: Json
      }
      reject_withdrawal: {
        Args: { p_reason: string; p_withdrawal_id: string }
        Returns: undefined
      }
      release_matured_commissions: { Args: never; Returns: undefined }
      reopen_term: {
        Args: { p_reason: string; p_term_id: string }
        Returns: undefined
      }
      request_push_receipts: { Args: never; Returns: undefined }
      request_result_correction: {
        Args: {
          p_component_corrections: Json
          p_evidence_url?: string
          p_learner_id: string
          p_reason: string
          p_subject_id: string
        }
        Returns: string
      }
      request_tertiary_transcript: {
        Args: { p_purpose: string; p_recipient?: string }
        Returns: string
      }
      request_withdrawal: {
        Args: { p_amount: number; p_bank_account_id: string }
        Returns: string
      }
      reset_learner_pin: {
        Args: { learner_id: string; pin_length?: number }
        Returns: string
      }
      resolve_fee_currency: { Args: { p_org_id: string }; Returns: string }
      resolve_org_billing: { Args: { p_org_id: string }; Returns: Json }
      resolve_organization_by_hostname: {
        Args: { p_hostname: string }
        Returns: {
          colors: Json
          is_primary: boolean
          logo_url: string
          org_name: string
          org_type: Database["public"]["Enums"]["org_type"]
          organization_id: string
        }[]
      }
      resolve_solo_payment_review: {
        Args: {
          p_decision: string
          p_evidence_ref: string
          p_note: string
          p_payment_id: string
        }
        Returns: Json
      }
      resolve_topup_dispute: {
        Args: { p_decision: string; p_note: string; p_quote_id: string }
        Returns: Json
      }
      resolve_user_billing: { Args: { p_user_id: string }; Returns: Json }
      retire_tertiary_course: {
        Args: { p_course_id: string; p_reason: string }
        Returns: Json
      }
      retry_failed_signup_notifications: { Args: never; Returns: undefined }
      retry_failed_withdrawal: {
        Args: { p_withdrawal_id: string }
        Returns: undefined
      }
      reverse_commission_for_payment: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: Json
      }
      review_correction_request: {
        Args: { p_action: string; p_notes?: string; p_request_id: string }
        Returns: Json
      }
      review_representative_passport: {
        Args: { p_approve: boolean; p_reason?: string; p_rep_id: string }
        Returns: undefined
      }
      revoke_course_equivalency: {
        Args: { p_equivalency_id: string; p_reason: string }
        Returns: Json
      }
      revoke_learner_activation_token: {
        Args: { p_learner_id: string; p_reason?: string }
        Returns: undefined
      }
      revoke_tertiary_graduation: {
        Args: { p_learner_id: string; p_reason: string }
        Returns: Json
      }
      revoke_tertiary_transcript: {
        Args: { p_issue_id: string; p_reason: string }
        Returns: Json
      }
      run_domain_security_tests: {
        Args: never
        Returns: {
          actual: string | null
          description: string
          detail: string | null
          expected: string
          id: string
          passed: boolean | null
          run_at: string
          test_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "domain_security_tests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      run_promotion:
        | {
            Args: {
              p_confirmed_moves: Json
              p_org_id: string
              p_session_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_confirmed_moves: Json
              p_from_group_id: string
              p_org_id: string
              p_report_id: string
              p_session_id: string
              p_to_group_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_confirmed_moves: Json
              p_from_group_id: string
              p_new_session_id?: string
              p_org_id: string
              p_report_id: string
              p_session_id: string
              p_to_group_id: string
            }
            Returns: Json
          }
      run_push_receipt_pipeline: { Args: never; Returns: undefined }
      run_representative_alert_checks: { Args: never; Returns: Json }
      run_token_replay_test: {
        Args: never
        Returns: {
          actual: string
          description: string
          detail: string
          expected: string
          passed: boolean
          test_id: string
        }[]
      }
      run_weekly_briefs_for_all_schools: { Args: never; Returns: Json }
      save_course_scores: {
        Args: { p_entries: Json; p_subject_id: string }
        Returns: Json
      }
      save_training_scores: {
        Args: { p_batch_group_id: string; p_entries: Json; p_module_id: string }
        Returns: Json
      }
      search_founding_link_candidates: {
        Args: { p_application_id: string; p_query?: string }
        Returns: Json
      }
      seed_default_platform_roles: {
        Args: { p_created_by: string }
        Returns: undefined
      }
      seed_default_school_roles: {
        Args: { p_created_by: string; p_org_id: string }
        Returns: undefined
      }
      send_founding_500_expiry_reminders: { Args: never; Returns: undefined }
      send_founding_pilot_notices: { Args: never; Returns: number }
      send_onboarding_reminders: {
        Args: {
          p_below_percent?: number
          p_custom_message?: string
          p_department_id?: string
          p_filter_type?: string
          p_level?: string
          p_programme_id?: string
          p_session_id?: string
        }
        Returns: Json
      }
      send_scheduled_onboarding_reminders: { Args: never; Returns: undefined }
      send_topup_reminders: { Args: never; Returns: number }
      set_active_tertiary_grading_scale: {
        Args: { p_org_id: string; p_scale_type: string }
        Returns: undefined
      }
      set_course_equivalency: {
        Args: {
          p_effective_from?: string
          p_from_course_id: string
          p_reason: string
          p_relation: string
          p_to_course_id: string
        }
        Returns: string
      }
      set_current_term: { Args: { p_term_id: string }; Returns: undefined }
      set_domain_ssl_status: {
        Args: { p_domain_id: string; p_status: string }
        Returns: {
          activated_at: string | null
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          domain_type: Database["public"]["Enums"]["domain_type"]
          hostname: string
          id: string
          is_primary: boolean
          organization_id: string
          ssl_provisioned_at: string | null
          ssl_status: string
          updated_at: string
          verification_attempted_at: string | null
          verification_method: string
          verification_status: Database["public"]["Enums"]["domain_verification_status"]
          verification_token: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organization_domains"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_founding_agreement: {
        Args: {
          p_application_id: string
          p_currency: string
          p_price: number
          p_tier_key: string
        }
        Returns: undefined
      }
      set_grade_outcome_mapping: {
        Args: {
          p_config_id: string
          p_grade_letter: string
          p_outcome: string
          p_reason: string
        }
        Returns: Json
      }
      set_leaderboard_weights: { Args: { p_weights: Json }; Returns: undefined }
      set_learner_portal_status: {
        Args: { p_learner_id: string; p_status: string }
        Returns: undefined
      }
      set_my_billing_country: { Args: { p_country: string }; Returns: Json }
      set_onboarding_deadline: {
        Args: {
          p_deadline_at: string
          p_department_id: string
          p_extension_reason?: string
          p_level: string
          p_programme_id: string
          p_session_id: string
        }
        Returns: {
          created_at: string
          deadline_at: string
          department_id: string | null
          extended_at: string | null
          extended_by: string | null
          extension_reason: string | null
          id: string
          level: string | null
          organization_id: string
          programme_id: string | null
          session_id: string | null
          set_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "onboarding_deadlines"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_organization_type: {
        Args: { p_org_id: string; p_type: string }
        Returns: undefined
      }
      set_primary_organization_domain: {
        Args: { p_domain_id: string }
        Returns: {
          activated_at: string | null
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          domain_type: Database["public"]["Enums"]["domain_type"]
          hostname: string
          id: string
          is_primary: boolean
          organization_id: string
          ssl_provisioned_at: string | null
          ssl_status: string
          updated_at: string
          verification_attempted_at: string | null
          verification_method: string
          verification_status: Database["public"]["Enums"]["domain_verification_status"]
          verification_token: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organization_domains"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_representative_commission_rate: {
        Args: { p_rate: number; p_reason: string; p_rep_id: string }
        Returns: undefined
      }
      set_school_relationship_health: {
        Args: {
          p_health: Database["public"]["Enums"]["relationship_health_status"]
          p_note?: string
          p_organization_id: string
        }
        Returns: undefined
      }
      set_subject_course: {
        Args: {
          p_course_id: string
          p_offering_kind?: string
          p_subject_id: string
        }
        Returns: Json
      }
      set_tertiary_custom_price: {
        Args: {
          p_org_id: string
          p_price_per_student: number
          p_reason?: string
        }
        Returns: Json
      }
      set_tertiary_plan: {
        Args: {
          p_billing_cycle?: string
          p_currency?: string
          p_org_id: string
          p_tier_key: string
        }
        Returns: undefined
      }
      setup_e2e_domain_fixtures: {
        Args: {
          p_group_a: string
          p_org_a: string
          p_org_b: string
          p_parent: string
          p_staff_a: string
          p_staff_b: string
          p_student: string
        }
        Returns: Json
      }
      setup_e2e_orgs: { Args: never; Returns: Json }
      should_auto_approve_adjustment: {
        Args: {
          p_amount: number
          p_is_system_generated: boolean
          p_org_id: string
          p_type: Database["public"]["Enums"]["adjustment_type"]
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      stage_admission_import_rows: {
        Args: { p_batch_id: string; p_rows: Json }
        Returns: Json
      }
      start_founding_application_pilot: {
        Args: { p_application_id: string }
        Returns: undefined
      }
      start_founding_application_review: {
        Args: { p_application_id: string }
        Returns: undefined
      }
      submit_course_result: { Args: { p_subject_id: string }; Returns: Json }
      submit_founding_institution_application: {
        Args: {
          p_application_notes?: string
          p_campaign_key: string
          p_contact_email: string
          p_contact_name: string
          p_contact_phone?: string
          p_estimated_student_count?: number
          p_institution_name: string
          p_institution_type: string
          p_programmes_offered?: string
          p_referral_code?: string
        }
        Returns: Json
      }
      submit_onboarding_document: {
        Args: {
          p_document_type: string
          p_learner_id: string
          p_storage_path: string
        }
        Returns: Json
      }
      submit_onboarding_photo: {
        Args: { p_learner_id: string; p_storage_path: string }
        Returns: Json
      }
      submit_onboarding_step: {
        Args: { p_data: Json; p_learner_id: string; p_step_key: string }
        Returns: Json
      }
      submit_representative_passport: {
        Args: { p_photo_url: string }
        Returns: undefined
      }
      submit_school_feedback:
        | {
            Args: {
              p_biggest_challenge?: string
              p_category: Database["public"]["Enums"]["feedback_category"]
              p_notes?: string
              p_organization_id: string
              p_satisfaction?: Database["public"]["Enums"]["feedback_satisfaction_level"]
              p_subtype: string
            }
            Returns: string
          }
        | {
            Args: {
              p_biggest_challenge: string
              p_notes?: string
              p_organization_id: string
              p_satisfaction: Database["public"]["Enums"]["feedback_satisfaction_level"]
            }
            Returns: string
          }
      submit_training_module: {
        Args: { p_batch_group_id: string; p_module_id: string }
        Returns: Json
      }
      super_admin_designate_test_org: {
        Args: { p_is_test: boolean; p_org_id: string; p_reason: string }
        Returns: undefined
      }
      super_admin_set_billing_profile: {
        Args: {
          p_allow_active_currency_change?: boolean
          p_country: string
          p_org_id: string
          p_reason: string
          p_tax_id?: string
          p_tax_treatment?: string
        }
        Returns: Json
      }
      super_admin_set_gateway_country: {
        Args: {
          p_country: string
          p_gateway: string
          p_note: string
          p_supported: boolean
        }
        Returns: undefined
      }
      super_admin_set_gateway_currency: {
        Args: {
          p_currency: string
          p_enabled: boolean
          p_gateway: string
          p_note: string
        }
        Returns: undefined
      }
      super_admin_set_organization_type: {
        Args: { p_org_id: string; p_reason: string; p_type: string }
        Returns: undefined
      }
      super_admin_set_tax_settings: {
        Args: {
          p_auto_apply: boolean
          p_effective_from: string
          p_prices_inclusive: boolean
          p_reason: string
          p_registration_number: string
          p_vat_rate: number
          p_vat_registered: boolean
        }
        Returns: Json
      }
      super_admin_set_user_billing_profile: {
        Args: {
          p_allow_change_during_paid?: boolean
          p_country: string
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      super_admin_verify_organization_type: {
        Args: {
          p_decision: string
          p_org_id: string
          p_reason: string
          p_type: string
        }
        Returns: Json
      }
      teardown_e2e_domain_fixtures: { Args: never; Returns: Json }
      tertiary_plan_options_for_count: {
        Args: { p_currency?: string; p_verified_count: number }
        Returns: Json
      }
      tertiary_quote_math: {
        Args: {
          p_currency?: string
          p_cycle?: string
          p_tier_key: string
          p_verified_count: number
        }
        Returns: Json
      }
      unassign_school_portfolio: {
        Args: { p_organization_id: string; p_reason: string }
        Returns: undefined
      }
      update_representative_status: {
        Args: { p_reason?: string; p_rep_id: string; p_status: string }
        Returns: undefined
      }
      update_school_feedback_status: {
        Args: {
          p_feedback_id: string
          p_response?: string
          p_status: Database["public"]["Enums"]["feedback_status"]
        }
        Returns: undefined
      }
      user_has_feature: { Args: { p_feature_key: string }; Returns: boolean }
      verify_bank_account: {
        Args: { p_bank_account_id: string }
        Returns: undefined
      }
      verify_ledger_migration: {
        Args: { p_org_id: string }
        Returns: {
          learner_id: string
          matches: boolean
          new_outstanding: number
          old_outstanding: number
        }[]
      }
      verify_tertiary_transcript: {
        Args: { p_code: string; p_reference: string }
        Returns: Json
      }
      verify_tertiary_transcript_request: {
        Args: { p_notes: string; p_request_id: string }
        Returns: Json
      }
      verify_withdrawal_payout: {
        Args: { p_verification_note: string; p_withdrawal_id: string }
        Returns: undefined
      }
      void_commission: {
        Args: { p_commission_id: string; p_reason: string }
        Returns: undefined
      }
      zz_priv_probe: { Args: never; Returns: number }
    }
    Enums: {
      adjustment_status:
        | "pending_approval"
        | "approved"
        | "rejected"
        | "auto_approved"
      adjustment_type:
        | "discount"
        | "scholarship"
        | "waiver"
        | "penalty"
        | "refund"
        | "correction"
      commission_status:
        | "pending"
        | "payable"
        | "paid"
        | "voided"
        | "withdrawal_locked"
      domain_type: "eduxellence_subdomain" | "custom_domain"
      domain_verification_status:
        | "pending"
        | "verified"
        | "failed"
        | "suspended"
      escalation_issue_type:
        | "payment_problem"
        | "login_access_problem"
        | "results_problem"
        | "fees_problem"
        | "parent_portal_problem"
        | "technical_problem"
        | "training_request"
        | "subscription_renewal_issue"
        | "feature_request"
        | "complaint"
        | "other"
        | "student_management_issue"
      feedback_category: "product" | "customer" | "operational"
      feedback_satisfaction_level:
        | "very_satisfied"
        | "satisfied"
        | "neutral"
        | "unsatisfied"
        | "very_unsatisfied"
      feedback_status:
        | "new"
        | "under_review"
        | "action_required"
        | "resolved"
        | "closed"
      follow_up_contact_method:
        | "phone"
        | "whatsapp"
        | "physical_visit"
        | "email"
        | "other"
      gender_type: "M" | "F" | "Other"
      group_type: "class" | "course" | "department" | "cohort" | "batch"
      invoice_status: "draft" | "issued" | "void"
      org_type: "school" | "university" | "centre"
      payment_status: "pending" | "confirmed" | "rejected"
      recognition_category:
        | "representative_of_the_month"
        | "top_performer"
        | "rising_star"
        | "top_school_onboarder"
        | "revenue_champion"
        | "customer_champion"
      referral_status: "pending" | "qualified" | "rejected"
      relationship_health_status:
        | "healthy"
        | "needs_attention"
        | "at_risk"
        | "critical"
        | "no_recent_contact"
      report_status: "pending" | "processing" | "ready" | "failed"
      report_type:
        | "broadsheet"
        | "subject_report"
        | "result_card"
        | "class_summary"
        | "comparative"
      representative_level:
        | "growth_volunteer"
        | "certified_representative"
        | "state_representative"
        | "zonal_representative"
      representative_status: "active" | "suspended" | "terminated"
      school_section: "nursery" | "primary" | "secondary"
      sub_status:
        | "active"
        | "expired"
        | "cancelled"
        | "trial"
        | "suspended"
        | "grace_period"
      subscription_plan:
        | "free"
        | "teacher"
        | "small_school"
        | "standard_school"
        | "premium_school"
        | "solo_teacher_pro"
        | "founding_500"
      ticket_priority: "low" | "normal" | "high" | "critical"
      ticket_status:
        | "new"
        | "assigned"
        | "in_progress"
        | "waiting_customer"
        | "escalated"
        | "resolved"
        | "closed"
      user_role:
        | "admin"
        | "teacher"
        | "lecturer"
        | "assistant"
        | "principal"
        | "school_admin"
        | "representative"
      withdrawal_status:
        | "pending"
        | "under_review"
        | "approved"
        | "paid"
        | "rejected"
        | "cancelled"
        | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      adjustment_status: [
        "pending_approval",
        "approved",
        "rejected",
        "auto_approved",
      ],
      adjustment_type: [
        "discount",
        "scholarship",
        "waiver",
        "penalty",
        "refund",
        "correction",
      ],
      commission_status: [
        "pending",
        "payable",
        "paid",
        "voided",
        "withdrawal_locked",
      ],
      domain_type: ["eduxellence_subdomain", "custom_domain"],
      domain_verification_status: [
        "pending",
        "verified",
        "failed",
        "suspended",
      ],
      escalation_issue_type: [
        "payment_problem",
        "login_access_problem",
        "results_problem",
        "fees_problem",
        "parent_portal_problem",
        "technical_problem",
        "training_request",
        "subscription_renewal_issue",
        "feature_request",
        "complaint",
        "other",
        "student_management_issue",
      ],
      feedback_category: ["product", "customer", "operational"],
      feedback_satisfaction_level: [
        "very_satisfied",
        "satisfied",
        "neutral",
        "unsatisfied",
        "very_unsatisfied",
      ],
      feedback_status: [
        "new",
        "under_review",
        "action_required",
        "resolved",
        "closed",
      ],
      follow_up_contact_method: [
        "phone",
        "whatsapp",
        "physical_visit",
        "email",
        "other",
      ],
      gender_type: ["M", "F", "Other"],
      group_type: ["class", "course", "department", "cohort", "batch"],
      invoice_status: ["draft", "issued", "void"],
      org_type: ["school", "university", "centre"],
      payment_status: ["pending", "confirmed", "rejected"],
      recognition_category: [
        "representative_of_the_month",
        "top_performer",
        "rising_star",
        "top_school_onboarder",
        "revenue_champion",
        "customer_champion",
      ],
      referral_status: ["pending", "qualified", "rejected"],
      relationship_health_status: [
        "healthy",
        "needs_attention",
        "at_risk",
        "critical",
        "no_recent_contact",
      ],
      report_status: ["pending", "processing", "ready", "failed"],
      report_type: [
        "broadsheet",
        "subject_report",
        "result_card",
        "class_summary",
        "comparative",
      ],
      representative_level: [
        "growth_volunteer",
        "certified_representative",
        "state_representative",
        "zonal_representative",
      ],
      representative_status: ["active", "suspended", "terminated"],
      school_section: ["nursery", "primary", "secondary"],
      sub_status: [
        "active",
        "expired",
        "cancelled",
        "trial",
        "suspended",
        "grace_period",
      ],
      subscription_plan: [
        "free",
        "teacher",
        "small_school",
        "standard_school",
        "premium_school",
        "solo_teacher_pro",
        "founding_500",
      ],
      ticket_priority: ["low", "normal", "high", "critical"],
      ticket_status: [
        "new",
        "assigned",
        "in_progress",
        "waiting_customer",
        "escalated",
        "resolved",
        "closed",
      ],
      user_role: [
        "admin",
        "teacher",
        "lecturer",
        "assistant",
        "principal",
        "school_admin",
        "representative",
      ],
      withdrawal_status: [
        "pending",
        "under_review",
        "approved",
        "paid",
        "rejected",
        "cancelled",
        "failed",
      ],
    },
  },
} as const
