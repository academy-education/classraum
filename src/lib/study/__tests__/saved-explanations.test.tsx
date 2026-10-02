/**
 * "Explain more" must never be served a pre-2026-10-01 "Explain simply" text.
 *
 * e2bafd45 replaced the prompt but kept the storage key `simpler`, so the
 * wrong-answer notebook re-showed seven old texts (four in 반말) under the new
 * label. The cache is now versioned by column: the new mode reads and writes
 * `more`, and `simpler` is left in the table, unread.
 */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { readFileSync } from 'fs'
import { join } from 'path'
import { savedFromRow, SAVED_EXPLANATION_SELECT, EMPTY_SAVED } from '../saved-explanations'

jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))
jest.mock('@/lib/nativeHaptics', () => ({ hapticSelection: jest.fn() }))

import { ExplainMore } from '@/app/mobile/study/_shared/ExplainMore'

/** A real-shaped pre-change row: only the retired column is filled. */
const PRE_CHANGE_ROW = {
  attempt_id: 'a1', language: 'ko', steps: null,
  simpler: '이 문제는 쉽게 말하면 B가 답이야. 지문에서 그렇게 말하거든.',
  followup: null, followup_question: null,
}

describe('saved explanation cache is prompt-versioned', () => {
  it('a cached pre-change row yields NO "Explain more" text', () => {
    const saved = savedFromRow(PRE_CHANGE_ROW)
    expect(saved.more).toBeNull()
    expect(Object.values(saved)).not.toContain(PRE_CHANGE_ROW.simpler)
  })

  it('a post-change row is returned for the new mode', () => {
    expect(savedFromRow({ ...PRE_CHANGE_ROW, more: 'B가 정답이에요.' }).more).toBe('B가 정답이에요.')
  })

  it('the loader never selects the retired column', () => {
    const cols = SAVED_EXPLANATION_SELECT.split(',').map(s => s.trim())
    expect(cols).toContain('more')
    expect(cols).not.toContain('simpler')
    expect(Object.keys(EMPTY_SAVED)).not.toContain('simpler')
  })

  it('the explain route writes the new mode to `more`, never `simpler`', () => {
    const route = readFileSync(join(process.cwd(), 'src/app/api/study/explain/route.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(route).toMatch(/mode === 'more'\s*\? \{ more: clean \}/)
    expect(route).not.toMatch(/\{ simpler: clean \}/)
    // A stale client sending 'simpler' lands in `more` (the default branch).
    expect(route).toMatch(/requested === 'steps' \|\| requested === 'followup' \? requested : 'more'/)
  })

  it('ExplainMore shows nothing for a pre-change row and leaves the button usable', () => {
    const row = savedFromRow(PRE_CHANGE_ROW)
    render(
      <ExplainMore prompt="Q" language="ko" attemptId="a1" saved={{ en: EMPTY_SAVED, ko: row }} />,
    )
    expect(screen.queryByText(PRE_CHANGE_ROW.simpler)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /더 자세히 설명/ })).toBeEnabled()
  })

  it('ExplainMore does show a saved "Explain more" text, with the button spent', () => {
    render(
      <ExplainMore prompt="Q" language="ko" attemptId="a1"
        saved={{ en: EMPTY_SAVED, ko: { ...EMPTY_SAVED, more: 'B가 정답이에요.' } }} />,
    )
    expect(screen.getByText('B가 정답이에요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /더 자세히 설명/ })).toBeDisabled()
  })

  it('no client requests step-by-step any more', () => {
    const ui = readFileSync(join(process.cwd(), 'src/app/mobile/study/_shared/ExplainMore.tsx'), 'utf8')
    expect(ui).not.toMatch(/run\('steps'\)/)
  })
})
