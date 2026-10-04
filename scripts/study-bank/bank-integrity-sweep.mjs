#!/usr/bin/env node
/**
 * bank-integrity-sweep.mjs — whole-population DATA INTEGRITY sweep of every
 * verified, unarchived study_item_bank row, all families.
 *
 * READ ONLY. SELECTs against study_item_bank / study_item_reviews /
 * study_item_attacks / study_topics and a LIST of the audio bucket. Never
 * writes a row, never generates audio, never calls a model.
 *
 * ── What this is and is not ─────────────────────────────────────────────
 * Integrity, not quality. Every detector here asks a question with a
 * mechanical answer: does the key match a choice under the SAME
 * normalisation the grader applies (submit/route.ts gradeAnswer), does the
 * row survive the assembler's reader (assemble.ts readBankItem), does the
 * SVG parse, does the audio object exist under the hash the TTS route
 * looks up. It cannot tell you whether a key is RIGHT — only whether the
 * product can deliver and grade it as stored. The two semantic proxies it
 * carries ("explanation endorses a distractor", "numerically equal
 * choices") emit CANDIDATES that must be hand-verified before anyone calls
 * them a wrong key. CLAUDE.md: the attack is the gate; this is pre-flight.
 *
 * ── The rules this file is built to (CLAUDE.md, binding) ────────────────
 *   - a check that cannot read its input must not return a number:
 *     every detector prints `scorable N of M`; a detector whose N is 0 on a
 *     population where it is expected to apply prints NOT MEASURED and the
 *     run exits 2.
 *   - page past PostgREST's 1000 rows and assert loaded = live: the loader
 *     pages with an ORDER BY and compares against count:'exact'; a mismatch
 *     exits 2 before any detector runs.
 *   - each detector must first fire on a planted fixture: the sweep runs
 *     the self-test first and refuses to sweep if any detector fails to fire
 *     on its defect or fires on its clean twin. `--selftest` runs only that.
 *
 * usage:
 *   node scripts/study-bank/bank-integrity-sweep.mjs --selftest
 *   node scripts/study-bank/bank-integrity-sweep.mjs            # sweep
 *   node scripts/study-bank/bank-integrity-sweep.mjs --json out.json
 *   node scripts/study-bank/bank-integrity-sweep.mjs --max 40   # ids per check
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { findRefs } from './question-number-refs.mjs'

const require = createRequire(import.meta.url)

// ───────────────────────────────────────────────────────────────────────────
// Replicas of the code paths that serve and grade an item. Each one names its
// source; if the source changes, the replica must change with it.
// ───────────────────────────────────────────────────────────────────────────

/** submit/route.ts gradeAnswer(): `norm` — the ONLY normalisation grading applies. */
export const gnorm = s => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

/** submit/route.ts normalizeNumeric() */
export function normalizeNumeric(s) {
  const t = String(s).trim().replace(/\s+/g, '')
  if (/^-?\d+\.?\d*$/.test(t)) { const n = parseFloat(t); if (Number.isFinite(n)) return n.toString() }
  return t
}

/** assemble.ts QUESTION_TYPES / FREE_RESPONSE / DIFFICULTIES */
const QUESTION_TYPES = new Set(['multiple_choice', 'numeric_entry', 'multi_select', 'three_choice', 'quant_comparison',
  'fill_in_blanks', 'arrange_words', 'speaking_repeat', 'speaking_interview',
  'writing_email', 'writing_discussion', 'essay', 'essay_choice'])
const FREE_RESPONSE = new Set(['speaking_repeat', 'speaking_interview', 'writing_email', 'writing_discussion', 'essay', 'essay_choice'])
const DIFFICULTIES = new Set(['easy', 'medium', 'hard'])

/** openResponse.ts OPEN_RESPONSE_TYPES — read from source so it cannot drift. */
function readOpenResponseTypes() {
  try {
    const src = readFileSync('src/lib/study/openResponse.ts', 'utf8')
    const rubric = [...(src.match(/RESPONSE_SKILL_BY_TYPE[^=]*=\s*\{([\s\S]*?)\}/)?.[1] ?? '').matchAll(/(\w+)\s*:/g)].map(m => m[1])
    const unscored = [...(src.match(/UNSCORED_RESPONSE_TYPES[^=]*=\s*new Set\(\[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(m => m[1])
    if (rubric.length && unscored.length) return new Set([...rubric, ...unscored])
  } catch { /* fall through */ }
  return null
}
const OPEN_FALLBACK = new Set(['speaking_interview', 'writing_email', 'writing_discussion', 'essay', 'essay_choice'])

/** assemble.ts readBankItem(): null means the row is silently undrawable. */
export function readBankItemProblem(item) {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) return 'item is not an object'
  if (typeof item.prompt !== 'string' || !item.prompt) return 'prompt missing/empty'
  if (!QUESTION_TYPES.has(item.type)) return `type "${item.type}" not a QuestionType`
  if (!DIFFICULTIES.has(item.difficulty)) return `item.difficulty "${item.difficulty}" not easy/medium/hard`
  const ca = item.correct_answer
  if (typeof ca !== 'string' && !(ca === null && FREE_RESPONSE.has(item.type))) return 'correct_answer not a string'
  if (!Array.isArray(item.choices) || !item.choices.every(c => typeof c === 'string')) return 'choices not a string[]'
  return null
}

/** prewarm-toefl-audio.mjs ⇐ ListeningAudioPlayer.tsx + listening/tts route (exact replicas). */
const AUDIO_BUCKET = 'study-listening-audio'
const DIALOGUE_VOICE_ROTATION = ['nova', 'onyx', 'shimmer', 'echo']
function parseTurns(cleaned) {
  const turnRegex = /(?:^|\s)([A-Z]):\s+([\s\S]*?)(?=(?:\s[A-Z]:\s+)|$)/g
  const turns = []; let m
  while ((m = turnRegex.exec(cleaned)) != null) turns.push({ speaker: m[1], text: m[2].trim().replace(/^"|"$/g, '') })
  return turns.length >= 2 && new Set(turns.map(t => t.speaker)).size >= 2 ? turns : []
}
export function audioSegments(row) {
  const it = row.item ?? {}
  if (row.family !== 'toefl') return null
  if (row.section === 'listening' && it.type === 'multiple_choice') {
    const cleaned = (it.passage || '').replace(/^\s*transcript:\s*/i, '').trim()
    const turns = parseTurns(cleaned)
    if (!turns.length) return [{ text: cleaned.replace(/^"|"$/g, ''), voice: 'nova' }]
    const sv = new Map()
    return turns.map(({ speaker, text }) => {
      if (!sv.has(speaker)) sv.set(speaker, DIALOGUE_VOICE_ROTATION[sv.size % 4])
      return { text, voice: sv.get(speaker) }
    })
  }
  if (it.type === 'speaking_repeat') {
    const src = (it.passage ?? '').replace(/^\s*(?:audio\s*script|transcript)\s*:\s*/i, '').replace(/^"|"$/g, '').trim() || it.correct_answer || ''
    return [{ text: src.replace(/^"|"$/g, ''), voice: 'nova' }]
  }
  if (it.type === 'speaking_interview') {
    const q = (it.prompt || '').replace(/^\s*\[[^\]]+\]\s*/, '').replace(/^\s*transcript:\s*/i, '').trim()
    return [{ text: q.replace(/^"|"$/g, ''), voice: 'nova' }]
  }
  return null
}
export const audioObject = (voice, text) =>
  createHash('sha256').update(`${voice}\ntts-1\n${text}`).digest('hex').slice(0, 40) + '.mp3'

/** migration 076 study_item_content_sha(): md5(prompt␟passage␟key␟choices::jsonb-text) */
const pgJsonText = v => v === null ? 'null'
  : Array.isArray(v) ? '[' + v.map(pgJsonText).join(', ') + ']'
  : typeof v === 'object' ? '{' + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ': ' + pgJsonText(x)).join(', ') + '}'
  : JSON.stringify(v)
export function contentSha(item) {
  const choices = item?.choices === undefined ? '' : pgJsonText(item.choices)
  return createHash('md5').update([item?.prompt ?? '', item?.passage ?? '', item?.correct_answer ?? '', choices].join('\x1f')).digest('hex')
}

// ───────────────────────────────────────────────────────────────────────────
// Numeric / algebraic value of a choice, for "two choices are the same value".
// A tiny recursive-descent evaluator: numbers, + - * / ^, parentheses, √, π,
// implicit multiplication, single-letter variables. Anything else → null.
// ───────────────────────────────────────────────────────────────────────────
function tokenize(s) {
  const out = []; let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === ' ') { i++; continue }
    const num = s.slice(i).match(/^\d+(?:\.\d+)?|^\.\d+/)
    if (num) { out.push({ t: 'n', v: parseFloat(num[0]) }); i += num[0].length; continue }
    if ('+-*/^()'.includes(c)) { out.push({ t: c }); i++; continue }
    if (c === '√') { out.push({ t: '√' }); i++; continue }
    if (c === 'π') { out.push({ t: 'n', v: Math.PI }); i++; continue }
    if (/[a-z]/i.test(c)) { out.push({ t: 'v', v: c }); i++; continue }
    return null
  }
  return out
}
function parseExpr(tokens, env) {
  let p = 0
  const peek = () => tokens[p]
  const startsAtom = tk => tk && (tk.t === 'n' || tk.t === 'v' || tk.t === '(' || tk.t === '√')
  function expr() { let v = term(); while (peek() && (peek().t === '+' || peek().t === '-')) { const op = tokens[p++].t; const r = term(); v = op === '+' ? v + r : v - r } return v }
  function term() {
    let v = unary()
    for (;;) {
      const tk = peek()
      if (tk && (tk.t === '*' || tk.t === '/')) { p++; const r = unary(); v = tk.t === '*' ? v * r : v / r }
      else if (startsAtom(tk)) v = v * power()        // implicit multiplication
      else return v
    }
  }
  function unary() { if (peek()?.t === '-') { p++; return -unary() } if (peek()?.t === '+') { p++; return unary() } return power() }
  function power() { const b = atom(); if (peek()?.t === '^') { p++; return Math.pow(b, unary()) } return b }
  function atom() {
    const tk = tokens[p++]
    if (!tk) throw new Error('eof')
    if (tk.t === 'n') return tk.v
    if (tk.t === 'v') { if (!(tk.v in env)) throw new Error('var'); return env[tk.v] }
    if (tk.t === '√') return Math.sqrt(power())
    if (tk.t === '(') { const v = expr(); if (tokens[p++]?.t !== ')') throw new Error(')'); return v }
    throw new Error('tok')
  }
  const v = expr()
  if (p !== tokens.length) throw new Error('trailing')
  return v
}
/** Returns { unit, vars, f(env) } or null if the string is not a pure math value. */
export function mathForm(raw) {
  let s = String(raw ?? '').trim()
  if (!s || s.length > 40) return null
  s = s.replace(/[−–]/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/²/g, '^2').replace(/³/g, '^3')
  let unit = ''
  const pre = s.match(/^\$/); if (pre) { unit += '$'; s = s.slice(1) }
  const suf = s.match(/\s*(%|°|degrees)$/); if (suf) { unit += suf[1]; s = s.slice(0, s.length - suf[0].length) }
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '')
  if (/[^0-9a-zA-Z.+\-*/^()√π ]/.test(s)) return null
  // Prose guard: any run of 2+ letters is a word, not a product of variables.
  if (/[a-zA-Z]{2,}/.test(s)) return null
  const vars = [...new Set(s.match(/[a-zA-Z]/g) ?? [])]
  if (vars.length > 2) return null
  const tokens = tokenize(s)
  if (!tokens || !tokens.length) return null
  const f = env => parseExpr(tokens, env)
  try { const probe = f(Object.fromEntries(vars.map(v => [v, 1.37]))); if (!Number.isFinite(probe)) return null } catch { return null }
  return { unit, vars: vars.sort().join(''), f }
}
const SAMPLE_POINTS = [{ x: 1.37, y: 2.11 }, { x: 2.93, y: 0.71 }, { x: -1.61, y: 3.07 }]
export function sameValue(a, b) {
  const A = mathForm(a), B = mathForm(b)
  if (!A || !B || A.unit !== B.unit || A.vars !== B.vars) return false
  for (const pt of SAMPLE_POINTS) {
    const env = {}; for (const v of A.vars) env[v] = pt[v] ?? (pt.x + pt.y * v.charCodeAt(0) / 100)
    let va, vb
    try { va = A.f(env); vb = B.f(env) } catch { return false }
    if (!Number.isFinite(va) || !Number.isFinite(vb)) return false
    if (Math.abs(va - vb) > 1e-9 * Math.max(1, Math.abs(va), Math.abs(vb))) return false
  }
  return true
}

// ───────────────────────────────────────────────────────────────────────────
// Family taxonomy (official section/domain names, as served).
// ───────────────────────────────────────────────────────────────────────────
const DOMAINS = {
  'sat/math': ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry'],
  'sat/reading_writing': ['Craft and Structure', 'Information and Ideas', 'Standard English Conventions', 'Expression of Ideas'],
  'act/english': ['Production of Writing', 'Knowledge of Language', 'Conventions of Standard English'],
  'act/math': ['Number and Quantity', 'Algebra', 'Functions', 'Geometry', 'Statistics and Probability', 'Integrating Essential Skills'],
  'act/reading': ['Key Ideas and Details', 'Craft and Structure', 'Integration of Knowledge and Ideas'],
  'act/science': ['Interpretation of Data', 'Scientific Investigation', 'Evaluation of Models, Inferences, and Experimental Results'],
  'isee/math': ['Math'], 'isee/reading': ['Reading Comprehension'], 'isee/verbal': ['Verbal'], 'isee/writing': ['Essay'],
  'ssat/math': ['Math'], 'ssat/reading': ['Reading Comprehension'], 'ssat/verbal': ['Verbal'], 'ssat/writing': ['Writing Sample'],
  'toefl/listening': ['Choose a Response', 'Conversation', 'Announcement', 'Academic Talk'],
  'toefl/reading': ['Complete the Words', 'Daily Life', 'Academic Passage'],
  'toefl/speaking': ['Listen and Repeat', 'Interview'],
  'toefl/writing': ['Build a Sentence', 'Email', 'Academic Discussion'],
}
const TOEFL_TASK = {
  'Choose a Response': 'choose_response', Conversation: 'conversation', Announcement: 'announcement', 'Academic Talk': 'academic_talk',
  'Complete the Words': 'fill_in_blanks', 'Daily Life': 'daily_life', 'Academic Passage': 'academic_passage',
  'Listen and Repeat': 'speaking_repeat', Interview: 'speaking_interview',
  'Build a Sentence': 'arrange_words', Email: 'writing_email', 'Academic Discussion': 'writing_discussion',
}
/** Expected type and choice count by family/section (MC is 5-choice only on SSAT). */
const expectedChoiceCount = row => {
  const t = row.item?.type
  if (t === 'multiple_choice') return row.family === 'ssat' ? [5] : [4]
  if (FREE_RESPONSE.has(t) || t === 'fill_in_blanks') return [0]
  if (t === 'arrange_words') return null       // chip count varies by sentence; bas/* checks it
  return null
}
/** Sections whose items cannot be answered without a passage/transcript. */
const needsPassage = row => {
  const k = `${row.family}/${row.section}`, t = row.item?.type
  if (['sat/reading_writing', 'act/english', 'act/reading', 'act/science', 'isee/reading', 'ssat/reading', 'toefl/listening', 'toefl/reading'].includes(k)) return true
  if (['speaking_interview', 'writing_email', 'writing_discussion'].includes(t)) return true
  return false
}
/** Assembler set sizes (act-test.ts, admission-tests.ts ITEMS_PER_PASSAGE, check-production-items iv). */
const GROUP_SIZE = row => {
  const k = `${row.family}/${row.section}`
  if (k === 'act/english') return { min: 10, max: 10, src: 'ENGLISH_ITEMS_PER_PASSAGE' }
  if (k === 'act/reading') return { min: 9, max: 9, src: 'READING_ITEMS_PER_PASSAGE' }
  if (k === 'act/science') return { min: 5, max: 6, src: 'SCIENCE_ITEMS_PER_PASSAGE' }
  if (k === 'isee/reading' || k === 'ssat/reading') return { min: 6, max: null, src: 'ITEMS_PER_PASSAGE (full set = 6)' }
  if (row.item?.type === 'speaking_interview') return { min: 4, max: 4, src: 'interview set = 4' }
  // TOEFL_META.reading draws academic passages m1: 8 / upper: 10 and never splits a set,
  // so a set larger than 10 can only surface through the last-resort truncation path.
  if (row.family === 'toefl' && row.task === 'academic_passage') return { min: 1, max: 10, src: 'TOEFL academic_passage slots (m1 8 / upper 10)' }
  return null
}
/** Set-based tasks: an ungrouped item that shares its passage with siblings is an orphan. */
const SET_BASED = row => {
  const k = `${row.family}/${row.section}`
  if (['act/english', 'act/reading', 'act/science', 'isee/reading', 'ssat/reading'].includes(k)) return true
  return row.family === 'toefl' && ['conversation', 'announcement', 'academic_talk', 'academic_passage', 'daily_life', 'speaking_interview'].includes(row.task)
}
/** family/section → study_topics leaf slug(s), for reachability. */
const SECTION_SLUGS = {
  'sat/math': ['sat-math'], 'sat/reading_writing': ['sat-reading-writing'],
  'act/english': ['act-english'], 'act/math': ['act-math'], 'act/reading': ['act-reading'], 'act/science': ['act-science'],
  'toefl/listening': ['toefl-listening'], 'toefl/reading': ['toefl-reading'], 'toefl/speaking': ['toefl-speaking'], 'toefl/writing': ['toefl-writing'],
  'ssat/math': ['ssat-math'], 'ssat/reading': ['ssat-reading'], 'ssat/verbal': ['ssat-verbal'], 'ssat/writing': ['ssat-writing'],
  'isee/math': ['isee-quant-reasoning', 'isee-math-achievement'], 'isee/reading': ['isee-reading'], 'isee/verbal': ['isee-verbal'], 'isee/writing': ['isee-essay'],
}

// ───────────────────────────────────────────────────────────────────────────
// Text helpers
// ───────────────────────────────────────────────────────────────────────────
const textFields = it => {
  const out = [['prompt', it.prompt], ['passage', it.passage], ['explanation', it.explanation]]
  ;(it.choices ?? []).forEach((c, i) => out.push([`choices[${i}]`, c]))
  if (typeof it.correct_answer === 'string') out.push(['correct_answer', it.correct_answer])
  ;(it.blanks ?? []).forEach(b => { out.push([`blanks.${b?.id}.answer`, b?.answer]) })
  if (it.graphic && typeof it.graphic === 'object') out.push(['graphic.caption', it.graphic.caption])
  return out.filter(([, v]) => typeof v === 'string' && v.length)
}
const looseNorm = s => String(s ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const isKeyed = row => !OPEN_RESPONSE.has(row.item?.type) && row.item?.type !== 'speaking_repeat'
let OPEN_RESPONSE = OPEN_FALLBACK
const snip = (s, n = 70) => { s = String(s ?? '').replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n - 1) + '…' : s }

// ───────────────────────────────────────────────────────────────────────────
// ROW DETECTORS. Each: id, tier, applies(row, ctx), check(row, ctx) → string|null
// (or string[]), and a fixture pair { bad, good } for the self-test.
// tier: 1 = wrong/ungradeable answer, 2 = served broken, 3 = metadata/latent,
//       4 = cosmetic. Candidates (need hand-verification) are marked cand:true.
// ───────────────────────────────────────────────────────────────────────────
const MC_TYPES = new Set(['multiple_choice', 'three_choice', 'quant_comparison'])
const mc = (choices, key, extra = {}) => ({ family: "sat", section: "math", domain: "Algebra", subskill: "Linear equations", difficulty: 'medium', item_type: 'multiple_choice', task: 'multiple_choice',
  item: { type: 'multiple_choice', prompt: 'If 2x = 6, what is x?', choices, correct_answer: key, difficulty: 'medium', explanation: `Dividing by 2 gives x = ${key}.`, ...extra } })
const withRow = (r, patch) => ({ ...r, ...patch, item: { ...r.item, ...(patch.item ?? {}) } })

export const DETECTORS = [
  // ── tier 1: the grader cannot mark a correct answer correct ──────────────
  {
    id: 'reader/undrawable', tier: 1, title: 'row rejected by assemble.ts readBankItem (silently never served)',
    applies: () => true,
    check: r => readBankItemProblem(r.item),
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { item: { difficulty: 'Hard' } }), good: mc(['1', '2', '3', '4'], '3') },
  },
  {
    id: 'key/missing', tier: 1, title: 'keyed type with an empty correct_answer',
    applies: r => isKeyed(r) && !['multi_select', 'numeric_entry', 'fill_in_blanks'].includes(r.item?.type),
    check: r => (typeof r.item.correct_answer !== 'string' || !r.item.correct_answer.trim()) ? 'correct_answer empty' : null,
    fixtures: { bad: mc(['1', '2', '3', '4'], ''), good: mc(['1', '2', '3', '4'], '3') },
  },
  {
    id: 'key/not-exactly-one-choice', tier: 1, title: 'MC key matches 0 or 2+ choices under gradeAnswer norm()',
    applies: r => MC_TYPES.has(r.item?.type) && typeof r.item.correct_answer === 'string' && r.item.correct_answer.trim() !== '',
    check: r => {
      const k = gnorm(r.item.correct_answer)
      const hits = (r.item.choices ?? []).filter(c => gnorm(c) === k).length
      if (hits === 1) return null
      const near = (r.item.choices ?? []).find(c => looseNorm(c) === looseNorm(r.item.correct_answer))
      return `${hits} choices match key "${snip(r.item.correct_answer, 50)}"` + (hits === 0 && near ? ` (punctuation/quote-only variant present: "${snip(near, 50)}")` : '')
    },
    fixtures: { bad: mc(['1', '2', '3.', '4'], '3'), good: mc(['1', '2', ' 3 ', '4'], '3') },
  },
  {
    id: 'multi/keys-not-subset', tier: 1, title: 'multi_select correct_answers empty or not a subset of choices',
    applies: r => r.item?.type === 'multi_select',
    check: r => {
      const ks = r.item.correct_answers ?? []
      if (!ks.length) return 'correct_answers empty'
      const cs = new Set((r.item.choices ?? []).map(gnorm))
      const bad = ks.filter(k => !cs.has(gnorm(k)))
      return bad.length ? `not in choices: ${JSON.stringify(bad)}` : null
    },
    fixtures: { bad: withRow(mc(['a', 'b', 'c'], ''), { item: { type: 'multi_select', correct_answers: ['a', 'z'] } }), good: withRow(mc(['a', 'b', 'c'], ''), { item: { type: 'multi_select', correct_answers: ['a', 'b'] } }) },
  },
  {
    id: 'numeric/unparseable', tier: 1, title: 'numeric_entry acceptable_answers empty or not numeric after normalizeNumeric',
    applies: r => r.item?.type === 'numeric_entry',
    check: r => {
      const a = r.item.acceptable_answers ?? []
      if (!a.length) return 'acceptable_answers empty'
      const bad = a.filter(x => { const n = normalizeNumeric(x); return !/^-?\d+(\.\d+)?$/.test(n) && !/^-?\d+\/\d+$/.test(n) })
      return bad.length ? `unparseable: ${JSON.stringify(bad)}` : null
    },
    fixtures: { bad: withRow(mc([], ''), { item: { type: 'numeric_entry', acceptable_answers: ['3', 'three'] } }), good: withRow(mc([], ''), { item: { type: 'numeric_entry', acceptable_answers: ['3', '3.0', '6/2'] } }) },
  },
  {
    id: 'ctw/blanks-vs-placeholders', tier: 1, title: 'fill_in_blanks: blank ids ≠ [N] placeholders, non-numeric id, or empty answer',
    applies: r => r.item?.type === 'fill_in_blanks',
    check: r => {
      const p = String(r.item.passage ?? ''), blanks = r.item.blanks ?? []
      const out = []
      const inP = [...p.matchAll(/\[(\d+)\]/g)].map(m => Number(m[1])).sort((a, b) => a - b).join(',')
      const decl = blanks.map(b => Number(b?.id)).sort((a, b) => a - b).join(',')
      if (!blanks.length) out.push('no blanks')
      if (inP !== decl) out.push(`passage [${inP}] vs blanks [${decl}]`)
      const nonNum = blanks.filter(b => typeof b?.id !== 'number')
      if (nonNum.length) out.push(`${nonNum.length} blank id(s) not a number — readBlanks() drops them`)
      const empty = blanks.filter(b => typeof b?.answer !== 'string' || !b.answer.trim())
      if (empty.length) out.push(`${empty.length} blank(s) with no answer`)
      return out.length ? out.join('; ') : null
    },
    fixtures: {
      bad: withRow(mc([], ''), { item: { type: 'fill_in_blanks', passage: 'Th[1] cat s[2].', blanks: [{ id: 1, answer: 'e' }, { id: '3', answer: 'at' }] } }),
      good: withRow(mc([], ''), { item: { type: 'fill_in_blanks', passage: 'Th[1] cat s[2].', blanks: [{ id: 1, answer: 'e' }, { id: 2, answer: 'at' }] } }),
    },
  },
  {
    id: 'bas/key-not-assemblable', tier: 1, title: 'arrange_words: no tap order of the chips equals the key (or a duplicate chip)',
    applies: r => r.item?.type === 'arrange_words',
    check: r => {
      const chips = (r.item.choices ?? []).map(String)
      const segs = String(r.item.correct_answer ?? '').split('|').map(s => s.trim()).filter(Boolean)
      if (chips.length < 2 || segs.length < 2) return `${chips.length} chips, ${segs.length} key segments`
      if (new Set(chips).size !== chips.length) return 'duplicate chip (UI pool removes both copies)'
      const a = chips.map(gnorm).sort(), b = segs.map(gnorm).sort()
      if (a.length !== b.length || a.some((x, i) => x !== b[i])) return `key segs ${JSON.stringify(b.filter(x => !a.includes(x)))} not in chips; chips ${JSON.stringify(a.filter(x => !b.includes(x)))} not in key`
      return null
    },
    fixtures: {
      bad: withRow(mc(['the cat', 'sat', 'down'], 'the cat | sat | down.'), { item: { type: 'arrange_words' } }),
      good: withRow(mc(['sat', 'the cat', 'down'], 'the cat | sat | down'), { item: { type: 'arrange_words' } }),
    },
  },
  {
    id: 'repeat/script-key-mismatch', tier: 1, title: 'speaking_repeat: the audio script and the graded key differ',
    applies: r => r.item?.type === 'speaking_repeat',
    check: r => {
      const spoken = String(r.item.passage ?? '').replace(/^\s*(?:audio\s*script|transcript)\s*:\s*/i, '').replace(/^"|"$/g, '').trim()
      const key = String(r.item.correct_answer ?? '').trim()
      if (!key) return 'no key'
      if (!spoken) return null   // player falls back to the key itself
      const strip = s => s.toLowerCase().replace(/[.,!?;:'"\-—–…‘’“”«»()]/g, '').replace(/\s+/g, ' ').trim()
      return strip(spoken) !== strip(key) ? `audio "${snip(spoken, 50)}" vs key "${snip(key, 50)}"` : null
    },
    fixtures: {
      bad: withRow(mc([], 'The library opens at nine.'), { item: { type: 'speaking_repeat', passage: 'Audio script: "The library opens at ten."' } }),
      good: withRow(mc([], 'The library opens at nine.'), { item: { type: 'speaking_repeat', passage: 'Audio script: "The library opens at nine."' } }),
    },
  },
  {
    id: 'open/has-key-or-scored', tier: 1, title: 'open-response type carries a key, or is not in OPEN_RESPONSE_TYPES (would be key-matched)',
    applies: r => FREE_RESPONSE.has(r.item?.type) && r.item?.type !== 'speaking_repeat',
    check: r => {
      const out = []
      if (!OPEN_RESPONSE.has(r.item.type)) out.push(`type ${r.item.type} not in OPEN_RESPONSE_TYPES — would be graded against "${snip(r.item.correct_answer, 30)}"`)
      if (typeof r.item.correct_answer === 'string' && r.item.correct_answer.trim()) out.push(`carries a key "${snip(r.item.correct_answer, 40)}"`)
      return out.length ? out.join('; ') : null
    },
    fixtures: { bad: withRow(mc([], 'A strong essay…'), { item: { type: 'essay' } }), good: withRow(mc([], ''), { item: { type: 'essay' } }) },
  },
  {
    id: 'choices/equal-value', tier: 1, cand: true, title: 'two choices with the same numeric/algebraic value (two correct, or a free elimination)',
    applies: r => MC_TYPES.has(r.item?.type) && (r.item.choices ?? []).filter(c => mathForm(c)).length >= 2,
    check: r => {
      const cs = r.item.choices, out = []
      for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
        if (gnorm(cs[i]) === gnorm(cs[j])) continue          // exact duplicates are choices/duplicate
        if (sameValue(cs[i], cs[j])) out.push(`"${cs[i]}" = "${cs[j]}"${[cs[i], cs[j]].some(c => gnorm(c) === gnorm(r.item.correct_answer)) ? ' (one is the KEY)' : ''}`)
      }
      return out.length ? out.join('; ') : null
    },
    fixtures: { bad: mc(['1/2', '0.5', '2', '3√13'], '0.5'), good: mc(['1/2', '0.25', '2', '3√13'], '1/2') },
  },
  {
    id: 'choices/duplicate', tier: 1, title: 'two choices identical under gradeAnswer norm() (React key collision; both highlight)',
    applies: r => (r.item?.choices ?? []).length >= 2 && r.item.type !== 'arrange_words',
    check: r => {
      const seen = new Map(), d = []
      for (const c of r.item.choices) { const k = gnorm(c); if (seen.has(k)) d.push(`"${snip(c, 40)}"`); seen.set(k, 1) }
      return d.length ? `duplicate: ${d.join(', ')}` : null
    },
    fixtures: { bad: mc(['1', '2', '2 ', '4'], '1'), good: mc(['1', '2', '3', '4'], '1') },
  },
  {
    id: 'explanation/endorses-distractor', tier: 1, cand: true, title: 'explanation states a DISTRACTOR as the answer (candidate wrong key — hand-verify)',
    applies: r => MC_TYPES.has(r.item?.type) && typeof r.item.explanation === 'string' && r.item.explanation.length > 0,
    check: r => {
      const it = r.item, ex = it.explanation, key = it.correct_answer
      const dis = (it.choices ?? []).filter(c => gnorm(c) !== gnorm(key))
      const out = []
      // (a) "the (correct|best) answer is X" / "X is (the )?correct"
      for (const m of ex.matchAll(/\b(?:correct|best|right)\s+(?:answer|choice|option|response)\s+(?:is|would be)\s*:?\s*["“']?([^"”\n]{1,90})/gi)) {
        const cap = looseNorm(m[1])
        const d = dis.find(c => { const n = looseNorm(c); return n.length >= 1 && (cap === n || cap.startsWith(n + ' ')) })
        const k = looseNorm(key)
        if (d && !(cap === k || cap.startsWith(k + ' '))) out.push(`says answer is "${snip(m[1], 50)}" = distractor "${snip(d, 40)}"`)
      }
      // (b) numeric: key value never stated, but the explanation's LAST "= v" is a distractor value
      if (mathForm(key) && !mathForm(key).vars) {
        const kv = mathForm(key).f({})
        // Normalise the way a reader does: typographic minus, $, thousands commas.
        const flat = t => String(t).replace(/[−–]/g, '-').replace(/\$/g, '').replace(/(\d),(?=\d{3}\b)/g, '$1')
        const exN = flat(ex), keyN = flat(key).trim()
        const vals = [...exN.matchAll(/(?:=|is|equals|gives|of|leaving)\s*(-?\d+(?:\.\d+)?)(?![\d.]*\s*[/√^])/g)].map(m => parseFloat(m[1]))
        const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
        const keyStated = vals.some(v => Math.abs(v - kv) < 1e-9) || exN.includes(keyN)
          || (Number.isInteger(kv) && kv >= 0 && kv <= 10 && new RegExp(`\\b(?:exactly )?${WORDS[kv]}\\b`, 'i').test(exN))
        const last = vals.at(-1)
        if (!keyStated && last !== undefined) {
          const d = dis.find(c => { const f = mathForm(c); if (!f || f.vars) return false; try { return Math.abs(f.f({}) - last) < 1e-9 } catch { return false } })
          if (d) out.push(`key ${key} never stated; final value ${last} = distractor "${d}"`)
        }
      }
      return out.length ? out.join('; ') : null
    },
    fixtures: {
      bad: withRow(mc(['2', '3', '4', '6'], '4'), { item: { explanation: 'Dividing both sides by 2, x = 3. The correct answer is 3.' } }),
      good: withRow(mc(['2', '3', '4', '6'], '3'), { item: { explanation: 'Dividing both sides by 2, x = 3. The correct answer is 3.' } }),
    },
  },

  // ── tier 2: served broken / misleading ───────────────────────────────────
  {
    id: 'choices/count', tier: 2, title: 'choice count differs from the family/type format',
    applies: r => expectedChoiceCount(r) !== null,
    check: r => { const n = (r.item.choices ?? []).length, e = expectedChoiceCount(r); return e.includes(n) ? null : `${n} choices, format expects ${e.join('/')}` },
    fixtures: { bad: mc(['1', '2', '3'], '3'), good: mc(['1', '2', '3', '4'], '3') },
  },
  {
    id: 'choices/empty', tier: 2, title: 'empty or whitespace-only choice',
    applies: r => (r.item?.choices ?? []).length > 0,
    check: r => {
      const blank = r.item.choices.filter(c => !String(c).trim())
      if (!blank.length) return null
      const keyBlank = !String(r.item.correct_answer ?? '').trim()
      return `${blank.length} blank choice(s) — renders as an empty button, and gradeAnswer() returns false for any all-whitespace answer${keyBlank ? ' (it is the KEY: ungradeable)' : ''}`
    },
    fixtures: { bad: mc(['1', ' ', '3', '4'], '3'), good: mc(['1', '2', '3', '4'], '3') },
  },
  {
    id: 'choices/equals-stem', tier: 2, title: 'a choice identical to the stem',
    applies: r => (r.item?.choices ?? []).length > 0,
    check: r => r.item.choices.some(c => gnorm(c) && gnorm(c) === gnorm(r.item.prompt)) ? 'choice == prompt' : null,
    fixtures: { bad: mc(['If 2x = 6, what is x?', '2', '3', '4'], '3'), good: mc(['1', '2', '3', '4'], '3') },
  },
  {
    id: 'passage/required-empty', tier: 2, title: 'section needs a passage/transcript and it is empty',
    applies: r => needsPassage(r),
    // SEC items may carry their sentence IN the stem ("… _____ …"); that is
    // not an empty passage. Only a stem that is a bare question fails.
    check: r => String(r.item.passage ?? '').trim().length >= 20 || /_{3,}|-{5,}/.test(String(r.item.prompt)) || String(r.item.prompt).length > 220 ? null
      : `passage ${JSON.stringify(snip(r.item.passage ?? null, 30))}, stem is a bare question: "${snip(r.item.prompt, 60)}"`,
    fixtures: { bad: { ...mc(['a', 'b', 'c', 'd'], 'a'), family: 'sat', section: 'reading_writing', item: { ...mc(['a', 'b', 'c', 'd'], 'a').item, passage: '' } },
      good: { ...mc(['a', 'b', 'c', 'd'], 'a'), family: 'sat', section: 'reading_writing', item: { ...mc(['a', 'b', 'c', 'd'], 'a').item, passage: 'A long enough passage about the migration of terns across the Atlantic.' } } },
  },
  {
    id: 'graphic/referenced-missing', tier: 2, cand: true, title: 'stem refers to "the graph/table/figure" and the item has no graphic (and no table/svg in the passage)',
    applies: r => typeof r.item?.prompt === 'string' && GRAPHIC_REF.test(r.item.prompt),
    check: r => {
      const g = r.item.graphic
      if (g && typeof g === 'object' && (g.svg || g.cells || g.bars || g.points || g.series || g.values)) return null
      const p = String(r.item.passage ?? '')
      if (/<svg[\s>]/i.test(p) || hasInlineTable(p) || hasInlineTable(r.item.prompt)) return null
      return `"${snip(r.item.prompt.match(GRAPHIC_REF)[0], 40)}" with no graphic and no inline table`
    },
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { item: { prompt: 'Based on the graph shown, what is f(2)?' } }),
      good: withRow(mc(['1', '2', '3', '4'], '3'), { item: { prompt: 'Based on the graph shown, what is f(2)?', graphic: { type: 'svg', svg: '<svg viewBox="0 0 10 10"></svg>' } } }) },
  },
  {
    id: 'graphic/svg-invalid', tier: 2, title: 'graphic.svg not well-formed XML, root not <svg>, or viewBox missing/insane',
    applies: r => typeof r.item?.graphic?.svg === 'string',
    check: r => svgProblem(r.item.graphic.svg),
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { item: { graphic: { type: 'svg', svg: '<svg viewBox="0 0 0 10"><g></svg>' } } }),
      good: withRow(mc(['1', '2', '3', '4'], '3'), { item: { graphic: { type: 'svg', svg: '<svg viewBox="0 0 350 250"><g><circle cx="1" cy="1" r="1"/></g></svg>' } } }) },
  },
  {
    id: 'graphic/data-shape', tier: 2, title: 'table/bar/series graphic whose arrays do not line up',
    applies: r => r.item?.graphic && typeof r.item.graphic === 'object' && !r.item.graphic.svg,
    // A two-way table with "entries omitted" is the item, not a defect.
    check: r => { const p = graphicDataProblem(r.item.graphic); return p === 'empty cell' && /\b(?:omitted|missing|left blank|not shown)\b/i.test(r.item.prompt) ? null : p },
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { item: { graphic: { type: 'table', rowLabels: ['a', 'b'], colLabels: ['x'], cells: [['1']] } } }),
      good: withRow(mc(['1', '2', '3', '4'], '3'), { item: { graphic: { type: 'table', rowLabels: ['a', 'b'], colLabels: ['x'], cells: [['1'], ['2']] } } }) },
  },
  {
    id: 'audio/missing-object', tier: 2, title: 'TOEFL audio clip not in the bucket (first student to play it triggers live TTS)',
    applies: (r, ctx) => ctx.audioObjects && audioSegments(r) !== null,
    check: (r, ctx) => {
      const segs = audioSegments(r).filter(s => s.text)
      if (!segs.length) return 'no speakable text'
      const miss = segs.filter(s => !ctx.audioObjects.has(audioObject(s.voice, s.text)))
      return miss.length ? `${miss.length}/${segs.length} clip(s) missing, e.g. ${miss[0].voice} "${snip(miss[0].text, 40)}"` : null
    },
    fixtures: {
      bad: { family: 'toefl', section: 'listening', item: { type: 'multiple_choice', passage: 'Transcript: "Hello there."' } },
      good: { family: 'toefl', section: 'listening', item: { type: 'multiple_choice', passage: 'Transcript: "Good morning."' } },
      ctx: { audioObjects: new Set([audioObject('nova', 'Good morning.')]) },
    },
  },
  {
    id: 'explanation/missing', tier: 2, title: 'keyed item with no explanation',
    applies: r => isKeyed(r),
    check: r => String(r.item.explanation ?? '').trim().length < 10 ? 'explanation empty' : null,
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { item: { explanation: '' } }), good: mc(['1', '2', '3', '4'], '3') },
  },
  {
    id: 'explanation/letter-reference', tier: 2, title: 'explanation names an option by LETTER — choices are re-shuffled per session (shuffleDrawnChoices), so the letter is wrong for most students',
    // Maths/science label points, angles and students with capitals; listening
    // dialogues label SPEAKERS A/B. Those are excluded, not pattern-matched away.
    applies: r => MC_TYPES.has(r.item?.type) && String(r.item.explanation ?? '').length > 0 && !['math', 'science'].includes(r.section)
      && !/(?:^|\s)B:\s/.test(String(r.item.passage ?? '')),
    check: r => { const m = String(r.item.explanation).match(LETTER_REF); return m ? `"${snip(m[0].trim(), 40)}"` : null },
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { section: 'reading_writing', item: { explanation: 'The passage supports the third reading. A is the tempting misreading; B overstates the claim.' } }),
      good: withRow(mc(['1', '2', '3', '4'], '3'), { section: 'reading_writing', item: { explanation: 'Passage B says the opposite, and Speaker A agrees; Text 2 undercuts it.' } }) },
  },
  {
    id: 'text/question-number', tier: 2, title: 'hardcoded question number / "previous question" reference (question-number-refs.mjs)',
    applies: r => typeof r.item?.prompt === 'string',
    check: r => {
      const hits = []
      for (const [f, v] of [['prompt', r.item.prompt], ['explanation', r.item.explanation], ...(r.item.choices ?? []).map((c, i) => [`choices[${i}]`, c])]) {
        for (const h of findRefs(v)) hits.push(`${f}: "${snip(h.match, 30)}"`)
      }
      return hits.length ? hits.join('; ') : null
    },
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { item: { prompt: 'Question 12 asks about the essay as a whole.' } }), good: mc(['1', '2', '3', '4'], '3') },
  },
  {
    id: 'text/mojibake', tier: 2, title: 'mojibake / replacement characters',
    applies: r => !!r.item,
    check: r => { const h = textFields(r.item).find(([, v]) => MOJIBAKE.test(v)); return h ? `${h[0]}: "${snip(h[1].match(MOJIBAKE)[0], 20)}"` : null },
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { item: { prompt: 'Itâ€™s 2x = 6; find x.' } }), good: withRow(mc(['1', '2', '3', '4'], '3'), { item: { prompt: 'It’s 2x = 6; find x — café.' } }) },
  },
  {
    id: 'text/serialisation-leak', tier: 2, title: '"[object Object]", a bare "undefined"/"null"/"NaN" field, or a literal \\u escape',
    applies: r => !!r.item,
    check: r => {
      const h = textFields(r.item).find(([, v]) => /\[object Object\]|\bNaN\b|\\u[0-9a-f]{4}/i.test(v) || /^(undefined|null)$/i.test(v.trim()))
      return h ? `${h[0]}: "${snip(h[1], 40)}"` : null
    },
    fixtures: { bad: mc(['1', '[object Object]', '3', '4'], '3'), good: withRow(mc(['1', '2', '3', '4'], '3'), { item: { prompt: 'The function is undefined at x = 0. What is f(1)?' } }) },
  },
  {
    id: 'text/html-entity', tier: 2, title: 'HTML entity rendered literally (outside SVG)',
    applies: r => !!r.item,
    check: r => { const h = textFields(r.item).find(([, v]) => HTML_ENTITY.test(v)); return h ? `${h[0]}: "${h[1].match(HTML_ENTITY)[0]}"` : null },
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { item: { prompt: 'If 2x &gt; 6, what is x?' } }), good: withRow(mc(['1', '2', '3', '4'], '3'), { item: { prompt: 'If 2x > 6 & y < 1, what is x?' } }) },
  },
  {
    id: 'text/hangul', tier: 2, title: 'Korean text inside an English-language test item',
    applies: r => !!r.item,
    check: r => { const h = textFields(r.item).find(([, v]) => /[가-힣ㄱ-ㆎ]/.test(v)); return h ? `${h[0]}: "${snip(h[1].match(/.{0,15}[가-힣ㄱ-ㆎ].{0,15}/)[0], 40)}"` : null },
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { item: { explanation: '정답은 3입니다.' } }), good: mc(['1', '2', '3', '4'], '3') },
  },

  // ── tier 3: metadata / latent ────────────────────────────────────────────
  {
    id: 'meta/difficulty', tier: 3, title: 'row difficulty not easy/medium/hard, or row ≠ item.difficulty (TOEFL pilot selection reads item.difficulty)',
    applies: () => true,
    check: r => {
      if (!DIFFICULTIES.has(r.difficulty)) return `row difficulty "${r.difficulty}"`
      if (r.item?.difficulty !== r.difficulty) return `row ${r.difficulty} vs item ${r.item?.difficulty}${r.family === 'toefl' ? ' (TOEFL: pilot pick uses item)' : ''}`
      return null
    },
    fixtures: { bad: { ...mc(['1', '2', '3', '4'], '3'), difficulty: 'easy' }, good: mc(['1', '2', '3', '4'], '3') },
  },
  {
    id: 'meta/domain-task', tier: 3, title: 'domain not in the family/section taxonomy; row vs item domain/type/task disagree',
    applies: () => true,
    check: r => {
      const out = [], k = `${r.family}/${r.section}`
      if (!DOMAINS[k]) out.push(`unknown family/section ${k}`)
      else if (!DOMAINS[k].includes(r.domain)) out.push(`domain "${r.domain}" not in ${k}`)
      if (r.item?.domain && r.item.domain !== r.domain) out.push(`item.domain "${r.item.domain}" ≠ row "${r.domain}"`)
      if (r.item_type && r.item?.type !== r.item_type) out.push(`item.type ${r.item?.type} ≠ item_type ${r.item_type}`)
      if (r.family === 'toefl' && TOEFL_TASK[r.domain] && r.task !== TOEFL_TASK[r.domain]) out.push(`task "${r.task}" ≠ ${TOEFL_TASK[r.domain]}`)
      const sub = r.item?.listeningTask ?? r.item?.readingTask
      if (sub && r.task && sub !== r.task) out.push(`item task ${sub} ≠ row task ${r.task}`)
      if (r.family === 'sat' && !String(r.subskill ?? '').trim()) out.push('SAT row with no subskill')
      return out.length ? out.join('; ') : null
    },
    fixtures: { bad: { ...mc(['1', '2', '3', '4'], '3'), domain: 'Craft and Structure' }, good: mc(['1', '2', '3', '4'], '3') },
  },
  {
    id: 'meta/group-id-mismatch', tier: 3, title: 'row passage_group_id ≠ item.passageGroupId (assembler reads both, in different paths)',
    applies: r => r.passage_group_id != null || r.item?.passageGroupId != null,
    check: r => (r.passage_group_id ?? null) !== (r.item?.passageGroupId ?? null) ? `row ${r.passage_group_id} vs item ${r.item?.passageGroupId} (served key: ${['isee', 'ssat', 'act'].includes(r.family) ? 'row' : 'item'})` : null,
    fixtures: { bad: { ...mc(['1', '2', '3', '4'], '3'), passage_group_id: 'g1', item: { ...mc(['1', '2', '3', '4'], '3').item, passageGroupId: 'g2' } },
      good: { ...mc(['1', '2', '3', '4'], '3'), passage_group_id: 'g1', item: { ...mc(['1', '2', '3', '4'], '3').item, passageGroupId: 'g1' } } },
  },
  {
    id: 'meta/unreachable', tier: 3, title: 'drawable but unreachable: section subtopic hidden, family topic locked, or no topic',
    applies: (r, ctx) => !!ctx.gates,
    check: (r, ctx) => {
      const slugs = SECTION_SLUGS[`${r.family}/${r.section}`]
      if (ctx.gates.locked.has(`test-${r.family}`)) return `topic test-${r.family} LOCKED`
      if (!slugs) return `no topic slug for ${r.family}/${r.section}`
      const live = slugs.filter(s => !ctx.gates.hidden.has(s) && (!ctx.gates.topics || ctx.gates.topics.has(s)))
      return live.length ? null : `subtopic(s) ${slugs.join('/')} hidden or absent`
    },
    fixtures: { bad: { ...mc(['1', '2', '3', '4'], '3'), family: 'act', section: 'writing' }, good: mc(['1', '2', '3', '4'], '3'),
      ctx: { gates: { hidden: new Set(['act-writing']), locked: new Set(), topics: null } } },
  },
  {
    id: 'meta/rationales-unreadable', tier: 3, title: 'distractor_rationales not in the [{choice,reason}] shape assemble.ts readRationales() reads — dropped before the student sees them',
    applies: r => r.item?.distractor_rationales != null,
    check: r => {
      const d = r.item.distractor_rationales
      if (Array.isArray(d)) { const bad = d.filter(e => !e || typeof e !== 'object' || typeof e.choice !== 'string' || typeof e.reason !== 'string'); return bad.length ? `${bad.length} entr${bad.length > 1 ? 'ies' : 'y'} of type ${typeof bad[0]}` : null }
      return typeof d === 'object' ? `object map (${Object.keys(d).length} keys)` : `type ${typeof d}`
    },
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { item: { distractor_rationales: { 1: 'too small' } } }),
      good: withRow(mc(['1', '2', '3', '4'], '3'), { item: { distractor_rationales: [{ choice: '1', reason: 'too small' }] } }) },
  },
  {
    id: 'meta/rationales-stale', tier: 3, title: 'array rationale names text that is no longer a choice (choices edited after authoring) — the student sees no rationale for that distractor',
    applies: r => Array.isArray(r.item?.distractor_rationales) && r.item.distractor_rationales.some(e => e && typeof e === 'object'),
    check: r => {
      const cs = new Set((r.item.choices ?? []).map(gnorm))
      const bad = r.item.distractor_rationales.filter(e => e && typeof e === 'object' && !cs.has(gnorm(e.choice)))
      if (!bad.length) return null
      const withText = bad.filter(e => String(e.reason ?? '').trim()).length
      return `${bad.length} stale (${withText} with reason text), e.g. "${snip(bad[0].choice, 35)}"`
    },
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { item: { distractor_rationales: [{ choice: '14', reason: '' }] } }),
      good: withRow(mc(['1', '2', '3', '4'], '3'), { item: { distractor_rationales: [{ choice: '1', reason: 'too small' }] } }) },
  },
  {
    id: 'meta/rationale-key-stale', tier: 3, title: 'rationale map keyed to text that is not a current distractor (stale after an edit), or rationale for the key',
    applies: r => r.item?.distractor_rationales && typeof r.item.distractor_rationales === 'object' && !Array.isArray(r.item.distractor_rationales),
    check: r => {
      const cs = new Set((r.item.choices ?? []).map(gnorm)), out = []
      for (const k of Object.keys(r.item.distractor_rationales)) {
        if (!cs.has(gnorm(k))) out.push(`"${snip(k, 35)}" not a choice`)
        else if (gnorm(k) === gnorm(r.item.correct_answer)) out.push(`rationale given for the KEY "${snip(k, 35)}"`)
      }
      return out.length ? out.join('; ') : null
    },
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { item: { distractor_rationales: { 5: 'x' } } }), good: withRow(mc(['1', '2', '3', '4'], '3'), { item: { distractor_rationales: { 1: 'x' } } }) },
  },
  {
    id: 'meta/content-sha', tier: 3, title: 'stored content_sha ≠ recomputed migration-076 hash (generated column; a mismatch means the JS replica is wrong)',
    applies: r => typeof r.content_sha === 'string',
    check: r => contentSha(r.item) === r.content_sha ? null : `stored ${r.content_sha} vs ${contentSha(r.item)}`,
    fixtures: { bad: { ...mc(['1', '2'], '1'), content_sha: 'deadbeef' }, good: { ...mc(['1', '2'], '1'), content_sha: contentSha(mc(['1', '2'], '1').item) } },
  },

  // ── tier 4: cosmetic ─────────────────────────────────────────────────────
  {
    id: 'explanation/lacks-key-text', tier: 4, title: 'explanation never quotes the key text (soft: paraphrase is legitimate)',
    applies: r => MC_TYPES.has(r.item?.type) && String(r.item.explanation ?? '').length > 0 && looseNorm(r.item.correct_answer).length > 0,
    check: r => {
      const k = looseNorm(r.item.correct_answer), ex = looseNorm(r.item.explanation)
      if ((' ' + ex + ' ').includes(' ' + k + ' ')) return null
      const mf = mathForm(r.item.correct_answer)
      if (mf && !mf.vars) { try { const v = mf.f({}); if ([...String(r.item.explanation).replace(/[−–]/g, '-').matchAll(/-?\d[\d,]*(?:\.\d+)?/g)].some(m => Math.abs(parseFloat(m[0].replace(/,/g, '')) - v) < 1e-9)) return null } catch { /* */ } }
      return `key "${snip(r.item.correct_answer, 40)}" not found`
    },
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { item: { explanation: 'Divide both sides by two.' } }), good: mc(['1', '2', '3', '4'], '3') },
  },
  {
    id: 'text/minus-mix', tier: 4, title: 'choice set mixes typographic minus (−) and hyphen-minus (-) on numbers',
    applies: r => (r.item?.choices ?? []).some(c => /[−-]\s?\d/.test(c)),
    check: r => {
      const typ = r.item.choices.filter(c => /−\s?\d/.test(c)), asc = r.item.choices.filter(c => /(^|[\s(=])-\s?\d/.test(c))
      return typ.length && asc.length ? `${typ.length} with "−", ${asc.length} with "-"${(typ.length === 1 && gnorm(typ[0]) === gnorm(r.item.correct_answer)) || (asc.length === 1 && gnorm(asc[0]) === gnorm(r.item.correct_answer)) ? ' — the KEY is the odd one out' : ''}` : null
    },
    fixtures: { bad: mc(['−3', '-2', '-1', '0'], '−3'), good: mc(['−3', '−2', '−1', '0'], '−3') },
  },
  {
    id: 'text/stray-markdown', tier: 4, title: 'unbalanced ** / backticks / markdown heading in prompt or choices',
    applies: r => !!r.item,
    check: r => {
      for (const [f, v] of [['prompt', r.item.prompt], ...(r.item.choices ?? []).map((c, i) => [`choices[${i}]`, c])]) {
        if (typeof v !== 'string') continue
        if (((v.match(/\*\*/g) ?? []).length % 2) || /`/.test(v) || /^#{1,4}\s/m.test(v)) return `${f}: "${snip(v, 40)}"`
      }
      return null
    },
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { item: { prompt: 'If **2x = 6, what is x?' } }), good: withRow(mc(['1', '2', '3', '4'], '3'), { item: { prompt: 'If **2x** = 6, what is x?' } }) },
  },
  {
    id: 'text/unbalanced', tier: 4, title: 'unbalanced ( ) [ ] { } or curly quotes in prompt/choices',
    applies: r => !!r.item,
    check: r => {
      for (const [f, v] of [['prompt', r.item.prompt], ...(r.item.choices ?? []).map((c, i) => [`choices[${i}]`, c])]) {
        if (typeof v !== 'string') continue
        const s = v.replace(/\[\d+\]/g, '')
        const c = ch => (s.split(ch).length - 1)
        const bad = [['(', ')'], ['[', ']'], ['{', '}'], ['“', '”']].filter(([a, b]) => c(a) !== c(b))
        // interval notation [a, b) / (a, b] is legitimate maths
        if (bad.length && !(bad.every(([a]) => a === '(' || a === '[') && /[[(]\s*-?[\w.√π]+\s*,\s*-?[\w.√π∞]+\s*[\])]/.test(s))) return `${f}: ${bad.map(x => x.join('')).join(' ')} in "${snip(v, 40)}"`
      }
      return null
    },
    fixtures: { bad: withRow(mc(['1', '2', '3', '(4'], '3'), {}), good: withRow(mc(['1', '[2, 3)', '3', '(4)'], '3'), {}) },
  },
  {
    id: 'text/double-space', tier: 4, title: 'internal double space in prompt/choices',
    applies: r => !!r.item,
    check: r => { const h = [['prompt', r.item.prompt], ...(r.item.choices ?? []).map((c, i) => [`choices[${i}]`, c])].find(([, v]) => typeof v === 'string' && /\S {2,}\S/.test(v)); return h ? `${h[0]}: "${snip(h[1].match(/.{0,15}\S {2,}\S.{0,10}/)[0], 30)}"` : null },
    fixtures: { bad: withRow(mc(['1', '2', '3', '4'], '3'), { item: { prompt: 'If 2x  = 6, what is x?' } }), good: mc(['1', '2', '3', '4'], '3') },
  },
]

const LETTER_NOUN = '(?:Point|Points|Passage|Passages|Speaker|Text|Cereal|Angle|Species|Group|Plan|Line|Figure|Table|Study|Experiment|Site|Sample|Student|Students|School|Company|Country|City|Town|Region|Trial|Model|Theory|Hypothesis|Scientist|Researcher|Version|Type|Day|Phase|Stage|Product|Brand|Store|Team|Class|Box|Car|Vitamin|Section|Part|Exhibit|Machine|Method|Route|Room|Building|Factory|Farm|Lake|Island|Star|Planet|Strain|Population|Patient|Participant|Survey|Proposal|Policy|Option|Track|Field|Zone|Area|Gene|Allele|Solution|Substance|Compound|Material|Device|Panel|Graph|Chart|Diagram|Map|Image|Photo|Scenario|Case|Condition|Treatment|Variety|Supplier|Vendor|Candidate|Author|Critic|Reader|Viewer|Person|Player|Runner|Train|Bus|Tank|Container|Jar|Bottle|Cup|Coin|Die|Spinner|Card|Urn|Bin|Column|Row|Grade|Level|Tier|Plot|vertex|Vertex|point|line|segment|Segment|side|Side)'
const LETTER_REF = new RegExp(
  `(?:\\b(?:answers?|picks?|chooses?|choose|selects?|disposes of|eliminates?|rules? out|options?|choices?|letter)\\s+\\(?[A-E]\\)?(?![\\w'’])`
  + `|(?<!\\b${LETTER_NOUN}\\s)(?<![\\w'’-])\\(?[A-E]\\)?\\s+(?:fails|is wrong|is incorrect|is correct|is right|is the (?:tempting|rosy|face-value|old|position|expectation|misreading|selection|overgeneralisation|distractor|trap|answer|key)|overstates|understates|reverses|confuses|misreads|misstates|distorts|invents|denies|contradicts|treats|turns|inverts|ignores|garbles|restates)\\b`
  + `|(?:which is|precisely|exactly|hence|so the answer is)\\s+\\(?[A-E]\\)?[.;,](?!\\d)`
  + `|(?<![\\w'’-])\\(?[A-E]\\)?\\s*,\\s*\\(?[A-E]\\)?\\s*,?\\s*(?:and|or)\\s+\\(?[A-E]\\)?(?![\\w'’]))`)
// "the graph of y = …" names a function, not a figure; "the plot" of land and
// "the figure it produced" are prose. Only a bare reference counts.
const GRAPHIC_REF = /\b(?:the|this|following|accompanying|above|given)\s+(?:(?:bar|line|circle|dot|box|scatter)\s*)?(?:graphs?|tables?|figures?|charts?|scatterplots?|diagrams?|histograms?|dot plots?|box plots?)\b(?!\s+(?:of|it|that|in a pattern)\b)(?!['’]s)/i
/** A table typed into the text: 2+ lines that are pipe-, tab- or column-separated
 *  rows with a digit, or 2+ "label: value" lines with digits. */
export function hasInlineTable(text) {
  const lines = String(text ?? '').split('\n').map(l => l.trim()).filter(Boolean)
  const piped = lines.filter(l => /\d/.test(l) && ((l.match(/\|/g) ?? []).length >= 1 || /\t/.test(l) || /\S\s{2,}\S.*\s{2,}\S/.test(l))).length
  const kv = lines.filter(l => /^[^:=]{1,40}[:=]\s*\S/.test(l) && /\d/.test(l) && l.length < 120).length
  const leader = lines.filter(l => /\S\s*(?:\.\s*){3,}\s*-?\d/.test(l)).length      // "Game 1 . . . 18"
  return piped >= 2 || kv >= 2 || leader >= 2
}
const MOJIBAKE = /Ã[\u0080-¿]|â€|Â[ -¿]|�|ðŸ|Ã©|Ã¨/
const HTML_ENTITY = /&(?:amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|ldquo|rdquo|mdash|ndash|hellip|minus|times|deg|#\d{2,5}|#x[0-9a-f]{2,4});/i

function svgProblem(svg) {
  let DOMParser
  try { ({ DOMParser } = require('@xmldom/xmldom')) } catch { return null }
  let doc
  try { doc = new DOMParser({ onError: () => {} }).parseFromString(svg, 'image/svg+xml') } catch (e) { return `XML: ${snip(e.message, 70)}` }
  const root = doc?.documentElement
  if (!root || root.nodeName !== 'svg') return `root <${root?.nodeName}>`
  const vb = root.getAttribute('viewBox')
  if (!vb) return 'no viewBox'
  const n = vb.trim().split(/[\s,]+/).map(Number)
  if (n.length !== 4 || n.some(x => !Number.isFinite(x))) return `viewBox "${vb}"`
  if (n[2] <= 0 || n[3] <= 0 || n[2] > 5000 || n[3] > 5000) return `viewBox size ${n[2]}x${n[3]}`
  return null
}
function graphicDataProblem(g) {
  if (g.cells) {
    const rows = g.cells
    if (!Array.isArray(rows) || !rows.length) return 'table with no cells'
    if (g.rowLabels && g.rowLabels.length !== rows.length) return `${g.rowLabels.length} rowLabels vs ${rows.length} rows`
    const w = new Set(rows.map(r => (Array.isArray(r) ? r.length : -1)))
    if (w.size !== 1) return `ragged rows ${[...w].join('/')}`
    const width = [...w][0]
    if (g.colLabels && ![width, width + 1].includes(g.colLabels.length)) return `${g.colLabels.length} colLabels vs ${width} columns`
    if (rows.flat().some(c => c == null || String(c).trim() === '')) return 'empty cell'
    return null
  }
  if (g.bars) return g.bars.every(b => b && Number.isFinite(Number(b.value ?? b.y)) && String(b.label ?? b.x ?? '').length) ? null : 'bar without label/value'
  if (g.values) return g.values.every(v => Number.isFinite(Number(v))) ? null : 'non-numeric value'
  if (g.points) return g.points.every(p => p && Number.isFinite(Number(p.x ?? p[0])) && Number.isFinite(Number(p.y ?? p[1]))) ? null : 'non-numeric point'
  if (g.series) return g.series.every(s => s && Array.isArray(s.points ?? s.data) && (s.points ?? s.data).length) ? null : 'series without points'
  return `graphic of type "${g.type}" with no drawable data`
}

// ───────────────────────────────────────────────────────────────────────────
// POPULATION DETECTORS (need the whole bank, or other tables)
// ───────────────────────────────────────────────────────────────────────────
const normPassage = s => String(s ?? '').replace(/\s+/g, ' ').trim()

/** The group key the SERVING path reads: assembleAdmissionSection and
 *  assembleActSection read the row column; assembleToeflFromBank and the SAT
 *  draw read item.passageGroupId. */
export const servedGid = r => (['isee', 'ssat', 'act'].includes(r.family) ? r.passage_group_id : r.item?.passageGroupId) ?? null

/** Passage groups among live rows, checked against ALL rows (any state) sharing the id. */
export function checkGroups(live, allRows) {
  const out = { scorable: 0, total: 0, findings: [] }
  const byGid = new Map()
  for (const r of live) { const g = servedGid(r); if (g) (byGid.get(g) ?? byGid.set(g, []).get(g)).push(r) }
  const allByGid = new Map()
  for (const r of allRows) for (const g of new Set([r.passage_group_id, r.item?.passageGroupId].filter(Boolean))) (allByGid.get(g) ?? allByGid.set(g, []).get(g)).push(r)
  out.total = byGid.size
  const push = (kind, tier, gid, ids, detail) => out.findings.push({ kind, tier, gid, ids, detail })
  for (const [gid, rows] of byGid) {
    out.scorable++
    const head = rows[0]
    const passages = new Set(rows.map(r => normPassage(r.item?.passage)))
    if (passages.size > 1) push('group/split-passage', 2, gid, rows.map(r => r.id), `${passages.size} different passages under one group id`)
    const secs = new Set(rows.map(r => `${r.family}/${r.section}/${r.task}`))
    if (secs.size > 1) push('group/mixed-section', 2, gid, rows.map(r => r.id), [...secs].join(' + '))
    const all = allByGid.get(gid) ?? []
    const dark = all.filter(r => !r.verified || r.archived)
    if (dark.length) push('group/partial-state', 3, gid, rows.map(r => r.id), `${rows.length} live, ${dark.filter(r => !r.archived && !r.verified).length} staged, ${dark.filter(r => r.archived).length} archived siblings`)
    if (rows.length === 1 && SET_BASED(head) && !GROUP_SIZE(head)) push('group/singleton', 3, gid, rows.map(r => r.id), `${head.family}/${head.section}/${head.task}: a set of ONE live item`)
    const cap = GROUP_SIZE(head)
    if (cap) {
      const n = rows.length
      if (n < cap.min || (cap.max != null && n > cap.max)) push('group/size-vs-cap', n < cap.min / 2 || (cap.max != null && n > cap.max) ? 2 : 3, gid, rows.map(r => r.id), `${head.family}/${head.section}${head.task ? '/' + head.task : ''}: ${n} live items, ${cap.src} wants ${cap.min}${cap.max && cap.max !== cap.min ? '-' + cap.max : ''}`)
    }
  }
  // Ungrouped items in set-based tasks whose passage is shared with others.
  const byPassage = new Map()
  for (const r of live) if (SET_BASED(r) && !servedGid(r)) {
    const p = normPassage(r.item?.passage); if (p.length < 40) continue
    ;(byPassage.get(p) ?? byPassage.set(p, []).get(p)).push(r)
  }
  const ungroupedSetItems = live.filter(r => SET_BASED(r) && !servedGid(r))
  for (const r of ungroupedSetItems) {
    const sib = byPassage.get(normPassage(r.item?.passage)) ?? []
    // shares its passage with a grouped live row?
    const grouped = live.find(x => x !== r && x.family === r.family && x.section === r.section && servedGid(x) && normPassage(x.item?.passage) === normPassage(r.item?.passage))
    if (grouped) push('group/orphan-of-group', 2, servedGid(grouped), [r.id], 'ungrouped item shares the passage of a grouped set — drawn separately, student reads the passage twice')
    else if (sib.length > 1 && sib[0] === r) push('group/ungrouped-shared-passage', 3, null, sib.map(x => x.id), `${sib.length} ungrouped items share one passage`)
  }
  out.ungroupedSetItems = ungroupedSetItems.length
  return out
}

/** An unpaged PostgREST read returns at most 1000 rows. `returned` is what the
 *  serving query actually got back; anything short of `live` is never drawn. */
export function truncationGap(returned, live) {
  if (!Number.isInteger(returned) || !Number.isInteger(live) || live <= 0) return null
  return { returned, live, unreachable: Math.max(0, live - returned) }
}

export function checkDuplicates(live) {
  const findings = []
  for (const col of ['content_sha', 'dedup_key']) {
    const m = new Map()
    for (const r of live) if (r[col]) (m.get(r[col]) ?? m.set(r[col], []).get(r[col])).push(r)
    for (const [v, rows] of m) if (rows.length > 1) findings.push({ kind: `dup/${col}`, tier: col === 'content_sha' ? 2 : 3, ids: rows.map(r => r.id), detail: `${rows.length} live rows share ${col} ${v.slice(0, 8)} (${[...new Set(rows.map(r => r.cohort))].join(', ')})` })
  }
  return findings
}

/** Cohort labels: a cohort inserted in two clusters >3 days apart whose verify_meta
 *  key sets differ is two batches under one label (the isee-verbal-v1/s14 shape). */
export function checkCohortLabels(live) {
  const findings = []
  const byC = new Map()
  for (const r of live) (byC.get(r.cohort ?? '(null)') ?? byC.set(r.cohort ?? '(null)', []).get(r.cohort ?? '(null)')).push(r)
  for (const [c, rows] of byC) {
    if (c === '(null)' || !String(c).trim()) { findings.push({ kind: 'cohort/null', tier: 3, ids: rows.map(r => r.id), detail: `${rows.length} rows with no cohort` }); continue }
    const fams = ['sat', 'act', 'toefl', 'ssat', 'isee'].filter(f => new RegExp(`(^|[^a-z])${f}([^a-z]|$)`).test(c))
    const off = rows.filter(r => fams.length && !fams.includes(r.family))
    if (off.length) findings.push({ kind: 'cohort/family-mismatch', tier: 3, ids: off.map(r => r.id), detail: `cohort "${c}" names ${fams.join('/')} but ${off.length} row(s) are ${[...new Set(off.map(r => r.family))].join('/')}` })
    const sorted = [...rows].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    for (let i = 1; i < sorted.length; i++) {
      if (Date.parse(sorted[i].created_at) - Date.parse(sorted[i - 1].created_at) > 3 * 86400e3) {
        const a = sorted.slice(0, i), b = sorted.slice(i)
        const ks = rs => new Set(rs.map(r => Object.keys(r.verify_meta ?? {}).sort().join(',')))
        const ka = ks(a), kb = ks(b)
        const overlap = [...kb].some(k => ka.has(k))
        if (!overlap) findings.push({ kind: 'cohort/two-batches-one-label', tier: 3, ids: b.map(r => r.id), detail: `cohort "${c}": ${a.length} rows to ${sorted[i - 1].created_at.slice(0, 10)}, then ${b.length} rows from ${sorted[i].created_at.slice(0, 10)} with a disjoint verify_meta schema` })
      }
    }
  }
  return findings
}

export function checkStaleReviews(live, reviews, attacks) {
  const sha = new Map(live.map(r => [r.id, r.content_sha]))
  const cohort = new Map(live.map(r => [r.id, r.cohort]))
  const agg = (rows, keyOf) => {
    const g = new Map(); let scorable = 0
    for (const v of rows) {
      if (!sha.has(v.item_id)) continue
      scorable++
      if (!v.item_sha || v.item_sha !== sha.get(v.item_id)) {
        const k = keyOf(v); const e = g.get(k) ?? g.set(k, { n: 0, ids: new Set(), cohorts: new Set() }).get(k)
        e.n++; e.ids.add(v.item_id); e.cohorts.add(cohort.get(v.item_id))
      }
    }
    return { scorable, groups: g }
  }
  return {
    human: agg(reviews.filter(r => r.reviewer_kind === 'human'), v => v.run_id),
    model: agg(reviews.filter(r => r.reviewer_kind !== 'human'), v => v.run_id),
    attacks: agg(attacks, v => v.run_id),
    reviewsOnLive: reviews.filter(r => sha.has(r.item_id)).length,
  }
}

// ───────────────────────────────────────────────────────────────────────────
// SELF-TEST: every detector fires on its planted defect and is quiet on its twin.
// ───────────────────────────────────────────────────────────────────────────
export function selftest({ quiet = false } = {}) {
  const fails = []
  const fill = r => ({ id: 'fixture', cohort: 'fx', created_at: '2026-10-04T00:00:00Z', passage_group_id: null, ...r })
  for (const d of DETECTORS) {
    const f = d.fixtures
    if (!f?.bad || !f?.good) { fails.push(`${d.id}: no fixture pair`); continue }
    const ctx = f.ctx ?? { audioObjects: new Set(), gates: { hidden: new Set(), locked: new Set(), topics: null } }
    const run = r => { const x = fill(r); if (!d.applies(x, ctx)) return '__NA__'; return d.check(x, ctx) }
    const b = run(f.bad), g = run(f.good)
    if (b === '__NA__' || !b) fails.push(`${d.id}: did NOT fire on its planted defect (${b === '__NA__' ? 'not applicable' : 'quiet'})`)
    if (g === '__NA__') fails.push(`${d.id}: clean twin not applicable — the twin does not exercise the detector`)
    else if (g) fails.push(`${d.id}: fired on its clean twin: ${g}`)
  }
  // Population detectors.
  const L = (id, extra) => fill({ id, family: 'act', section: 'reading', task: 'humanities', verified: true, archived: false, item: { type: 'multiple_choice', passage: 'P'.repeat(50), passageGroupId: 'G', choices: [], prompt: 'q' }, passage_group_id: 'G', ...extra })
  const nine = Array.from({ length: 9 }, (_, i) => L(`r${i}`))
  const g0 = checkGroups(nine, nine)
  if (g0.findings.length) fails.push(`groups: fired on a clean 9-item ACT reading set: ${g0.findings.map(f => f.kind)}`)
  const splitSet = [...nine.slice(0, 8), L('r8', { item: { ...nine[0].item, passage: 'Q'.repeat(50) } })]
  if (!checkGroups(splitSet, splitSet).findings.some(f => f.kind === 'group/split-passage')) fails.push('groups: split passage not detected')
  const short = nine.slice(0, 7)
  if (!checkGroups(short, short).findings.some(f => f.kind === 'group/size-vs-cap')) fails.push('groups: 7-item ACT reading set not flagged against cap 9')
  if (!checkGroups(nine, [...nine, L('r9', { verified: false })]).findings.some(f => f.kind === 'group/partial-state')) fails.push('groups: staged sibling not detected')
  const T = (id, extra) => fill({ id, family: 'toefl', section: 'listening', task: 'conversation', verified: true, archived: false, passage_group_id: null, item: { type: 'multiple_choice', passage: 'P'.repeat(50), passageGroupId: 'T1', choices: [], prompt: 'q' }, ...extra })
  if (!checkGroups([T('t0')], [T('t0')]).findings.some(f => f.kind === 'group/singleton')) fails.push('groups: singleton conversation set not detected')
  if (checkGroups([T('t0'), T('t1')], [T('t0'), T('t1')]).findings.length) fails.push('groups: fired on a clean 2-item conversation set')
  const orphan = [...nine, L('o1', { passage_group_id: null, item: { ...nine[0].item, passageGroupId: null } })]
  if (!checkGroups(orphan, orphan).findings.some(f => f.kind === 'group/orphan-of-group')) fails.push('groups: orphan of a grouped passage not detected')
  const dupA = { id: 'a', content_sha: 'x', dedup_key: 'k1', cohort: 'c' }, dupB = { id: 'b', content_sha: 'x', dedup_key: 'k2', cohort: 'c' }
  if (!checkDuplicates([dupA, dupB]).some(f => f.kind === 'dup/content_sha')) fails.push('dups: shared content_sha not detected')
  if (checkDuplicates([dupA, { ...dupB, content_sha: 'y' }]).length) fails.push('dups: fired on distinct rows')
  const c1 = Array.from({ length: 5 }, (_, i) => fill({ id: `c${i}`, family: 'isee', cohort: 'isee-verbal-v1', created_at: '2026-08-28T01:00:00Z', verify_meta: { qc: 1, method: 1 } }))
  const c2 = Array.from({ length: 3 }, (_, i) => fill({ id: `d${i}`, family: 'isee', cohort: 'isee-verbal-v1', created_at: '2026-09-21T07:00:00Z', verify_meta: { qc: 1, method: 1, graded_difficulty: 1 } }))
  if (!checkCohortLabels([...c1, ...c2]).some(f => f.kind === 'cohort/two-batches-one-label')) fails.push('cohort: the isee-verbal-v1/s14 shape not detected')
  if (checkCohortLabels(c1).length) fails.push('cohort: fired on one clean batch')
  if (!checkCohortLabels([fill({ id: 'z', family: 'ssat', cohort: 'isee-verbal-s9', verify_meta: {} })]).some(f => f.kind === 'cohort/family-mismatch')) fails.push('cohort: family mismatch not detected')
  const st = checkStaleReviews([{ id: 'i', content_sha: 's1', cohort: 'c' }], [{ item_id: 'i', item_sha: 's0', run_id: 'R', reviewer_kind: 'human' }, { item_id: 'i', item_sha: 's1', run_id: 'R2', reviewer_kind: 'human' }], [])
  if (st.human.groups.size !== 1 || !st.human.groups.has('R')) fails.push('stale: edited-after-review not detected exactly once')
  if (truncationGap(1000, 1364)?.unreachable !== 364 || truncationGap(622, 622)?.unreachable !== 0 || truncationGap(undefined, 5) !== null) fails.push('truncationGap pins failed')
  if (servedGid({ family: 'act', passage_group_id: 'r', item: { passageGroupId: 'i' } }) !== 'r' || servedGid({ family: 'toefl', passage_group_id: 'r', item: { passageGroupId: 'i' } }) !== 'i') fails.push('servedGid pins failed')
  // Normalisation pins: the grader's norm must NOT fold punctuation.
  if (gnorm('3.') === gnorm('3')) fails.push('gnorm folds punctuation — it must replicate gradeAnswer exactly')
  if (!sameValue('3√13', '√117') || !sameValue('1/2', '0.5') || !sameValue('2(x+1)', '2x+2') || sameValue('x+1', 'x-1') || sameValue('12', '1/2')) fails.push('sameValue: equivalence pins failed')
  if (mathForm('the cat') || mathForm('Ab') || !mathForm('−3')) fails.push('mathForm prose guard / minus pins failed')
  if (!hasInlineTable('  Game 1 . . . 18\n  Game 2 . . . 24') || !hasInlineTable('Species | Mass (g)\nA | 6.0\nB | 8.2') || !hasInlineTable('x = 2, y = 7.4\nx = 4, y = 11.0') || hasInlineTable('One line with 3 | 4.')) fails.push('hasInlineTable pins failed')
  if (GRAPHIC_REF.test('In the xy-plane, the graph of y = x + 1 meets the line') || !GRAPHIC_REF.test('Based on the table, which value')) fails.push('GRAPHIC_REF pins failed')
  if (!quiet) {
    console.log(`SELF-TEST: ${DETECTORS.length} row detectors + 5 population detectors`)
    console.log(fails.length ? fails.map(f => '  FAIL ' + f).join('\n') : '  every detector fired on its planted defect and stayed quiet on its clean twin')
  }
  return fails
}

// ───────────────────────────────────────────────────────────────────────────
// SWEEP
// ───────────────────────────────────────────────────────────────────────────
async function sweep({ max = 25, jsonOut = null }) {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const die = m => { console.error('NOT MEASURED: ' + m); process.exit(2) }

  const pageAll = async (table, select, tune = q => q, order = 'id') => {
    const out = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await tune(db.from(table).select(select)).order(order).range(from, from + 999)
      if (error) die(`${table}: ${error.message}`)
      out.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }
    return out
  }
  const count = async (table, tune = q => q) => {
    const { count: n, error } = await tune(db.from(table).select('id', { count: 'exact', head: true }))
    if (error) die(`${table} count: ${error.message}`)
    return n
  }
  const liveQ = q => q.eq('verified', true).eq('archived', false)
  const live = await pageAll('study_item_bank', '*', liveQ)
  const liveN = await count('study_item_bank', liveQ)
  console.log(`\nLOADED ${live.length} verified, unarchived rows; live count(exact) = ${liveN}`)
  if (live.length !== liveN || !liveN) die(`loaded ${live.length} ≠ live ${liveN}`)
  if (new Set(live.map(r => r.id)).size !== live.length) die('duplicate ids across pages (unstable paging)')
  const allRows = await pageAll('study_item_bank', 'id,verified,archived,passage_group_id,item->passageGroupId,content_sha')
  const allN = await count('study_item_bank')
  if (allRows.length !== allN) die(`all-rows ${allRows.length} ≠ ${allN}`)
  for (const r of allRows) r.item = { passageGroupId: r.passageGroupId ?? null }
  console.log(`LOADED ${allRows.length} rows in any state (for sibling checks); count(exact) = ${allN}`)

  const openTypes = readOpenResponseTypes()
  if (!openTypes) die('could not read OPEN_RESPONSE_TYPES from src/lib/study/openResponse.ts')
  OPEN_RESPONSE = openTypes

  // Reachability gates, read from source (as bank-state.mjs does).
  const page = readFileSync('src/app/mobile/study/topic/[slug]/page.tsx', 'utf8')
  const grab = re => (page.match(re)?.[1] ?? '').match(/'([^']+)'/g)?.map(x => x.slice(1, -1)) ?? []
  const hidden = grab(/HIDDEN_SUBTOPIC_SLUGS = new Set\(\[([^\]]*)\]/), locked = grab(/LOCKED_TOPIC_SLUGS = new Set\(\[([\s\S]*?)\]\)/)
  if (!locked.length) die('could not read LOCKED_TOPIC_SLUGS from the topic page')
  const { data: topicRows, error: te } = await db.from('study_topics').select('slug')
  if (te) die(`study_topics: ${te.message}`)
  const gates = { hidden: new Set(hidden), locked: new Set(locked), topics: new Set(topicRows.map(t => t.slug)) }

  // Audio bucket listing (flat namespace of <sha40>.mp3).
  const audioObjects = new Set()
  for (let off = 0; ; off += 1000) {
    const { data, error } = await db.storage.from(AUDIO_BUCKET).list('', { limit: 1000, offset: off, sortBy: { column: 'name', order: 'asc' } })
    if (error) die(`audio bucket: ${error.message}`)
    for (const o of data ?? []) audioObjects.add(o.name)
    if (!data || data.length < 1000) break
  }
  console.log(`LISTED ${audioObjects.size} objects in ${AUDIO_BUCKET}`)
  if (!audioObjects.size) die('audio bucket listed empty')

  const ctx = { audioObjects, gates }
  const report = { generated: new Date().toISOString(), live: live.length, checks: [] }
  const M = live.length
  let unmeasured = 0
  const byId = new Map(live.map(r => [r.id, r]))
  console.log(`\n${'='.repeat(78)}\nROW DETECTORS   (M = ${M} live rows; N = rows the detector can read)\n${'='.repeat(78)}`)
  for (const d of DETECTORS) {
    const scorable = live.filter(r => { try { return d.applies(r, ctx) } catch { return false } })
    const fails = []
    for (const r of scorable) {
      let v; try { v = d.check(r, ctx) } catch (e) { v = `DETECTOR THREW: ${e.message}` }
      if (v) fails.push({ id: r.id, cohort: r.cohort, fam: `${r.family}/${r.section}`, detail: Array.isArray(v) ? v.join('; ') : v })
    }
    const N = scorable.length
    const status = N === 0 ? 'NOT MEASURED (0 scorable)' : `${fails.length} fail`
    console.log(`\n[T${d.tier}] ${d.id}${d.cand ? '  (CANDIDATES — hand-verify)' : ''}\n     ${d.title}\n     scorable ${N} of ${M}   →  ${status}`)
    if (N === 0 && EXPECT_SCORABLE.has(d.id)) unmeasured++
    if (fails.length) {
      const byFam = {}; for (const f of fails) byFam[f.fam] = (byFam[f.fam] ?? 0) + 1
      console.log('     by section: ' + Object.entries(byFam).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '))
      const byCoh = {}; for (const f of fails) byCoh[f.cohort] = (byCoh[f.cohort] ?? 0) + 1
      console.log('     by cohort:  ' + Object.entries(byCoh).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(', '))
      for (const f of fails.slice(0, max)) console.log(`       ${f.id}  ${f.cohort}  ${f.detail}`)
      if (fails.length > max) console.log(`       … ${fails.length - max} more (--max N or --json)`)
    }
    report.checks.push({ id: d.id, tier: d.tier, candidate: !!d.cand, title: d.title, scorable: N, of: M, fails })
  }

  console.log(`\n${'='.repeat(78)}\nPOPULATION DETECTORS\n${'='.repeat(78)}`)
  const grp = checkGroups(live, allRows)
  console.log(`\n[groups] scorable ${grp.scorable} of ${grp.total} live passage groups (+ ${grp.ungroupedSetItems} ungrouped items in set-based tasks)`)
  if (!grp.total) unmeasured++
  const gk = {}; for (const f of grp.findings) (gk[f.kind] ??= []).push(f)
  for (const [k, fs] of Object.entries(gk)) {
    console.log(`  ${k}  (T${fs[0].tier})  ${fs.length} group(s), ${fs.reduce((a, f) => a + f.ids.length, 0)} items`)
    for (const f of fs.slice(0, max)) console.log(`     ${f.gid ?? '-'}  [${byId.get(f.ids[0])?.cohort}]  ${f.detail}`)
    if (fs.length > max) console.log(`     … ${fs.length - max} more`)
  }
  if (!grp.findings.length) console.log('  no findings')
  report.groups = grp

  // The serving reads, replicated. assembleFromBank (SAT) and the ACT/admission
  // section reads are unpaged selects; run each exactly as written and compare.
  const sections = [...new Set(live.map(r => `${r.family}/${r.section}`))].sort()
  const trunc = []
  console.log(`\n[assembler read truncation] replaying the unpaged serving select for ${sections.length} family/sections`)
  for (const k of sections) {
    const [family, section] = k.split('/')
    if (family === 'toefl') continue          // assembleToeflFromBank pages and asserts the count
    const select = family === 'sat' ? 'id, domain, difficulty, item' : family === 'act' ? 'id, difficulty, item, passage_group_id, task, domain' : 'id, difficulty, item, passage_group_id, task'
    const { data, error } = await db.from('study_item_bank').select(select).eq('family', family).eq('section', section).eq('verified', true).eq('archived', false)
    if (error) die(`replay ${k}: ${error.message}`)
    const liveK = live.filter(r => `${r.family}/${r.section}` === k)
    const g = truncationGap(data.length, liveK.length)
    if (!g) die(`replay ${k}: no measurement`)
    const got = new Set(data.map(d => d.id))
    const cut = liveK.filter(r => !got.has(r.id))
    const hard = {}; for (const r of cut) if (r.difficulty === 'hard') hard[r.domain] = (hard[r.domain] ?? 0) + 1
    console.log(`  ${k.padEnd(22)} served read returned ${String(g.returned).padStart(5)} of ${String(g.live).padStart(5)} live${g.unreachable ? `   → ${g.unreachable} NEVER DRAWN (hard: ${JSON.stringify(hard)})` : ''}`)
    if (g.unreachable) trunc.push({ section: k, ...g, ids: cut.map(r => r.id), cohorts: Object.entries(cut.reduce((a, r) => (a[r.cohort] = (a[r.cohort] ?? 0) + 1, a), {})).sort((a, b) => b[1] - a[1]) })
  }
  report.truncation = trunc

  const dups = checkDuplicates(live)
  const withSha = live.filter(r => r.content_sha).length, withKey = live.filter(r => r.dedup_key).length
  console.log(`\n[duplicates] scorable content_sha ${withSha} of ${M}, dedup_key ${withKey} of ${M}`)
  if (!withSha) unmeasured++
  for (const f of dups.slice(0, max)) console.log(`  ${f.kind}  ${f.detail}  ${f.ids.join(' ')}`)
  if (!dups.length) console.log('  no shared content_sha or dedup_key among live rows')
  report.duplicates = dups

  const coh = checkCohortLabels(live)
  console.log(`\n[cohort labels] scorable ${live.filter(r => r.cohort).length} of ${M} rows, ${new Set(live.map(r => r.cohort)).size} cohorts`)
  for (const f of coh) console.log(`  ${f.kind}  ${f.detail}`)
  if (!coh.length) console.log('  no findings')
  report.cohorts = coh

  const reviews = await pageAll('study_item_reviews', 'id,item_id,run_id,reviewer_kind,item_sha')
  const attacks = await pageAll('study_item_attacks', 'id,item_id,run_id,item_sha')
  const rN = await count('study_item_reviews'), aN = await count('study_item_attacks')
  if (reviews.length !== rN || attacks.length !== aN) die(`reviews ${reviews.length}/${rN}, attacks ${attacks.length}/${aN}`)
  const st = checkStaleReviews(live, reviews, attacks)
  console.log(`\n[stale evidence, migration 076/077] loaded ${rN} reviews, ${aN} attacks; on live items: human ${st.human.scorable}, model ${st.model.scorable}, attacks ${st.attacks.scorable}`)
  for (const [label, s] of [['HUMAN review', st.human], ['model review', st.model], ['attack', st.attacks]]) {
    const tot = [...s.groups.values()].reduce((a, e) => a + e.n, 0)
    console.log(`  ${label}: ${tot} stale of ${s.scorable} on live items`)
    for (const [run, e] of [...s.groups].sort((a, b) => b[1].n - a[1].n).slice(0, max)) console.log(`     ${run}  ${e.n} stale rows / ${e.ids.size} items  cohorts: ${[...e.cohorts].join(', ')}`)
  }
  report.stale = Object.fromEntries(Object.entries(st).filter(([k]) => k !== 'reviewsOnLive').map(([k, s]) => [k, { scorable: s.scorable, runs: Object.fromEntries([...s.groups].map(([r, e]) => [r, { n: e.n, items: [...e.ids], cohorts: [...e.cohorts] }])) }]))

  if (jsonOut) { writeFileSync(jsonOut, JSON.stringify(report, null, 1)); console.log(`\nwrote ${jsonOut}`) }
  if (unmeasured) { console.error(`\n${unmeasured} detector(s) expected to apply read ZERO rows — this run is NOT a measurement.`); process.exit(2) }
  console.log('\nRead-only. No row was written. Candidates (cand) are NOT verdicts — hand-verify before listing any as a wrong key.\n')
}
/** Detectors that MUST find something to read on the live bank, or the run is void. */
const EXPECT_SCORABLE = new Set(['reader/undrawable', 'key/not-exactly-one-choice', 'choices/equal-value', 'ctw/blanks-vs-placeholders',
  'bas/key-not-assemblable', 'repeat/script-key-mismatch', 'open/has-key-or-scored', 'graphic/svg-invalid', 'graphic/data-shape', 'audio/missing-object',
  'passage/required-empty', 'explanation/endorses-distractor', 'meta/content-sha', 'meta/unreachable', 'graphic/referenced-missing'])

const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('bank-integrity-sweep.mjs')
if (RUN_AS_CLI) {
  const args = process.argv.slice(2)
  const fails = selftest()
  if (fails.length) { console.error('\nSELF-TEST FAILED — refusing to sweep with a detector that has not been shown to fire.'); process.exit(2) }
  if (!args.includes('--selftest')) {
    if (!existsSync('.env.local')) { console.error('run from the repo root (.env.local not found)'); process.exit(2) }
    const mi = args.indexOf('--max'), ji = args.indexOf('--json')
    await sweep({ max: mi >= 0 ? Number(args[mi + 1]) : 25, jsonOut: ji >= 0 ? args[ji + 1] : null })
  }
}
