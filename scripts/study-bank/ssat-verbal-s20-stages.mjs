#!/usr/bin/env node
/**
 * ssat-verbal-s20-stages.mjs — the pre-freeze probe and post-freeze stages of
 * ssat-verbal-s20-ana (rules fixed in ssat-verbal-s20.prereg.md before any item existed).
 * A copy of ssat-verbal-s19-stages.mjs. The precision family gate is IMPORTED from the s19
 * file (same function, same constants), so it cannot drift. What changed:
 *   - the difficulty gate: banked easy (EASIER of the two grader labels) <= 48% of kept,
 *     the per-grader 40% bar translated with s19's measured inflation (prereg); each
 *     grader's own easy rate on the kept set is printed as a diagnostic only
 *   - probe-render / probe-triage: the pre-freeze probe and its revision triggers
 *   - gate-breaktest is not carried (it was s19's pre-registration evidence)
 *
 *   probe-render <batch.json> <tag> <seed>
 *       unmarked with-source render into ssat-verbal-s20-work/probe/<tag>.render.json (+ .key.json)
 *   probe-triage <batch.json> <key1> <rater1.json> <key2> <rater2.json>
 *       flags an item if EITHER rater calls it easy, names no tempting distractor, picks a
 *       non-key, or names a second defensible option; writes ssat-verbal-s20-work/probe/triage.json
 *   grade-render <batch.json> <tag> <seed>
 *   oo-extra <batch.json> <tag>-oo.key.json <solver.json x3>
 *   qc <batch.json> <tag>-oo.key.json <solvers x3> --graders <gk1> <g1> <gk2> <g2>
 *
 * Refuses (exit 2) on empty or mismatched input rather than printing a number.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const rd = p => {
  if (!existsSync(p)) { console.error(`REFUSING: ${p} missing`); process.exit(2) }
  try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) }
}
const SL = ['A', 'B', 'C', 'D', 'E']
const pct = (k, n) => n ? (100 * k / n).toFixed(1) : 'n/a'

/* ---------- the gate: s19's, imported unchanged (prereg 1b) ---------- */
import { GATE, precisionGate } from './ssat-verbal-s19-stages.mjs'
export { GATE, precisionGate }
export const EASY_CAP = 0.48 // prereg gate 3: easier-of-two label, 40% per grader x s19 inflation, rounded down

function printGate(gt, label) {
  console.log(`${label}PRECISION FAMILY GATE (hold iff picks >= ${GATE.minPicks}, precision >= base + ${GATE.minLift} pts, permutation p <= ${GATE.familywiseAlpha}/${gt.families} = ${gt.alpha.toFixed(4)})`)
  for (const r of [...gt.rows].sort((x, y) => x.p - y.p)) {
    console.log(`  ${r.family.padEnd(28)} picks ${String(r.P).padStart(3)}  correct ${String(r.C).padStart(2)}  precision ${r.prec === null ? '  n/a' : (100 * r.prec).toFixed(1).padStart(5)}%  base ${(100 * r.base).toFixed(1)}%  p ${r.p.toFixed(4)}  keyed-hit ${r.keyedHit}/${r.keyedPicks}${r.measured ? '' : '  (under min picks: not measured)'}${r.fires ? '  <- HOLD' : ''}`)
  }
  console.log(`  => ${gt.hold ? 'FAMILY GATE HOLD' : 'FAMILY GATE PASS'}`)
}

function loadSolvers(keyPath, paths) {
  const key = rd(keyPath); const ids = Object.keys(key)
  if (!ids.length) { console.error('REFUSING: empty key'); process.exit(2) }
  if (paths.length !== 3) { console.error(`REFUSING: need 3 solver files, got ${paths.length}`); process.exit(2) }
  const sol = paths.map(p => { const s = rd(p); const m = s.items && !Array.isArray(s.items) ? s.items : s
    const miss = ids.filter(id => !m[id] || !SL.includes(String(m[id].pick ?? '').toUpperCase()))
    if (miss.length) { console.error(`REFUSING: ${p} lacks a valid pick for ${miss.length} item(s), e.g. ${miss.slice(0, 3)}`); process.exit(2) }
    return m })
  return { key, ids, sol }
}
/** family per blind letter, for every candidate analogy, by option TEXT. */
function familyMap(batch, key, blind, cand) {
  const byId = Object.fromEntries(batch.map(it => [it.id, it]))
  const fam = {}, keyLetter = {}
  for (const id of cand) {
    const it = byId[key[id].localId]
    if (!it || it.kind !== 'analogy') continue
    if (!Array.isArray(it.option_relations) || it.option_relations.length !== it.choices.length) { console.error(`REFUSING: ${it.id} has no option_relations aligned to its choices; the family gate cannot be computed`); process.exit(2) }
    const opts = blind[id]?.options
    if (!opts) { console.error(`REFUSING: blind render has no options for ${id}`); process.exit(2) }
    fam[id] = {}
    for (const [L, t] of Object.entries(opts)) {
      const j = it.choices.indexOf(t)
      if (j < 0) { console.error(`REFUSING: ${id} option '${t}' is not among ${it.id}'s choices`); process.exit(2) }
      fam[id][L] = it.option_relations[j]
    }
    keyLetter[id] = key[id].letter
    if (fam[id][keyLetter[id]] !== it.stem_relation) { console.error(`REFUSING: ${it.id} key option's family is not its stem_relation`); process.exit(2) }
  }
  return { fam, keyLetter }
}

const [cmd, ...a] = process.argv.slice(2)

function main() {
if (cmd === 'grade-render') {
  const [bp, tag, seed] = a
  const batch = rd(bp); if (!Array.isArray(batch) || !batch.length || !tag || !seed) { console.error('usage: grade-render <batch> <tag> <seed>'); process.exit(2) }
  const rand = rng(Number(seed))
  const order = shuffleWith(batch.slice(), rand)
  const render = [], gkey = {}
  order.forEach((it, i) => {
    const gid = `G${String(i + 1).padStart(2, '0')}`
    const ch = shuffleWith(it.choices.slice(), rand)
    render.push({ id: gid, kind: it.kind, prompt: it.prompt, choices: ch })
    gkey[gid] = { localId: it.id, correct_answer: it.correct_answer, difficulty: it.difficulty }
  })
  writeFileSync(`scripts/study-bank/${tag}.grade.json`, JSON.stringify(render, null, 1) + '\n')
  writeFileSync(`scripts/study-bank/${tag}.gradekey.json`, JSON.stringify(gkey, null, 1) + '\n')
  console.log(`${tag}: ${render.length} items rendered with source (seed ${seed})`)
} else if (cmd === 'oo-extra' || cmd === 'qc') {
  // --exclude-blind L64[,L65]: a sensitivity run with those blind ids (and their batch items)
  // removed (deviation 1, the L64 blindness breach). Never used for the primary result.
  const xi = a.indexOf('--exclude-blind')
  const excl = new Set(xi >= 0 ? String(a[xi + 1] ?? '').split(',').filter(Boolean) : [])
  if (xi >= 0 && !excl.size) { console.error('REFUSING: --exclude-blind names no id'); process.exit(2) }
  const a2 = xi >= 0 ? [...a.slice(0, xi), ...a.slice(xi + 2)] : a
  const gi = a2.indexOf('--graders')
  const pos = gi >= 0 ? a2.slice(0, gi) : a2
  const [bp, kp, ...sp] = pos
  const loaded = loadSolvers(kp, sp)
  for (const id of excl) if (!loaded.key[id]) { console.error(`REFUSING: --exclude-blind ${id} is not in the key`); process.exit(2) }
  const exLocal = new Set([...excl].map(id => loaded.key[id].localId))
  const batch = rd(bp).filter(it => !exLocal.has(it.id)); const byId = Object.fromEntries(batch.map(it => [it.id, it]))
  const key = loaded.key, sol = loaded.sol, ids = loaded.ids.filter(id => !excl.has(id))
  if (excl.size) console.log(`SENSITIVITY RUN: excluded ${[...excl].join(',')} (${[...exLocal].join(',')}); not the primary result`)
  const blind = rd(kp.replace('.key.json', '.blind.json'))
  const arms = { candidate: [], 'live-control': [] }
  for (const id of ids) arms[key[id].kind ?? 'candidate'].push(id)
  const cand = arms.candidate.filter(id => byId[key[id].localId])
  if (cand.length !== batch.length) { console.error(`REFUSING: key holds ${cand.length} candidate items mapping to this batch, batch has ${batch.length}`); process.exit(2) }
  const line = arm => { const d = {}; for (const id of arms[arm]) d[key[id].letter] = (d[key[id].letter] ?? 0) + 1; return 100 * Math.max(...Object.values(d)) / arms[arm].length }
  const stat = {}
  for (const arm of Object.keys(arms)) {
    const n = arms[arm].length; if (!n) continue
    let hit = 0, unan = 0, certainItems = 0, keyRejected = 0
    for (const id of arms[arm]) {
      const picks = sol.map(s => String(s[id].pick).toUpperCase())
      hit += picks.filter(p => p === key[id].letter).length
      if (picks.every(p => p === key[id].letter)) unan++
      const cert = {}; for (const s of sol) if (s[id].reject_certain === true && s[id].reject) cert[String(s[id].reject).toUpperCase()] = (cert[String(s[id].reject).toUpperCase()] ?? 0) + 1
      if (Object.values(cert).some(v => v >= 2)) certainItems++
      keyRejected += sol.filter(s => String(s[id].reject ?? '').toUpperCase() === key[id].letter).length
    }
    stat[arm] = { n, hit, rate: 100 * hit / (3 * n), line: line(arm), unan, certainItems, keyRejected }
    console.log(`${arm.padEnd(13)} n=${n}  picks ${hit}/${3 * n} = ${pct(hit, 3 * n)}%  letter line ${line(arm).toFixed(1)}%  margin ${(stat[arm].rate - line(arm)).toFixed(1)}  unanimous-correct ${unan}/${n} = ${pct(unan, n)}%  >=2 certain rejects of one option ${certainItems}/${n} = ${pct(certainItems, n)}%  key rejected ${keyRejected}/${3 * n}`)
  }
  const c = stat.candidate, l = stat['live-control']
  if (!c || !l) { console.error('REFUSING: both arms are required'); process.exit(2) }
  const E = (c.rate - c.line) - (l.rate - l.line)
  console.log(`EXCESS E = ${E.toFixed(1)}  (bar <= +10)  live arm ${l.rate.toFixed(1)}% (ceiling 85%)  -> ${l.rate >= 85 ? 'SATURATED: HOLD' : E <= 10 ? 'PASS' : 'HOLD'}`)
  if (l.rate < l.line) console.log(`  live arm below its letter line: candidate vs letter line ${(c.rate - c.line).toFixed(1)}; no "better than the bank" claim`)
  const elimC = 100 * c.certainItems / c.n, elimL = 100 * l.certainItems / l.n
  console.log(`ELIMINATION candidate ${elimC.toFixed(1)}% vs live ${elimL.toFixed(1)}% (bar: candidate <= live + 10) -> ${elimC <= elimL + 10 ? 'PASS' : 'FAIL'}`)
  // pairwise agreement (reported: one solver sampled three times)
  let agree = 0, pairs = 0
  for (const id of ids) { const p = sol.map(s => String(s[id].pick).toUpperCase()); for (const [x, y] of [[0, 1], [0, 2], [1, 2]]) { pairs++; if (p[x] === p[y]) agree++ } }
  console.log(`pairwise agreement ${agree}/${pairs} = ${pct(agree, pairs)}%`)
  const { fam, keyLetter } = familyMap(batch, key, blind, cand)
  if (Object.keys(fam).length) {
    const picks = Object.fromEntries(Object.keys(fam).map(id => [id, sol.map(s => String(s[id].pick).toUpperCase())]))
    printGate(precisionGate(fam, keyLetter, picks), '')
  }
  if (cmd === 'qc') { if (excl.size) { console.error('REFUSING: qc never runs on a sensitivity subset'); process.exit(2) } qc({ a: a2, gi, bp, kp, batch, key, sol, blind, cand }) }
} else if (cmd === 'probe-render') probeRender()
else if (cmd === 'probe-triage') probeTriage()
else { console.error('usage: probe-render | probe-triage | grade-render | oo-extra | qc (see header)'); process.exit(2) }
}

function qc({ a, gi, bp, kp, batch, key, sol, blind, cand }) {
  if (gi < 0) { console.error('REFUSING: qc needs --graders gk1 g1 gk2 g2'); process.exit(2) }
  const gpaths = a.slice(gi + 1); if (gpaths.length !== 4) { console.error('REFUSING: --graders needs gk1 g1 gk2 g2'); process.exit(2) }
  const graders = [0, 2].map(j => {
    const gk = rd(gpaths[j]), g = rd(gpaths[j + 1]); const m = g.items && !Array.isArray(g.items) ? g.items : g
    const out = {}
    for (const [gid, k] of Object.entries(gk)) {
      const r = m[gid]; if (!r || !r.pick) { console.error(`REFUSING: ${gpaths[j + 1]} has no pick for ${gid}`); process.exit(2) }
      if (!['easy', 'medium', 'hard'].includes(r.difficulty)) { console.error(`REFUSING: ${gpaths[j + 1]} ${gid} difficulty '${r.difficulty}' is not easy|medium|hard`); process.exit(2) }
      if (!('tempting_distractor' in r)) { console.error(`REFUSING: ${gpaths[j + 1]} ${gid} has no tempting_distractor field`); process.exit(2) }
      out[k.localId] = { ...r, correct: k.correct_answer }
    }
    if (Object.keys(out).length !== batch.length) { console.error(`REFUSING: grader ${gpaths[j + 1]} covers ${Object.keys(out).length} of ${batch.length}`); process.exit(2) }
    return out
  })
  const certText = {}
  for (const id of cand) {
    const lid = key[id].localId; const cnt = {}
    for (const s of sol) if (s[id].reject_certain === true && s[id].reject) { const t = blind[id].options[String(s[id].reject).toUpperCase()]; cnt[t] = (cnt[t] ?? 0) + 1 }
    certText[lid] = Object.entries(cnt).filter(([, v]) => v >= 2).map(([t]) => t)
  }
  const RANK = { easy: 0, medium: 1, hard: 2 }
  const nonEmpty = v => Array.isArray(v) ? v.filter(Boolean).length > 0 : !!(v && String(v).trim() && !/^(none|null|n\/a|no|false)$/i.test(String(v).trim()))
  const qcOut = {}, kept = []
  let noTempt = 0
  for (const it of batch) {
    const rs = graders.map(g => g[it.id]); const why = []
    rs.forEach((r, j) => {
      if (r.pick !== it.correct_answer) why.push(`grader ${j + 1} picked '${r.pick}'`)
      if (nonEmpty(r.second_defensible)) why.push(`grader ${j + 1} second defensible '${r.second_defensible}'`)
      const ab = [].concat(r.above_band ?? []).filter(Boolean)
      if (ab.some(w => it.prompt.toLowerCase().includes(String(w).toLowerCase()) || it.correct_answer.toLowerCase().includes(String(w).toLowerCase()))) why.push(`grader ${j + 1} above band in stem/key: ${ab.join(', ')}`)
      if (nonEmpty(r.invalid_option)) why.push(`grader ${j + 1} invalid option '${r.invalid_option}'`)
      if (nonEmpty(r.free_identification)) why.push(`grader ${j + 1} free identification: ${r.free_identification}`)
      if (nonEmpty(r.free_elimination) && certText[it.id].some(t => String(r.free_elimination).toLowerCase().includes(t.toLowerCase()))) why.push(`grader ${j + 1} free elimination '${r.free_elimination}' + >=2 certain blind rejects`)
    })
    const ab0 = [].concat(rs[0].above_band ?? []).map(String), ab1 = [].concat(rs[1].above_band ?? []).map(String)
    const both = ab0.filter(w => ab1.some(x => x.toLowerCase() === w.toLowerCase()))
    if (both.length) why.push(`both graders above band: ${both.join(', ')}`)
    // s18-synonym easiness, per item: neither grader can name a distractor that would tempt
    if (rs.every(r => !nonEmpty(r.tempting_distractor))) { why.push('both graders: no tempting distractor (unrelated-distractor easy)'); noTempt++ }
    const diff = [rs[0].difficulty, rs[1].difficulty].sort((x, y) => RANK[x] - RANK[y])[0]
    const keep = why.length === 0
    qcOut[it.id] = { keep, key_votes: rs.filter(r => r.pick === it.correct_answer).length, difficulty: diff, exclusivity: rs.every(r => !nonEmpty(r.second_defensible)) ? 'exclusive' : 'contested', graders: rs.map(r => r.difficulty), tempting: rs.map(r => r.tempting_distractor ?? null), drop_reasons: why }
    if (keep) kept.push({ ...it, difficulty: diff })
  }
  console.log(`NO-TEMPTING-DISTRACTOR items (both graders) ${noTempt}/${batch.length} = ${pct(noTempt, batch.length)}%`)
  const dd = {}; for (const k of kept) dd[k.difficulty] = (dd[k.difficulty] ?? 0) + 1
  const easyShare = kept.length ? (dd.easy ?? 0) / kept.length : 1
  console.log(`DIFFICULTY GATE kept banked easy (easier of two labels) ${dd.easy ?? 0}/${kept.length} = ${pct(dd.easy ?? 0, kept.length)}% (bar <= ${100 * EASY_CAP}%) -> ${kept.length && easyShare <= EASY_CAP ? 'PASS' : 'HOLD'}`)
  const keptIds = new Set(kept.map(k => k.id))
  const per = [0, 1].map(j => Object.entries(qcOut).filter(([id, q]) => keptIds.has(id) && q.graders[j] === 'easy').length)
  const bothEasy = Object.entries(qcOut).filter(([id, q]) => keptIds.has(id) && q.graders.every(g => g === 'easy')).length
  console.log(`  diagnostic only: grader 1 easy ${per[0]}/${kept.length} = ${pct(per[0], kept.length)}%, grader 2 easy ${per[1]}/${kept.length} = ${pct(per[1], kept.length)}%, easy by both ${bothEasy}/${kept.length}`)
  console.log(`  all graded: grader 1 ${JSON.stringify(tally(batch.map(it => qcOut[it.id].graders[0])))}, grader 2 ${JSON.stringify(tally(batch.map(it => qcOut[it.id].graders[1])))}`)
  const byAuth = {}; for (const it of batch) { const q = qcOut[it.id]; const k = `${it.difficulty}->${q.difficulty}`; byAuth[k] = (byAuth[k] ?? 0) + 1 }
  console.log(`authored -> banked (easier label), all graded items: ${JSON.stringify(byAuth)}`)
  const qp = bp.replace('.batch.json', '.qc.json'), kp2 = bp.replace('.batch.json', '.kept.batch.json')
  writeFileSync(qp, JSON.stringify(qcOut, null, 1) + '\n'); writeFileSync(kp2, JSON.stringify(kept, null, 1) + '\n')
  console.log(`QC: kept ${kept.length}/${batch.length} ${JSON.stringify(dd)}; dropped:`)
  for (const [id, q] of Object.entries(qcOut)) if (!q.keep) console.log(`  ${id}: ${q.drop_reasons.join(' | ')}`)
  console.log(`wrote ${qp}, ${kp2}`)
}


const tally = xs => xs.reduce((o, x) => (o[x] = (o[x] ?? 0) + 1, o), {})

/* ---------- the pre-freeze probe (prereg: not a gate; one revision round) ---------- */
const PROBE_DIR = 'scripts/study-bank/ssat-verbal-s20-work/probe'
function probeRender() {
  const [bp, tag, seed] = a
  const batch = rd(bp); if (!Array.isArray(batch) || batch.length !== 75 || !tag || !seed) { console.error('usage: probe-render <batch of 75> <tag> <seed>'); process.exit(2) }
  const rand = rng(Number(seed))
  const order = shuffleWith(batch.slice(), rand)
  const render = [], pkey = {}
  order.forEach((it, i) => {
    const pid = `P${String(i + 1).padStart(2, '0')}`
    render.push({ id: pid, prompt: it.prompt, choices: shuffleWith(it.choices.slice(), rand) })
    pkey[pid] = { localId: it.id, correct_answer: it.correct_answer }
  })
  mkdirSync(PROBE_DIR, { recursive: true })
  writeFileSync(`${PROBE_DIR}/${tag}.render.json`, JSON.stringify(render, null, 1) + '\n')
  writeFileSync(`${PROBE_DIR}/${tag}.key.json`, JSON.stringify(pkey, null, 1) + '\n')
  console.log(`${tag}: ${render.length} items rendered with source (seed ${seed}) -> ${PROBE_DIR}`)
}
function probeTriage() {
  const [bp, k1, r1, k2, r2] = a
  if (!r2) { console.error('usage: probe-triage <batch> <key1> <rater1> <key2> <rater2>'); process.exit(2) }
  const batch = rd(bp); const byId = Object.fromEntries(batch.map(it => [it.id, it]))
  const none = v => !(v && String(v).trim() && !/^(none|null|n\/a|no|false)$/i.test(String(v).trim()))
  const flags = Object.fromEntries(batch.map(it => [it.id, []]))
  const raters = [[k1, r1], [k2, r2]].map(([kp, rp], j) => {
    const key = rd(kp), r = rd(rp); const m = r.items && !Array.isArray(r.items) ? r.items : r
    const ids = Object.keys(key)
    if (ids.length !== batch.length) { console.error(`REFUSING: ${kp} holds ${ids.length} items, batch ${batch.length}`); process.exit(2) }
    const miss = ids.filter(id => !m[id] || !m[id].pick || !['easy', 'medium', 'hard'].includes(m[id].difficulty) || !('tempting_distractor' in m[id]))
    if (miss.length) { console.error(`REFUSING: ${rp} lacks pick/difficulty/tempting_distractor for ${miss.length} item(s), e.g. ${miss.slice(0, 3)}`); process.exit(2) }
    const d = {}
    for (const id of ids) {
      const it = byId[key[id].localId]; if (!it) { console.error(`REFUSING: ${key[id].localId} not in batch`); process.exit(2) }
      const x = m[id], f = flags[it.id]; d[x.difficulty] = (d[x.difficulty] ?? 0) + 1
      if (x.difficulty === 'easy') f.push(`rater ${j + 1} easy`)
      if (none(x.tempting_distractor)) f.push(`rater ${j + 1} no tempting distractor`)
      if (x.pick !== it.correct_answer) f.push(`rater ${j + 1} picked '${x.pick}'`)
      if (!none(x.second_defensible)) f.push(`rater ${j + 1} second defensible '${x.second_defensible}'`)
      f.notes = [...(f.notes ?? []), `rater ${j + 1} (${x.difficulty}; tempting: ${x.tempting_distractor}): ${x.notes ?? ''}`]
    }
    console.log(`rater ${j + 1}: ${ids.length} items, difficulty ${JSON.stringify(d)}`)
    return d
  })
  const out = {}; const reason = {}
  for (const it of batch) {
    const f = flags[it.id]
    if (f.length) { out[it.id] = { reasons: [...f], probe_notes: f.notes }; for (const r of f) { const k = r.replace(/^rater \d /, '').replace(/ '.*$/, ''); reason[k] = (reason[k] ?? 0) + 1 } }
  }
  mkdirSync(PROBE_DIR, { recursive: true })
  writeFileSync(`${PROBE_DIR}/triage.json`, JSON.stringify(out, null, 1) + '\n')
  console.log(`FLAGGED for the one revision round: ${Object.keys(out).length}/${batch.length}; reason counts (per rater mention) ${JSON.stringify(reason)} -> ${PROBE_DIR}/triage.json`)
}

// last, so every module-level const above is initialised before a command runs
if (import.meta.url === `file://${process.argv[1]}`) main()
