/**
 * agent-review-score.mjs — scores the SSAT/MAP agent review under
 * AGENT-REVIEW-SSAT-MAP.prereg.md §3. Rules live in agent-review-core.mjs.
 *
 *   node scripts/study-bank/agent-review-score.mjs [--stratum ssat-reading] [--manifest path] [--out dir] [--root dir]
 *
 * Reads every selected packet's index.json and grades-{a,b,c}.json. Exits 2 —
 * writing nothing — if any of them is missing or malformed: a packet with fewer
 * than three valid grader files is never scored. Writes per-cohort
 * <out>/<cohort>.json with cleared ids, dropped ids (with reasons), and hold.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scorePacket, scoreCohorts, validateGrades, GRADERS, ReviewError } from './agent-review-core.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d }
const die = m => { console.error(`agent-review-score: ${m}`); process.exit(2) }

function readJson(path, label) {
  if (!existsSync(path)) throw new ReviewError(`${label}: missing (${path})`)
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch (e) { throw new ReviewError(`${label}: not valid JSON (${e.message})`) }
}

export function scoreManifest(manifest, root, stratum) {
  const sel = manifest.packets.filter(p => !stratum || p.stratum === stratum)
  if (!sel.length) throw new ReviewError(`no packets selected${stratum ? ` for stratum ${stratum}` : ''}`)
  const scored = []
  for (const p of sel) {
    const index = readJson(join(root, p.dir, 'index.json'), `${p.id} index`)
    if (!Array.isArray(index) || index.length !== p.items) throw new ReviewError(`${p.id}: index has ${index?.length} rows, manifest says ${p.items}`)
    const grades = {}
    for (const k of GRADERS) {
      grades[k] = readJson(join(root, p.dir, `grades-${k}.json`), `${p.id} grader ${k}`)
      validateGrades(grades[k], index.length, `${p.id} grader ${k}`)
    }
    scored.push({ index, score: scorePacket(index, grades) })
  }
  return { packets: sel.length, results: scoreCohorts(scored) }
}

function main() {
  const manifestPath = resolve(ROOT, arg('--manifest', 'scratchpad/agent-review/MANIFEST.json'))
  const out = resolve(ROOT, arg('--out', 'scripts/study-bank/agent-review/results'))
  const stratum = arg('--stratum', null)
  let res
  try {
    const manifest = readJson(manifestPath, 'manifest')
    res = scoreManifest(manifest, resolve(arg('--root', ROOT)), stratum)
  } catch (e) { die(e.message) }
  const rows = Object.entries(res.results)
  const items = rows.reduce((s, [, c]) => s + c.total, 0)
  const cleared = rows.reduce((s, [, c]) => s + c.cleared.length, 0)
  console.log(`scored ${res.packets} packets x ${GRADERS.length} graders | items ${items} | cleared ${cleared} | dropped ${rows.reduce((s, [, c]) => s + Object.keys(c.dropped).length, 0)} | cohorts held ${rows.filter(([, c]) => c.hold).length} of ${rows.length}`)
  mkdirSync(out, { recursive: true })
  for (const [cohort, c] of rows.sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${cohort.padEnd(30)} ${String(c.cleared.length).padStart(4)} / ${String(c.total).padStart(4)} cleared${c.hold ? `  HOLD: ${c.patterns.map(p => p.pattern).join(', ')}` : ''}`)
    writeFileSync(join(out, `${cohort}.json`), JSON.stringify({ cohort, ...c }, null, 1) + '\n')
  }
  console.log(`wrote ${rows.length} cohort files to ${out}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
