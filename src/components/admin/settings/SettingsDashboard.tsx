'use client'

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Mail,
  User as UserIcon,
  Loader2,
  Check,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { performLogout } from '@/lib/logout';
import { useRouter } from 'next/navigation';
import { AdminPageHeader } from '../AdminPageHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { StatusBadge } from '../StatusBadge';
import { AdminSkeleton } from '../AdminSkeleton';
import { getAdminPermissions } from '@/lib/admin-auth';

interface AdminProfile {
  id: string
  email: string
  name: string
  role: 'admin' | 'super_admin'
  createdAt: string
}

/**
 * Real, scoped admin settings page.
 *
 * Old version was a fully-faked 6-tab settings UI (org info, theme picker,
 * env-var editor, etc.) where every form had hardcoded defaults and every
 * button was a no-op. The platform doesn't actually expose admin-level
 * settings yet, so the new page only shows what's real:
 *
 *   1. Account — the admin's own email / name / role + name update + sign out
 *   2. Permissions — the permission grid for the current role (read-only)
 *
 * When real platform settings exist (e.g. feature flags, maintenance mode),
 * add them here as proper sections with proper API calls.
 */
export function SettingsDashboard() {
  const { t } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: row, error: rowError } = await supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .eq('id', user.id)
        .single()

      if (rowError || !row) {
        setError('Could not load your profile.')
        return
      }
      if (row.role !== 'admin' && row.role !== 'super_admin') {
        setError('You don\'t have admin access.')
        return
      }

      const p: AdminProfile = {
        id: row.id,
        email: row.email,
        name: row.name || '',
        role: row.role,
        createdAt: row.created_at,
      }
      setProfile(p)
      setName(p.name)
    } catch (e) {
      console.error('[SettingsDashboard] loadProfile error:', e)
      setError(e instanceof Error ? e.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveName = async () => {
    if (!profile) return
    if (name.trim() === profile.name) return // nothing changed
    setSaving(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ name: name.trim() })
        .eq('id', profile.id)
      if (updateError) throw updateError
      setProfile({ ...profile, name: name.trim() })
      setSavedAt(Date.now())
      // Auto-clear "Saved" indicator after a moment
      setTimeout(() => setSavedAt(null), 2500)
    } catch (e) {
      console.error('[SettingsDashboard] handleSaveName error:', e)
      setError(e instanceof Error ? e.message : 'Could not save your name.')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await performLogout()
      router.replace('/auth')
    } catch (e) {
      console.error('[SettingsDashboard] sign out error:', e)
      try { await supabase.auth.signOut() } catch { /* ignore */ }
      router.replace('/auth')
    }
  }

  if (loading) {
    // Settings header is real even during load — match other admin pages.
    return (
      <div className="space-y-6">
        <AdminPageHeader
          kicker={String(t('admin.settings.kicker'))}
          title={String(t('admin.settings.title'))}
          description={String(t('admin.settings.subtitle'))}
        />
        <AdminSkeleton.List rows={3} />
        <AdminSkeleton.Table rows={5} cols={2} />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-rose-400 mb-3" />
        <p className="text-sm font-medium text-gray-900">{error || 'Could not load your profile.'}</p>
        <Button onClick={loadProfile} variant="outline" className="mt-4">Retry</Button>
      </div>
    )
  }

  const permissions = getAdminPermissions(profile.role)
  // Friendly labels for the permission keys.
  const permissionLabels: Record<string, string> = {
    viewDashboard:           'View dashboard',
    manageAcademies:         'Manage academies',
    viewSubscriptions:       'View subscriptions',
    manageBilling:           'Manage billing',
    viewSupport:             'View support',
    manageSupport:           'Manage support',
    viewAnalytics:           'View analytics',
    manageUsers:             'Manage users',
    viewSettlements:         'View settlements',
    managePartnerSettings:   'Manage partner settings',
    manageSystem:            'Manage system',
    viewSystemLogs:          'View system logs',
    manageAdminUsers:        'Manage admin users',
    accessSensitiveSettings: 'Access sensitive settings',
  }

  const dirty = name.trim() !== profile.name

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={String(t('admin.settings.kicker'))}
        title={String(t('admin.settings.title'))}
        description={String(t('admin.settings.subtitle'))}
      />

      {/* Account section */}
      <section className="bg-white rounded-xl ring-1 ring-gray-200/70 overflow-hidden">
        <header className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{String(t('admin.settings.profile'))}</h2>
          <p className="text-xs text-gray-500 mt-0.5">Visible only to admins. Email and role are managed elsewhere.</p>
        </header>

        <div className="p-6 grid gap-6 sm:grid-cols-2">
          {/* Avatar */}
          <div className="sm:col-span-2 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2885e8] to-[#1f6fc7] flex items-center justify-center text-white font-semibold text-lg shadow-sm shadow-[#2885e8]/20">
              {(profile.name || profile.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">{profile.name || profile.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge tone="brand" icon={ShieldCheck} size="sm">
                  {profile.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </StatusBadge>
                <span className="text-xs text-gray-500">
                  Member since {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="admin-name" className="text-xs font-medium text-gray-700 tracking-wide">
              Name
            </Label>
            <div className="relative mt-1.5">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                id="admin-name"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={saving}
                placeholder="Your name"
                className="pl-10 h-10"
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <Label htmlFor="admin-email" className="text-xs font-medium text-gray-700 tracking-wide">
              Email
            </Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                id="admin-email"
                value={profile.email}
                readOnly
                className="pl-10 h-10 bg-gray-50 cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Contact a super admin to change your sign-in email.
            </p>
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-4 rounded-lg border border-rose-100 bg-rose-50/70 px-3.5 py-2.5 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {savedAt && Date.now() - savedAt < 3000 ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            ) : dirty ? (
              <span className="text-amber-700">Unsaved changes</span>
            ) : null}
          </p>
          <Button
            onClick={handleSaveName}
            disabled={!dirty || saving}
            size="sm"
            className="gap-1.5"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : 'Save changes'}
          </Button>
        </div>
      </section>

      {/* Permissions section */}
      <section className="bg-white rounded-xl ring-1 ring-gray-200/70 overflow-hidden">
        <header className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Permissions</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            What your <span className="font-medium text-gray-700">{profile.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span> role grants. Read-only.
          </p>
        </header>
        <ul className="divide-y divide-gray-100">
          {Object.entries(permissions).map(([key, granted]) => (
            <li key={key} className="px-6 py-3 flex items-center justify-between text-sm">
              <span className="text-gray-700">{permissionLabels[key] || key}</span>
              {granted ? (
                <StatusBadge tone="active" icon={Check} size="sm">Granted</StatusBadge>
              ) : (
                <StatusBadge tone="muted" size="sm">Not granted</StatusBadge>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Sign-out section */}
      <section className="bg-white rounded-xl ring-1 ring-gray-200/70 px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Sign out</h2>
          <p className="text-xs text-gray-500 mt-0.5">End this admin session on this device.</p>
        </div>
        <Button
          onClick={handleSignOut}
          disabled={signingOut}
          variant="outline"
          size="sm"
          className="gap-1.5 text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200"
        >
          {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Sign out
        </Button>
      </section>
    </div>
  )
}
