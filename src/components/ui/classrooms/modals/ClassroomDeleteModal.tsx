"use client"

import { X } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
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
  handleDeleteConfirm,
}: ClassroomDeleteModalProps) {
  const { t } = useTranslation()

  if (!classroomToDelete) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">{t("classrooms.deleteConfirmTitle")}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <p className="text-sm text-gray-600">
            {t("classrooms.deleteConfirmMessage")}
          </p>
        </div>

        <div className="flex items-center gap-3 p-4 border-t border-gray-200 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex-1"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDeleteConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {t("classrooms.deleteConfirm")}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
