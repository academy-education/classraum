import { dbAdmin } from '@/lib/supabase-admin'
import {
  ADMISSION_BLUEPRINT, drawByPassage, ITEMS_PER_PASSAGE, type AdmissionFamily,
} from './admission-tests'
import {
  actSection, ENGLISH_PASSAGES, ENGLISH_ITEMS_PER_PASSAGE,
  READING_GENRE_ORDER, READING_ITEMS_PER_PASSAGE, type ActSectionKey, type ReadingGenre,
} from './act-test'
import type { Question, QuestionType } from '@/lib/test-verify'
import { shuffleChoices } from '@/lib/test-verify'
import { capWarmupItems } from '@/lib/study/toefl-warmup'

/**
 * Randomise choice order AT DRAW TIME, for every bank-assembled test.
 *
 * WHY HERE AND NOT ONLY AT INSERT
 * -------------------------------
 * shuffleChoices() used to be called from exactly one place — the AI
 * generation route — so anything served from the bank went out in the order
 * it was authored. Two separate positional defects reached production that
 * way, both in hand-authored cohorts and both found by a blind grader
 * rather than by a test:
 *   - cr-v1 put the key in slot A on 73% of items
 *   - v3-claude made each 4-question set a COMPLETE ABCD permutation on 78%
 *     of sets, so three confident answers forced the fourth
 * Both were repaired in the data. The TOEFL helper shuffles on insert; the
 * two SAT helpers never did — they carried a shuffleInPlace that was
 * defined and called nowhere, which is exactly the failure mode this
 * paragraph warns about, sitting undetected in the repo while the comment
 * claimed otherwise. It was deleted on 2026-08-09 rather than wired,
 * because a write-site guard is the weaker half: enforcing this at N WRITE
 * sites and zero READ sites means any future writer — a new script, a
 * restored backup, a manual insert — reintroduces the defect silently.
 *
 * Shuffling on the way OUT makes it structurally impossible instead of
 * conventionally avoided. It also varies the order per session, so a
 * student re-served a familiar item cannot answer it from "it was C".
 *
 * Ordering: this runs BEFORE the caller writes its [full-test-v1] cache,
 * and submit/route.ts grades against that cache — so the student sees,
 * and is graded on, the same order. Verified against
 * src/app/api/study/test/assemble/route.ts.
 *
 * Types whose choice order carries meaning or is unused are left alone:
 * quant_comparison (shuffleChoices already refuses it), and everything
 * that is not scored by choosing among `choices`.
 */
const ORDERED_OR_UNUSED: ReadonlySet<string> = new Set([
  'fill_in_blanks', 'arrange_words', 'speaking_repeat', 'speaking_interview',
  'writing_email', 'writing_discussion', 'numeric_entry', 'quant_comparison',
])

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** Seeded per (draw seed, item identity) so a re-draw of the same session
 *  is stable — a student who reloads must not see the choices move. */
export function shuffleDrawnChoices<T extends { id: string; item: Question }>(
  rows: T[], seed: string,
): T[] {
  return rows.map(r => {
    // Stamp the bank row id on the way out, so an attempt can be traced
    // back to the item. Done here because this is the one function every
    // bank draw passes through on its way to the caller.
    const item = { ...r.item, bankItemId: r.id }
    if (ORDERED_OR_UNUSED.has(item.type) || item.choices.length < 2) return { ...r, item }
    return { ...r, item: shuffleChoices(item, hashSeed(`${seed}:${r.id}`)) }
  })
}

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
 * `item` carries exactly Question's keys and nothing else (verified against
 * `jsonb_object_keys` over the live table), so rebuilding it loses nothing.
 *
 * That last sentence is a STANDING OBLIGATION, not an observation: this
 * function rebuilds the item from a fixed key list, so any key written into
 * `item` that is not read back here is silently dropped between the bank and
 * the assembler. `listeningTask` was added to the column and to `Question`
 * together for exactly that reason — writing it without reading it would have
 * produced a bank that looked correctly classified in SQL and completely
 * unclassified in the draw.
 */

/** Every `QuestionType`. The type-level assertion below fails to compile if
 *  lib/test-verify.ts adds a variant this list misses. */
const QUESTION_TYPES = [
  'multiple_choice', 'numeric_entry', 'multi_select', 'three_choice', 'quant_comparison',
  'fill_in_blanks', 'arrange_words', 'speaking_repeat', 'speaking_interview',
  'writing_email', 'writing_discussion', 'essay', 'essay_choice',
] as const
export type _AllQuestionTypesListed =
  QuestionType extends (typeof QUESTION_TYPES)[number] ? true : never

/** Types with no answer key. A student's response is graded, not matched. */
const FREE_RESPONSE = new Set<string>([
  'speaking_repeat', 'speaking_interview',
  'writing_email', 'writing_discussion', 'essay', 'essay_choice',
])

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
  /*
   * Free response has no key, and requiring a string here silently made
   * every SSAT Writing Sample and ISEE Essay item undrawable: they were
   * banked with correct_answer null, readBankItem returned null, and the
   * section threw "no verified items" for a student who selected it.
   *
   * The bank's own convention for free response — set by the 182 live
   * TOEFL writing_email / writing_discussion rows — is an EMPTY STRING,
   * not null. The 12 essay rows have been corrected to match, so this
   * stays a string check for every type; null is accepted only for the
   * free-response types, as tolerance for rows banked before the
   * convention was enforced.
   */
  if (typeof correctAnswer !== 'string' && !(correctAnswer === null && FREE_RESPONSE.has(type))) return null
  const key = typeof correctAnswer === 'string' ? correctAnswer : ''
  if (!Array.isArray(choices) || !choices.every((c: unknown) => typeof c === 'string')) return null

  return {
    passage: asString(b.get('passage')),
    passageGroupId: asString(b.get('passageGroupId')),
    prompt,
    type,
    choices,
    correct_answer: key,
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
    listeningTask: asString(b.get('listeningTask')),
    readingTask: asString(b.get('readingTask')),
    scored: b.get('scored') === false ? false : null,
    // Filled in by the draw, not read from the column — the id lives on the
    // ROW, not inside `item`.
    bankItemId: null,
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
  // NOTE this is a real SQL FILTER, unlike the TOEFL full-test draw where
  // difficulty is only a preference. A caller asking for a band the bank
  // does not hold gets ZERO items, not a smaller set.
  //
  // Live as of 2026-07-28: no TOEFL StudyPath node sets `difficulties`
  // (only the SAT nodes do), which matters because
  // scripts/classify-toefl-tasks.ts re-labelled every TOEFL listening item
  // off 'hard' — a TOEFL node requesting ['medium','hard'] would now come
  // back nearly empty. Check the bank's actual spread before adding one.
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
  // Practice draws shuffle too — the positional defects were in the bank,
  // not in one code path, so every reader of the bank has to be safe.
  const picked = shuffleDrawnChoices(pickedRows, p.seed).map(r => r.item)
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
/** The four ETS Jan-2026 Listening tasks. A listening bank row carries one of
 *  these in `item.listeningTask` (written by
 *  scripts/classify-listening-tasks.ts). */
export const LISTENING_TASKS = ['choose_response', 'conversation', 'announcement', 'academic_talk'] as const
export type ListeningTask = (typeof LISTENING_TASKS)[number]

/** The two ETS Jan-2026 Reading MC tasks. Complete the Words is the third
 *  reading task but needs no tag — it is item_type='fill_in_blanks'. */
export const READING_TASKS = ['daily_life', 'academic_passage'] as const
export type ReadingTask = (typeof READING_TASKS)[number]

export type ToeflTask = ListeningTask | ReadingTask

/** ETS's Stage 2 is ONE of two modules, not a difficulty tint on a fixed
 *  one: the lower and upper modules carry DIFFERENT TASK MIXES. Listening
 *  lower drops Academic Talk entirely; upper drops Announcement entirely.
 *  Reading lower drops Academic Passage; upper drops Daily Life. */
export type ToeflStage2Path = 'lower' | 'upper'

/** Tasks whose audio must carry MORE THAN ONE question. ETS pairs a
 *  conversation, an announcement or an academic talk with 2-5 questions;
 *  only Choose-a-Response is one-question-per-audio. A single-question
 *  conversation in the bank is not a short task type, it is an ORPHAN — a
 *  harvested set whose siblings were lost — and serving one makes the
 *  student read a 2,000-character transcript to answer one question. 31 of
 *  the 171 banked audios are in that state; `isDrawableSet` excludes them. */
const MULTI_QUESTION_TASKS: ReadonlySet<string> = new Set([
  'conversation', 'announcement', 'academic_talk',
  // Daily Life. ETS delivers this task as short 2-3 question sets over one
  // 40-90 word text, and TEST_SPECS says so; 68 of the bank's 103 daily-life
  // texts nonetheless carry a single question, so a student read fifteen
  // separate notices in one section. It was excluded here until 2026-07-28
  // on the reasoning that a one-question notice is legitimate "by design",
  // evidenced by how many of ours look that way — which is circular: the
  // bank's shape is evidence about our generator, not about ETS.
  //
  // Excluding them drops the drawable pool to the 35 texts that already
  // carry 2 questions. That is thin, and it recycles sooner. It is still
  // the right trade: a shallower pool of well-formed sets beats a deep pool
  // that misrepresents the task. Repopulating it needs items that cannot be
  // answered without the passage — the 2026-07-28 repair batch scored 95%
  // with the passages deleted and was discarded rather than banked.
  'daily_life',
  // Reading: an academic passage feeds ~5 questions in ETS's design, and 22
  // of ours carry exactly one — harvest casualties. Daily Life is NOT here:
  // a campus notice with a single question is a legitimate ETS item, and 68
  // of the bank's 103 daily-life texts are that shape by design.
  'academic_passage',
])

export const TOEFL_META: Record<ToeflSection, {
  title: string; minutes: number; label: string
  /** `type` selects on `study_item_bank.item_type`; `task` selects on
   *  item.listeningTask / item.readingTask for multiple_choice rows.
   *
   *  `n`     — whole-section draw (no `module` passed). Equals m1 + upper,
   *            i.e. the hard path, which is the fuller of the two.
   *  `m1`    — Stage 1 count.
   *  `lower` / `upper` — Stage 2 count on each ETS path. These are set
   *            per-path rather than derived, because ETS's two Stage 2
   *            modules have different TASK MIXES, not just difficulties. */
  //  `sM1` / `sLower` / `sUpper` — how many of that stage's DELIVERED
  //            items are SCORED. ETS delivers 48 per path and scores 35
  //            (Table 1 note: "may contain extra unscored questions"). The
  //            rest are pilots: graded and shown in review, excluded from
  //            the denominator. Omit to score everything.
  mix: Array<{
    type: string; n: number; task?: ToeflTask
    m1?: number; lower?: number; upper?: number
    sM1?: number; sLower?: number; sUpper?: number
    /** Fixed difficulty spread for this task's draw. Sums to `n`. Used
     *  where an even experience matters more than a random one — see the
     *  speaking entry. */
    ramp?: { easy: number; medium: number; hard: number }
  }>
}> = {
  // Reading counts SCORED ITEMS, not on-screen items. Complete-the-Words
  // (fill_in_blanks) is scored per blank — submit/route.ts returns
  // { total: blanks.length } for it — and each paragraph carries 10
  // blanks. So 2 CtW contribute 20 scored items, leaving 30 MC to reach
  // the spec's 50. Drawing 48 MC shipped 68 scored items in a 35-minute
  // section, a 36% overshoot. (The AI generator already did this
  // arithmetic correctly; the two paths had silently diverged.)
  // Reading — three ETS tasks, 48 questions per path.
  //
  // Counts are SCORED QUESTIONS in ETS's own convention (Table 1): a
  // Complete-the-Words paragraph is TEN questions, not one. `n` here counts
  // BANK ROWS, so fill_in_blanks n=2 means two paragraphs = 20 questions.
  //   Stage 1      : 1 CtW (10) + 9 daily + 9 academic = 28 questions
  //   Stage 2 lower: 1 CtW (10) + 10 daily + 0 academic = 20
  //   Stage 2 upper: 1 CtW (10) + 0 daily + 10 academic = 20
  //   easy path 48, hard path 48; 30 on-screen cards either way.
  //
  // Two deviations from ETS's ratios, both forced:
  //  - Complete the Words is 57% of ETS's scored Reading but cannot scale:
  //    a paragraph is exactly 10 questions and ETS delivers one per stage.
  //    Holding 1/stage at 48 questions puts it at 42%. Adding a third
  //    paragraph would break the one-per-stage symmetry, so it stays.
  //  - The Daily/Academic inversion between paths is ETS's, kept exactly:
  //    the lower path reads notices and emails, the upper path reads
  //    academic prose. That inversion is the whole point of the routing,
  //    and it is what the old flat `multiple_choice` blueprint destroyed.
  reading:   { title: 'TOEFL iBT — Reading',   minutes: 35, label: 'Reading',
    mix: [
      // Scored counts are ETS Table 1 exactly: Stage 1 = 10 CtW + 5 + 5,
      // Stage 2 = 10 CtW + 5 of whichever MC task that path serves.
      // Complete the Words is never a pilot — that is the whole point of
      // the split, since it is what keeps CtW at 20/35 = 57% of the score.
      { type: 'fill_in_blanks', n: 2, m1: 1, lower: 1, upper: 1, sM1: 1, sLower: 1, sUpper: 1 },
      // Stage 1 is 10 Daily / 8 Academic, not 9 / 9. Daily Life sets are all
      // EVEN (two questions each) now that single-question texts are excluded,
      // so an odd quota is not a reachable sum: a 9 drew 8 and the section
      // shipped 47 delivered against a sheet promising 48 — the same
      // count-drift bug fixed in 4f91709, reintroduced from the other side.
      // Academic sets are 2-5 questions, so 8 is reachable there. Scored
      // counts are untouched, so ETS Table 1 still holds at 35.
      { type: 'multiple_choice', task: 'daily_life',       n: 10, m1: 10, lower: 10, upper: 0,
        sM1: 5, sLower: 5, sUpper: 0 },
      { type: 'multiple_choice', task: 'academic_passage', n: 18, m1: 8, lower: 0,  upper: 10,
        sM1: 5, sLower: 0, sUpper: 5 },
    ] },
  // Listening is FOUR ETS tasks, not one bag of MC.
  //
  // This entry used to read `[{ type: 'multiple_choice', n: 47 }]`. Every
  // banked listening item is item_type='multiple_choice', so that drew 47
  // interchangeable items and the ETS task mix — which TEST_SPECS already
  // describes correctly for the AI generator — was ignored on the bank path
  // entirely. A student could be served a Listening section that was almost
  // all academic lectures, or almost all conversations, at random.
  //
  // Counts sit inside ETS's published Jan-2026 ranges (Choose-a-Response
  // 15-19, Conversation 10 fixed, Announcement 6-10, Academic Talk 8-16)
  // and sum to 48 DELIVERED per path, of which 35 are scored. ETS flexes
  // the ranges per form — the maxima do not co-occur (they sum to 55) — so
  // treat this as one valid form, not as the only one.
  //
  // `task` selects on item.listeningTask. Order is ETS's delivery order:
  // the short response cues open the section, longer audio follows.
  listening: { title: 'TOEFL iBT — Listening', minutes: 36, label: 'Listening',
    mix: [
      // Per-path Stage 2 counts, straight from ETS Table 1's ratios scaled
      // to 48. Note what inverts: the lower path serves NO Academic Talk and
      // the upper path serves NO Announcement.
      //   Stage 1      : 11 / 6 / 6 / 4  = 27
      //   Stage 2 lower:  9 / 6 / 6 / 0  = 21   (easy path total 48)
      //   Stage 2 upper:  3 / 6 / 0 / 12 = 21   (hard path total 48)
      //
      // Every conversation and announcement count is EVEN on purpose. Those
      // audios exist in the bank only in sets of 2 and 4, so an odd quota is
      // not a reachable sum of whole sets and the draw silently comes up
      // short — which is exactly what a 5 did before the live-bank verifier
      // caught it. Academic Talk has 2/3/4-question sets, so 12 packs; 11
      // would need one of the only three 3-question talks in the bank.
      // Scored counts are ETS Table 1 exactly (Stage 1 8/4/4/4 = 20;
      // lower 7/4/4/0 = 15; upper 3/4/0/8 = 15). Delivered minus scored is
      // 13 on either path, matching ETS's own scored-vs-delivered gap.
      // ── ETS SHAPE RESTORED, 2026-08-18 ──────────────────────────────
      //
      // From 2026-08-11 to 2026-08-18 Choose a Response was deliberately
      // cut from 14 delivered to 6 (3/3/3) and the 8 freed slots went to
      // Conversation (8/12/6) and Academic Talk (10/0/12), because the
      // then-live cr-v1 cohort was answerable WITHOUT the audio: blind
      // solvers ~75%, the one usable human sitting 53%, against 25%
      // chance. That cut was exposure control, never a shape opinion.
      //
      // cr-v7 fixed the items instead of hiding them: four symmetrically
      // authored worlds per item, and a seeded RNG picks the spoken world
      // only after the text is frozen, so the key is independent of every
      // text feature by construction. It cleared both pre-registered
      // blind-attack gates (S1 −16.7, S2 +1.4, post-cohesion re-attack
      // +5.6; kill bar +30 — CRV7-RESULT.md) and shipped 2026-08-18 on
      // Andy's explicit approval: the 132 cr-v7 items are live, the 63
      // old rows (cr-v1/cr-v2/harvest-v1) are archived, and these rows
      // are byte-for-byte the numbers they carried before 2026-08-11.
      //
      // Andy's standing rule, quoted so the count is never "tuned" again:
      // the delivered count returns to the real ETS shape and NEVER
      // changes again. Fix items, archive cohorts, rebuild banks — the
      // task mix below is the exam's shape, not a knob. Every number in
      // these rows is pinned by listening-blueprint.test.ts.
      //
      // Arithmetic that must hold — re-derived at restoration and pinned:
      //   delivered  m1 + lower = 48   m1 + upper = 48
      //   scored     sM1 20, sLower 15, sUpper 15
      //   scored <= delivered for every task on every path
      //   conversation and announcement counts EVEN (audio sets of 2/4)
      //   academic_talk counts EVEN — even counts need only 2s and 4s, so
      //     the blueprint does not depend on which set sizes happen to
      //     exist. (History: a 9/3/13 draft was arithmetically fine and
      //     still broke the fixture-backed draw; and the "only three
      //     3-question talks in the bank" note above is stale — measured
      //     2026-08-11 and again 2026-08-18, the live bank holds talk
      //     sets 33×2 / 12×3 / 43×4.)
      //   choose_response m1 ODD: the other three tasks are all even and
      //     module 1 totals 27.
      //   ETS's Stage 2 INVERSION preserved — the lower module serves no
      //     Academic Talk and the upper module no Announcement.
      // Live fillability re-checked against the real bank 2026-08-18, by
      // count queries, not inferred from the unit test: choose_response
      // 132 live rows (sets of 1), conversation 193, announcement 121,
      // academic_talk 274 — every count below is a reachable sum of
      // whole sets in today's bank.
      { type: 'multiple_choice', task: 'choose_response', n: 14, m1: 11, lower: 9, upper: 3,
        sM1: 8, sLower: 7, sUpper: 3 },
      { type: 'multiple_choice', task: 'conversation',    n: 12, m1: 6,  lower: 6, upper: 6,
        sM1: 4, sLower: 4, sUpper: 4 },
      { type: 'multiple_choice', task: 'announcement',    n: 6,  m1: 6,  lower: 6, upper: 0,
        sM1: 4, sLower: 4, sUpper: 0 },
      { type: 'multiple_choice', task: 'academic_talk',   n: 16, m1: 4,  lower: 0, upper: 12,
        sM1: 4, sLower: 0, sUpper: 8 },
    ] },
  // Speaking. Listen-and-Repeat draws a deliberate RAMP rather than 7 at
  // random.
  //
  // ETS does not tier this task — the spec fixes only the 8-12 word band —
  // so the ramp is our choice, not fidelity. It exists because a random 7
  // from a 42/40/15 bank lands anywhere from 1 to 5 easy, and a student
  // whose first three sentences are all 12-word items reads the section as
  // harder than it is. That was the reported complaint. A fixed
  // 3 easy / 3 medium / 1 hard makes the experience predictable while
  // staying inside the band on every item.
  speaking:  { title: 'TOEFL iBT — Speaking',  minutes: 7,  label: 'Speaking',
    mix: [
      { type: 'speaking_repeat', n: 7, ramp: { easy: 3, medium: 3, hard: 1 } },
      { type: 'speaking_interview', n: 4 },
    ] },
  // Writing is timed PER TASK, not as one pool: the Build-a-Sentence
  // block gets 6 minutes, the Email 7, the Academic Discussion 10 —
  // 23 total. The client derives those per-section clocks from the
  // delivered question order (see lib/study/writing-section-timing.ts);
  // this `minutes` value is their sum and is what a single-timer
  // fallback (short warmups, drills) uses.
  writing:   { title: 'TOEFL iBT — Writing',   minutes: 23, label: 'Writing',
    mix: [{ type: 'arrange_words', n: 10 }, { type: 'writing_email', n: 1 }, { type: 'writing_discussion', n: 1 }] },
}

/** A Complete-the-Words paragraph carries exactly ten blanks and each blank
 *  is scored separately (submit/route.ts returns `{ total: blanks.length }`
 *  for fill_in_blanks). So ONE CtW bank row is TEN questions in ETS's
 *  Table 1 units, and the blueprint's `n` — which counts bank rows — has to
 *  be multiplied by this before it can be compared to a question count.
 *  Holds for all 93 banked paragraphs; scripts/verify-toefl-tasks.ts fails
 *  if one drifts. */
export const BLANKS_PER_CTW = 10

/** The three counts a TOEFL section has, which are NOT interchangeable and
 *  were being conflated across three files until 2026-07-28:
 *   - `cards`     — how many screens the student paginates through.
 *   - `delivered` — how many QUESTIONS they answer (a CtW card is ten).
 *                   This is the number to show them.
 *   - `scored`    — how many count toward the score. ETS delivers 48 and
 *                   scores 35 per section; the rest are unscored pilots. */
export interface ToeflStageShape { cards: number; delivered: number; scored: number }

const EMPTY_SHAPE = (): ToeflStageShape => ({ cards: 0, delivered: 0, scored: 0 })

/**
 * Derive a section's shape FROM THE BLUEPRINT that actually draws it.
 *
 * WHY THIS EXISTS
 * ---------------
 * These counts previously lived independently in three places —
 * TOEFL_META here (what ships), TEST_SPECS.questionsPerSection (the label
 * the student sees, and the AI generator's target) and
 * TOEFL_ADAPTIVE_SECTIONS (the module split). Reading was 48 / 50 / 50 and
 * Listening 48 / 47 / 47: the customization sheet promised 50 Reading
 * questions and the session served 48.
 *
 * A test already asserted the second and third agreed. They did — with each
 * other, and with nothing that ships. So the numbers are computed here now
 * and the other two are checked against this, not against each other.
 */
export function toeflSectionShape(
  section: ToeflSection, path: ToeflStage2Path = 'upper',
): { stage1: ToeflStageShape; stage2: ToeflStageShape; total: ToeflStageShape } {
  const stage1 = EMPTY_SHAPE()
  const stage2 = EMPTY_SHAPE()

  for (const m of TOEFL_META[section].mix) {
    // Questions per bank row: ten for Complete the Words, one otherwise.
    const perRow = m.type === 'fill_in_blanks' ? BLANKS_PER_CTW : 1
    // Linear sections (Speaking, Writing) carry no module split — the whole
    // draw is `n` and it all lands in stage 1.
    const adaptive = m.m1 !== undefined
    const rows1 = adaptive ? (m.m1 ?? 0) : m.n
    const rows2 = adaptive ? (path === 'lower' ? (m.lower ?? 0) : (m.upper ?? 0)) : 0
    // `sM1`/`sLower`/`sUpper` omitted means "score everything in this task".
    const scored1 = m.sM1 ?? rows1
    const scored2 = adaptive ? (path === 'lower' ? (m.sLower ?? rows2) : (m.sUpper ?? rows2)) : 0

    stage1.cards += rows1; stage1.delivered += rows1 * perRow; stage1.scored += scored1 * perRow
    stage2.cards += rows2; stage2.delivered += rows2 * perRow; stage2.scored += scored2 * perRow
  }

  return {
    stage1, stage2,
    total: {
      cards: stage1.cards + stage2.cards,
      delivered: stage1.delivered + stage2.delivered,
      scored: stage1.scored + stage2.scored,
    },
  }
}

/**
 * Assemble a full TOEFL section from the pre-verified item bank —
 * the TOEFL analogue of assembleFromBank. Draws each task type's
 * blueprint quota (unseen-first per student), preserves ETS task order,
 * and draws shared-passage Reading/Listening items as WHOLE SETS — the
 * grouping unit survives ranking, the band preference, the blueprint
 * count and the module split (see "Passage sets are the unit of the
 * draw" below). "Same as SAT": bank-only draw,
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
    /**
     * Cap the drawn items — used by the path's Speaking/Writing WARMUP
     * stops, which are short runs of the same task types rather than a
     * whole section.
     *
     * Exists because a caller could not previously ask for a shorter
     * TOEFL run at all: the assemble route accepts `count` for SAT and
     * this function had no equivalent, so a path node carrying
     * questionCount: 2 silently drew the FULL section. A warmup
     * identical to the section it warms up for is worse than none.
     *
     * SPEAKING AND WRITING ONLY. Reading and Listening draw whole
     * passage sets; truncating mid-set would show a student a passage
     * and then hide half of its questions.
     */
    maxItems?: number
    /**
     * Restrict the draw to ONE bank domain — 'Build a Sentence',
     * 'Conversation', 'Complete the Words' and so on.
     *
     * This is the per-question-type DRILL the path uses before a
     * section test. It deliberately BYPASSES the ETS blueprint: a
     * blueprint apportions quotas across the section's task mix, and
     * over a single-domain pool every other quota finds nothing, so the
     * shape it produces is meaningless. A drill is not a small test.
     */
    domain?: string
    /** Two-stage adaptive draw (Reading + Listening only). Omit to draw
     *  the WHOLE section exactly as before — Writing/Speaking and every
     *  non-adaptive caller depend on that path being untouched.
     *  1 → draw only module 1's share of each task type.
     *  2 → draw only module 2's share, filtered by `difficulties`. */
    module?: 1 | 2
    /** Bank difficulty filter for a routed module 2 (see
     *  difficultiesForToeflModule2). Ignored when `module` is unset. */
    difficulties?: Array<'easy' | 'medium' | 'hard'>
    /** Which ETS Stage 2 module to build — they carry DIFFERENT TASK
     *  MIXES, not just different difficulty (see ToeflStage2Path).
     *  Ignored unless `module === 2`.
     *
     *  Falls back to deriving from `difficulties` for callers that predate
     *  the split: a student routed to the easy band gets the lower module.
     *  That default is a compatibility shim, not the intended contract —
     *  callers should pass `path` explicitly. */
    path?: ToeflStage2Path
  },
  seed = 'bank',
): Promise<AssembledTest> {
  const meta = TOEFL_META[p.section]
  let query = dbAdmin
    .from('study_item_bank')
    .select('id, item_type, item, difficulty')
    .eq('family', 'toefl')
    .eq('section', p.section)
    .eq('verified', true)
    .eq('archived', false)
  // Single-domain drill: filter in SQL rather than after the fetch, so
  // an empty domain fails on its own row count instead of quietly
  // producing a short test.
  if (p.domain) query = query.eq('domain', p.domain)
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

  /*
   * ── Single-domain drill ────────────────────────────────────────────
   * One question type, unseen-first, capped. Returns before the
   * blueprint runs, for the reason given on `domain` above.
   *
   * Passage sets are kept whole: Reading and Listening items arrive in
   * groups sharing a passageGroupId, and cutting mid-group would show a
   * student a passage and then hide half its questions — the same rule
   * capWarmupItems enforces for the section draw.
   */
  if (p.domain) {
    // rows is already domain-filtered by the query above.
    const ordered = unseenFirst(rows, exposures, seed + p.domain)
    const want = p.maxItems ?? 3
    const picked: typeof ordered = []
    for (const row of ordered) {
      if (picked.length >= want) {
        // Only stop on a group boundary — never split a passage set.
        const gid = (row.item as { passageGroupId?: string | null }).passageGroupId
        const prevGid = (picked[picked.length - 1]?.item as { passageGroupId?: string | null })?.passageGroupId
        if (!gid || gid !== prevGid) break
      }
      picked.push(row)
    }
    if (p.studentId) {
      await recordExposures(p.studentId, picked.map(r => r.id), 'full_test', seed)
    }
    return {
      title: `${meta.title} · ${p.domain}`,
      timeLimitMinutes: Math.max(3, Math.round(meta.minutes * picked.length / 20)),
      section: meta.label,
      family: 'toefl',
      questions: shuffleDrawnChoices(picked, seed).map(r => r.item),
      composition: { [p.domain]: picked.length },
    }
  }
  type Row = { id: string; item: Question; difficulty: string | null }
  // Bucket key. Every section but Listening keys on item_type, exactly as
  // before. Listening ALSO keys on the ETS task, because all four of its
  // tasks share item_type='multiple_choice' and the blueprint has to be
  // able to ask for ten conversation questions specifically.
  //
  // A listening row with no listeningTask lands under a key no mix entry
  // names, so it is simply never drawn. That is deliberate: an unclassified
  // row has no defensible slot in a task-quota'd blueprint, and dropping it
  // is visible in `composition` (the section comes up short) whereas
  // guessing a task for it would not be.
  //
  // Only multiple_choice is task-keyed. Complete the Words is its own
  // item_type and needs no tag; suffixing it would put a paragraph in an MC
  // task's bucket.
  const taskOf = (item: Question): string | null =>
    p.section === 'listening' ? item.listeningTask
    : p.section === 'reading' ? item.readingTask
    : null
  const taskKeyed = (type: string) =>
    type === 'multiple_choice' && (p.section === 'listening' || p.section === 'reading')
  const bucketKey = (item_type: string, item: Question): string =>
    taskKeyed(item_type) ? `${item_type}:${taskOf(item) ?? 'unclassified'}` : item_type
  const mixKey = (m: { type: string; task?: ToeflTask }): string =>
    taskKeyed(m.type) ? `${m.type}:${m.task ?? 'unclassified'}` : m.type

  const byType = new Map<string, Row[]>()
  for (const r of rows) {
    const key = bucketKey(r.item_type, r.item)
    const list = byType.get(key) ?? []
    list.push({ id: r.id, item: r.item, difficulty: r.difficulty })
    byType.set(key, list)
  }

  // Routed module 2: rank the student's band first, then everything else,
  // and only then take the blueprint's count. Preference, not filter — see
  // the note on the query above. Returns the bucket untouched for module 1
  // and for whole-section draws.
  const bandPreferred = (bucket: Row[], type: string): Row[] => {
    if (p.module !== 2 || !p.difficulties?.length) {
      return unseenFirst(bucket, exposures, seed + type)
    }
    const want = new Set<string>(p.difficulties)
    const inBand = bucket.filter(r => r.difficulty !== null && want.has(r.difficulty))
    const rest = bucket.filter(r => !(r.difficulty !== null && want.has(r.difficulty)))
    return [
      ...unseenFirst(inBand, exposures, seed + type),
      ...unseenFirst(rest, exposures, seed + type + ':fallback'),
    ]
  }

  // ── Passage sets are the unit of the draw, not the item ──────────────
  //
  // Reading/Listening MC items and Take-an-Interview items come in SETS:
  // one passage (or transcript, or interview topic) feeds N questions, and
  // every item in the set carries the shared `passageGroupId`. The unit
  // that must survive ranking, band preference, the blueprint count and
  // the module split is the SET — a half-drawn set makes the student read
  // a full passage to answer two questions, and a set cut across the
  // module break shows them the same passage again after the break.
  type Group = { key: string; rows: Row[] }

  const groupKeyOf = (r: Row): string => r.item.passageGroupId ?? `__solo:${r.id}`

  /** Bucket rows into passage sets. Ungrouped items become singleton sets,
   *  so every draw path below can be written once, over sets. Bank order
   *  (created_at) is preserved inside a set — an authored 1→N interview
   *  escalation has no other carrier. */
  const groupRows = (items: Row[]): Group[] => {
    const groups = new Map<string, Row[]>()
    const order: string[] = []
    for (const it of items) {
      const key = groupKeyOf(it)
      if (!groups.has(key)) { groups.set(key, []); order.push(key) }
      groups.get(key)!.push(it)
    }
    return order.map(k => ({ key: k, rows: groups.get(k)! }))
  }

  /** `unseenFirst`, lifted to sets. A set counts as SEEN when ANY of its
   *  items is in the ledger — module 1 having served part of a set must
   *  push the WHOLE set back, not let its untouched members rank to the
   *  front and re-show the passage after the break. Recycling order is a
   *  set's OLDEST exposure. Unseen sets rank by their first item, which
   *  reproduces `unseenFirst` exactly for singleton sets. */
  const orderGroups = (groups: Group[], s: string): Group[] => {
    const decorated = groups.map(g => {
      let oldest: string | null = null
      for (const r of g.rows) {
        const t = exposures.get(r.id)
        if (t !== undefined && (oldest === null || t < oldest)) oldest = t
      }
      return { g, seen: oldest, head: g.rows[0]!.id }
    })
    const unseen = decorated.filter(d => d.seen === null)
      .sort((a, b) => itemRank(s, a.head) - itemRank(s, b.head) || a.head.localeCompare(b.head))
    const seen = decorated.filter(d => d.seen !== null)
      .sort((a, b) => a.seen!.localeCompare(b.seen!))
    return [...unseen, ...seen].map(d => d.g)
  }

  /** `bandPreferred`, lifted to sets. A set's items can straddle the
   *  routed band; partitioning ITEM-wise put half a passage's questions in
   *  the in-band partition and half in the fallback, which interleaves two
   *  passages once the count is taken. A SET is in-band when at least half
   *  its items are, and it moves as one. Singleton sets reduce to the
   *  item-level rule exactly. */
  const bandPreferredGroups = (groups: Group[], type: string): Group[] => {
    if (p.module !== 2 || !p.difficulties?.length) return orderGroups(groups, seed + type)
    const want = new Set<string>(p.difficulties)
    const inBand = (g: Group) => {
      const hits = g.rows.filter(r => r.difficulty !== null && want.has(r.difficulty)).length
      return hits * 2 >= g.rows.length
    }
    return [
      ...orderGroups(groups.filter(inBand), seed + type),
      ...orderGroups(groups.filter(g => !inBand(g)), seed + type + ':fallback'),
    ]
  }

  /** Take `n` items as WHOLE sets, in rank order. A set that does not fit
   *  the remaining slots is SKIPPED and a later, smaller set is tried in
   *  its place, so the blueprint count is met without ever handing over a
   *  fragment of a passage.
   *
   *  Last resort: if no whole set fits the slots that are still open, the
   *  best-ranked leftover is truncated. Coming up short is worse — the
   *  blueprint counts are the section's shape (Reading 2 CtW + 30 MC,
   *  Listening 47) and a short module is a malformed test. With the bank's
   *  authored set sizes (2-5 for Reading/Listening) a 15/24/23-slot module
   *  packs exactly; the truncation only fires against sets larger than a
   *  whole module, which today only exist because `passageGroupId` is
   *  corrupt (one Reading "set" holds 108 items over 28 passages). */
  const takeGroups = (ranked: Group[], n: number, strict = false): Row[] => {
    const out: Row[] = []
    const leftover: Group[] = []
    for (const g of ranked) {
      if (out.length < n && g.rows.length <= n - out.length) out.push(...g.rows)
      else leftover.push(g)
    }
    // Exact-fit swap before giving up.
    //
    // The greedy pass takes sets in RANK order, which is right for
    // unseen-first fairness but blind to arithmetic: against a quota of 9 it
    // happily takes 4+4 and strands a slack of 1 that no whole set can fill,
    // when 5+4 was sitting in the leftovers. Reading's Academic Passage hit
    // this on the live bank — 8 of 9, then 9 of 10 — while Listening did not,
    // because its sets are uniform enough that rank order packs cleanly.
    //
    // So: if we are short by k, look for one taken set T and one leftover L
    // with |L| = |T| + k, and swap them. One swap, no search explosion, and
    // every other set keeps its rank-ordered place.
    if (out.length < n && leftover.length > 0) {
      const k = n - out.length
      const takenGroups: Group[] = []
      {
        let i = 0
        while (i < out.length) {
          const key = groupKeyOf(out[i]!)
          let j = i
          while (j < out.length && groupKeyOf(out[j]!) === key) j++
          takenGroups.push({ key, rows: out.slice(i, j) })
          i = j
        }
      }
      outer: for (const L of leftover) {
        for (const T of takenGroups) {
          if (L.rows.length !== T.rows.length + k) continue
          const swapped = takenGroups.flatMap(g => (g.key === T.key ? L.rows : g.rows))
          out.length = 0
          out.push(...swapped)
          break outer
        }
      }
    }

    // `strict`: come up SHORT rather than serve a fragment.
    //
    // The greedy pass above can leave slots that no whole set fits (sets of
    // 4 against 5 remaining slots leaves 1). For Reading that residue is
    // rare and the blueprint total matters more, so it truncates. For
    // Listening's per-task quotas it is routine, and truncating means
    // playing a student a full conversation and asking them one of its four
    // questions — strictly worse than a 46-item section.
    if (strict) {
      if (out.length < n) {
        console.warn('[assemble] task quota short — no whole audio set fits the remaining slots',
          { section: p.section, want: n, got: out.length })
      }
      return out
    }
    for (const g of leftover) {
      if (out.length >= n) break
      console.warn('[assemble] no whole passage set fits the remaining slots; truncating',
        { section: p.section, group: g.key, size: g.rows.length, slots: n - out.length })
      out.push(...g.rows.slice(0, n - out.length))
    }
    return out
  }

  /** Set-aware draw: rank sets (band-preferred for a routed module 2),
   *  then pack whole sets to `n`. Used for Reading/Listening MC — one
   *  passage feeds several questions — and for Take-an-Interview, where
   *  all N items belong to one interview on one topic and must play in
   *  their authored 1→N order. */
  const drawGrouped = (bucket: Row[], type: string, n: number, strict = false): Row[] =>
    takeGroups(bandPreferredGroups(groupRows(bucket), type), n, strict)

  /** The cut nearest `want` that does not fall INSIDE a passage set.
   *  `rows` is set-contiguous (drawGrouped emits it that way), so the legal
   *  cuts are the indices where the set key changes. Splitting Reading's
   *  module boundary mid-set would end module 1 halfway through a passage
   *  and re-open the same passage after the break. Falls back to `want`
   *  when there is no boundary at all (one set spanning the whole module —
   *  only reachable with corrupt grouping). */
  const splitOnGroupBoundary = (rows: Row[], want: number): number => {
    const cuts: number[] = []
    for (let i = 1; i < rows.length; i++) {
      if (groupKeyOf(rows[i]!) !== groupKeyOf(rows[i - 1]!)) cuts.push(i)
    }
    if (cuts.length === 0) return want
    return cuts.reduce((best, c) => (Math.abs(c - want) < Math.abs(best - want) ? c : best), cuts[0]!)
  }

  // Per-module share of each task type. Module 1 takes the ceiling so
  // an odd count splits 24/23 (Listening's 47 MC) rather than 23/24,
  // and Reading's 2 Complete-the-Words paragraphs land one per module —
  // exactly the interleaving the whole-section path produces below.
  /** How many of this entry's delivered items are scored in this stage,
   *  or null to score them all (non-TOEFL-2026 entries, and the
   *  whole-section draw, which has no stage). */
  const scoredForModule = (
    e: { sM1?: number; sLower?: number; sUpper?: number },
  ): number | null => {
    if (!p.module) return null
    if (p.module === 1) return e.sM1 ?? null
    const v = stage2Path === 'lower' ? e.sLower : e.sUpper
    return v ?? null
  }

  const shareForModule = (e: { n: number; m1?: number; lower?: number; upper?: number }): number => {
    if (!p.module) return e.n
    if (p.module === 1) return e.m1 ?? Math.ceil(e.n / 2)
    const perPath = stage2Path === 'lower' ? e.lower : e.upper
    // No per-path count declared (non-TOEFL-2026 entries): fall back to the
    // old "remainder after stage 1" behaviour so nothing else shifts.
    return perPath ?? e.n - (e.m1 ?? Math.ceil(e.n / 2))
  }

  // Which Stage 2 module this is. `difficulties` is a difficulty
  // PREFERENCE and is orthogonal to the path — keeping them separate means
  // a student on the upper path can still be served easier items when the
  // bank is thin, without silently changing which TASKS they see.
  const stage2Path: ToeflStage2Path =
    p.path ?? (p.difficulties?.length === 1 && p.difficulties[0] === 'easy' ? 'lower' : 'upper')

  const composition: Record<string, number> = {}
  const picked: Row[] = []
  for (const entry of meta.mix) {
    const { type, task } = entry
    const n = shareForModule(entry)
    if (n <= 0) continue
    const key = mixKey(entry)
    let bucket = byType.get(key) ?? []
    // Drop orphan sets before ranking. See MULTI_QUESTION_TASKS: a
    // conversation/announcement/academic-talk audio carrying a single
    // question is a harvest casualty, not a short task type, and serving it
    // asks the student to process a whole recording for one question.
    // Filtering here (not in the query) keeps the rule in one place and
    // makes it visible in `composition` when it bites.
    if (task && MULTI_QUESTION_TASKS.has(task)) {
      const sizes = new Map<string, number>()
      for (const r of bucket) {
        const k = groupKeyOf(r)
        sizes.set(k, (sizes.get(k) ?? 0) + 1)
      }
      const before = bucket.length
      bucket = bucket.filter(r => (sizes.get(groupKeyOf(r)) ?? 0) >= 2)
      if (bucket.length < before) {
        console.warn('[assemble] skipped single-question audio sets',
          { section: p.section, task, dropped: before - bucket.length })
      }
    }
    // Set-drawn task types (see drawGrouped). Everything else is a bag of
    // independent items and draws item-by-item, exactly as before.
    // Choose-a-Response is ONE question per audio by design, so its "sets"
    // are singletons — drawGrouped handles that identically to an item-wise
    // draw, and routing it through the same path keeps one code path.
    const grouped = type === 'speaking_interview'
      || ((p.section === 'reading' || p.section === 'listening') && type === 'multiple_choice')
    // Multi-question audio never ships as a fragment — see takeGroups(strict).
    const strict = !!task && MULTI_QUESTION_TASKS.has(task)
    let ordered: Row[]
    if (entry.ramp && !grouped) {
      // Fill each difficulty band from its own pool, unseen-first within
      // the band. A band that cannot fill its quota tops up from the rest,
      // so a thin bank shortens the ramp rather than the section.
      const want = entry.ramp
      const taken: Row[] = []
      const usedIds = new Set<string>()
      for (const band of ['easy', 'medium', 'hard'] as const) {
        const pool = bandPreferred(bucket.filter(r => r.difficulty === band), key + band)
        for (const r of pool.slice(0, want[band])) { taken.push(r); usedIds.add(r.id) }
      }
      const shortfall = n - taken.length
      if (shortfall > 0) {
        for (const r of bandPreferred(bucket, key + ':topup')) {
          if (taken.length >= n) break
          if (!usedIds.has(r.id)) { taken.push(r); usedIds.add(r.id) }
        }
      }
      ordered = taken
    } else {
      ordered = grouped
        ? drawGrouped(bucket, key, n, strict)
        : bandPreferred(bucket, key).slice(0, n)
    }
    if (ordered.length < n) {
      console.warn('[assemble] blueprint short — bank cannot fill this task',
        { section: p.section, key, want: n, got: ordered.length })
    }
    // Mark pilots. `scoredShare` is how many of this stage's delivered
    // items count; the rest are flagged scored:false and drop out of the
    // score denominator in submit/route.ts (same path open-response items
    // already take).
    //
    // WHICH items are pilots is chosen by a seeded shuffle, not by
    // position. Taking "the last k" would be stable across sessions and a
    // student who reviewed two tests could learn that the trailing
    // questions of a task never count — and then skip them.
    const scoredShare = scoredForModule(entry)
    if (scoredShare != null && scoredShare < ordered.length) {
      // HARDEST items become the pilots.
      //
      // Was a flat seeded shuffle — any item equally likely. Two reasons to
      // bias by difficulty instead:
      //  - Every difficulty label in this bank is an ESTIMATE (a model pass,
      //    or a proxy like word count) rather than a measurement; p-value
      //    calibration has zero real attempts behind it. The hard end is
      //    therefore the least trustworthy end, and the reported score is
      //    steadier if it rests on the better-understood items.
      //  - A pilot is where a not-yet-trusted item belongs.
      //
      // Shuffle WITHIN a difficulty band before slicing, so the choice is
      // still not positional: taking "the last k" would be stable across
      // sessions, and a student reviewing two tests could learn that the
      // trailing questions of a task never count, then skip them.
      //
      // TRADE-OFF, deliberately accepted and worth revisiting once real
      // p-values exist: pulling the hardest items out of the denominator
      // makes the scored set systematically easier, so reported scores drift
      // up and the test discriminates less at the top of the range.
      const RANK: Record<string, number> = { hard: 0, medium: 1, easy: 2 }
      const byHardest = seededShuffle(ordered.map(r => r.id), seed + ':pilot:' + key)
        .map(id => ordered.find(r => r.id === id)!)
        .sort((a, b) => (RANK[a.item.difficulty ?? 'medium'] ?? 1) - (RANK[b.item.difficulty ?? 'medium'] ?? 1))
      const pilots = new Set(
        byHardest.slice(0, ordered.length - scoredShare).map(r => r.id),
      )
      for (const r of ordered) {
        if (pilots.has(r.id)) r.item = { ...r.item, scored: false }
      }
    }
    composition[key] = ordered.length
    picked.push(...ordered)
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
      const half = splitOnGroupBoundary(mc, Math.ceil(mc.length / 2))
      const m1 = [ctw[0]!, ...mc.slice(0, half)]
      const m2 = [ctw[1]!, ...mc.slice(half)]
      picked.length = 0
      picked.push(...m1, ...m2)
      moduleBreakIdx = m1.length
    } else {
      // Thin bank (0 or 1 CtW drawn): fall back to a plain split rather
      // than promising a paragraph that isn't there — still cut on a
      // passage-set boundary.
      moduleBreakIdx = splitOnGroupBoundary(picked, Math.ceil(picked.length / 2))
    }
  }

  // Warmup cap, applied AFTER the blueprint draw so composition logic
  // is untouched. See capWarmupItems for why it is section-guarded.
  const capped = capWarmupItems(picked, p.section, p.maxItems)

  if (p.studentId) {
    await recordExposures(p.studentId, capped.map(r => r.id), 'full_test', seed)
  }

  return {
    title: meta.title,
    timeLimitMinutes: meta.minutes,
    section: meta.label,
    family: 'toefl',
    questions: shuffleDrawnChoices(capped, seed).map(r => r.item),
    composition,
    ...(moduleBreakIdx != null ? { moduleBreakIdx } : {}),
  }
}

/**
 * Assemble a test from an EXPLICIT list of bank row ids — the camp-mode
 * assembler. A camp assignment carries the exact, shared item set the
 * teacher drew (camp_assignments.item_ids), so unlike assembleFromBank /
 * assembleToeflFromBank there is no blueprint, no unseen-first ranking
 * and no backfill: the caller's list IS the test, in the caller's order.
 *
 * Returns the same AssembledTest shape the other two assemblers emit —
 * the camp start route writes it as the same `[full-test-v1]` cache row,
 * which submit/route.ts grades as authoritative, so nothing downstream
 * can tell a camp session from any other bank-assembled full test.
 *
 * Deliberate differences from the drawing assemblers:
 *   - No verified/archived filter on the read: the items were verified
 *     at draw time and the assignment is the contract with the class —
 *     an item archived AFTER assignment must not silently shrink one
 *     student's test relative to classmates who started earlier.
 *   - Missing/malformed rows are skipped with a loud log (same rule as
 *     every other bank reader) — the composition count exposes it.
 *   - Exposures are still recorded so later personal draws de-prioritise
 *     items the student already met in class.
 */
/**
 * SSAT / ISEE — draw one blueprint block from the bank.
 *
 * Separate from assembleFromBank because these tests differ in three ways
 * that are not parameters of it:
 *
 *  - the section is a fixed BLOCK with its own clock, not a count the
 *    caller picks and a minutesPerQ estimate;
 *  - reading must be SPREAD ACROSS PASSAGES. All six keys within a
 *    reading-worlds topic come from one passage variant, so six items
 *    from one passage behave like one item for OUR STATISTICS — which
 *    is a sampling concern, not a delivery one. Delivery uses
 *    ITEMS_PER_PASSAGE, the published format;
 *  - there is no content-domain blueprint. SSAT and ISEE publish section
 *    counts and timings, not domain weights, so inventing weights here
 *    would be fabricating a spec.
 */
export async function assembleAdmissionSection(p: {
  family: AdmissionFamily
  sectionKey: string
  studentId?: string
}, seed = 'admission'): Promise<AssembledTest> {
  const block = ADMISSION_BLUEPRINT[p.family].find(b => b.key === p.sectionKey)
  if (!block) throw new Error(`unknown ${p.family} section '${p.sectionKey}'`)
  if (!block.bankSection) throw new Error(`${p.family}/${p.sectionKey} is free-response, not drawn from the bank`)

  const { data, error } = await dbAdmin
    .from('study_item_bank')
    .select('id, difficulty, item, passage_group_id')
    .eq('family', p.family)
    .eq('section', block.bankSection)
    .eq('verified', true)
    .eq('archived', false)
  if (error) throw new Error(`assemble query failed: ${error.message}`)

  const rows = (data ?? []).flatMap(row => {
    const item = readBankItem(row.item)
    if (!item) {
      console.error('[assemble] skipping malformed study_item_bank row', row.id)
      return []
    }
    return [{ id: row.id, item, passageGroupId: row.passage_group_id as string | null }]
  })
  if (rows.length === 0) throw new Error(`no verified items for ${p.family}/${block.bankSection}`)

  const exposures = p.studentId ? await loadExposures(p.studentId) : new Map<string, string>()
  const ranked = unseenFirst(rows, exposures, seed + block.key)

  /*
   * Reading draws by passage, at the published per-passage count.
   *
   * EVERYTHING ELSE TAKES AT MOST ONE ITEM PER GROUP, and that is a real
   * constraint rather than the no-op it used to be. Verbal items are now
   * banked in BIJECTIVE SETS: four (or five) items sharing one option
   * pool, each option being the key of exactly one of them. Every item is
   * individually sound, and yet putting two of a set on one form leaks —
   * a candidate who answers three confidently deduces the fourth by
   * elimination, because each option is used exactly once. The set is
   * worth less than its item count, and the strong candidate gains most.
   *
   * A blind attack scores that as clean: it is a property of the FORM,
   * not of any item. It is the same shape as the I01-5 / I02-5 near-clone
   * pair, which is why this is expressed as a rule in code rather than a
   * sentence in a result document — CLAUDE.md's standing point being that
   * a comment asserting an invariant is not evidence the invariant holds.
   *
   * Rows with no group id are each their own group, so unset rows are
   * unaffected.
   */
  const picked = block.bankSection === 'reading'
    ? drawByPassage(ranked, block.questions, ITEMS_PER_PASSAGE[p.family])
    : drawByPassage(ranked, block.questions, 1)

  if (picked.length < block.questions) {
    // Loud, not silent. A short section is a real event: it means the
    // form is not the published one and the score is out of a different
    // denominator than the student expects.
    console.warn(`[assemble] ${p.family}/${block.key} SHORT — wanted ${block.questions}, drew ${picked.length}`)
  }

  const mixed = seededShuffle(picked, seed + ':order')
  if (p.studentId) await recordExposures(p.studentId, mixed.map(r => r.id), 'full_test', seed)

  return {
    title: `${p.family.toUpperCase()} — ${block.name}`,
    timeLimitMinutes: block.minutes,
    section: block.name,
    family: p.family,
    questions: shuffleDrawnChoices(mixed, seed).map(r => r.item),
    composition: { [block.name]: mixed.length },
  }
}

export async function assembleFromItemIds(
  p: {
    itemIds: string[]
    /** Session/card title — the teacher's assignment title. */
    title: string
    family: string
    /** Enables exposure recording (see recordExposures). */
    studentId?: string
  },
  seed = 'bank',
): Promise<AssembledTest> {
  if (p.itemIds.length === 0) throw new Error('assignment has no items')

  const { data, error } = await dbAdmin
    .from('study_item_bank')
    .select('id, section, item')
    .in('id', p.itemIds)
  if (error) throw new Error(`item-id assemble query failed: ${error.message}`)

  // Re-establish the caller's order — `.in()` returns rows in table
  // order, and the assignment's sequence is part of the shared set.
  const byId = new Map((data ?? []).map(row => [row.id as string, row]))
  const rows: Array<{ id: string; section: string | null; item: Question }> = []
  for (const id of p.itemIds) {
    const row = byId.get(id)
    if (!row) {
      console.error('[assemble] camp item missing from bank', id)
      continue
    }
    const item = readBankItem(row.item)
    if (!item) {
      console.error('[assemble] skipping malformed study_item_bank row', id)
      continue
    }
    rows.push({ id, section: row.section as string | null, item })
  }
  if (rows.length === 0) throw new Error('no usable items for this assignment')

  if (p.studentId) {
    await recordExposures(p.studentId, rows.map(r => r.id), 'full_test', seed)
  }

  // Timing: per-question budget by section where we have one (SAT's
  // SECTION_META), a flat TOEFL-ish budget otherwise. Camp sets are
  // small teacher-scoped drills, not blueprint sections, so this is a
  // reasonable envelope rather than an ETS number.
  const minutes = rows.reduce((sum, r) => {
    const meta = r.section ? SECTION_META[r.section] : undefined
    return sum + (meta ? meta.minutesPerQ : 1.2)
  }, 0)

  const composition: Record<string, number> = {}
  for (const r of rows) {
    const key = r.section ?? 'unknown'
    composition[key] = (composition[key] ?? 0) + 1
  }
  const sections = Object.keys(composition)
  const sectionLabel = sections.length === 1
    ? (SECTION_META[sections[0]!]?.label ?? sections[0]!)
    : null

  return {
    title: p.title,
    timeLimitMinutes: Math.max(5, Math.round(minutes)),
    section: sectionLabel,
    family: p.family,
    questions: shuffleDrawnChoices(rows, seed).map(r => r.item),
    composition,
  }
}

/**
 * Order one domain's items for a draw that PREFERS a difficulty band.
 *
 *   1. unseen items in the requested band(s)   (seeded order)
 *   2. unseen items in the neighbouring bands   (hard route: medium, then
 *                                                easy; easy/medium route:
 *                                                hard last)
 *   3. seen items in the requested band(s)      (oldest exposure first)
 *   4. seen items in the other bands
 *
 * With no band requested it is plain unseen-first. Exported for tests.
 */
export function rankByBand<T extends { id: string; difficulty: 'easy' | 'medium' | 'hard' }>(
  items: T[],
  wanted: Array<'easy' | 'medium' | 'hard'> | null,
  exposures: Map<string, string>,
  seed: string,
): T[] {
  if (!wanted || wanted.length === 0) return unseenFirst(items, exposures, seed)
  const order = wanted.includes('hard') ? ['medium', 'easy'] : ['medium', 'hard', 'easy']
  const primary = items.filter(r => wanted.includes(r.difficulty))
  const rest = items.filter(r => !wanted.includes(r.difficulty))
    .sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty))
  const p = unseenFirst(primary, exposures, seed)
  const r = unseenFirst(rest, exposures, seed + ':fallback')
  const seen = (x: T) => exposures.has(x.id)
  return [...p.filter(x => !seen(x)), ...r.filter(x => !seen(x)), ...p.filter(seen), ...r.filter(seen)]
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
  // `difficulties` used to be a SQL filter here. On the SAT R&W hard route
  // that meant a domain whose HARD band is thin (Standard English
  // Conventions: 12 hard items against a 7-per-form quota, 2026-09-03) ran
  // dry on a student's second form: unseen-first then handed back the same
  // items, and the domain-fill loop below topped the module up with OTHER
  // domains' hard items, bending the blueprint without a word. The whole
  // section is read now and the band is a PREFERENCE within each domain -
  // see rankByBand - so a thin band costs difficulty inside its own domain
  // rather than repeats or a different domain mix.
  const { data, error } = await query
  if (error) throw new Error(`assemble query failed: ${error.message}`)
  const rows = (data ?? []).flatMap(row => {
    const item = readBankItem(row.item)
    if (!item) {
      console.error('[assemble] skipping malformed study_item_bank row', row.id)
      return []
    }
    return [{ id: row.id, domain: row.domain, difficulty: (row.difficulty ?? 'medium') as 'easy' | 'medium' | 'hard', item }]
  })
  if (rows.length === 0) throw new Error(`no verified items for ${family}/${p.section}`)

  // Bucket by domain; within each bucket the requested band's unseen items
  // come first, then the neighbouring band's unseen items, then repeats -
  // a repeat is worse than a medium item on a hard route.
  const exposures = p.studentId ? await loadExposures(p.studentId) : new Map<string, string>()
  type Row = { id: string; item: Question }
  const byDomain = new Map<string, Row[]>()
  for (const d of new Set(rows.map(r => r.domain))) {
    const inDomain = rows.filter(r => r.domain === d).map(r => ({ id: r.id, item: r.item, difficulty: r.difficulty }))
    byDomain.set(d, rankByBand(inDomain, p.difficulties ?? null, exposures, seed + d))
  }

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
    questions: shuffleDrawnChoices(mixed, seed).map(r => r.item),
    composition,
  }
}


/* ------------------------------------------------------------------ *
 * ACT — draw one blueprint section from the bank.
 *
 * Linear like SSAT/ISEE, so it follows assembleAdmissionSection rather
 * than the SAT adaptive path. It differs in what a COUNT cannot express
 * and the published format insists on:
 *
 *   English  five passages of exactly ten questions, in authored order.
 *   Reading  four passages of nine, ONE PER GENRE in a fixed order —
 *            literary narrative, social science, humanities, natural
 *            science. Genre lives in the row's `task`. A form with four
 *            natural-science passages has 36 correct items and is not
 *            an ACT Reading section.
 *   Math     one item per group, shuffled; no passage structure.
 *
 * Passage-bound sections keep AUTHORED item order within a passage (real
 * forms order items roughly by position in the text) and keep passages in
 * the format's order. Only choices are shuffled. Math is shuffled freely.
 *
 * SHORT is loud, never silent, for the same reason as the admission
 * assembler: a short section is a different denominator than the one the
 * student was told.
 * ------------------------------------------------------------------ */
type ActRow = { id: string; item: Question; passageGroupId: string | null; task: string | null }

function groupsOf(rows: ActRow[]): Map<string, ActRow[]> {
  const g = new Map<string, ActRow[]>()
  for (const r of rows) {
    const k = r.passageGroupId ?? `__solo__${r.id}`
    const arr = g.get(k)
    if (arr) arr.push(r); else g.set(k, [r])
  }
  return g
}

/** Take `want` full passages of `per` items from `ranked` (already
 *  unseen-first). Optional `accept` filters groups, e.g. by genre. */
function takePassages(
  ranked: ActRow[], want: number, per: number, accept?: (g: ActRow[]) => boolean,
): ActRow[][] {
  const out: ActRow[][] = []
  for (const g of groupsOf(ranked).values()) {
    if (out.length >= want) break
    if (g.length < per) continue
    if (accept && !accept(g)) continue
    out.push(g.slice(0, per))
  }
  return out
}

export async function assembleActSection(p: {
  sectionKey: ActSectionKey
  studentId?: string
}, seed = 'act'): Promise<AssembledTest> {
  const block = actSection(p.sectionKey)
  if (!block.bankSection || block.choiceCount === 0) {
    throw new Error(`act/${p.sectionKey} is free-response, not drawn from the bank`)
  }

  const { data, error } = await dbAdmin
    .from('study_item_bank')
    .select('id, difficulty, item, passage_group_id, task')
    .eq('family', 'act')
    .eq('section', block.bankSection)
    .eq('verified', true)
    .eq('archived', false)
  if (error) throw new Error(`assemble query failed: ${error.message}`)

  const rows: ActRow[] = (data ?? []).flatMap(row => {
    const item = readBankItem(row.item)
    if (!item) {
      console.error('[assemble] skipping malformed study_item_bank row', row.id)
      return []
    }
    return [{ id: row.id, item, passageGroupId: row.passage_group_id as string | null, task: row.task as string | null }]
  })
  if (rows.length === 0) throw new Error(`no verified items for act/${block.bankSection}`)

  const exposures = p.studentId ? await loadExposures(p.studentId) : new Map<string, string>()
  const ranked = unseenFirst(rows, exposures, seed + block.key)

  let picked: ActRow[]
  if (block.key === 'english') {
    picked = takePassages(ranked, ENGLISH_PASSAGES, ENGLISH_ITEMS_PER_PASSAGE).flat()
  } else if (block.key === 'reading') {
    /* One passage per genre, in the published order. A genre with no full
       passage in the bank is skipped — and reported SHORT below — rather
       than back-filled from another genre, because the back-fill is the
       defect this branch exists to prevent. */
    const byGenre: ActRow[][] = []
    const used = new Set<string>()
    for (const genre of READING_GENRE_ORDER as readonly ReadingGenre[]) {
      const [g] = takePassages(ranked, 1, READING_ITEMS_PER_PASSAGE,
        grp => grp[0].task === genre && !used.has(grp[0].passageGroupId ?? ''))
      if (g) { byGenre.push(g); used.add(g[0].passageGroupId ?? '') }
      else console.warn(`[assemble] act/reading has no full ${genre} passage`)
    }
    picked = byGenre.flat()
  } else if (block.key === 'science') {
    /* Seven passages in ACT's own sequence on form 25MC5 (DR, CV, RS, RS,
       CV, RS, DR), sized as that form sizes them: DR 5, RS 6, CV 6 -> 40.
       A passage's format is in `task` (act-bank-helper writes it). A
       format with too few full passages is reported SHORT, never
       back-filled from another format - a form with four Research
       Summaries is not an ACT Science section. */
    const SEQUENCE: Array<['data_representation' | 'research_summaries' | 'conflicting_viewpoints', number]> = [
      ['data_representation', 5], ['conflicting_viewpoints', 6], ['research_summaries', 6],
      ['research_summaries', 6], ['conflicting_viewpoints', 6], ['research_summaries', 6], ['data_representation', 5],
    ]
    const used = new Set<string>()
    const out: ActRow[][] = []
    for (const [format, per] of SEQUENCE) {
      const [g] = takePassages(ranked, 1, per, grp => grp[0].task === format && !used.has(grp[0].passageGroupId ?? ''))
      if (g) { out.push(g); used.add(g[0].passageGroupId ?? '') }
      else console.warn(`[assemble] act/science has no full ${format} passage left`)
    }
    picked = out.flat()
  } else {
    picked = seededShuffle(drawByPassage(ranked, block.questions, 1), seed + ':order')
  }

  if (picked.length < block.questions) {
    console.warn(`[assemble] act/${block.key} SHORT — wanted ${block.questions}, drew ${picked.length}`)
  }

  if (p.studentId) await recordExposures(p.studentId, picked.map(r => r.id), 'full_test', seed)

  return {
    title: `ACT — ${block.name}`,
    timeLimitMinutes: block.minutes,
    section: block.name,
    family: 'act',
    questions: shuffleDrawnChoices(picked, seed).map(r => r.item),
    composition: { [block.name]: picked.length },
  }
}
