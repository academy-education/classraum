/**
 * hardening-gate.ts — the gate for co-founder hardening edits (migration 124).
 *
 *   npx tsx scripts/study-bank/hardening-gate.ts list
 *   npx tsx scripts/study-bank/hardening-gate.ts export [--write]
 *       queued edits -> per-family structural checks -> with-source render.
 *       Writes scripts/study-bank/hardening/<run>.ws.md + .ws.key.json + .meta.json.
 *       With --write, marks the exported edits in_gate (frozen: the editor can no
 *       longer replace the text) and fails the ones the checks refuse.
 *   npx tsx scripts/study-bank/hardening-gate.ts record <run> <a.json> <b.json> <c.json> [--write]
 *       three with-source samples -> verdict per edit (gradeVerdict). With --write,
 *       stores passed/failed + gate_result + gate_sha (the staged row's content_sha
 *       AT EXPORT — re-read and compared; an edited staged row goes stale).
 *   npx tsx scripts/study-bank/hardening-gate.ts swap [--write]
 *       every passed edit -> study_item_hardening_swap(). Idempotent: a second run
 *       swaps nothing and says so.
 *   npx tsx scripts/study-bank/hardening-gate.ts withdraw <edit-id> --write
 *
 * Without --write every command is a dry run that prints what it would do.
 *
 * ── Why the samples are run outside this script ──────────────────────
 * Same as every bank-* skill: graders are Claude samples driven in-session
 * (no external model, no API call from here). This script renders their input,
 * reads their output, and refuses to record anything it cannot fully read:
 * a sample file missing an item, or an item with no pick, fails the whole
 * record (CLAUDE.md: "a check that cannot read its input must not return a
 * number").
 *
 * ── What is NOT run, and why ─────────────────────────────────────────
 * The options-only (no-source) attack and the elimination probe are batch
 * instruments: they compare a candidate set against a matched live control
 * and mean nothing on a handful of single edits. The with-source half is
 * what decides where the blind half saturates (CLAUDE.md), and for a hand
 * edit to an already-gated item the risks are the ones only it can see: a
 * broken key, a second defensible option, a stem that no longer asks what
 * the options answer. If the queue grows past ~20 edits in one family, run
 * the family's blind attack over the batch too before swapping.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gradeVerdict, type BankItemJson, type GradeSample } from '../../src/lib/study/hardening'
import { renderForGrading, structuralChecks, swapAll, type StagedEdit } from '../../src/lib/study/hardening-gate'
import { scanValue } from './question-number-refs.mjs'
import { findDuplicates, readLive } from './stem-duplicates.mjs'

const OUT = 'scripts/study-bank/hardening'

function loadEnv(): Record<string, string> {
  const raw = readFileSync(process.cwd() + '/.env.local', 'utf8')
  return Object.fromEntries(raw.split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}

interface EditRow {
  id: string; original_id: string; staged_id: string; status: string; gate_run_id: string | null
  gate_sha: string | null; original_sha: string; changed_fields: string[]; note: string | null
}
interface BankRow {
  id: string; family: string; section: string; domain: string; subskill: string | null
  passage_group_id: string | null; content_sha: string; verified: boolean; archived: boolean; item: BankItemJson
}

async function editsWith(db: SupabaseClient, statuses: string[]): Promise<EditRow[]> {
  const { data, error } = await db.from('study_item_hardening_edits')
    .select('id,original_id,staged_id,status,gate_run_id,gate_sha,original_sha,changed_fields,note')
    .in('status', statuses).order('created_at').limit(1000)
  if (error) throw new Error(`edits: ${error.message} (is migration 124 applied?)`)
  return (data ?? []) as EditRow[]
}

async function rowsById(db: SupabaseClient, ids: string[]): Promise<Map<string, BankRow>> {
  const out = new Map<string, BankRow>()
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from('study_item_bank')
      .select('id,family,section,domain,subskill,passage_group_id,content_sha,verified,archived,item')
      .in('id', ids.slice(i, i + 200))
    if (error) throw new Error(error.message)
    for (const r of (data ?? []) as BankRow[]) out.set(r.id, r)
  }
  if (out.size !== new Set(ids).size) throw new Error(`asked for ${new Set(ids).size} bank rows, got ${out.size}`)
  return out
}

/** Fail an edit and retire its staged row so its dedup key is free again. */
async function failEdit(db: SupabaseClient, e: EditRow, result: Record<string, unknown>) {
  const { error } = await db.from('study_item_hardening_edits')
    .update({ status: 'failed', gate_result: result, updated_at: new Date().toISOString() }).eq('id', e.id).neq('status', 'swapped')
  if (error) throw new Error(error.message)
  const { error: e2 } = await db.from('study_item_bank')
    .update({ archived: true, updated_at: new Date().toISOString() }).eq('id', e.staged_id).eq('verified', false)
  if (e2) throw new Error(e2.message)
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2)
  const write = rest.includes('--write')
  if (!existsSync('.env.local')) { console.error('run from the repo root (.env.local not found)'); process.exit(1) }
  const env = loadEnv()
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  if (cmd === 'list') {
    const all = await editsWith(db, ['queued', 'in_gate', 'passed', 'failed', 'swapped', 'stale', 'withdrawn'])
    const by: Record<string, number> = {}
    for (const e of all) by[e.status] = (by[e.status] ?? 0) + 1
    console.log(by)
    for (const e of all) console.log(`${e.status.padEnd(9)} ${e.id}  original ${e.original_id.slice(0, 8)}  staged ${e.staged_id.slice(0, 8)}  [${e.changed_fields.join(',')}] ${e.gate_run_id ?? ''}`)
    return
  }

  if (cmd === 'export') {
    const edits = await editsWith(db, ['queued'])
    if (!edits.length) { console.log('nothing queued'); return }
    const rows = await rowsById(db, [...edits.map(e => e.original_id), ...edits.map(e => e.staged_id)])
    const live = await readLive({}) as Array<{ id: string; family: string; k: string | null; g: string[] }>
    const runId = `hardening-${new Date().toISOString().slice(0, 10)}-${edits.length}x-${edits[0].id.slice(0, 6)}`
    const ok: Array<{ e: EditRow; s: StagedEdit; stagedSha: string }> = []
    const refused: Array<{ e: EditRow; problems: string[] }> = []
    for (const e of edits) {
      const o = rows.get(e.original_id)!, st = rows.get(e.staged_id)!
      const s: StagedEdit = { editId: e.id, family: st.family, section: st.section, domain: st.domain, subskill: st.subskill, original: o.item, staged: st.item }
      const problems = structuralChecks(s)
      if (o.archived || !o.verified) problems.push('original is no longer live')
      if (o.content_sha !== e.original_sha) problems.push('original changed since the edit was made')
      const q = scanValue({ prompt: st.item.prompt, passage: st.item.passage, choices: st.item.choices }) as { hits: Array<{ match: string }> }
      if (q.hits.length) problems.push(`hardcoded question-number reference: "${q.hits[0].match}"`)
      // Stem duplicates against the live bank of the same family, EXCLUDING the
      // original this edit replaces (a distractor-only edit shares its stem).
      const fam = live.filter(r => r.family === st.family && r.id !== o.id)
      const dups = findDuplicates([{ ...st.item, id: e.id, passage_group_id: st.passage_group_id }], fam) as Array<{ b: string }>
      if (dups.length) problems.push(`stem duplicates live item ${dups[0].b}`)
      if (problems.length) refused.push({ e, problems }); else ok.push({ e, s, stagedSha: st.content_sha })
    }
    console.log(`${edits.length} queued: ${ok.length} pass the structural checks, ${refused.length} refused`)
    for (const r of refused) console.log(`  REFUSED ${r.e.id}: ${r.problems.join('; ')}`)
    if (!ok.length) { if (write) for (const r of refused) await failEdit(db, r.e, { stage: 'structural', reasons: r.problems, at: new Date().toISOString() }); return }
    const render = renderForGrading(runId, ok.map(x => x.s))
    mkdirSync(OUT, { recursive: true })
    writeFileSync(join(OUT, `${runId}.ws.md`), render.markdown)
    writeFileSync(join(OUT, `${runId}.ws.key.json`), JSON.stringify(render.key, null, 1))
    const meta = Object.fromEntries(Object.entries(render.labels).map(([label, id]) => [label, { editId: id, stagedSha: ok.find(x => x.e.id === id)!.stagedSha }]))
    writeFileSync(join(OUT, `${runId}.meta.json`), JSON.stringify({ runId, createdAt: new Date().toISOString(), items: meta }, null, 1))
    console.log(`wrote ${OUT}/${runId}.ws.md (+ .ws.key.json, .meta.json). Give the .ws.md to THREE independent with-source samples; never show them the key file.`)
    if (write) {
      for (const x of ok) {
        const { error } = await db.from('study_item_hardening_edits')
          .update({ status: 'in_gate', gate_run_id: runId, updated_at: new Date().toISOString() }).eq('id', x.e.id).eq('status', 'queued')
        if (error) throw new Error(error.message)
      }
      for (const r of refused) await failEdit(db, r.e, { stage: 'structural', reasons: r.problems, at: new Date().toISOString() })
      console.log(`marked ${ok.length} in_gate, failed ${refused.length}`)
    } else console.log('(dry run: nothing marked; rerun with --write)')
    return
  }

  if (cmd === 'record') {
    const [runId, ...files] = rest.filter(a => a !== '--write')
    if (!runId || files.length !== 3) { console.error('usage: record <run> <a.json> <b.json> <c.json> [--write]'); process.exit(2) }
    const meta = JSON.parse(readFileSync(join(OUT, `${runId}.meta.json`), 'utf8')) as { items: Record<string, { editId: string; stagedSha: string }> }
    const key = JSON.parse(readFileSync(join(OUT, `${runId}.ws.key.json`), 'utf8')) as Record<string, string>
    const samples = files.map(f => JSON.parse(readFileSync(f, 'utf8')) as Record<string, GradeSample>)
    const labels = Object.keys(meta.items)
    // Refuse a partial read rather than score what is there.
    for (const [i, s] of samples.entries()) {
      const missing = labels.filter(l => !s[l] || typeof s[l].pick !== 'string')
      if (missing.length) { console.error(`REFUSING: sample ${files[i]} has no pick for ${missing.join(', ')} (scorable ${labels.length - missing.length} of ${labels.length})`); process.exit(2) }
    }
    const edits = await editsWith(db, ['in_gate'])
    const staged = await rowsById(db, labels.map(l => edits.find(e => e.id === meta.items[l].editId)?.staged_id).filter((x): x is string => !!x))
    console.log(`scorable ${labels.length} of ${labels.length} in all three samples`)
    for (const l of labels) {
      const m = meta.items[l]
      const e = edits.find(x => x.id === m.editId)
      if (!e || e.gate_run_id !== runId) { console.log(`  ${l} ${m.editId}: not in_gate for this run — skipped`); continue }
      const st = staged.get(e.staged_id)!
      const v = gradeVerdict(samples.map(s => s[l]), [key[l], key[l], key[l]])
      if (st.content_sha !== m.stagedSha) { v.pass = false; v.reasons.push('staged text changed since export') }
      const result = { stage: 'withsource', run: runId, label: l, ...v, picks: samples.map(s => s[l].pick), difficulties: samples.map(s => s[l].difficulty), notes: samples.map(s => s[l].note ?? null), at: new Date().toISOString() }
      console.log(`  ${l} ${e.id}: ${v.pass ? 'PASS' : 'FAIL'}  key ${v.onKey}/3  median ${v.difficulty ?? '-'}${v.reasons.length ? `  (${v.reasons.join('; ')})` : ''}`)
      if (!write) continue
      if (v.pass) {
        const { error } = await db.from('study_item_hardening_edits')
          .update({ status: 'passed', gate_sha: m.stagedSha, gate_result: result, updated_at: new Date().toISOString() }).eq('id', e.id).eq('status', 'in_gate')
        if (error) throw new Error(error.message)
      } else await failEdit(db, e, result)
    }
    if (!write) console.log('(dry run: nothing recorded; rerun with --write)')
    return
  }

  if (cmd === 'swap') {
    const passed = await editsWith(db, ['passed'])
    if (!write) { console.log(`${passed.length} passed edit(s) would be swapped: ${passed.map(e => e.id).join(', ') || '(none)'}`); return }
    const r = await swapAll(passed.map(e => e.id), async id => {
      const { data, error } = await db.rpc('study_item_hardening_swap', { p_edit: id })
      return { data: (data as string | null) ?? null, error }
    })
    for (const x of r.results) console.log(`  ${x.editId}: ${x.outcome}${x.message ? ` — ${x.message}` : ''}`)
    console.log(`swapped ${r.swapped}, already swapped ${r.already}, refused ${r.refused}`)
    return
  }

  if (cmd === 'withdraw') {
    const id = rest.find(a => a !== '--write')
    if (!id) { console.error('usage: withdraw <edit-id> --write'); process.exit(2) }
    const [e] = (await editsWith(db, ['queued', 'in_gate', 'passed'])).filter(x => x.id === id)
    if (!e) { console.error('no open edit with that id'); process.exit(2) }
    if (!write) { console.log(`would withdraw ${id} and retire staged row ${e.staged_id}`); return }
    const { error } = await db.from('study_item_hardening_edits').update({ status: 'withdrawn', updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw new Error(error.message)
    await db.from('study_item_bank').update({ archived: true }).eq('id', e.staged_id).eq('verified', false)
    console.log(`withdrawn ${id}`)
    return
  }

  console.error('usage: hardening-gate.ts list | export | record <run> a b c | swap | withdraw <id>   (add --write to act)')
  process.exit(2)
}

main().catch(e => { console.error(e); process.exit(1) })
