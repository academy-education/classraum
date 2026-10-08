#!/usr/bin/env node
/**
 * ssat-verbal-s19-stages.mjs — the post-freeze stages of ssat-verbal-s19-ana
 * (rules fixed in ssat-verbal-s19.prereg.md before any item existed).
 * Adapted from ssat-verbal-s18-stages.mjs; what changed is the FAMILY GATE and
 * the grader's difficulty / tempting-distractor rules.
 *
 *   grade-render <batch.json> <tag> <seed>
 *       unmarked with-source render (items and options re-shuffled, ids G01..);
 *       writes <tag>.grade.json (no key) and <tag>.gradekey.json
 *   oo-extra <batch.json> <tag>-oo.key.json <solver.json x3>
 *       per-arm E, unanimity, elimination, and the PRECISION family gate
 *   qc <batch.json> <tag>-oo.key.json <solvers x3> --graders <gk1> <g1> <gk2> <g2>
 *       per-item drop rules + the difficulty gate; writes <batch>.qc.json and
 *       <batch>.kept.batch.json
 *   gate-breaktest <s18 batch> <s18 key> <s18 solvers x3>
 *       the break-test the prereg requires before it is committed: the precision
 *       gate on s18 as measured, on 1,000 simulated pure-habit solvers, and on
 *       planted leaks
 *
 * THE PRECISION FAMILY GATE (why it replaced s18's >= 9/12 keyed-item rule).
 * s18 conditioned on the items a family KEYS. A family the solver favours when it
 * has no signal ("worker:product is a common SSAT relation") inflates its own
 * keyed-item rate, so the s18 rule could not tell a prior from a leak. Precision
 * asks the question that separates them: of the picks that landed on an option of
 * family f, what share were the key? A habit picks f regardless of keyness, so its
 * precision sits at f's base rate (the share of f's appearances that are keyed,
 * 20% by design); a leak picks f WHEN it is the key, so precision rises.
 * Significance is a permutation test over which of f's items are keyed — the
 * picks stay exactly as the three correlated samples made them, so the test needs
 * no independence assumption about the samples.
 *
 * Refuses (exit 2) on empty or mismatched input rather than printing a number.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const rd = p => {
  if (!existsSync(p)) { console.error(`REFUSING: ${p} missing`); process.exit(2) }
  try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) }
}
const SL = ['A', 'B', 'C', 'D', 'E']
const pct = (k, n) => n ? (100 * k / n).toFixed(1) : 'n/a'

/* ---------- the gate: fixed in the prereg ---------- */
export const GATE = { minPicks: 6, minLift: 10, familywiseAlpha: 0.05, perms: 20000, seed: 20261109 }

/**
 * fam: { [lid]: { A: family, ..., E: family } }, keyLetter: { [lid]: 'A'..'E' },
 * picks: { [lid]: ['A','C','A'] } (one letter per sample). Returns per-family rows
 * and the verdict. Base rate and alpha are derived from the data (number of
 * families present), never a literal.
 */
export function precisionGate(fam, keyLetter, picks, opt = {}) {
  const g = { ...GATE, ...opt }
  const ids = Object.keys(fam)
  if (!ids.length) throw new Error('precisionGate: no items')
  const families = [...new Set(ids.flatMap(id => Object.values(fam[id])))].sort()
  const alpha = g.familywiseAlpha / families.length
  const rand = rng(g.seed)
  const rows = families.map(f => {
    const items = ids.filter(id => Object.values(fam[id]).includes(f))
    const keyed = items.filter(id => fam[id][keyLetter[id]] === f)
    const c = items.map(id => picks[id].filter(p => fam[id][p] === f).length)
    const keyedSet = new Set(keyed)
    const P = c.reduce((s, x) => s + x, 0)
    const C = items.reduce((s, id, i) => s + (keyedSet.has(id) ? c[i] : 0), 0)
    const base = keyed.length / items.length
    // permutation null: picks fixed, the keyed subset exchangeable among f's items
    let ge = 0
    const arr = c.slice(), n = arr.length, k = keyed.length
    for (let r = 0; r < g.perms; r++) {
      let s = 0
      for (let i = 0; i < k; i++) { const j = i + Math.floor(rand() * (n - i)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; s += arr[i] }
      if (s >= C) ge++
    }
    const p = (ge + 1) / (g.perms + 1)
    const prec = P ? C / P : null
    const measured = P >= g.minPicks
    const fires = measured && prec !== null && 100 * (prec - base) >= g.minLift && p <= alpha
    return { family: f, items: items.length, keyed: k, P, C, base, prec, p, measured, fires, keyedHit: C, keyedPicks: 3 * k }
  })
  return { rows, alpha, families: families.length, hold: rows.some(r => r.fires) }
}
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
if (import.meta.url === `file://${process.argv[1]}`) main()

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
  const gi = a.indexOf('--graders')
  const pos = gi >= 0 ? a.slice(0, gi) : a
  const [bp, kp, ...sp] = pos
  const batch = rd(bp); const byId = Object.fromEntries(batch.map(it => [it.id, it]))
  const { key, ids, sol } = loadSolvers(kp, sp)
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
  if (cmd === 'qc') qc({ a, gi, bp, kp, batch, key, sol, blind, cand })
} else if (cmd === 'gate-breaktest') breaktest()
else { console.error('usage: grade-render | oo-extra | qc | gate-breaktest (see header)'); process.exit(2) }
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
  console.log(`DIFFICULTY GATE kept banked easy ${dd.easy ?? 0}/${kept.length} = ${pct(dd.easy ?? 0, kept.length)}% (bar <= 40%) -> ${easyShare <= 0.40 ? 'PASS' : 'HOLD'}`)
  const byAuth = {}; for (const it of batch) { const q = qcOut[it.id]; const k = `${it.difficulty}->${q.difficulty}`; byAuth[k] = (byAuth[k] ?? 0) + 1 }
  console.log(`authored -> banked (easier label), all graded items: ${JSON.stringify(byAuth)}`)
  const qp = bp.replace('.batch.json', '.qc.json'), kp2 = bp.replace('.batch.json', '.kept.batch.json')
  writeFileSync(qp, JSON.stringify(qcOut, null, 1) + '\n'); writeFileSync(kp2, JSON.stringify(kept, null, 1) + '\n')
  console.log(`QC: kept ${kept.length}/${batch.length} ${JSON.stringify(dd)}; dropped:`)
  for (const [id, q] of Object.entries(qcOut)) if (!q.keep) console.log(`  ${id}: ${q.drop_reasons.join(' | ')}`)
  console.log(`wrote ${qp}, ${kp2}`)
}

/* ---------- break-test (prereg: run on s18's files before the prereg is committed) ---------- */
function breaktest() {
  const [bp, kp, ...sp] = a
  const batch = rd(bp)
  const { key, sol } = loadSolvers(kp, sp)
  const blind = rd(kp.replace('.key.json', '.blind.json'))
  const cand = Object.keys(key).filter(id => key[id].kind === 'candidate')
  if (cand.length !== batch.length) { console.error(`REFUSING: ${cand.length} candidate keys vs ${batch.length} items`); process.exit(2) }
  const { fam, keyLetter } = familyMap(batch, key, blind, cand)
  const real = Object.fromEntries(cand.map(id => [id, sol.map(s => String(s[id].pick).toUpperCase())]))
  console.log(`== 1. s18 as measured (n=${cand.length} items x 3 samples = ${3 * cand.length} picks)`)
  const g1 = precisionGate(fam, keyLetter, real); printGate(g1, '')

  // 2. pure habit: a synthetic solver that never sees keyness. Per-family pick
  // propensity = s18's picks of that family / its appearances (the measured habit,
  // creator/creation's and worker/tool's included); one latent pick per item, each
  // sample copies it with probability rho, chosen so pairwise agreement matches s18.
  const fams = [...new Set(cand.flatMap(id => Object.values(fam[id])))]
  const w = {}
  for (const f of fams) { let P = 0, pres = 0; for (const id of cand) { const L = Object.keys(fam[id]).find(x => fam[id][x] === f); if (!L) continue; pres += 3; P += real[id].filter(p => p === L).length } w[f] = (P + 0.5) / (pres + 0.5) }
  let ag = 0, pr = 0; for (const id of cand) for (const [x, y] of [[0, 1], [0, 2], [1, 2]]) { pr++; if (real[id][x] === real[id][y]) ag++ }
  const target = ag / pr
  const draw = (id, rand) => { const Ls = Object.keys(fam[id]); const ws = Ls.map(L => w[fam[id][L]]); let u = rand() * ws.reduce((s, x) => s + x, 0); for (let i = 0; i < Ls.length; i++) { u -= ws[i]; if (u <= 0) return Ls[i] } return Ls.at(-1) }
  const simulate = (rho, rand) => Object.fromEntries(cand.map(id => { const lat = draw(id, rand); return [id, [0, 1, 2].map(() => rand() < rho ? lat : draw(id, rand))] }))
  let rho = 0, best = 9
  for (let r = 0; r <= 1.0001; r += 0.05) { const rand = rng(77); let a2 = 0, p2 = 0; for (let t = 0; t < 20; t++) { const s = simulate(r, rand); for (const id of cand) for (const [x, y] of [[0, 1], [0, 2], [1, 2]]) { p2++; if (s[id][x] === s[id][y]) a2++ } } if (Math.abs(a2 / p2 - target) < best) { best = Math.abs(a2 / p2 - target); rho = r } }
  const SIMS = 1000
  // rho as measured on s18, and rho 0.6 (~69-72% pairwise agreement, the level
  // CLAUDE.md measured on three other runs): correlated samples are the case a
  // pick-count test gets wrong, so the null is run at both.
  for (const [label, r0] of [['s18 agreement', rho], ['high agreement', 0.6]]) {
    const rand = rng(4242)
    let fired = 0, famFires = {}, a3 = 0, p3 = 0, oldFired = 0
    for (let t = 0; t < SIMS; t++) {
      const s = simulate(r0, rand)
      if (t < 50) for (const id of cand) for (const [x, y] of [[0, 1], [0, 2], [1, 2]]) { p3++; if (s[id][x] === s[id][y]) a3++ }
      const g = precisionGate(fam, keyLetter, s, { perms: 2000, seed: 1000 + t })
      if (g.hold) { fired++; for (const r of g.rows) if (r.fires) famFires[r.family] = (famFires[r.family] ?? 0) + 1 }
      if (g.rows.some(r => r.keyedHit >= 0.75 * r.keyedPicks)) oldFired++
    }
    console.log(`\n== 2. pure habit (${label}): ${SIMS} simulated batches, s18 family propensities, rho ${r0.toFixed(2)} -> simulated pairwise agreement ${pct(a3, p3)}% (s18 measured ${(100 * target).toFixed(1)}%)`)
    console.log(`  gate fired on ${fired}/${SIMS} = ${pct(fired, SIMS)}% (must be <= 5%)  by family ${JSON.stringify(famFires)}`)
    console.log(`  for contrast, s18's rule (any family keyed-hit >= 75%) fired on ${oldFired}/${SIMS} = ${pct(oldFired, SIMS)}%`)
  }

  // 3. planted leaks: on every item a family KEYS, n of the 3 samples are moved to
  // the key; every other pick (the habit, on that family's non-keyed items too) is left
  // exactly as s18 measured it. That is the marginal case: the leak has to show
  // through the family's own habit picks.
  console.log('\n== 3. planted leaks (habit picks left in place)')
  const res = {}
  for (const n of [3, 2]) {
    let fires = 0
    for (const f of fams) {
      const pk = Object.fromEntries(cand.map(id => [id, real[id].slice()]))
      for (const id of cand) if (fam[id][keyLetter[id]] === f) for (let j = 0; j < n; j++) pk[id][j] = keyLetter[id]
      const g = precisionGate(fam, keyLetter, pk)
      const row = g.rows.find(r => r.family === f)
      const ok = row.fires
      if (ok) fires++
      res[`${f} ${n}/3`] = `${row.C}/${row.P} = ${(100 * row.prec).toFixed(1)}% p ${row.p.toFixed(4)} ${ok ? 'FIRES' : 'silent'}`
    }
    console.log(`  ${n}/3 samples on the key of every item the family keys: the planted family fires in ${fires}/${fams.length} families`)
  }
  for (const [k, v] of Object.entries(res)) console.log(`    ${k.padEnd(34)} ${v}`)
}
