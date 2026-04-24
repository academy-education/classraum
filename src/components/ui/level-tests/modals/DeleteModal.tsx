"use client"

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { X } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { showSuccessToast, showErrorToast } from '@/stores'
import { authHeaders } from '../hooks/authHeaders'

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  testId: string
}

export function DeleteModal({ isOpen, onClose, testId }: DeleteModalProps) {
  const { t } = useTranslation()
  const router = useRouter()

  const handleDelete = async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/${testId}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error('Delete failed')
      showSuccessToast(String(t('common.delete')))
      router.push('/level-tests')
    } catch {
      showErrorToast(String(t('levelTests.errors.deleteFailed')))
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">{String(t('levelTests.detail.delete'))}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <p className="text-sm text-gray-600">{String(t('levelTests.detail.confirmDelete'))}</p>
        </div>

        <div className="flex items-center gap-3 p-4 border-t border-gray-200 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex-1"
          >
            {String(t('common.cancel'))}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDelete}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {String(t('common.delete'))}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
