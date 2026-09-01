/**
 * verify-admission-forms.mjs — can the LIVE bank actually serve a full
 * SSAT / ISEE form?
 *
 * Exists because a unit test cannot answer this. The blueprint is
 * arithmetic over numbers I chose; whether the bank satisfies it is a
 * fact about rows in Postgres. This project has already shipped quota
 * arithmetic that no real set size could satisfy, and a draw that
 * silently came up short, both of which passed their unit tests.
 *
 * It also applies MAX_ITEMS_PER_PASSAGE, which is the constraint that
 * actually binds: 63 reading items across 17 passages is not 63 drawable
 * items, it is 41.
 *
 *   node scripts/study-bank/verify-admission-forms.mjs
 *
 * Exits 1 if any scored section cannot be filled.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(readFileSync(join(HERE, '../../.env.local'), 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Mirrored from src/lib/study/admission-tests.ts. A test pins the two
// together so this cannot drift into reporting a form we do not serve.
const MAX_PER_PASSAGE = 3
const BLUEPRINT = {
  ssat: [
    { key: 'writing', bankSection: 'writing', questions: 1 },
    { key: 'quant1',  bankSection: 'math',    questions: 25 },
    { key: 'reading', bankSection: 'reading', questions: 40 },
    { key: 'verbal',  bankSection: 'verbal',  questions: 60 },
    { key: 'quant2',  bankSection: 'math',    questions: 25 },
  ],
  isee: [
    { key: 'verbal',  bankSection: 'verbal',  questions: 40 },
    { key: 'quant',   bankSection: 'math',    questions: 37 },
    { key: 'reading', bankSection: 'reading', questions: 36 },
    { key: 'mathach', bankSection: 'math',    questions: 47 },
    { key: 'essay',   bankSection: 'writing', questions: 1 },
  ],
}

async function rowsFor(family, section) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('id,passage_group_id,item')
      .eq('family', family).eq('section', section)
      .eq('archived', false).eq('verified', true)
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break   // never trust one page
  }
  return out
}

/** Drawable under the per-passage cap: sum of min(cap, group size). */
/*
 * Types the DRAW knows. Mirrors QUESTION_TYPES in src/lib/study/assemble.ts.
 * This list exists because on 2026-09-01 this script reported SSAT
 * writing as "4 drawable, OK" while assembleAdmissionSection threw
 * "no verified items" for that section: all 12 essay rows carried a type
 * the reader did not know and a null key it rejected, so the section had
 * NEVER been servable. A checker that counts rows the assembler will
 * discard is not measuring what it claims to.
 */
const DRAWABLE_TYPES = new Set([
  'multiple_choice', 'numeric_entry', 'multi_select', 'three_choice', 'quant_comparison',
  'fill_in_blanks', 'arrange_words', 'speaking_repeat', 'speaking_interview',
  'writing_email', 'writing_discussion', 'essay', 'essay_choice',
])

/** The reader's contract, applied here so this script cannot pass an
 *  item the draw will silently skip. */
function readable(row) {
  const it = row.item
  if (!it || typeof it !== 'object') return false
  if (typeof it.prompt !== 'string' || !it.prompt) return false
  if (!DRAWABLE_TYPES.has(it.type)) return false
  if (!['easy', 'medium', 'hard'].includes(it.difficulty)) return false
  if (!Array.isArray(it.choices) || !it.choices.every(c => typeof c === 'string')) return false
  return true
}

function drawable(rows, cap) {
  const g = new Map()
  for (const r of rows) {
    const k = r.passage_group_id ?? `solo:${r.id}`
    g.set(k, (g.get(k) ?? 0) + 1)
  }
  let n = 0
  for (const sz of g.values()) n += Math.min(cap, sz)
  return { drawable: n, groups: g.size, items: rows.length }
}

let failed = false
for (const [family, sections] of Object.entries(BLUEPRINT)) {
  console.log(`\n=== ${family.toUpperCase()} ===`)
  // Two blocks can draw from the same bank section (SSAT quant1+quant2,
  // ISEE quant+mathach). They must be summed, not checked separately —
  // checking each alone would pass a bank that cannot serve both.
  const need = {}
  for (const s of sections) need[s.bankSection] = (need[s.bankSection] ?? 0) + s.questions

  for (const [section, want] of Object.entries(need)) {
    const rows = await rowsFor(family, section)
    const cap = section === 'reading' ? MAX_PER_PASSAGE : Infinity
    const unreadable = rows.length - rows.filter(readable).length
    const d = drawable(rows.filter(readable), cap)
    const ok = d.drawable >= want
    const margin = d.drawable - want
    const capNote = section === 'reading' ? ` (${d.items} items in ${d.groups} passages, cap ${MAX_PER_PASSAGE}/passage)` : ''
    console.log(`  ${section.padEnd(8)} need ${String(want).padStart(3)}  drawable ${String(d.drawable).padStart(3)}  ${ok ? 'OK' : 'SHORT'}  margin ${margin >= 0 ? '+' : ''}${margin}${capNote}${unreadable ? `  [${unreadable} row(s) the DRAW would skip — not counted]` : ''}`)
    if (!ok) failed = true
    else if (margin < want * 0.25) {
      console.log(`           ^ thin: under 25% spare, so two students see nearly the same section`)
    }
  }
}

console.log(failed
  ? '\nFAIL — at least one section cannot be filled from the live bank.'
  : '\nEvery delivered section can be filled. Margins above say how repeatable a form is.')
process.exit(failed ? 1 : 0)
