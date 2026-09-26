/* THE GENERAL VERSION OF THE ESSAY BUG: is any LIVE item type missing a render
 * branch in the runner? `essay` and `essay_choice` were drawable, reachable and
 * unanswerable for months because the answer area is one ternary chain on
 * q.type with a multiple-choice fallback, and a type that matches nothing falls
 * into `q.choices.map(...)` over an empty array. Decidable, so check every type
 * in the live bank against the chain rather than waiting for the next report. */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const rows = []
for (let f=0;;f+=1000){ const {data,error}=await db.from('study_item_bank')
  .select('family,section,item_type,item,verified,archived').range(f,f+999)
  if(error) throw new Error(error.message); rows.push(...data); if(data.length<1000) break }
const live = rows.filter(r=>r.verified && !r.archived)
if (!live.length) { console.error('REFUSING: zero live rows'); process.exit(2) }

/* WHY THIS LIST IS TYPED OUT BY HAND, AND WHAT THAT COSTS.
 *
 * Three attempts were made to read the branch set out of TestSession.tsx and
 * all three were wrong in a way the break-test caught:
 *   1. `q.type === 'x'` anywhere in the file — PASSED its own break-test,
 *      because deleting a branch condition left the type mentioned inside the
 *      branch body (placeholder and label ternaries).
 *   2. lines containing `) : (` — missed a condition that wraps onto a second
 *      line, so the RESTORED fix still reported UNANSWERABLE.
 *   3. text between `) : (` and `) ? (` — missed the branches written without
 *      parentheses, `) : q.type === 'multi_select' ? (`.
 *
 * A regex is not a TSX parser and pretending otherwise produced a checker that
 * read as authoritative and was wrong three different ways. So the branch list
 * is maintained here by hand, and the honest limit is stated: THIS SCRIPT
 * CANNOT TELL YOU THE LIST IS STILL TRUE. It answers one question exactly —
 * which live item types would render no input GIVEN this list — and the list
 * must be updated by whoever adds or removes a branch.
 *
 * THE CHECK THAT IS REAL EVIDENCE NOW EXISTS:
 *   src/app/mobile/study/session/[id]/__tests__/TestSession.answer-input.test.tsx
 * mounts the real TestSession with one item of each type below and asserts an
 * answer control renders. It was break-tested by removing `essay` and
 * `essay_choice` from the branch condition: exactly those two cases fail.
 * This script's list is therefore a convenience for the DB half; when a type is
 * added to the bank, add it to the rendering test FIRST — that one cannot be
 * satisfied by editing a list.
 */
const BRANCHED = new Set([
  'numeric_entry', 'multi_select', 'fill_in_blanks', 'arrange_words',
  'speaking_repeat', 'speaking_interview',
  'writing_email', 'writing_discussion',
  'essay', 'essay_choice',          // added 2026-09-25
])
const branched = BRANCHED
const union = readFileSync('src/app/mobile/study/session/[id]/test/types.ts','utf8')
// The fallback renders a choice list, so a type is SAFE without a branch only
// if its rows actually carry choices.
const byType = {}
for (const r of live) {
  const t = r.item?.type ?? r.item_type ?? 'null'
  const b = byType[t] ??= { n:0, withChoices:0, families:new Set() }
  b.n++; b.families.add(r.family)
  if (Array.isArray(r.item?.choices) && r.item.choices.length) b.withChoices++
}
console.log(`live items ${live.length}; ${Object.keys(byType).length} distinct types`)
console.log(`branches found in TestSession: ${[...branched].sort().join(', ')}\n`)
console.log(`${'type'.padEnd(22)} ${'live'.padStart(6)} ${'w/choices'.padStart(10)}  branch?  verdict`)
let bad = 0
for (const [t,b] of Object.entries(byType).sort((x,y)=>y[1].n-x[1].n)) {
  const hasBranch = branched.has(t)
  const inUnion = union.includes(`'${t}'`)
  const allHaveChoices = b.withChoices === b.n
  const ok = hasBranch || allHaveChoices
  if (!ok) bad++
  console.log(`${t.padEnd(22)} ${String(b.n).padStart(6)} ${String(b.withChoices).padStart(10)}  ${hasBranch?'yes':'NO '}      ${
    ok ? (hasBranch ? 'own branch' : 'falls back to the choice list, and has choices')
       : 'UNANSWERABLE — no branch and no choices'}${inUnion?'':'   [not in the client type union]'}`)
}
console.log(bad ? `\n${bad} type(s) render no answer input.` : `\nEvery live type either has a branch or has choices for the fallback.`)
process.exit(bad ? 1 : 0)
