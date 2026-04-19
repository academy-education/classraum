"use client"

import { Loader2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
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
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t("assignments.deleteAssignment")}</h2>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <p className="text-gray-600">
            {t("assignments.deleteConfirmMessage")}
          </p>
        </div>
        <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {t("assignments.cancel")}
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            disabled={isSaving}
          >
            {isSaving && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {isSaving ? t("common.deleting") : t("assignments.deleteAssignment")}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
