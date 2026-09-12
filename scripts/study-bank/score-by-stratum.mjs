/*
 * Score an options-only run BY STRATUM, candidate against live control.
 *
 * CLAUDE.md: "the split is by stratum, not by batch, which is why per-batch
 * means kept hiding it." Craft and Structure holds three subskills whose
 * measured blind rates span 12.5% to 87.5%. A single batch mean over a
 * 10/8/6 mix is an average across that spread and can hide a catastrophic
 * stratum behind a clean one, in either direction.
 *
 * So this prints per-subskill rates for both files and the DIFFERENCE, which
 * is the only number that says anything about the candidate: the instrument's
 * floor on a stratum is whatever the shipped items score on it.
 *
 * usage: score-by-stratum.mjs <candidateTag> <controlTag>
 */
import { readFileSync, existsSync } from 'node:fs'
const D = 'scripts/study-bank'
const [candTag, ctlTag] = process.argv.slice(2)
if (!candTag || !ctlTag) { console.error('usage: score-by-stratum.mjs <candidateTag> <controlTag>'); process.exit(2) }

const norm = s => String(s || '').trim().toLowerCase()

function run(tag, batchFile) {
  const key = JSON.parse(readFileSync(`${D}/${tag}-oo.key.json`, 'utf8'))
  const blind = JSON.parse(readFileSync(`${D}/${tag}-oo.blind.json`, 'utf8'))
  const list = Array.isArray(blind) ? blind : Object.values(blind)
  const widths = [...new Set(list.map(x => Object.keys(x.options ?? {}).length).filter(Boolean))]
  if (widths.length !== 1) { console.error(`REFUSING ${tag}: mixed option widths ${widths}`); process.exit(2) }
  const chance = 100 / widths[0]
  const batch = JSON.parse(readFileSync(`${D}/${batchFile}`, 'utf8'))
  const sub = new Map(batch.map(i => [String(i.id), norm(i.subskill ?? i.kind)]))
  const files = ['solver-a', 'solver-b', 'solver-c'].map(s => `${D}/${tag}-oo.${s}.json`)
  const missing = files.filter(f => !existsSync(f))
  if (missing.length) { console.error(`REFUSING ${tag}: ${missing.length} solver file(s) missing — a partial run is not a run.`); process.exit(2) }
  const solvers = files.map(f => JSON.parse(readFileSync(f, 'utf8')))
  const ids = Object.keys(key)
  const acc = {}
  let ok = 0, n = 0
  for (const id of ids) {
    const s = sub.get(String(key[id].localId)) ?? '(unlabelled)'
    acc[s] ??= { ok: 0, n: 0, items: 0 }
    acc[s].items++
    for (const sv of solvers) {
      const v = sv[id]; if (!v) continue
      n++; acc[s].n++
      if (v.pick === key[id].letter) { ok++; acc[s].ok++ }
    }
  }
  if (n !== ids.length * 3) { console.error(`REFUSING ${tag}: ${n} picks over ${ids.length} items x 3 — a solver skipped items.`); process.exit(2) }
  /* A stratum needs members. `subskill` is a real taxonomy in four sections
   * (sat/reading_writing 10.5 items per label, act/reading 12.5, ssat/reading
   * 9.2, isee/verbal 90.0) and a FREE-TEXT NOTE FIELD in the rest -- sat/math
   * carries 776 distinct labels over 1,114 items, 670 of them singletons, and
   * act/math 393 over 401. Measured 2026-09-12 over all 6,438 live rows.
   * Grouping those by subskill yields one item per stratum, and this file's
   * own governing rule says a rate over one item is the absence of a
   * measurement, not a pass. So refuse rather than print a full table of
   * noise. */
  /* Measured as the share of ITEMS that land in a stratum big enough to
   * measure, not as a median over strata. The median was my first rule and a
   * break-test refuted it: six strata sized [1,1,1,8,8,8] have a Math.floor
   * upper median of 8 and would have passed, while half of them are
   * singletons. Counting items instead gives 24 of 27 in usable strata, which
   * is the honest reading of that case -- and 0 of 28 for a free-text section,
   * which is the case this guard exists for. */
  const MIN = 3
  const usable = Object.values(acc).filter(a => a.items >= MIN).reduce((t, a) => t + a.items, 0)
  const share = usable / ids.length
  if (share < 0.5) {
    console.error(`REFUSING ${tag}: only ${usable} of ${ids.length} items (${(100 * share).toFixed(0)}%) sit in a stratum of ${MIN}+ items, across ${Object.keys(acc).length} strata.`)
    console.error('  `subskill` is not a taxonomy in this section -- it is a per-item note. Group by `domain` instead, or score unstratified.')
    process.exit(2)
  }
  return { chance, mean: 100 * ok / n, n, acc, items: ids.length }
}

const cand = run(candTag, `${candTag}.batch.json`)
const ctl = run(ctlTag, `${ctlTag}.batch.json`)
if (cand.chance !== ctl.chance) { console.error(`REFUSING: chance lines differ (${cand.chance} vs ${ctl.chance}) — not comparable.`); process.exit(2) }

console.log(`chance line ${cand.chance.toFixed(1)}%   candidate ${candTag} (${cand.items} items)   control ${ctlTag} (${ctl.items} items)`)
console.log('')
console.log('stratum                          candidate      control     difference')
console.log('-'.repeat(74))
const strata = [...new Set([...Object.keys(cand.acc), ...Object.keys(ctl.acc)])].sort()
for (const s of strata) {
  const c = cand.acc[s], k = ctl.acc[s]
  const cr = c ? 100 * c.ok / c.n : null
  const kr = k ? 100 * k.ok / k.n : null
  const d = (cr !== null && kr !== null) ? (cr - kr) : null
  const f = (v, items) => v === null ? '     n/a  ' : `${v.toFixed(1).padStart(6)}% (${String(items).padStart(2)})`
  console.log(`${s.slice(0, 30).padEnd(32)}${f(cr, c?.items ?? 0)}  ${f(kr, k?.items ?? 0)}  ${d === null ? '   n/a' : (d > 0 ? '+' : '') + d.toFixed(1)}`)
}
console.log('-'.repeat(74))
console.log(`${'OVERALL'.padEnd(32)}${cand.mean.toFixed(1).padStart(6)}% (${cand.items})  ${ctl.mean.toFixed(1).padStart(6)}% (${ctl.items})  ${(cand.mean - ctl.mean > 0 ? '+' : '') + (cand.mean - ctl.mean).toFixed(1)}`)
console.log('')
console.log('The DIFFERENCE column is the only one that speaks about the candidate.')
console.log('A stratum where the control is itself far above chance has an instrument')
console.log('floor there, and the candidate is only worse than the bank if it exceeds it.')
console.log('Per-stratum n is small; read the item counts in brackets before the rates.')
