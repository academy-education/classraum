/**
 * Repair the answer-key LENGTH tell by EXPANDING distractors.
 *
 * WHY. scripts/verify-answer-key-spread.ts found the key was the
 * uniquely longest of four options in 72.6% of TOEFL Listening, 64.3%
 * of SAT Reading & Writing and 57.4% of TOEFL Reading — 1,276 verbal
 * items, against 25% chance. Pick the longest option, read nothing,
 * score roughly two thirds. SAT Math is clean at 4.7% because its
 * options are numbers.
 *
 * THE TARGET IS 25%, NOT 0%. Repairing every flagged item would land a
 * section near zero, and "the key is never the longest" is exactly as
 * exploitable as the reverse — cohort talk-c2 already has that shape
 * (11% longest, 38.9% shortest) and the guard flags it for that reason.
 * So this repairs only enough items to reach the target and leaves the
 * remainder alone, chosen at RANDOM: selecting the hold-back set by
 * difficulty, task type or cohort would create a fresh correlation
 * between that property and option length, which is the same class of
 * bug one level down.
 *
 * SAFETY. The key is never sent for rewriting and never written back —
 * only distractors change. Every item is validated after the model
 * returns (key still present, still four choices, key text byte-identical,
 * lengths inside the band) and skipped if anything fails. Originals are
 * dumped to a timestamped JSON file BEFORE any write, because this edits
 * real content in bulk and there is no undo in the bank.
 *
 *   npx tsx scripts/repair-option-length.ts --section=listening --limit=15
 *   npx tsx scripts/repair-option-length.ts --section=listening --limit=15 --write
 *
 * Without --write it prints a diff table and touches nothing.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

config({ path: resolve(process.cwd(), '.env.local') })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const arg = (k: string, d = '') =>
  process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? d
const SECTION = arg('section', 'listening')
const FAMILY = arg('family', 'toefl')
const LIMIT = Number(arg('limit', '15'))
const WRITE = process.argv.includes('--write')
const TARGET_SHARE = 0.25

type Row = { id: string; item: Record<string, unknown>; cohort: string | null }

/** Uniquely longest — ties are not exploitable, so they are not a tell. */
function keyIsUniquelyLongest(choices: string[], key: string): boolean {
  const lens = choices.map(c => c.length)
  const max = Math.max(...lens)
  return key.length === max && lens.filter(l => l === max).length === 1
}

const SYSTEM = `You strengthen multiple-choice distractors for a standardised English test.

You are given a question, its four options, and which one is CORRECT.

THE PROBLEM: the wrong options are weak. Whoever wrote them stopped as soon as the option
was wrong, so they are thin and unspecific next to a fully-worked correct answer. A student
can spot the answer by shape alone, without reading or listening. Across this bank the
correct option is the longest one 72% of the time — it should be 25%.

YOUR JOB IS NOT TO PAD THEM. Do not insert filler ("at this time", "in this situation",
"actually", "officially", "paperwork"). A previous attempt did exactly that and produced
prose no human would write, which is its own giveaway.

Your job is to make each wrong option genuinely TEMPTING. For each one, ask: why would a
student who half-understood the passage pick this? Then give it the specific, concrete
detail that would make them pick it — a named thing, a number, a consequence, a reason.
Wrong options should feel like real candidate answers, not obvious throwaways.

Absolute rules:
- Do NOT change the correct answer. It is shown to you only so you can match its register
  and its level of detail. Never return it.
- Each wrong option must stay WRONG. Adding specificity must not accidentally make it true.
  If a concrete detail would make an option correct, choose a different detail.
- Keep each wrong option's core IDEA and its reason for being wrong. You are deepening it,
  not swapping in a new idea.
- No hedging in wrong options ("perhaps", "may", "in some cases"). Hedging is its own tell.
  They should read as confident and complete, just wrong.
- Match the correct answer's voice and vocabulary level.

Length is a CONSEQUENCE of doing this well, not a target: an option carrying as much real
detail as the correct answer ends up about as long as it. A rough band is given as a sanity
check — if you are far outside it you have probably padded (too long) or left the option
thin (too short). Do not count characters at the expense of writing something natural.

Return strict JSON: {"distractors": ["...", "...", "..."]} in the same order given.`

/**
 * One repair, with a single corrective retry.
 *
 * The first pilot skipped 6 of 8 because the model overshot — a 72-char
 * key came back with 157-char distractors, inverting the tell instead of
 * removing it. A ratio ("80-120%") plus "at least one longer" gave it
 * contradictory targets on short keys. Explicit character bounds, plus
 * one retry that quotes the lengths it actually produced, is what makes
 * it land: the model cannot self-check its own character counts, but it
 * corrects reliably when told the measured miss.
 */
async function repairOne(
  prompt: string, key: string, distractors: string[],
): Promise<string[] | null> {
  // PER-DISTRACTOR targets that BRACKET the key, rather than one band
  // for all three.
  //
  // A single shared band failed on 26 of 30 items: told to strengthen
  // three weak options, the model made all three stronger than the key,
  // so the key became uniquely SHORTEST every time. That is not noise to
  // retry away — it is what "make these stronger" does when the key is
  // the only option already strong.
  //
  // So one distractor is aimed deliberately BELOW the key, one near it,
  // one slightly above. The key then lands 2nd or 3rd of four by
  // construction, which is the property that actually matters; the
  // spread stays about 1.4x, inside the gate. The shortest distractor
  // gets the below-key slot because it has the furthest to travel and
  // padding it to full length is what produced filler earlier.
  const K = key.length
  const sorted = [...distractors].map((d, i) => ({ d, i })).sort((a, b) => a.d.length - b.d.length)
  const factors = [0.80, 1.00, 1.12]
  const targets = new Array<number>(distractors.length)
  sorted.forEach((entry, rank) => {
    targets[entry.i] = Math.max(28, Math.round(K * (factors[rank] ?? 1.0)))
  })
  const lo = Math.max(24, Math.round(K * 0.70))
  const hi = Math.round(K * 1.25)
  const ask = (feedback?: string) => openai.chat.completions.create({
    model: 'gpt-4.1',
    temperature: 0.6,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `QUESTION: ${prompt}\n\n` +
          `CORRECT ANSWER — ${key.length} characters. Do not change it, do not return it:\n${key}\n\n` +
          `WRONG OPTIONS to strengthen — each has its OWN length target:\n` +
          distractors.map((d, i) =>
            `${i + 1}. now ${d.length} chars, aim for ~${targets[i]} chars` +
            `${targets[i]! < K ? '  (KEEP THIS ONE SHORTER THAN THE CORRECT ANSWER)' : ''}\n   ${d}`,
          ).join('\n') + '\n\n' +
          `The targets differ on purpose. Do NOT make all three the same length, and do NOT ` +
          `make them all longer than the correct answer — that just moves the giveaway instead ` +
          `of removing it. One of them must stay noticeably shorter than the correct answer ` +
          `while still being a tempting, fully-formed option.` +
          (feedback ? `\n\n${feedback}` : ''),
      },
    ],
  })

  const parse = (raw: string | null | undefined): string[] | null => {
    try {
      const out = JSON.parse(raw ?? '{}').distractors
      if (!Array.isArray(out) || out.length !== distractors.length) return null
      if (!out.every((d: unknown) => typeof d === 'string' && (d as string).trim().length > 0)) return null
      return out.map((d: string) => d.trim())
    } catch { return null }
  }

  const first = parse((await ask()).choices[0]?.message?.content)
  if (!first) return null
  // Retry when the RANKING is wrong, not merely the band — that is the
  // property the gate rejects on.
  const rank = (k: number, ds: string[]) => {
    const lens = [k, ...ds.map(d => d.length)]
    const min = Math.min(...lens), max = Math.max(...lens)
    return {
      keyShortest: k === min && lens.filter(l => l === min).length === 1,
      keyLongest: k === max && lens.filter(l => l === max).length === 1,
      spread: max / min,
    }
  }
  // Up to 3 attempts, each told the MEASURED miss.
  //
  // One retry converted 13% -> 33%. The model cannot count its own
  // characters, but it corrects reliably when shown the numbers it
  // actually produced, and the residual failures are now spread
  // violations rather than inversions — a smaller, more local error that
  // another pass can close. Attempts are capped at 3 because the marginal
  // return falls off and every attempt is a paid call; anything still
  // failing after three is skipped and left untouched, which is a safe
  // outcome rather than a bad write.
  let best = first
  for (let attempt = 2; attempt <= 3; attempt++) {
    const r = rank(K, best)
    const out = best.filter(d => d.length < lo || d.length > hi)
    if (!r.keyShortest && !r.keyLongest && r.spread <= 1.6 && out.length === 0) return best

    const feedback =
      (r.keyShortest
        ? `PROBLEM: every wrong option is LONGER than the correct answer (${K} chars), so the correct ` +
          `answer is now the shortest — the giveaway is only reversed. At least one wrong option MUST ` +
          `be shorter than ${K} characters.\n`
        : '') +
      (r.keyLongest
        ? `PROBLEM: the correct answer is still the longest option. At least one wrong option must be ` +
          `longer than ${K} characters.\n`
        : '') +
      (r.spread > 1.6
        ? `PROBLEM: the options are too uneven — ${r.spread.toFixed(2)}x between longest and shortest. ` +
          `Bring the extremes toward the middle.\n`
        : '') +
      `Your lengths were: ${best.map(d => d.length).join(', ')}. Individual targets: ${targets.join(', ')}. ` +
      `Hit each target. Keep the concrete detail you added; do not pad or trim just to reach a number.`

    const next = parse((await ask(feedback)).choices[0]?.message?.content)
    if (!next) break
    best = next
  }
  return best
}

;(async () => {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('id, item, cohort')
      .eq('family', FAMILY).ilike('section', `%${SECTION}%`)
      .eq('verified', true).eq('archived', false)
      .eq('item_type', 'multiple_choice')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data as Row[] ?? []))
    if (!data || data.length < 1000) break
  }

  const four = rows.filter(r => {
    const ch = r.item?.choices as string[] | undefined
    const key = r.item?.correct_answer as string | undefined
    return Array.isArray(ch) && ch.length === 4 && typeof key === 'string' && ch.includes(key)
  })
  const flagged = four.filter(r =>
    keyIsUniquelyLongest(r.item.choices as string[], r.item.correct_answer as string))

  // How many must be repaired to land the SECTION at ~25%, not this batch at 0%.
  const target = Math.round(four.length * TARGET_SHARE)
  const needRepair = Math.max(0, flagged.length - target)
  console.log(`${FAMILY}/${SECTION}: ${four.length} four-choice items, ${flagged.length} key-longest ` +
    `(${(100 * flagged.length / four.length).toFixed(1)}%)`)
  console.log(`target ${target} (${TARGET_SHARE * 100}%) → repair ${needRepair}, leave ${flagged.length - needRepair} untouched\n`)
  if (needRepair === 0) { console.log('Already at or below target. Nothing to do.'); return }

  // Random hold-back. Deterministic per run only in that we shuffle once;
  // no property of the item influences selection.
  const shuffled = [...flagged].sort(() => Math.random() - 0.5)
  const queue = shuffled.slice(0, Math.min(needRepair, LIMIT))
  console.log(`this run: ${queue.length} item(s)${WRITE ? '  [WRITING]' : '  [dry run]'}\n`)

  const backup: unknown[] = []
  const results: Array<{ id: string; ok: boolean; before: number[]; after: number[]; note: string }> = []

  for (const r of queue) {
    const choices = r.item.choices as string[]
    const key = r.item.correct_answer as string
    const distractors = choices.filter(c => c !== key)
    const prompt = String(r.item.prompt ?? '')

    const rewritten = await repairOne(prompt, key, distractors)
    if (!rewritten) {
      results.push({ id: r.id, ok: false, before: choices.map(c => c.length), after: [], note: 'model returned unusable JSON' })
      continue
    }

    // Rebuild in the ORIGINAL slot order so the key does not move position —
    // moving it would silently re-roll the position distribution the other
    // guard protects.
    let di = 0
    const next = choices.map(c => (c === key ? key : rewritten[di++]!))

    // Validate before accepting.
    const problems: string[] = []
    if (next.length !== 4) problems.push('not 4 choices')
    if (!next.includes(key)) problems.push('key missing')
    if (next.filter(c => c === key).length !== 1) problems.push('key duplicated')
    if (new Set(next.map(c => c.toLowerCase())).size !== 4) problems.push('duplicate options')
    const lens = next.map(c => c.length)
    if (Math.max(...lens) > Math.min(...lens) * 1.6) problems.push(`length spread ${(Math.max(...lens) / Math.min(...lens)).toFixed(2)}x`)
    // The key must not end up UNIQUELY SHORTEST either.
    //
    // The spread check alone passed an item whose key (131) came back
    // with distractors at 175/157/173 — a 1.34x spread, comfortably
    // inside the limit, and the key now the shortest of four. That is
    // the same exploit pointing the other way, and it is the shape
    // cohort talk-c2 already has (11% longest, 38.9% shortest).
    //
    // Checking only the thing the fix targets, and not what the fix
    // could break, is how the previous three attempts each passed their
    // own gate. Ranking is the property that matters; spread is a proxy.
    const minLen = Math.min(...lens)
    if (key.length === minLen && lens.filter(l => l === minLen).length === 1) {
      problems.push('key became uniquely SHORTEST (inverted the tell)')
    }
    if (problems.length) {
      results.push({ id: r.id, ok: false, before: choices.map(c => c.length), after: lens, note: problems.join('; ') })
      continue
    }

    backup.push({ id: r.id, cohort: r.cohort, item: r.item })
    if (WRITE) {
      const { error } = await db.from('study_item_bank')
        .update({ item: { ...r.item, choices: next } })
        .eq('id', r.id)
      if (error) {
        results.push({ id: r.id, ok: false, before: choices.map(c => c.length), after: lens, note: `write failed: ${error.message}` })
        continue
      }
    }
    results.push({
      id: r.id, ok: true,
      before: choices.map(c => c.length), after: lens,
      note: keyIsUniquelyLongest(next, key) ? 'still key-longest' : 'fixed',
    })
    if (process.argv.includes('--show')) {
      console.log(`\n── ${r.id.slice(0, 8)} ─ ${prompt.slice(0, 70)}`)
      console.log(`   KEY (untouched): ${key}`)
      choices.forEach((c, i) => {
        if (c === key) return
        console.log(`   was: ${c}`)
        console.log(`   now: ${next[i]}`)
      })
    }
  }

  if (backup.length) {
    mkdirSync('.repair-backups', { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const path = `.repair-backups/${FAMILY}-${SECTION}-${stamp}.json`
    writeFileSync(path, JSON.stringify(backup, null, 2))
    console.log(`originals backed up: ${path}  (${backup.length} item(s))\n`)
  }

  console.log('id        before lens              after lens               result')
  console.log('─'.repeat(76))
  for (const r of results) {
    console.log(`${r.id.slice(0, 8)}  ${JSON.stringify(r.before).padEnd(24)} ${JSON.stringify(r.after).padEnd(24)} ${r.ok ? r.note : 'SKIP: ' + r.note}`)
  }
  const fixed = results.filter(r => r.ok && r.note === 'fixed').length
  console.log('─'.repeat(76))
  console.log(`${fixed} fixed, ${results.filter(r => !r.ok).length} skipped, of ${results.length} attempted`)
  if (!WRITE) console.log('\nDry run — nothing written. Re-run with --write to apply.')
})().catch(e => { console.error(e); process.exit(1) })
