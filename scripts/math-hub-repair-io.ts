/**
 * Export the derivational-hub work-list for authoring; check repaired files.
 *
 * READ-ONLY against the database. It never UPDATEs — repaired option sets are
 * written to scripts/study-bank/math-hub-*.json for review, and the "after"
 * number is produced by running verify-math-hub.ts with --overlay against
 * those files so that the SAME detector code decides both numbers.
 *
 *   npx tsx scripts/math-hub-repair-io.ts export
 *   npx tsx scripts/math-hub-repair-io.ts check
 *
 * The hub predicate here is imported from verify-math-hub.ts rather than
 * re-implemented: a second copy of `derives` that drifted by one candidate
 * would make the repair look complete against a detector nobody runs.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local'), quiet: true })
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from 'fs'
import { num, derives } from './verify-math-hub'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const DIR = 'scripts/study-bank'
const MODE = process.argv[2]

export interface HubPayload {
  id: string
  domain: string
  subskill: string | null
  prompt: string
  correct_answer: string
  /** Original option set, key included, in banked order. */
  choices: string[]
  explanation: string
  /** Filled in by the author. Same length/order, key untouched in its slot. */
  repaired_choices?: string[]
  /** One line per replaced distractor: the wrong path that produces it. */
  distractor_reasoning?: Record<string, string>
}

/** The single-hub / hub-is-key test, exactly as verify-math-hub.ts applies it. */
export function hubIndex(choices: string[]): number | null {
  const vals = choices.map(num)
  if (vals.some(v => v === null)) return null
  const v = vals as number[]
  const hubs = v.map((x, i) => v.filter((y, j) => j !== i && derives(x, y)).length >= 2)
  if (hubs.filter(Boolean).length !== 1) return null
  return hubs.findIndex(Boolean)
}

export function hubIsKey(choices: string[], key: string): boolean {
  const i = hubIndex(choices)
  return i !== null && choices[i] === key
}

async function loadMath() {
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('id, item, domain, subskill')
      .eq('family', 'sat').eq('section', 'math')
      .eq('archived', false).eq('item_type', 'multiple_choice')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return rows
}

;(async () => {
  if (MODE === 'export') {
    const rows = await loadMath()
    const flagged: HubPayload[] = []
    for (const r of rows) {
      const ch = r.item?.choices, key = r.item?.correct_answer
      if (!Array.isArray(ch) || ch.length !== 4 || typeof key !== 'string') continue
      if (!hubIsKey(ch, key)) continue
      flagged.push({
        id: r.id,
        domain: r.domain ?? '?',
        subskill: r.subskill ?? null,
        prompt: String(r.item.prompt ?? ''),
        correct_answer: key,
        choices: ch,
        explanation: String(r.item.explanation ?? ''),
      })
    }
    if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true })
    // Group by domain so an author works one domain at a time and can see the
    // error types already used inside that domain (the cross-item-tell risk
    // is per-domain, since a student meets a whole domain in one sitting).
    const byDomain = new Map<string, HubPayload[]>()
    for (const f of flagged) {
      if (!byDomain.has(f.domain)) byDomain.set(f.domain, [])
      byDomain.get(f.domain)!.push(f)
    }
    const slug = (d: string) => d.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    console.log(`${flagged.length} flagged items of ${rows.length} math rows`)
    for (const [d, list] of byDomain) {
      const path = `${DIR}/math-hub-${slug(d)}.json`
      writeFileSync(path, JSON.stringify(list, null, 2))
      console.log(`  ${path}  (${list.length} items)`)
    }
    return
  }

  if (MODE === 'check') {
    const files = readdirSync(DIR).filter(f => /^math-hub-.*\.json$/.test(f))
    let total = 0, repaired = 0, stillHub = 0
    const problems: string[] = []
    for (const f of files) {
      const payload: HubPayload[] = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'))
      for (const p of payload) {
        total++
        const next = p.repaired_choices
        if (!Array.isArray(next)) { problems.push(`${p.id.slice(0, 8)}: no repaired_choices`); continue }
        const errs: string[] = []
        if (next.length !== 4) errs.push(`expected 4 choices, got ${next.length}`)
        // The key must stay in its ORIGINAL SLOT. Membership is not enough:
        // permuting options silently undoes the answer-key spread that a
        // different script guards, and this one would never notice.
        if (p.choices.indexOf(p.correct_answer) !== next.indexOf(p.correct_answer)) {
          errs.push(`key moved from slot ${p.choices.indexOf(p.correct_answer)} to ${next.indexOf(p.correct_answer)}`)
        }
        if (new Set(next.map(c => String(c).trim())).size !== next.length) errs.push('duplicate choices')
        if (next.some(c => !String(c).trim())) errs.push('empty choice')
        if (next.map(num).some(v => v === null)) errs.push('a choice is no longer numeric')
        // A distractor equal to an ORIGINAL distractor is allowed only if it
        // was not one of the derived ones; the hub test below decides that.
        if (hubIsKey(next, p.correct_answer)) { errs.push('key is STILL the unique hub'); stillHub++ }
        const missing = next.filter(c => c !== p.correct_answer)
          .filter(c => !(p.distractor_reasoning ?? {})[c])
        if (missing.length) errs.push(`no reasoning for: ${missing.join(', ')}`)
        if (errs.length) problems.push(`${p.id.slice(0, 8)}: ${errs.join('; ')}`)
        else repaired++
      }
    }
    console.log(`${files.length} file(s), ${total} items: ${repaired} clean, ${problems.length} with problems`)
    console.log(`  key is still the unique hub in ${stillHub} item(s)`)
    for (const pr of problems.slice(0, 40)) console.log(`  ${pr}`)
    return
  }

  console.error('usage: math-hub-repair-io.ts export|check')
  process.exit(1)
})().catch(e => { console.error(e); process.exit(1) })
