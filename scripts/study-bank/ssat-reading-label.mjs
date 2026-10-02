#!/usr/bin/env node
/**
 * ssat-reading-label.mjs — build and score the BLIND semantic labelling used
 * by SSAT-READING-DIAGNOSIS.md. Live and rejected passages are mixed, ids are
 * anonymised, and known-answer fixtures are planted; a labeller that misses a
 * fixture is discarded before its labels are read.
 *
 *   build:  node scripts/study-bank/ssat-reading-label.mjs build <live.json> <outdir>
 *   score:  node scripts/study-bank/ssat-reading-label.mjs score <outdir> <labels.json>...
 *   cross:  node scripts/study-bank/ssat-reading-label.mjs cross <outdir> <labels-R.json> <solve-iso.json>...
 *
 * Task S (solve): an isolated-item options-only solve on taskF; Task C (form): key-blind claim count and
 *   first/second-order per option. Evidence used by the diagnosis lives in ssat-reading-diag/.
 *
 * Task R (relation, WITH passage): for every wrong option, how does it relate
 *   to the passage? NAMED_RULED_OUT | NAMED_MINOR | DISTORTS | NOT_IN_PASSAGE
 *   and for the key: CONCRETE | INTERPRETIVE.
 * Task F (flaw, NO passage, items shuffled across passages, key NOT marked):
 *   for every option, does the option ITSELF, read with the stem only, carry
 *   a mark that it is wrong? The key/distractor split is applied at scoring.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const HERE = dirname(fileURLToPath(import.meta.url))

// deterministic PRNG so the sample and the shuffles are reproducible
let seed = 20261002
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));[b[i], b[j]] = [b[j], b[i]] } return b }
const L = 'ABCDE'
const isVocab = s => String(s).toLowerCase().startsWith('vocab')

// ── fixtures with known answers ────────────────────────────────────────
const FIX_R = [{
  pid: 'FIX-R1', passage: 'The council had three ways to pay for the bridge: a toll, a bond, or a grant from the state. The toll was rejected at once, because no driver would pay it. The bond needed a vote, and no vote was held. In the end the grant came through in March, and the bridge opened in May. The old ferry, which had carried the town for sixty years, was sold the same week.',
  items: [{ qid: 'FIX-R1-1', prompt: 'The bridge was paid for by', key: 'a grant from the state',
    distractors: ['a toll charged to drivers', 'a bond approved by vote', 'the sale of the ferry', 'a gift from a shipping company'],
    expect: ['NAMED_RULED_OUT', 'NAMED_RULED_OUT', 'DISTORTS', 'NOT_IN_PASSAGE'], expectKey: 'CONCRETE' }],
}]
const FIX_F = [
  { qid: 'FIX-F1', prompt: 'The narrator\'s attitude toward her uncle at the end is best described as',
    options: ['anger she recognizes as unfair', 'gratitude that all uncles everywhere are always generous', 'relief that the argument is over', 'pride in a choice she had opposed', 'unease about the winter'], flawed: [1] },
  { qid: 'FIX-F2', prompt: 'According to the passage, the crew weighed every twentieth chick in order to',
    options: ['check whether chicks on the two slopes were equally fed', 'win a prize for the heaviest seabird ever recorded', 'sell the chicks to a mainland zoo', 'compare chick weight across the two slopes', 'test the accuracy of a new scale'], flawed: [1, 2] },
]

function load(names) {
  const out = []
  for (const n of names) for (const r of JSON.parse(readFileSync(join(HERE, `ssat-reading-${n}.batch.json`), 'utf8')))
    out.push({ group: `${n}:${r.set_id}`, pop: n.startsWith('r9') ? 'r1' : 'r2', subskill: r.subskill, passage: r.passage, prompt: r.prompt, choices: r.choices, key: r.correct_answer })
  return out
}
const groupBy = (a, f) => { const g = {}; for (const x of a) (g[f(x)] ??= []).push(x); return g }

function build(liveFile, outdir) {
  mkdirSync(outdir, { recursive: true })
  const live = JSON.parse(readFileSync(liveFile, 'utf8')).map(r => ({ group: r.passage_group_id, pop: 'live', cohort: r.cohort, subskill: r.subskill, passage: r.item.passage, prompt: r.item.prompt, choices: r.item.choices, key: r.item.correct_answer }))
  const lg = groupBy(live, x => x.group)
  const pickLive = (cohort, n) => Object.values(lg).filter(g => g[0].cohort === cohort && g.length >= 4).sort((a, b) => b.length - a.length || a[0].group.localeCompare(b[0].group)).slice(0, n)
  const liveSel = [...pickLive('ssat-reading-worlds-s4', 5), ...pickLive('ssat-reading-worlds-s3', 3), ...pickLive('ssat-reading-worlds-s2', 2)]
  const rg = Object.values(groupBy([...load(['r9a', 'r9b', 'r9c']), ...load(['ra', 'rb', 'rc'])], x => x.group))
  const take = (pop, n) => shuffle(rg.filter(g => g[0].pop === pop)).slice(0, n)
  const rejSel = [...take('r1', 5), ...take('r2', 5)]
  const groups = shuffle([...liveSel, ...rejSel])
  const key = {}, taskR = [], fItems = []
  groups.forEach((g, gi) => {
    const pid = `P${String(gi + 1).padStart(2, '0')}`
    key[pid] = { pop: g[0].pop, group: g[0].group, cohort: g[0].cohort ?? null }
    const items = g.filter(x => !isVocab(x.subskill)).map((x, i) => {
      const qid = `${pid}-${i + 1}`
      key[qid] = { pop: g[0].pop, subskill: x.subskill }
      const ds = shuffle(x.choices.filter(c => c !== x.key))
      key[qid].distractors = ds
      const opts = shuffle(x.choices)
      fItems.push({ qid, prompt: x.prompt, options: Object.fromEntries(opts.map((c, j) => [L[j], c])) })
      key[qid].fKey = L[opts.indexOf(x.key)]
      return { qid, prompt: x.prompt, key: x.key, distractors: ds }
    })
    taskR.push({ pid, passage: g[0].passage, items })
  })
  // plant fixtures at fixed pseudo-random positions
  const R = [...taskR]; R.splice(7, 0, ...FIX_R.map(f => ({ pid: f.pid, passage: f.passage, items: f.items.map(({ qid, prompt, key, distractors }) => ({ qid, prompt, key, distractors })) })))
  const F = shuffle([...fItems, ...FIX_F.map(({ qid, prompt, options }) => ({ qid, prompt, options: Object.fromEntries(options.map((c, j) => [L[j], c])) }))])
  writeFileSync(join(outdir, 'taskR.json'), JSON.stringify(R, null, 1))
  writeFileSync(join(outdir, 'taskF.json'), JSON.stringify(F, null, 1))
  writeFileSync(join(outdir, 'label.key.json'), JSON.stringify(key, null, 1))
  console.log(`built: ${groups.length} passages (${liveSel.length} live, ${rejSel.length} rejected), ${fItems.length} non-vocab items, + ${FIX_R.length} R-fixture, ${FIX_F.length} F-fixtures`)
}

const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN
function score(outdir, files) {
  const key = JSON.parse(readFileSync(join(outdir, 'label.key.json'), 'utf8'))
  for (const f of files) {
    const lab = JSON.parse(readFileSync(f, 'utf8'))
    console.log(`\n== ${f.replace(/^.*\//, '')}`)
    if (lab.task === 'R') {
      // fixture first
      const fx = FIX_R[0].items[0], got = lab.labels[fx.qid]
      if (!got) { console.error('REFUSING: fixture unlabelled'); process.exit(2) }
      const hit = fx.expect.filter((e, i) => got.distractors?.[i] === e).length
      const fxOk = hit >= 3 && got.key === fx.expectKey
      console.log(`  known-answer: ${hit}/4 distractor labels, key ${got.key} (expect ${fx.expectKey}) -> ${fxOk ? 'PASS' : 'FAIL, labels discarded'}`)
      if (!fxOk) continue
      const agg = {}
      let n = 0
      for (const [qid, v] of Object.entries(lab.labels)) {
        if (!key[qid] || !Array.isArray(v.distractors)) continue
        n++
        const p = key[qid].pop === 'live' ? 'live' : 'rejected'
        const a = (agg[p] ??= { items: 0, d: {}, key: {} })
        a.items++
        for (const d of v.distractors) a.d[d] = (a.d[d] ?? 0) + 1
        a.key[v.key] = (a.key[v.key] ?? 0) + 1
      }
      if (!n) { console.error('REFUSING: zero scorable items'); process.exit(2) }
      for (const [p, a] of Object.entries(agg)) {
        const dn = Object.values(a.d).reduce((x, y) => x + y, 0)
        console.log(`  ${p.padEnd(9)} items ${a.items}  distractors ${dn}: ` + Object.entries(a.d).sort().map(([k, c]) => `${k} ${(100 * c / dn).toFixed(1)}%`).join('  ') + `   key: ` + Object.entries(a.key).map(([k, c]) => `${k} ${c}`).join(' '))
      }
    } else if (lab.task === 'F') {
      let fxOk = true
      for (const fx of FIX_F) {
        const got = new Set(lab.labels[fx.qid] ?? ['?'])
        const want = new Set(fx.flawed.map(i => L[i]))
        const ok = [...want].every(x => got.has(x)) && got.size <= want.size + 1
        if (!ok) fxOk = false
        console.log(`  known-answer ${fx.qid}: flagged [${[...got]}] want [${[...want]}] ${ok ? 'ok' : 'MISS'}`)
      }
      if (!fxOk) { console.log('  -> FAIL, labels discarded'); continue }
      const agg = {}
      for (const [qid, flagged] of Object.entries(lab.labels)) {
        if (!key[qid]?.fKey) continue
        const p = key[qid].pop === 'live' ? 'live' : 'rejected'
        const a = (agg[p] ??= { items: 0, keyFlag: 0, distFlag: [], allFourDist: 0, decided: 0 })
        const fl = new Set(flagged)
        a.items++
        if (fl.has(key[qid].fKey)) a.keyFlag++
        const dflag = [...L].filter(x => x !== key[qid].fKey && fl.has(x)).length
        a.distFlag.push(dflag)
        if (dflag === 4) a.allFourDist++
        // "decided": exactly one option left unflagged and it is the key
        if (fl.size === 4 && !fl.has(key[qid].fKey)) a.decided++
      }
      for (const [p, a] of Object.entries(agg))
        console.log(`  ${p.padEnd(9)} items ${a.items}  key flagged ${(100 * a.keyFlag / a.items).toFixed(1)}%  distractors flagged/item ${mean(a.distFlag).toFixed(2)} of 4  all-4-flagged ${(100 * a.allFourDist / a.items).toFixed(1)}%  stem+option alone decides ${(100 * a.decided / a.items).toFixed(1)}%`)
    } else if (lab.task === 'C') {
      // option form, key-blind. Known answer: FIX-F1 option A "anger she recognizes as unfair" must outscore a one-word feeling.
      // The `moves` fixture (C = 1 move) was mis-specified by the author: "relief that a long argument is over"
      // is two claims, and labeller A said so. Rather than re-fit the fixture after seeing the answer, the
      // moves dimension is reported as UNVALIDATED and only `order` (A=2nd-order, C=1st-order) gates.
      const fx = lab.labels['FIX-F1']
      const orderOk = fx && fx.A[1] === 2 && fx.C[1] === 1
      const movesOk = fx && fx.A[0] >= 2 && fx.C[0] === 1
      console.log(`  known-answer FIX-F1: A=${JSON.stringify(fx?.A)} C=${JSON.stringify(fx?.C)} -> order ${orderOk ? 'PASS' : 'FAIL'}, moves ${movesOk ? 'PASS' : 'FAIL (moves columns UNVALIDATED)'}`)
      if (!orderOk) { console.log('  -> labels discarded'); continue }
      const solveFiles = files.filter(x => /solve-iso/.test(x)).map(x => JSON.parse(readFileSync(x, 'utf8')).labels)
      const agg = {}
      for (const [qid, v] of Object.entries(lab.labels)) {
        const k = key[qid]; if (!k?.fKey) continue
        const p = k.pop === 'live' ? 'live' : 'rejected'
        const a = (agg[p] ??= { n: 0, uniqMoves: 0, uniqOrder2: 0, keyMoves: [], distMoves: [], order2Key: 0, order2Dist: [], spread: [], solveIfUniq: [], solveIfNot: [] })
        a.n++
        const ks = v[k.fKey]; const ds = [...L].filter(x => x !== k.fKey).map(x => v[x]).filter(Boolean)
        const uniqM = ds.every(d => d[0] < ks[0]); const uniqO = ks[1] === 2 && ds.every(d => d[1] === 1)
        a.uniqMoves += uniqM; a.uniqOrder2 += uniqO
        a.keyMoves.push(ks[0]); a.distMoves.push(mean(ds.map(d => d[0])))
        a.order2Key += ks[1] === 2; a.order2Dist.push(ds.filter(d => d[1] === 2).length)
        const all = [...L].map(x => v[x][0]); a.spread.push(Math.max(...all) - Math.min(...all))
        for (const S of solveFiles) (uniqM || uniqO ? a.solveIfUniq : a.solveIfNot).push(S[qid]?.pick === k.fKey ? 1 : 0)
      }
      for (const [p, a] of Object.entries(agg))
        console.log(`  ${p.padEnd(9)} n=${a.n}  key uniquely most moves ${(100 * a.uniqMoves / a.n).toFixed(1)}%  key uniquely second-order ${(100 * a.uniqOrder2 / a.n).toFixed(1)}%  key moves ${mean(a.keyMoves).toFixed(2)} vs distractor ${mean(a.distMoves).toFixed(2)}  key 2nd-order ${(100 * a.order2Key / a.n).toFixed(1)}%  2nd-order distractors/item ${mean(a.order2Dist).toFixed(2)}  moves spread ${mean(a.spread).toFixed(2)}` +
          (solveFiles.length ? `\n            isolated solve when key is uniquely complex ${(100 * mean(a.solveIfUniq)).toFixed(1)}% (picks n=${a.solveIfUniq.length}) vs otherwise ${(100 * mean(a.solveIfNot)).toFixed(1)}% (n=${a.solveIfNot.length})` : ''))
    } else if (lab.task === 'S') {
      // isolated-item blind solve on taskF (no passage, no siblings adjacent)
      const agg = {}
      for (const [qid, v] of Object.entries(lab.labels)) {
        if (!key[qid]?.fKey) continue
        const p = key[qid].pop
        const a = (agg[p] ??= { n: 0, hit: 0, basis: {}, byStratum: {} })
        a.n++; const h = v.pick === key[qid].fKey ? 1 : 0; a.hit += h
        const b = (a.basis[v.basis] ??= [0, 0]); b[0]++; b[1] += h
        const s = String(key[qid].subskill).split(/[-/ ]/)[0]
        const t = (a.byStratum[s] ??= [0, 0]); t[0]++; t[1] += h
      }
      if (!Object.keys(agg).length) { console.error('REFUSING: zero scorable items'); process.exit(2) }
      for (const [p, a] of Object.entries(agg)) {
        console.log(`  ${p.padEnd(5)} ${a.hit}/${a.n} = ${(100 * a.hit / a.n).toFixed(1)}%  (control 20.0%)`)
        console.log(`        basis: ` + Object.entries(a.basis).map(([k, [n, h]]) => `${k} ${h}/${n}`).join('  '))
        console.log(`        stratum: ` + Object.entries(a.byStratum).map(([k, [n, h]]) => `${k} ${h}/${n}`).join('  '))
      }
    } else { console.error(`REFUSING ${f}: no task field`); process.exit(2) }
  }
}

/** Item-level join: relation labels x isolated-solve hits, by population and live cohort. */
function cross(outdir, rFile, sFiles) {
  const key = JSON.parse(readFileSync(join(outdir, 'label.key.json'), 'utf8'))
  const R = JSON.parse(readFileSync(rFile, 'utf8')).labels
  const Ss = sFiles.map(f => JSON.parse(readFileSync(f, 'utf8')).labels)
  const cell = {}
  const add = (k, hit) => { const c = (cell[k] ??= [0, 0]); c[0]++; c[1] += hit }
  let n = 0
  for (const [qid, r] of Object.entries(R)) {
    const k = key[qid]; if (!k?.fKey) continue
    const pid = qid.split('-')[0]
    const coh = key[pid].cohort ? key[pid].cohort.replace('ssat-reading-worlds-', 'live-') : k.pop
    const hit = mean(Ss.map(S => (S[qid]?.pick === k.fKey ? 1 : 0)))
    const ro = r.distractors.filter(d => d === 'NAMED_RULED_OUT').length
    n++
    add(`${coh} all`, hit)
    add(`${coh === k.pop ? 'rejected' : 'live'} key=${r.key}`, hit)
    add(`${coh === k.pop ? 'rejected' : 'live'} ruled-out>=3 ${ro >= 3}`, hit)
    add(`ANY key=${r.key} ruled-out>=3 ${ro >= 3}`, hit)
    ;(cell[`dist ${coh}`] ??= {}); for (const d of r.distractors) cell[`dist ${coh}`][d] = (cell[`dist ${coh}`][d] ?? 0) + 1
  }
  if (!n) { console.error('REFUSING: zero joined items'); process.exit(2) }
  for (const [k, v] of Object.entries(cell).sort())
    console.log(Array.isArray(v) ? `  ${k.padEnd(40)} solve ${(100 * v[1] / v[0]).toFixed(1)}%  n=${v[0]}` : `  ${k.padEnd(40)} ${JSON.stringify(v)}`)
}

const [cmd, ...rest] = process.argv.slice(2)
if (cmd === 'cross') cross(rest[0], rest[1], rest.slice(2))
else if (cmd === 'build') build(rest[0], rest[1])
else if (cmd === 'score') score(rest[0], rest.slice(1))
else { console.error('usage: build <live.json> <outdir> | score <outdir> <labels.json>...'); process.exit(2) }
