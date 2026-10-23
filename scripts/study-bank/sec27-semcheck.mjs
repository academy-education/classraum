#!/usr/bin/env node
/**
 * sec27-semcheck.mjs — the SEMANTIC-TEMPLATE check of sat-sec-hard-v27
 * (PREREG-SEC27-2026-10-23.md, "Semantic-template check"). NEW in v27.
 *
 *   node sec27-semcheck.mjs --table [<SLOTS.json>]          the planned table, before any item
 *                                                          (default sat-sec-v27-work/SLOTS.json)
 *   node sec27-semcheck.mjs --work <dir> [--slots <SLOTS>]  the authors' files <dir>/{A,B,C,D}/items.json
 *                                                          + declarations.json (at merge and at freeze)
 *   [--verbose]                                            print every item's reading
 *
 * WHY. SEC26's tell simulation (sec26-tellsim.mjs) passed every bar on ROLES, and the two probe readers
 * still rated about 11 of 80 reads hard, naming templates no role check can see because they live in
 * WORDS: the time word settles the tense alone; "since" always means the perfect (4/4); the deciding
 * count sits in the sentence before (7 items); the wrong pronoun is always the nearest noun of the
 * wrong number (8-item grid); trailing-comma options always lose (4/5), the bare option loses 9/10, the
 * dash is never keyed, the semicolon after an opening clause always loses. The template cover then held
 * 19 items. This script counts, per named rule, how many items a student who has learned the rule
 * answers (or strikes down to the key) without the grammar, and refuses when any rule covers more than
 * its pre-registered bar.
 *
 * WHAT IT READS
 *   --table: the rows' planned semantic fields (SLOTS.json): `dkind` (decider kind), `cue` (the tense an
 *     explicit time word in the blank's sentence points at, or null), `count_where` (count-other rows),
 *     `adist` and `lure_nearest` (pronoun rows), `shapes` (boundary rows: one label per option, parallel
 *     to `marks`).
 *   --work: the same quantities from the AUTHORS' files, each counted TWICE where it can be, once from
 *     the declaration and once from the TEXT, and the LARGER count is the one barred (an author declares
 *     what it believes; the text is what a student reads):
 *       declarations: decider_kind (every item), count_sentence (count-other items),
 *         pronoun_antecedent.distance and pronoun_lure.nearest_noun_before_blank (pronoun items),
 *         near_noun.number (pronoun items, the text proxy for the lure);
 *       text: "since" and duration phrases anywhere in the passage; explicit time cues in the blank's
 *         sentence (lexicon below); boundary option shapes from the option strings; count words in the
 *         sentence just before the blank's sentence; the key's tense/aspect value from the options
 *         (sec27-parse.mjs, the counts script's parser).
 *
 * DECIDER KINDS (dkind / decider_kind)
 *   tense/aspect: since | since-lure | duration | present-result | present-inferred |
 *                 closed-past-inferred | closed-past-explicit | past-time-clause | habitual-clause | conditional
 *   aux:          cataphoric-ellipsis | anaphoric-ellipsis | distant-participle | distant-adjective | distant-ing
 *   pronoun:      pronoun-antecedent
 *   boundary / noun form: delayed-verb | clause-completeness | no-verb-arrives | garden-verb |
 *                 contrast-later | inference-unique | count-other | verb-frame | verb-after-blank
 *
 * RULES AND BARS (each bar is a COVERAGE: the number of items on which the rule, applied blindly,
 * yields the key; the denominator is printed beside every value)
 *   SC1 "since" deciders <= 2 items; "since" anywhere in <= 3 passages
 *   SC2 "since means the perfect": perfect keyed in <= 2 of the items containing "since", and in
 *       <= 75% of them when 2 or more contain it (SEC26: 4 of 4)
 *   SC3 "a closed past phrase or past time clause means the simple past": <= 2 items
 *   SC4 "the time word settles the tense alone": <= 40% of the tense+aspect items (an explicit cue in
 *       the blank's sentence whose tense equals the key's)
 *   SC5 "the perfect wins exactly when since or a duration phrase is present": <= 2/3 of aspect items
 *   SC6 count deciders: count-other <= 2 items; a deciding count in the sentence JUST BEFORE the
 *       blank's sentence in 0 items (declared count_sentence "previous", or, from the text, a count word
 *       in the previous sentence of any boundary or noun-form item)
 *   SC7 pronoun grids: <= 4 items; "reject the pronoun of the nearest noun's number" (the wrong
 *       pronoun's referent is the nearest noun before the blank) in <= 50% of them; "the key's
 *       antecedent is never the nearest noun" (grader f, SEC26: 6 of 6) in <= 75% of them (declared
 *       pronoun_antecedent.is_nearest_noun, honoured only when that word IS the declared near noun);
 *       antecedent distance takes >= 3 distinct values when there are 3 or more pronoun items
 *   SC8 "this option shape always loses": for every shape offered in n >= 3 boundary items, the shape
 *       is keyed in >= ceil(n/4) of them (i.e. it loses no more often than a random option, 75%);
 *       arithmetic slack: keyed rates average exactly 1/4 across shapes, so ONE shape may be one key
 *       short. Shapes: none | comma | semicolon | colon | period | dash | trailing (a mark after the
 *       blank's last word: a comma one word off, or the late garden comma)
 *   SC9 no single decider kind decides more than 4 items (the cover holds k-1 of a named group)
 *
 * LIMITS. The time-cue lexicon and the count lexicon are regexes; a cue the lexicon lacks is missed by
 * the text count, which is why the declared count is also taken and the larger barred. A pass means the
 * named semantic rules do not cover more items than their bars; it does not mean the batch has no
 * template. The probe readers and the panel judge items.
 *
 * EXIT 0 every bar met; 1 a bar missed; 2 refused (no or empty input, a row or declaration missing a
 * field this check reads, an unknown kind, ids not matching, an unknown flag). A check that cannot read
 * its input never prints a verdict.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseItem, possOf, marksOf, dimension, dimKey } from './sec27-parse.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const args = process.argv.slice(2)
let mode = null, path = null, slotsArg = null, verbose = false
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--verbose') verbose = true
  else if (a === '--slots') { slotsArg = args[++i]; if (!slotsArg || slotsArg.startsWith('--')) die('--slots needs a path') }
  else if (a === '--table' || a === '--work') {
    if (mode) die('give exactly one of --table / --work')
    mode = a.slice(2)
    if (args[i + 1] && !args[i + 1].startsWith('--')) path = args[++i]
  } else die(`unknown argument ${a}`)
}
if (!mode) die('usage: sec27-semcheck.mjs --table [<SLOTS.json>] | --work <dir> [--slots <SLOTS.json>] [--verbose]')
if (slotsArg && mode === 'table') die('--slots goes with --work (with --table, name the table directly)')
if (mode === 'table' && !path) path = join(HERE, 'sat-sec-v27-work', 'SLOTS.json')
if (mode === 'work' && !path) die('--work needs a directory')
const rd = p => { if (!existsSync(p)) die(`${p} missing`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${p}: ${e.message}`) } }

const TIME_KINDS = ['since', 'since-lure', 'duration', 'present-result', 'present-inferred', 'closed-past-inferred', 'closed-past-explicit', 'past-time-clause', 'habitual-clause', 'conditional']
const AUX_KINDS = ['cataphoric-ellipsis', 'anaphoric-ellipsis', 'distant-participle', 'distant-adjective', 'distant-ing']
const PUNCT_KINDS = ['delayed-verb', 'clause-completeness', 'no-verb-arrives', 'garden-verb', 'contrast-later', 'inference-unique', 'count-other', 'verb-frame', 'verb-after-blank']
const ADIST = ['same-clause', 'same-sentence', 'previous-sentence', 'two-back']
const COUNT_WHERE = ['previous', 'two-back', 'later', 'same']
const SHAPES = ['none', 'comma', 'semicolon', 'colon', 'period', 'dash', 'trailing']
const EXPLICIT_CUE_KINDS = { since: 'perfect', duration: 'perfect', 'habitual-clause': 'present', 'past-time-clause': 'past', 'closed-past-explicit': 'past' }
const other = n => (n === 'sg' ? 'pl' : 'sg')

/* ---------- text lexicons (work mode) ---------- */
const SINCE_RE = /\bsince\b/i
const DUR_RE = /\bfor (?:(?:the|a|an|some|nearly|almost|about|over|more than) )?(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|several|many|a few|a dozen|a hundred|a thousand)(?: \w+)? (?:years?|decades?|months?|weeks?|days?|hours?|seasons?|centuries|century|generations?|winters?|summers?|springs?|autumns?|harvests?|terms?|semesters?|sessions?)\b/i
const IRREG_PAST = 'went came saw took began made found kept left lost built sent brought thought fought caught taught told sold held stood fell rose broke spoke wrote drove grew knew threw flew drew gave ate sank ran won struck froze chose became met paid laid said led fed fled bore wore tore swore shone woke sang rang sprang swam drank shrank hung spun dug lit slid hid bled clung flung swung stung'.split(' ')
const PAST_CLAUSE_RE = new RegExp(`\\b(?:when|while|before|after|until|till|once|as soon as)\\b\\s+(?:[\\w'-]+\\s+){0,5}?(?:\\w+ed|was|were|had|did|${IRREG_PAST.join('|')})\\b`, 'i')
const CUES = {
  perfect: [SINCE_RE, DUR_RE, /\b(?:so far|to date|until now|up to now|thus far)\b/i],
  past: [/\bago\b/i, /\blast (?:year|month|week|spring|summer|autumn|fall|winter|century|decade|season)\b/i, /\byesterday\b/i, /\b(?:1[0-9]{3}|20[0-9]{2})s?\b/, /\bin the (?:early |late |mid-)?\w+(?:th|st|nd|rd) century\b/i, PAST_CLAUSE_RE, /\bat the time\b/i, /\bin those (?:days|years|decades)\b/i, /\bthat (?:year|spring|summer|autumn|winter|season|decade|century)\b/i],
  present: [/\bwhenever\b/i, /\b(?:every|each) (?:day|week|month|year|season|spring|summer|autumn|fall|winter|time)\b/i, /\b(?:usually|typically|today|nowadays|currently|at present|now)\b/i],
}
const COUNT_RE = /\b(?:\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|several|both|multiple|numerous|a dozen|dozens|a pair|exactly one|only one|just one|a single|a lone|the lone|the sole|the only)\b/i
const sentences = p => p.split(/(?<=[.!?]["”]?)\s+(?=["“]?[A-Z])/)

/* ---------- read the table ---------- */
const tablePath = mode === 'table' ? path : (slotsArg ?? join(HERE, 'sat-sec-v27-work', 'SLOTS.json'))
const table = rd(tablePath)
if (!table || !Array.isArray(table.slots) || !table.slots.length) die(`${tablePath} has no slots`)
const ROW = {}
for (const s of table.slots) {
  if (!s || typeof s.slot !== 'string' || !/^[ABCD](10|[1-9])$/.test(s.slot)) die(`slot "${s?.slot}" must be like A1..D10`)
  if (ROW[s.slot]) die(`duplicate slot ${s.slot}`)
  if (!['agr', 'punct', 'poss'].includes(s.class)) die(`${s.slot}: class must be agr | punct | poss`)
  ROW[s.slot] = s
}
const PREFIX = table.id_prefix ?? 'SEC27'
const slotOf = id => { const m = new RegExp(`^${PREFIX}([ABCD])-(\\d\\d)$`).exec(id); return m ? `${m[1]}${Number(m[2])}` : null }

/* ---------- build one reading per item ---------- */
// reading: { slot, id, cls: tense|aspect|aux|pronoun|boundary|noun, kind, keyVal, cueDecl, cueText[],
//            sinceAny, sinceDecider, durAny, countWhere, countPrevText, adist, lureDecl, lureText, shapes[], keyIdx }
const R = []
const kindOk = (cls, k) => (cls === 'tense' || cls === 'aspect') ? TIME_KINDS.includes(k) : cls === 'aux' ? AUX_KINDS.includes(k) : cls === 'pronoun' ? k === 'pronoun-antecedent' : PUNCT_KINDS.includes(k)

if (mode === 'table') {
  for (const s of table.slots) {
    const where = s.slot
    let cls
    if (s.class === 'agr') {
      if (!['tense', 'aspect', 'aux', 'pronoun'].includes(s.dim)) die(`${where}: dim must be tense | aspect | aux | pronoun`)
      cls = s.dim
    } else cls = s.class === 'punct' ? 'boundary' : 'noun'
    if (typeof s.dkind !== 'string') die(`${where}: dkind missing (the semantic check cannot read this row)`)
    if (!kindOk(cls, s.dkind)) die(`${where}: dkind "${s.dkind}" is not a ${cls} decider kind`)
    const r = { slot: where, id: where, cls, kind: s.dkind }
    if (cls === 'tense' || cls === 'aspect') {
      if (!('cue' in s) || !(s.cue === null || ['perfect', 'past', 'present'].includes(s.cue))) die(`${where}: cue must be perfect | past | present | null`)
      r.keyVal = cls === 'tense' ? s.dkey : (s.dkey === 'perfect' ? 'perfect' : 'nonperfect')
      r.cueText = s.cue ? [s.cue] : []
      r.sinceAny = s.since === true || s.since_lure === true
      r.sinceDecider = s.since === true
      r.durAny = s.duration === true
      if ((s.dkind === 'since') !== (s.since === true)) die(`${where}: dkind since and since:true must agree`)
      if ((s.dkind === 'since-lure') !== (s.since_lure === true)) die(`${where}: dkind since-lure and since_lure:true must agree`)
      if ((s.dkind === 'duration') !== (s.duration === true)) die(`${where}: dkind duration and duration:true must agree`)
    }
    if (cls === 'pronoun') {
      if (!ADIST.includes(s.adist)) die(`${where}: adist must be one of ${ADIST.join(', ')}`)
      if (typeof s.lure_nearest !== 'boolean') die(`${where}: lure_nearest must be true | false`)
      r.adist = s.adist; r.lureDecl = s.lure_nearest
      r.lureText = s.near !== s.dkey   // the nearest noun has the WRONG pronoun's number
      r.anteNearest = s.adist === 'same-clause'   // the key's antecedent is the nearest noun only when it sits in the same clause, just before the blank
    }
    if (s.dkind === 'count-other') { if (!COUNT_WHERE.includes(s.count_where)) die(`${where}: count_where must be one of ${COUNT_WHERE.join(', ')}`); r.countWhere = s.count_where }
    r.countPrevText = false
    if (cls === 'boundary') {
      if (!Array.isArray(s.shapes) || s.shapes.length !== 4 || s.shapes.some(x => !SHAPES.includes(x))) die(`${where}: shapes must be 4 labels from ${SHAPES.join('|')}`)
      if (!Array.isArray(s.marks) || s.marks.length !== 4) die(`${where}: marks must list 4 marks`)
      const ki = s.marks.indexOf(s.key)
      if (ki < 0) die(`${where}: key mark ${s.key} not among its marks`)
      r.shapes = s.shapes; r.keyIdx = ki
    }
    R.push(r)
  }
} else {
  let seen = 0
  for (const a of ['A', 'B', 'C', 'D']) {
    const fi = `${path}/${a}/items.json`, fd = `${path}/${a}/declarations.json`
    if (!existsSync(fi)) continue
    const arr = rd(fi)
    if (!Array.isArray(arr) || !arr.length) die(`${fi} holds no items`)
    const decl = rd(fd)
    if (!Array.isArray(decl) || !decl.length) die(`${fd} holds no declarations`)
    const D = {}
    for (const d of decl) { if (!d || typeof d.id !== 'string') die(`${fd}: a declaration has no id`); if (D[d.id]) die(`${fd}: duplicate declaration ${d.id}`); D[d.id] = d }
    const ids = arr.map(x => x?.id)
    if (new Set(ids).size !== ids.length) die(`${fi}: duplicate ids`)
    if (Object.keys(D).sort().join() !== ids.slice().sort().join()) die(`${fd} ids do not match ${fi}`)
    for (const it of arr) {
      const slot = slotOf(it.id)
      if (!slot || slot[0] !== a || !ROW[slot]) die(`${fi}: ${it.id} is not a ${PREFIX}${a}-NN table slot`)
      if (!Array.isArray(it.choices) || it.choices.length !== 4 || !it.choices.includes(it.correct_answer)) die(`${it.id}: needs 4 choices with the key among them`)
      if (typeof it.passage !== 'string' || (it.passage.match(/_{3,}/g) || []).length !== 1) die(`${it.id}: passage must hold exactly one blank`)
      const d = D[it.id], k = it.choices.indexOf(it.correct_answer)
      const strip = c => c.toLowerCase().replace(/[.,;:—–"'()?-]/g, ' ').replace(/\s+/g, ' ').trim()
      const p = it.passage, sents = sentences(p), bi = sents.findIndex(x => /_{3,}/.test(x)), bsent = sents[bi] ?? ''
      let cls, keyVal
      if (new Set(it.choices.map(strip)).size === 1) cls = 'boundary'
      else if (possOf(it.choices)) cls = 'noun'
      else {
        const { parsed, pronVaries } = parseItem(it.choices)
        if (pronVaries) cls = 'pronoun'
        else {
          const codes = [...new Set(parsed.map(x => x.code))]
          if (codes.length !== 2) die(`${it.id}: ${codes.length} verb forms; not a 2x2 (fix it in the counts script first)`)
          const dim = dimension(codes[0], codes[1])
          if (!['tense', 'aspect', 'aux'].includes(dim)) die(`${it.id}: second dimension ${dim} is not one this batch uses`)
          cls = dim
          if (dim !== 'aux') { const v = dimKey(dim, parsed[k].code); keyVal = v === 'non-perfect' ? 'nonperfect' : v }
        }
      }
      const kind = d.decider_kind
      if (typeof kind !== 'string') die(`${it.id}: declaration decider_kind missing (the semantic check cannot read this item)`)
      if (!kindOk(cls, kind)) die(`${it.id}: decider_kind "${kind}" is not a ${cls} decider kind`)
      const r = { slot, id: it.id, cls, kind, keyVal }
      r.sinceAny = SINCE_RE.test(p)
      r.durAny = DUR_RE.test(p)
      const dq = (Array.isArray(d.decider_quote) ? d.decider_quote : [d.decider_quote ?? '']).map(String).join(' ')
      r.sinceDecider = kind === 'since' || SINCE_RE.test(dq)
      if (cls === 'tense' || cls === 'aspect') r.cueText = Object.entries(CUES).filter(([, res]) => res.some(re => re.test(bsent))).map(([c]) => c)
      if (cls === 'pronoun') {
        const ad = d.pronoun_antecedent?.distance
        if (!ADIST.includes(ad)) die(`${it.id}: declaration pronoun_antecedent.distance must be one of ${ADIST.join(', ')}`)
        const ln = d.pronoun_lure?.nearest_noun_before_blank
        if (typeof ln !== 'boolean') die(`${it.id}: declaration pronoun_lure.nearest_noun_before_blank must be true | false`)
        const { parsed } = parseItem(it.choices)
        const nearNum = d.near_noun?.number
        if (!['sg', 'pl'].includes(nearNum)) die(`${it.id}: declaration near_noun.number missing`)
        const an = d.pronoun_antecedent?.is_nearest_noun
        if (typeof an !== 'boolean') die(`${it.id}: declaration pronoun_antecedent.is_nearest_noun must be true | false`)
        r.adist = ad; r.lureDecl = ln; r.lureText = nearNum !== parsed[k].pron
        r.anteNearest = an && String(d.pronoun_antecedent?.word ?? '').toLowerCase().split(/\s+/).pop() === String(d.near_noun?.word ?? '').toLowerCase().split(/\s+/).pop()
      }
      if (kind === 'count-other') { if (!COUNT_WHERE.includes(d.count_sentence)) die(`${it.id}: declaration count_sentence must be one of ${COUNT_WHERE.join(', ')}`); r.countWhere = d.count_sentence }
      // text: a count word in the sentence just before the blank's sentence (boundary and noun-form items)
      r.countPrevText = (cls === 'boundary' || cls === 'noun') && bi > 0 && COUNT_RE.test(sents[bi - 1])
      if (r.countPrevText) r.countPrevWhat = (sents[bi - 1].match(COUNT_RE) || [''])[0]
      if (cls === 'boundary') {
        const marks = marksOf(it.choices, k)
        r.shapes = it.choices.map((c, i) => {
          if (/[,;:—–.]["”’]?$/.test(c.trim())) return 'trailing'
          const m = String(marks[i]).replace(/@shifted$/, '')
          return m.startsWith('mixed') ? 'mixed' : m === 'question' ? 'period' : m
        })
        r.keyIdx = k
      }
      R.push(r)
      seen++
    }
  }
  if (!seen) die(`no items under ${path}/<A-D>/items.json`)
}
if (!R.length) die('no items')

/* ---------- the rules ---------- */
let fail = false
const bar = (name, ok, val, why = '') => { console.log(`  ${ok ? 'MET   ' : 'MISSED'} ${name.padEnd(74)} ${String(val).padEnd(12)} ${why}`); if (!ok) fail = true }
const by = c => R.filter(r => r.cls === c)
const TA = R.filter(r => r.cls === 'tense' || r.cls === 'aspect'), AS = by('aspect'), PR = by('pronoun'), BD = by('boundary'), NN = by('noun')
console.log(`${R.length} items from ${path}: tense ${by('tense').length}, aspect ${AS.length}, aux ${by('aux').length}, pronoun ${PR.length}, boundary ${BD.length}, noun ${NN.length}`)
if (verbose) for (const r of R) console.log(`    ${r.id.padEnd(10)} ${r.cls.padEnd(8)} ${r.kind.padEnd(22)} key ${r.keyVal ?? '-'} cue [${(r.cueText ?? []).join(',')}] since ${r.sinceAny ? 'y' : 'n'} dur ${r.durAny ? 'y' : 'n'}${r.shapes ? ` shapes ${r.shapes.join('/')} key ${r.shapes[r.keyIdx]}` : ''}${r.countPrevText ? ` COUNT-IN-PREVIOUS "${r.countPrevWhat}"` : ''}`)
console.log('\nBARS (coverage = items on which the rule, applied blindly, yields the key)')

// SC1
const sinceDec = R.filter(r => r.sinceDecider), sinceAny = R.filter(r => r.sinceAny)
bar('SC1 "since" deciders <= 2', sinceDec.length <= 2, `${sinceDec.length}`, sinceDec.map(r => r.id).join(' ') || 'none')
bar('SC1 "since" anywhere in <= 3 passages', sinceAny.length <= 3, `${sinceAny.length} of ${R.length}`, sinceAny.map(r => r.id).join(' ') || 'none')
// SC2
const sinceT = sinceAny.filter(r => r.cls === 'aspect' || r.cls === 'tense'), sinceP = sinceT.filter(r => r.keyVal === 'perfect')
const sc2 = sinceP.length <= 2 && (sinceT.length < 2 || sinceP.length / sinceT.length <= 0.75 + 1e-9)
bar('SC2 "since means the perfect": <= 2 items and <= 75% of since items', sc2, `${sinceP.length} of ${sinceT.length}`, sinceT.map(r => `${r.id}:${r.keyVal}`).join(' ') || 'no since items')
// SC3
const pastDecl = TA.filter(r => ['closed-past-explicit', 'past-time-clause'].includes(r.kind) && (r.keyVal === 'past' || r.keyVal === 'nonperfect'))
const pastText = TA.filter(r => r.cueText?.includes('past') && !r.cueText.some(c => c !== 'past') && (r.keyVal === 'past' || r.keyVal === 'nonperfect'))
const sc3 = Math.max(pastDecl.length, pastText.length)
bar('SC3 "a closed past phrase / past clause means the simple past" <= 2', sc3 <= 2, `${sc3} of ${TA.length}`, `declared ${pastDecl.map(r => r.id).join(' ') || 'none'}; by text ${pastText.map(r => r.id).join(' ') || 'none'}`)
// SC4
const cueMap = (cls, c) => cls === 'tense' ? (c === 'perfect' ? 'present' : c) : (c === 'past' ? 'nonperfect' : 'perfect')
const cueHit = r => r.cueText?.length && new Set(r.cueText.map(c => cueMap(r.cls, c))).size === 1 && cueMap(r.cls, r.cueText[0]) === r.keyVal
const sc4Text = TA.filter(cueHit)
const sc4Decl = TA.filter(r => EXPLICIT_CUE_KINDS[r.kind] && cueMap(r.cls, EXPLICIT_CUE_KINDS[r.kind]) === r.keyVal)
const sc4 = Math.max(sc4Text.length, sc4Decl.length)
bar('SC4 "the time word settles the tense alone" <= 40% of tense+aspect', TA.length > 0 && sc4 / TA.length <= 0.40 + 1e-9, `${sc4} of ${TA.length}`, `declared ${sc4Decl.map(r => r.id).join(' ') || 'none'}; by text ${sc4Text.map(r => r.id).join(' ') || 'none'}`)
// SC5
const sc5 = AS.filter(r => (r.sinceAny || r.durAny) === (r.keyVal === 'perfect'))
bar('SC5 "perfect exactly when since/duration is present" <= 2/3 of aspect', AS.length > 0 && sc5.length / AS.length <= 2 / 3 + 1e-9, `${sc5.length} of ${AS.length}`, AS.map(r => `${r.id}:${r.keyVal}${r.sinceAny ? '+since' : ''}${r.durAny ? '+dur' : ''}`).join(' '))
// SC6
const cnt = R.filter(r => r.kind === 'count-other')
bar('SC6 count-other deciders <= 2', cnt.length <= 2, `${cnt.length}`, cnt.map(r => `${r.id}:${r.countWhere}`).join(' ') || 'none')
const prev = R.filter(r => r.countWhere === 'previous' || r.countPrevText)
bar('SC6 a count in the sentence just before the blank\'s sentence: 0', prev.length === 0, `${prev.length} of ${BD.length + NN.length}`, prev.map(r => `${r.id}${r.countPrevText ? ` (text: "${r.countPrevWhat}")` : ' (declared previous)'}`).join(' ') || 'none')
// SC7
bar('SC7 pronoun grid items <= 4', PR.length <= 4, `${PR.length}`)
if (PR.length) {
  const lure = Math.max(PR.filter(r => r.lureDecl).length, PR.filter(r => r.lureText).length)
  bar('SC7 "the wrong pronoun is the nearest noun" <= 50% of pronoun items', lure / PR.length <= 0.50 + 1e-9, `${lure} of ${PR.length}`, `declared ${PR.filter(r => r.lureDecl).map(r => r.id).join(' ') || 'none'}; by near-noun number ${PR.filter(r => r.lureText).map(r => r.id).join(' ') || 'none'}`)
  const far = PR.filter(r => !r.anteNearest)
  bar('SC7 "the key\'s antecedent is never the nearest noun" <= 75% of pronoun items', far.length / PR.length <= 0.75 + 1e-9, `${far.length} of ${PR.length}`, `antecedent is the nearest noun in: ${PR.filter(r => r.anteNearest).map(r => r.id).join(' ') || 'none'}`)
  const ad = new Set(PR.map(r => r.adist))
  bar('SC7 antecedent distance takes >= 3 distinct values (n >= 3)', PR.length < 3 || ad.size >= 3, `${ad.size}`, [...ad].join(', '))
}
// SC8
if (BD.length) {
  const L = {}
  for (const r of BD) { const offered = new Set(r.shapes); for (const s of offered) { L[s] ??= { n: 0, k: 0 }; L[s].n++ } L[r.shapes[r.keyIdx]].k++ }
  const short = Object.entries(L).filter(([, v]) => v.n >= 3).map(([s, v]) => ({ s, ...v, need: Math.ceil(v.n / 4) })).filter(x => x.k < x.need)
  const ok = short.length === 0 || (short.length === 1 && short[0].need - short[0].k === 1)
  bar('SC8 "shape S always loses": keyed >= ceil(n/4) where offered n >= 3 (one shape may be 1 short)', ok, short.length ? `${short.length} short` : 'ok',
    Object.entries(L).map(([s, v]) => `${s} ${v.k}/${v.n}`).join(', ') + (short.length ? ` | short: ${short.map(x => `${x.s} ${x.k}/${x.n} needs ${x.need}`).join('; ')}` : ''))
}
// SC9
const kc = {}; for (const r of R) (kc[r.kind] ??= []).push(r.id)
const big = Object.entries(kc).filter(([, l]) => l.length > 4)
bar('SC9 no decider kind decides more than 4 items', big.length === 0, big.length ? 'MISSED' : 'ok', Object.entries(kc).sort((a, b) => b[1].length - a[1].length).map(([k, l]) => `${k} ${l.length}`).join(', '))

console.log(fail ? '\nRESULT: a bar is missed' : '\nRESULT: all bars met')
process.exit(fail ? 1 : 0)
