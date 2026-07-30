/**
 * Export leaking items for agent repair; import the repaired batches back.
 *
 * The scripted single-call repair (scripts/repair-option-length.ts)
 * plateaued at ~40% acceptance across five prompt strategies. Its failure
 * was never the length arithmetic — it was that "make this distractor
 * longer" and "make this distractor tempting" are different tasks, and
 * only the second one produces an item worth serving. A model given a
 * character target pads; an author given a question thinks about why a
 * student would fall for each option.
 *
 * So the repair moves to agents doing authoring work, with this file as
 * the boundary: export writes exactly what an agent needs and nothing
 * else, import refuses anything that fails the same gate the guard uses.
 *
 *   npx tsx scripts/bank-repair-io.ts export --section=reading_writing --family=sat --batches=4
 *   npx tsx scripts/bank-repair-io.ts import  --file=.bank-repair/sat-reading_writing-1.json [--write]
 *
 * Export writes .bank-repair/<family>-<section>-<n>.json. Import is a dry
 * run without --write.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const arg = (k: string, d = '') => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? d
const MODE = process.argv[2]
const DIR = '.bank-repair'

interface Payload {
  id: string
  prompt: string
  passage: string | null
  choices: string[]
  correct_answer: string
  /** Filled in by the agent. Same order as `choices`, key left untouched. */
  repaired_choices?: string[]
}

/** The gate. Identical in spirit to verify-answer-key-spread: ranking is
 *  what matters, spread is only a proxy. */
function check(key: string, choices: string[]): string[] {
  const p: string[] = []
  if (choices.length !== 4) p.push(`expected 4 choices, got ${choices.length}`)
  if (!choices.includes(key)) p.push('key text was altered or dropped')
  if (choices.filter(c => c === key).length > 1) p.push('key appears more than once')
  if (new Set(choices.map(c => c.trim().toLowerCase())).size !== choices.length) p.push('duplicate choices')
  if (choices.some(c => !c || !c.trim())) p.push('empty choice')
  const lens = choices.map(c => c.length)
  const max = Math.max(...lens), min = Math.min(...lens)
  if (key.length === max && lens.filter(l => l === max).length === 1) p.push('key is still uniquely LONGEST')
  if (key.length === min && lens.filter(l => l === min).length === 1) p.push('key is now uniquely SHORTEST (tell inverted)')
  if (max > min * 1.6) p.push(`length spread ${(max / min).toFixed(2)}x exceeds 1.6x`)
  return p
}

;(async () => {
  if (MODE === 'export') {
    const family = arg('family', 'sat')
    const section = arg('section', 'reading_writing')
    const batches = Number(arg('batches', '4'))
    const perBatch = Number(arg('per-batch', '35'))

    const rows: Array<{ id: string; item: Record<string, unknown> }> = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('study_item_bank')
        .select('id, item').eq('family', family).eq('section', section)
        .eq('verified', true).eq('archived', false).eq('item_type', 'multiple_choice')
        .range(from, from + 999)
      if (error) throw new Error(error.message)
      rows.push(...(data as typeof rows ?? []))
      if (!data || data.length < 1000) break
    }

    const leaking = rows.filter(r => {
      const ch = r.item?.choices as string[] | undefined
      const key = r.item?.correct_answer as string | undefined
      if (!Array.isArray(ch) || ch.length !== 4 || typeof key !== 'string') return false
      const lens = ch.map(c => c.length), max = Math.max(...lens)
      return key.length === max && lens.filter(l => l === max).length === 1
    })

    // Land the SECTION at 25%, not the batch at 0% — driving every
    // flagged item to "key not longest" would leave the served pool with
    // no long keys at all, which is the same exploit reversed.
    const target = Math.round(rows.length * 0.25)
    const needed = Math.max(0, leaking.length - target)
    const pool = [...leaking].sort(() => Math.random() - 0.5).slice(0, Math.min(needed, batches * perBatch))

    if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true })

    // REFUSE to clobber work in progress.
    //
    // On the first SAT wave this export was re-run while four agents were
    // mid-edit. It overwrote all four files with a fresh random sample,
    // which (a) discarded one agent's assigned items from the set and
    // (b) left files 1 and 2 holding the SAME 30 rows — so importing
    // both would have had two agents' rewrites race on one row, second
    // write silently winning. That is the one-writer-per-item problem in
    // CLAUDE.md, arriving through a helper script instead of a route.
    //
    // Nothing was lost, because the agent noticed and restored its set.
    // Relying on that is not a plan.
    const wip = Array.from({ length: batches }, (_, b) => `${DIR}/${family}-${section}-${b + 1}.json`)
      .filter(p => {
        if (!existsSync(p)) return false
        try {
          return (JSON.parse(readFileSync(p, 'utf8')) as Payload[]).some(i => i.repaired_choices)
        } catch { return false }
      })
    if (wip.length && !process.argv.includes('--force')) {
      console.error(`Refusing to overwrite ${wip.length} file(s) that already contain repaired work:`)
      for (const p of wip) console.error(`  ${p}`)
      console.error('\nImport them first, or pass --force to discard them.')
      process.exit(1)
    }

    console.log(`${family}/${section}: ${rows.length} items, ${leaking.length} leaking, target ${target}`)
    console.log(`repair ${needed}; exporting ${pool.length} across ${batches} file(s)\n`)
    for (let b = 0; b < batches; b++) {
      const slice = pool.filter((_, i) => i % batches === b)
      if (!slice.length) continue
      const payload: Payload[] = slice.map(r => ({
        id: r.id,
        prompt: String(r.item.prompt ?? ''),
        passage: (r.item.passage as string | null) ?? null,
        choices: r.item.choices as string[],
        correct_answer: r.item.correct_answer as string,
      }))
      const path = `${DIR}/${family}-${section}-${b + 1}.json`
      writeFileSync(path, JSON.stringify(payload, null, 2))
      console.log(`  ${path}  (${payload.length} items)`)
    }
    return
  }

  if (MODE === 'import') {
    const file = arg('file')
    const write = process.argv.includes('--write')
    if (!file) throw new Error('--file= required')
    const payload: Payload[] = JSON.parse(readFileSync(file, 'utf8'))

    let ok = 0, skipped = 0
    const problems: string[] = []
    for (const p of payload) {
      const next = p.repaired_choices
      if (!Array.isArray(next)) { skipped++; problems.push(`${p.id.slice(0,8)}: no repaired_choices`); continue }
      const errs = check(p.correct_answer, next)
      if (errs.length) { skipped++; problems.push(`${p.id.slice(0,8)}: ${errs.join('; ')}`); continue }
      if (write) {
        const { data: cur } = await db.from('study_item_bank').select('item').eq('id', p.id).maybeSingle()
        if (!cur) { skipped++; problems.push(`${p.id.slice(0,8)}: row vanished`); continue }
        const item = cur.item as Record<string, unknown>
        const { error } = await db.from('study_item_bank')
          .update({ item: { ...item, choices: next } }).eq('id', p.id)
        if (error) { skipped++; problems.push(`${p.id.slice(0,8)}: ${error.message}`); continue }
      }
      ok++
    }
    console.log(`${file}: ${ok} accepted, ${skipped} rejected${write ? '  [WRITTEN]' : '  [dry run]'}`)
    for (const pr of problems.slice(0, 12)) console.log(`  ${pr}`)
    if (!write && ok) console.log(`\nDry run — re-run with --write to apply ${ok} item(s).`)
    return
  }

  console.error('usage: bank-repair-io.ts export|import [flags]')
  process.exit(1)
})().catch(e => { console.error(e); process.exit(1) })
