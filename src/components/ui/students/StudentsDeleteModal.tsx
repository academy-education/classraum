"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
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
  if (!student) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
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
        </div>
        <div className="flex gap-3 p-6 pt-0 flex-shrink-0">
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
    </Modal>
  )
}
