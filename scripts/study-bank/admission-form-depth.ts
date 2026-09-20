/**
 * admission-form-depth.ts — how many SSAT/ISEE tests can a student sit
 * before the questions start repeating?
 *
 * READ ONLY. Never writes to the bank or to study_item_exposures.
 *
 *   npx tsx scripts/study-bank/admission-form-depth.ts [--selftest]
 *
 * ── Why form-capacity.mjs is not the answer ──────────────────────────
 * That script reports SSAT as 4 / 3 / 3 forms and labels each line
 *
 *     [single domain — no split to infer, this number is exact]
 *
 * "Exact" is true of the DIVISION and false of the CLAIM. items/form-size
 * is the capacity only if every item is independently drawable, and in
 * this family it is not:
 *
 *   - Reading is drawn BY PASSAGE at ITEMS_PER_PASSAGE (6). A form takes
 *     ceil(40/6) = 7 passages and fills them evenly; a passage holding
 *     two items cannot supply six, so item count overstates supply.
 *   - Verbal and Math take AT MOST ONE ITEM PER GROUP per form, because
 *     SSAT verbal is banked in bijective sets sharing one option pool —
 *     two of a set on one form lets a candidate deduce the rest by
 *     elimination. 180 verbal items sit in 136 groups, so a form can
 *     never draw more than 136 of them and successive forms can take at
 *     most one more from each set each time.
 *
 * Neither constraint is a domain split, so neither is visible to a tool
 * that reasons about domains. This script does not reason at all: it
 * imports the REAL `drawByPassage` the assembler uses, replays the real
 * unseen-first ranking against the real bank, and counts.
 *
 * ── What it reports ──────────────────────────────────────────────────
 * Per section, form by form: how many of the delivered items the student
 * has never seen. The answer to "how many tests do I have" is the number
 * of forms that are 100% unseen — after that the student is re-reading
 * questions they have already answered, which is what "running out"
 * feels like from the student's seat. Nothing errors and nothing is
 * short: `drawByPassage` tops up from whatever remains, so a depleted
 * bank degrades into repeats SILENTLY. That is the defect.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import {
  ADMISSION_BLUEPRINT, drawByPassage, ITEMS_PER_PASSAGE, type AdmissionFamily,
} from '../../src/lib/study/admission-tests'

type Row = { id: string; passageGroupId: string | null }

/* A faithful copy of assemble.ts's private `unseenFirst`: unseen first
 * (stable, seeded), then already-seen oldest-first. Copied rather than
 * exported-and-imported so that changing the assembler does not silently
 * change this measurement's meaning — if they diverge, this file is
 * wrong and should be fixed deliberately. */
function unseenFirst(rows: Row[], seen: Map<string, number>): Row[] {
  const unseen = rows.filter(r => !seen.has(r.id))
  const already = rows.filter(r => seen.has(r.id))
    .sort((a, b) => seen.get(a.id)! - seen.get(b.id)!)
  return [...unseen, ...already]
}

/** Replay N forms for one section. Returns per-form unseen counts. */
export function replay(rows: Row[], questions: number, perPassage: number, forms: number) {
  const seen = new Map<string, number>()
  const out: { form: number; delivered: number; fresh: number; repeats: number }[] = []
  for (let f = 1; f <= forms; f++) {
    /* The same predicate assembleAdmissionSection passes. Set
     * NO_FRESH=1 to drop it and reproduce the pre-2026-09-21 behaviour —
     * that is the break-test for this whole measurement: if the numbers
     * do not get worse without it, the fix is not what moved them. */
    const picked = process.env.NO_FRESH === '1'
      ? drawByPassage(unseenFirst(rows, seen), questions, perPassage)
      : drawByPassage(unseenFirst(rows, seen), questions, perPassage, r => !seen.has(r.id))
    const fresh = picked.filter(r => !seen.has(r.id)).length
    for (const r of picked) seen.set(r.id, f)
    out.push({ form: f, delivered: picked.length, fresh, repeats: picked.length - fresh })
  }
  return out
}

if (process.argv.includes('--selftest')) {
  /* Known answers, checked before this is pointed at the real bank.
   * SSAT Math is 214 ungrouped items at 50 a form, so it must give
   * exactly 4 clean forms and a 5th that is mostly repeats — the one
   * number form-capacity.mjs and this script MUST agree on, because
   * with no groups the two models are the same model. */
  const solo = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, passageGroupId: null }))
  const a = replay(solo(214), 50, 1, 5)
  const cleanA = a.filter(r => r.fresh === r.delivered).length
  console.log(`ok? ungrouped 214 @50 -> ${cleanA} clean forms (expect 4)`, cleanA === 4 ? 'ok' : 'FAIL')
  /*
   * THE ONE-PER-GROUP RULE IS CONDITIONAL, and this case is why the
   * assertion is here rather than in prose.
   *
   * assemble.ts says "EVERYTHING ELSE TAKES AT MOST ONE ITEM PER GROUP",
   * flatly. `drawByPassage(rows, count, 1)` honours that only while
   * groups >= count. Below it, `wanted` clamps to the group count and the
   * even-distribution step hands `base + 1` items to the first `count %
   * wanted` groups — 36 sets asked for 60 items return 24 sets of two.
   * The function prefers a full-length section over the invariant, which
   * is defensible (a short form is a different denominator) but it is NOT
   * what the comment claims, and for bijective verbal sets two items from
   * one set is exactly the elimination leak the rule exists to stop.
   *
   * Asserted as the ACTUAL behaviour, with the live margin checked
   * separately below: no admission section is in this zone today.
   */
  const sets: Row[] = []
  for (let g = 0; g < 36; g++) for (let i = 0; i < 5; i++) sets.push({ id: `g${g}i${i}`, passageGroupId: `g${g}` })
  const b = replay(sets, 60, 1, 1)
  const doubled = b[0].delivered === 60 && b[0].fresh === 60
  console.log(`ok? 36 sets of 5 @60 -> delivered ${b[0].delivered}, and the one-per-group rule is BROKEN here`, doubled ? 'ok (documents the conditional)' : 'FAIL')
  const bad = (cleanA !== 4 ? 1 : 0) + (doubled ? 0 : 1)
  console.log(bad ? `\n${bad} self-test failure(s)` : '\nself-test clean')
  process.exit(bad ? 1 : 0)
}

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const FORMS = 6
async function main() {
for (const family of ['ssat', 'isee'] as AdmissionFamily[]) {
  console.log(`\n${family.toUpperCase()} — a student's first ${FORMS} tests, section by section`)
  console.log('  section      items  groups   ' + Array.from({ length: FORMS }, (_, i) => `form${i + 1}`).join('  ') + '   CLEAN')
  console.log('  ' + '-'.repeat(86))
  let clean = Infinity
  for (const block of ADMISSION_BLUEPRINT[family]) {
    if (!block.bankSection) continue
    const rows: Row[] = []
    for (let f = 0; ; f += 1000) {
      const { data, error } = await db.from('study_item_bank').select('id,passage_group_id')
        .eq('family', family).eq('section', block.bankSection)
        .eq('verified', true).eq('archived', false)
        .order('id', { ascending: true }).range(f, f + 999)
      if (error) throw new Error(error.message)
      rows.push(...data.map(r => ({ id: r.id as string, passageGroupId: r.passage_group_id as string | null })))
      if (data.length < 1000) break
    }
    if (!rows.length) { console.log(`  ${block.key.padEnd(12)} REFUSING: zero verified items`); continue }
    const groups = new Set(rows.map(r => r.passageGroupId ?? `__solo__${r.id}`)).size
    const perPassage = block.bankSection === 'reading' ? ITEMS_PER_PASSAGE[family] : 1
    const res = replay(rows, block.questions, perPassage, FORMS)
    const cleanHere = res.findIndex(r => r.fresh < r.delivered)
    const c = cleanHere === -1 ? FORMS : cleanHere
    clean = Math.min(clean, c)
    const cells = res.map(r => (r.fresh === r.delivered ? `${r.fresh}/${r.delivered}` : `${r.fresh}/${r.delivered}*`).padStart(7)).join('')
    console.log(`  ${block.key.padEnd(12)}${String(rows.length).padStart(5)}${String(groups).padStart(8)}   ${cells}   ${c}`)
  }
  console.log(`  => a student gets ${clean} complete test(s) with no repeated question. * = the form contains questions they have already answered.`)
}
console.log('')
}
main().catch(e => { console.error(e); process.exit(1) })
