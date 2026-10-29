#!/usr/bin/env node
/**
 * map-math-v2.mjs — map-v2 Math gate pipeline, batches 1 and 2 (MAP-MATH-V2.prereg.md, MAP-MATH-V2-B2.prereg.md,
 * MAP-PLAN-2026-10-23 §3.1), 2026-10-24. `--batch b2` (anywhere on the command line) selects batch 2; the default is
 * batch 1, unchanged. Batch 2 differs in work dir, slots, ids (MB2-), authors (only files present; core-only is
 * normal), seeds, math-check flags (--slots --prior --families isee,ssat,map), cohorts map-math-v2-b2-<area>,
 * options-only parts of <= 60 rows, R11 against the 221 batch-1 items, and rule C-prime. `--batch b3`
 * (MAP-MATH-V2-B3.prereg.md): Geometry only (oo/grade/score default to G), ids MB3-, 4 authors, dump-b3 prior corpus,
 * R11 against batches 1 and 2 (221 + 72), C-prime on, cohort map-math-v2-b3-geo, and the H1 key-rank record (frozen
 * rank-2 share <= 25%, recorded at freeze and score, never a gate). `--batch b4` (MAP-MATH-V2-B4.prereg.md): areas N
 * and D, each its own batch; ids MB4-, 5 authors, dump-b4, R11 against batches 1-3 (221 + 72 + 30), cohorts
 * map-math-v2-b4-num / -data, rank record per area.
 * `--batch n789` (MAP-MATH-V2-N789.prereg.md): Number Systems only, the 9 PART OK items of batches 7-9 under one
 * gate (ids MB7-/MB8-/MB9- via idPattern), 6 author cells, dump-n789, R11 against the 702 earlier MAP ids.
 * map-math-g58-v5.mjs made general to the four MAP maths areas. Inputs: the 11 author files
 * scratchpad/map-v2-math-work/<author>/items.json (221 slots in map-v2-work/math/slots.json, checked per item by
 * map-v2-work/math/math-check.mjs). Every bar runs PER AREA and each area freezes as its own batch.
 *
 *   assemble                     author files -> WORK/assembled.json; every file must exit 0 from math-check.mjs
 *   oo-pool                      read-only: live ISEE control pool per area x difficulty vs the assembled need
 *   screen-render 1              every assembled item, seeded order, packets of <= 40 -> WORK/screen/p1-<x>/screen.md
 *   screen-score 1               read every p1 screen.json; fails -> WORK/screen-p1.json and WORK/returns/needed-<author>.json
 *   screen-render 2              every pass-1 fail must be accounted for: WORK/returns/<id>.json (revised; must
 *                                pass math-check), withdrawn.json {id: why} or stand.json {id: why};
 *                                writes WORK/assembled.post-return.json and renders the REVISED items, p2-<x>
 *   screen-score 2               records pass-2 fails (WORK/screen-p2.json). NOT a drop: the screen returns once and
 *                                never drops on one screener (plan §2.1); the flags are carried to the score record
 *   freeze                       post-return items minus withdrawn, re-checked (math-check), PER AREA ->
 *                                map-math-v2/<area>/batch.json (order seed per area); no per-area minimum
 *   oo [O|N|G|D]                 options-only render per area vs a 1:1 tier-matched live ISEE control
 *                                -> WORK/oo/<A>/oo.blind.json (solvers write WORK/oo/<A>/solver-{a,b,c}.json)
 *   grade [O|N|G|D]              cold + keyed with-source renders per area, parts of <= 35
 *   stage <A> <part> <d|e> <cold|keyed>   grader folder WORK/grade/<A>-p<part>-<g>/ (keyed: snapshot + chmod 444 + hash first)
 *   coldcheck <A>                every stage-1 field copied unchanged into stage2.json, stage-1 hash unchanged
 *   score <A>                    all bars for one area -> map-math-v2/<area>/stages.json; one-grader flags -> tb-needs, exit 1
 *   tiebreak <A>                 cold render of the flagged items for grader F -> WORK/grade/<A>-f-tb/grade.md
 *   insert-prep <A>              area verdict PASS only: survivors-only batch + qc.json + ledger entry (all four
 *                                mc_stem_source stages, bound to the file's sha), gateBatch read-only, prints the
 *                                math-bank-helper insert command (not run: it has no dry run)
 *   --selftest                   every bar and rule at its margin, then each rule reverted must fail a case
 *
 * No insert here: math-bank-helper.mjs (BANK_FAMILY=map, commit 46759de4) inserts; insert-prep prepares and gates.
 * A check that cannot read its input exits 2 and never prints a number.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, chmodSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import * as utilMod from 'node:util'
import { spawn } from 'node:child_process'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { val, scoreItem } from './key-extremity-breakdown.mjs'
import { keyExtremityVerdict } from './key-extremity-gate.mjs'
import { difficultyBars, iseeArea, jac } from './map-math-g58-v5.mjs'

export const ROOT = '/Users/andylee/Downloads/saas/classraum'
const D = ROOT + '/scripts/study-bank/'
const CHECK = D + 'map-v2-work/math/math-check.mjs'

/* ------------------------------------------------------------------ batch selector: --batch b1 (default) | b2
 * Everything batch-specific lives here; nothing below names a batch. Batch 1 is unchanged (its files, seeds, ids,
 * cohorts and the batch-1 rule "C fails -> area held"). Batch 2 per MAP-MATH-V2-B2.prereg.md. */
export const BATCHES = {
  b1: {
    name: 'map-v2 Math batch 1', prereg: 'scripts/study-bank/MAP-MATH-V2.prereg.md',
    work: ROOT + '/scratchpad/map-math-v2-work', authored: ROOT + '/scratchpad/map-v2-math-work',
    results: D + 'map-math-v2/', slots: D + 'map-v2-work/math/slots.json', idPrefix: 'MV2',
    checkArgs: [], authorsPresentOnly: false, slotTotal: 221,
    cohortStem: 'map-math-v2', cPrime: false, ooPartMax: null, earlierFile: null, earlier: null, areas: ['O', 'N', 'G', 'D'], rankRecord: false,
    expect: { authors: 11, earlierN: 0, packets: '37,37,37,37,37,36' },
    seed: {
      screen1Order: 20261301, screen1Deal: 20261302, screen2Order: 20261303, screen2Deal: 20261304,
      freeze: { O: 20261311, N: 20261312, G: 20261313, D: 20261314 },
      oo: { O: 20261321, N: 20261322, G: 20261323, D: 20261324 },
      grade: { O: 20261330, N: 20261340, G: 20261350, D: 20261360 },   // + part number
      cPrime: null,
    },
  },
  b2: {
    name: 'map-v2 Math batch 2', prereg: 'scripts/study-bank/MAP-MATH-V2-B2.prereg.md',
    work: ROOT + '/scratchpad/map-math-v2-b2-work', authored: ROOT + '/scratchpad/map-v2-math-b2-work',
    results: D + 'map-math-v2-b2/', slots: D + 'map-v2-work/math-b2/slots.json', idPrefix: 'MB2',
    checkArgs: ['--slots', D + 'map-v2-work/math-b2/slots.json', '--prior', ROOT + '/scratchpad/map-v2-math-work/dump-b2/prior-math.json', '--families', 'isee,ssat,map'],
    authorsPresentOnly: true, slotTotal: 254,
    cohortStem: 'map-math-v2-b2',   // prereg's cohort table: map-math-v2-b2-<oa|num|geo|data>
    cPrime: true, ooPartMax: 60, earlierFile: D + 'map-v2-work/math-b2/EXCLUSIONS-map-math-b2.txt', earlier: 'b1', areas: ['O', 'N', 'G', 'D'], rankRecord: false,
    expect: { authors: 16, earlierN: 221, packets: '39,38' },
    seed: {
      screen1Order: 20261401, screen1Deal: 20261402, screen2Order: 20261403, screen2Deal: 20261404,
      freeze: { O: 20261411, N: 20261412, G: 20261413, D: 20261414 },
      oo: { O: 20261421, N: 20261422, G: 20261423, D: 20261424 },
      grade: { O: 20261430, N: 20261440, G: 20261450, D: 20261460 },
      cPrime: { O: 20261471, N: 20261472, G: 20261473, D: 20261474 },
    },
  },
  b3: {
    name: 'map-v2 Math batch 3 (Geometry)', prereg: 'scripts/study-bank/MAP-MATH-V2-B3.prereg.md',
    work: ROOT + '/scratchpad/map-math-v2-b3-work', authored: ROOT + '/scratchpad/map-v2-math-b3-work',
    results: D + 'map-math-v2-b3/', slots: D + 'map-v2-work/math-b3/slots.json', idPrefix: 'MB3',
    checkArgs: ['--slots', D + 'map-v2-work/math-b3/slots.json', '--prior', ROOT + '/scratchpad/map-v2-math-work/dump-b3/prior-math.json', '--families', 'isee,ssat,map'],
    authorsPresentOnly: true, slotTotal: 32,
    cohortStem: 'map-math-v2-b3',   // cohort map-math-v2-b3-geo
    cPrime: true, ooPartMax: 60, earlierFile: D + 'map-v2-work/math-b3/EXCLUSIONS-map-geometry-b3.txt', earlier: 'b1+b2', areas: ['G'], rankRecord: true,
    expect: { authors: 4, earlierN: 293, packets: '32', ranks: { G: '8/8/8/8' } },
    seed: {
      screen1Order: 20261501, screen1Deal: 20261502, screen2Order: 20261503, screen2Deal: 20261504,
      freeze: { G: 20261513 }, oo: { G: 20261523 }, grade: { G: 20261550 }, cPrime: { G: 20261573 },
    },
  },
  b4: {
    name: 'map-v2 Math batch 4 (Number Systems + Statistics)', prereg: 'scripts/study-bank/MAP-MATH-V2-B4.prereg.md',
    work: ROOT + '/scratchpad/map-math-v2-b4-work', authored: ROOT + '/scratchpad/map-v2-math-b4-work',
    results: D + 'map-math-v2-b4/', slots: D + 'map-v2-work/math-b4/slots.json', idPrefix: 'MB4',
    checkArgs: ['--slots', D + 'map-v2-work/math-b4/slots.json', '--prior', ROOT + '/scratchpad/map-v2-math-work/dump-b4/prior-math.json', '--families', 'isee,ssat,map'],
    authorsPresentOnly: true, slotTotal: 36,
    cohortStem: 'map-math-v2-b4',   // cohorts map-math-v2-b4-num, map-math-v2-b4-data
    cPrime: true, ooPartMax: 60, earlierFile: D + 'map-v2-work/math-b4/EXCLUSIONS-map-num-stat-b4.txt', earlier: 'b1+b2+b3', areas: ['N', 'D'], rankRecord: true,
    expect: { authors: 5, earlierN: 323, packets: '36', ranks: { N: '6/6/6/6', D: '3/3/3/3' } },
    seed: {
      screen1Order: 20261601, screen1Deal: 20261602, screen2Order: 20261603, screen2Deal: 20261604,
      freeze: { N: 20261612, D: 20261614 }, oo: { N: 20261622, D: 20261624 }, grade: { N: 20261640, D: 20261660 }, cPrime: { N: 20261672, D: 20261674 },
    },
  },
  b5: {
    name: 'map-v2 Math batch 5 (Number Systems)', prereg: 'scripts/study-bank/MAP-MATH-V2-B5.prereg.md',
    // WORK per the prereg (scratchpad); map-v2-work/math-b5/ holds the brief, slots and checker files only
    work: ROOT + '/scratchpad/map-math-v2-b5-work', authored: ROOT + '/scratchpad/map-v2-math-b5-work',
    results: D + 'map-math-v2-b5/', slots: D + 'map-v2-work/math-b5/slots.json', idPrefix: 'MB5',
    checkArgs: ['--slots', D + 'map-v2-work/math-b5/slots.json', '--prior', ROOT + '/scratchpad/map-v2-math-work/dump-b5/prior-math.json', '--families', 'isee,ssat,map'],
    authorsPresentOnly: true, slotTotal: 8,
    cohortStem: 'map-math-v2-b5',   // cohort map-math-v2-b5-num
    cPrime: true, ooPartMax: 60, earlierFile: D + 'map-v2-work/math-b5/EXCLUSIONS-map-num-b5.txt', earlier: 'b5-chains', areas: ['N'], rankRecord: true,
    positionExpect: 33,   // prereg H3: position-only hit rate at ranks 1/2/4/1 (recorded)
    expect: { authors: 4, earlierN: 238, packets: '8', ranks: { N: '1/2/4/1' } },
    seed: {
      screen1Order: 20261701, screen1Deal: 20261702, screen2Order: 20261703, screen2Deal: 20261704,
      freeze: { N: 20261712 }, oo: { N: 20261722 }, grade: { N: 20261740 }, cPrime: { N: 20261772 },
    },
  },
  b6: {
    name: 'map-v2 Math batch 6 (Operations + Statistics)', prereg: 'scripts/study-bank/MAP-MATH-V2-B6.prereg.md',
    work: ROOT + '/scratchpad/map-math-v2-b6-work', authored: ROOT + '/scratchpad/map-v2-math-b6-work',
    results: D + 'map-math-v2-b6/', slots: D + 'map-v2-work/math-b6/slots.json', idPrefix: 'MB6',
    checkArgs: ['--slots', D + 'map-v2-work/math-b6/slots.json', '--prior', ROOT + '/scratchpad/map-v2-math-work/dump-b6/prior-math.json', '--families', 'isee,ssat,map'],
    authorsPresentOnly: true, slotTotal: 6,
    cohortStem: 'map-math-v2-b6',   // cohorts map-math-v2-b6-oa, map-math-v2-b6-data
    cPrime: true, ooPartMax: 60, earlierFile: D + 'map-v2-work/math-b6/EXCLUSIONS-map-b6.txt', earlier: 'dump-b6', areas: ['O', 'D'], rankRecord: true,
    expect: { authors: 4, earlierN: 688, packets: '6', ranks: { O: '0/1/1/0', D: '0/3/1/0' } },
    seed: {
      screen1Order: 20261801, screen1Deal: 20261802, screen2Order: 20261803, screen2Deal: 20261804,
      freeze: { O: 20261811, D: 20261814 }, oo: { O: 20261821, D: 20261824 }, grade: { O: 20261830, D: 20261860 }, cPrime: { O: 20261871, D: 20261874 },
    },
  },
  n789: {
    // MAP-MATH-V2-N789.prereg.md: the 9 PART OK Number Systems items of batches 7-9, gated together (items written
    // before the prereg). Inputs from map-v2-work/math-n789/build.mjs: combined slots (cells <cell>-b<k>), authored
    // dir of symlinks to the b7/b8/b9 author files, dump-n789 = dump-b10 minus the candidates' own rows
    name: 'map-v2 Math batches 7-9 (Number Systems gate n789)', prereg: 'scripts/study-bank/MAP-MATH-V2-N789.prereg.md',
    work: ROOT + '/scratchpad/map-math-v2-n789-work', authored: ROOT + '/scratchpad/map-v2-math-n789-work',
    results: D + 'map-math-v2-n789/', slots: D + 'map-v2-work/math-n789/slots.json', idPrefix: 'MB8', idPattern: 'MB[789]',
    checkArgs: ['--slots', D + 'map-v2-work/math-n789/slots.json', '--prior', ROOT + '/scratchpad/map-v2-math-work/dump-n789/prior-math.json', '--families', 'isee,ssat,map'],
    authorsPresentOnly: true, slotTotal: 9,
    cohortStem: 'map-math-v2-n789',   // cohort map-math-v2-n789-num
    cPrime: true, ooPartMax: 60, earlierFile: D + 'map-v2-work/math-n789/EXCLUSIONS-map-n789.txt', earlier: 'dump-n789', earlierDump: ROOT + '/scratchpad/map-v2-math-work/dump-n789/prior-math.json', areas: ['N'], rankRecord: true,
    expect: { authors: 6, earlierN: 702, packets: '9', ranks: { N: '0/2/6/1' } },
    seed: {
      screen1Order: 20262101, screen1Deal: 20262102, screen2Order: 20262103, screen2Deal: 20262104,
      freeze: { N: 20262112 }, oo: { N: 20262122 }, grade: { N: 20262140 }, cPrime: { N: 20262172 },
    },
  },
}
export const BATCH = (() => { const i = process.argv.indexOf('--batch'); if (i < 0) return 'b1'; const b = process.argv[i + 1]; process.argv.splice(i, 2); if (!BATCHES[b]) { console.error(`REFUSING: --batch must be one of ${Object.keys(BATCHES).join(' ')}`); process.exit(2) } return b })()
export const B = BATCHES[BATCH]
export const WORK = B.work
const AUTHORED = B.authored, R = B.results, SLOTS_FILE = B.slots
export const PREREG = B.prereg
const die = (m, code = 2) => { console.error(`REFUSING: ${m}`); process.exit(code) }
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`unreadable ${p}: ${e.message}`) } }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const pct = (a, b) => b ? 100 * a / b : NaN
const f1 = x => Number.isFinite(x) ? x.toFixed(1) : 'NaN'
const wj = (p, o) => writeFileSync(p, JSON.stringify(o, null, 1) + '\n')

/* ------------------------------------------------------------------ areas, authors, seeds */
const AREA_BASE = {
  O: { key: 'oa', domain: 'Operations and Algebraic Thinking' },
  N: { key: 'num', domain: 'Real and Complex Number Systems' },
  G: { key: 'geo', domain: 'Geometry' },
  D: { key: 'data', domain: 'Statistics and Probability' },
}
/** authors per area come from the batch's slots file (author -> area), in slots-file order */
function slotsOf() { if (!existsSync(SLOTS_FILE)) die(`missing ${SLOTS_FILE}`); return JSON.parse(readFileSync(SLOTS_FILE, 'utf8')) }
export const AREAS = Object.fromEntries(Object.entries(AREA_BASE).map(([L, a]) => [L, { ...a, cohort: `${B.cohortStem}-${a.key}`, authors: Object.entries(slotsOf()).filter(([, v]) => v.area === a.domain).map(([k]) => k) }]))
export const AUTHORS = Object.values(AREAS).flatMap(a => a.authors)
const LETTER_OF_DOMAIN = Object.fromEntries(Object.entries(AREAS).map(([L, a]) => [a.domain, L]))
export const SEED = B.seed
export const SCREEN_PACKET_MAX = 40, GRADE_PART_MAX = 35
export const ID_RE = new RegExp(`^${B.idPattern ?? B.idPrefix}-([ONGD])[0-9A-Z]*-\\d\\d$`)   // idPattern: n789 spans MB7/MB8/MB9
/** batch 2: R11 also counts a template of any batch-1 item (the graders get the EXCLUSIONS file's batch-1 section) */
function earlierBatchIds() {
  if (!B.earlier) return { ids: [], text: null }
  // the 221 batch-1 ids, read from the b2 exclusions file's batch-1 section (one source for b2 and b3)
  const b2x = D + 'map-v2-work/math-b2/EXCLUSIONS-map-math-b2.txt', t = readFileSync(b2x, 'utf8'), at = t.indexOf('# ---- map-math-v2 batch 1')
  if (at < 0) die(`${b2x}: no batch-1 section`)
  const b1text = t.slice(at), b1 = [...new Set([...b1text.matchAll(/\((MV2-[ONGD][0-9A-Z]*-\d\d)\)/g)].map(m => m[1]))]
  if (b1.length !== 221) die(`${b2x}: batch-1 section names ${b1.length} ids, expected 221`)
  if (B.earlier === 'b1') return { ids: b1, text: b1text }
  if (B.earlier === 'dump-b6' || B.earlier === 'dump-n789') {
    // batch 6 prereg: R11 against every earlier MAP maths item in dump-b6 (live, staged, dropped, withdrawn,
    // first-written); graders get EXCLUSIONS-map-b6.txt, which lists each id in parentheses with its prompt.
    // n789: the same rule over dump-n789 (dump-b10 minus the nine candidates), graders get EXCLUSIONS-map-n789.txt
    const dp = B.earlierDump ?? ROOT + '/scratchpad/map-v2-math-work/dump-b6/prior-math.json'
    for (const f of [dp, B.earlierFile]) if (!existsSync(f)) die(`R11 needs ${f}`)
    const ids = [...new Set(JSON.parse(readFileSync(dp, 'utf8')).filter(x => /map-math|DB map/.test(x.file ?? '')).map(x => String(x.id)))]
    const text = readFileSync(B.earlierFile, 'utf8')
    const named = new Set([...text.matchAll(/^\(([^)]+)\)/gm)].map(m => m[1]))
    if (ids.some(x => !named.has(x))) die(`${B.earlierFile} is missing earlier ids (rebuild it from dump-b6)`)
    return { ids, text, named: named.size }
  }
  if (B.earlier === 'b5-chains') {
    // batch 5 prereg: R11 against the 285 entries of earlier-N-chains.json plus batch 4's items in dump-b5;
    // graders get the exclusions file and the chain table
    const cp = D + 'map-v2-work/math-b5/earlier-N-chains.json', dp = ROOT + '/scratchpad/map-v2-math-work/dump-b5/prior-math.json'
    for (const f of [cp, dp, B.earlierFile]) if (!existsSync(f)) die(`R11 needs ${f}`)
    const chains = JSON.parse(readFileSync(cp, 'utf8'))
    if (!Array.isArray(chains) || chains.length !== 285 || chains.some(c => !c?.id || !c.chain)) die(`${cp}: expected 285 entries with id and chain, read ${Array.isArray(chains) ? chains.length : typeof chains}`)
    const b4 = [...new Set(JSON.parse(readFileSync(dp, 'utf8')).filter(x => /^MB4-/.test(x.id ?? '')).map(x => x.id))]
    if (b4.length !== 26) die(`${dp}: expected the 26 batch-4 ids, read ${b4.length}`)
    const ids = [...new Set([...chains.map(c => String(c.id)), ...b4])]
    const text = readFileSync(B.earlierFile, 'utf8') + `\n\n# ---- earlier Number Systems chains (${chains.length} entries; the same id twice = first-written and revised) ----\n# id | batch | status | grade || chain || prompt\n` + chains.map(c => `${c.id} | ${c.batch ?? ''} | ${c.status ?? ''} | g${c.grade ?? '?'} || ${c.chain} || ${String(c.prompt ?? '').replace(/\s+/g, ' ')}`).join('\n') + '\n'
    return { ids, text, named: chains.length }
  }
  // b1+b2 (batch 3) / b1+b2+b3 (batch 4): plus every assembled item of the later batches (b2 72, incl. the 12 held
  // Geometry; b3 30); graders read the prereg's own exclusions file, whose every earlier id must be in the set
  const later = { b2: [ROOT + '/scratchpad/map-math-v2-b2-work/assembled.json', 72, 'MB2'], b3: [ROOT + '/scratchpad/map-math-v2-b3-work/assembled.json', 30, 'MB3'] }
  const extra = []
  for (const b of B.earlier.split('+').filter(x => x !== 'b1')) {
    const [path, n, pre] = later[b] ?? die(`unknown earlier batch '${b}'`)
    if (!existsSync(path)) die(`R11 needs the ${b} items: missing ${path}`)
    const xs = JSON.parse(readFileSync(path, 'utf8')).map(i => i.id)
    if (xs.length !== n || new Set(xs).size !== n || !xs.every(x => x.startsWith(pre + '-'))) die(`${path}: expected ${n} distinct ${pre} ids, read ${xs.length}`)
    extra.push(...xs)
  }
  const b2 = extra
  const ids = [...b1, ...b2], text = readFileSync(B.earlierFile, 'utf8')
  const named = [...new Set([...text.matchAll(/\(((?:MV2|MB\d)-[ONGD][0-9A-Z]*-\d\d)\)/g)].map(m => m[1]))]
  const stray = named.filter(x => !ids.includes(x)); if (stray.length) die(`${B.earlierFile} names ids outside the earlier batches: ${stray.slice(0, 5).join(' ')}`)
  if (!named.length) die(`${B.earlierFile}: names no batch-1/2 ids`)
  return { ids, text, named: named.length }
}
const areaOfItem = it => { const L = LETTER_OF_DOMAIN[it?.domain]; if (!L) die(`${it?.id}: domain '${it?.domain}' is not a MAP maths area`); if (AREAS[L].key !== it.map_area) die(`${it.id}: map_area '${it.map_area}' != '${AREAS[L].key}' for ${it.domain}`); return L }
const areaArg = a => { if (!a) return B.areas; if (!B.areas.includes(a)) die(`${BATCH}: area must be one of ${B.areas.join(' ')}`); return [a] }
export const areaDir = L => R + AREAS[L].key + '/'

/** n items into k = ceil(n / max) balanced chunks, in order */
export function chunk(arr, max) {
  const k = Math.ceil(arr.length / max); if (!k) return []
  const out = []; let i = 0
  for (let c = 0; c < k; c++) { const sz = Math.floor(arr.length / k) + (c < arr.length % k ? 1 : 0); out.push(arr.slice(i, i + sz)); i += sz }
  return out
}

export function keyPos(item) {
  const sc = scoreItem(item.choices.map(String), String(item.correct_answer))
  if (sc.skip) return null
  return sc.keyMin ? 'S' : sc.keyMax ? 'L' : 'I'
}

/* ------------------------------------------------------------------ rules (every one toggleable so --selftest can revert it) */
export const RULES = {
  // options-only, per area, three samples (MAP-PLAN §3.1)
  ooMargin: 10,            // hold if candidate - control > +10 points
  ooUnan: 15,              // hold if candidate unanimous-correct RATE - control's > +15 points (batch level, never per item)
  ooCeiling: true,         // control > 100 - ooMargin: the margin bar cannot fire -> not-measured (held)
  unanCeiling: true,       // control unanimity > 100 - ooUnan: the unanimity bar cannot fire -> not-measured (held)
  emptyArmRefuses: true,   // an empty arm is no measurement (held), never a pass
  // kept-set key extremity, per insert batch (= per area)
  extremityGate: true,     // fail (< 0.8 x derived chance) -> area held
  smallNHolds: false,      // n < 10 -> no measurement, recorded; NOT a hold (plan removed v1's n >= 10 hold)
  cPrime: true,            // batch 2: a C failure defers the minimum interior items by seed (batch 1 runs with false)
  cPrimeExtra: 0,          // selftest-only: shifts m to revert minimality
  cMinN: 10,               // C measures from 10 scorable items (key-extremity-gate MIN_N); below: not measured, neither pass nor fail
  rank2Pred: 25,           // batch 3 H1 prediction: frozen rank-2 share <= 25% (recorded, never a gate)
  // per-item with-source rules
  keyDisputeAnyDrops: true,   // R1 key_ok false by either grader -> drop (the key is sandbox-recomputed; a dispute is about the stem)
  exclBoth: true, exclOneTb: true,   // R2 exclusivity: both -> drop; one -> tie-break grader F
  freeBoth: true, freeOneTb: true,   // R4 (>= 2 free strikes) and R5 (key identifiable free): both -> drop; one -> F
  tbBoth: true, tbOne: true,         // R6 plug-back, R7 option pair, R8 one-sided, R10 single bound, R11 template: both -> drop; one -> F
  tieDrops: true,          // F row missing or malformed on a one-grader flag: tie -> drop
  r3Both: true,            // R3 distractors weak by both -> drop
  extRecommendDrops: true, // EXT-1 drop_recommend by either -> drop (v5, kept)
  offBlueprintHolds: true, // both graders judge another area -> hold
  gradeFitDrops: false,    // grade fit is RECORDED, not a drop rule (uncalibrated model judgment; plan §3.1)
  // screen
  screenStrikeMin: 2,      // S-R4: n_struck >= 2 fails the screen
  screenKeyIdent: true, screenPlugback: true, screenPair: true, screenOneSided: true, screenSingleBound: true, screenWrongAnswer: true, screenMalformed: true,
  screenP2Drops: false,    // a pass-2 fail is recorded, never dropped on one screener
  // freeze
  areaFreezeMin: 0,        // no per-area minimum
  // cold/keyed integrity
  coldCompare: true,
}

/* ---- batch 3, H1 (recorded, never a gate): key rank. Ascending rank 1-4 of the key among the four option values. */
export function rankOf(choices, v) {
  const vs = choices.map(c => val(String(c))), x = val(String(v))
  if (vs.some(z => !Number.isFinite(z)) || !Number.isFinite(x) || new Set(vs).size !== vs.length) return null
  return 1 + vs.filter(z => z < x).length
}
export function rankRecord(items, Rl = RULES) {
  const hist = { 1: 0, 2: 0, 3: 0, 4: 0 }; let n = 0, unscored = 0
  for (const it of items) { const r = rankOf(it.choices, it.correct_answer); if (r == null) { unscored++; continue } hist[r]++; n++ }
  if (!n) return { n, unscored, hist, share2: NaN, meets: null, line: `no measurement: 0 scorable of ${items.length}` }
  const share2 = 100 * hist[2] / n, meets = share2 <= Rl.rank2Pred + 1e-9
  return { n, unscored, hist, share2, meets, line: `key rank 1/2/3/4 = ${hist[1]}/${hist[2]}/${hist[3]}/${hist[4]} of ${n}; rank-2 share ${f1(share2)}% (prediction <= ${Rl.rank2Pred}%: ${meets ? 'met' : 'NOT met'}; recorded, not a gate)` }
}

/** the rules this batch runs under: batch 1 without C-prime (its prereg), batch 2 with it */
export const RL = { ...RULES, cPrime: B.cPrime }

/* ---- options-only verdict, per area */
export function ooVerdict(cand, ctrl, Rl = RULES) {
  const cr = pct(cand.hits, cand.picks), kr = pct(ctrl.hits, ctrl.picks)
  const cu = pct(cand.unan, cand.n), ku = pct(ctrl.unan, ctrl.n)
  if (Rl.emptyArmRefuses && (!cand.picks || !ctrl.picks)) return { status: 'no-measurement', cr, kr, why: 'empty arm' }
  const margin = cr - kr, umar = cu - ku
  if (Rl.ooCeiling && kr > 100 - Rl.ooMargin + 1e-9) return { status: 'not-measured', cr, kr, cu, ku, margin, umar, why: `control ${f1(kr)}% leaves under ${Rl.ooMargin} points of headroom: the +${Rl.ooMargin} bar cannot fire (attainable control range for this bar: 0-${100 - Rl.ooMargin}%)` }
  if (Rl.unanCeiling && ku > 100 - Rl.ooUnan + 1e-9) return { status: 'not-measured', cr, kr, cu, ku, margin, umar, why: `control unanimous-correct ${f1(ku)}% leaves under ${Rl.ooUnan} points: the unanimity bar cannot fire (attainable range 0-${100 - Rl.ooUnan}%)` }
  const hold = margin > Rl.ooMargin + 1e-9 || umar > Rl.ooUnan + 1e-9
  return { status: hold ? 'hold' : 'pass', cr, kr, cu, ku, margin, umar, why: `candidate ${f1(cr)}% vs control ${f1(kr)}% (margin ${f1(margin)}, bar +${Rl.ooMargin}); unanimous-correct rate ${f1(cu)}% vs control ${f1(ku)}% (${f1(umar)}, bar +${Rl.ooUnan})` }
}

/* ---- area status: options-only + kept-set extremity */
/**
 * C-prime (batch 2 prereg): when C refuses the kept set (n >= 10 scorable, e end keys, e/n < 40%), defer the minimum
 * m = n - floor(5e / 2) kept INTERIOR-key items, drawn by the area's seed (seeded shuffle of the kept interior items
 * in frozen order, first m), so that e/(n - m) >= 40%. e = 0 -> nothing can be inserted. Pure; no hand choice.
 * `cPrimeExtra` exists only so --selftest can revert minimality (m - 1 / m + 1) and see a case fail.
 */
export function cPrimeDeferral(kept, seed, Rl = RULES) {
  const sc = kept.map(it => ({ it, s: scoreItem(it.choices.map(String), String(it.correct_answer)) })).filter(x => !x.s.skip)
  const n = sc.length, e = sc.filter(x => x.s.ext).length
  if (!e) return { ok: false, n, e, m: null, deferred: [], why: 'no end key among the kept items: C-prime cannot reach 40%' }
  const m = Math.max(0, n - Math.floor(5 * e / 2) + (Rl.cPrimeExtra ?? 0))
  const interior = sc.filter(x => !x.s.ext).map(x => x.it)
  if (m > interior.length) return { ok: false, n, e, m, deferred: [], why: `needs ${m} interior items, ${interior.length} kept` }
  const deferred = shuffleWith(interior.slice(), rng(seed)).slice(0, m)
  return { ok: true, n, e, m, deferred, why: `deferred ${m} of ${interior.length} kept interior items: ${e}/${n - m} = ${f1(100 * e / (n - m))}% at an end (was ${e}/${n} = ${f1(100 * e / n)}%)` }
}

export function areaStatus(kept, oo, Rl = RULES, seed = null) {
  let ext = keyExtremityVerdict(kept, { minN: Rl.cMinN }), inserted = kept, deferred = [], cprime = null
  const reasons = [], notes = []
  if (oo !== 'pass') reasons.push(`options-only ${oo}`)
  if (ext.status === 'fail' && Rl.extremityGate) {
    if (Rl.cPrime) {
      if (!Number.isInteger(seed)) reasons.push('kept-set key extremity fail and no C-prime seed for this area: held')
      else cprime = cPrimeDeferral(kept, seed, Rl)
      if (!cprime) { /* held above */ } else if (!cprime.ok) reasons.push(`kept-set key extremity fail and C-prime cannot apply (${cprime.why}): ${ext.reason}`)
      else {
        deferred = cprime.deferred; inserted = kept.filter(i => !deferred.includes(i))
        const after = keyExtremityVerdict(inserted, { minN: Rl.cMinN }), share = cprime.e / (cprime.n - cprime.m)
        notes.push(`C-prime: ${cprime.why}; C on the inserted set: ${after.status} (${after.reason})`)
        // C re-run on the inserted set must not fail, and the share must reach 40% by the prereg's own arithmetic
        if (after.status === 'fail' || share + 1e-9 < 0.4) reasons.push(`after C-prime the inserted set still fails C: ${after.reason}`)
        ext = after
      }
    } else reasons.push(`kept-set key extremity fail: ${ext.reason}`)
  }
  if (ext.status === 'no-measurement') (Rl.smallNHolds ? reasons : notes).push(`${cprime ? 'inserted' : 'kept'}-set extremity: ${ext.reason} (recorded; the inserter's gate measures from n >= 10)`)
  if (!inserted.length) reasons.push('nothing kept')
  // cState: what C says about the inserted set. 'not-measured' (n < 10) is recorded and is neither a pass nor a fail:
  // it never holds the area and never fires C-prime (prereg b1, restated b5)
  const cState = ext.status === 'no-measurement' ? 'not-measured' : ext.status
  return { status: reasons.length ? 'held' : 'pass', reasons, notes, extremity: ext, cState, cPrimeFired: !!cprime?.ok, inserted, deferred, cprime: cprime && { n: cprime.n, e: cprime.e, m: cprime.m, why: cprime.why } }
}

/* ---- the screen: one cold screener row -> rule codes */
export function screenFails(it, s, Rl = RULES) {
  if (!s || typeof s !== 'object') return ['S-MISSING screener row missing']
  const ext = ['S', 'L'].includes(keyPos(it)), f = []
  const bools = ['key_identifiable_free', 'plugback_routine', 'one_sided', 'single_bound_kills_all']
  if (Rl.screenMalformed && (s.n_struck === null || s.n_struck === '' || !Number.isFinite(+s.n_struck) || bools.some(k => typeof s[k] !== 'boolean'))) return ['S-MALFORMED screener row malformed']
  if (Rl.screenWrongAnswer && val(s.my_answer) !== val(it.correct_answer) && String(s.my_answer).trim() !== String(it.correct_answer)) f.push(`S-KEY screener answered ${s.my_answer}`)
  if (+s.n_struck >= Rl.screenStrikeMin) f.push(`S-R4 ${s.n_struck} struck without solving: ${JSON.stringify(s.struck)} (${String(s.free_elimination ?? '').slice(0, 160)})`)
  if (Rl.screenKeyIdent && s.key_identifiable_free === true) f.push('S-R5 key identifiable without solving')
  if (Rl.screenPlugback && s.plugback_routine === true) f.push(`S-R6 plug-back routine at try ${s.plugback_tries}`)
  if (Rl.screenPair && s.option_pair_tell != null && s.option_pair_tell !== '') f.push(`S-R7 option pair ${String(s.option_pair_tell).slice(0, 120)}`)
  if (Rl.screenOneSided && ext && s.one_sided === true) f.push('S-R8 one-sided extreme key')
  if (Rl.screenSingleBound && ext && s.single_bound_kills_all === true) f.push(`S-R10 single bound kills all (${String(s.extreme_single_bound ?? '').slice(0, 100)})`)
  return f
}

/** stage-0 drops: withdrawn items only, unless the (reverted) rule drops pass-2 fails */
export function stage0Drops(withdrawn, p2fails, Rl = RULES) {
  const d = {}
  for (const [id, why] of Object.entries(withdrawn ?? {})) d[id] = `withdrawn by its author after the screen return: ${why}`
  if (Rl.screenP2Drops) for (const [id, f] of Object.entries(p2fails ?? {})) d[id] = `still fails the screen after its return: ${f.join(' | ')}`
  return d
}

/** which areas may freeze (no minimum unless reverted) */
export function freezable(byArea, Rl = RULES) {
  return Object.fromEntries(Object.entries(byArea).map(([L, n]) => [L, n > 0 && n >= Rl.areaFreezeMin]))
}

/** F's vote on one flag: true / false / null (no vote: missing or malformed) */
export function fVote(code, F, earlierNamed) {
  if (!F || typeof F !== 'object') return null
  const b = k => typeof F[k] === 'boolean' ? F[k] : null
  if (code.startsWith('R2')) { if (typeof F.exclusive !== 'boolean' || !('second_defensible' in F)) return null; return F.exclusive === false || (F.second_defensible != null && F.second_defensible !== '') }
  if (code.startsWith('R4')) { const n = F.n_struck; if (n === null || n === '' || n === undefined || !Number.isFinite(+n)) return null; return +n >= 2 }
  if (code.startsWith('R5')) return b('key_identifiable_free')
  if (code.startsWith('R6')) return b('plugback_routine')
  if (code.startsWith('R8')) return b('one_sided')
  if (code.startsWith('R10')) return b('single_bound_kills_all')
  if (code.startsWith('R7')) return F.option_pair_tell === undefined ? null : (F.option_pair_tell != null && F.option_pair_tell !== '')
  if (code.startsWith('R11')) return Array.isArray(F.same_template_as) ? F.same_template_as.some(x => earlierNamed.has(String(x))) : null
  return null
}

/**
 * per-item rules over two graders' stage-2 rows. F: grader F's cold row, or undefined if the item was not in the
 * tie-break render. One-grader flag: F yes -> drop, F no -> no drop, F no vote -> tie -> drop.
 */
export function itemVerdict(it, a, b, F, earlier = new Set(), Rl = RULES) {
  const ext = ['S', 'L'].includes(keyPos(it))
  const drop = [], hold = [], need = [], rec = []
  const both = f => f(a) && f(b), any = f => f(a) || f(b), one = f => !!f(a) !== !!f(b)
  const named = new Set([a, b].flatMap(g => (g.same_template_as ?? []).map(String)).filter(x => earlier.has(x)))
  const flag = (code, f, onBoth, onOne) => {
    if (both(f)) { if (onBoth) drop.push(`${code} (both)`); return }
    if (!one(f) || !onOne) return
    if (F === undefined) { need.push(code); return }
    const v = fVote(code, F, named)
    if (v === true) drop.push(`${code} (one grader + F)`)
    else if (v === null && Rl.tieDrops) drop.push(`${code} (one grader, F no vote: tie -> drop)`)
  }
  if (Rl.keyDisputeAnyDrops && any(g => g.key_ok === false)) drop.push('R1 key disputed')
  flag('R2 not exclusive / second defensible', g => g.exclusive === false || (g.second_defensible != null && g.second_defensible !== ''), Rl.exclBoth, Rl.exclOneTb)
  if (Rl.r3Both && both(g => g.distractors_weak === true)) drop.push('R3 distractors weak (both)')
  flag('R4 two or more free strikes', g => (+g.n_struck || 0) >= 2, Rl.freeBoth, Rl.freeOneTb)
  flag('R5 key identifiable without solving', g => g.key_identifiable_free === true, Rl.freeBoth, Rl.freeOneTb)
  flag('R6 plug-back routine <= 2', g => g.plugback_routine === true, Rl.tbBoth, Rl.tbOne)
  if (ext) { flag('R8 one-sided extreme key', g => g.one_sided === true, Rl.tbBoth, Rl.tbOne); flag('R10 single bound kills all', g => g.single_bound_kills_all === true, Rl.tbBoth, Rl.tbOne) }
  flag('R7 option pair', g => g.option_pair_tell != null && g.option_pair_tell !== '', Rl.tbBoth, Rl.tbOne)
  flag('R11 template of an earlier item', g => (g.same_template_as ?? []).some(x => earlier.has(String(x))), Rl.tbBoth, Rl.tbOne)
  if (Rl.extRecommendDrops && any(g => g.drop_recommend === true)) drop.push('EXT-1 drop_recommend')
  for (const fit of ['too_easy', 'too_hard']) if (both(g => g.grade_fit === fit)) (Rl.gradeFitDrops ? drop : rec).push(`G1 ${fit} for its grade (both)${Rl.gradeFitDrops ? '' : ' - recorded, not a drop rule'}`)
  if (Rl.offBlueprintHolds && both(g => g.on_blueprint === false)) hold.push('OFF off-blueprint (both)')
  return { drop: [...new Set(drop)], hold, need: [...new Set(need)], rec, named: [...named], keep: !drop.length && !hold.length && !need.length }
}

const TIER_RANK = { below_grade: 0, low: 1, mid: 2, high: 3, above_grade: 4 }
export function bankedDifficulty(a, b) {
  const r = x => Math.min(3, Math.max(1, TIER_RANK[x.tier_assigned] ?? 2))
  const m = (r(a) + r(b)) / 2
  return m <= 1.5 ? 'easy' : m >= 2.5 ? 'hard' : 'medium'
}

export const S1_FIELDS = ['my_answer', 'exclusive', 'second_defensible', 'struck', 'n_struck', 'free_elimination', 'key_identifiable_free', 'plugback_tries', 'plugback_routine', 'error_directions', 'one_sided', 'extreme_single_bound', 'single_bound_kills_all', 'interior_parity', 'interior_tell', 'arith_tell', 'option_pair_tell', 'same_template_as', 'live_duplicate', 'area_judged', 'on_blueprint', 'grade_fit', 'grade_assigned', 'tier_assigned', 'grade_note', 'note']
export const S2_FIELDS = ['key_ok', 'key_note', 'path_coherent', 'path_note', 'distractors_weak', 'drop_recommend', 'drop_reason', 'grade_fit_final', 'grade_note_final']
/** stage-1 -> stage-2 integrity for one grader: list of problems */
export function coldDiff(s1, s2, Rl = RULES) {
  const out = []
  for (const id of Object.keys(s1).filter(k => ID_RE.test(k))) {
    if (!s2[id]) { out.push(`${id} missing from stage2`); continue }
    if (Rl.coldCompare) for (const f of S1_FIELDS) if (JSON.stringify(s1[id][f]) !== JSON.stringify(s2[id][f])) out.push(`${id} stage-1 field ${f} changed`)
    for (const f of S2_FIELDS) if (!(f in s2[id])) out.push(`${id} stage-2 field ${f} missing`)
  }
  return out
}

/* ------------------------------------------------------------------ renders */
const TIER_WORDS = { low: 'low (easier than typical for this grade: most students in the grade answer it correctly)', mid: 'mid (typical for this grade: about half of students in the grade answer it correctly)', high: 'high (harder than typical for this grade: only stronger students in the grade answer it correctly)' }
export function renderGraphic(g, id = '?') {
  if (!g) return ''
  if (!['table', 'twowaytable'].includes(g.type) || !Array.isArray(g.cells) || !Array.isArray(g.colLabels)) die(`${id}: cannot render graphic type '${g?.type}'`)
  const rows = g.cells.map((row, ri) => `| ${[(g.rowLabels ?? [])[ri] ?? '', ...row].join(' | ')} |`)
  return `\nTable${g.caption ? ` (${g.caption})` : ''}:\n\n| ${['', ...g.colLabels].join(' | ')} |\n| ${['', ...g.colLabels].map(() => '---').join(' | ')} |\n${rows.join('\n')}\n`
}
export function coldBlock(it, opts) {
  return `\n---\n\n## ${it.id}\n\nArea: ${it.domain} | Target grade: ${it.grade_target} | Target tier: ${TIER_WORDS[it.tier]}\n\nQuestion: ${it.prompt}\n${renderGraphic(it.graphic, it.id)}\n${opts.map((o, j) => `${'ABCD'[j]}. ${o}`).join('\n')}\n`
}
/** key at letter 'ABCD'[i % 4], the rest seeded */
function dealOptions(it, i, rand) {
  const L = 'ABCD'[i % 4], rest = shuffleWith(it.choices.map(String).filter(c => c !== String(it.correct_answer)), rand)
  let q = 0; return { letter: L, opts: [...'ABCD'].map(s => s === L ? String(it.correct_answer) : rest[q++]) }
}

/* ------------------------------------------------------------------ math-check over files, in parallel */
function runCheck(file) {
  return new Promise(res => {
    const p = spawn('node', [CHECK, file, ...B.checkArgs], { cwd: ROOT }); let out = '', err = ''
    p.stdout.on('data', d => { out += d }); p.stderr.on('data', d => { err += d })
    p.on('close', code => { const m = out.match(/(\d+) items read; (\d+) PART OK; (\d+) failing/); res({ file, code, read: m ? +m[1] : NaN, ok: m ? +m[2] : NaN, fails: out.split('\n').filter(l => /PART FAIL/.test(l)).map(l => l.trim()), err: err.trim() }) })
  })
}
async function checkAll(files, label) {
  if (BATCH !== 'b1' && !['--slots', '--prior', '--families'].every(f => B.checkArgs.includes(f))) die(`${BATCH}: math-check must get --slots, --prior and --families (prereg: without them a verbatim live batch-1 copy prints PART OK)`)
  if (BATCH !== 'b1' && !B.checkArgs[B.checkArgs.indexOf('--families') + 1].split(',').includes('map')) die('math-check --families must include map')
  for (const f of ['--slots', '--prior']) { const i = B.checkArgs.indexOf(f); if (i >= 0 && !existsSync(B.checkArgs[i + 1])) die(`math-check ${f} ${B.checkArgs[i + 1]} missing`) }
  const rs = await Promise.all(files.map(runCheck))
  let bad = 0
  for (const r of rs) {
    console.log(`  math-check ${r.file.replace(ROOT + '/', '')}: exit ${r.code}, ${r.ok} PART OK of ${r.read}`)
    if (r.code !== 0 || !(r.read > 0) || r.ok !== r.read) { bad++; for (const f of r.fails) console.log(`    ${f}`); if (r.err) console.log(`    ${r.err.slice(0, 400)}`) }
  }
  if (bad) die(`${label}: ${bad} file(s) not all PART OK`, 1)
  return rs.reduce((s, r) => s + r.read, 0)
}

/* ------------------------------------------------------------------ selftest */
function cases(Rl) {
  const c = []
  const t = (cond, msg) => c.push([!!cond, msg])
  // options-only, at the margins
  const arm = (hits, picks, unan, n) => ({ hits, picks, unan, n })
  t(ooVerdict(arm(42, 120, 6, 40), arm(30, 120, 4, 40), Rl).status === 'pass', 'oo +10.0 exactly passes')
  t(ooVerdict(arm(43, 120, 6, 40), arm(30, 120, 4, 40), Rl).status === 'hold', 'oo +10.8 holds')
  t(ooVerdict(arm(30, 120, 10, 40), arm(30, 120, 4, 40), Rl).status === 'pass', 'oo unanimity rate +15.0 passes')
  t(ooVerdict(arm(30, 120, 11, 40), arm(30, 120, 4, 40), Rl).status === 'hold', 'oo unanimity rate +17.5 holds')
  t(ooVerdict(arm(110, 120, 6, 40), arm(109, 120, 4, 40), Rl).status === 'not-measured', 'oo control 90.8% (headroom 9.2 < 10): not measured')
  t(ooVerdict(arm(108, 120, 6, 40), arm(108, 120, 4, 40), Rl).status === 'pass', 'oo control 90.0% (headroom exactly 10): measured')
  t(ooVerdict(arm(60, 120, 36, 40), arm(60, 120, 35, 40), Rl).status === 'not-measured', 'oo control unanimity 87.5% (headroom 12.5 < 15): not measured')
  t(ooVerdict(arm(60, 120, 34, 40), arm(60, 120, 34, 40), Rl).status === 'pass', 'oo control unanimity 85.0% (headroom exactly 15): measured')
  t(ooVerdict(arm(0, 0, 0, 0), arm(30, 120, 4, 40), Rl).status === 'no-measurement', 'oo empty candidate arm: no number')
  // area status: kept-set extremity, no per-area minimum
  const ex = (n, e) => Array.from({ length: n }, (_, i) => ({ choices: ['2', '5', '9', '14'], correct_answer: i < e ? (i % 2 ? '14' : '2') : '5' }))
  t(areaStatus(ex(10, 4), 'pass', Rl).status === 'pass', 'extremity 4/10 = 40.0% passes')
  t(areaStatus(ex(10, 3), 'pass', { ...Rl, cPrime: false }).status === 'held', 'batch-1 rule (no C-prime): extremity 3/10 = 30.0% holds the area')
  // C-prime at its margin: n 20, e 7 (35%) -> m = 20 - floor(35/2) = 3 -> 7/17 = 41.2%; m 2 would leave 7/18 = 38.9%
  const exi = (n, e) => ex(n, e).map((x, i) => ({ ...x, id: `X${i}` }))
  const c20 = areaStatus(exi(20, 7), 'pass', Rl, 20261471)
  t(c20.status === 'pass' && c20.deferred.length === 3 && c20.inserted.length === 17, `C-prime: 7/20 defers exactly 3 interior items and inserts 17 (${c20.reasons.join('; ') || c20.notes.join('; ')})`)
  t(c20.deferred.every(d => d.correct_answer === '5'), 'C-prime defers interior-key items only')
  t(JSON.stringify(areaStatus(exi(20, 7), 'pass', Rl, 20261471).deferred.map(d => d.id)) === JSON.stringify(c20.deferred.map(d => d.id)), 'C-prime draw is a function of the kept set and the seed')
  t(cPrimeDeferral(exi(20, 8), 1, Rl).m === 0 && areaStatus(exi(20, 8), 'pass', Rl, 1).deferred.length === 0, 'C-prime: 8/20 = 40.0% passes C, nothing deferred')
  t(cPrimeDeferral(exi(21, 8), 1, Rl).m === 1, 'C-prime: 8/21 = 38.1% -> m = 21 - 20 = 1 (8/20 = 40.0%)')
  t(areaStatus(exi(12, 0), 'pass', Rl, 1).status === 'held', 'C-prime: no end key -> held, nothing inserted')
  t(areaStatus(exi(20, 7), 'hold', Rl, 1).status === 'held', 'C-prime never rescues an options-only hold')
  // below 10 (batch 5: 8 slots): C is not measured, which is neither a pass nor a fail; C-prime never fires
  for (const [n, e] of [[8, 1], [8, 0], [9, 3], [8, 8]]) {
    const r = areaStatus(exi(n, e), 'pass', Rl, 20261772)
    t(r.cState === 'not-measured' && r.extremity.status === 'no-measurement' && r.status === 'pass' && !r.cPrimeFired && r.deferred.length === 0 && r.inserted.length === n && r.notes.some(x => /recorded/.test(x)), `n = ${n}, ${e} end key(s): C not measured (not pass, not fail), recorded, not a hold; C-prime does not fire; all ${n} inserted`)
  }
  t(areaStatus(exi(8, 1), 'hold', Rl, 1).status === 'held', 'n = 8: the options-only bar still decides (C not measured does not pass the area)')
  { const r = areaStatus(exi(10, 3), 'pass', Rl, 1); t(r.cPrimeFired && r.deferred.length === 3 && r.status === 'pass' && r.cState === 'not-measured', 'n = 10 is measured: 3/10 fails C, C-prime fires and defers 3; the 7 left are below 10, so C on them is recorded as not measured (the boundary is 10)') }
  t(areaStatus(ex(9, 0), 'pass', Rl).status === 'pass', 'n = 9: extremity not measured, recorded, NOT a hold (no per-area minimum)')
  t(areaStatus(ex(12, 6), 'hold', Rl).status === 'held', 'options-only hold holds the area')
  t(areaStatus(ex(12, 6), 'not-measured', Rl).status === 'held', 'options-only not-measured holds the area')
  // control plan: same cell first, deficit from the same area one difficulty up, never another area
  const cp = controlPlan({ 'data/easy': 19, 'data/medium': 40 }, { 'data/easy': 14, 'data/medium': 49, 'data/hard': 3, 'geo/easy': 99 })
  t(!cp.short && cp.take.find(x => x.cell === 'data/easy' && x.from === 'data/medium')?.n === 5 && cp.take.find(x => x.cell === 'data/medium' && x.from === 'data/medium')?.n === 40, 'control: 5 data/easy drawn from data/medium after medium\'s own 40')
  const cp2 = controlPlan({ 'data/easy': 19, 'data/medium': 45 }, { 'data/easy': 14, 'data/medium': 49, 'geo/easy': 99 })
  t(cp2.short.includes('data/easy short by 1') && !cp2.take.some(x => x.from.startsWith('geo')), 'control: exhausted -> short (refuses), never another area')
  t(controlPlan({ 'oa/easy': 12 }, { 'oa/easy': 51 }).substituted.length === 0, 'control: a covered cell substitutes nothing')
  // batch 3 H1 rank record, at its margin (recorded, never a gate)
  const rk = (n2, n) => Array.from({ length: n }, (_, i) => ({ choices: ['2', '5', '9', '14'], correct_answer: i < n2 ? '5' : ['2', '9', '14'][i % 3] }))
  t(rankOf(['14', '2', '9', '5'], '5') === 2 && rankOf(['2', '5', '9', '14'], '14') === 4 && rankOf(['2', '2', '9', '14'], '9') === null, 'rankOf: ascending rank by value; tied options unreadable')
  t(rankRecord(rk(8, 32), Rl).meets === true && rankRecord(rk(8, 32), Rl).hist[2] === 8, 'H1: 8/32 = 25.0% at rank 2 meets the prediction')
  t(rankRecord(rk(9, 32), Rl).meets === false, 'H1: 9/32 = 28.1% at rank 2 does not')
  t(rankRecord([], Rl).meets === null, 'H1: no items -> no measurement, never "met"')
  // freeze and screen-drop policy
  t(freezable({ O: 3, N: 40 }, Rl).O === true, 'an area keeping 3 still freezes (no minimum)')
  t(Object.keys(stage0Drops({ [`${B.idPrefix}-O56-01`]: 'x' }, { [`${B.idPrefix}-N7-02`]: ['S-R4 2 struck'] }, Rl)).join() === `${B.idPrefix}-O56-01`, 'pass-2 fail recorded, not dropped; withdrawal drops')
  // screen at its margins
  const it = { correct_answer: '14', choices: ['2', '5', '9', '14'] }
  const sOk = { my_answer: '14', n_struck: 1, struck: ['2'], key_identifiable_free: false, plugback_routine: false, one_sided: false, single_bound_kills_all: false, option_pair_tell: null }
  t(screenFails(it, sOk, Rl).length === 0, 'screen: one strike passes')
  t(screenFails(it, { ...sOk, n_struck: 2 }, Rl).some(x => x.startsWith('S-R4')), 'screen: two strikes fail')
  t(screenFails(it, { ...sOk, key_identifiable_free: true }, Rl).some(x => x.startsWith('S-R5')), 'screen: key identifiable fails')
  t(screenFails(it, { ...sOk, plugback_routine: true }, Rl).some(x => x.startsWith('S-R6')), 'screen: routine plug-back fails')
  t(screenFails(it, { ...sOk, option_pair_tell: '14 = 2 x 7' }, Rl).some(x => x.startsWith('S-R7')), 'screen: option pair fails')
  t(screenFails(it, { ...sOk, one_sided: true }, Rl).some(x => x.startsWith('S-R8')), 'screen: one-sided extreme key fails')
  t(screenFails(it, { ...sOk, single_bound_kills_all: true }, Rl).some(x => x.startsWith('S-R10')), 'screen: single bound on an extreme key fails')
  t(screenFails({ correct_answer: '5', choices: ['2', '5', '9', '14'] }, { ...sOk, my_answer: '5', one_sided: true, single_bound_kills_all: true }, Rl).length === 0, 'screen: one_sided / single bound ignored on an interior key')
  t(screenFails(it, { ...sOk, my_answer: '9' }, Rl).some(x => x.startsWith('S-KEY')), 'screen: wrong answer flags')
  t(screenFails(it, { ...sOk, plugback_routine: 'no' }, Rl)[0]?.startsWith('S-MALFORMED'), 'screen: string boolean is malformed, never a pass')
  t(screenFails(it, { ...sOk, n_struck: null }, Rl)[0]?.startsWith('S-MALFORMED'), 'screen: null n_struck is malformed, not zero')
  t(screenFails(it, undefined, Rl)[0]?.startsWith('S-MISSING'), 'screen: missing row never passes')
  // item rules
  const ok = { key_ok: true, exclusive: true, second_defensible: null, n_struck: 0, plugback_routine: false, one_sided: false, single_bound_kills_all: false, option_pair_tell: null, same_template_as: [], drop_recommend: false, grade_fit: 'fits', on_blueprint: true, distractors_weak: false, key_identifiable_free: false }
  const V = (a, b, F, E) => itemVerdict(it, a, b, F, E, Rl)
  t(V(ok, ok).keep, 'clean item kept')
  t(V({ ...ok, key_ok: false }, ok).drop.some(x => x.startsWith('R1')), 'R1 key disputed by one grader drops')
  t(V({ ...ok, exclusive: false }, { ...ok, second_defensible: '9' }).drop.some(x => x.startsWith('R2')), 'R2 exclusivity named by both drops')
  t(V({ ...ok, exclusive: false }, ok).need.some(x => x.startsWith('R2')), 'R2 exclusivity by one grader goes to F')
  t(V({ ...ok, exclusive: false }, ok, { ...ok, second_defensible: '9' }).drop.some(x => /R2.*F\)/.test(x)), 'R2 one + F names a second answer: drop')
  t(V({ ...ok, exclusive: false }, ok, { ...ok }).keep, 'R2 one + F exclusive: keep')
  t(V({ ...ok, n_struck: 2 }, { ...ok, n_struck: 3 }).drop.some(x => x.startsWith('R4')), 'R4 two free strikes by both drops')
  t(V({ ...ok, n_struck: 2 }, { ...ok, n_struck: 1 }).need.some(x => x.startsWith('R4')), 'R4 at the margin: 2 by one, 1 by the other -> F')
  t(V({ ...ok, n_struck: 2 }, ok, { ...ok, n_struck: 1 }).keep && V({ ...ok, n_struck: 2 }, ok, { ...ok, n_struck: 2 }).drop.length === 1, 'R4 one + F: F 1 keeps, F 2 drops')
  t(V({ ...ok, n_struck: 2 }, ok, { ...ok, n_struck: null }).drop.some(x => /tie/.test(x)), 'R4 one + F null n_struck: tie -> drop')
  t(V({ ...ok, key_identifiable_free: true }, { ...ok, key_identifiable_free: true }).drop.some(x => x.startsWith('R5')), 'R5 by both drops')
  t(V({ ...ok, key_identifiable_free: true }, ok).need.some(x => x.startsWith('R5')), 'R5 by one goes to F')
  t(V({ ...ok, distractors_weak: true }, { ...ok, distractors_weak: true }).drop.some(x => x.startsWith('R3')) && V({ ...ok, distractors_weak: true }, ok).keep, 'R3 needs both')
  t(V({ ...ok, plugback_routine: true }, { ...ok, plugback_routine: true }).drop.some(x => x.startsWith('R6')), 'R6 by both drops')
  t(V({ ...ok, one_sided: true }, ok).need.length === 1, 'R8 one grader without F: needs the tie-break')
  t(V({ ...ok, one_sided: true }, ok, { ...ok, one_sided: true }).drop.some(x => /F\)/.test(x)), 'R8 one grader + F yes: 2 of 3 drops')
  t(V({ ...ok, one_sided: true }, ok, { ...ok }).keep, 'R8 one grader + F no: keeps')
  t(V({ ...ok, one_sided: true }, ok, { ...ok, one_sided: 'yes' }).drop.some(x => /tie/.test(x)), 'F malformed: tie -> drop')
  t(V({ ...ok, one_sided: true }, ok, {}).drop.some(x => /tie/.test(x)), 'F row without the field: tie -> drop')
  t(itemVerdict({ correct_answer: '5', choices: ['2', '5', '9', '14'] }, { ...ok, one_sided: true }, { ...ok, one_sided: true }, undefined, new Set(), Rl).keep, 'one_sided ignored on an interior key')
  t(V({ ...ok, option_pair_tell: '14 = 2 x 7' }, { ...ok, option_pair_tell: '14 - 5' }).drop.some(x => x.startsWith('R7')), 'R7 by both drops')
  const E = new Set([`${B.idPrefix}-O56-01`])
  t(V({ ...ok, same_template_as: [`${B.idPrefix}-O56-01`] }, { ...ok, same_template_as: [`${B.idPrefix}-O56-01`] }, undefined, E).drop.some(x => x.startsWith('R11')), 'R11 template of an earlier item by both drops')
  t(V({ ...ok, same_template_as: [`${B.idPrefix}-O56-09`] }, ok, undefined, E).keep, 'template of a LATER item is not R11')
  t(V({ ...ok, drop_recommend: true }, ok).drop.some(x => x.startsWith('EXT-1')), 'EXT-1 drop_recommend by one grader drops')
  t(V({ ...ok, grade_fit: 'too_easy' }, { ...ok, grade_fit: 'too_easy' }).keep && V({ ...ok, grade_fit: 'too_easy' }, { ...ok, grade_fit: 'too_easy' }).rec.length === 1, 'grade fit too_easy by both: RECORDED, kept')
  t(V({ ...ok, on_blueprint: false }, { ...ok, on_blueprint: false }).hold.length === 1, 'off-blueprint by both holds')
  // cold integrity
  const s1 = { [`${B.idPrefix}-O56-01`]: Object.fromEntries(S1_FIELDS.map(f => [f, f === 'n_struck' ? 1 : null])) }
  const s2 = { [`${B.idPrefix}-O56-01`]: { ...s1[`${B.idPrefix}-O56-01`], ...Object.fromEntries(S2_FIELDS.map(f => [f, null])) } }
  t(coldDiff(s1, s2, Rl).length === 0, 'coldcheck: unchanged copy passes')
  t(coldDiff(s1, { [`${B.idPrefix}-O56-01`]: { ...s2[`${B.idPrefix}-O56-01`], n_struck: 0 } }, Rl).length === 1, 'coldcheck: a changed stage-1 field is caught')
  return c
}

const MUTATIONS = {
  'oo margin bar removed': { ooMargin: Infinity }, 'oo margin bar loosened to +11': { ooMargin: 11 },
  'oo unanimity bar removed': { ooUnan: Infinity }, 'oo margin ceiling check removed': { ooCeiling: false },
  'oo unanimity ceiling check removed': { unanCeiling: false }, 'empty arm allowed': { emptyArmRefuses: false },
  'extremity gate removed': { extremityGate: false }, 'n>=10 hold re-imposed': { smallNHolds: true },
  'R1 removed': { keyDisputeAnyDrops: false }, 'R2 both-drop removed': { exclBoth: false }, 'R2 one -> F removed': { exclOneTb: false },
  'R4/R5 both-drop removed': { freeBoth: false }, 'R4/R5 one -> F removed': { freeOneTb: false },
  'R6-R11 both-drop removed': { tbBoth: false }, 'R6-R11 one -> F removed': { tbOne: false }, 'tie -> keep': { tieDrops: false },
  'R3 removed': { r3Both: false }, 'EXT-1 removed': { extRecommendDrops: false }, 'off-blueprint hold removed': { offBlueprintHolds: false },
  'grade fit made a drop rule (v5)': { gradeFitDrops: true },
  'screen strikes bar at 3': { screenStrikeMin: 3 }, 'screen R5 removed': { screenKeyIdent: false }, 'screen R6 removed': { screenPlugback: false },
  'screen R7 removed': { screenPair: false }, 'screen R8 removed': { screenOneSided: false }, 'screen R10 removed': { screenSingleBound: false },
  'screen wrong-answer flag removed': { screenWrongAnswer: false }, 'screen malformed check removed': { screenMalformed: false },
  'pass-2 one-screener drop re-imposed (v5)': { screenP2Drops: true }, 'per-area freeze minimum 15 re-imposed (v5)': { areaFreezeMin: 15 },
  'coldcheck field compare removed': { coldCompare: false },
  'H1 rank-2 prediction loosened to 30%': { rank2Pred: 30 }, 'C measured below 10 (minN 1)': { cMinN: 1 }, 'C-prime removed (batch-1 rule on batch 2)': { cPrime: false }, 'C-prime defers one too few': { cPrimeExtra: -1 }, 'C-prime defers one too many': { cPrimeExtra: 1 },
}

async function selftest() {
  let bad = 0
  const base = cases(RULES)
  for (const [ok, msg] of base) if (!ok) { bad++; console.error('FAIL', msg) }
  // structure
  const sl = rd(SLOTS_FILE), slotIds = Object.values(sl).flatMap(v => v.rows.map(r => r.id))
  const rows = Object.values(sl).flatMap(v => v.rows), core = rows.filter(r => r.core === true).length
  const er = earlierBatchIds(), screenN = BATCH === 'b2' ? core : B.slotTotal
  const packets = chunk([...Array(screenN).keys()], SCREEN_PACKET_MAX).map(x => x.length).join()
  const st = [[slotIds.length === B.slotTotal && new Set(slotIds).size === B.slotTotal && slotIds.every(id => ID_RE.test(id)), `${BATCH} slots: ${B.slotTotal} distinct ids, all ${B.idPrefix}-<area><cell>-NN (read ${slotIds.length})`],
    [Object.keys(sl).length === B.expect.authors && AUTHORS.length === Object.keys(sl).length, `${BATCH} slots: ${B.expect.authors} author cells, each in one area`],
    [Object.entries(sl).every(([a, v]) => AREAS[a[0]].domain === v.area), 'each author cell is in its letter\'s area'],
    [rows.every(r => B.areas.includes(LETTER_OF_DOMAIN[Object.values(sl).find(v => v.rows.includes(r)).area])), `${BATCH}: every slot is in the batch's areas (${B.areas.join(' ')})`],
    [B.expect.packets === packets && (BATCH !== 'b2' || (core === 77 && chunk([...Array(254).keys()], SCREEN_PACKET_MAX).length === 7)), `${BATCH}: screen packets ${packets}${BATCH === 'b2' ? ' (77 core; FULL 254 -> 7)' : ''}`],
    [er.ids.length === B.expect.earlierN && new Set(er.ids).size === er.ids.length, `${BATCH}: R11 earlier ids ${er.ids.length} (expected ${B.expect.earlierN}${er.named ? `: ${B.earlier}; graders' file names ${er.named}, all inside` : ''})`],
    [BATCH === 'b1' || (B.ooPartMax === 60 && chunk([...Array(120).keys()], B.ooPartMax).length === 2 && chunk([...Array(60).keys()], B.ooPartMax).length === 1), `${BATCH}: options-only parts of <= 60 rows`],
    [RL.cPrime === (BATCH !== 'b1'), `${BATCH} runs ${BATCH !== 'b1' ? 'with' : 'without'} C-prime`],
    [BATCH === 'b1' || B.areas.every(L => [SEED.freeze, SEED.oo, SEED.grade, SEED.cPrime].every(x => Number.isInteger(x?.[L]))), `${BATCH}: freeze / oo / grade / C-prime seeds for every area`],
    [!B.rankRecord || (B.areas.every(L => { const rs = Object.values(sl).filter(v => v.area === AREAS[L].domain).flatMap(v => v.rows); return ['1', '2', '3', '4'].map(r => rs.filter(x => String(x.rank) === r).length).join('/') === B.expect.ranks[L] }) && rows.every(x => [1, 2, 3, 4].includes(x.rank) && x.pos === (x.rank === 1 ? 'S' : x.rank === 4 ? 'L' : 'I'))), `${BATCH}: slot key ranks per area ${B.rankRecord ? JSON.stringify(B.expect.ranks) : '(none)'}, each consistent with its S/I/L position`],
    [chunk([...Array(35).keys()], GRADE_PART_MAX).length === 1 && chunk([...Array(36).keys()], GRADE_PART_MAX).map(x => x.length).join() === '18,18', 'grade parts: 35 -> 1, 36 -> 18+18'],
    [(() => { try { return renderGraphic({ type: 'twowaytable', colLabels: ['a', 'b'], rowLabels: ['x'], cells: [['1', '2']] }).includes('| x | 1 | 2 |') } catch { return false } })(), 'graphic renders as a markdown table']]
  if (B.idPattern) {
    // n789: one batch over three id prefixes. The pattern must take exactly the batch's prefixes, every candidate must be
    // absent from the R11 earlier set AND from the math-check prior (a same-id row there is a self near-duplicate), every
    // author file must be present, and the earlier set must still hold every non-candidate MB6-MB8 item
    const prior = rd(B.earlierDump), pids = new Set(prior.map(x => String(x.id))), eids = new Set(er.ids)
    const prefixes = [...new Set(slotIds.map(id => id.split('-')[0]))].sort().join()
    st.push([prefixes === 'MB7,MB8,MB9' && ['MB7-N7-01', 'MB8-N7-05', 'MB9-N8-01'].every(x => ID_RE.test(x)) && !['MB6-D7-01', 'MB5-N7-01', 'MB10-N7-01', 'XMB8-N7-01'].some(x => ID_RE.test(x)), `${BATCH}: id pattern ${B.idPattern} takes MB7/MB8/MB9 (slots use ${prefixes}) and nothing else`],
      [slotIds.every(id => !eids.has(id) && !pids.has(id)), `${BATCH}: no candidate is in the R11 earlier set or the math-check prior (${B.earlierDump.replace(ROOT + '/', '')}, ${prior.length} rows)`],
      [['MB6-G6-01', 'MB6-D7-01', 'MB7-N6-01', 'MB8-N7-04', 'MB8-N8-01'].every(x => eids.has(x) && pids.has(x)), `${BATCH}: earlier set keeps the b6 items and the b7/b8 drops`],
      [AUTHORS.every(a => existsSync(`${AUTHORED}/${a}/items.json`)), `${BATCH}: all ${AUTHORS.length} author files present (${AUTHORS.join(' ')})`])
  }
  for (const [ok, msg] of st) if (!ok) { bad++; console.error('FAIL', msg) }
  const n = base.length + st.length
  if (bad) { console.error(`SELFTEST FAILED ${bad}/${n}`); process.exit(2) }
  // break-test: each rule reverted must fail at least one case
  let caught = 0; const missed = []
  for (const [name, m] of Object.entries(MUTATIONS)) {
    const failed = cases({ ...RULES, ...m }).filter(([ok]) => !ok).map(([, msg]) => msg)
    if (failed.length) { caught++; console.log(`  reverted: ${name.padEnd(44)} -> ${failed.length} case(s) fail, e.g. "${failed[0]}"`) } else missed.push(name)
  }
  // insert-prep row shape: everything math-bank-helper and map-math-meta read
  const { mapMathMeta } = await import('./map-math-meta.mjs')
  const src = { id: `${B.idPrefix}-O56-01`, domain: AREAS.O.domain, map_area: 'oa', subskill: 's', tier: 'low', ccss: '5.OA.A.1', prompt: 'p', correct_answer: '14', choices: ['2', '5', '9', '14'], explanation: 'e', solve: 'return 14', grade_target: 5, rit_band: 'RIT 190-199', distractor_meta: { 2: { why: 'w2' } }, distractor_solve: {} }
  const row = toInsertRow(src, ['9', '14', '2', '5'])
  const meta = mapMathMeta(row)
  const rowOk = row.difficulty === 'easy' && row.topic_tag === '5.OA.A.1' && row.choices.join() === '9,14,2,5' && row.graphic === null && meta.grade_target === 5 && meta.rit_band_target === 'RIT 190-199' && row.distractor_steps.find(d => d.choice === '2')?.mis_step === 'w2'
  if (!rowOk) { console.error('FAIL insert row shape / mapMathMeta'); process.exit(2) }
  if (missed.length) { console.error(`SELFTEST: ${missed.length} reverted rule(s) went undetected: ${missed.join('; ')}`); process.exit(2) }
  console.log(`selftest [${BATCH}] ${n + 1}/${n + 1} cases pass (incl. insert row shape); ${caught}/${Object.keys(MUTATIONS).length} reverted rules each fail >= 1 case`)
}

/* ------------------------------------------------------------------ commands */
async function cmdAssemble() {
  const sl = rd(SLOTS_FILE)
  const slot = Object.fromEntries(Object.entries(sl).flatMap(([a, v]) => v.rows.map(r => [r.id, { ...r, author: a, domain: v.area }])))
  const present = AUTHORS.filter(a => existsSync(`${AUTHORED}/${a}/items.json`))
  if (!B.authorsPresentOnly && present.length !== AUTHORS.length) die(`${BATCH} needs every author file; missing ${AUTHORS.filter(a => !present.includes(a)).join(' ')}`)
  if (!present.length) die(`no author file under ${AUTHORED}`)
  console.log(`${B.name}: author files ${present.length} of ${AUTHORS.length} (${present.join(' ')})${present.length < AUTHORS.length ? '; absent: ' + AUTHORS.filter(a => !present.includes(a)).join(' ') : ''}`)
  const files = present.map(a => `${AUTHORED}/${a}/items.json`)
  const items = []
  for (const [i, f] of files.entries()) {
    const j = rd(f); if (!Array.isArray(j) || !j.length) die(`${f}: not a non-empty array`)
    for (const it of j) {
      const s = slot[it.id]; if (!s) die(`${it.id} (${f}) is not a slot`)
      if (s.author !== present[i]) die(`${it.id} is ${s.author}'s slot but sits in ${present[i]}'s file`)
      if (it.domain !== s.domain) die(`${it.id}: domain '${it.domain}' != slot area '${s.domain}'`)
      areaOfItem(it); items.push(it)
    }
  }
  if (new Set(items.map(i => i.id)).size !== items.length) die('duplicate ids across files')
  const missing = Object.keys(slot).filter(id => !items.find(i => i.id === id))
  const mCore = missing.filter(id => slot[id].core === true), mPresent = missing.filter(id => present.includes(slot[id].author))
  console.log(`items read ${items.length} of ${Object.keys(slot).length} slots; empty: ${missing.length}${BATCH === 'b1' ? (missing.length ? ' - ' + missing.join(' ') : '') : ` (core ${mCore.length}${mCore.length ? ': ' + mCore.join(' ') : ''}; in present authors' cells ${mPresent.length}${mPresent.length ? ': ' + mPresent.join(' ') : ''})`}`)
  const nonCore = items.filter(it => slot[it.id].core === false)
  if (BATCH !== 'b1' && nonCore.length) console.log(`  (read) ${nonCore.length} item(s) in non-core slots: ${nonCore.map(i => i.id).join(' ')} (the 177 non-core slots wait on the owner decision)`)
  const checked = await checkAll(files, 'assemble')
  if (checked !== items.length) die(`math-check read ${checked} items, files hold ${items.length}`)
  // batch-level (read) lines: cross-author near-duplicates and repeated key values
  const bag = s => new Set(String(s ?? '').toLowerCase().replace(/\d+(\.\d+)?/g, ' # ').replace(/[^a-z#]+/g, ' ').trim().split(/\s+/).filter(w => w === '#' || w.length > 2))
  const dups = []
  for (let i = 0; i < items.length; i++) for (let k = i + 1; k < items.length; k++) { const j = jac(bag(items[i].prompt), bag(items[k].prompt)); if (j >= 0.6) dups.push(`${items[i].id} ~ ${items[k].id} j=${j.toFixed(2)}`) }
  for (const d of dups) console.log(`  (read) within-batch near-dup ${d}`)
  const keys = {}; for (const it of items) (keys[`${areaOfItem(it)} ${val(it.correct_answer)}`] ??= []).push(it.id)
  const rep = Object.entries(keys).filter(([, v]) => v.length > 1)
  console.log(`  (read) key values repeated within an area: ${rep.length}${rep.length ? ' - ' + rep.map(([k, v]) => `${k}: ${v.join(',')}`).join('; ') : ''}`)
  mkdirSync(WORK, { recursive: true })
  const order = Object.keys(slot)
  const sorted = order.map(id => items.find(i => i.id === id)).filter(Boolean)
  wj(WORK + '/assembled.json', sorted)
  for (const L of B.areas) {
    const a = sorted.filter(i => areaOfItem(i) === L), v = keyExtremityVerdict(a)
    const g = {}; for (const it of a) g[it.grade_target] = (g[it.grade_target] ?? 0) + 1
    console.log(`  ${L} ${AREAS[L].domain.padEnd(34)} n ${String(a.length).padStart(3)}  by grade ${JSON.stringify(g)}  key extremity ${v.status} ${Number.isFinite(v.rate) ? f1(100 * v.rate) + '%' : ''}  graphics ${a.filter(i => i.graphic).length}`)
  }
  console.log(`ASSEMBLED ${sorted.length} -> ${WORK}/assembled.json sha ${sha(WORK + '/assembled.json').slice(0, 16)}; within-batch near-dups ${dups.length} (read)`)
}

async function db() {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync(ROOT + '/.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}
async function iseePool() {
  const c = await db(), rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await c.from('study_item_bank').select('id,cohort,difficulty,subskill,item').eq('family', 'isee').eq('section', 'math').eq('verified', true).eq('archived', false).order('id').range(f, f + 999)
    if (error) die(error.message); rows.push(...data); if (data.length < 1000) break
  }
  const { count, error: ce } = await c.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', 'isee').eq('section', 'math').eq('verified', true).eq('archived', false)
  if (ce || count !== rows.length) die(`paging read ${rows.length} rows, server count ${count} (${ce?.message ?? ''})`)
  if (!rows.length || new Set(rows.map(r => r.id)).size !== rows.length) die('empty or slipped paging')
  const pool = {}
  for (const r of rows) {
    const ch = (r.item?.choices ?? []).map(String)
    if (ch.length !== 4 || !ch.includes(String(r.item?.correct_answer ?? ''))) continue
    if (scoreItem(ch, String(r.item.correct_answer)).skip) continue
    if (!['easy', 'medium', 'hard'].includes(r.difficulty)) continue
    ;(pool[`${iseeArea(r.subskill ?? '')}/${r.difficulty}`] ??= []).push(r)
  }
  return { rows: rows.length, pool }
}
const tierDiff = it => it.tier === 'low' ? 'easy' : 'medium'   // v1-v5's matching: low -> easy, mid/high -> medium
/**
 * 1:1 control plan. Each candidate cell <area>/<easy|medium> draws from the same live ISEE cell; a cell that is
 * short takes ALL of it and the deficit from the SAME AREA's next difficulty up (easy -> medium -> hard,
 * medium -> hard), after that cell's own need is met. Pre-registered (MAP-MATH-V2.prereg.md); printed and recorded.
 */
export function controlPlan(need, avail) {
  const left = { ...avail }, take = [], substituted = []
  const order = Object.keys(need).sort((a, b) => (a.endsWith('/medium') ? 0 : 1) - (b.endsWith('/medium') ? 0 : 1) || a.localeCompare(b))   // own cells first: medium, then easy
  const own = {}
  for (const cell of Object.keys(need)) { const n = Math.min(need[cell], left[cell] ?? 0); own[cell] = n; left[cell] = (left[cell] ?? 0) - n; if (n) take.push({ cell, from: cell, n }) }
  let short = ''
  for (const cell of order) {
    let def = need[cell] - own[cell]; if (!def) continue
    const [area, diff] = cell.split('/')
    for (const up of (diff === 'easy' ? ['medium', 'hard'] : ['hard'])) {
      const from = `${area}/${up}`, n = Math.min(def, left[from] ?? 0)
      if (n) { take.push({ cell, from, n }); left[from] -= n; def -= n; substituted.push(`${cell}: ${n} drawn from ${from}`) }
      if (!def) break
    }
    if (def) short += `${cell} short by ${def}; `
  }
  return { take, substituted, short }
}

async function cmdOoPool() {
  const items = rd(existsSync(WORK + '/assembled.post-return.json') ? WORK + '/assembled.post-return.json' : WORK + '/assembled.json')
  const { rows, pool } = await iseePool()
  const need = {}; for (const it of items) { const k = `${it.map_area}/${tierDiff(it)}`; need[k] = (need[k] ?? 0) + 1 }
  console.log(`live isee/math ${rows}; per area/difficulty: eligible vs needed at most (all assembled kept)`)
  let short = 0
  for (const k of [...new Set([...Object.keys(need), ...Object.keys(pool)])].sort()) { const e = pool[k]?.length ?? 0, n = need[k] ?? 0; if (n > e) short++; console.log(`  ${k.padEnd(12)} eligible ${String(e).padStart(4)}  need <= ${String(n).padStart(3)}${n > e ? '  SHORT' : ''}`) }
  const plan = controlPlan(need, Object.fromEntries(Object.entries(pool).map(([k, v]) => [k, v.length])))
  console.log(`own-cell shortfalls ${short}; pre-registered substitution at the maximum need: ${plan.substituted.join('; ') || 'none needed'}${plan.short ? '; STILL SHORT: ' + plan.short : ''}`)
}

function cmdScreenRender(pass) {
  if (!['1', '2'].includes(pass)) die('screen-render <1|2>')
  const all = rd(WORK + '/assembled.json')
  let items, base
  if (pass === '1') {
    if (existsSync(WORK + '/screen/p1.manifest.json')) die('pass-1 packets already rendered (screen/p1.manifest.json); rendered once')
    items = shuffleWith(all.slice(), rng(SEED.screen1Order)); base = all
  } else {
    if (existsSync(WORK + '/screen/p2.manifest.json')) die('pass-2 packets already rendered')
    const p1 = rd(WORK + '/screen-p1.json'), fails = Object.keys(p1.fails)
    if (!fails.length) die('no item failed pass 1; there is no pass 2')
    const rdir = WORK + '/returns'
    const withdrawn = existsSync(rdir + '/withdrawn.json') ? rd(rdir + '/withdrawn.json') : {}
    const stand = existsSync(rdir + '/stand.json') ? rd(rdir + '/stand.json') : {}
    const revised = {}, unacc = []
    for (const id of fails) {
      const p = `${rdir}/${id}.json`, n = [existsSync(p), id in withdrawn, id in stand].filter(Boolean).length
      if (n !== 1) { unacc.push(`${id} (${n ? 'accounted ' + n + ' times' : 'unaccounted'})`); continue }
      if (existsSync(p)) { const r = rd(p); if (r.id !== id) die(`${p}: id ${r.id}`); revised[id] = r }
    }
    if (unacc.length) die(`every pass-1 fail needs exactly one of returns/<id>.json, withdrawn.json, stand.json: ${unacc.join(' ')}`)
    for (const id of [...Object.keys(withdrawn), ...Object.keys(stand)]) if (!fails.includes(id)) die(`${id} is in withdrawn/stand but did not fail pass 1`)
    base = all.filter(i => !(i.id in withdrawn)).map(i => revised[i.id] ?? i)
    items = shuffleWith(Object.values(revised), rng(SEED.screen2Order))
    console.log(`pass-1 fails ${fails.length}: revised ${items.length}, withdrawn ${Object.keys(withdrawn).length}, stand ${Object.keys(stand).length}`)
    if (!items.length) { wj(WORK + '/assembled.post-return.json', base); console.log('no revised item to re-screen; assembled.post-return.json written; no pass 2'); return }
    return checkRevisedThenRender(items, base)
  }
  renderPackets('p1', items, SEED.screen1Deal, base)
}
async function checkRevisedThenRender(items, base) {
  mkdirSync(WORK + '/tmp', { recursive: true })
  const by = {}; for (const it of items) (by[it.id.split('-')[1]] ??= []).push(it)
  const files = Object.entries(by).map(([a, xs]) => { const p = `${WORK}/tmp/revised-${a}.json`; wj(p, xs); return p })
  await checkAll(files, 'revised items')
  wj(WORK + '/assembled.post-return.json', base)
  renderPackets('p2', items, SEED.screen2Deal, base)
}
function renderPackets(pass, items, dealSeed, base) {
  const rand = rng(dealSeed), manifest = {}, letters = {}
  const packets = chunk(items, SCREEN_PACKET_MAX)
  packets.forEach((part, pi) => {
    const name = `${pass}-${'abcdefghijklmnopqrstuvwxyz'[pi]}`, dir = `${WORK}/screen/${name}`
    mkdirSync(dir, { recursive: true })
    let md = `# Items for screening (${part.length})\n\nEach item: id, area, target grade and tier, the question, four options. The correct answer is NOT marked.\n`
    part.forEach((it, i) => { const d = dealOptions(it, i, rand); letters[it.id] = { packet: name, letter: d.letter, choices: d.opts }; md += coldBlock(it, d.opts) })
    writeFileSync(`${dir}/screen.md`, md)
    manifest[name] = { dir, n: part.length, ids: part.map(i => i.id), sha: sha(`${dir}/screen.md`) }
    const deal = {}; for (const it of part) deal[letters[it.id].letter] = (deal[letters[it.id].letter] ?? 0) + 1
    const ar = {}; for (const it of part) ar[it.map_area] = (ar[it.map_area] ?? 0) + 1
    console.log(`${dir}/screen.md  ${part.length} items  areas ${JSON.stringify(ar)}  key letters ${JSON.stringify(deal)}  sha ${manifest[name].sha.slice(0, 16)}`)
  })
  wj(`${WORK}/screen/${pass}.manifest.json`, { seedDeal: dealSeed, baseSha: createHash('sha256').update(JSON.stringify(base)).digest('hex'), packets: manifest })
  wj(`${WORK}/screen/${pass}.key.json`, letters)
  console.log(`${pass}: ${items.length} items in ${packets.length} packet(s)`)
}

function cmdScreenScore(pass) {
  if (!['1', '2'].includes(pass)) die('screen-score <1|2>')
  const man = rd(`${WORK}/screen/p${pass}.manifest.json`)
  const src = pass === '1' ? rd(WORK + '/assembled.json') : rd(WORK + '/assembled.post-return.json')
  const all = Object.fromEntries(src.map(i => [i.id, i]))
  const rows = {}; let want = 0
  for (const [nm, p] of Object.entries(man.packets)) {
    if (sha(`${p.dir}/screen.md`) !== p.sha) die(`${nm}/screen.md changed since render`)
    const j = rd(`${p.dir}/screen.json`)
    const got = p.ids.filter(id => j[id]).length
    console.log(`  ${nm}: rows ${got} of ${p.n}`)
    for (const id of p.ids) { want++; rows[id] = j[id] ?? null }
  }
  if (!want) die('no screened ids')
  const fails = {}
  for (const [id, s] of Object.entries(rows)) { if (!all[id]) die(`${id} not in the item set`); const f = screenFails(all[id], s); if (f.length) fails[id] = f }
  for (const [id, f] of Object.entries(fails)) console.log(`  ${id}  ${f.join(' | ')}`)
  const byArea = {}; for (const id of Object.keys(rows)) { const L = ID_RE.exec(id)[1]; byArea[L] ??= [0, 0]; byArea[L][0]++; if (fails[id]) byArea[L][1]++ }
  console.log(`  by area (fail / screened): ${Object.entries(byArea).map(([L, [n, f]]) => `${L} ${f}/${n}`).join('  ')}`)
  console.log(`screen pass ${pass}: ${want} screened, ${Object.keys(fails).length} fail`)
  wj(`${WORK}/screen-p${pass}.json`, { screened: want, fails })
  if (pass === '1') {
    mkdirSync(WORK + '/returns', { recursive: true })
    const sl = rd(SLOTS_FILE), author = Object.fromEntries(Object.entries(sl).flatMap(([a, v]) => v.rows.map(r => [r.id, a])))
    const per = {}; for (const [id, f] of Object.entries(fails)) (per[author[id]] ??= {})[id] = f
    for (const [a, x] of Object.entries(per)) wj(`${WORK}/returns/needed-${a}.json`, x)
    console.log(`returns needed: ${Object.entries(per).map(([a, x]) => `${a} ${Object.keys(x).length}`).join(', ') || 'none'} -> ${WORK}/returns/needed-<author>.json`)
  } else console.log('pass-2 fails are RECORDED (carried to each area\'s score record), not dropped: the screen never drops on one screener')
}

async function cmdFreeze() {
  if (!existsSync(WORK + '/screen-p1.json')) die('the screen has not run (screen-p1.json missing)')
  const p1 = rd(WORK + '/screen-p1.json'), nf = Object.keys(p1.fails).length
  if (B.areas.some(L => existsSync(areaDir(L) + 'batch.json'))) die('an area batch is already frozen; freeze runs once')
  let items
  const withdrawn = existsSync(WORK + '/returns/withdrawn.json') ? rd(WORK + '/returns/withdrawn.json') : {}
  let p2 = { fails: {} }
  if (nf) {
    items = rd(WORK + '/assembled.post-return.json')
    const revised = Object.keys(p1.fails).filter(id => existsSync(`${WORK}/returns/${id}.json`))
    if (revised.length) { if (!existsSync(WORK + '/screen-p2.json')) die(`${revised.length} revised item(s) and pass 2 has not been scored`); p2 = rd(WORK + '/screen-p2.json') }
  } else items = rd(WORK + '/assembled.json')
  const drops = stage0Drops(withdrawn, p2.fails)
  const kept = items.filter(i => !drops[i.id])
  mkdirSync(WORK + '/tmp', { recursive: true })
  const by = {}; for (const it of kept) (by[it.id.split('-')[1]] ??= []).push(it)
  const files = Object.entries(by).map(([a, xs]) => { const p = `${WORK}/tmp/freeze-${a}.json`; wj(p, xs); return p })
  const n = await checkAll(files, 'freeze')
  if (n !== kept.length) die(`math-check read ${n}, kept ${kept.length}`)
  const outside = kept.filter(i => !B.areas.includes(areaOfItem(i))); if (outside.length) die(`${outside.length} item(s) outside ${BATCH}'s areas (${B.areas.join(' ')}): ${outside.slice(0, 5).map(i => i.id).join(' ')}`)
  const counts = Object.fromEntries(B.areas.map(L => [L, kept.filter(i => areaOfItem(i) === L).length]))
  const fz = freezable(counts)
  for (const L of B.areas) {
    if (!fz[L]) { console.log(`  ${L} keeps ${counts[L]}: nothing to freeze`); continue }
    const a = kept.filter(i => areaOfItem(i) === L)
    const order = shuffleWith(a.map(i => i.id), rng(SEED.freeze[L]))
    const frozen = order.map(id => a.find(i => i.id === id))
    mkdirSync(areaDir(L), { recursive: true })
    wj(areaDir(L) + 'batch.json', frozen)
    const flags = {}; for (const it of a) { const f1x = p1.fails[it.id], f2x = p2.fails[it.id]; if (f1x || f2x) flags[it.id] = { p1: f1x ?? null, revised: existsSync(`${WORK}/returns/${it.id}.json`), p2: f2x ?? null } }
    wj(areaDir(L) + 'screen-flags.json', flags)
    const v = keyExtremityVerdict(frozen)
    console.log(`FROZEN ${L} ${AREAS[L].key.padEnd(4)} ${frozen.length} -> ${areaDir(L)}batch.json sha256 ${sha(areaDir(L) + 'batch.json')}  extremity ${v.status} (${v.reason})  screen-flagged ${Object.keys(flags).length}`)
    if (B.rankRecord) { const rr = rankRecord(frozen); wj(areaDir(L) + 'rank-h1.json', { prereg: PREREG, stage: 'freeze', frozenSha: sha(areaDir(L) + 'batch.json'), ...rr }); console.log(`  H1 frozen ${rr.line}`); if (rr.n !== frozen.length) die(`H1: ${rr.unscored} frozen item(s) have no readable key rank`) }
  }
  mkdirSync(R, { recursive: true })
  wj(R + 'stage0-drops.json', drops)
  for (const f of ['screen-p1.json', 'screen-p2.json']) if (existsSync(`${WORK}/${f}`)) copyFileSync(`${WORK}/${f}`, R + f)
  console.log(`stage-0 drops (withdrawn): ${Object.keys(drops).join(' ') || 'none'}`)
}

async function cmdOo(a) {
  const areas = areaArg(a)
  for (const L of areas) if (existsSync(`${WORK}/oo/${L}/oo.blind.json`) || existsSync(areaDir(L) + 'oo.key.json')) die(`options-only render for ${L} already exists; made once`)
  const { rows, pool } = await iseePool()
  console.log(`live isee/math ${rows}; eligible by area/difficulty: ${JSON.stringify(Object.fromEntries(Object.entries(pool).map(([k, v]) => [k, v.length])))}`)
  for (const L of areas) {
    const frozen = rd(areaDir(L) + 'batch.json')
    const rand = rng(SEED.oo[L]), shuffle = x => shuffleWith(x.slice(), rand)
    const need = {}; for (const it of frozen) { const k = `${it.map_area}/${tierDiff(it)}`; need[k] = (need[k] ?? 0) + 1 }
    const plan = controlPlan(need, Object.fromEntries(Object.entries(pool).map(([k, v]) => [k, v.length])))
    if (plan.short) die(`${L}: control short: ${plan.short} (pre-registered substitution exhausted; no other fallback)`)
    const control = [], used = new Set()
    for (const { cell, from, n } of plan.take) { const p = shuffle((pool[from] ?? []).filter(r => !used.has(r.id))).slice(0, n); for (const r of p) used.add(r.id); control.push(...p.map(r => ({ r, k: cell, from }))) }
    if (plan.substituted.length) console.log(`  ${L}: PRE-REGISTERED SUBSTITUTION (recorded in oo.key.json): ${plan.substituted.join('; ')}`)
    const SL = ['A', 'B', 'C', 'D'], entries = []
    const deal = (choices, key, i) => { const ch = choices.map(x => String(x).replace(/−/g, '-')); const ci = ch.indexOf(String(key).replace(/−/g, '-')); const want = SL[i % 4]; const rest = shuffle(ch.filter((_, j) => j !== ci)); let q = 0; return { want, options: Object.fromEntries(SL.map(s => [s, s === want ? ch[ci] : rest[q++]])) } }
    frozen.forEach((it, i) => { const d = deal(it.choices, it.correct_answer, i); entries.push({ blind: { options: d.options }, key: { letter: d.want, localId: it.id, cell: `${it.map_area}/${tierDiff(it)}`, kind: 'candidate' } }) })
    control.forEach(({ r, k, from }, i) => { const d = deal(r.item.choices, r.item.correct_answer, i); entries.push({ blind: { options: d.options }, key: { letter: d.want, localId: r.id, cohort: r.cohort, cell: k, drawnFrom: from, kind: 'live-control' } }) })
    const order = shuffle(entries), blind = {}, key = {}
    order.forEach((e, i) => { const id = `${L}${String(i + 1).padStart(3, '0')}`; blind[id] = e.blind; key[id] = e.key })
    mkdirSync(`${WORK}/oo/${L}`, { recursive: true }); mkdirSync(areaDir(L), { recursive: true })
    wj(areaDir(L) + 'oo.key.json', key)
    if (B.ooPartMax) {
      // batch 2: parts of <= ooPartMax rows, candidates and controls interleaved by the seeded order; three samples per part
      const parts = chunk(Object.keys(blind), B.ooPartMax).map((ids, pi) => ({ part: pi + 1, dir: `${WORK}/oo/${L}/p${pi + 1}`, ids }))
      for (const pt of parts) { mkdirSync(pt.dir, { recursive: true }); wj(`${pt.dir}/oo.blind.json`, Object.fromEntries(pt.ids.map(id => [id, blind[id]]))); const c = pt.ids.map(id => key[id].kind); console.log(`  ${L} part ${pt.part}: ${pt.dir}/oo.blind.json  ${pt.ids.length} rows (candidates ${c.filter(x => x === 'candidate').length}, controls ${c.filter(x => x === 'live-control').length})  sha ${sha(`${pt.dir}/oo.blind.json`).slice(0, 16)}`) }
      wj(areaDir(L) + 'oo.parts.json', parts.map(pt => ({ ...pt, sha: sha(`${pt.dir}/oo.blind.json`) })))
      wj(areaDir(L) + 'oo.blind.json', blind)
    } else { wj(`${WORK}/oo/${L}/oo.blind.json`, blind); copyFileSync(`${WORK}/oo/${L}/oo.blind.json`, areaDir(L) + 'oo.blind.json') }
    for (const kind of ['candidate', 'live-control']) { const d = {}; for (const k of Object.values(key)) if (k.kind === kind) d[k.letter] = (d[k.letter] ?? 0) + 1; console.log(`  ${L} ${kind.padEnd(13)} n ${Object.values(key).filter(k => k.kind === kind).length} deal ${JSON.stringify(d)}`) }
    if (!B.ooPartMax) console.log(`  ${L}: ${WORK}/oo/${L}/oo.blind.json  ${Object.keys(blind).length} ids  sha ${sha(`${WORK}/oo/${L}/oo.blind.json`).slice(0, 16)}`)
  }
}

function cmdGrade(a) {
  for (const L of areaArg(a)) {
    const frozen = rd(areaDir(L) + 'batch.json'), parts = chunk(frozen, GRADE_PART_MAX)
    if (existsSync(areaDir(L) + 'ws-p1.md')) die(`${L}: with-source renders already exist; made once`)
    parts.forEach((part, pi) => {
      const k = pi + 1, rand = rng(SEED.grade[L] + k)
      let md = `# Items for review (${part.length})\n\nEach item: id, area, target grade and target tier, the question, four options. The correct answer is NOT marked.\n`
      let kd = `# Items for review, KEYED (${part.length})\n\nThe same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.\n`
      const keyj = {}
      part.forEach((it, i) => {
        const d = dealOptions(it, i, rand), opts = d.opts
        keyj[it.id] = { letter: d.letter, choices: opts }
        const head = coldBlock(it, opts); md += head
        kd += head + `\nKEY: ${d.letter} (${it.correct_answer})\n\nWorked solution: ${it.explanation}\n\nKey computation (JS): \`${it.solve}\`\n\nDistractors:\n${opts.filter(o => o !== String(it.correct_answer)).map(o => `- ${'ABCD'[opts.indexOf(o)]} (${o}): ${it.distractor_meta?.[o]?.why ?? ''} | computation: \`${it.distractor_solve?.[o] ?? ''}\``).join('\n')}\n`
      })
      writeFileSync(areaDir(L) + `ws-p${k}.md`, md); writeFileSync(areaDir(L) + `ws-p${k}.keyed.md`, kd); wj(areaDir(L) + `ws-p${k}.key.json`, keyj)
      const slots = Object.values(keyj).reduce((m, x) => (m[x.letter] = (m[x.letter] ?? 0) + 1, m), {})
      console.log(`  ${L} p${k}: ${part.length} items, key letters ${JSON.stringify(slots)}, cold sha ${sha(areaDir(L) + `ws-p${k}.md`).slice(0, 16)}`)
    })
    wj(areaDir(L) + 'ws.parts.json', parts.map((p, i) => ({ part: i + 1, ids: p.map(x => x.id) })))
  }
}

/** batch 2: the batch-1 items as the "earlier items" list beside a grader's or F's render (R11 counts them) */
function writeEarlier(dir) {
  const { text } = earlierBatchIds(); if (!text) return
  writeFileSync(`${dir}/earlier-items.md`, `# Earlier items (batch 1, 221)\n\nFor same_template_as you may also name any id below (an item in this list that your item repeats as the same chain of steps on the same kind of givens to the same asked quantity).\n\n${text}`)
  console.log(`${dir}/earlier-items.md  sha ${sha(dir + '/earlier-items.md').slice(0, 16)}`)
}
/** R11's earlier set: items earlier in the frozen order, plus every batch-1 id in batch 2 */
export const earlierSet = (frozen, i) => new Set([...frozen.slice(0, i).map(x => x.id), ...earlierBatchIds().ids])
export const partsOf = L => rd(areaDir(L) + 'ws.parts.json').map(p => p.part)
function cmdStage(L, k, g, which) {
  if (!B.areas.includes(L) || !partsOf(L).includes(+k) || !['d', 'e'].includes(g) || !['cold', 'keyed'].includes(which)) die(`stage <area> <part> <d|e> <cold|keyed>: ${BATCH} areas are ${B.areas.join(' ')}`)
  const tag = `${L}-p${k}-${g}`, dir = `${WORK}/grade/${tag}`; mkdirSync(dir, { recursive: true })
  if (which === 'cold') { copyFileSync(areaDir(L) + `ws-p${k}.md`, `${dir}/grade.md`); console.log(`${dir}/grade.md  sha ${sha(dir + '/grade.md').slice(0, 16)}`); writeEarlier(dir); return }
  const s1 = `${dir}/stage1.json`, j = rd(s1)
  const want = Object.keys(rd(areaDir(L) + `ws-p${k}.key.json`))
  const miss = want.filter(id => !j[id] || S1_FIELDS.some(f => !(f in j[id])))
  if (miss.length) die(`stage1 incomplete for ${miss.length}: ${miss.slice(0, 6).join(' ')}`)
  mkdirSync(WORK + '/snap', { recursive: true })
  const snap = `${WORK}/snap/${tag}.stage1.json`; copyFileSync(s1, snap); chmodSync(snap, 0o444); chmodSync(s1, 0o444)
  const shas = existsSync(WORK + '/coldshas.json') ? rd(WORK + '/coldshas.json') : {}
  shas[tag] = sha(snap); wj(WORK + '/coldshas.json', shas)
  copyFileSync(areaDir(L) + `ws-p${k}.keyed.md`, `${dir}/keyed.md`)
  console.log(`snapshot ${snap} sha ${shas[tag].slice(0, 16)}; keyed.md released into ${dir}`)
}

export function loadGrader(tag) {
  const snapP = `${WORK}/snap/${tag}.stage1.json`
  return { s1: rd(snapP), s2: rd(`${WORK}/grade/${tag}/stage2.json`), snapSha: sha(snapP) }
}
function cmdColdcheck(L) {
  if (!B.areas.includes(L)) die(`coldcheck <area>: ${BATCH} areas are ${B.areas.join(' ')}`)
  const shas = rd(WORK + '/coldshas.json'); let rows = 0, changed = 0
  for (const k of partsOf(L)) for (const g of ['d', 'e']) {
    const tag = `${L}-p${k}-${g}`, { s1, s2, snapSha } = loadGrader(tag)
    if (snapSha !== shas[tag]) die(`${tag} stage1 snapshot hash changed`)
    if (sha(`${WORK}/grade/${tag}/stage1.json`) !== snapSha) { console.log(`  ${tag} stage1.json in the folder differs from the snapshot`); changed++ }
    rows += Object.keys(s1).filter(x => ID_RE.test(x)).length
    for (const p of coldDiff(s1, s2)) { console.log(`  ${tag} ${p}`); changed++ }
  }
  console.log(`coldcheck ${L}: ${rows} cold rows, ${changed} changed or missing`); if (!rows) process.exit(2); process.exit(changed ? 1 : 0)
}

export function scoreOo(L) {
  const key = rd(areaDir(L) + 'oo.key.json'), ids = Object.keys(key)
  // batch 1: one file per solver; batch 2: one file per solver per part, pooled per area before any rate is computed
  const parts = B.ooPartMax ? rd(areaDir(L) + 'oo.parts.json') : [{ dir: `${WORK}/oo/${L}`, ids }]
  if (B.ooPartMax) { const all = parts.flatMap(p => p.ids); if (all.length !== ids.length || new Set(all).size !== ids.length || !all.every(i => key[i])) die(`${L}: oo parts do not cover the key exactly`); for (const p of parts) if (sha(`${p.dir}/oo.blind.json`) !== p.sha) die(`${p.dir}/oo.blind.json changed since render`) }
  const sol = ['a', 'b', 'c'].map(x => { const m = {}; for (const p of parts) { const j = rd(`${p.dir}/solver-${x}.json`), mm = j.items ?? j; const got = p.ids.filter(i => mm[i]?.pick).length; if (got !== p.ids.length) die(`${L} ${p.dir.split('/').pop()} solver ${x} answered ${got} of ${p.ids.length}`); for (const i of p.ids) m[i] = mm[i] } return m })
  const arm = kind => { const s = ids.filter(i => key[i].kind === kind); let hits = 0, unan = 0; for (const i of s) { const h = sol.filter(m => String(m[i].pick).trim().toUpperCase() === key[i].letter).length; hits += h; if (h === 3) unan++ } return { n: s.length, picks: 3 * s.length, hits, unan } }
  const c = arm('candidate'), k = arm('live-control')
  const dist = {}; for (const i of ids) dist[key[i].letter] = (dist[key[i].letter] ?? 0) + 1
  return { cand: c, ctrl: k, ...ooVerdict(c, k), letterControl: pct(Math.max(...Object.values(dist)), ids.length) }
}
/** H1: the rank of each solver's pick among the option values, on candidates, beside the candidate rank-2 key share */
function solverRankPicks(L) {
  const key = rd(areaDir(L) + 'oo.key.json'), blind = rd(areaDir(L) + 'oo.blind.json')
  const parts = B.ooPartMax ? rd(areaDir(L) + 'oo.parts.json') : [{ dir: `${WORK}/oo/${L}`, ids: Object.keys(key) }]
  const cand = Object.keys(key).filter(i => key[i].kind === 'candidate')
  const h = { 1: 0, 2: 0, 3: 0, 4: 0 }; let picks = 0, keys2 = 0
  for (const i of cand) { const opts = blind[i].options, vals = Object.values(opts); if (rankOf(vals, opts[key[i].letter]) === 2) keys2++ }
  for (const x of ['a', 'b', 'c']) for (const p of parts) { const j = rd(`${p.dir}/solver-${x}.json`), m = j.items ?? j; for (const i of p.ids) if (key[i].kind === 'candidate') { const opts = blind[i].options, r = rankOf(Object.values(opts), opts[String(m[i]?.pick).trim().toUpperCase()]); if (r) { h[r]++; picks++ } } }
  if (!picks) die('H1: no readable candidate pick')
  return { hist: h, picks, pick2: 100 * h[2] / picks, key2: 100 * keys2 / cand.length, line: `candidate picks at rank 1/2/3/4 = ${h[1]}/${h[2]}/${h[3]}/${h[4]} of ${picks} (rank-2 pick rate ${f1(100 * h[2] / picks)}%) vs candidate keys at rank 2 ${keys2}/${cand.length} = ${f1(100 * keys2 / cand.length)}%` }
}

export function loadF(L) {
  const kp = areaDir(L) + 'tb.key.json'
  if (!existsSync(kp)) return null
  const p = `${WORK}/grade/${L}-f-tb/stage1.json`
  if (!existsSync(p)) die('tie-break render exists but grader F has not written stage1.json')
  return { key: rd(kp), rows: rd(p) }
}

function cmdScore(L) {
  if (!B.areas.includes(L)) die(`score <area>: ${BATCH} areas are ${B.areas.join(' ')}`)
  const FZ = areaDir(L) + 'batch.json', frozen = rd(FZ)
  const out = { prereg: PREREG, area: AREAS[L].domain, frozenSha: sha(FZ), n: frozen.length }
  const oo = scoreOo(L); out.optionsOnly = oo
  console.log(`OPTIONS-ONLY ${L} (three samples of one solver; letter control ${f1(oo.letterControl)}%): cand ${oo.cand.hits}/${oo.cand.picks} ctrl ${oo.ctrl.hits}/${oo.ctrl.picks}  ${oo.status.toUpperCase()}  ${oo.why}`)
  if (B.rankRecord) { out.rankH1 = { frozen: rankRecord(frozen), solverPicks: solverRankPicks(L) }; console.log(`H1 frozen ${out.rankH1.frozen.line}\nH1 options-only: ${out.rankH1.solverPicks.line}`); if (B.positionExpect != null) { out.rankH1.h3 = { candidateHitPct: oo.cr, rank2PickPct: out.rankH1.solverPicks.pick2, positionOnlyExpectPct: B.positionExpect }; console.log(`H3 (recorded): candidate hit rate ${f1(oo.cr)}%, rank-2 pick share ${f1(out.rankH1.solverPicks.pick2)}%, vs position-only expectation ${B.positionExpect}%`) } }
  const G = { d: {}, e: {} }
  for (const k of partsOf(L)) for (const g of ['d', 'e']) { const { s2 } = loadGrader(`${L}-p${k}-${g}`); for (const [id, row] of Object.entries(s2)) if (ID_RE.test(id)) G[g][id] = row }
  const missing = frozen.filter(i => !G.d[i.id] || !G.e[i.id]).map(i => i.id); if (missing.length) die(`grader rows missing for ${missing.join(' ')}`)
  const diff = difficultyBars(frozen.map(it => ({ tier: it.tier, grade: it.grade_target, a: G.d[it.id], b: G.e[it.id] })))
  out.gradeFitRecorded = diff
  console.log(`GRADE FIT (recorded, not a bar): too_easy ${diff.tooEasy} = ${f1(diff.tooEasyPct)}%, too_hard ${diff.tooHard} = ${f1(diff.tooHardPct)}% of ${diff.judgments}; offset d ${diff.offA?.toFixed(2)} e ${diff.offB?.toFixed(2)}; tier spread d ${diff.spreadA?.toFixed(2)} e ${diff.spreadB?.toFixed(2)}${diff.status === 'no-measurement' ? ' (no measurement: ' + diff.why + ')' : ''}`)
  out.coldOnKey = frozen.reduce((s, it) => s + ['d', 'e'].filter(g => val(G[g][it.id].my_answer) === val(it.correct_answer) || String(G[g][it.id].my_answer).trim() === String(it.correct_answer)).length, 0)
  const F = loadF(L), items = {}, needs = []
  frozen.forEach((it, i) => {
    const earlier = earlierSet(frozen, i)
    const inTb = F && F.key.items?.[it.id]
    const v = itemVerdict(it, G.d[it.id], G.e[it.id], inTb ? (F.rows[it.id] ?? {}) : undefined, earlier)
    items[it.id] = { ...v, difficulty: bankedDifficulty(G.d[it.id], G.e[it.id]) }
    if (v.need.length && !v.drop.length && !v.hold.length) needs.push({ id: it.id, codes: v.need, named: v.named })
    else if (v.need.length) items[it.id].need = []
    items[it.id].keep = !items[it.id].drop.length && !items[it.id].hold.length && !items[it.id].need.length
  })
  out.items = items
  if (needs.length) {
    if (F) die(`tie-break already ran but ${needs.length} item(s) still need it: ${needs.map(n => n.id).join(' ')}`)
    wj(`${WORK}/tb-needs-${L}.json`, needs)
    console.log(`TIE-BREAK NEEDED ${L} (${needs.length}): ${needs.map(n => `${n.id} [${n.codes.join(', ')}]`).join('; ')}\n  run: map-math-v2.mjs tiebreak ${L}`)
    wj(areaDir(L) + 'stages.json', { ...out, verdict: 'INCOMPLETE' }); process.exit(1)
  }
  const kept = frozen.filter(i => items[i.id].keep)
  const as = areaStatus(kept, oo.status, RL, SEED.cPrime?.[L] ?? null)
  const { inserted: insIt, deferred: defIt, ...asRest } = as
  out.areaResult = { ...asRest, kept: kept.length, keptIds: kept.map(i => i.id), insertedIds: insIt.map(i => i.id), deferredIds: defIt.map(i => i.id) }
  if (defIt.length) {
    wj(areaDir(L) + 'deferred.json', { prereg: PREREG, rule: 'C-prime', seed: SEED.cPrime[L], ...as.cprime, items: defIt.map(it => ({ id: it.id, item: it, stage: { ...items[it.id], graderD: G.d[it.id], graderE: G.e[it.id] } })) })
    console.log(`  C-prime deferred ${defIt.length} (not inserted; eligible for the next MAP maths insert batch): ${defIt.map(i => i.id).join(' ')} -> ${areaDir(L)}deferred.json`)
  }
  const flags = existsSync(areaDir(L) + 'screen-flags.json') ? rd(areaDir(L) + 'screen-flags.json') : {}
  out.screenFlagsRecorded = Object.fromEntries(Object.entries(flags).map(([id, f]) => [id, { ...f, kept: items[id]?.keep ?? null }]))
  for (const it of frozen.filter(i => !items[i.id].keep)) console.log(`  DROP/HOLD ${it.id} g${it.grade_target} ${it.tier}: ${[...items[it.id].drop, ...items[it.id].hold].join('; ')}`)
  for (const it of frozen) if (items[it.id].rec.length) console.log(`  (recorded) ${it.id}: ${items[it.id].rec.join('; ')}`)
  const sf = Object.entries(out.screenFlagsRecorded); if (sf.length) console.log(`  screen-flagged items: ${sf.length}, kept by the graders ${sf.filter(([, f]) => f.kept).length}${sf.filter(([, f]) => f.p2).length ? `; still failing pass 2: ${sf.filter(([, f]) => f.p2).map(([id, f]) => id + (f.kept ? ' (kept)' : '')).join(' ')}` : ''}`)
  console.log(`AREA ${L} ${AREAS[L].key} frozen ${frozen.length} kept ${kept.length}  extremity ${as.extremity.status} (${as.extremity.reason})  oo ${oo.status}  => ${as.status.toUpperCase()}${as.reasons.length ? ' - ' + as.reasons.join('; ') : ''}${as.notes.length ? ' | ' + as.notes.join('; ') : ''}`)
  if (B.rankRecord) { out.rankH1.kept = rankRecord(kept); out.rankH1.inserted = rankRecord(insIt); console.log(`H1 kept ${out.rankH1.kept.line}\nH1 inserted ${out.rankH1.inserted.line}`) }
  out.passIds = as.status === 'pass' ? insIt.map(i => i.id) : []
  out.verdict = out.passIds.length ? 'PASS' : 'HELD'
  console.log(`cold answers on key ${out.coldOnKey}/${2 * frozen.length}; VERDICT ${out.verdict}; insertable ${out.passIds.length} (cohort ${AREAS[L].cohort})`)
  wj(areaDir(L) + 'stages.json', out)
}

function cmdTiebreak(L) {
  if (!B.areas.includes(L)) die(`tiebreak <area>: ${BATCH} areas are ${B.areas.join(' ')}`)
  const needs = rd(`${WORK}/tb-needs-${L}.json`); if (!needs.length) die('no tie-break needs')
  if (existsSync(areaDir(L) + 'tb.key.json')) die('tie-break render already exists; it is made once')
  const frozen = rd(areaDir(L) + 'batch.json')
  const keys = Object.assign({}, ...partsOf(L).map(k => rd(areaDir(L) + `ws-p${k}.key.json`)))
  const ids = new Set(needs.map(n => n.id)); for (const n of needs) if (n.codes.some(c => c.startsWith('R11'))) for (const x of n.named) ids.add(x)
  const part = frozen.filter(i => ids.has(i.id))
  let md = `# Items for review (${part.length})\n\nEach item: id, area, target grade and target tier, the question, four options. The correct answer is NOT marked.\n`
  for (const it of part) md += coldBlock(it, keys[it.id].choices)
  writeFileSync(areaDir(L) + 'tb.md', md)
  wj(areaDir(L) + 'tb.key.json', { items: Object.fromEntries(needs.map(n => [n.id, n.codes])), context: [...ids].filter(x => !needs.find(n => n.id === x)) })
  const dir = `${WORK}/grade/${L}-f-tb`; mkdirSync(dir, { recursive: true }); copyFileSync(areaDir(L) + 'tb.md', dir + '/grade.md'); writeEarlier(dir)
  console.log(`tie-break render ${L}: ${part.length} items (${needs.length} flagged) -> ${dir}/grade.md, sha ${sha(dir + '/grade.md').slice(0, 16)}`)
}


/* ---- insert-prep: survivors-only batch + qc.json + ledger entry for an area whose score verdict is PASS.
 * Everything the verdict rests on is RE-DERIVED here, not read from stages.json: the frozen sha, coldcheck, the
 * options-only verdict from the solver files, the item rules from the grader rows, and the kept-set extremity on the
 * exact file written. The ledger entry is bound to that file's sha256 (gate.mjs refuses any other bytes). No DB write:
 * gateBatch reads the live bank for stem duplicates only. math-bank-helper.mjs has no dry run, so it is NOT run. */
const TIER_TO_DIFF = { low: 'easy', mid: 'medium', high: 'hard' }
export const insertFiles = L => ({ batch: `${D}${B.cohortStem}-${AREAS[L].key}.inserted.batch.json`, qc: `${D}${B.cohortStem}-${AREAS[L].key}.qc.json` })
export function toInsertRow(it, choices) {
  if (!choices || new Set(choices).size !== 4 || !choices.includes(String(it.correct_answer))) die(`${it.id}: rendered choices do not hold the key`)
  return {
    id: it.id, domain: it.domain, subskill: it.subskill, difficulty: TIER_TO_DIFF[it.tier], topic_tag: it.ccss,
    prompt: it.prompt, choices, correct_answer: String(it.correct_answer), explanation: it.explanation, solve: it.solve,
    graphic: it.graphic ?? null, grade_target: it.grade_target, tier: it.tier, rit_band: it.rit_band, ccss: it.ccss,
    area_25: it.area_25 ?? null, map_area: it.map_area,
    distractor_steps: choices.filter(c => c !== String(it.correct_answer)).map(c => ({ choice: c, mis_step: it.distractor_meta?.[c]?.why ?? '' })),
    distractor_solve: it.distractor_solve,
  }
}
function ledgerInsert(entry) {
  const LP = D + 'ledger.json', text = readFileSync(LP, 'utf8'), before = JSON.parse(text)
  const prior = (before.batches ?? []).find(b => b.id === entry.id || b.contentSha === entry.contentSha)
  if (prior) { if (prior.contentSha === entry.contentSha && prior.cohort === entry.cohort) { console.log(`ledger: ${prior.id} already records this file (same sha, cohort ${prior.cohort}); unchanged`); return false } die(`ledger already holds ${prior.id} (sha ${String(prior.contentSha).slice(0, 12)}); refusing to add ${entry.id} at ${entry.contentSha.slice(0, 12)}`) }
  const start = text.indexOf('"batches": ['); if (start < 0) die('ledger: no batches array')
  let i = text.indexOf('[', start), depth = 0, inStr = false, esc = false, end = -1
  for (; i < text.length; i++) { const c = text[i]; if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue } if (c === '"') inStr = true; else if (c === '[' || c === '{') depth++; else if (c === ']' || c === '}') { depth--; if (depth === 0) { end = i; break } } }
  if (end < 0) die('ledger: unterminated batches array')
  let k = end - 1; while (/\s/.test(text[k])) k--
  const body = JSON.stringify(entry, null, 2).split('\n').map(l => '    ' + l).join('\n')
  const now = new Date().toISOString()
  const out = (text.slice(0, k + 1) + ',\n' + body + text.slice(k + 1)).replace(/"generatedAt": "[^"]*"/, `"generatedAt": "${now}"`)
  const after = JSON.parse(out)
  if (!utilMod.isDeepStrictEqual(after, { ...before, generatedAt: now, batches: [...before.batches, entry] })) die('ledger: the text insert does not equal the ledger plus this entry')
  writeFileSync(LP, out); return true
}

async function cmdInsertPrep(L) {
  if (!B.areas.includes(L)) die(`insert-prep <area>: ${BATCH} areas are ${B.areas.join(' ')}`)
  const A = AREAS[L], FZ = areaDir(L) + 'batch.json', frozen = rd(FZ), st = rd(areaDir(L) + 'stages.json')
  if (st.verdict !== 'PASS') die(`${L}: score verdict is ${st.verdict}, not PASS`, 1)
  if (st.frozenSha !== sha(FZ)) die(`${L}: frozen batch changed since score`)
  // coldcheck, re-run
  const shas = rd(WORK + '/coldshas.json'); let rows = 0
  for (const k of partsOf(L)) for (const g of ['d', 'e']) { const tag = `${L}-p${k}-${g}`, { s1, s2, snapSha } = loadGrader(tag); if (snapSha !== shas[tag] || sha(`${WORK}/grade/${tag}/stage1.json`) !== snapSha) die(`${tag}: stage-1 snapshot or folder hash changed`); const p = coldDiff(s1, s2); if (p.length) die(`${tag}: coldcheck ${p.length} problem(s), e.g. ${p[0]}`); rows += Object.keys(s1).filter(x => ID_RE.test(x)).length }
  // options-only and item rules, re-derived
  const oo = scoreOo(L)
  if (oo.status !== 'pass' || oo.status !== st.optionsOnly.status) die(`${L}: options-only re-derived ${oo.status}, stages.json says ${st.optionsOnly.status}`)
  const G = { d: {}, e: {} }; for (const k of partsOf(L)) for (const g of ['d', 'e']) { const { s2 } = loadGrader(`${L}-p${k}-${g}`); for (const [id, row] of Object.entries(s2)) if (ID_RE.test(id)) G[g][id] = row }
  const F = loadF(L), keepIds = [], dropped = []
  frozen.forEach((it, i) => { const inTb = F && F.key.items?.[it.id]; const v = itemVerdict(it, G.d[it.id], G.e[it.id], inTb ? (F.rows[it.id] ?? {}) : undefined, earlierSet(frozen, i)); if (v.need.length && !v.drop.length && !v.hold.length) die(`${it.id} still needs the tie-break`); if (v.keep) keepIds.push(it.id); else dropped.push(`${it.id} (${[...v.drop, ...v.hold].join('; ')})`) })
  const keptItems = frozen.filter(i => keepIds.includes(i.id))
  const as = areaStatus(keptItems, oo.status, RL, SEED.cPrime?.[L] ?? null)
  if (as.status !== 'pass') die(`${L}: re-derived area status ${as.status}: ${as.reasons.join('; ')}`, 1)
  const insIds = as.inserted.map(i => i.id), defIds = as.deferred.map(i => i.id)
  if (insIds.join() !== st.passIds.join()) die(`${L}: re-derived inserted set [${insIds.join(' ')}] != stages.json passIds [${st.passIds.join(' ')}]`)
  if (defIds.length) { const dj = rd(areaDir(L) + 'deferred.json'); if (dj.items.map(x => x.id).join() !== defIds.join()) die(`${L}: deferred.json does not match the re-derived C-prime draw`) }
  const survivors = as.inserted
  // math-check on the survivors as frozen (full author fields)
  mkdirSync(WORK + '/tmp', { recursive: true })
  const by = {}; for (const it of survivors) (by[it.id.split('-')[1]] ??= []).push(it)
  const files = Object.entries(by).map(([a, xs]) => { const p = `${WORK}/tmp/insert-${a}.json`; wj(p, xs); return p })
  const checked = await checkAll(files, 'insert-prep survivors')
  if (checked !== survivors.length) die(`math-check read ${checked} of ${survivors.length}`)
  // survivors-only batch in the with-source render's option order (as v5), and qc keyed by id
  const keys = Object.assign({}, ...partsOf(L).map(k => rd(areaDir(L) + `ws-p${k}.key.json`)))
  const batch = survivors.map(it => toInsertRow(it, keys[it.id]?.choices))
  const qc = Object.fromEntries(survivors.map(it => [it.id, { difficulty: bankedDifficulty(G.d[it.id], G.e[it.id]), source: 'two with-source graders tier_assigned (bankedDifficulty, as v5)' }]))
  const out = insertFiles(L)
  const text = JSON.stringify(batch, null, 1) + '\n'
  if (existsSync(out.batch) && readFileSync(out.batch, 'utf8') !== text) die(`${out.batch} exists with different bytes; refusing to overwrite a file a ledger entry may be bound to`)
  writeFileSync(out.batch, text); wj(out.qc, qc)
  const bsha = sha(out.batch)
  // sandbox on the exact file (math-bank-helper verify: no DB)
  const v = await new Promise(res => { const p = spawn('node', [D + 'math-bank-helper.mjs', 'verify', out.batch], { cwd: ROOT }); let o = ''; p.stdout.on('data', d => { o += d }); p.stderr.on('data', d => { o += d }); p.on('close', code => res({ code, o })) })
  const sb = v.o.match(/Sandbox: (\d+)\/(\d+)/)
  if (v.code !== 0 || !sb || sb[1] !== sb[2] || +sb[2] !== batch.length) die(`math-bank-helper verify on ${out.batch}: exit ${v.code}; ${v.o.split('\n').filter(l => /Sandbox|FAIL|mismatch|Distractors/.test(l)).join(' | ')}`)
  const distr = (v.o.split('\n').find(l => /Distractors:/.test(l)) ?? '').trim()
  const kx = keyExtremityVerdict(batch)
  if (kx.status === 'fail') die(`kept-set key extremity on ${out.batch}: ${kx.reason}`)
  // screen history for this area
  const p1 = rd(WORK + '/screen-p1.json'), p2 = existsSync(WORK + '/screen-p2.json') ? rd(WORK + '/screen-p2.json') : { fails: {} }
  const inA = id => ID_RE.exec(id)?.[1] === L
  const assembledN = rd(WORK + '/assembled.json').filter(i => inA(i.id)).length
  const p1f = Object.keys(p1.fails).filter(inA), p2f = Object.keys(p2.fails).filter(inA)
  const wd = existsSync(WORK + '/returns/withdrawn.json') ? Object.keys(rd(WORK + '/returns/withdrawn.json')).filter(inA) : []
  const standN = existsSync(WORK + '/returns/stand.json') ? Object.keys(rd(WORK + '/returns/stand.json')).filter(inA).length : 0
  const revN = p1f.filter(id => existsSync(`${WORK}/returns/${id}.json`)).length
  const ookey = rd(areaDir(L) + 'oo.key.json'), subst = Object.values(ookey).filter(k => k.kind === 'live-control' && k.drawnFrom && k.drawnFrom !== k.cell).length
  const fd = st.gradeFitRecorded ?? {}
  const diffs = ['easy', 'medium', 'hard'].map(d => `${d} ${Object.values(qc).filter(q => q.difficulty === d).length}`).join(' / ')
  const letters = {}; for (const b of batch) { const l = 'ABCD'[b.choices.indexOf(b.correct_answer)]; letters[l] = (letters[l] ?? 0) + 1 }
  const tbN = F ? Object.keys(F.key.items ?? {}).length : 0
  const now = new Date(), today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`   // local date (KST), not UTC
  const entry = {
    id: `${A.cohort}-${today}`, createdAt: today, targetTest: 'map', section: 'math', task: 'multiple_choice', family: 'mc_stem_source',
    cohort: A.cohort, contentSha: bsha, status: 'qc',
    note: `${B.name}, ${A.domain} (${PREREG}; MAP-PLAN-2026-10-23 §3.1). Assembled ${assembledN} from ${A.authors.filter(a => existsSync(`${AUTHORED}/${a}/items.json`)).join(' + ')}; frozen ${frozen.length} as this area's own batch (sha ${st.frozenSha.slice(0, 16)}); ${keepIds.length} kept by the graders${defIds.length ? `, ${defIds.length} deferred by C-prime (seed ${SEED.cPrime[L]}; ${defIds.join(' ')})` : ''}; ${survivors.length} in this file. contentSha = sha256 of ${out.batch.replace(ROOT + '/', '')}; qc ${out.qc.replace(ROOT + '/', '')}. Written by map-math-v2.mjs insert-prep, which re-derives every verdict from the reviewer files. Not inserted when recorded.`,
    stages: {
      shape: { passed: true, contentSha: bsha, n: batch.length, verdict: `Stage 0: ${assembledN}/${assembledN} PART OK at assemble (math-check: sandbox key + every distractor, slot, LONE, bound screen, misconceptions, mf27-mf30 construction checks, near-dup vs live ISEE/SSAT and every earlier MAP item${L === 'N' ? ', FORM and SLIP refusing' : ''}). Cold screen pass 1: ${p1f.length} of ${assembledN} failed, returned once (revised ${revN}, withdrawn ${wd.length}, stood ${standN}); pass 2: ${p2f.length} still failed, recorded and not dropped (the screen never drops on one screener). Frozen ${frozen.length}, no per-area minimum. Survivors: math-check ${checked}/${survivors.length} PART OK; math-bank-helper verify on this file Sandbox ${sb[1]}/${sb[2]}; ${distr}.` },
      nosource: { passed: true, contentSha: bsha, n: oo.cand.n, candidatePct: +f1(oo.cr), control: +f1(oo.kr), controlN: oo.ctrl.n, margin: +f1(oo.margin), verdict: `Options-only, three samples of one Claude solver, ${oo.cand.n} frozen candidates vs ${oo.ctrl.n} live ISEE ${A.key} controls matched 1:1 by tier (low->easy, mid/high->medium${subst ? `; ${subst} control row(s) drawn one difficulty up under the pre-registered substitution` : ''}), blind sha ${sha(areaDir(L) + 'oo.blind.json').slice(0, 16)}: ${oo.cand.hits}/${oo.cand.picks} = ${f1(oo.cr)}% vs ${oo.ctrl.hits}/${oo.ctrl.picks} = ${f1(oo.kr)}%, margin ${f1(oo.margin)} (bar +10; control under the 90% ceiling); unanimous-correct rate ${f1(oo.cu)}% vs ${f1(oo.ku)}% (${f1(oo.umar)}, bar +15; batch level only). Measures whether the option set alone decides an item; the stem-visible half is the graders'.` },
      withsource: { passed: true, contentSha: bsha, n: frozen.length, coldOnKey: st.coldOnKey, kept: keepIds.length, verdict: `Two Claude graders per part (${partsOf(L).length} part(s)), cold then keyed, private folders; stage 1 snapshotted, hashed, chmod 444 before keyed.md; coldcheck re-run here ${rows} cold rows, 0 changed. ${st.coldOnKey}/${2 * frozen.length} cold answers on key. Free elimination (R4 >= 2 struck, R5 key identifiable), exclusivity (R2), plug-back, option pair, one-sided / single bound and template rules: both graders -> drop, one -> tie-break grader F (${tbN} item(s) to F, 2 of 3, tie -> drop). Dropped ${dropped.length}: ${dropped.join('; ') || 'none'}. Grade fit recorded, not a drop rule: too_easy ${fd.tooEasy}/${fd.judgments}, too_hard ${fd.tooHard}/${fd.judgments}, offsets ${fd.offA?.toFixed(2)}/${fd.offB?.toFixed(2)}, tier spreads ${fd.spreadA?.toFixed(2)}/${fd.spreadB?.toFixed(2)}.` },
      tells: { passed: true, contentSha: bsha, cExtremity: kx.status === 'no-measurement' ? 'not-measured' : kx.status, verdict: `${as.cprime ? `C-prime: ${as.cprime.why}; deferred items are not in this file. ` : ''}Key at an extreme on this file: ${kx.reason} (${kx.status === 'no-measurement' ? 'C and C-prime NOT MEASURED below 10 scorable items: recorded, neither a pass nor a fail; C-prime did not fire' : kx.status}). Key letters in this file (with-source deal) ${JSON.stringify(letters)}. Banked difficulty (graders' tier_assigned) ${diffs}. Unanimity compared to the control at batch level only. Screen-flagged survivors: ${keepIds.filter(id => st.screenFlagsRecorded?.[id]).length}.` },
    },
  }
  const wrote = ledgerInsert(entry)
  console.log(`survivors ${batch.length} -> ${out.batch}\n  sha256 ${bsha}\nqc ${Object.keys(qc).length} rows -> ${out.qc} (${diffs})\nledger ${wrote ? 'entry added' : 'unchanged'}: ${entry.id}`)
  const { gateBatch } = await import('./gate.mjs')
  const g = gateBatch({ task: 'multiple_choice', family: 'map', section: 'math', itemFiles: [out.batch] })
  console.log(`gateBatch (read-only): ${g.canInsert ? 'PASS' : 'REFUSED'} - family ${g.family}, ledger ${g.batch ?? 'none'} - ${g.reason}`)
  const band = Object.values(qc).some(q => q.difficulty === 'easy') ? 'BANK_BAND=mixed ' : ''
  console.log(`\nInsert command (NOT run: math-bank-helper.mjs has no dry run; insert writes on a gate pass${band ? '; BANK_BAND=mixed because easy items would otherwise be rejected' : ''}):\n  ${band}BANK_FAMILY=map BANK_COHORT=${A.cohort} node scripts/study-bank/math-bank-helper.mjs insert ${out.batch.replace(ROOT + '/', '')} ${out.qc.replace(ROOT + '/', '')}`)
  if (!g.canInsert) process.exit(1)
}

const cmd = process.argv[2]
const isMain = import.meta.url === `file://${process.argv[1]}`
async function main() {
  const a = process.argv.slice(3)
  if (cmd === '--selftest') return selftest()
  if (cmd === 'assemble') return cmdAssemble()
  if (cmd === 'oo-pool') return cmdOoPool()
  if (cmd === 'screen-render') return cmdScreenRender(a[0])
  if (cmd === 'screen-score') return cmdScreenScore(a[0])
  if (cmd === 'freeze') return cmdFreeze()
  if (cmd === 'oo') return cmdOo(a[0])
  if (cmd === 'grade') return cmdGrade(a[0])
  if (cmd === 'stage') return cmdStage(a[0], a[1], a[2], a[3])
  if (cmd === 'coldcheck') return cmdColdcheck(a[0])
  if (cmd === 'score') return cmdScore(a[0])
  if (cmd === 'tiebreak') return cmdTiebreak(a[0])
  if (cmd === 'insert-prep') return cmdInsertPrep(a[0])
  die('usage: see the header of map-math-v2.mjs')
}
if (isMain) await main()
