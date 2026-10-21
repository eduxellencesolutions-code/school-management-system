// FILE: src/lib/results/bundleTypes.ts
export interface BundleCourse {
  subject_id: string
  code: string | null
  name: string
  credit_unit: number
  total_score: number | null
  grade_letter: string | null
  grade_point: number | null
  quality_points: number | null
  outcome: string | null
  outcome_status: string | null
  attempt_number: number
  is_repeat: boolean
  credits_earned: number
  counts_toward_cgpa: boolean
  special_outcome: boolean
}

export interface BundlePending {
  code: string | null
  name: string
  credit_unit: number | null
}

export interface BundleSemester {
  ordinal: number
  term_id: string
  term_name: string
  term_status: string
  start_date: string | null
  session_id: string
  session_name: string
  scale: { config_id: string; scale_type: string; max_point: number } | null
  state: 'results_pending' | 'partially_published' | 'completed' | 'results_published'
  completed: boolean
  gpa: number | null
  cgpa_to_date: number | null
  credits_attempted: number
  credits_counted_toward_cgpa: number
  credits_earned: number
  quality_points: number
  published_courses: number
  pending_courses: number
  pending: BundlePending[]
  special_outcomes: number
  courses: BundleCourse[]
}

export interface BundleYear {
  session_id: string
  session_name: string
  semesters: { term_id: string; term_name: string; gpa: number | null; credits_attempted: number }[]
  published_courses: number
  credits_attempted: number
  credits_counted_toward_cgpa: number
  credits_earned: number
  quality_points: number
  gpa: number | null
  cgpa_at_end: number | null
}

export interface BundleTotals {
  credits_attempted: number
  credits_counted_toward_cgpa: number
  credits_earned: number
  quality_points: number
  cgpa: number | null
  credits_required: number | null
  credits_remaining: number | null
  semesters_with_results: number
  semesters_completed: number
  courses_published: number
  repeat_attempts: number
  special_outcomes: number
  outcomes_not_configured: number
  scales_consistent: boolean
  cgpa_scale_max: number | null
}

export interface BundleGraduation {
  approved_at: string
  final_cgpa: number | null
  classification: string | null
  graduation_session: string | null
}

export interface ResultsBundle {
  bundle_version: number
  generated_at: string
  institution: { name: string; logo_url: string | null; address: string | null; motto: string | null }
  profile: {
    learner_id: string
    first_name: string
    last_name: string
    other_names: string | null
    admission_number: string
    photo_url: string | null
    programme_name: string
    programme_code: string | null
    degree_type: string | null
    duration_years: number | null
    min_credit_units: number | null
    max_credit_units: number | null
    department_name: string
    faculty_name: string
    current_level: string | null
    academic_status: string | null
    entry_session: string | null
    expected_graduation_session: string | null
  }
  semesters: BundleSemester[]
  years: BundleYear[]
  totals: BundleTotals
  graduation: BundleGraduation | null
  final_state: 'in_progress' | 'graduation_approved'
  rules: Record<string, string>
}