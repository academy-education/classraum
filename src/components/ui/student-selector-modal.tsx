"use client"

import React from 'react'
import { X, User } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {t('studentSelector.title')}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-gray-600 mb-6">
          {t('studentSelector.description')}
        </p>

        <div className="space-y-3">
          {students.map((student) => (
            <button
              key={student.id}
              onClick={() => handleSelectStudent(student)}
              className={`w-full p-4 rounded-lg border-2 transition-all hover:shadow-md flex items-center gap-3 ${
                selectedStudent?.id === student.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="p-2 bg-gray-100 rounded-full">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">{student.name}</p>
                <p className="text-sm text-gray-500">{student.email}</p>
              </div>
              {selectedStudent?.id === student.id && (
                <div className="ml-auto">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                </div>
              )}
            </button>
          ))}
        </div>

        {!onClose && students.length > 0 && (
          <p className="text-xs text-gray-500 mt-6 text-center">
            {t('studentSelector.changeInfo')}
          </p>
        )}
      </div>
    </div>
  )
}