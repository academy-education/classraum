#!/usr/bin/env node
/**
 * ssat-wv13-senses.mjs — the WV13 vocabulary sense-overlap pre-check with PERSISTENT judges
 * (READING-BATCH-WV13-2026-10-11.prereg.md).
 *
 * WV11/WV12 ran the sense check with two FRESH judges every round, so a fix round re-judged every gloss pair of every
 * changed unit. WV12's fix round refused two sets on pairs that had not changed and that one round-0 judge had passed
 * (struck crashed into / occurred to; pitch musical tone / steepness): the unit was refused for noise, not for a fix.
 *
 * WV13 keeps the judgement and the rule and changes only WHO is asked WHAT in a fix round:
 *   - the same two judge sessions (A and B) rate every pair in every round (resumed, never respawned);
 *   - in a later round only pairs whose gloss texts are new are asked; a pair whose two glosses are unchanged keeps its
 *     earlier verdicts from both judges (matched by the unordered pair of gloss TEXTS within one question and word, so
 *     reordering does not re-ask and any edit to either gloss does);
 *   - refusal is unchanged: a pair is refused only if BOTH judges rate it "overlap" (ssat-wv.mjs verify --senses).
 *
 *   build <roundDir> <a.wv.json>... [--prev <prevRoundDir>]
 *         writes <roundDir>/sense-judge.json (only the pairs to ask) and sense-request.json (the whole state asked for)
 *   merge <roundDir> --judge-a <id> --judge-b <id> [--prev <prevRoundDir>]
 *         reads <roundDir>/sense-judge.a.json and .b.json (the judges' answers to the asked pairs only), carries every
 *         unchanged pair from <prevRoundDir>/merged, and writes <roundDir>/merged/{sense-key,sense-judge.a,sense-judge.b,
 *         provenance,judges}.json in the shape ssat-wv.mjs verify --senses reads. Refuses: an asked pair unrated or
 *         invalid; a judge id that differs from the previous round's (the judges must be the same sessions); a carried
 *         pair with no earlier verdict. Ratings of pairs that were NOT asked are ignored and listed (an unchanged pair
 *         cannot change verdict).
 *   report <roundDir>    per question: every pair's two verdicts, the round each came from, and REFUSED / clean
 *   --selftest
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const normG = s => String(s ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim()
const rdj = p => { if (!existsSync(p)) die(`cannot read ${p}`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch { die(`not JSON: ${p}`) } }
const wj = (p, x) => writeFileSync(p, JSON.stringify(x, null, 1) + '\n')
export const senseId = (pid, qid) => `${pid}.${qid.slice(pid.length + 1)}`
export const pairKey = (word, g1, g2) => `${normG(word)}|${[normG(g1), normG(g2)].sort().join('||')}`
const PAIRS = []; for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) PAIRS.push([a, b])

/** questions: [{sid, word, choices}]; prev: merged provenance or null -> { request, judgeFile } */
export function plan(questions, prev) {
  const carryIdx = {}
  if (prev) for (const [sid, e] of Object.entries(prev)) for (const [, pv] of Object.entries(e.pairs)) carryIdx[`${sid}#${pairKey(e.word, pv.glosses[0], pv.glosses[1])}`] = pv
  const request = {}, judgeFile = []
  for (const q of questions) {
    if (q.choices.length !== 5 || new Set(q.choices.map(normG)).size !== 5) die(`${q.sid}: need five distinct glosses`)
    const ask = [], carry = []
    for (const [a, b] of PAIRS) { const p = `${a}-${b}`; (carryIdx[`${q.sid}#${pairKey(q.word, q.choices[a], q.choices[b])}`] ? carry : ask).push(p) }
    request[q.sid] = { word: q.word, choices: q.choices, ask, carry }
    if (ask.length) judgeFile.push({ id: q.sid, word: q.word, glosses: q.choices, pairs: ask.map(p => { const [a, b] = p.split('-').map(Number); return { pair: p, senses: [q.choices[a], q.choices[b]] } }) })
  }
  return { request, judgeFile }
}

/** request (from plan), judges [{sid:{pairs:{}}} x2], prev merged provenance|null -> { prov, ignored } (throws on refusal) */
export function mergeRound(request, judges, prev, round) {
  const prov = {}, ignored = [], err = m => { throw new Error(m) }
  const carryIdx = {}
  if (prev) for (const [sid, e] of Object.entries(prev)) for (const [, pv] of Object.entries(e.pairs)) carryIdx[`${sid}#${pairKey(e.word, pv.glosses[0], pv.glosses[1])}`] = pv
  for (const [sid, r] of Object.entries(request)) {
    const e = prov[sid] = { word: r.word, choices: r.choices, pairs: {} }
    for (const [a, b] of PAIRS) {
      const p = `${a}-${b}`, glosses = [r.choices[a], r.choices[b]]
      if (r.ask.includes(p)) {
        const vs = judges.map((J, ji) => { const v = J?.[sid]?.pairs?.[p]; if (v !== 'overlap' && v !== 'distinct') err(`${sid} pair ${p}: judge ${'ab'[ji]} gave ${JSON.stringify(v ?? null)} (need overlap|distinct)`); return v })
        e.pairs[p] = { glosses, a: vs[0], b: vs[1], round, notes: judges.map(J => J?.[sid]?.notes?.[p] ?? null) }
      } else {
        const pv = carryIdx[`${sid}#${pairKey(r.word, glosses[0], glosses[1])}`]
        if (!pv) err(`${sid} pair ${p}: marked carried but no earlier verdict for "${glosses[0]}" / "${glosses[1]}"`)
        e.pairs[p] = { glosses, a: pv.a, b: pv.b, round: pv.round, notes: pv.notes ?? [null, null] }
        judges.forEach((J, ji) => { if (J?.[sid]?.pairs?.[p] !== undefined) ignored.push(`${sid} ${p} judge ${'ab'[ji]} rated an unchanged pair ${J[sid].pairs[p]} (ignored; carried ${ji ? pv.b : pv.a} from round ${pv.round})`) })
      }
    }
  }
  for (const J of judges) for (const sid of Object.keys(J ?? {})) if (!request[sid]) ignored.push(`${sid}: not asked this round (ignored)`)
  return { prov, ignored }
}
export const refusedPairs = e => Object.entries(e.pairs).filter(([, v]) => v.a === 'overlap' && v.b === 'overlap').map(([p]) => p)

function questionsOf(files) {
  const qs = []
  for (const f of [...files].sort()) {
    const p = rdj(f), id = p.passage_id
    for (const q of p.questions.filter(q => q.kind === 'vocabulary-in-context')) qs.push({ sid: senseId(id, q.qid), word: (q.prompt.match(/["“]([^"”]+)["”]/) ?? [])[1] ?? '', choices: q.choices })
  }
  if (!qs.length) die('no vocabulary questions in the files')
  return qs
}
const loadPrev = d => d ? rdj(join(d, 'merged', 'provenance.json')) : null

function cmdBuild(dir, files, prevDir) {
  const { request, judgeFile } = plan(questionsOf(files), loadPrev(prevDir))
  mkdirSync(dir, { recursive: true })
  wj(join(dir, 'sense-request.json'), request); wj(join(dir, 'sense-judge.json'), judgeFile)
  const nAsk = Object.values(request).reduce((a, r) => a + r.ask.length, 0), nCarry = Object.values(request).reduce((a, r) => a + r.carry.length, 0)
  console.log(`  sense build: ${Object.keys(request).length} vocabulary questions; ${nAsk} pairs to ask, ${nCarry} carried from ${prevDir ?? '(none)'}`)
  for (const [sid, r] of Object.entries(request)) console.log(`    ${sid} "${r.word}": ask ${r.ask.length ? r.ask.join(',') : 'none'}${r.carry.length ? `; carry ${r.carry.join(',')}` : ''}`)
}
function cmdMerge(dir, ida, idb, prevDir) {
  if (!ida || !idb || ida === idb) die('merge needs --judge-a <id> --judge-b <id>, two different sessions')
  const request = rdj(join(dir, 'sense-request.json')), prev = loadPrev(prevDir)
  if (prevDir) { const pj = rdj(join(prevDir, 'merged', 'judges.json')); if (pj.a !== ida || pj.b !== idb) die(`judges changed: previous round a=${pj.a} b=${pj.b}, this round a=${ida} b=${idb}; WV13 uses the SAME two judge sessions throughout a run`) }
  const anyAsk = Object.values(request).some(r => r.ask.length)
  const judges = anyAsk ? ['a', 'b'].map(t => { const x = rdj(join(dir, `sense-judge.${t}.json`)); return x.labels ?? x }) : [{}, {}]
  let res; try { res = mergeRound(request, judges, prev, prevDir ? (prev ? Math.max(...Object.values(prev).flatMap(e => Object.values(e.pairs).map(v => v.round))) + 1 : 1) : 0) } catch (e) { die(e.message) }
  const out = join(dir, 'merged'); mkdirSync(out, { recursive: true })
  const key = {}, ja = {}, jb = {}
  for (const [sid, e] of Object.entries(res.prov)) { key[sid] = { choices: e.choices }; ja[sid] = { pairs: Object.fromEntries(Object.entries(e.pairs).map(([p, v]) => [p, v.a])) }; jb[sid] = { pairs: Object.fromEntries(Object.entries(e.pairs).map(([p, v]) => [p, v.b])) } }
  // a previous round's questions that are not in this round are kept (a unit dropped from the fix round keeps its state)
  const prov = { ...(prev ?? {}), ...res.prov }
  for (const [sid, e] of Object.entries(prov)) if (!key[sid]) { key[sid] = { choices: e.choices }; ja[sid] = { pairs: Object.fromEntries(Object.entries(e.pairs).map(([p, v]) => [p, v.a])) }; jb[sid] = { pairs: Object.fromEntries(Object.entries(e.pairs).map(([p, v]) => [p, v.b])) } }
  wj(join(out, 'sense-key.json'), key); wj(join(out, 'sense-judge.a.json'), ja); wj(join(out, 'sense-judge.b.json'), jb)
  wj(join(out, 'provenance.json'), prov); wj(join(out, 'judges.json'), { a: ida, b: idb })
  res.ignored.forEach(x => console.log(`  NOTE ${x}`))
  cmdReport(dir)
}
function cmdReport(dir) {
  const prov = rdj(join(dir, 'merged', 'provenance.json'))
  for (const [sid, e] of Object.entries(prov)) {
    const ref = refusedPairs(e)
    console.log(`  ${sid} "${e.word}" [${e.choices.join(' / ')}]: ${ref.length ? `REFUSED (both judges overlap: ${ref.map(p => { const v = e.pairs[p]; return `${v.glosses[0]} / ${v.glosses[1]}` }).join('; ')})` : 'clean'}`)
    for (const [p, v] of Object.entries(e.pairs)) if (v.a === 'overlap' || v.b === 'overlap') console.log(`      ${p} ${v.glosses[0]} / ${v.glosses[1]}: a ${v.a}, b ${v.b} (round ${v.round})`)
  }
}

function selftest() {
  let fail = 0; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  const throws = f => { try { f(); return false } catch { return true } }
  const all = v => Object.fromEntries(PAIRS.map(([a, b]) => [`${a}-${b}`, v]))
  const Q = (choices, sid = 'WV13-T01.4', word = 'trunk') => ({ sid, word, choices })
  const g0 = ['tree stem', 'storage chest', 'elephant nose', 'car boot', 'human torso']
  // round 0: everything asked
  const p0 = plan([Q(g0)], null)
  ok(p0.request['WV13-T01.4'].ask.length === 10 && p0.judgeFile[0].pairs.length === 10, 'round 0 asks all 10 pairs')
  const jA0 = { 'WV13-T01.4': { pairs: { ...all('distinct'), '0-4': 'overlap' } } }, jB0 = { 'WV13-T01.4': { pairs: { ...all('distinct'), '0-4': 'overlap', '1-3': 'overlap' } } }
  const m0 = mergeRound(p0.request, [jA0, jB0], null, 0)
  ok(JSON.stringify(refusedPairs(m0.prov['WV13-T01.4'])) === '["0-4"]', 'both-judge rule: 0-4 refused, the one-judge 1-3 is not')
  ok(throws(() => mergeRound(p0.request, [jA0, { 'WV13-T01.4': { pairs: { ...all('distinct'), '2-3': undefined } } }], null, 0)), 'a missing asked pair refuses')
  ok(throws(() => mergeRound(p0.request, [jA0, { 'WV13-T01.4': { pairs: { ...all('distinct'), '2-3': 'maybe' } } }], null, 0)), 'an invalid rating refuses')
  // round 1, set UNCHANGED: nothing asked, verdict carried even if a judge file tries to flip it
  const p1 = plan([Q(g0)], m0.prov)
  ok(p1.request['WV13-T01.4'].ask.length === 0 && p1.judgeFile.length === 0, 'an unchanged set asks nothing')
  const flip = { 'WV13-T01.4': { pairs: all('overlap') } }
  const m1 = mergeRound(p1.request, [flip, flip], m0.prov, 1)
  ok(JSON.stringify(refusedPairs(m1.prov['WV13-T01.4'])) === '["0-4"]' && m1.ignored.length === 20, 'an unchanged set cannot change verdict: a both-overlap re-rating of all 10 pairs is ignored (20 notes), still exactly 0-4 refused')
  const pass0 = mergeRound(p0.request, [{ 'WV13-T01.4': { pairs: all('distinct') } }, { 'WV13-T01.4': { pairs: all('distinct') } }], null, 0)
  ok(refusedPairs(mergeRound(plan([Q(g0)], pass0.prov).request, [flip, flip], pass0.prov, 1).prov['WV13-T01.4']).length === 0, 'an unchanged CLEAN set stays clean even if both judges would now say overlap (the WV12 P01/P02 flip cannot happen)')
  // round 1, ONE gloss changed: exactly its 4 pairs are asked; the other 6 are carried
  const g1 = [...g0]; g1[4] = 'swimming shorts'
  const p2 = plan([Q(g1)], m0.prov)
  ok(JSON.stringify(p2.request['WV13-T01.4'].ask) === '["0-4","1-4","2-4","3-4"]', `a changed gloss 4 asks exactly its 4 pairs (got ${p2.request['WV13-T01.4'].ask})`)
  ok(throws(() => mergeRound(p2.request, [{}, {}], m0.prov, 1)), 'the changed pairs must be rated (empty judge files refuse)')
  const m2 = mergeRound(p2.request, [{ 'WV13-T01.4': { pairs: { '0-4': 'distinct', '1-4': 'overlap', '2-4': 'distinct', '3-4': 'distinct' } } }, { 'WV13-T01.4': { pairs: { '0-4': 'distinct', '1-4': 'overlap', '2-4': 'distinct', '3-4': 'distinct' } } }], m0.prov, 1)
  ok(JSON.stringify(refusedPairs(m2.prov['WV13-T01.4'])) === '["1-4"]', 'a new gloss that both judges call overlapping is refused (real overlaps are still caught); the old refused pair is gone with its gloss')
  // a one-character edit to a gloss is a change; reordering is not
  ok(plan([Q(['tree stem', 'storage chest', 'elephant nose', 'car boot', 'human torsos'])], m0.prov).request['WV13-T01.4'].ask.length === 4, 'a one-character edit re-asks that gloss')
  ok(plan([Q([g0[1], g0[0], g0[2], g0[3], g0[4]])], m0.prov).request['WV13-T01.4'].ask.length === 0, 'reordering glosses re-asks nothing (pairs matched by text)')
  ok(plan([Q(g0, 'WV13-T01.4', 'chest')], m0.prov).request['WV13-T01.4'].ask.length === 10, 'a different headword re-asks everything')
  ok(plan([Q(g0, 'WV13-T02.4')], m0.prov).request['WV13-T02.4'].ask.length === 10, 'another question never inherits verdicts')
  // the carried verdict keeps BOTH judges (an unchanged one-judge overlap stays one-judge, a refusal stays refused)
  ok(m2.prov['WV13-T01.4'].pairs['1-3'].a === 'distinct' && m2.prov['WV13-T01.4'].pairs['1-3'].b === 'overlap' && m2.prov['WV13-T01.4'].pairs['1-3'].round === 0, 'carried pairs keep both judges\' round-0 verdicts and their round')
  // command level (the CLI itself): build -> merge -> round 1 with the same / a different judge session
  const d = join(tmpdir(), `wv13-senses-selftest-${process.pid}`); rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true })
  const unit = gl => ({ passage_id: 'WV13-T01', questions: [{ qid: 'WV13-T01-4', kind: 'vocabulary-in-context', prompt: 'In paragraph 2, the word "trunk" is closest in meaning to', choices: gl }] })
  wj(join(d, 'u0.wv.json'), unit(g0)); wj(join(d, 'u1.wv.json'), unit(g1))
  const run = args => { try { execFileSync(process.execPath, [fileURLToPath(import.meta.url), ...args], { stdio: 'pipe' }); return 0 } catch (e) { return e.status } }
  ok(run(['build', join(d, 'r0'), join(d, 'u0.wv.json')]) === 0, 'cli build r0')
  wj(join(d, 'r0', 'sense-judge.a.json'), jA0); wj(join(d, 'r0', 'sense-judge.b.json'), jB0)
  ok(run(['merge', join(d, 'r0'), '--judge-a', 'sessA', '--judge-b', 'sessA']) === 2, 'cli merge refuses one session used as both judges')
  ok(run(['merge', join(d, 'r0'), '--judge-a', 'sessA', '--judge-b', 'sessB']) === 0, 'cli merge r0')
  ok(run(['build', join(d, 'r1'), join(d, 'u1.wv.json'), '--prev', join(d, 'r0')]) === 0 && rdj(join(d, 'r1', 'sense-judge.json'))[0].pairs.length === 4, 'cli build r1 asks only the 4 changed pairs')
  const r1 = { 'WV13-T01.4': { pairs: { '0-4': 'distinct', '1-4': 'distinct', '2-4': 'distinct', '3-4': 'distinct' } } }
  wj(join(d, 'r1', 'sense-judge.a.json'), r1); wj(join(d, 'r1', 'sense-judge.b.json'), r1)
  ok(run(['merge', join(d, 'r1'), '--judge-a', 'sessX', '--judge-b', 'sessB', '--prev', join(d, 'r0')]) === 2, 'cli merge refuses a judge session that differs from round 0')
  ok(run(['merge', join(d, 'r1'), '--judge-a', 'sessA', '--judge-b', 'sessB', '--prev', join(d, 'r0')]) === 0 && rdj(join(d, 'r1', 'merged', 'sense-judge.b.json'))['WV13-T01.4'].pairs['1-3'] === 'overlap', 'cli merge r1 with the same sessions; carried verdicts reach the verify-shaped files')
  rmSync(d, { recursive: true, force: true })
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed'); process.exit(fail ? 1 : 0)
}

const [cmd, ...rest] = process.argv.slice(2)
if (import.meta.url === `file://${process.argv[1]}`) {
  const after = f => { const i = rest.indexOf(f); return i >= 0 ? rest[i + 1] : null }
  const plain = rest.filter((x, i) => !x.startsWith('--') && !(rest[i - 1] ?? '').startsWith('--'))
  if (cmd === 'build') { const [dir, ...files] = plain; if (!dir || !files.length) die('build <roundDir> <a.wv.json>... [--prev <dir>]'); cmdBuild(dir, files, after('--prev')) }
  else if (cmd === 'merge') { if (!plain[0]) die('merge <roundDir> --judge-a <id> --judge-b <id> [--prev <dir>]'); cmdMerge(plain[0], after('--judge-a'), after('--judge-b'), after('--prev')) }
  else if (cmd === 'report') cmdReport(plain[0] ?? die('report <roundDir>'))
  else if (cmd === '--selftest') selftest()
  else die('usage: build | merge | report | --selftest')
}
