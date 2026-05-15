"use client"

import React from 'react'
import { ModalShell } from '@/components/ui/common/ModalShell'
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

  const isDeactivating = student.active

  return (
    <ModalShell.Confirm
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`${isDeactivating ? t('students.makeInactive') : t('students.makeActive')} ${t('students.student')}`}
      message={isDeactivating
        ? `${t('students.makeInactiveConfirm', { name: student.name })} ${t('students.dataPreserved')}`
        : `${t('students.makeActiveConfirm', { name: student.name })} ${t('students.regainAccess')}`}
      variant={isDeactivating ? 'danger' : 'info'}
      confirmLabel={isDeactivating ? t('students.makeInactive') : t('students.makeActive')}
      cancelLabel={t('common.cancel')}
    />
  )
}
