/** @jest-environment node */
/**
 * itep-stage-check (2026-10-31): the refusal rules behind itep-bank-helper.ts stage, including the passage-set
 * rules added for iTEP Reading v1. Break-tested when written: each passage-set rule was disabled alone in
 * itep-stage-check.ts and its test below seen to fail, then restored.
 */
import { checkItepStageRows, itepContentHash, type ItepStageRow } from '@/lib/study/itep-stage-check'

const row = (over: Partial<ItepStageRow> & { qid: string; passage?: string | null }): ItepStageRow => {
  const item = { prompt: `Question ${over.qid}?`, passage: over.passage ?? 'A short text about a school fair.', choices: ['one', 'two', 'three', 'four'], correct_answer: 'two' }
  const base: ItepStageRow = {
    family: 'itep', section: 'reading', domain: 'Part 1: Short Text', cohort: 'itep-reading-v1', verified: false,
    passage_group_id: null, item, content_hash: itepContentHash(item),
    verify_meta: { method_id: 'm', draft: { qid: over.qid } },
  }
  const r = { ...base, ...over } as ItepStageRow & { qid?: string; passage?: string }
  delete r.qid; delete r.passage
  return r
}
const P2 = 'Part 2: Intermediate Passage'
const set = (g: string, n: number, passage = `Passage ${g}`) => Array.from({ length: n }, (_, k) =>
  row({ qid: `${g}-${k + 1}`, domain: P2, passage, passage_group_id: g, created_at: new Date(Date.UTC(2026, 9, 31, 0, 0, 0, k)).toISOString() }))

describe('checkItepStageRows', () => {
  it('accepts standalone Part 1 texts and a whole Part 2 set in order', () => {
    const { problems, perPart } = checkItepStageRows([row({ qid: 'p1a' }), row({ qid: 'p1b', passage: 'Another note.' }), ...set('g1', 4)])
    expect(problems).toEqual([])
    expect(perPart).toEqual({ 'reading / Part 1: Short Text': 2, 'reading / Part 2: Intermediate Passage': 4 })
  })

  it('refuses a passage set that is not whole', () => {
    expect(checkItepStageRows(set('g1', 3)).problems.join('\n')).toMatch(/3 rows, Part 2: Intermediate Passage draws 4/)
  })

  it('refuses a passage-set row with no group', () => {
    const rs = set('g1', 4); rs[0] = { ...rs[0], passage_group_id: null }
    expect(checkItepStageRows(rs).problems.join('\n')).toMatch(/no passage_group_id/)
  })

  it('refuses a group whose rows carry different passages', () => {
    const rs = set('g1', 4); rs[2] = row({ qid: 'g1-3', domain: P2, passage: 'Something else', passage_group_id: 'g1', created_at: rs[2].created_at })
    expect(checkItepStageRows(rs).problems.join('\n')).toMatch(/different passages/)
  })

  it('refuses out-of-order or missing created_at inside a group', () => {
    const rs = set('g1', 4); [rs[1].created_at, rs[2].created_at] = [rs[2].created_at, rs[1].created_at]
    expect(checkItepStageRows(rs).problems.join('\n')).toMatch(/not strictly increasing/)
    const same = set('g2', 4).map(r => ({ ...r, created_at: '2026-10-31T00:00:00.000Z' }))
    expect(checkItepStageRows(same).problems.join('\n')).toMatch(/not strictly increasing/)
    const none = set('g3', 4); delete none[0].created_at
    expect(checkItepStageRows(none).problems.join('\n')).toMatch(/needs created_at/)
  })

  it('refuses a Part 1 text with a group id or without a passage', () => {
    expect(checkItepStageRows([row({ qid: 'x', passage_group_id: 'g9' })]).problems.join('\n')).toMatch(/standalone; passage_group_id must be null/)
    expect(checkItepStageRows([row({ qid: 'y', passage: '' })]).problems.join('\n')).toMatch(/needs its own text/)
  })

  it('keeps the original row rules: verified=true, bad hash, five choices, unknown part', () => {
    const r = row({ qid: 'z' })
    expect(checkItepStageRows([{ ...r, verified: true }]).problems.join('\n')).toMatch(/verified=true/)
    expect(checkItepStageRows([{ ...r, content_hash: 'x' }]).problems.join('\n')).toMatch(/content_hash/)
    expect(checkItepStageRows([{ ...r, item: { ...r.item, choices: [...r.item.choices, 'five'] } }]).problems.join('\n')).toMatch(/four distinct choices/)
    expect(checkItepStageRows([{ ...r, domain: 'Part 4: Nothing' }]).problems.join('\n')).toMatch(/names no reading part/)
  })

  it('does not require a passage of Grammar Part 1 rows', () => {
    const item = { prompt: 'She ________ to school.', passage: null, choices: ['go', 'goes', 'going', 'gone'], correct_answer: 'goes' }
    const g = { ...row({ qid: 'gc' }), section: 'grammar', domain: 'Part 1: Sentence Completion', item, content_hash: itepContentHash(item) }
    expect(checkItepStageRows([g]).problems).toEqual([])
  })
})

describe('checkItepStageRows: listening (iTEP Listening v1)', () => {
  const DLG = "Transcript: M: Is the bus late again?\nW: Yes, so I'm walking."
  const LEC = 'Transcript: Today we look at why some birds sing at night. The answer is a quiet city.'
  const lrow = (qid: string, domain: string, passage: string, g: string | null = null, k = 0) =>
    row({ qid, section: 'listening', domain, passage, passage_group_id: g, created_at: g ? new Date(Date.UTC(2026, 9, 31, 0, 0, 0, k)).toISOString() : undefined })
  const lecture = (passage: string) => Array.from({ length: 6 }, (_, k) => lrow(`l-${k}`, 'Part 3: Lecture', passage, 'lg', k))

  it('accepts a W/M short conversation, a whole conversation set and a monologue lecture', () => {
    const conv = Array.from({ length: 4 }, (_, k) => lrow(`c-${k}`, 'Part 2: Conversation', DLG, 'cg', k))
    expect(checkItepStageRows([lrow('d1', 'Part 1: Short Conversations', DLG), ...conv, ...lecture(LEC)]).problems).toEqual([])
  })
  it('refuses a passage without the Transcript: prefix (the runner would show it as text)', () => {
    expect(checkItepStageRows([lrow('d1', 'Part 1: Short Conversations', DLG.replace('Transcript: ', ''))]).problems.join('\n')).toMatch(/must start "Transcript:"/)
  })
  it('refuses a conversation that is not exactly W and M, or not a dialogue at all', () => {
    expect(checkItepStageRows([lrow('d1', 'Part 1: Short Conversations', 'Transcript: A: Hi there.\nB: Hello.')]).problems.join('\n')).toMatch(/want exactly W and M/)
    expect(checkItepStageRows([lrow('d2', 'Part 1: Short Conversations', 'Transcript: Just one person talking.')]).problems.join('\n')).toMatch(/2\+ speaker turns/)
  })
  it('refuses a lecture with a stray "<capital>: " the player would split on', () => {
    expect(checkItepStageRows(lecture(`${LEC} Plan B: wait.`)).problems.join('\n')).toMatch(/lecture contains "B: "/)
  })
  it('refuses a TTS segment over the route cap', () => {
    expect(checkItepStageRows(lecture(`${LEC} ${'word '.repeat(820)}`)).problems.join('\n')).toMatch(/over the route's 4000/)
  })
})
