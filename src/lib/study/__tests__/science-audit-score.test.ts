/** @jest-environment node */
/**
 * Pins the science key-visible audit rule (SCIENCE-AUDIT-2026-10-30.prereg.md): an item is flagged if EITHER
 * auditor marks key_verified false or raises second_defensible / unreadable / fact_error / no_source; `note`
 * never flags; a flag holds the whole passage; a missing or malformed auditor file refuses the packet.
 */
import { scorePacket, scoreAll, validateAudit, AuditError, FLAG_TYPES } from '../../../../scripts/study-bank/science-audit-core.mjs'

type Issue = { type: string; detail: string }
type Entry = { key_verified: boolean; issues: Issue[] }
const index = {
  packet: 'act-science-v12b--p1',
  items: [
    { id: 'P1-Q1', cohort: 'act-science-v12b', passage: 'P1' },
    { id: 'P1-Q2', cohort: 'act-science-v12b', passage: 'P1' },
    { id: 'P2-Q1', cohort: 'act-science-v12b', passage: 'P2' },
  ],
}
const clean = (over: Record<string, Entry> = {}) => ({
  'P1-Q1': { key_verified: true, issues: [] }, 'P1-Q2': { key_verified: true, issues: [] }, 'P2-Q1': { key_verified: true, issues: [] }, ...over,
})
type Scored = { items: number; flagged: { id: string; reasons: string[] }[]; heldPassages: { passage: string; items: string[]; flagged: string[] }[] }
const score = (a: unknown, b: unknown) => scorePacket(index, { a, b }) as Scored

describe('science audit scorer', () => {
  it('clears an item both auditors verify with no flagging issue, notes included', () => {
    const s = score(clean({ 'P1-Q1': { key_verified: true, issues: [{ type: 'note', detail: '18.2 - 12.6 = 5.6' }] } }), clean())
    expect(s.items).toBe(3)
    expect(s.flagged).toEqual([])
    expect(s.heldPassages).toEqual([])
  })

  it('flags when only ONE auditor marks the key not verified (either, not both)', () => {
    const s = score(clean(), clean({ 'P2-Q1': { key_verified: false, issues: [] } }))
    expect(s.flagged.map(f => f.id)).toEqual(['P2-Q1'])
    expect(s.flagged[0].reasons).toEqual(['b: key not verified'])
  })

  // a literal, not FLAG_TYPES: deleting a type from the core must FAIL a case here, not silently remove it
  const FLAGGING = ['second_defensible', 'unreadable', 'fact_error', 'no_source']
  it('the core flags exactly the prereg types', () => expect([...FLAG_TYPES].sort()).toEqual([...FLAGGING].sort()))

  it.each(FLAGGING)('flags on %s raised by one auditor with the key verified', type => {
    const s = score(clean({ 'P2-Q1': { key_verified: true, issues: [{ type, detail: 'shown' }] } }), clean())
    expect(s.flagged.map(f => f.id)).toEqual(['P2-Q1'])
    expect(s.flagged[0].reasons[0]).toContain(type)
  })

  it('a flag holds the whole passage, not just the item', () => {
    const s = score(clean({ 'P1-Q2': { key_verified: true, issues: [{ type: 'unreadable', detail: 'bars 42 vs 45' }] } }), clean())
    expect(s.heldPassages).toEqual([{ cohort: 'act-science-v12b', passage: 'P1', items: ['P1-Q1', 'P1-Q2'], flagged: ['P1-Q2'] }])
  })

  it('refuses a missing auditor file rather than scoring on one auditor', () => {
    expect(() => scorePacket(index, { a: clean() })).toThrow(AuditError)
  })

  it('refuses a file with a missing id, an extra id, a non-boolean key_verified, an unknown type or an empty detail', () => {
    const { 'P2-Q1': _gone, ...short } = clean()
    void _gone
    const bad: unknown[] = [
      short,
      { ...clean(), 'P9-Q9': { key_verified: true, issues: [] } },
      clean({ 'P1-Q1': { key_verified: 'yes' as unknown as boolean, issues: [] } }),
      clean({ 'P1-Q1': { key_verified: true, issues: [{ type: 'wrong_key', detail: 'x' }] } }),
      clean({ 'P1-Q1': { key_verified: true, issues: [{ type: 'fact_error', detail: ' ' }] } }),
      [],
    ]
    for (const b of bad) {
      expect(validateAudit(b, index.items.map(i => i.id)).length).toBeGreaterThan(0)
      expect(() => score(clean(), b)).toThrow(AuditError)
      expect(() => score(b, clean())).toThrow(AuditError)
    }
  })

  it('scoreAll totals per cohort and refuses zero packets', () => {
    const s = scoreAll([{ index, audits: { a: clean({ 'P2-Q1': { key_verified: false, issues: [] } }), b: clean() } }]) as {
      items: number; perCohort: Record<string, { items: number; passages: number; flaggedItems: number; heldPassages: number; heldItems: number }>
    }
    expect(s.items).toBe(3)
    expect(s.perCohort['act-science-v12b']).toEqual({ items: 3, passages: 2, flaggedItems: 1, heldPassages: 1, heldItems: 1 })
    expect(() => scoreAll([])).toThrow(AuditError)
  })
})
