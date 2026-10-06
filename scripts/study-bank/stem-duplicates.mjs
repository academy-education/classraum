#!/usr/bin/env node
/**
 * stem-duplicates.mjs — the same question twice, refused at insert.
 *
 *   node scripts/study-bank/stem-duplicates.mjs <batch.json> --family <f>   check a batch (live + within)
 *   node scripts/study-bank/stem-duplicates.mjs --live                      whole live bank, every family
 *   node scripts/study-bank/stem-duplicates.mjs --selftest                  fixtures, no DB
 *
 * WHY (REGISTER §5, 2026-10-06). form-qc (FORM-QC-2026-10-04.md) found ISEE
 * "ARDUOUS" twice in one delivered form. The bank held nine such pairs: one
 * stem (7 of 9 also the key) with different distractors and no shared
 * passage_group_id, so the assembler's one-per-group rule could not keep them
 * apart. Two of them (the "Petal is to flower" analogy) had DIFFERENT keys, so
 * a student meeting both saw one stem with two answers. One of each pair was
 * archived by hand; nothing stopped the next one. This is that stop.
 *
 * THE KEY. Normalised stem + passage + graphic (+ the target sentence for
 * Build a Sentence, whose stem is a fixed instruction). Choices are
 * deliberately NOT in the key: the nine live pairs differed in their
 * distractors, which is exactly why no option-set or content-hash check saw
 * them. The graphic IS in the key: ten live SAT Math pairs share a stem like
 * "What is the median of the values in the table?" over different tables.
 *
 * THE EXEMPTION. Two items that share a passage group are an intentional set
 * (a clone set, or two questions on one passage), and the group rule already
 * keeps them out of one form together. Same family only: forms are drawn per
 * family, so an SSAT item and an ISEE item with one stem never meet.
 *
 * Wired into gate.mjs `gateBatch` (like question-number-refs.mjs). The live
 * read is synchronous there because every inserter calls gateBatch
 * synchronously; it runs this file as a child (`--dump-live`). A live read
 * that fails THROWS — a check that cannot read its input must not report the
 * batch clean.
 */
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..', '..')

export const norm = s => String(s ?? '').normalize('NFKC').toLowerCase()
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()

const canonGraphic = g => {
  if (g == null || g === '') return ''
  if (typeof g === 'string') return norm(g)
  const sort = v => Array.isArray(v) ? v.map(sort)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sort(v[k])])) : v
  return JSON.stringify(sort(g))
}

const isBuildASentence = it =>
  it.type === 'arrange_words' || it.item_type === 'arrange_words' || /^\s*\[build a sentence\]/i.test(String(it.prompt ?? ''))

/** The duplicate key of one item, or null when it has no stem. */
export function stemKey(it) {
  const p = norm(it?.prompt)
  if (!p) return null
  const parts = [p, norm(it.passage), canonGraphic(it.graphic)]
  if (isBuildASentence(it)) parts.push(norm(it.correct_answer).replace(/\s*\|\s*/g, ' '))
  return createHash('sha1').update(parts.join('\u0001')).digest('hex')
}

/** Every passage-group identity an item carries. Inserters derive the stored
 *  id from these (`<cohort>:<passage_id>`, `<cohort>:<set_id>`, `rw-<topic_id>`,
 *  TOEFL `pg-<md5>`), so raw equality inside one batch means one group. */
export function groupIds(it) {
  const out = new Set()
  for (const k of ['passage_group_id', 'passageGroupId', 'passage_id', 'set_id', 'topic_id']) {
    const v = it?.[k]
    if (v != null && String(v).trim()) out.add(String(v))
  }
  if (it?.topic_id) out.add(`rw-${it.topic_id}`)
  return out
}

/**
 * Pull question objects out of any batch shape: a flat array, {items|questions|sets|passages},
 * or sets with nested questions. A question is an object with a string `prompt`.
 * passage / graphic / group ids are inherited from the nearest ancestor that has them.
 */
export function extractItems(parsed) {
  const out = []
  const INHERIT = ['passage', 'graphic', 'passage_group_id', 'passageGroupId', 'passage_id', 'set_id', 'topic_id']
  const walk = (v, ctx, path) => {
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, ctx, `${path}[${i}]`)); return }
    if (!v || typeof v !== 'object') return
    const here = { ...ctx }
    for (const k of INHERIT) if (v[k] != null && v[k] !== '') here[k] = v[k]
    // a set's text is often `text` / `passage_text` beside nested questions
    if (here.passage == null && typeof v.passage_text === 'string') here.passage = v.passage_text
    if (typeof v.prompt === 'string') {
      out.push({ ...here, ...v, passage: v.passage ?? here.passage, graphic: v.graphic ?? here.graphic, _path: path })
      return
    }
    for (const [k, x] of Object.entries(v)) if (x && typeof x === 'object') walk(x, here, path ? `${path}.${k}` : k)
  }
  walk(parsed, {}, '')
  return out
}

const shareGroup = (a, b) => { for (const g of a) if (b.has(g)) return true; return false }

/**
 * Duplicates of `batch` items against each other and against `live` rows.
 * batch: items from extractItems. live: [{ id, k, g: [groupIds] }] of the SAME family.
 * Returns [{ kind: 'within'|'live', a, b }] — a/b are labels.
 */
export function findDuplicates(batch, live = []) {
  const hits = []
  const liveBy = new Map()
  for (const r of live) { if (!r.k) continue; (liveBy.get(r.k) ?? liveBy.set(r.k, []).get(r.k)).push(r) }
  const seen = new Map()
  for (const it of batch) {
    const k = stemKey(it)
    if (!k) continue
    const g = groupIds(it)
    const label = `${it.id ?? it.localId ?? it._path}`
    for (const r of liveBy.get(k) ?? []) if (!shareGroup(g, new Set(r.g))) hits.push({ kind: 'live', a: label, b: r.id, prompt: String(it.prompt).slice(0, 70) })
    for (const o of seen.get(k) ?? []) if (!shareGroup(g, o.g)) hits.push({ kind: 'within', a: o.label, b: label, prompt: String(it.prompt).slice(0, 70) })
    ;(seen.get(k) ?? seen.set(k, []).get(k)).push({ label, g })
  }
  return hits
}

/** Live-vs-live clusters (for --live). rows: [{ id, family, k, g }]. */
export function liveClusters(rows) {
  const by = new Map()
  for (const r of rows) { if (!r.k) continue; const key = `${r.family}|${r.k}`; (by.get(key) ?? by.set(key, []).get(key)).push(r) }
  const pairs = []
  for (const list of by.values()) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      if (!shareGroup(new Set(list[i].g), new Set(list[j].g))) pairs.push([list[i], list[j]])
    }
  }
  return pairs
}

export function describe(hits, max = 8) {
  const lines = hits.slice(0, max).map(h => h.kind === 'live'
    ? `${h.a} duplicates LIVE ${String(h.b).slice(0, 8)}: "${h.prompt}"`
    : `${h.a} duplicates ${h.b} in this batch: "${h.prompt}"`)
  if (hits.length > max) lines.push(`… and ${hits.length - max} more`)
  return lines.join('\n    ')
}

function loadEnv() {
  const env = { ...process.env }
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) return env
  for (const p of [join(process.cwd(), '.env.local'), join(REPO, '.env.local')]) {
    if (!existsSync(p)) continue
    for (const l of readFileSync(p, 'utf8').split('\n')) {
      if (!l.includes('=') || l.trimStart().startsWith('#')) continue
      const k = l.slice(0, l.indexOf('=')).trim()
      if (!env[k]) env[k] = l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
    }
    break
  }
  return env
}

/** Every verified, unarchived row: { id, family, k, g, cohort, prompt }. Paged; count asserted. */
export async function readLive({ includeIds = [] } = {}) {
  const env = loadEnv()
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('stem-duplicates: no Supabase credentials (.env.local) — cannot read the live bank')
  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { count, error: ce } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('verified', true).eq('archived', false)
  if (ce) throw new Error(`stem-duplicates: count failed: ${ce.message}`)
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,family,section,cohort,passage_group_id,item')
      .eq('verified', true).eq('archived', false).order('id').range(f, f + 999)
    if (error) throw new Error(`stem-duplicates: read failed: ${error.message}`)
    rows.push(...data)
    if (data.length < 1000) break
  }
  if (rows.length !== count || new Set(rows.map(r => r.id)).size !== count) throw new Error(`stem-duplicates: read ${rows.length} rows, count says ${count}`)
  if (includeIds.length) {
    const { data, error } = await db.from('study_item_bank').select('id,family,section,cohort,passage_group_id,item').in('id', includeIds)
    if (error) throw new Error(error.message)
    if (data.length !== includeIds.length) throw new Error(`stem-duplicates: asked for ${includeIds.length} extra ids, got ${data.length}`)
    rows.push(...data)
  }
  return rows.map(r => ({
    id: r.id, family: r.family, section: r.section, cohort: r.cohort, prompt: String(r.item?.prompt ?? '').slice(0, 70),
    k: stemKey({ ...r.item, item_type: r.item?.type }),
    g: [r.passage_group_id, r.item?.passageGroupId].filter(Boolean),
  }))
}

/** Synchronous live read for gateBatch: runs this file as a child. Throws on any failure. */
export function readLiveSync(family) {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--dump-live', family], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, cwd: REPO })
  if (r.status !== 0) throw new Error(`stem-duplicates: live read failed (exit ${r.status}): ${(r.stderr || '').trim().slice(0, 300)}`)
  const parsed = JSON.parse(r.stdout)
  if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) throw new Error(`stem-duplicates: live read returned no ${family} rows; refusing to report the batch clean`)
  return parsed.rows
}

/** For the gate: duplicates of these files' items against live (same family) and each other. */
export function checkFiles(files, family, { live } = {}) {
  const items = []
  for (const f of files) {
    let parsed
    try { parsed = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { throw new Error(`stem-duplicate check cannot read ${f} as JSON: ${e.message}`) }
    items.push(...extractItems(parsed))
  }
  const scorable = items.filter(it => stemKey(it)).length
  if (!scorable) throw new Error(`stem-duplicate check found no item with a prompt in ${files.join(', ')}; refusing to report it clean`)
  const rows = live ?? readLiveSync(family)
  const hits = findDuplicates(items, rows.filter(r => !family || r.family === family))
  return { items: items.length, scorable, liveRows: rows.length, hits }
}

function selfTest() {
  let bad = 0
  const fail = m => { console.error(`SELF-TEST FAIL: ${m}`); bad++ }
  const A = { id: 'a', prompt: 'ARDUOUS', choices: ['difficult', 'easy', 'red', 'loud'], correct_answer: 'difficult' }
  // 1. the live ARDUOUS shape: same stem, different distractors, no group -> hit
  const Atwin = { id: 'a2', prompt: '  Arduous ', choices: ['difficult', 'brief', 'calm', 'tidy'], correct_answer: 'difficult' }
  if (findDuplicates([A, Atwin]).length !== 1) fail('same stem, different distractors, within batch not caught')
  // 2. normalisation: curly quotes, NFKC, whitespace
  const q1 = { id: 'q1', prompt: 'What is the writer’s  main point?', passage: 'Text one.' }
  const q2 = { id: 'q2', prompt: "what is the writer's main point?", passage: 'Text  one.' }
  if (findDuplicates([q1, q2]).length !== 1) fail('normalisation (quotes/case/space) not applied')
  // 3. same stem, different passage -> NOT a duplicate
  if (findDuplicates([q1, { ...q2, passage: 'Text two.' }]).length) fail('different passages flagged')
  // 4. same stem, different graphic -> NOT (the SAT "median of the values in the table" pairs)
  const g1 = { id: 'g1', prompt: 'What is the median of the values in the table?', graphic: { type: 'table', rows: [[1, 2]] } }
  const g2 = { id: 'g2', prompt: 'What is the median of the values in the table?', graphic: { rows: [[1, 3]], type: 'table' } }
  if (findDuplicates([g1, g2]).length) fail('different graphics flagged')
  if (findDuplicates([g1, { ...g1, id: 'g3', graphic: { rows: [[1, 2]], type: 'table' } }]).length !== 1) fail('same graphic with reordered keys not caught')
  // 5. Build a Sentence: fixed stem, differ by target sentence
  const b1 = { id: 'b1', type: 'arrange_words', prompt: '[Build a Sentence] Tap the words in order.', correct_answer: 'The cat | sat' }
  const b2 = { id: 'b2', prompt: '[Build a Sentence] Tap the words in order.', correct_answer: 'The dog | ran' }
  if (findDuplicates([b1, b2]).length) fail('Build a Sentence with different targets flagged')
  if (findDuplicates([b1, { ...b2, correct_answer: 'The cat|sat' }]).length !== 1) fail('Build a Sentence with same target not caught')
  // 6. exemption: a shared group (raw ids in one batch, or a live group id)
  if (findDuplicates([{ ...A, set_id: 's1' }, { ...Atwin, set_id: 's1' }]).length) fail('shared set_id not exempt')
  if (findDuplicates([{ ...A, set_id: 's1' }, { ...Atwin, set_id: 's2' }]).length !== 1) fail('different set_ids exempted')
  const live = [{ id: 'live-1', k: stemKey(A), g: ['pg-x'] }]
  if (findDuplicates([Atwin], live).length !== 1) fail('live duplicate not caught')
  if (findDuplicates([{ ...Atwin, passageGroupId: 'pg-x' }], live).length) fail('live duplicate in a shared group not exempt')
  if (findDuplicates([{ ...Atwin, topic_id: 'x' }], [{ id: 'l2', k: stemKey(A), g: ['rw-x'] }]).length) fail('topic_id -> rw- group not exempt')
  // 7. nested set shape inherits passage + group from the set
  const nested = { sets: [{ passage_id: 'p1', passage: 'Shared passage.', questions: [{ id: 'n1', prompt: 'Main idea?' }, { id: 'n2', prompt: 'Main idea?' }] },
    { passage_id: 'p2', passage: 'Shared passage.', questions: [{ id: 'n3', prompt: 'Main idea?' }] }] }
  const ex = extractItems(nested)
  if (ex.length !== 3 || ex[0].passage !== 'Shared passage.') fail(`nested extract: ${ex.length} items`)
  const nh = findDuplicates(ex)
  if (nh.length !== 2 || nh.some(h => h.a === 'n1' && h.b === 'n2')) fail(`nested: expected n3 vs n1 and n2 only, got ${JSON.stringify(nh.map(h => [h.a, h.b]))}`)
  // 8. no stem -> not scorable; checkFiles refuses a file with none
  if (stemKey({ choices: ['a'] }) !== null) fail('stemless item got a key')
  // 9. live clusters: same family pairs, not cross-family, not shared group
  const lc = liveClusters([
    { id: '1', family: 'isee', k: 'K', g: [] }, { id: '2', family: 'isee', k: 'K', g: [] },
    { id: '3', family: 'ssat', k: 'K', g: [] },
    { id: '4', family: 'act', k: 'J', g: ['G'] }, { id: '5', family: 'act', k: 'J', g: ['G'] },
  ])
  if (lc.length !== 1 || lc[0][0].id !== '1') fail(`liveClusters: ${JSON.stringify(lc.map(p => p.map(r => r.id)))}`)
  // 10. through the real insert path: gateBatch refuses a live twin and does not refuse
  //     a clean item for duplicates (that one then fails on the ledger). Child process:
  //     gate.mjs imports this module.
  const tmp = (obj) => { const f = join(tmpdir(), `stemdup-${process.pid}-${Math.random().toString(36).slice(2)}.json`); writeFileSync(f, JSON.stringify(obj)); return f }
  const fDup = tmp([Atwin]), fOk = tmp([{ ...Atwin, prompt: 'METICULOUS' }])
  const liveInj = [{ id: 'live-arduous', family: 'isee', k: stemKey(A), g: [] }, { id: 'ssat-only', family: 'ssat', k: stemKey({ prompt: 'METICULOUS' }), g: [] }]
  const gate = f => {
    const code = `import { gateBatch } from ${JSON.stringify(pathToFileURL(join(HERE, 'gate.mjs')).href)}; const g = gateBatch({ task: 'multiple_choice', family: 'isee', section: 'verbal', itemFiles: [${JSON.stringify(f)}], liveStems: ${JSON.stringify(liveInj)} }); console.log(JSON.stringify({ canInsert: g.canInsert, dups: g.stemDuplicates?.length ?? 0 }))`
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' })
    if (r.status !== 0) throw new Error(`gateBatch child failed: ${r.stderr}`)
    return JSON.parse(r.stdout.trim().split('\n').pop())
  }
  try {
    const gd = gate(fDup)
    if (gd.canInsert || gd.dups !== 1) fail(`gateBatch did not refuse a live twin: ${JSON.stringify(gd)}`)
    const go = gate(fOk)  // METICULOUS is live only in ssat: cross-family is not a duplicate
    if (go.dups) fail('gateBatch refused a clean item (or matched across families)')
  } finally { unlinkSync(fDup); unlinkSync(fOk) }
  if (bad) { console.error(`${bad} self-test failure(s)`); process.exit(1) }
  console.log('stem-duplicates self-test: 19 checks (stem twin, normalisation, passage/graphic/BaS discrimination, group exemption, live, nested sets, clusters, gateBatch refuses/passes) — OK')
}

// The CLI body runs inside an async IIFE, not top-level await: jest imports
// this module (via gate.mjs) and cannot compile top-level await (same trap
// as elimination-paired.mjs on 2026-10-04).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) (async () => {
  const args = process.argv.slice(2)
  if (args[0] === '--dump-live') {
    const rows = await readLive()
    process.stdout.write(JSON.stringify({ rows: rows.filter(r => !args[1] || r.family === args[1]).map(({ id, family, k, g }) => ({ id, family, k, g })) }))
  } else if (args[0] === '--selftest' || args[0] === '--self-test') {
    selfTest()
  } else if (args[0] === '--live') {
    const ii = args.indexOf('--include-ids')
    const includeIds = ii >= 0 ? args[ii + 1].split(',') : []
    const rows = await readLive({ includeIds })
    const pairs = liveClusters(rows)
    console.log(`LIVE BANK: ${rows.length} rows (${rows.filter(r => r.k).length} with a stem${includeIds.length ? `, +${includeIds.length} non-live ids included on request` : ''})`)
    console.log(`stem-duplicate pairs (same family, no shared passage group): ${pairs.length}`)
    for (const [a, b] of pairs) console.log(`  ${a.family}/${a.section}  ${a.id.slice(0, 8)} (${a.cohort}) / ${b.id.slice(0, 8)} (${b.cohort})  "${a.prompt}"`)
    process.exit(pairs.length ? 1 : 0)
  } else if (args[0] && !args[0].startsWith('--')) {
    const fi = args.indexOf('--family')
    if (fi < 0 || !args[fi + 1]) { console.error('REFUSING: --family <sat|act|isee|ssat|toefl> is required for a batch'); process.exit(2) }
    const files = args.filter((a, i) => !a.startsWith('--') && i !== fi + 1)
    let r
    try { r = checkFiles(files, args[fi + 1]) } catch (e) { console.error(`REFUSING: ${e.message}`); process.exit(2) }
    console.log(`${files.join(', ')}: ${r.scorable} of ${r.items} items scorable, against ${r.liveRows} live ${args[fi + 1]} rows — ${r.hits.length} stem duplicate(s)`)
    if (r.hits.length) { console.log('    ' + describe(r.hits, 50)); process.exit(1) }
  } else {
    console.error('usage: stem-duplicates.mjs <batch.json> --family <f> | --live [--include-ids a,b] | --selftest')
    process.exit(2)
  }
})().catch(e => { console.error(e); process.exit(2) })
