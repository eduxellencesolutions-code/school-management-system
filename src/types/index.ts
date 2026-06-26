// ─── Enums ──────────────────────────────────────────────────────────────────

export type OrgType = 'school' | 'university' | 'centre'
export type UserRole = 'admin' | 'teacher' | 'lecturer' | 'assistant'
export type GroupType = 'class' | 'course' | 'department'
export type Gender = 'M' | 'F' | 'Other'
export type SubscriptionPlan = 'free' | 'teacher' | 'small_school' | 'standard_school' | 'premium_school'
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'trial'

// ─── Core Entities ───────────────────────────────────────────────────────────

export interface Organization {
  id: string
  name: string
  type: OrgType
  address?: string
  logo_url?: string
  motto?: string
  website?: string
  contact_email?: string
  contact_phone?: string
  subscription_plan: SubscriptionPlan
  subscription_status: SubscriptionStatus
  subscription_expires_at?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  organization_id?: string
  email: string
  name: string
  role: UserRole
  signature_url?: string
  phone?: string
  profile_pic_url?: string
  last_login?: string
  is_active: boolean
  preferences?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AcademicSession {
  id: string
  organization_id: string
  name: string          // e.g. "2026/2027"
  start_date?: string
  end_date?: string
  is_active: boolean
  created_at: string
}

export interface Term {
  id: string
  session_id: string
  organization_id: string
  name: string          // "First Term" | "Second Term" | "Third Term"
  start_date?: string
  end_date?: string
  is_active: boolean
  created_at: string
}

export interface Group {
  id: string
  organization_id: string
  name: string
  code?: string
  type: GroupType
  instructor_id?: string
  session_id?: string
  term_id?: string
  is_active: boolean
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined
  instructor?: User
  session?: AcademicSession
  term?: Term
  learner_count?: number
}

export interface Learner {
  id: string
  organization_id: string
  group_id: string
  first_name: string
  last_name: string
  other_names?: string
  admission_number?: string
  email?: string
  phone?: string
  date_of_birth?: string
  gender?: Gender
  guardian_name?: string
  guardian_phone?: string
  address?: string
  is_active: boolean
  enrollment_date?: string
  photo_url?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  // Computed
  full_name?: string
}

export interface Subject {
  id: string
  organization_id: string
  group_id: string
  name: string
  code?: string
  instructor_id?: string
  template_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined - FIXED: instructor can be null or an object with name
  instructor?: { name: string } | null
  template?: AssessmentTemplate
}

// ─── Assessment ───────────────────────────────────────────────────────────────

export interface AssessmentTemplate {
  id: string
  organization_id: string
  name: string
  description?: string
  is_default: boolean
  metadata?: Record<string, unknown>
  created_at: string
  // Joined
  components?: AssessmentComponent[]
}

export interface AssessmentComponent {
  id: string
  template_id: string
  name: string          // "CA1", "CA2", "Exam", "Assignment"
  max_score: number
  weight?: number       // for weighted scoring
  sequence: number
  is_cumulative: boolean
  pass_mark?: number
  created_at: string
}

export interface GradingSystem {
  id: string
  organization_id: string
  name: string
  grade_letter: string  // A, B, C, D, E, F
  min_score: number
  max_score: number
  remark: string        // "Excellent", "Very Good", etc.
  points?: number       // for GPA (4.0, 3.0, etc.)
  created_at: string
}

// ─── Scores ───────────────────────────────────────────────────────────────────

export interface Score {
  id: string
  learner_id: string
  subject_id: string
  component_id: string
  score?: number
  remarks?: string
  entered_by: string
  entered_at: string
  last_modified: string
  is_final: boolean
  metadata?: Record<string, unknown>
}

// Convenience type for the score entry grid
export interface ScoreGridCell {
  learner_id: string
  component_id: string
  score: number | null
  is_saved: boolean
  is_saving: boolean
  has_error: boolean
}

// ─── Computed Results ─────────────────────────────────────────────────────────

export interface LearnerSubjectResult {
  learner_id: string
  subject_id: string
  subject_name: string
  scores: { component_name: string; score: number | null; max_score: number }[]
  total: number
  max_total: number
  percentage: number
  grade: string
  remark: string
  position?: number
  ai_remark?: string
}

export interface LearnerResult {
  learner: Learner
  subject_results: LearnerSubjectResult[]
  grand_total: number
  overall_percentage: number
  overall_grade: string
  overall_position: number
  total_subjects: number
  passed_subjects: number
  cgpa?: number
}

export interface GroupResult {
  group: Group
  learner_results: LearnerResult[]
  class_average: number
  highest_score: number
  lowest_score: number
  pass_rate: number
  total_students: number
  grade_distribution: Record<string, number>
  top_performers: LearnerResult[]
  subject_averages: { subject_name: string; average: number }[]
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export type ReportType =
  | 'broadsheet'
  | 'subject_report'
  | 'result_card'
  | 'class_summary'
  | 'comparative'

export interface ReportRequest {
  id: string
  organization_id: string
  group_id: string
  type: ReportType
  filters?: Record<string, unknown>
  status: 'pending' | 'processing' | 'ready' | 'failed'
  download_url?: string
  created_by: string
  created_at: string
}

// ─── Subscription & Plans ─────────────────────────────────────────────────────

export interface PlanLimits {
  max_groups: number | null         // null = unlimited
  max_learners: number | null
  max_subjects_per_group: number | null
  has_branding: boolean
  has_pdf_export: boolean
  has_excel_export: boolean
  has_analytics: boolean
  has_ai_remarks: boolean
  has_multi_staff: boolean
  has_parent_portal: boolean
  max_staff: number | null
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    max_groups: 1,
    max_learners: 30,
    max_subjects_per_group: 10,
    has_branding: false,
    has_pdf_export: false,
    has_excel_export: true,
    has_analytics: false,
    has_ai_remarks: false,
    has_multi_staff: false,
    has_parent_portal: false,
    max_staff: 1,
  },
  teacher: {
    max_groups: null,
    max_learners: null,
    max_subjects_per_group: null,
    has_branding: false,
    has_pdf_export: true,
    has_excel_export: true,
    has_analytics: true,
    has_ai_remarks: true,
    has_multi_staff: false,
    has_parent_portal: false,
    max_staff: 1,
  },
  small_school: {
    max_groups: null,
    max_learners: 300,
    max_subjects_per_group: null,
    has_branding: true,
    has_pdf_export: true,
    has_excel_export: true,
    has_analytics: true,
    has_ai_remarks: true,
    has_multi_staff: true,
    has_parent_portal: false,
    max_staff: 10,
  },
  standard_school: {
    max_groups: null,
    max_learners: 1000,
    max_subjects_per_group: null,
    has_branding: true,
    has_pdf_export: true,
    has_excel_export: true,
    has_analytics: true,
    has_ai_remarks: true,
    has_multi_staff: true,
    has_parent_portal: true,
    max_staff: 30,
  },
  premium_school: {
    max_groups: null,
    max_learners: null,
    max_subjects_per_group: null,
    has_branding: true,
    has_pdf_export: true,
    has_excel_export: true,
    has_analytics: true,
    has_ai_remarks: true,
    has_multi_staff: true,
    has_parent_portal: true,
    max_staff: null,
  },
}

export const PLAN_PRICING = {
  free:           { label: 'Free',           price: 0,     period: 'forever',    naira: '₦0' },
  teacher:        { label: 'Teacher',        price: 1000,  period: 'per term',   naira: '₦1,000' },
  small_school:   { label: 'Small School',   price: 10000, period: 'per year',   naira: '₦10,000' },
  standard_school:{ label: 'Standard School',price: 20000, period: 'per year',   naira: '₦20,000' },
  premium_school: { label: 'Premium School', price: 50000, period: 'per year',   naira: '₦50,000' },
} as const

// ─── Audit ───────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  user_id: string
  action: string
  table_name: string
  record_id?: string
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  ip_address?: string
  created_at: string
}