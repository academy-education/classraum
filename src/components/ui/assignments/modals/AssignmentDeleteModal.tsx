"use client"

import { useTranslation } from '@/hooks/useTranslation'
import { ModalShell } from '@/components/ui/common/ModalShell'
import type { Assignment } from '@/components/ui/assignments/hooks/useAssignmentsData'

interface AssignmentDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  assignmentToDelete: Assignment | null
  isSaving: boolean
  handleDeleteConfirm: () => void | Promise<void>
}

export function AssignmentDeleteModal({
  isOpen,
  onClose,
  assignmentToDelete,
  isSaving,
  handleDeleteConfirm,
}: AssignmentDeleteModalProps) {
  const { t } = useTranslation()

  if (!assignmentToDelete) return null

  return (
    <ModalShell.Confirm
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => handleDeleteConfirm()}
      title={String(t("assignments.deleteAssignment"))}
      message={String(t("assignments.deleteConfirmMessage"))}
      variant="danger"
      confirmLabel={isSaving ? String(t("common.deleting")) : String(t("assignments.deleteAssignment"))}
      cancelLabel={String(t("common.cancel"))}
      loading={isSaving}
    />
  )
}
