"use client"

import { useTranslation } from '@/hooks/useTranslation'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy } from 'lucide-react'
import { NonFunctional } from './NonFunctional'

/**
 * Live preview of the Share Test modal — mirrors
 * level-tests/modals/ShareModal.tsx. Toggle is shown ON and the share
 * link + copy button are visible so users see the full state, not a
 * collapsed "enable to share" prompt.
 */
export function LevelTestShareDemo() {
  const { t } = useTranslation()
  const shareUrl = 'https://app.classraum.com/test/4f9c2a1b'

  return (
    <NonFunctional>
      <ModalShell
        isOpen
        inline
        onClose={() => undefined}
        size="lg"
        title={String(t('levelTests.detail.share'))}
        footer={
          <ModalShell.Footer>
            <Button type="button" variant="outline">
              {String(t('common.close'))}
            </Button>
          </ModalShell.Footer>
        }
      >
        <div className="space-y-5">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground/80">
              {String(t('levelTests.detail.shareEnable'))}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={true}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary"
            >
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
            </button>
          </label>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {String(t('levelTests.detail.shareLink'))}
            </Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button variant="outline" size="sm" className="flex-shrink-0 h-10">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </ModalShell>
    </NonFunctional>
  )
}
