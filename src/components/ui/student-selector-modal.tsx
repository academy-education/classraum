"use client"

import React from 'react'
import { X, Check, Users } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'
import { Card } from '@/components/ui/card'

interface Student {
  id: string
  name: string
  email: string
  academy_id: string
}

interface StudentSelectorModalProps {
  isOpen: boolean
  onClose?: () => void
  students: Student[]
  onSelectStudent: (student: Student) => void
}

export function StudentSelectorModal({
  isOpen,
  onClose,
  students,
  onSelectStudent
}: StudentSelectorModalProps) {
  const { t } = useTranslation()
  const { selectedStudent } = useSelectedStudentStore()

  if (!isOpen) return null

  const handleSelectStudent = (student: Student) => {
    onSelectStudent(student)
    if (onClose) {
      onClose()
    }
  }

  // Compact-ish backdrop click handler — only closes if a close handler exists
  // (when the modal is forced — no onClose — clicking outside shouldn't dismiss it).
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onClose) {
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop — soft blur, matches profile modal pattern */}
      <div
        className="fixed inset-0 backdrop-blur-sm bg-black/20 z-[9998]"
        onClick={handleBackdropClick}
      />

      {/* Centered modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
        <Card className="w-full max-w-sm p-6 max-h-[80vh] overflow-y-auto pointer-events-auto relative">
          {/* Optional close button (only when dismissable) */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-gray-50 flex items-center justify-center transition-colors"
              aria-label={String(t('common.close'))}
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}

          {/* Header — matches profile modal pattern (icon chip + centered title + description) */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-violet-600" strokeWidth={1.75} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {t('studentSelector.title')}
            </h2>
            <p className="text-sm text-gray-500">
              {t('studentSelector.description')}
            </p>
          </div>

          {/* Student rows — soft palette, role-based avatar gradient, Check indicator */}
          <div className="space-y-2">
            {students.map((student) => {
              const isSelected = selectedStudent?.id === student.id
              const initials =
                student.name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || '?'

              return (
                <button
                  key={student.id}
                  onClick={() => handleSelectStudent(student)}
                  aria-pressed={isSelected}
                  className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'bg-primary/5 ring-1 ring-primary/30'
                      : 'bg-white ring-1 ring-gray-100 hover:bg-gray-50 hover:ring-gray-200'
                  }`}
                >
                  {/* Student-role gradient avatar with initials */}
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-white">{initials}</span>
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-gray-900 truncate">{student.name}</p>
                    <p className="text-xs text-gray-500 truncate">{student.email}</p>
                  </div>

                  {/* Check icon indicator instead of plain dot — clearer "selected" cue */}
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer hint — only when modal is forced (no onClose) */}
          {!onClose && students.length > 0 && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 text-center mt-5">
              {t('studentSelector.changeInfo')}
            </p>
          )}
        </Card>
      </div>
    </>
  )
}
