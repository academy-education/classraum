#!/usr/bin/env node
/**
 * map-lu-v2.mjs — toolchain for map-lu-v2 (grades 5-8 MAP Language Usage:
 * Spelling, Punctuation, Grammar and Usage, Capitalization at grades 5-6).
 * Bars: MAP-LU-V2.prereg.md, committed before any item existed. Every strand
 * gets its own verdict. Refuses (exit 2) on input it cannot read; exits 1 on
 * a failed bar. Denominators print before verdicts. Run from the repo root.
 *
 *   spell <word...>           dictionary oracle (NSSpellChecker, web2, regional-variant guard); the
 *                             spelling author may run this, nothing else
 *   select-control            the 24-item matched live control (read-only DB) -> W/control.json
 *   checks <batch.json>       exact item checks + per-strand batch checks (E3, distinct rules, T2)
 *   t2 <batch.json>           the structural-predictor check alone, every heuristic printed
 *   teacher-input             W/teacher.input.json from W/batch.authored.json
 *   teacher-merge             union of teacher-a/-b NO ratings -> W/revise.input.json
 *   rerate-input              W/rerate.input.json (only rewritten options of W/revised.json)
 *   repair-input              W/repair.input.json (items failing an exact check after revision)
 *   freeze                    revisions, drops, repairs, per-grade quotas, Stage 0 per strand -> W/frozen.json
 *   render                    W/oo.blind.json + oo.key.json, W/ws.md, ws.keyed.md, ws.key.json
 *   score                     all stages, per-strand bars -> W/stages.json
 *   build <strand>            W/inserted-<strand>.batch.json (strand must have PASSED)
 *   insert <strand> [--commit] gateBatch (ledger + stem duplicates), then insert STAGED (dry run without --commit)
 *   --selftest                break-test every bar and check at its margin
 *
 * W = $MLV2_W or scripts/study-bank/map-lu-v2/
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const SB = ROOT + '/scripts/study-bank/'
const { readability, sentences, dl } = await import(SB + 'map-pilot-checks.mjs')
const { periodicity } = await import(SB + 'map-pilot-2-checks.mjs')

const W = (process.env.MLV2_W || 'scripts/study-bank/map-lu-v2/').replace(/\/?$/, '/')
const SL = ['A', 'B', 'C', 'D']
const STRAND_OF = { Capitalization: 'cap', Punctuation: 'punct', 'Parts of Speech': 'gram', 'Phrases, Clauses, Agreement, Sentences': 'gram', Spelling: 'spell' }
const STRANDS = ['spell', 'punct', 'gram', 'cap']
const COHORT = { spell: 'map-lu-v2-spelling', punct: 'map-lu-v2-punctuation', gram: 'map-lu-v2-grammar', cap: 'map-lu-v2-capitalization' }
// Per-grade quotas, fixed in the prereg.
export const AUTHORED = { spell: { 5: 8, 6: 8, 7: 8, 8: 8 }, punct: { 5: 3, 6: 4, 7: 4, 8: 3 }, gram: { 5: 3, 6: 4, 7: 4, 8: 3 }, cap: { 5: 5, 6: 5 } }
export const FREEZE = { spell: { 5: 6, 6: 6, 7: 6, 8: 6 }, punct: { 5: 2, 6: 3, 7: 3, 8: 2 }, gram: { 5: 2, 6: 3, 7: 3, 8: 2 }, cap: { 5: 4, 6: 4 } }
const sum = o => Object.values(o).reduce((a, b) => a + b, 0)
export const nFrozen = s => sum(FREEZE[s])
// Bars, derived from n (prereg table).
export const passBar = n => Math.ceil(0.8 * n)
export const easierMax = n => Math.floor((2 * n) / 6)
export const harderLt = n => (2 * n) / 4
export const T2_ALPHA = 0.10, T2_MARGIN = 0.10, T2_PERMS = 4000

const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${p} is not JSON: ${e.message}`) } }
const wr = (p, o) => { mkdirSync(W, { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 1) + '\n') }
export const strandOf = it => STRAND_OF[it.map_strand] ?? null
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')

// ---------- rng ----------
export function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const shuffleWith = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

// ---------- dictionary ----------
let WEB2 = null
const web2 = () => (WEB2 ??= new Set(readFileSync('/usr/share/dict/words', 'utf8').split('\n').map(w => w.toLowerCase())))
const NSCACHE = new Map()
export function nsspell(list) {
  const need = [...new Set(list.filter(w => !NSCACHE.has(w)))]
  if (need.length) {
    const f = join(tmpdir(), `mlv2spell-${process.pid}.js`)
    writeFileSync(f, `ObjC.import('AppKit');function run(a){const sc=$.NSSpellChecker.sharedSpellChecker;sc.setLanguage('en');return JSON.stringify(a.map(w=>{const r=sc.checkSpellingOfStringStartingAt(w,0);return r.location>w.length}))}`)
    const out = JSON.parse(execFileSync('osascript', ['-l', 'JavaScript', f, ...need], { encoding: 'utf8' }).trim())
    if (out.length !== need.length) throw new Error('NSSpellChecker returned the wrong count')
    need.forEach((w, i) => NSCACHE.set(w, out[i]))
  }
  return list.map(w => NSCACHE.get(w))
}
/*
 * REGIONAL VARIANTS. NSSpellChecker accepts US and UK forms alike (colour and
 * color, travelled and traveled) and also accepts some genuine misspellings
 * (occurence, accomodate, independant, miniture), so it can neither prove a
 * misspelling wrong nor a key unique. The guard: (1) a misspelling must FAIL
 * NSSpellChecker, be absent from web2, and not be a listed variant; (2) a
 * tested word (key / intended / target) must have NO variant: every US<->UK
 * transform of it is generated, and if any transform is accepted by
 * NSSpellChecker or web2, or the word is on the curated list, the item is
 * refused. Graders' keyed stage also asks for any spelling a dictionary
 * accepts, including British or other regional spellings.
 */
const VARIANT_WORDS = new Set(`color colour favor favour favorite favourite flavor flavour honor honour humor humour labor labour neighbor neighbour behavior behaviour harbor harbour rumor rumour vapor vapour odor odour armor armour parlor parlour savior saviour endeavor endeavour vigor vigour rigor rigour clamor clamour splendor splendour center centre theater theatre meter metre liter litre fiber fibre caliber calibre somber sombre luster lustre specter spectre saber sabre meager meagre maneuver manoeuvre realize realise organize organise recognize recognise apologize apologise criticize criticise memorize memorise emphasize emphasise analyze analyse paralyze paralyse catalyze catalyse traveled travelled traveling travelling traveler traveller canceled cancelled canceling cancelling labeled labelled labeling labelling modeled modelled modeling modelling fueled fuelled leveled levelled signaled signalled totaled totalled quarreled quarrelled marveled marvelled marvelous marvellous jeweler jeweller jewelry jewellery counselor counsellor dialed dialled dueling duelling defense defence offense offence license licence pretense pretence practice practise catalog catalogue dialog dialogue analog analogue prolog prologue judgment judgement acknowledgment acknowledgement abridgment abridgement aging ageing likable likeable sizable sizeable movable moveable lovable loveable unmistakable unmistakeable gray grey plow plough draft draught check cheque tire tyre curb kerb program programme mold mould molding moulding smolder smoulder story storey artifact artefact cozy cosy donut doughnut pajamas pyjamas mustache moustache aluminum aluminium skeptic sceptic skeptical sceptical sulfur sulphur omelet omelette airplane aeroplane math maths whiskey whisky ax axe spelled spelt learned learnt burned burnt dreamed dreamt leaped leapt toward towards afterward afterwards tidbit titbit fulfill fulfil fulfillment fulfilment enroll enrol enrollment enrolment skillful skilful willful wilful installment instalment distill distil instill instil appall appal encyclopedia encyclopaedia pediatric paediatric anemia anaemia esthetic aesthetic archeology archaeology fetus foetus maneuvering manoeuvring yogurt yoghurt chili chilli plaid tartan mom mum`.split(/\s+/))
const TRANSFORMS = [
  [/([a-z]{2,})or(s|ed|ing|ful|ite|ites|able|less)?$/, '$1our$2'], [/([a-z]{2,})our(s|ed|ing|ful|ite|ites|able|less)?$/, '$1or$2'],
  [/([a-z]{2,}[^aeiou])er(s)?$/, '$1re$2'], [/([a-z]{2,}[^aeiou])re(s)?$/, '$1er$2'],
  [/iz(e|es|ed|ing|ation|ations|er|ers)$/, 'is$1'], [/is(e|es|ed|ing|ation|ations|er|ers)$/, 'iz$1'],
  [/yz(e|es|ed|ing)$/, 'ys$1'], [/ys(e|es|ed|ing)$/, 'yz$1'],
  [/([aeiou])l(ed|ing|er|ers|or|ors|ous|ery)$/, '$1ll$2'], [/([aeiou])ll(ed|ing|er|ers|or|ors|ous|ery)$/, '$1l$2'],
  [/ense(s)?$/, 'ence$1'], [/ence(s)?$/, 'ense$1'],
  [/og(s)?$/, 'ogue$1'], [/ogue(s)?$/, 'og$1'],
  [/dgment(s)?$/, 'dgement$1'], [/dgement(s)?$/, 'dgment$1'],
  [/([^e])able$/, '$1eable'], [/eable$/, 'able'], [/([^e])ging$/, '$1eging'],
  [/llment(s)?$/, 'lment$1'], [/([^l])lment(s)?$/, '$1llment$2'], [/llful$/, 'lful'], [/([^l])lful$/, '$1llful'],
]
export function variantsOf(w) {
  const x = String(w).toLowerCase(), out = new Set()
  for (const [rx, rep] of TRANSFORMS) if (rx.test(x)) { const y = x.replace(rx, rep); if (y !== x) out.add(y) }
  return [...out]
}
for (const w of `ardor ardour candor candour demeanor demeanour fervor fervour glamor rancor rancour valor valour tumor tumour harbored harboured rumored rumoured flavored flavoured colored coloured honored honoured favored favoured labored laboured colorful colourful flavorful flavourful humorous neighborhood neighbourhood neighborly neighbourly behavioral behavioural ocher ochre scepter sceptre sepulcher sepulchre monolog monologue epilog epilogue dialogs dialogues catalogs catalogues usable useable livable liveable salable saleable ratable rateable unshakable unshakeable pretense pretence`.split(/\s+/)) VARIANT_WORDS.add(w)
for (const w of [...VARIANT_WORDS]) VARIANT_WORDS.add(w + 's')
/*
 * Patterns that refuse OUTRIGHT, with no dictionary confirmation, because
 * NSSpellChecker is inconsistent on UK forms (accepts colour, rejects
 * harboured and tumour). False refusals are accepted: they cost the author a
 * different word, never a wrong key.
 */
const OUTRIGHT = [
  [/[a-z]{3,}iz(e|es|ed|ing|ation|ations|er|ers)$/, 'an -ize word (UK -ise)'],
  [/[a-z]{2,}is(ation|ations)$/, 'an -isation word'],
  [/yz(e|es|ed|ing)$/, 'a -yze word (UK -yse)'],
  [/[^aeiou][aeiou]l(ed|ing|er|ers)$/, 'a single-l -ed/-ing/-er form (UK doubles the l)'],
  [/l{1,2}(ment|ments|ful|fully)$/, 'an -l(l)ment / -l(l)ful form'],
  [/(dgment|dgement)s?$/, 'a judg(e)ment-type form'],
]
/** Does a tested word have an accepted regional / variant spelling? */
export function variantHit(w) {
  const x = String(w).toLowerCase()
  if (VARIANT_WORDS.has(x)) return `${x} is on the variant list`
  for (const [rx, why] of OUTRIGHT) {
    if (!rx.test(x)) continue
    // single-l rule: a silent-e verb (smile -> smiled) is the same in every variety
    if (/single-l/.test(why) && web2().has(x.replace(/(ed|ing|er|ers)$/, '') + 'e')) continue
    return `${x} is ${why}`
  }
  const vs = variantsOf(x)
  if (!vs.length) return null
  const ns = nsspell(vs)
  const hit = vs.find((v, i) => ns[i] || web2().has(v) || VARIANT_WORDS.has(v))
  return hit ? `${x} has an accepted variant "${hit}"` : null
}
/** Is this string acceptable as a misspelling (a non-word that is not a variant)? */
export function misspellingOk(w) {
  const x = String(w).toLowerCase()
  const why = []
  if (nsspell([x])[0]) why.push(`"${x}" passes NSSpellChecker`)
  if (web2().has(x)) why.push(`"${x}" is in web2`)
  if (VARIANT_WORDS.has(x)) why.push(`"${x}" is a listed variant spelling`)
  return why
}

// ---------- structural ----------
const MARKS = /[.,;:!?'"‘’“”()\-–—…]/g
const tok = s => String(s).trim().split(/\s+/)
const words = s => String(s).toLowerCase().replace(/[^a-z'\s-]/g, ' ').replace(/'s\b/g, '').split(/[\s-]+/).map(x => x.replace(/^'+|'+$/g, '')).filter(Boolean)
export function touched(keyS, optS, positional = false) {
  const a = tok(keyS), b = tok(optS), n = a.length, m = b.length
  // positional=true (all four options have the key's token count): every site is a
  // substitution, so diff by position. LCS mis-attributes two ADJACENT substituted
  // tokens ("loud," "playful" vs "loud" "playful,"), which refused a sound grid
  // (amendment 1, before any rater ran). Chosen per ITEM, never per pair.
  if (positional && n === m) return new Set(a.map((x, i) => (x === b[i] ? null : `tok${i}`)).filter(Boolean))
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const out = new Set(); let i = 0, j = 0
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { i++; j++ }
    else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) { out.add(`ins@${i}`); j++ }
    else { out.add(`tok${i}`); i++ }
  }
  return out
}
/** G: the four options form a 2x2 grid around the key (token alignment). */
export function grid(it) {
  const ch = it.choices.map(String), k = ch.indexOf(String(it.correct_answer))
  if (k < 0 || new Set(ch).size !== 4) return { ok: false, why: 'key missing or duplicate options' }
  const pos = ch.every(c => tok(c).length === tok(ch[k]).length)
  const others = ch.map((c, i) => (i === k ? null : [i, touched(ch[k], c, pos)])).filter(Boolean)
  others.sort((x, y) => y[1].size - x[1].size)
  const [[, both], [, s1], [, s2]] = others
  if (!s1.size || !s2.size) return { ok: false, why: 'a single-error option equals the key' }
  const inter = [...s1].filter(x => s2.has(x))
  if (inter.length) return { ok: false, why: `the two single-error options overlap at ${inter.join(',')}` }
  const uni = new Set([...s1, ...s2])
  if (!(uni.size === both.size && [...uni].every(x => both.has(x)))) return { ok: false, why: `the both-errors option is not the union of the two singles` }
  return { ok: true }
}
/** G for one-word spelling options: a metric 2x2 grid of single letter edits. */
export function dlGrid(it) {
  const ch = it.choices.map(String), k = ch.indexOf(String(it.correct_answer))
  if (k < 0 || new Set(ch).size !== 4) return { ok: false, why: 'key missing or duplicate options' }
  const o = ch.filter((_, i) => i !== k), dk = o.map(x => dl(ch[k], x))
  const bi = dk.indexOf(Math.max(...dk)), b = o[bi], [s1, s2] = o.filter((_, i) => i !== bi)
  const d = { ks1: dl(ch[k], s1), ks2: dl(ch[k], s2), kb: dl(ch[k], b), s1b: dl(s1, b), s2b: dl(s2, b), s12: dl(s1, s2) }
  const ok = d.ks1 === 1 && d.ks2 === 1 && d.kb === 2 && d.s1b === 1 && d.s2b === 1 && d.s12 === 2
  return ok ? { ok: true } : { ok: false, why: `not a 2x2 grid of single edits (${JSON.stringify(d)})` }
}
export function medoid(it) {
  const ch = it.choices.map(String)
  const sums = ch.map((a, i) => ch.reduce((s, b, j) => s + (i === j ? 0 : dl(a, b)), 0))
  const min = Math.min(...sums), at = sums.map((x, i) => (x === min ? i : -1)).filter(i => i >= 0)
  return { unique: at.length === 1, uniqueIsKey: at.length === 1 && at[0] === ch.indexOf(String(it.correct_answer)) }
}
const stripP = s => String(s).replace(MARKS, '').replace(/\s+/g, '')
/** E1: FK grade in [4, U) for every unit of >= 15 words; U = 9 at grades 5-6, 10 at grades 7-8. */
export function e1(it) {
  const U = it.grade_target >= 7 ? 10 : 9, errs = [], out = { scored: 0, unscorable: 0 }
  const units = [...sentences(String(it.prompt ?? '')).map(t => ['stem', t]), ...it.choices.flatMap((c, i) => sentences(String(c)).map(t => [`opt${SL[i]}`, t]))]
  for (const [w, t] of units) {
    const n = String(t).replace(/_{2,}/g, ' blank ').split(/\s+/).filter(x => /[a-z]/i.test(x)).length
    if (n < 15) { out.unscorable++; continue }
    const r = readability(t); if (!r) { out.unscorable++; continue }
    out.scored++
    if (!(r.fk >= 4 && r.fk < U)) errs.push(`E1 ${w} FK ${r.fk.toFixed(1)} outside [4, ${U}) (${n} words)`)
  }
  return { errs, ...out }
}
const CCSS = { cap: g => new RegExp(`^L\\.${g}\\.2`), punct: g => new RegExp(`^L\\.${g}\\.2`), spell: g => new RegExp(`^L\\.${g}\\.2`), gram: g => new RegExp(`^L\\.${g}\\.[13]`) }
export function structural(it) {
  const errs = [], s = strandOf(it)
  if (!s) return { errs: [`unknown map_strand ${it.map_strand}`], e1: { scored: 0, unscorable: 0 } }
  if (!Array.isArray(it.choices) || it.choices.length !== 4) return { errs: [`E6 width ${it.choices?.length}`], e1: { scored: 0, unscorable: 0 } }
  const ch = it.choices.map(String)
  if (!ch.includes(String(it.correct_answer))) errs.push('key not among choices')
  if (new Set(ch).size !== 4) errs.push('duplicate options')
  const grades = Object.keys(FREEZE[s]).map(Number)
  if (!grades.includes(it.grade_target)) errs.push(`grade_target ${it.grade_target} not in ${grades.join('/')} for ${s}`)
  if (!CCSS[s](it.grade_target).test(String(it.ccss ?? ''))) errs.push(`ccss ${it.ccss} is not a grade-${it.grade_target} ${s === 'gram' ? 'L.1/L.3' : 'L.2'} code`)
  const E1 = e1(it); errs.push(...E1.errs)
  if (s === 'cap') {
    if (new Set(ch.map(c => c.toLowerCase())).size !== 1) errs.push('E5 options differ beyond case')
    if (!it.cap_rule) errs.push('E5 cap_rule missing')
  }
  if (s === 'punct') {
    if (new Set(ch.map(stripP)).size !== 1) errs.push('E9 options differ beyond punctuation')
    if (!it.punct_rule) errs.push('E9 punct_rule missing')
  }
  if (s === 'gram' && !it.varied_dimension) errs.push('varied_dimension missing')
  if (s === 'cap' || s === 'punct' || s === 'gram') {
    const g = grid(it); if (!g.ok) errs.push(`G ${g.why}`)
    const m = medoid(it); if (m.unique) errs.push(`E7 option is the unique medoid${m.uniqueIsKey ? ' (the KEY)' : ''}`)
  }
  if (s === 'spell') errs.push(...spellChecks(it))
  return { errs, e1: E1 }
}
export function spellChecks(it) {
  const errs = [], ch = it.choices.map(String), key = String(it.correct_answer)
  if (it.spelling_format === 'word') {
    if ((String(it.prompt).match(/_{3,}/g) ?? []).length !== 1) errs.push('E4 word format needs exactly one blank (___) in the prompt')
    if (!ch.every(c => /^[a-z]+$/.test(c))) errs.push('E4 word options must be single lowercase words')
    else {
      if (!nsspell([key])[0]) errs.push(`E4 key "${key}" fails NSSpellChecker`)
      const v = variantHit(key); if (v) errs.push(`E4 regional variant: ${v}`)
      for (const c of ch.filter(c => c !== key)) {
        for (const w of misspellingOk(c)) errs.push(`E4 distractor ${w}`)
        if (c[0] !== key[0]) errs.push(`E4 distractor "${c}" changes the first letter`)
      }
      const g = dlGrid(it); if (!g.ok) errs.push(`G ${g.why}`)
      if (medoid(it).unique) errs.push('E7 option is the unique medoid')
    }
  } else if (it.spelling_format === 'sentence') {
    const t = it.targets, mw = String(it.misspelled_word ?? '').toLowerCase(), iw = String(it.intended_word ?? '').toLowerCase()
    if (!t || typeof t !== 'object' || Object.keys(t).length !== 4 || !ch.every(c => typeof t[c] === 'string')) { errs.push('E4 sentence format needs targets: {<each option>: <its target word>}'); return errs }
    if (!mw || !iw) { errs.push('E4 misspelled_word and intended_word required'); return errs }
    if (String(t[key]).toLowerCase() !== mw) errs.push(`E4 the key's target must be the misspelled word`)
    for (const w of misspellingOk(mw)) errs.push(`E4 misspelling ${w}`)
    if (!nsspell([iw])[0]) errs.push(`E4 intended word "${iw}" fails NSSpellChecker`)
    if (dl(mw, iw) < 1 || dl(mw, iw) > 2 || mw[0] !== iw[0]) errs.push(`E4 misspelling "${mw}" is not 1-2 edits from "${iw}" with the same first letter`)
    const tested = [iw, ...ch.filter(c => c !== key).map(c => String(t[c]).toLowerCase())]
    for (const w of tested) { const v = variantHit(w); if (v) errs.push(`E4 regional variant: ${v}`) }
    for (const c of ch) {
      const ws = words(c), tw = String(t[c]).toLowerCase()
      if (!ws.includes(tw)) errs.push(`E4 option does not contain its target "${tw}"`)
      if (c !== key && ws.includes(mw)) errs.push('E4 the misspelling appears outside the key')
      // NSSpellChecker is case-sensitive (it rejects "saturday"): scan the tokens in their
      // original case (amendment 1, before any rater ran); target matching stays lowercase.
      const cased = String(c).replace(/[^A-Za-z'\s-]/g, ' ').replace(/'s\b/g, '').split(/[\s-]+/).map(x => x.replace(/^'+|'+$/g, '')).filter(Boolean)
      const bad = cased.filter(w => !(c === key && w.toLowerCase() === mw)).filter((w, i, a) => a.indexOf(w) === i)
      const ns = nsspell(bad)
      const fails = bad.filter((w, i) => !ns[i])
      if (fails.length) errs.push(`E4 option ${SL[ch.indexOf(c)]} has other words failing NSSpellChecker: ${fails.join(', ')}`)
      for (const w of ws) if (w !== mw) { const v = variantsOf(w).find(x => web2().has(x)); if (v && !web2().has(w) && /our|re$|is(e|ed|ing)$|ll(ed|ing)/.test(w)) errs.push(`E4 "${w}" looks like a regional variant of "${v}"`) }
    }
    if (it.key_length_rank != null) {
      const L = ch.map(c => c.length), sorted = [...L].sort((a, b) => b - a)
      const gaps = sorted.slice(1).map((x, i) => sorted[i] - x)
      if (sorted.indexOf(key.length) + 1 !== it.key_length_rank) errs.push(`L-rank the key is length rank ${sorted.indexOf(key.length) + 1}, assigned ${it.key_length_rank}`)
      if (gaps.some(g => g < 3)) errs.push(`L-rank sentence lengths ${sorted.join('/')} are not 3+ characters apart`)
    }
  } else errs.push(`E4 spelling_format must be "word" or "sentence" (${it.spelling_format})`)
  return errs
}

/**
 * E4-dup (item level). Two spelling items testing one word fail Stage 0's
 * batch rule. When a REVISION or REPAIR introduced the clash (the reviser and
 * repairer see only their own items), the changed item fails, so the clash
 * goes to the one-repair step instead of stopping the strand. If neither item
 * was changed, the later id fails. Added 2026-10-12 after the teacher re-rate,
 * before any repair, solver or grader ran (S06 was rewritten to "occasion",
 * which S11 already tests).
 */
export function dupFails(items, changed = new Set()) {
  const tw = it => (it.spelling_format === 'word' ? String(it.correct_answer) : String(it.intended_word ?? '')).toLowerCase()
  const sp = items.filter(i => strandOf(i) === 'spell'), out = {}
  for (const a of sp) for (const b of sp) {
    if (a.id >= b.id) continue
    const clash = tw(a) === tw(b) || b.choices.some(c => words(c).includes(tw(a))) || a.choices.some(c => words(c).includes(tw(b)))
    if (!clash) continue
    const loser = changed.has(b.id) && !changed.has(a.id) ? b : changed.has(a.id) && !changed.has(b.id) ? a : b
    const other = loser === a ? b : a
    out[loser.id] = `E4-dup tested word clashes with ${other.id} ("${tw(a)}" / "${tw(b)}")`
  }
  return out
}

// ---------- T2: does ANY simple structural feature predict the key? ----------
const FEAT = {
  len: s => s.length, words: s => s.trim().split(/\s+/).length, caps: s => (s.match(/[A-Z]/g) ?? []).length,
  marks: s => (s.match(MARKS) ?? []).length, commas: s => (s.match(/,/g) ?? []).length,
  doubles: s => (s.match(/([a-z])\1/gi) ?? []).length, vowels: s => (s.match(/[aeiouy]/gi) ?? []).length,
}
const idx = (v, p) => v.map((x, i) => (p(x) ? i : -1)).filter(i => i >= 0)
const SEL = {
  unique_max: v => { const a = idx(v, x => x === Math.max(...v)); return a.length === 1 ? a : null },
  unique_min: v => { const a = idx(v, x => x === Math.min(...v)); return a.length === 1 ? a : null },
  between: v => { const mx = Math.max(...v), mn = Math.min(...v), a = idx(v, x => x > mn && x < mx); return a.length ? a : null },
  at_max: v => { const a = idx(v, x => x === Math.max(...v)); return a.length < v.length ? a : null },
  at_min: v => { const a = idx(v, x => x === Math.min(...v)); return a.length < v.length ? a : null },
  mode: v => { const c = {}; v.forEach(x => (c[x] = (c[x] ?? 0) + 1)); const top = Math.max(...Object.values(c)), tv = Object.keys(c).filter(k => c[k] === top); if (top < 2 || tv.length !== 1) return null; const a = idx(v, x => String(x) === tv[0]); return a.length < v.length ? a : null },
  odd_one: v => { const c = {}; v.forEach(x => (c[x] = (c[x] ?? 0) + 1)); if (Math.max(...Object.values(c)) < 2) return null; const a = idx(v, x => c[x] === 1); return a.length ? a : null },
}
export const T2_FEATURES = [...Object.keys(FEAT), 'dlsum']
export function heuristics(items) {
  const names = []
  for (const f of T2_FEATURES) for (const s of Object.keys(SEL)) names.push(`${s}(${f})`)
  const sets = items.map(it => {
    const ch = it.choices.map(String)
    const vals = { ...Object.fromEntries(Object.entries(FEAT).map(([k, f]) => [k, ch.map(f)])), dlsum: ch.map((a, i) => ch.reduce((s, b, j) => s + (i === j ? 0 : dl(a, b)), 0)) }
    const out = []
    for (const f of T2_FEATURES) for (const sel of Object.values(SEL)) out.push(sel(vals[f]))
    return { n: ch.length, sets: out }
  })
  return { names, sets }
}
/** Expected score of each heuristic: pick uniformly within its set; a heuristic that does not fire guesses (1/n). */
export function hscores(H, keyIdx) {
  return H.names.map((_, h) => H.sets.reduce((s, it, i) => { const S = it.sets[h]; return s + (S ? (S.includes(keyIdx[i]) ? 1 / S.length : 0) : 1 / it.n) }, 0) / H.sets.length)
}
/**
 * T2 verdict over a set of items. The control is DERIVED (mean 1/n_options,
 * = the expected score of any heuristic when the key is a random option).
 * Family-wise significance by Westfall-Young min-p over T2_PERMS seeded
 * permutations of the key position. FIRES when the min-p heuristic scores
 * >= control + T2_MARGIN AND its family-wise p < T2_ALPHA.
 */
export function t2(items, { perms = T2_PERMS, seed = 20261012, keyIdx } = {}) {
  if (!items.length) die('T2 over zero items')
  const H = heuristics(items)
  const k = keyIdx ?? items.map(it => it.choices.map(String).indexOf(String(it.correct_answer)))
  if (k.some(x => x < 0)) die('T2: an item has no key among its choices')
  const obs = hscores(H, k), r = rng(seed)
  const nulls = Array.from({ length: perms }, () => hscores(H, items.map(it => Math.floor(r() * it.choices.length))))
  const cols = H.names.map((_, h) => nulls.map(v => v[h]).sort((a, b) => a - b))
  const pOf = (h, x) => { const c = cols[h]; let lo = 0, hi = c.length; while (lo < hi) { const m = (lo + hi) >> 1; if (c[m] < x - 1e-12) lo = m + 1; else hi = m } return (c.length - lo + 1) / (c.length + 1) }
  const pobs = obs.map((x, h) => pOf(h, x)), minObs = Math.min(...pobs)
  const nullMin = nulls.map(v => Math.min(...v.map((x, h) => pOf(h, x))))
  const fwP = (nullMin.filter(m => m <= minObs + 1e-12).length + 1) / (perms + 1)
  const hb = pobs.indexOf(minObs)
  const control = items.reduce((s, it) => s + 1 / it.choices.length, 0) / items.length
  const fires = obs[hb] >= control + T2_MARGIN - 1e-12 && fwP < T2_ALPHA
  const top = H.names.map((n, i) => [n, obs[i], pobs[i]]).sort((a, b) => b[1] - a[1]).slice(0, 5)
  return { n: items.length, control, best: H.names[hb], bestScore: obs[hb], rawP: minObs, fwP, fires, top, obs: Object.fromEntries(H.names.map((n, i) => [n, obs[i]])) }
}
const fmtT2 = r => `n=${r.n} control ${(100 * r.control).toFixed(1)}% | min-p heuristic ${r.best} ${(100 * r.bestScore).toFixed(1)}% raw p ${r.rawP.toFixed(4)} family-wise p ${r.fwP.toFixed(4)} -> ${r.fires ? 'FIRES' : 'clear'} | top: ${r.top.map(([n, s]) => `${n} ${(100 * s).toFixed(1)}`).join(', ')}`

export function batchChecks(items, s) {
  const errs = [], n = items.length
  let longest = 0, shortest = 0
  for (const it of items) {
    const L = it.choices.map(c => String(c).length), kl = String(it.correct_answer).length
    if (kl === Math.max(...L) && L.filter(x => x === kl).length === 1) longest++
    if (kl === Math.min(...L) && L.filter(x => x === kl).length === 1) shortest++
  }
  if (longest / n > 0.25) errs.push(`E3 key uniquely longest ${longest}/${n}`)
  if (shortest / n > 0.25) errs.push(`E3 key uniquely shortest ${shortest}/${n}`)
  const field = { cap: 'cap_rule', punct: 'punct_rule', gram: 'varied_dimension' }[s]
  if (field) { const v = items.map(i => String(i[field] ?? '').toLowerCase().trim()); if (new Set(v).size !== v.length) errs.push(`${field} repeats`) }
  if (s === 'spell') {
    const tested = items.map(i => (i.spelling_format === 'word' ? String(i.correct_answer) : String(i.intended_word ?? '')).toLowerCase())
    if (new Set(tested).size !== tested.length) errs.push('a tested spelling word repeats')
    items.forEach((it, a) => items.forEach((o, b) => { if (a !== b && o.choices.some(c => words(c).includes(tested[a]))) errs.push(`tested word "${tested[a]}" (${it.id}) appears in ${o.id}`) }))
  }
  const T = t2(items)
  if (T.fires) errs.push(`T2 ${T.best} predicts the key: ${(100 * T.bestScore).toFixed(1)}% vs control ${(100 * T.control).toFixed(1)}%, family-wise p ${T.fwP.toFixed(4)}`)
  // Amendment 1: Spelling's two formats have different option structure, and a
  // tell confined to one format is diluted by the other in the strand-level test.
  const perFormat = {}
  if (s === 'spell') for (const f of ['word', 'sentence']) {
    const sub = items.filter(i => i.spelling_format === f)
    if (!sub.length) continue
    const Tf = (perFormat[f] = t2(sub))
    if (Tf.fires) errs.push(`T2[${f}] ${Tf.best} predicts the key: ${(100 * Tf.bestScore).toFixed(1)}% vs control ${(100 * Tf.control).toFixed(1)}%, family-wise p ${Tf.fwP.toFixed(4)}`)
  }
  return { errs, longest, shortest, n, t2: T, perFormat }
}

// ---------- bars ----------
export function wsItem(cold, keyed, letter) {
  const why = []
  for (const [t, g] of cold) {
    if (g.pick !== letter) why.push(`${t} picked ${g.pick}!=${letter}`)
    if (g.second_defensible && g.second_defensible !== 'none') why.push(`${t} 2nd ${g.second_defensible}`)
    if (g.grade_fit !== 'fits') why.push(`${t} ${g.grade_fit}`)
  }
  const dd = cold.map(([, g]) => new Set([].concat(g.dead_distractors ?? []).map(String).filter(x => /^[A-D]$/.test(x))))
  const deadBoth = [...dd[0]].filter(x => dd[1].has(x))
  if (deadBoth.length) why.push(`dead by both ${deadBoth.join(',')}`)
  for (const [t, k] of keyed) {
    if (k.key_verdict !== 'correct') why.push(`${t} keyed: key ${k.key_verdict}`)
    if (k.accepted_alternative && k.accepted_alternative !== 'none') why.push(`${t} keyed: alternative ${k.accepted_alternative}`)
  }
  return { pass: why.length === 0, why, deadBoth }
}
export function bars(r) {
  const mean = d => d.reduce((a, b) => a + b, 0) / d.length
  const ma = mean(r.diffs.a), mb = mean(r.diffs.b)
  const ooValid = r.ctlPct >= 25
  const ooBar = r.ctlPct - 10
  return {
    b: r.pass >= passBar(r.n),
    c: r.easier <= easierMax(r.n) && r.harder < harderLt(r.n),
    d: Math.abs(ma) <= 0.5 + 1e-12 && Math.abs(mb) <= 0.5 + 1e-12,
    oo: ooValid && ooBar <= 100 && r.candPct >= ooBar - 1e-9,
    ooValid, ooBar, ma, mb,
  }
}

// ---------- selftest ----------
async function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  const z = (n, v) => Array(n).fill(v)
  // bars at every strand size
  for (const [s, n] of STRANDS.map(s => [s, nFrozen(s)])) {
    const base = { n, pass: n, easier: 0, harder: 0, diffs: { a: z(n, 0), b: z(n, 0) }, candPct: 90, ctlPct: 70 }
    const pb = passBar(n), em = easierMax(n), hl = harderLt(n)
    expect(bars({ ...base, pass: pb }).b && !bars({ ...base, pass: pb - 1 }).b, `${s} n=${n} S1-b: ${pb} passes, ${pb - 1} fails`)
    expect(bars({ ...base, easier: em }).c && !bars({ ...base, easier: em + 1 }).c, `${s} S1-c: easier ${em} passes, ${em + 1} fails`)
    expect(bars({ ...base, harder: Math.ceil(hl) - 1 }).c && !bars({ ...base, harder: Math.ceil(hl) }).c, `${s} S1-c: harder ${Math.ceil(hl) - 1} passes, ${Math.ceil(hl)} fails`)
    const half = Math.floor(n / 2)
    expect(bars({ ...base, diffs: { a: [...z(half, -1), ...z(n - half, 0)], b: z(n, 0) } }).d === (half / n <= 0.5), `${s} S1-d: mean -${(half / n).toFixed(2)} ${half / n <= 0.5 ? 'passes' : 'fails'}`)
    expect(!bars({ ...base, diffs: { a: z(n, 0), b: [...z(half + 1, 1), ...z(n - half - 1, 0)] } }).d, `${s} S1-d: +${((half + 1) / n).toFixed(2)} fails`)
  }
  const ob = { n: 24, pass: 24, easier: 0, harder: 0, diffs: { a: z(24, 0), b: z(24, 0) } }
  expect(bars({ ...ob, candPct: 60, ctlPct: 70 }).oo && !bars({ ...ob, candPct: 59.9, ctlPct: 70 }).oo, 'S2: candidate 60 vs control 70 passes, 59.9 fails')
  expect(!bars({ ...ob, candPct: 100, ctlPct: 24.9 }).oo, 'S2: control below 25% is INVALID and cannot pass')
  expect(bars({ ...ob, candPct: 90, ctlPct: 100 }).oo && !bars({ ...ob, candPct: 89.9, ctlPct: 100 }).oo, 'S2 ceiling: at a 100% control the bar is 90, attainable both ways')
  const g = (pick, x = {}) => ({ pick, second_defensible: null, grade_fit: 'fits', grade_assigned: 6, dead_distractors: [], ...x })
  const k = (x = {}) => ({ key_verdict: 'correct', accepted_alternative: null, ...x })
  expect(wsItem([['a', g('B')], ['b', g('B')]], [['a', k()], ['b', k()]], 'B').pass, 'pilot-pass: clean item passes')
  expect(!wsItem([['a', g('B', { dead_distractors: ['C'] })], ['b', g('B', { dead_distractors: ['C'] })]], [['a', k()], ['b', k()]], 'B').pass, 'c4: dead by both fails')
  expect(wsItem([['a', g('B', { dead_distractors: ['C'] })], ['b', g('B', { dead_distractors: ['D'] })]], [['a', k()], ['b', k()]], 'B').pass, 'c4: dead by one each passes')
  expect(!wsItem([['a', g('B')], ['b', g('B')]], [['a', k({ key_verdict: 'disputed' })], ['b', k()]], 'B').pass, 'c5: one keyed dispute fails')
  expect(!wsItem([['a', g('B')], ['b', g('B')]], [['a', k({ accepted_alternative: 'A' })], ['b', k()]], 'B').pass, 'c5: an accepted alternative fails')
  expect(!wsItem([['a', g('B', { grade_fit: 'too_hard' })], ['b', g('B')]], [['a', k()], ['b', k()]], 'B').pass, 'c3: too_hard fails')
  expect(!wsItem([['a', g('B', { second_defensible: 'A' })], ['b', g('B')]], [['a', k()], ['b', k()]], 'B').pass, 'c2: a second defensible fails')
  // grids
  const capOk = { choices: ['We saw Lake Erie in the summer.', 'We saw Lake erie in the summer.', 'We saw Lake Erie in the Summer.', 'We saw Lake erie in the Summer.'], correct_answer: 'We saw Lake Erie in the summer.' }
  expect(grid(capOk).ok, 'G: clean token 2x2 passes')
  expect(!grid({ ...capOk, choices: ['We saw Lake Erie in the summer.', 'We saw Lake erie in the summer.', 'We saw Lake Erie in the Summer.', 'We saw lake Erie in the Summer.'] }).ok, 'G: both-option on the wrong site FAILS')
  const spOk = { choices: ['necessary', 'neccessary', 'necesary', 'neccesary'], correct_answer: 'necessary' }
  expect(dlGrid(spOk).ok, 'G-DL: necessary grid passes')
  expect(!dlGrid({ ...spOk, choices: ['necessary', 'neccessary', 'necesary', 'nesessary'] }).ok, 'G-DL: a both-option off the two sites FAILS')
  expect(!dlGrid({ ...spOk, choices: ['necessary', 'neccessary', 'neccesary', 'neccesery'] }).ok, 'G-DL: a single that is not a single edit FAILS')
  const adj = { choices: ["Our dog's loud, playful golden pup barks.", "Our dog's loud playful, golden pup barks.", "Our dog's loud playful golden pup barks.", "Our dog's loud, playful, golden pup barks."], correct_answer: "Our dog's loud, playful golden pup barks." }
  expect(grid(adj).ok, `G: a grid with ADJACENT sites passes (amendment 1) ${grid(adj).why ?? ''}`)
  expect(!grid({ ...adj, choices: ["Our dog's loud, playful golden pup barks.", "Our dog's loud playful, golden pup barks.", "Our dog's loud playful golden pup barks.", "Our dog's loud, playful, golden pup, barks."] }).ok, 'G: adjacent-site grid with a stray third site FAILS')
  for (const it of JSON.parse(readFileSync(SB + 'map-lu-mech-v1.batch.json', 'utf8'))) if (!grid(it).ok) expect(false, `G still passes every v1 frozen item (${it.id}: ${grid(it).why})`)
  // dictionary and variants
  expect(misspellingOk('seperate').length === 0, 'misspelling "seperate" is acceptable (non-word)')
  expect(misspellingOk('colour').length > 0, `misspelling "colour" (a UK form) is REFUSED: ${misspellingOk('colour')[0]}`)
  expect(misspellingOk('occurence').length > 0, 'misspelling "occurence" is refused (NSSpellChecker accepts it)')
  expect(misspellingOk('calender').length > 0, 'misspelling "calender" is refused (a real word, in web2)')
  for (const w of ['color', 'traveling', 'realize', 'defense', 'catalog', 'judgment', 'gray', 'center', 'canceled', 'jewelry', 'favorite', 'behavior', 'analyze', 'theater', 'fulfill', 'skillful', 'enrollment']) expect(!!variantHit(w), `variant guard refuses key "${w}": ${variantHit(w)}`)
  for (const w of ['organizer', 'paralyzed', 'totaling', 'skillfully', 'lodgment', 'memorized', 'organisation']) expect(!!variantHit(w) && !VARIANT_WORDS.has(w), `variant guard refuses "${w}" by PATTERN alone (not on the list): ${variantHit(w)}`)
  for (const w of ['careful', 'helpful', 'smiled', 'controlled', 'detour', 'parallel', 'excellent', 'calendar']) expect(!variantHit(w), `variant guard does not over-refuse "${w}"${variantHit(w) ? ': ' + variantHit(w) : ''}`)
  for (const w of ['necessary', 'separate', 'privilege', 'embarrass', 'occurrence', 'accommodate', 'conscience', 'rhythm', 'government', 'receive', 'beginning', 'believe', 'environment', 'February', 'library', 'definitely', 'maintenance', 'acquaintance', 'perseverance', 'immediately', 'especially', 'existence', 'cemetery', 'argument']) expect(!variantHit(w), `variant guard passes "${w}"${variantHit(w) ? ': ' + variantHit(w) : ''}`)
  // spelling item checks
  const sw = { map_strand: 'Spelling', spelling_format: 'word', grade_target: 6, ccss: 'L.6.2b', prompt: 'Which word correctly completes the sentence?\n\nWearing goggles is ____ for the lab.', choices: ['necessary', 'neccessary', 'necesary', 'neccesary'], correct_answer: 'necessary' }
  expect(structural(sw).errs.length === 0, `spelling word item passes (${structural(sw).errs.join('; ') || 'clean'})`)
  expect(structural({ ...sw, choices: ['color', 'colour', 'coler', 'couler'], correct_answer: 'color' }).errs.some(e => /variant|NSSpell/.test(e)), 'spelling: color/colour item REFUSED')
  const ss = { map_strand: 'Spelling', spelling_format: 'sentence', grade_target: 7, ccss: 'L.7.2b', prompt: 'Which sentence has a spelling error?', choices: ['The library was quiet.', 'We will seperate the papers.', 'Her argument was strong.', 'The cemetery is old.'], correct_answer: 'We will seperate the papers.', misspelled_word: 'seperate', intended_word: 'separate' }
  ss.targets = { [ss.choices[0]]: 'library', [ss.choices[1]]: 'seperate', [ss.choices[2]]: 'argument', [ss.choices[3]]: 'cemetery' }
  expect(structural(ss).errs.length === 0, `spelling sentence item passes (${structural(ss).errs.join('; ') || 'clean'})`)
  const ss2 = { ...ss, choices: ['The library was quiet.', 'We will seperate the papers.', 'Her argument was strong.', 'The colour is odd.'] }
  ss2.targets = { ...ss.targets, 'The colour is odd.': 'colour' }; delete ss2.targets['The cemetery is old.']
  expect(structural(ss2).errs.some(e => /variant/.test(e)), 'spelling sentence with "colour" as a target REFUSED')
  const ss3 = { ...ss, choices: ['The libary was quiet.', 'We will seperate the papers.', 'Her argument was strong.', 'The cemetery is old.'] }
  ss3.targets = { 'The libary was quiet.': 'library', ...Object.fromEntries(Object.entries(ss.targets).slice(1)) }
  expect(structural(ss3).errs.some(e => /E4/.test(e)), 'spelling sentence with a second misspelling REFUSED')
  const ssCase = { ...ss, choices: ['The library opens on Saturday.', 'We will seperate the papers.', 'Her argument was strong.', 'The cemetery is old.'] }
  ssCase.targets = { 'The library opens on Saturday.': 'library', ...Object.fromEntries(Object.entries(ss.targets).slice(1)) }
  expect(structural(ssCase).errs.length === 0, `spelling sentence: a capitalized proper noun passes (amendment 1) ${structural(ssCase).errs.join('; ')}`)
  const ssLow = { ...ssCase, choices: ['The library opens on saturday.', ...ssCase.choices.slice(1)] }
  ssLow.targets = { 'The library opens on saturday.': 'library', ...Object.fromEntries(Object.entries(ssCase.targets).slice(1)) }
  expect(structural(ssLow).errs.some(e => /saturday/.test(e)), 'spelling sentence: a lowercased proper noun is still refused')
  const ranked = { ...ss, choices: ['The library was very quiet today.', 'We will seperate the papers.', 'Her argument was strong.', 'The old cemetery is near.'] }
  ranked.targets = { [ranked.choices[0]]: 'library', [ranked.choices[1]]: 'seperate', [ranked.choices[2]]: 'argument', [ranked.choices[3]]: 'cemetery' }
  const lens = ranked.choices.map(c => c.length), kr = [...lens].sort((a, b) => b - a).indexOf(ranked.choices[1].length) + 1
  expect(structural({ ...ranked, key_length_rank: kr }).errs.filter(e => /L-rank/.test(e)).length === (([...lens].sort((a, b) => b - a).slice(1).some((x, i, a) => [...lens].sort((p, q) => q - p)[i] - x < 3)) ? 1 : 0), 'L-rank: the assigned rank is read correctly')
  expect(structural({ ...ranked, key_length_rank: kr === 1 ? 2 : 1 }).errs.some(e => /L-rank the key/.test(e)), 'L-rank: a wrong rank FAILS')
  const tellSet = Array.from({ length: 8 }, (_, i) => ({ ...ss, id: 's' + i, choices: ['A short one here.', 'This is the much longer misspeled sentence ' + 'x'.repeat(i), 'Another short one.', 'A third short one.'], correct_answer: 'This is the much longer misspeled sentence ' + 'x'.repeat(i) }))
  const wordSet = Array.from({ length: 16 }, (_, i) => ({ ...sw, id: 'w' + i, correct_answer: ['necessary', 'neccessary', 'necesary', 'neccesary'][i % 4] }))
  const mixed = [...tellSet, ...wordSet]
  const bm = batchChecks(mixed.map(i => ({ ...i, intended_word: 'x' + i.id })), 'spell')
  expect(bm.perFormat.sentence?.fires, `T2[sentence]: a format-confined length tell FIRES (${fmtT2(bm.perFormat.sentence)})`)
  const d1 = { ...sw, id: 'X-01', correct_answer: 'occasion', choices: ['occasion', 'ocasion', 'occassion', 'ocassion'] }, d2 = { ...d1, id: 'X-02' }
  expect(Object.keys(dupFails([d1, d2], new Set(['X-01'])))[0] === 'X-01', 'E4-dup: the REVISED item of a clashing pair fails')
  expect(Object.keys(dupFails([d1, d2]))[0] === 'X-02', 'E4-dup: with neither revised, the later id fails')
  expect(!Object.keys(dupFails([d1, { ...sw, id: 'X-03' }])).length, 'E4-dup: distinct words do not clash')
  // E1 bound by grade
  const long = 'The members of the environmental committee considered several complicated proposals regarding municipal transportation infrastructure improvements.'
  expect(e1({ grade_target: 8, prompt: '', choices: [long, long, long, long] }).errs.length > 0, 'E1: dense adult prose fails at grade 8')
  // T2 break-tests: the v1 batch's known tells, at the band that matters
  const v1 = JSON.parse(readFileSync(SB + 'map-lu-mech-v1.batch.json', 'utf8'))
  const v1s = s => v1.filter(i => strandOf(i) === s)
  const rc = t2(v1s('cap')), rp = t2(v1s('punct')), rg = t2(v1s('gram'))
  expect(rc.fires, `T2 FIRES on v1 Capitalization (the 50% mixed-key tell): ${fmtT2(rc)}`)
  expect(rp.fires, `T2 FIRES on v1 Punctuation (the MARGINAL 37.5-40.6% tell): ${fmtT2(rp)}`)
  expect(!rg.fires, `T2 is clear on v1 Grammar (28.1%, no tell): ${fmtT2(rg)}`)
  // marginal construct: rebalance v1 Capitalization by mirroring half its items (key becomes the extreme) -> must clear
  // a single-error option is a uniform (count-extreme) option in these grids; moving the key there makes it extreme
  const mirror = (it, j) => { const key = String(it.correct_answer); const singles = it.choices.map(String).filter(c => c !== key).sort((a, b) => touched(key, a).size - touched(key, b).size).slice(0, 2); return { ...it, correct_answer: singles[j % 2] } }
  const bal = v1s('cap').map((it, i) => (i % 2 ? mirror(it, (i - 1) / 2) : it))
  const rb = t2(bal)
  expect(!rb.fires, `T2 clears a half-mirrored Capitalization strand (keys half mixed, half extreme): ${fmtT2(rb)}`)
  // null false-refusal rate on real option sets, random keys
  const rr = rng(4242); let fp = 0; const T = 100
  for (let t = 0; t < T; t++) { const kk = v1.map(() => Math.floor(rr() * 4)); if (t2(v1, { perms: 1000, seed: t + 1, keyIdx: kk }).fires) fp++ }
  console.log(`info T2 null false-refusal rate on v1 option sets with random keys: ${fp}/${T}`)
  expect(fp / T <= 0.15, `T2 null false-refusal rate ${fp}/${T} <= 15%`)
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed: every bar and check can fail at its margin')
  process.exit(fail ? 1 : 0)
}

// ---------- modes ----------
const [mode, arg] = process.argv.slice(2)
const isMain = import.meta.url === `file://${process.argv[1]}`
if (!isMain) { /* imported */ }
else if (mode === '--selftest') await selftest()
else if (mode === 'spell') {
  const ws = process.argv.slice(3)
  if (!ws.length) die('usage: spell <word...>')
  const ns = nsspell(ws.map(w => w.toLowerCase()))
  ws.forEach((w, i) => console.log(`${w.padEnd(18)} NSSpellChecker ${ns[i] ? 'accepts' : 'rejects'} | web2 ${web2().has(w.toLowerCase()) ? 'yes' : 'no'} | as a correct word: ${variantHit(w) ? 'REFUSED (' + variantHit(w) + ')' : 'ok'} | as a misspelling: ${misspellingOk(w).length ? 'REFUSED (' + misspellingOk(w).join('; ') + ')' : 'ok'}`))
}
else if (mode === 'select-control') {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = []
  for (const [fam, sec, dom] of [['sat', 'reading_writing', 'Standard English Conventions'], ['act', 'english', 'Conventions of Standard English']]) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('study_item_bank').select('id,family,section,domain,subskill,difficulty,item').eq('family', fam).eq('section', sec).eq('domain', dom).eq('verified', true).eq('archived', false).in('difficulty', ['easy', 'medium']).order('id').range(from, from + 999)
      if (error) die(error.message)
      rows.push(...data); if (data.length < 1000) break
    }
  }
  if (rows.length < 200) die(`only ${rows.length} live conventions rows read`)
  const PUNCT = /punctuat|boundar|comma|semicolon|colon|dash|apostroph|possessive|splice|run-on|parenthe|quotation/i, FRAG = /fragment/i
  const four = rows.filter(r => Array.isArray(r.item?.choices) && r.item.choices.length === 4 && r.item.choices.includes(r.item.correct_answer))
  const h = r => createHash('sha256').update('map-lu-v2-control:' + r.id).digest('hex')
  const punct = four.filter(r => !FRAG.test(r.subskill ?? '') && PUNCT.test(r.subskill ?? '')).sort((a, b) => (h(a) < h(b) ? -1 : 1)).slice(0, 12)
  const gram = four.filter(r => FRAG.test(r.subskill ?? '') || !PUNCT.test(r.subskill ?? '')).sort((a, b) => (h(a) < h(b) ? -1 : 1)).slice(0, 12)
  if (punct.length !== 12 || gram.length !== 12) die('could not fill 12 + 12')
  const ctl = [...punct.map(r => ({ ...r, ctl: 'punct' })), ...gram.map(r => ({ ...r, ctl: 'gram' }))].map(r => ({ id: r.id, family: r.family, domain: r.domain, subskill: r.subskill, difficulty: r.difficulty, ctl: r.ctl, choices: r.item.choices, correct_answer: r.item.correct_answer }))
  wr(W + 'control.json', ctl)
  const hist = {}; for (const c of ctl) { const kk = `${c.family}/${c.ctl}/${c.difficulty}`; hist[kk] = (hist[kk] ?? 0) + 1 }
  console.log(`control: ${ctl.length} of ${four.length} eligible four-choice live conventions rows (easy+medium) from ${rows.length} read; ${JSON.stringify(hist)}`)
}
else if (mode === 'checks' || mode === 't2') {
  if (!arg) die(`usage: ${mode} <batch.json>`)
  const items = rd(arg)
  if (!Array.isArray(items) || !items.length) die(`${arg} holds no items`)
  let bad = 0, batchBad = 0
  for (const s of STRANDS) {
    const its = items.filter(i => strandOf(i) === s)
    if (!its.length) continue
    console.log(`\n== ${s}: ${its.length} items`)
    if (mode === 'checks') {
      let scored = 0, unsc = 0
      for (const it of its) {
        const r = structural(it); scored += r.e1.scored; unsc += r.e1.unscorable
        console.log(`${r.errs.length ? 'FAIL' : 'ok  '} ${it.id} [g${it.grade_target} ${it.ccss}${it.spelling_format ? ' ' + it.spelling_format : ''}]${r.errs.length ? '\n       x ' + r.errs.join('\n       x ') : ''}`)
        if (r.errs.length) bad++
      }
      console.log(`E1 denominator: ${scored} scored units (>= 15 words), ${unsc} unscorable`)
    }
    const b = batchChecks(its, s)
    console.log(`E3 key uniquely longest ${b.longest}/${b.n}, uniquely shortest ${b.shortest}/${b.n}`)
    console.log(`T2 ${fmtT2(b.t2)}`)
    for (const [f, r] of Object.entries(b.perFormat)) console.log(`T2[${f}] ${fmtT2(r)}`)
    for (const e of b.errs) { console.log(`BATCH FAIL ${e}`); batchBad++ }
  }
  const unknown = items.filter(i => !strandOf(i)); if (unknown.length) { console.log(`unknown strand on ${unknown.map(i => i.id).join(', ')}`); bad += unknown.length }
  console.log(bad || batchBad ? `\n${bad} item failure(s), ${batchBad} batch failure(s)` : `\nall ${items.length} items pass every exact check`)
  process.exit(bad || batchBad ? 1 : 0)
}
else if (mode === 'teacher-input') {
  const items = rd(W + 'batch.authored.json')
  wr(W + 'teacher.input.json', items.map(it => ({ id: it.id, grade_target: it.grade_target, strand: it.map_strand, prompt: it.prompt, correct_answer: it.correct_answer, wrong_options: it.choices.filter(c => c !== it.correct_answer) })))
  console.log(`teacher input: ${items.length} items, ${items.length * 3} wrong options`)
}
else if (mode === 'teacher-merge') {
  const items = rd(W + 'batch.authored.json'), ta = rd(W + 'teacher-a.json'), tb = rd(W + 'teacher-b.json')
  const out = []; let n = 0, noA = 0, noB = 0
  for (const it of items) {
    const ra = ta[it.id]?.distractors, rb = tb[it.id]?.distractors
    if (ra?.length !== 3 || rb?.length !== 3) die(`${it.id}: a teacher file lacks 3 ratings`)
    const no = []
    for (const opt of it.choices.filter(c => c !== it.correct_answer)) {
      n++
      const a = ra.find(d => d.option === opt), b = rb.find(d => d.option === opt)
      if (!a || !b) die(`${it.id}: rating missing for "${opt.slice(0, 40)}"`)
      if (a.would_pick !== 'yes') noA++
      if (b.would_pick !== 'yes') noB++
      if (a.would_pick !== 'yes' || b.would_pick !== 'yes') no.push({ option: opt, reasons: [a, b].filter(x => x.would_pick !== 'yes').map(x => x.reason) })
    }
    if (no.length) out.push({ item: it, rated_no: no })
  }
  wr(W + 'revise.input.json', out)
  console.log(`teacher round 1: ${n} wrong options; rater a NO ${noA}, rater b NO ${noB}; union NO ${out.reduce((s, x) => s + x.rated_no.length, 0)} on ${out.length} items -> revise.input.json`)
}
else if (mode === 'rerate-input') {
  const rev = rd(W + 'revised.json'), orig = Object.fromEntries(rd(W + 'batch.authored.json').map(i => [i.id, i]))
  const out = rev.map(it => ({ id: it.id, grade_target: it.grade_target, strand: it.map_strand, prompt: it.prompt, correct_answer: it.correct_answer, wrong_options: it.choices.filter(c => c !== it.correct_answer && !orig[it.id].choices.includes(c)) })).filter(x => x.wrong_options.length)
  wr(W + 'rerate.input.json', out)
  console.log(`re-rate input: ${out.length} items, ${out.reduce((s, x) => s + x.wrong_options.length, 0)} rewritten options`)
}
else if (mode === 'repair-input' || mode === 'freeze') {
  const authored = rd(W + 'batch.authored.json')
  const rev = existsSync(W + 'revised.json') ? Object.fromEntries(rd(W + 'revised.json').map(i => [i.id, i])) : {}
  const dropped = []
  if (Object.keys(rev).length) {
    const ra = rd(W + 'rerate-a.json'), rb = rd(W + 'rerate-b.json')
    for (const id of Object.keys(rev)) {
      const orig = authored.find(i => i.id === id)
      const newOpts = rev[id].choices.filter(c => c !== rev[id].correct_answer && !orig.choices.includes(c))
      for (const opt of newOpts) {
        const a = ra[id]?.distractors?.find(d => d.option === opt), b = rb[id]?.distractors?.find(d => d.option === opt)
        if (!a || !b) die(`${id}: re-rate missing for "${opt.slice(0, 40)}"`)
        if (a.would_pick !== 'yes' || b.would_pick !== 'yes') { dropped.push(id); break }
      }
    }
  }
  const after = authored.map(i => rev[i.id] ?? i).filter(i => !dropped.includes(i.id))
  if (mode === 'repair-input') {
    const dups = dupFails(after, new Set(Object.keys(rev)))
    const failing = after.map(i => [i, [...structural(i).errs, ...(dups[i.id] ? [dups[i.id] + '. Every tested spelling word in the batch: ' + after.filter(x => strandOf(x) === 'spell').map(x => (x.spelling_format === 'word' ? x.correct_answer : x.intended_word)).join(', ')] : [])]]).filter(([, e]) => e.length)
    wr(W + 'repair.input.json', failing.map(([item, errors]) => ({ item, errors })))
    console.log(`dropped at re-rate: ${dropped.join(', ') || 'none'}; ${failing.length} items fail an exact check -> repair.input.json`)
    for (const [i, e] of failing) console.log(`  ${i.id}: ${e.join('; ')}`)
    process.exit(0)
  }
  const repairs = existsSync(W + 'repairs.json') ? rd(W + 'repairs.json') : {}
  const fixed = after.map(i => repairs[i.id] ?? i)
  const dups = dupFails(fixed, new Set([...Object.keys(rev), ...Object.keys(repairs)]))
  const errsOf = i => [...structural(i).errs, ...(dups[i.id] ? [dups[i.id]] : [])]
  const exactFail = fixed.filter(i => errsOf(i).length)
  const survivors = fixed.filter(i => !errsOf(i).length)
  console.log(`dropped at teacher re-rate: ${dropped.join(', ') || 'none'}`)
  console.log(`failing exact checks after repairs (dropped): ${exactFail.map(i => `${i.id} (${errsOf(i)[0]})`).join('; ') || 'none'}`)
  const frozen = [], report = {}
  for (const s of STRANDS) {
    const pick = []
    for (const [gr, q] of Object.entries(FREEZE[s])) pick.push(...survivors.filter(i => strandOf(i) === s && i.grade_target === +gr).slice(0, q))
    if (pick.length) wr(W + `stage0-pick-${s}.json`, pick)
    const short = Object.entries(FREEZE[s]).filter(([gr, q]) => pick.filter(i => i.grade_target === +gr).length < q).map(([gr]) => gr)
    if (short.length) { report[s] = { stage0: 'FAIL', why: `fewer survivors than the quota at grade ${short.join(',')}`, n: pick.length }; continue }
    const b = batchChecks(pick, s)
    console.log(`${s}: T2 ${fmtT2(b.t2)}`)
    for (const [f, r] of Object.entries(b.perFormat)) console.log(`${s}: T2[${f}] ${fmtT2(r)}`)
    if (b.errs.length) { report[s] = { stage0: 'FAIL', why: b.errs.join('; '), n: pick.length, t2: { best: b.t2.best, score: b.t2.bestScore, fwP: b.t2.fwP } }; continue }
    report[s] = { stage0: 'pass', n: pick.length, ids: pick.map(i => i.id), t2: { best: b.t2.best, score: b.t2.bestScore, fwP: b.t2.fwP }, longest: b.longest, shortest: b.shortest }
    frozen.push(...pick)
  }
  // pooled T2 across every strand that passed: a pattern spread thinly over strands
  if (frozen.length) {
    const P = t2(frozen)
    console.log(`pooled: T2 ${fmtT2(P)}`)
    if (P.fires) {
      const H = heuristics([frozen[0]]), h = H.names.indexOf(P.best)
      for (const s of STRANDS.filter(x => report[x]?.stage0 === 'pass')) {
        const its = frozen.filter(i => strandOf(i) === s), sc = t2(its, { perms: 200 }).obs[P.best]
        if (sc >= P.control + T2_MARGIN) { report[s] = { ...report[s], stage0: 'FAIL', why: `pooled T2 ${P.best} fires (fw p ${P.fwP.toFixed(4)}) and scores ${(100 * sc).toFixed(1)}% in this strand` } }
      }
      void h
    }
    report._pooled = { best: P.best, score: P.bestScore, fwP: P.fwP, fires: P.fires, n: P.n }
  }
  const keep = frozen.filter(i => report[strandOf(i)]?.stage0 === 'pass')
  for (const s of STRANDS) console.log(`STAGE 0 ${s}: ${report[s]?.stage0 ?? 'absent'}${report[s]?.why ? ' - ' + report[s].why : ''} (n=${report[s]?.n ?? 0})`)
  if (!keep.length) { console.log('STAGE 0: no strand passed. Nothing frozen.'); process.exit(1) }
  wr(W + 'frozen.json', keep)
  wr(W + 'stage0.json', report)
  for (const s of STRANDS.filter(x => report[x]?.stage0 === 'pass')) wr(W + `frozen-${s}.json`, keep.filter(i => strandOf(i) === s))
  console.log(`FROZEN ${keep.length} items -> ${W}frozen.json; sha256 ${sha(W + 'frozen.json')}; grades ${JSON.stringify(keep.reduce((o, i) => ((o[`${strandOf(i)}${i.grade_target}`] = (o[`${strandOf(i)}${i.grade_target}`] ?? 0) + 1), o), {}))}`)
}
else if (mode === 'render') {
  const cand = rd(W + 'frozen.json'), ctl = rd(W + 'control.json')
  if (ctl.length !== 24) die(`control has ${ctl.length}, need 24`)
  const place = (choices, key, letter, r) => { const rest = shuffleWith(choices.filter(c => c !== key), r); let q = 0; return Object.fromEntries(SL.map(s => [s, s === letter ? key : rest[q++]])) }
  const flat = (n, r) => shuffleWith(Array.from({ length: n }, (_, i) => SL[i % 4]), r)
  const groups = items => { const g = {}; items.forEach(i => (g[i.arm === 'ctl' ? 'ctl' : strandOf(i)] ??= []).push(i)); return g }
  const deal = (items, r) => { const g = groups(items), q = Object.fromEntries(Object.entries(g).map(([k, v]) => [k, flat(v.length, r)])); return items.map(i => q[i.arm === 'ctl' ? 'ctl' : strandOf(i)].pop()) }
  const all = [...cand.map(i => ({ ...i, arm: 'cand' })), ...ctl.map(i => ({ ...i, arm: 'ctl' }))]
  let seed = 20261014, tries = 0, order, letters, r
  for (;;) { tries++; r = rng(seed++); order = shuffleWith(all.slice(), r); letters = deal(order, r); if (!periodicity(letters.join('')).fail) break; if (tries > 2000) die('no E8-clean oo deal') }
  const blind = {}, okey = {}
  order.forEach((it, i) => { const id = `Q${String(i + 1).padStart(2, '0')}`; blind[id] = { options: place(it.choices.map(String), String(it.correct_answer), letters[i], r) }; okey[id] = { letter: letters[i], arm: it.arm, localId: it.id, strand: it.arm === 'cand' ? strandOf(it) : it.ctl } })
  wr(W + 'oo.blind.json', blind); wr(W + 'oo.key.json', okey)
  console.log(`oo render: ${order.length} items (${cand.length} candidates + 24 control), seeds tried ${tries}`)
  seed = 20261015; tries = 0
  const cs = cand.map(i => ({ ...i, arm: 'cand' }))
  for (;;) { tries++; r = rng(seed++); order = shuffleWith(cs.slice(), r); letters = deal(order, r); if (!periodicity(letters.join('')).fail) break; if (tries > 2000) die('no E8-clean ws deal') }
  const N = cand.length
  const intro = `Each item: strand, target grade, question, four options.`
  const md = [`# Items for review (${N})\n\n${intro} The correct answer is NOT marked.\n`], mdk = [`# Items for review (${N}), KEYED\n\nThe same ${N} items in the same order, now with the intended answer marked.\n`], wkey = {}
  order.forEach((it, i) => {
    const n = i + 1, opts = place(it.choices.map(String), String(it.correct_answer), letters[i], r)
    wkey[n] = { letter: letters[i], localId: it.id, strand: strandOf(it), grade_target: it.grade_target, choices: SL.map(s => opts[s]) }
    const head = `---\n\n## Item ${n}\n\nStrand: ${it.map_strand} | Target grade: ${it.grade_target}\n\nQuestion: ${it.prompt}\n\n${SL.map(s => `${s}. ${opts[s]}`).join('\n')}\n`
    md.push(head); mdk.push(head + `\nIntended answer: **${letters[i]}**\n`)
  })
  writeFileSync(W + 'ws.md', md.join('\n')); writeFileSync(W + 'ws.keyed.md', mdk.join('\n')); wr(W + 'ws.key.json', wkey)
  const slots = {}; Object.values(wkey).forEach(k => { const o = (slots[k.strand] ??= {}); o[k.letter] = (o[k.letter] ?? 0) + 1 })
  console.log(`ws render: ${N} items, seeds tried ${tries}, key slots per strand ${JSON.stringify(slots)}`)
}
else if (mode === 'score') {
  const okey = rd(W + 'oo.key.json'), ids = Object.keys(okey)
  const sol = ['a', 'b', 'c'].map(s => rd(W + `oo.solver-${s}.json`))
  for (const [i, s] of sol.entries()) { const miss = ids.filter(id => !/^[A-D]$/.test(s[id]?.pick ?? '')); if (miss.length) die(`solver ${'abc'[i]} missing ${miss.length} picks`) }
  const arm = {}, flags = []
  for (const id of ids) {
    const k = okey[id], picks = sol.map(s => s[id].pick), h = picks.filter(p => p === k.letter).length
    const key = k.arm === 'ctl' ? 'ctl' : k.strand
    const a = (arm[key] ??= { n: 0, hits: 0, unan: 0, unanKey: 0 }); a.n++; a.hits += h
    if (new Set(picks).size === 1) { a.unan++; if (h === 3) a.unanKey++; else if (k.arm === 'cand') flags.push(`${k.localId} unanimous on ${picks[0]} (key ${k.letter})`) }
  }
  if (arm.ctl?.n !== 24) die('oo control arm is not 24')
  const pct = a => (100 * a.hits) / (3 * a.n)
  console.log(`OPTIONS-ONLY (stems withheld), 3 samples of one Claude solver; denominators: picks = 3 x items per arm`)
  for (const [n, a] of Object.entries(arm)) console.log(`  ${n.padEnd(6)} n=${a.n} (${3 * a.n} picks) ${pct(a).toFixed(1)}% on key; unanimous ${a.unan}/${a.n} (on key ${a.unanKey})`)
  console.log(`  candidate items unanimous on a NON-key letter: ${flags.join('; ') || 'none'}`)
  const wkey = rd(W + 'ws.key.json'), wids = Object.keys(wkey)
  const cold = ['a', 'b'].map(t => [t, rd(W + `ws.grader-${t}.json`)]), keyed = ['a', 'b'].map(t => [t, rd(W + `ws.keyed-${t}.json`)])
  for (const [t, g] of cold) { const miss = wids.filter(i => !/^[A-D]$/.test(g[i]?.pick ?? '') || !['fits', 'too_easy', 'too_hard'].includes(g[i]?.grade_fit) || !Number.isFinite(+g[i]?.grade_assigned)); if (miss.length) die(`cold grader ${t} incomplete on ${miss.join(',')}`) }
  for (const [t, g] of keyed) { const miss = wids.filter(i => !['correct', 'wrong', 'disputed'].includes(g[i]?.key_verdict)); if (miss.length) die(`keyed grader ${t} incomplete on ${miss.join(',')}`) }
  const frozen = rd(W + 'frozen.json')
  if (wids.length !== frozen.length) die(`with-source has ${wids.length} items, frozen ${frozen.length}`)
  console.log(`\nWITH-SOURCE, two fresh Claude graders, cold then keyed; ${wids.length} items x 2 graders per stage`)
  const out = { strands: {}, oo: { arm: Object.fromEntries(Object.entries(arm).map(([k, a]) => [k, { n: a.n, pct: pct(a), unan: a.unan, unanKey: a.unanKey }])), flags } }
  const st0 = rd(W + 'stage0.json')
  let anyPass = false
  console.log(`\nBARS PER STRAND (MAP-LU-V2.prereg.md)`)
  for (const s of STRANDS) {
    const its = frozen.filter(i => strandOf(i) === s)
    if (!its.length) { console.log(`\n[${s}] not frozen (Stage 0 ${st0[s]?.stage0 ?? 'absent'}: ${st0[s]?.why ?? ''}) -> FAIL, nothing inserted`); out.strands[s] = { verdict: 'FAIL', stage0: st0[s] ?? null, passIds: [] }; continue }
    const n = its.length
    if (n !== nFrozen(s)) die(`${s}: frozen ${n}, prereg ${nFrozen(s)}`)
    const S = { pass: 0, easier: 0, harder: 0, diffs: { a: [], b: [] }, deadBoth: 0, coldOnKey: 0, passIds: [], holds: [], byGrade: {} }
    for (const id of wids.filter(i => wkey[i].strand === s)) {
      const k = wkey[id]
      const r = wsItem(cold.map(([t, g]) => [t, g[id]]), keyed.map(([t, g]) => [t, g[id]]), k.letter)
      if (r.pass) { S.pass++; S.passIds.push(k.localId) } else S.holds.push(`${k.localId} (g${k.grade_target}): ${r.why.join('; ')}`)
      if (r.deadBoth.length) S.deadBoth++
      for (const [t, g] of cold) { if (g[id].pick === k.letter) S.coldOnKey++; const d = +g[id].grade_assigned - k.grade_target; S.diffs[t].push(d); if (d < 0) S.easier++; if (d > 0) S.harder++ }
      const bg = (S.byGrade[k.grade_target] ??= { n: 0, pass: 0 }); bg.n++; if (r.pass) bg.pass++
    }
    const B = bars({ n, pass: S.pass, easier: S.easier, harder: S.harder, diffs: S.diffs, candPct: pct(arm[s]), ctlPct: pct(arm.ctl) })
    const b = batchChecks(its, s), itemFails = its.filter(i => structural(i).errs.length).length
    const exactOk = itemFails === 0 && !b.errs.length
    const sl = {}; Object.values(wkey).filter(k => k.strand === s).forEach(k => (sl[k.letter] = (sl[k.letter] ?? 0) + 1))
    const slotOk = Math.max(...Object.values(sl)) / n <= 0.35
    const pass = exactOk && B.b && B.c && B.d && B.oo && slotOk
    anyPass ||= pass
    console.log(`\n[${s}] n=${n}`)
    for (const h of S.holds) console.log(`  HOLD ${h}`)
    console.log(`  cold picks on key ${S.coldOnKey}/${2 * n}; items with an option dead by both ${S.deadBoth}/${n}; by grade ${JSON.stringify(S.byGrade)}`)
    console.log(`  S1-a exact: ${exactOk ? 'PASS' : 'FAIL'} (${itemFails} item failures; ${b.errs.join('; ') || 'no batch failures'}); E3 ${b.longest}/${n} longest, ${b.shortest}/${n} shortest`)
    console.log(`  T2 ${fmtT2(b.t2)}`)
    for (const [f, r] of Object.entries(b.perFormat)) console.log(`  T2[${f}] ${fmtT2(r)}`)
    console.log(`  S1-b pilot-pass ${S.pass}/${n} (bar >= ${passBar(n)}; range 0-${n}) -> ${B.b ? 'PASS' : 'FAIL'}`)
    console.log(`  S1-c easier ${S.easier}/${2 * n} (bar <= ${easierMax(n)}), harder ${S.harder}/${2 * n} (bar < ${harderLt(n)}) -> ${B.c ? 'PASS' : 'FAIL'}`)
    console.log(`  S1-d mean grade offset a ${B.ma.toFixed(2)}, b ${B.mb.toFixed(2)} (bar within +-0.5) -> ${B.d ? 'PASS' : 'FAIL'}`)
    console.log(`  S2 options-only: ${pct(arm[s]).toFixed(1)}% (n=${arm[s].n}) vs control ${pct(arm.ctl).toFixed(1)}% (bar: >= ${B.ooBar.toFixed(1)}; control must be >= 25%; bar attainable range 0-100) -> ${!B.ooValid ? 'INVALID' : B.oo ? 'PASS' : 'FAIL'}`)
    console.log(`  T key slots ${JSON.stringify(sl)} (bar no slot > 35%) -> ${slotOk ? 'PASS' : 'FAIL'}`)
    console.log(`  VERDICT ${s}: ${pass ? `PASS - insert the ${S.pass} pilot-pass items STAGED as ${COHORT[s]}` : 'FAIL - nothing inserted'}`)
    out.strands[s] = { verdict: pass ? 'PASS' : 'FAIL', n, passIds: S.passIds, holds: S.holds, ws: { pass: S.pass, easier: S.easier, harder: S.harder, ma: B.ma, mb: B.mb, coldOnKey: S.coldOnKey, deadBoth: S.deadBoth, byGrade: S.byGrade }, exact: { ok: exactOk, longest: b.longest, shortest: b.shortest, t2: { best: b.t2.best, score: b.t2.bestScore, fwP: b.t2.fwP, fires: b.t2.fires } }, oo: { cand: pct(arm[s]), ctl: pct(arm.ctl), bar: B.ooBar }, slots: sl, bars: { a: exactOk, b: B.b, c: B.c, d: B.d, oo: B.oo, ooValid: B.ooValid, slot: slotOk } }
  }
  wr(W + 'stages.json', out)
  console.log(`\nSUMMARY ${STRANDS.map(s => `${s} ${out.strands[s].verdict}`).join(', ')}`)
  process.exit(anyPass ? 0 : 1)
}
else if (mode === 'build') {
  const s = arg; if (!STRANDS.includes(s)) die('usage: build <spell|punct|gram|cap>')
  const st = rd(W + 'stages.json').strands[s]
  if (st?.verdict !== 'PASS') die(`${s} verdict ${st?.verdict}`)
  const frozen = Object.fromEntries(rd(W + 'frozen.json').map(i => [i.id, i]))
  const wkey = rd(W + 'ws.key.json'), ga = rd(W + 'ws.grader-a.json'), gb = rd(W + 'ws.grader-b.json')
  const items = []
  for (const [n, k] of Object.entries(wkey)) {
    if (k.strand !== s || !st.passIds.includes(k.localId)) continue
    const it = frozen[k.localId]
    if (!ga[n] || !gb[n]) die(`${k.localId}: missing a grader label`)
    if (!k.choices.includes(it.correct_answer) || new Set(k.choices).size !== 4) die(`${k.localId}: rendered choices do not hold the key`)
    const off = ((+ga[n].grade_assigned - it.grade_target) + (+gb[n].grade_assigned - it.grade_target)) / 2
    items.push({
      id: it.id, type: 'multiple_choice', blanks: null, stem_is_instruction: !(s === 'spell' && it.spelling_format === 'word'), prompt: it.prompt, choices: k.choices, graphic: null, passage: null,
      difficulty: off <= -1 ? 'easy' : off >= 1 ? 'hard' : 'medium', explanation: it.explanation, correct_answer: it.correct_answer,
      passageGroupId: null, correct_answers: null, acceptable_answers: null,
      distractor_rationales: k.choices.filter(c => c !== it.correct_answer).map(c => ({ choice: c, reason: it.student_error?.[c] ?? '' })),
      map: { area: it.map_area, strand: it.map_strand, grade_target: it.grade_target, ccss: it.ccss, error_sites: it.error_sites ?? null, spelling_format: it.spelling_format ?? null, rule: it.cap_rule ?? it.punct_rule ?? it.varied_dimension ?? it.spelling_pattern ?? null, grade_assigned: { a: +ga[n].grade_assigned, b: +gb[n].grade_assigned } },
    })
  }
  if (items.length !== st.passIds.length) die(`built ${items.length} of ${st.passIds.length}`)
  const OUT = W + `inserted-${s}.batch.json`
  writeFileSync(OUT, JSON.stringify(items, null, 1) + '\n')
  console.log(`${items.length} items -> ${OUT}; sha256 ${sha(OUT)}`)
  console.log(`difficulty ${['easy', 'medium', 'hard'].map(d => `${d} ${items.filter(i => i.difficulty === d).length}`).join(' / ')}; key slots ${items.map(i => 'ABCD'[i.choices.indexOf(i.correct_answer)]).join('')}`)
}
else if (mode === 'insert') {
  const s = arg; if (!STRANDS.includes(s)) die('usage: insert <strand> [--commit]')
  const commit = process.argv.includes('--commit'), OUT = W + `inserted-${s}.batch.json`
  const { gateBatch } = await import(SB + 'gate.mjs')
  const g = gateBatch({ task: 'multiple_choice', family: 'map', section: 'language', itemFiles: [OUT] })
  console.log(`gate (${g.family}, ledger ${g.batch ?? 'none'}): ${g.canInsert ? 'PASS' : 'REFUSED'} - ${g.reason}`)
  if (!g.canInsert) process.exit(2)
  const items = rd(OUT)
  const norm = x => String(x ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
  const hashOf = ({ passage, prompt, choices }) => createHash('md5').update([norm(passage), norm(prompt), (choices || []).map(norm).join('|')].join('~~')).digest('hex')
  const rows = items.map(({ id, map, ...item }) => ({
    family: 'map', section: 'language', domain: map.area, subskill: map.strand, difficulty: item.difficulty, topic_tag: map.strand,
    item_type: 'multiple_choice', task: 'multiple_choice', passage_group_id: null, item, content_hash: hashOf(item),
    word_count: String(item.correct_answer).split(/\s+/).filter(Boolean).length, verified: false, source: 'hand', cohort: COHORT[s],
    verify_meta: {
      method: 'map-lu-v2: claude-authored; two teacher-voice raters + one rewrite; exact checks (E1 E3 E4 E5 E7 E9 G) + batch structural-predictor check T2; options-only vs matched live control; two Claude graders cold then keyed',
      staged: true, release: 'NOT released. MAP is not a shipped family; a person releases (human sitting, decision rule fixed before the draw). Never verified=true from a script.',
      localId: id, map, prereg: 'scripts/study-bank/MAP-LU-V2.prereg.md', result: 'scripts/study-bank/MAP-LU-V2-RESULT.md', contentSha: g.sha,
    },
  }))
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: dup, error: e1x } = await db.from('study_item_bank').select('id,cohort').in('content_hash', rows.map(r => r.content_hash))
  if (e1x) die(e1x.message)
  if (dup.length) die(`${dup.length} content_hash already in the bank (${dup.map(d => d.cohort).join(',')})`)
  const { data: same, error: e2 } = await db.from('study_item_bank').select('id').eq('cohort', COHORT[s])
  if (e2) die(e2.message)
  if (same.length) die(`cohort ${COHORT[s]} already has ${same.length} rows`)
  if (rows.some(r => r.verified !== false)) die('a row is not verified=false')
  console.log(`${rows.length} rows ready: family map, section language, verified=false, cohort ${COHORT[s]}`)
  if (!commit) { console.log('DRY RUN: nothing inserted (pass --commit)'); process.exit(0) }
  const { data: ins, error: e3 } = await db.from('study_item_bank').insert(rows).select('id,verified,cohort,difficulty')
  if (e3) die(e3.message)
  console.log(`INSERTED ${ins.length} rows, verified=${[...new Set(ins.map(r => r.verified))].join(',')}, cohort ${COHORT[s]}`)
}
else die('usage: map-lu-v2.mjs spell|select-control|checks|t2|teacher-input|teacher-merge|rerate-input|repair-input|freeze|render|score|build|insert|--selftest')
