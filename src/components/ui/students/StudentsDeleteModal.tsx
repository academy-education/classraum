"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Student } from '@/hooks/useStudentData'

interface StudentsDeleteModalProps {
  isOpen: boolean
  student: Student | null
  t: (key: string, params?: Record<string, string | number | undefined>) => string
  onClose: () => void
  onConfirm: () => void
}

export function StudentsDeleteModal({
  isOpen,
  student,
  t,
  onClose,
  onConfirm
}: StudentsDeleteModalProps) {
  if (!isOpen || !student) return null

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {student.active ? t('students.makeInactive') : t('students.makeActive')} {t('students.student')}
          </h2>
          <p className="text-gray-600 mb-6">
            {student.active ? (
              <span>
                {t('students.makeInactiveConfirm', { name: student.name })} {t('students.dataPreserved')}
              </span>
            ) : (
              <span>
                {t('students.makeActiveConfirm', { name: student.name })} {t('students.regainAccess')}
              </span>
            )}
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={onConfirm}
              className={`flex-1 text-white ${student.active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {student.active ? t('students.makeInactive') : t('students.makeActive')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}