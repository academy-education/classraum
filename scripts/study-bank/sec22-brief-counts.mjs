#!/usr/bin/env node
/**
 * sec22-brief-counts.mjs <frozen batch.json> [--decl <declarations.json>[,<more.json>...]]
 *
 * The decidable counts of PREREG-SEC22-2026-10-23.md ("Decidable counts", the
 * Balances table, rules 1-6 and 10, the pre-flight drop), computed from the
 * option TEXT and passage TEXT of the frozen file, not from the authors'
 * reports. Written before any v22 item existed; the v17 analogue is
 * sec17-brief-counts.mjs.
 *
 * INPUTS
 *   batch   JSON array of items {id, passage, choices[4], correct_answer, ...}.
 *   --decl  the authors' declarations (sat-sec-v22-work/<X>/declarations.json),
 *           one or more files, concatenated. Only the fields the brief defines
 *           are read: id, near_noun{word,number}, after_noun_within_8 (or null),
 *           misleader_position, true_subject_head, decider_quote, voice_device,
 *           grid.code, key_letter, key_number. Their id SET must equal the
 *           batch's id set exactly. Without --decl the Key x Near quantities are
 *           printed NOT MEASURED, never estimated, and the run cannot pass.
 *
 * HOW OPTIONS ARE CLASSIFIED (all printed per option for a human read)
 *   Tokens shared by all four options at the START, and non-verb tokens shared
 *   at the END (a shared determiner "the", a shared complement), are set aside.
 *   Adverbs (-ly, now/still/once/...) are pulled out as EXTRA words. What
 *   remains is parsed into the brief's grid codes:
 *     a V-s/V  b is/are V-ing  c is/are V-en  d has/have V-en  e has/have been V-en
 *     f has/have been V-ing  g was/were V-ing  h was/were V-en  i was/were  j is/are
 *     k is/are being V-en  l was/were being V-en  m does/do  n has/have  r has/have been
 *   plus non-grid forms: p (simple past), had, modal, did, ? (unparsed).
 *   Number: is/was/has/does/V-s = sg; are/were/have/do/V = pl; others none.
 *   "V-en" is a participle regex plus an irregular list, so a complement such
 *   as "open" can read as a participle: that is why every parse is printed.
 *
 * DEFINITIONS USED FOR THE COUNTS
 *   agreement item   some option carries number. Key number = the key's own
 *                    number, or, if the key is unmarked (e.g. "had V-en"), the
 *                    single number every marked option shares (printed
 *                    "inferred"). This is what makes v17 read 10 sg of 15.
 *   voice-varying    options include a passive (c e h k l) and a non-passive form
 *   aspect item      options include a perfect (d e f r, or had + V-en) and a
 *                    non-perfect form, and the item is not voice-varying
 *   tense / progressive / aux   only for complete 2x2 grids: the one feature in
 *                    which the two codes differ (voice first, then perfect, then
 *                    present/past, then progressive; m|n is aux)
 *   banned adverbial the prereg rule 2 list anywhere in the passage, plus
 *                    now/still/already/yet/once in the blank's own sentence.
 *                    EVERY "since" is counted (causal ones too: a regex cannot
 *                    tell "since" = because from temporal "since"); its context
 *                    is printed so a human can read it.
 *   tell 2 replay    a banned time word in the passage AND a perfect key: the
 *                    v17 tell itself ("since/to the present means perfect").
 *
 * EXIT
 *   2  refused: unreadable or empty batch, an item without 4 choices or whose
 *      key is not among its choices, a passage without exactly one blank, an
 *      unreadable declarations file, or declaration ids that differ from the
 *      batch's ids.
 *   1  computed, and at least one prereg bar MISSED / NOT MEASURED or one brief
 *      quota FLAGGED.
 *   0  computed and everything met.
 * Hand-read NOTES (printed years, banned-trap phrases) never change the exit.
 * A count missed on the frozen file is RECORDED, not repaired (prereg).
 */
import { readFileSync } from 'node:fs'

const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const args = process.argv.slice(2)
let file = null; const declFiles = []
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--decl') { const v = args[++i]; if (!v) die('--decl needs a path'); declFiles.push(...v.split(',').filter(Boolean)) }
  else if (args[i].startsWith('--')) die(`unknown flag ${args[i]}`)
  else if (file) die(`one batch file only (got ${file} and ${args[i]})`)
  else file = args[i]
}
if (!file) { console.error('usage: sec22-brief-counts.mjs <batch.json> [--decl a.json,b.json,c.json]'); process.exit(2) }
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

/* ---------- the construction table (PREREG-SEC22, verbatim values) ---------- */
// slot: [keyNum, near, pos, dimension, dimKey, grid, keyCode, letter, after, device]
const T = {
  A1: ['pl', 'sg', 'adj', 'voice', 'active', 'a|c', 'a', 'C', 'opp', 'D2'],
  A2: ['pl', 'pl', 'early', 'aspect', 'perfect', 'd|g', 'd', 'A', 'agr', null],
  A3: ['sg', 'pl', 'self', 'tense', 'present', 'c|h', 'c', 'D', 'free', null],
  A4: ['sg', 'sg', 'early', 'progressive', 'progressive', 'a|b', 'b', 'B', 'opp', null],
  A5: ['sg', 'sg', 'early', 'voice', 'active', 'g|h', 'g', 'D', 'agr', 'D1'],
  A6: ['pl', 'sg', 'adj', 'voice', 'passive', 'd|e', 'e', 'B', 'free', 'D4'],
  A7: ['sg', 'sg', 'early', 'aspect', 'non-perfect', 'a|d', 'a', 'A', 'opp', null],
  A8: ['pl', 'pl', 'early', 'aspect', 'perfect', 'f|g', 'f', 'C', 'agr', null],
  B1: ['pl', 'sg', 'adj', 'tense', 'past', 'b|g', 'g', 'C', 'agr', null],
  B2: ['pl', 'sg', 'adj', 'voice', 'passive', 'b|k', 'k', 'A', 'opp', 'D3'],
  B3: ['sg', 'pl', 'adj', 'aspect', 'non-perfect', 'b|d', 'b', 'D', 'free', null],
  B4: ['sg', 'sg', 'early', 'aspect', 'non-perfect', 'e|h', 'h', 'B', 'opp', null],
  B5: ['sg', 'sg', 'early', 'aux', 'do-support', 'm|n', 'm', 'A', 'agr', null],
  B6: ['pl', 'pl', 'self', 'aspect', 'non-perfect', 'r|i', 'i', 'D', 'opp', null],
  B7: ['sg', 'pl', 'adj', 'voice', 'active', 'f|e', 'f', 'C', 'free', 'D5'],
  B8: ['pl', 'pl', 'early', 'progressive', 'simple', 'c|k', 'c', 'B', 'agr', null],
  C1: ['sg', 'sg', 'early', 'aspect', 'perfect', 'r|j', 'r', 'B', 'opp', null],
  C2: ['pl', 'sg', 'adj', 'progressive', 'simple', 'd|f', 'd', 'D', 'agr', null],
  C3: ['pl', 'pl', 'early', 'tense', 'past', 'k|l', 'l', 'A', 'free', null],
  C4: ['sg', 'pl', 'adj', 'aspect', 'non-perfect', 'e|c', 'c', 'C', 'opp', null],
  C5: ['pl', 'sg', 'adj', 'voice', 'passive', 'b|c', 'c', 'B', 'free', 'D6'],
  C6: ['sg', 'pl', 'adj', 'aspect', 'perfect', 'f|b', 'f', 'A', 'agr', null],
  C7: ['sg', 'pl', 'adj', 'voice', 'active', 'g|l', 'g', 'D', 'opp', 'D7'],
  C8: ['pl', 'pl', 'early', 'tense', 'present', 'i|j', 'j', 'C', 'agr', null],
}
const slotOf = id => { const m = /^SEC22([ABC])-0([1-8])$/.exec(id); return m ? m[1] + m[2] : null }
const authorOf = id => { const m = /^SEC\d+([A-Z])-\d+$/.exec(id); return m ? m[1] : '?' }

/* ---------- option parser ---------- */
const PART_RE = /^\w+(?:ed|en|wn|ne|lt|pt|ught|id|un|ung|ade|eld|ound|ost|ept|elt|ent)$/
const IRREG = new Set('lain done gone seen born borne worn torn sworn drawn grown known shown thrown blown flown sewn sown mown hewn risen driven written given taken shaken chosen frozen stolen spoken broken woken fallen eaten beaten bitten hidden ridden forgotten gotten begun run sung rung sprung swum drunk sunk shrunk struck stuck hung spun won dug held told sold felt dealt meant kept slept swept wept crept left lost built sent spent bent lent brought bought thought fought sought caught taught made paid laid said read led fed bred fled met set put cut shut hit let spread cast cost hurt burst shed split found bound ground wound stood understood sat lit slid hid bled clung flung swung stung come become overcome'.split(' '))
const isPart = w => w !== 'been' && w !== 'being' && (IRREG.has(w) || PART_RE.test(w))
const ADV = new Set('now still already yet once also then never not ever just always often long soon even again only further first finally evidently rarely seldom thus'.split(' '))
const isAdv = w => ADV.has(w) || (/ly$/.test(w) && w.length > 4 && !['supply', 'apply', 'reply', 'rely', 'fly', 'ally', 'multiply', 'imply', 'comply'].includes(w))
const MODALS = new Set('will would can could may might must shall should ought'.split(' '))
const NUM = { is: 'sg', was: 'sg', has: 'sg', does: 'sg', are: 'pl', were: 'pl', have: 'pl', do: 'pl' }
const toks = s => s.toLowerCase().replace(/[—–]/g, ' ').split(/\s+/).map(w => w.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '')).filter(Boolean)

function parseItem(choices) {
  const T4 = choices.map(toks)
  let pre = 0
  while (T4.every(t => t.length > pre + 1 && t[pre] === T4[0][pre])) pre++
  let suf = 0
  const verbish = w => /ing$/.test(w) || isPart(w) || w in NUM || w === 'been' || w === 'being' || w === 'had' || MODALS.has(w)
  while (T4.every(t => t.length > pre + suf + 1 && t[t.length - 1 - suf] === T4[0][T4[0].length - 1 - suf]) && !verbish(T4[0][T4[0].length - 1 - suf])) suf++
  const shared = { pre: T4[0].slice(0, pre), suf: T4[0].slice(T4[0].length - suf) }
  const cores = T4.map(t => t.slice(pre, t.length - suf))
  const singles = new Set(cores.filter(c => c.length === 1).map(c => c[0]))
  const parsed = cores.map(core => {
    const extras = core.filter(w => isAdv(w))
    const t = core.filter(w => !isAdv(w))
    const out = (code, number, used) => ({ code, number, extras: extras.concat(t.slice(used)), core })
    if (t.length === 0) return out('?', null, 0)
    const [w0, w1, w2] = t
    if (w0 === 'had') return out('had', null, t.length)
    if (w0 === 'did') return out('did', null, t.length)
    if (MODALS.has(w0)) return out('modal', null, t.length)
    if (w0 === 'is' || w0 === 'are' || w0 === 'was' || w0 === 'were') {
      const pres = w0 === 'is' || w0 === 'are'
      if (!w1) return out(pres ? 'j' : 'i', NUM[w0], 1)
      if (w1 === 'being' && w2 && isPart(w2)) return out(pres ? 'k' : 'l', NUM[w0], 3)
      if (/ing$/.test(w1) && w1 !== 'being') return out(pres ? 'b' : 'g', NUM[w0], 2)
      if (isPart(w1)) return out(pres ? 'c' : 'h', NUM[w0], 2)
      return out(pres ? 'j' : 'i', NUM[w0], 1)
    }
    if (w0 === 'has' || w0 === 'have') {
      if (!w1) return out('n', NUM[w0], 1)
      if (w1 === 'been') {
        if (!w2) return out('r', NUM[w0], 2)
        if (/ing$/.test(w2) && w2 !== 'being') return out('f', NUM[w0], 3)
        if (isPart(w2)) return out('e', NUM[w0], 3)
        return out('r', NUM[w0], 2)
      }
      if (isPart(w1)) return out('d', NUM[w0], 2)
      return out('n', NUM[w0], 1)
    }
    if (w0 === 'does' || w0 === 'do') return out('m', NUM[w0], w1 && !isPart(w1) && !/ing$/.test(w1) ? 2 : 1)
    if (t.length >= 1) {
      if (/ing$/.test(w0)) return out('?', null, 0)
      const base = [w0.replace(/ies$/, 'y'), w0.replace(/es$/, ''), w0.replace(/s$/, '')]
      if (/s$/.test(w0) && !/ss$/.test(w0) && base.some(b => b !== w0 && singles.has(b))) return out('a', 'sg', 1)
      if ([w0 + 's', w0 + 'es', w0.replace(/y$/, 'ies')].some(x => x !== w0 && singles.has(x))) return out('a', 'pl', 1)
      if (/ed$/.test(w0)) return out('p', null, 1)
      if (/s$/.test(w0) && !/ss$/.test(w0)) return out('a', 'sg', 1)
      return out('a', 'pl', 1)
    }
    return out('?', null, 0)
  })
  return { shared, parsed }
}

/* code features for the 2x2 dimension */
const F = {
  a: ['pres', 'act', 'simp'], b: ['pres', 'act', 'prog'], c: ['pres', 'pass', 'simp'], d: ['perf', 'act', 'simp'],
  e: ['perf', 'pass', 'simp'], f: ['perf', 'act', 'prog'], g: ['past', 'act', 'prog'], h: ['past', 'pass', 'simp'],
  i: ['past', 'act', 'simp'], j: ['pres', 'act', 'simp'], k: ['pres', 'pass', 'prog'], l: ['past', 'pass', 'prog'],
  m: ['pres', 'aux', 'simp'], n: ['pres', 'aux', 'simp'], r: ['perf', 'act', 'simp'],
}
const PASSIVE = new Set(['c', 'e', 'h', 'k', 'l'])
const PERFECT = new Set(['d', 'e', 'f', 'r'])
function dimension(c1, c2) {
  const [x, y] = [F[c1], F[c2]]
  if (['m', 'n'].includes(c1) || ['m', 'n'].includes(c2)) return 'aux'
  if (PASSIVE.has(c1) !== PASSIVE.has(c2)) return 'voice'
  if (PERFECT.has(c1) !== PERFECT.has(c2)) return 'aspect'
  if (x[0] !== y[0]) return 'tense'
  if (x[2] !== y[2]) return 'progressive'
  return '?'
}
function dimKey(dim, code) {
  return { voice: PASSIVE.has(code) ? 'passive' : 'active', aspect: PERFECT.has(code) ? 'perfect' : 'non-perfect',
    tense: F[code]?.[0] === 'past' ? 'past' : 'present', progressive: F[code]?.[2] === 'prog' ? 'progressive' : 'simple',
    aux: code === 'm' ? 'do-support' : 'have' }[dim] ?? '?'
}
const sameGrid = (g1, g2) => g1.split('|').sort().join('|') === g2.split('|').sort().join('|')
const FORM = { a: ['V-s', 'V'], b: ['is V-ing', 'are V-ing'], c: ['is V-en', 'are V-en'], d: ['has V-en', 'have V-en'], e: ['has been V-en', 'have been V-en'], f: ['has been V-ing', 'have been V-ing'], g: ['was V-ing', 'were V-ing'], h: ['was V-en', 'were V-en'], i: ['was', 'were'], j: ['is', 'are'], k: ['is being V-en', 'are being V-en'], l: ['was being V-en', 'were being V-en'], m: ['does', 'do'], n: ['has', 'have'], r: ['has been C', 'have been C'] }
const formName = (code, num) => FORM[code] ? FORM[code][num === 'pl' ? 1 : 0] : `${code}${num ? ':' + num : ''}`

/* ---------- passage scans ---------- */
const BANNED_ANY = [
  ['since', /\bsince\b/gi], ['to this day', /\bto this day\b/gi], ['to the present', /\bto the present\b/gi],
  ['until now', /\buntil now\b/gi], ['so far', /\bso far\b/gi], ['thus far', /\bthus far\b/gi], ['to date', /\bto date\b/gi],
  ['up to now', /\bup to now\b/gi], ['for the past/last N', /\bfor the (?:past|last)\b/gi], ['in recent years/decades', /\bin recent (?:years|decades)\b/gi],
  ['lately', /\blately\b/gi], ['recently', /\brecently\b/gi], ['nowadays', /\bnowadays\b/gi], ['at present', /\bat present\b/gi], ['currently', /\bcurrently\b/gi],
  // Amendment 1 (2026-10-23): duration anchors B-03 used that the first list missed
  ['for more than', /\bfor (?:more|over|nearly|almost) (?:than )?(?:a |an |\d+ |two |three |several |many )?(?:century|centuries|decade|decades|year|years|generation|generations)\b/gi],
  ['over the past', /\bover the (?:past|last)\b/gi], ['throughout', /\bthroughout\b/gi], ['across those/these', /\bacross (?:those|these|the) (?:decades|years|centuries)\b/gi],
]
const BANNED_BLANK_SENT = ['now', 'still', 'already', 'yet', 'once']
const TRAP_PHRASES = ['one of the', 'none of', 'neither of', 'the number of', 'a series of', 'a pair of', 'including', 'such as', 'insist', 'require that', 'requires that', 'required that', 'data', 'media', 'either', 'not only', 'more than one', 'the only one', 'not until', 'not just', 'every', 'whom', "n't"]
const sentences = p => p.split(/(?<=[.!?]["”]?)\s+(?=["“]?[A-Z])/)
const words = s => s.split(/\s+/).map(w => w.replace(/^[^A-Za-z0-9_']+|[^A-Za-z0-9_']+$/g, '').toLowerCase()).filter(Boolean)

/* ---------- per item ---------- */
const rows = []
const flags = []   // brief-quota failures (exit 1)
const notes = []   // hand-read notes (no exit effect)
const flag = (id, m) => flags.push(`${id}: ${m}`)
for (const it of items) {
  const ch = it.choices, k = ch.indexOf(it.correct_answer)
  const stripP = c => c.toLowerCase().replace(/[.,;:—–"'()-]/g, ' ').replace(/\s+/g, ' ').trim()
  const isPunct = new Set(ch.map(stripP)).size === 1
  const { shared, parsed } = isPunct ? { shared: { pre: [], suf: [] }, parsed: ch.map(c => ({ code: 'punct', number: null, extras: [], core: [] })) } : parseItem(ch)
  const kp = parsed[k]
  const marked = parsed.filter(p => p.number)
  let keyNum = kp.number, inferred = false
  if (!keyNum && marked.length && new Set(marked.map(p => p.number)).size === 1) { keyNum = marked[0].number; inferred = true }
  const agreement = marked.length > 0
  const codes = parsed.map(p => p.code)
  const voiceVarying = codes.some(c => PASSIVE.has(c)) && codes.some(c => !PASSIVE.has(c))
  const perfOf = (p) => PERFECT.has(p.code) || (p.code === 'had' && p.core.length >= 2 && (isPart(p.core[p.core.length - 1]) || p.core.includes('been')))
  const aspectItem = !voiceVarying && parsed.some(perfOf) && parsed.some(p => !perfOf(p))
  // 2x2 completeness
  const distinct = [...new Set(codes)]
  const why = []
  if (isPunct) why.push('a punctuation item (options differ only in punctuation)')
  if (new Set(ch).size !== 4) why.push('duplicate options')
  if (distinct.length !== 2) why.push(`${distinct.length} distinct forms (${distinct.join(',')})`)
  for (const c of distinct) { const ns = parsed.filter(p => p.code === c).map(p => p.number).sort().join(','); if (ns !== 'pl,sg') why.push(`form ${c} has numbers [${ns}]`) }
  if (codes.some(c => !F[c])) why.push('non-grid form')
  if (parsed.some(p => p.extras.length)) why.push('leftover words')
  const lex = parsed.flatMap(p => p.core.filter(w => !(w in NUM) && w !== 'been' && w !== 'being' && !isAdv(w)))
  if (lex.length) { const stem = lex.reduce((a, w) => { let i = 0; while (i < a.length && a[i] === w[i]) i++; return a.slice(0, i) }); if (stem.length < 3) why.push(`lexical forms share no 3-letter stem (${[...new Set(lex)].join(',')})`) }
  const complete = why.length === 0
  const grid = complete ? distinct.slice().sort().join('|') : null
  const dim = complete ? dimension(distinct[0], distinct[1]) : null
  const dkey = complete ? dimKey(dim, kp.code) : null
  // option words: number-normalised tokens absent from the other three
  const norm = parsed.map(p => {
    const lexSingles = new Set(parsed.filter(q => q.core.length === 1).map(q => q.core[0]))
    return p.core.map(w => ({ is: 'BE1', are: 'BE1', was: 'BE2', were: 'BE2', has: 'HAVE', have: 'HAVE', does: 'DO', do: 'DO' })[w]
      ?? ((/s$/.test(w) && [w.replace(/ies$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, '')].find(b => b !== w && lexSingles.has(b))) || w))
  })
  const extraWord = norm.map((ws, i) => ws.filter(w => norm.every((o, j) => j === i || !o.includes(w))))
  const allWords = ch.map(toks)
  const bannedOpt = ch.map((c, i) => allWords[i].filter(w => w === 'had' || MODALS.has(w) || isAdv(w)))
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
  for (const [name, re] of BANNED_ANY) for (const m of p.matchAll(re)) {
    const ctx = p.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).replace(/\s+/g, ' ')
    let kind = name
    if (name === 'since') {
      const before = p.slice(0, m.index).trim().split(/\s+/).pop()?.toLowerCase().replace(/[^a-z]/g, '')
      kind = /^ever$/.test(before) ? 'ever since' : ['has', 'have', 'had', 'is', 'are', 'was', 'were'].includes(before) ? 'since (aux + since: temporal)' : 'since (HAND READ: temporal or causal)'
    }
    banned.push({ kind, ctx })
  }
  for (const w of words(bsent)) if (BANNED_BLANK_SENT.includes(w)) banned.push({ kind: `"${w}" in the blank's sentence`, ctx: bsent.slice(0, 120) })
  const years = p.match(/\b(1[0-9]{3}|20[0-9]{2})s?\b/g) || []
  if (years.length) notes.push(`${it.id}: printed year(s) ${years.join(', ')}: hand-read whether one settles tense`)
  const lowerP = ' ' + p.toLowerCase() + ' '
  const traps = TRAP_PHRASES.filter(ph => new RegExp(`(^|[^a-z])${ph.replace(/[.*+?^${}()|[\]\\']/g, '\\$&')}([^a-z]|$)`).test(lowerP))
  if (traps.length) notes.push(`${it.id}: banned-trap phrase(s) present, hand-read: ${traps.map(t => `"${t}"`).join(', ')}`)
  // blank neighbourhood
  const [pre, post] = p.split(/_{3,}/)
  const preW = words(pre), postW = words(post)
  const wBefore = preW[preW.length - 1] ?? '', wAfter = postW[0] ?? ''
  const preflightDrop = []
  if (wBefore && ch.every(c => toks(c)[0] === wBefore)) preflightDrop.push(`word before the blank "${wBefore}" opens every option`)
  if (wAfter && ch.every(c => toks(c).at(-1) === wAfter)) preflightDrop.push(`word after the blank "${wAfter}" closes every option`)
  const doubled = wBefore && ch.some(c => toks(c)[0] === wBefore) && !preflightDrop.length ? `an option repeats "${wBefore}"` : null
  const interrupterAfter = /^\s*[,—–(]|^\s*-{1,2}\s/.test(post)

  const slot = slotOf(it.id)
  const r = { id: it.id, slot, author: authorOf(it.id), key: 'ABCD'[k], k, keyNum, inferred, agreement, voiceVarying, aspectItem,
    passiveKey: PASSIVE.has(kp.code), perfectKey: perfOf(kp), complete, grid, dim, dkey, keyCode: kp.code,
    keyForm: isPunct ? `punct "${ch[k]}"` : formName(kp.code, kp.number), isPunct, ratio, keyLongest, keyShortest,
    beenItem: ch.some(c => /\bbeen\b/i.test(c)), beenKey: /\bbeen\b/i.test(ch[k]), beingItem: ch.some(c => /\bbeing\b/i.test(c)), beingKey: /\bbeing\b/i.test(ch[k]),
    banned, extraWord, bannedOpt, preflightDrop, blankLast: bi === sents.length - 1, interrupterAfter, preW, postW }
  rows.push(r)

  // per-item brief checks
  if (!complete) flag(it.id, `options are not a complete 2x2 (${why.join('; ')})`)
  if (ratio >= 1.6) flag(it.id, `key/shortest length ratio ${ratio.toFixed(2)} >= 1.6`)
  extraWord.forEach((ws, i) => { if (ws.length) flag(it.id, `option ${'ABCD'[i]} "${ch[i]}" has word(s) the other three lack: ${ws.join(', ')}`) })
  bannedOpt.forEach((ws, i) => { if (ws.length) flag(it.id, `option ${'ABCD'[i]} "${ch[i]}" carries banned option content: ${ws.join(', ')}`) })
  for (const d of preflightDrop) flag(it.id, `PRE-FLIGHT DROP: ${d}`)
  if (doubled) notes.push(`${it.id}: ${doubled} (doubled_word candidate; hand-read)`)
  if (interrupterAfter && slot !== 'B7') flag(it.id, 'an interrupter mark follows the blank immediately (allowed only in B7)')

  // table row
  if (slot) {
    const [tNum, , , tDim, tKey, tGrid, tCode, tLetter] = T[slot]
    if (keyNum !== tNum) flag(it.id, `table ${slot}: key number ${keyNum} (row ${tNum})`)
    if (!grid || !sameGrid(grid, tGrid)) flag(it.id, `table ${slot}: grid ${grid ?? 'incomplete'} (row ${tGrid})`)
    if (kp.code !== tCode) flag(it.id, `table ${slot}: key form ${formName(kp.code, kp.number)} (row ${formName(tCode, tNum)})`)
    if (r.key !== tLetter) flag(it.id, `table ${slot}: key letter ${r.key} (row ${tLetter})`)
    if (dim && (dim !== tDim || dkey !== tKey)) flag(it.id, `table ${slot}: 2nd dimension ${dim}:${dkey} (row ${tDim}:${tKey})`)
  }
  // declarations
  if (decl) {
    const d = decl[it.id]
    r.near = d.near_noun?.number ?? null
    r.nearWord = d.near_noun?.word ?? null
    r.after = d.after_noun_within_8 == null ? null : d.after_noun_within_8.number ?? null
    r.afterWord = d.after_noun_within_8?.word ?? null
    r.pos = d.misleader_position ?? null
    if (!['sg', 'pl'].includes(r.near)) flag(it.id, `declaration near_noun.number is ${JSON.stringify(r.near)}`)
    if (d.key_letter && d.key_letter !== r.key) flag(it.id, `declared key_letter ${d.key_letter}, file has ${r.key}`)
    if (d.key_number && d.key_number !== keyNum) flag(it.id, `declared key_number ${d.key_number}, options read ${keyNum}`)
    if (d.grid?.code && grid && !sameGrid(d.grid.code, grid)) flag(it.id, `declared grid ${d.grid.code}, options read ${grid}`)
    const has = w => w && p.toLowerCase().includes(String(w).toLowerCase())
    if (r.nearWord && !preW.slice(-4).includes(String(r.nearWord).toLowerCase().split(/\s+/).pop())) flag(it.id, `declared near noun "${r.nearWord}" is not among the 4 words before the blank`)
    if (r.afterWord) { const ai = postW.indexOf(String(r.afterWord).toLowerCase().split(/\s+/).pop()); if (ai < 0 || ai >= 8) flag(it.id, `declared after-noun "${r.afterWord}" is not within 8 words after the blank`) }
    for (const w of d.misleader_words ?? []) if (!has(w)) flag(it.id, `declared misleader "${w}" not in passage`)
    if (slot) {
      const [, tNear, tPos, , , , , , tAfter, tDev] = T[slot]
      if (r.near && r.near !== tNear) flag(it.id, `table ${slot}: Near ${r.near} (row ${tNear})`)
      if (r.pos && r.pos !== tPos) flag(it.id, `table ${slot}: misleader position ${r.pos} (row ${tPos})`)
      const afterRel = r.after == null ? null : r.after === keyNum ? 'agr' : 'opp'
      if (tAfter !== 'free' && afterRel !== tAfter) flag(it.id, `table ${slot}: After ${afterRel ?? 'none'} (row ${tAfter})`)
      if ((d.voice_device ?? null) !== tDev) flag(it.id, `table ${slot}: voice device ${d.voice_device ?? null} (row ${tDev})`)
      if (slot === 'B5' || slot === 'C8') {
        const hi = postW.indexOf(String(d.true_subject_head ?? '').toLowerCase())
        if (hi < 4) flag(it.id, `inversion: subject head "${d.true_subject_head}" is ${hi < 0 ? 'not found' : `word ${hi + 1}`} after the blank (needs 5+)`)
      }
    }
  }

  // print
  const tag = [
    `key ${r.key} ${r.keyForm}${agreement ? ` [${keyNum ?? '?'}${inferred ? ' inferred' : ''}]` : ' [no number]'}`,
    complete ? `grid ${grid} ${dim}:${dkey}` : 'grid INCOMPLETE',
    voiceVarying ? `voice-varying, key ${r.passiveKey ? 'PASSIVE' : 'active'}` : null,
    aspectItem ? `aspect, key ${r.perfectKey ? 'PERFECT' : 'non-perfect'}` : null,
    decl ? `Near ${r.near ?? '?'} (${r.nearWord ?? '-'}), After ${r.after ?? 'none'} (${r.afterWord ?? '-'})` : null,
  ].filter(Boolean).join(' | ')
  console.log(`${it.id}${slot ? ` (${slot})` : ''}  ${tag}`)
  if (shared.pre.length || shared.suf.length) console.log(`     shared by all four: prefix [${shared.pre.join(' ')}] suffix [${shared.suf.join(' ')}]`)
  ch.forEach((c, i) => {
    const q = parsed[i]
    console.log(`     ${'ABCD'[i]}${i === k ? '*' : ' '} ${(q.code + (q.number ? ':' + q.number : '')).padEnd(9)} ${PASSIVE.has(q.code) ? '[pass]' : '      '} ${perfOf(q) ? '[perf]' : '      '} ${c}${q.extras.length ? `   extra: ${q.extras.join(' ')}` : ''}`)
  })
  for (const b of banned) console.log(`     banned: ${b.kind}  ...${b.ctx}...`)
}

/* ---------- batch counts ---------- */
const n = rows.length
const pct = (a, b) => b ? `${a}/${b} = ${(100 * a / b).toFixed(1)}%` : '0/0'
const bars = []
const bar = (name, ok, text) => { bars.push({ name, ok }); console.log(`  [${ok === null ? 'NOT MEASURED' : ok ? 'MET' : 'MISSED'}] ${name}: ${text}`) }
const A = rows.filter(r => r.agreement)
const sgK = A.filter(r => r.keyNum === 'sg').length, plK = A.filter(r => r.keyNum === 'pl').length
const V = rows.filter(r => r.voiceVarying), Vp = V.filter(r => r.passiveKey)
const S = rows.filter(r => r.aspectItem), Sp = S.filter(r => r.perfectKey)
const between = (a, b, lo, hi) => b > 0 && a / b >= lo - 1e-9 && a / b <= hi + 1e-9

console.log(`\n${n} items read from ${file}${decl ? `; declarations for all ${Object.keys(decl).length} ids from ${declFiles.join(', ')}` : '; NO declarations given'}`)
console.log(`agreement items (some option carries number): ${A.length} of ${n}; key singular ${sgK}, plural ${plK}${A.some(r => r.inferred) ? ` (inferred from distractors: ${A.filter(r => r.inferred).map(r => r.id).join(' ')})` : ''}`)

console.log('\nPREREG BARS')
bar('key plural 10-14 of 24', n === 24 && plK >= 10 && plK <= 14, `${plK} plural of ${A.length} agreement items, batch n=${n}${n !== 24 ? ' (bar is defined for 24)' : ''}`)
if (decl) {
  const cells = { 'pl/pl': 0, 'pl/sg': 0, 'sg/pl': 0, 'sg/sg': 0 }
  for (const r of A) if (r.keyNum && r.near) cells[`${r.keyNum}/${r.near}`]++
  bar('each Key x Near cell 4-8', Object.values(cells).every(v => v >= 4 && v <= 8), `${JSON.stringify(cells)} (Key/Near; Near from declarations: hand-read the printed Near words)`)
} else bar('each Key x Near cell 4-8', null, 'needs --decl (Near is read from the declarations); no number printed')
bar('passive key in 1/3..1/2 of voice-varying items', between(Vp.length, V.length, 1 / 3, 1 / 2), `${pct(Vp.length, V.length)}  (${V.map(r => r.id + (r.passiveKey ? ':P' : ':a')).join(' ') || 'none'})`)
bar('perfect key in 1/3..1/2 of aspect items', between(Sp.length, S.length, 1 / 3, 1 / 2), `${pct(Sp.length, S.length)}  (${S.map(r => r.id + (r.perfectKey ? ':PERF' : ':non')).join(' ') || 'none'})`)
const bannedRows = rows.filter(r => r.banned.length)
const bannedN = rows.reduce((a, r) => a + r.banned.length, 0)
bar('0 banned adverbials', bannedN === 0, `${bannedN} hit(s) in ${bannedRows.length} of ${n} passages  (${bannedRows.map(r => `${r.id}[${r.banned.map(b => b.kind.replace(/ \(.*\)$/, '')).join(',')}]`).join(' ') || 'none'})`)
const extraRows = rows.filter(r => r.extraWord.some(w => w.length))
bar('0 extra-word options', extraRows.length === 0, `${rows.reduce((a, r) => a + r.extraWord.filter(w => w.length).length, 0)} option(s) in ${extraRows.length} of ${n} items  (${extraRows.map(r => r.id).join(' ') || 'none'})`)

console.log('\nBALANCES (the prereg table; quota failures are listed under FLAGS)')
const T2 = rows.filter(r => r.banned.length)
console.log(`  tell 2 replay (banned time word AND perfect key): ${T2.filter(r => r.perfectKey).map(r => r.id).join(' ') || 'none'}; banned word with a NON-perfect key: ${T2.filter(r => !r.perfectKey).map(r => r.id).join(' ') || 'none'}`)
if (decl) {
  const withPl = A.filter(r => r.near === 'pl'), heurB = withPl.filter(r => r.keyNum === 'sg').length
  const heurA = A.filter(r => r.near && r.keyNum && r.near !== r.keyNum).length
  const aft = { opp: 0, agr: 0, none: 0 }; for (const r of A) aft[r.after == null ? 'none' : r.after === r.keyNum ? 'agr' : 'opp']++
  const posC = {}; for (const r of rows) posC[r.pos ?? '?'] = (posC[r.pos ?? '?'] ?? 0) + 1
  console.log(`  "plural noun just before the blank means singular key": holds in ${heurB} of ${withPl.length} items with a plural Near   [table: 6 of 12]`)
  console.log(`  "pick the number opposite the nearest noun": solves ${heurA} of ${A.length}   [table: 12 of 24]`)
  console.log(`  after-blank noun vs key number: ${JSON.stringify(aft)}   [table: opp 9, agr 9, free 6]`)
  console.log(`  misleader position: ${JSON.stringify(posC)}   [table: adj 11, early 11, self 2]`)
} else console.log('  Near-based heuristics, After and misleader position: NOT MEASURED (no --decl)')
const dims = {}; for (const r of rows) if (r.dim) { dims[r.dim] ??= { n: 0, keys: {} }; dims[r.dim].n++; dims[r.dim].keys[r.dkey] = (dims[r.dim].keys[r.dkey] ?? 0) + 1 }
console.log(`  complete 2x2 grids: ${rows.filter(r => r.complete).length} of ${n}; by 2nd dimension: ${Object.entries(dims).map(([d, v]) => `${d} ${v.n} ${JSON.stringify(v.keys)}`).join('; ') || 'none'}   [table: voice 7 (3 passive), aspect 9 (4 perfect), tense 4 (2 past), progressive 3 (1 progressive), aux 1]`)
console.log(`  options containing "been": ${rows.filter(r => r.beenItem).length} items, keyed ${rows.filter(r => r.beenKey).length}   [table: 9, keyed 5]`)
console.log(`  options containing "being": ${rows.filter(r => r.beingItem).length} items, keyed ${rows.filter(r => r.beingKey).length}   [table: 4, keyed 2]`)
const authors = [...new Set(rows.map(r => r.author))].sort()
const letters = Object.fromEntries('ABCD'.split('').map(L => [L, rows.filter(r => r.key === L).length]))
console.log(`  key letters batch ${JSON.stringify(letters)}; per author ${authors.map(a => `${a}:${'ABCD'.split('').map(L => rows.filter(r => r.author === a && r.key === L).length).join('/')}`).join('  ')}   [table: 6 each; 2/2/2/2 per author]`)
console.log(`  key plural per author: ${authors.map(a => `${a} ${rows.filter(r => r.author === a && r.keyNum === 'pl').length}/${rows.filter(r => r.author === a).length}`).join('  ')}   [4 of 8 each]`)
const formCount = {}; for (const r of rows) formCount[r.keyForm] = (formCount[r.keyForm] ?? []).concat(r.id)
console.log(`  key forms: ${Object.entries(formCount).sort((a, b) => b[1].length - a[1].length).map(([f, l]) => `"${f}" x${l.length}`).join(', ')}`)
console.log(`  key length: max ratio ${Math.max(...rows.map(r => r.ratio)).toFixed(2)}; uniquely longest ${rows.filter(r => r.keyLongest).length}/${n} (${authors.map(a => `${a}:${rows.filter(r => r.author === a && r.keyLongest).length}`).join(' ')}), uniquely shortest ${rows.filter(r => r.keyShortest).length}/${n} (${authors.map(a => `${a}:${rows.filter(r => r.author === a && r.keyShortest).length}`).join(' ')})`)
console.log(`  options with had/modal/adverb: ${rows.filter(r => r.bannedOpt.some(w => w.length)).map(r => r.id).join(' ') || 'none'}   [table: 0]`)

// batch-level quota flags
for (const L of 'ABCD') if (n === 24 && letters[L] !== 6) flag('batch', `key letter ${L} keyed ${letters[L]} times (6 required)`)
for (const a of authors) {
  const ar = rows.filter(r => r.author === a)
  for (const L of 'ABCD') { const c = ar.filter(r => r.key === L).length; if (c !== 2) flag(`author ${a}`, `key letter ${L} keyed ${c} times (2 required)`) }
  const pl = ar.filter(r => r.keyNum === 'pl').length; if (pl !== 4) flag(`author ${a}`, `key plural in ${pl} of ${ar.length} (4 required)`)
  const fc = {}; for (const r of ar) fc[r.keyForm] = (fc[r.keyForm] ?? 0) + 1
  for (const [f, c] of Object.entries(fc)) if (c > 1) flag(`author ${a}`, `key form "${f}" used ${c} times (once allowed)`)
  if (ar.filter(r => r.keyLongest).length > 2) flag(`author ${a}`, `key uniquely longest in ${ar.filter(r => r.keyLongest).length} (max 2)`)
  if (ar.filter(r => r.keyShortest).length > 2) flag(`author ${a}`, `key uniquely shortest in ${ar.filter(r => r.keyShortest).length} (max 2)`)
  if (ar.length > 1 && ar.every(r => r.blankLast)) flag(`author ${a}`, 'the blank is in the last sentence of every item')
}
for (const [f, l] of Object.entries(formCount)) if (l.length > 2) flag('batch', `key form "${f}" used ${l.length} times (max 2): ${l.join(' ')}`)
if (rows.filter(r => r.keyLongest).length > 6) flag('batch', `key uniquely longest in ${rows.filter(r => r.keyLongest).length} (max 6)`)
if (rows.filter(r => r.keyShortest).length > 6) flag('batch', `key uniquely shortest in ${rows.filter(r => r.keyShortest).length} (max 6)`)
const v22 = rows.filter(r => r.slot).length
if (v22 && v22 !== n) flag('batch', `${v22} of ${n} ids are SEC22 table slots; the rest were not checked against the table`)
if (!v22) console.log('\n(no SEC22 ids: construction-table rows not checked)')

console.log(`\nFLAGS (brief quotas, ${flags.length})`)
for (const f of flags) console.log(`  ${f}`)
console.log(`\nNOTES for a hand read (${notes.length}; do not change the exit code)`)
for (const m of notes) console.log(`  ${m}`)
const missed = bars.filter(b => b.ok !== true)
console.log(`\nVERDICT: ${bars.length - missed.length}/${bars.length} prereg bars met${missed.length ? ` (not met: ${missed.map(b => b.name + (b.ok === null ? ' [NOT MEASURED]' : '')).join('; ')})` : ''}; ${flags.length} quota flag(s). Regex classifications: read the printed options before quoting any count.`)
process.exit(missed.length || flags.length ? 1 : 0)
