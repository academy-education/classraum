"use client"

import { useTranslation } from '@/hooks/useTranslation'
import { ModalShell } from '@/components/ui/common/ModalShell'
import type { Classroom } from '@/components/ui/classrooms/hooks/useClassroomsData'

interface ClassroomDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  classroomToDelete: Classroom | null
  isSaving: boolean
  handleDeleteConfirm: () => void | Promise<void>
}

export function ClassroomDeleteModal({
  isOpen,
  onClose,
  classroomToDelete,
  isSaving,
  handleDeleteConfirm,
}: ClassroomDeleteModalProps) {
  const { t } = useTranslation()

  if (!classroomToDelete) return null

  return (
    <ModalShell.Confirm
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => handleDeleteConfirm()}
      title={String(t("classrooms.deleteConfirmTitle"))}
      message={String(t("classrooms.deleteConfirmMessage"))}
      variant="danger"
      confirmLabel={String(t("classrooms.deleteConfirm"))}
      cancelLabel={String(t("common.cancel"))}
      loading={isSaving}
    />
  )
}
