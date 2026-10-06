/**
 * form-qc.ts — build DELIVERED test forms with the real assemblers against
 * the live bank, and check every form for every way it can be wrong.
 *
 * READ ONLY. Never writes to the bank, to study_item_exposures, or to
 * storage. The assemblers run unmodified; only the network is faked.
 *
 *   npx tsx scripts/study-bank/form-qc.ts --selftest     # planted defects, must all fire
 *   npx tsx scripts/study-bank/form-qc.ts                # live bank, 6 forms per section
 *   FORMS=8 npx tsx scripts/study-bank/form-qc.ts --json /tmp/formqc.json
 *   UNCAPPED=1 ...   serve unpaged reads WITHOUT PostgREST's 1000-row cap
 *                    (what the assembler would see if it paged)
 *
 * ── How the forms are built ─────────────────────────────────────────
 * Same method as toefl-form-depth.ts: `globalThis.fetch` is replaced by an
 * in-memory PostgREST stand-in that serves the live bank rows and keeps a
 * simulated exposure ledger per simulated student, then the REAL
 * assembleFromBank / assembleActSection / assembleAdmissionSection /
 * assembleToeflFromBank are called exactly as the assemble and route
 * endpoints call them (SAT: module 1 count = moduleSize, module 2 with
 * difficultiesForModule2(route); TOEFL: module 1, then module 2 with path +
 * difficultiesForToeflModule2(route); everything else whole).
 *
 * The stand-in answers three requests (bank read, ledger read, ledger
 * upsert) and THROWS on anything else, so nothing here can reach the real
 * database once it is installed.
 *
 * It reproduces PostgREST's 1000-row cap faithfully, not approximately: for
 * every UNPAGED bank read (SAT, ACT, SSAT, ISEE — the assemblers do not
 * page) it serves exactly the rows the live database returns to that same
 * unpaged query, captured before the fake goes in. A section whose
 * assembler sees fewer rows than the live count fails `read_complete`.
 *
 * ── What it checks ──────────────────────────────────────────────────
 * Per form: crash, count, timing, order, domain mix, difficulty routing,
 * duplicate ids, near-duplicates and sibling leaks, passage contiguity /
 * authored order / completeness / module split, and per item: key
 * resolvable to exactly one choice, choice count for the family, distinct
 * choices, explanation, graphic renders, audio cached, prompt present, no
 * hardcoded question number, draw-time shuffle preserved the key, no
 * explanation or option that names a LETTER (letters move under the
 * shuffle), scoring weight, and the runner's answer-input branch has what
 * it needs. See CHECKS below for the exact rule of each.
 *
 * Graphics and audio are checked against REPLICAS of the runner code
 * (QuestionGraphicView's null-returning branches; ListeningAudioPlayer's
 * segment split + the tts route's object hash, as prewarm-toefl-audio.mjs
 * replicates them). The React view could not be server-rendered here —
 * its LanguageProvider hangs outside a browser — so the replica is the
 * instrument, and a change to either file must be mirrored.
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { DOMParser } from '@xmldom/xmldom'

// ── Types ──────────────────────────────────────────────────────────────

export interface BankRow {
  id: string
  family: string
  section: string
  domain: string | null
  difficulty: string | null
  item_type: string
  task: string | null
  passage_group_id: string | null
  created_at: string
  cohort: string | null
  item: Record<string, unknown>
}

/** The delivered question, as the runner receives it. Loose on purpose:
 *  the checker must be able to read malformed items. */
export interface DQ {
  type: string
  prompt: string
  passage?: string | null
  passageGroupId?: string | null
  choices: string[]
  correct_answer: string
  correct_answers?: string[] | null
  acceptable_answers?: string[] | null
  explanation?: string
  difficulty?: string
  blanks?: Array<{ id: number; answer: string; alternates?: string[] | null }> | null
  graphic?: Record<string, unknown> | null
  domain?: string | null
  listeningTask?: string | null
  readingTask?: string | null
  scored?: boolean | null
  bankItemId?: string | null
}

export interface Slot { q: DQ; row: BankRow | null; module: string; idx: number }

export interface ModuleExpect {
  name: string
  count: number
  minutes: number | null
  /** item-count range per domain, inclusive */
  quotas?: Record<string, [number, number]>
  /** SAT M2 route: which bands the route asked for */
  bands?: string[]
  /** TOEFL: per-task delivered count and scored total for this stage */
  toeflTasks?: Array<{ key: string; n: number }>
  toeflScored?: number
  toeflDelivered?: number
}

export interface Form {
  section: string // 'sat/reading_writing', 'act/english', 'ssat/verbal', 'toefl/listening'
  variant: string // 'hard', 'lower/easy', '' ...
  formNo: number
  family: string
  bankSection: string
  modules: Array<{ expect: ModuleExpect; minutes: number | null; slots: Slot[]; composition?: Record<string, number> }>
  slots: Slot[]
  errors: string[]
  /** ids the student had seen BEFORE each module was drawn (for routing checks) */
  seenBefore: Array<Set<string>>
}

export interface Defect { check: string; section: string; variant: string; form: number; ids: string[]; msg: string }

// ── Small helpers ──────────────────────────────────────────────────────

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
const textKey = (s: unknown) => norm(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
const OPEN = new Set(['speaking_interview', 'writing_email', 'writing_discussion', 'essay', 'essay_choice'])
const NO_CHOICE_TYPES = new Set(['numeric_entry', 'fill_in_blanks', 'speaking_repeat', 'speaking_interview', 'writing_email', 'writing_discussion', 'essay', 'essay_choice'])

function expectedChoices(family: string, type: string): number | null {
  if (NO_CHOICE_TYPES.has(type)) return 0
  if (type === 'arrange_words') return null // chips, count varies
  if (family === 'ssat') return 5
  return 4 // sat, act, isee, toefl MC
}

/** Submit-route replica: how much this item contributes to the score. */
export function scoreWeight(q: DQ): number {
  if (OPEN.has(q.type)) return 0
  if (q.scored === false) return 0
  if (q.type === 'fill_in_blanks') return (q.blanks ?? []).length || 1
  return 1
}

// ── Graphic replica (QuestionGraphicView / GraphicFigure) ──────────────

const GRAPHIC_KEYS_READ = new Set(['type', 'xLabel', 'yLabel', 'points', 'series', 'bestFit', 'bars', 'values',
  'rowLabels', 'colLabels', 'cells', 'shape', 'spec', 'labels', 'svg', 'caption'])

/** null = renders something; string = why the runner renders NOTHING (or junk). */
export function graphicProblem(g: Record<string, unknown> | null | undefined): string | null {
  if (!g) return null
  const type = typeof g.type === 'string' ? g.type.toLowerCase() : ''
  const svg = typeof g.svg === 'string' ? g.svg : ''
  const arr = (k: string) => (Array.isArray(g[k]) ? (g[k] as unknown[]) : [])
  const svgCheck = (): string | null => {
    if (!svg) return 'rawsvg with empty svg — renders nothing'
    if (!/<svg[\s>]/i.test(svg)) return 'svg string has no <svg> root'
    if (!/viewBox\s*=\s*["'][^"']+["']/i.test(svg)) return 'svg has no viewBox (scales unpredictably)'
    const errs: string[] = []
    try {
      const doc = new DOMParser({ onError: (lvl: string, msg: string) => { if (lvl !== 'warning') errs.push(msg) } } as never)
        .parseFromString(svg.trim(), 'image/svg+xml')
      if (!errs.length && doc?.documentElement?.nodeName.toLowerCase() !== 'svg') errs.push('root element is not <svg>')
    } catch (e) {
      errs.push((e as Error).message)
    }
    return errs.length ? `svg does not parse: ${errs[0]!.replace(/\s+/g, ' ').slice(0, 80)}` : null
  }
  if (!type) return svg ? svgCheck() : 'graphic object with no type and no svg — renders nothing'
  if (type === 'twowaytable' || type === 'table') {
    return arr('rowLabels').filter(Boolean).length === 0 && arr('cells').length === 0 ? 'table with no rows and no cells — renders nothing' : null
  }
  if (type === 'bar' || type === 'histogram') {
    return arr('bars').filter(b => b && typeof (b as { value?: unknown }).value === 'number').length === 0 ? 'bar chart with no numeric bars — renders nothing' : null
  }
  if (type === 'scatter') {
    const ok = arr('points').some(p => (Array.isArray(p) && p.length >= 2) || (p && typeof p === 'object' && 'x' in (p as object) && 'y' in (p as object)))
    return ok ? null : 'scatter with no points — renders nothing'
  }
  if (type === 'linegraph' || type === 'line') {
    const ok = arr('series').some(s => Array.isArray((s as { points?: unknown[] })?.points) && (s as { points: unknown[] }).points.some(p => Array.isArray(p) && p.length >= 2))
    return ok ? null : 'line graph with no series points — renders nothing'
  }
  if (type === 'dotplot') return arr('values').map(Number).filter(n => !isNaN(n)).length === 0 ? 'dot plot with no values — renders nothing' : null
  if (type === 'coordinateplane' || type === 'coordinate' || type === 'plane') {
    const pts = arr('points').filter(p => p && typeof (p as { x?: unknown }).x === 'number' && typeof (p as { y?: unknown }).y === 'number')
    const lines = ((g.spec as { lines?: unknown[] } | undefined)?.lines ?? []).filter(l => l && typeof (l as { m?: unknown }).m === 'number')
    return pts.length + lines.length === 0 ? 'coordinate plane with no points and no lines — empty axes' : null
  }
  const shape = typeof g.shape === 'string' ? g.shape.toLowerCase() : ''
  const named = ['inscribedtriangle', 'inscribedtrianglebyangles', 'inscribedtrianglebysides', 'chordatdistance', 'righttriangle', 'circlewithchord']
  if (named.includes(type) || named.includes(shape)) return null
  if (type === 'rawsvg' || svg) return svgCheck()
  return typeof g.caption === 'string' && g.caption ? `unknown graphic type '${type}' — renders caption text only` : `unknown graphic type '${type}' — renders nothing`
}

// ── Audio replica (ListeningAudioPlayer + listening/tts route) ─────────

const AUDIO_BUCKET = 'study-listening-audio'
function parseTurns(cleaned: string) {
  const turnRegex = /(?:^|\s)([A-Z]):\s+([\s\S]*?)(?=(?:\s[A-Z]:\s+)|$)/g
  const turns: Array<{ speaker: string; text: string }> = []
  let m: RegExpExecArray | null
  while ((m = turnRegex.exec(cleaned)) != null) turns.push({ speaker: m[1]!, text: m[2]!.trim().replace(/^"|"$/g, '') })
  return turns.length >= 2 && new Set(turns.map(t => t.speaker)).size >= 2 ? turns : []
}
function playerSegments(transcript: string): Array<{ text: string; voice: string }> {
  const ROT = ['nova', 'onyx', 'shimmer', 'echo']
  const cleaned = transcript.replace(/^\s*transcript:\s*/i, '').trim()
  const turns = parseTurns(cleaned)
  if (!turns.length) return [{ text: cleaned.replace(/^"|"$/g, ''), voice: 'nova' }]
  const v = new Map<string, string>()
  return turns.map(t => { if (!v.has(t.speaker)) v.set(t.speaker, ROT[v.size % ROT.length]!); return { text: t.text, voice: v.get(t.speaker)! } })
}
/** The transcript TestSession hands to ListeningAudioPlayer for this item, or null if it plays none. */
export function audioTranscript(q: DQ, section: string): string | null {
  if (q.type === 'speaking_repeat') {
    return (q.passage ?? '').replace(/^\s*(?:audio\s*script|transcript)\s*:\s*/i, '').replace(/^"|"$/g, '').trim() || q.correct_answer
  }
  if (q.type === 'speaking_interview') return q.prompt.replace(/^\s*\[[^\]]+\]\s*/, '')
  if (section === 'listening' && q.type === 'multiple_choice') return q.passage ?? ''
  return null
}
export const audioObject = (voice: string, text: string) =>
  createHash('sha256').update(`${voice}\ntts-1\n${text}`).digest('hex').slice(0, 40) + '.mp3'

// ── Checks ─────────────────────────────────────────────────────────────

/** Exact rule of each check, printed in the report. */
export const CHECKS: Record<string, string> = {
  read_complete: 'the assembler\'s bank read returned every live verified row of the section (PostgREST caps an unpaged read at 1000)',
  crash: 'the assembler returned a form without throwing',
  count: 'each module delivers exactly the blueprint count (TOEFL: per task too)',
  timing: 'module/section clock equals the blueprint/TEST_SPECS minutes',
  order: 'question types / genres / formats / tasks appear in the published order',
  domain_mix: 'per-module domain counts sit inside the blueprint quota (SAT: exact apportionment; ACT: published % ranges)',
  difficulty: 'routed module 2 serves its band while unseen in-band items of that domain exist (no early fallback)',
  dup_id: 'no bank item appears twice in a form (across modules / blocks of one sitting)',
  near_dup: 'no two items share prompt+passage, an identical non-trivial option set, or (single-item sections) an identical passage',
  passage_contiguous: 'every passage group\'s questions are consecutive',
  passage_order: 'questions inside a passage group keep authored (created_at) order',
  passage_complete: 'a passage group is served whole / at the published per-passage count, and never split across modules',
  key: 'objective item: key resolves to exactly one choice (submit-route normalisation); numeric: acceptable_answers holds the key; CtW: every blank has an [N] marker; Build-a-Sentence: key is made of chips',
  choice_count: 'choice count matches the family (SAT/ACT/ISEE/TOEFL MC 4, SSAT 5, open/numeric 0)',
  choice_unique: 'no two choices are equal after normalisation',
  explanation: 'every objective item carries a non-empty explanation',
  graphic: 'a graphic renders (replica of QuestionGraphicView), SVG parses with a viewBox, no graphic keys dropped by readBankItem',
  audio: 'every audio segment the player will request is <=4000 chars and already cached in storage',
  prompt: 'prompt present; free-response tasks have their prompt/scenario; item_type agrees with item.type',
  question_n: 'no hardcoded "Question N" in prompt/passage/explanation (numbers move when items are drawn)',
  shuffle_key: 'draw-time shuffle kept the same choice multiset and the same key text',
  letter_ref: 'no explanation or option names an option LETTER/position (letters move under the shuffle)',
  scoring: 'objective items carry score weight, open-response weight 0; per-module scored total equals the blueprint (TOEFL sM1/sLower/sUpper)',
  render: 'the runner\'s answer-input branch for the item type has the fields it needs',
}

const LETTER_IN_EXPL = [
  /\b(?:[Cc]hoice|[Oo]ption|[Aa]nswer)s?\s+\(?([A-HJ])\)?(?![\w'])/,
  /(?:^|[.!?]\s+)\(?([A-D])\)?\s+(?:is|are)\s+(?:correct|incorrect|wrong|the (?:best|correct) (?:answer|choice))\b/,
]
const POSITIONAL_OPTION = /\b(?:all|none|both|neither) of the (?:above|choices|options|answers)\b|\bboth [A-E] and [A-E]\b|\b(?:choices?|options?) \(?[A-E]\)? (?:and|or) \(?[A-E]\)?\b/i
const QUESTION_N = /\bQuestions?\s+\d+\b/
const GENERIC_OPTION = /^(?:point|location|sentence|paragraph|option|choice|after|before)?\s*\[?[a-z0-9]{1,2}\]?\.?$/i
function jaccard(a: string, b: string): number {
  const A = new Set(textKey(a).split(/\W+/).filter(w => w.length > 2)), B = new Set(textKey(b).split(/\W+/).filter(w => w.length > 2))
  if (!A.size && !B.size) return 1
  let i = 0; for (const w of A) if (B.has(w)) i++
  return i / (A.size + B.size - i)
}

/** Denominators: how many inputs each per-item instrument actually examined.
 *  A check that examined nothing has not passed — see CLAUDE.md. */
export const DENOM = new Map<string, number>()
const seen1 = (k: string) => DENOM.set(k, (DENOM.get(k) ?? 0) + 1)

export function itemDefects(s: Slot, family: string, section: string, audioIndex: Set<string> | null): Array<{ check: string; msg: string }> {
  const out: Array<{ check: string; msg: string }> = []
  const q = s.q
  seen1(`items ${family}`)
  seen1(`type ${q.type}`)
  const raw = s.row?.item ?? null
  const type = q.type
  const choices = Array.isArray(q.choices) ? q.choices : []
  const objective = !OPEN.has(type)

  // prompt
  if (!q.prompt || !String(q.prompt).trim()) out.push({ check: 'prompt', msg: 'empty prompt' })
  if (s.row && s.row.item_type !== type) out.push({ check: 'prompt', msg: `item_type '${s.row.item_type}' != item.type '${type}' (assembler buckets by one, runner renders by the other)` })
  if ((type === 'writing_email' || type === 'writing_discussion') && !String(q.passage ?? '').trim()) out.push({ check: 'prompt', msg: `${type} has no scenario passage` })
  if (type === 'essay_choice' && choices.length < 2 && !String(q.passage ?? '').trim()) out.push({ check: 'prompt', msg: 'essay_choice with no prompt options' })

  // key
  if (objective) {
    if (type === 'numeric_entry') {
      const acc = q.acceptable_answers ?? []
      if (!acc.length) out.push({ check: 'key', msg: 'numeric_entry with no acceptable_answers (submit grades against these only — always wrong)' })
      else if (q.correct_answer && !acc.some(a => norm(a) === norm(q.correct_answer))) out.push({ check: 'key', msg: `numeric key '${q.correct_answer}' not in acceptable_answers` })
    } else if (type === 'multi_select') {
      const exp = q.correct_answers ?? []
      if (!exp.length || exp.some(e => !choices.some(c => norm(c) === norm(e)))) out.push({ check: 'key', msg: 'multi_select key not a subset of choices' })
    } else if (type === 'fill_in_blanks') {
      const blanks = q.blanks ?? []
      const marks = new Set([...(String(q.passage ?? '').matchAll(/\[(\d+)\]/g))].map(m => Number(m[1])))
      if (!blanks.length) out.push({ check: 'key', msg: 'Complete-the-Words with no blanks' })
      for (const b of blanks) if (!marks.has(b.id)) out.push({ check: 'key', msg: `blank ${b.id} has no [${b.id}] marker in the passage` })
      if (blanks.some(b => !String(b.answer ?? '').trim())) out.push({ check: 'key', msg: 'blank with empty answer' })
    } else if (type === 'arrange_words') {
      const parts = String(q.correct_answer ?? '').split(' | ').map(norm)
      const pool = new Map<string, number>()
      for (const c of choices) pool.set(norm(c), (pool.get(norm(c)) ?? 0) + 1)
      const missing = parts.filter(p => { const n = pool.get(p) ?? 0; if (n > 0) { pool.set(p, n - 1); return false } return true })
      if (!q.correct_answer || missing.length) out.push({ check: 'key', msg: `Build-a-Sentence key not made of the chips (missing: ${missing.slice(0, 3).join(', ')})` })
    } else if (type === 'speaking_repeat') {
      if (!String(q.correct_answer ?? '').trim()) out.push({ check: 'key', msg: 'Listen-and-Repeat with no target sentence' })
    } else {
      const hits = choices.filter(c => norm(c) === norm(q.correct_answer)).length
      if (!String(q.correct_answer ?? '').trim()) out.push({ check: 'key', msg: 'no key' })
      else if (hits === 0) out.push({ check: 'key', msg: `key '${String(q.correct_answer).slice(0, 50)}' matches no choice` })
      else if (hits > 1) out.push({ check: 'key', msg: `key matches ${hits} choices` })
    }
  }

  // choice count / uniqueness
  const want = expectedChoices(family, type)
  if (want !== null && want > 0 && choices.length !== want) out.push({ check: 'choice_count', msg: `${choices.length} choices, ${family} ${type} needs ${want}` })
  if (type === 'arrange_words' && choices.length < 3) out.push({ check: 'choice_count', msg: `Build-a-Sentence with ${choices.length} chips` })
  if (choices.length > 1 && type !== 'arrange_words') {
    const seen = new Set<string>()
    for (const c of choices) { const k = norm(c); if (k && seen.has(k)) { out.push({ check: 'choice_unique', msg: `duplicate choice '${String(c).slice(0, 40)}'` }); break } seen.add(k) }
    if (choices.some(c => !String(c).trim())) out.push({ check: 'choice_unique', msg: 'whitespace-only choice: renders as a blank button, and picking it submits as UNANSWERED (submit trims to empty)' })
  }

  // explanation
  if (objective && type !== 'speaking_repeat' && !String(q.explanation ?? '').trim()) out.push({ check: 'explanation', msg: 'no explanation' })

  // graphic
  if (q.graphic) seen1(`graphic ${typeof q.graphic.type === 'string' ? q.graphic.type : '(svg)'}`)
  const gp = graphicProblem(q.graphic ?? null)
  if (gp) out.push({ check: 'graphic', msg: gp })
  const rawG = raw?.graphic
  if (rawG && typeof rawG === 'object' && !Array.isArray(rawG)) {
    const dropped = Object.keys(rawG).filter(k => !GRAPHIC_KEYS_READ.has(k) && (rawG as Record<string, unknown>)[k] != null)
    if (dropped.length) out.push({ check: 'graphic', msg: `graphic keys dropped by readBankItem: ${dropped.join(', ')}` })
  }
  if (!q.graphic && /\b(?:the|this) (?:graph|figure|table|scatterplot|bar graph|histogram|diagram|dot plot)\s+(?:above|below|shown)\b|\bshown in the (?:graph|figure|table|diagram)\b/i.test(`${q.prompt} ${q.passage ?? ''}`)
    && !/\|.*\|/.test(`${q.prompt} ${q.passage ?? ''}`)) {
    out.push({ check: 'graphic', msg: 'stem refers to a figure/table but the item has no graphic' })
  }

  // audio
  if (family === 'toefl') {
    const tr = audioTranscript(q, section)
    if (tr !== null) {
      const segs = playerSegments(tr)
      for (const sg of segs) {
        seen1(`audio segments (${section})`)
        if (!sg.text) { out.push({ check: 'audio', msg: 'empty audio segment' }); continue }
        if (sg.text.length > 4000) out.push({ check: 'audio', msg: `segment of ${sg.text.length} chars > tts route max 4000 (400 at play time)` })
        else if (audioIndex && !audioIndex.has(audioObject(sg.voice, sg.text))) out.push({ check: 'audio', msg: `segment not cached (${sg.voice}, "${sg.text.slice(0, 30)}…") — first student pays live TTS` })
      }
    }
  }

  // question number
  for (const [field, val] of [['prompt', q.prompt], ['passage', q.passage], ['explanation', q.explanation]] as const) {
    if (val && QUESTION_N.test(String(val))) { out.push({ check: 'question_n', msg: `hardcoded "${String(val).match(QUESTION_N)![0]}" in ${field}` }); break }
  }

  // shuffle preserved the key
  if (raw && Array.isArray(raw.choices)) {
    const a = [...(raw.choices as string[])].map(norm).sort().join('\u0001')
    const b = [...choices].map(norm).sort().join('\u0001')
    if (a !== b) out.push({ check: 'shuffle_key', msg: 'delivered choice set differs from the bank row' })
    if (typeof raw.correct_answer === 'string' && raw.correct_answer !== q.correct_answer) out.push({ check: 'shuffle_key', msg: 'delivered key differs from the bank row' })
  }

  // letters
  if (objective && choices.length > 1 && !['arrange_words', 'fill_in_blanks'].includes(type)) {
    const ex = String(q.explanation ?? '')
    if (ex) seen1('explanations scanned for letters')
    for (const re of LETTER_IN_EXPL) {
      const m = ex.match(re)
      if (m) { out.push({ check: 'letter_ref', msg: `explanation names letter: "${m[0].trim().slice(0, 40)}"` }); break }
    }
    const pos = choices.find(c => POSITIONAL_OPTION.test(String(c)))
    if (pos) out.push({ check: 'letter_ref', msg: `option depends on position: "${String(pos).slice(0, 50)}"` })
  }

  // render: the answer-input branch's needs
  if (type === 'multiple_choice' || type === 'three_choice' || type === 'quant_comparison') {
    if (choices.length < 2) out.push({ check: 'render', msg: `${type} renders ${choices.length} buttons` })
  } else if (type === 'multi_select' && choices.length < 2) out.push({ check: 'render', msg: 'multi_select with <2 options' })
  else if (type === 'fill_in_blanks' && !/\[\d+\]/.test(String(q.passage ?? ''))) out.push({ check: 'render', msg: 'CtW passage has no [N] tokens — no inputs render' })
  else if (type === 'speaking_repeat' && !audioTranscript(q, section)) out.push({ check: 'render', msg: 'repeat item has nothing to play' })
  if (s.row && q.passageGroupId !== (s.row.item.passageGroupId ?? null) && !String(q.passageGroupId ?? '').endsWith('#m2')) {
    out.push({ check: 'render', msg: 'delivered passageGroupId differs from bank item' })
  }

  // scoring
  const w = scoreWeight(q)
  if (objective && q.scored !== false && w === 0) out.push({ check: 'scoring', msg: 'objective item contributes 0 to the score' })
  if (!objective && w !== 0) out.push({ check: 'scoring', msg: 'open-response item counted in the score' })
  if (q.scored === false && family !== 'toefl') out.push({ check: 'scoring', msg: 'pilot (scored:false) outside TOEFL' })
  return out
}

/** The assembler groups TOEFL by item.passageGroupId; everything else by the column. */
const drawGroupOf = (s: Slot, family: string): string | null =>
  family === 'toefl' ? ((s.row?.item.passageGroupId as string | null | undefined) ?? null) : (s.row?.passage_group_id ?? null)

export interface Ctx {
  liveGroupSize: Map<string, number> // `${family}/${section}|${gid}` -> live drawable size (TOEFL: per task)
  audioIndex: Set<string> | null
  verbalKind?: (item: { prompt?: string | null }, task?: string | null) => string | null
}

/** Section-specific expectations that are not per-module counts. */
export interface SectionRules {
  /** 'none': no multi-item groups allowed; 'whole': every group served whole;
   *  'act-*' / 'admission-reading': specific per-passage counts; 'toefl': whole sets for grouped tasks */
  passage: 'none' | 'act-english' | 'act-reading' | 'act-science' | 'admission-reading' | 'toefl' | 'one-per-group'
  order?: (slots: Slot[]) => string | null
  /** single-item-per-passage section: an identical passage on two items is a sibling leak */
  passageLeak?: boolean
}

export function formDefects(f: Form, rules: SectionRules, ctx: Ctx): Defect[] {
  const D: Defect[] = []
  const push = (check: string, ids: string[], msg: string) => D.push({ check, section: f.section, variant: f.variant, form: f.formNo, ids, msg })
  if (f.errors.length) push('crash', [], f.errors.join(' | '))

  for (const [mi, m] of f.modules.entries()) {
    const e = m.expect
    if (m.slots.length !== e.count) push('count', [], `${e.name}: delivered ${m.slots.length}, blueprint ${e.count}`)
    if (e.minutes !== null && m.minutes !== e.minutes) push('timing', [], `${e.name}: clock ${m.minutes} min, blueprint ${e.minutes}`)
    if (e.quotas) {
      const c = new Map<string, number>()
      for (const s of m.slots) { const d = s.row?.domain ?? '(none)'; c.set(d, (c.get(d) ?? 0) + 1) }
      const bad: string[] = []
      for (const [d, [lo, hi]] of Object.entries(e.quotas)) { const n = c.get(d) ?? 0; if (n < lo || n > hi) bad.push(`${d} ${n} (want ${lo === hi ? lo : `${lo}-${hi}`})`) }
      for (const d of c.keys()) if (!(d in e.quotas)) bad.push(`${d} ${c.get(d)} (not in blueprint)`)
      if (bad.length) push('domain_mix', [], `${e.name}: ${bad.join('; ')}`)
    }
    if (e.bands) {
      // early fallback: an out-of-band item in a domain that still had unseen in-band live items
      const seen = f.seenBefore[mi] ?? new Set<string>()
      const deliveredIds = new Set(m.slots.map(s => s.row?.id))
      const off = m.slots.filter(s => s.row && !e.bands!.includes(s.row.difficulty ?? 'medium'))
      for (const s of off) {
        const spare = [...LIVE_BY_SECTION.get(`${f.family}/${f.bankSection}`) ?? []].filter(r =>
          r.domain === s.row!.domain && e.bands!.includes(r.difficulty ?? 'medium') && !seen.has(r.id) && !deliveredIds.has(r.id))
        if (spare.length) {
          push('difficulty', [s.row!.id], `${e.name}: ${s.row!.difficulty} ${s.row!.domain} item served on the ${e.bands.join('+')} route while ${spare.length} unseen in-band live items of that domain existed`)
        }
      }
    }
    if (e.toeflTasks) {
      const per = new Map<string, number>()
      for (const s of m.slots) {
        const k = s.q.type === 'multiple_choice' && (f.bankSection === 'listening' || f.bankSection === 'reading')
          ? `multiple_choice:${(f.bankSection === 'listening' ? s.q.listeningTask : s.q.readingTask) ?? 'unclassified'}` : s.q.type
        per.set(k, (per.get(k) ?? 0) + 1)
      }
      const bad = e.toeflTasks.filter(t => (per.get(t.key) ?? 0) !== t.n).map(t => `${t.key} ${per.get(t.key) ?? 0}/${t.n}`)
      if (bad.length) push('count', [], `${e.name}: task counts off — ${bad.join(', ')}`)
      // order: task index non-decreasing
      const idx = (s: Slot) => e.toeflTasks!.findIndex(t => t.key === (s.q.type === 'multiple_choice' && (f.bankSection === 'listening' || f.bankSection === 'reading')
        ? `multiple_choice:${(f.bankSection === 'listening' ? s.q.listeningTask : s.q.readingTask) ?? 'unclassified'}` : s.q.type))
      for (let i = 1; i < m.slots.length; i++) {
        if (idx(m.slots[i]!) < idx(m.slots[i - 1]!)) { push('order', [m.slots[i]!.row?.id ?? ''], `${e.name}: task out of ETS order at position ${i + 1}`); break }
      }
    }
    if (e.toeflScored !== undefined) {
      const scored = m.slots.reduce((n, s) => n + scoreWeight(s.q), 0)
      if (scored !== e.toeflScored) push('scoring', [], `${e.name}: scored total ${scored}, blueprint ${e.toeflScored}`)
      const delivered = m.slots.reduce((n, s) => n + (s.q.type === 'fill_in_blanks' ? (s.q.blanks ?? []).length || 1 : 1), 0)
      if (e.toeflDelivered !== undefined && delivered !== e.toeflDelivered) push('count', [], `${e.name}: delivered ${delivered} questions, blueprint ${e.toeflDelivered}`)
    }
  }

  if (rules.order) { const o = rules.order(f.slots); if (o) push('order', [], o) }

  // duplicates
  const byId = new Map<string, number>()
  for (const s of f.slots) { const id = s.row?.id ?? s.q.bankItemId ?? ''; byId.set(id, (byId.get(id) ?? 0) + 1) }
  const dups = [...byId].filter(([, n]) => n > 1).map(([id]) => id)
  if (dups.length) push('dup_id', dups, `${dups.length} item(s) served twice`)

  const pp = new Map<string, Slot>()
  const opt = new Map<string, Slot>()
  const pas = new Map<string, Slot>()
  for (const s of f.slots) {
    const id = s.row?.id ?? ''
    if (OPEN.has(s.q.type)) continue
    // graphic in the key: SAT math reuses generic stems ("What is the median of the values in the table?") over different figures
    const k1 = `${textKey(s.q.prompt)}\u0001${textKey(s.q.passage)}\u0001${s.q.graphic ? JSON.stringify(s.q.graphic) : ''}${s.q.type === 'arrange_words' ? `\u0001${[...(s.q.choices ?? [])].map(textKey).sort().join('|')}` : ''}`
    const o1 = pp.get(k1)
    if (o1 && o1.row?.id !== id) push('near_dup', [o1.row?.id ?? '', id], `identical prompt+passage: "${s.q.prompt.slice(0, 50)}"`)
    else pp.set(k1, s)
    const ch = (s.q.choices ?? []).map(textKey)
    // An identical option set is only a near-duplicate when the stems are close too: SEC items legitimately
    // share {is, are, was, were}, and placement items share {Point A..D}.
    if (ch.length >= 3 && ch.some(c => c.length > 4) && s.q.type !== 'arrange_words' && !ch.every(c => GENERIC_OPTION.test(c))) {
      const k2 = [...ch].sort().join('\u0001')
      const o2 = opt.get(k2)
      if (o2 && o2.row?.id !== id && jaccard(`${o2.q.prompt} ${o2.q.passage ?? ''}`, `${s.q.prompt} ${s.q.passage ?? ''}`) >= 0.5) {
        push('near_dup', [o2.row?.id ?? '', id], `identical option set and similar stem on two items ("${ch[0]!.slice(0, 25)}" …)`)
      } else if (!o2) opt.set(k2, s)
    }
    if (rules.passageLeak && s.q.passage && textKey(s.q.passage).length > 40) {
      const k3 = textKey(s.q.passage)
      const o3 = pas.get(k3)
      if (o3 && o3.row?.id !== id) push('near_dup', [o3.row?.id ?? '', id], 'two single-question items share one passage (sibling leak)')
      else pas.set(k3, s)
    }
  }

  // passages
  const groups = new Map<string, Slot[]>()
  for (const s of f.slots) { const g = drawGroupOf(s, f.family); if (g) { if (!groups.has(g)) groups.set(g, []); groups.get(g)!.push(s) } }
  for (const [g, list] of groups) {
    if (rules.passage === 'none' || rules.passage === 'one-per-group') {
      if (list.length > 1) push('passage_complete', list.map(s => s.row?.id ?? ''), `${list.length} items from one group ${g} in an item-wise section${rules.passage === 'one-per-group' ? ' (bijective set — elimination leak)' : ''}`)
      continue
    }
    // contiguity
    const idxs = list.map(s => s.idx).sort((a, b) => a - b)
    if (idxs[idxs.length - 1]! - idxs[0]! + 1 !== idxs.length) push('passage_contiguous', [list[0]!.row?.id ?? ''], `group ${g}: ${list.length} questions spread over positions ${idxs[0]! + 1}-${idxs[idxs.length - 1]! + 1}`)
    // authored order
    const inDelivery = [...list].sort((a, b) => a.idx - b.idx)
    const authored = [...list].sort((a, b) => (a.row?.created_at ?? '').localeCompare(b.row?.created_at ?? '') || (a.row?.id ?? '').localeCompare(b.row?.id ?? ''))
    if (inDelivery.some((s, i) => s !== authored[i])) {
      const wrong = inDelivery.filter((s, i) => s !== authored[i]).length
      push('passage_order', [list[0]!.row?.id ?? ''], `group ${g}: ${wrong} of ${list.length} questions out of authored order`)
    }
    // module split
    const mods = new Set(list.map(s => s.module))
    if (mods.size > 1) push('passage_complete', [list[0]!.row?.id ?? ''], `group ${g} split across ${[...mods].join('/')}`)
    // completeness
    const taskKey = f.family === 'toefl' ? `|${list[0]!.q.listeningTask ?? list[0]!.q.readingTask ?? list[0]!.q.type}` : ''
    const live = ctx.liveGroupSize.get(`${f.family}/${f.bankSection}|${g}${taskKey}`) ?? 0
    if (rules.passage === 'admission-reading') {
      if (list.length < 5 || list.length > 6) push('passage_complete', [list[0]!.row?.id ?? ''], `group ${g}: ${list.length} questions (published 5-6 per passage)`)
    } else if (rules.passage === 'toefl') {
      if (list.length !== live) push('passage_complete', [list[0]!.row?.id ?? ''], `set ${g}: served ${list.length} of ${live}`)
    } else if (rules.passage.startsWith('act-')) {
      if (list.length !== live) push('passage_complete', [list[0]!.row?.id ?? ''], `passage ${g}: served ${list.length} of its ${live} live questions`)
    }
  }
  return D
}

// ── Section definitions (from the code's own blueprints) ───────────────

type A = typeof import('../../src/lib/study/assemble')
const LIVE_BY_SECTION = new Map<string, BankRow[]>()

async function sectionRules(): Promise<Record<string, SectionRules>> {
  const { verbalKind } = await import('../../src/lib/study/admission-tests')
  const { READING_GENRE_ORDER } = await import('../../src/lib/study/act-test')
  const kinds = (slots: Slot[]) => slots.map(s => verbalKind((s.row?.item ?? s.q) as { prompt?: string }, s.row?.task ?? null))
  const typeOrder = (want: Array<[string, number]>) => (slots: Slot[]) => {
    const k = kinds(slots)
    let i = 0
    for (const [kind, n] of want) {
      for (let j = 0; j < n; j++, i++) if (k[i] !== kind) return `position ${i + 1} is ${k[i] ?? 'nothing'}, published order wants ${kind} for items ${want.slice(0, want.findIndex(w => w[0] === kind)).reduce((a, w) => a + w[1], 0) + 1}-${want.slice(0, want.findIndex(w => w[0] === kind) + 1).reduce((a, w) => a + w[1], 0)}`
    }
    return null
  }
  const passageSeq = (expect: Array<[string, number]>) => (slots: Slot[]) => {
    const runs: Array<[string, number]> = []
    let prev: string | null = null
    for (const s of slots) {
      const g = s.row?.passage_group_id ?? ''
      if (g !== prev) { runs.push([s.row?.task ?? '?', 0]); prev = g }
      runs[runs.length - 1]![1]++
    }
    const got = runs.map(r => `${r[0]}:${r[1]}`).join(', ')
    const want = expect.map(r => `${r[0]}:${r[1]}`).join(', ')
    return got === want ? null : `passages delivered as [${got}], published [${want}]`
  }
  return {
    'sat/reading_writing': { passage: 'none', passageLeak: true },
    'sat/math': { passage: 'none' },
    'act/english': { passage: 'act-english' },
    'act/math': { passage: 'none' },
    'act/reading': { passage: 'act-reading', order: passageSeq(READING_GENRE_ORDER.map(g => [g, 9])) },
    'act/science': { passage: 'act-science', order: passageSeq([['data_representation', 5], ['conflicting_viewpoints', 6], ['research_summaries', 6], ['research_summaries', 6], ['conflicting_viewpoints', 6], ['research_summaries', 6], ['data_representation', 5]]) },
    'ssat/math': { passage: 'one-per-group' },
    'ssat/reading': { passage: 'admission-reading' },
    'ssat/verbal': { passage: 'one-per-group', order: typeOrder([['synonym', 30], ['analogy', 30]]) },
    'ssat/writing': { passage: 'none' },
    'isee/quant': { passage: 'one-per-group' },
    'isee/mathach': { passage: 'one-per-group' },
    'isee/verbal': { passage: 'one-per-group', order: typeOrder([['synonym', 20], ['sentence completion', 20]]) },
    'isee/reading': { passage: 'admission-reading' },
    'isee/essay': { passage: 'none' },
    'toefl/reading': { passage: 'toefl' },
    'toefl/listening': { passage: 'toefl' },
    'toefl/writing': { passage: 'none' },
    'toefl/speaking': { passage: 'toefl' },
  }
}

// ── The in-memory PostgREST stand-in ───────────────────────────────────

const MAX_ROWS = 1000
const BANK = new Map<string, BankRow[]>() // family/section -> rows
const UNPAGED = new Map<string, Set<string>>() // family/section -> ids the live DB returns unpaged
const READS = new Map<string, { live: number; served: number[] }>()
const LEDGER = new Map<string, Map<string, string>>()
let clock = 0
let lastUpsert: string[] | null = null
let installed = false
const UNCAPPED = process.env.UNCAPPED === '1'

const eqParam = (q: URLSearchParams, k: string): string | null => { const v = q.get(k); return v && v.startsWith('eq.') ? v.slice(3) : null }
const jsonRes = (body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', ...headers } })
const serve = (r: BankRow) => ({ id: r.id, item_type: r.item_type, item: r.item, difficulty: r.difficulty, domain: r.domain, passage_group_id: r.passage_group_id, task: r.task, section: r.section, created_at: r.created_at })

function installFakeFetch() {
  const pagedTally = new Map<string, number>()
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(href)
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const table = url.pathname.split('/rest/v1/')[1] ?? ''
    const q = url.searchParams
    if (table === 'study_item_bank' && method === 'GET') {
      const fam = eqParam(q, 'family'), sec = eqParam(q, 'section')
      if (!fam || !sec || eqParam(q, 'verified') !== 'true' || eqParam(q, 'archived') !== 'false') throw new Error(`fake fetch: unexpected bank filter ${url.search}`)
      const key = `${fam}/${sec}`
      let rows = BANK.get(key) ?? []
      const dom = eqParam(q, 'domain')
      if (dom) rows = rows.filter(r => r.domain === dom)
      const live = rows.length
      const paged = q.has('offset') || q.has('limit')
      if (!READS.has(key)) READS.set(key, { live, served: [] })
      if (!paged) {
        const snap = UNPAGED.get(key)
        const out = UNCAPPED || dom ? rows : snap ? rows.filter(r => snap.has(r.id)) : rows.slice(0, MAX_ROWS)
        READS.get(key)!.served.push(out.length)
        return jsonRes(out.map(serve))
      }
      // Honour the exact order PostgREST was asked for ('created_at.asc,id.asc', 'id.asc', ...):
      // the passage-bound draws read authored order off it.
      const ord = (q.get('order') ?? '').split(',').filter(Boolean).map(o => { const [col, dir] = o.split('.'); return { col: col as keyof BankRow, desc: dir === 'desc' } })
      const sorted = [...rows].sort((a, b) => { for (const o of ord) { const d = String(a[o.col] ?? '').localeCompare(String(b[o.col] ?? '')); if (d) return o.desc ? -d : d } return 0 })
      const offset = Number(q.get('offset') ?? 0)
      const limit = Math.min(MAX_ROWS, Number(q.get('limit') ?? MAX_ROWS))
      const slice = sorted.slice(offset, offset + limit)
      const total = (offset === 0 ? 0 : pagedTally.get(key) ?? 0) + slice.length
      pagedTally.set(key, total)
      if (slice.length < limit) READS.get(key)!.served.push(total)
      const headers: Record<string, string> = {}
      const prefer = (init?.headers ? new Headers(init.headers).get('prefer') : null) ?? ''
      if (prefer.includes('count=exact')) headers['content-range'] = `${offset}-${offset + slice.length - 1}/${live}`
      return jsonRes(slice.map(serve), headers)
    }
    if (table === 'study_item_exposures' && method === 'GET') {
      const student = eqParam(q, 'student_id')
      if (!student) throw new Error('fake fetch: ledger read without student_id')
      let all = [...(LEDGER.get(student) ?? new Map<string, string>())].map(([item_id, seen_at]) => ({ item_id, seen_at, session_id: null }))
      if (q.get('order') === 'item_id.asc') all = all.sort((a, b) => a.item_id.localeCompare(b.item_id))
      const offset = Number(q.get('offset') ?? 0)
      const limit = Math.min(MAX_ROWS, Number(q.get('limit') ?? MAX_ROWS))
      return jsonRes(all.slice(offset, offset + limit))
    }
    if (table === 'study_item_exposures' && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '[]')) as Array<{ student_id: string; item_id: string }>
      const t = new Date(Date.UTC(2026, 0, 1) + ++clock * 1000).toISOString()
      for (const b of body) { if (!LEDGER.has(b.student_id)) LEDGER.set(b.student_id, new Map()); LEDGER.get(b.student_id)!.set(b.item_id, t) }
      lastUpsert = body.map(b => b.item_id)
      return new Response('', { status: 201 })
    }
    throw new Error(`fake fetch: unmodelled request ${method} ${url.pathname}${url.search} — refusing so the real database is never touched`)
  }) as typeof fetch
  installed = true
}

// ── Building forms ─────────────────────────────────────────────────────

type AssembledTest = Awaited<ReturnType<A['assembleFromBank']>>

function toSlots(t: AssembledTest, module: string, offset: number): Slot[] {
  return t.questions.map((qq, i) => {
    const q = qq as unknown as DQ
    const id = q.bankItemId ?? ''
    return { q, row: BY_ID.get(id) ?? null, module, idx: offset + i }
  })
}
const BY_ID = new Map<string, BankRow>()

function seenSet(student: string) { return new Set((LEDGER.get(student) ?? new Map()).keys()) }

async function buildForm(
  section: string, variant: string, formNo: number, family: string, bankSection: string, student: string,
  steps: Array<{ expect: ModuleExpect; run: () => Promise<AssembledTest>; post?: (qs: DQ[]) => DQ[] }>,
): Promise<Form> {
  if (!installed) throw new Error('refusing to call an assembler before the fake fetch is installed')
  const f: Form = { section, variant, formNo, family, bankSection, modules: [], slots: [], errors: [], seenBefore: [] }
  for (const st of steps) {
    f.seenBefore.push(seenSet(student))
    try {
      lastUpsert = null
      const t = await st.run()
      if (st.post) t.questions = st.post(t.questions as unknown as DQ[]) as unknown as typeof t.questions
      const slots = toSlots(t, st.expect.name, f.slots.length)
      if (lastUpsert && (lastUpsert as string[]).length !== slots.length) f.errors.push(`${st.expect.name}: recorded ${(lastUpsert as string[]).length} exposures for ${slots.length} questions`)
      for (const s of slots) if (!s.row) f.errors.push(`${st.expect.name}: delivered item ${s.q.bankItemId} is not a live drawable row of any section`)
      f.modules.push({ expect: st.expect, minutes: t.timeLimitMinutes, slots, composition: t.composition })
      f.slots.push(...slots)
    } catch (e) {
      f.errors.push(`${st.expect.name}: ${(e as Error).message}`)
      f.modules.push({ expect: st.expect, minutes: null, slots: [] })
    }
  }
  return f
}

interface Plan { section: string; variant: string; family: string; bankSection: string; students: number; build: (student: string, formNo: number) => Promise<Form[]> }

async function plans(Asm: A): Promise<Plan[]> {
  const { SAT_MODULE_CONFIG, difficultiesForModule2 } = await import('../../src/lib/study/sat-adaptive')
  const { ACT_BLUEPRINT, ACT_QUOTAS } = await import('../../src/lib/study/act-test')
  const { ADMISSION_BLUEPRINT } = await import('../../src/lib/study/admission-tests')
  const { TEST_SPECS } = await import('../../src/lib/test-specs')
  const TA = await import('../../src/lib/toefl-adaptive')
  const spec = (fam: string, name: string) => TEST_SPECS[fam as keyof typeof TEST_SPECS]?.sections.find(s => s.name_en === name)
  const pctToCount = (q: Record<string, readonly [number, number]>, n: number) =>
    Object.fromEntries(Object.entries(q).map(([d, [lo, hi]]) => [d, [Math.ceil(lo * n / 100 - 1e-9), Math.floor(hi * n / 100 + 1e-9)] as [number, number]]))
  const out: Plan[] = []

  for (const section of ['reading_writing', 'math'] as const) {
    const cfg = SAT_MODULE_CONFIG[section]
    const sp = spec('sat', section === 'math' ? 'Math' : 'Reading & Writing')!
    const quotas = Object.fromEntries(Object.entries(Asm.blueprintQuotas(Asm.BLUEPRINT[section]!, cfg.moduleSize)).map(([d, n]) => [d, [n, n] as [number, number]]))
    // the route uses SAT_MODULE_CONFIG for the clock; the spec says minutes/2 per module
    const minutes = sp.minutesPerSection / 2
    for (const route of ['easy', 'hard'] as const) {
      out.push({ section: `sat/${section}`, variant: route, family: 'sat', bankSection: section, students: 1, build: async (student, formNo) => {
        const seed = `${student}-f${formNo}`
        return [await buildForm(`sat/${section}`, route, formNo, 'sat', section, student, [
          { expect: { name: 'M1', count: sp.questionsPerSection / 2, minutes, quotas }, run: () => Asm.assembleFromBank({ section, count: cfg.moduleSize, studentId: student }, seed) },
          { expect: { name: `M2-${route}`, count: sp.questionsPerSection / 2, minutes, quotas, bands: difficultiesForModule2(route) },
            run: () => Asm.assembleFromBank({ section, count: cfg.moduleSize, difficulties: difficultiesForModule2(route), studentId: student }, seed) },
        ]).then(f => { if (cfg.minutesPerModule !== minutes) f.errors.push(`SAT_MODULE_CONFIG ${cfg.minutesPerModule} min/module vs spec ${minutes}`); for (const m of f.modules) m.minutes = cfg.minutesPerModule; return f })]
      } })
    }
  }

  for (const block of ACT_BLUEPRINT) {
    if (!block.bankSection || block.choiceCount === 0) continue
    const sp = spec('act', block.key === 'math' ? 'Math' : block.name)!
    const k = block.key as 'english' | 'math' | 'reading' | 'science'
    out.push({ section: `act/${block.key}`, variant: '', family: 'act', bankSection: block.bankSection, students: 1, build: async (student, formNo) => [
      await buildForm(`act/${block.key}`, '', formNo, 'act', block.bankSection!, student, [
        { expect: { name: block.name, count: sp.questionsPerSection, minutes: sp.minutesPerSection, quotas: pctToCount(ACT_QUOTAS[k], sp.questionsPerSection) },
          run: () => Asm.assembleActSection({ sectionKey: k, studentId: student }, `${student}-f${formNo}-${block.key}`) },
      ]),
    ] })
  }

  for (const family of ['ssat', 'isee'] as const) {
    // one SITTING = every block in published order on one ledger, so a math
    // item cannot appear in both ISEE math blocks of one sitting.
    const blocks = ADMISSION_BLUEPRINT[family]
    const specFor = (name: string) => {
      const s = TEST_SPECS[family]!.sections
      if (family === 'ssat' && name === 'Math') {
        const q1 = s.find(x => x.name_en === 'Quantitative Section 1')!, q2 = s.find(x => x.name_en === 'Quantitative Section 2')!
        return { questionsPerSection: q1.questionsPerSection + q2.questionsPerSection, minutesPerSection: q1.minutesPerSection + q2.minutesPerSection }
      }
      const alias: Record<string, string> = { Writing: family === 'ssat' ? 'Writing Sample' : 'Essay', Mathematics: 'Mathematics Achievement' }
      const hit = s.find(x => x.name_en === (alias[name] ?? name))
      if (!hit) throw new Error(`no TEST_SPECS.${family} section for blueprint block '${name}'`)
      return hit
    }
    out.push({ section: `${family}/*`, variant: 'sitting', family, bankSection: '*', students: 1, build: async (student, formNo) => {
      const forms: Form[] = []
      for (const b of blocks) {
        const sp = specFor(b.name)
        forms.push(await buildForm(`${family}/${b.key}`, '', formNo, family, b.bankSection!, student, [
          { expect: { name: b.name, count: sp.questionsPerSection, minutes: sp.minutesPerSection }, run: () => Asm.assembleAdmissionSection({ family, sectionKey: b.key, studentId: student }, `${student}-f${formNo}-${b.key}`) },
        ]))
      }
      return forms
    } })
  }

  const toeflSpec = (n: string) => TEST_SPECS.toefl!.sections.find(s => s.name_en === n)!
  const scope = (qs: DQ[]) => qs.map(q => (typeof q.passageGroupId === 'string' && q.passageGroupId ? { ...q, passageGroupId: `${q.passageGroupId}#m2` } : q))
  for (const combo of ['lower/easy', 'lower/medium', 'upper/medium', 'upper/hard'] as const) {
    const [path, route] = combo.split('/') as ['lower' | 'upper', 'easy' | 'medium' | 'hard']
    out.push({ section: 'toefl/*', variant: combo, family: 'toefl', bankSection: '*', students: 1, build: async (student, formNo) => {
      const forms: Form[] = []
      for (const sec of ['reading', 'listening'] as const) {
        const meta = Asm.TOEFL_META[sec]
        const shape = Asm.toeflSectionShape(sec, path)
        const cfg = TA.toeflAdaptiveConfig(sec)!
        const tk = (m: { type: string; task?: string }) => (m.type === 'multiple_choice' ? `multiple_choice:${m.task}` : m.type)
        const sp = toeflSpec(sec === 'reading' ? 'Reading' : 'Listening')
        const seed = `${student}-f${formNo}-${sec}`
        const f = await buildForm(`toefl/${sec}`, combo, formNo, 'toefl', sec, student, [
          { expect: { name: 'M1', count: shape.stage1.cards, minutes: sp.minutesPerSection / 2, toeflTasks: meta.mix.map(m => ({ key: tk(m), n: m.m1 ?? 0 })), toeflScored: shape.stage1.scored, toeflDelivered: shape.stage1.delivered },
            run: () => Asm.assembleToeflFromBank({ section: sec, module: 1, studentId: student }, seed) },
          { expect: { name: `M2-${combo}`, count: shape.stage2.cards, minutes: sp.minutesPerSection / 2, toeflTasks: meta.mix.map(m => ({ key: tk(m), n: (path === 'lower' ? m.lower : m.upper) ?? 0 })), toeflScored: shape.stage2.scored, toeflDelivered: shape.stage2.delivered },
            run: () => Asm.assembleToeflFromBank({ section: sec, module: 2, path, difficulties: TA.difficultiesForToeflModule2(route), studentId: student }, seed), post: scope },
        ])
        // the route serves cfg.minutesPerModule per module, not the assembler's whole-section minutes
        for (const m of f.modules) m.minutes = cfg.minutesPerModule
        if (cfg.module1Items !== shape.stage1.cards || cfg.module2Items !== shape.stage2.cards) f.errors.push(`toeflAdaptiveConfig items ${cfg.module1Items}/${cfg.module2Items} vs blueprint cards ${shape.stage1.cards}/${shape.stage2.cards}`)
        forms.push(f)
      }
      for (const sec of ['writing', 'speaking'] as const) {
        const meta = Asm.TOEFL_META[sec]
        const sp = toeflSpec(sec === 'writing' ? 'Writing' : 'Speaking')
        const n = meta.mix.reduce((a, m) => a + m.n, 0)
        forms.push(await buildForm(`toefl/${sec}`, combo, formNo, 'toefl', sec, student, [
          { expect: { name: sec, count: n, minutes: sp.minutesPerSection, toeflTasks: meta.mix.map(m => ({ key: m.type, n: m.n })) },
            run: () => Asm.assembleToeflFromBank({ section: sec, studentId: student }, `${student}-f${formNo}-${sec}`) },
        ]))
      }
      return forms
    } })
  }
  return out
}

// ── Live loading ───────────────────────────────────────────────────────

function loadEnv() {
  if (!existsSync('.env.local')) return
  for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
    if (!l.includes('=') || l.startsWith('#')) continue
    const k = l.slice(0, l.indexOf('=')).trim()
    if (!(k in process.env)) process.env[k] = l.slice(l.indexOf('=') + 1).trim()
  }
}

const FAMILIES = ['sat', 'act', 'ssat', 'isee', 'toefl']
const ASSEMBLER_SELECT: Record<string, string> = {
  sat: 'id, domain, difficulty, item',
  act: 'id, difficulty, item, passage_group_id, task, domain',
  ssat: 'id, difficulty, item, passage_group_id, task',
  isee: 'id, difficulty, item, passage_group_id, task',
}

async function loadLive(): Promise<{ notes: string[]; audioIndex: Set<string> }> {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const notes: string[] = []
  for (const family of FAMILIES) {
    const all: BankRow[] = []
    for (let f = 0; ; f += 1000) {
      const { data, error } = await db.from('study_item_bank')
        .select('id,family,section,domain,difficulty,item_type,task,passage_group_id,created_at,cohort,item')
        .eq('family', family).eq('verified', true).eq('archived', false)
        .order('created_at', { ascending: true }).order('id', { ascending: true }).range(f, f + 999)
      if (error) throw new Error(error.message)
      all.push(...(data as BankRow[]))
      if (!data || data.length < 1000) break
    }
    const { count, error } = await db.from('study_item_bank').select('id', { count: 'exact', head: true })
      .eq('family', family).eq('verified', true).eq('archived', false)
    if (error) throw new Error(error.message)
    if (count !== all.length || new Set(all.map(r => r.id)).size !== all.length) {
      console.error(`REFUSING: ${family} loaded ${all.length} rows, live exact count ${count}`)
      process.exit(2)
    }
    for (const r of all) {
      const k = `${r.family}/${r.section}`
      if (!BANK.has(k)) BANK.set(k, [])
      BANK.get(k)!.push(r)
      BY_ID.set(r.id, r)
    }
    // What the live DB hands an UNPAGED read with the assembler's exact filters.
    if (ASSEMBLER_SELECT[family]) {
      for (const sec of new Set(all.map(r => r.section))) {
        const { data, error: e2 } = await db.from('study_item_bank').select(ASSEMBLER_SELECT[family]!)
          .eq('family', family).eq('section', sec).eq('verified', true).eq('archived', false)
        if (e2) throw new Error(e2.message)
        UNPAGED.set(`${family}/${sec}`, new Set((data as unknown as Array<{ id: string }>).map(r => r.id)))
      }
    }
  }
  for (const [k, rows] of BANK) LIVE_BY_SECTION.set(k, rows)
  // audio cache index (storage list, read only)
  const audioIndex = new Set<string>()
  for (let off = 0; ; off += 1000) {
    const { data, error } = await db.storage.from(AUDIO_BUCKET).list('', { limit: 1000, offset: off, sortBy: { column: 'name', order: 'asc' } })
    if (error) { notes.push(`audio bucket list failed: ${error.message}`); break }
    for (const o of data ?? []) audioIndex.add(o.name)
    if (!data || data.length < 1000) break
  }
  notes.push(`audio cache: ${audioIndex.size} objects in ${AUDIO_BUCKET}`)
  return { notes, audioIndex }
}

function liveGroupSizes(): Map<string, number> {
  const m = new Map<string, number>()
  for (const [k, rows] of BANK) {
    for (const r of rows) {
      const toefl = r.family === 'toefl'
      const g = toefl ? (r.item.passageGroupId as string | null | undefined) : r.passage_group_id
      if (!g) continue
      const task = toefl ? `|${(r.item.listeningTask as string | null) ?? (r.item.readingTask as string | null) ?? r.item_type}` : ''
      const key = `${k}|${g}${task}`
      m.set(key, (m.get(key) ?? 0) + 1)
    }
  }
  return m
}

// ── Running and reporting ──────────────────────────────────────────────

interface Tally { forms: number; items: number; failForms: Map<string, Set<number>>; failItems: Map<string, number>; defects: Defect[] }

function newTally(): Tally { return { forms: 0, items: 0, failForms: new Map(), failItems: new Map(), defects: [] } }

function account(t: Tally, f: Form, rules: SectionRules, ctx: Ctx) {
  t.forms++
  t.items += f.slots.length
  const add = (d: Defect) => {
    t.defects.push(d)
    if (!t.failForms.has(d.check)) t.failForms.set(d.check, new Set())
    t.failForms.get(d.check)!.add(f.formNo)
  }
  for (const d of formDefects(f, rules, ctx)) add(d)
  for (const s of f.slots) {
    const ds = itemDefects(s, f.family, f.bankSection, ctx.audioIndex)
    const seenChecks = new Set<string>()
    for (const d of ds) {
      add({ check: d.check, section: f.section, variant: f.variant, form: f.formNo, ids: [s.row?.id ?? s.q.bankItemId ?? '?'], msg: d.msg })
      if (!seenChecks.has(d.check)) { seenChecks.add(d.check); t.failItems.set(d.check, (t.failItems.get(d.check) ?? 0) + 1) }
    }
  }
}


async function runLive() {
  loadEnv()
  const forms = Number(process.env.FORMS ?? 6)
  const { notes, audioIndex } = await loadLive()
  installFakeFetch()
  const warnCounts = new Map<string, number>()
  const origWarn = console.warn, origErr = console.error
  console.warn = (...a: unknown[]) => { const k = String(a[0]).replace(/\d+/g, 'N').slice(0, 140); warnCounts.set(k, (warnCounts.get(k) ?? 0) + 1) }
  console.error = (...a: unknown[]) => { const k = `ERROR ${String(a[0]).slice(0, 100)} ${a[1] ?? ''}`; warnCounts.set(k, (warnCounts.get(k) ?? 0) + 1) }
  const Asm = await import('../../src/lib/study/assemble')
  const rules = await sectionRules()
  const ctx: Ctx = { liveGroupSize: liveGroupSizes(), audioIndex }
  const tallies = new Map<string, Tally>()
  const allForms: Form[] = []
  const P = await plans(Asm)
  for (const p of P) {
    const student = `formqc-${p.section.replace(/\W/g, '')}-${p.variant.replace(/\W/g, '')}`
    LEDGER.delete(student)
    for (let n = 1; n <= forms; n++) {
      const built = await p.build(student, n)
      // sitting-level duplicate check for admission (two math blocks share a bank section)
      if (p.variant === 'sitting') {
        const ids = new Map<string, string>()
        for (const f of built) for (const s of f.slots) {
          const id = s.row?.id ?? ''
          if (ids.has(id)) f.errors.push(`item ${id} served in both ${ids.get(id)} and ${f.section} of one sitting`)
          ids.set(id, f.section)
        }
      }
      for (const f of built) {
        const key = `${f.section}${f.variant ? ` [${f.variant}]` : ''}`
        if (!tallies.has(key)) tallies.set(key, newTally())
        account(tallies.get(key)!, f, rules[f.section]!, ctx)
        allForms.push(f)
      }
    }
  }
  // read completeness, once per section
  const readDefects: Defect[] = []
  for (const [k, r] of READS) {
    const min = Math.min(...r.served)
    if (min < r.live) readDefects.push({ check: 'read_complete', section: k, variant: '', form: 0, ids: [], msg: `assembler read ${min} of ${r.live} live rows (unpaged; PostgREST cap ${MAX_ROWS}) — ${r.live - min} items can never be drawn` })
  }
  const edge = await runEdge(Asm, rules, ctx)
  console.warn = origWarn; console.error = origErr
  // Bank-wide item sweep: the per-item checks over EVERY drawable row, so an
  // item defect is listed whether or not six forms happened to draw it.
  const denomBefore = new Map(DENOM)
  const sweep: Array<{ row: BankRow; check: string; msg: string }> = []
  for (const rows of BANK.values()) for (const r of rows) {
    const q = { ...(r.item as unknown as DQ), bankItemId: r.id, passageGroupId: (r.item.passageGroupId as string | null | undefined) ?? null }
    for (const d of itemDefects({ q, row: r, module: 'bank', idx: 0 }, r.family, r.section, audioIndex)) sweep.push({ row: r, ...d })
  }
  DENOM.clear(); for (const [k, v] of denomBefore) DENOM.set(k, v)
  return { forms, notes, tallies, allForms, readDefects, warnCounts, edge, sweep }
}

/** A student who has seen most of a section: does the assembler degrade gracefully? */
async function runEdge(Asm: A, rules: Record<string, SectionRules>, ctx: Ctx) {
  const { assessCoverage } = await import('../../src/lib/study/bank-coverage')
  const { SAT_MODULE_CONFIG } = await import('../../src/lib/study/sat-adaptive')
  const out: Array<{ section: string; seen: number; live: number; delivered: number; expected: number; fresh: number; crash: string | null; defects: Defect[]; gate: string }> = []
  const P = await plans(Asm)
  const pick: Array<[string, string]> = [['sat/reading_writing', 'hard'], ['sat/math', 'hard'], ['act/*', ''], ['ssat/*', 'sitting'], ['isee/*', 'sitting'], ['toefl/*', 'upper/hard']]
  for (const [sec, variant] of pick) {
    for (const p of P.filter(x => (sec === 'act/*' ? x.family === 'act' : x.section === sec) && x.variant === variant)) {
      const student = `formqc-edge-${p.section.replace(/\W/g, '')}`
      // ledger: every drawable item of the family seen long ago, except ~5% per section
      const led = new Map<string, string>()
      let i = 0
      for (const [k, rows] of BANK) {
        if (!k.startsWith(`${p.family}/`)) continue
        for (const r of rows) { if (i++ % 20 !== 0) led.set(r.id, new Date(Date.UTC(2025, 0, 1) + i * 1000).toISOString()) }
      }
      LEDGER.set(student, led)
      const before = new Set(led.keys()) // the fake mutates the ledger as it draws
      const forms = await p.build(student, 99)
      for (const f of forms) {
        const live = (BANK.get(`${f.family}/${f.bankSection}`) ?? []).length
        const seenN = (BANK.get(`${f.family}/${f.bankSection}`) ?? []).filter(r => before.has(r.id)).length
        const expected = f.modules.reduce((a, m) => a + m.expect.count, 0)
        const fresh = f.slots.filter(s => !before.has(s.row?.id ?? '')).length
        const ds = formDefects(f, rules[f.section]!, ctx).filter(d => ['crash', 'count', 'dup_id', 'passage_complete', 'order'].includes(d.check))
        // what the assemble route's exhaustion gate would say BEFORE drawing
        const needed = f.family === 'toefl' ? 0 : f.family === 'sat' ? SAT_MODULE_CONFIG[f.bankSection as 'math'].moduleSize : expected
        const g = assessCoverage({ poolSize: live, seen: seenN, needed })
        out.push({ section: f.section, seen: seenN, live, delivered: f.slots.length, expected, fresh, crash: f.errors[0] ?? null, defects: ds,
          gate: g.ok ? `admits (unseen ${g.unseen}, needed ${needed})` : `blocks: ${g.reason}` })
      }
    }
  }
  return out
}

// ── Self-test: planted defects must fire, the clean form must pass ─────

function fxRow(i: number, over: Partial<BankRow> = {}, item: Record<string, unknown> = {}): BankRow {
  const id = `fx-${String(i).padStart(4, '0')}`
  return {
    id, family: 'sat', section: 'reading_writing', domain: 'Craft and Structure', difficulty: 'medium', item_type: 'multiple_choice',
    task: null, passage_group_id: null, created_at: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString(), cohort: 'fx',
    item: { type: 'multiple_choice', prompt: `Which choice best states the main idea of text ${i}?`, passage: `Passage number ${i} describes a distinct situation in enough words to be unique ${i}.`,
      choices: [`alpha answer ${i}`, `beta answer ${i}`, `gamma answer ${i}`, `delta answer ${i}`], correct_answer: `alpha answer ${i}`, explanation: `The text supports alpha answer ${i}.`, difficulty: 'medium', ...item },
    ...over,
  }
}
const slotOf = (r: BankRow, module: string, idx: number): Slot => ({ q: { ...(r.item as unknown as DQ), bankItemId: r.id, passageGroupId: (r.item.passageGroupId as string | null | undefined) ?? null }, row: r, module, idx })

async function selftest() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://fixture.invalid'
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture'
  let bad = 0
  const ok = (cond: boolean, msg: string) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) bad++ }
  const rules = await sectionRules()

  // A clean SAT R&W form: 2 x 27, exact quotas.
  const quotas: Record<string, [number, number]> = { 'Craft and Structure': [8, 8], 'Information and Ideas': [7, 7], 'Standard English Conventions': [7, 7], 'Expression of Ideas': [5, 5] }
  const doms = Object.entries(quotas).flatMap(([d, [n]]) => Array.from({ length: n }, () => d))
  let i = 0
  const satRows = [0, 1].flatMap(m => doms.map(d => fxRow(i++, { domain: d, difficulty: m === 1 ? 'hard' : 'medium' })))
  for (const r of satRows) { BY_ID.set(r.id, r) }
  LIVE_BY_SECTION.set('sat/reading_writing', satRows)
  const cleanSat = (): Form => {
    const rows = satRows.map(r => ({ ...r, item: JSON.parse(JSON.stringify(r.item)) as Record<string, unknown> }))
    const slots = rows.map((r, k) => slotOf(r, k < 27 ? 'M1' : 'M2-hard', k))
    return { section: 'sat/reading_writing', variant: 'hard', formNo: 1, family: 'sat', bankSection: 'reading_writing',
      modules: [
        { expect: { name: 'M1', count: 27, minutes: 32, quotas }, minutes: 32, slots: slots.slice(0, 27) },
        { expect: { name: 'M2-hard', count: 27, minutes: 32, quotas, bands: ['hard'] }, minutes: 32, slots: slots.slice(27) },
      ], slots, errors: [], seenBefore: [new Set(), new Set(satRows.slice(0, 27).map(r => r.id))] }
  }
  const ctx: Ctx = { liveGroupSize: new Map(), audioIndex: new Set() }
  const run = (f: Form, r: SectionRules = rules['sat/reading_writing']!) => [
    ...formDefects(f, r, ctx),
    ...f.slots.flatMap(s => itemDefects(s, f.family, f.bankSection, ctx.audioIndex).map(d => ({ ...d, ids: [s.row?.id ?? ''] }))),
  ]
  const clean = run(cleanSat())
  ok(clean.length === 0, `clean SAT fixture form passes every check (${clean.length} defects${clean.length ? `: ${clean[0]!.check} ${clean[0]!.msg}` : ''})`)

  const plant = (name: string, check: string, mut: (f: Form) => void, r?: SectionRules) => {
    const f = cleanSat()
    mut(f)
    const ds = run(f, r)
    const fired = ds.filter(d => d.check === check)
    const others = [...new Set(ds.filter(d => d.check !== check).map(d => d.check))]
    ok(fired.length > 0, `planted ${name} -> ${check} fires (${fired.length})${others.length ? `; also: ${others.join(',')}` : ''}`)
  }
  plant('duplicate item', 'dup_id', f => { const s = f.slots[30]!; f.slots[3] = { ...s, idx: 3, module: 'M1' }; f.modules[0]!.slots[3] = f.slots[3]! })
  plant('key not among choices', 'key', f => { f.slots[5]!.q.correct_answer = 'nothing like it' })
  plant('two choices equal', 'choice_unique', f => { f.slots[6]!.q.choices[2] = f.slots[6]!.q.choices[1]! + '  ' })
  plant('three choices', 'choice_count', f => { f.slots[7]!.q.choices.pop() })
  plant('missing explanation', 'explanation', f => { f.slots[8]!.q.explanation = '' })
  plant('svg without viewBox', 'graphic', f => { f.slots[9]!.q.graphic = { type: 'rawsvg', svg: '<svg width="10"><circle r="3"/></svg>' } })
  plant('svg that does not parse', 'graphic', f => { f.slots[9]!.q.graphic = { type: 'rawsvg', svg: '<svg viewBox="0 0 9 9"><g></svg>' } })
  plant('bar chart with no bars', 'graphic', f => { f.slots[9]!.q.graphic = { type: 'bar', bars: [] } })
  plant('hardcoded question number', 'question_n', f => { f.slots[10]!.q.prompt = 'Question 4: ' + f.slots[10]!.q.prompt })
  plant('explanation names a letter', 'letter_ref', f => { f.slots[11]!.q.explanation = 'Choice B is wrong because it overstates.' })
  plant('positional option', 'letter_ref', f => { f.slots[11]!.q.choices[3] = 'All of the above' })
  plant('module one short', 'count', f => { f.modules[0]!.slots.pop() })
  plant('wrong clock', 'timing', f => { f.modules[1]!.minutes = 35 })
  plant('domain top-up', 'domain_mix', f => { for (const s of f.modules[0]!.slots.slice(0, 3)) s.row = { ...s.row!, domain: 'Expression of Ideas' } })
  plant('easy item on hard route', 'difficulty', f => { const s = f.modules[1]!.slots[0]!; s.row = { ...s.row!, difficulty: 'easy' }
    LIVE_BY_SECTION.set('sat/reading_writing', [...satRows, fxRow(900, { domain: s.row.domain, difficulty: 'hard' })]) })
  LIVE_BY_SECTION.set('sat/reading_writing', satRows)
  plant('same prompt+passage twice', 'near_dup', f => { f.slots[12]!.q.prompt = f.slots[13]!.q.prompt; f.slots[12]!.q.passage = f.slots[13]!.q.passage })
  plant('shared passage on single-item section', 'near_dup', f => { f.slots[14]!.q.passage = f.slots[15]!.q.passage })
  plant('shuffle changed the key', 'shuffle_key', f => { f.slots[16]!.q.correct_answer = f.slots[16]!.q.choices[1]!; f.slots[16]!.q.choices[0] = 'x'; f.slots[16]!.q.choices[1] = f.slots[16]!.q.correct_answer })
  plant('numeric item with no acceptable answers', 'key', f => { const q = f.slots[17]!.q; q.type = 'numeric_entry'; q.choices = []; q.acceptable_answers = []; f.slots[17]!.row = { ...f.slots[17]!.row!, item_type: 'numeric_entry', item: { ...f.slots[17]!.row!.item, choices: [] } } })
  plant('item_type disagrees with item.type', 'prompt', f => { f.slots[18]!.row = { ...f.slots[18]!.row!, item_type: 'numeric_entry' } })
  plant('crash', 'crash', f => { f.errors.push('M2: boom') })
  plant('two items from one group in an item-wise section', 'passage_complete', f => {
    f.slots[19]!.row = { ...f.slots[19]!.row!, passage_group_id: 'set-1' }; f.slots[20]!.row = { ...f.slots[20]!.row!, passage_group_id: 'set-1' } })

  // Passage checks on an ACT-English-shaped form.
  const actRows: BankRow[] = []
  for (let g = 0; g < 5; g++) for (let k = 0; k < 10; k++) actRows.push(fxRow(1000 + g * 10 + k, { family: 'act', section: 'english', passage_group_id: `p${g}`, domain: k < 6 ? 'Conventions of Standard English' : 'Production of Writing' }))
  const actCtx: Ctx = { liveGroupSize: new Map(actRows.map(r => [`act/english|${r.passage_group_id}`, 10])), audioIndex: null }
  const cleanAct = (): Form => {
    const slots = actRows.map((r, k) => slotOf(r, 'English', k))
    return { section: 'act/english', variant: '', formNo: 1, family: 'act', bankSection: 'english', modules: [{ expect: { name: 'English', count: 50, minutes: 35 }, minutes: 35, slots }], slots, errors: [], seenBefore: [new Set()] }
  }
  const runAct = (f: Form) => formDefects(f, rules['act/english']!, actCtx)
  ok(runAct(cleanAct()).length === 0, `clean ACT English fixture passes passage checks (${runAct(cleanAct()).map(d => d.check).join(',') || 'none'})`)
  {
    const f = cleanAct(); [f.slots[9]!.idx, f.slots[10]!.idx] = [f.slots[10]!.idx, f.slots[9]!.idx]
    ok(runAct(f).some(d => d.check === 'passage_contiguous'), 'planted interleaved passages -> passage_contiguous fires')
  }
  {
    const f = cleanAct(); [f.slots[0]!.idx, f.slots[4]!.idx] = [f.slots[4]!.idx, f.slots[0]!.idx]
    ok(runAct(f).some(d => d.check === 'passage_order'), 'planted reordered passage questions -> passage_order fires')
  }
  {
    const f = cleanAct(); f.slots.splice(49, 1); f.modules[0]!.slots = f.slots
    ok(runAct(f).some(d => d.check === 'passage_complete'), 'planted truncated passage -> passage_complete fires')
  }
  {
    const f = cleanAct(); for (const s of f.slots) s.module = s.idx < 25 ? 'M1' : 'M2'
    ok(runAct(f).some(d => d.check === 'passage_complete' && d.msg.includes('split')), 'planted passage split across modules -> passage_complete fires')
  }

  // Order: SSAT verbal synonyms 1-30 then analogies.
  {
    const vr: BankRow[] = []
    for (let k = 0; k < 60; k++) vr.push(fxRow(2000 + k, { family: 'ssat', section: 'verbal', task: k < 30 ? 'synonym' : 'analogy' }, { prompt: k < 30 ? `[Synonym] WORD${k}` : `[Analogy] a${k} is to b as c is to:` }))
    const mk = (rows: BankRow[]): Form => { const slots = rows.map((r, k) => slotOf(r, 'Verbal', k)); return { section: 'ssat/verbal', variant: '', formNo: 1, family: 'ssat', bankSection: 'verbal', modules: [{ expect: { name: 'Verbal', count: 60, minutes: 30 }, minutes: 30, slots }], slots, errors: [], seenBefore: [new Set()] } }
    const r = rules['ssat/verbal']!
    ok(!formDefects(mk(vr), r, ctx).some(d => d.check === 'order'), 'clean SSAT verbal order passes')
    const swapped = [...vr]; [swapped[2], swapped[40]] = [swapped[40]!, swapped[2]!]
    ok(formDefects(mk(swapped), r, ctx).some(d => d.check === 'order'), 'planted analogy among synonyms -> order fires')
  }

  // TOEFL scoring + audio.
  {
    const rows = Array.from({ length: 4 }, (_, k) => fxRow(3000 + k, { family: 'toefl', section: 'listening', domain: 'Choose a Response' }, { listeningTask: 'choose_response', passage: `Transcript: line ${k}` }))
    const slots = rows.map((r, k) => slotOf(r, 'M1', k))
    const audio = new Set([0, 1, 3].map(k => audioObject('nova', `line ${k}`))) // line 2 deliberately not cached
    const tctx: Ctx = { liveGroupSize: new Map(), audioIndex: audio }
    const f: Form = { section: 'toefl/listening', variant: 'x', formNo: 1, family: 'toefl', bankSection: 'listening', modules: [{ expect: { name: 'M1', count: 4, minutes: 18, toeflTasks: [{ key: 'multiple_choice:choose_response', n: 4 }], toeflScored: 3, toeflDelivered: 4 }, minutes: 18, slots }], slots, errors: [], seenBefore: [new Set()] }
    slots[0]!.q.scored = false
    ok(!formDefects(f, rules['toefl/listening']!, tctx).some(d => d.check === 'scoring'), 'TOEFL module with 1 pilot of 4 against sM1=3 passes scoring')
    slots[1]!.q.scored = false
    ok(formDefects(f, rules['toefl/listening']!, tctx).some(d => d.check === 'scoring'), 'planted extra pilot -> scoring fires')
    const ad = itemDefects(slots[2]!, 'toefl', 'listening', tctx.audioIndex)
    ok(ad.some(d => d.check === 'audio'), 'planted uncached audio -> audio fires')
    const hit = new Set([audioObject('nova', 'line 2')])
    ok(!itemDefects(slots[2]!, 'toefl', 'listening', hit).some(d => d.check === 'audio'), 'cached audio passes')
  }

  // read_complete: the REAL assembler against a fixture bank over the cap.
  {
    const big: BankRow[] = []
    const ds = ['Craft and Structure', 'Information and Ideas', 'Standard English Conventions', 'Expression of Ideas']
    for (let k = 0; k < 1200; k++) big.push(fxRow(5000 + k, { domain: ds[k % 4]!, difficulty: (['easy', 'medium', 'hard'] as const)[k % 3] }))
    BANK.set('sat/reading_writing', big)
    for (const r of big) BY_ID.set(r.id, r)
    installFakeFetch()
    console.warn = () => {}
    const Asm = await import('../../src/lib/study/assemble')
    await Asm.assembleFromBank({ section: 'reading_writing', count: 27, studentId: 'fx-student' }, 'fx')
    const r = READS.get('sat/reading_writing')!
    const truncated = Math.min(...r.served) < r.live
    ok(truncated || Math.min(...r.served) === r.live, `fixture 1200-row bank: assembler read ${Math.min(...r.served)} of ${r.live} (${truncated ? 'TRUNCATED — read_complete would fail' : 'complete'})`)
    // and the break-test the other way: the fake must truncate an unpaged read
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/study_item_bank?select=id&family=eq.sat&section=eq.reading_writing&verified=eq.true&archived=eq.false`)
    const n = ((await res.json()) as unknown[]).length
    ok(n === MAX_ROWS, `the stand-in caps an unpaged read at ${MAX_ROWS} (served ${n}) — so a non-paging assembler cannot pass read_complete here`)
  }
  console.log(bad ? `\n${bad} self-test failure(s)` : '\nself-test clean')
  process.exit(bad ? 1 : 0)
}

// ── Report ─────────────────────────────────────────────────────────────

function report(r: Awaited<ReturnType<typeof runLive>>, jsonPath: string | null) {
  const lines: string[] = []
  const P = (s = '') => lines.push(s)
  P(`form-qc: ${r.forms} consecutive forms per section/variant, one simulated student each, real assemblers, live bank${UNCAPPED ? ' (UNCAPPED reads)' : ''}`)
  for (const n of r.notes) P(`  ${n}`)
  for (const [k, rows] of BANK) P(`  loaded ${k}: ${rows.length} rows = live exact count`)
  P('')
  P('READ COMPLETENESS (once per section)')
  for (const [k, rr] of READS) P(`  ${k.padEnd(22)} live ${String(rr.live).padStart(5)}  assembler read ${String(Math.min(...rr.served)).padStart(5)}  ${Math.min(...rr.served) < rr.live ? 'FAIL' : 'ok'}`)
  P('')
  const checks = Object.keys(CHECKS).filter(c => c !== 'read_complete')
  for (const [key, t] of [...r.tallies].sort()) {
    P(`${key} — ${t.forms} forms, ${t.items} items`)
    for (const c of checks) {
      const ff = t.failForms.get(c)?.size ?? 0
      const fi = t.failItems.get(c) ?? 0
      P(`  ${c.padEnd(19)} ${ff ? 'FAIL' : 'pass'}  forms failing ${ff}/${t.forms}${fi ? `  items failing ${fi}` : ''}`)
    }
    const byCheck = new Map<string, Defect[]>()
    for (const d of t.defects) { if (!byCheck.has(d.check)) byCheck.set(d.check, []); byCheck.get(d.check)!.push(d) }
    for (const [c, ds] of byCheck) {
      // collapse identical messages across forms
      const g = new Map<string, { forms: Set<number>; ids: Set<string> }>()
      for (const d of ds) { const k2 = d.msg; if (!g.has(k2)) g.set(k2, { forms: new Set(), ids: new Set() }); g.get(k2)!.forms.add(d.form); for (const id of d.ids) if (id) g.get(k2)!.ids.add(id) }
      P(`    ${c}: ${ds.length} defect(s)`)
      for (const [msg, v] of [...g].slice(0, 12)) P(`      [forms ${[...v.forms].join(',')}] ${msg}${v.ids.size ? `  ids ${[...v.ids].slice(0, 6).map(x => x.slice(0, 8)).join(' ')}${v.ids.size > 6 ? ` +${v.ids.size - 6}` : ''}` : ''}`)
      if (g.size > 12) P(`      … ${g.size - 12} more distinct`)
    }
    P('')
  }
  P('DIFFICULTY BY MODULE (hard/medium/easy per form) — is the hard route hard?')
  const diffRows = new Map<string, string[]>()
  for (const f of r.allForms) {
    if (f.family !== 'sat' && f.family !== 'toefl') continue
    for (const m of f.modules) {
      const c = { hard: 0, medium: 0, easy: 0 } as Record<string, number>
      for (const s of m.slots) c[s.row?.difficulty ?? 'medium'] = (c[s.row?.difficulty ?? 'medium'] ?? 0) + 1
      const k = `${f.section} [${f.variant}] ${m.expect.name}`
      if (!diffRows.has(k)) diffRows.set(k, [])
      diffRows.get(k)!.push(`${c.hard}/${c.medium}/${c.easy}`)
    }
  }
  for (const [k, v] of diffRows) P(`  ${k.padEnd(48)} ${v.join('  ')}`)
  P('')
  P('INSTRUMENT DENOMINATORS (inputs each per-item check examined, all forms)')
  for (const [k, n] of [...DENOM].sort()) P(`  ${k.padEnd(44)} ${n}`)
  P('')
  P('EXHAUSTION EDGE (ledger = 95% of the family seen long ago)')
  for (const e of r.edge) P(`  ${e.section.padEnd(18)} seen ${e.seen}/${e.live}  delivered ${e.delivered}/${e.expected}  fresh ${e.fresh}  ${e.crash ? `CRASH ${e.crash}` : ''} ${e.defects.length ? `defects: ${e.defects.map(d => `${d.check}: ${d.msg}`).join(' | ')}` : 'no structural defect'}  gate: ${e.gate}`)
  P('')
  P(`BANK-WIDE ITEM SWEEP (per-item checks over all ${[...BANK.values()].reduce((a, r) => a + r.length, 0)} drawable rows, undrawn ones included)`)
  const sw = new Map<string, Array<{ row: BankRow; msg: string }>>()
  for (const d of r.sweep) { const k = `${d.row.family}/${d.row.section} ${d.check}`; if (!sw.has(k)) sw.set(k, []); sw.get(k)!.push(d) }
  if (!sw.size) P('  none')
  for (const [k, list] of [...sw].sort()) {
    P(`  ${k}: ${list.length}`)
    const byMsg = new Map<string, string[]>()
    for (const d of list) { const m = d.msg.replace(/\(.*\)|"[^"]*"|'[^']*'/g, '…'); if (!byMsg.has(m)) byMsg.set(m, []); byMsg.get(m)!.push(`${d.row.id.slice(0, 8)}(${d.row.cohort})`) }
    for (const [m, ids] of byMsg) P(`    ${m}: ${ids.length} — ${ids.slice(0, 8).join(' ')}${ids.length > 8 ? ` +${ids.length - 8}` : ''}`)
  }
  P('')
  P('ASSEMBLER WARNINGS')
  for (const [k, n] of [...r.warnCounts].sort((a, b) => b[1] - a[1]).slice(0, 25)) P(`  x${n}  ${k}`)
  console.log(lines.join('\n'))
  if (jsonPath) {
    const defects = [...r.readDefects, ...[...r.tallies.values()].flatMap(t => t.defects)]
    writeFileSync(jsonPath, JSON.stringify({ forms: r.forms, defects, reads: Object.fromEntries([...READS].map(([k, v]) => [k, { live: v.live, read: Math.min(...v.served) }])), edge: r.edge,
      formsDetail: r.allForms.map(f => ({ section: f.section, variant: f.variant, form: f.formNo, modules: f.modules.map(m => ({ name: m.expect.name, ids: m.slots.map(s => s.row?.id), difficulty: m.slots.map(s => s.row?.difficulty), domain: m.slots.map(s => s.row?.domain), composition: m.composition })) })) }, null, 1))
    console.log(`\njson written to ${jsonPath}`)
  }
}

async function main() {
  loadEnv()
  if (process.argv.includes('--selftest')) return selftest()
  const r = await runLive()
  const ji = process.argv.indexOf('--json')
  report(r, ji > 0 ? process.argv[ji + 1]! : null)
}

const REAL_ERROR = console.error
const RUN_AS_CLI = !!process.argv[1] && process.argv[1].endsWith('form-qc.ts')
if (RUN_AS_CLI) main().catch(e => { REAL_ERROR(e); process.exit(1) })
