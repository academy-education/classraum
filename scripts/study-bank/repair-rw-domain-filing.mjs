#!/usr/bin/env node
/**
 * repair-rw-domain-filing.mjs [--apply]
 *
 * THE DEFECT. 120 live SAT R&W rows carry a subskill that is an EXACT string
 * from the official taxonomy and a `domain` that is not the domain that
 * subskill belongs to:
 *
 *     43  Craft and Structure    <- Inferences                  (Info and Ideas)
 *     32  Craft and Structure    <- Command of Evidence         (Info and Ideas)
 *     23  Information and Ideas  <- Cross-Text Connections      (Craft and Str)
 *     22  Information and Ideas  <- Text Structure and Purpose  (Craft and Str)
 *
 * All 120 are in cohort `v2` and nowhere else -- every other cohort is 0.0%.
 * `classifyRwBatch` in src/lib/study/verify-item.ts CANNOT produce such a pair
 * (it derives the allowed subskills from the accepted domain), and it has zero
 * callers, so it filed none of these. This is authoring-time data, not code.
 *
 * WHY IT MATTERS. `assemble.ts` draws per-domain quotas from `domain` and never
 * reads `subskill`. So 75 inference/evidence items are being dealt into Craft
 * and Structure seats and 45 craft items into Information and Ideas seats: a
 * student's form does not have the blueprint's mix, and the section's form
 * count (16) is inflated, C&S being the binding domain.
 *
 * WHICH COLUMN IS WRONG was not assumed. A narrow stem classifier -- stock
 * digital-SAT wordings only, returning null rather than guessing -- was run
 * FIRST over the 604 rows whose two columns already agree, i.e. rows whose
 * answer is known: 368 of 384 classifiable = 95.8% (the 20 nominal misses are
 * the lowercase `words in context` variant, the same subskill; the 16 real ones
 * are Central Ideas read as Text Structure, a boundary INSIDE Information and
 * Ideas that cannot touch these 120). Pointed at the 120 it classified 79 and
 * backed the SUBSKILL on 79 and the DOMAIN on 0. The remaining 41 were read by
 * hand and are the same stem families ("Which finding, if true, would most
 * directly weaken...", "best supported by the passage", "function of the final
 * sentence"); the classifier missed wording variants, not different items.
 *
 * So the repair is: domain := the subskill's home. Subskill text is untouched
 * apart from the `words in context` -> `Words in Context` casing, which is the
 * same subskill spelled two ways in one bank.
 *
 * Default is a DRY RUN. `--apply` writes, after saving every touched row's
 * prior domain to rw-domain-filing-snapshot.json.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'

const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

/* The taxonomy is READ FROM SOURCE, never retyped. Two copies of one table is
 * the defect blueprint-quotas.mjs exists to prevent. */
const src = readFileSync('src/lib/study/verify-item.ts', 'utf8')
const m = src.match(/RW_TAXONOMY[^=]*=\s*\{([\s\S]*?)\n\}/)
if (!m) { console.error('REFUSING: could not read RW_TAXONOMY from src/lib/study/verify-item.ts'); process.exit(2) }
const TAX = {}
for (const line of m[1].split('\n')) {
  const mm = line.match(/'([^']+)':\s*\[([^\]]+)\]/)
  if (mm) TAX[mm[1]] = mm[2].split(',').map(s => s.trim().replace(/^'|'$/g, ''))
}
if (Object.keys(TAX).length !== 4) { console.error(`REFUSING: parsed ${Object.keys(TAX).length} domains, expected 4`); process.exit(2) }
const HOME = {}, CANON = {}
for (const [d, subs] of Object.entries(TAX)) for (const s of subs) { HOME[s.toLowerCase()] = d; CANON[s.toLowerCase()] = s }

const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,domain,subskill,cohort')
    .eq('family', 'sat').eq('section', 'reading_writing').eq('verified', true).eq('archived', false)
    .order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data)
  if (data.length < 1000) break
}
if (new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }
console.log(`read ${rows.length} live SAT R&W rows`)

const fixes = []
for (const r of rows) {
  const k = String(r.subskill ?? '').toLowerCase()
  if (!HOME[k]) continue                       // free-text subskill; not ours to touch
  const patch = {}
  if (HOME[k] !== r.domain) patch.domain = HOME[k]
  if (CANON[k] !== r.subskill) patch.subskill = CANON[k]
  if (Object.keys(patch).length) fixes.push({ id: r.id, from: { domain: r.domain, subskill: r.subskill }, to: patch, cohort: r.cohort })
}
const domFix = fixes.filter(f => f.to.domain), caseFix = fixes.filter(f => f.to.subskill)
console.log(`\nscorable ${rows.filter(r => HOME[String(r.subskill ?? '').toLowerCase()]).length} of ${rows.length}  (rows whose subskill is an exact taxonomy string)`)
console.log(`  domain refiled : ${domFix.length}`)
console.log(`  subskill recased: ${caseFix.length}`)
const by = {}
for (const f of domFix) { const k = `${f.from.domain} -> ${f.to.domain}  (${f.from.subskill})`; by[k] = (by[k] ?? 0) + 1 }
for (const k of Object.keys(by).sort((a, b) => by[b] - by[a])) console.log('   ' + String(by[k]).padStart(4) + '  ' + k)

const before = {}, after = {}
for (const r of rows) {
  before[r.domain] = (before[r.domain] ?? 0) + 1
  const f = fixes.find(x => x.id === r.id)
  const d = f?.to.domain ?? r.domain
  after[d] = (after[d] ?? 0) + 1
}
console.log('\n  domain counts   before   after')
for (const d of Object.keys(TAX)) console.log('   ' + d.padEnd(34) + String(before[d] ?? 0).padStart(6) + String(after[d] ?? 0).padStart(8))

if (!APPLY) { console.log('\nDRY RUN. Re-run with --apply to write.'); process.exit(0) }
if (!fixes.length) { console.log('\nNothing to do.'); process.exit(0) }

writeFileSync('scripts/study-bank/rw-domain-filing-snapshot.json',
  JSON.stringify({ takenAt: new Date().toISOString(), rows: fixes }, null, 1) + '\n')
console.log(`\nsnapshot written: ${fixes.length} rows, prior values included`)

let done = 0
for (const f of fixes) {
  const { data, error } = await db.from('study_item_bank').update(f.to).eq('id', f.id).select('id')
  if (error) { console.error(`FAILED on ${f.id}: ${error.message}`); process.exit(1) }
  if ((data?.length ?? 0) !== 1) { console.error(`FAILED on ${f.id}: matched ${data?.length ?? 0} rows, expected 1`); process.exit(1) }
  done++
}
console.log(`updated ${done} of ${fixes.length} rows`)
