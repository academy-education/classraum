#!/usr/bin/env node
/**
 * ssat-wv-consistency.mjs — the CONSISTENCY CHANNEL, measured (READING-BATCH-WV12-2026-10-11.prereg.md).
 * REPORT-ONLY. It decides nothing.
 *
 * The hypothesis (READING-BATCH-PD-PILOT-V2-2026-10-10.md, "Why", point 3): options-only solvers rebuild a passage
 * from its sibling questions and pick mutually consistent answers. In an agent-written set the keys are all true of
 * one passage and so agree with each other, while the distractors are independent inventions and do not.
 *
 * The instrument: pairs of (question, answer) statements from two DIFFERENT questions of the SAME passage set, passage
 * withheld, rated 1-5 by two fresh judges for "could one passage make both of these answers correct". Pair types:
 *   KK  key of question a + key of question b
 *   DX  a distractor of a + a distractor of b (candidate: from two DIFFERENT versions' worlds, j1 != j2, both != k)
 *   DS  candidate only: choice j of a + choice j of b, j != k (the same non-drawn world; the WV method builds every
 *       choice index as one coherent world, so these are coherent by construction)
 * Per population: fit rate (share rated >= 4) and mean rating by type. The channel is KK fit minus DX fit. For the
 * WV method the exploitable channel is KK against DS (does the drawn world fit together better than a non-drawn one?).
 * Population: every NON-vocabulary item (the options-only population), candidate drawn items vs the 48 live control
 * items (ssat-reading-diag/taskF.json, 10 passage groups).
 *
 *   build <outdir> --batch <batch.json> [--ref <batch.json>] [--ctl <ssat-reading-diag dir>]
 *                  consistency.json + consistency.key.json. --ref adds a third population ("ref", KK + DX only):
 *                  the PD v2 pilot's drawn items, where every solver SAID it used the channel (82.2% options-only).
 *                  If the instrument cannot see a channel there, it cannot be read as clearing one anywhere.
 *   score <outdir> <judge.a.json> <judge.b.json>                           refuses on any missing or invalid rating
 *   --selftest
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const sha = b => createHash('sha256').update(b).digest('hex')
function rng(seedStr) { let s = parseInt(sha(seedStr).slice(0, 8), 16); return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff } }
function shuffle(a, r) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[b[i], b[j]] = [b[j], b[i]] } return b }
const pickOne = (a, r) => a[Math.floor(r() * a.length)]

/** groups: [{pop, group, items: [{q, key, choices: [c0..c4] (candidate) | null, others: [distractors], k}]}] -> pairs */
export function makePairs(groups, seed) {
  const r = rng(`consistency|${seed}`), pairs = []
  for (const g of groups) {
    if (g.items.length < 2) continue
    for (let a = 0; a < g.items.length; a++) for (let b = a + 1; b < g.items.length; b++) {
      const A = g.items[a], B = g.items[b], st = (it, ans) => ({ question: it.q, answer: ans })
      pairs.push({ pop: g.pop, group: g.group, type: 'KK', s: [st(A, A.key), st(B, B.key)] })
      if (g.pop === 'candidate') {
        const nonKey = [0, 1, 2, 3, 4].filter(j => j !== A.k)
        if (A.k !== B.k) die(`${g.group}: siblings drawn from different versions`)
        const j = pickOne(nonKey, r)
        pairs.push({ pop: g.pop, group: g.group, type: 'DS', s: [st(A, A.choices[j]), st(B, B.choices[j])] })
        const j1 = pickOne(nonKey, r), j2 = pickOne(nonKey.filter(x => x !== j1), r)
        pairs.push({ pop: g.pop, group: g.group, type: 'DX', s: [st(A, A.choices[j1]), st(B, B.choices[j2])] })
      } else {
        pairs.push({ pop: g.pop, group: g.group, type: 'DX', s: [st(A, pickOne(A.others, r)), st(B, pickOne(B.others, r))] })
      }
    }
  }
  return pairs
}

function build(outdir, batchFile, ctlDir, refFile = null) {
  const batch = JSON.parse(readFileSync(batchFile, 'utf8')).filter(x => !/vocab/i.test(x.subskill))
  if (!batch.length) die('no non-vocabulary candidate items')
  const cg = {}
  for (const x of batch) {
    const k = x.choices.indexOf(x.correct_answer); if (k !== x.version) die(`${x.id}: key index ${k} is not the drawn version ${x.version}`)
    ;(cg[x.set_id] ??= []).push({ q: x.prompt, key: x.correct_answer, choices: x.choices, others: x.choices.filter(c => c !== x.correct_answer), k })
  }
  const dkey = JSON.parse(readFileSync(join(ctlDir, 'label.key.json'), 'utf8'))
  const live = JSON.parse(readFileSync(join(ctlDir, 'taskF.json'), 'utf8')).filter(x => dkey[x.qid]?.pop === 'live')
  if (live.length !== 48) die(`expected the 48 live control items, got ${live.length}`)
  const lg = {}
  for (const x of live) { const fk = dkey[x.qid].fKey; (lg[x.qid.split('-')[0]] ??= []).push({ q: x.prompt, key: x.options[fk], choices: null, others: Object.entries(x.options).filter(([L]) => L !== fk).map(([, c]) => c), k: null }) }
  const rg = {}
  if (refFile) for (const x of JSON.parse(readFileSync(refFile, 'utf8')).filter(x => !/vocab/i.test(x.subskill))) { if (!x.choices.includes(x.correct_answer)) die(`ref ${x.id}: key not among choices`); (rg[x.set_id] ??= []).push({ q: x.prompt, key: x.correct_answer, choices: null, others: x.choices.filter(c => c !== x.correct_answer), k: null }) }
  if (refFile && !Object.keys(rg).length) die('ref: no non-vocabulary items')
  const groups = [...Object.entries(cg).map(([g, items]) => ({ pop: 'candidate', group: g, items })), ...Object.entries(lg).map(([g, items]) => ({ pop: 'live', group: `L-${g}`, items })), ...Object.entries(rg).map(([g, items]) => ({ pop: 'ref', group: `R-${g}`, items }))]
  const pairs = makePairs(groups, outdir)
  const r = rng(`consistency-order|${outdir}`), order = shuffle(pairs, r), key = {}
  const out = order.map((p, i) => { const id = `C${String(i + 1).padStart(3, '0')}`; key[id] = { pop: p.pop, group: p.group, type: p.type }; const s = r() < 0.5 ? p.s : [p.s[1], p.s[0]]; return { id, first: s[0], second: s[1] } })
  mkdirSync(outdir, { recursive: true })
  writeFileSync(join(outdir, 'consistency.json'), JSON.stringify(out, null, 1) + '\n')
  writeFileSync(join(outdir, 'consistency.key.json'), JSON.stringify(key, null, 1) + '\n')
  const cnt = (pop, t) => Object.values(key).filter(k => k.pop === pop && k.type === t).length
  console.log(`  consistency build: ${out.length} pairs; candidate KK ${cnt('candidate', 'KK')} DS ${cnt('candidate', 'DS')} DX ${cnt('candidate', 'DX')} (${Object.keys(cg).length} sets); live KK ${cnt('live', 'KK')} DX ${cnt('live', 'DX')} (${Object.keys(lg).length} sets)${refFile ? `; ref KK ${cnt('ref', 'KK')} DX ${cnt('ref', 'DX')} (${Object.keys(rg).length} sets)` : ''}`)
}

/** key + judge label maps -> table; throws on any missing/invalid rating or an empty cell */
export function scoreCons(key, judges) {
  if (judges.length !== 2) throw new Error(`need exactly 2 judges, got ${judges.length}`)
  const ids = Object.keys(key)
  if (!ids.length) throw new Error('empty key')
  judges.forEach((J, ji) => { const bad = ids.filter(id => !Number.isInteger(J[id]?.r) || J[id].r < 1 || J[id].r > 5); if (bad.length) throw new Error(`judge ${'ab'[ji]}: ${bad.length}/${ids.length} pairs missing a 1-5 rating (first ${bad[0]})`) })
  const cells = {}
  for (const id of ids) { const k = key[id]; for (const [ji, J] of judges.entries()) { const c = (cells[`${k.pop}|${k.type}`] ??= { n: 0, fit: 0, sum: 0, byJudge: [[0, 0], [0, 0]] }); c.n++; c.sum += J[id].r; if (J[id].r >= 4) { c.fit++; c.byJudge[ji][1]++ } c.byJudge[ji][0]++ } }
  for (const need of ['candidate|KK', 'candidate|DX', 'live|KK', 'live|DX']) if (!cells[need]?.n) throw new Error(`no ratings in ${need}: nothing to compare`)
  const rate = c => 100 * c.fit / c.n
  const t = Object.fromEntries(Object.entries(cells).map(([k, c]) => [k, { n: c.n, fitPct: +rate(c).toFixed(1), mean: +(c.sum / c.n).toFixed(2), byJudge: c.byJudge.map(([n, f]) => `${f}/${n}`) }]))
  const gap = pop => +(rate(cells[`${pop}|KK`]) - rate(cells[`${pop}|DX`])).toFixed(1)
  if (cells['ref|KK'] && !cells['ref|DX']) throw new Error('ref population has KK but no DX ratings')
  return { cells: t, channel: { candidate: gap('candidate'), live: gap('live'), ...(cells['ref|KK'] ? { ref: gap('ref') } : {}), ...(cells['candidate|DS'] ? { candidateKKminusDS: +(rate(cells['candidate|KK']) - rate(cells['candidate|DS'])).toFixed(1) } : {}) } }
}

function score(outdir, files) {
  const key = JSON.parse(readFileSync(join(outdir, 'consistency.key.json'), 'utf8'))
  const js = files.map(f => { const j = JSON.parse(readFileSync(f, 'utf8')); return j.labels ?? j })
  let s; try { s = scoreCons(key, js) } catch (e) { die(e.message) }
  console.log('  CONSISTENCY CHANNEL (report-only; 2 judges pooled; "fit" = rated 4-5)')
  for (const [k, c] of Object.entries(s.cells).sort()) console.log(`    ${k.padEnd(14)} n=${String(c.n).padStart(3)}  fit ${String(c.fitPct).padStart(5)}%  mean ${c.mean}  (judge a ${c.byJudge[0]}, b ${c.byJudge[1]})`)
  console.log(`  channel (KK fit - DX fit): candidate ${s.channel.candidate >= 0 ? '+' : ''}${s.channel.candidate} pts, live ${s.channel.live >= 0 ? '+' : ''}${s.channel.live} pts${s.channel.ref !== undefined ? `, ref (PD v2) ${s.channel.ref >= 0 ? '+' : ''}${s.channel.ref} pts` : ''}${s.channel.candidateKKminusDS !== undefined ? `; candidate KK - DS (drawn world vs a non-drawn world) ${s.channel.candidateKKminusDS >= 0 ? '+' : ''}${s.channel.candidateKKminusDS} pts` : ''}`)
  writeFileSync(join(outdir, 'consistency.score.json'), JSON.stringify(s, null, 1) + '\n')
}

function selftest() {
  let fail = 0; const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  const it = (k, w) => ({ q: `Q${w}`, key: `c${k}-${w}`, choices: [0, 1, 2, 3, 4].map(j => `c${j}-${w}`), others: [0, 1, 2, 3, 4].filter(j => j !== k).map(j => `c${j}-${w}`), k })
  const cand = { pop: 'candidate', group: 'U1', items: [it(2, 'a'), it(2, 'b'), it(2, 'c')] }
  const liveG = { pop: 'live', group: 'L-P1', items: [{ q: 'L1', key: 'K1', others: ['d1', 'e1', 'f1', 'g1'] }, { q: 'L2', key: 'K2', others: ['d2', 'e2', 'f2', 'g2'] }] }
  const pairs = makePairs([cand, liveG], 'x')
  expect(pairs.filter(p => p.pop === 'candidate').length === 9 && pairs.filter(p => p.pop === 'live').length === 2, `3 candidate siblings -> 3 qpairs x 3 types = 9; 2 live -> 2 (got ${pairs.length})`)
  const ds = pairs.filter(p => p.type === 'DS'), dx = pairs.filter(p => p.type === 'DX' && p.pop === 'candidate')
  expect(ds.every(p => p.s[0].answer.split('-')[0] === p.s[1].answer.split('-')[0] && !p.s[0].answer.startsWith('c2')), 'DS pairs share one non-key choice index')
  expect(dx.every(p => p.s[0].answer.split('-')[0] !== p.s[1].answer.split('-')[0] && !p.s[0].answer.startsWith('c2') && !p.s[1].answer.startsWith('c2')), 'DX pairs are two different non-key indices')
  expect(pairs.filter(p => p.type === 'KK').every(p => p.s.every(s => s.answer.startsWith('c2') || s.answer.startsWith('K'))), 'KK pairs are keys only')
  // scoring: a planted channel is detected, a flat one reads ~0, and bad input refuses
  const key = {}; let n = 0; const add = (pop, type, m) => { for (let i = 0; i < m; i++) key[`C${++n}`] = { pop, type } }
  add('candidate', 'KK', 10); add('candidate', 'DX', 10); add('candidate', 'DS', 10); add('live', 'KK', 10); add('live', 'DX', 10)
  const lab = f => Object.fromEntries(Object.entries(key).map(([id, k]) => [id, { r: f(k) }]))
  const planted = scoreCons(key, [lab(k => k.type === 'KK' && k.pop === 'candidate' ? 5 : k.type === 'DS' ? 4 : 2), lab(k => k.type === 'KK' && k.pop === 'candidate' ? 4 : k.type === 'DS' ? 4 : 1)])
  expect(planted.channel.candidate === 100 && planted.channel.live === 0 && planted.channel.candidateKKminusDS === 0, `planted channel: candidate +100, live 0, KK-DS 0 (got ${JSON.stringify(planted.channel)})`)
  const marginal = scoreCons(key, [lab(k => k.type === 'KK' ? (k.pop === 'candidate' ? 4 : 3) : 3), lab(k => 3)])
  expect(marginal.channel.candidate === 50, `marginal case: one judge of two sees the candidate keys fit -> +50 (got ${marginal.channel.candidate})`)
  let threw = false; try { const a = lab(() => 3); delete a.C7; scoreCons(key, [a, lab(() => 3)]) } catch { threw = true }
  expect(threw, 'a judge missing one pair refuses')
  threw = false; try { scoreCons(key, [lab(() => 3), lab(() => 6)]) } catch { threw = true }
  expect(threw, 'a rating outside 1-5 refuses')
  threw = false; try { const k2 = Object.fromEntries(Object.entries(key).filter(([, k]) => k.pop !== 'live')); scoreCons(k2, [lab(() => 3), lab(() => 3)]) } catch { threw = true }
  expect(threw, 'an empty comparison cell (no live pairs) refuses rather than returning a number')
  threw = false; try { scoreCons(key, [lab(() => 3)]) } catch { threw = true }
  expect(threw, 'one judge refuses')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed'); process.exit(fail ? 1 : 0)
}

const [cmd, ...rest] = process.argv.slice(2)
if (import.meta.url === `file://${process.argv[1]}`) {
  const after = flag => { const i = rest.indexOf(flag); return i < 0 ? null : rest[i + 1] }
  if (cmd === 'build') { const b = after('--batch'); if (!rest[0] || !b) die('build <outdir> --batch <batch.json> [--ref <batch.json>] [--ctl dir]'); build(rest[0], b, after('--ctl') ?? join(HERE, 'ssat-reading-diag'), after('--ref')) }
  else if (cmd === 'score') { if (rest.length !== 3) die('score <outdir> <judge.a.json> <judge.b.json>'); score(rest[0], rest.slice(1)) }
  else if (cmd === '--selftest') selftest()
  else die('usage: build | score | --selftest')
}
