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
  const { data: existing } = await db.from('study_item_bank')
    .select('content_hash').eq('family', family).eq('section', SECTION)
  const seen = new Set((existing || []).map(r => r.content_hash))

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
    const it = {
      type: 'multiple_choice', blanks: null, graphic: null,
      // reading cohorts carry a passage and group by topic; verbal/math do not
      passage: raw.passage ?? null,
      passageGroupId: raw.topic_id ? `rw-${raw.topic_id}` : null,
      prompt: raw.prompt, choices: raw.choices, correct_answer: raw.correct_answer,
      correct_answers: null, acceptable_answers: null,
      difficulty: raw.difficulty, explanation: raw.explanation,
      distractor_rationales: raw.distractor_rationales || [],
    }
    const content_hash = hashOf(it)
    if (seen.has(content_hash)) { console.log(`DUP ${label}`); continue }
    const { error } = await db.from('study_item_bank').insert({
      family, section: SECTION,
      domain: SECTION === 'math' ? 'Math' : SECTION === 'reading' ? 'Reading Comprehension' : 'Verbal',
      subskill: raw.subskill || raw.kind, task: 'multiple_choice', item_type: 'multiple_choice',
      difficulty: raw.difficulty, topic_tag: raw.topic_tag || raw.kind,
      passage_group_id: raw.topic_id ? `rw-${raw.topic_id}` : null,
      item: it, content_hash, word_count: null, verified: true, archived: false,
      source: 'hand', cohort: process.env.BANK_COHORT || `${family}-verbal-v1`,
      verify_meta: {
        method: 'claude-authored+claude-qc',
        key_votes: q.key_votes ?? null, exclusivity: q.exclusivity ?? null,
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
