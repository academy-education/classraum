#!/usr/bin/env node
/**
 * Stage the MAP Science pilot (verified=false) as one cohort, `map-science-pilot`. Students cannot see it: the
 * assembler draws verified rows only, and MAP is behind the coming-soon gate. The rows become drawable only when
 * release-by-shape.mjs releases them after the co-founder's L0 full sitting (Amendment 3; MAP-SCIENCE-PILOT.prereg.md).
 * Modelled on stage-map-vocab-v2.mjs.
 *
 *   node scripts/study-bank/stage-map-science-pilot.mjs <L.json> <P.json> <E.json> --cleared <cleared.json> [--apply]
 *   node scripts/study-bank/stage-map-science-pilot.mjs --selftest         # no DB: proves the refusals fire
 *
 * Rows are standalone (passage_group_id null): each item carries its own stimulus in item.passage / item.graphic,
 * and MAP_AREA_QUOTAS.science draws with passages: false. item.graphic is stored exactly as ACT Science stores it
 * (table / bar / line / scatter JSON drawn by QuestionGraphicView).
 *
 * Refuses (exit 1, nothing written), in this order:
 *   - no autonomy-methods.json entry for the cohort with METHOD_ID
 *   - any item sci-check.mjs refuses (the same checkItem, the same slots and exclusions), or a slot left EMPTY
 *   - an item not listed in --cleared (the ids that survived the prereg's with-source and grader-v2 drop rules;
 *     the coordinator writes the file from the grader reports). Dry run prints which ids it would drop
 *   - a duplicate content hash inside the batch or already in the bank. THE HASH COVERS THE GRAPHIC AND THE PASSAGE:
 *     two invented-data items can share a stem and four options and differ only in their table
 *     (CLAUDE.md: never key a row on its prompt)
 * Dry run by default. --apply inserts, then re-reads the cohort and checks the count that landed.
 */
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkItem, loadExclusions } from './map-v2-work/science-pilot/sci-check.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PILOT = join(HERE, 'map-v2-work/science-pilot')
export const COHORT = 'map-science-pilot'
export const METHOD_ID = 'map-sci-pilot-agents+cfg-v2'

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9.]+/g, ' ').trim()
/** Canonical JSON (sorted keys) so key order in an author's file cannot change the hash. */
const canon = v => Array.isArray(v) ? `[${v.map(canon).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`
  : JSON.stringify(v ?? null)
export const hashOf = ({ passage, prompt, choices, graphic }) => createHash('md5')
  .update([norm(passage), norm(prompt), (choices || []).map(norm).join('|'), canon(graphic ?? null)].join('~~')).digest('hex')

export function toRow(it) {
  const item = {
    type: 'multiple_choice', blanks: null, prompt: it.prompt, choices: it.choices, graphic: it.graphic ?? null,
    passage: it.passage ?? null, difficulty: it.difficulty, explanation: it.explanation, correct_answer: it.correct_answer,
    correct_answers: null, acceptable_answers: null, distractor_rationales: it.distractor_rationales,
  }
  return {
    family: 'map', section: 'science', domain: it.map_area, subskill: it.dci, difficulty: it.difficulty,
    topic_tag: it.ngss_pe, item_type: 'multiple_choice', task: 'multiple_choice', passage_group_id: null, item,
    content_hash: hashOf(item), word_count: `${it.passage ?? ''} ${it.prompt}`.split(/\s+/).filter(Boolean).length,
    verified: false, archived: false, source: 'hand', cohort: COHORT,
    verify_meta: {
      method_id: METHOD_ID,
      map: {
        area: it.map_area, dci: it.dci, ngss_pe: it.ngss_pe, grade_target: it.grade_target, tier: it.tier,
        rit_band_target: it.rit_band_target, kind: it.kind, stimulus: it.stimulus, format: it.format, ask: it.ask,
        invented: it.invented, names_used: it.names_used ?? [],
      },
      draft: {
        status: 'awaiting_edit', qid: it.id,
        qc: { note: 'MAP Science pilot: 3 Claude agent authors (map-v2-work/science-pilot/BRIEF.md, seeded slots), sci-check.mjs per item and --batch; two with-source graders decoding every graphic + grader v2 pre-screen, drop rules per MAP-SCIENCE-PILOT.prereg.md. Options-only and figure-covered attacks REPORT-ONLY (the instrument saturates on ACT Science). Route: L0 full sitting.' },
        authored: { key_evidence: it.key_evidence ?? null, real_world_check: it.real_world_check },
      },
    },
  }
}

/** Everything that can be decided without the database. Returns { rows, dropped } or throws a refusal string. */
export function plan(raw, { slots, exclusions, cleared, methods }) {
  if (methods?.[COHORT]?.method_id !== METHOD_ID) throw `autonomy-methods.json has no ${COHORT} entry with method_id ${METHOD_ID}`
  const problems = []
  for (const it of raw) {
    if (it?.empty) { problems.push(`${it.id}: EMPTY slot cannot be staged (leave it out of the files, or re-author it)`); continue }
    const pr = checkItem(it, slots[it?.id], exclusions, { rules: 'pilot' })
    if (pr.length) problems.push(`${it?.id}: ${pr.join('; ')}`)
  }
  if (problems.length) throw `sci-check refuses ${problems.length} item(s):\n  ${problems.join('\n  ')}`
  const keep = raw.filter(it => cleared.has(it.id)), dropped = raw.filter(it => !cleared.has(it.id)).map(it => it.id)
  const stray = [...cleared].filter(id => !raw.some(it => it.id === id))
  if (stray.length) throw `--cleared names ids that are not in the files: ${stray.join(', ')}`
  const rows = keep.map(toRow)
  const hs = rows.map(r => r.content_hash)
  if (new Set(hs).size !== hs.length) throw 'duplicate content hash inside the batch'
  return { rows, dropped }
}

function slotIndex() {
  const S = JSON.parse(readFileSync(join(PILOT, 'slots.json'), 'utf8')), idx = {}
  for (const [c, v] of Object.entries(S)) if (!c.startsWith('_')) for (const r of v.rows) idx[r.id] = { ...r, area: v.area, author: c }
  return idx
}

async function selftest() {
  const { FIXTURES, FIXTURE_SLOTS } = await import('./map-v2-work/science-pilot/sci-check.fixtures.mjs')
  const methods = { [COHORT]: { method_id: METHOD_ID } }
  const base = { slots: FIXTURE_SLOTS, exclusions: [], cleared: new Set(FIXTURES.map(f => f.id)), methods }
  let fail = 0
  const expect = (name, fn, re) => {
    try { fn(); if (re) { fail++; console.log(`  FAIL ${name}: expected a refusal matching ${re}`) } else console.log(`  ok   ${name}`) } catch (e) {
      if (re && re.test(String(e))) console.log(`  ok   ${name} -> refused: ${String(e).split('\n')[0]}`)
      else { fail++; console.log(`  FAIL ${name}: ${re ? `refusal did not match ${re}` : 'refused'}: ${String(e).split('\n')[0]}`) }
    }
  }
  expect('clean fixtures plan to 9 rows', () => { const r = plan(FIXTURES, base); if (r.rows.length !== 9 || r.rows.some(x => x.verified !== false || x.passage_group_id !== null || x.section !== 'science')) throw 'bad rows' })
  expect('no method entry', () => plan(FIXTURES, { ...base, methods: {} }), /no map-science-pilot entry/)
  expect('wrong method id', () => plan(FIXTURES, { ...base, methods: { [COHORT]: { method_id: 'other' } } }), /no map-science-pilot entry/)
  expect('an item sci-check refuses', () => { const b = structuredClone(FIXTURES); b[0].graphic.cells[0].pop(); plan(b, base) }, /sci-check refuses 1/)
  expect('an EMPTY slot', () => plan([...FIXTURES, { id: 'FX-L-09', empty: true }], base), /EMPTY slot cannot be staged/)
  expect('--cleared names an unknown id', () => plan(FIXTURES, { ...base, cleared: new Set([...base.cleared, 'FX-Z-01']) }), /not in the files/)
  expect('items not cleared are dropped, not staged', () => { const r = plan(FIXTURES, { ...base, cleared: new Set(['FX-L-01']) }); if (r.rows.length !== 1 || r.dropped.length !== 8) throw 'drop' })
  // THE GRAPHIC IS IN THE HASH: two items identical but for one table cell must not collide.
  const a = structuredClone(FIXTURES[0]), b = structuredClone(FIXTURES[0]); b.graphic.cells[3][1] = 57
  expect('hash differs when only the graphic differs', () => { if (toRow(a).content_hash === toRow(b).content_hash) throw 'graphic not in hash' })
  const c = structuredClone(FIXTURES[4]), d = structuredClone(FIXTURES[4]); d.passage = d.passage.replace('200 mL', '250 mL')
  expect('hash differs when only the passage differs', () => { if (toRow(c).content_hash === toRow(d).content_hash) throw 'passage not in hash' })
  const e = structuredClone(FIXTURES[0]); e.graphic = Object.fromEntries(Object.entries(e.graphic).reverse())
  expect('hash ignores key order inside the graphic', () => { if (toRow(FIXTURES[0]).content_hash !== toRow(e).content_hash) throw 'key order changed the hash' })
  expect('two identical items in one batch', () => plan([FIXTURES[0], { ...structuredClone(FIXTURES[0]) }], { ...base, cleared: new Set(['FX-L-01']) }), /duplicate content hash/)
  console.log(fail ? `STAGER SELFTEST FAILED: ${fail}` : 'STAGER SELFTEST OK: 11 cases')
  process.exit(fail ? 1 : 0)
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const A = process.argv.slice(2)
  if (A.includes('--selftest')) await selftest()
  const die = (m, c = 1) => { console.error('REFUSING: ' + m); process.exit(c) }
  const ci = A.indexOf('--cleared'), clearedPath = ci >= 0 ? A[ci + 1] : null
  const files = A.filter((a, i) => !a.startsWith('--') && A[i - 1] !== '--cleared')
  const APPLY = A.includes('--apply')
  if (!files.length || !clearedPath) die('usage: stage-map-science-pilot.mjs <L.json> <P.json> <E.json> --cleared <cleared.json> [--apply]', 2)
  for (const f of [...files, clearedPath]) if (!existsSync(f)) die(`no such file ${f}`, 2)
  const raw = files.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
  const cleared = new Set(JSON.parse(readFileSync(clearedPath, 'utf8')))
  const methods = JSON.parse(readFileSync(join(HERE, 'autonomy-methods.json'), 'utf8')).cohorts
  let res
  try { res = plan(raw, { slots: slotIndex(), exclusions: loadExclusions(join(PILOT, 'EXCLUSIONS-science.txt')), cleared, methods }) } catch (e) { die(String(e)) }
  const { rows, dropped } = res
  if (!rows.length) die('zero rows to stage', 2)
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: clash, error: e1 } = await db.from('study_item_bank').select('id,cohort').in('content_hash', rows.map(r => r.content_hash))
  if (e1) die(e1.message)
  if (clash.length) die(`${clash.length} rows already in the bank with these hashes (e.g. cohort ${clash[0].cohort})`)
  const by = {}; for (const r of rows) by[r.domain] = (by[r.domain] ?? 0) + 1
  console.log(`rows ${rows.length} cohort ${COHORT} ${JSON.stringify(by)}; dropped by the prereg rules: ${dropped.length ? dropped.join(', ') : 'none'}`)
  if (!APPLY) { console.log('dry run; pass --apply to insert'); process.exit(0) }
  const { error: e2 } = await db.from('study_item_bank').insert(rows)
  if (e2) die(e2.message)
  const { count, error } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('cohort', COHORT).eq('verified', false)
  if (error) die(error.message)
  if (count !== rows.length) die(`${COHORT}: expected ${rows.length} staged rows, found ${count}`)
  console.log(`${COHORT}: ${count} staged`)
}
