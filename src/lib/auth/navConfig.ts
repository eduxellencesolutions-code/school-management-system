export interface NavItem {
  key: string
  href: string
  label: string
  section: 'primary' | 'more'
  requiredPermission?: string
  superAdminOnly?: boolean
  group?: string
}

export interface NavGroup {
  key: string
  label: string
}

export const NAV_GROUPS: NavGroup[] = [
  { key: 'representatives', label: 'Representatives' },
]

export const NAV_ITEMS: NavItem[] = [
  { key: 'welcome', href: '/welcome', label: 'Welcome', section: 'primary' },
  { key: 'overview', href: '/overview', label: 'Overview', section: 'primary' },
  { key: 'schools', href: '/schools', label: 'Schools', section: 'primary', requiredPermission: 'schools.view' },
  { key: 'solo-teachers', href: '/solo-teachers', label: 'Solo Teachers', section: 'primary', requiredPermission: 'schools.view' },
  { key: 'analytics', href: '/analytics', label: 'Analytics', section: 'primary', requiredPermission: 'analytics.view' },
  { key: 'support', href: '/support', label: 'Support', section: 'primary', requiredPermission: 'support.view' },
  { key: 'commissions', href: '/commissions', label: 'Commissions', section: 'more', requiredPermission: 'commissions.approve' },
  { key: 'withdrawals', href: '/withdrawals', label: 'Withdrawals', section: 'more', requiredPermission: 'commissions.approve' },
  { key: 'representatives', href: '/representatives', label: 'All Representatives', section: 'more', requiredPermission: 'representatives.view', group: 'representatives' },
  { key: 'rep-performance', href: '/representatives/performance', label: 'Performance', section: 'more', requiredPermission: 'representatives.view', group: 'representatives' },
  { key: 'school-portfolios', href: '/representatives/school-portfolios', label: 'School Portfolios', section: 'more', requiredPermission: 'representatives.view', group: 'representatives' },
  { key: 'rep-followups', href: '/representatives/follow-ups', label: 'Follow-ups', section: 'more', requiredPermission: 'representatives.view', group: 'representatives' },
  { key: 'rep-feedback', href: '/representatives/feedback', label: 'Feedback', section: 'more', requiredPermission: 'representatives.view', group: 'representatives' },
  { key: 'rep-escalations', href: '/representatives/escalations', label: 'Escalations', section: 'more', requiredPermission: 'support.view', group: 'representatives' },
  { key: 'resources', href: '/resources', label: 'Rep Resources', section: 'more', requiredPermission: 'representatives.view', group: 'representatives' },
  { key: 'rep-leaderboard', href: '/representatives/leaderboard', label: 'Leaderboard', section: 'more', requiredPermission: 'representatives.view', group: 'representatives' },
  { key: 'platform-users', href: '/platform-users', label: 'Platform Users', section: 'more', requiredPermission: 'platform_users.view' },
  { key: 'security', href: '/security', label: 'Security', section: 'more', requiredPermission: 'security.dashboard.view' },
  { key: 'audit', href: '/audit', label: 'Audit Log', section: 'more', requiredPermission: 'security.audit' },
  { key: 'platform-announcements', href: '/platform-announcements', label: 'Announcements', section: 'more', requiredPermission: 'announcements.manage' },
  { key: 'team', href: '/team', label: 'Team', section: 'more', superAdminOnly: true },
  { key: 'settings', href: '/platform-settings', label: 'Settings', section: 'more', superAdminOnly: true },
]

export interface NavAccess {
  isSuperAdmin: boolean
  permissions: string[]
}

export function canAccessNavItem(item: NavItem, access: NavAccess): boolean {
  if (access.isSuperAdmin) return true
  if (item.superAdminOnly) return false
  if (!item.requiredPermission) return true
  return access.permissions.includes(item.requiredPermission)
}

export function getVisibleNavItems(access: NavAccess): NavItem[] {
  return NAV_ITEMS.filter(item => canAccessNavItem(item, access))
}