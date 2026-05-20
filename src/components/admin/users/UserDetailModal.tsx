'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Calendar,
  Building2,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { ModalShell } from '../ModalShell';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';
import { getDateLocale } from '@/utils/dateUtils';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'parent' | 'teacher' | 'manager' | 'admin' | 'super_admin';
  status: 'active' | 'suspended' | 'pending';
  createdAt: Date;
  lastLoginAt?: Date;
  loginCount: number;
  academyId?: string;
  academyName?: string;
}

interface UserDetailModalProps {
  user: AdminUser;
  onClose: () => void;
}

// One row from the activity_logs table — only the fields the modal renders.
interface UserActivityLog {
  id: string
  action_type: string
  description: string
  ip_address: string | null
  created_at: string
}

export function UserDetailModal({ user, onClose }: UserDetailModalProps) {
  const { t, language } = useTranslation();
  // Dropped the "settings" tab — its 8 buttons (Reset Password / Suspend /
  // Delete / Update Role / etc.) had no corresponding admin-user mutation
  // API. Reintroduce it as a real form once /api/admin/users supports
  // PATCH/DELETE.
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'permissions'>('overview');
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState<string | null>(null)

  // Fetch real admin activity that targeted this user. Lazy-loaded — only
  // runs the first time the user opens the Activity tab.
  useEffect(() => {
    if (activeTab !== 'activity' || activityLogs.length > 0 || activityLoading) return
    let cancelled = false
    const load = async () => {
      setActivityLoading(true)
      setActivityError(null)
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('id, action_type, description, ip_address, created_at')
          .eq('target_type', 'user')
          .eq('target_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
        if (cancelled) return
        if (error) throw error
        setActivityLogs((data as UserActivityLog[]) || [])
      } catch (e) {
        if (cancelled) return
        console.error('[UserDetailModal] activity load error:', e)
        setActivityError(e instanceof Error ? e.message : 'Failed to load activity')
      } finally {
        if (!cancelled) setActivityLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [activeTab, user.id, activityLogs.length, activityLoading])

  // Both badges go through the shared StatusBadge so colors / sizing / ring
  // treatment match the rest of the admin UI 1:1.
  const getStatusBadge = (status: string) => {
    const map: Record<string, { tone: StatusTone; icon: typeof CheckCircle; label: string }> = {
      active:    { tone: 'active',  icon: CheckCircle,   label: String(t('admin.users.statuses.active')) },
      suspended: { tone: 'danger',  icon: XCircle,       label: String(t('admin.users.statuses.suspended')) },
      pending:   { tone: 'pending', icon: AlertTriangle, label: String(t('admin.users.statuses.pending')) },
    }
    const entry = map[status]
    if (!entry) return null
    return <StatusBadge tone={entry.tone} icon={entry.icon}>{entry.label}</StatusBadge>
  };

  const getRoleBadge = (role: string) => {
    const map: Record<string, StatusTone> = {
      student:     'info',
      parent:      'violet',
      teacher:     'active',
      manager:     'pending',
      admin:       'brand',
      super_admin: 'brand',
    }
    // Localized role labels via the admin.users.roles namespace.
    const roleKey = role === 'super_admin' ? 'superAdmin' : role
    const label = String(t(`admin.users.roles.${roleKey}`))
    return (
      <StatusBadge tone={map[role] || 'muted'}>
        {label}
      </StatusBadge>
    )
  };

  // Maps activity_logs.action_type strings → icon. The action_type values
  // used in the system come from ActivityLogsManagement; anything new falls
  // back to the generic Activity icon.
  const getActivityIcon = (actionType: string) => {
    const a = actionType.toLowerCase()
    if (a.includes('suspend')) return <XCircle className="h-4 w-4 text-rose-500" />
    if (a.includes('unsuspend') || a.includes('activate')) return <CheckCircle className="h-4 w-4 text-emerald-500" />
    if (a.includes('user_modified') || a.includes('updated')) return <Activity className="h-4 w-4 text-[#2885e8]" />
    return <Activity className="h-4 w-4 text-gray-500" />
  };

  return (
    <ModalShell
      onClose={onClose}
      size="4xl"
      bodyClassName="p-0"
      title={
        <span className="inline-flex items-center gap-3">
          <span className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <span className="flex flex-col">
            <span className="text-xl font-semibold text-gray-900">{user.name}</span>
            <span className="text-sm font-normal text-gray-500">{user.email}</span>
          </span>
        </span>
      }
    >
      <div>
          {/* Tabs */}
          <div className="border-b border-gray-100">
            <div className="flex space-x-8 px-6">
              {/* Same tab styling as AnalyticsDashboard / SystemDashboard:
                  brand-blue text + a thin sliding underline pill instead of
                  a full-width border. */}
              {(['overview', 'activity', 'permissions'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative py-3 px-3 text-sm font-medium transition-colors ${
                    activeTab === tab ? 'text-[#1f6fc7]' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {String(t(`admin.users.tabs.${tab}`))}
                  {activeTab === tab && (
                    <span className="absolute -bottom-px left-2 right-2 h-0.5 bg-[#2885e8] rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* User Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{String(t('admin.users.userInformation'))}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <User className="mr-3 h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{String(t('admin.users.fullName'))}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Mail className="mr-3 h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.email}</p>
                          <p className="text-xs text-gray-500">{String(t('admin.users.emailAddress'))}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-3 h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.createdAt.toLocaleDateString(getDateLocale(language))}</p>
                          <p className="text-xs text-gray-500">{String(t('admin.users.accountCreated'))}</p>
                        </div>
                      </div>
                      {user.academyName && (
                        <div className="flex items-center">
                          <Building2 className="mr-3 h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.academyName}</p>
                            <p className="text-xs text-gray-500">{String(t('admin.users.academy'))}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{String(t('admin.users.accountStatus'))}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{String(t('admin.users.statusLabel'))}</span>
                        {getStatusBadge(user.status)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{String(t('admin.users.roleLabel'))}</span>
                        {getRoleBadge(user.role)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{String(t('admin.users.lastLogin'))}</span>
                        <span className="text-sm text-gray-900">
                          {user.lastLoginAt ? user.lastLoginAt.toLocaleDateString(getDateLocale(language)) : String(t('admin.common.never'))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{String(t('admin.users.loginCount'))}</span>
                        <span className="text-sm text-gray-900">{user.loginCount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* "Quick Stats" was previously a hardcoded card showing
                    fake Sessions / Completed / Hours numbers. Removed —
                    add it back as a real section once the user API exposes
                    per-user usage stats. */}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{String(t('admin.users.recentAdminActivity'))}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {String(t('admin.users.recentAdminActivityDesc'))}
                    </p>
                  </div>
                  {/* When the user is themselves an admin, offer a deep link
                      into the Activity Logs page filtered by them as actor.
                      Lets the reviewer see *their outgoing actions*, which
                      is the natural follow-up question. */}
                  {(user.role === 'admin' || user.role === 'super_admin') && (
                    <Link
                      href={`/admin/activity-logs?actor=${user.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#2885e8] hover:text-[#1f6cc4] whitespace-nowrap"
                      onClick={onClose}
                    >
                      {String(t('admin.users.viewAdminActions'))}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                {activityLoading && (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="bg-gray-50/60 ring-1 ring-gray-200/70 rounded-lg p-4 animate-pulse">
                        <div className="h-3 w-32 rounded bg-gray-200 mb-2" />
                        <div className="h-2.5 w-64 rounded bg-gray-200" />
                      </div>
                    ))}
                  </div>
                )}

                {!activityLoading && activityError && (
                  <div className="rounded-lg border border-rose-100 bg-rose-50/70 px-3.5 py-2.5 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-700">{activityError}</p>
                  </div>
                )}

                {!activityLoading && !activityError && activityLogs.length === 0 && (
                  <div className="bg-gray-50/60 ring-1 ring-gray-200/70 rounded-lg p-8 text-center">
                    <div className="w-10 h-10 rounded-full bg-white ring-1 ring-gray-200/70 flex items-center justify-center mx-auto mb-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">{String(t('admin.users.noAdminActivity'))}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {String(t('admin.users.noAdminActivityDesc'))}
                    </p>
                  </div>
                )}

                {!activityLoading && activityLogs.length > 0 && (
                  <div className="space-y-2">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="bg-gray-50/60 ring-1 ring-gray-200/70 rounded-lg p-3.5">
                        <div className="flex items-start gap-3">
                          {getActivityIcon(log.action_type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 capitalize">
                              {log.action_type.replace(/_/g, ' ')}
                            </p>
                            <p className="text-sm text-gray-600 mt-0.5">{log.description}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              <span>{new Date(log.created_at).toLocaleString(getDateLocale(language))}</span>
                              {log.ip_address && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <span>IP {log.ip_address}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'permissions' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">{String(t('admin.users.permissionsAccess'))}</h3>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">{String(t('admin.users.currentRoleLabel'))}{getRoleBadge(user.role)}</h4>
                    <p className="text-sm text-gray-600">
                      {String(t('admin.users.roleDescription'))}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">{String(t('admin.users.featureAccess'))}</h4>
                    {[
                      { feature: String(t('admin.users.features.dashboardAccess')), granted: true },
                      { feature: String(t('admin.users.features.userManagement')), granted: user.role === 'admin' || user.role === 'super_admin' },
                      { feature: String(t('admin.users.features.academySettings')), granted: ['manager', 'admin', 'super_admin'].includes(user.role) },
                      { feature: String(t('admin.users.features.financialReports')), granted: ['manager', 'admin', 'super_admin'].includes(user.role) },
                      { feature: String(t('admin.users.features.systemConfiguration')), granted: user.role === 'super_admin' }
                    ].map((access, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-sm text-gray-700">{access.feature}</span>
                        {access.granted ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
    </ModalShell>
  );
}