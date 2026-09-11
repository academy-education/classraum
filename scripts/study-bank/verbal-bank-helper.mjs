/**
 * verbal-bank-helper.mjs — insert path for SSAT / ISEE Verbal cohorts
 * (PHASE2-PREREGISTERED.md). Written BEFORE the first insert, with the
 * NOT NULL `task` column from day one — the migration-068 trap has now
 * bitten five pre-068 helpers and this one refuses to be the sixth.
 *
 *   node scripts/study-bank/verbal-bank-helper.mjs insert <family> <batch.json> <qc.json>
 *
 * family: 'ssat' (5 choices) | 'isee' (4 choices)
 * batch.json: [{ id, kind, difficulty, prompt, choices, correct_answer, explanation }]
 * qc.json:    { [id]: { keep: bool, key_votes, difficulty, exclusivity } }
 *             — produced by the gate run; only keep:true ids insert.
 *
 * Deliberate choices:
 * - item shape mirrors the live MC convention (type multiple_choice,
 *   passage null) so result views and grading need no new branches.
 * - content_hash = md5(normalized prompt + sorted normalized choices),
 *   the same definition C family as the other helpers, scoped by family.
 * - stored choice order is what the authors wrote; the draw shuffles at
 *   serve time on every path (assemble shuffleDrawnChoices), same
 *   reasoning as math-bank-helper's recorded decision.
 */
import { createClient } from '@supabase/supabase-js'
// One difficulty rule for all four inserters — see difficulty-policy.mjs.
import { acceptsDifficulty } from './difficulty-policy.mjs'
// The insert gate. See the block in insert() for why this import is new.
import { gateBatch, overrideReason } from './gate.mjs'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const CHOICES_FOR = { ssat: 5, isee: 4 }
// section defaults to verbal; BANK_SECTION=math banks the math cohorts through
// the same gated path (same shape, different section/domain).
const SECTION = process.env.BANK_SECTION || 'verbal'

function loadEnv() {
  const raw = readFileSync(join(HERE, '../../.env.local'), 'utf8')
  return Object.fromEntries(raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const hashOf = it => createHash('md5')
  .update([norm(it.prompt), (it.choices || []).map(norm).sort().join('|')].join('~~')).digest('hex')

async function insert(family, batchPath, qcPath) {
  const want = CHOICES_FOR[family]
  if (!want) { console.error(`unknown family '${family}' — ssat|isee`); process.exit(1) }
  const batch = JSON.parse(readFileSync(batchPath, 'utf8'))
  const qc = JSON.parse(readFileSync(qcPath, 'utf8'))
  const env = loadEnv()
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  /*
   * PAGED AND ORDERED — added 2026-09-11, before it bit rather than after.
   *
   * This was a single un-paged select. PostgREST caps a response at 1000
   * rows SILENTLY, so once a family's section passes 1000 the dedupe set
   * would be incomplete and duplicates would insert while the log said
   * nothing. math-bank-helper.mjs already carries this fix TWICE — once
   * scoped to family, and again when scoping alone proved insufficient and
   * sat/math passed 1000 on its own — with the note that range() without an
   * ORDER BY pages an unordered relation and returns duplicates in place of
   * unseen rows (1222 fetched, 1057 distinct, measured on R&W the same day).
   *
   * ISEE is at 560 rows and climbing on a day that added 24 maths and 27
   * verbal items. Waiting for the failure is not a plan.
   */
  /*
   * THE QC GATE, WIRED 2026-09-11 — AND IT WAS THE LAST INSERTER WITHOUT IT.
   *
   * On 2026-09-04 the gate was wired into math-bank-helper.mjs and
   * bank-helper.mjs, with a comment recording that "the only inserter that
   * consulted any of them was the TOEFL one" and that the bank-gate skill's
   * claim — "the inserters refuse a batch with no ledger entry" — was simply
   * false for maths and SAT R&W. Two of the four were fixed that day. THIS
   * ONE WAS NOT, and nobody noticed, because the sweep went looking for the
   * inserters it already knew about.
   *
   * So for a week every SSAT and ISEE verbal and reading batch inserted with
   * no gate at all: no ledger entry required, no content-hash binding, and an
   * edit after review could not make anything stale because nothing was bound.
   * Found on 2026-09-11 while trying to insert isee-verbal-s12 through it.
   *
   * The family resolves through the same contract as everywhere else, so a
   * verbal batch needs shape/withsource/nosource/elimination/tells, and a
   * reading batch the same. That is the correct requirement and it is why
   * ssat-reading-s11 — which failed its attack at 66.7% — could not have been
   * stopped here yesterday.
   */
  const g = gateBatch({ task: 'multiple_choice', family, section: SECTION, itemFiles: [batchPath] })
  if (!g.canInsert) {
    const why = overrideReason()
    if (!why) { console.error(`REFUSING to insert ${batchPath}: ${g.reason}`); process.exit(1) }
    console.log(`GATE OVERRIDDEN (BANK_GATE_OVERRIDE): ${why}\n  the gate said: ${g.reason}`)
  } else {
    console.log(`gate: ${g.batch} — ${g.reason}`)
  }

  const existing = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('content_hash').eq('family', family).eq('section', SECTION)
      .order('id').range(from, from + 999)
    if (error) { console.error(`dedupe read failed: ${error.message}`); process.exit(1) }
    existing.push(...(data || [])); if (!data || data.length < 1000) break
  }
  const seen = new Set(existing.map(r => r.content_hash))
  console.log(`dedupe set: ${seen.size} distinct hashes from ${existing.length} rows read`)

  let inserted = 0, rejected = 0
  for (const raw of batch) {
    const q = qc[raw.id]
    const label = `${raw.id} [${raw.kind}]`
    if (!q?.keep) { console.log(`REJECT ${label} — not kept by QC`); rejected++; continue }
    const ok = Array.isArray(raw.choices) && raw.choices.length === want
      && raw.choices.includes(raw.correct_answer)
      && new Set(raw.choices.map(c => String(c).trim())).size === want
      && String(raw.prompt || '').trim() && String(raw.explanation || '').trim()
      && (SECTION !== 'reading' || String(raw.passage || '').trim())
    if (!ok) { console.log(`SKIP ${label} — bad shape (${want} distinct choices incl. key required)`); rejected++; continue }
    /*
     * THE GRADER'S DIFFICULTY BANKS, NOT THE AUTHOR'S — fixed 2026-09-11.
     *
     * Every field below read `raw.difficulty`, the author's own label, while
     * AUTHORING-BRIEF.md 5 and every grader prompt say the grader's label is
     * what banks. The two maths inserters already do this. It mattered on the
     * first batch it was noticed on: three graders independently moved most
     * of an ISEE maths batch DOWN a band and all three named the same cause,
     * so banking the author's label would have recorded a cohort as harder
     * than three readers said it was.
     *
     * Falls back to the author's label only when the qc row carries none, so
     * a qc file written before this change still works.
     */
    const graded = q.difficulty ?? raw.difficulty
    const band = acceptsDifficulty(graded)
    if (!band.ok) { console.log(`DROP   ${label} — ${band.why}`); rejected++; continue }

    const it = {
      type: 'multiple_choice', blanks: null, graphic: null,
      // reading cohorts carry a passage and group by topic; verbal/math do not
      passage: raw.passage ?? null,
      passageGroupId: raw.topic_id ? `rw-${raw.topic_id}` : null,
      prompt: raw.prompt, choices: raw.choices, correct_answer: raw.correct_answer,
      correct_answers: null, acceptable_answers: null,
      difficulty: graded, explanation: raw.explanation,
      distractor_rationales: raw.distractor_rationales || [],
    }
    const content_hash = hashOf(it)
    if (seen.has(content_hash)) { console.log(`DUP ${label}`); continue }
    const { error } = await db.from('study_item_bank').insert({
      family, section: SECTION,
      domain: SECTION === 'math' ? 'Math' : SECTION === 'reading' ? 'Reading Comprehension' : 'Verbal',
      subskill: raw.subskill || raw.kind, task: 'multiple_choice', item_type: 'multiple_choice',
      difficulty: graded, topic_tag: raw.topic_tag || raw.kind,
      passage_group_id: raw.topic_id ? `rw-${raw.topic_id}` : null,
      item: it, content_hash, word_count: null, verified: true, archived: false,
      source: 'hand', cohort: process.env.BANK_COHORT || `${family}-verbal-v1`,
      verify_meta: {
        method: 'claude-authored+claude-qc',
        key_votes: q.key_votes ?? null, exclusivity: q.exclusivity ?? null,
        author_difficulty: raw.difficulty, graded_difficulty: graded,
        distractor_quality: q.distractor_quality ?? null,
        qc: 'key voters + blind exclusivity + options-only attack; no external model',
      },
    })
    if (error) { console.log(`ERR ${label}: ${error.message}`); rejected++; continue }
    seen.add(content_hash); inserted++
  }
  console.log(`\n${family} verbal: inserted ${inserted}, rejected ${rejected}`)
  const { count } = await db.from('study_item_bank')
    .select('id', { count: 'exact', head: true }).eq('family', family).eq('verified', true).eq('archived', false)
  console.log(`live ${family} rows (count query): ${count}`)
}

const [cmd, family, batchPath, qcPath] = process.argv.slice(2)
if (cmd !== 'insert' || !batchPath || !qcPath) {
  console.error('usage: verbal-bank-helper.mjs insert <ssat|isee> <batch.json> <qc.json>')
  process.exit(1)
}
await insert(family, batchPath, qcPath)
