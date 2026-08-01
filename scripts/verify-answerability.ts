/**
 * READ-ONLY DIAGNOSTIC — measures ONE specific tell: whether "absolute"
 * wording is asymmetrically loaded into distractors.
 *
 * READ THIS BEFORE TRUSTING ITS OUTPUT. This script CANNOT certify that a
 * bank is answerable only with its source, and a clean report here is NOT
 * evidence the items are sound. That claim needs the blind-solver attack.
 *
 * The history matters. On 2026-08-01 three independent blind solvers, shown
 * ONLY the four options, scored 92.7-100% on every verbal task type in this
 * bank against 28-40% fixed-letter controls. The first version of THIS
 * script tried to reproduce that mechanically — eliminate options containing
 * an absolute, prefer a hedge among the survivors, break ties on length —
 * and scored 27-33%, barely above chance. It printed PASS on toefl/reading,
 * a section the solvers had just scored 99.2% on.
 *
 * That is the exact shape of a check that would never have gone red, so the
 * pass/fail verdict was removed rather than tuned. The lesson generalises:
 * the tell is SEMANTIC. It lives in "which option actually addresses the
 * question", and two regexes cannot see it. No mechanical script can replace
 * the attack; scripts can only measure named, countable sub-symptoms.
 *
 * What this DOES measure, and measures honestly: given that some option in
 * an item carries an absolute (all/always/never/only/solely/must/...), how
 * much more often than chance does the KEY avoid being that option? If
 * absolutes were sprinkled without regard to correctness, the key would
 * avoid them at exactly the base rate. Any excess is authoring bias a
 * candidate can exploit as an elimination rule — without understanding the
 * item at all.
 *
 * Related: verify-option-tells.ts tests each surface rule in isolation and
 * only counts items where EXACTLY ONE option has the property. That discards
 * the items where the tell is strongest (three absolute-bearing distractors
 * is the easiest item in the bank) and never tests rules in conjunction.
 * Both scripts are partial. Neither substitutes for the attack.
 *
 *   npx tsx scripts/verify-answerability.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local'), quiet: true })
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Kept byte-identical to verify-option-tells.ts so the two cannot drift apart
// and disagree about what an "absolute" is.
const ABSOLUTE = /\b(all|every|always|never|none|no one|only|entirely|completely|impossible|must|cannot|solely|exclusively|totally|invariably)\b/i

type Item = { key: string; choices: string[] }

async function load(family: string, section: string): Promise<Item[]> {
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank').select('item')
      .eq('family', family).eq('section', section)
      .eq('archived', false).eq('item_type', 'multiple_choice')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? [])); if (!data || data.length < 1000) break
  }
  return rows
    .map(r => ({ key: r.item?.correct_answer, choices: r.item?.choices }))
    .filter(x => Array.isArray(x.choices) && x.choices.length === 4 && typeof x.key === 'string') as Item[]
}

const SECTIONS: Array<[string, string]> = [
  ['toefl', 'listening'], ['toefl', 'reading'],
  ['sat', 'reading_writing'], ['sat', 'math'],
]

;(async () => {
  console.log('Absolute-wording asymmetry. Excess over chance = elimination power\n' +
              'a candidate gets for free, without reading the source.\n')

  for (const [family, section] of SECTIONS) {
    const items = await load(family, section)
    if (!items.length) continue

    const withAbs = items.filter(it => it.choices.some(c => ABSOLUTE.test(c)))
    if (withAbs.length < 20) {
      console.log(`${family}/${section}`.padEnd(24) +
        `only ${withAbs.length}/${items.length} items carry an absolute — not measurable here`)
      continue
    }

    // Under random assignment the key is just one of the four options, so it
    // lands on an absolute-bearing option at (absolutes / 4). Anything the
    // key avoids beyond that is authoring bias, not chance.
    const totalAbs = withAbs.reduce((s, it) => s + it.choices.filter(c => ABSOLUTE.test(c)).length, 0)
    const avgAbs = totalAbs / withAbs.length
    const expectedAvoid = 1 - avgAbs / 4
    const observedAvoid = withAbs.filter(it => !ABSOLUTE.test(it.key)).length / withAbs.length
    const excess = 100 * (observedAvoid - expectedAvoid)

    console.log(`${family}/${section}   n=${items.length}`)
    console.log(`  items containing an absolute : ${withAbs.length} (${(100 * withAbs.length / items.length).toFixed(1)}%)`)
    console.log(`  absolutes per such item      : ${avgAbs.toFixed(2)} of 4`)
    console.log(`  key avoids it — expected     : ${(100 * expectedAvoid).toFixed(1)}%`)
    console.log(`  key avoids it — OBSERVED     : ${(100 * observedAvoid).toFixed(1)}%`)
    console.log(`  EXCESS OVER CHANCE           : ${excess >= 0 ? '+' : ''}${excess.toFixed(1)}pts` +
      (excess > 12 ? '   <-- distractors are marked by absolutes' : ''))
    console.log()
  }

  console.log(`A large excess means "never pick the option containing an absolute" is a
free elimination rule. It does not tell you whether the REMAINING choice is
guessable — that was 92.7-100% for these banks and this script measured 33%.

Do not use this as a gate. Use it to confirm a repair actually moved this
number, then run the blind-solver attack to find out whether the item is
answerable without its source.`)
})().catch(e => { console.error(e); process.exit(1) })
