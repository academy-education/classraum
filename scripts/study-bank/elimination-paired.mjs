#!/usr/bin/env node
/**
 * elimination-paired.mjs — the SAT R&W `elimination` stage, measured against a
 * MATCHED LIVE CONTROL instead of a literal zero.  (register A23, 2026-10-02)
 *
 * WHY THE OLD BAR WAS REPLACED
 *
 * PIPELINE.md stage 5 read "PASS: zero items with any confidently rejectable
 * option". It was applied to SAT R&W for the first time on 2026-09-04, failed
 * both batches it met (rw-v8-cs-hard 16/24 items, rw-v8-sec-hard 5/24), and both
 * shipped under BANK_GATE_OVERRIDE with the reason "met by no cohort in this
 * bank". Nobody had measured that claim. A bar that the shipped bank itself
 * cannot meet is the floor twin of the ceiling problem in CLAUDE.md: it can only
 * ever return FAIL, so it gets overridden, so it gates nothing. Later batches
 * then recorded the stage as passed on ad-hoc readings of "zero" — the ledger
 * holds five different interpretations of one bar.
 *
 * THE INSTRUMENT (unchanged in spirit, now committed)
 *
 * One reader, options only, stem and passage withheld. Per item: which option
 * would you reject first, why, are you certain, and WHICH letters are
 * confidently rejectable without the source. Listing the letters is the one
 * addition: it lets the score distinguish a real free elimination (a distractor)
 * from a reader confidently rejecting the KEY (an error, not a leak).
 *
 *   item is "eliminable"  <=>  >= 1 confidently rejected letter is NOT the key
 *
 * Candidate and control are rendered into SEPARATE files and read by separate
 * runs. Interleaving them was refuted on 2026-09-15 (sat-wic-v1: interleaving
 * moved the control 18.5 points by handing the reader calibration).
 *
 * THE CONTROL
 *
 * Live, verified, unarchived rows of the same family/section/domain, from
 * cohorts OTHER than the candidate, composition-matched to the candidate's live
 * rows on the strata given by --match (default subskill,difficulty; SEC
 * subskills are free text per item, so SEC matches on difficulty only), drawn at
 * --ratio controls per candidate row with the shared seeded generator.
 *
 * THE BAR — PRE-REGISTERED 2026-10-02, BEFORE ANY CONTROL WAS READ
 *
 *   margin = mean candidate eliminable-rate - mean control eliminable-rate,
 *            each averaged over the SAME number of samples (>= 3)
 *   PASS   iff margin <= +20.0 points
 *   NO VERDICT (exit 3) unless the bar can fire both ways:
 *            control rate <= 80% (else +20 is unreachable: ceiling), and
 *            candidate n >= 12 and control n >= candidate n.
 *
 * Why 20: at the candidate sizes this stage sees (16-24 items, controls at 2x)
 * the sampling SD of a difference of two rates near 40% is ~13-15 points, so 20
 * is ~1.4 SD — strict enough to catch a batch that is materially more
 * eliminable than what it joins, loose enough that a clean batch is not failed
 * by one unlucky draw. It is a margin, not a level, because the level is a
 * property of the format (four bare adjectives are inert; four prose claims are
 * not) and the control carries the format.
 *
 * THE SAMPLES ARE ONE SOLVER (CLAUDE.md, 2026-09-25). Three runs of one model
 * family are three samples, not three solvers. No independence statistic is
 * printed. The permutation p-value below treats the ITEM as the unit (each
 * item's score is its mean over samples), which is the honest unit; it is
 * printed for information and gates nothing.
 *
 * Usage:
 *   node scripts/study-bank/elimination-paired.mjs render <cohort> --domain "<D>" --tag T
 *        [--match subskill,difficulty] [--ratio 2] [--exclude c1,c2]
 *     -> T.cand.blind.json / T.cand.key.json / T.ctl.blind.json / T.ctl.key.json
 *   node scripts/study-bank/elimination-paired.mjs score T
 *     reads T.cand.elim-*.json and T.ctl.elim-*.json (same sample letters both arms)
 *     prints the stage block for ledger.json; exit 0 PASS, 1 FAIL, 2 refused, 3 no verdict
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
export const ELIM_MARGIN_MAX = 0.20
export const ELIM_CONTROL_CEILING = 1 - ELIM_MARGIN_MAX
export const ELIM_MIN_N = 12
export const ELIM_MIN_SAMPLES = 3

/** Pure verdict, shared with gate.mjs so the gate re-derives rather than trusts. */
export function eliminationVerdict({ candidateRate, controlRate, n, controlN, samples }) {
  const nums = [candidateRate, controlRate, n, controlN, samples]
  if (nums.some(x => typeof x !== 'number' || !Number.isFinite(x))) return { verdict: 'none', why: 'missing or non-numeric measurement fields' }
  if (samples < ELIM_MIN_SAMPLES) return { verdict: 'none', why: `${samples} sample(s); need ${ELIM_MIN_SAMPLES}` }
  if (n < ELIM_MIN_N) return { verdict: 'none', why: `candidate n=${n} < ${ELIM_MIN_N}: a rate over so few items is not a measurement` }
  if (controlN < n) return { verdict: 'none', why: `control n=${controlN} smaller than candidate n=${n}` }
  if (controlRate > ELIM_CONTROL_CEILING + 1e-9) return { verdict: 'none', why: `control ${(controlRate * 100).toFixed(1)}% leaves under ${(ELIM_MARGIN_MAX * 100).toFixed(0)} points of headroom: the bar cannot fire` }
  const margin = candidateRate - controlRate
  return { verdict: margin <= ELIM_MARGIN_MAX + 1e-9 ? 'pass' : 'fail', margin, why: `margin ${(margin * 100).toFixed(1)} pts vs bar +${(ELIM_MARGIN_MAX * 100).toFixed(0)}` }
}

const LET = ['A', 'B', 'C', 'D']

async function render(args) {
  const cohort = args[0]
  const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined }
  const domain = opt('--domain'), tag = opt('--tag')
  const match = (opt('--match') ?? 'subskill,difficulty').split(',').filter(Boolean)
  const ratio = Number(opt('--ratio') ?? 2)
  const exclude = new Set([cohort, ...(opt('--exclude') ?? '').split(',').filter(Boolean)])
  if (!cohort || !domain || !tag) { console.error('usage: render <cohort> --domain "<D>" --tag T'); process.exit(2) }
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,cohort,difficulty,subskill,item')
      .eq('family', 'sat').eq('section', 'reading_writing').eq('domain', domain)
      .eq('verified', true).eq('archived', false).order('id', { ascending: true }).range(f, f + 999)
    if (error) throw new Error(error.message)
    rows.push(...data); if (data.length < 1000) break
  }
  const ok = r => Array.isArray(r.item?.choices) && r.item.choices.length === 4 && r.item.choices.map(String).includes(String(r.item.correct_answer))
  const cand = rows.filter(r => r.cohort === cohort && ok(r))
  if (cand.length < ELIM_MIN_N) { console.error(`REFUSING: ${cand.length} live four-choice rows in ${cohort}/${domain}; need ${ELIM_MIN_N}.`); process.exit(2) }
  const stratum = r => match.map(k => String(r[k] ?? r.item?.[k] ?? '')).join(' | ')
  const pool = rows.filter(r => !exclude.has(r.cohort) && ok(r))
  const rand = rng(20261002)
  const need = new Map()
  for (const r of cand) need.set(stratum(r), (need.get(stratum(r)) ?? 0) + ratio)
  const ctl = []
  for (const [s, k] of need) {
    const p = shuffleWith(pool.filter(r => stratum(r) === s), rand)
    if (p.length < k) { console.error(`REFUSING: stratum "${s}" needs ${k} control rows, pool holds ${p.length}.`); process.exit(2) }
    ctl.push(...p.slice(0, k))
  }
  const deal = (list, name) => {
    const order = shuffleWith(list.slice(), rand)  // no stored order crosses into the render
    const blind = {}, key = {}
    order.forEach((r, i) => {
      const ch = r.item.choices.map(String)
      const ci = ch.indexOf(String(r.item.correct_answer))
      const want = LET[i % 4]
      const rest = shuffleWith(ch.filter((_, j) => j !== ci), rand)
      let q = 0
      const out = LET.map(l => (l === want ? ch[ci] : rest[q++]))
      const bid = `L${String(i + 1).padStart(2, '0')}`
      blind[bid] = { options: Object.fromEntries(LET.map((l, j) => [l, out[j]])) }
      key[bid] = { letter: want, id: r.id, cohort: r.cohort, stratum: stratum(r) }
    })
    writeFileSync(join(HERE, `${tag}.${name}.blind.json`), JSON.stringify(blind, null, 2) + '\n')
    writeFileSync(join(HERE, `${tag}.${name}.key.json`), JSON.stringify(key, null, 2) + '\n')
  }
  deal(cand, 'cand'); deal(ctl, 'ctl')
  const by = m => [...m].map(([k, v]) => `${k}: ${v}`).join('; ')
  const cc = new Map(); for (const r of ctl) cc.set(r.cohort, (cc.get(r.cohort) ?? 0) + 1)
  console.log(`candidate ${cohort}: ${cand.length} live rows; control: ${ctl.length} rows matched on [${match.join(', ')}]`)
  console.log(`  strata: ${by(need)}`)
  console.log(`  control cohorts: ${by(cc)}`)
}

function score(tag) {
  const files = readdirSync(HERE)
  const samples = arm => files.filter(f => f.startsWith(`${tag}.${arm}.elim-`) && f.endsWith('.json')).sort()
  const sc = samples('cand'), sk = samples('ctl')
  const letters = a => a.map(f => f.replace(/^.*\.elim-/, '').replace(/\.json$/, '')).join(',')
  if (!sc.length || letters(sc) !== letters(sk)) { console.error(`REFUSING: candidate samples [${letters(sc)}] and control samples [${letters(sk)}] must match and be non-empty.`); process.exit(2) }
  const arm = (name, sfiles) => {
    const key = JSON.parse(readFileSync(join(HERE, `${tag}.${name}.key.json`), 'utf8'))
    const ids = Object.keys(key).sort()
    const per = ids.map(() => 0), keyRej = [], rates = []
    for (const f of sfiles) {
      let s = JSON.parse(readFileSync(join(HERE, f), 'utf8'))
      if (s.items && !Array.isArray(s.items)) s = s.items
      const got = Object.keys(s).sort()
      if (got.length !== ids.length || got.some((x, i) => x !== ids[i])) { console.error(`REFUSING: ${f} covers ${got.length} ids, key has ${ids.length}.`); process.exit(2) }
      let elim = 0, kr = 0
      ids.forEach((id, i) => {
        const rej = s[id].confident_rejects
        if (!Array.isArray(rej)) { console.error(`REFUSING: ${f} ${id} has no confident_rejects array.`); process.exit(2) }
        const real = rej.filter(l => l !== key[id].letter)
        if (rej.includes(key[id].letter)) kr++
        if (real.length) { elim++; per[i]++ }
      })
      rates.push(elim / ids.length); keyRej.push(kr)
    }
    const itemMeans = per.map(x => x / sfiles.length)
    const byCohort = new Map()
    ids.forEach((id, i) => { const c = key[id].cohort; const a = byCohort.get(c) ?? [0, 0]; a[0] += itemMeans[i]; a[1]++; byCohort.set(c, a) })
    return { n: ids.length, rates, mean: rates.reduce((a, b) => a + b, 0) / rates.length, keyRej, itemMeans, byCohort }
  }
  const c = arm('cand', sc), k = arm('ctl', sk)
  // Item-level permutation test (one-sided: candidate more eliminable). Information only.
  const all = [...c.itemMeans, ...k.itemMeans], obs = c.mean - k.mean
  const rand = rng(7); let hit = 0; const R = 20000
  for (let r = 0; r < R; r++) {
    const s = shuffleWith(all.slice(), rand)
    const a = s.slice(0, c.n).reduce((x, y) => x + y, 0) / c.n, b = s.slice(c.n).reduce((x, y) => x + y, 0) / k.n
    if (a - b >= obs - 1e-12) hit++
  }
  const v = eliminationVerdict({ candidateRate: c.mean, controlRate: k.mean, n: c.n, controlN: k.n, samples: sc.length })
  const pct = x => (x * 100).toFixed(1) + '%'
  console.log(`${tag}: ${sc.length} samples per arm (one solver sampled ${sc.length} times — not ${sc.length} solvers)`)
  console.log(`  candidate n=${c.n}  eliminable ${pct(c.mean)}  per sample [${c.rates.map(pct).join(', ')}]  key confidently rejected [${c.keyRej.join(',')}]`)
  console.log(`  control   n=${k.n}  eliminable ${pct(k.mean)}  per sample [${k.rates.map(pct).join(', ')}]  key confidently rejected [${k.keyRej.join(',')}]`)
  console.log(`  control by cohort: ${[...k.byCohort].map(([co, [s, n]]) => `${co} ${pct(s / n)} (n=${n})`).join('; ')}`)
  console.log(`  margin ${(obs * 100).toFixed(1)} pts; bar +${ELIM_MARGIN_MAX * 100}; control ceiling for the bar ${pct(ELIM_CONTROL_CEILING)}; item-level permutation p=${(hit / R).toFixed(3)} (information only)`)
  console.log(`  VERDICT: ${v.verdict.toUpperCase()} — ${v.why}`)
  const stage = { passed: v.verdict === 'pass', bar: 'paired-control-v1', candidateRate: +c.mean.toFixed(4), controlRate: +k.mean.toFixed(4), margin: +obs.toFixed(4), threshold: ELIM_MARGIN_MAX, n: c.n, controlN: k.n, samples: sc.length }
  console.log(JSON.stringify(stage))
  process.exit(v.verdict === 'pass' ? 0 : v.verdict === 'fail' ? 1 : 3)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [cmd, ...rest] = process.argv.slice(2)
  if (cmd === 'render') await render(rest)
  else if (cmd === 'score' && rest[0]) score(rest[0])
  else { console.error('usage: elimination-paired.mjs render|score ...'); process.exit(2) }
}
