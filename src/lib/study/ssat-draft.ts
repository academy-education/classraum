/**
 * SSAT reading DRAFTS — the pure half of /admin/bank-qc?tab=drafts.
 *
 * The owner's method (2026-10-11): an AI drafts SSAT reading passage sets,
 * the co-founder spends ~10 minutes per passage fixing giveaway answer
 * choices in an edit screen, and our checks run afterwards. The data
 * contract is scripts/study-bank/SSAT-DRAFT-EDIT-CONTRACT.md; another
 * agent produces rows against it, so it does not change here.
 *
 * Everything that decides WHAT gets written lives in this file so it can
 * be tested without a database: which rows are drafts at all, validation,
 * the merge of an edit into the stored item jsonb, original_item
 * preservation, the status transitions, and the full save/skip plan. The
 * route (api/admin/bank-qc/drafts) only reads rows, calls planSave /
 * planSkip, and applies the plan.
 *
 * Two invariants every plan honours, and the tests pin:
 *   - a plan never contains `verified` or `archived` (drafts stay staged;
 *     the assembler ignores verified=false rows)
 *   - a plan touches only rows that pass isDraftRow
 */
import { createHash } from 'crypto'

export const DRAFT_COHORT_PREFIX = 'ssat-reading-draft-'
/** The PostgREST `like` pattern for the same prefix. */
export const DRAFT_COHORT_LIKE = 'ssat-reading-draft-%'
export const DRAFT_CHOICE_COUNT = 5

export type DraftStatus = 'awaiting_edit' | 'edited' | 'skipped'
export type DraftRisk = 'high' | 'med' | 'low'

export interface DraftQc {
  oo_hits?: number
  oo_notes?: string[]
  grader_flags?: string[]
  risk?: DraftRisk
}

export interface DraftMeta {
  status?: DraftStatus
  qc?: DraftQc
  original_item?: Record<string, unknown>
  edited_by?: string
  edited_at?: string
  edit_note?: string
  [k: string]: unknown
}

export interface DraftItemJson {
  passage?: string | null
  prompt?: string
  choices?: string[]
  correct_answer?: string
  explanation?: string
  distractor_rationales?: { choice: string; reason: string }[]
  [k: string]: unknown
}

export interface DraftRow {
  id: string
  family: string | null
  section: string | null
  cohort: string | null
  verified: boolean | null
  archived: boolean | null
  passage_group_id: string | null
  content_sha?: string | null
  item: DraftItemJson | null
  verify_meta: Record<string, unknown> | null
}

/** True only for rows the edit screen may touch. Every condition is required. */
export function isDraftRow(r: Pick<DraftRow, 'family' | 'section' | 'cohort' | 'verified' | 'archived'>): boolean {
  return r.family === 'ssat'
    && r.section === 'reading'
    && typeof r.cohort === 'string' && r.cohort.startsWith(DRAFT_COHORT_PREFIX)
    && r.verified === false
    && r.archived === false
}

export function draftMeta(r: Pick<DraftRow, 'verify_meta'>): DraftMeta {
  const d = (r.verify_meta as { draft?: unknown } | null)?.draft
  return d && typeof d === 'object' && !Array.isArray(d) ? (d as DraftMeta) : {}
}

export function draftStatus(r: Pick<DraftRow, 'verify_meta'>): DraftStatus {
  const s = draftMeta(r).status
  return s === 'edited' || s === 'skipped' ? s : 'awaiting_edit'
}

/**
 * content_hash, by the SSAT reading insert path's own definition
 * (scripts/study-bank/insert-ssat-wv.mjs `hashOf`). Reproduces the stored
 * hash on 12 of 12 live ssat-reading-wv6 rows (checked 2026-10-11).
 *
 * content_sha and dedup_key are GENERATED ALWAYS columns (migration 077):
 * Postgres recomputes them from `item` on every update, so nothing here
 * computes them and nothing may write them. Reviews and attacks bind to
 * content_sha, so an edited draft's old measurements go stale on their own.
 */
const norm = (s: unknown) => String(s ?? '').toLowerCase()
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()

export function ssatContentHash(item: Pick<DraftItemJson, 'passage' | 'prompt' | 'choices'>): string {
  return createHash('md5')
    .update([norm(item.passage), norm(item.prompt), (item.choices || []).map(norm).join('|')].join('~~'))
    .digest('hex')
}

// ── Validation ──────────────────────────────────────────────────────────

export interface ItemEdit {
  prompt: string
  choices: string[]
  correct_answer: string
  explanation: string
}

export interface Validation { errors: string[]; warnings: string[] }

/** Blocking errors and a non-blocking warning, for one edited item. */
export function validateItemEdit(e: ItemEdit): Validation {
  const errors: string[] = []
  const warnings: string[] = []
  if (!e.prompt || !e.prompt.trim()) errors.push('The question is empty.')
  const choices = Array.isArray(e.choices) ? e.choices : []
  if (choices.length !== DRAFT_CHOICE_COUNT) errors.push(`There must be exactly ${DRAFT_CHOICE_COUNT} answer choices (found ${choices.length}).`)
  if (choices.some(c => typeof c !== 'string' || !c.trim())) errors.push('Every answer choice needs text.')
  const seen = new Set<string>()
  for (const c of choices) {
    const k = norm(c)
    if (!k) continue
    if (seen.has(k)) { errors.push(`Two answer choices are the same: "${c.trim()}".`); break }
    seen.add(k)
  }
  if (!e.correct_answer || !e.correct_answer.trim() || !choices.includes(e.correct_answer)) {
    errors.push('Mark which choice is the right answer.')
  } else if (isUniquelyLongest(choices, e.correct_answer)) {
    warnings.push('The right answer is the longest choice. Students notice that - consider making a wrong answer just as long.')
  }
  return { errors, warnings }
}

export function isUniquelyLongest(choices: string[], key: string): boolean {
  const lens = choices.map(c => (c ?? '').trim().length)
  const k = (key ?? '').trim().length
  return lens.filter(l => l >= k).length === 1 && choices.includes(key)
}

// ── Merge ───────────────────────────────────────────────────────────────

/**
 * Apply an edit to the stored item jsonb. Every key the edit does not own
 * (type, difficulty, passageGroupId, graphic, …) is carried over verbatim.
 * distractor_rationales are keyed by choice TEXT, so a rationale whose
 * choice was rewritten, or which now names the key, is dropped and each new
 * distractor gets an empty reason — a stale rationale would explain an
 * option that no longer exists.
 */
export function mergeItem(stored: DraftItemJson, edit: ItemEdit, passage?: string): DraftItemJson {
  const choices = edit.choices.map(c => c)
  const prev = Array.isArray(stored.distractor_rationales) ? stored.distractor_rationales : []
  const rationales = choices
    .filter(c => c !== edit.correct_answer)
    .map(c => prev.find(r => r && r.choice === c) ?? { choice: c, reason: '' })
  const out: DraftItemJson = {
    ...stored,
    prompt: edit.prompt,
    choices,
    correct_answer: edit.correct_answer,
    explanation: edit.explanation,
  }
  if ('distractor_rationales' in stored) out.distractor_rationales = rationales
  if (passage !== undefined) out.passage = passage
  return out
}

/** Fields whose change counts as an edit. */
const EDIT_FIELDS = ['passage', 'prompt', 'choices', 'correct_answer', 'explanation'] as const

export function changedFields(a: DraftItemJson, b: DraftItemJson): string[] {
  return EDIT_FIELDS.filter(f => JSON.stringify(a[f] ?? null) !== JSON.stringify(b[f] ?? null))
}

// ── Status transitions ──────────────────────────────────────────────────

export type DraftAction = 'save' | 'skip'

/**
 * save: from any status -> edited (re-editing an edited passage, or
 *       un-skipping by editing a skipped one, are both legitimate).
 * skip: awaiting_edit -> skipped; skipped -> skipped (idempotent).
 *       An EDITED passage cannot be skipped: that would hide a person's
 *       finished work behind a status that reads "nobody looked at this".
 */
export function nextStatus(from: DraftStatus, action: DraftAction): DraftStatus | null {
  if (action === 'save') return 'edited'
  if (action === 'skip') return from === 'edited' ? null : 'skipped'
  return null
}

export function aggregateStatus(statuses: DraftStatus[]): DraftStatus {
  if (statuses.some(s => s === 'awaiting_edit')) return 'awaiting_edit'
  if (statuses.some(s => s === 'edited')) return 'edited'
  return statuses.length ? 'skipped' : 'awaiting_edit'
}

/** The new draft meta after a save. original_item is written only when absent. */
export function savedMeta(meta: DraftMeta, storedItem: DraftItemJson, ctx: { userId: string; now: string; note?: string }): DraftMeta {
  const out: DraftMeta = { ...meta, status: 'edited', edited_by: ctx.userId, edited_at: ctx.now }
  if (!meta.original_item) out.original_item = storedItem as Record<string, unknown>
  if (ctx.note !== undefined && ctx.note.trim()) out.edit_note = ctx.note.trim()
  return out
}

// ── Plans ───────────────────────────────────────────────────────────────

export interface RowUpdate {
  id: string
  /** The row's content_sha when the editor loaded it; the write is conditional on it. */
  expectedSha: string | null
  patch: { item?: DraftItemJson; content_hash?: string; verify_meta: Record<string, unknown> }
}

export type Plan =
  | { ok: true; updates: RowUpdate[]; changed: number }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string; details?: Record<string, string[]> }

export interface SaveRequest {
  group: string
  passage?: string
  note?: string
  items: (ItemEdit & { id: string; expectedSha: string | null })[]
}

/** Shared refusal: the group must exist and EVERY row in it must be a draft. */
function checkGroup(rows: DraftRow[], group: string): Plan | null {
  if (!group) return { ok: false, status: 400, error: 'group is required' }
  if (!rows.length) return { ok: false, status: 404, error: 'No rows in that passage group' }
  if (rows.some(r => r.passage_group_id !== group)) return { ok: false, status: 400, error: 'Row outside the requested group' }
  const bad = rows.filter(r => !isDraftRow(r))
  if (bad.length) return { ok: false, status: 403, error: `Not a draft passage: ${bad.length} row(s) are not unverified ssat-reading-draft rows` }
  return null
}

export function planSave(rows: DraftRow[], req: SaveRequest, ctx: { userId: string; now: string }): Plan {
  const refused = checkGroup(rows, req.group)
  if (refused) return refused
  if (!Array.isArray(req.items) || !req.items.length) return { ok: false, status: 400, error: 'items are required' }
  const byId = new Map(rows.map(r => [r.id, r]))
  const ids = new Set<string>()
  for (const e of req.items) {
    if (!byId.has(e.id)) return { ok: false, status: 403, error: `Item ${e.id} is not in this draft passage` }
    if (ids.has(e.id)) return { ok: false, status: 400, error: `Item ${e.id} sent twice` }
    ids.add(e.id)
  }
  if (req.passage !== undefined && (typeof req.passage !== 'string' || !req.passage.trim())) {
    return { ok: false, status: 400, error: 'The passage cannot be empty.' }
  }
  if (req.passage !== undefined && ids.size !== rows.length) {
    // The passage is stored on every item; editing it on some rows would split the set.
    return { ok: false, status: 400, error: 'A passage edit must include every item in the passage' }
  }
  const details: Record<string, string[]> = {}
  for (const e of req.items) {
    const v = validateItemEdit(e)
    if (v.errors.length) details[e.id] = v.errors
  }
  if (Object.keys(details).length) return { ok: false, status: 400, error: 'Some questions need fixing before saving', details }

  let changed = 0
  const updates: RowUpdate[] = req.items.map(e => {
    const row = byId.get(e.id)!
    const stored = (row.item ?? {}) as DraftItemJson
    const next = mergeItem(stored, e, req.passage)
    const meta = savedMeta(draftMeta(row), stored, { userId: ctx.userId, now: ctx.now, note: req.note })
    const verify_meta = { ...(row.verify_meta ?? {}), draft: meta }
    if (changedFields(stored, next).length) {
      changed++
      return { id: e.id, expectedSha: e.expectedSha, patch: { item: next, content_hash: ssatContentHash(next), verify_meta } }
    }
    return { id: e.id, expectedSha: e.expectedSha, patch: { verify_meta } }
  })
  return { ok: true, updates, changed }
}

export function planSkip(rows: DraftRow[], group: string): Plan {
  const refused = checkGroup(rows, group)
  if (refused) return refused
  if (rows.some(r => nextStatus(draftStatus(r), 'skip') === null)) {
    return { ok: false, status: 409, error: 'This passage has saved edits; it cannot be skipped' }
  }
  return {
    ok: true,
    changed: 0,
    updates: rows.map(r => ({
      id: r.id,
      expectedSha: r.content_sha ?? null,
      patch: { verify_meta: { ...(r.verify_meta ?? {}), draft: { ...draftMeta(r), status: 'skipped' as DraftStatus } } },
    })),
  }
}

// ── List summary ────────────────────────────────────────────────────────

export interface PassageSummary {
  group: string
  cohort: string
  items: number
  status: DraftStatus
  title: string
  highRisk: number
  editedAt: string | null
}

export function passageTitle(passage: string | null | undefined): string {
  const first = String(passage ?? '').split('\n').map(s => s.trim()).find(Boolean) ?? ''
  return first.length > 120 ? `${first.slice(0, 117)}...` : first || '(no passage text)'
}

const STATUS_ORDER: Record<DraftStatus, number> = { awaiting_edit: 0, edited: 1, skipped: 2 }

export function summarise(rows: DraftRow[]): PassageSummary[] {
  const groups = new Map<string, DraftRow[]>()
  for (const r of rows) {
    if (!isDraftRow(r) || !r.passage_group_id) continue
    const g = groups.get(r.passage_group_id) ?? []
    g.push(r); groups.set(r.passage_group_id, g)
  }
  return [...groups.entries()].map(([group, rs]) => ({
    group,
    cohort: rs[0].cohort ?? '',
    items: rs.length,
    status: aggregateStatus(rs.map(draftStatus)),
    title: passageTitle(rs.find(r => r.item?.passage)?.item?.passage),
    highRisk: rs.filter(r => draftMeta(r).qc?.risk === 'high').length,
    editedAt: rs.map(r => draftMeta(r).edited_at).filter((x): x is string => !!x).sort().pop() ?? null,
  })).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.highRisk - a.highRisk || a.group.localeCompare(b.group))
}
