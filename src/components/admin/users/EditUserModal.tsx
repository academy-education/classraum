'use client'

import React, { useState } from 'react'
import { Loader2, UserCog, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ModalShell } from '../ModalShell'
import { useAdminFetch } from '../useAdminFetch'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * EditUserModal — narrow editor for the only user field that's actually
 * mutable from the admin section: `role`. Name / email aren't editable
 * because they live partly in `auth.users` (email) and partly in `users`
 * (name) and changing the auth email needs a confirmation flow we don't
 * have yet.
 *
 * The role select hides `admin` / `super_admin` unless the caller is
 * super_admin — the API enforces the same rule but we mirror it client-side
 * so non-super admins don't see options that always reject.
 *
 * On success the parent reloads its list (`onSaved`) and the modal closes.
 */

const ROLES_BASE = ['student', 'parent', 'teacher', 'manager'] as const
const ROLES_ELEVATED = ['admin', 'super_admin'] as const

export interface EditUserTarget {
  id: string
  name: string
  email: string
  role: string
}

export interface EditUserModalProps {
  user: EditUserTarget
  /** Caller's role — gates which options appear in the role select. */
  callerRole: string
  /** True if the modal is editing the caller themselves. Disables submit. */
  isSelf: boolean
  onClose: () => void
  onSaved: () => void
}

export function EditUserModal({ user, callerRole, isSelf, onClose, onSaved }: EditUserModalProps) {
  const adminFetch = useAdminFetch()
  const { t } = useTranslation()
  const [role, setRole] = useState(user.role)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canAssignElevated = callerRole === 'super_admin'
  const allRoles = canAssignElevated
    ? [...ROLES_BASE, ...ROLES_ELEVATED]
    : ROLES_BASE
  // Always include the user's current role even if the caller can't normally
  // assign it — otherwise a regular admin opening an existing super_admin
  // would see an empty select.
  const visibleRoles = allRoles.includes(user.role as any)
    ? allRoles
    : [user.role, ...allRoles]

  const dirty = role !== user.role

  const handleSave = async () => {
    if (!dirty || saving || isSelf) return
    setSaving(true)
    setError(null)
    try {
      const response = await adminFetch('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ id: user.id, role }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || String(t('admin.users.updateFailed')))
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message || String(t('admin.users.failedToUpdate')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      onClose={saving ? () => {} : onClose}
      title={
        <span className="inline-flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          {String(t('admin.users.editUserTitle'))}
        </span>
      }
      disableBackdropClose={saving}
      footer={
        <>
          <Button onClick={onClose} disabled={saving} variant="outline">
            {String(t('admin.common.cancel'))}
          </Button>
          <Button onClick={handleSave} disabled={!dirty || saving || isSelf}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {String(t('admin.common.saving'))}
              </>
            ) : (
              String(t('admin.users.saveChanges'))
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isSelf && (
          <div className="bg-amber-50 ring-1 ring-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              {String(t('admin.users.editSelfWarning'))}
            </p>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-3 space-y-1 ring-1 ring-gray-100">
          <div className="text-sm font-medium text-gray-900">{user.name}</div>
          <div className="text-xs text-gray-500 break-all">{user.email}</div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">{String(t('admin.users.roleLabel'))}</label>
          <Select value={role} onValueChange={setRole} disabled={saving || isSelf}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibleRoles.map(r => (
                <SelectItem key={r} value={r}>
                  {String(t(`admin.users.roles.${r === 'super_admin' ? 'superAdmin' : r}`))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!canAssignElevated && (
            <p className="text-xs text-gray-500">
              {String(t('admin.users.elevatedRoleNote'))}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 ring-1 ring-rose-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}
      </div>
    </ModalShell>
  )
}
