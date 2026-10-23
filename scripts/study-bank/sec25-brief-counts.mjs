#!/usr/bin/env node
/**
 * sec25-brief-counts.mjs <frozen batch.json> [--decl <declarations.json>[,<more.json>...]]
 *
 * The decidable counts of PREREG-SEC25-2026-10-23.md ("Decidable counts", the
 * Balances table, the rules for every item, the pre-flight drop), computed from
 * the option TEXT and passage TEXT of the frozen file, not from the authors'
 * reports. Written before any v25 item existed. COPIED from sec24-brief-counts.mjs;
 * what is new is marked NEW (v25). v24's markers are kept as "(v24)", v23's as "(v23)".
 *
 * NEW (v25), in one place:
 *   - the 32-slot table (4 authors x 8: 27 agreement, 3 boundary, 2 possessive-noun);
 *   - a POSSESSIVE-NOUN item class: one word varies across the four options as
 *     {sg, sg's, pl, pls'}; its key class is checked against the row;
 *   - every agreement row also fixes the pronoun CLASS (possessive/object) of a
 *     pronoun grid, so option shape = grid + class is checked per row;
 *   - "each time"/"every time" count as time expressions;
 *   - the shared adverb "not" is allowed in the three ellipsis rows only;
 *   - declarations carry distractor_pulls (why each wrong option is attractive)
 *     - a WORDING check, not a measurement: an author declares what it already
 *     believes, and the probe and the panel decide;
 *   - boundary/possessive declarations carry decider_quote; for A8, C8 and D8 it
 *     must sit OUTSIDE the blank's sentence (the panel's one hard boundary shape,
 *     SEC24C-08, was decided by another sentence);
 *   - bars re-derived from the v25 table (see the PREREG's Decidable counts).
 *
 * INPUTS
 *   batch   JSON array of items {id, passage, choices[4], correct_answer, ...}.
 *   --decl  the authors' declarations (sat-sec-v25-work/<X>/declarations.json),
 *           one or more files, concatenated. Fields read: id, near_noun{word,number},
 *           first_noun_of_sentence{word,number} (NEW v24: of the SENTENCE, not the
 *           clause), after_noun_within_8 (or null), misleader_position,
 *           true_subject_head, decider_quote (string or array), decider_type
 *           (NEW v24: time-clause | time-phrase | modal | parallel-verb |
 *           conditional | pronoun-antecedent | aux-form), pronoun_antecedent
 *           {word,number} (pronoun slots), key_mark and glance_fail (boundary
 *           slots), grid.code, key_letter, key_number. Their id SET must equal the
 *           batch's id set exactly. Without --decl every declaration-based bar is
 *           printed NOT MEASURED, never estimated, and the run cannot pass.
 *
 * HOW OPTIONS ARE CLASSIFIED (all printed per option for a human read)
 *   BOUNDARY item: the four options are identical once punctuation is removed.
 *     Its key mark is the punctuation the key ADDS (marks every option carries
 *     equally, such as list commas, are discounted): none, comma, semicolon, colon,
 *     dash, period, "dash pair" or "comma pair" (two marks inside the option).
 *   AGREEMENT item: otherwise. (v23) possessive/object pronouns
 *     (its/their/it/them/itself/themselves, NEW v24: that/those) are pulled out first and their number
 *     recorded; an item whose options vary in pronoun number is a PRONOUN item
 *     (grid code "<verb code>+p"). Then, as in v22, tokens shared by all four at
 *     the start, and non-verb tokens shared at the end, are set aside, adverbs are
 *     pulled out as EXTRA words, and the rest is parsed into grid codes:
 *       a V-s/V  b is/are V-ing  c is/are V-en  d has/have V-en  e has/have been V-en
 *       f has/have been V-ing  g was/were V-ing  h was/were V-en  i was/were  j is/are
 *       k is/are being V-en  l was/were being V-en  m does/do  n has/have  r has/have been
 *     plus non-grid forms: p (simple past), had, modal, did, ? (unparsed).
 *
 * DEFINITIONS USED FOR THE COUNTS
 *   agreement item     not a boundary item, and some option carries number
 *   voice-varying      options include a passive (c e h k l) and a non-passive form
 *   simple-vs-prog     NEW: a complete 2x2 whose two forms differ ONLY in progressive
 *   time item          a complete 2x2 whose second dimension is tense or aspect;
 *                      "past key" = a past-tense key (tense), or the non-perfect
 *                      past form of a perfect/past grid (aspect)
 *   banned adverbial   the prereg list anywhere in the passage, plus
 *                      now/still/already/yet/once in the blank's own sentence
 *   decider in blank's sentence  NEW: every fragment of the declared decider_quote
 *                      occurs (case-insensitive) in the sentence containing the blank
 *   time-anchored      NEW v24: decider_type time-clause/time-phrase, or a decider_quote
 *                      containing when/whenever/while/until/till/before/after/ago/once
 *                      or opening with "as"; the larger of the two counts is barred
 *   inversion-like     NEW v24: the declared true_subject_head is 5+ words after the blank
 *   named glance shape NEW v24, NOTE ONLY: a mixed/mismatched pair, a misplaced ("@shifted") mark,
 *                      or a semicolon/colon directly before for/and/nor/but/or/yet/so
 *   option shape       NEW v24: grid code, plus for pronoun items the pronoun class
 *                      (possessive its/their, object it/them, demonstrative that/those)
 *
 * EXIT
 *   2  refused: unreadable or empty batch, an item without 4 choices or whose key
 *      is not among its choices, a passage without exactly one blank, an
 *      unreadable declarations file, or declaration ids that differ from the
 *      batch's ids.
 *   1  computed, and at least one prereg bar MISSED / NOT MEASURED or one brief
 *      quota FLAGGED.
 *   0  computed and everything met.
 * Hand-read NOTES never change the exit. A count missed on the frozen file is
 * RECORDED, not repaired (prereg).
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
if (!file) { console.error('usage: sec25-brief-counts.mjs <batch.json> [--decl a.json,b.json,c.json]'); process.exit(2) }
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

/* ---------- the construction table (PREREG-SEC25, verbatim values) ---------- */
// agreement: ['agr', keyNum, near, pos, dim, dimKey, grid, keyCode, letter, after, first, pronounNum, deciderType, pronounClass]
//   first = the first noun of the blank's SENTENCE against the key (v24)
//   pronounClass (NEW v25) = 'possessive' | 'object' on pronoun grids, null otherwise
// boundary:   ['punct', keyMark, letter, [the four option marks, as marksOf names them]]
// possessive: ['poss', keyClass, letter]   (NEW v25) keyClass one of sg | sg-poss | pl | pl-poss
const T = {
  A1: ['agr', 'pl', 'pl', 'self',  'tense',   'present',     'i|j', 'j', 'C', 'opp',  'agr', null, 'conditional',        null],
  A2: ['agr', 'sg', 'pl', 'self',  'tense',   'past',        'b|g', 'g', 'A', 'opp',  'agr', null, 'time-clause',        null],
  A3: ['agr', 'sg', 'pl', 'adj',   'aspect',  'non-perfect', 'e|h', 'h', 'D', 'free', 'agr', null, 'time-phrase',        null],
  A4: ['agr', 'pl', 'pl', 'early', 'aux',     'have',        'm|n', 'n', 'B', 'free', 'opp', null, 'parallel-verb',      null],
  A5: ['agr', 'pl', 'sg', 'adj',   'pronoun', 'sg',          'd+p', 'd', 'A', 'free', 'opp', 'sg', 'pronoun-antecedent', 'possessive'],
  A6: ['agr', 'pl', 'sg', 'adj',   'pronoun', 'sg',          'a+p', 'a', 'D', 'free', 'opp', 'sg', 'pronoun-antecedent', 'object'],
  A7: ['agr', 'sg', 'pl', 'adj',   'aux',     'have',        'j|n', 'n', 'B', 'free', 'agr', null, 'aux-form',           null],
  A8: ['punct', 'none', 'C', ['comma', 'comma@shifted', 'dash', 'none']],
  B1: ['agr', 'sg', 'pl', 'self',  'tense',   'present',     'c|h', 'c', 'B', 'free', 'agr', null, 'conditional',        null],
  B2: ['agr', 'pl', 'sg', 'adj',   'aspect',  'non-perfect', 'f|g', 'g', 'D', 'opp',  'agr', null, 'time-phrase',        null],
  B3: ['agr', 'sg', 'pl', 'adj',   'tense',   'present',     'k|l', 'k', 'A', 'free', 'agr', null, 'time-clause',        null],
  B4: ['agr', 'pl', 'pl', 'early', 'pronoun', 'sg',          'b+p', 'b', 'C', 'agr',  'opp', 'sg', 'pronoun-antecedent', 'possessive'],
  B5: ['agr', 'sg', 'sg', 'after', 'aux',     'do',          'i|m', 'm', 'D', 'opp',  'agr', null, 'parallel-verb',      null],
  B6: ['agr', 'sg', 'pl', 'adj',   'tense',   'past',        'i|j', 'i', 'A', 'free', 'agr', null, 'time-clause',        null],
  B7: ['agr', 'pl', 'pl', 'early', 'pronoun', 'sg',          'g+p', 'g', 'C', 'free', 'opp', 'sg', 'pronoun-antecedent', 'object'],
  B8: ['punct', 'semicolon', 'B', ['colon', 'comma', 'none', 'semicolon']],
  C1: ['agr', 'pl', 'sg', 'adj',   'tense',   'present',     'b|g', 'b', 'D', 'free', 'opp', null, 'conditional',        null],
  C2: ['agr', 'sg', 'pl', 'adj',   'tense',   'present',     'c|h', 'c', 'C', 'opp',  'agr', null, 'time-clause',        null],
  C3: ['agr', 'sg', 'pl', 'adj',   'aspect',  'non-perfect', 'i|r', 'i', 'B', 'free', 'agr', null, 'time-phrase',        null],
  C4: ['agr', 'pl', 'pl', 'early', 'pronoun', 'sg',          'i+p', 'i', 'A', 'free', 'opp', 'sg', 'pronoun-antecedent', 'possessive'],
  C5: ['agr', 'sg', 'sg', 'early', 'pronoun', 'pl',          'd+p', 'd', 'B', 'free', 'opp', 'pl', 'pronoun-antecedent', 'object'],
  C6: ['agr', 'pl', 'sg', 'adj',   'aux',     'be',          'i|n', 'i', 'D', 'free', 'opp', null, 'parallel-verb',      null],
  C7: ['agr', 'sg', 'pl', 'adj',   'pronoun', 'pl',          'h+p', 'h', 'A', 'free', 'opp', 'pl', 'pronoun-antecedent', 'object'],
  C8: ['poss', 'pl-poss', 'C'],
  D1: ['agr', 'pl', 'pl', 'self',  'aux',     'be',          'j|n', 'j', 'A', 'free', 'agr', null, 'parallel-verb',      null],
  D2: ['agr', 'sg', 'sg', 'early', 'pronoun', 'pl',          'a+p', 'a', 'C', 'free', 'opp', 'pl', 'pronoun-antecedent', 'possessive'],
  D3: ['punct', 'question', 'B', ['comma', 'none', 'period', 'question']],
  D4: ['agr', 'pl', 'sg', 'adj',   'aspect',  'non-perfect', 'e|h', 'h', 'D', 'free', 'agr', null, 'conditional',        null],
  D5: ['agr', 'pl', 'pl', 'early', 'aspect',  'non-perfect', 'i|r', 'i', 'A', 'opp',  'opp', null, 'conditional',        null],
  D6: ['agr', 'sg', 'sg', 'early', 'pronoun', 'pl',          'b+p', 'b', 'B', 'free', 'opp', 'pl', 'pronoun-antecedent', 'object'],
  D7: ['agr', 'sg', 'sg', 'early', 'pronoun', 'pl',          'g+p', 'g', 'D', 'free', 'opp', 'pl', 'pronoun-antecedent', 'possessive'],
  D8: ['poss', 'sg-poss', 'C'],
}
const INVERSION = new Set([])                          // NEW v25: no inversion slot (every live/held inversion family is spent)
const INTERRUPTER_OK = new Set(['B5'])                 // NEW v25: only B5, whose blank ends the opening although-clause (its comma is the clause boundary, not an interrupter)
const DECIDER_TYPES = ['time-clause', 'time-phrase', 'modal', 'parallel-verb', 'conditional', 'pronoun-antecedent', 'aux-form']
const TIME_TYPES = new Set(['time-clause', 'time-phrase'])
const HARD_TENSE_TYPES = new Set(['time-clause', 'time-phrase', 'conditional'])   // (v24 Amendment 1): the only deciders allowed to carry tense/aspect
const SHARED_ADVERB_OK = new Set(['A4', 'B5', 'C6', 'D1'])   // NEW v25: the four ellipsis rows' options all end in "not"
const TIME_RE = /\b(?:when|whenever|while|until|till|before|after|ago|once)\b|\b(?:each|every) time\b|^\s*as\b/i   // NEW v25: + "each/every time"
const SHARED_WORD_GRIDS = new Set(['i|j', 'i|r'])     // (v24) these grids carry a shared complement word, distinct per item
const CONTEXT_DECIDED = new Set(['A8', 'C8', 'D8'])  // NEW v25: decider_quote must sit OUTSIDE the blank's sentence
const POSS_CLASSES = ['sg', 'sg-poss', 'pl', 'pl-poss']
const slotOf = id => { const m = /^SEC25([ABCD])-0([1-8])$/.exec(id); return m ? m[1] + m[2] : null }
const authorOf = id => { const m = /^SEC\d+([A-Z])-\d+$/.exec(id); return m ? m[1] : '?' }

/* ---------- option parser ---------- */
// NEW v24: the suffix list is cut to -ed/-en; every irregular participle the old
// suffixes caught is in IRREG, and the old list misread shared complement adjectives
// ("silent", "own", "sound", "young", "alone", "solid") as participles.
const PART_RE = /^\w+(?:ed|en)$/
const NOT_PART = new Set('own open even often golden wooden woolen sudden green linen oven seven eleven garden kitchen women men children citizen token dozen heaven aspen barren red bed sacred naked wicked rugged ragged jagged crooked kindred hundred need seed speed steed breed creed deed feed weed bleed indeed'.split(' '))
const IRREG = new Set('shone woven proven swollen molten sewn lain done gone seen born borne worn torn sworn drawn grown known shown thrown blown flown sewn sown mown hewn risen driven written given taken shaken chosen frozen stolen spoken broken woken fallen eaten beaten bitten hidden ridden forgotten gotten begun run sung rung sprung swum drunk sunk shrunk struck stuck hung spun won dug held told sold felt dealt meant kept slept swept wept crept left lost built sent spent bent lent brought bought thought fought sought caught taught made paid laid said read led fed bred fled met set put cut shut hit let spread cast cost hurt burst shed split found bound ground wound stood understood sat lit slid hid bled clung flung swung stung come become overcome'.split(' '))
const isPart = w => w !== 'been' && w !== 'being' && !NOT_PART.has(w) && (IRREG.has(w) || PART_RE.test(w))
const ADV = new Set('now still already yet once also then never not ever just always often long soon even again only further first finally evidently rarely seldom thus'.split(' '))
const isAdv = w => ADV.has(w) || (/ly$/.test(w) && w.length > 4 && !['supply', 'apply', 'reply', 'rely', 'fly', 'ally', 'multiply', 'imply', 'comply', 'family', 'early', 'assembly'].includes(w))
const MODALS = new Set('will would can could may might must shall should ought'.split(' '))
const NUM = { is: 'sg', was: 'sg', has: 'sg', does: 'sg', are: 'pl', were: 'pl', have: 'pl', do: 'pl' }
const PRON = { its: 'sg', it: 'sg', itself: 'sg', their: 'pl', them: 'pl', themselves: 'pl', that: 'sg', those: 'pl' }  // NEW v24: that/those (comparative)
const toks = s => s.toLowerCase().replace(/[—–]/g, ' ').split(/\s+/).map(w => w.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '')).filter(Boolean)

function parseItem(choices) {
  const raw = choices.map(toks)
  // NEW (v23): pronoun number per option; pronouns removed before the verb parse
  const pron = raw.map(t => { const p = t.filter(w => w in PRON).map(w => PRON[w]); return p.length ? [...new Set(p)].join(',') : null })
  const pronVaries = new Set(pron).size > 1
  const T4 = pronVaries ? raw.map(t => t.filter(w => !(w in PRON))) : raw
  let pre = 0
  while (T4.every(t => t.length > pre + 1 && t[pre] === T4[0][pre])) pre++
  let suf = 0
  const verbish = w => /ing$/.test(w) || isPart(w) || w in NUM || w === 'been' || w === 'being' || w === 'had' || MODALS.has(w)
  while (T4.every(t => t.length > pre + suf + 1 && t[t.length - 1 - suf] === T4[0][T4[0].length - 1 - suf]) && !verbish(T4[0][T4[0].length - 1 - suf])) suf++
  const shared = { pre: T4[0].slice(0, pre), suf: T4[0].slice(T4[0].length - suf) }
  const cores = T4.map(t => t.slice(pre, t.length - suf))
  const singles = new Set(cores.filter(c => c.length === 1).map(c => c[0]))
  const parsed = cores.map((core, ci) => {
    const extras = core.filter(w => isAdv(w))
    const t = core.filter(w => !isAdv(w))
    const out = (code, number, used) => ({ code, number, extras: extras.concat(t.slice(used)), core, pron: pron[ci] })
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
    if (/ing$/.test(w0)) return out('?', null, 0)
    const base = [w0.replace(/ies$/, 'y'), w0.replace(/es$/, ''), w0.replace(/s$/, '')]
    if (/s$/.test(w0) && !/ss$/.test(w0) && base.some(b => b !== w0 && singles.has(b))) return out('a', 'sg', 1)
    if ([w0 + 's', w0 + 'es', w0.replace(/y$/, 'ies')].some(x => x !== w0 && singles.has(x))) return out('a', 'pl', 1)
    if (/ed$/.test(w0)) return out('p', null, 1)
    if (/s$/.test(w0) && !/ss$/.test(w0)) return out('a', 'sg', 1)
    return out('a', 'pl', 1)
  })
  return { shared, parsed, pronVaries }
}

/* NEW (v25): possessive-noun items. Exactly one word varies across the four options and
 * it takes the four forms {X, X's, Xs, Xs'} of one regular noun (curly apostrophes
 * normalised). Returns the class of each option, or null if the item is not one. */
function possOf(choices) {
  const T = choices.map(c => c.replace(/[’‘]/g, "'").trim().split(/\s+/))
  if (new Set(T.map(t => t.length)).size !== 1) return null
  const diff = T[0].map((_, i) => i).filter(i => new Set(T.map(t => t[i].toLowerCase())).size > 1)
  if (diff.length !== 1) return null
  const forms = T.map(t => t[diff[0]].replace(/[.,;:!?"]+$/, ''))
  const plain = new Set(forms.filter(f => !f.includes("'")).map(f => f.toLowerCase()))
  const cls = forms.map(f => {
    const w = f.toLowerCase()
    if (/s'$/.test(w)) return { c: 'pl-poss', base: w.slice(0, -2) }
    if (/'s$/.test(w)) return { c: 'sg-poss', base: w.slice(0, -2) }
    if (/s$/.test(w) && plain.has(w.slice(0, -1))) return { c: 'pl', base: w.slice(0, -1) }
    return { c: 'sg', base: w }
  })
  if (new Set(cls.map(x => x.base)).size !== 1) return null
  if (!POSS_CLASSES.every(c => cls.some(x => x.c === c))) return null
  return cls.map(x => x.c)
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
    aux: code === 'm' ? 'do' : code === 'n' ? 'have' : 'be' }[dim] ?? '?'
}
const sameGrid = (g1, g2) => g1.split('|').sort().join('|') === g2.split('|').sort().join('|')
const FORM = { a: ['V-s', 'V'], b: ['is V-ing', 'are V-ing'], c: ['is V-en', 'are V-en'], d: ['has V-en', 'have V-en'], e: ['has been V-en', 'have been V-en'], f: ['has been V-ing', 'have been V-ing'], g: ['was V-ing', 'were V-ing'], h: ['was V-en', 'were V-en'], i: ['was', 'were'], j: ['is', 'are'], k: ['is being V-en', 'are being V-en'], l: ['was being V-en', 'were being V-en'], m: ['does', 'do'], n: ['has', 'have'], r: ['has been C', 'have been C'] }
const formName = (code, num, pron) => (FORM[code] ? FORM[code][num === 'pl' ? 1 : 0] : `${code}${num ? ':' + num : ''}`) + (pron ? ` +${pron} pronoun` : '')

/* ---------- boundary marks ---------- */
const STRONG = /[;:—–.]/
// The key mark is what the option ADDS: marks present in all four options the same
// number of times (e.g. the commas inside a list every option carries) are discounted.
// NEW v24: "?" is a mark ("question"); each added single mark records the number of
// words before it, and a single mark sitting after a different word than the
// reference position is named "<mark>@shifted" (a misplaced mark). The reference is
// the key's own mark position, or, for a no-mark key, the most common position among
// the marked options.
const MARK_NAME = { ',': 'comma', ';': 'semicolon', ':': 'colon', '—': 'dash', '.': 'period', '?': 'question' }
function marksOf(choices, k) {
  const seqs = choices.map(o => {
    const out = []; let w = 0
    for (const t of o.replace(/–/g, '—').match(/[A-Za-z0-9']+|[,;:—.?]/g) || []) { if (/[,;:—.?]/.test(t)) out.push({ c: t, at: w }); else w++ }
    return out
  })
  const common = {}
  for (const c of new Set(seqs.flat().map(x => x.c))) common[c] = Math.min(...seqs.map(m => m.filter(x => x.c === c).length))
  const res = seqs.map(m => { const left = { ...common }, r = []; for (const x of m) { if (left[x.c] > 0) left[x.c]--; else r.push(x) } return r })
  const single = res.map(r => r.length === 1 ? r[0].at : null)
  let ref = single[k]
  if (ref == null) {
    const cnt = {}; single.forEach((a, i) => { if (a != null && i !== k) cnt[a] = (cnt[a] ?? 0) + 1 })
    const best = Object.entries(cnt).sort((x, y) => y[1] - x[1] || x[0] - y[0])[0]
    ref = best ? Number(best[0]) : null
  }
  return res.map(r => {
    if (!r.length) return 'none'
    if (r.length === 2 && r[0].c === '—' && r[1].c === '—') return 'dash pair'
    if (r.length === 2 && r[0].c === ',' && r[1].c === ',') return 'comma pair'
    if (r.length === 1) return MARK_NAME[r[0].c] + (ref != null && r[0].at !== ref ? '@shifted' : '')
    return `mixed ${r.map(x => x.c).join('')}`
  })
}
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
  ['since', /\bsince\b/gi], ['to this day', /\bto this day\b/gi], ['to the present', /\bto the present\b/gi],
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
  for (const [name, re] of BANNED_ANY) for (const m of p.matchAll(re)) banned.push({ kind: name, ctx: p.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).replace(/\s+/g, ' ') })
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
  if (!nonAgr && SHARED_WORD_GRIDS.has(grid) && !shared.suf.length) flag(it.id, `(v24) grid ${grid} must carry a shared complement word (no option set may equal a live bare {was, were, is, are})`)
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
      if (slot === 'B8' && dq) { const vi = postW.indexOf(dq.toLowerCase().split(/\s+/)[0].replace(/[^a-z']/g, '')); if (vi < 5) flag(it.id, `table B8: the second clause's verb "${dq}" is ${vi < 0 ? 'not found' : `word ${vi + 1}`} after the blank (needs 6+)`) }
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
        if (!TIME_TYPES.has(tDtype)) { const tw = words(bsent).filter(w => ['when', 'whenever', 'while', 'until', 'till', 'before', 'after', 'once', 'ago'].includes(w)).concat(bsent.match(/\b(?:each|every) time\b/gi) ?? []); if (tw.length) flag(it.id, `table ${slot}: time word(s) "${tw.join('", "')}" in the blank's sentence of a non-time row`) }
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
bar(`boundary: ${TT.boundary} items, lone-strong-mark key <= 1, 0 twin offers (v25: the count is the table's) [table ${TT.boundary}]`, Bd.length === TT.boundary && lone <= 1 && tw === 0,
  `${Bd.length} boundary items; keys ${Bd.map(r => `${r.id}:${r.keyMark}`).join(' ') || 'none'}; lone-strong ${lone}, twin ${tw}`)
const Ps = rows.filter(r => r.isPoss)
bar(`possessive-noun items: ${TT.poss}, each a complete {X, X's, Xs, Xs'} set (NEW v25) [table ${TT.poss}]`, Ps.length === TT.poss, `${Ps.length}  (${Ps.map(r => `${r.id}:${r.possKey}`).join(' ') || 'none'})`)
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
const beenRows = rows.filter(r => r.agreement && items.find(i => i.id === r.id).choices.some(c => /\bbeen\b/i.test(c)))
const beenKeyed = beenRows.filter(r => /\bbeen\b/i.test(items.find(i => i.id === r.id).correct_answer))
console.log(`  options containing "been": ${beenRows.length} items, keyed ${beenKeyed.length}   [table: 5 (A3, B2, C3, D4, D5), keyed 0; quota <= 5]`)
const beingRows = rows.filter(r => r.agreement && items.find(i => i.id === r.id).choices.some(c => /\bbeing\b/i.test(c)))
console.log(`  options containing "being": ${beingRows.length} items   [table: 1 (B3); quota <= 1]`)
if (beenRows.length > 5) flag('batch', `"been" appears in ${beenRows.length} agreement items (max 5): ${beenRows.map(r => r.id).join(' ')}`)
if (beingRows.length > 1) flag('batch', `"being" appears in ${beingRows.length} agreement items (max 1): ${beingRows.map(r => r.id).join(' ')}`)
const authors = [...new Set(rows.map(r => r.author))].sort()
const letters = Object.fromEntries('ABCD'.split('').map(L => [L, rows.filter(r => r.key === L).length]))
console.log(`  key letters batch ${JSON.stringify(letters)}; per author ${authors.map(a => `${a}:${'ABCD'.split('').map(L => rows.filter(r => r.author === a && r.key === L).length).join('/')}`).join('  ')}   [table: 8 each; 2/2/2/2 per author]`)
console.log(`  key plural per author: ${authors.map(a => `${a} ${rows.filter(r => r.author === a && r.agreement && r.keyNum === 'pl').length}/${rows.filter(r => r.author === a && r.agreement).length}`).join('  ')}   [table: ${'ABCD'.split('').map(a => `${a} ${plPer(a)}`).join(', ')}]`)
const formCount = {}; for (const r of rows) if (!r.isPunct) formCount[r.keyForm] = (formCount[r.keyForm] ?? []).concat(r.id)
console.log(`  key forms: ${Object.entries(formCount).sort((a, b) => b[1].length - a[1].length).map(([f, l]) => `"${f}" x${l.length}`).join(', ')}`)
const gridCount = {}; for (const r of A) if (r.grid) gridCount[r.grid + (r.pclass ? ':' + r.pclass : '')] = (gridCount[r.grid + (r.pclass ? ':' + r.pclass : '')] ?? []).concat(r.id)
console.log(`  option shapes (grid + pronoun class): ${Object.entries(gridCount).map(([g, l]) => `${g} x${l.length}`).join(', ')}`)
console.log(`  key length: max ratio ${Math.max(...rows.map(r => r.ratio)).toFixed(2)}; uniquely longest ${rows.filter(r => r.keyLongest).length}/${n}, uniquely shortest ${rows.filter(r => r.keyShortest).length}/${n}`)
console.log(`  options with had/modal/adverb: ${rows.filter(r => r.bannedOpt.some(w => w.length)).map(r => r.id).join(' ') || 'none'}   [table: 0]`)

const nSlots = Object.keys(T).length
for (const L of 'ABCD') if (n === nSlots && letters[L] !== nSlots / 4) flag('batch', `key letter ${L} keyed ${letters[L]} times (${nSlots / 4} required)`)
for (const a of authors) {
  const ar = rows.filter(r => r.author === a)
  for (const L of 'ABCD') { const c = ar.filter(r => r.key === L).length; if (c !== 2) flag(`author ${a}`, `key letter ${L} keyed ${c} times (2 required)`) }
  const aa = ar.filter(r => r.agreement)
  const pl = aa.filter(r => r.keyNum === 'pl').length; if (pl !== plPer(a)) flag(`author ${a}`, `key plural in ${pl} of ${aa.length} agreement items (table ${plPer(a)})`)
  const wantB = Object.entries(T).filter(([s, r]) => s[0] === a && r[0] === 'punct').length, wantP = Object.entries(T).filter(([s, r]) => s[0] === a && r[0] === 'poss').length
  if (ar.filter(r => r.isPunct).length !== wantB) flag(`author ${a}`, `${ar.filter(r => r.isPunct).length} boundary items (table ${wantB})`)
  if (ar.filter(r => r.isPoss).length !== wantP) flag(`author ${a}`, `${ar.filter(r => r.isPoss).length} possessive-noun items (table ${wantP})`)
  const fc = {}; for (const r of aa) fc[r.keyForm] = (fc[r.keyForm] ?? 0) + 1
  for (const [f, c] of Object.entries(fc)) if (c > 1) flag(`author ${a}`, `key form "${f}" used ${c} times (once allowed)`)
  const gc = {}; for (const r of aa) if (r.grid) gc[r.grid] = (gc[r.grid] ?? 0) + 1
  for (const [g, c] of Object.entries(gc)) if (c > 1) flag(`author ${a}`, `grid ${g} used ${c} times (once allowed)`)
  if (ar.filter(r => r.keyLongest).length > 2) flag(`author ${a}`, `key uniquely longest in ${ar.filter(r => r.keyLongest).length} (max 2)`)
  if (ar.filter(r => r.keyShortest).length > 2) flag(`author ${a}`, `key uniquely shortest in ${ar.filter(r => r.keyShortest).length} (max 2)`)
  if (ar.length > 1 && ar.every(r => r.blankLast)) flag(`author ${a}`, 'the blank is in the last sentence of every item')
}
for (const [f, l] of Object.entries(formCount)) if (l.length > 2) flag('batch', `key form "${f}" used ${l.length} times (max 2): ${l.join(' ')}`)
for (const [g, l] of Object.entries(gridCount)) if (l.length > 2) flag('batch', `option shape ${g} used ${l.length} times (max 2, NEW v25): ${l.join(' ')}`)
if (rows.filter(r => r.keyLongest).length > 8) flag('batch', `key uniquely longest in ${rows.filter(r => r.keyLongest).length} (max 8)`)
if (rows.filter(r => r.keyShortest).length > 8) flag('batch', `key uniquely shortest in ${rows.filter(r => r.keyShortest).length} (max 8)`)
const v25 = rows.filter(r => r.slot).length
if (v25 && v25 !== n) flag('batch', `${v25} of ${n} ids are SEC25 table slots; the rest were not checked against the table`)
if (!v25) console.log('\n(no SEC25 ids: construction-table rows not checked)')
// (v24) shared complement words must differ across the i|j and i|r items
const sw = {}; for (const r of A) if (SHARED_WORD_GRIDS.has(r.grid) && r.sharedSuf) (sw[r.sharedSuf] ??= []).push(r.id)
for (const [w, l] of Object.entries(sw)) if (l.length > 1) flag('batch', `shared complement "${w}" used in ${l.join(' ')} (must differ)`)

console.log(`\nFLAGS (brief quotas, ${flags.length})`)
for (const f of flags) console.log(`  ${f}`)
console.log(`\nNOTES for a hand read (${notes.length}; do not change the exit code)`)
for (const m of notes) console.log(`  ${m}`)
const missed = bars.filter(b => b.ok !== true)
console.log(`\nVERDICT: ${bars.length - missed.length}/${bars.length} prereg bars met${missed.length ? ` (not met: ${missed.map(b => b.name + (b.ok === null ? ' [NOT MEASURED]' : '')).join('; ')})` : ''}; ${flags.length} quota flag(s). Regex classifications: read the printed options before quoting any count.`)
process.exit(missed.length || flags.length ? 1 : 0)
