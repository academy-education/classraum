/** @jest-environment node */
/**
 * The open sweep's two load-bearing rules.
 *
 * Both are the kind that pass loudly when broken, which is why they are
 * pinned here rather than trusted:
 *
 *  1. A verdict describes the text its reviewer read. If sweepSha stopped
 *     covering the key, an item whose answer was corrected would keep its
 *     old sign-off and read as reviewed — the page would show a green
 *     number over items nobody has checked in their current form.
 *  2. A stale verdict is neither reviewed nor unreviewed. Folding it into
 *     either side is how a re-read gets skipped.
 *
 * Each test below was confirmed to FAIL with its mechanism removed; the
 * specific reversion is named in the comment above it.
 */
import { sweepSha, sweepTotals, noteRequired } from '../item-sweep'
import { readFileSync } from 'fs'
import { join } from 'path'

const base = {
  passage: 'The tally sheets show occupied burrows rising from 540 to 870.',
  prompt: 'The passage suggests that the weights mattered chiefly because they',
  choices: ['came out the same on both slopes', 'held steady year after year'],
  correct_answer: 'came out the same on both slopes',
}

describe('sweepSha — what voids a sign-off', () => {
  it('is stable for identical content', () => {
    expect(sweepSha(base)).toBe(sweepSha({ ...base }))
  })

  // Reversion: drop `item.correct_answer` from the sweepSha join.
  // Without it this expectation flips to toBe and the whole point of the
  // hash is gone — the most important edit an item can receive is the one
  // that stops being noticed.
  it('changes when the key changes', () => {
    expect(sweepSha({ ...base, correct_answer: 'held steady year after year' }))
      .not.toBe(sweepSha(base))
  })

  it('changes when an option is reworded', () => {
    expect(sweepSha({ ...base, choices: ['came out the same on both slopes', 'held steady each year'] }))
      .not.toBe(sweepSha(base))
  })

  it('changes when the passage changes', () => {
    expect(sweepSha({ ...base, passage: base.passage + ' Weights were flat.' })).not.toBe(sweepSha(base))
  })

  // Deliberate: a typo fix in a rationale must NOT void a sign-off on the
  // item. Reversion: add `explanation` to the join — this test then fails,
  // which is the signal that reviewers are about to be asked to re-read
  // hundreds of items because someone corrected a comma.
  it('ignores fields the reviewer was not judging', () => {
    const withExtras = { ...base } as Record<string, unknown>
    withExtras.explanation = 'Rewritten explanation, same item.'
    withExtras.difficulty = 'hard'
    expect(sweepSha(withExtras)).toBe(sweepSha(base))
  })

  it('does not collide across items that differ only in choice order', () => {
    expect(sweepSha({ ...base, choices: [...base.choices].reverse() })).not.toBe(sweepSha(base))
  })
})

describe('sweepTotals — stale is its own category', () => {
  const items = [{ sha: 'a1' }, { sha: 'b2' }, { sha: 'c3' }]
  const shaById = new Map([['i1', 'a1'], ['i2', 'b2'], ['i3', 'c3']])

  // Reversion: drop the `if (shaById.get(...) !== v.itemSha) { stale++; continue }`
  // guard. reviewed becomes 3 and stale 0 — the page then reports every item
  // reviewed while one of them has been edited since anyone looked at it.
  it('excludes an edited item from reviewed and counts it as stale', () => {
    const t = sweepTotals(items, [
      { itemId: 'i1', itemSha: 'a1', verdict: 'keep' },
      { itemId: 'i2', itemSha: 'b2', verdict: 'reject' },
      { itemId: 'i3', itemSha: 'OLD', verdict: 'keep' },
    ], shaById)
    expect(t.reviewed).toBe(2)
    expect(t.stale).toBe(1)
    expect(t.keep).toBe(1)
    expect(t.reject).toBe(1)
    expect(t.items).toBe(3)
  })

  it('counts nothing when there are no verdicts', () => {
    const t = sweepTotals(items, [], shaById)
    expect(t).toEqual({ items: 3, reviewed: 0, keep: 0, flag: 0, reject: 0, stale: 0 })
  })
})

describe('noteRequired', () => {
  // A bare reject removes an item and tells the next author nothing.
  it('demands a note for the verdicts that cause work', () => {
    expect(noteRequired('flag')).toBe(true)
    expect(noteRequired('reject')).toBe(true)
    expect(noteRequired('keep')).toBe(false)
  })
})

describe('migration 102 mirrors the TypeScript union', () => {
  // The CHECK constraint and VERDICTS are two spellings of one rule. If
  // they drift, the UI offers a verdict the database rejects — and the
  // failure lands on the reviewer as an opaque 500 halfway through a sweep.
  it('lists exactly keep, flag and reject', () => {
    const sql = readFileSync(
      join(process.cwd(), 'database/migrations/102_item_sweep_verdicts.sql'), 'utf8')
    const m = sql.match(/verdict\s+text not null check \(verdict in \(([^)]+)\)\)/)
    expect(m).not.toBeNull()
    const inSql = m![1].split(',').map(s => s.trim().replace(/'/g, '')).sort()
    expect(inSql).toEqual(['flag', 'keep', 'reject'])
  })

  // The migration explains at length why there is no SQL freshness view
  // (jsonb prints a space after every comma; JSON.stringify does not, so a
  // SQL-side hash could never match and every row would read as stale).
  // If someone adds one later this test tells them to read that comment.
  it('has no SQL-side hash that could silently disagree with sweepSha', () => {
    const sql = readFileSync(
      join(process.cwd(), 'database/migrations/102_item_sweep_verdicts.sql'), 'utf8')
    expect(sql).not.toMatch(/create or replace view[\s\S]*md5\(/)
  })
})
