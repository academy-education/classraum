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
  /**
   * Where the key must sit by length once repaired: 2 = second-longest,
   * 3 = third, 4 = shortest. Assigned by export from the section's deficit,
   * NOT chosen by the author. Absent on first-wave files.
   */
  target_rank?: 2 | 3 | 4
  /** Filled in by the agent. Same order as `choices`, key left untouched. */
  repaired_choices?: string[]
}

/** Where the key sits by length, 1 = longest. Requires 4 choices. */
function lengthRank(key: string, choices: string[]): number {
  return choices.filter(c => c.length > key.length).length + 1
}

function histogram(items: Array<{ key: string; choices: string[] }>): number[] {
  const counts = [0, 0, 0, 0]
  for (const it of items) counts[lengthRank(it.key, it.choices) - 1]!++
  return counts
}

/**
 * WHY THE AGENT NO LONGER CHOOSES THE RANK.
 *
 * The first wave asked agents to "aim for the correct answer to sit 2nd or
 * 3rd of four by length" and gated per item on "not uniquely longest, not
 * uniquely shortest". 162 of 210 items (77%) came back at rank 2: every
 * agent heard "aim for 2nd", and the gate had no opinion about that because
 * a distribution is not a property of any single item.
 *
 * Tightening the gate to "no rank above 40% per batch" was the obvious next
 * move and it is wrong for the same reason the first brief was wrong — it
 * encodes a made-up invariant. SAT R&W is already at exactly 25.0% on rank
 * 2, so the batch it actually needs is ~50/50 across ranks 3 and 4, which a
 * flat-batch gate rejects.
 *
 * What matters is the SECTION histogram, so that is what drives the work:
 * export reads the section's current histogram, computes the per-rank
 * deficit against 25%, and stamps each exported item with the rank it must
 * land on. The agent authors to a stated target; import checks the target
 * was hit. The distribution then holds by construction instead of by
 * everyone independently guessing the same safe middle.
 */
function assignTargets(counts: number[], pool: number): number[] {
  // Ranks 2..4 only. Rank 1 is where every exported item already sits, and
  // the export ships only the EXCESS over 25% — the items left behind
  // supply rank 1's quarter.
  const have = [counts[1]!, counts[2]!, counts[3]!]
  const out: number[] = []
  for (let i = 0; i < pool; i++) {
    // Water-filling: give the next item to whichever rank is furthest below
    // its quarter. Handles "rank 2 is already full" without a special case,
    // and degrades sensibly once every rank is at target (keeps levelling).
    let pick = 0
    for (let r = 1; r < 3; r++) if (have[r]! < have[pick]!) pick = r
    have[pick]!++
    out.push(pick + 2)
  }
  return out
}

/**
 * Per-item gate. Integrity, then the assigned rank.
 *
 * The old rule "key must not be uniquely shortest (tell inverted)" is gone.
 * Rank 4 IS uniquely shortest, and a quarter of the bank is supposed to be
 * there — TOEFL Listening sits at 3.9%, which makes "eliminate the shortest
 * option" worth 33% instead of 25%. Refusing to ever author a short key was
 * itself one of the tells. The 1.6x spread cap is what keeps a rank-4 key
 * from being a three-word stub beside three full sentences.
 */
function check(key: string, choices: string[], targetRank: number | null, before: string[]): string[] {
  const p: string[] = []
  if (choices.length !== 4) { p.push(`expected 4 choices, got ${choices.length}`); return p }
  if (!choices.includes(key)) p.push('key text was altered or dropped')
  // The key must stay in the SLOT it was in, not merely survive somewhere in
  // the array. Membership plus rank says nothing about position, and position
  // is the older tell — a hand-authored cohort shipped at 73% key-at-A on
  // 2026-07-28. A repair pass that quietly permuted options could undo a
  // spread this script never looks at. Found by an author reading the gate
  // rather than by the gate.
  if (before.indexOf(key) !== choices.indexOf(key)) {
    p.push(`key moved from slot ${before.indexOf(key)} to ${choices.indexOf(key)}`)
  }
  if (choices.filter(c => c === key).length > 1) p.push('key appears more than once')
  if (new Set(choices.map(c => c.trim().toLowerCase())).size !== choices.length) p.push('duplicate choices')
  if (choices.some(c => !c || !c.trim())) p.push('empty choice')
  const lens = choices.map(c => c.length)
  const max = Math.max(...lens), min = Math.min(...lens)
  if (max > min * 1.6) p.push(`length spread ${(max / min).toFixed(2)}x exceeds 1.6x`)
  const got = lengthRank(key, choices)
  if (targetRank === null) {
    // Legacy payload from the first wave, authored before targets existed.
    // Only rank 1 is disqualifying — that is the tell being repaired.
    if (got === 1) p.push('key is still the longest option (rank 1)')
  } else if (got !== targetRank) {
    p.push(`key landed at length-rank ${got}, assigned ${targetRank}`)
  }
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

    const scored = rows.filter(r => {
      const ch = r.item?.choices as string[] | undefined
      const key = r.item?.correct_answer as string | undefined
      return Array.isArray(ch) && ch.length === 4 && typeof key === 'string'
    })
    const counts = histogram(scored.map(r => ({
      key: r.item.correct_answer as string, choices: r.item.choices as string[],
    })))
    const leaking = scored.filter(r =>
      lengthRank(r.item.correct_answer as string, r.item.choices as string[]) === 1)

    // Land the SECTION at 25%, not the batch at 0% — driving every
    // flagged item to "key not longest" would leave the served pool with
    // no long keys at all, which is the same exploit reversed.
    const target = Math.round(scored.length * 0.25)
    const needed = Math.max(0, leaking.length - target)
    const pool = [...leaking].sort(() => Math.random() - 0.5).slice(0, Math.min(needed, batches * perBatch))
    const targets = assignTargets(counts, pool.length)

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

    const pct = (x: number) => `${(100 * x / scored.length).toFixed(1)}%`
    console.log(`${family}/${section}: ${scored.length} four-choice items, quarter = ${target}`)
    console.log(`  current rank 1/2/3/4 : ${counts.map(pct).join('  ')}   (${counts.join('/')})`)
    console.log(`  ${leaking.length} at rank 1; ${needed} must move`)
    const tHist = [0, 0, 0]
    for (const t of targets) tHist[t - 2]!++
    console.log(`  exporting ${pool.length}, assigned to rank 2/3/4 : ${tHist.join('/')}\n`)
    for (let b = 0; b < batches; b++) {
      const slice = pool.filter((_, i) => i % batches === b)
      if (!slice.length) continue
      const payload: Payload[] = slice.map(r => ({
        id: r.id,
        prompt: String(r.item.prompt ?? ''),
        passage: (r.item.passage as string | null) ?? null,
        choices: r.item.choices as string[],
        correct_answer: r.item.correct_answer as string,
        target_rank: targets[pool.indexOf(r)] as 2 | 3 | 4,
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
    const accepted: Array<{ id: string; next: string[] }> = []
    for (const p of payload) {
      const next = p.repaired_choices
      if (!Array.isArray(next)) { skipped++; problems.push(`${p.id.slice(0,8)}: no repaired_choices`); continue }
      const errs = check(p.correct_answer, next, p.target_rank ?? null, p.choices)
      if (errs.length) { skipped++; problems.push(`${p.id.slice(0,8)}: ${errs.join('; ')}`); continue }
      accepted.push({ id: p.id, next })
    }

    // PROJECT THE SECTION, then decide.
    //
    // Every item passing its own gate says nothing about the histogram a
    // student actually faces — that is how 77% of the first wave landed on
    // rank 2 with a green import. So before writing, read the whole section
    // and print what it becomes. The batch is not the unit of exposure.
    const family = arg('family') || (file.match(/([a-z]+)-[a-z_]+-\d+\.json$/)?.[1] ?? '')
    const section = arg('section') || (file.match(/[a-z]+-([a-z_]+)-\d+\.json$/)?.[1] ?? '')
    if (family && section) {
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
      const byId = new Map(accepted.map(a => [a.id, a.next]))
      const pairs = rows
        .filter(r => Array.isArray(r.item?.choices) && (r.item.choices as string[]).length === 4
                     && typeof r.item?.correct_answer === 'string')
        .map(r => ({
          key: r.item.correct_answer as string,
          choices: r.item.choices as string[],
          after: byId.get(r.id) ?? (r.item.choices as string[]),
        }))
      const before = histogram(pairs)
      const after = histogram(pairs.map(x => ({ key: x.key, choices: x.after })))
      const n = pairs.length
      const pct = (c: number[]) => c.map(x => `${(100 * x / n).toFixed(1)}%`.padStart(6)).join(' ')
      console.log(`\nsection ${family}/${section}  n=${n}   (target 25.0% each)`)
      console.log(`  rank      1      2      3      4`)
      console.log(`  before ${pct(before)}`)
      console.log(`  after  ${pct(after)}`)
      const worse = after.some((a, i) => Math.abs(a / n - 0.25) > Math.abs(before[i]! / n - 0.25) + 1e-9)
      if (worse) {
        // Fails the DRY RUN too, not just the write. A check that only
        // objects at write time cannot be put in front of the write —
        // which is the only place it would have helped.
        console.log(`  ^ at least one rank moved AWAY from 25%.`)
        if (!process.argv.includes('--allow-regression')) {
          console.error(`Refusing${write ? ' to write' : ''}. Pass --allow-regression if this is deliberate.`)
          process.exit(1)
        }
      }
      console.log('')
    }

    if (write) {
      for (const a of accepted) {
        const { data: cur } = await db.from('study_item_bank').select('item').eq('id', a.id).maybeSingle()
        if (!cur) { skipped++; problems.push(`${a.id.slice(0,8)}: row vanished`); continue }
        const item = cur.item as Record<string, unknown>
        const { error } = await db.from('study_item_bank')
          .update({ item: { ...item, choices: a.next } }).eq('id', a.id)
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

  console.error('usage: bank-repair-io.ts export|import [flags]')
  process.exit(1)
})().catch(e => { console.error(e); process.exit(1) })
