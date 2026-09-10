// FILE: src/lib/nav-config.ts

export interface NavItem { label: string; href: string }

const SCHOOL_NAV: NavItem[] = [
  { label: 'Classes', href: '/classes' },
  { label: 'Students', href: '/students' },
  { label: 'Results', href: '/reports' },
]

const TERTIARY_NAV: NavItem[] = [
  { label: 'Faculties', href: '/faculties' },
  { label: 'Departments', href: '/departments' },
  { label: 'Programmes', href: '/programmes' },
  { label: 'Cohorts', href: '/cohorts' },
  { label: 'Courses', href: '/courses' },
  { label: 'My Courses', href: '/lecturer/courses' },
  { label: 'Result Review', href: '/results/review' },
  { label: 'Academic Records', href: '/students' },
]

const CENTRE_NAV: NavItem[] = [
  // Phase 3 — not built yet
]

export function getNavForOrgType(orgType: 'school' | 'university' | 'centre'): NavItem[] {
  if (orgType === 'university') return TERTIARY_NAV
  if (orgType === 'centre') return CENTRE_NAV
  return SCHOOL_NAV
}