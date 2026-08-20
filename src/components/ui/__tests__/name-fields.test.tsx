/**
 * DOM-ORDER tests for <NameFields>.
 *
 * The order of these two inputs is the whole point of the component, and it
 * is the thing that was wrong in production: the old settings form used a
 * first-name/last-name pair whose Korean labels were 이름 then 성, while the
 * JSX rendered the first-name box first — so every Korean user saw 이름 then
 * 성, backwards. Those two locale keys are gone (this component replaced the
 * pair with 성/이름), which is why they are described here rather than named.
 *
 * Asserting the LABELS alone would not have caught that, and would not catch
 * a regression here either: labels can be right while the boxes are in the
 * wrong order. So these tests assert the actual document order of the input
 * elements, which is what tab order, screen readers and autofill follow.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { NameFields, validateNameFields } from '../name-fields'

// Identity translator: the test asserts STRUCTURE, not copy, so returning the
// key keeps it independent of whatever the locale files happen to say.
const t = (k: string) => k

function renderFields(korean: boolean) {
  return render(
    <NameFields
      familyName="김"
      givenName="영희"
      onFamilyNameChange={() => {}}
      onGivenNameChange={() => {}}
      korean={korean}
      t={t}
      idPrefix="test"
    />
  )
}

/** Document order of the two name inputs, by their `name` attribute. */
function inputOrder(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('input')).map((el) => el.getAttribute('name') ?? '')
}

describe('NameFields — DOM order follows the locale', () => {
  it('renders 성 BEFORE 이름 in Korean', () => {
    const { container } = renderFields(true)
    expect(inputOrder(container)).toEqual(['family-name', 'given-name'])
  })

  it('renders given BEFORE family in English', () => {
    const { container } = renderFields(false)
    expect(inputOrder(container)).toEqual(['given-name', 'family-name'])
  })

  it('flips real DOM order, not just labels', () => {
    const ko = renderFields(true)
    const koOrder = inputOrder(ko.container)
    ko.unmount()
    const en = renderFields(false)
    const enOrder = inputOrder(en.container)
    expect(koOrder).not.toEqual(enOrder)
    expect(koOrder).toEqual([...enOrder].reverse())
  })

  it('keeps each value bound to its own field regardless of order', () => {
    for (const korean of [true, false]) {
      const { container, unmount } = renderFields(korean)
      const family = container.querySelector('input[name="family-name"]') as HTMLInputElement
      const given = container.querySelector('input[name="given-name"]') as HTMLInputElement
      // The bug this guards: reordering by swapping the VALUES instead of the
      // elements, which silently stores 이름 into family_name.
      expect(family.value).toBe('김')
      expect(given.value).toBe('영희')
      unmount()
    }
  })
})

describe('NameFields — per-field errors', () => {
  it('shows an error on 성 only, leaving 이름 unmarked', () => {
    const { container } = render(
      <NameFields
        familyName=""
        givenName="영희"
        onFamilyNameChange={() => {}}
        onGivenNameChange={() => {}}
        korean
        t={t}
        idPrefix="test"
        familyNameError="validation.familyNameRequired"
      />
    )
    const family = container.querySelector('input[name="family-name"]')!
    const given = container.querySelector('input[name="given-name"]')!
    // The old form shared one validationErrors.name, so a bad 성 lit up both.
    // aria-invalid="false" is the correct ARIA for a valid field (React
    // stringifies the boolean), so 이름 asserts "false", not absent.
    expect(family.getAttribute('aria-invalid')).toBe('true')
    expect(given.getAttribute('aria-invalid')).toBe('false')
    expect(screen.getByText('validation.familyNameRequired')).toBeTruthy()
  })
})

describe('validateNameFields', () => {
  it('accepts a 1-character 성 — the normal Korean case', () => {
    expect(validateNameFields('김', '영희')).toEqual({
      familyName: undefined,
      givenName: undefined,
      valid: true,
    })
  })
  it('accepts a 2-character 복성', () => {
    expect(validateNameFields('남궁', '민수').valid).toBe(true)
  })
  it('reports each field independently', () => {
    const r = validateNameFields('', '')
    expect(r.familyName).toBe('validation.familyNameRequired')
    expect(r.givenName).toBe('validation.givenNameRequired')
    expect(r.valid).toBe(false)
  })
  it('does not fail a 1-character 성 with the old min-2 rule', () => {
    expect(validateNameFields('김', '구').familyName).toBeUndefined()
  })
})
