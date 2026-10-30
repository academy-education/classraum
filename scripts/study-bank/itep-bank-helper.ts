/**
 * itep-bank-helper.ts — the insert path for iTEP SLATE batches. STAGES ONLY.
 *
 *   npx tsx scripts/study-bank/itep-bank-helper.ts stage <batch.json> --expect <n> [--apply]
 *
 * <batch.json> is a staging-shape array (one study_item_bank row per entry),
 * as written by itep-grammar-v1-work/build-batch.mjs. Dry run by default.
 *
 * Every row lands verified=false. There is no flag to stage verified=true:
 * release is a separate, owner-gated step through gate.mjs, as for MAP. A
 * row that arrives with verified anything but false is refused, not coerced,
 * so a batch built for the wrong path cannot slip through.
 *
 * Refuses (exit 1) unless every row:
 *   - is family 'itep' with a section and a domain that ITEP_PART_QUOTAS
 *     names (read from admission-tests.ts, the one table the draw uses);
 *   - is four distinct choices including correct_answer;
 *   - for Part 2 Error Identification, has [A:]..[D:] segments matching its
 *     choices in order (hasLabelledSegments), which is also what exempts it
 *     from the serve-time shuffle - a Part 2 row that fails it would be
 *     served with its letters scrambled;
 *   - carries the content_hash stage-map-language-v4.mjs would compute;
 *   - has a cohort and a verify_meta.method_id.
 * Also refuses a hash already in the bank or repeated within the batch, and
 * exits 2 if the batch does not hold exactly --expect rows (never a verdict
 * over input it did not read).
 *
 * After --apply it re-reads every inserted row BY ID from the server and
 * refuses unless all are verified=false, then writes <batch>.staged.json
 * (row ids, qids, hashes) for the release step.
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { ITEP_PART_QUOTAS } from '@/lib/study/admission-tests'
import { hasLabelledSegments } from '@/lib/study/labelled-segments'

config({ path: resolve(process.cwd(), '.env.local'), quiet: true })

type Row = {
  family: string; section: string; domain: string; cohort: string | null; verified: unknown
  content_hash: string; item: { prompt: string; passage: string | null; choices: string[]; correct_answer: string }
  verify_meta?: { method_id?: string; draft?: { qid?: string } }
}

const die = (m: string, code = 1): never => { console.error(`itep-bank-helper: ${m}`); process.exit(code) }
const args = process.argv.slice(2)
const [cmd, batchPath] = args
const ei = args.indexOf('--expect')
const expect = ei >= 0 ? Number(args[ei + 1]) : NaN
const APPLY = args.includes('--apply')
if (cmd !== 'stage' || !batchPath || batchPath.startsWith('--')) die('usage: itep-bank-helper.ts stage <batch.json> --expect <n> [--apply]', 2)
if (!Number.isInteger(expect) || expect < 1) die('--expect <n> is required', 2)

let rows: Row[]
try { rows = JSON.parse(readFileSync(batchPath, 'utf8')) } catch (e) { die(`cannot read ${batchPath}: ${(e as Error).message}`, 2); throw e }
if (!Array.isArray(rows) || rows.length !== expect) die(`read ${Array.isArray(rows) ? rows.length : 'no'} rows from ${batchPath}, --expect ${expect}`, 2)

/* Same definition as stage-map-language-v4.mjs (passage + prompt + choices
 * in stored order), which is what the prereg (§5) fixed for this cohort. */
const norm = (s: string | null | undefined) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const hashOf = (it: Row['item']) => createHash('md5')
  .update([norm(it.passage), norm(it.prompt), (it.choices || []).map(norm).join('|')].join('~~')).digest('hex')

const ERROR_ID = 'Part 2: Error Identification'
const problems: string[] = []
const perPart: Record<string, number> = {}
rows.forEach((r, i) => {
  const id = r.verify_meta?.draft?.qid ?? `row ${i}`
  const parts = ITEP_PART_QUOTAS[r.section as keyof typeof ITEP_PART_QUOTAS]
  if (r.family !== 'itep') problems.push(`${id}: family '${r.family}', want 'itep'`)
  if (!parts) problems.push(`${id}: section '${r.section}' is not an iTEP part table`)
  else if (!parts.some(p => p.area === r.domain)) problems.push(`${id}: domain '${r.domain}' names no ${r.section} part`)
  if (r.verified !== false) problems.push(`${id}: verified=${JSON.stringify(r.verified)}; this path stages verified=false only`)
  if (!r.cohort) problems.push(`${id}: no cohort`)
  if (!r.verify_meta?.method_id) problems.push(`${id}: no verify_meta.method_id`)
  const it = r.item
  const ok = Array.isArray(it?.choices) && it.choices.length === 4
    && new Set(it.choices.map(c => String(c).trim())).size === 4 && it.choices.includes(it.correct_answer)
  if (!ok) problems.push(`${id}: needs four distinct choices including the key`)
  if (r.domain === ERROR_ID && !hasLabelledSegments(it)) problems.push(`${id}: Part 2 passage segments do not match the choices in order`)
  if (r.domain !== ERROR_ID && it?.passage && /\[[A-F]:/.test(it.passage)) problems.push(`${id}: labelled segments outside Part 2`)
  if (it && hashOf(it) !== r.content_hash) problems.push(`${id}: content_hash does not match passage+prompt+choices`)
  perPart[`${r.section} / ${r.domain}`] = (perPart[`${r.section} / ${r.domain}`] ?? 0) + 1
})
console.log(`read ${rows.length} rows from ${batchPath}`)
for (const [k, n] of Object.entries(perPart)) console.log(`  ${k}: ${n}`)
if (problems.length) die(`${problems.length} problem(s):\n  ${problems.join('\n  ')}`)

const hashes = rows.map(r => r.content_hash)
if (new Set(hashes).size !== hashes.length) die('duplicate content hash inside the batch')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) die('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing (.env.local)', 2)
const db = createClient(url!, key!, { auth: { persistSession: false } })

async function main() {
  const clash: Array<{ id: string; cohort: string | null }> = []
  for (let i = 0; i < hashes.length; i += 50) {
    const { data, error } = await db.from('study_item_bank').select('id, cohort').in('content_hash', hashes.slice(i, i + 50))
    if (error) die(error.message)
    clash.push(...(data ?? []))
  }
  console.log(`hash clash check: ${hashes.length} batch hashes against the bank, ${clash.length} clashes`)
  if (clash.length) die(`${clash.length} rows already in the bank with these hashes (e.g. cohort ${clash[0].cohort})`)
  if (!APPLY) { console.log('dry run; pass --apply to insert (verified=false)'); return }

  const { data: ins, error } = await db.from('study_item_bank').insert(rows).select('id')
  if (error) die(error.message)
  const ids = (ins ?? []).map(r => r.id as string)
  // Read verified back from the server by id, not from the insert echo.
  const back: Array<{ id: string; verified: boolean; content_hash: string; verify_meta: Row['verify_meta'] }> = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error: e } = await db.from('study_item_bank').select('id, verified, content_hash, verify_meta').in('id', ids.slice(i, i + 100))
    if (e) die(e.message)
    back.push(...(data ?? []))
  }
  const vTrue = back.filter(r => r.verified !== false)
  console.log(`read back ${back.length} of ${rows.length}: verified=false ${back.length - vTrue.length}, verified=true ${vTrue.length}`)
  if (back.length !== rows.length || vTrue.length) die('READ-BACK FAILED: fix by hand before anything else (set verified=false)')
  const out = batchPath.replace(/\.json$/, '') + '.staged.json'
  writeFileSync(out, JSON.stringify({
    staged_at: new Date().toISOString(),
    rows: back.map(r => ({ row_id: r.id, qid: r.verify_meta?.draft?.qid ?? null, content_hash: r.content_hash }))
      .sort((a, b) => String(a.qid).localeCompare(String(b.qid))),
  }, null, 1) + '\n')
  console.log(`wrote ${out}`)
}
main().catch(e => { console.error(e); process.exit(1) })
