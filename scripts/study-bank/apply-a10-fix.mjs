#!/usr/bin/env node
/**
 * A10 — the items that cannot be graded correctly.
 *
 * An EXPLICIT TABLE, not a rule. A "duplicated letter across the join"
 * heuristic flags 27 blanks in this cohort and most of them are real
 * words: commissioned, Renaissance, pollution, matter, planning,
 * organelles, dilemmas. Only the blanks that spell a NON-word are
 * defects, which is exactly why the gate that found these required two
 * conditions rather than one. Repairing from the single-condition rule
 * would corrupt a dozen sound items.
 *
 * usage: node apply-a10-fix.mjs [--dry]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const DRY = process.argv.includes('--dry')
const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

/*
 * Each entry names the blank, what it currently spells, and the word it
 * must spell. `side` says which side of the placeholder carries the
 * redundant letters. The repair is then computed and CHECKED against
 * `word` — if it does not land exactly, the run aborts.
 */
const CTW = [
  { id: '1866b0f1', blank: 10, was: 'futuure',       word: 'future',       side: 'prefix' },
  { id: '1a8f1f4c', blank: 4,  was: 'dioxxide',      word: 'dioxide',      side: 'prefix' },
  { id: '31e0a066', blank: 5,  was: 'immediiate',    word: 'immediate',    side: 'prefix' },
  { id: '3b2a5722', blank: 4,  was: 'cyccle',        word: 'cycle',        side: 'prefix' },
  { id: '442088c8', blank: 10, was: 'impaacts',      word: 'impacts',      side: 'prefix' },
  { id: '7cf35d9c', blank: 5,  was: 'acttion',       word: 'action',       side: 'prefix' },
  { id: 'd9cf54b8', blank: 7,  was: 'framewwork',    word: 'framework',    side: 'prefix' },
  /*
   * a1d20b7c: the gate suggested RETIRING this one, 4 of its 10 blanks
   * being broken. Departing from that recommendation deliberately —
   * every one is the same deterministic defect (redundant letters AFTER
   * the placeholder) and each repair is verified against the intended
   * word below. Retiring would cost a whole item out of 93 to avoid
   * four character deletions that the script proves correct.
   */
  { id: 'a1d20b7c', blank: 3,  was: 'momentss',      word: 'moments',      side: 'suffix' },
  { id: 'a1d20b7c', blank: 4,  was: 'compositionss', word: 'compositions', side: 'suffix' },
  { id: 'a1d20b7c', blank: 6,  was: 'traditionalal', word: 'traditional',  side: 'suffix' },
  { id: 'a1d20b7c', blank: 10, was: 'generationss',  word: 'generations',  side: 'suffix' },
]
const BAS_ID = 'ca3d0a1c'

const rows = []
for (let f = 0; ; f += 1000) {
  const { data } = await db.from('study_item_bank')
    .select('id, item, verify_meta, archived').order('id').range(f, f + 999)
  if (!data?.length) break
  rows.push(...data)
  if (data.length < 1000) break
}
const find = p => rows.find(r => r.id.startsWith(p))

const problems = []
const plan = new Map()

for (const f of CTW) {
  const row = find(f.id)
  if (!row) { problems.push(`${f.id}: not found`); continue }
  // Accumulate across blanks of the same item.
  const cur = plan.get(row.id)?.passage ?? String(row.item.passage ?? '')
  const b = (row.item.blanks ?? []).find(x => x.id === f.blank)
  if (!b) { problems.push(`${f.id} b${f.blank}: no such blank`); continue }

  const re = new RegExp(`([A-Za-z]*)\\[${f.blank}\\]([A-Za-z]*)`)
  const m = re.exec(cur)
  if (!m) { problems.push(`${f.id} b${f.blank}: placeholder not found in passage`); continue }
  const [full, pre, suf] = m
  const ans = String(b.answer)

  // Refuse if the bank no longer matches what the audit saw.
  if (pre + ans + suf !== f.was) {
    problems.push(`${f.id} b${f.blank}: spells "${pre + ans + suf}", audit said "${f.was}" — bank changed since`)
    continue
  }

  const excess = pre.length + ans.length + suf.length - f.word.length
  const nextPre = f.side === 'prefix' ? pre.slice(0, pre.length - excess) : pre
  const nextSuf = f.side === 'suffix' ? suf.slice(excess) : suf

  const spelled = nextPre + ans + nextSuf
  if (spelled !== f.word) {
    problems.push(`${f.id} b${f.blank}: repair spells "${spelled}", not "${f.word}"`)
    continue
  }

  const next = cur.replace(full, `${nextPre}[${f.blank}]${nextSuf}`)
  plan.set(row.id, {
    row, passage: next,
    notes: [...(plan.get(row.id)?.notes ?? []), `b${f.blank} ${f.was} to ${f.word}`],
  })
}

/*
 * The Build a Sentence key carries a full stop that no chip provides.
 * Grading folds only case and whitespace, so no ordering can match it.
 */
{
  const row = find(BAS_ID)
  if (!row) problems.push(`${BAS_ID}: not found`)
  else {
    const key = String(row.item.correct_answer)
    const chips = (row.item.choices ?? []).map(c => String(c).trim())
    const stripped = key.replace(/[.!?]\s*$/, '')
    if (key === stripped) {
      problems.push(`${BAS_ID}: key has no trailing stop — already repaired?`)
    } else {
      /*
       * The repaired key must be exactly the chips, in some order.
       * Case-INSENSITIVE, matching gradeAnswer's `norm`, which folds
       * case and whitespace: the key capitalises "Students" where the
       * chip reads "students", and that already grades equal. The
       * trailing stop is the only thing `norm` does not forgive.
       */
      const fold = t => t.trim().toLowerCase()
      const segs = stripped.split('|').map(fold).sort()
      const pool = chips.map(fold).sort()
      if (JSON.stringify(segs) !== JSON.stringify(pool)) {
        problems.push(`${BAS_ID}: repaired key is not a permutation of the chips`)
      } else {
        plan.set(row.id, { row, key: stripped, notes: ['trailing full stop removed from key'] })
      }
    }
  }
}

if (problems.length) {
  console.error(`ABORTED — ${problems.length} problem(s), nothing written:`)
  problems.forEach(p => console.error('  ' + p))
  process.exit(1)
}

console.log(`validated: ${plan.size} items`)
for (const [, p] of plan) console.log(`  ${p.row.id.slice(0, 8)}  ${p.notes.join('; ')}`)
if (DRY) { console.log('\nDRY RUN — nothing written'); process.exit(0) }

let ok = 0
for (const [id, p] of plan) {
  const meta = p.row.verify_meta ?? {}
  const item = {
    ...p.row.item,
    ...(p.passage ? { passage: p.passage } : {}),
    ...(p.key ? { correct_answer: p.key } : {}),
  }
  const { error } = await db.from('study_item_bank').update({
    item,
    verify_meta: {
      ...meta,
      ...('legacy_item_a10' in meta ? {} : { legacy_item_a10: p.row.item }),
      a10_fixed_at: new Date().toISOString(),
      a10_notes: p.notes,
    },
  }).eq('id', id)
  if (error) { console.error('ERR ' + id + ': ' + error.message); process.exit(1) }
  ok++
}
console.log(`\nupdated ${ok}`)
