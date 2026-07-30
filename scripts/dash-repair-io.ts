/**
 * Export items whose KEY carries the em dash; import the repunctuated batches.
 *
 * Third repair in this shape, after scripts/bank-repair-io.ts (option length)
 * and scripts/explanation-repair-io.ts (positional explanations). Same
 * conventions on purpose: dry run by default, clobber guard on export,
 * wave-numbered archive, and a gate that refuses the ways of not doing the
 * work. The reasoning about WHAT the tell is and why a naive strip is wrong
 * lives in src/lib/study/dash-repair-gate.ts; this file is the boundary.
 *
 *   npx tsx scripts/dash-repair-io.ts export --family=sat --section=reading_writing --batches=2
 *   npx tsx scripts/dash-repair-io.ts import --file=.dash-repair/sat-reading_writing-1.json [--write]
 *   npx tsx scripts/dash-repair-io.ts project --family=toefl --section=listening
 *   npx tsx scripts/dash-repair-io.ts archive
 *
 * `project` reads every staged batch for a section at once and prints the
 * section as it would be after ALL of them land. Importing file by file
 * shows each file's slice of the section and nothing about their sum, and
 * the sum is what a student faces.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local'), quiet: true })

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync, renameSync } from 'fs'
import {
  hasDash, lengthRank, rankHistogram, classify, planRepair, checkRepair,
  TELL_RULES, ODD_RULES, scoreRule, scoreOddRule, substituteConcentration,
  type DashPayload, type ScoredItem,
} from '../src/lib/study/dash-repair-gate'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const arg = (k: string, d = '') => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? d
const MODE = process.argv[2]
const DIR = '.dash-repair'

type Row = { id: string; item: Record<string, unknown> }

async function loadSection(family: string, section: string): Promise<Row[]> {
  const rows: Row[] = []
  // PAGED, NOT `.limit()`. PostgREST caps a plain select at 1000 rows and a
  // verifier that read a truncated bank once reported "0 problems" over the
  // rows containing the defect.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('id, item').eq('family', family).eq('section', section)
      .eq('verified', true).eq('archived', false).eq('item_type', 'multiple_choice')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data as Row[] ?? []))
    if (!data || data.length < 1000) break
  }
  return rows.filter(r =>
    Array.isArray(r.item?.choices) && (r.item.choices as string[]).length === 4
    && typeof r.item?.correct_answer === 'string'
    && (r.item.choices as string[]).includes(r.item.correct_answer as string))
}

const asItem = (r: Row): ScoredItem => ({
  key: r.item.correct_answer as string,
  choices: r.item.choices as string[],
})

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

const pctStr = (x: number) => `${(100 * x).toFixed(1)}%`.padStart(6)

/**
 * Print the section as it becomes, for EVERY rule the verifier measures.
 *
 * Not just the em dash. The obvious failure mode of this repair is that the
 * dash gets traded for something else the verifier also watches — a comma
 * (SAT R&W already reads 45.5%), a semicolon (42.3%), a hedge word (46.0%).
 * A gate that only looked at dashes would go green while the exploit moved
 * one column to the left. Refuses when any rule ends further from 25% than
 * it started.
 */
function project(pairs: Array<{ key: string; before: string[]; after: string[] }>, label: string): boolean {
  const b: ScoredItem[] = pairs.map(p => ({ key: p.key, choices: p.before }))
  // The key text itself changes in this repair, so "after" needs the new key.
  const a: ScoredItem[] = pairs.map(p => ({
    key: p.after[p.before.indexOf(p.key)] ?? p.key, choices: p.after,
  }))

  console.log(`\n${label}  n=${pairs.length}   (25.0% is chance)`)
  console.log(`  ${'rule'.padEnd(28)} ${'usable'.padStart(11)}   before   after`)
  let regressed = 0
  const report = (name: string, sb: { usable: number; correct: number }, sa: { usable: number; correct: number }) => {
    if (sb.usable < 20 && sa.usable < 20) {
      console.log(`  ${name.padEnd(28)} ${`${sb.usable}->${sa.usable}`.padStart(11)}   ${'n/a'.padStart(6)}  ${'n/a'.padStart(6)}`)
      return
    }
    const rb = sb.usable ? sb.correct / sb.usable : 0.25
    const ra = sa.usable ? sa.correct / sa.usable : 0.25
    // Only judge a rule that has a denominator worth judging on BOTH sides.
    const judge = sb.usable >= 20 && sa.usable >= 20
    const worse = judge && Math.abs(ra - 0.25) > Math.abs(rb - 0.25) + 0.015
    if (worse) regressed++
    console.log(`  ${name.padEnd(28)} ${`${sb.usable}->${sa.usable}`.padStart(11)}   ${pctStr(rb)}  ${pctStr(ra)}${worse ? '   <-- MOVED AWAY FROM 25%' : ''}`)
  }
  for (const rule of TELL_RULES) report(rule.name, scoreRule(b, rule), scoreRule(a, rule))
  for (const rule of ODD_RULES) {
    report(`odd-one-out: ${rule.name}`, scoreOddRule(b, rule.hit, rule.name), scoreOddRule(a, rule.hit, rule.name))
  }

  // The length-rank histogram must be IDENTICAL, not merely close. Every
  // accepted item preserved its own rank, so anything but equality here
  // means the per-item gate and this projection disagree — which would mean
  // one of them is wrong, and that is worth a hard stop either way.
  const hb = rankHistogram(b), ha = rankHistogram(a)
  const n = pairs.length
  console.log(`  key length-rank 1/2/3/4     before ${hb.map(x => pctStr(x / n)).join(' ')}  (${hb.join('/')})`)
  console.log(`                              after  ${ha.map(x => pctStr(x / n)).join(' ')}  (${ha.join('/')})`)
  const rankMoved = hb.some((x, i) => x !== ha[i])
  if (rankMoved) console.log(`  ^ LENGTH-RANK HISTOGRAM MOVED — four waves of work depend on it not moving`)

  return regressed === 0 && !rankMoved
}

;(async () => {
  if (MODE === 'archive') { archive(); return }

  const family = arg('family', 'sat')
  const section = arg('section', 'reading_writing')

  if (MODE === 'export') {
    const batches = Number(arg('batches', '2'))
    const rows = await loadSection(family, section)
    const items = rows.map(asItem)
    const plan = planRepair(items)

    console.log(`${family}/${section}: ${rows.length} four-choice items`)
    console.log(`  em dash rule now : ${plan.keyBefore}/${plan.usableBefore} usable = ${pctStr(plan.rateBefore)}`)
    console.log(`  key-only ${plan.keyOnly}   key-plus ${plan.keyPlus}`)
    console.log(`  repairing all ${plan.keyPlus} key-plus + ${plan.move} of ${plan.keyOnly} key-only = ${plan.keyPlus + plan.move} items`)
    console.log(`  projected        : ${plan.keyAfter}/${plan.usableAfter} usable = ${pctStr(plan.rateAfter)}\n`)
    if (plan.keyPlus + plan.move === 0) { console.log('nothing to do'); return }

    const cls = rows.map(r => classify(asItem(r)))
    const keyPlus = rows.filter((_, i) => cls[i] === 'key-plus')
    const keyOnly = rows.filter((_, i) => cls[i] === 'key-only')
    for (let i = keyOnly.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[keyOnly[i], keyOnly[j]] = [keyOnly[j]!, keyOnly[i]!]
    }
    const pool = [...keyPlus, ...keyOnly.slice(0, plan.move)]
    // Shuffle the MIX before splitting, so no one file is all key-plus (the
    // easy kind: a distractor already carries a dash, so only the key needs
    // touching). bank-repair-io learned this when `i % batches` handed one
    // author 34 consecutive items of the hardest kind.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
    }

    if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true })

    // Clobber guard, same reason as the other two: a re-export while authors
    // are mid-edit once discarded one author's work and left two files
    // holding the same rows, so two rewrites would race on one row.
    const wip = Array.from({ length: batches }, (_, b) => `${DIR}/${family}-${section}-${b + 1}.json`)
      .filter(p => {
        if (!existsSync(p)) return false
        try { return (JSON.parse(readFileSync(p, 'utf8')) as DashPayload[]).some(i => i.repaired_choices) } catch { return false }
      })
    if (wip.length && !process.argv.includes('--force')) {
      console.error(`Refusing to overwrite ${wip.length} file(s) holding repaired work:`)
      for (const p of wip) console.error(`  ${p}`)
      console.error('\nImport them first, or pass --force to discard them.')
      process.exit(1)
    }

    for (let b = 0; b < batches; b++) {
      const slice = pool.filter((_, i) => i % batches === b)
      if (!slice.length) continue
      const payload: DashPayload[] = slice.map(r => {
        const choices = r.item.choices as string[]
        const key = r.item.correct_answer as string
        const slot = choices.indexOf(key)
        const existing = choices.filter((c, i) => i !== slot && hasDash(c)).length
        return {
          id: r.id,
          prompt: String(r.item.prompt ?? ''),
          passage: (r.item.passage as string | null) ?? null,
          choices,
          correct_answer: key,
          explanation: String(r.item.explanation ?? ''),
          key_slot: slot,
          key_length_rank: lengthRank(key, choices),
          // Where the dash must live afterwards. `max(1, ...)` is what stops
          // the repair from becoming a strip: on a key-only item the dash has
          // to reappear on a distractor, not disappear.
          target_distractor_dashes: Math.max(1, existing),
        }
      })
      const path = `${DIR}/${family}-${section}-${b + 1}.json`
      writeFileSync(path, JSON.stringify(payload, null, 2))
      const kp = payload.filter(p =>
        p.choices.filter((c, i) => i !== p.key_slot && hasDash(c)).length > 0).length
      console.log(`  ${path}  (${payload.length} items: ${kp} key-plus, ${payload.length - kp} key-only)`)
    }
    return
  }

  if (MODE === 'import' || MODE === 'project') {
    const write = process.argv.includes('--write')
    const files = MODE === 'project'
      ? readdirSync(DIR).filter(f => f.startsWith(`${family}-${section}-`) && f.endsWith('.json')).map(f => `${DIR}/${f}`)
      : [arg('file')]
    if (!files.length || !files[0]) throw new Error(MODE === 'project' ? 'no staged batches found' : '--file= required')
    if (write && MODE === 'project') throw new Error('project is read-only; use import --write')

    const accepted: Array<{ id: string; choices: string[]; key: string; explanation?: string; oldKey: string; before: string[] }> = []
    let skipped = 0
    const problems: string[] = []
    for (const file of files) {
      const payload: DashPayload[] = JSON.parse(readFileSync(file, 'utf8'))
      let fileOk = 0
      for (const p of payload) {
        const errs = checkRepair(p)
        if (errs.length) { skipped++; problems.push(`${p.id.slice(0, 8)}: ${errs.join('; ')}`); continue }
        accepted.push({
          id: p.id, choices: p.repaired_choices!, key: p.repaired_correct_answer!,
          explanation: p.repaired_explanation, oldKey: p.correct_answer, before: p.choices,
        })
        fileOk++
      }
      console.log(`${file}: ${fileOk} accepted, ${payload.length - fileOk} rejected`)
    }

    const rows = await loadSection(family, section)
    const byId = new Map(accepted.map(a => [a.id, a.choices]))
    const clean = project(rows.map(r => ({
      key: r.item.correct_answer as string,
      before: r.item.choices as string[],
      after: byId.get(r.id) ?? (r.item.choices as string[]),
    })), `section ${family}/${section}`)

    // What replaced the dash, across the batch. One substitute doing most of
    // the work is a new tell with no rule watching it.
    let varied = true
    if (accepted.length) {
      const conc = substituteConcentration(accepted.map(a => ({ before: a.oldKey, after: a.key })))
      const loud = conc.filter(c => c.share > 0.4)
      console.log(`\n  what replaced the dash in ${accepted.length} keys:`)
      for (const c of conc) if (c.n) console.log(`    ${c.name.padEnd(12)} ${c.n} (${pctStr(c.share)})`)
      if (!conc.some(c => c.n)) console.log(`    none of the tracked substitutes — rephrased, not repunctuated`)
      for (const c of loud) {
        console.log(`    ^ ${c.name} carries ${pctStr(c.share)} of the batch — that is the next tell`)
        varied = false
      }
    }

    if ((!clean || !varied) && !process.argv.includes('--allow-regression')) {
      // Fails the DRY RUN as well as the write. A check that only objects at
      // write time cannot be put in front of the write.
      console.error(`\nRefusing${write ? ' to write' : ''}: a rule moved away from 25%, the length-rank histogram moved, or one substitute dominates the batch.`)
      console.error('Pass --allow-regression if this is deliberate.')
      process.exit(1)
    }

    if (write && MODE === 'import') {
      let ok = 0
      for (const a of accepted) {
        const { data: cur } = await db.from('study_item_bank').select('item').eq('id', a.id).maybeSingle()
        if (!cur) { skipped++; problems.push(`${a.id.slice(0, 8)}: row vanished`); continue }
        const item = cur.item as Record<string, unknown>
        // STALENESS. The batch holds a snapshot of `choices` taken at export
        // time, and the gate checks the repair against THAT. During this
        // repair the toefl/listening section changed underneath us from
        // another writer — three rules moved on items nobody here touched —
        // and `updated_at` could not date it, because every row's updated_at
        // still equals its created_at. So compare, and refuse rather than
        // overwrite someone else's newer text with a rewrite of older text.
        const live = JSON.stringify(item.choices)
        if (live !== JSON.stringify(a.before)) {
          skipped++
          problems.push(`${a.id.slice(0, 8)}: choices changed since export — re-export this item`)
          continue
        }
        const next: Record<string, unknown> = { ...item, choices: a.choices, correct_answer: a.key }
        if (a.explanation) next.explanation = a.explanation
        // distractor_rationales[].choice mirrors the distractor text verbatim.
        // Leaving it behind would make it a dangling reference to prose that
        // no longer exists — the same class of bug as a positional
        // explanation, so remap it by slot rather than by text.
        const rats = item.distractor_rationales as Array<{ choice: string; reason: string }> | null | undefined
        if (Array.isArray(rats)) {
          const oldChoices = item.choices as string[]
          next.distractor_rationales = rats.map(rt => {
            const i = oldChoices.indexOf(rt.choice)
            return i >= 0 && a.choices[i] !== undefined ? { ...rt, choice: a.choices[i]! } : rt
          })
        }
        const { error } = await db.from('study_item_bank').update({ item: next }).eq('id', a.id)
        if (error) { skipped++; problems.push(`${a.id.slice(0, 8)}: ${error.message}`); continue }
        ok++
      }
      console.log(`\n${ok} item(s) WRITTEN, ${skipped} rejected`)
    } else {
      console.log(`\n${accepted.length} item(s) would change, ${skipped} rejected  [${MODE === 'project' ? 'projection' : 'dry run'}]`)
    }
    for (const pr of problems.slice(0, 15)) console.log(`  ${pr}`)
    return
  }

  console.error('usage: dash-repair-io.ts export|import|project|archive [flags]')
  process.exit(1)
})().catch(e => { console.error(e); process.exit(1) })
