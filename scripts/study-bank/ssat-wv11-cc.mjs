#!/usr/bin/env node
/**
 * ssat-wv11-cc.mjs — the CONSISTENCY CHANNEL, measured (REPORT-ONLY, never a gate).
 * READING-BATCH-WV11-2026-10-11.prereg.md §"Report-only: the consistency channel".
 *
 * The hypothesis (READING-BATCH-PD-PILOT-V2-2026-10-10.md point 3): solvers rebuild a passage from its sibling
 * questions and pick the mutually consistent answers. If a set's KEYS agree with each other more than its
 * DISTRACTORS do, the set leaks through that channel even when every item is clean in isolation.
 *
 * Instrument: pairs of (stem + one option) from two different questions of ONE passage, passage withheld, roles
 * withheld. Two fresh judges rate each pair "fit" (+1), "unrelated" (0) or "clash" (-1).
 *   candidate (WV units; every choice k is the key of version k): for every pair of non-vocabulary questions,
 *     all 5 DIAGONAL pairs (c_m, c_m) and 5 seeded CROSS pairs (c_a, c_b), a != b. Roles are assigned after
 *     judging from draw.json: KK = the drawn diagonal; SW = the other four diagonals (same-world distractors);
 *     XW = cross pairs with neither option the drawn key. DD = (4*SW + 12*XW)/16, the distractor-pair mean
 *     weighted as the drawn set presents them (4 same-world + 12 cross-world distractor pairs per question pair).
 *   live control (the 48 non-vocabulary live items of ssat-reading-diag, 10 passages): for every question
 *     pair, KK and 3 seeded distractor-distractor pairs.
 *   channel = mean(KK) - mean(DD), per population. Also reported: KK - SW (candidate), and the all-diagonal
 *     view mean(diag) - mean(cross), which does not depend on the draw.
 *
 *   build <outdir> --wv <a.wv.json>... [--ctl <ssat-reading-diag dir>] [--files 4]
 *   score <outdir> --draw <draw.json|none> <labels.json>... (exactly 2 label files per cc-N.json, named cc-N.<x>.json;
 *                                    'none' = stopped before a draw: only the all-diagonal view is reported)
 *   selftest
 * Every scorer refuses on a missing or malformed label. No verdict is printed: there is no bar.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const L = 'ABCDE'
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const sha = b => createHash('sha256').update(b).digest('hex')
function rng(seedStr) { let s = parseInt(sha(seedStr).slice(0, 8), 16); return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff } }
function shuffle(a, r) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[b[i], b[j]] = [b[j], b[i]] } return b }
const REL = { fit: 1, unrelated: 0, clash: -1 }
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN

export function buildPairs(units, live, seed = 'wv11-cc') {
  const out = []
  for (const u of units) {
    const qs = u.questions.filter(q => q.kind !== 'vocabulary-in-context')
    for (let i = 0; i < qs.length; i++) for (let j = i + 1; j < qs.length; j++) {
      const r = rng(`${seed}|${u.id}|${qs[i].qid}|${qs[j].qid}`)
      for (let m = 0; m < 5; m++) out.push({ pop: 'candidate', group: u.id, qi: qs[i], qj: qs[j], a: m, b: m, type: 'diag' })
      const off = []; for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) if (a !== b) off.push([a, b])
      for (const [a, b] of shuffle(off, r).slice(0, 5)) out.push({ pop: 'candidate', group: u.id, qi: qs[i], qj: qs[j], a, b, type: 'cross' })
    }
  }
  for (const g of live) {
    for (let i = 0; i < g.questions.length; i++) for (let j = i + 1; j < g.questions.length; j++) {
      const qi = g.questions[i], qj = g.questions[j], r = rng(`${seed}|${g.id}|${qi.qid}|${qj.qid}`)
      out.push({ pop: 'live', group: g.id, qi, qj, a: qi.key, b: qj.key, type: 'KK' })
      const dd = []; for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) if (a !== qi.key && b !== qj.key) dd.push([a, b])
      for (const [a, b] of shuffle(dd, r).slice(0, 3)) out.push({ pop: 'live', group: g.id, qi, qj, a, b, type: 'DD' })
    }
  }
  return out
}

function build(outdir, wvFiles, ctlDir, nFiles) {
  const units = wvFiles.map(f => { const p = JSON.parse(readFileSync(f, 'utf8')); return { id: p.passage_id, questions: p.questions.map(q => ({ qid: q.qid, kind: q.kind, prompt: q.prompt, choices: q.choices })) } })
  const dkey = JSON.parse(readFileSync(join(ctlDir, 'label.key.json'), 'utf8'))
  const items = JSON.parse(readFileSync(join(ctlDir, 'taskF.json'), 'utf8')).filter(x => dkey[x.qid]?.pop === 'live')
  if (items.length !== 48) die(`expected the 48 live control items, got ${items.length}`)
  const groups = {}
  for (const x of items) (groups[x.qid.split('-')[0]] ??= []).push({ qid: `L-${x.qid}`, kind: dkey[x.qid].subskill, prompt: x.prompt, choices: L.split('').map(c => x.options[c]), key: L.indexOf(dkey[x.qid].fKey) })
  const live = Object.entries(groups).map(([id, questions]) => ({ id: `L-${id}`, questions }))
  if (live.some(g => g.questions.some(q => q.key < 0))) die('a live item has no key letter')
  const pairs = buildPairs(units, live)
  const r = rng(`render|${outdir}`), order = shuffle(pairs, r), key = {}, files = Array.from({ length: nFiles }, () => [])
  order.forEach((p, n) => {
    const id = `C${String(n + 1).padStart(3, '0')}`, flip = r() < 0.5
    const [x, y] = flip ? [[p.qj, p.b], [p.qi, p.a]] : [[p.qi, p.a], [p.qj, p.b]]
    key[id] = { pop: p.pop, group: p.group, qi: p.qi.qid, qj: p.qj.qid, a: p.a, b: p.b, type: p.type, file: n % nFiles }
    files[n % nFiles].push({ id, question_1: x[0].prompt, answer_1: x[0].choices[x[1]], question_2: y[0].prompt, answer_2: y[0].choices[y[1]] })
  })
  mkdirSync(outdir, { recursive: true })
  files.forEach((f, i) => writeFileSync(join(outdir, `cc-${i + 1}.json`), JSON.stringify(f, null, 1) + '\n'))
  writeFileSync(join(outdir, 'cc.key.json'), JSON.stringify(key, null, 1) + '\n')
  const c = pairs.filter(p => p.pop === 'candidate'), l = pairs.filter(p => p.pop === 'live')
  console.log(`  cc build: ${pairs.length} pairs in ${nFiles} files; candidate ${c.length} (${units.length} units, diag ${c.filter(p => p.type === 'diag').length}, cross ${c.filter(p => p.type === 'cross').length}); live ${l.length} (${live.length} passages, KK ${l.filter(p => p.type === 'KK').length}, DD ${l.filter(p => p.type === 'DD').length})`)
}

// key: pair id -> meta; labels: [{file index, judge tag, labels}]; drawn: {unit: k}
export function scoreCC(key, labelSets, drawn) {
  const nFiles = Math.max(...Object.values(key).map(k => k.file)) + 1, vals = {}
  for (let f = 0; f < nFiles; f++) {
    const js = labelSets.filter(s => s.file === f)
    if (js.length !== 2) throw new Error(`cc-${f + 1}: ${js.length} judge files (need exactly 2)`)
    for (const [id, k] of Object.entries(key)) {
      if (k.file !== f) continue
      for (const j of js) { const v = j.labels[id]?.rel; if (!(v in REL)) throw new Error(`cc-${f + 1} judge ${j.tag}: no valid rel for ${id}`); (vals[id] ??= []).push(REL[v]) }
    }
  }
  const pm = id => mean(vals[id])
  const cand = Object.entries(key).filter(([, k]) => k.pop === 'candidate'), live = Object.entries(key).filter(([, k]) => k.pop === 'live')
  const units = [...new Set(cand.map(([, k]) => k.group))]
  if (drawn) for (const u of units) if (!(u in drawn)) throw new Error(`draw.json has no drawn version for ${u}`)
  const KK = [], SW = [], XW = [], diag = [], cross = []
  for (const [id, k] of cand) {
    const d = drawn ? drawn[k.group] : null
    if (k.type === 'diag') { diag.push(pm(id)); if (drawn) (k.a === d ? KK : SW).push(pm(id)) } else { cross.push(pm(id)); if (drawn && k.a !== d && k.b !== d) XW.push(pm(id)) }
  }
  const lKK = live.filter(([, k]) => k.type === 'KK').map(([id]) => pm(id)), lDD = live.filter(([, k]) => k.type === 'DD').map(([id]) => pm(id))
  const DD = (4 * mean(SW) + 12 * mean(XW)) / 16
  const share = (a, x) => a.filter(v => v === x).length
  return {
    candidate: { KK: mean(KK), nKK: KK.length, SW: mean(SW), nSW: SW.length, XW: mean(XW), nXW: XW.length, DD, channel: mean(KK) - DD, KKminusSW: mean(KK) - mean(SW), allDiag: mean(diag), nDiag: diag.length, allCross: mean(cross), nCross: cross.length, allChannel: mean(diag) - mean(cross), kkFitBoth: share(KK, 1), kkClash: KK.filter(v => v < 0).length },
    live: { KK: mean(lKK), nKK: lKK.length, DD: mean(lDD), nDD: lDD.length, channel: mean(lKK) - mean(lDD), kkFitBoth: share(lKK, 1), kkClash: lKK.filter(v => v < 0).length },
    agreement: (() => { const both = Object.values(vals).filter(v => v.length === 2); return { n: both.length, same: both.filter(v => v[0] === v[1]).length } })(),
  }
}

function score(outdir, drawFile, labelFiles) {
  const key = JSON.parse(readFileSync(join(outdir, 'cc.key.json'), 'utf8')), draw = drawFile === 'none' ? { drawn: null } : JSON.parse(readFileSync(drawFile, 'utf8'))
  const labelSets = labelFiles.map(f => { const m = basename(f).match(/^cc-(\d+)\.([a-z0-9]+)\.json$/); if (!m) die(`label file must be named cc-N.<judge>.json: ${f}`); const j = JSON.parse(readFileSync(f, 'utf8')); return { file: Number(m[1]) - 1, tag: m[2], labels: j.labels ?? j } })
  let s; try { s = scoreCC(key, labelSets, draw.drawn) } catch (e) { die(e.message) }
  const f = x => (x >= 0 ? '+' : '') + x.toFixed(3)
  console.log('CONSISTENCY CHANNEL (REPORT-ONLY; no bar). fit=+1, unrelated=0, clash=-1; each pair = mean of 2 judges.')
  console.log(`  judge agreement: ${s.agreement.same}/${s.agreement.n} pairs rated identically`)
  const c = s.candidate, l = s.live
  if (!draw.drawn) console.log('  NO DRAW (--draw none): only the all-diagonal candidate view is defined; KK/SW/XW/DD below are NaN by construction')
  console.log(`  candidate (drawn): KK ${f(c.KK)} (n=${c.nKK}; both-judges-fit ${c.kkFitBoth}, any-clash ${c.kkClash})  SW ${f(c.SW)} (n=${c.nSW})  XW ${f(c.XW)} (n=${c.nXW})  DD=(4SW+12XW)/16 ${f(c.DD)}`)
  console.log(`  candidate CHANNEL KK-DD ${f(c.channel)}   KK-SW ${f(c.KKminusSW)}   all-diagonal view diag ${f(c.allDiag)} (n=${c.nDiag}) - cross ${f(c.allCross)} (n=${c.nCross}) = ${f(c.allChannel)}`)
  console.log(`  live control:      KK ${f(l.KK)} (n=${l.nKK}; both-judges-fit ${l.kkFitBoth}, any-clash ${l.kkClash})  DD ${f(l.DD)} (n=${l.nDD})`)
  console.log(`  live CHANNEL KK-DD ${f(l.channel)}`)
  console.log(`  candidate minus live channel: ${f(c.channel - l.channel)}`)
  writeFileSync(join(outdir, 'cc.score.json'), JSON.stringify(s, null, 1) + '\n')
}

function selftest() {
  let fail = 0; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  const mk = (id, n) => ({ id, questions: Array.from({ length: n }, (_, i) => ({ qid: `${id}-${i + 1}`, kind: i === 3 ? 'vocabulary-in-context' : 'x', prompt: `p${i}`, choices: ['a', 'b', 'c', 'd', 'e'] })) })
  const units = [mk('U1', 6), mk('U2', 6)], live = [{ id: 'L-P1', questions: [0, 1, 2, 3].map(i => ({ qid: `L${i}`, kind: 'x', prompt: 'q', choices: ['a', 'b', 'c', 'd', 'e'], key: i % 5 })) }]
  const pairs = buildPairs(units, live)
  ok(pairs.filter(p => p.pop === 'candidate').length === 2 * 10 * 10, `candidate pairs = 2 units x 10 question pairs x 10 (got ${pairs.filter(p => p.pop === 'candidate').length})`)
  ok(pairs.every(p => p.qi.kind !== 'vocabulary-in-context' && p.qj.kind !== 'vocabulary-in-context'), 'vocabulary questions excluded')
  ok(pairs.filter(p => p.pop === 'live').length === 6 * 4 && pairs.filter(p => p.type === 'DD').every(p => p.a !== p.qi.key && p.b !== p.qj.key), 'live: KK + 3 DD per question pair, DD never touches a key')
  ok(pairs.filter(p => p.type === 'cross').every(p => p.a !== p.b), 'cross pairs are off-diagonal')
  const key = {}; pairs.forEach((p, n) => { key[`C${n}`] = { pop: p.pop, group: p.group, qi: p.qi.qid, qj: p.qj.qid, a: p.a, b: p.b, type: p.type, file: n % 2 } })
  const drawn = { U1: 2, U2: 0 }
  const lab = fn => [0, 1].flatMap(f => ['a', 'b'].map(t => ({ file: f, tag: t, labels: Object.fromEntries(Object.entries(key).filter(([, k]) => k.file === f).map(([id, k]) => [id, { rel: fn(k) }])) })))
  const isKK = k => k.pop === 'live' ? k.type === 'KK' : (k.type === 'diag' && k.a === drawn[k.group])
  let s = scoreCC(key, lab(k => isKK(k) ? 'fit' : 'clash'), drawn)
  ok(Math.abs(s.candidate.channel - 2) < 1e-9 && Math.abs(s.live.channel - 2) < 1e-9, `keys fit, distractors clash -> channel +2 both (got ${s.candidate.channel}, ${s.live.channel})`)
  s = scoreCC(key, lab(k => isKK(k) ? 'clash' : 'fit'), drawn)
  ok(Math.abs(s.candidate.channel + 2) < 1e-9 && Math.abs(s.live.channel + 2) < 1e-9, 'reversed -> -2 both')
  s = scoreCC(key, lab(k => (k.type === 'diag' || k.type === 'KK') ? 'fit' : 'clash'), drawn)
  ok(Math.abs(s.candidate.KKminusSW) < 1e-9 && Math.abs(s.candidate.channel - 1.5) < 1e-9, `every diagonal fits (WV design) -> KK-SW 0, KK-DD = 2*12/16 = 1.5 (got ${s.candidate.KKminusSW}, ${s.candidate.channel})`)
  s = scoreCC(key, lab(() => 'unrelated'), drawn)
  ok(s.candidate.channel === 0 && s.live.channel === 0, 'all unrelated -> 0')
  const L1 = lab(() => 'fit'); delete L1[0].labels[Object.keys(L1[0].labels)[0]]
  let threw = false; try { scoreCC(key, L1, drawn) } catch { threw = true }; ok(threw, 'a missing label refuses')
  threw = false; try { scoreCC(key, lab(() => 'fit').slice(1), drawn) } catch { threw = true }; ok(threw, 'a file with one judge refuses')
  threw = false; try { scoreCC(key, lab(() => 'maybe'), drawn) } catch { threw = true }; ok(threw, 'an invalid rel refuses')
  threw = false; try { scoreCC(key, lab(() => 'fit'), { U1: 0 }) } catch { threw = true }; ok(threw, 'a unit missing from the draw refuses')
  s = scoreCC(key, lab(k => (k.type === 'diag' || k.type === 'KK') ? 'fit' : 'clash'), null)
  ok(Math.abs(s.candidate.allChannel - 2) < 1e-9 && Number.isNaN(s.candidate.channel), `no draw: all-diagonal view only (got ${s.candidate.allChannel}, drawn channel ${s.candidate.channel})`)
  console.log(fail ? `SELFTEST: ${fail} FAILED` : 'SELFTEST: all ok'); process.exit(fail ? 1 : 0)
}

const [cmd, ...rest] = process.argv.slice(2)
if (import.meta.url === `file://${process.argv[1]}`) {
  const after = flag => { const i = rest.indexOf(flag); if (i < 0) return []; const out = []; for (let j = i + 1; j < rest.length && !rest[j].startsWith('--'); j++) out.push(rest[j]); return out }
  if (cmd === 'build') { const wv = after('--wv'); if (!wv.length) die('no --wv files'); build(rest[0], wv, after('--ctl')[0] ?? join(HERE, 'ssat-reading-diag'), Number(after('--files')[0] ?? 4)) }
  else if (cmd === 'score') { const d = after('--draw')[0]; if (!d) die('--draw <draw.json> required'); const labs = rest.slice(1).filter((x, i, a) => x !== '--draw' && a[i - 1] !== '--draw'); score(rest[0], d, labs) }
  else if (cmd === 'selftest') selftest()
  else die('usage: build | score | selftest')
}
