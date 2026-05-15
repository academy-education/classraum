"use client"

import { useRouter } from 'next/navigation'
import { ModalShell } from '@/components/ui/common/ModalShell'
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
      router.push('/exams-and-scores')
    } catch {
      showErrorToast(String(t('levelTests.errors.deleteFailed')))
    }
  }

  return (
    <ModalShell.Confirm
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleDelete}
      title={String(t('levelTests.detail.delete'))}
      message={String(t('levelTests.detail.confirmDelete'))}
      variant="danger"
      confirmLabel={String(t('common.delete'))}
      cancelLabel={String(t('common.cancel'))}
    />
  )
}
