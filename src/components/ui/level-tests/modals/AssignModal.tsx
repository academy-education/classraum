"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateInput } from '@/components/ui/common/DateInput'
import { Modal } from '@/components/ui/modal'
import { X, Search, Check, Loader2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { showSuccessToast, showErrorToast } from '@/stores'
import { supabase } from '@/lib/supabase'
import { authHeaders } from '../hooks/authHeaders'
import type { Student } from '../types'

interface AssignModalProps {
  isOpen: boolean
  onClose: () => void
  academyId: string
  testId: string
}

export function AssignModal({ isOpen, onClose, academyId, testId }: AssignModalProps) {
  const { t } = useTranslation()
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [studentSearch, setStudentSearch] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assigning, setAssigning] = useState(false)

  const loadStudents = useCallback(async () => {
    const { data } = await supabase
      .from('students')
      .select('user_id, users(name, email)')
      .eq('academy_id', academyId)
    setStudents((data as unknown as Student[]) || [])
  }, [academyId])

  useEffect(() => {
    if (isOpen) {
      loadStudents()
      setStudentSearch('')
    }
  }, [isOpen, loadStudents])

  const filteredStudents = useMemo(() => {
    const searchLower = studentSearch.toLowerCase()
    if (!searchLower) return students
    return students.filter(s => (s.users?.name || '').toLowerCase().includes(searchLower))
  }, [students, studentSearch])

  const handleAssign = async () => {
    if (selectedStudents.size === 0) return
    setAssigning(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/${testId}/assign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          student_ids: Array.from(selectedStudents),
          due_date: dueDate || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showSuccessToast(
        String(t('levelTests.assignModal.assigned')).replace('{count}', String(selectedStudents.size))
      )
      onClose()
      setSelectedStudents(new Set())
      setDueDate('')
    } catch {
      showErrorToast(String(t('common.error')))
    } finally {
      setAssigning(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => !assigning && onClose()} size="lg">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{String(t('levelTests.assignModal.title'))}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => !assigning && onClose()}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {String(t('levelTests.assignModal.dueDate'))}
              </Label>
              <DateInput
                value={dueDate}
                onChange={setDueDate}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {String(t('levelTests.assignModal.selectStudents'))}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                <Input
                  type="text"
                  placeholder={String(t('levelTests.assignModal.searchPlaceholder'))}
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="h-10 pl-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="border border-border rounded-lg divide-y divide-gray-100 max-h-80 overflow-auto">
                {filteredStudents.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 text-center">—</div>
                ) : (
                  filteredStudents.map(s => {
                    const isSelected = selectedStudents.has(s.user_id)
                    return (
                      <button
                        key={s.user_id}
                        type="button"
                        onClick={() => {
                          setSelectedStudents(prev => {
                            const next = new Set(prev)
                            if (next.has(s.user_id)) next.delete(s.user_id)
                            else next.add(s.user_id)
                            return next
                          })
                        }}
                        className={`flex items-center gap-3 p-3 w-full text-left hover:bg-gray-50 cursor-pointer ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">{s.users?.name || '—'}</div>
                          <div className="text-xs text-gray-500 truncate">{s.users?.email || ''}</div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 border-t border-gray-200 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={assigning}
            className="flex-1"
          >
            {String(t('common.cancel'))}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleAssign}
            disabled={assigning || selectedStudents.size === 0}
            className="flex-1"
          >
            {assigning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {String(t('levelTests.assignModal.assigning'))}
              </>
            ) : (
              String(t('levelTests.assignModal.assign'))
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
