'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Megaphone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BellRing,
  BellOff,
  RotateCcw,
  Save,
  User,
  Users,
  FileText,
  TrendingUp,
  Clock,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

interface NotificationPreference {
  id: string
  user_id: string
  type: string
  channel: 'email' | 'in_app' | 'both'
  enabled: boolean
  created_at: string
  updated_at: string
}

interface Notification {
  id: string
  user_id: string
  title: string
  body: string | null
  is_read: boolean
  created_at: string
  metadata: any
}

interface NotificationPreferenceGroup {
  category: string
  icon: any
  preferences: {
    key: string
    label: string
    description: string
    enabled: boolean
    channel: 'email' | 'in_app' | 'both'
  }[]
}

// Get default preferences
const getDefaultPreferences = (userId: string): NotificationPreference[] => {
  const now = new Date().toISOString()
  const defaults = [
    // Account & Security
    { id: `temp_${Date.now()}_1`, user_id: userId, type: 'account_security', channel: 'email' as const, enabled: true, created_at: now, updated_at: now },
    { id: `temp_${Date.now()}_2`, user_id: userId, type: 'password_changed', channel: 'both' as const, enabled: true, created_at: now, updated_at: now },
    { id: `temp_${Date.now()}_3`, user_id: userId, type: 'login_alert', channel: 'email' as const, enabled: true, created_at: now, updated_at: now },
    
    // Results & Reports
    { id: `temp_${Date.now()}_4`, user_id: userId, type: 'result_published', channel: 'both' as const, enabled: true, created_at: now, updated_at: now },
    { id: `temp_${Date.now()}_5`, user_id: userId, type: 'report_ready', channel: 'in_app' as const, enabled: true, created_at: now, updated_at: now },
    { id: `temp_${Date.now()}_6`, user_id: userId, type: 'score_entered', channel: 'in_app' as const, enabled: false, created_at: now, updated_at: now },
    
    // Teacher Management (admin only)
    { id: `temp_${Date.now()}_7`, user_id: userId, type: 'teacher_assigned', channel: 'email' as const, enabled: true, created_at: now, updated_at: now },
    { id: `temp_${Date.now()}_8`, user_id: userId, type: 'class_update', channel: 'in_app' as const, enabled: true, created_at: now, updated_at: now },
    
    // System & Updates
    { id: `temp_${Date.now()}_9`, user_id: userId, type: 'system_update', channel: 'email' as const, enabled: true, created_at: now, updated_at: now },
    { id: `temp_${Date.now()}_10`, user_id: userId, type: 'maintenance_alert', channel: 'email' as const, enabled: true, created_at: now, updated_at: now },
  ]
  return defaults
}

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  
  // ✅ Live notifications state
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingNotifications, setLoadingNotifications] = useState(true)

  // Load notification preferences
  useEffect(() => {
    loadPreferences()
    loadNotifications()
  }, [])

  const loadPreferences = async () => {
    setLoading(true)
    try {
      const { user } = await getAuthenticatedUser(supabase)
      if (!user) return

      const { data: prefs, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)

      if (error && error.code !== 'PGRST116') throw error

      if (!prefs || prefs.length === 0) {
        const defaultPrefs = getDefaultPreferences(user.id)
        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert(defaultPrefs.map(({ id, ...rest }) => rest))
          .select()

        if (insertError) throw insertError
        setPreferences(newPrefs || [])
      } else {
        setPreferences(prefs)
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
      toast.error('Failed to load notification settings')
      const { user } = await getAuthenticatedUser(supabase)
      if (user) {
        setPreferences(getDefaultPreferences(user.id))
      }
    } finally {
      setLoading(false)
    }
  }

  // ✅ LIVE: Load actual notifications from database (NO PLACEHOLDERS)
  const loadNotifications = async () => {
    setLoadingNotifications(true)
    try {
      const { user } = await getAuthenticatedUser(supabase)
      if (!user) {
        setNotifications([])
        setUnreadCount(0)
        setLoadingNotifications(false)
        return
      }

      const { data: notifs, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const realNotifications = notifs || []
      setNotifications(realNotifications)
      
      const unread = realNotifications.filter(n => !n.is_read).length
      setUnreadCount(unread)
    } catch (error) {
      console.error('Error loading notifications:', error)
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoadingNotifications(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { user } = await getAuthenticatedUser(supabase)
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('Failed to mark all as read')
    }
  }

  const handleTogglePreference = (index: number, field: 'enabled' | 'channel', value: any) => {
    setPreferences(prev => {
      const newPrefs = [...prev]
      if (field === 'enabled') {
        newPrefs[index] = { ...newPrefs[index], enabled: value }
      } else if (field === 'channel') {
        newPrefs[index] = { ...newPrefs[index], channel: value }
      }
      return newPrefs
    })
    setHasChanges(true)
  }

  const handleSavePreferences = async () => {
    setSaving(true)
    try {
      const { user } = await getAuthenticatedUser(supabase)
      if (!user) throw new Error('Not authenticated')

      for (const pref of preferences) {
        if (pref.id && !pref.id.startsWith('temp_')) {
          const { error } = await supabase
            .from('notification_preferences')
            .update({
              enabled: pref.enabled,
              channel: pref.channel,
              updated_at: new Date().toISOString(),
            })
            .eq('id', pref.id)

          if (error) throw error
        }
      }

      toast.success('Notification preferences saved!')
      setHasChanges(false)
      
      // ✅ Send a test notification so user sees something real
      await sendTestNotification()
      await loadNotifications()
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast.error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  // ✅ FIX: Use 'body' instead of 'message', remove 'notification_type'
  const sendTestNotification = async () => {
    try {
      const { user } = await getAuthenticatedUser(supabase)
      if (!user) return

      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Notification settings updated',
          body: 'Your notification preferences have been saved successfully.',
          is_read: false,
          created_at: new Date().toISOString(),
        })
    } catch (error) {
      console.error('Error sending test notification:', error)
    }
  }

  const handleResetDefaults = async () => {
    if (!confirm('Reset all notification preferences to default settings?')) return

    const { user } = await getAuthenticatedUser(supabase)
    if (!user) return

    const defaults = getDefaultPreferences(user.id)
    
    setPreferences(prev => prev.map((pref, index) => {
      const defaultPref = defaults[index]
      return {
        ...pref,
        enabled: defaultPref.enabled,
        channel: defaultPref.channel,
      }
    }))
    setHasChanges(true)
    toast('Preferences reset. Click Save to apply changes.', {
      icon: 'ℹ️',
      duration: 5000,
    })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle2
      case 'warning': return AlertCircle
      case 'error': return XCircle
      default: return Bell
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-500'
      case 'warning': return 'text-amber-500'
      case 'error': return 'text-red-500'
      default: return 'text-blue-500'
    }
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const past = new Date(dateString)
    const diffMs = now.getTime() - past.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return past.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Group preferences by category
  const getPreferenceGroups = (): NotificationPreferenceGroup[] => {
    const groups: NotificationPreferenceGroup[] = [
      {
        category: 'Account & Security',
        icon: User,
        preferences: [
          { key: 'account_security', label: 'Account security alerts', description: 'Get notified about suspicious login attempts', enabled: false, channel: 'email' },
          { key: 'password_changed', label: 'Password changes', description: 'Alert when your password is changed', enabled: false, channel: 'both' },
          { key: 'login_alert', label: 'New login notifications', description: 'Get notified when someone logs into your account', enabled: false, channel: 'email' },
        ]
      },
      {
        category: 'Results & Reports',
        icon: FileText,
        preferences: [
          { key: 'result_published', label: 'Result published', description: 'Alert when student results are published', enabled: false, channel: 'both' },
          { key: 'report_ready', label: 'Report generation complete', description: 'Notify when a report is ready for download', enabled: false, channel: 'in_app' },
          { key: 'score_entered', label: 'Score entry notifications', description: 'Get notified when scores are entered', enabled: false, channel: 'in_app' },
        ]
      },
      {
        category: 'Teacher Management',
        icon: Users,
        preferences: [
          { key: 'teacher_assigned', label: 'Teacher assignments', description: 'Alert when a teacher is assigned to a class/subject', enabled: false, channel: 'email' },
          { key: 'class_update', label: 'Class updates', description: 'Get notified about class changes or updates', enabled: false, channel: 'in_app' },
        ]
      },
      {
        category: 'System & Updates',
        icon: Megaphone,
        preferences: [
          { key: 'system_update', label: 'System updates', description: 'Stay informed about new features and improvements', enabled: false, channel: 'email' },
          { key: 'maintenance_alert', label: 'Maintenance alerts', description: 'Get notified about scheduled maintenance', enabled: false, channel: 'email' },
        ]
      }
    ]

    return groups.map(group => ({
      ...group,
      preferences: group.preferences.map(pref => {
        const current = preferences.find(p => p.type === pref.key)
        return {
          ...pref,
          enabled: current?.enabled ?? false,
          channel: current?.channel ?? 'both',
        }
      })
    }))
  }

  const preferenceGroups = getPreferenceGroups()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ink-muted">Loading notification settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notification Settings</h1>
          <p className="page-subtitle">
            Manage how and when you receive notifications across all channels.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleResetDefaults}
            className="btn-secondary btn-sm btn flex items-center gap-1"
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button
            onClick={handleSavePreferences}
            disabled={saving || !hasChanges}
            className="btn-primary btn-sm btn flex items-center gap-1 disabled:opacity-50"
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-amber-700">
          <AlertCircle size={14} />
          You have unsaved changes. Click "Save Changes" to apply.
        </div>
      )}

      {/* ✅ REAL notification summary - from database */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
          <Bell size={18} className="text-brand-500" />
          <div>
            <p className="text-xs text-ink-faint">Total Notifications</p>
            <p className="text-sm font-medium text-ink">{notifications.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
          <Mail size={18} className="text-brand-500" />
          <div>
            <p className="text-xs text-ink-faint">Email Notifications</p>
            <p className="text-sm font-medium text-ink">{preferences.filter(p => p.channel === 'email' || p.channel === 'both').length} enabled</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
          <MessageSquare size={18} className="text-brand-500" />
          <div>
            <p className="text-xs text-ink-faint">In-App Notifications</p>
            <p className="text-sm font-medium text-ink">{preferences.filter(p => p.channel === 'in_app' || p.channel === 'both').length} enabled</p>
          </div>
        </div>
      </div>

      {/* Notification preferences by category */}
      {preferenceGroups.map((group, groupIndex) => (
        <div key={group.category} className="card">
          <div className="card-header flex items-center gap-2">
            <group.icon size={16} className="text-brand-500" />
            <h2 className="font-semibold text-sm text-ink">{group.category}</h2>
          </div>
          <div className="card-body">
            <div className="divide-y divide-surface-200">
              {group.preferences.map((pref, prefIndex) => {
                const globalIndex = preferences.findIndex(p => p.type === pref.key)
                const isEnabled = pref.enabled

                return (
                  <div key={pref.key} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-ink">{pref.label}</h3>
                          {isEnabled ? (
                            <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                          ) : (
                            <XCircle size={14} className="text-surface-300 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-ink-muted mt-0.5">{pref.description}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <select
                          value={pref.channel}
                          onChange={(e) => handleTogglePreference(globalIndex, 'channel', e.target.value as 'email' | 'in_app' | 'both')}
                          className="input text-xs py-1 w-28"
                        >
                          <option value="in_app">In-app</option>
                          <option value="email">Email</option>
                          <option value="both">Both</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleTogglePreference(globalIndex, 'enabled', !isEnabled)}
                          className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                            isEnabled ? 'bg-brand-500' : 'bg-surface-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                              isEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}

      {/* ✅ REAL In-App Notifications - ONLY from database */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing size={16} className="text-brand-500" />
            <h2 className="font-semibold text-sm text-ink">Recent Notifications</h2>
            {unreadCount > 0 && (
              <span className="badge badge-red text-[10px]">{unreadCount} unread</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn-secondary btn-sm btn text-xs"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="card-body">
          {loadingNotifications ? (
            <div className="py-8 text-center">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-ink-muted">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <BellOff size={48} className="text-surface-200 mx-auto mb-4" />
              <p className="text-base font-medium text-ink">No notifications yet</p>
              <p className="text-sm text-ink-muted mt-1">
                Notifications will appear here when you receive them.
              </p>
              <p className="text-xs text-ink-faint mt-2">
                Try saving your notification preferences to generate a test notification.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-surface-200">
              {notifications.map((notification) => {
                // Use Bell as default since notification_type doesn't exist
                return (
                  <div 
                    key={notification.id} 
                    className={`py-3 flex items-start gap-3 cursor-pointer hover:bg-surface-50 rounded-lg transition-colors px-2 ${
                      !notification.is_read ? 'bg-brand-50/50' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    {!notification.is_read && (
                      <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                    <Bell size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink font-medium">{notification.title}</p>
                      {notification.body && (
                        <p className="text-xs text-ink-muted">{notification.body}</p>
                      )}
                      <p className="text-xs text-ink-faint mt-1">
                        {getTimeAgo(notification.created_at)}
                        {!notification.is_read && (
                          <span className="ml-2 text-blue-500 text-[10px] font-medium">· Unread</span>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          
          {/* ✅ View All Notifications - links to a real page */}
          {notifications.length > 0 && (
            <Link 
              href="/notifications" 
              className="btn-secondary btn-sm btn w-full mt-4"
            >
              View all notifications
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}