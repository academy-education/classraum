/*
 * Choose a Response — the REGISTER tell.
 *
 * B1 (2026-08-06) had two readers crack 3 items blind, agreeing on the
 * option every time, one of them annotating "Too obvious." Reading those
 * three next to a fourth that reviewer 1 had flagged for a different
 * reason, the same shape appears in all four:
 *
 *   the key is the cooperative, forward-moving reply
 *   one distractor is written in absurd business register
 *
 *     "Kindly furnish me with a written statement of your returns policy"
 *     "Please advise on your revised arrival time in due course."
 *     "Kindly reconcile the two records at your earliest convenience."
 *
 * Nobody talks like that in the situations these items depict, so the
 * option is eliminable before the audio plays.
 *
 * This defect is LEXICAL, not semantic, which per CLAUDE.md means the
 * whole population gets checked exactly rather than sampled. The blind
 * attack ranked the batch; this says how far the tell reaches.
 *
 * The decisive statistic is NOT how many items contain a marker. It is
 *
 *     P(this option is the key | this option carries a marker)
 *
 * If that is zero across 72 items, then striking any marked option is
 * free information and the tell is real. If markers land on keys about
 * as often as chance, the wording is just flavour and this script has
 * found nothing.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

/*
 * Phrases that belong to written business correspondence and not to a
 * spoken reply between a student and a clerk, a friend, or a tutor.
 *
 * Deliberately NARROW. A wide list would catch ordinary politeness
 * ("could you", "would you mind") and inflate the rate, which is the
 * error made twice while building the SAT Math hub checker — both times
 * in the direction of condemning more of the bank. Every entry here has
 * to be one a person would not say out loud.
 */
const MARKERS = [
  /\bkindly\s+(?:furnish|reconcile|advise|confirm|forward|arrange|note|refrain)/i,
  /\bat your earliest convenience\b/i,
  /\bin due course\b/i,
  /\bplease advise\b/i,
  /\bplease be advised\b/i,
  /\bi should be grateful\b/i,
  /\bi would be grateful if you would\b/i,
  /\bthe aforementioned\b/i,
  /\bherewith\b/i,
  /\bforthwith\b/i,
  /\bfurnish me with\b/i,
  /\brevert to me\b/i,
  /\bfor my records\b/i,
]

export function marksOf(text) {
  return MARKERS.filter(re => re.test(String(text ?? ''))).map(re => String(re))
}

export function isMarked(text) {
  return marksOf(text).length > 0
}

/* ---------------------------------------------------------------- *
 * Self-test. A detector that cannot reproduce a known answer on known
 * data has no business being pointed at unknown data.
 * ---------------------------------------------------------------- */
function selftest() {
  const shouldFire = [
    'Kindly furnish me with a written statement of your returns policy for my records.',
    'Your apology is accepted. Please advise on your revised arrival time in due course.',
    'Kindly reconcile the two records in your system at your earliest convenience.',
  ]
  const shouldNOTFire = [
    // real keys from the same three items — the detector must not
    // simply be firing on "long and polite"
    'Then store credit is fine. Does it have an expiry date I should know about?',
    "Don't worry, I'll tell them we're starting late and get us both a coffee in the meantime.",
    "That's the same person — I can bring my passport so you can match the two.",
    // ordinary politeness, which is NOT the tell
    'Could you let me know when the office opens tomorrow?',
    "Would you mind checking whether it arrived? I'd really appreciate it.",
    'Thank you so much, that is very kind of you.',
    // a plain distractor with no register problem
    'Mailrooms are always behind schedule.',
  ]
  let bad = 0
  for (const s of shouldFire) if (!isMarked(s)) { console.error('SELFTEST miss:', s); bad++ }
  for (const s of shouldNOTFire) if (isMarked(s)) { console.error('SELFTEST false positive:', s, marksOf(s)); bad++ }
  if (bad) { console.error(`\nselftest FAILED (${bad}) — not running against the bank.`); process.exit(1) }
  console.log(`selftest ok — ${shouldFire.length} caught, ${shouldNOTFire.length} correctly ignored\n`)
}

async function main() {
  selftest()

  const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8').split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  /* PostgREST caps at 1000; page even when the count looks small. */
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('id,item,archived').eq('domain', 'Choose a Response').range(from, from + 999)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    rows.push(...data)
    if (data.length < 1000) break
  }
  const live = rows.filter(r => !r.archived)
  console.log(`Choose a Response: ${rows.length} rows, ${live.length} live\n`)

  let markedOptions = 0, markedKeys = 0, totalOptions = 0, totalKeys = 0
  const hits = []
  for (const r of live) {
    const choices = r.item?.choices ?? []
    const key = r.item?.correct_answer
    const marked = []
    for (const c of choices) {
      totalOptions++
      if (c === key) totalKeys++
      if (isMarked(c)) {
        markedOptions++
        if (c === key) markedKeys++
        marked.push(c)
      }
    }
    if (marked.length) hits.push({ id: r.id, marked, key })
  }

  const pct = (n, d) => d ? `${(100 * n / d).toFixed(1)}%` : 'n/a'
  console.log(`items carrying at least one marked option : ${hits.length} / ${live.length}  (${pct(hits.length, live.length)})`)
  console.log(`marked options                            : ${markedOptions} / ${totalOptions}`)
  console.log(`  ...of which are the KEY                 : ${markedKeys}`)
  console.log(`\nbase rate, any option being the key       : ${pct(totalKeys, totalOptions)}`)
  console.log(`P(key | marked)                           : ${pct(markedKeys, markedOptions)}`)
  console.log(
    markedKeys === 0
      ? `\n=> a marked option is NEVER the key across ${live.length} items.\n   Striking it is free information: ${markedOptions} distractors are pre-eliminated.`
      : `\n=> markers land on keys ${pct(markedKeys, markedOptions)} of the time vs a ${pct(totalKeys, totalOptions)} base rate.\n   Judge whether that gap is worth acting on before repairing anything.`)

  console.log('\nitems to repair:')
  for (const h of hits) {
    console.log(`\n  ${h.id.slice(0, 8)}`)
    for (const m of h.marked) console.log(`    strike: ${m}`)
    console.log(`    key   : ${h.key}`)
  }
}

if (process.argv[1]?.endsWith('check-response-register.mjs')) main().catch(e => { console.error(e); process.exit(1) })
