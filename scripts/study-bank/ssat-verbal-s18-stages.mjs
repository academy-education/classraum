#!/usr/bin/env node
/**
 * ssat-verbal-s18-stages.mjs — the post-freeze stages of ssat-verbal-s18
 * (rules fixed in ssat-verbal-s18.prereg.md before any item existed).
 *
 *   grade-render <batch.json> <tag> <seed>
 *       unmarked with-source render: items and options re-shuffled, ids renumbered
 *       G01..; writes <tag>.grade.json (no key) and <tag>.gradekey.json
 *   oo-extra <batch.json> <tag>-oo.key.json <solver.json x3>
 *       what score-oo.mjs does not print: per-arm E, unanimity rate per arm,
 *       certain-rejection (elimination) rates per arm, and (analogies) the per-family
 *       options-only hit rate on the items each family KEYS (hold at >= 9/12)
 *   qc <batch.json> <tag>-oo.key.json <solvers x3> --graders <gk1> <g1> <gk2> <g2>
 *       applies the per-item drop rules; writes <batch>.qc.json and <batch>.kept.batch.json
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
const [cmd, ...a] = process.argv.slice(2)

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
  const elimC = 100 * c.certainItems / c.n, elimL = 100 * l.certainItems / l.n
  console.log(`ELIMINATION candidate ${elimC.toFixed(1)}% vs live ${elimL.toFixed(1)}% (bar: candidate <= live + 10) -> ${elimC <= elimL + 10 ? 'PASS' : 'FAIL'}`)
  const fams = {}
  for (const id of cand) {
    const it = byId[key[id].localId]; if (it.kind !== 'analogy') continue
    const f = it.stem_relation
    if (!f) { console.error(`REFUSING: analogy ${it.id} has no stem_relation; the family gate cannot be computed`); process.exit(2) }
    const h = sol.filter(s => String(s[id].pick).toUpperCase() === key[id].letter).length
    fams[f] = fams[f] ?? { h: 0, n: 0 }; fams[f].h += h; fams[f].n += 3
  }
  if (Object.keys(fams).length) {
    const worst = Object.entries(fams).sort((x, y) => y[1].h - x[1].h)
    console.log('PER-FAMILY options-only hit on keyed items (hold at >= 9 of 12):')
    for (const [f, v] of worst) console.log(`  ${f.padEnd(28)} ${v.h}/${v.n} = ${pct(v.h, v.n)}%${v.h >= 9 ? '  <- HOLD' : ''}`)
    console.log(`  => ${worst.some(([, v]) => v.h >= 9) ? 'FAMILY GATE HOLD' : 'FAMILY GATE PASS'}`)
  }
  if (cmd === 'qc') {
    if (gi < 0) { console.error('REFUSING: qc needs --graders gk1 g1 gk2 g2'); process.exit(2) }
    const gpaths = a.slice(gi + 1); if (gpaths.length !== 4) { console.error('REFUSING: --graders needs gk1 g1 gk2 g2'); process.exit(2) }
    const graders = [0, 2].map(j => {
      const gk = rd(gpaths[j]), g = rd(gpaths[j + 1]); const m = g.items && !Array.isArray(g.items) ? g.items : g
      const out = {}
      for (const [gid, k] of Object.entries(gk)) {
        const r = m[gid]; if (!r || !r.pick) { console.error(`REFUSING: ${gpaths[j + 1]} has no pick for ${gid}`); process.exit(2) }
        out[k.localId] = { ...r, correct: k.correct_answer }
      }
      if (Object.keys(out).length !== batch.length) { console.error(`REFUSING: grader ${gpaths[j + 1]} covers ${Object.keys(out).length} of ${batch.length}`); process.exit(2) }
      return out
    })
    // blind certain rejections per candidate item, as option TEXT
    const certText = {}
    const ooOf = rd(kp.replace('.key.json', '.blind.json'))
    for (const id of cand) {
      const lid = key[id].localId; const cnt = {}
      for (const s of sol) if (s[id].reject_certain === true && s[id].reject) { const t = ooOf[id].options[String(s[id].reject).toUpperCase()]; cnt[t] = (cnt[t] ?? 0) + 1 }
      certText[lid] = Object.entries(cnt).filter(([, v]) => v >= 2).map(([t]) => t)
    }
    const RANK = { easy: 0, medium: 1, hard: 2 }
    const nonEmpty = v => Array.isArray(v) ? v.filter(Boolean).length > 0 : !!(v && String(v).trim() && !/^(none|null|n\/a|no)$/i.test(String(v).trim()))
    const qc = {}, kept = []
    let antonymItems = 0
    for (const it of batch) {
      const rs = graders.map(g => g[it.id]); const why = []
      rs.forEach((r, j) => {
        if (r.pick !== it.correct_answer) why.push(`grader ${j + 1} picked '${r.pick}'`)
        if (nonEmpty(r.second_defensible)) why.push(`grader ${j + 1} second defensible '${r.second_defensible}'`)
        const ab = [].concat(r.above_band ?? []).filter(Boolean)
        if (ab.some(w => it.prompt.toLowerCase().includes(String(w).toLowerCase()) || it.correct_answer.toLowerCase().includes(String(w).toLowerCase()))) why.push(`grader ${j + 1} above band in stem/key: ${ab.join(', ')}`)
        if (it.kind === 'analogy' && nonEmpty(r.invalid_option)) why.push(`grader ${j + 1} invalid option '${r.invalid_option}'`)
        if (it.kind === 'analogy' && nonEmpty(r.free_identification)) why.push(`grader ${j + 1} free identification: ${r.free_identification}`)
        if (nonEmpty(r.free_elimination) && certText[it.id].some(t => String(r.free_elimination).toLowerCase().includes(t.toLowerCase()))) why.push(`grader ${j + 1} free elimination '${r.free_elimination}' + >=2 certain blind rejects`)
      })
      const ab0 = [].concat(rs[0].above_band ?? []).map(String), ab1 = [].concat(rs[1].above_band ?? []).map(String)
      const both = ab0.filter(w => ab1.some(x => x.toLowerCase() === w.toLowerCase()))
      if (both.length) why.push(`both graders above band: ${both.join(', ')}`)
      if (it.kind === 'synonym' && rs.some(r => nonEmpty(r.antonym_option))) antonymItems++
      const diff = [rs[0].difficulty, rs[1].difficulty].filter(d => d in RANK).sort((x, y) => RANK[x] - RANK[y])[0] ?? it.difficulty
      const keep = why.length === 0
      qc[it.id] = { keep, key_votes: rs.filter(r => r.pick === it.correct_answer).length, difficulty: diff, exclusivity: rs.every(r => !nonEmpty(r.second_defensible)) ? 'exclusive' : 'contested', graders: rs.map(r => r.difficulty), drop_reasons: why }
      if (keep) kept.push({ ...it, difficulty: diff })
    }
    const nSyn = batch.filter(it => it.kind === 'synonym').length
    if (nSyn) console.log(`ANTONYM-OPTION items ${antonymItems}/${nSyn} = ${pct(antonymItems, nSyn)}% (bar <= 25%) -> ${antonymItems / nSyn <= 0.25 ? 'PASS' : 'FAIL'}`)
    const qp = bp.replace('.batch.json', '.qc.json'), kp2 = bp.replace('.batch.json', '.kept.batch.json')
    writeFileSync(qp, JSON.stringify(qc, null, 1) + '\n'); writeFileSync(kp2, JSON.stringify(kept, null, 1) + '\n')
    const dd = {}; for (const k of kept) dd[k.difficulty] = (dd[k.difficulty] ?? 0) + 1
    console.log(`QC: kept ${kept.length}/${batch.length} ${JSON.stringify(dd)}; dropped:`)
    for (const [id, q] of Object.entries(qc)) if (!q.keep) console.log(`  ${id}: ${q.drop_reasons.join(' | ')}`)
    console.log(`wrote ${qp}, ${kp2}`)
  }
} else { console.error('usage: grade-render | oo-extra | qc (see header)'); process.exit(2) }
