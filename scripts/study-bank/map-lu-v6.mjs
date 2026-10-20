#!/usr/bin/env node
/**
 * map-lu-v6.mjs — toolchain for map-lu-v6 (grades 5-8 MAP Language Usage: Spelling only, SENTENCE format).
 * Bars: MAP-LU-V6.prereg.md, committed before any item existed. Refuses (exit 2) on input it cannot read;
 * exits 1 on a failed bar. Denominators print before verdicts. Run from the repo root.
 *
 * v5's toolchain (map-lu-v5.mjs) with ONE structural change, from MAP-LU-V5-RESULT.md: v5 balanced the seeded key
 * length ranks over the 28 items EXPECTED to freeze; ten drops changed which 28 froze and the pick came out 8/8/7/5,
 * so E3 (key uniquely longest <= 25%) fired at its margin. v6 BALANCES THE PICK, NOT THE PLAN:
 *   - 16 authored per grade (64), each key length rank exactly 4 times per grade.
 *   - The freeze fills a fixed grade x rank QUOTA: every grade 7 (two of three ranks... see cellQuota), every rank
 *     exactly 7 of the 28, first survivors in id order within each cell. A short cell fails Stage 0.
 *   - The one seeded re-draw (pre-flight T2 / T2-L) re-draws WITHIN cells, so it keeps the quota.
 * Everything else is v5's: no rewrite, union-NO teacher gate, strict screen, the item checks, T2, T2-L, E3, bars.
 *
 *   spell <word...>            dictionary oracle (author aid)
 *   itemchecks <file>          exact per-item checks only (author aid; no batch statistics)
 *   assign                     seeded key length ranks -> W/lrank.json
 *   select-control             the 24-item matched live control (read-only DB) -> W/control.json
 *   checks <batch.json>        exact item checks + batch checks (distinct words, T2, T2-L, E3)
 *   preflight                  T2 + T2-L on the authored batch and its likely-frozen subset (report only)
 *   teacher-input | teacher-merge      teacher gate: union NO -> dropped (W/teacher.drops.json)
 *   screen-input               W/screen.words.json
 *   freeze                     teacher drops, exact drops, SCREEN, quotas, pre-flight + one re-draw, Stage 0
 *   render | score | build | insert [--commit]
 *   --selftest                 break-test every new rule and every bar at its margin
 *
 * W = $MLV6_W or scripts/study-bank/map-lu-v6/
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const ROOT = process.cwd()
const SB = ROOT + '/scripts/study-bank/'
const V2 = await import(SB + 'map-lu-v2.mjs')
const V3 = await import(SB + 'map-lu-v3.mjs')
const V4 = await import(SB + 'map-lu-v4.mjs')
const { rng, nsspell, variantHit, misspellingOk, structural: structuralV2, dupFails, t2, wsItem, bars, strandOf, passBar, easierMax, harderLt } = V2
const { pooledE3, e3Counts, testedWord, fmtGroup, dealFlat, slotCheck } = V3
const { t2L } = V4
const { periodicity } = await import(SB + 'map-pilot-2-checks.mjs')

const W = (process.env.MLV6_W || 'scripts/study-bank/map-lu-v6/').replace(/\/?$/, '/')
const SL = ['A', 'B', 'C', 'D']
export const COHORT = 'map-lu-v6-spelling'
export const GRADES = [5, 6, 7, 8]
export const PER_GRADE = 16, FREEZE_PER_GRADE = 7
export const N_FROZEN = GRADES.length * FREEZE_PER_GRADE        // 28
export const idOf = (g, j) => `MLV6-S${String(GRADES.indexOf(g) * PER_GRADE + j + 1).padStart(2, '0')}`
export const ALL_IDS = GRADES.flatMap(g => Array.from({ length: PER_GRADE }, (_, j) => idOf(g, j)))
const idNum = id => +String(id).match(/(\d+)$/)[1]
const gradeOfId = id => GRADES[Math.floor((idNum(id) - 1) / PER_GRADE)]

const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${p} is not JSON: ${e.message}`) } }
const wr = (p, o) => { mkdirSync(W, { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 1) + '\n') }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const seedOf = s => parseInt(createHash('sha256').update(s).digest('hex').slice(0, 8), 16)
const shuffleWith = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const fmtT = r => `n=${r.n} control ${(100 * r.control).toFixed(1)}% | ${r.nH ? r.nH + ' heuristics | ' : ''}min-p ${r.best} ${(100 * r.bestScore).toFixed(1)}% raw p ${r.rawP.toFixed(4)} fw p ${r.fwP.toFixed(4)} -> ${r.fires ? 'FIRES' : 'clear'}`

// ---------- key length ranks (L-rank), seeded; the freeze quota by grade x rank ----------
/** each rank exactly 4 times within each grade (16 = 4 x 4), seeded order within the grade. */
export function assignRanks(seedStr = 'map-lu-v6-lrank') {
  const r = rng(seedOf(seedStr)), out = {}
  GRADES.forEach(g => {
    const ids = Array.from({ length: PER_GRADE }, (_, j) => idOf(g, j))
    const rk = shuffleWith([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4], r)
    ids.forEach((id, k) => (out[id] = rk[k]))
  })
  return Object.fromEntries(ALL_IDS.map(id => [id, out[id]]))
}
/** freeze quota: each grade takes 2 of each rank except ONE rank it takes once (a different one per grade, seeded),
 *  so every grade freezes 7 and every rank freezes exactly 7 of 28 -> key uniquely longest = 7/28 = 25% at most. */
export function cellQuota(seedStr = 'map-lu-v6-quota') {
  const single = shuffleWith([1, 2, 3, 4], rng(seedOf(seedStr)))
  return Object.fromEntries(GRADES.map((g, gi) => [g, Object.fromEntries([1, 2, 3, 4].map(k => [k, k === single[gi] ? 1 : 2]))]))
}
let RANKS = null
const ranks = () => (RANKS ??= existsSync(W + 'lrank.json') ? JSON.parse(readFileSync(W + 'lrank.json', 'utf8')).ranks : {})

// ---------- exact item checks ----------
export function structural(it) {
  const r = structuralV2(it)
  if (strandOf(it) !== 'spell') r.errs.push(`map-lu-v6 is Spelling only (got ${it.map_strand})`)
  if (it.spelling_format !== 'sentence') r.errs.push('map-lu-v6 is sentence-format only')
  if (!GRADES.includes(it.grade_target)) r.errs.push(`grade_target ${it.grade_target} not in 5-8`)
  if (ALL_IDS.includes(it.id) && gradeOfId(it.id) !== it.grade_target) r.errs.push(`id ${it.id} belongs to grade ${gradeOfId(it.id)}, item says ${it.grade_target}`)
  if (![1, 2, 3, 4].includes(it.key_length_rank)) r.errs.push('L-rank key_length_rank (1-4, assigned) missing')
  // v6: author 1 (grades 5-6) uses target words a-m, author 2 (grades 7-8) n-z: no cross-author clash by construction
  if (ALL_IDS.includes(it.id)) {
    const lo = gradeOfId(it.id) <= 6, tw = Object.values(it.targets ?? {}).map(w => String(w).toLowerCase())
    if (tw.length !== 4) r.errs.push('targets must name the four target words')
    for (const w of tw) if (!(lo ? /^[a-m]/ : /^[n-z]/).test(w)) r.errs.push(`target word "${w}" must start with ${lo ? 'a-m (grades 5-6)' : 'n-z (grades 7-8)'}`)
  }
  const R = ranks()[it.id]
  if (R && it.key_length_rank !== R) r.errs.push(`L-rank ${it.key_length_rank} is not the assigned ${R}`)
  return r
}

/** distinct tested words, T2 and T2-L. */
export function batchChecks(items, o = {}) {
  const errs = []
  const tested = items.map(testedWord)
  if (new Set(tested).size !== tested.length) errs.push('a tested spelling word repeats')
  const words = c => String(c).toLowerCase().replace(/[^a-z'\s-]/g, ' ').replace(/'s\b/g, '').split(/[\s-]+/).filter(Boolean)
  items.forEach((it, a) => items.forEach((x, b) => { if (a !== b && x.choices.some(c => words(c).includes(tested[a]))) errs.push(`tested word "${tested[a]}" (${it.id}) appears in ${x.id}`) }))
  const fam = { T2: t2(items, o), T2L: t2L(items, o) }
  for (const [nm, T] of Object.entries(fam)) if (T.fires) errs.push(`${nm} ${T.best} predicts the key: ${(100 * T.bestScore).toFixed(1)}% vs control ${(100 * T.control).toFixed(1)}%, family-wise p ${T.fwP.toFixed(4)}`)
  const e = e3Counts(items)
  return { errs, n: items.length, longest: e.longest, shortest: e.shortest, fam }
}

// ---------- v5's gates, unchanged: teacher drop, strict screen ----------
/** union NO: any wrong option rated "no" by either rater drops the item (no rewrite in v5). */
export function teacherDrops(items, ta, tb) {
  const drops = {}, missing = []
  let n = 0, noA = 0, noB = 0
  for (const it of items) {
    const ra = ta?.[it.id]?.distractors, rb = tb?.[it.id]?.distractors
    if (ra?.length !== 3 || rb?.length !== 3) { missing.push(it.id); continue }
    const why = []
    for (const opt of it.choices.filter(c => c !== it.correct_answer)) {
      n++
      const a = ra.find(d => d.option === opt), b = rb.find(d => d.option === opt)
      if (!a || !b) { missing.push(`${it.id}:"${String(opt).slice(0, 30)}"`); continue }
      if (a.would_pick !== 'yes') noA++
      if (b.would_pick !== 'yes') noB++
      if (a.would_pick !== 'yes' || b.would_pick !== 'yes') why.push(String(opt).slice(0, 60))
    }
    if (why.length) drops[it.id] = `teacher: no student would pick ${why.length} option(s): ${why.join(' | ')}`
  }
  return { drops, n, noA, noB, error: missing.length ? `teacher ratings missing for ${missing.join(', ')}` : null }
}
/** v5: EITHER screener below target drops (v3/v4 needed both). */
export function screenDropsStrict(items, A, B) {
  const drops = {}, missing = []
  for (const it of items) {
    const w = testedWord(it), a = A?.[w]?.grade, b = B?.[w]?.grade
    if (!Number.isFinite(+a) || !Number.isFinite(+b) || a === null || b === null) { missing.push(w); continue }
    if (+a < it.grade_target || +b < it.grade_target) drops[it.id] = `screen: "${w}" graded ${a} and ${b}, target ${it.grade_target}`
  }
  return { drops, error: missing.length ? `screen has no grade from both screeners for: ${missing.join(', ')}` : null }
}

// ---------- freeze pick by cell and the one seeded re-draw (within cells) ----------
const rankOf = it => it.key_length_rank
/** first survivors in id order within each (grade, rank) cell up to the quota; short = cells that cannot fill. */
export function cellPick(pool, quota = cellQuota(), order = null) {
  const pick = [], short = []
  for (const g of GRADES) for (const k of [1, 2, 3, 4]) {
    let cell = pool.filter(i => i.grade_target === g && rankOf(i) === k).sort((a, b) => idNum(a.id) - idNum(b.id))
    if (order) cell = order(cell)
    const q = quota[g][k]
    if (cell.length < q) short.push(`g${g} rank ${k}: ${cell.length} of ${q}`)
    pick.push(...cell.slice(0, q))
  }
  return { pick: pick.sort((a, b) => idNum(a.id) - idNum(b.id)), short }
}
export const firstPick = pool => cellPick(pool).pick
export function redraw(pool, seedStr = 'map-lu-v6-redraw') {
  const r = rng(seedOf(seedStr))
  return cellPick(pool, cellQuota(), cell => shuffleWith(cell.slice(), r)).pick
}
export function preflightDecide(pool, check, seedStr) {
  const first = firstPick(pool), e1 = check(first)
  if (!e1.length) return { pick: first, which: 'first', errsFirst: e1 }
  const second = redraw(pool, seedStr), e2 = check(second)
  return { pick: second, which: e2.length ? 'fail' : 'redraw', errsFirst: e1, errsSecond: e2 }
}

/** authored -> teacher drops -> exact-check drops (incl. duplicate tested words) -> survivors. */
function pipeline() {
  const authored = rd(W + 'batch.authored.json')
  const td = existsSync(W + 'teacher.drops.json') ? rd(W + 'teacher.drops.json') : die('teacher.drops.json missing (run teacher-merge)')
  const after = authored.filter(i => !td[i.id])
  const dups = dupFails(after)
  const errsOf = i => [...structural(i).errs, ...(dups[i.id] ? [dups[i.id]] : [])]
  return { authored, teacherDropped: td, after, errsOf, exactFail: after.filter(i => errsOf(i).length), survivors: after.filter(i => !errsOf(i).length) }
}

// ---------- selftest ----------
async function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  const z = (n, v) => Array(n).fill(v)
  expect(N_FROZEN === 28 && ALL_IDS.length === 64 && ALL_IDS[0] === 'MLV6-S01' && ALL_IDS[63] === 'MLV6-S64', 'sizes: 64 authored (16 per grade), 28 frozen (7 per grade)')
  expect(passBar(28) === 23 && passBar(28) >= 20, `pilot-pass bar ${passBar(28)}/28 is at or above the owner's ~20`)
  // bars at n = 28 (v2's bars, imported)
  const n = 28, base = { n, pass: n, easier: 0, harder: 0, diffs: { a: z(n, 0), b: z(n, 0) }, candPct: 90, ctlPct: 70 }
  const pb = passBar(n), em = easierMax(n), hl = Math.ceil(harderLt(n))
  expect(bars({ ...base, pass: pb }).b && !bars({ ...base, pass: pb - 1 }).b, `S1-b: ${pb} passes, ${pb - 1} fails`)
  expect(bars({ ...base, easier: em }).c && !bars({ ...base, easier: em + 1 }).c, `S1-c: easier ${em}/${2 * n} passes, ${em + 1} fails`)
  expect(bars({ ...base, harder: hl - 1 }).c && !bars({ ...base, harder: hl }).c, `S1-c: harder ${hl - 1}/${2 * n} passes, ${hl} fails`)
  expect(bars({ ...base, diffs: { a: [...z(14, -1), ...z(14, 0)], b: z(n, 0) } }).d && !bars({ ...base, diffs: { a: z(n, 0), b: [...z(15, 1), ...z(13, 0)] } }).d, 'S1-d: mean -0.50 passes, +0.54 fails')
  expect(bars({ ...base, candPct: 90, ctlPct: 100 }).oo && !bars({ ...base, candPct: 89.9, ctlPct: 100 }).oo, 'S2 ceiling: at a 100% control the bar is 90, attainable both ways')
  expect(!bars({ ...base, candPct: 100, ctlPct: 24.9 }).oo, 'S2: a control below 25% is INVALID and cannot pass')
  // L-rank assignment and the quota
  const A1 = assignRanks(), A2 = assignRanks()
  expect(JSON.stringify(A1) === JSON.stringify(A2) && GRADES.every(g => [1, 2, 3, 4].every(k => ALL_IDS.filter(id => gradeOfId(id) === g && A1[id] === k).length === 4)), 'L-rank: seeded, each rank exactly 4 times in every grade')
  const Q = cellQuota()
  expect(GRADES.every(g => Object.values(Q[g]).reduce((a, b) => a + b, 0) === 7) && [1, 2, 3, 4].every(k => GRADES.reduce((a, g) => a + Q[g][k], 0) === 7), 'quota: every grade 7, every rank exactly 7 of 28')
  if (existsSync(W + 'lrank.json')) expect(JSON.stringify(rd(W + 'lrank.json').ranks) === JSON.stringify(A1), 'lrank.json reproduces from its seed')
  // structural: v6 refuses word format, other strands, wrong grade for the id, wrong rank
  const s0 = { id: 'MLV6-S01', map_strand: 'Spelling', spelling_format: 'sentence', grade_target: 5, key_length_rank: A1['MLV6-S01'], choices: ['a', 'b', 'c', 'd'], correct_answer: 'a' }
  expect(structural({ ...s0, spelling_format: 'word' }).errs.some(e => /sentence-format only/.test(e)), 'a word-format item fails v6')
  expect(structural({ ...s0, map_strand: 'Capitalization' }).errs.some(e => /Spelling only/.test(e)), 'a non-Spelling item fails v6')
  expect(structural({ ...s0, grade_target: 6 }).errs.some(e => /belongs to grade 5/.test(e)), 'an id carrying the wrong grade fails')
  const tg = ws => ({ ...s0, targets: Object.fromEntries(ws.map((w, i) => ['s' + i, w])) })
  expect(!structural(tg(['glisten', 'cinnamon', 'leisure', 'mischief'])).errs.some(e => /must start with/.test(e)) && structural(tg(['glisten', 'cinnamon', 'leisure', 'nuisance'])).errs.some(e => /must start with a-m/.test(e)), 'grades 5-6 target words a-m: m passes, n fails')
  const s33 = { ...s0, id: 'MLV6-S33', grade_target: 7, targets: { a: 'nuisance', b: 'rhythmic', c: 'zealous', d: 'occurrence' } }
  expect(!structural(s33).errs.some(e => /must start with/.test(e)) && structural({ ...s33, targets: { ...s33.targets, d: 'mischievous' } }).errs.some(e => /must start with n-z/.test(e)), 'grades 7-8 target words n-z: n passes, m fails')
  expect(structural({ ...s0, key_length_rank: (A1['MLV6-S01'] % 4) + 1 }).errs.some(e => /not the assigned/.test(e)) || !existsSync(W + 'lrank.json'), 'a rank other than the assigned one fails (once lrank.json exists)')
  // teacher gate: union NO drops, a complete YES keeps, a missing rating refuses
  const it = { id: 'X1', choices: ['k', 'p', 'q', 'r'], correct_answer: 'k' }
  const yes = { X1: { distractors: ['p', 'q', 'r'].map(o => ({ option: o, would_pick: 'yes' })) } }
  const oneNo = { X1: { distractors: ['p', 'q', 'r'].map(o => ({ option: o, would_pick: o === 'q' ? 'no' : 'yes' })) } }
  expect(!teacherDrops([it], yes, yes).drops.X1, 'teacher: all yes from both raters keeps the item')
  expect(!!teacherDrops([it], yes, oneNo).drops.X1 && !!teacherDrops([it], oneNo, yes).drops.X1, 'teacher: ONE no from EITHER rater drops the item (no rewrite)')
  expect(!!teacherDrops([it], yes, {}).error, 'teacher: a missing rating is an error, not a keep')
  // strict screen: either below drops; both at target keeps; missing is an error
  const sw = { id: 'Y1', map_strand: 'Spelling', spelling_format: 'sentence', intended_word: 'glisten', grade_target: 6, choices: [] }
  expect(!screenDropsStrict([sw], { glisten: { grade: 6 } }, { glisten: { grade: 7 } }).drops.Y1, 'screen: both at or above target keeps')
  expect(!!screenDropsStrict([sw], { glisten: { grade: 5 } }, { glisten: { grade: 7 } }).drops.Y1, 'screen (v5): ONE screener below target drops (v3/v4 needed both)')
  expect(!!screenDropsStrict([sw], { glisten: { grade: 6 } }, {}).error, 'screen: a missing grade is an error')
  // the cell pick, the re-draw within cells, and v5's failure replayed
  const pool = ALL_IDS.map(id => ({ id, grade_target: gradeOfId(id), key_length_rank: A1[id], tag: (idNum(id) - 1) % PER_GRADE }))
  const cp = cellPick(pool)
  expect(cp.pick.length === 28 && !cp.short.length && GRADES.every(g => cp.pick.filter(i => i.grade_target === g).length === 7) && [1, 2, 3, 4].every(k => cp.pick.filter(i => i.key_length_rank === k).length === 7), 'cell pick: 7 per grade and each rank exactly 7')
  // drop every rank-4 item of grade 5 but one: a quota of 2 there cannot fill -> short; a quota of 1 can
  const g5r4 = pool.filter(i => i.grade_target === 5 && i.key_length_rank === 4)
  const thin = pool.filter(i => !g5r4.slice(1).includes(i))
  expect(cellPick(thin).short.length === (Q[5][4] === 2 ? 1 : 0), `a cell with fewer survivors than its quota is reported short (g5 rank 4 quota ${Q[5][4]}, 1 left)`)
  const thin0 = pool.filter(i => !g5r4.includes(i))
  expect(cellPick(thin0).short.length === 1, 'a cell with no survivors is short whatever its quota')
  // v5's failure: drops that fall on one rank cannot unbalance the pick while every cell can fill
  const r4drop = new Set(GRADES.flatMap(g => pool.filter(i => i.grade_target === g && i.key_length_rank === 4).slice(0, 2).map(i => i.id)))
  const skew = pool.filter(i => !r4drop.has(i.id))   // 8 drops, all on rank 4 (2 per grade), as v5's drops leaned
  const sp = cellPick(skew)
  expect(!sp.short.length && [1, 2, 3, 4].every(k => sp.pick.filter(i => i.key_length_rank === k).length === 7), 'rank-skewed drops leave each rank at exactly 7 (v5 came out 8/8/7/5)')
  const pf = preflightDecide(skew, () => [])
  expect(pf.which === 'first' && [1, 2, 3, 4].every(k => pf.pick.filter(i => i.key_length_rank === k).length === 7), 'the freeze path (firstPick via pre-flight) keeps each rank at 7 after rank-skewed drops')
  expect(preflightDecide(pool, () => []).which === 'first', 'pre-flight: a clean first pick freezes as is')
  const firstIds = JSON.stringify(firstPick(pool).map(i => i.id))
  const fb = preflightDecide(pool, p => (JSON.stringify(p.map(i => i.id)) === firstIds ? ['fires'] : []))
  expect(fb.which === 'redraw' && fb.pick.length === 28 && [1, 2, 3, 4].every(k => fb.pick.filter(i => i.key_length_rank === k).length === 7), 'pre-flight: a firing first pick is re-drawn once, within cells (a different pick, each rank still 7)')
  expect(preflightDecide(pool, () => ['fires']).which === 'fail', 'pre-flight: when the re-draw fires too, the strand FAILS (no second re-draw)')
  expect(JSON.stringify(redraw(pool).map(i => i.id)) === JSON.stringify(redraw(pool).map(i => i.id)), 're-draw is deterministic (seeded)')
  // T2-L and T2 (imported) still fire on the known tells
  const v3pick = JSON.parse(readFileSync(SB + 'map-lu-v3/stage0-pick-spell.json', 'utf8')).filter(i => i.spelling_format === 'word')
  expect(t2(v3pick).fires, "v2's T2 (imported, unchanged) still fires on v3's Stage 0 word picks")
  const ct = Array.from({ length: 20 }, (_, i) => { const st = 'abcdefghijklmnopqrst'.slice(i % 10, (i % 10) + 6).replace(/[aeiou]/g, 'x'); const key = st.slice(0, 2) + 'a#o' + st.slice(2, 4); return { choices: [key, ...['k', 'm', 'p'].map(c => key.replace('#', c))], correct_answer: key } })
  expect(t2L(ct).fires, "v4's T2-L (imported) fires on a constructed consonant-count tell")
  // dealing and the slot bar at the single group
  let ok = true
  for (let t = 0; t < 20; t++) { const r = rng(400 + t), items = z(28, 0).map((_, i) => ({ id: 's' + i, map_strand: 'Spelling', spelling_format: 'sentence' })), letters = dealFlat(items, r); if (!slotCheck(items.map((x, i) => ({ strand: 'spell', group: fmtGroup(x), letter: letters[i] }))).ok) ok = false }
  expect(ok, 'dealFlat passes the slot bar at 28 sentence items, 20 seeds')
  // pooled E3 at 28 (v3's, imported): 7/28 passes, 8/28 fails
  const mk = (n0, kLong) => Array.from({ length: n0 }, (_, i) => ({ choices: i < kLong ? ['aaaaaaaa', 'bb', 'ccc', 'dddd'] : ['aa', 'bbbbbbbb', 'ccc', 'dddd'], correct_answer: i < kLong ? 'aaaaaaaa' : 'ccc' }))
  expect(!Object.keys(pooledE3({ spell: mk(28, 7) }).fails).length && Object.keys(pooledE3({ spell: mk(28, 8) }).fails).length === 1, 'pooled E3: 7/28 longest passes, 8/28 fails')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed: every new rule and bar can fail at its margin')
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
  ws.forEach((w, i) => console.log(`${w.padEnd(18)} NSSpellChecker ${ns[i] ? 'accepts' : 'rejects'} | as a correct word: ${variantHit(w) ? 'REFUSED (' + variantHit(w) + ')' : 'ok'} | as a misspelling: ${misspellingOk(w).length ? 'REFUSED (' + misspellingOk(w).join('; ') + ')' : 'ok'}`))
}
else if (mode === 'itemchecks') {
  if (!arg) die('usage: itemchecks <file.json>')
  const items = rd(arg)
  if (!Array.isArray(items) || !items.length) die(`${arg} holds no items`)
  // --against <file>: the rest of the batch. Amendment 1: a tested word of this file may not be a tested
  // word of, or appear in, any item there, and none of theirs may appear here (cross-author duplicates).
  const ai = process.argv.indexOf('--against'), others = ai > 0 ? rd(process.argv[ai + 1]) : []
  const dupsAll = dupFails([...others, ...items].map(x => ({ ...x })), new Set(items.map(i => i.id)))
  const mine = new Set(items.map(i => i.id))
  const dups = Object.fromEntries(Object.entries(dupsAll).filter(([id]) => mine.has(id)))
  let bad = 0
  for (const it of items) { const e = [...structural(it).errs, ...(dups[it.id] ? [dups[it.id]] : [])]; if (e.length) bad++; console.log(`${e.length ? 'FAIL' : 'ok  '} ${it.id}${e.length ? '\n       x ' + e.join('\n       x ') : ''}`) }
  console.log(bad ? `${bad} of ${items.length} items fail` : `all ${items.length} items pass the exact item checks`)
  process.exit(bad ? 1 : 0)
}
else if (mode === 'assign') {
  wr(W + 'lrank.json', { seed: 'sha256("map-lu-v6-lrank")', note: 'key length rank (1 = longest ... 4 = shortest) per item; each rank exactly 4 times in every grade', quota: cellQuota(), quotaSeed: 'sha256("map-lu-v6-quota")', ranks: assignRanks() })
  console.log('lrank.json written'); for (const [id, k] of Object.entries(assignRanks())) console.log(`  ${id} ${k}`)
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
  const prior = new Set(['map-lu-v2', 'map-lu-v3', 'map-lu-v4', 'map-lu-v5'].flatMap(v => rd(SB + v + '/control.json')).map(c => c.id))
  const four = rows.filter(r => Array.isArray(r.item?.choices) && r.item.choices.length === 4 && r.item.choices.includes(r.item.correct_answer) && !prior.has(r.id))
  const h = r => createHash('sha256').update('map-lu-v6-control:' + r.id).digest('hex')
  const punct = four.filter(r => !FRAG.test(r.subskill ?? '') && PUNCT.test(r.subskill ?? '')).sort((a, b) => (h(a) < h(b) ? -1 : 1)).slice(0, 12)
  const gram = four.filter(r => FRAG.test(r.subskill ?? '') || !PUNCT.test(r.subskill ?? '')).sort((a, b) => (h(a) < h(b) ? -1 : 1)).slice(0, 12)
  if (punct.length !== 12 || gram.length !== 12) die('could not fill 12 + 12')
  const ctl = [...punct.map(r => ({ ...r, ctl: 'punct' })), ...gram.map(r => ({ ...r, ctl: 'gram' }))].map(r => ({ id: r.id, family: r.family, domain: r.domain, subskill: r.subskill, difficulty: r.difficulty, ctl: r.ctl, choices: r.item.choices, correct_answer: r.item.correct_answer }))
  wr(W + 'control.json', ctl)
  console.log(`control: ${ctl.length} of ${four.length} eligible rows (excluding v2-v5 controls) from ${rows.length} read; sha256 ${sha(W + 'control.json')}`)
}
else if (mode === 'checks' || mode === 'preflight') {
  const file = mode === 'preflight' ? W + 'batch.authored.json' : arg
  if (!file) die('usage: checks <batch.json>')
  const items = rd(file)
  if (!Array.isArray(items) || !items.length) die(`${file} holds no items`)
  let bad = 0, batchBad = 0
  if (mode === 'checks') {
    const dups = dupFails(items)
    for (const it of items) { const e = [...structural(it).errs, ...(dups[it.id] ? [dups[it.id]] : [])]; console.log(`${e.length ? 'FAIL' : 'ok  '} ${it.id} [g${it.grade_target}]${e.length ? '\n       x ' + e.join('\n       x ') : ''}`); if (e.length) bad++ }
  }
  const sets = mode === 'preflight' ? { 'all authored': items, 'likely frozen (cell pick, no drops)': firstPick(items) } : { batch: items }
  for (const [nm, sub] of Object.entries(sets)) {
    const b = batchChecks(sub)
    console.log(`-- ${nm}: n=${sub.length}; E3 longest ${b.longest}/${b.n}, shortest ${b.shortest}/${b.n}`)
    for (const [fn, T] of Object.entries(b.fam)) console.log(`${fn} ${fmtT(T)}`)
    for (const e of b.errs) { console.log(`BATCH FAIL ${e}`); if (mode === 'checks') batchBad++ }
  }
  if (mode === 'preflight') process.exit(0)
  console.log(bad || batchBad ? `\n${bad} item failure(s), ${batchBad} batch failure(s)` : `\nall ${items.length} items pass every exact check`)
  process.exit(bad || batchBad ? 1 : 0)
}
else if (mode === 'teacher-input') {
  const items = rd(W + 'batch.authored.json')
  wr(W + 'teacher.input.json', items.map(it => ({ id: it.id, grade_target: it.grade_target, strand: it.map_strand, prompt: it.prompt, correct_answer: it.correct_answer, wrong_options: it.choices.filter(c => c !== it.correct_answer) })))
  console.log(`teacher input: ${items.length} items, ${items.length * 3} wrong options`)
}
else if (mode === 'teacher-merge') {
  const items = rd(W + 'batch.authored.json'), td = teacherDrops(items, rd(W + 'teacher-a.json'), rd(W + 'teacher-b.json'))
  if (td.error) die(td.error)
  wr(W + 'teacher.drops.json', td.drops)
  const byG = GRADES.map(g => `g${g} ${items.filter(i => i.grade_target === g && td.drops[i.id]).length}`).join(', ')
  console.log(`teacher: ${td.n} wrong options; rater a NO ${td.noA}, rater b NO ${td.noB}; items DROPPED ${Object.keys(td.drops).length}/${items.length} (${byG})`)
  for (const [id, w] of Object.entries(td.drops)) console.log(`  ${id}: ${w}`)
}
else if (mode === 'screen-input') {
  const P = pipeline()
  const ws = [...new Set(P.survivors.map(testedWord))]
  const h = w => createHash('sha256').update('map-lu-v6-screen:' + w).digest('hex')
  ws.sort((a, b) => (h(a) < h(b) ? -1 : 1))
  wr(W + 'screen.words.json', ws)
  console.log(`screen input: ${ws.length} tested words of ${P.survivors.length} surviving items -> screen.words.json (no item, no grade, sha256 order)`)
}
else if (mode === 'freeze') {
  const P = pipeline()
  const sd = screenDropsStrict(P.survivors, rd(W + 'screen-a.json'), rd(W + 'screen-b.json'))
  if (sd.error) die(sd.error)
  const pool = P.survivors.filter(i => !sd.drops[i.id])
  console.log(`dropped by the teacher gate: ${Object.keys(P.teacherDropped).join(', ') || 'none'}`)
  console.log(`dropped by an exact check: ${P.exactFail.map(i => `${i.id} (${P.errsOf(i)[0]})`).join('; ') || 'none'}`)
  console.log(`dropped by the word-grade screen: ${Object.entries(sd.drops).map(([id, w]) => `${id} (${w.replace(/^screen: /, '')})`).join('; ') || 'none'}`)
  console.log(`survivors per grade: ${GRADES.map(g => `g${g} ${pool.filter(i => i.grade_target === g).length}`).join(', ')} (quota ${FREEZE_PER_GRADE} each)`)
  const report = { teacherDrops: P.teacherDropped, exactDrops: Object.fromEntries(P.exactFail.map(i => [i.id, P.errsOf(i)])), screenDrops: sd.drops }
  const cells = cellPick(pool), short = cells.short
  console.log(`cell quota (grade x rank): ${GRADES.map(g => `g${g} ` + [1, 2, 3, 4].map(k => `${k}:${pool.filter(i => i.grade_target === g && i.key_length_rank === k).length}/${cellQuota()[g][k]}`).join(' ')).join(' | ')}`)
  if (short.length) { report.stage0 = 'FAIL'; report.why = `a grade x rank cell cannot fill its quota: ${short.join('; ')}`; wr(W + 'stage0.json', report); wr(W + 'stage0-pick.json', cells.pick); console.log(`STAGE 0: FAIL - ${report.why}`); process.exit(1) }
  const pre = preflightDecide(pool, sub => batchChecks(sub).errs)
  console.log(`PRE-FLIGHT on the first pick: ${pre.errsFirst.join('; ') || 'clear'}`)
  if (pre.which !== 'first') console.log(`RE-DRAW (seeded, once): ${pre.pick.map(i => i.id).join(' ')} -> ${pre.errsSecond.join('; ') || 'clear'}`)
  const pick = pre.pick, b = batchChecks(pick)
  wr(W + 'stage0-pick.json', pick)
  for (const [fn, T] of Object.entries(b.fam)) console.log(`${fn} ${fmtT(T)}`)
  const pe = pooledE3({ spell: pick })
  console.log(`E3: key uniquely longest ${pe.pooled.longest}/${pe.n}, uniquely shortest ${pe.pooled.shortest}/${pe.n}${Object.keys(pe.fails).length ? ' -> FAIL' : ' -> pass'}`)
  const errs = [...b.errs, ...Object.values(pe.fails)]
  Object.assign(report, { preflight: { which: pre.which, errsFirst: pre.errsFirst, errsSecond: pre.errsSecond ?? null }, n: pick.length, ids: pick.map(i => i.id), longest: pe.pooled.longest, shortest: pe.pooled.shortest, fam: Object.fromEntries(Object.entries(b.fam).map(([fn, T]) => [fn, { best: T.best, score: T.bestScore, fwP: T.fwP, fires: T.fires }])) })
  if (errs.length || pre.which === 'fail') { report.stage0 = 'FAIL'; report.why = errs.join('; ') || 'pre-flight failed twice'; wr(W + 'stage0.json', report); console.log(`STAGE 0: FAIL - ${report.why}`); process.exit(1) }
  report.stage0 = 'pass'; wr(W + 'stage0.json', report)
  wr(W + 'frozen.json', pick)
  console.log(`FROZEN ${pick.length} items -> ${W}frozen.json; sha256 ${sha(W + 'frozen.json')}; per grade ${GRADES.map(g => pick.filter(i => i.grade_target === g).length).join('/')}`)
}
else if (mode === 'render') {
  const cand = rd(W + 'frozen.json'), ctl = rd(W + 'control.json')
  if (ctl.length !== 24) die(`control has ${ctl.length}, need 24`)
  const place = (choices, key, letter, r) => { const rest = shuffleWith(choices.filter(c => c !== key), r); let q = 0; return Object.fromEntries(SL.map(s => [s, s === letter ? key : rest[q++]])) }
  const all = [...cand.map(i => ({ ...i, arm: 'cand' })), ...ctl.map(i => ({ ...i, arm: 'ctl' }))]
  let seed = seedOf('map-lu-v6-render-oo'), tries = 0, order, letters, r
  for (;;) { tries++; r = rng(seed++); order = shuffleWith(all.slice(), r); letters = dealFlat(order, r); if (!periodicity(letters.join('')).fail) break; if (tries > 2000) die('no E8-clean oo deal') }
  const blind = {}, okey = {}
  order.forEach((it, i) => { const id = `Q${String(i + 1).padStart(2, '0')}`; blind[id] = { options: place(it.choices.map(String), String(it.correct_answer), letters[i], r) }; okey[id] = { letter: letters[i], arm: it.arm, localId: it.id, strand: it.arm === 'cand' ? 'spell' : it.ctl, group: fmtGroup(it) } })
  wr(W + 'oo.blind.json', blind); wr(W + 'oo.key.json', okey)
  const oslot = slotCheck(Object.values(okey).map(k => ({ ...k, strand: k.arm === 'ctl' ? 'ctl' : k.strand })))
  console.log(`oo render: ${order.length} items (${cand.length} candidates + 24 control), seeds tried ${tries}; slots ${JSON.stringify(oslot.by)}`)
  if (!oslot.ok) die(`oo deal not flat: ${oslot.bad.join('; ')}`)
  seed = seedOf('map-lu-v6-render-ws'); tries = 0
  const cs = cand.map(i => ({ ...i, arm: 'cand' }))
  for (;;) { tries++; r = rng(seed++); order = shuffleWith(cs.slice(), r); letters = dealFlat(order, r); if (!periodicity(letters.join('')).fail) break; if (tries > 2000) die('no E8-clean ws deal') }
  const N = cand.length
  const md = [`# Items for review (${N})\n\nEach item: strand, target grade, question, four options. The correct answer is NOT marked.\n`], mdk = [`# Items for review (${N}), KEYED\n\nThe same ${N} items in the same order, now with the intended answer marked.\n`], wkey = {}
  order.forEach((it, i) => {
    const n = i + 1, opts = place(it.choices.map(String), String(it.correct_answer), letters[i], r)
    wkey[n] = { letter: letters[i], localId: it.id, strand: 'spell', group: fmtGroup(it), grade_target: it.grade_target, choices: SL.map(s => opts[s]) }
    const head = `---\n\n## Item ${n}\n\nStrand: ${it.map_strand} | Target grade: ${it.grade_target}\n\nQuestion: ${it.prompt}\n\n${SL.map(s => `${s}. ${opts[s]}`).join('\n')}\n`
    md.push(head); mdk.push(head + `\nIntended answer: **${letters[i]}**\n`)
  })
  writeFileSync(W + 'ws.md', md.join('\n')); writeFileSync(W + 'ws.keyed.md', mdk.join('\n')); wr(W + 'ws.key.json', wkey)
  const ws = slotCheck(Object.values(wkey))
  console.log(`ws render: ${N} items, seeds tried ${tries}, key slots ${JSON.stringify(ws.by)}`)
  if (!ws.ok) die(`ws deal not flat: ${ws.bad.join('; ')}`)
}
else if (mode === 'score') {
  const okey = rd(W + 'oo.key.json'), ids = Object.keys(okey)
  const sol = ['a', 'b', 'c'].map(s => rd(W + `oo.solver-${s}.json`))
  for (const [i, s] of sol.entries()) { const miss = ids.filter(id => !/^[A-D]$/.test(s[id]?.pick ?? '')); if (miss.length) die(`solver ${'abc'[i]} missing ${miss.length} picks`) }
  const arm = {}, flags = []
  for (const id of ids) {
    const k = okey[id], picks = sol.map(s => s[id].pick), h = picks.filter(p => p === k.letter).length
    const key = k.arm === 'ctl' ? 'ctl' : 'spell'
    const a = (arm[key] ??= { n: 0, hits: 0, unan: 0, unanKey: 0 }); a.n++; a.hits += h
    if (new Set(picks).size === 1) { a.unan++; if (h === 3) a.unanKey++; else if (k.arm === 'cand') flags.push(`${k.localId} unanimous on ${picks[0]} (key ${k.letter})`) }
  }
  if (arm.ctl?.n !== 24) die('oo control arm is not 24')
  const pct = a => (100 * a.hits) / (3 * a.n)
  console.log('OPTIONS-ONLY (stems withheld), 3 samples of one Claude solver; denominators: picks = 3 x items per arm')
  for (const [nm, a] of Object.entries(arm)) console.log(`  ${nm.padEnd(6)} n=${a.n} (${3 * a.n} picks) ${pct(a).toFixed(1)}% on key; unanimous ${a.unan}/${a.n} (on key ${a.unanKey})`)
  console.log(`  candidate items unanimous on a NON-key letter: ${flags.join('; ') || 'none'}`)
  const wkey = rd(W + 'ws.key.json'), wids = Object.keys(wkey)
  const cold = ['a', 'b'].map(t => [t, rd(W + `ws.grader-${t}.json`)]), keyed = ['a', 'b'].map(t => [t, rd(W + `ws.keyed-${t}.json`)])
  for (const [t, g] of cold) { const miss = wids.filter(i => !/^[A-D]$/.test(g[i]?.pick ?? '') || !['fits', 'too_easy', 'too_hard'].includes(g[i]?.grade_fit) || !Number.isFinite(+g[i]?.grade_assigned) || g[i]?.grade_assigned === null); if (miss.length) die(`cold grader ${t} incomplete on ${miss.join(',')}`) }
  for (const [t, g] of keyed) { const miss = wids.filter(i => !['correct', 'wrong', 'disputed'].includes(g[i]?.key_verdict)); if (miss.length) die(`keyed grader ${t} incomplete on ${miss.join(',')}`) }
  const frozen = rd(W + 'frozen.json')
  if (wids.length !== frozen.length || frozen.length !== N_FROZEN) die(`with-source has ${wids.length} items, frozen ${frozen.length}, prereg ${N_FROZEN}`)
  console.log(`\nWITH-SOURCE, two fresh Claude graders, cold then keyed; ${wids.length} items x 2 graders per stage`)
  const S = { pass: 0, easier: 0, harder: 0, diffs: { a: [], b: [] }, deadBoth: 0, coldOnKey: 0, passIds: [], holds: [], byGrade: {} }
  for (const id of wids) {
    const k = wkey[id]
    const r = wsItem(cold.map(([t, g]) => [t, g[id]]), keyed.map(([t, g]) => [t, g[id]]), k.letter)
    if (r.pass) { S.pass++; S.passIds.push(k.localId) } else S.holds.push(`${k.localId} (g${k.grade_target}): ${r.why.join('; ')}`)
    if (r.deadBoth.length) S.deadBoth++
    for (const [t, g] of cold) { if (g[id].pick === k.letter) S.coldOnKey++; const d = +g[id].grade_assigned - k.grade_target; S.diffs[t].push(d); if (d < 0) S.easier++; if (d > 0) S.harder++ }
    const bg = (S.byGrade[k.grade_target] ??= { n: 0, pass: 0, easier: 0 }); bg.n++; if (r.pass) bg.pass++; bg.easier += cold.filter(([, g]) => +g[id].grade_assigned < k.grade_target).length
  }
  const n = frozen.length
  const B = bars({ n, pass: S.pass, easier: S.easier, harder: S.harder, diffs: S.diffs, candPct: pct(arm.spell), ctlPct: pct(arm.ctl) })
  const b = batchChecks(frozen), pe = pooledE3({ spell: frozen }), itemFails = frozen.filter(i => structural(i).errs.length).length
  const exactOk = itemFails === 0 && !b.errs.length && !Object.keys(pe.fails).length
  const slot = slotCheck(Object.values(wkey))
  const pass = exactOk && B.b && B.c && B.d && B.oo && slot.ok
  for (const h of S.holds) console.log(`  HOLD ${h}`)
  console.log(`  cold picks on key ${S.coldOnKey}/${2 * n}; items with an option dead by both ${S.deadBoth}/${n}; by grade ${JSON.stringify(S.byGrade)}`)
  console.log(`  S1-a exact: ${exactOk ? 'PASS' : 'FAIL'} (${itemFails} item failures; ${[...b.errs, ...Object.values(pe.fails)].join('; ') || 'no batch failures'}); E3 ${pe.pooled.longest}/${n} longest, ${pe.pooled.shortest}/${n} shortest`)
  for (const [fn, T] of Object.entries(b.fam)) console.log(`  ${fn} ${fmtT(T)}`)
  console.log(`  S1-b pilot-pass ${S.pass}/${n} (bar >= ${passBar(n)}) -> ${B.b ? 'PASS' : 'FAIL'}`)
  console.log(`  S1-c easier ${S.easier}/${2 * n} (bar <= ${easierMax(n)}), harder ${S.harder}/${2 * n} (bar < ${harderLt(n)}) -> ${B.c ? 'PASS' : 'FAIL'}`)
  console.log(`  S1-d mean grade offset a ${B.ma.toFixed(2)}, b ${B.mb.toFixed(2)} (bar within +-0.5) -> ${B.d ? 'PASS' : 'FAIL'}`)
  console.log(`  S2 options-only: ${pct(arm.spell).toFixed(1)}% vs control ${pct(arm.ctl).toFixed(1)}% (bar >= ${B.ooBar.toFixed(1)}; control must be >= 25%) -> ${!B.ooValid ? 'INVALID' : B.oo ? 'PASS' : 'FAIL'}`)
  console.log(`  T key slots ${JSON.stringify(slot.by)} (no slot > 35%) -> ${slot.ok ? 'PASS' : 'FAIL'}`)
  console.log(`  VERDICT: ${pass ? `PASS - insert the ${S.pass} pilot-pass items STAGED as ${COHORT}` : 'FAIL - nothing inserted'}`)
  wr(W + 'stages.json', { verdict: pass ? 'PASS' : 'FAIL', n, passIds: S.passIds, holds: S.holds, ws: { pass: S.pass, easier: S.easier, harder: S.harder, ma: B.ma, mb: B.mb, coldOnKey: S.coldOnKey, deadBoth: S.deadBoth, byGrade: S.byGrade }, oo: { arm: Object.fromEntries(Object.entries(arm).map(([k, a]) => [k, { n: a.n, pct: pct(a), unan: a.unan, unanKey: a.unanKey }])), flags, bar: B.ooBar }, bars: { a: exactOk, b: B.b, c: B.c, d: B.d, oo: B.oo, ooValid: B.ooValid, slot: slot.ok } })
  process.exit(pass ? 0 : 1)
}
else if (mode === 'build') {
  const st = rd(W + 'stages.json')
  if (st.verdict !== 'PASS') die(`verdict ${st.verdict}`)
  const frozen = Object.fromEntries(rd(W + 'frozen.json').map(i => [i.id, i]))
  const wkey = rd(W + 'ws.key.json'), ga = rd(W + 'ws.grader-a.json'), gb = rd(W + 'ws.grader-b.json')
  const items = []
  for (const [n, k] of Object.entries(wkey)) {
    if (!st.passIds.includes(k.localId)) continue
    const it = frozen[k.localId]
    if (!k.choices.includes(it.correct_answer) || new Set(k.choices).size !== 4) die(`${k.localId}: rendered choices do not hold the key`)
    const off = ((+ga[n].grade_assigned - it.grade_target) + (+gb[n].grade_assigned - it.grade_target)) / 2
    items.push({
      id: it.id, type: 'multiple_choice', blanks: null, stem_is_instruction: true, prompt: it.prompt, choices: k.choices, graphic: null, passage: null,
      difficulty: off <= -1 ? 'easy' : off >= 1 ? 'hard' : 'medium', explanation: it.explanation, correct_answer: it.correct_answer,
      passageGroupId: null, correct_answers: null, acceptable_answers: null,
      distractor_rationales: k.choices.filter(c => c !== it.correct_answer).map(c => ({ choice: c, reason: it.student_error?.[c] ?? '' })),
      map: { area: it.map_area, strand: it.map_strand, grade_target: it.grade_target, ccss: it.ccss, spelling_format: 'sentence', rule: it.spelling_pattern ?? null, tested_word: testedWord(it), grade_assigned: { a: +ga[n].grade_assigned, b: +gb[n].grade_assigned } },
    })
  }
  if (items.length !== st.passIds.length) die(`built ${items.length} of ${st.passIds.length}`)
  const OUT = W + 'inserted-spell.batch.json'
  writeFileSync(OUT, JSON.stringify(items, null, 1) + '\n')
  console.log(`${items.length} items -> ${OUT}; sha256 ${sha(OUT)}; difficulty ${['easy', 'medium', 'hard'].map(d => `${d} ${items.filter(i => i.difficulty === d).length}`).join(' / ')}`)
}
else if (mode === 'insert') {
  const commit = process.argv.includes('--commit'), OUT = W + 'inserted-spell.batch.json'
  const { gateBatch } = await import(SB + 'gate.mjs')
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { count: liveMap, error: ce } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', 'map').eq('verified', true).eq('archived', false)
  if (ce || typeof liveMap !== 'number') die(`cannot count live map rows: ${ce?.message}`)
  const g = gateBatch({ task: 'multiple_choice', family: 'map', section: 'language', itemFiles: [OUT], ...(liveMap === 0 ? { liveStems: [] } : {}) })
  console.log(`gate (${g.family}, ledger ${g.batch ?? 'none'}): ${g.canInsert ? 'PASS' : 'REFUSED'} - ${g.reason}`)
  if (!g.canInsert) process.exit(2)
  const items = rd(OUT)
  const norm = x => String(x ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
  const hashOf = ({ passage, prompt, choices }) => createHash('md5').update([norm(passage), norm(prompt), (choices || []).map(norm).join('|')].join('~~')).digest('hex')
  const rows = items.map(({ id, map, ...item }) => ({
    family: 'map', section: 'language', domain: map.area, subskill: map.strand, difficulty: item.difficulty, topic_tag: map.strand,
    item_type: 'multiple_choice', task: 'multiple_choice', passage_group_id: null, item, content_hash: hashOf(item),
    word_count: String(item.correct_answer).split(/\s+/).filter(Boolean).length, verified: false, source: 'hand', cohort: COHORT,
    verify_meta: {
      method: 'map-lu-v6: claude-authored, sentence format only; two teacher-voice raters (any NO drops, no rewrite); exact checks + T2 + T2-L + E3; strict word-grade screen (either screener below target drops); freeze pre-flight with one seeded re-draw; options-only vs matched live control; two Claude graders cold then keyed',
      staged: true, release: 'NOT released. MAP is not a shipped family; a person releases (human sitting, decision rule fixed before the draw). Never verified=true from a script.',
      localId: id, map, prereg: 'scripts/study-bank/MAP-LU-V6.prereg.md', result: 'scripts/study-bank/MAP-LU-V6-RESULT.md', contentSha: g.sha,
    },
  }))
  const { data: dup, error: e1x } = await db.from('study_item_bank').select('id,cohort').in('content_hash', rows.map(r => r.content_hash))
  if (e1x) die(e1x.message)
  if (dup.length) die(`${dup.length} content_hash already in the bank (${dup.map(d => d.cohort).join(',')})`)
  const { data: same, error: e2 } = await db.from('study_item_bank').select('id').eq('cohort', COHORT)
  if (e2) die(e2.message)
  if (same.length) die(`cohort ${COHORT} already has ${same.length} rows`)
  console.log(`${rows.length} rows ready: family map, section language, verified=false, cohort ${COHORT}`)
  if (!commit) { console.log('DRY RUN: nothing inserted (pass --commit)'); process.exit(0) }
  const { data: ins, error: e3 } = await db.from('study_item_bank').insert(rows).select('id,verified,cohort,difficulty')
  if (e3) die(e3.message)
  console.log(`INSERTED ${ins.length} rows, verified=${[...new Set(ins.map(r => r.verified))].join(',')}, cohort ${COHORT}`)
}
else die('usage: map-lu-v6.mjs spell|itemchecks|assign|select-control|checks|preflight|teacher-input|teacher-merge|screen-input|freeze|render|score|build|insert|--selftest')
