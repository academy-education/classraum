'use client'

/**
 * The 성/이름 input pair. One component, used by every surface that captures
 * a person's name: dashboard settings, signup, onboarding, the mobile
 * student/parent profile, and the re-prompt modal.
 *
 * DOM ORDER IS 성 THEN 이름 IN KOREAN, GIVEN THEN FAMILY IN ENGLISH.
 * This is real DOM order, not just swapped labels — tab order, screen-reader
 * order and autofill all follow the DOM, so relabelling alone would leave a
 * Korean user tabbing into the wrong box. The STORAGE order never changes
 * (family_name/given_name are fixed columns); only the presentation flips.
 *
 * Why the English side is "Given name"/"Family name" and not
 * "First name"/"Last name": the latter names a POSITION, and the position is
 * exactly what differs between the two scripts. Every read site that saw
 * "last name" would have to guess which convention produced it.
 *
 * VALIDATION IS PER FIELD. The old settings page shared a single
 * `validationErrors.name` between its two inputs, so a bad 성 lit up the 이름
 * box too. And `validation.nameTooShort` ("최소 2자") MUST NOT apply to 성:
 * a 1-character 성 is the normal Korean case (111 of 444 accounts are 김).
 *
 * The 성 field accepts 1-2 Hangul characters. That two-character allowance IS
 * the entire compound-surname solution — 남궁 and 황보 type themselves, with no
 * detection logic anywhere. (Measured: zero rows in the entire database begin
 * with a compound surname, so nothing needs detecting retroactively.)
 */

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  validateFamilyName,
  validateGivenName,
  FAMILY_NAME_MAX,
  GIVEN_NAME_MAX,
} from '@/lib/name'

export interface NameFieldsProps {
  familyName: string
  givenName: string
  onFamilyNameChange: (value: string) => void
  onGivenNameChange: (value: string) => void
  /** Per-field errors. Already-translated strings, or undefined. */
  familyNameError?: string
  givenNameError?: string
  /** 'korean' flips the visual order to 성 then 이름. */
  korean: boolean
  t: (key: string) => string
  disabled?: boolean
  required?: boolean
  /** Rendered under the pair, e.g. "we split this automatically — please check". */
  hint?: React.ReactNode
  idPrefix?: string
  className?: string
  autoFocusFirst?: boolean
}

export function NameFields({
  familyName,
  givenName,
  onFamilyNameChange,
  onGivenNameChange,
  familyNameError,
  givenNameError,
  korean,
  t,
  disabled,
  required,
  hint,
  idPrefix = 'name',
  className,
  autoFocusFirst,
}: NameFieldsProps) {
  const familyId = `${idPrefix}-family`
  const givenId = `${idPrefix}-given`

  const familyField = (
    <div key="family">
      <Label htmlFor={familyId} className="text-sm font-medium text-gray-700">
        {t('names.familyName')}
        {required && <span className="text-rose-500">*</span>}
      </Label>
      <Input
        id={familyId}
        name="family-name"
        // Korean 성 is 1-2 chars; Latin surnames can be long. maxLength is a
        // convenience stop, not the validation — validateFamilyName owns that.
        maxLength={FAMILY_NAME_MAX}
        autoComplete="family-name"
        type="text"
        disabled={disabled}
        autoFocus={autoFocusFirst && korean}
        value={familyName}
        aria-invalid={!!familyNameError}
        aria-describedby={familyNameError ? `${familyId}-error` : undefined}
        onChange={(e) => onFamilyNameChange(e.target.value)}
        className={cn('mt-1', familyNameError && 'border-rose-500 focus-visible:border-rose-500')}
        placeholder={t('names.familyNamePlaceholder')}
      />
      {familyNameError && (
        <p id={`${familyId}-error`} className="text-sm text-rose-600 mt-1">
          {familyNameError}
        </p>
      )}
    </div>
  )

  const givenField = (
    <div key="given">
      <Label htmlFor={givenId} className="text-sm font-medium text-gray-700">
        {t('names.givenName')}
        {required && <span className="text-rose-500">*</span>}
      </Label>
      <Input
        id={givenId}
        name="given-name"
        maxLength={GIVEN_NAME_MAX}
        autoComplete="given-name"
        type="text"
        disabled={disabled}
        autoFocus={autoFocusFirst && !korean}
        value={givenName}
        aria-invalid={!!givenNameError}
        aria-describedby={givenNameError ? `${givenId}-error` : undefined}
        onChange={(e) => onGivenNameChange(e.target.value)}
        className={cn('mt-1', givenNameError && 'border-rose-500 focus-visible:border-rose-500')}
        placeholder={t('names.givenNamePlaceholder')}
      />
      {givenNameError && (
        <p id={`${givenId}-error`} className="text-sm text-rose-600 mt-1">
          {givenNameError}
        </p>
      )}
    </div>
  )

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-4', className)}>
      {/* Real DOM order, so tab order and screen readers follow the locale. */}
      {korean ? [familyField, givenField] : [givenField, familyField]}
      {hint && <div className="sm:col-span-2 -mt-1">{hint}</div>}
    </div>
  )
}

/**
 * Validate both fields at once. Returns translation KEYS (or undefined) per
 * field — never a single shared error, which is what made the old form light
 * up both boxes for one bad value.
 */
export function validateNameFields(
  familyName: string,
  givenName: string
): { familyName?: string; givenName?: string; valid: boolean } {
  const f = validateFamilyName(familyName) ?? undefined
  const g = validateGivenName(givenName) ?? undefined
  return { familyName: f, givenName: g, valid: !f && !g }
}
