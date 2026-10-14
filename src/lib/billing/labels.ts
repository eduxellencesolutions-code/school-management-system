export const CAPABILITY_LABELS: Record<string, string> = {
  'tertiary.students': 'Student records', 'tertiary.faculty': 'Faculty structure', 'tertiary.department': 'Departments',
  'tertiary.programme': 'Programmes', 'tertiary.cohort': 'Cohorts', 'tertiary.courses': 'Course catalogue',
  'tertiary.course_registration': 'Course registration', 'tertiary.lecturer_assignment': 'Lecturer assignment',
  'tertiary.ca_exam_entry': 'CA & exam score entry', 'tertiary.grading': 'Grading scales', 'tertiary.results': 'Results management',
  'tertiary.gpa': 'GPA calculation', 'tertiary.cgpa': 'CGPA & academic record', 'tertiary.department_review': 'Departmental review',
  'tertiary.faculty_review': 'Faculty review', 'tertiary.registry_review': 'Registry review', 'tertiary.senate_approval': 'Senate approval',
  'tertiary.publication': 'Result publication', 'tertiary.student_portal': 'Student portal', 'tertiary.published_results': 'Published results access',
  'tertiary.academic_history': 'Academic history', 'tertiary.result_pdf': 'Result PDF export', 'tertiary.audit_trail': 'Audit trail',
  'tertiary.parent_portal': 'Parent portal', 'tertiary.parent_view_results': 'Parent result visibility', 'tertiary.bulk_operations': 'Bulk operations',
}
export const FEATURE_LABELS: Record<string, string> = {
  core_results: 'Results entry & report cards', parent_portal: 'Parent portal', affective_psychomotor: 'Affective & psychomotor assessment',
  homework: 'Homework', ai_insights: 'AI insights', executive_dashboard: 'Executive dashboard', student_passport: 'Student passport',
  promotion_simulation: 'Promotion simulation', white_label: 'White-label branding', promotion_wizard: 'Promotion centre',
  basic_attendance: 'Attendance', attendance_reports: 'Attendance reports', broadsheet: 'Broadsheets', basic_ai_remarks: 'AI report remarks',
  audit_logs: 'Audit logs', analytics_trends: 'Analytics trends', fees: 'Fee management', advanced_finance_analytics: 'Financial analytics',
  teacher_management: 'Teacher management',
}
export const EXCLUDED_LABELS: Record<string, string> = {
  status_withdrawn: 'Withdrawn', status_transferred: 'Transferred', status_graduated: 'Graduated', status_suspended: 'Suspended',
  status_archived: 'Archived', inactive_flag: 'Marked inactive', missing_tertiary_record: 'No academic record',
}
export const ISSUE_LABELS: Record<string, string> = {
  missing_names: 'students with a missing first or last name',
  duplicate_admission_numbers: 'groups of duplicate admission numbers',
  missing_admission_numbers: 'students without an admission number',
  possible_duplicate_people: 'possible duplicate students (same name and date of birth)',
}