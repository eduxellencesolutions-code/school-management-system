'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { 
  Shield, 
  Lock, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  Eye,
  EyeOff,
  LogOut,
  Smartphone,
  Key
} from 'lucide-react'
import Link from 'next/link'

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // User info state
  const [userInfo, setUserInfo] = useState<{
    email: string
    created_at: string
  } | null>(null)

  // Load user info on mount
  useState(() => {
    async function loadUserInfo() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserInfo({
          email: user.email || 'No email set',
          created_at: user.created_at || new Date().toISOString(),
        })
      }
    }
    loadUserInfo()
  })

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate passwords
    if (!passwordForm.currentPassword) {
      toast.error('Current password is required')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })

      if (error) throw error

      toast.success('Password updated successfully!')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error) {
      console.error('Password update error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out?')) return
    
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('⚠️ Are you sure you want to delete your account? This action cannot be undone!')) return
    if (!confirm('This will permanently delete all your data. Type "DELETE" to confirm.')) return

    toast.error('Account deletion is not available in this demo. Please contact support.')
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="page-title">Account Settings</h1>
        <p className="page-subtitle">
          Manage your account security, password, and session settings.
        </p>
      </div>

      {/* Account Information */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Shield size={16} className="text-brand-500" />
          <h2 className="font-semibold text-sm text-ink">Account Information</h2>
        </div>
        <div className="card-body">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
              <Mail size={16} className="text-ink-faint" />
              <div>
                <p className="text-xs text-ink-faint">Email Address</p>
                <p className="text-sm text-ink">{userInfo?.email || 'Loading...'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
              <Calendar size={16} className="text-ink-faint" />
              <div>
                <p className="text-xs text-ink-faint">Account Created</p>
                <p className="text-sm text-ink">
                  {userInfo?.created_at ? formatDate(userInfo.created_at) : 'Loading...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
              <CheckCircle2 size={16} className="text-green-500" />
              <div>
                <p className="text-xs text-ink-faint">Account Status</p>
                <p className="text-sm text-green-600 font-medium">Active</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Lock size={16} className="text-brand-500" />
          <h2 className="font-semibold text-sm text-ink">Change Password</h2>
        </div>
        <form onSubmit={handlePasswordChange} className="card-body flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="input pr-10"
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="input pr-10"
                placeholder="Min. 8 characters"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="input pr-10"
                placeholder="Confirm new password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary btn self-start"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Session Management */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Smartphone size={16} className="text-brand-500" />
          <h2 className="font-semibold text-sm text-ink">Session Management</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-ink-muted mb-4">
            Sign out of your current session or log out of all devices.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleSignOut}
              className="btn-secondary btn flex items-center gap-2"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication (Placeholder) */}
      <div className="card border-brand-200 bg-brand-50">
        <div className="card-header flex items-center gap-2">
          <Key size={16} className="text-brand-500" />
          <h2 className="font-semibold text-sm text-ink">Two-Factor Authentication</h2>
          <span className="badge badge-blue text-[10px] ml-auto">Coming Soon</span>
        </div>
        <div className="card-body">
          <p className="text-sm text-ink-muted">
            Add an extra layer of security to your account by enabling two-factor authentication.
            This feature will be available in a future update.
          </p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200">
        <div className="card-header flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" />
          <h2 className="font-semibold text-sm text-red-600">Danger Zone</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-ink-muted mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="btn btn-sm bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}