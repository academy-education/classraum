/**
 * Export explanations that point at an option BY POSITION; import the
 * rewrites.
 *
 * WHY THESE ARE WRONG, NOT MERELY BADLY WORDED. Both bank helpers shuffle
 * `choices` at insert — that is what killed the key-in-slot-A tell — while
 * the explanation was authored against the PRE-shuffle order. So a stored
 * explanation reading "Choice 2 echoes 'wall'" describes an option that is
 * no longer in slot 2. Verified against source on 2026-07-30: of 342 banked
 * items traceable to an authored batch file, 245 had their choices reordered
 * and 72 of those carry a positional reference.
 *
 * A student who answers wrong reads this text. It sends them to the wrong
 * option.
 *
 * The repair is therefore SEMANTIC, not cosmetic. It is not "replace 'choice
 * 2' with 'the second option'" — that is the same bug with better grammar.
 * The author must read the choices AS STORED and rewrite the explanation so
 * each description names the option by its content, which is the only
 * reference that survives a shuffle.
 *
 *   npx tsx scripts/explanation-repair-io.ts export --family=sat --section=reading_writing --batches=4
 *   npx tsx scripts/explanation-repair-io.ts import --file=.expl-repair/sat-reading_writing-1.json [--write]
 *   npx tsx scripts/explanation-repair-io.ts archive
 *
 * Import is a dry run without --write.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync, renameSync } from 'fs'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const arg = (k: string, d = '') => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? d
const MODE = process.argv[2]
const DIR = '.expl-repair'

/** Same pattern the helpers now reject at insert. Keep them in step. */
const POSITIONAL_REF = /\b(choice|option)\s+(\d|[a-d]\b)|\b(first|second|third|fourth)\s+(choice|option)\b|\([A-D]\)/i

interface Payload {
  id: string
  prompt: string
  passage: string | null
  /** AS STORED — i.e. as the student sees them, post-shuffle. */
  choices: string[]
  correct_answer: string
  explanation: string
  /** Filled in by the author. */
  repaired_explanation?: string
}

function check(p: Payload, next: string): string[] {
  const errs: string[] = []
  if (!next || !next.trim()) { errs.push('empty explanation'); return errs }
  if (POSITIONAL_REF.test(next)) errs.push('still names an option by position')
  if (next.trim() === p.explanation.trim()) errs.push('unchanged')
  // A rewrite that just deletes the offending clause loses the teaching. The
  // original is the only length reference available, so require the rewrite
  // to stay in its neighbourhood rather than collapsing to one line.
  if (next.length < p.explanation.length * 0.5) {
    errs.push(`too short: ${next.length} chars vs original ${p.explanation.length} — the distractor analysis was dropped, not rewritten`)
  }
  // The point of the repair is that descriptions are anchored to content.
  // A rewrite that never quotes any distractor has not anchored anything.
  const distractors = p.choices.filter(c => c !== p.correct_answer)
  const anchored = distractors.filter(d => {
    // A "quote" = any run of 3+ words from the option appearing in the text.
    const words = d.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean)
    for (let i = 0; i + 3 <= words.length; i++) {
      if (next.toLowerCase().includes(words.slice(i, i + 3).join(' ').toLowerCase())) return true
    }
    return false
  }).length
  if (anchored === 0) errs.push('does not quote any distractor — nothing anchors the description to an option')
  return errs
}

function archive(): string {
  const waves = existsSync(`${DIR}/done`)
    ? readdirSync(`${DIR}/done`).map(Number).filter(n => Number.isInteger(n))
    : []
  const dest = `${DIR}/done/${(waves.length ? Math.max(...waves) : 0) + 1}`
  mkdirSync(dest, { recursive: true })
  let n = 0
  for (const f of readdirSync(DIR)) {
    if (!f.endsWith('.json')) continue
    renameSync(`${DIR}/${f}`, `${dest}/${f}`); n++
  }
  console.log(n ? `archived ${n} file(s) to ${dest}` : 'nothing to archive')
  return dest
}

;(async () => {
  if (MODE === 'archive') { archive(); return }

  const family = arg('family', 'sat')
  const section = arg('section', 'reading_writing')

  if (MODE === 'export') {
    const batches = Number(arg('batches', '4'))
    const perBatch = Number(arg('per-batch', '30'))

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

    const affected = rows.filter(r => POSITIONAL_REF.test(String(r.item?.explanation ?? '')))
    if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true })

    // Same clobber guard as the length repair, for the same reason: a
    // re-export while authors are mid-edit silently discarded work and left
    // two files holding the same rows.
    const wip = Array.from({ length: batches }, (_, b) => `${DIR}/${family}-${section}-${b + 1}.json`)
      .filter(p => {
        if (!existsSync(p)) return false
        try { return (JSON.parse(readFileSync(p, 'utf8')) as Payload[]).some(i => i.repaired_explanation) } catch { return false }
      })
    if (wip.length && !process.argv.includes('--force')) {
      console.error(`Refusing to overwrite ${wip.length} file(s) holding repaired work:`)
      for (const p of wip) console.error(`  ${p}`)
      console.error('\nImport them first, or pass --force to discard them.')
      process.exit(1)
    }

    const pool = affected.slice(0, batches * perBatch)
    console.log(`${family}/${section}: ${rows.length} items, ${affected.length} explanations name an option by position`)
    console.log(`exporting ${pool.length} across ${batches} file(s)\n`)
    for (let b = 0; b < batches; b++) {
      const slice = pool.filter((_, i) => i % batches === b)
      if (!slice.length) continue
      const payload: Payload[] = slice.map(r => ({
        id: r.id,
        prompt: String(r.item.prompt ?? ''),
        passage: (r.item.passage as string | null) ?? null,
        choices: r.item.choices as string[],
        correct_answer: r.item.correct_answer as string,
        explanation: String(r.item.explanation ?? ''),
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
    const accepted: Array<{ id: string; next: string }> = []
    for (const p of payload) {
      const next = p.repaired_explanation
      if (typeof next !== 'string') { skipped++; problems.push(`${p.id.slice(0,8)}: no repaired_explanation`); continue }
      const errs = check(p, next)
      if (errs.length) { skipped++; problems.push(`${p.id.slice(0,8)}: ${errs.join('; ')}`); continue }
      accepted.push({ id: p.id, next })
    }

    if (write) {
      for (const a of accepted) {
        const { data: cur } = await db.from('study_item_bank').select('item').eq('id', a.id).maybeSingle()
        if (!cur) { skipped++; problems.push(`${a.id.slice(0,8)}: row vanished`); continue }
        const item = cur.item as Record<string, unknown>
        // Explanation ONLY. The choices are what the author read while
        // rewriting; changing them here would invalidate the rewrite.
        const { error } = await db.from('study_item_bank')
          .update({ item: { ...item, explanation: a.next } }).eq('id', a.id)
        if (error) { skipped++; problems.push(`${a.id.slice(0,8)}: ${error.message}`); continue }
        ok++
      }
    } else {
      ok = accepted.length
    }

    console.log(`${file}: ${ok} accepted, ${skipped} rejected${write ? '  [WRITTEN]' : '  [dry run]'}`)
    for (const pr of problems.slice(0, 12)) console.log(`  ${pr}`)
    if (!write && ok) console.log(`\nDry run — re-run with --write to apply ${ok} item(s).`)
    return
  }

  console.error('usage: explanation-repair-io.ts export|import|archive [flags]')
  process.exit(1)
})().catch(e => { console.error(e); process.exit(1) })
