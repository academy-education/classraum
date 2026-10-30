/** @jest-environment node */
/**
 * Pins the verbal key-visible audit rule (VERBAL-AUDIT-2026-10-31.prereg.md): an item is held if EITHER grader
 * marks key_verified false or raises a flagging issue; no_source flags only where source_check is 'required'
 * (verbal passage items get no science-style construct exception); style and note never flag; a held item holds
 * its whole passage set; a missing, empty or malformed grader file refuses the packet.
 */
import { scorePacket, scoreAll, AuditError } from '../../../../scripts/study-bank/verbal-audit-core.mjs'

type Issue = { type: string; detail: string }
type Entry = { key_verified: boolean; issues: Issue[] }
const index = {
  packet: 'ssat-reading-draft-9--p1',
  items: [
    { id: 'Q01', row_id: 'r1', cohort: 'c', passage: 'P1', source_check: 'required' },
    { id: 'Q02', row_id: 'r2', cohort: 'c', passage: 'P1', source_check: 'required' },
    { id: 'Q03', row_id: 'r3', cohort: 'c', passage: 'r3', source_check: 'not_applicable' },
    { id: 'Q04', row_id: 'r4', cohort: 'c', passage: 'r4', source_check: 'required' },
  ],
}
const clean = (over: Record<string, Entry> = {}): Record<string, Entry> => ({
  Q01: { key_verified: true, issues: [] }, Q02: { key_verified: true, issues: [] }, Q03: { key_verified: true, issues: [] }, Q04: { key_verified: true, issues: [] }, ...over,
})
type Scored = { items: number; flagged: { id: string; reasons: string[] }[]; heldPassages: { passage: string; items: string[]; row_ids: string[] }[]; ignored: { id: string }[] }
const score = (a: unknown, b: unknown) => scorePacket(index, { a, b }) as Scored
const one = (id: string, type: string): Record<string, Entry> => ({ [id]: { key_verified: true, issues: [{ type, detail: 'shown' }] } })

describe('verbal audit scorer', () => {
  it('clears items both graders verify with only style/note issues', () => {
    const s = score(clean({ ...one('Q01', 'style'), ...one('Q04', 'note') }), clean())
    expect(s.items).toBe(4)
    expect(s.flagged).toEqual([])
    expect(s.heldPassages).toEqual([])
  })

  it('holds when only ONE grader marks the key not verified', () => {
    const s = score(clean(), clean({ Q04: { key_verified: false, issues: [] } }))
    expect(s.flagged.map(f => f.id)).toEqual(['Q04'])
    expect(s.flagged[0].reasons).toEqual(['b: key not verified'])
  })

  // literal list: deleting a type from the core must FAIL a case here
  const FLAGGING = ['second_defensible', 'no_support', 'fact_error', 'language_error', 'explanation_mismatch', 'typo_rendering']
  for (const t of FLAGGING) for (const g of ['a', 'b'] as const) {
    it(`${t} from grader ${g} alone holds the item`, () => {
      const s = g === 'a' ? score(clean(one('Q04', t)), clean()) : score(clean(), clean(one('Q04', t)))
      expect(s.flagged.map(f => f.id)).toEqual(['Q04'])
    })
  }

  it('no_source holds a required item (no construct exception for passage items)', () => {
    const s = score(clean(one('Q04', 'no_source')), clean())
    expect(s.flagged.map(f => f.id)).toEqual(['Q04'])
    expect(s.ignored).toEqual([])
  })

  it('no_source on a not_applicable item is recorded as ignored and never holds', () => {
    const s = score(clean(), clean(one('Q03', 'no_source')))
    expect(s.flagged).toEqual([])
    expect(s.ignored.map(i => i.id)).toEqual(['Q03'])
  })

  it('a held item holds its whole passage set, and only that set', () => {
    const s = score(clean(one('Q02', 'no_support')), clean())
    expect(s.heldPassages).toEqual([{ cohort: 'c', passage: 'P1', items: ['Q01', 'Q02'], row_ids: ['r1', 'r2'], flagged: ['Q02'] }])
  })

  it('a standalone held item holds only itself', () => {
    const s = score(clean(one('Q03', 'typo_rendering')), clean())
    expect(s.heldPassages.map(h => h.items)).toEqual([['Q03']])
  })

  it('refuses a missing, empty-object, array, missing-id, extra-id, unknown-type, detail-less or non-boolean file', () => {
    const bad: unknown[] = [
      undefined, {}, [],
      (() => { const c = clean(); delete (c as Record<string, unknown>).Q02; return c })(),
      { ...clean(), Q99: { key_verified: true, issues: [] } },
      clean(one('Q01', 'bad_key')),
      clean({ Q01: { key_verified: true, issues: [{ type: 'no_support', detail: ' ' }] } }),
      clean({ Q01: { key_verified: 'yes' as unknown as boolean, issues: [] } }),
      { ...clean(), batch_patterns: 'none' },
    ]
    for (const b of bad) expect(() => score(clean(), b)).toThrow(AuditError)
  })

  it('accepts an optional batch_patterns array and never holds on it', () => {
    const s = score({ ...clean(), batch_patterns: [{ pattern: 'key_position', detail: 'A x9' }] }, clean())
    expect(s.flagged).toEqual([])
  })

  it('refuses a passage set split across packets and a row in two packets', () => {
    const p2 = { packet: 'x--p2', items: [{ id: 'Q01', row_id: 'r9', cohort: 'c', passage: 'P1', source_check: 'required' }] }
    const a2 = { Q01: { key_verified: true, issues: [] } }
    expect(() => scoreAll([{ index, audits: { a: clean(), b: clean() } }, { index: p2, audits: { a: a2, b: a2 } }])).toThrow(/split/)
    const p3 = { packet: 'x--p3', items: [{ id: 'Q01', row_id: 'r1', cohort: 'c', passage: 'Z', source_check: 'required' }] }
    expect(() => scoreAll([{ index, audits: { a: clean(), b: clean() } }, { index: p3, audits: { a: a2, b: a2 } }])).toThrow(/more than one packet/)
  })
})
