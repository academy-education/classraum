/**
 * READ-ONLY: scan banked 4-choice items for STRUCTURAL tells — properties a
 * candidate could exploit without reading the passage.
 *
 * Length was the fourth such tell found (after key-in-slot-A, complete-ABCD
 * permutations, and identical key prose across lectures). Each was invisible
 * to the check watching for the one before it, so this looks for several at
 * once and reports the exploit rate rather than a pass/fail on one rule.
 *
 * A tell is worth acting on when "always pick the option with property P"
 * beats 25% by a wide margin. The report prints that number directly.
 *
 *   npx tsx scripts/verify-option-tells.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local'), quiet: true })
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const HEDGE = /\b(may|might|can|could|often|sometimes|generally|typically|tend|tends|tended|partly|largely|suggests?|likely|some|several|certain|relatively|somewhat)\b/i
const ABSOLUTE = /\b(all|every|always|never|none|no one|only|entirely|completely|impossible|must|cannot|solely|exclusively|totally|invariably)\b/i

type Rule = { name: string; hit: (c: string) => boolean }
const RULES: Rule[] = [
  { name: 'ends with a period', hit: c => /\.\s*$/.test(c) },
  { name: 'contains a hedge word', hit: c => HEDGE.test(c) },
  { name: 'contains an absolute', hit: c => ABSOLUTE.test(c) },
  { name: 'contains a comma', hit: c => c.includes(',') },
  // Typography, not vocabulary. Two authors independently found an em dash
  // in 85% and 72% of their own draft keys, because a dash is how you hedge
  // a fully-accurate statement — the same pressure that made keys longest.
  { name: 'contains an em dash', hit: c => /[—–]| - /.test(c) },
  { name: 'contains a semicolon', hit: c => c.includes(';') },
  { name: 'contains a quoted phrase', hit: c => /["“”]/.test(c) },
  { name: 'has the most words', hit: () => false }, // handled separately
]

type Item = { key: string; choices: string[] }
const cache = new Map<string, Item[]>()
async function load(family: string, section: string): Promise<Item[]> {
  const ck = `${family}/${section}`
  if (cache.has(ck)) return cache.get(ck)!
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank').select('item')
      .eq('family', family).eq('section', section)
      .eq('verified', true).eq('archived', false).eq('item_type', 'multiple_choice')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? [])); if (!data || data.length < 1000) break
  }
  const items = rows
    .map(r => ({ key: r.item?.correct_answer, choices: r.item?.choices }))
    .filter(x => Array.isArray(x.choices) && x.choices.length === 4 && typeof x.key === 'string') as Item[]
  cache.set(ck, items)
  return items
}

const sections: Array<[string, string]> = [
  ['sat', 'reading_writing'], ['sat', 'math'],
  ['toefl', 'listening'], ['toefl', 'reading'],
]

;(async () => {
  for (const [family, section] of sections) {
    const items = await load(family, section)
    if (!items.length) continue

    console.log(`\n${family}/${section}  n=${items.length}`)
    for (const rule of RULES) {
      // "Pick the UNIQUE option with property P." Only items where exactly one
      // option has it are exploitable — otherwise the strategy has no target.
      // Report how often that unique option is the key.
      let usable = 0, correct = 0
      for (const it of items) {
        const hits = rule.name === 'has the most words'
          ? (() => {
              const w = it.choices.map((c: string) => c.trim().split(/\s+/).length)
              const max = Math.max(...w)
              return it.choices.filter((_: string, i: number) => w[i] === max)
            })()
          : it.choices.filter(rule.hit)
        if (hits.length !== 1) continue
        usable++
        if (hits[0] === it.key) correct++
      }
      if (usable < 20) { console.log(`  ${rule.name.padEnd(24)} usable on only ${usable} items — no signal`); continue }
      const rate = correct / usable
      const flag = rate > 0.40 ? '  <-- EXPLOITABLE' : rate < 0.12 ? '  <-- inverted, also a tell' : ''
      console.log(`  ${rule.name.padEnd(24)} usable ${String(usable).padStart(4)}/${items.length}  key ${(100*rate).toFixed(1)}%${flag}`)
    }
  }
  // ── Odd-one-out rules ────────────────────────────────────────────
  //
  // Different shape from the rules above. Those ask "pick the option WITH
  // property P"; these ask "pick the option that DIFFERS from the other
  // three on P" — a formatting inconsistency, not a content signal. An
  // author repairing an item found one by eye: three options ended with a
  // period and the fourth did not. Length checks cannot see it, and it
  // would have survived a green import.
  const ODD: Array<[string, (c: string) => boolean]> = [
    ['terminal period', c => /\.\s*$/.test(c)],
    ['any terminal punctuation', c => /[.!?;:,]\s*$/.test(c)],
    ['initial capital', c => /^[A-Z]/.test(c.trim())],
    ['leading article (a/an/the)', c => /^(a|an|the)\s/i.test(c.trim())],
  ]
  console.log('\n── odd-one-out (pick the option that differs from the other three) ──')
  for (const [family, section] of sections) {
    const items = await load(family, section)
    if (!items.length) continue
    const line: string[] = []
    for (const [name, hit] of ODD) {
      let usable = 0, correct = 0
      for (const it of items) {
        const flags = it.choices.map(hit)
        const yes = flags.filter(Boolean).length
        // Exactly one differs: either 1 has it and 3 don't, or 3 have it
        // and 1 doesn't. Anything else gives the strategy no target.
        if (yes !== 1 && yes !== 3) continue
        const oddValue = yes === 1
        const odd = it.choices[flags.findIndex(f => f === oddValue)]!
        usable++
        if (odd === it.key) correct++
      }
      if (usable < 20) { line.push(`${name}: n/a`); continue }
      const rate = 100 * correct / usable
      const flag = rate > 40 || rate < 12 ? ' <--' : ''
      line.push(`${name}: ${rate.toFixed(1)}% of ${usable}${flag}`)
    }
    console.log(`  ${family}/${section}`)
    for (const l of line) console.log(`    ${l}`)
  }

  console.log(`\n25% is chance. Above ~40% or below ~12% means the rule beats guessing.`)
})().catch(e => { console.error(e); process.exit(1) })
