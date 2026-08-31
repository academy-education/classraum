/**
 * essay-bank-helper.mjs — insert the SSAT Writing Sample and ISEE Essay
 * prompts, the only FREE-RESPONSE blocks in either test.
 *
 * Every other helper here assumes multiple choice, which is why these 16
 * prompts sat authored-but-unbanked and both blocks were unroutable.
 *
 * ── The two shapes, which are genuinely different ────────────────────
 * SSAT shows the student TWO prompts side by side and they choose one:
 * an essay claim and a story starter. That is one delivered question, so
 * it is one bank row carrying both, with the pair in `passage` and the
 * instruction in `prompt`. `type` is 'essay_choice' so a renderer can
 * tell it apart.
 *
 * ISEE shows a single prompt. `type` is 'essay'.
 *
 * The pair is deliberately NOT modelled as `choices`: choices are
 * answers everywhere else in this bank, and grading paths read them that
 * way. Overloading the field to mean "things to write about" would be
 * the kind of quiet type confusion that shows up months later as a
 * mis-scored section.
 *
 * ── Unscored, and that is not the same as unimportant ────────────────
 * Neither block contributes to the reported score, but both are sent to
 * the schools the student applies to. They are dropped from scoring, not
 * from the form.
 *
 *   node scripts/study-bank/essay-bank-helper.mjs insert
 *   node scripts/study-bank/essay-bank-helper.mjs verify
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(readFileSync(join(HERE, '../../.env.local'), 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const prompts = JSON.parse(readFileSync(join(HERE, 'essay-prompts-v1.json'), 'utf8'))
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Group SSAT prompts into their delivered pairs: SW1a + SW1b -> SW1. */
function buildRows() {
  const rows = []

  const ssat = prompts.filter(p => p.id.startsWith('SW'))
  const pairs = new Map()
  for (const p of ssat) {
    const key = p.id.replace(/[ab]$/, '')
    const g = pairs.get(key) ?? {}
    g[p.kind === 'essay' ? 'essay' : 'story'] = p
    pairs.set(key, g)
  }
  for (const [key, g] of pairs) {
    if (!g.essay || !g.story) {
      console.error(`SKIP ${key} — incomplete pair (SSAT delivers both or neither)`)
      continue
    }
    rows.push({
      localId: key, family: 'ssat', section: 'writing', task: 'essay_choice',
      domain: 'Writing Sample',
      item: {
        type: 'essay_choice', blanks: null, graphic: null,
        prompt: 'Choose ONE of the two prompts below and write your response. You have 25 minutes.',
        passage: `[Essay]\n${g.essay.prompt}\n\n[Story Starter]\n${g.story.prompt}`,
        // EMPTY ARRAY, NOT null — see the note at the bottom of this file.
        choices: [], correct_answer: null, correct_answers: null, acceptable_answers: null,
        passageGroupId: null, difficulty: 'medium',
        explanation: [g.essay.guidance, g.story.guidance].filter(Boolean).join('\n\n'),
        distractor_rationales: [],
      },
    })
  }

  for (const p of prompts.filter(x => x.id.startsWith('IE'))) {
    rows.push({
      localId: p.id, family: 'isee', section: 'writing', task: 'essay',
      domain: 'Essay',
      item: {
        type: 'essay', blanks: null, graphic: null,
        prompt: p.prompt, passage: null,
        choices: [], correct_answer: null, correct_answers: null, acceptable_answers: null,
        passageGroupId: null, difficulty: 'medium',
        explanation: p.guidance ?? '',
        distractor_rationales: [],
      },
    })
  }
  return rows
}

const hashOf = it => createHash('md5')
  .update([norm(it.prompt), norm(it.passage)].join('~~')).digest('hex')

async function insert() {
  const rows = buildRows()
  const { data: existing } = await db.from('study_item_bank')
    .select('content_hash').in('family', ['ssat', 'isee']).eq('section', 'writing')
  const seen = new Set((existing ?? []).map(r => r.content_hash))

  let inserted = 0, dup = 0
  for (const r of rows) {
    const content_hash = hashOf(r.item)
    if (seen.has(content_hash)) { console.log(`DUP ${r.localId}`); dup++; continue }
    const { error } = await db.from('study_item_bank').insert({
      family: r.family, section: r.section, domain: r.domain,
      subskill: r.domain, task: r.task, item_type: r.task,
      difficulty: 'medium', topic_tag: r.task,
      item: r.item, content_hash, passage_group_id: null,
      word_count: null, verified: true, archived: false,
      source: 'hand', cohort: `${r.family}-essay-v1`,
      verify_meta: {
        method: 'hand-authored prompts; UNSCORED on the real exam but sent to schools',
        localId: r.localId,
        note: 'No answer key exists for a free-response prompt, so none of the MC gates (blind attack, kill spans, key spread) apply or were run.',
      },
    })
    if (error) { console.error(`ERR ${r.localId}: ${error.message}`); process.exit(1) }
    seen.add(content_hash); inserted++
  }
  console.log(`\ninserted ${inserted}, dup-skipped ${dup}`)
  await verify()
}

async function verify() {
  const { data } = await db.from('study_item_bank')
    .select('family, task, item').in('family', ['ssat', 'isee']).eq('section', 'writing')
    .eq('archived', false)
  const rows = data ?? []
  const ssat = rows.filter(r => r.family === 'ssat')
  const isee = rows.filter(r => r.family === 'isee')
  console.log(`live: ssat ${ssat.length} (expect 4 pairs), isee ${isee.length} (expect 8)`)
  // The pair must actually carry BOTH prompts — a row with one is a
  // half-delivered Writing Sample and the student loses their choice.
  const badPairs = ssat.filter(r =>
    !r.item.passage?.includes('[Essay]') || !r.item.passage?.includes('[Story Starter]'))
  console.log(`ssat rows missing one half of the pair: ${badPairs.length} (must be 0)`)
  /*
   * Free response has no key. A correct_answer, or an actual list of
   * options, would let a grading path mark an essay wrong against a
   * phantom answer.
   *
   * The first version of this check tested `choices != null` and
   * reported 12 of 12 failing — because the fix for the dedup_key
   * landmine writes [] rather than null. An empty array IS "no choices".
   * Testing for emptiness is the check that was meant.
   */
  const withKeys = rows.filter(r =>
    r.item.correct_answer != null || (Array.isArray(r.item.choices) && r.item.choices.length > 0))
  console.log(`rows carrying a key or real options: ${withKeys.length} (must be 0)`)
}

const cmd = process.argv[2]
if (cmd === 'insert') await insert()
else if (cmd === 'verify') await verify()
else { console.error('usage: essay-bank-helper.mjs insert|verify'); process.exit(1) }

/*
 * A SCHEMA LANDMINE FOUND BY BEING THE FIRST FREE-RESPONSE ITEM HERE.
 *
 * study_item_bank.dedup_key is a GENERATED column computed by
 * study_item_dedup_key(item), which does:
 *
 *   jsonb_array_elements_text(coalesce(p_item->'choices', '[]'::jsonb))
 *
 * That coalesce catches a SQL null. It does NOT catch a JSON null: for
 * an item written as {"choices": null}, `p_item->'choices'` returns
 * JSONB null, coalesce passes it straight through, and the insert dies
 * with "cannot extract elements from a scalar".
 *
 * Every item in the bank before these carried a real choices array, so
 * nothing had ever exercised it. The fix here is to write [] rather than
 * null, which is also the more honest encoding — a free-response item
 * has no choices, not unknown choices.
 *
 * The FUNCTION is still wrong for the next caller, and was deliberately
 * left alone: it backs a generated column on 4,532 live rows, so
 * changing it means a full table rewrite for a defect that has exactly
 * one known trigger and a one-character workaround. If a third item
 * shape ever needs JSON-null choices, fix the function then and accept
 * the rewrite. `jsonb_typeof(p_item->'choices') = 'array'` is the guard
 * it needs.
 */
