import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Question } from '@/lib/test-verify'

/**
 * Assemble a test from the pre-verified item bank (study_item_bank),
 * as opposed to generating one live. Pulls only verified rows, spreads
 * selection across content domains (round-robin) so a section isn't
 * clustered in one domain, and shapes the result into the same
 * TestPayload the generator emits and the renderer consumes.
 *
 * v1 is a simple domain-balanced draw. The full blueprint enforcement
 * (exact per-domain quotas + difficulty mix + adaptive module-2
 * routing) layers on top of this once the bank is large enough to
 * satisfy every cell.
 */

export interface AssembleParams {
  family?: string
  section: 'reading_writing' | 'math'
  /** Target item count. Returns fewer if the bank can't satisfy it. */
  count: number
  /** Optional per-difficulty ceiling filter (e.g. only 'hard'). */
  difficulties?: Array<'easy' | 'medium' | 'hard'>
  /** When set, items this student has already been served are drawn
   *  LAST (unseen-first, oldest-seen recycled when the pool runs dry)
   *  and the draw is recorded in study_item_exposures. */
  studentId?: string
}

/** item_id → seen_at for everything this student has been served.
 *  Exposures written by `excludeSessionId` are ignored — a session
 *  re-drawing its own questions (practice re-mount) must get the same
 *  set back, not treat its own draw as "already seen". */
async function loadExposures(studentId: string, excludeSessionId?: string): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin
    .from('study_item_exposures')
    .select('item_id, seen_at, session_id')
    .eq('student_id', studentId)
  const map = new Map<string, string>()
  for (const r of data ?? []) {
    if (excludeSessionId && r.session_id === excludeSessionId) continue
    map.set(r.item_id as string, r.seen_at as string)
  }
  return map
}

/** Record served items. Non-fatal: a failed write must never block the
 *  test — worst case the student can see a repeat later. */
async function recordExposures(studentId: string, itemIds: string[], source: string, sessionId?: string): Promise<void> {
  if (itemIds.length === 0) return
  const { error } = await supabaseAdmin
    .from('study_item_exposures')
    .upsert(
      itemIds.map(item_id => ({ student_id: studentId, item_id, source, session_id: sessionId ?? null })),
      { onConflict: 'student_id,item_id', ignoreDuplicates: true },
    )
  if (error) console.error('[assemble] exposure write failed', error)
}

/** FNV-1a rank of one item under a seed. Per-item (not an array
 *  shuffle) so an item's position never depends on what ELSE is in the
 *  pool — a re-entered session reproduces its draw even after other
 *  sessions consumed items in between. */
function itemRank(seed: string, id: string): number {
  let h = 2166136261
  const s = `${seed}:${id}`
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/**
 * Order rows unseen-first: unseen items ranked by seeded per-item hash,
 * then already-seen items oldest-exposure-first (fair recycling when
 * the bank is smaller than the student's appetite).
 */
function unseenFirst<T extends { id: string }>(
  rows: T[],
  exposures: Map<string, string>,
  seed: string,
): T[] {
  const unseen = rows
    .filter(r => !exposures.has(r.id))
    .sort((a, b) => itemRank(seed, a.id) - itemRank(seed, b.id) || a.id.localeCompare(b.id))
  const seen = rows
    .filter(r => exposures.has(r.id))
    .sort((a, b) => exposures.get(a.id)!.localeCompare(exposures.get(b.id)!))
  return [...unseen, ...seen]
}

export interface AssembledTest {
  title: string
  timeLimitMinutes: number
  section: string | null
  family: string
  questions: Question[]
  /** Per-domain tally of what was actually drawn (for QA / logging). */
  composition: Record<string, number>
}

const SECTION_META: Record<string, { title: string; minutesPerQ: number; label: string }> = {
  reading_writing: { title: 'Digital SAT — Reading & Writing', minutesPerQ: 1.19, label: 'Reading & Writing' },
  math:            { title: 'Digital SAT — Math',              minutesPerQ: 1.59, label: 'Math' },
}

/**
 * College Board Digital SAT domain blueprint — target share of each
 * section's questions. Drives per-domain quotas at assembly so an
 * assembled test mirrors the real exam's weighting (Algebra + Advanced
 * Math dominate; Geometry/Trig is light) rather than an even split.
 * Domain keys must match study_item_bank.domain exactly.
 * Sources: College Board Digital SAT Assessment Framework.
 */
const BLUEPRINT: Record<string, Record<string, number>> = {
  math: {
    'Algebra': 0.35,
    'Advanced Math': 0.35,
    'Problem-Solving and Data Analysis': 0.15,
    'Geometry and Trigonometry': 0.15,
  },
  reading_writing: {
    'Craft and Structure': 0.28,
    'Information and Ideas': 0.26,
    'Standard English Conventions': 0.26,
    'Expression of Ideas': 0.20,
  },
}

/**
 * Largest-remainder apportionment: turn fractional blueprint weights
 * into whole per-domain quotas that sum to exactly `count`. Floors each
 * ideal share, then hands the leftover seats to the domains with the
 * biggest fractional remainders.
 */
function blueprintQuotas(weights: Record<string, number>, count: number): Record<string, number> {
  const rows = Object.entries(weights).map(([d, w]) => {
    const exact = w * count
    const floor = Math.floor(exact)
    return { d, n: floor, frac: exact - floor }
  })
  let leftover = count - rows.reduce((s, r) => s + r.n, 0)
  rows.sort((a, b) => b.frac - a.frac)
  for (let i = 0; leftover > 0 && rows.length > 0; i = (i + 1) % rows.length, leftover--) {
    rows[i]!.n++
  }
  const out: Record<string, number> = {}
  for (const r of rows) out[r.d] = r.n
  return out
}

/** Deterministic-ish shuffle seeded by a string (stable per session id). */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  const rand = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000 }
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/**
 * Practice-shaped question — the flat shape PracticeSession renders
 * and /api/study/practice/grade grades. Bank items are richer (passage,
 * rationales, graphics); this is the lossy projection into that shape.
 */
export interface PracticeQuestion {
  prompt: string
  type: 'multiple_choice'
  choices: string[]
  correct_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
}

/**
 * Draw a small practice batch from the pre-verified item bank instead
 * of generating live. Used by /api/study/practice/generate for SAT
 * topics (and the daily challenge, where `seed` is the DATE so every
 * student gets the same set that day).
 *
 * Only plain multiple-choice items without graphics qualify — the
 * practice UI has no passage pane or figure renderer, so passages are
 * folded into the prompt text and figure items are skipped.
 */
export async function drawBankPractice(p: {
  family?: string
  section: 'reading_writing' | 'math'
  count: number
  seed: string
  /** Content-domain filter (study_item_bank.domain, e.g. 'Algebra').
   *  Used by journey nodes that train one skill at a time. */
  domain?: string
  /** Difficulty filter — journey Level I draws easy/medium, Level II
   *  medium/hard. Omitted → all difficulties. */
  difficulties?: Array<'easy' | 'medium' | 'hard'>
  /** Enables no-repeat tracking (see AssembleParams.studentId). */
  studentId?: string
  /** Exposure-ledger tag, e.g. 'daily_challenge' | 'practice'. */
  source?: string
  /** Session doing the draw — its own prior exposures are ignored so a
   *  re-entered session serves the same set again. */
  sessionId?: string
}): Promise<PracticeQuestion[]> {
  const family = p.family ?? 'sat'
  let query = supabaseAdmin
    .from('study_item_bank')
    .select('id, item')
    .eq('family', family)
    .eq('section', p.section)
    .eq('verified', true)
    .eq('archived', false)
  if (p.domain) query = query.eq('domain', p.domain)
  if (p.difficulties?.length) query = query.in('difficulty', p.difficulties)
  // Stable pool order so the same seed always yields the same draw
  // (the daily challenge relies on this for its shared-set property).
  const { data, error } = await query.order('id', { ascending: true })
  if (error) throw new Error(`bank practice query failed: ${error.message}`)

  const pool = ((data ?? []) as Array<{ id: string; item: Question }>)
    .filter(({ item: q }) =>
      q.type === 'multiple_choice' &&
      !q.graphic &&
      Array.isArray(q.choices) && q.choices.length >= 3,
    )
  // Unseen-first: students who have already met some of today's global
  // set (e.g. in a full test) get replacements from the same seeded
  // order instead of repeats; fresh students all get the identical set.
  const exposures = p.studentId
    ? await loadExposures(p.studentId, p.sessionId)
    : new Map<string, string>()
  const ordered = unseenFirst(pool, exposures, p.seed)
  const pickedRows = ordered.slice(0, p.count)
  if (p.studentId) {
    await recordExposures(p.studentId, pickedRows.map(r => r.id), p.source ?? 'practice', p.sessionId)
  }
  const picked = pickedRows.map(r => r.item)
  return picked.map(q => ({
    prompt: q.passage ? `${q.passage.trim()}\n\n${q.prompt.trim()}` : q.prompt,
    type: 'multiple_choice' as const,
    choices: q.choices,
    correct_answer: q.correct_answer,
    difficulty: q.difficulty,
    explanation: q.explanation,
  }))
}

export async function assembleFromBank(p: AssembleParams, seed = 'bank'): Promise<AssembledTest> {
  const family = p.family ?? 'sat'
  let query = supabaseAdmin
    .from('study_item_bank')
    .select('id, domain, difficulty, item')
    .eq('family', family)
    .eq('section', p.section)
    .eq('verified', true)
    .eq('archived', false)
  if (p.difficulties?.length) query = query.in('difficulty', p.difficulties)

  const { data, error } = await query
  if (error) throw new Error(`assemble query failed: ${error.message}`)
  const rows = (data ?? []) as Array<{ id: string; domain: string; difficulty: string; item: Question }>
  if (rows.length === 0) throw new Error(`no verified items for ${family}/${p.section}`)

  // Bucket by domain; within each bucket unseen items come first (in
  // seeded-shuffle order), then already-seen items oldest-first, so a
  // repeat can only happen once the student has exhausted a domain.
  const exposures = p.studentId ? await loadExposures(p.studentId) : new Map<string, string>()
  type Row = { id: string; item: Question }
  const byDomain = new Map<string, Row[]>()
  for (const r of rows) {
    const list = byDomain.get(r.domain) ?? []
    list.push({ id: r.id, item: r.item })
    byDomain.set(r.domain, list)
  }
  for (const d of byDomain.keys()) byDomain.set(d, unseenFirst(byDomain.get(d)!, exposures, seed + d))

  // Draw per-domain quotas from the College Board blueprint so the test
  // mirrors the real exam's weighting. Fall back to whatever domains
  // exist (even share) if the section has no blueprint entry.
  const weights = BLUEPRINT[p.section] ?? Object.fromEntries(
    [...byDomain.keys()].map(d => [d, 1 / byDomain.size]),
  )
  const quota = blueprintQuotas(weights, p.count)

  const picked: Row[] = []
  const composition: Record<string, number> = {}
  // Primary pass: take each domain's blueprint quota.
  for (const [d, q] of Object.entries(quota)) {
    const list = byDomain.get(d) ?? []
    const take = Math.min(q, list.length)
    for (let i = 0; i < take; i++) { picked.push(list.shift()!); composition[d] = (composition[d] ?? 0) + 1 }
  }
  // Shortfall fill: if a domain couldn't meet its quota (thin bank),
  // backfill from remaining items — heaviest blueprint domains first —
  // so the target count is still met without over-drawing a light
  // domain. Include any non-blueprint domains last so nothing strands.
  const fillOrder = [
    ...Object.keys(weights).sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0)),
    ...[...byDomain.keys()].filter(d => !(d in weights)),
  ]
  while (picked.length < p.count) {
    let progressed = false
    for (const d of fillOrder) {
      if (picked.length >= p.count) break
      const list = byDomain.get(d)
      if (list && list.length) {
        picked.push(list.shift()!); composition[d] = (composition[d] ?? 0) + 1; progressed = true
      }
    }
    if (!progressed) break
  }

  // Mix domain order so the section isn't clustered by domain.
  const mixed = seededShuffle(picked, seed + ':order')

  if (p.studentId) {
    // `seed` is the session id at the assemble call site; storing it
    // keeps the ledger row traceable to the test that served the item.
    await recordExposures(p.studentId, mixed.map(r => r.id), 'full_test', seed)
  }

  const meta = SECTION_META[p.section]!
  const timeLimitMinutes = Math.max(5, Math.round(mixed.length * meta.minutesPerQ))
  return {
    title: meta.title,
    timeLimitMinutes,
    section: meta.label,
    family,
    questions: mixed.map(r => r.item),
    composition,
  }
}
