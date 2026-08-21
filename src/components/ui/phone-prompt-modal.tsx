"use client"

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Phone } from 'lucide-react'
import { isPlausiblePhone, normalizePhone } from '@/lib/auth/phone'

/**
 * Ask for a phone number at the moment it is actually needed.
 *
 * Signup no longer collects one — a social signup has no form to collect
 * it in, and `users.phone` is nullable. Checkout is the one place the
 * number is genuinely required (Inicis V2 will not open the card window
 * without `customer.phoneNumber`), so it is asked for here, once, and
 * persisted so it is never asked for again.
 *
 * The old behaviour at this point was a dead end: "A phone number is
 * required for payment. Please add one in your Profile first." — an error
 * message that asks the user to leave, find a settings page, come back
 * and start the purchase over.
 *
 * IT WRITES `users.phone` ONLY. The role tables (students/parents/…) keep
 * their own `phone` column, and this deliberately does not touch them:
 * `billingCustomer()` reads `users.phone`, that is the column checkout
 * consults, and fanning a write out across four tables from a payment
 * dialog is how those columns disagree with each other.
 */

export interface PhonePromptModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called with the saved number once it is persisted. */
  onSaved: (phone: string) => void
  userId: string | undefined
  t: (key: string, params?: Record<string, string | number | undefined>) => string
  initialValue?: string
}

export function PhonePromptModal({
  isOpen,
  onClose,
  onSaved,
  userId,
  t,
  initialValue,
}: PhonePromptModalProps) {
  const [value, setValue] = useState(initialValue ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = isPlausiblePhone(value)

  const save = async () => {
    const phone = normalizePhone(value)
    if (!phone || !userId) return
    setSaving(true)
    setError(null)
    /* `db` is imported HERE rather than at module scope.
     *
     * This dialog is mounted by the study subscription page, whose test
     * suites mock the purchase helpers and never load the real Supabase
     * client — and @supabase/realtime-js ships untranspiled TS that jest
     * cannot parse, so a top-level import turns three existing suites
     * into "failed to run". Those suites still print their other passes,
     * which is exactly the green-next-to-a-dead-suite failure CLAUDE.md
     * warns about. Deferring the import to the click keeps the module
     * graph clean without editing anybody else's mocks. */
    const { db } = await import('@/lib/supabase')
    // CHECKED. supabase-js resolves with { error } rather than throwing,
    // so an un-destructured await here would close the dialog, report
    // success, and send the user straight back into a checkout that
    // still has no phone number.
    const { error: updateError } = await db
      .from('users')
      .update({ phone })
      .eq('id', userId)
    setSaving(false)
    if (updateError) {
      console.error('[PhonePrompt] failed to save phone:', updateError)
      setError(t('auth.social.phone.saveFailed'))
      return
    }
    onSaved(phone)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('auth.social.phone.title')}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('auth.social.phone.body')}
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground/80">
            {t('auth.form.labels.phone')}
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="tel"
              autoFocus
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError(null)
              }}
              placeholder={String(t('auth.form.placeholders.phone'))}
              className="pl-10"
            />
          </div>
          {value.trim() !== '' && !valid && (
            <p className="text-xs text-rose-600">{t('auth.social.phone.invalid')}</p>
          )}
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            {t('auth.social.phone.cancel')}
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={!valid || saving || !userId}
            onClick={save}
          >
            {t('auth.social.phone.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
