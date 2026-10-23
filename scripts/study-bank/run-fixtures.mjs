#!/usr/bin/env node
/**
 * run-fixtures.mjs — the co-founder regression set for grader briefs.
 *
 * POSITIVES are items the co-founder would block (cofounder-notes.json:
 * would_block, item scope, review FRESH — the item today is the item he judged).
 * NEGATIVES are an equal-sized seeded sample of items he passed with no note
 * (every review of the item by him clean and fresh, item not archived), matched
 * to positives by stratum first. Batch- and display-scope defects are not item
 * fixtures: a single item cannot show them. The ledger lists them.
 *
 * This is a REGRESSION GATE, not evidence for promotion: the briefs quote his
 * notes, so fixtures whose note a brief quotes are in-sample for that brief.
 * `score` prints that split when the brief has a .quotes.json sidecar.
 *
 *   node scripts/study-bank/run-fixtures.mjs build            (read-only DB; writes cofounder-fixtures.json)
 *   node scripts/study-bank/run-fixtures.mjs render <brief.md> --out DIR [--parts K] [--version vN]
 *   node scripts/study-bank/run-fixtures.mjs score DIR
 *   node scripts/study-bank/run-fixtures.mjs compare V2DIR OLDDIR   (the ship bar in the v2 brief header)
 *
 * score/compare EXIT 3 when the input cannot be read in full: a grade file
 * missing (no numbers printed), an index id that maps to no fixture (counted as
 * FLAGGED, and the run fails), an unscored item, a grade for an item not in the
 * packet. An unmapped item is never a pass.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname, basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { pickFixtures, fixtureId, buildPacket, scoreGrades, shipBar, COFOUNDER_REVIEWER_ID } from './cofounder-loop-lib.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(HERE, 'cofounder-fixtures.json')
const LEDGER = join(HERE, 'cofounder-notes.json')
const SEED = 'cofounder-fixtures-2026-10-23'
const [cmd, ...rest] = process.argv.slice(2)
const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d }
const die = (code, msg) => { console.error(msg); process.exit(code) }
const readJson = p => JSON.parse(readFileSync(p, 'utf8'))
const pct = b => (b && b.n ? `${(100 * b.x / b.n).toFixed(1)}%` : '  —  ')

async function build() {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const revs = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_reviews').select('id,item_id,reviewer_id,reviewer_kind,verdict,note,item_sha')
      .eq('reviewer_id', COFOUNDER_REVIEWER_ID).order('id').range(from, from + 999)
    if (error) die(1, error.message)
    revs.push(...data); if (data.length < 1000) break
  }
  const human = revs.filter(r => r.reviewer_kind === 'human')
  if (!human.length) die(2, 'REFUSED: 0 human reviews read')
  const ids = [...new Set(human.map(r => r.item_id))]
  const items = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from('study_item_bank').select('id,family,section,domain,task,cohort,content_sha,archived,item').in('id', ids.slice(i, i + 200))
    if (error) die(1, error.message)
    items.push(...data)
  }
  if (items.length !== ids.length) die(2, `REFUSED: ${ids.length - items.length} reviewed items missing from the bank`)
  const itemsById = new Map(items.map(i => [i.id, i]))
  const ledger = readJson(LEDGER).entries
  // the ledger's freshness was computed at its build; recompute against the bank NOW
  const humanById = new Map(human.map(r => [r.id, r]))
  for (const e of ledger) if (e.source === 'review') {
    const r = humanById.get(e.review_id)
    if (!r) die(2, `REFUSED: ledger review ${e.review_id} no longer in the database — rebuild the ledger`)
    e.fresh = !!r.item_sha && r.item_sha === itemsById.get(e.item_id)?.content_sha
  }
  const { positives, negatives, excluded, match, poolSize } = pickFixtures({ ledger, humanReviews: human, itemsById, seed: SEED })
  const snap = f => {
    const it = itemsById.get(f.item_id), x = it.item
    if (!x?.prompt || !Array.isArray(x.choices) || !x.choices.includes(x.correct_answer)) die(2, `REFUSED: item ${it.id} has no prompt/choices/key in its stored content`)
    return { id: fixtureId(f.item_id, SEED), ...f, section: it.section, cohort: it.cohort, archived: !!it.archived, content_sha: it.content_sha,
      item: { passage: x.passage ?? null, prompt: x.prompt, choices: x.choices, correct_answer: x.correct_answer, ...(x.graphic ? { graphic: x.graphic } : {}) } }
  }
  const fixtures = [...positives.map(snap), ...negatives.map(snap)]
  if (new Set(fixtures.map(f => f.id)).size !== fixtures.length) die(2, 'REFUSED: fixture id collision')
  writeFileSync(FIXTURES, JSON.stringify({ built_at: new Date().toISOString(), seed: SEED, counts: { positives: positives.length, negatives: negatives.length, pool: poolSize, match, excluded: Object.fromEntries(Object.entries(excluded).map(([k, v]) => [k, v.length])) }, excluded, fixtures }, null, 1) + '\n')
  report(fixtures)
  console.log(`\nexcluded would-block reviews: stale ${excluded.stale.length}, batch/display scope ${excluded.notItemScope.length}, no item ${excluded.noItem.length}`)
  console.log(`negatives matched: stratum ${match.stratum}, family ${match.family}, any ${match.any}, short ${match.short} (clean pool ${poolSize})`)
  console.log(`wrote ${FIXTURES}`)
}

function report(fixtures) {
  const t = {}
  for (const f of fixtures) { const k = f.family; (t[k] ??= { pos: 0, neg: 0 }); if (f.label === 'positive') t[k].pos++; else t[k].neg++ }
  console.log('family      positives  negatives')
  for (const [k, v] of Object.entries(t).sort()) console.log(`${k.padEnd(12)}${String(v.pos).padStart(9)}${String(v.neg).padStart(11)}`)
  const byType = {}
  for (const f of fixtures.filter(f => f.label === 'positive')) byType[f.defect_type] = (byType[f.defect_type] ?? 0) + 1
  console.log('\npositives by defect_type (>= 10 needed to validate):')
  for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(22)} ${String(v).padStart(3)}  ${v >= 10 ? 'validatable' : 'UNVALIDATED'}`)
}

function render() {
  const brief = rest[0]
  const out = opt('--out')
  if (!brief || !out) die(2, 'usage: render <brief.md> --out DIR [--parts K] [--version vN]')
  if (!existsSync(brief)) die(2, `brief not found: ${brief}`)
  const { fixtures } = readJson(FIXTURES)
  if (!fixtures?.length) die(2, 'REFUSED: cofounder-fixtures.json has no fixtures — run build')
  const parts = Number(opt('--parts', 1))
  const m = basename(brief).match(/BRIEF-(v\d+|[A-Z])\.md$/)
  const version = opt('--version', m ? m[1] : basename(brief))
  const text = readFileSync(brief, 'utf8')
  const { packet, index, parts: pk } = buildPacket(fixtures, { seed: SEED, parts })
  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, 'packet.json'), JSON.stringify(packet, null, 1))
  writeFileSync(join(out, 'index.json'), JSON.stringify(index, null, 1))
  for (const p of pk) writeFileSync(join(out, p.packet), JSON.stringify(p.items, null, 1))
  // Graders get the brief WITHOUT its maintainer header: the header names the fixture design (his rejects vs
  // passes) and the ship bar, which would tell a grader the base rate of the packet it is grading.
  const graded = text.replace(/^\s*<!--[\s\S]*?-->\s*/, '')
  writeFileSync(join(out, basename(brief)), graded)
  const quotesFile = brief.replace(/\.md$/, '.quotes.json')
  const quoted = existsSync(quotesFile) ? readJson(quotesFile).quoted_review_ids ?? [] : null
  const meta = {
    brief_file: basename(brief), brief_version: version, brief_sha256: createHash('sha256').update(text).digest('hex'), graded_text_sha256: createHash('sha256').update(graded).digest('hex'), header_stripped: graded !== text,
    requires_batch_patterns: /batch_patterns/.test(text), seed: SEED, items: packet.length,
    expected_grades: pk.map(p => p.grades), parts: pk.map(p => ({ packet: p.packet, grades: p.grades, n_from: p.items[0].n, n_to: p.items.at(-1).n, items: p.items.length })),
    quoted_review_ids: quoted, rendered_at: new Date().toISOString(),
  }
  writeFileSync(join(out, 'brief.json'), JSON.stringify(meta, null, 1))
  console.log(`${out}: ${packet.length} items, brief ${version} (${meta.brief_sha256.slice(0, 12)}), ${pk.length} part(s): ${pk.map(p => `${p.packet}->${p.grades} (${p.items.length})`).join(', ')}`)
}

function loadRun(dir) {
  const metaP = join(dir, 'brief.json'), idxP = join(dir, 'index.json')
  if (!existsSync(metaP) || !existsSync(idxP)) die(3, `NOT MEASURED: ${dir} has no brief.json/index.json (render it first)`)
  const meta = readJson(metaP), index = readJson(idxP)
  const { fixtures } = readJson(FIXTURES)
  const fixturesById = new Map(fixtures.map(f => [f.id, f]))
  const gradeFiles = {}
  for (const g of meta.expected_grades) {
    const p = join(dir, g)
    if (!existsSync(p)) continue
    try { gradeFiles[g] = readJson(p) } catch (e) { die(3, `NOT MEASURED: ${p} is not valid JSON (${e.message})`) }
  }
  const res = scoreGrades({ index, fixturesById, gradeFiles, expected: meta.expected_grades, requireBatchPatterns: meta.requires_batch_patterns })
  return { meta, res, fixturesById, index, gradeFiles }
}

function printRun(dir, { meta, res, fixturesById, index, gradeFiles }) {
  console.log(`\n=== ${resolve(dir)}   brief ${meta.brief_version} (${meta.brief_sha256.slice(0, 12)})`)
  if (!res.measured) { for (const e of res.errors) console.log(`  ${e}`); console.log('NOT MEASURED — no numbers.'); return }
  console.log(`scorable ${res.scorable} of ${res.total}   (unscored ${res.unscored}, unmapped ${res.unmapped})`)
  console.log(`\nPOSITIVES (recall = flagged / n)       NEGATIVES (false flags / n, matched to that type)`)
  const types = [...new Set([...Object.keys(res.pos.byType), ...Object.keys(res.neg.byType)])].sort()
  for (const t of types) {
    const p = res.pos.byType[t], n = res.neg.byType[t]
    console.log(`  ${t.padEnd(22)} ${p ? `${p.x}/${p.n}`.padStart(7) : '      —'} ${pct(p).padStart(7)}${p && p.n < 10 ? ' unvalidated' : '            '}    ${n ? `${n.x}/${n.n}`.padStart(7) : '      —'} ${pct(n).padStart(7)}`)
  }
  console.log(`  ${'ALL'.padEnd(22)} ${`${res.pos.all.x}/${res.pos.all.n}`.padStart(7)} ${pct(res.pos.all).padStart(7)}                ${`${res.neg.all.x}/${res.neg.all.n}`.padStart(7)} ${pct(res.neg.all).padStart(7)}`)
  console.log(`\nby family`)
  const fams = [...new Set([...Object.keys(res.pos.byFam), ...Object.keys(res.neg.byFam)])].sort()
  for (const f of fams) {
    const p = res.pos.byFam[f], n = res.neg.byFam[f]
    console.log(`  ${f.padEnd(22)} recall ${p ? `${p.x}/${p.n}`.padStart(7) : '      —'} ${pct(p).padStart(7)}    false flags ${n ? `${n.x}/${n.n}`.padStart(7) : '      —'} ${pct(n).padStart(7)}`)
  }
  if (Array.isArray(meta.quoted_review_ids) && res.valid) {
    const q = new Set(meta.quoted_review_ids), inS = { x: 0, n: 0 }, outS = { x: 0, n: 0 }
    const v = new Map()
    for (const g of Object.values(gradeFiles)) for (const [k, val] of Object.entries(g)) if (k !== 'batch_patterns') v.set(k, val)
    for (const e of index) {
      const f = fixturesById.get(e.id); if (!f || f.label !== 'positive') continue
      const b = f.review_ids.some(id => q.has(id)) ? inS : outS
      b.n++; if (v.get(String(e.n))?.verdict !== 'unique') b.x++
    }
    console.log(`\nrecall on positives whose note THIS brief quotes (in-sample): ${inS.x}/${inS.n} ${pct(inS)}; not quoted: ${outS.x}/${outS.n} ${pct(outS)}`)
  }
  const bp = Object.values(gradeFiles).flatMap(g => Array.isArray(g.batch_patterns) ? g.batch_patterns : [])
  if (meta.requires_batch_patterns) console.log(`batch_patterns reported: ${bp.length} (a mixed fixture packet is not a batch; read, do not score)`)
  if (!res.valid) {
    console.log(`\nINVALID — ${res.errors.length} problem(s):`)
    for (const e of res.errors.slice(0, 30)) console.log(`  ${e}`)
    if (res.errors.length > 30) console.log(`  … ${res.errors.length - 30} more`)
  }
}

function score() {
  const dir = rest[0]; if (!dir) die(2, 'usage: score DIR')
  const run = loadRun(dir)
  printRun(dir, run)
  if (!run.res.valid) process.exit(3)
}

function compare() {
  const [a, b] = rest; if (!a || !b) die(2, 'usage: compare V2DIR OLDDIR')
  const v2 = loadRun(a), old = loadRun(b)
  printRun(a, v2); printRun(b, old)
  const bar = shipBar(v2.res, old.res)
  console.log(`\n=== SHIP BAR (v2 vs old): recall >= 80% on each defect type with >= 10 positives; false flags <= old + 10 pts`)
  for (const [t, s] of Object.entries(bar.types)) console.log(`  ${t.padEnd(22)} ${`${s.x}/${s.n}`.padStart(7)}  ${s.status}`)
  if (bar.ffV2 != null) console.log(`  false flags: v2 ${(bar.ffV2 * 100).toFixed(1)}% vs old ${(bar.ffOld * 100).toFixed(1)}%`)
  console.log(bar.pass ? 'PASS' : `DOES NOT SHIP:\n  ${bar.reasons.join('\n  ')}`)
  if (!v2.res.valid || !old.res.valid) process.exit(3)
  if (!bar.pass) process.exit(1)
}

if (cmd === 'build') await build()
else if (cmd === 'render') render()
else if (cmd === 'score') score()
else if (cmd === 'compare') compare()
else if (cmd === 'report') report(readJson(FIXTURES).fixtures)
else die(2, 'usage: run-fixtures.mjs build | render <brief.md> --out DIR [--parts K] | score DIR | compare V2DIR OLDDIR | report')
