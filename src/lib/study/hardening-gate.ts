/**
 * The gate for co-founder hardening edits — the pure half of
 * scripts/study-bank/hardening-gate.ts.
 *
 * An edit reaches students only after:
 *   1. per-family structural checks on the STAGED text (this file);
 *   2. a three-sample with-source grade, recorded against the staged row's
 *      content_sha (gradeVerdict in hardening.ts);
 *   3. study_item_hardening_swap(), which re-checks both shas in SQL and is
 *      idempotent.
 *
 * Nothing here reads or writes the database; the script does that, so these
 * rules can be pinned by jest without one.
 */
import { createHash } from 'node:crypto'
import { stringChoices, type BankItemJson } from './hardening'

export interface StagedEdit {
  editId: string
  family: string
  section: string
  domain: string
  subskill: string | null
  original: BankItemJson
  staged: BankItemJson
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/** "1/2", "0.5", "50%" → 0.5; anything else → null. For maths only. */
export function numericValue(s: string): number | null {
  const t = s.replace(/[$,\s]/g, '').replace(/−/g, '-')
  let m = t.match(/^(-?\d+(?:\.\d+)?)%$/)
  if (m) return Number(m[1]) / 100
  m = t.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/)
  if (m) return Number(m[2]) === 0 ? null : Number(m[1]) / Number(m[2])
  m = t.match(/^-?\d+(?:\.\d+)?$/)
  return m ? Number(t) : null
}

/**
 * Problems with the staged text that no grader should be asked to look past.
 * Returns [] when clean. Each rule names what it protects.
 */
export function structuralChecks(e: StagedEdit): string[] {
  const out: string[] = []
  const oc = stringChoices(e.original)
  const sc = stringChoices(e.staged)
  if (!sc) return ['staged item has no plain list of text options']
  if (oc && oc.length !== sc.length) out.push(`option count changed ${oc.length} -> ${sc.length}`)
  if (!sc.includes(String(e.staged.correct_answer ?? ''))) out.push('key is not one of the options')
  const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  if (new Set(sc.map(norm)).size !== sc.length) out.push('two options read the same')
  if (!String(e.staged.prompt ?? '').trim()) out.push('empty stem')
  if (!String(e.staged.explanation ?? '').trim()) out.push('empty explanation')
  // Hardcoded question numbers are checked by the script with the shared
  // scripts/study-bank/question-number-refs.mjs, not a second copy here.
  if (e.section === 'math') {
    // Two options with one value ("0.5" and "1/2") are one option to a
    // student who computes; the maths inserter refuses the same thing.
    const vals = sc.map(numericValue)
    const seen = new Map<number, string>()
    sc.forEach((c, i) => {
      const v = vals[i]
      if (v === null) return
      const k = Math.round(v * 1e9) / 1e9
      if (seen.has(k)) out.push(`options "${seen.get(k)}" and "${c}" have the same value`)
      else seen.set(k, c)
    })
  }
  if (e.family === 'sat' && e.section === 'reading_writing' && e.domain === 'Standard English Conventions') {
    // SEC options are fills for one blank; a stem edit that removes the
    // blank leaves nothing for the options to complete.
    const text = `${e.staged.passage ?? ''} ${e.staged.prompt ?? ''}`
    if (!/_{2,}|\[\s*blank\s*\]|＿/i.test(text) && /_{2,}|\[\s*blank\s*\]|＿/i.test(`${e.original.passage ?? ''} ${e.original.prompt ?? ''}`)) {
      out.push('the blank the options complete is gone')
    }
  }
  return out
}

/** Deterministic per-item option order, so the key is not always where the
 *  editor left it (a whole register entry is graders reading slot A). */
export function shownOrder(seed: string, n: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i)
  let h = createHash('sha256').update(seed).digest()
  for (let i = n - 1; i > 0; i--) {
    if (h.length < 4) h = createHash('sha256').update(h).digest()
    const j = h.readUInt32BE(0) % (i + 1)
    h = h.subarray(1)
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}

export interface GradingRender {
  markdown: string
  /** label -> key letter under that item's shown order */
  key: Record<string, string>
  /** label -> editId */
  labels: Record<string, string>
}

/** The with-source render: passage, stem, shuffled options, KEY UNMARKED. */
export function renderForGrading(runId: string, edits: StagedEdit[]): GradingRender {
  const key: Record<string, string> = {}
  const labels: Record<string, string> = {}
  const parts: string[] = [
    `# Hardening gate ${runId} — with-source grade`,
    '',
    'For EACH item, solve it with the source, then return JSON keyed by the item label:',
    '`{ "<label>": { "pick": "A".."D", "difficulty": "easy"|"medium"|"hard", "second_defensible": "<letter or none>", "note": "<one line: what makes it hard or not>" } }`',
    'Grade difficulty against the real exam\'s hard module, not against other items here. Do not assume any item is hard.',
    '',
  ]
  edits.forEach((e, n) => {
    const label = `H${String(n + 1).padStart(2, '0')}`
    labels[label] = e.editId
    const choices = stringChoices(e.staged) ?? []
    const order = shownOrder(`${runId}:${e.editId}`, choices.length)
    key[label] = LETTERS[order.indexOf(choices.indexOf(String(e.staged.correct_answer ?? '')))]
    parts.push(`## ${label}  (${e.family} ${e.section} · ${e.domain}${e.subskill ? ` · ${e.subskill}` : ''})`, '')
    if (e.staged.passage) parts.push(String(e.staged.passage), '')
    if (e.staged.graphic) parts.push('(This item has a figure; it is unchanged from the live version.)', '')
    parts.push(String(e.staged.prompt ?? ''), '')
    order.forEach((ci, k) => parts.push(`${LETTERS[k]}. ${choices[ci]}`))
    parts.push('')
  })
  return { markdown: parts.join('\n'), key, labels }
}

export type SwapOutcome = 'swapped' | 'already_swapped' | 'staged_changed_since_gate' | 'original_changed' | 'error'

/**
 * Swap every passed edit. Safe to run any number of times: the SQL function
 * returns 'already_swapped' for a done edit and changes nothing, and this
 * counts that as done rather than as a failure or a second swap.
 */
export async function swapAll(
  editIds: string[],
  rpc: (editId: string) => Promise<{ data: string | null; error: { message: string } | null }>,
): Promise<{ results: Array<{ editId: string; outcome: SwapOutcome; message?: string }>; swapped: number; already: number; refused: number }> {
  const results: Array<{ editId: string; outcome: SwapOutcome; message?: string }> = []
  for (const id of editIds) {
    const { data, error } = await rpc(id)
    if (error) { results.push({ editId: id, outcome: 'error', message: error.message }); continue }
    const o = (['swapped', 'already_swapped', 'staged_changed_since_gate', 'original_changed'] as const).find(x => x === data)
    results.push(o ? { editId: id, outcome: o } : { editId: id, outcome: 'error', message: `unexpected result ${data}` })
  }
  return {
    results,
    swapped: results.filter(r => r.outcome === 'swapped').length,
    already: results.filter(r => r.outcome === 'already_swapped').length,
    refused: results.filter(r => r.outcome !== 'swapped' && r.outcome !== 'already_swapped').length,
  }
}
