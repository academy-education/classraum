#!/usr/bin/env node
/**
 * map-lu-v3.mjs — toolchain for map-lu-v3 (grades 5-8 MAP Language Usage:
 * Spelling, Punctuation, Grammar and Usage, Capitalization at grades 5-6).
 * Bars: MAP-LU-V3.prereg.md, committed before any item existed. Every strand
 * gets its own verdict. Refuses (exit 2) on input it cannot read; exits 1 on a
 * failed bar. Denominators print before verdicts. Run from the repo root.
 *
 * The item-level checks, the dictionary guard, T2 and the pilot-pass rule are
 * IMPORTED UNCHANGED from map-lu-v2.mjs (committed, frozen). What v3 changes:
 *   - quotas (Spelling 10 per grade authored, Punctuation/Grammar 16 -> 12)
 *   - E3 is decided on the POOLED frozen batch, not per strand (v2 design error)
 *   - a cold word-grade SCREEN drops a Spelling item before freeze when both
 *     screeners place its tested word below the target grade
 *   - a sentence-format Spelling item must carry its assigned key_length_rank
 *   - renders deal keys flat per FORMAT (spelling word / spelling sentence /
 *     each other strand / each control half), and the slot bar is per format
 *
 *   spell <word...>            dictionary oracle (the spelling author may run this, nothing else)
 *   select-control             the 24-item matched live control (read-only DB) -> W/control.json
 *   checks <batch.json>        exact item checks + per-strand batch checks + pooled E3
 *   teacher-input | teacher-merge | rerate-input | repair-input    teacher gate and repair, as v2
 *   screen-input               W/screen.words.json: tested words of the post-repair survivors
 *   freeze                     revisions, drops, repairs, SCREEN, quotas, Stage 0 -> W/frozen.json
 *   render                     W/oo.blind.json + oo.key.json, W/ws.md, ws.keyed.md, ws.key.json
 *   score                      all stages, per-strand bars -> W/stages.json
 *   build <strand>             W/inserted-<strand>.batch.json (strand must have PASSED)
 *   insert <strand> [--commit] gateBatch (ledger + stem duplicates), then insert STAGED
 *   --selftest                 break-test every new rule and every bar at its margin
 *
 * W = $MLV3_W or scripts/study-bank/map-lu-v3/
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const ROOT = process.cwd()
const SB = ROOT + '/scripts/study-bank/'
const V2 = await import(SB + 'map-lu-v2.mjs')
const { rng, nsspell, variantHit, misspellingOk, structural: structuralV2, dupFails, t2, batchChecks: batchChecksV2, wsItem, bars, strandOf, passBar, easierMax, harderLt, T2_MARGIN } = V2
const { periodicity } = await import(SB + 'map-pilot-2-checks.mjs')

const W = (process.env.MLV3_W || 'scripts/study-bank/map-lu-v3/').replace(/\/?$/, '/')
const SL = ['A', 'B', 'C', 'D']
const STRANDS = ['spell', 'punct', 'gram', 'cap']
const COHORT = { spell: 'map-lu-v3-spelling', punct: 'map-lu-v3-punctuation', gram: 'map-lu-v3-grammar', cap: 'map-lu-v3-capitalization' }
export const AUTHORED = { spell: { 5: 10, 6: 10, 7: 10, 8: 10 }, punct: { 5: 4, 6: 4, 7: 4, 8: 4 }, gram: { 5: 4, 6: 4, 7: 4, 8: 4 }, cap: { 5: 5, 6: 5 } }
export const FREEZE = { spell: { 5: 6, 6: 6, 7: 6, 8: 6 }, punct: { 5: 3, 6: 3, 7: 3, 8: 3 }, gram: { 5: 3, 6: 3, 7: 3, 8: 3 }, cap: { 5: 4, 6: 4 } }
const sum = o => Object.values(o).reduce((a, b) => a + b, 0)
export const nFrozen = s => sum(FREEZE[s])
export const E3_MAX = 0.25

const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${p} is not JSON: ${e.message}`) } }
const wr = (p, o) => { mkdirSync(W, { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 1) + '\n') }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const shuffleWith = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const fmtT2 = r => `n=${r.n} control ${(100 * r.control).toFixed(1)}% | min-p heuristic ${r.best} ${(100 * r.bestScore).toFixed(1)}% raw p ${r.rawP.toFixed(4)} family-wise p ${r.fwP.toFixed(4)} -> ${r.fires ? 'FIRES' : 'clear'} | top: ${r.top.map(([n, s]) => `${n} ${(100 * s).toFixed(1)}`).join(', ')}`
export const testedWord = it => (it.spelling_format === 'word' ? String(it.correct_answer) : String(it.intended_word ?? '')).toLowerCase()

/** v2's item checks, plus: a sentence-format Spelling item must carry its assigned key_length_rank (v3 assigns it up front). */
export function structural(it) {
  const r = structuralV2(it)
  if (strandOf(it) === 'spell' && it.spelling_format === 'sentence' && ![1, 2, 3, 4].includes(it.key_length_rank)) r.errs.push('L-rank key_length_rank (1-4, assigned in the brief) missing')
  if (strandOf(it) === 'spell' && it.spelling_format === 'word') { const e = profileErr(it); if (e) r.errs.push(e) }
  return r
}

/**
 * L-profile (amendment 1, after authoring, before any teacher, screener,
 * solver or grader). The authored word items put the key at the maximum
 * length on 12/24 (most trouble spots DROP a letter), and T2[word] fired on
 * them (at_max(len) 40.6%, fw p 0.040). Each word item now carries a seeded
 * key_length_profile (map-lu-v3/wprofile.json), enforced exactly: the
 * distractors' length differences from the key are
 *   longest -1,-1,-2 | shortest +1,+1,+2 | equal 0,0,0 | middle -1,+1,0
 */
export const PROFILES = { longest: '-2,-1,-1', shortest: '1,1,2', equal: '0,0,0', middle: '-1,0,1' }
export const profileOf = it => { const k = String(it.correct_answer).length; return it.choices.map(String).filter(c => c !== String(it.correct_answer)).map(c => c.length - k).sort((a, b) => a - b).join(',') }
export function profileErr(it) {
  const want = PROFILES[it.key_length_profile]
  if (!want) return `L-profile key_length_profile (${Object.keys(PROFILES).join('/')}, assigned) missing`
  const got = profileOf(it)
  return got === want ? null : `L-profile assigned "${it.key_length_profile}" needs distractor length differences ${want}, got ${got}`
}

/** v2's per-strand batch checks with E3 REMOVED from the verdict (it is reported, and decided pooled). */
export function batchChecks(items, s) {
  const b = batchChecksV2(items, s)
  return { ...b, errs: b.errs.filter(e => !/^E3 /.test(e)) }
}

/**
 * E3, POOLED. Over every strand that passed its own Stage 0 checks: key
 * uniquely longest <= 25% and key uniquely shortest <= 25% of the pooled
 * items. If a side fails, every strand whose OWN rate on that side exceeds
 * 25% fails (attribution; at least one must, since the pooled rate is the
 * weighted mean). v2 applied the bar per strand, which at n = 10 is a
 * one-item threshold (MAP-LU-V2-RESULT.md).
 */
export function e3Counts(items) {
  let longest = 0, shortest = 0
  for (const it of items) {
    const L = it.choices.map(c => String(c).length), kl = String(it.correct_answer).length
    if (kl === Math.max(...L) && L.filter(x => x === kl).length === 1) longest++
    if (kl === Math.min(...L) && L.filter(x => x === kl).length === 1) shortest++
  }
  return { n: items.length, longest, shortest }
}
export function pooledE3(byStrand) {
  const all = Object.values(byStrand).flat()
  if (!all.length) return { n: 0, fails: {}, pooled: null }
  const P = e3Counts(all), fails = {}
  for (const side of ['longest', 'shortest']) {
    if (P[side] / P.n <= E3_MAX + 1e-12) continue
    for (const [s, its] of Object.entries(byStrand)) { const c = e3Counts(its); if (c[side] / c.n > E3_MAX + 1e-12) fails[s] = `pooled E3 key uniquely ${side} ${P[side]}/${P.n} > 25%, and ${c[side]}/${c.n} in this strand` }
  }
  return { n: P.n, pooled: P, fails }
}

/**
 * The word-grade SCREEN (pre-registered; calibrated on v2's 24 frozen words
 * before the prereg). Two cold screeners grade each tested word with no item,
 * no target grade and no label. A Spelling item is DROPPED before freeze when
 * BOTH place its tested word below the item's target grade. Returns
 * { drops: {id: why}, error } - an incomplete screen is an error, never a pass.
 */
export function screenDrops(items, A, B) {
  const drops = {}, missing = []
  for (const it of items.filter(i => strandOf(i) === 'spell')) {
    const w = testedWord(it), a = A?.[w]?.grade, b = B?.[w]?.grade
    if (!Number.isFinite(+a) || !Number.isFinite(+b) || a === null || b === null) { missing.push(w); continue }
    if (+a < it.grade_target && +b < it.grade_target) drops[it.id] = `screen: "${w}" graded ${a} and ${b}, both below target ${it.grade_target}`
  }
  return { drops, error: missing.length ? `screen has no grade from both screeners for: ${missing.join(', ')}` : null }
}

/** Key-slot groups: the unit keys are dealt flat over, and the unit the slot bar is read on. */
export const fmtGroup = it => (it.arm === 'ctl' ? `ctl-${it.ctl}` : strandOf(it) === 'spell' ? `spell-${it.spelling_format}` : strandOf(it))
export function dealFlat(items, r) {
  const flat = n => shuffleWith(Array.from({ length: n }, (_, i) => SL[i % 4]), r)
  const g = {}; items.forEach(i => (g[fmtGroup(i)] ??= []).push(i))
  const q = Object.fromEntries(Object.entries(g).map(([k, v]) => [k, flat(v.length)]))
  return items.map(i => q[fmtGroup(i)].pop())
}
/** Slot bar: no slot > 35% within any strand AND within any format group. */
export function slotCheck(keys) {
  const by = {}
  for (const k of keys) for (const grp of new Set([k.strand, k.group])) { const o = (by[grp] ??= {}); o[k.letter] = (o[k.letter] ?? 0) + 1 }
  const bad = Object.entries(by).filter(([, o]) => Math.max(...Object.values(o)) / Object.values(o).reduce((a, b) => a + b, 0) > 0.35).map(([g, o]) => `${g} ${JSON.stringify(o)}`)
  return { by, bad, ok: bad.length === 0 }
}

/** revisions + re-rate drops + repairs, exactly as v2; returns the post-repair pool. */
function pipeline() {
  const authored = rd(W + 'batch.authored.json')
  const rev = existsSync(W + 'revised.json') ? Object.fromEntries(rd(W + 'revised.json').map(i => [i.id, i])) : {}
  const dropped = []
  if (Object.keys(rev).length) {
    const ra = rd(W + 'rerate-a.json'), rb = rd(W + 'rerate-b.json')
    for (const id of Object.keys(rev)) {
      const orig = authored.find(i => i.id === id)
      if (!orig) die(`revised item ${id} is not in the authored batch`)
      const newOpts = rev[id].choices.filter(c => c !== rev[id].correct_answer && !orig.choices.includes(c))
      for (const opt of newOpts) {
        const a = ra[id]?.distractors?.find(d => d.option === opt), b = rb[id]?.distractors?.find(d => d.option === opt)
        if (!a || !b) die(`${id}: re-rate missing for "${opt.slice(0, 40)}"`)
        if (a.would_pick !== 'yes' || b.would_pick !== 'yes') { dropped.push(id); break }
      }
    }
  }
  const after = authored.map(i => rev[i.id] ?? i).filter(i => !dropped.includes(i.id))
  const repairs = existsSync(W + 'repairs.json') ? rd(W + 'repairs.json') : {}
  const fixed = after.map(i => repairs[i.id] ?? i)
  // the amendment-1 re-profile is a revision too: a word clash it introduced fails the re-profiled item
  const core = i => JSON.stringify([i.prompt, i.choices, i.correct_answer])
  const orig = existsSync(W + 'batch.authored.original.json') ? Object.fromEntries(rd(W + 'batch.authored.original.json').map(i => [i.id, core(i)])) : {}
  const reprofiled = authored.filter(i => orig[i.id] && orig[i.id] !== core(i)).map(i => i.id)
  const dups = dupFails(fixed, new Set([...reprofiled, ...Object.keys(rev), ...Object.keys(repairs)]))
  const errsOf = i => [...structural(i).errs, ...(dups[i.id] ? [dups[i.id]] : [])]
  return { authored, reprofiled, rev, dropped, after, repairs, fixed, errsOf, exactFail: fixed.filter(i => errsOf(i).length), survivors: fixed.filter(i => !errsOf(i).length) }
}

// ---------- selftest ----------
async function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  const z = (n, v) => Array(n).fill(v)
  const rv = p => JSON.parse(readFileSync(SB + p, 'utf8'))
  // quotas sit inside the authored counts
  for (const s of STRANDS) for (const [g, q] of Object.entries(FREEZE[s])) expect(q <= AUTHORED[s][g], `${s} grade ${g}: freeze ${q} <= authored ${AUTHORED[s][g]}`)
  expect(nFrozen('spell') === 24 && nFrozen('punct') === 12 && nFrozen('gram') === 12 && nFrozen('cap') === 8, 'frozen sizes 24 / 12 / 12 / 8')
  // bars at every v3 strand size (v2's bar functions, at v3's n)
  for (const s of STRANDS) {
    const n = nFrozen(s), base = { n, pass: n, easier: 0, harder: 0, diffs: { a: z(n, 0), b: z(n, 0) }, candPct: 90, ctlPct: 70 }
    const pb = passBar(n), em = easierMax(n), hl = Math.ceil(harderLt(n))
    expect(bars({ ...base, pass: pb }).b && !bars({ ...base, pass: pb - 1 }).b, `${s} n=${n} S1-b: ${pb} passes, ${pb - 1} fails`)
    expect(bars({ ...base, easier: em }).c && !bars({ ...base, easier: em + 1 }).c, `${s} S1-c: easier ${em}/${2 * n} passes, ${em + 1} fails`)
    expect(bars({ ...base, harder: hl - 1 }).c && !bars({ ...base, harder: hl }).c, `${s} S1-c: harder ${hl - 1}/${2 * n} passes, ${hl} fails`)
    const half = Math.floor(n / 2)
    expect(bars({ ...base, diffs: { a: [...z(half, -1), ...z(n - half, 0)], b: z(n, 0) } }).d, `${s} S1-d: mean -${(half / n).toFixed(2)} passes`)
    expect(!bars({ ...base, diffs: { a: z(n, 0), b: [...z(half + 1, 1), ...z(n - half - 1, 0)] } }).d, `${s} S1-d: +${((half + 1) / n).toFixed(2)} fails`)
  }
  const ob = { n: 24, pass: 24, easier: 0, harder: 0, diffs: { a: z(24, 0), b: z(24, 0) } }
  expect(bars({ ...ob, candPct: 90, ctlPct: 100 }).oo && !bars({ ...ob, candPct: 89.9, ctlPct: 100 }).oo, 'S2 ceiling: at a 100% control the bar is 90, attainable both ways')
  expect(!bars({ ...ob, candPct: 100, ctlPct: 24.9 }).oo, 'S2: control below 25% is INVALID and cannot pass')

  // pooled E3 — on v2's own Stage 0 picks: v2 stopped Punctuation and Grammar at 3/10 each per strand
  const v2p = Object.fromEntries(STRANDS.map(s => [s, rv(`map-lu-v2/stage0-pick-${s}.json`)]))
  const v2e = pooledE3(v2p)
  expect(v2e.pooled.longest === 10 && v2e.pooled.n === 52 && !Object.keys(v2e.fails).length, `pooled E3 on v2's four Stage 0 picks: longest ${v2e.pooled.longest}/${v2e.pooled.n}, shortest ${v2e.pooled.shortest}/${v2e.pooled.n} -> no strand fails (v2's per-strand rule stopped Punctuation and Grammar at 3/10)`)
  for (const s of ['punct', 'gram']) expect(e3Counts(v2p[s]).longest === 3 && batchChecksV2(v2p[s], s).errs.some(e => /^E3/.test(e)) && !batchChecks(v2p[s], s).errs.some(e => /^E3/.test(e)), `v2 ${s}: v2's per-strand E3 fires (3/10); v3's strand check no longer decides on it`)
  // margin: construct pooled sets at exactly 25% and one item over
  const mk = (n, kLong) => Array.from({ length: n }, (_, i) => ({ choices: i < kLong ? ['aaaaaaaa', 'bb', 'ccc', 'dddd'] : ['aa', 'bbbbbbbb', 'ccc', 'dddd'], correct_answer: i < kLong ? 'aaaaaaaa' : 'ccc' }))
  const at = pooledE3({ spell: mk(24, 6), punct: mk(12, 3), gram: mk(12, 3), cap: mk(8, 2) })
  expect(!Object.keys(at.fails).length, `pooled E3 at exactly 14/56 = 25.0% passes`)
  const over = pooledE3({ spell: mk(24, 6), punct: mk(12, 4), gram: mk(12, 3), cap: mk(8, 2) })
  expect(Object.keys(over.fails).join() === 'punct', `pooled E3 at 15/56 fails, attributed only to the strand over 25% (${Object.keys(over.fails).join() || 'none'})`)
  const many = pooledE3({ spell: mk(24, 12), punct: mk(12, 1), gram: mk(12, 4), cap: mk(8, 1) })
  expect(Object.keys(many.fails).sort().join() === 'gram,spell', `pooled E3 over: every strand over 25% fails, strands under do not (${Object.keys(many.fails).sort().join()})`)
  const shortSide = pooledE3({ spell: mk(24, 0).map(i => ({ ...i, correct_answer: 'bb' })), punct: mk(12, 0) })
  expect(!!shortSide.fails.spell && !shortSide.fails.punct, 'pooled E3 shortest side fires and attributes too')

  // the word-grade screen, on v2's frozen Spelling with the pre-prereg calibration run (map-lu-v3/screen-v2-*.json)
  const v2s = rv('map-lu-v2/frozen-spell.json'), sa = rv('map-lu-v3/screen-v2-a.json'), sb = rv('map-lu-v3/screen-v2-b.json')
  const sd = screenDrops(v2s, sa, sb)
  const dropped = Object.keys(sd.drops).sort()
  expect(!sd.error, `screen reads all ${v2s.length} v2 words`)
  for (const id of ['MLV2-S01', 'MLV2-S02', 'MLV2-S05', 'MLV2-S07']) expect(dropped.includes(id), `screen drops v2's failing grade-5 item ${id} (${sd.drops[id] ?? 'kept'})`)
  console.log(`info screen on v2: drops ${dropped.length}/24: ${dropped.map(i => `${i} ${sd.drops[i].replace(/^screen: /, '')}`).join('; ')}`)
  // the counterfactual on v2's graders: easier calls with and without the screen
  const wk = rv('map-lu-v2/ws.key.json'), ga = rv('map-lu-v2/ws.grader-a.json'), gb = rv('map-lu-v2/ws.grader-b.json')
  const easierOf = keep => Object.entries(wk).filter(([, k]) => k.strand === 'spell' && keep(k.localId)).reduce((s, [n, k]) => s + (+ga[n].grade_assigned < k.grade_target) + (+gb[n].grade_assigned < k.grade_target), 0)
  const eAll = easierOf(() => true), eKept = easierOf(id => !sd.drops[id])
  expect(eAll === 11, `v2 Spelling had 11 easier calls (${eAll})`)
  expect(eKept <= 2, `with the screen's drops, v2's remaining Spelling items carry ${eKept} easier calls (of ${2 * (24 - dropped.length)})`)
  // margins: equal to target keeps; one screener below keeps; both below drops; missing refuses
  const it5 = { id: 'X', map_strand: 'Spelling', spelling_format: 'word', correct_answer: 'word', grade_target: 5, choices: [] }
  expect(!screenDrops([it5], { word: { grade: 5 } }, { word: { grade: 5 } }).drops.X, 'screen: graded at the target keeps')
  expect(!screenDrops([it5], { word: { grade: 4 } }, { word: { grade: 5 } }).drops.X, 'screen: one screener below keeps')
  expect(!!screenDrops([it5], { word: { grade: 4 } }, { word: { grade: 4 } }).drops.X, 'screen: both below drops')
  expect(!!screenDrops([it5], { word: { grade: 4 } }, {}).error, 'screen: a word missing from one screener is an ERROR, not a keep')
  expect(!!screenDrops([{ ...it5, spelling_format: 'sentence', intended_word: 'other' }], { word: { grade: 9 } }, { word: { grade: 9 } }).error, 'screen: a sentence item is screened on its intended word')

  // per-format key dealing and the per-format slot bar
  const v2w = Object.values(wk).map(k => ({ ...k, group: k.strand === 'spell' ? `spell-${v2s.find(i => i.id === k.localId)?.spelling_format ?? 'cap'}` : k.strand }))
  const v2slot = slotCheck(v2w)
  expect(!v2slot.ok && v2slot.bad.some(b => /spell-sentence/.test(b)), `slot bar FAILS v2's stored order on the sentence format (${v2slot.bad.join('; ')})`)
  expect(slotCheck(v2w.map(k => ({ ...k, group: k.strand }))).ok, "the same v2 order passes a per-STRAND-only bar (which is why v2's render missed it)")
  const synth = [...z(16, 0).map((_, i) => ({ id: 'w' + i, map_strand: 'Spelling', spelling_format: 'word' })), ...z(8, 0).map((_, i) => ({ id: 's' + i, map_strand: 'Spelling', spelling_format: 'sentence' })), ...z(12, 0).map((_, i) => ({ id: 'p' + i, map_strand: 'Punctuation' })), ...z(12, 0).map((_, i) => ({ id: 'g' + i, map_strand: 'Parts of Speech' })), ...z(8, 0).map((_, i) => ({ id: 'c' + i, map_strand: 'Capitalization' }))]
  for (let t = 0; t < 20; t++) {
    const r = rng(100 + t), order = shuffleWith(synth.slice(), r), letters = dealFlat(order, r)
    const keys = order.map((it, i) => ({ strand: strandOf(it), group: fmtGroup(it), letter: letters[i] }))
    const sc = slotCheck(keys)
    if (!sc.ok || Object.values(sc.by).some(o => new Set(Object.values(o)).size !== 1)) { expect(false, `dealFlat is exactly flat per format (seed ${100 + t}: ${JSON.stringify(sc.by)})`); break }
    if (t === 19) expect(true, 'dealFlat is exactly flat in every strand and every format group, 20 seeds')
  }
  // L-rank must be present on a sentence-format item
  const ss = { map_strand: 'Spelling', spelling_format: 'sentence', grade_target: 7, ccss: 'L.7.2b', prompt: 'Which sentence has a spelling error?', choices: ['The library was very quiet today.', 'We will seperate the papers.', 'Her argument was strong.', 'The old cemetery is quite near the school.'], correct_answer: 'We will seperate the papers.', misspelled_word: 'seperate', intended_word: 'separate' }
  ss.targets = { [ss.choices[0]]: 'library', [ss.choices[1]]: 'seperate', [ss.choices[2]]: 'argument', [ss.choices[3]]: 'cemetery' }
  expect(structural(ss).errs.some(e => /key_length_rank/.test(e)), 'L-rank: a sentence item WITHOUT its assigned rank fails')
  expect(!structural({ ...ss, key_length_rank: 3 }).errs.some(e => /L-rank/.test(e)), `L-rank: the same item at its true rank passes (${structural({ ...ss, key_length_rank: 3 }).errs.join('; ')})`)
  // L-profile (amendment 1): the authored word items' length tell, and the balanced assignment that removes it
  const orig = rv('map-lu-v3/batch.authored.original.json').filter(i => i.spelling_format === 'word')
  const to = t2(orig)
  expect(to.fires, `T2[word] FIRES on the 24 authored word items (the finding behind amendment 1): ${fmtT2(to)}`)
  const wp = rv('map-lu-v3/wprofile.json').profiles
  expect(Object.keys(wp).length === 24 && ['longest', 'shortest', 'equal', 'middle'].every(p => Object.values(wp).filter(x => x === p).length === 6), 'wprofile assigns each profile to 6 of 24 word items')
  const synthOf = (id, p) => { const key = 'abcdefgh', d = PROFILES[p].split(',').map(Number); return { id, choices: [key, ...d.map((x, j) => (x < 0 ? key.slice(0, 8 + x) : key + 'xyz'.slice(0, x)).slice(0, -1) + 'pqr'[j])], correct_answer: key } }
  const bal = Object.entries(wp).map(([id, p]) => synthOf(id, p))
  expect(bal.every(it => profileOf(it) === PROFILES[wp[it.id]]), 'synthetic items carry their assigned profiles')
  const tb = t2(bal), lenH = Object.entries(tb.obs).filter(([n]) => /\(len\)/.test(n)).map(([n, v]) => [n, v])
  expect(lenH.every(([, v]) => v <= 0.3126), `under the balanced assignment no length heuristic exceeds 31.3% (${lenH.map(([n, v]) => `${n} ${(100 * v).toFixed(1)}`).join(', ')})`)
  const first16 = bal.filter(it => [1, 3, 4, 6].includes(+it.id.slice(-2) % 10 || 10))
  const lf = Object.entries(t2(first16).obs).filter(([n]) => /\(len\)/.test(n))
  expect(first16.length === 16 && lf.every(([, v]) => v <= 0.3126), `the same holds on the 16 likely-frozen word items (${lf.map(([n, v]) => `${n} ${(100 * v).toFixed(1)}`).join(', ')})`)
  expect(!profileErr({ correct_answer: 'necessary', choices: ['necessary', 'neccessary', 'necesary', 'neccesary'], key_length_profile: 'middle' }), 'L-profile: necessary/neccessary/necesary/neccesary reads as middle')
  expect(!!profileErr({ correct_answer: 'necessary', choices: ['necessary', 'neccessary', 'necesary', 'neccesary'], key_length_profile: 'longest' }), 'L-profile: a wrong assigned profile FAILS')
  expect(!!profileErr({ correct_answer: 'necessary', choices: ['necessary', 'neccessary', 'necesary', 'neccesary'] }), 'L-profile: a word item without a profile FAILS')
  // T2 is v2's, unchanged: it still fires on v1 Capitalization's known tell
  const v1 = rv('map-lu-mech-v1.batch.json')
  expect(t2(v1.filter(i => strandOf(i) === 'cap')).fires, 'T2 (imported from v2) still fires on v1 Capitalization')
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
  const h = r => createHash('sha256').update('map-lu-v3-control:' + r.id).digest('hex')
  const punct = four.filter(r => !FRAG.test(r.subskill ?? '') && PUNCT.test(r.subskill ?? '')).sort((a, b) => (h(a) < h(b) ? -1 : 1)).slice(0, 12)
  const gram = four.filter(r => FRAG.test(r.subskill ?? '') || !PUNCT.test(r.subskill ?? '')).sort((a, b) => (h(a) < h(b) ? -1 : 1)).slice(0, 12)
  if (punct.length !== 12 || gram.length !== 12) die('could not fill 12 + 12')
  const ctl = [...punct.map(r => ({ ...r, ctl: 'punct' })), ...gram.map(r => ({ ...r, ctl: 'gram' }))].map(r => ({ id: r.id, family: r.family, domain: r.domain, subskill: r.subskill, difficulty: r.difficulty, ctl: r.ctl, choices: r.item.choices, correct_answer: r.item.correct_answer }))
  wr(W + 'control.json', ctl)
  const hist = {}; for (const c of ctl) { const kk = `${c.family}/${c.ctl}/${c.difficulty}`; hist[kk] = (hist[kk] ?? 0) + 1 }
  const v2ids = new Set(rd(SB + 'map-lu-v2/control.json').map(c => c.id))
  console.log(`control: ${ctl.length} of ${four.length} eligible four-choice live conventions rows (easy+medium) from ${rows.length} read; ${JSON.stringify(hist)}; overlap with v2's control ${ctl.filter(c => v2ids.has(c.id)).length}`)
}
else if (mode === 'checks') {
  if (!arg) die('usage: checks <batch.json>')
  const items = rd(arg)
  if (!Array.isArray(items) || !items.length) die(`${arg} holds no items`)
  let bad = 0, batchBad = 0
  const byStrand = {}
  for (const s of STRANDS) {
    const its = items.filter(i => strandOf(i) === s)
    if (!its.length) continue
    byStrand[s] = its
    console.log(`\n== ${s}: ${its.length} items`)
    let scored = 0, unsc = 0
    for (const it of its) {
      const r = structural(it); scored += r.e1.scored; unsc += r.e1.unscorable
      console.log(`${r.errs.length ? 'FAIL' : 'ok  '} ${it.id} [g${it.grade_target} ${it.ccss}${it.spelling_format ? ' ' + it.spelling_format : ''}]${r.errs.length ? '\n       x ' + r.errs.join('\n       x ') : ''}`)
      if (r.errs.length) bad++
    }
    console.log(`E1 denominator: ${scored} scored units (>= 15 words), ${unsc} unscorable`)
    const b = batchChecks(its, s)
    console.log(`E3 (reported; decided pooled) key uniquely longest ${b.longest}/${b.n}, uniquely shortest ${b.shortest}/${b.n}`)
    console.log(`T2 ${fmtT2(b.t2)}`)
    for (const [f, r] of Object.entries(b.perFormat)) console.log(`T2[${f}] ${fmtT2(r)}`)
    for (const e of b.errs) { console.log(`BATCH FAIL ${e}`); batchBad++ }
  }
  const pe = pooledE3(byStrand)
  console.log(`\npooled E3: key uniquely longest ${pe.pooled.longest}/${pe.n}, uniquely shortest ${pe.pooled.shortest}/${pe.n}${Object.keys(pe.fails).length ? ' -> FAIL ' + JSON.stringify(pe.fails) : ' -> pass'}`)
  batchBad += Object.keys(pe.fails).length
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
else if (mode === 'repair-input') {
  const P = pipeline()
  const dups = dupFails(P.after, new Set([...P.reprofiled, ...Object.keys(P.rev)]))
  const failing = P.after.map(i => [i, [...structural(i).errs, ...(dups[i.id] ? [dups[i.id] + '. Every tested spelling word in the batch: ' + P.after.filter(x => strandOf(x) === 'spell').map(testedWord).join(', ')] : [])]]).filter(([, e]) => e.length)
  wr(W + 'repair.input.json', failing.map(([item, errors]) => ({ item, errors })))
  console.log(`dropped at re-rate: ${P.dropped.join(', ') || 'none'}; ${failing.length} items fail an exact check -> repair.input.json`)
  for (const [i, e] of failing) console.log(`  ${i.id}: ${e.join('; ')}`)
}
else if (mode === 'screen-input') {
  const P = pipeline()
  const ws = [...new Set(P.survivors.filter(i => strandOf(i) === 'spell').map(testedWord))]
  const h = w => createHash('sha256').update('map-lu-v3-screen:' + w).digest('hex')
  ws.sort((a, b) => (h(a) < h(b) ? -1 : 1))
  wr(W + 'screen.words.json', ws)
  console.log(`screen input: ${ws.length} tested words of ${P.survivors.filter(i => strandOf(i) === 'spell').length} surviving Spelling items -> screen.words.json (no item, no grade, sha256 order)`)
}
else if (mode === 'freeze') {
  const P = pipeline()
  const sd = screenDrops(P.survivors, rd(W + 'screen-a.json'), rd(W + 'screen-b.json'))
  if (sd.error) die(sd.error)
  const pool = P.survivors.filter(i => !sd.drops[i.id])
  console.log(`dropped at teacher re-rate: ${P.dropped.join(', ') || 'none'}`)
  console.log(`failing exact checks after repairs (dropped): ${P.exactFail.map(i => `${i.id} (${P.errsOf(i)[0]})`).join('; ') || 'none'}`)
  console.log(`dropped by the word-grade screen: ${Object.entries(sd.drops).map(([id, w]) => `${id} (${w.replace(/^screen: /, '')})`).join('; ') || 'none'}`)
  const report = {}, picks = {}
  for (const s of STRANDS) {
    const pick = []
    for (const [gr, q] of Object.entries(FREEZE[s])) pick.push(...pool.filter(i => strandOf(i) === s && i.grade_target === +gr).slice(0, q))
    if (pick.length) wr(W + `stage0-pick-${s}.json`, pick)
    const short = Object.entries(FREEZE[s]).filter(([gr, q]) => pick.filter(i => i.grade_target === +gr).length < q).map(([gr]) => gr)
    if (short.length) { report[s] = { stage0: 'FAIL', why: `fewer survivors than the quota at grade ${short.join(',')}`, n: pick.length }; continue }
    const b = batchChecks(pick, s)
    console.log(`${s}: E3 (reported) ${b.longest}/${b.n} longest, ${b.shortest}/${b.n} shortest; T2 ${fmtT2(b.t2)}`)
    for (const [f, r] of Object.entries(b.perFormat)) console.log(`${s}: T2[${f}] ${fmtT2(r)}`)
    if (b.errs.length) { report[s] = { stage0: 'FAIL', why: b.errs.join('; '), n: pick.length, t2: { best: b.t2.best, score: b.t2.bestScore, fwP: b.t2.fwP } }; continue }
    report[s] = { stage0: 'pass', n: pick.length, ids: pick.map(i => i.id), t2: { best: b.t2.best, score: b.t2.bestScore, fwP: b.t2.fwP }, perFormat: Object.fromEntries(Object.entries(b.perFormat).map(([f, r]) => [f, { best: r.best, score: r.bestScore, fwP: r.fwP }])), longest: b.longest, shortest: b.shortest }
    picks[s] = pick
  }
  // pooled E3 over every strand that passed its own checks
  const pe = pooledE3(picks)
  if (pe.n) {
    console.log(`pooled E3: longest ${pe.pooled.longest}/${pe.n}, shortest ${pe.pooled.shortest}/${pe.n}${Object.keys(pe.fails).length ? ' -> FAIL ' + JSON.stringify(pe.fails) : ' -> pass'}`)
    for (const [s, why] of Object.entries(pe.fails)) { report[s] = { ...report[s], stage0: 'FAIL', why } }
    report._pooledE3 = { n: pe.n, longest: pe.pooled.longest, shortest: pe.pooled.shortest, fails: pe.fails }
  }
  let frozen = STRANDS.filter(s => report[s]?.stage0 === 'pass').flatMap(s => picks[s])
  // pooled T2 across every strand still passing (as v2)
  if (frozen.length) {
    const PT = t2(frozen)
    console.log(`pooled: T2 ${fmtT2(PT)}`)
    if (PT.fires) for (const s of STRANDS.filter(x => report[x]?.stage0 === 'pass')) {
      const sc = t2(picks[s], { perms: 200 }).obs[PT.best]
      if (sc >= PT.control + T2_MARGIN) report[s] = { ...report[s], stage0: 'FAIL', why: `pooled T2 ${PT.best} fires (fw p ${PT.fwP.toFixed(4)}) and scores ${(100 * sc).toFixed(1)}% in this strand` }
    }
    report._pooledT2 = { best: PT.best, score: PT.bestScore, fwP: PT.fwP, fires: PT.fires, n: PT.n }
  }
  report._screen = { drops: sd.drops, words: P.survivors.filter(i => strandOf(i) === 'spell').length }
  frozen = STRANDS.filter(s => report[s]?.stage0 === 'pass').flatMap(s => picks[s])
  for (const s of STRANDS) console.log(`STAGE 0 ${s}: ${report[s]?.stage0 ?? 'absent'}${report[s]?.why ? ' - ' + report[s].why : ''} (n=${report[s]?.n ?? 0})`)
  wr(W + 'stage0.json', report)
  if (!frozen.length) { console.log('STAGE 0: no strand passed. Nothing frozen.'); process.exit(1) }
  wr(W + 'frozen.json', frozen)
  for (const s of STRANDS.filter(x => report[x]?.stage0 === 'pass')) wr(W + `frozen-${s}.json`, picks[s])
  console.log(`FROZEN ${frozen.length} items -> ${W}frozen.json; sha256 ${sha(W + 'frozen.json')}; grades ${JSON.stringify(frozen.reduce((o, i) => ((o[`${strandOf(i)}${i.grade_target}`] = (o[`${strandOf(i)}${i.grade_target}`] ?? 0) + 1), o), {}))}; spelling formats ${JSON.stringify(frozen.filter(i => strandOf(i) === 'spell').reduce((o, i) => ((o[i.spelling_format] = (o[i.spelling_format] ?? 0) + 1), o), {}))}`)
}
else if (mode === 'render') {
  const cand = rd(W + 'frozen.json'), ctl = rd(W + 'control.json')
  if (ctl.length !== 24) die(`control has ${ctl.length}, need 24`)
  const place = (choices, key, letter, r) => { const rest = shuffleWith(choices.filter(c => c !== key), r); let q = 0; return Object.fromEntries(SL.map(s => [s, s === letter ? key : rest[q++]])) }
  const all = [...cand.map(i => ({ ...i, arm: 'cand' })), ...ctl.map(i => ({ ...i, arm: 'ctl' }))]
  let seed = 20261024, tries = 0, order, letters, r
  for (;;) { tries++; r = rng(seed++); order = shuffleWith(all.slice(), r); letters = dealFlat(order, r); if (!periodicity(letters.join('')).fail) break; if (tries > 2000) die('no E8-clean oo deal') }
  const blind = {}, okey = {}
  order.forEach((it, i) => { const id = `Q${String(i + 1).padStart(2, '0')}`; blind[id] = { options: place(it.choices.map(String), String(it.correct_answer), letters[i], r) }; okey[id] = { letter: letters[i], arm: it.arm, localId: it.id, strand: it.arm === 'cand' ? strandOf(it) : it.ctl, group: fmtGroup(it) } })
  wr(W + 'oo.blind.json', blind); wr(W + 'oo.key.json', okey)
  const oslot = slotCheck(Object.values(okey).map(k => ({ ...k, strand: k.arm === 'ctl' ? 'ctl' : k.strand })))
  console.log(`oo render: ${order.length} items (${cand.length} candidates + 24 control), seeds tried ${tries}; slots ${JSON.stringify(oslot.by)}`)
  if (!oslot.ok) die(`oo deal not flat: ${oslot.bad.join('; ')}`)
  seed = 20261025; tries = 0
  const cs = cand.map(i => ({ ...i, arm: 'cand' }))
  for (;;) { tries++; r = rng(seed++); order = shuffleWith(cs.slice(), r); letters = dealFlat(order, r); if (!periodicity(letters.join('')).fail) break; if (tries > 2000) die('no E8-clean ws deal') }
  const N = cand.length
  const md = [`# Items for review (${N})\n\nEach item: strand, target grade, question, four options. The correct answer is NOT marked.\n`], mdk = [`# Items for review (${N}), KEYED\n\nThe same ${N} items in the same order, now with the intended answer marked.\n`], wkey = {}
  order.forEach((it, i) => {
    const n = i + 1, opts = place(it.choices.map(String), String(it.correct_answer), letters[i], r)
    wkey[n] = { letter: letters[i], localId: it.id, strand: strandOf(it), group: fmtGroup(it), grade_target: it.grade_target, choices: SL.map(s => opts[s]) }
    const head = `---\n\n## Item ${n}\n\nStrand: ${it.map_strand} | Target grade: ${it.grade_target}\n\nQuestion: ${it.prompt}\n\n${SL.map(s => `${s}. ${opts[s]}`).join('\n')}\n`
    md.push(head); mdk.push(head + `\nIntended answer: **${letters[i]}**\n`)
  })
  writeFileSync(W + 'ws.md', md.join('\n')); writeFileSync(W + 'ws.keyed.md', mdk.join('\n')); wr(W + 'ws.key.json', wkey)
  const ws = slotCheck(Object.values(wkey))
  console.log(`ws render: ${N} items, seeds tried ${tries}, key slots per strand and format ${JSON.stringify(ws.by)}`)
  if (!ws.ok) die(`ws deal not flat: ${ws.bad.join('; ')}`)
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
  for (const [t, g] of cold) { const miss = wids.filter(i => !/^[A-D]$/.test(g[i]?.pick ?? '') || !['fits', 'too_easy', 'too_hard'].includes(g[i]?.grade_fit) || !Number.isFinite(+g[i]?.grade_assigned) || g[i]?.grade_assigned === null); if (miss.length) die(`cold grader ${t} incomplete on ${miss.join(',')}`) }
  for (const [t, g] of keyed) { const miss = wids.filter(i => !['correct', 'wrong', 'disputed'].includes(g[i]?.key_verdict)); if (miss.length) die(`keyed grader ${t} incomplete on ${miss.join(',')}`) }
  const frozen = rd(W + 'frozen.json')
  if (wids.length !== frozen.length) die(`with-source has ${wids.length} items, frozen ${frozen.length}`)
  console.log(`\nWITH-SOURCE, two fresh Claude graders, cold then keyed; ${wids.length} items x 2 graders per stage`)
  const out = { strands: {}, oo: { arm: Object.fromEntries(Object.entries(arm).map(([k, a]) => [k, { n: a.n, pct: pct(a), unan: a.unan, unanKey: a.unanKey }])), flags } }
  const st0 = rd(W + 'stage0.json')
  const byStrand = Object.fromEntries(STRANDS.map(s => [s, frozen.filter(i => strandOf(i) === s)]).filter(([, v]) => v.length))
  const pe = pooledE3(byStrand)
  console.log(`pooled E3 over the frozen ${pe.n}: longest ${pe.pooled.longest}/${pe.n}, shortest ${pe.pooled.shortest}/${pe.n}${Object.keys(pe.fails).length ? ' FAIL ' + JSON.stringify(pe.fails) : ' pass'}`)
  const slotAll = slotCheck(Object.values(wkey))
  let anyPass = false
  console.log(`\nBARS PER STRAND (MAP-LU-V3.prereg.md)`)
  for (const s of STRANDS) {
    const its = byStrand[s] ?? []
    if (!its.length) { console.log(`\n[${s}] not frozen (Stage 0 ${st0[s]?.stage0 ?? 'absent'}: ${st0[s]?.why ?? ''}) -> FAIL, nothing inserted`); out.strands[s] = { verdict: 'FAIL', stage0: st0[s] ?? null, passIds: [] }; continue }
    const n = its.length
    if (n !== nFrozen(s)) die(`${s}: frozen ${n}, prereg ${nFrozen(s)}`)
    const S = { pass: 0, easier: 0, harder: 0, diffs: { a: [], b: [] }, deadBoth: 0, coldOnKey: 0, passIds: [], holds: [], byGrade: {}, byFormat: {} }
    for (const id of wids.filter(i => wkey[i].strand === s)) {
      const k = wkey[id]
      const r = wsItem(cold.map(([t, g]) => [t, g[id]]), keyed.map(([t, g]) => [t, g[id]]), k.letter)
      if (r.pass) { S.pass++; S.passIds.push(k.localId) } else S.holds.push(`${k.localId} (g${k.grade_target} ${k.group}): ${r.why.join('; ')}`)
      if (r.deadBoth.length) S.deadBoth++
      for (const [t, g] of cold) { if (g[id].pick === k.letter) S.coldOnKey++; const d = +g[id].grade_assigned - k.grade_target; S.diffs[t].push(d); if (d < 0) S.easier++; if (d > 0) S.harder++ }
      const bg = (S.byGrade[k.grade_target] ??= { n: 0, pass: 0, easier: 0 }); bg.n++; if (r.pass) bg.pass++; bg.easier += cold.filter(([, g]) => +g[id].grade_assigned < k.grade_target).length
      const bf = (S.byFormat[k.group] ??= { n: 0, pass: 0 }); bf.n++; if (r.pass) bf.pass++
    }
    const B = bars({ n, pass: S.pass, easier: S.easier, harder: S.harder, diffs: S.diffs, candPct: pct(arm[s]), ctlPct: pct(arm.ctl) })
    const b = batchChecks(its, s), itemFails = its.filter(i => structural(i).errs.length).length
    const exactOk = itemFails === 0 && !b.errs.length && !pe.fails[s]
    const groups = [...new Set(Object.values(wkey).filter(k => k.strand === s).flatMap(k => [k.strand, k.group]))]
    const slotBad = slotAll.bad.filter(x => groups.includes(x.split(' ')[0]))
    const slotOk = slotBad.length === 0
    const pass = exactOk && B.b && B.c && B.d && B.oo && slotOk
    anyPass ||= pass
    console.log(`\n[${s}] n=${n}`)
    for (const h of S.holds) console.log(`  HOLD ${h}`)
    console.log(`  cold picks on key ${S.coldOnKey}/${2 * n}; items with an option dead by both ${S.deadBoth}/${n}; by grade ${JSON.stringify(S.byGrade)}; by format ${JSON.stringify(S.byFormat)}`)
    console.log(`  S1-a exact: ${exactOk ? 'PASS' : 'FAIL'} (${itemFails} item failures; ${[...b.errs, ...(pe.fails[s] ? [pe.fails[s]] : [])].join('; ') || 'no batch failures'}); E3 in strand (reported) ${b.longest}/${n} longest, ${b.shortest}/${n} shortest`)
    console.log(`  T2 ${fmtT2(b.t2)}`)
    for (const [f, r] of Object.entries(b.perFormat)) console.log(`  T2[${f}] ${fmtT2(r)}`)
    console.log(`  S1-b pilot-pass ${S.pass}/${n} (bar >= ${passBar(n)}; range 0-${n}) -> ${B.b ? 'PASS' : 'FAIL'}`)
    console.log(`  S1-c easier ${S.easier}/${2 * n} (bar <= ${easierMax(n)}), harder ${S.harder}/${2 * n} (bar < ${harderLt(n)}) -> ${B.c ? 'PASS' : 'FAIL'}`)
    console.log(`  S1-d mean grade offset a ${B.ma.toFixed(2)}, b ${B.mb.toFixed(2)} (bar within +-0.5) -> ${B.d ? 'PASS' : 'FAIL'}`)
    console.log(`  S2 options-only: ${pct(arm[s]).toFixed(1)}% (n=${arm[s].n}) vs control ${pct(arm.ctl).toFixed(1)}% (bar: >= ${B.ooBar.toFixed(1)}; control must be >= 25%; bar attainable range 0-100) -> ${!B.ooValid ? 'INVALID' : B.oo ? 'PASS' : 'FAIL'}`)
    console.log(`  T key slots ${groups.map(g => `${g} ${JSON.stringify(slotAll.by[g])}`).join(', ')} (bar: no slot > 35% per strand and per format) -> ${slotOk ? 'PASS' : 'FAIL'}`)
    console.log(`  VERDICT ${s}: ${pass ? `PASS - insert the ${S.pass} pilot-pass items STAGED as ${COHORT[s]}` : 'FAIL - nothing inserted'}`)
    out.strands[s] = { verdict: pass ? 'PASS' : 'FAIL', n, passIds: S.passIds, holds: S.holds, ws: { pass: S.pass, easier: S.easier, harder: S.harder, ma: B.ma, mb: B.mb, coldOnKey: S.coldOnKey, deadBoth: S.deadBoth, byGrade: S.byGrade, byFormat: S.byFormat }, exact: { ok: exactOk, longest: b.longest, shortest: b.shortest, pooledE3: pe.fails[s] ?? null, t2: { best: b.t2.best, score: b.t2.bestScore, fwP: b.t2.fwP, fires: b.t2.fires }, perFormat: Object.fromEntries(Object.entries(b.perFormat).map(([f, r]) => [f, { best: r.best, score: r.bestScore, fwP: r.fwP, fires: r.fires }])) }, oo: { cand: pct(arm[s]), ctl: pct(arm.ctl), bar: B.ooBar }, slots: Object.fromEntries(groups.map(g => [g, slotAll.by[g]])), bars: { a: exactOk, b: B.b, c: B.c, d: B.d, oo: B.oo, ooValid: B.ooValid, slot: slotOk } }
  }
  out.pooledE3 = { n: pe.n, longest: pe.pooled.longest, shortest: pe.pooled.shortest }
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
  console.log(`difficulty ${['easy', 'medium', 'hard'].map(d => `${d} ${items.filter(i => i.difficulty === d).length}`).join(' / ')}`)
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
      method: 'map-lu-v3: claude-authored; two teacher-voice raters + one rewrite; exact checks (E1 E4 E5 E7 E9 G L-rank) + pooled E3 + batch structural-predictor check T2 (per strand and per format); Spelling word-grade screen (two cold screeners); options-only vs matched live control; two Claude graders cold then keyed',
      staged: true, release: 'NOT released. MAP is not a shipped family; a person releases (human sitting, decision rule fixed before the draw). Never verified=true from a script.',
      localId: id, map, prereg: 'scripts/study-bank/MAP-LU-V3.prereg.md', result: 'scripts/study-bank/MAP-LU-V3-RESULT.md', contentSha: g.sha,
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
else die('usage: map-lu-v3.mjs spell|select-control|checks|teacher-input|teacher-merge|rerate-input|repair-input|screen-input|freeze|render|score|build|insert|--selftest')
