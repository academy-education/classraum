#!/usr/bin/env node
/**
 * ssat-reading-diagnose.mjs — exact, model-free comparison of the live SSAT
 * reading bank against the two rejected rounds (A36 r9a/b/c, A38 ra/rb/rc).
 *
 * READ ONLY. Self-tests on fixtures before it scores anything, and refuses
 * (exit 2) on an empty or malformed population rather than printing a number.
 *
 *   node scripts/study-bank/ssat-reading-diagnose.mjs --selftest
 *   node scripts/study-bank/ssat-reading-diagnose.mjs [--live-cache file.json] [--json out.json] [--candidate pilot.batch.json]
 *
 * Live items are read from study_item_bank (family=ssat, section=reading,
 * verified, not archived), paged past PostgREST's 1000-row cap. Needs
 * .env.local in cwd (or env already exported).
 *
 * The central measurement is a set of DUMB SOLVERS that see no passage and
 * no model: each picks one option per item by a lexical rule. A rule that
 * scores far above 20% on one population and at chance on the other is a
 * stated, mechanical cause, not a narrated one. See SSAT-READING-DIAGNOSIS.md.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

// ── text ────────────────────────────────────────────────────────────────
const STOP = new Set(('a an the and or but of to in on at by for with from as is are was were be been being it its this that these those ' +
  'he she they them his her their him we us our you your i me my which who whom whose what when where why how than then so ' +
  'not no nor do does did has have had into onto over under about after before because since while if would could should will ' +
  'can may might must shall one ones own same such only also very more most much many some any all each every other another ' +
  'passage author narrator best described primarily chiefly concerned according most nearly means used suggests suggest ' +
  'reasonably inferred following which statement serves serve paragraph sentence line lines word phrase does do').split(/\s+/))
export const stem = w => {
  let s = w.toLowerCase()
  for (const suf of ['ingly', 'edly', 'ing', 'ies', 'ied', 'es', 'ed', 'ly', 's']) {
    if (s.length > suf.length + 3 && s.endsWith(suf)) { s = s.slice(0, -suf.length); break }
  }
  return s.slice(0, 6)
}
export const stems = t => new Set(String(t ?? '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s-]/g, ' ')
  .split(/[\s-]+/).filter(w => w && !STOP.has(w) && w.length > 2).map(stem))
const words = t => String(t ?? '').split(/\s+/).filter(Boolean)
const frac = (a, b) => (a.size ? [...a].filter(x => b.has(x)).length / a.size : 0)
const ABS = /\b(all|always|never|entirely|completely|only|none|nothing|every|no one|wholly|totally|solely|cannot|must)\b/i
const MOVE = /\b(but|though|although|without|while|rather than|instead|yet|since|because|despite|even|still|only|not|no|nor|than|whether|that|which|who|what|how|why|and)\b|[;:,]/gi
export const moves = c => (String(c).match(MOVE) ?? []).length
const HEDGE = /\b(partly|partial|some|may|might|not yet|provisional|tentative|qualified|limited|modest|rather than|without|although|though|while|yet)\b/i

export function frameRatio(choices) {
  const ws = choices.map(c => String(c).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean))
  if (ws.some(w => !w.length)) return 0
  let pre = 0; while (ws.every(w => pre < w.length && w[pre] === ws[0][pre])) pre++
  let suf = 0; while (ws.every(w => suf < w.length - pre && w[w.length - 1 - suf] === ws[0][ws[0].length - 1 - suf])) suf++
  return (pre + suf) / (ws.reduce((a, w) => a + w.length, 0) / ws.length)
}

export const stratum = s => {
  s = String(s ?? '').toLowerCase()
  if (s.startsWith('vocab')) return 'vocabulary'
  if (s.startsWith('main')) return 'main-idea'
  if (s.startsWith('attitude')) return 'attitude'
  if (s.startsWith('infer') || s.startsWith('cause-and')) return 'inference'
  if (s.startsWith('purpose') || s.startsWith('structure') || s === 'detail / purpose') return 'structure'
  if (s.startsWith('detail') || s === 'cause') return 'detail'
  return 'other'
}

// ── per-item measurement ───────────────────────────────────────────────
/** Credit a solver that scores each option: 1/k if the key is among k tied maxima. */
const argmaxCredit = (scores, keyIdx) => {
  const m = Math.max(...scores)
  const top = scores.map((s, i) => [s, i]).filter(([s]) => s === m).map(([, i]) => i)
  return top.includes(keyIdx) ? 1 / top.length : 0
}

export function measureGroup(items) {
  // items: [{id, stratum, passage, prompt, choices[], keyIdx}]
  const out = []
  for (const it of items) {
    const sibs = items.filter(o => o !== it)
    const sibOptStems = new Set(sibs.flatMap(o => o.choices.flatMap(c => [...stems(c)])))
    const sibPromptStems = new Set(sibs.flatMap(o => [...stems(o.prompt)]))
    const sibKeyStems = new Set(sibs.flatMap(o => [...stems(o.choices[o.keyIdx])]))
    const sibDistStems = new Set(sibs.flatMap(o => o.choices.filter((_, i) => i !== o.keyIdx).flatMap(c => [...stems(c)])))
    const P = stems(it.passage)
    const S = it.choices.map(stems)
    const own = stems(it.prompt)
    // stems shared by every option (the frame) carry no discriminating information
    const frame = new Set([...S[0]].filter(x => S.every(s => s.has(x))))
    const D = S.map(s => new Set([...s].filter(x => !frame.has(x) && !own.has(x))))
    const recOpt = D.map(s => frac(s, sibOptStems))
    const recPrompt = D.map(s => [...s].filter(x => sibPromptStems.has(x)).length)
    const ground = D.map(s => frac(s, P))
    const len = it.choices.map(c => words(c).length)
    const k = it.keyIdx
    const keyOnly = [...D[k]].filter(x => D.every((s, i) => i === k || !s.has(x)))
    const stemLeak = keyOnly.some(x => sibPromptStems.has(x))
    const dIdx = [0, 1, 2, 3, 4].filter(i => i !== k && i < it.choices.length)
    // does each distractor reuse a sibling's DISTRACTOR content (closed rival set)? >= half its slot stems
    const rivalReuse = dIdx.map(i => frac(D[i], sibDistStems) >= 0.5 ? 1 : 0)
    out.push({
      id: it.id, stratum: it.stratum,
      solver_recurrence: argmaxCredit(recOpt, k),
      solver_sibling_stems: argmaxCredit(recPrompt, k),
      solver_sibling_keys: argmaxCredit(D.map(s => frac(s, sibKeyStems)), k),
      solver_longest: argmaxCredit(len, k),
      solver_grounded: argmaxCredit(ground, k),       // USES the passage: not an attack, a property
      solver_absent_absolute: argmaxCredit(it.choices.map(c => ABS.test(c) ? 0 : 1), k),
      // complexity proxy: the option with the most clause/relation markers (a two-move answer among one-move ones)
      solver_most_moves: argmaxCredit(it.choices.map(moves), k),
      // centroid: the option sharing the most content with the other four (distractors built as mutations OF the key)
      solver_centroid: argmaxCredit(S.map((s, i) => S.reduce((a, t, j) => a + (j === i ? 0 : [...s].filter(x => t.has(x)).length), 0)), k),
      // anti-centroid: the option sharing the least (key as the odd one out)
      solver_odd_one_out: argmaxCredit(S.map((s, i) => -S.reduce((a, t, j) => a + (j === i ? 0 : [...s].filter(x => t.has(x)).length), 0)), k),
      stem_leak: stemLeak ? 1 : 0,
      key_ground: ground[k], dist_ground: dIdx.reduce((a, i) => a + ground[i], 0) / dIdx.length,
      dist_invented: dIdx.filter(i => ground[i] < 0.34).length / dIdx.length,
      key_rec: recOpt[k], dist_rec: dIdx.reduce((a, i) => a + recOpt[i], 0) / dIdx.length,
      rival_reuse: rivalReuse.reduce((a, b) => a + b, 0) / rivalReuse.length,
      frame: frameRatio(it.choices),
      key_abs: ABS.test(it.choices[k]) ? 1 : 0,
      dist_abs: dIdx.filter(i => ABS.test(it.choices[i])).length / dIdx.length,
      key_hedge_unique: HEDGE.test(it.choices[k]) && dIdx.every(i => !HEDGE.test(it.choices[i])) ? 1 : 0,
      opt_words: len.reduce((a, b) => a + b, 0) / len.length,
      key_pos: evidencePos(it.passage, it.choices[k]),
    })
  }
  return out
}

/** Paragraph position (0 = first, 1 = last) of the sentence that best matches the key. */
function evidencePos(passage, key) {
  const paras = String(passage).split(/\n\s*\n/).filter(p => p.trim())
  const K = stems(key); let best = -1, at = 0
  paras.forEach((p, pi) => p.split(/(?<=[.!?”"])\s+/).forEach(s => {
    const v = frac(K, stems(s)); if (v > best) { best = v; at = pi }
  }))
  return paras.length > 1 ? at / (paras.length - 1) : 0
}

export function passageProps(passage) {
  const t = String(passage); const w = words(t)
  return {
    words: w.length,
    paras: t.split(/\n\s*\n/).filter(p => p.trim()).length,
    first_person: /\b(I|my|me)\b/.test(t) ? 1 : 0,
    numerals: (t.match(/\d/g) ?? []).length > 0 ? 1 : 0,
    negations_per_100w: 100 * (t.match(/\b(no|not|never|nothing|none|nor)\b/gi) ?? []).length / w.length,
  }
}

// ── loading ────────────────────────────────────────────────────────────
function groupBy(items, key) { const g = {}; for (const r of items) (g[key(r)] ??= []).push(r); return g }

function loadBatch(names) {
  const items = []
  for (const n of names) {
    const f = n.endsWith('.json') ? n : join(HERE, `ssat-reading-${n}.batch.json`)
    const b = JSON.parse(readFileSync(f, 'utf8'))
    if (!Array.isArray(b) || !b.length) throw new Error(`REFUSING ${f}: zero items`)
    for (const r of b) {
      const keyIdx = r.choices.indexOf(r.correct_answer)
      if (keyIdx < 0) throw new Error(`REFUSING ${f}: ${r.id} key not among choices`)
      items.push({ id: r.id, group: r.set_id, stratum: stratum(r.subskill), passage: r.passage, prompt: r.prompt, choices: r.choices, keyIdx })
    }
  }
  return items
}

async function loadLive(cache) {
  let rows
  if (cache && existsSync(cache)) rows = JSON.parse(readFileSync(cache, 'utf8'))
  else {
    const { createClient } = await import('@supabase/supabase-js')
    let url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if ((!url || !key) && existsSync('.env.local')) {
      const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
      url ??= env.NEXT_PUBLIC_SUPABASE_URL; key ??= env.SUPABASE_SERVICE_ROLE_KEY
    }
    const db = createClient(url, key, { auth: { persistSession: false } })
    rows = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('study_item_bank').select('id,subskill,passage_group_id,cohort,item')
        .eq('family', 'ssat').eq('section', 'reading').eq('verified', true).eq('archived', false).range(from, from + 999)
      if (error) throw error
      rows.push(...data); if (data.length < 1000) break
    }
  }
  if (!rows.length) throw new Error('REFUSING live: zero rows')
  return rows.map(r => {
    const keyIdx = r.item.choices.indexOf(r.item.correct_answer)
    if (keyIdx < 0) throw new Error(`REFUSING live ${r.id}: key not among choices`)
    return { id: r.id, group: r.passage_group_id, cohort: r.cohort, stratum: stratum(r.subskill), passage: r.item.passage, prompt: r.item.prompt, choices: r.item.choices, keyIdx }
  })
}

// ── stats ──────────────────────────────────────────────────────────────
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN
/** Cliff's delta of a over b: P(a>b) - P(a<b). */
const cliff = (a, b) => { let g = 0, l = 0; for (const x of a) for (const y of b) { if (x > y) g++; else if (x < y) l++ } return (g - l) / (a.length * b.length) }

function measurePopulation(items) {
  const groups = groupBy(items, r => r.group)
  const m = []
  for (const g of Object.values(groups)) {
    if (g.length < 2) continue     // a lone item has no siblings to leak; excluded and counted
    m.push(...measureGroup(g))
  }
  const passages = Object.values(groups).map(g => passageProps(g[0].passage))
  return { m, passages, nGroups: Object.keys(groups).length, nSingletons: Object.values(groups).filter(g => g.length < 2).length }
}

// ── self-test ──────────────────────────────────────────────────────────
function selftest() {
  let bad = 0
  const ok = (name, cond) => { if (!cond) bad++; console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}`) }
  // Leaky group: the key's content (debt) recurs in siblings; distractors are one-off inventions.
  const P = 'The yard owed the bank a debt. He sold the boat to pay the debt.'
  const leaky = [
    { id: 1, stratum: 'main-idea', passage: P, prompt: 'The passage is chiefly concerned with', keyIdx: 0,
      choices: ['a boat sold to clear a debt', 'a dragon guarding treasure', 'a violin lesson gone wrong', 'a storm at harvest', 'a lost passport'] },
    { id: 2, stratum: 'inference', passage: P, prompt: 'His first concern was', keyIdx: 2,
      choices: ['winning a chess match', 'painting the kitchen', 'the debt owed to the bank', 'a cousin abroad', 'learning Latin'] },
  ]
  const L = measureGroup(leaky)
  ok('recurrence solver finds keys that recur across siblings', L.every(r => r.solver_recurrence === 1))
  ok('invented distractors are flagged as ungrounded', L.every(r => r.dist_invented === 1))
  // Clean group: every item offers the SAME five rivals, so recurrence cannot pick the key.
  const R = ['debt', 'beginners', 'island crossing', 'rot in the keel', 'single-handed sailing']
  const P2 = 'Five uses were offered: beginners, a swap for single-handed sailing, the island crossing, the rot in the keel was checked, and the debt. The debt decided it.'
  const clean = [
    { id: 3, stratum: 'main-idea', passage: P2, prompt: 'The passage is chiefly concerned with', keyIdx: 0, choices: R.map(x => `a launch let go over ${x}`) },
    { id: 4, stratum: 'inference', passage: P2, prompt: 'His first concern was', keyIdx: 0, choices: R.map(x => `the matter of ${x}`) },
  ]
  const C = measureGroup(clean)
  ok('recurrence solver is at tie-chance on a closed rival set', C.every(r => r.solver_recurrence === 0.2))
  ok('closed rival set reads as full distractor reuse', C.every(r => r.rival_reuse === 1))
  ok('rival distractors are grounded in the passage', C.every(r => r.dist_invented === 0))
  // Stem leak: a sibling stem names the key's unique content.
  const stemLeaky = [
    { id: 5, stratum: 'main-idea', passage: 'x', prompt: 'The passage is chiefly concerned with', keyIdx: 1, choices: ['frogs', 'mite burrows', 'rain', 'moss', 'owls'] },
    { id: 6, stratum: 'detail', passage: 'x', prompt: 'The rate at which the mites burrow is', keyIdx: 0, choices: ['slow', 'fast', 'nil', 'odd', 'even'] },
  ]
  ok('sibling stem naming the key\'s unique slot is counted as a leak', measureGroup(stemLeaky)[0].stem_leak === 1)
  ok('stratum maps live variants', stratum('purpose/structure') === 'structure' && stratum('attitude-tone') === 'attitude' && stratum('cause') === 'detail')
  console.log(bad ? `\n${bad} self-test failure(s)` : '\nself-test clean')
  return bad
}

// ── report ─────────────────────────────────────────────────────────────
const RUN_AS_CLI = import.meta.url === `file://${process.argv[1]}`
if (RUN_AS_CLI) {
  if (selftest()) process.exit(1)
  if (process.argv.includes('--selftest')) process.exit(0)
  const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null }
  const pops = {
    live: await loadLive(arg('--live-cache')),
    r1_A36: loadBatch(['r9a', 'r9b', 'r9c']),
    r2_A38: loadBatch(['ra', 'rb', 'rc']),
  }
  // --candidate <batch.json>: a pilot batch (set_id, subskill, passage, prompt, choices[], correct_answer).
  // Printed beside the three populations; cliff columns stay r1/live and r2/live.
  if (arg('--candidate')) pops.candidate = loadBatch([arg('--candidate')])
  const res = Object.fromEntries(Object.entries(pops).map(([k, v]) => [k, measurePopulation(v)]))
  for (const [k, r] of Object.entries(res)) {
    if (!r.m.length) { console.error(`REFUSING: ${k} measured zero items`); process.exit(2) }
    console.log(`\n${k}: ${pops[k].length} items, ${r.nGroups} passages, ${r.nSingletons} singleton items excluded, measured n=${r.m.length}`)
  }
  const metrics = ['solver_most_moves', 'solver_centroid', 'solver_odd_one_out', 'solver_recurrence', 'solver_sibling_keys', 'solver_sibling_stems', 'solver_longest', 'solver_absent_absolute', 'solver_grounded',
    'stem_leak', 'key_rec', 'dist_rec', 'rival_reuse', 'key_ground', 'dist_ground', 'dist_invented', 'frame', 'key_abs', 'dist_abs', 'key_hedge_unique', 'opt_words', 'key_pos']
  const strata = ['ALL', 'ALL-but-vocab', 'main-idea', 'detail', 'vocabulary', 'inference', 'attitude', 'structure']
  const sel = (m, s) => s === 'ALL' ? m : s === 'ALL-but-vocab' ? m.filter(r => r.stratum !== 'vocabulary') : m.filter(r => r.stratum === s)
  const json = {}
  for (const met of metrics) {
    console.log(`\n── ${met}`)
    console.log(`  ${'stratum'.padEnd(14)} ${'live'.padStart(13)} ${'r1(A36)'.padStart(13)} ${'r2(A38)'.padStart(13)}   cliff r1/live  r2/live`)
    for (const s of strata) {
      const v = Object.fromEntries(Object.entries(res).map(([k, r]) => [k, sel(r.m, s).map(x => x[met])]))
      const cell = a => `${mean(a).toFixed(3)} n=${String(a.length).padStart(3)}`.padStart(13)
      const d1 = cliff(v.r1_A36, v.live), d2 = cliff(v.r2_A38, v.live)
      console.log(`  ${s.padEnd(14)} ${cell(v.live)} ${cell(v.r1_A36)} ${cell(v.r2_A38)}   ${d1.toFixed(2).padStart(6)}  ${d2.toFixed(2).padStart(6)}` + (v.candidate ? `   candidate ${cell(v.candidate)}` : ''))
      ;(json[met] ??= {})[s] = { live: [mean(v.live), v.live.length], r1: [mean(v.r1_A36), v.r1_A36.length], r2: [mean(v.r2_A38), v.r2_A38.length], cliff_r1: d1, cliff_r2: d2 }
    }
  }
  console.log('\n── passages')
  for (const p of ['words', 'paras', 'first_person', 'numerals', 'negations_per_100w']) {
    const v = Object.fromEntries(Object.entries(res).map(([k, r]) => [k, r.passages.map(x => x[p])]))
    console.log(`  ${p.padEnd(20)} live ${mean(v.live).toFixed(2)} (n=${v.live.length})  r1 ${mean(v.r1_A36).toFixed(2)} (n=${v.r1_A36.length})  r2 ${mean(v.r2_A38).toFixed(2)} (n=${v.r2_A38.length})  cliff r1 ${cliff(v.r1_A36, v.live).toFixed(2)} r2 ${cliff(v.r2_A38, v.live).toFixed(2)}`)
    ;(json.passages ??= {})[p] = { live: mean(v.live), r1: mean(v.r1_A36), r2: mean(v.r2_A38) }
  }
  // live by cohort, since the live bank is three authoring cohorts that may differ
  console.log('\n── live by cohort (ALL-but-vocab)')
  const byC = groupBy(pops.live, r => r.cohort)
  for (const [c, its] of Object.entries(byC)) {
    const m = measurePopulation(its).m.filter(r => r.stratum !== 'vocabulary')
    console.log(`  ${c.padEnd(26)} n=${String(m.length).padStart(3)}  recurrence ${mean(m.map(r => r.solver_recurrence)).toFixed(3)}  sib_keys ${mean(m.map(r => r.solver_sibling_keys)).toFixed(3)}  rival_reuse ${mean(m.map(r => r.rival_reuse)).toFixed(3)}  dist_invented ${mean(m.map(r => r.dist_invented)).toFixed(3)}  stem_leak ${mean(m.map(r => r.stem_leak)).toFixed(3)}`)
  }
  if (arg('--json')) writeFileSync(arg('--json'), JSON.stringify(json, null, 1))
}
