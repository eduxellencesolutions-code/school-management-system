// FILE: src/components/results/sampleBundle.ts
// SAMPLE DATA for the development preview only. Never shown in production.
import type { BundleCourse, ResultsBundle } from '@/lib/results/bundleTypes'

function course(id: string, code: string, name: string, credits: number, score: number, letter: string, points: number, outcome: string | null, attempt: number, earned: number): BundleCourse {
  return {
    subject_id: id, code, name, credit_unit: credits, total_score: score, grade_letter: letter, grade_point: points,
    quality_points: points * credits, outcome, outcome_status: outcome ? 'mapped' : 'unmapped',
    attempt_number: attempt, is_repeat: attempt > 1, credits_earned: earned, counts_toward_cgpa: true, special_outcome: false,
  }
}

export const sampleBundle: ResultsBundle = {
  bundle_version: 1,
  generated_at: new Date().toISOString(),
  institution: { name: 'Sample University', logo_url: null, address: null, motto: null },
  profile: {
    first_name: 'Ada', last_name: 'Sample', other_names: null, admission_number: 'SAMPLE/2025/001', photo_url: null,
    programme_name: 'B.Sc. Sample Studies', programme_code: 'SSS', degree_type: 'B.Sc.', duration_years: 4,
    min_credit_units: 20, max_credit_units: 36, department_name: 'Department of Samples', faculty_name: 'Faculty of Examples',
    current_level: '100', academic_status: 'active', entry_session: '2025/2026', expected_graduation_session: '2028/2029',
  },
  semesters: [
    {
      ordinal: 1, term_id: 't1', term_name: 'First Semester', term_status: 'closed', start_date: '2025-09-01',
      session_id: 's1', session_name: '2025/2026', scale: { config_id: 'c1', scale_type: 'tertiary_5_point', max_point: 5 },
      state: 'completed', completed: true, gpa: 2.0, cgpa_to_date: 2.0, credits_attempted: 5, credits_counted_toward_cgpa: 5,
      credits_earned: 2, quality_points: 10, published_courses: 2, pending_courses: 0, pending: [], special_outcomes: 0,
      courses: [
        course('a', 'SSS101', 'Introduction to Samples', 3, 30, 'F', 0, 'fail', 1, 0),
        course('b', 'SSS102', 'Sample Methods', 2, 80, 'A', 5, 'pass', 1, 2),
      ],
    },
    {
      ordinal: 2, term_id: 't2', term_name: 'Second Semester', term_status: 'active', start_date: '2026-02-01',
      session_id: 's1', session_name: '2025/2026', scale: { config_id: 'c1', scale_type: 'tertiary_5_point', max_point: 5 },
      state: 'results_published', completed: false, gpa: 3.5, cgpa_to_date: 2.82, credits_attempted: 6, credits_counted_toward_cgpa: 6,
      credits_earned: 3, quality_points: 21, published_courses: 2, pending_courses: 0, pending: [], special_outcomes: 0,
      courses: [
        course('c', 'SSS101', 'Introduction to Samples', 3, 65, 'B', 4, 'pass', 2, 3),
        course('d', 'SSS103', 'Sample Practice', 3, 55, 'C', 3, null, 1, 0),
      ],
    },
    {
      ordinal: 3, term_id: 't3', term_name: 'First Semester', term_status: 'active', start_date: '2026-09-01',
      session_id: 's2', session_name: '2026/2027', scale: null,
      state: 'results_pending', completed: false, gpa: null, cgpa_to_date: 2.82, credits_attempted: 0, credits_counted_toward_cgpa: 0,
      credits_earned: 0, quality_points: 0, published_courses: 0, pending_courses: 2,
      pending: [{ code: 'SSS201', name: 'Advanced Samples', credit_unit: 2 }, { code: 'SSS202', name: 'Sample Seminar', credit_unit: 2 }],
      special_outcomes: 0, courses: [],
    },
  ],
  years: [
    {
      session_id: 's1', session_name: '2025/2026',
      semesters: [
        { term_id: 't1', term_name: 'First Semester', gpa: 2.0, credits_attempted: 5 },
        { term_id: 't2', term_name: 'Second Semester', gpa: 3.5, credits_attempted: 6 },
      ],
      published_courses: 4, credits_attempted: 11, credits_counted_toward_cgpa: 11, credits_earned: 5, quality_points: 31, gpa: 2.82, cgpa_at_end: 2.82,
    },
    { session_id: 's2', session_name: '2026/2027', semesters: [{ term_id: 't3', term_name: 'First Semester', gpa: null, credits_attempted: 0 }], published_courses: 0, credits_attempted: 0, credits_counted_toward_cgpa: 0, credits_earned: 0, quality_points: 0, gpa: null, cgpa_at_end: 2.82 },
  ],
  totals: {
    credits_attempted: 11, credits_counted_toward_cgpa: 11, credits_earned: 5, quality_points: 31, cgpa: 2.82,
    credits_required: 20, credits_remaining: 15, semesters_with_results: 2, semesters_completed: 1, courses_published: 4,
    repeat_attempts: 1, special_outcomes: 0, outcomes_not_configured: 1, scales_consistent: true, cgpa_scale_max: 5,
  },
  graduation: null,
  final_state: 'in_progress',
  rules: {
    gpa_rule: 'GPA is total quality points divided by the credit units counted. Every published attempt counts, including repeated courses, because no institutional repeat regulation is configured.',
    earned_rule: 'Credits are earned for courses whose grade is configured as a pass. A repeated course code is counted once, using the latest pass.',
    completed_rule: 'A semester is completed when its term is closed and every registered course in it has a published result.',
    repeat_detection: 'Repeats are detected by course code.',
    unmapped_outcomes: 'A grade with no configured outcome earns no credits and is shown as outcome not configured.',
  },
}