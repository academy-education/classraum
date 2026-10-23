#!/usr/bin/env node
/**
 * build-notes-ledger.mjs — the co-founder notes ledger (cofounder-notes.json).
 *
 * One entry per HUMAN review by the co-founder (reviewer 6ca6edaf-…) that has a
 * non-empty note or a non-'unique' verdict, joined to the hand classification in
 * cofounder-notes.classified.json, plus the REGISTER-recorded catches that came
 * from his notes (source:'register').
 *
 * READ-ONLY against the database (paged past the 1,000-row PostgREST cap, ordered
 * by id). Writes only the ledger file.
 *
 * REFUSES (exit 2) when:
 *   - any selected review row has no classification (a new note since the last
 *     classification pass: classify it first)
 *   - any classification names a review that is no longer selected (a row it
 *     expected is missing: deleted, re-kinded, or its note cleared)
 *   - a classification is malformed (unknown defect_type, no rationale, …)
 *   - a REGISTER anchor cannot be found anywhere in REGISTER.md
 *   - zero human rows were read (an empty read must not print an empty table)
 * Model-assisted rows on his account are excluded and counted.
 *
 *   usage: node scripts/study-bank/build-notes-ledger.mjs [--out FILE] [--check]
 *     --check   build and validate, print counts, do not write
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { COFOUNDER_REVIEWER_ID, TAXONOMY, SCOPES, selectNoteRows, mergeClassifications, crossTab } from './cofounder-loop-lib.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const flag = k => args.includes(k)
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const OUT = opt('--out', join(HERE, 'cofounder-notes.json'))
const CLASSIFIED = opt('--classified', join(HERE, 'cofounder-notes.classified.json'))
const REGISTER = join(HERE, 'REGISTER.md')
const refuse = (msg) => { console.error(`REFUSED: ${msg}`); process.exit(2) }

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8')
  .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function pageAll(table, select, tune = q => q) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await tune(db.from(table).select(select)).order('id').range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

export async function fetchReviewsAndItems() {
  const revs = await pageAll('study_item_reviews',
    'id,item_id,run_id,reviewer_id,reviewer_kind,verdict,note,reviewed_at,item_sha,blind_at',
    q => q.eq('reviewer_id', COFOUNDER_REVIEWER_ID))
  const ids = [...new Set(revs.map(r => r.item_id))]
  const items = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from('study_item_bank')
      .select('id,family,section,domain,task,cohort,content_sha,archived,verified').in('id', ids.slice(i, i + 200))
    if (error) throw new Error(`study_item_bank: ${error.message}`)
    items.push(...data)
  }
  return { revs, items }
}

async function main() {
  const { revs, items } = await fetchReviewsAndItems()
  const itemsById = new Map(items.map(i => [i.id, i]))
  const { human, modelAssisted, other, selected } = selectNoteRows(revs)
  if (!human.length) refuse('read 0 human review rows for the co-founder — the read failed or the reviewer id is wrong')
  const missingItems = [...new Set(revs.map(r => r.item_id))].filter(id => !itemsById.has(id))
  if (missingItems.length) refuse(`${missingItems.length} reviewed item(s) not found in study_item_bank: ${missingItems.slice(0, 5).join(', ')}`)

  const cls = JSON.parse(readFileSync(CLASSIFIED, 'utf8'))
  const { entries, errors, ok } = mergeClassifications(selected, cls.entries ?? [], itemsById)
  console.log(`co-founder rows: ${revs.length} total = ${human.length} human + ${modelAssisted.length} model_assisted (EXCLUDED)${other.length ? ` + ${other.length} other kind (EXCLUDED)` : ''}`)
  console.log(`selected (note or non-unique verdict, human only): ${selected.length}; classified entries: ${(cls.entries ?? []).length}`)
  if (!ok) {
    for (const [k, l] of Object.entries(errors)) if (l.length) console.error(`  ${k}: ${l.length}\n    ${l.slice(0, 20).join('\n    ')}`)
    refuse(`${errors.unclassified.length} unclassified, ${errors.missing.length} expected review(s) missing, ${errors.invalid.length} invalid, ${errors.noItem.length} without an item`)
  }

  // REGISTER catches: verify each anchor still sits on its recorded line, or find where it moved.
  const regLines = readFileSync(REGISTER, 'utf8').split('\n')
  const reg = []
  const byReview = new Map(entries.map(e => [e.review_id, e]))
  for (const r of cls.register ?? []) {
    if (!TAXONOMY[r.defect_type] || !SCOPES.includes(r.scope) || typeof r.would_block !== 'boolean' || !r.rationale) refuse(`register entry ${r.register_id} malformed`)
    for (const id of r.linked_review_ids ?? []) if (!byReview.has(id)) refuse(`register entry ${r.register_id} links review ${id}, which is not in the ledger`)
    let line = r.register_line
    if (!(regLines[line - 1] ?? '').includes(r.anchor)) {
      const at = regLines.findIndex(l => l.includes(r.anchor))
      if (at < 0) refuse(`register entry ${r.register_id}: anchor "${r.anchor}" not found in REGISTER.md`)
      console.log(`  note: ${r.register_id} anchor moved from L${r.register_line} to L${at + 1}`)
      line = at + 1
    }
    const first = byReview.get(r.linked_review_ids?.[0])
    reg.push({
      review_id: null, register_id: r.register_id, item_id: first?.item_id ?? null, run_id: first?.run_id ?? null,
      cohort: r.cohort, family: r.family, section: first?.section ?? null, task: first?.task ?? null,
      verdict: null, note: r.summary, reviewed_at: first?.reviewed_at ?? null,
      defect_type: r.defect_type, secondary_types: [], would_block: r.would_block, scope: r.scope,
      rationale: r.rationale, source: 'register', register_ref: `REGISTER.md L${line}`,
      linked_review_ids: r.linked_review_ids ?? [],
    })
  }

  const all = [...entries, ...reg]
  const ct = crossTab(entries)
  const types = Object.keys(TAXONOMY).filter(t => ct.byType[t])
  const fams = Object.keys(ct.table).sort()
  console.log(`\nREVIEW NOTES by family x defect_type (n = ${ct.n}; register catches listed apart)`)
  console.log('defect_type'.padEnd(22) + fams.map(f => f.padStart(7)).join('') + '      n  block')
  for (const t of types) {
    const blk = entries.filter(e => e.defect_type === t && e.would_block).length
    console.log(t.padEnd(22) + fams.map(f => String(ct.table[f][t] ?? '.').padStart(7)).join('') + String(ct.byType[t]).padStart(7) + String(blk).padStart(7))
  }
  console.log('n'.padEnd(22) + fams.map(f => String(ct.byFam[f]).padStart(7)).join('') + String(ct.n).padStart(7) + String(entries.filter(e => e.would_block).length).padStart(7))
  const wb = entries.filter(e => e.would_block)
  console.log(`\nwould_block: ${wb.length} of ${entries.length}; of those fresh (item unchanged since review): ${wb.filter(e => e.fresh).length}, item-scope and fresh: ${wb.filter(e => e.fresh && e.scope === 'item').length}`)
  console.log(`register catches: ${reg.length} (${reg.filter(r => r.would_block).length} would_block)`)
  for (const r of reg) console.log(`  ${r.register_id.padEnd(22)} ${r.defect_type.padEnd(20)} ${r.register_ref}`)

  if (flag('--check')) { console.log('\n--check: not written'); return }
  writeFileSync(OUT, JSON.stringify({
    built_at: new Date().toISOString(), reviewer_id: COFOUNDER_REVIEWER_ID,
    counts: { rows: revs.length, human: human.length, model_assisted_excluded: modelAssisted.length, review_entries: entries.length, register_entries: reg.length },
    taxonomy: TAXONOMY, entries: all,
  }, null, 1) + '\n')
  console.log(`\nwrote ${OUT} (${all.length} entries)`)
}

main().catch(e => { console.error(e); process.exit(1) })
