export interface NavItem {
  key: string
  href: string
  label: string
  section: 'primary' | 'more'
  requiredPermission?: string
  superAdminOnly?: boolean
}

// Single source of truth for what each admin route requires. Keep this in
// sync with the actual per-page checks (hasPermission(...) / has_platform_permission RPC)
// in each page.tsx — this file only controls what's *shown* in nav; the
// pages themselves remain the real enforcement point.
export const NAV_ITEMS: NavItem[] = [
  { key: 'overview', href: '/overview', label: 'Overview', section: 'primary' },
  { key: 'schools', href: '/schools', label: 'Schools', section: 'primary', requiredPermission: 'schools.view' },
  { key: 'solo-teachers', href: '/solo-teachers', label: 'Solo Teachers', section: 'primary', requiredPermission: 'schools.view' },
  { key: 'analytics', href: '/analytics', label: 'Analytics', section: 'primary', requiredPermission: 'analytics.view' },
  { key: 'support', href: '/support', label: 'Support', section: 'primary', requiredPermission: 'support.view' },
  { key: 'commissions', href: '/commissions', label: 'Commissions', section: 'more', requiredPermission: 'commissions.approve' },
  { key: 'representatives', href: '/representatives', label: 'Representatives', section: 'more', requiredPermission: 'representatives.view' },
  { key: 'security', href: '/security', label: 'Security', section: 'more', requiredPermission: 'security.dashboard.view' },
  { key: 'audit', href: '/audit', label: 'Audit Log', section: 'more', requiredPermission: 'security.audit' },
  { key: 'platform-announcements', href: '/platform-announcements', label: 'Announcements', section: 'more', requiredPermission: 'announcements.manage' },
  { key: 'team', href: '/team', label: 'Team', section: 'more', superAdminOnly: true },
]

export interface NavAccess {
  isSuperAdmin: boolean
  permissions: string[]
}

export function canAccessNavItem(item: NavItem, access: NavAccess): boolean {
  if (access.isSuperAdmin) return true
  if (item.superAdminOnly) return false
  if (!item.requiredPermission) return true // e.g. 'overview' — always reachable, page itself routes staff onward
  return access.permissions.includes(item.requiredPermission)
}

export function getVisibleNavItems(access: NavAccess): NavItem[] {
  return NAV_ITEMS.filter(item => canAccessNavItem(item, access))
}