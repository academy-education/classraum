#!/usr/bin/env node
/**
 * alg32-census.mjs — the LIVE-DUPLICATE PROBE for sat-math-v32-alg (PREREG-MATH-ALG32-2026-10-23.md,
 * rule 4). Written because ISEE math s18 (REGISTER, 2026-10-22) passed every scripted duplicate check
 * (stem-duplicates 0, math-mechanism-dup 0) and a hand read then found ~44 of 60 items already live:
 * the live bank holds the standard canon, numbers and wording differ, and an author who does not read
 * it first rewrites it. Here the canon includes the 25 live sat-math-v26-alg items, written in these
 * exact three mechanisms. Two steps, both BEFORE an item is written:
 *
 *   census <B|C|D> [--dump DIR]
 *       Every live maths row (all four families) and every prior SAT maths batch item whose prompt
 *       matches the mechanism's fixed signature (below), SAT Algebra first, written in full to
 *       WORK/census-<X>.txt for the author to READ before writing any item. Refuses (exit 2) on a
 *       missing or short dump, zero hits, or a signature that misses ANY live v26 item of that
 *       mechanism (the census must at least contain the canon it exists to show).
 *
 *   idea <slot> --setup "i | ii | iii" --q "<term&term|alt>" --q "<...>" [--q ...] [--dump DIR]
 *       Probes ONE idea against the live rows and prior batch items before it is written: >= 2
 *       keyword queries (mf30-kw.mjs syntax: '&' = all terms, '|' = alternation inside a term),
 *       every hit printed in full (up to 40 per query), and the attempt APPENDED to
 *       WORK/ideas/<slot>.json with its time. alg32-part-check.sh refuses a part whose `idea_probe.at`
 *       is not an attempt in that file or is not earlier than the part file. A rejected idea is just
 *       an earlier attempt; the part names the one it used.
 *
 *   check-part <WORK/parts/SM32L-XN.json>
 *       The order guarantee, run by alg32-part-check.sh: the part's idea_probe.at is a logged attempt,
 *       earlier than the part file, with >= 2 queries each <= 40 hits (read), and idea_probe.nearest
 *       is filled in. Exit 1 on a failure.
 *
 * Exit 1 never (this prints evidence; the author and I read it); 2 on any input it cannot use.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { WORK, PRIV, SLOTS, MECH } from './alg32-slots.mjs'

const D = new URL('.', import.meta.url).pathname
export const SIG = {
  B: [/\b(constant|parameter)\b|\bwhere [a-z] is\b|\bvalues? of [a-z]\b/i,
    /solution|infinitely many|every value|for all|never|parallel|same line|same amount|no value|coincid|equal at|intersect|meet|in common/i],
  C: [/how many|number of|count|exactly [0-9a-z]+ (positive |negative |whole |different )?(integers|whole numbers|values)|integer solutions/i,
    /integer|whole[- ]number|positive/i,
    /\bk\b|constant|inequalit|<|>|≤|≥|at least|at most|less than|greater than|between/i],
  D: [/maxim|minim|greatest|least|largest|smallest|most|fewest|cheapest/i,
    /whole|integer|number of|how many/i,
    /at most|at least|no more than|no fewer than|≤|≥|budget|limit|cannot exceed|must/i],
}
const arg = (k, all = false) => { const v = []; process.argv.forEach((a, i) => { if (a === k && process.argv[i + 1] != null) v.push(process.argv[i + 1]) }); return all ? v : v[0] }
function load(dir) {
  let live, prior
  try { live = JSON.parse(readFileSync(`${dir}/live-maths.json`, 'utf8')); prior = JSON.parse(readFileSync(`${dir}/prior-math.json`, 'utf8')) } catch { console.error(`REFUSING: no dump in ${dir}; run alg32-dump.mjs`); process.exit(2) }
  if (!Array.isArray(live) || live.length < 3000) { console.error(`REFUSING: dump holds ${live?.length} live rows (< 3000)`); process.exit(2) }
  if (!Array.isArray(prior) || !prior.length) { console.error('REFUSING: prior-math.json is empty'); process.exit(2) }
  return { live, prior }
}
const fmt = (r, src) => `--- ${String(r.id).slice(0, 12)} [${src}]\n${String(r.prompt).replace(/\s+\n/g, '\n')}\n   options ${JSON.stringify(r.choices)} key ${r.correct_answer}`

const [cmd, which] = process.argv.slice(2)
const dir = arg('--dump') ?? `${PRIV}/dump`
if (cmd === 'census') {
  if (!SIG[which]) { console.error('usage: alg32-census.mjs census <B|C|D> [--dump DIR]'); process.exit(2) }
  const { live, prior } = load(dir)
  const hit = r => SIG[which].every(re => re.test(String(r.prompt)))
  const rank = r => (r.family === 'sat' && r.domain === 'Algebra' ? 0 : r.family === 'sat' ? 1 : 2)
  const L = live.filter(hit).sort((a, b) => rank(a) - rank(b) || String(a.cohort).localeCompare(String(b.cohort)))
  const P = prior.filter(hit)
  if (!L.length) { console.error(`REFUSING: the ${which} signature matched 0 live rows`); process.exit(2) }
  // the canon check: every live v26 item of this mechanism must be in the census
  const kept = JSON.parse(readFileSync(`${D}sat-math-v26-alg.kept.batch.json`, 'utf8')), meta = JSON.parse(readFileSync(`${D}sat-math-v26-alg.meta.json`, 'utf8'))
  const canon = kept.filter(k => meta[k.id]?.mech === MECH[which])
  if (!canon.length) { console.error(`REFUSING: no live v26 item found for ${MECH[which]}`); process.exit(2) }
  const missed = canon.filter(k => !L.some(r => r.prompt === k.prompt))
  if (missed.length) { console.error(`REFUSING: the ${which} signature misses live v26 ${missed.map(k => k.id).join(', ')}`); process.exit(2) }
  mkdirSync(WORK, { recursive: true })
  const head = `census ${which} (${MECH[which]}) from ${dir}: ${L.length} live rows (SAT Algebra ${L.filter(r => rank(r) === 0).length}, other SAT ${L.filter(r => rank(r) === 1).length}, other families ${L.filter(r => rank(r) === 2).length}) + ${P.length} prior batch items; contains all ${canon.length} live v26 ${MECH[which]} items`
  const body = [head, '', '=== LIVE (students see these; a same-mechanism, same-setup item is a duplicate) ===',
    ...L.map(r => fmt(r, `live ${r.family}/${r.cohort} ${r.domain} ${r.difficulty}`)), '', '=== PRIOR BATCH FILES (held / dropped / frozen; a setup used here is banned too) ===', ...P.map(r => fmt(r, `prior ${r.file}`))].join('\n')
  writeFileSync(`${WORK}/census-${which}.txt`, body + '\n')
  console.log(head)
  console.log(`wrote ${WORK}/census-${which}.txt`)
} else if (cmd === 'idea') {
  const slot = which
  const setup = arg('--setup'), qs = arg('--q', true)
  if (!SLOTS[slot] || !setup || qs.length < 2) { console.error('usage: alg32-census.mjs idea <slot> --setup "i | ii | iii" --q "<q>" --q "<q>" [--q ...]  (>= 2 queries, a commissioned slot)'); process.exit(2) }
  if (setup.split('|').map(s => s.trim()).filter(Boolean).length !== 3) { console.error('REFUSING: --setup must be "i | ii | iii"'); process.exit(2) }
  const { live, prior } = load(dir)
  const res = []
  for (const q of qs) {
    const terms = q.split('&').map(t => t.trim()).filter(Boolean)
    if (!terms.length) { console.error(`REFUSING: empty query "${q}"`); process.exit(2) }
    let res2; try { res2 = terms.map(t => new RegExp(t, 'i')) } catch (e) { console.error(`REFUSING: bad query "${q}": ${e.message}`); process.exit(2) }
    const m = r => { const s = `${r.passage ?? ''} ${r.prompt} ${(r.choices ?? []).join(' ')}`; return res2.every(t => t.test(s)) }
    const H = [...live.filter(m).map(r => ({ src: `live ${r.family}/${r.cohort} ${r.domain} ${r.difficulty}`, ...r })), ...prior.filter(m).map(r => ({ src: `prior ${r.file}`, ...r }))]
    console.log(`query "${q}": ${H.length} hits over ${live.length} live + ${prior.length} prior`)
    for (const r of H.slice(0, 40)) console.log(fmt(r, r.src))
    if (H.length > 40) console.log(`(${H.length - 40} more: narrow the query; a query with > 40 hits does not count as read)`)
    res.push({ q, n: H.length, read: H.length <= 40, ids: H.slice(0, 40).map(r => String(r.id)) })
  }
  const f = `${WORK}/ideas/${slot}.json`
  mkdirSync(`${WORK}/ideas`, { recursive: true })
  const log = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : []
  const at = new Date().toISOString()
  log.push({ slot, at, setup, queries: res })
  writeFileSync(f, JSON.stringify(log, null, 1) + '\n')
  console.log(`\nidea attempt ${log.length} for ${slot} logged at ${at} -> ${f}\nput "idea_probe": {"at": "${at}", "nearest": "<id + why it differs>"} in the part`)
} else if (cmd === 'check-part') {
  // the ORDER guarantee: the idea was probed before the item was written
  const p = which
  let it; try { it = JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) }
  if (!it || Array.isArray(it) || !it.id) { console.error(`REFUSING: ${p} is not one part object`); process.exit(2) }
  const slot = String(it.id).replace(/^SM32L-/, ''), f = `${WORK}/ideas/${slot}.json`
  const fail = m => { console.log(`IDEA FAIL ${it.id}: ${m}`); process.exit(1) }
  if (!existsSync(f)) fail(`no idea probe logged (${f}); run alg32-census.mjs idea ${slot} ... BEFORE writing the item`)
  const log = JSON.parse(readFileSync(f, 'utf8'))
  const at = it.idea_probe?.at
  const att = Array.isArray(log) ? log.find(a => a.at === at) : null
  if (!att) fail(`idea_probe.at ${JSON.stringify(at)} is not an attempt in ${f}`)
  if (typeof it.idea_probe?.nearest !== 'string' || it.idea_probe.nearest.trim().length < 20) fail('idea_probe.nearest (>= 20 chars: the nearest live row and why it differs) missing')
  const unread = att.queries.filter(q => !q.read)
  if (unread.length) fail(`queries with > 40 hits do not count as read: ${unread.map(q => q.q).join(' ; ')}`)
  if (att.queries.length < 2) fail('fewer than 2 queries in the attempt')
  const { mtimeMs } = statSync(p)
  if (!(Date.parse(at) < mtimeMs)) fail(`the idea probe (${at}) is not earlier than the part file (${new Date(mtimeMs).toISOString()})`)
  const norm = s => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
  const st = it.setup ? [it.setup.i, it.setup.ii, it.setup.iii].map(norm).join(' | ') : ''
  if (norm(att.setup.split('|').map(x => x.trim()).join(' | ')) !== st) console.log(`IDEA (read) ${it.id}: the part's setup differs from the probed setup "${att.setup}"`)
  console.log(`IDEA OK ${it.id}: probed ${at} (${att.queries.length} queries, ${att.queries.reduce((a, q) => a + q.n, 0)} hits read)`)
} else {
  console.error('usage: alg32-census.mjs census <B|C|D> | idea <slot> --setup "i | ii | iii" --q "<q>" --q "<q>" | check-part <part.json>'); process.exit(2)
}
