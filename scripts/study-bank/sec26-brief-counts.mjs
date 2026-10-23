#!/usr/bin/env node
/**
 * sec26-brief-counts.mjs <frozen batch.json> [--decl <declarations.json>[,<more.json>...]] [--slots <SLOTS.json>]
 *
 * The decidable counts of PREREG-SEC26-2026-10-23.md ("Decidable counts", the Balances table, the
 * rules for every item, the pre-flight drop), computed from the option TEXT and passage TEXT of the
 * frozen file, not from the authors' reports. Written before any v26 item existed. COPIED from
 * sec25-brief-counts.mjs; what is new is marked NEW (v26). Older markers are kept.
 *
 * NEW (v26), in one place:
 *   - THE TABLE IS READ FROM sat-sec-v26-work/SLOTS.json (override with --slots), the same file
 *     sec26-tellsim.mjs --table checks for cross-item tells, so the counts and the tell check can
 *     never disagree about a row. 40 slots, 4 authors x 10 (A1..A10 ... D10).
 *   - the parser (participles, parseItem, possOf, marksOf, the code features) is imported from
 *     sec26-parse.mjs, moved there byte-for-byte from sec25-brief-counts.mjs; regression-tested:
 *     on the frozen v22-v25 batches every per-item classification line equals sec25's.
 *   - "since" is BANNED except in the four perfect-keyed rows (`since: true` in the table), where
 *     it must occur exactly once, inside the declared decider_quote, 5+ words after the blank
 *     (SEC25: a perfect was never keyed, 5/5, because every perfect decider was banned). "ever
 *     since" stays banned everywhere. "since" counts as a time word.
 *   - noun-form rows key all four classes {X, X's, Xs, Xs'} (SEC25 keyed only possessives).
 *   - shared adverbs are allowed only in the rows whose `shared` names one (never, seldom); shared
 *     complement words only in rows whose `shared` is "complement".
 *   - decider_quote placement per row: `decided` OUTSIDE the blank's sentence (other-sentence
 *     rows), or its first word 6+ words after the blank (the delayed-verb, list and garden rows).
 *   - every pronoun row must be SPLIT: the declared pronoun_antecedent.word differs from the
 *     declared true_subject_head.
 *   - per-author quotas scaled to 10 items: letters exactly as the table (3/3/2/2), key uniquely
 *     longest / shortest <= 3 per author and <= 10 batch-wide.
 *
 * INPUTS
 *   batch   JSON array of items {id, passage, choices[4], correct_answer, ...}.
 *   --decl  the authors' declarations (sat-sec-v26-work/<X>/declarations.json), one or more files,
 *           concatenated. Fields read: id, near_noun{word,number}, first_noun_of_sentence{word,number},
 *           after_noun_within_8 (or null), misleader_position, true_subject_head, decider_quote
 *           (string or array), decider_type (time-clause | time-phrase | modal | parallel-verb |
 *           conditional | pronoun-antecedent | aux-form), pronoun_antecedent {word,number} (pronoun
 *           slots), key_mark / key_class and glance_fail (boundary and noun slots), grid.code,
 *           key_letter, key_number, distractor_pulls. Their id SET must equal the batch's id set
 *           exactly. Without --decl every declaration-based bar is printed NOT MEASURED, never
 *           estimated, and the run cannot pass.
 *   --slots the table (default: sat-sec-v26-work/SLOTS.json next to this script).
 *
 * HOW OPTIONS ARE CLASSIFIED: as sec25-brief-counts.mjs (see sec26-parse.mjs): BOUNDARY items (the
 * four options identical once punctuation is removed; the key mark is what the key ADDS), NOUN-FORM
 * items ({X, X's, Xs, Xs'} of one noun), and AGREEMENT items (pronouns pulled out first; grid codes
 * a b c d e f g h i j k l m n r, plus p/had/modal/did/? for non-grid forms).
 *
 * EXIT
 *   2  refused: unreadable or empty batch, an item without 4 choices or whose key is not among
 *      its choices, a passage without exactly one blank, duplicate ids, an unreadable or empty
 *      declarations file, declaration ids that differ from the batch's ids, an unreadable or
 *      malformed SLOTS.json, an unknown flag.
 *   1  computed, and at least one prereg bar MISSED / NOT MEASURED or one brief quota FLAGGED.
 *   0  computed and everything met.
 * Hand-read NOTES never change the exit. A count missed on the frozen file is RECORDED, not
 * repaired (prereg).
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseItem, possOf, marksOf, F, PASSIVE, PERFECT, dimension, dimKey, sameGrid, formName, toks, isAdv, MODALS, NUM, POSS_CLASSES, STRONG } from './sec26-parse.mjs'

const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const args = process.argv.slice(2)
let file = null; const declFiles = []; let slotsPath = null
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--slots') { slotsPath = args[++i]; if (!slotsPath) die('--slots needs a path') }
  else if (args[i] === '--decl') { const v = args[++i]; if (!v) die('--decl needs a path'); declFiles.push(...v.split(',').filter(Boolean)) }
  else if (args[i].startsWith('--')) die(`unknown flag ${args[i]}`)
  else if (file) die(`one batch file only (got ${file} and ${args[i]})`)
  else file = args[i]
}
if (!file) { console.error('usage: sec26-brief-counts.mjs <batch.json> [--decl a.json,b.json,c.json] [--slots SLOTS.json]'); process.exit(2) }
const readJson = f => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch (e) { die(`cannot read ${f}: ${e.message}`) } }
const items = readJson(file)
if (!Array.isArray(items) || items.length === 0) die(`${file} is not a non-empty JSON array: no counts printed`)
const BLANK = /_{3,}/g
for (const it of items) {
  if (!it || typeof it.id !== 'string') die('an item has no string id')
  if (!Array.isArray(it.choices) || it.choices.length !== 4 || it.choices.some(c => typeof c !== 'string')) die(`${it.id}: needs exactly 4 string choices`)
  if (!it.choices.includes(it.correct_answer)) die(`${it.id}: key not among choices`)
  if (typeof it.passage !== 'string' || (it.passage.match(BLANK) || []).length !== 1) die(`${it.id}: passage must contain exactly one blank`)
}
const ids = items.map(i => i.id)
if (new Set(ids).size !== ids.length) die('duplicate ids in batch')

let decl = null
if (declFiles.length) {
  decl = {}
  for (const f of declFiles) {
    const d = readJson(f)
    if (!Array.isArray(d) || d.length === 0) die(`${f}: declarations must be a non-empty array`)
    for (const r of d) { if (!r || typeof r.id !== 'string') die(`${f}: a declaration has no id`); if (decl[r.id]) die(`duplicate declaration ${r.id}`); decl[r.id] = r }
  }
  const dk = Object.keys(decl).sort(), bk = ids.slice().sort()
  if (dk.length !== bk.length || dk.some((x, j) => x !== bk[j])) {
    die(`declaration ids do not match the batch: missing ${bk.filter(x => !decl[x]).join(' ') || '-'}; extra ${dk.filter(x => !ids.includes(x)).join(' ') || '-'}`)
  }
}


/* ---------- the construction table (NEW v26: read from SLOTS.json, shared with sec26-tellsim.mjs) ---------- */
// agreement: ['agr', keyNum, near, pos, dim, dimKey, grid, keyCode, letter, after, first, pronounNum, deciderType, pronounClass]
// boundary:   ['punct', keyMark, letter, [the four option marks, as marksOf names them]]
// noun form:  ['poss', keyClass, letter]   keyClass one of sg | sg-poss | pl | pl-poss
const SLOTS_PATH = slotsPath ?? join(dirname(fileURLToPath(import.meta.url)), 'sat-sec-v26-work', 'SLOTS.json')
if (!existsSync(SLOTS_PATH)) die(`${SLOTS_PATH} missing`)
const SL = readJson(SLOTS_PATH)
if (!SL || !Array.isArray(SL.slots) || !SL.slots.length) die(`${SLOTS_PATH} has no slots`)
const T = {}, ROW = {}
for (const s of SL.slots) {
  if (!s || typeof s.slot !== 'string' || !/^[ABCD](10|[1-9])$/.test(s.slot) || T[s.slot]) die(`${SLOTS_PATH}: bad or duplicate slot ${s?.slot}`)
  if (!['A', 'B', 'C', 'D'].includes(s.letter)) die(`${SLOTS_PATH}: ${s.slot} letter`)
  ROW[s.slot] = s
  if (s.class === 'agr') {
    const dk = s.dim === 'aspect' ? (s.dkey === 'perfect' ? 'perfect' : 'non-perfect') : s.dkey
    T[s.slot] = ['agr', s.key, s.near, s.pos, s.dim, dk, s.grid, s.code, s.letter, s.after ?? 'free', s.first, s.dim === 'pronoun' ? s.dkey : null, s.dtype, s.pclass ?? null]
  } else if (s.class === 'punct') {
    if (!Array.isArray(s.marks) || s.marks.length !== 4) die(`${SLOTS_PATH}: ${s.slot} marks`)
    T[s.slot] = ['punct', s.key, s.letter, s.marks]
  } else if (s.class === 'poss') {
    if (!POSS_CLASSES.includes(s.key)) die(`${SLOTS_PATH}: ${s.slot} noun key ${s.key}`)
    T[s.slot] = ['poss', s.key, s.letter]
  } else die(`${SLOTS_PATH}: ${s.slot} class ${s.class}`)
}
const PREFIX = SL.id_prefix ?? 'SEC26'
const INVERSION = new Set([])                          // (v25) no inversion slot
const INTERRUPTER_OK = new Set(SL.slots.filter(s => s.class === 'agr' && s.dtype === 'parallel-verb' && s.pos === 'after').map(s => s.slot))   // NEW v26: the cataphoric ellipsis row (its comma ends the opening clause)
const DECIDER_TYPES = ['time-clause', 'time-phrase', 'modal', 'parallel-verb', 'conditional', 'pronoun-antecedent', 'aux-form']
const TIME_TYPES = new Set(['time-clause', 'time-phrase'])
const HARD_TENSE_TYPES = new Set(['time-clause', 'time-phrase', 'conditional'])   // (v24 Amendment 1)
const SHARED_ADVERB_OK = new Set(SL.slots.filter(s => s.shared && s.shared !== 'complement').map(s => s.slot))   // NEW v26: rows whose `shared` names an adverb
const SHARED_ADVERB_WORD = Object.fromEntries(SL.slots.filter(s => s.shared && s.shared !== 'complement').map(s => [s.slot, s.shared]))
const TIME_RE = /\b(?:when|whenever|while|until|till|before|after|ago|once|since)\b|\b(?:each|every) time\b|^\s*as\b/i   // NEW v26: + since
const SHARED_WORD_SLOTS = new Set(SL.slots.filter(s => s.shared === 'complement').map(s => s.slot))   // NEW v26: per row, not per grid
const SINCE_OK = new Set(SL.slots.filter(s => s.since === true).map(s => s.slot))   // NEW v26: the perfect-keyed rows
const CONTEXT_DECIDED = new Set(SL.slots.filter(s => s.class !== 'agr' && /OUTSIDE|other sentence/i.test(String(s.decided ?? ''))).map(s => s.slot))   // decider_quote OUTSIDE the blank's sentence
const FAR_DECIDED = new Set(SL.slots.filter(s => s.class === 'punct' && /6\+ words after/.test(String(s.decided ?? ''))).map(s => s.slot))   // NEW v26: decider_quote 6+ words after the blank
const slotOf = id => { const m = new RegExp(`^${PREFIX}([ABCD])-(\\d\\d)$`).exec(id); if (!m) return null; const s = `${m[1]}${Number(m[2])}`; return T[s] ? s : null }
const authorOf = id => { const m = /^SEC\d+([A-Z])-\d+$/.exec(id); return m ? m[1] : '?' }

// NEW v24: options a grader strikes without parsing the sentence (the v23 graders'
// named shapes): a mismatched/mixed pair, a misplaced (shifted) mark, or a strong mark
// (semicolon or colon) directly before a coordinating conjunction.
const FANBOYS = new Set(['for', 'and', 'nor', 'but', 'or', 'yet', 'so'])
function glanceOf(choices, marks, k) {
  return choices.map((o, i) => {
    if (i === k) return null
    if (marks[i].startsWith('mixed')) return 'mixed marks'
    if (marks[i].endsWith('@shifted')) return 'misplaced mark'
    const m = /[;:]\s*([A-Za-z]+)/.exec(o)   // the graders' named shape: semicolon/colon + FANBOYS
    if (m && FANBOYS.has(m[1].toLowerCase())) return `strong mark before "${m[1]}"`
    return null
  })
}

/* ---------- passage scans ---------- */
const BANNED_ANY = [
  ['since', /\bsince\b/gi], ['ever since', /\bever since\b/gi], ['to this day', /\bto this day\b/gi], ['to the present', /\bto the present\b/gi],
  ['until now', /\buntil now\b/gi], ['so far', /\bso far\b/gi], ['thus far', /\bthus far\b/gi], ['to date', /\bto date\b/gi],
  ['up to now', /\bup to now\b/gi], ['for the past/last N', /\bfor the (?:past|last)\b/gi], ['in recent years/decades', /\bin recent (?:years|decades)\b/gi],
  ['lately', /\blately\b/gi], ['recently', /\brecently\b/gi], ['nowadays', /\bnowadays\b/gi], ['at present', /\bat present\b/gi], ['currently', /\bcurrently\b/gi],
  ['for more than', /\bfor (?:more|over|nearly|almost) (?:than )?(?:a |an |\d+ |two |three |several |many )?(?:century|centuries|decade|decades|year|years|generation|generations)\b/gi],
  ['over the past', /\bover the (?:past|last)\b/gi], ['throughout', /\bthroughout\b/gi], ['across those/these', /\bacross (?:those|these|the) (?:decades|years|centuries)\b/gi],
  // NEW (v23): v22's voice telegraphs, banned even though no item varies voice
  ['on its/their own', /\bon (?:its|their) own\b/gi], ['by itself/themselves', /\bby (?:itself|themselves)\b/gi],
]
const BANNED_BLANK_SENT = ['now', 'still', 'already', 'yet', 'once']
const TRAP_PHRASES = ['one of the', 'none of', 'neither of', 'the number of', 'a number of', 'a series of', 'a pair of', 'including', 'such as', 'as well as', 'along with', 'together with', 'insist', 'require that', 'requires that', 'required that', 'data', 'media', 'either', 'not only', 'more than one', 'the only one', 'not until', 'every', 'whom', 'the latter', "n't"]
const sentences = p => p.split(/(?<=[.!?]["”]?)\s+(?=["“]?[A-Z])/)
const words = s => s.split(/\s+/).map(w => w.replace(/^[^A-Za-z0-9_']+|[^A-Za-z0-9_']+$/g, '').toLowerCase()).filter(Boolean)

/* ---------- per item ---------- */
const rows = []
const flags = []
const notes = []
const flag = (id, m) => flags.push(`${id}: ${m}`)
for (const it of items) {
  const ch = it.choices, k = ch.indexOf(it.correct_answer)
  const stripP = c => c.toLowerCase().replace(/[.,;:—–"'()?-]/g, ' ').replace(/\s+/g, ' ').trim()
  const isPunct = new Set(ch.map(stripP)).size === 1
  const possCls = isPunct ? null : possOf(ch)            // NEW (v25)
  const isPoss = !!possCls
  const nonAgr = isPunct || isPoss
  const { shared, parsed, pronVaries } = nonAgr
    ? { shared: { pre: [], suf: [] }, parsed: ch.map(() => ({ code: isPunct ? 'punct' : 'poss', number: null, extras: [], core: [], pron: null })), pronVaries: false }
    : parseItem(ch)
  const kp = parsed[k]
  // NEW v24: pronoun class of a pronoun item, part of its option shape
  const pclass = !nonAgr && pronVaries ? (ch.some(c => /\b(?:its|their)\b/i.test(c)) ? 'possessive' : ch.some(c => /\bthose\b/i.test(c)) ? 'demonstrative' : 'object') : null
  const marked = parsed.filter(p => p.number)
  let keyNum = nonAgr ? null : kp.number, inferred = false
  if (!nonAgr && !keyNum && marked.length && new Set(marked.map(p => p.number)).size === 1) { keyNum = marked[0].number; inferred = true }
  const agreement = !nonAgr && marked.length > 0
  const codes = parsed.map(p => p.code)
  const voiceVarying = !nonAgr && codes.some(c => PASSIVE.has(c)) && codes.some(c => !PASSIVE.has(c))
  const distinct = [...new Set(codes)]
  const why = []
  let complete = false, grid = null, dim = null, dkey = null
  if (!nonAgr) {
    if (new Set(ch).size !== 4) why.push('duplicate options')
    if (pronVaries) {
      // NEW (v23): pronoun 2x2 = verb number x pronoun number, one verb form
      if (distinct.length !== 1) why.push(`pronoun item with ${distinct.length} verb forms (${distinct.join(',')})`)
      const combos = new Set(parsed.map(p => `${p.number}/${p.pron}`))
      if (!['sg/sg', 'sg/pl', 'pl/sg', 'pl/pl'].every(c => combos.has(c))) why.push(`verb x pronoun combos ${[...combos].join(' ')}`)
    } else {
      if (distinct.length !== 2) why.push(`${distinct.length} distinct forms (${distinct.join(',')})`)
      for (const c of distinct) { const ns = parsed.filter(p => p.code === c).map(p => p.number).sort().join(','); if (ns !== 'pl,sg') why.push(`form ${c} has numbers [${ns}]`) }
    }
    if (codes.some(c => !F[c])) why.push('non-grid form')
    if (parsed.some(p => p.extras.length)) why.push('leftover words')
    const lex = parsed.flatMap(p => p.core.filter(w => !(w in NUM) && w !== 'been' && w !== 'being' && !isAdv(w)))
    if (lex.length) { const stem = lex.reduce((a, w) => { let i = 0; while (i < a.length && a[i] === w[i]) i++; return a.slice(0, i) }); if (stem.length < 3) why.push(`lexical forms share no 3-letter stem (${[...new Set(lex)].join(',')})`) }
    complete = why.length === 0
    if (complete && pronVaries) { grid = `${distinct[0]}+p`; dim = 'pronoun'; dkey = kp.pron }
    else if (complete) { grid = distinct.slice().sort().join('|'); dim = dimension(distinct[0], distinct[1]); dkey = dimKey(dim, kp.code) }
  }
  const simpleProg = dim === 'progressive'
  const timeItem = dim === 'tense' || dim === 'aspect'
  const pastKey = timeItem && (dim === 'tense' ? F[kp.code]?.[0] === 'past' : !PERFECT.has(kp.code) && F[kp.code]?.[0] === 'past')
  // option words: number-normalised tokens absent from the other three (agreement items)
  const norm = parsed.map(p => {
    const lexSingles = new Set(parsed.filter(q => q.core.length === 1).map(q => q.core[0]))
    return p.core.map(w => ({ is: 'BE1', are: 'BE1', was: 'BE2', were: 'BE2', has: 'HAVE', have: 'HAVE', does: 'DO', do: 'DO' })[w]
      ?? ((/s$/.test(w) && [w.replace(/ies$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, '')].find(b => b !== w && lexSingles.has(b))) || w))
  })
  const extraWord = nonAgr ? ch.map(() => []) : norm.map((ws, i) => ws.filter(w => norm.every((o, j) => j === i || !o.includes(w))))
  const allWords = ch.map(toks)
  const common4 = new Set(allWords[0].filter(w => allWords.every(a => a.includes(w))))   // NEW v24: a word all four share is no tell
  const bannedOpt = ch.map((c, i) => allWords[i].filter(w => !common4.has(w) && (w === 'had' || MODALS.has(w) || isAdv(w))))
  const sharedAdv = nonAgr ? [] : [...common4].filter(w => isAdv(w) || MODALS.has(w) || w === 'had')
  // boundary marks
  const marks = isPunct ? marksOf(ch, k) : null
  const glance = isPunct ? glanceOf(ch, marks, k) : null   // NEW v24
  const optSet = ch.map(c => c.toLowerCase().replace(/\s+/g, ' ').trim()).sort().join(' | ')   // NEW v24
  const keyMark = isPunct ? marks[k] : null
  const strongOpts = isPunct ? ch.map(c => STRONG.test(c)) : null
  const loneStrongKey = isPunct && strongOpts[k] && strongOpts.filter(Boolean).length === 1
  const twin = []
  if (isPunct) {
    if (ch.some(c => c.includes(';')) && ch.some(c => /\.\s+[A-Z]/.test(c))) twin.push('semicolon and period both offered')
    if (ch.some(c => c.includes(':')) && marks.includes('dash')) twin.push('colon and single dash both offered')
  }
  // lengths
  const len = ch.map(c => c.length), mx = Math.max(...len), mn = Math.min(...len)
  const ratio = len[k] / mn
  const keyLongest = len[k] === mx && len.filter(l => l === mx).length === 1
  const keyShortest = len[k] === mn && len.filter(l => l === mn).length === 1
  // passage
  const p = it.passage, sents = sentences(p)
  const bi = sents.findIndex(s => /_{3,}/.test(s))
  const bsent = sents[bi] ?? ''
  const banned = []
  for (const [name, re] of BANNED_ANY) for (const m of p.matchAll(re)) if (!(name === 'since' && SINCE_OK.has(slotOf(it.id)))) banned.push({ kind: name, ctx: p.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).replace(/\s+/g, ' ') })
  for (const w of words(bsent)) if (BANNED_BLANK_SENT.includes(w)) banned.push({ kind: `"${w}" in the blank's sentence`, ctx: bsent.slice(0, 120) })
  const years = p.match(/\b(1[0-9]{3}|20[0-9]{2})s?\b/g) || []
  if (years.length) notes.push(`${it.id}: printed year(s) ${years.join(', ')}: hand-read whether one settles tense`)
  const lowerP = ' ' + p.toLowerCase() + ' '
  const traps = TRAP_PHRASES.filter(ph => new RegExp(`(^|[^a-z])${ph.replace(/[.*+?^${}()|[\]\\']/g, '\\$&')}([^a-z]|$)`).test(lowerP))
  if (traps.length) notes.push(`${it.id}: banned-trap / live-template phrase(s) present, hand-read: ${traps.map(t => `"${t}"`).join(', ')}`)
  const [pre, post] = p.split(/_{3,}/)
  const preW = words(pre), postW = words(post)
  const wBefore = preW[preW.length - 1] ?? '', wAfter = postW[0] ?? ''
  const preflightDrop = []
  if (wBefore && ch.every(c => toks(c)[0] === wBefore)) preflightDrop.push(`word before the blank "${wBefore}" opens every option`)
  if (wAfter && ch.every(c => toks(c).at(-1) === wAfter)) preflightDrop.push(`word after the blank "${wAfter}" closes every option`)
  const doubled = wBefore && ch.some(c => toks(c)[0] === wBefore) && !preflightDrop.length ? `an option repeats "${wBefore}"` : null
  const interrupterAfter = !nonAgr && /^\s*[,—–(]|^\s*-{1,2}\s/.test(post)

  const slot = slotOf(it.id)
  const possKey = isPoss ? possCls[k] : null   // NEW (v25)
  const r = { id: it.id, slot, author: authorOf(it.id), key: 'ABCD'[k], k, keyNum, inferred, agreement, isPunct, isPoss, possKey, voiceVarying, simpleProg,
    timeItem, pastKey, complete, grid, dim, dkey, keyCode: kp.code, pron: kp.pron,
    keyForm: isPunct ? `mark: ${keyMark}` : isPoss ? `noun: ${possKey}` : formName(kp.code, kp.number, pronVaries ? kp.pron : null), ratio, keyLongest, keyShortest,
    keyMark, loneStrongKey, twin, glance, optSet, pclass, sharedSuf: shared.suf.join(' '), banned, extraWord, bannedOpt, preflightDrop, blankLast: bi === sents.length - 1, interrupterAfter, bsent, preW, postW }
  rows.push(r)

  // per-item brief checks
  if (!nonAgr && !complete) flag(it.id, `options are not a complete 2x2 (${why.join('; ')})`)
  if (ratio >= 1.6) flag(it.id, `key/shortest length ratio ${ratio.toFixed(2)} >= 1.6`)
  extraWord.forEach((ws, i) => { if (ws.length) flag(it.id, `option ${'ABCD'[i]} "${ch[i]}" has word(s) the other three lack: ${ws.join(', ')}`) })
  bannedOpt.forEach((ws, i) => { if (ws.length) flag(it.id, `option ${'ABCD'[i]} "${ch[i]}" carries banned option content: ${ws.join(', ')}`) })
  for (const d of preflightDrop) flag(it.id, `PRE-FLIGHT DROP: ${d}`)
  if (doubled) notes.push(`${it.id}: ${doubled} (doubled_word candidate; hand-read)`)
  if (interrupterAfter && !INTERRUPTER_OK.has(slot)) flag(it.id, `an interrupter mark follows the blank immediately (allowed only in ${[...INTERRUPTER_OK].join(', ')})`)
  for (const t of twin) flag(it.id, `boundary twin offer: ${t}`)
  if (sharedAdv.length && !SHARED_ADVERB_OK.has(slotOf(it.id))) flag(it.id, `all four options share "${sharedAdv.join(' ')}" (a shared adverb/modal is allowed only in ${[...SHARED_ADVERB_OK].join(', ')})`)
  // NOTE only: on v23's six boundary items this detector matched the graders' median n_struck on 0 of 6
  // (it read 2,2,0,0,1,1 where the graders struck 1,1,1,1,2,2), so it is NOT a strike count and gates nothing.
  if (isPunct && glance.some(Boolean)) notes.push(`${it.id}: named glance shape(s), hand-read against the row's option set: ${glance.map((g, i) => g ? `${'ABCD'[i]}: ${g}` : null).filter(Boolean).join('; ')}`)
  if (!nonAgr && SHARED_WORD_SLOTS.has(slot) && !shared.suf.length) flag(it.id, `(v26) row ${slot} must carry a shared complement word (no option set may equal a live bare aux set)`)
  if (SHARED_ADVERB_OK.has(slot) && !sharedAdv.includes(SHARED_ADVERB_WORD[slot])) flag(it.id, `(v26) row ${slot}: all four options must share "${SHARED_ADVERB_WORD[slot]}" (shared: ${sharedAdv.join(' ') || 'none'})`)
  // NEW (v26): "since" only in the perfect-keyed rows: exactly once, 5+ words after the blank (inside the decider: checked with --decl)
  if (SINCE_OK.has(slot)) {
    const sinceN = (p.match(/\bsince\b/gi) || []).length, si = postW.indexOf('since')
    if (sinceN !== 1) flag(it.id, `(v26) row ${slot}: "since" must occur exactly once (found ${sinceN})`)
    else if (si < 0) flag(it.id, `(v26) row ${slot}: "since" must follow the blank`)
    else if (si < 4) flag(it.id, `(v26) row ${slot}: "since" is word ${si + 1} after the blank (needs 5+)`)
  }
  if (isPunct && marks.some(m => m.startsWith('mixed')) && !marks[k].startsWith('mixed')) notes.push(`${it.id}: options with mixed marks (${marks.join(' | ')}): hand-read`)

  // table row
  if (slot) {
    const row = T[slot]
    if (row[0] === 'poss') {   // NEW (v25)
      if (!isPoss) flag(it.id, `table ${slot}: a possessive-noun slot whose options are not {X, X's, Xs, Xs'} of one noun`)
      else if (possKey !== row[1]) flag(it.id, `table ${slot}: key class ${possKey} (row ${row[1]})`)
      if (r.key !== row[2]) flag(it.id, `table ${slot}: key letter ${r.key} (row ${row[2]})`)
    } else if (row[0] === 'punct') {
      if (!isPunct) flag(it.id, `table ${slot}: a boundary slot whose options differ in words`)
      else if (keyMark !== row[1]) flag(it.id, `table ${slot}: key mark ${keyMark} (row ${row[1]})`)
      if (r.key !== row[2]) flag(it.id, `table ${slot}: key letter ${r.key} (row ${row[2]})`)
      if (isPunct) {
        const got = marks.map(m => m.startsWith('mixed') ? 'mixed' : m).sort().join(','), want = row[3].slice().sort().join(',')
        if (got !== want) flag(it.id, `table ${slot}: option marks {${got}} (row {${want}})`)
      }
    } else {
      const [, tNum, , , tDim, tKey, tGrid, tCode, tLetter, , , tPron, , tPclass] = row
      if (nonAgr) flag(it.id, `table ${slot}: an agreement slot whose options are a boundary or possessive-noun set`)
      if ((tPclass ?? null) !== (pclass ?? null)) flag(it.id, `table ${slot}: pronoun class ${pclass ?? 'none'} (row ${tPclass ?? 'none'})`)   // NEW (v25)
      if (keyNum !== tNum) flag(it.id, `table ${slot}: key number ${keyNum} (row ${tNum})`)
      if (!grid || !sameGrid(grid, tGrid)) flag(it.id, `table ${slot}: grid ${grid ?? 'incomplete'} (row ${tGrid})`)
      if (kp.code !== tCode) flag(it.id, `table ${slot}: key form ${formName(kp.code, kp.number)} (row ${formName(tCode, tNum)})`)
      if (r.key !== tLetter) flag(it.id, `table ${slot}: key letter ${r.key} (row ${tLetter})`)
      if (dim && (dim !== tDim || dkey !== tKey)) flag(it.id, `table ${slot}: 2nd dimension ${dim}:${dkey} (row ${tDim}:${tKey})`)
      if (tPron && kp.pron !== tPron) flag(it.id, `table ${slot}: key pronoun ${kp.pron} (row ${tPron})`)
    }
  }
  // declarations
  if (decl) {
    const d = decl[it.id]
    if (d.key_letter && d.key_letter !== r.key) flag(it.id, `declared key_letter ${d.key_letter}, file has ${r.key}`)
    // NEW (v25): why each WRONG option is attractive, keyed by its exact text. A wording
    // discipline (rule: every distractor has its own pull), never evidence of difficulty.
    {
      const dp = d.distractor_pulls, wrong = ch.filter((_, i) => i !== k)
      if (!dp || typeof dp !== 'object' || Array.isArray(dp)) flag(it.id, 'declaration distractor_pulls missing (an object keyed by each distractor\'s exact text)')
      else for (const w of wrong) { const v = dp[w]; if (typeof v !== 'string' || v.trim().length < 15) flag(it.id, `distractor_pulls["${w}"] missing or under 15 characters`) }
    }
    if (isPunct || isPoss) {
      if (isPunct && d.key_mark && d.key_mark !== keyMark) flag(it.id, `declared key_mark ${d.key_mark}, options read ${keyMark}`)
      if (isPoss && d.key_class !== possKey) flag(it.id, `declared key_class ${JSON.stringify(d.key_class)}, options read ${possKey}`)   // NEW (v25)
      // (v24) the author lists the options it judges strikable at a glance
      r.glanceDecl = Array.isArray(d.glance_fail) ? d.glance_fail.length : null
      if (r.glanceDecl == null) flag(it.id, 'declaration glance_fail missing (an array of option texts, possibly empty)')
      else if (r.glanceDecl > 1) flag(it.id, `declared glance_fail lists ${r.glanceDecl} options (max 1)`)
      // NEW (v25): what decides the mark / the noun form, quoted from the passage
      const dq = typeof d.decider_quote === 'string' ? d.decider_quote.trim() : ''
      const pl = p.toLowerCase().replace(/\s+/g, ' '), bl = bsent.toLowerCase().replace(/\s+/g, ' ')
      if (!dq) flag(it.id, 'declaration decider_quote missing (the passage words that decide the item)')
      else if (!pl.includes(dq.toLowerCase().replace(/\s+/g, ' '))) flag(it.id, `decider_quote "${dq}" is not in the passage`)
      else if (slot && CONTEXT_DECIDED.has(slot) && bl.includes(dq.toLowerCase().replace(/\s+/g, ' '))) flag(it.id, `table ${slot}: decider_quote "${dq}" sits inside the blank's sentence; this row is decided by ANOTHER sentence`)
      if (slot && FAR_DECIDED.has(slot) && dq) { const vi = postW.indexOf(dq.toLowerCase().split(/\s+/)[0].replace(/[^a-z']/g, '')); if (vi < 5) flag(it.id, `table ${slot}: the decider "${dq}" starts ${vi < 0 ? 'nowhere after the blank' : `at word ${vi + 1}`} after the blank (needs 6+)`) }   // NEW (v26): every delayed-verb, list and garden row
    } else {
      r.near = d.near_noun?.number ?? null
      r.nearWord = d.near_noun?.word ?? null
      r.first = d.first_noun_of_sentence?.number ?? null   // NEW v24: of the SENTENCE
      r.after = d.after_noun_within_8 == null ? null : d.after_noun_within_8.number ?? null
      r.afterWord = d.after_noun_within_8?.word ?? null
      r.pos = d.misleader_position ?? null
      if (!['sg', 'pl'].includes(r.near)) flag(it.id, `declaration near_noun.number is ${JSON.stringify(r.near)}`)
      if (!['sg', 'pl'].includes(r.first)) flag(it.id, `declaration first_noun_of_sentence.number is ${JSON.stringify(r.first)}`)
      r.dtype = d.decider_type ?? null
      if (!DECIDER_TYPES.includes(r.dtype)) flag(it.id, `declaration decider_type ${JSON.stringify(r.dtype)} is not one of ${DECIDER_TYPES.join('/')}`)
      if (d.key_number && d.key_number !== keyNum) flag(it.id, `declared key_number ${d.key_number}, options read ${keyNum}`)
      if (d.grid?.code && grid && !sameGrid(d.grid.code, grid)) flag(it.id, `declared grid ${d.grid.code}, options read ${grid}`)
      const has = w => w && p.toLowerCase().includes(String(w).toLowerCase())
      if (r.nearWord && !preW.slice(-4).includes(String(r.nearWord).toLowerCase().split(/\s+/).pop())) flag(it.id, `declared near noun "${r.nearWord}" is not among the 4 words before the blank`)
      if (r.afterWord) { const ai = postW.indexOf(String(r.afterWord).toLowerCase().split(/\s+/).pop()); if (ai < 0 || ai >= 8) flag(it.id, `declared after-noun "${r.afterWord}" is not within 8 words after the blank`) }
      for (const w of d.misleader_words ?? []) if (!has(w)) flag(it.id, `declared misleader "${w}" not in passage`)
      // NEW (v23) rule 4: the decider sits in the blank's own sentence
      const dq = Array.isArray(d.decider_quote) ? d.decider_quote : d.decider_quote ? [d.decider_quote] : []
      const bl = bsent.toLowerCase().replace(/\s+/g, ' ')
      r.deciderIn = dq.length > 0 && dq.every(q => bl.includes(String(q).toLowerCase().replace(/\s+/g, ' ').trim()))
      r.deciderQuote = dq.join(' / ')
      r.timeText = dq.some(q => TIME_RE.test(String(q)))   // NEW v24: the decider itself is a time expression
      { // NEW v24: inversion-like = the head is NOT before the blank in its sentence and sits 5+ words after it
        const hw = String(d.true_subject_head ?? '').toLowerCase().split(/\s+/).pop()
        const [bPre, bPost] = bsent.split(/_{3,}/).map(words)
        r.headAfter = bPre.includes(hw) ? -1 : (bPost ?? []).indexOf(hw) }
      if (!r.deciderIn) flag(it.id, `decider_quote ${dq.length ? `"${dq.join('" / "')}"` : '(none)'} is not inside the blank's own sentence`)
      if (slot && T[slot][0] === 'agr') {
        const [, , tNear, tPos, , , , , , tAfter, tFirst, , tDtype] = T[slot]
        if (r.dtype && r.dtype !== tDtype) flag(it.id, `table ${slot}: decider_type ${r.dtype} (row ${tDtype})`)
        // NEW v24: outside the time rows, no time conjunction anywhere in the blank's sentence ("as" exempt: B6's "as ... assumed")
        if (!TIME_TYPES.has(tDtype)) { const tw = words(bsent).filter(w => ['when', 'whenever', 'while', 'until', 'till', 'before', 'after', 'once', 'ago', 'since'].includes(w)).concat(bsent.match(/\b(?:each|every) time\b/gi) ?? []); if (tw.length) flag(it.id, `table ${slot}: time word(s) "${tw.join('", "')}" in the blank's sentence of a non-time row`) }
        if (r.near && r.near !== tNear) flag(it.id, `table ${slot}: Near ${r.near} (row ${tNear})`)
        if (r.pos && r.pos !== tPos) flag(it.id, `table ${slot}: misleader position ${r.pos} (row ${tPos})`)
        const afterRel = r.after == null ? null : r.after === keyNum ? 'agr' : 'opp'
        if (tAfter !== 'free' && afterRel !== tAfter) flag(it.id, `table ${slot}: After ${afterRel ?? 'none'} (row ${tAfter})`)
        const firstRel = r.first == null ? null : r.first === keyNum ? 'agr' : 'opp'
        if (firstRel && firstRel !== tFirst) flag(it.id, `table ${slot}: first noun of the sentence ${firstRel} (row ${tFirst})`)
        if (INVERSION.has(slot)) {
          const hi = postW.indexOf(String(d.true_subject_head ?? '').toLowerCase())
          if (hi < 4) flag(it.id, `inversion: subject head "${d.true_subject_head}" is ${hi < 0 ? 'not found' : `word ${hi + 1}`} after the blank (needs 5+)`)
        }
      }
      // NEW (v26): every pronoun row is SPLIT: the pronoun's antecedent is not the verb's subject
      if (pronVaries) { const aw = String(d.pronoun_antecedent?.word ?? '').toLowerCase().trim(), sw = String(d.true_subject_head ?? '').toLowerCase().trim(); if (!aw) flag(it.id, 'declaration pronoun_antecedent.word missing'); else if (aw === sw) flag(it.id, `pronoun antecedent "${aw}" is the verb's own subject: the row requires a split`) }
      // NEW (v26): in the since rows the decider quote holds the "since"
      if (SINCE_OK.has(slot) && !dq.some(q => /\bsince\b/i.test(String(q)))) flag(it.id, `(v26) row ${slot}: decider_quote must contain the "since" that settles the perfect`)
      if (pronVaries && d.pronoun_antecedent?.number && d.pronoun_antecedent.number !== kp.pron) flag(it.id, `declared pronoun antecedent ${d.pronoun_antecedent.number}, key pronoun ${kp.pron}`)
    }
  }

  // print
  const tag = isPunct
    ? [`key ${r.key} ${r.keyForm}`, `marks ${marks.join(' | ')}`, loneStrongKey ? 'LONE strong-mark key' : null].filter(Boolean).join(' | ')
    : isPoss ? `key ${r.key} ${r.keyForm} | forms ${possCls.join(' | ')}`
    : [
      `key ${r.key} ${r.keyForm}${agreement ? ` [${keyNum ?? '?'}${inferred ? ' inferred' : ''}]` : ' [no number]'}`,
      complete ? `grid ${grid} ${dim}:${dkey}` : 'grid INCOMPLETE',
      voiceVarying ? 'VOICE-VARYING' : null, simpleProg ? 'SIMPLE-vs-PROGRESSIVE' : null,
      decl ? `Near ${r.near ?? '?'} (${r.nearWord ?? '-'}), First ${r.first ?? '?'}, After ${r.after ?? 'none'} (${r.afterWord ?? '-'}), decider ${r.deciderIn ? 'in sentence' : 'NOT in sentence'}` : null,
    ].filter(Boolean).join(' | ')
  console.log(`${it.id}${slot ? ` (${slot})` : ''}  ${tag}`)
  if (shared.pre.length || shared.suf.length) console.log(`     shared by all four: prefix [${shared.pre.join(' ')}] suffix [${shared.suf.join(' ')}]`)
  ch.forEach((c, i) => {
    const q = parsed[i]
    console.log(`     ${'ABCD'[i]}${i === k ? '*' : ' '} ${(q.code + (q.number ? ':' + q.number : '') + (q.pron ? '/' + q.pron : '')).padEnd(12)} ${PASSIVE.has(q.code) ? '[pass]' : '      '} ${c}${q.extras.length ? `   extra: ${q.extras.join(' ')}` : ''}`)
  })
  for (const b of banned) console.log(`     banned: ${b.kind}  ...${b.ctx}...`)
}

/* ---------- batch counts ---------- */
const n = rows.length
const pct = (a, b) => b ? `${a}/${b} = ${(100 * a / b).toFixed(1)}%` : '0/0'
const bars = []
const bar = (name, ok, text) => { bars.push({ name, ok }); console.log(`  [${ok === null ? 'NOT MEASURED' : ok ? 'MET' : 'MISSED'}] ${name}: ${text}`) }
const A = rows.filter(r => r.agreement)
const Bd = rows.filter(r => r.isPunct)
const sgK = A.filter(r => r.keyNum === 'sg').length, plK = A.filter(r => r.keyNum === 'pl').length
const V = rows.filter(r => r.voiceVarying)
const SP = rows.filter(r => r.simpleProg)
const TI = rows.filter(r => r.timeItem), TP = TI.filter(r => r.pastKey)
const between = (a, b, lo, hi) => b > 0 && a / b >= lo - 1e-9 && a / b <= hi + 1e-9

console.log(`\n${n} items read from ${file}${decl ? `; declarations for all ${Object.keys(decl).length} ids from ${declFiles.join(', ')}` : '; NO declarations given'}`)
console.log(`agreement items: ${A.length}; boundary items: ${Bd.length}; other: ${n - A.length - Bd.length}; agreement keys singular ${sgK}, plural ${plK}`)

// NEW (v25): the table's own numbers, computed from T so the printed [table: ...] values
// can never drift from the rows.
const TA = Object.entries(T).filter(([, r]) => r[0] === 'agr')
const tCount = f => TA.filter(([, r]) => f(r)).length
const TT = {
  agr: TA.length, pl: tCount(r => r[1] === 'pl'),
  agrNear: tCount(r => r[1] === r[2]),
  cells: Object.fromEntries(['pl/pl', 'pl/sg', 'sg/pl', 'sg/sg'].map(c => [c, tCount(r => `${r[1]}/${r[2]}` === c)])),
  time: tCount(r => TIME_TYPES.has(r[12])), cond: tCount(r => r[12] === 'conditional'),
  nonTense: tCount(r => r[4] === 'pronoun' || r[4] === 'aux'),
  first: tCount(r => r[10] === 'agr' && (r[4] !== 'pronoun' || r[11] === r[1])),
  boundary: Object.values(T).filter(r => r[0] === 'punct').length, poss: Object.values(T).filter(r => r[0] === 'poss').length,
  lone: Object.values(T).filter(r => r[0] === 'punct' && /^(semicolon|colon|period|dash|question)$/.test(r[1]) && r[3].filter(m => /^(semicolon|colon|period|dash|question)/.test(m)).length === 1).length,
}
const plPer = a => TA.filter(([s, r]) => s[0] === a && r[1] === 'pl').length

console.log('\nPREREG BARS')
bar(`key plural ${TT.pl - 2}-${TT.pl + 3} of the agreement items [table ${TT.pl} of ${TT.agr}]`, plK >= TT.pl - 2 && plK <= TT.pl + 3, `${plK} plural of ${A.length} agreement items, batch n=${n}`)
bar('voice-varying items: 0 (v23)', V.length === 0, `${V.length}  (${V.map(r => r.id).join(' ') || 'none'})`)
bar('simple-vs-progressive items: 0 (v23)', SP.length === 0, `${SP.length}  (${SP.map(r => r.id).join(' ') || 'none'})`)
bar('past key in 40-60% of time items (tense + aspect)', between(TP.length, TI.length, 0.4, 0.6), `${pct(TP.length, TI.length)}  (${TI.map(r => r.id + (r.pastKey ? ':PAST' : ':pres')).join(' ') || 'none'})`)
if (decl) {
  const cells = { 'pl/pl': 0, 'pl/sg': 0, 'sg/pl': 0, 'sg/sg': 0 }
  for (const r of A) if (r.keyNum && r.near) cells[`${r.keyNum}/${r.near}`]++
  bar(`each Key x Near cell 4-10 [table ${JSON.stringify(TT.cells)}]`, Object.values(cells).every(v => v >= 4 && v <= 10), `${JSON.stringify(cells)} (Key/Near from declarations: hand-read the printed Near words)`)
  const agrN = A.filter(r => r.near && r.near === r.keyNum).length
  bar(`nearest noun AGREES with the key in ${TT.agrNear - 3}-${TT.agrNear + 3} agreement items [table ${TT.agrNear}]`, agrN >= TT.agrNear - 3 && agrN <= TT.agrNear + 3, `${agrN} of ${A.length}`)
  const din = A.filter(r => r.deciderIn).length
  bar('second-dimension decider inside the blank\'s own sentence in every agreement item (v23)', A.length > 0 && din === A.length, `${din} of ${A.length}${A.filter(r => !r.deciderIn).length ? `  (not: ${A.filter(r => !r.deciderIn).map(r => r.id).join(' ')})` : ''}`)
  // (v24) time-anchored deciders. Counted twice, by the author's decider_type and
  // by the decider text itself; the larger count is the one barred.
  const tDecl = A.filter(r => TIME_TYPES.has(r.dtype)), tText = A.filter(r => r.timeText)
  const tN = Math.max(tDecl.length, tText.length)
  bar(`time clause or time phrase decides the second dimension in <= ${TT.time} agreement items [table ${TT.time}]`, A.length > 0 && tN <= TT.time,
    `declared ${tDecl.length} (${tDecl.map(r => r.id).join(' ') || 'none'}); by decider text ${tText.length} (${tText.map(r => r.id).join(' ') || 'none'})`)
  const soft = A.filter(r => (r.dim === 'tense' || r.dim === 'aspect') && r.dtype && !HARD_TENSE_TYPES.has(r.dtype))
  bar('every tense/aspect item is decided by a time clause, time phrase or conditional: no modal or parallel-verb tense decider (v24, Amendment 1)', A.length > 0 && soft.length === 0, `${soft.length}  (${soft.map(r => `${r.id}:${r.dtype}`).join(' ') || 'none'})`)
  const inv = A.filter(r => r.headAfter >= 4)
  bar('inversion-like items (subject head 5+ words after the blank) <= 1 (v24) [table 0]', inv.length <= 1, `${inv.length}  (${inv.map(r => r.id).join(' ') || 'none'})`)
  const gd = {}; for (const r of A) if (r.grid && r.dtype) (gd[`${r.grid}${r.pclass ? ':' + r.pclass : ''} x ${r.dtype}`] ??= []).push(r.id)
  const gdDup = Object.entries(gd).filter(([, l]) => l.length > 1)
  bar('no two agreement items share (option shape x decider type) (v24)', A.length > 0 && gdDup.length === 0, gdDup.length ? gdDup.map(([g, l]) => `${g}: ${l.join(' ')}`).join('; ') : `${Object.keys(gd).length} distinct of ${A.length}`)
} else {
  bar('each Key x Near cell 4-10', null, 'needs --decl; no number printed')
  bar('nearest noun AGREES with the key (band around the table)', null, 'needs --decl; no number printed')
  bar('second-dimension decider inside the blank\'s own sentence in every agreement item (v23)', null, 'needs --decl; no number printed')
  bar('time clause or time phrase decides the second dimension (<= table)', null, 'needs --decl; no number printed')
  bar('every tense/aspect item is decided by a time clause, time phrase or conditional: no modal or parallel-verb tense decider (v24, Amendment 1)', null, 'needs --decl; no number printed')
  bar('inversion-like items (subject head 5+ words after the blank) <= 1 (v24)', null, 'needs --decl; no number printed')
  bar('no two agreement items share (option shape x decider type) (v24)', null, 'needs --decl; no number printed')
}
// (v24) the second dimension off tense; from the option text alone
const nonTense = A.filter(r => r.dim === 'pronoun' || r.dim === 'aux')
bar(`pronoun or auxiliary-type second dimension in >= ${TT.nonTense} agreement items [table ${TT.nonTense}]`, nonTense.length >= TT.nonTense, `${nonTense.length} of ${A.length}  (${nonTense.map(r => `${r.id}:${r.dim}`).join(' ') || 'none'})`)
const os = {}; for (const r of rows) (os[r.optSet] ??= []).push(r.id)
const osDup = Object.entries(os).filter(([, l]) => l.length > 1)
bar('no two items have identical option sets (v24)', osDup.length === 0, osDup.length ? osDup.map(([o, l]) => `{${o}}: ${l.join(' ')}`).join('; ') : `${Object.keys(os).length} distinct of ${n}`)
const bannedRows = rows.filter(r => r.banned.length)
const bannedN = rows.reduce((a, r) => a + r.banned.length, 0)
bar('0 banned adverbials', bannedN === 0, `${bannedN} hit(s) in ${bannedRows.length} of ${n} passages  (${bannedRows.map(r => `${r.id}[${r.banned.map(b => b.kind).join(',')}]`).join(' ') || 'none'})`)
const extraRows = rows.filter(r => r.extraWord.some(w => w.length))
bar('0 extra-word options', extraRows.length === 0, `${extraRows.length} of ${n} items  (${extraRows.map(r => r.id).join(' ') || 'none'})`)
const lone = Bd.filter(r => r.loneStrongKey).length, tw = Bd.filter(r => r.twin.length).length
bar(`boundary: ${TT.boundary} items, lone-strong-mark key <= ${TT.lone}, 0 twin offers (v26: both counts are the table's) [table ${TT.boundary}]`, Bd.length === TT.boundary && lone <= TT.lone && tw === 0,
  `${Bd.length} boundary items; keys ${Bd.map(r => `${r.id}:${r.keyMark}`).join(' ') || 'none'}; lone-strong ${lone}, twin ${tw}`)
const Ps = rows.filter(r => r.isPoss)
bar(`noun-form items: ${TT.poss}, each a complete {X, X's, Xs, Xs'} set [table ${TT.poss}: keys ${Object.values(T).filter(r => r[0] === 'poss').map(r => r[1]).join(', ')}]`, Ps.length === TT.poss, `${Ps.length}  (${Ps.map(r => `${r.id}:${r.possKey}`).join(' ') || 'none'})`)
// (v24) each boundary item's four marks equal its table row (flagged per item above);
// the author's declared glance_fail (<= 1) is a quota flag. Neither is a strike count:
// the strike count is the graders' n_struck, and the gate drops a median >= 2.

console.log('\nBALANCES (quota failures are listed under FLAGS)')
if (decl) {
  const withPl = A.filter(r => r.near === 'pl'), heurB = withPl.filter(r => r.keyNum === 'sg').length
  const heurA = A.filter(r => r.near && r.keyNum && r.near !== r.keyNum).length
  const firstOk = A.filter(r => r.first && r.first === r.keyNum && (!r.pron || r.dim !== 'pronoun' || r.pron === r.first)).length
  const aft = { opp: 0, agr: 0, none: 0 }; for (const r of A) aft[r.after == null ? 'none' : r.after === r.keyNum ? 'agr' : 'opp']++
  const posC = {}; for (const r of A) posC[r.pos ?? '?'] = (posC[r.pos ?? '?'] ?? 0) + 1
  const tPos = {}; for (const [, r] of TA) tPos[r[3]] = (tPos[r[3]] ?? 0) + 1
  console.log(`  "plural noun just before the blank means singular key": holds in ${heurB} of ${withPl.length} items with a plural Near   [table: ${TT.cells['sg/pl']} of ${TT.cells['sg/pl'] + TT.cells['pl/pl']}]`)
  console.log(`  "pick the number opposite the nearest noun": solves ${heurA} of ${A.length}   [table: ${TT.agr - TT.agrNear} of ${TT.agr}]`)
  console.log(`  "agree with the first noun of the sentence" (both numbers, in pronoun items): solves ${firstOk} of ${A.length}   [table: ${TT.first} of ${TT.agr}; quota <= ${TT.first + 2}]`)
  console.log(`  after-blank noun vs key number: ${JSON.stringify(aft)}   [table: ${['opp', 'agr', 'free'].map(x => `${x} ${tCount(r => r[9] === x)}`).join(', ')}]`)
  console.log(`  misleader position: ${JSON.stringify(posC)}   [table: ${JSON.stringify(tPos)}]`)
  if (firstOk > TT.first + 2) flag('batch', `"agree with the first noun of the sentence" solves ${firstOk} of ${A.length} (max ${TT.first + 2})`)
} else console.log('  Near/First/After/position heuristics: NOT MEASURED (no --decl)')
const dims = {}; for (const r of A) if (r.dim) { dims[r.dim] ??= { n: 0, keys: {} }; dims[r.dim].n++; dims[r.dim].keys[r.dkey] = (dims[r.dim].keys[r.dkey] ?? 0) + 1 }
const tDims = {}; for (const [, r] of TA) tDims[r[4]] = (tDims[r[4]] ?? 0) + 1
console.log(`  complete 2x2 grids: ${A.filter(r => r.complete).length} of ${A.length}; by 2nd dimension: ${Object.entries(dims).map(([d, v]) => `${d} ${v.n} ${JSON.stringify(v.keys)}`).join('; ') || 'none'}   [table: ${JSON.stringify(tDims)}]`)
const v26slots = rows.some(r => r.slot)
const beenRows = rows.filter(r => r.agreement && items.find(i => i.id === r.id).choices.some(c => /\bbeen\b/i.test(c)))
const beenKeyed = beenRows.filter(r => /\bbeen\b/i.test(items.find(i => i.id === r.id).correct_answer))
const TB = TA.filter(([, r]) => r[6].split('|').some(c => ['e', 'f', 'r'].includes(c))), TBk = TB.filter(([, r]) => ['e', 'f', 'r'].includes(r[7])), TBe = TA.filter(([, r]) => r[6].split('|').some(c => ['k', 'l'].includes(c)))
console.log(`  options containing "been": ${beenRows.length} items, keyed ${beenKeyed.length}   [table: ${TB.length} (${TB.map(([s]) => s).join(', ')}), keyed ${TBk.length}; quota <= ${TB.length}]`)
const beingRows = rows.filter(r => r.agreement && items.find(i => i.id === r.id).choices.some(c => /\bbeing\b/i.test(c)))
console.log(`  options containing "being": ${beingRows.length} items   [table: ${TBe.length} (${TBe.map(([s]) => s).join(', ')}); quota <= ${TBe.length}]`)
if (beenRows.length > TB.length) flag('batch', `"been" appears in ${beenRows.length} agreement items (max ${TB.length}): ${beenRows.map(r => r.id).join(' ')}`)
if (v26slots && beenKeyed.length !== TBk.length) flag('batch', `"been" keyed in ${beenKeyed.length} items (table ${TBk.length}; SEC25 keyed 0 of 5 and graders named it)`)
if (beingRows.length > TBe.length) flag('batch', `"being" appears in ${beingRows.length} agreement items (max ${TBe.length}): ${beingRows.map(r => r.id).join(' ')}`)
const authors = [...new Set(rows.map(r => r.author))].sort()
const letters = Object.fromEntries('ABCD'.split('').map(L => [L, rows.filter(r => r.key === L).length]))
console.log(`  key letters batch ${JSON.stringify(letters)}; per author ${authors.map(a => `${a}:${'ABCD'.split('').map(L => rows.filter(r => r.author === a && r.key === L).length).join('/')}`).join('  ')}   [table: ${'ABCD'.split('').map(L => `${L} ${Object.values(T).filter(r => (r[0] === 'agr' ? r[8] : r[2]) === L).length}`).join(', ')}; per author ${'ABCD'.split('').map(a => `${a}:${'ABCD'.split('').map(L => Object.entries(T).filter(([s, r]) => s[0] === a && (r[0] === 'agr' ? r[8] : r[2]) === L).length).join('/')}`).join(' ')}]`)
console.log(`  key plural per author: ${authors.map(a => `${a} ${rows.filter(r => r.author === a && r.agreement && r.keyNum === 'pl').length}/${rows.filter(r => r.author === a && r.agreement).length}`).join('  ')}   [table: ${'ABCD'.split('').map(a => `${a} ${plPer(a)}`).join(', ')}]`)
const formCount = {}; for (const r of rows) if (!r.isPunct) formCount[r.keyForm] = (formCount[r.keyForm] ?? []).concat(r.id)
console.log(`  key forms: ${Object.entries(formCount).sort((a, b) => b[1].length - a[1].length).map(([f, l]) => `"${f}" x${l.length}`).join(', ')}`)
const gridCount = {}; for (const r of A) if (r.grid) gridCount[r.grid + (r.pclass ? ':' + r.pclass : '')] = (gridCount[r.grid + (r.pclass ? ':' + r.pclass : '')] ?? []).concat(r.id)
console.log(`  option shapes (grid + pronoun class): ${Object.entries(gridCount).map(([g, l]) => `${g} x${l.length}`).join(', ')}`)
console.log(`  key length: max ratio ${Math.max(...rows.map(r => r.ratio)).toFixed(2)}; uniquely longest ${rows.filter(r => r.keyLongest).length}/${n}, uniquely shortest ${rows.filter(r => r.keyShortest).length}/${n}`)
console.log(`  options with had/modal/adverb: ${rows.filter(r => r.bannedOpt.some(w => w.length)).map(r => r.id).join(' ') || 'none'}   [table: 0]`)

const nSlots = Object.keys(T).length
const tLet = L => Object.values(T).filter(r => (r[0] === 'agr' ? r[8] : r[2]) === L).length
for (const L of 'ABCD') if (n === nSlots && letters[L] !== tLet(L)) flag('batch', `key letter ${L} keyed ${letters[L]} times (table ${tLet(L)})`)
for (const a of authors) {
  const ar = rows.filter(r => r.author === a)
  for (const L of 'ABCD') { const c = ar.filter(r => r.key === L).length, want = Object.entries(T).filter(([s, r]) => s[0] === a && (r[0] === 'agr' ? r[8] : r[2]) === L).length; if (c !== want) flag(`author ${a}`, `key letter ${L} keyed ${c} times (table ${want})`) }
  const aa = ar.filter(r => r.agreement)
  const pl = aa.filter(r => r.keyNum === 'pl').length; if (pl !== plPer(a)) flag(`author ${a}`, `key plural in ${pl} of ${aa.length} agreement items (table ${plPer(a)})`)
  const wantB = Object.entries(T).filter(([s, r]) => s[0] === a && r[0] === 'punct').length, wantP = Object.entries(T).filter(([s, r]) => s[0] === a && r[0] === 'poss').length
  if (ar.filter(r => r.isPunct).length !== wantB) flag(`author ${a}`, `${ar.filter(r => r.isPunct).length} boundary items (table ${wantB})`)
  if (ar.filter(r => r.isPoss).length !== wantP) flag(`author ${a}`, `${ar.filter(r => r.isPoss).length} possessive-noun items (table ${wantP})`)
  const fc = {}; for (const r of aa) fc[r.keyForm] = (fc[r.keyForm] ?? 0) + 1
  for (const [f, c] of Object.entries(fc)) if (c > 1) flag(`author ${a}`, `key form "${f}" used ${c} times (once allowed)`)
  const gc = {}; for (const r of aa) if (r.grid) gc[r.grid] = (gc[r.grid] ?? 0) + 1
  for (const [g, c] of Object.entries(gc)) if (c > 1) flag(`author ${a}`, `grid ${g} used ${c} times (once allowed)`)
  if (ar.filter(r => r.keyLongest).length > 3) flag(`author ${a}`, `key uniquely longest in ${ar.filter(r => r.keyLongest).length} (max 3 of 10)`)
  if (ar.filter(r => r.keyShortest).length > 3) flag(`author ${a}`, `key uniquely shortest in ${ar.filter(r => r.keyShortest).length} (max 3 of 10)`)
  if (ar.length > 1 && ar.every(r => r.blankLast)) flag(`author ${a}`, 'the blank is in the last sentence of every item')
}
for (const [f, l] of Object.entries(formCount)) if (l.length > 2) flag('batch', `key form "${f}" used ${l.length} times (max 2): ${l.join(' ')}`)
for (const [g, l] of Object.entries(gridCount)) if (l.length > 2) flag('batch', `option shape ${g} used ${l.length} times (max 2, NEW v25): ${l.join(' ')}`)
if (rows.filter(r => r.keyLongest).length > 10) flag('batch', `key uniquely longest in ${rows.filter(r => r.keyLongest).length} (max 10)`)
if (rows.filter(r => r.keyShortest).length > 10) flag('batch', `key uniquely shortest in ${rows.filter(r => r.keyShortest).length} (max 10)`)
const v26 = rows.filter(r => r.slot).length
if (v26 && v26 !== n) flag('batch', `${v26} of ${n} ids are ${PREFIX} table slots; the rest were not checked against the table`)
if (!v26) console.log(`\n(no ${PREFIX} ids: construction-table rows not checked)`)
// (v24) shared complement words must differ across the i|j and i|r items
const sw = {}; for (const r of A) if (SHARED_WORD_SLOTS.has(r.slot) && r.sharedSuf) (sw[r.sharedSuf] ??= []).push(r.id)
for (const [w, l] of Object.entries(sw)) if (l.length > 1) flag('batch', `shared complement "${w}" used in ${l.join(' ')} (must differ)`)

console.log(`\nFLAGS (brief quotas, ${flags.length})`)
for (const f of flags) console.log(`  ${f}`)
console.log(`\nNOTES for a hand read (${notes.length}; do not change the exit code)`)
for (const m of notes) console.log(`  ${m}`)
const missed = bars.filter(b => b.ok !== true)
console.log(`\nVERDICT: ${bars.length - missed.length}/${bars.length} prereg bars met${missed.length ? ` (not met: ${missed.map(b => b.name + (b.ok === null ? ' [NOT MEASURED]' : '')).join('; ')})` : ''}; ${flags.length} quota flag(s). Regex classifications: read the printed options before quoting any count.`)
process.exit(missed.length || flags.length ? 1 : 0)
