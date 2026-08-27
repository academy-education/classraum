"use client"

/**
 * The blocking first-run step for a social signup.
 *
 * Google, Kakao and Apple hand over an email and, at best, a display
 * name. They never hand over a phone number — Google and Apple have no
 * such scope, and Kakao's `phone_number` needs its own consent approval.
 * So a social account arrives with `users.phone` NULL and a name that is
 * often a Kakao nickname rather than a real one. This asks, once, at the
 * moment the user is paying attention.
 *
 * THIS ONE *IS* A WALL — deliberately, and unlike the older name
 * re-prompt next door, whose header says "NOTHING HERE IS A WALL".
 *
 * The difference is who it can reach. That prompt faces 43% of the whole
 * user base, so blocking would lock out half the customers. This one
 * fires only for accounts created through a provider (see
 * needsSocialOnboarding, whose gate is the social identity and NOT the
 * missing field — 392 of 448 existing accounts have a NULL phone and
 * must never see this). A brand-new social account has nothing to lose
 * by finishing signup, which is what this is.
 *
 * Consequently: no X, no Escape, no backdrop dismissal. The only ways
 * out are completing it or signing out, and sign-out is offered so it can
 * never become a trap.
 */

import { useEffect, useMemo, useState } from 'react'
import { db } from '@/lib/supabase'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { NameFields, validateNameFields } from '@/components/ui/name-fields'
import { splitName } from '@/lib/name'
import { isPlausiblePhone } from '@/lib/auth/phone'
import { prefillFromProvider } from '@/lib/auth/social-onboarding'
import { bumpProfileRefresh } from '@/lib/ui/profile-refresh'

export interface SocialOnboardingModalProps {
  isOpen: boolean
  /** Provider metadata for prefill. Untrusted — a convenience only. */
  userMetadata: Record<string, unknown> | null | undefined
  /** Called after a successful write, so the host can re-read the user. */
  onCompleted: () => void
}

export function SocialOnboardingModal({
  isOpen,
  userMetadata,
  onCompleted,
}: SocialOnboardingModalProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { toast } = useToast()
  const korean = language === 'korean'

  const prefill = useMemo(() => prefillFromProvider(userMetadata), [userMetadata])

  const [familyName, setFamilyName] = useState('')
  const [givenName, setGivenName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<{ familyName?: string; givenName?: string; phone?: string }>({})
  const [saving, setSaving] = useState(false)

  /* Seed from the provider ONCE per open. Re-running on every render
     would fight the user's own typing. */
  useEffect(() => {
    if (!isOpen) return
    const split = prefill.name ? splitName(prefill.name) : null
    if (split) {
      setFamilyName(split.family_name)
      setGivenName(split.given_name)
    } else if (prefill.name) {
      // Unsplittable — a single-token nickname, say. Put it in the given
      // name rather than guessing a surname out of it.
      setGivenName(prefill.name)
    }
    if (prefill.phone && isPlausiblePhone(prefill.phone)) setPhone(prefill.phone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const submit = async () => {
    const nameCheck = validateNameFields(familyName, givenName)
    const phoneOk = isPlausiblePhone(phone)
    if (!nameCheck.valid || !phoneOk) {
      setErrors({
        familyName: nameCheck.familyName,
        givenName: nameCheck.givenName,
        phone: phoneOk ? undefined : String(t('auth.socialOnboarding.phoneInvalid')),
      })
      return
    }
    setErrors({})
    setSaving(true)
    try {
      const res = await fetch('/api/auth/complete-social-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ familyName, givenName, phone }),
      })
      if (!res.ok) {
        // The server re-validates, so a rejection here is real. Surfaced
        // rather than swallowed: a silently failed save would leave the
        // user staring at a modal that will not close.
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        toast({
          title: String(t('auth.socialOnboarding.saveFailedTitle')),
          description: String(
            body.error === 'phone_invalid'
              ? t('auth.socialOnboarding.phoneInvalid')
              : t('auth.socialOnboarding.saveFailedBody'),
          ),
          variant: 'destructive',
        })
        return
      }
      /* Announce AFTER the write succeeded, never before: any screen
         already holding a copy of this user's row — the profile page
         most of all — re-reads and stops showing the provider nickname
         and an empty phone. */
      bumpProfileRefresh()
      onCompleted()
    } catch {
      toast({
        title: String(t('auth.socialOnboarding.saveFailedTitle')),
        description: String(t('auth.socialOnboarding.saveFailedBody')),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      isOpen={isOpen}
      /* Required: there is no dismissal. onClose is part of the shell's
         API and must exist, so it is a deliberate no-op rather than a
         handler that half-closes the wall. */
      onClose={() => {}}
      hideCloseButton
      size="md"
      title={t('auth.socialOnboarding.title')}
      subtitle={t('auth.socialOnboarding.subtitle')}
      footer={
        <ModalShell.Footer justify="between">
          {/* Sign out is the escape hatch. Without it a user who cannot
              complete this — wrong account, say — would be stuck with no
              way back to the auth page. */}
          <Button
            variant="ghost"
            disabled={saving}
            onClick={async () => {
              await db.auth.signOut().catch(() => {})
              window.location.href = '/auth'
            }}
          >
            {t('auth.socialOnboarding.signOut')}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? t('auth.socialOnboarding.saving') : t('auth.socialOnboarding.submit')}
          </Button>
        </ModalShell.Footer>
      }
    >
      <div className="space-y-5">
        <NameFields
          familyName={familyName}
          givenName={givenName}
          onFamilyNameChange={setFamilyName}
          onGivenNameChange={setGivenName}
          familyNameError={errors.familyName}
          givenNameError={errors.givenName}
          korean={korean}
          t={t}
          disabled={saving}
          required
          idPrefix="social-onboarding"
          autoFocusFirst
        />

        <div className="space-y-1.5">
          <Label htmlFor="social-onboarding-phone">
            {t('auth.socialOnboarding.phoneLabel')} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="social-onboarding-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            disabled={saving}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={String(t('auth.socialOnboarding.phonePlaceholder'))}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'social-onboarding-phone-error' : undefined}
          />
          {errors.phone ? (
            <p id="social-onboarding-phone-error" className="text-xs text-red-600">
              {errors.phone}
            </p>
          ) : (
            /* Say WHY we are asking for something the provider did not
               give us, so it does not read as an arbitrary gate. */
            <p className="text-xs text-muted-foreground">
              {t('auth.socialOnboarding.phoneHint')}
            </p>
          )}
        </div>
      </div>
    </ModalShell>
  )
}
