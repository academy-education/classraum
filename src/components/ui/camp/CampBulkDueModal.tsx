"use client"

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { AssignmentsDatePicker } from '@/components/ui/assignments/AssignmentsDatePicker'
import { authHeaders } from '@/lib/auth-headers'
import { campErrorMessage } from '@/lib/camp/error-codes'
import { useTranslation } from '@/hooks/useTranslation'
import { showSuccessToast } from '@/stores'
import { Loader2 } from 'lucide-react'

/**
 * Move the due date of several assignments in one classroom at once
 * (PATCH /api/camp/assignments with `ids`). The server checks the same
 * permission as the single edit for every id and moves all or none.
 */

interface BulkDueAssignment {
  id: string
  title: string
  due_at: string | null
}

interface CampBulkDueModalProps {
  classroomName: string
  assignments: BulkDueAssignment[]
  formatDate: (iso: string) => string
  onClose: () => void
  onSaved: () => void | Promise<void>
}

export function CampBulkDueModal({ classroomName, assignments, formatDate, onClose, onSaved }: CampBulkDueModalProps) {
  const { t, language } = useTranslation()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dueDate, setDueDate] = useState('')
  const [clearDue, setClearDue] = useState(false)
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allSelected = assignments.length > 0 && selected.size === assignments.length
  const canSave = selected.size > 0 && (clearDue || dueDate !== '') && !saving

  const sorted = useMemo(
    () => [...assignments].sort((a, b) => (a.due_at ?? '9999') < (b.due_at ?? '9999') ? -1 : 1),
    [assignments],
  )

  const toggle = (id: string, on: boolean) => setSelected(prev => {
    const next = new Set(prev)
    if (on) next.add(id)
    else next.delete(id)
    return next
  })

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/camp/assignments', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [...selected],
          // End of the chosen day, as the single edit does; null clears it.
          dueAt: clearDue ? null : new Date(`${dueDate}T23:59:59`).toISOString(),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(campErrorMessage(t, json, String(t('camp.bulkDue.failed'))))
        return
      }
      showSuccessToast(String(t('camp.bulkDue.saved', { count: json.updated ?? selected.size })))
      await onSaved()
      onClose()
    } catch {
      setError(String(t('camp.bulkDue.failed')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      isOpen
      onClose={() => { if (!saving) onClose() }}
      size="md"
      title={String(t('camp.bulkDue.title'))}
      subtitle={classroomName}
      closeDisabled={saving}
      footer={
        <ModalShell.Footer split>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={!canSave}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('camp.bulkDue.save', { count: selected.size })}
          </Button>
        </ModalShell.Footer>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground/80">{t('camp.bulkDue.pick')}</Label>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => setSelected(allSelected ? new Set() : new Set(assignments.map(a => a.id)))}
            >
              {allSelected ? t('camp.bulkDue.selectNone') : t('camp.bulkDue.selectAll')}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 rounded-lg ring-1 ring-gray-200">
            {sorted.map(a => (
              <label key={a.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                <Checkbox checked={selected.has(a.id)} onCheckedChange={on => toggle(a.id, on)} />
                <span className="flex-1 min-w-0 text-sm text-gray-900 truncate">{a.title}</span>
                <span className="text-xs text-gray-500 tabular-nums flex-shrink-0">
                  {a.due_at ? t('camp.dueDateLabel', { date: formatDate(a.due_at) }) : t('camp.bulkDue.noDue')}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground/80">{t('camp.bulkDue.newDate')}</Label>
          <AssignmentsDatePicker
            value={dueDate}
            onChange={(value) => { setDueDate(Array.isArray(value) ? value[0] : value); setClearDue(false) }}
            fieldId="camp_bulk_due_date"
            height="h-10"
            shadow="shadow-sm"
            placeholder={String(t('camp.form.dueDate'))}
            activeDatePicker={activeDatePicker}
            setActiveDatePicker={setActiveDatePicker}
            t={t}
            language={language}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <Checkbox checked={clearDue} onCheckedChange={on => { setClearDue(on); if (on) setDueDate('') }} />
            {t('camp.bulkDue.clear')}
          </label>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">{error}</div>
        )}
      </div>
    </ModalShell>
  )
}
