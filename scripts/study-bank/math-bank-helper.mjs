#!/usr/bin/env node
/**
 * study-bank/math-bank-helper.mjs — Claude-only SAT MATH bank pipeline.
 *
 * Math differs from R&W in one decisive way: the answer is COMPUTABLE, so
 * the correctness gate is a deterministic SANDBOX that recomputes each key
 * from the problem's givens — strictly stronger than any LLM vote. (The LLM
 * harness has a measured ~18% false-negative rate on hard math, so a blind
 * vote must NOT gate math; it is used only for difficulty + a soft
 * cross-check.) No OpenAI, no Anthropic API — Supabase DB write only.
 *
 *   verify <batch.json>            run each item's `solve` snippet in a
 *                                  sandbox and check it equals the keyed
 *                                  answer; report mismatches (mis-keys).
 *   blind  <batch.json>            print an answer-blind rendering for the
 *                                  difficulty grader / cross-check subagent.
 *   insert <batch.json> <qc.json>  re-run the sandbox gate, then insert
 *                                  items that recompute correctly AND grade
 *                                  hard/medium. DB write only.
 *
 * batch.json: [{ id, domain, subskill, difficulty, prompt, choices[4],
 *   correct_answer, explanation, solve }]  where `solve` is a JS function
 *   BODY that recomputes the answer independently and returns it (number or
 *   string). It must derive the answer from the problem's numbers, not just
 *   echo correct_answer.
 * qc.json: { "<id>": { difficulty, blind_letter? } }
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { gateBatch, overrideReason } from './gate.mjs'

const LETTERS = ['A', 'B', 'C', 'D', 'E']
const normHash = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const hashOf = ({ prompt, choices }) => createHash('md5').update(
  [normHash(prompt), (choices || []).map(normHash).join('|')].join('~~'),
).digest('hex')

/*
 * INSERT-TIME SHUFFLE: DELETED 2026-08-09, deliberately not wired.
 *
 * A `shuffleInPlace` lived here, was never called, and its own comment
 * plus the adjacent REJECT message both claimed it ran. Two options were
 * on the table — wire it, or remove it. Removed, on evidence:
 *
 *   1. Choice order is randomised at DRAW time, seeded per session, on
 *      every path that serves an item (shuffleDrawnChoices, assemble.ts
 *      496/926/1344/1438). A student never sees stored order, so an
 *      insert-time shuffle changes nothing they experience.
 *   2. Wiring it would COST QC coverage. Migration 078's self-test pins
 *      that content_sha changes on a reshuffle, and attack measurements
 *      are bound to content_sha (077). Reordering at insert would
 *      invalidate measurements to buy a property the draw already
 *      guarantees.
 *   3. Measured before deciding: SAT v2 key position is 30/27/23/20 over
 *      1,571 items — nowhere near the 45% gate. Authors complied by hand,
 *      so nothing is being papered over.
 *
 * assemble.ts already argues the general case: enforcing this at N write
 * sites and zero read sites means any future writer reintroduces the
 * defect silently. The draw is the read site. This is that decision,
 * recorded rather than left as dead code.
 */

function loadEnv() {
  const raw = readFileSync(process.cwd() + '/.env.local', 'utf8')
  return Object.fromEntries(raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}

// Parse a numeric answer form: integer, decimal, or "a/b" fraction. Returns
// a Number, or null if the value is not purely numeric (then compare as text).
function asNumber(s) {
  const t = String(s).trim().replace(/\s+/g, '')
  if (/^-?\d+\/-?\d+$/.test(t)) { const [a, b] = t.split('/').map(Number); return b === 0 ? null : a / b }
  if (/^-?\d*\.?\d+$/.test(t)) return Number(t)
  return null
}
/*
 * Answer comparison for NON-numeric keys.
 *
 * This used to fall back to normHash, which strips every non-alphanumeric
 * character — INCLUDING THE MINUS SIGN. So for any key that is not a plain
 * number or simple fraction, a sign error passed the sandbox silently:
 * "-20i" matched "20i", "x = -4" matched "x = 4", and
 * "-1/(x^2 + 3x)" matched "1/(x^2 + 3x)" — the exact option shape of the
 * Advanced Math batch. Math has no blind attack; this sandbox IS the gate,
 * so a comparison that cannot see a sign is a gate that cannot fail on one.
 *
 * normHash itself is NOT changed: it also produces content_hash, and
 * touching it would rewrite every dedup hash in the bank.
 */
/*
 * Normalise an answer for comparison.
 *
 * THE UNICODE MINUS MUST BE FOLDED TO ASCII **BEFORE** THE STRIP, and that
 * ordering is the whole bug. The strip keeps `-` but not U+2212 MINUS SIGN,
 * so without this fold U+2212 was simply deleted, and that failed in BOTH
 * directions at once:
 *
 *     '\u22125' vs '5'    sign flip      -> compared EQUAL   (false pass)
 *     '\u22125' vs '-5'   same value     -> compared UNEQUAL (false fail)
 *
 * The first is the dangerous one: the sandbox is the real gate for maths,
 * and it would have certified an item whose key had the wrong sign. This is
 * the second time this function has been sign-blind — it was fixed once for
 * the ASCII case, and the Unicode case survived that fix because the probe
 * only used ASCII. 12 live choices across 11 items carry U+2212, one of
 * them a key.
 *
 * Only true minus signs are folded. En and em dashes are punctuation and
 * are left to the strip, since they appear in prose options.
 */
const normAnswer = s => (s || '').toLowerCase()
  .replace(/[\u2212\u2796]/g, '-')        // Unicode minus -> ASCII, BEFORE the strip
  .replace(/[^a-z0-9+\-/^.]+/g, ' ')      // keep sign, slash, caret, point
  .replace(/\s+/g, ' ').trim()
function answersMatch(computed, key) {
  const a = asNumber(computed), b = asNumber(key)
  if (a !== null && b !== null) return Math.abs(a - b) < 1e-6
  return normAnswer(computed) === normAnswer(key)
}

// Run one item's solve snippet in-process. It's Claude-authored code we
// control, executed only in this local tooling run.
function sandbox(item) {
  try {
    const fn = new Function('"use strict";' + item.solve)
    const out = String(fn())
    return { ok: answersMatch(out, item.correct_answer), computed: out }
  } catch (e) {
    return { ok: false, computed: 'ERROR: ' + String(e).slice(0, 80) }
  }
}

// SAT items carry 4 options; SSAT and ISEE items carry 5. This was pinned at
// exactly 4 until 2026-09-01, which meant `verify` reported SHAPE on every
// 5-option batch and printed "0/48 recompute to their key" — the sandbox never
// ran on a single SSAT or ISEE math item. A gate that cannot pass is not a gate.
function shapeOk(raw) {
  const n = Array.isArray(raw.choices) ? raw.choices.length : 0
  return raw.prompt && (n === 4 || n === 5)
    && raw.choices.includes(raw.correct_answer)
    && new Set(raw.choices.map(c => String(c).trim())).size === n
    && typeof raw.solve === 'string'
}

/*
 * DIFFICULTY IS THE GRADER'S, NOT THE AUTHOR'S — fixed 2026-09-04.
 *
 * This helper banked `raw.difficulty`, the label the AUTHOR gave the item,
 * while using the grader's label only to gate ("easy is out") and to fill
 * `verify_meta.grader_difficulty`. The R&W helper has always banked the
 * grader's. So an item the author called hard and a grader called medium
 * was rejected only if the grader said EASY, and otherwise entered the bank
 * carrying the author's optimistic label.
 *
 * That is not cosmetic: the module-2 hard route draws on this column. On
 * the five batches landed on 2026-09-04 it would have banked 47 items as
 * hard that the with-source grader had called medium — a hard band inflated
 * by the very self-assessment the grader exists to check. The gate did its
 * work and the result was thrown away at the write.
 *
 * `content_hash` is over prompt+choices, so this changes no hash.
 */
const difficultyOf = (raw, q) => (q && q.difficulty) || raw.difficulty

function toItem(raw, difficulty) {
  return {
    passage: null, passageGroupId: null, prompt: raw.prompt, type: 'multiple_choice',
    choices: raw.choices, correct_answer: raw.correct_answer, correct_answers: null,
    acceptable_answers: null, difficulty, explanation: raw.explanation || '',
    distractor_rationales: raw.choices.filter(c => c !== raw.correct_answer).map(c => ({
      choice: c,
      reason: (raw.distractor_steps || []).find(d => d.choice === c)?.mis_step || '',
    })),
    blanks: null,
    graphic: raw.svg ? { type: 'rawsvg', svg: raw.svg, caption: raw.caption || null } : (raw.graphic || null),
    domain: raw.domain, subskill: raw.subskill,
    topic_tag: raw.topic_tag || null, word_count: null,
  }
}

function renderBlind(batch) {
  const out = []
  for (const it of batch) {
    out.push(`### Item ${it.id}  (${it.domain} / ${it.subskill})`)
    out.push(`Question: ${it.prompt}`)
    it.choices.forEach((c, i) => out.push(`  (${LETTERS[i]}) ${c}`))
    out.push('')
  }
  return out.join('\n')
}

async function main() {
  const [cmd, batchPath, qcPath] = process.argv.slice(2)
  const batch = batchPath ? JSON.parse(readFileSync(batchPath, 'utf8')) : []

  if (cmd === 'blind') { process.stdout.write(renderBlind(batch)); return }

  if (cmd === 'verify') {
    let pass = 0
    for (const raw of batch) {
      if (!shapeOk(raw)) { console.log(`SHAPE  id${raw.id} — need 4 or 5 distinct choices incl. key + a solve string`); continue }
      const r = sandbox(raw)
      if (r.ok) { pass++; console.log(`OK     id${raw.id} [${raw.domain}] key=${raw.correct_answer}  ✓computed ${r.computed}`) }
      else console.log(`FAIL   id${raw.id} [${raw.domain}] key=${raw.correct_answer}  ✗computed ${r.computed}`)
    }
    console.log(`\nSandbox: ${pass}/${batch.length} recompute to their key.`)
    // The sandbox proves the key is RIGHT. It says nothing about whether the
    // key is GUESSABLE from the options with the stem covered — a separate
    // defect that held a 24-item Advanced Math batch on 2026-09-04 while all
    // 24 of its keys recomputed correctly. Run the hub checks here rather
    // than leaving them to an author's memory.
    /*
     * THE CONTROL IS DERIVED FROM THE DATA, NEVER HARDCODED.
     *
     * Both hub lines below printed a literal "25.0% control" and subtracted
     * a literal 25. On a FIVE-choice batch (SSAT) that is wrong by five
     * points in the flattering direction — it hands the batch free credit.
     * This is the same assumption that let ssat-math-s6 ship live at +16.1
     * unmeasured: three separate checkers each assumed four options. The
     * standalone checkers were fixed then; this helper was missed, because
     * the fix went looking for checkers and this is an author tool.
     *
     * Modal option count, so one malformed row cannot move the control.
     */
    const widths = batch.map(r => (r.choices ?? []).length).filter(n => n > 0)
    const tally = new Map()
    for (const n of widths) tally.set(n, (tally.get(n) ?? 0) + 1)
    const k = [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 4
    const CTL = 100 / k
    if (tally.size > 1) {
      console.log(`  note: mixed option counts ${[...tally.keys()].sort().join('/')}; control uses the modal ${k}`)
    }
    const { scoreItem: symScore } = await import('./check-symbolic-hub.mjs')
    const scored = batch.map(r => symScore(r.choices, r.correct_answer)).filter(Boolean)
    if (scored.length) {
      const rate = 100 * scored.reduce((a, x) => a + x.credit, 0) / scored.length
      const margin = rate - CTL
      console.log(`Symbolic hub: ${scored.length} structured of ${batch.length}, key-is-hub ${rate.toFixed(1)}% vs ${CTL.toFixed(1)}% control, margin ${margin.toFixed(1)}pts`)
      if (margin > 10) console.log(`  ^ ABOVE THE 10-POINT PRE-FLIGHT BAR. The key is the unique option each\n    distractor is one edit from; derive distractors from different wrong\n    paths instead. Do not insert on this number.`)
    } else console.log('Symbolic hub: no structured option sets (numeric batch - see the numeric line)')
    // The symbolic checker returns null for all-numeric sets, which is most of
    // this bank. Without this second line a fully numeric batch printed
    // "nothing to check" and went through completely unchecked.
    const { scoreItem: numScore } = await import('./check-math-hub.mjs')
    const nums = batch.map(r => numScore(r.choices, r.correct_answer)).filter(x => x && x.structured)
    if (nums.length) {
      const nrate = 100 * nums.reduce((a, x) => a + x.credit, 0) / nums.length
      console.log(`Numeric hub:  ${nums.length} structured of ${batch.length}, key-is-hub ${nrate.toFixed(1)}% vs ${CTL.toFixed(1)}% control, margin ${(nrate - CTL).toFixed(1)}pts`)
      if (nrate - CTL > 10) console.log(`  ^ ABOVE THE 10-POINT PRE-FLIGHT BAR. Do not insert on this number.`)
    } else console.log(`Numeric hub:  no derivational structure in any option set`)
    return
  }

  if (cmd !== 'insert' || !qcPath) {
    console.error('usage: math-bank-helper.mjs verify <batch.json>\n       math-bank-helper.mjs blind <batch.json>\n       math-bank-helper.mjs insert <batch.json> <qc.json>')
    process.exit(1)
  }

  const env = loadEnv()
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const FAMILY = process.env.BANK_FAMILY || 'sat'
  const COHORT = process.env.BANK_COHORT || 'v2'
  if (!['sat', 'ssat', 'isee', 'act'].includes(FAMILY)) {
    console.error(`BANK_FAMILY must be sat, ssat, isee or act — got '${FAMILY}'`); process.exit(1)
  }
  if (FAMILY !== 'sat' && COHORT === 'v2') {
    console.error('refusing: a non-SAT batch must name its own BANK_COHORT, not fall back to the SAT default'); process.exit(1)
  }

  /*
   * THE QC GATE, WIRED 2026-09-04.
   *
   * gate.mjs existed, gate-contract.json existed, bank-qc.ts existed, and
   * the only inserter that consulted any of them was the TOEFL one. Both
   * SAT inserters — this file and bank-helper.mjs — wrote straight to the
   * bank. The bank-gate skill says in so many words that "the inserters
   * refuse a batch with no ledger entry"; for maths and SAT R&W that
   * sentence was simply false, and had been since the gate was written.
   * A documented gate nobody calls is an instruction, and this project's
   * whole thesis is that instructions do not hold and gates do.
   */
  const g = gateBatch({ task: 'multiple_choice', family: FAMILY, section: 'math', itemFiles: [batchPath] })
  if (!g.canInsert) {
    const why = overrideReason()
    if (!why) { console.error(`REFUSING to insert ${batchPath}: ${g.reason}`); process.exit(1) }
    console.log(`GATE OVERRIDDEN (BANK_GATE_OVERRIDE): ${why}\n  the gate said: ${g.reason}`)
  } else {
    console.log(`gate: ${g.batch} — ${g.reason}`)
  }
  console.log(`inserting as family=${FAMILY} cohort=${COHORT}`)
  const qc = JSON.parse(readFileSync(qcPath, 'utf8'))
  /*
   * Scoped to FAMILY: unscoped, this select spans >1000 math rows and
   * PostgREST silently truncates it, so the dedupe set was incomplete for
   * every family.
   *
   * SCOPING WAS NOT ENOUGH, and the note above outlived its own fix — this
   * was still a SINGLE un-paged select, and sat/math passed 1000 rows on its
   * own during 2026-09-03. So the very defect this comment describes had
   * come back inside the family it was narrowed to. Now paged AND ORDERED:
   * `range()` without an ORDER BY pages an unordered relation and returns
   * duplicates in place of unseen rows (measured on the R&W section the same
   * day: 1222 fetched, 1057 distinct).
   */
  const existing = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from('study_item_bank').select('content_hash')
      .eq('section', 'math').eq('family', FAMILY).order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    existing.push(...(data || [])); if (!data || data.length < 1000) break
  }
  const seen = new Set(existing.map(r => r.content_hash))

  let inserted = 0
  for (const raw of batch) {
    const q = qc[String(raw.id)]
    const label = `id${raw.id} [${raw.domain} / ${raw.subskill}]`
    /*
     * A MISSING QC ROW IS A DROP, NOT A PASS — fixed 2026-09-04, after it bit.
     *
     * This read `qc[raw.id] || {}`, so an item the grader had CONDEMNED and
     * that had therefore been left out of the qc file sailed straight in:
     * with no `q.difficulty` the difficulty check is skipped, and nothing
     * else consults qc at all. On 2026-09-04 that inserted GEO-H1-09 (a
     * second defensible answer that lands on printed option C) and
     * GEO-H1-21 (a figure drawn at ~105 degrees against a 95 label, next to
     * the 102 distractor) into the live bank; both had to be deleted by id
     * afterwards. The whole point of the qc file is to name the survivors,
     * and the default for an unnamed item has to be "no".
     */
    if (!q) { console.log(`DROP   ${label} — no qc row (dropped at the with-source grade)`); continue }
    if (!shapeOk(raw)) { console.log(`SKIP   ${label} — bad shape`); continue }
    const r = sandbox(raw)                                   // hard gate: code must recompute the key
    if (!r.ok) { console.log(`REJECT ${label} — sandbox mismatch (computed ${r.computed}, key ${raw.correct_answer})`); continue }
    if (q.difficulty && !['hard', 'medium'].includes(q.difficulty)) { console.log(`REJECT ${label} — difficulty ${q.difficulty}`); continue }
    const difficulty = difficultyOf(raw, q)
    const it = toItem(raw, difficulty)
    const content_hash = hashOf(it)
    if (seen.has(content_hash)) { console.log(`DUP    ${label}`); continue }
    const { error } = await admin.from('study_item_bank').insert({
      /*
       * FAMILY IS A PARAMETER, not a constant. It was hardcoded 'sat',
       * which meant inserting an SSAT or ISEE batch through this path
       * filed every item as SAT — wrong family, wrong blueprint, wrong
       * scoring rule (SAT has no -1/4 penalty), and invisible afterwards
       * because the rows look perfectly well formed. Set BANK_FAMILY.
       */
      family: FAMILY, section: 'math', domain: raw.domain, subskill: raw.subskill,
      // migration 068 made task NOT NULL; math rows all carry 'multiple_choice'.
      task: 'multiple_choice',
      difficulty, topic_tag: raw.topic_tag || null, item_type: 'multiple_choice',
      passage_group_id: null, item: it, content_hash, word_count: null, verified: true,
      verify_meta: {
        method: 'claude-authored+sandbox', computed: r.computed, grader_difficulty: q.difficulty || null,
        blind_letter: q.blind_letter || null, qc: 'deterministic sandbox recompute; no external model',
      },
      source: 'hand',
      archived: false,
      cohort: COHORT,
    })
    if (error) { console.log(`ERR    ${label}: ${error.message}`); continue }
    seen.add(content_hash); inserted++
    console.log(`INSERT ${label} — ${difficulty}${difficulty === raw.difficulty ? '' : ` (author said ${raw.difficulty})`}, computed ${r.computed}`)
  }

  // Paginated: the family's math rows passed 1000 on 2026-09-03 and the
  // after-count printed exactly 1000 with a domain missing - the PostgREST cap.
  const after = []
  for (let from = 0; ; from += 1000) {
    const { data } = await admin.from('study_item_bank').select('domain').eq('section', 'math').eq('family', FAMILY).eq('verified', true).eq('archived', false).order('id').range(from, from + 999)
    after.push(...(data ?? [])); if (!data || data.length < 1000) break
  }
  const by = {}
  for (const r of after) by[r.domain] = (by[r.domain] || 0) + 1
  console.log(`\nInserted ${inserted}. ${FAMILY} math verified now: ${after.length}`)
  for (const [d, c] of Object.entries(by).sort()) console.log(`  ${d}: ${c}`)
}

main().catch(e => { console.error(e); process.exit(1) })
