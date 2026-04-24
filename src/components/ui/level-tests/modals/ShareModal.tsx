"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { X, Copy, Check } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { showSuccessToast, showErrorToast } from '@/stores'
import { authHeaders } from '../hooks/authHeaders'
import type { Test } from '../types'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  test: Test
  testId: string
  onTestUpdate: (updater: (prev: Test) => Test) => void
}

export function ShareModal({ isOpen, onClose, test, testId, onTestUpdate }: ShareModalProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleToggleShare = async (enabled: boolean) => {
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/${testId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ share_enabled: enabled }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      onTestUpdate(prev => ({ ...prev, share_enabled: enabled, share_token: json.test.share_token }))
      showSuccessToast(String(t('common.success')))
    } catch {
      showErrorToast(String(t('levelTests.errors.shareFailed')))
    }
  }

  const handleCopyLink = async () => {
    if (!test?.share_token) return
    const url = `${window.location.origin}/test/${test.share_token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    showSuccessToast(String(t('levelTests.detail.shareCopied')))
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{String(t('levelTests.detail.share'))}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="space-y-5">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground/80">
                {String(t('levelTests.detail.shareEnable'))}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={test.share_enabled}
                onClick={() => handleToggleShare(!test.share_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  test.share_enabled ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    test.share_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>

            {test.share_enabled && test.share_token && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {String(t('levelTests.detail.shareLink'))}
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/test/${test.share_token}` : ''}
                    className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button variant="outline" size="sm" onClick={handleCopyLink} className="flex-shrink-0 h-10">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 border-t border-gray-200 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex-1"
          >
            {String(t('common.close'))}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
