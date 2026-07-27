import { dbAdmin } from '@/lib/supabase-admin'
import type { Question, QuestionType } from '@/lib/test-verify'

/**
 * ---------------------------------------------------------------------------
 * Reading `study_item_bank.item` back as a Question
 * ---------------------------------------------------------------------------
 * The column is `jsonb`, so the typed client hands it back as `Json`. Nothing
 * relates `Json` to `Question` — `Question` is an `interface` (no implicit
 * index signature) carrying `unknown`-typed escape hatches on `graphic` — so
 * the shape has to be re-established on read. It is re-established by
 * CHECKING, not asserting.
 *
 * Six fields are load-bearing (prompt, type, choices, correct_answer,
 * explanation, difficulty); a row missing any of them cannot be rendered or
 * graded, so it is skipped with a loud log rather than reaching the UI as a
 * half-empty card. Every other field is NORMALISED to the concrete default
 * `Question` declares, which is what `sanitizeQuestion` did on the way in —
 * pre-bank-era rows genuinely omit the metadata quartet (2217 of 4401 today).
 *
 * `item` carries exactly Question's 17 keys and nothing else (verified against
 * `jsonb_object_keys` over the live table), so rebuilding it loses nothing.
 */

/** Every `QuestionType`. The type-level assertion below fails to compile if
 *  lib/test-verify.ts adds a variant this list misses. */
const QUESTION_TYPES = [
  'multiple_choice', 'numeric_entry', 'multi_select', 'three_choice', 'quant_comparison',
  'fill_in_blanks', 'arrange_words', 'speaking_repeat', 'speaking_interview',
  'writing_email', 'writing_discussion',
] as const
export type _AllQuestionTypesListed =
  QuestionType extends (typeof QUESTION_TYPES)[number] ? true : never

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

function isQuestionType(v: unknown): v is QuestionType {
  return typeof v === 'string' && (QUESTION_TYPES as readonly string[]).includes(v)
}
function isDifficulty(v: unknown): v is Question['difficulty'] {
  return typeof v === 'string' && (DIFFICULTIES as readonly string[]).includes(v)
}

/** `Object.entries` rather than an index-signature assertion: it is the only
 *  way to read arbitrary keys off an `object` without widening its type. */
function bagOf(value: object): Map<string, unknown> {
  return new Map<string, unknown>(Object.entries(value))
}

const asString = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const asNumber = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const asStrings = (v: unknown): string[] | null =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null

/** QuestionGraphic is deliberately permissive (most fields `unknown`), so this
 *  keeps whatever is there and only enforces the few fields it does type. */
function readGraphic(v: unknown): Question['graphic'] {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return null
  const g = bagOf(v)
  const arr = (k: string): unknown[] | null => {
    const x = g.get(k)
    return Array.isArray(x) ? x : null
  }
  return {
    type: asString(g.get('type')),
    xLabel: asString(g.get('xLabel')),
    yLabel: asString(g.get('yLabel')),
    points: arr('points'),
    series: arr('series'),
    bestFit: g.get('bestFit'),
    bars: arr('bars'),
    values: arr('values'),
    rowLabels: asStrings(g.get('rowLabels')),
    colLabels: asStrings(g.get('colLabels')),
    cells: (() => {
      const rows = arr('cells')
      return rows ? rows.map(r => (Array.isArray(r) ? r : [])) : null
    })(),
    shape: asString(g.get('shape')),
    spec: g.get('spec'),
    labels: g.get('labels'),
    svg: asString(g.get('svg')),
    caption: asString(g.get('caption')),
  }
}

function readRationales(v: unknown): Question['distractor_rationales'] {
  if (!Array.isArray(v)) return []
  const out: Question['distractor_rationales'] = []
  for (const entry of v) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue
    const e = bagOf(entry)
    const choice = e.get('choice')
    const reason = e.get('reason')
    if (typeof choice === 'string' && typeof reason === 'string') out.push({ choice, reason })
  }
  return out
}

function readBlanks(v: unknown): Question['blanks'] {
  if (!Array.isArray(v)) return null
  const out: NonNullable<Question['blanks']> = []
  for (const entry of v) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue
    const e = bagOf(entry)
    const id = e.get('id')
    const answer = e.get('answer')
    if (typeof id !== 'number' || typeof answer !== 'string') continue
    out.push({ id, answer, alternates: asStrings(e.get('alternates')) })
  }
  return out
}

/**
 * Validate one stored bank item (a `Json` column value), or null if it cannot
 * be used. Takes `unknown` rather than `Json` so the narrowing yields a plain
 * object type instead of an intersection with `Json`'s scalar members.
 */
function readBankItem(item: unknown): Question | null {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) return null
  const b = bagOf(item)

  const prompt = b.get('prompt')
  const type = b.get('type')
  const choices = b.get('choices')
  const correctAnswer = b.get('correct_answer')
  const difficulty = b.get('difficulty')
  if (typeof prompt !== 'string' || !prompt) return null
  if (!isQuestionType(type)) return null
  if (!isDifficulty(difficulty)) return null
  if (typeof correctAnswer !== 'string') return null
  if (!Array.isArray(choices) || !choices.every((c: unknown) => typeof c === 'string')) return null

  return {
    passage: asString(b.get('passage')),
    passageGroupId: asString(b.get('passageGroupId')),
    prompt,
    type,
    choices,
    correct_answer: correctAnswer,
    correct_answers: asStrings(b.get('correct_answers')),
    acceptable_answers: asStrings(b.get('acceptable_answers')),
    difficulty,
    explanation: asString(b.get('explanation')) ?? '',
    distractor_rationales: readRationales(b.get('distractor_rationales')),
    blanks: readBlanks(b.get('blanks')),
    graphic: readGraphic(b.get('graphic')),
    domain: asString(b.get('domain')),
    subskill: asString(b.get('subskill')),
    topic_tag: asString(b.get('topic_tag')),
    word_count: asNumber(b.get('word_count')),
  }
}

/**
 * Assemble a test from the pre-verified item bank (study_item_bank),
 * as opposed to generating one live. Pulls only verified rows, draws
 * per-domain quotas from the College Board blueprint (see BLUEPRINT)
 * so the mix mirrors the real exam's weighting rather than an even
 * split, and shapes the result into the same TestPayload the generator
 * emits and the renderer consumes.
 *
 * Draw order within a domain is unseen-first (no-repeat tracking via
 * study_item_exposures), and a shortfall in one domain backfills from
 * the heaviest remaining domains so the target count is still met.
 *
 * Not yet layered on: difficulty-mix targets per module and the
 * 2-module adaptive routing the live/TOEFL path uses.
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
  const { data } = await dbAdmin
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
  // ignoreDuplicates:false so a re-serve REFRESHES seen_at — with
  // true, recycled items kept their original timestamp and the
  // oldest-first recycler dealt the identical set in the identical
  // order every time a pool ran dry.
  const { error } = await dbAdmin
    .from('study_item_exposures')
    .upsert(
      itemIds.map(item_id => ({
        student_id: studentId, item_id, source,
        session_id: sessionId ?? null,
        seen_at: new Date().toISOString(),
      })),
      { onConflict: 'student_id,item_id', ignoreDuplicates: false },
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
  /** Index of the first Module-2 item. Omitted for single-module tests;
   *  consumers fall back to a midpoint split, which is only correct when
   *  every item is interchangeable. */
  moduleBreakIdx?: number
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
export const BLUEPRINT: Record<string, Record<string, number>> = {
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
export function blueprintQuotas(weights: Record<string, number>, count: number): Record<string, number> {
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
  section: 'reading_writing' | 'math' | 'reading'
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
  let query = dbAdmin
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

  const pool = (data ?? [])
    .flatMap(row => {
      const item = readBankItem(row.item)
      if (!item) {
        console.error('[assemble] skipping malformed study_item_bank row', row.id)
        return []
      }
      return [{ id: row.id, item }]
    })
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

export type ToeflSection = 'reading' | 'listening' | 'writing' | 'speaking'

/**
 * TOEFL iBT (Jan 2026) section blueprint for bank assembly. Unlike SAT
 * (weighted by content domain), a TOEFL section is defined by its
 * TASK-TYPE mix — the item_type column drives the draw. Counts + timing
 * mirror TEST_SPECS.toefl (ETS Jan-21-2026 spec); `mix` is in the order
 * ETS delivers the tasks so the assembled test reads in the right
 * sequence (e.g. Speaking = 7 Listen-and-Repeat then 4 Interview).
 */
const TOEFL_META: Record<ToeflSection, {
  title: string; minutes: number; label: string
  mix: Array<{ type: string; n: number }>
}> = {
  // Reading counts SCORED ITEMS, not on-screen items. Complete-the-Words
  // (fill_in_blanks) is scored per blank — submit/route.ts returns
  // { total: blanks.length } for it — and each paragraph carries 10
  // blanks. So 2 CtW contribute 20 scored items, leaving 30 MC to reach
  // the spec's 50. Drawing 48 MC shipped 68 scored items in a 35-minute
  // section, a 36% overshoot. (The AI generator already did this
  // arithmetic correctly; the two paths had silently diverged.)
  reading:   { title: 'TOEFL iBT — Reading',   minutes: 35, label: 'Reading',
    mix: [{ type: 'fill_in_blanks', n: 2 }, { type: 'multiple_choice', n: 30 }] },
  listening: { title: 'TOEFL iBT — Listening', minutes: 36, label: 'Listening',
    mix: [{ type: 'multiple_choice', n: 47 }] },
  speaking:  { title: 'TOEFL iBT — Speaking',  minutes: 7,  label: 'Speaking',
    mix: [{ type: 'speaking_repeat', n: 7 }, { type: 'speaking_interview', n: 4 }] },
  writing:   { title: 'TOEFL iBT — Writing',   minutes: 29, label: 'Writing',
    mix: [{ type: 'arrange_words', n: 10 }, { type: 'writing_email', n: 1 }, { type: 'writing_discussion', n: 1 }] },
}

/**
 * Assemble a full TOEFL section from the pre-verified item bank —
 * the TOEFL analogue of assembleFromBank. Draws each task type's
 * blueprint quota (unseen-first per student), preserves ETS task order,
 * and clusters co-drawn Reading/Listening items that share a passage so
 * a passage renders with its questions. "Same as SAT": bank-only draw,
 * no AI top-up — returns fewer items if a task type is thin.
 *
 * The bank items are already stored in the renderer's Question shape
 * (passage/prompt/type/choices/blanks/correct_answer/…), so this is a
 * pure draw-and-shape — no transformation. Listening items carry their
 * transcript in item.passage ("Transcript: …"); the TestSession UI
 * routes it through /api/study/listening/tts at play time, so no audio
 * is stored here.
 *
 * TWO-STAGE ADAPTIVE (Reading + Listening): pass `module: 1` at test
 * start and `module: 2` + the routed `difficulties` after grading, and
 * each call draws only that module's share of every task type. Module 2
 * relies on `studentId` — module 1's items are already in the exposure
 * ledger, so unseen-first ranking pushes them to the back and the two
 * modules cannot overlap. Without a studentId there is no ledger and a
 * module-2 draw would repeat module 1, so adaptive callers must supply
 * one. Omitting `module` reproduces the original whole-section draw
 * byte for byte (Writing/Speaking + every non-adaptive caller).
 */
export async function assembleToeflFromBank(
  p: {
    section: ToeflSection
    studentId?: string
    /** Two-stage adaptive draw (Reading + Listening only). Omit to draw
     *  the WHOLE section exactly as before — Writing/Speaking and every
     *  non-adaptive caller depend on that path being untouched.
     *  1 → draw only module 1's share of each task type.
     *  2 → draw only module 2's share, filtered by `difficulties`. */
    module?: 1 | 2
    /** Bank difficulty filter for a routed module 2 (see
     *  difficultiesForToeflModule2). Ignored when `module` is unset. */
    difficulties?: Array<'easy' | 'medium' | 'hard'>
  },
  seed = 'bank',
): Promise<AssembledTest> {
  const meta = TOEFL_META[p.section]
  const query = dbAdmin
    .from('study_item_bank')
    .select('id, item_type, item, difficulty')
    .eq('family', 'toefl')
    .eq('section', p.section)
    .eq('verified', true)
    .eq('archived', false)
  // Difficulty banding is a MODULE-2 concept (module 1 is the fixed
  // mixed-difficulty form everyone takes), and it is applied below as a
  // PREFERENCE, not a filter.
  //
  // It used to be `.in('difficulty', p.difficulties)`. The TOEFL bank is
  // banked all-hard — on 2026-07-27 Reading held 614 usable hard items, 3
  // medium and ZERO easy; Listening 467 hard and nothing else. So a
  // student who routed to the `easy` module 2 got the intersection of
  // their band with an empty shelf: one real session shipped 19 items
  // (16 + a 3-item module 2) instead of 32, with only one of the two
  // Complete-the-Words paragraphs. Listening would have returned nothing.
  //
  // A student performing badly is exactly who must not be handed a
  // malformed test. Adaptivity we cannot materialise degrades to the
  // correct test SHAPE, drawn from whatever the bank has.
  const { data, error } = await query
    // Authoring order = insertion order. A Take-an-Interview set is
    // banked 1→N in ETS's escalation order (personal experience →
    // policy/prediction), and nothing else in the row carries that
    // sequence, so the draw must start from a stable authored order.
    .order('created_at', { ascending: true })
  if (error) throw new Error(`toefl assemble query failed: ${error.message}`)
  const rows = (data ?? []).flatMap(row => {
    const item = readBankItem(row.item)
    if (!item) {
      console.error('[assemble] skipping malformed study_item_bank row', row.id)
      return []
    }
    return [{ id: row.id, item_type: row.item_type, item, difficulty: row.difficulty }]
  })
  if (rows.length === 0) throw new Error(`no verified items for toefl/${p.section}`)

  const exposures = p.studentId ? await loadExposures(p.studentId) : new Map<string, string>()
  type Row = { id: string; item: Question; difficulty: string | null }
  const byType = new Map<string, Row[]>()
  for (const r of rows) {
    const list = byType.get(r.item_type) ?? []
    list.push({ id: r.id, item: r.item, difficulty: r.difficulty })
    byType.set(r.item_type, list)
  }

  // Routed module 2: rank the student's band first, then everything else,
  // and only then take the blueprint's count. Preference, not filter — see
  // the note on the query above. Returns the bucket untouched for module 1
  // and for whole-section draws.
  const bandPreferred = (bucket: Row[], type: string): Row[] => {
    if (p.module !== 2 || !p.difficulties?.length) {
      return unseenFirst(bucket, exposures, seed + type)
    }
    const want = new Set(p.difficulties)
    const inBand = bucket.filter(r => r.difficulty !== null && want.has(r.difficulty as 'easy' | 'medium' | 'hard'))
    const rest = bucket.filter(r => !(r.difficulty !== null && want.has(r.difficulty as 'easy' | 'medium' | 'hard')))
    return [
      ...unseenFirst(inBand, exposures, seed + type),
      ...unseenFirst(rest, exposures, seed + type + ':fallback'),
    ]
  }

  // Cluster items that share a passage (Reading/Listening: one passage
  // feeds several MC questions). Ungrouped items become singletons; the
  // first appearance of each group fixes its order so the sequence stays
  // stable (co-drawn same-passage items land adjacent, but a partial
  // group is fine — the passage text rides on every item).
  const clusterByPassage = (items: Row[]): Row[] => {
    const groups = new Map<string, Row[]>()
    const order: string[] = []
    for (const it of items) {
      const key = it.item.passageGroupId ?? `__solo:${it.id}`
      if (!groups.has(key)) { groups.set(key, []); order.push(key) }
      groups.get(key)!.push(it)
    }
    return order.flatMap(k => groups.get(k)!)
  }

  // Take-an-Interview draws WHOLE interviews, not loose questions: on
  // the real exam all N items belong to one interview on one topic and
  // must play in their authored 1→N order. Drawing item-by-item (as the
  // other task types do) would mix two interviews and shuffle the
  // escalation apart, so group first, rank groups unseen-first by their
  // first item, then emit each group intact in bank order.
  const drawInterviewGroups = (items: Row[], n: number): Row[] => {
    const groups = new Map<string, Row[]>()
    const order: string[] = []
    for (const it of items) {
      const key = it.item.passageGroupId ?? `__solo:${it.id}`
      if (!groups.has(key)) { groups.set(key, []); order.push(key) }
      groups.get(key)!.push(it)
    }
    const heads = order.map(k => ({ id: groups.get(k)![0].id, key: k }))
    const ranked = unseenFirst(heads, exposures, seed + 'speaking_interview')
    const out: Row[] = []
    for (const h of ranked) {
      if (out.length >= n) break
      out.push(...groups.get(h.key)!)
    }
    return out.slice(0, n)
  }

  // Per-module share of each task type. Module 1 takes the ceiling so
  // an odd count splits 24/23 (Listening's 47 MC) rather than 23/24,
  // and Reading's 2 Complete-the-Words paragraphs land one per module —
  // exactly the interleaving the whole-section path produces below.
  const shareForModule = (n: number): number => {
    if (!p.module) return n
    const m1 = Math.ceil(n / 2)
    return p.module === 1 ? m1 : n - m1
  }

  const composition: Record<string, number> = {}
  const picked: Row[] = []
  for (const { type, n: fullN } of meta.mix) {
    const n = shareForModule(fullN)
    if (n <= 0) continue
    const bucket = byType.get(type) ?? []
    if (type === 'speaking_interview') {
      const drawn = drawInterviewGroups(bucket, n)
      composition[type] = drawn.length
      picked.push(...drawn)
      continue
    }
    const ordered = bandPreferred(bucket, type).slice(0, n)
    composition[type] = ordered.length
    picked.push(
      ...((p.section === 'reading' || p.section === 'listening') && type === 'multiple_choice'
        ? clusterByPassage(ordered)
        : ordered),
    )
  }
  if (picked.length === 0) throw new Error(`no verified items for toefl/${p.section}`)

  // Reading ships as two modules, one Complete-the-Words paragraph in
  // each. The draw above emits both CtW first (mix order), so a naive
  // midpoint split — which is what the client falls back to when no
  // moduleBreakIdx is supplied — put BOTH in Module 1 and none in
  // Module 2, directly contradicting the break banner that promises
  // "a second Complete-the-Words paragraph" after the break.
  // Interleave one per module and hand the client an explicit break.
  let moduleBreakIdx: number | undefined
  if (p.module) {
    // Module-scoped draw: `shareForModule` already put exactly one
    // Complete-the-Words paragraph at the head of each module (mix
    // order), so there is nothing to interleave. Module 1 hands the
    // client its own length as the break point — Module 2 is appended
    // there by /api/study/test/route after grading.
    moduleBreakIdx = p.module === 1 ? picked.length : undefined
  } else if (p.section === 'reading') {
    const ctw = picked.filter(r => r.item.type === 'fill_in_blanks')
    const mc = picked.filter(r => r.item.type !== 'fill_in_blanks')
    if (ctw.length === 2) {
      const half = Math.ceil(mc.length / 2)
      const m1 = [ctw[0]!, ...mc.slice(0, half)]
      const m2 = [ctw[1]!, ...mc.slice(half)]
      picked.length = 0
      picked.push(...m1, ...m2)
      moduleBreakIdx = m1.length
    } else {
      // Thin bank (0 or 1 CtW drawn): fall back to a plain split rather
      // than promising a paragraph that isn't there.
      moduleBreakIdx = Math.ceil(picked.length / 2)
    }
  }

  if (p.studentId) {
    await recordExposures(p.studentId, picked.map(r => r.id), 'full_test', seed)
  }

  return {
    title: meta.title,
    timeLimitMinutes: meta.minutes,
    section: meta.label,
    family: 'toefl',
    questions: picked.map(r => r.item),
    composition,
    ...(moduleBreakIdx != null ? { moduleBreakIdx } : {}),
  }
}

export async function assembleFromBank(p: AssembleParams, seed = 'bank'): Promise<AssembledTest> {
  const family = p.family ?? 'sat'
  let query = dbAdmin
    .from('study_item_bank')
    .select('id, domain, difficulty, item')
    .eq('family', family)
    .eq('section', p.section)
    .eq('verified', true)
    .eq('archived', false)
  if (p.difficulties?.length) query = query.in('difficulty', p.difficulties)

  const { data, error } = await query
  if (error) throw new Error(`assemble query failed: ${error.message}`)
  const rows = (data ?? []).flatMap(row => {
    const item = readBankItem(row.item)
    if (!item) {
      console.error('[assemble] skipping malformed study_item_bank row', row.id)
      return []
    }
    return [{ id: row.id, domain: row.domain, difficulty: row.difficulty, item }]
  })
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
