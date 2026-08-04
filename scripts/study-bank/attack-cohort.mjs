#!/usr/bin/env node
/**
 * THE BLIND ATTACK, AS A REPEATABLE LOOP.
 *
 *   node scripts/study-bank/attack-cohort.mjs prepare <run-id> --domain "Craft and Structure" [--limit 60]
 *   node scripts/study-bank/attack-cohort.mjs ingest  <run-id> <solver.json> [solver2.json ...]
 *   node scripts/study-bank/attack-cohort.mjs report  [run-id]
 *
 * ── Why this exists ──────────────────────────────────────────────────
 * Every attack run before this one was hand-assembled: pull some items,
 * hand-build a blind file, read the score once, write it in a markdown
 * file. The measurement then existed nowhere the database could see, so
 * the only safe answer to "is this cohort clean?" was always "re-run
 * it". Three thousand items were attacked and the bank recorded nothing.
 *
 * The property that stops the repetition is in `prepare`: it samples
 * ONLY items with no row in study_item_attacks. Run it twice and the
 * second run offers you what the first did not cover. Finish a cohort
 * and it returns nothing, which is how you know you are done rather
 * than by remembering.
 *
 * ── Why the solve step is not in here ────────────────────────────────
 * Solvers must not share a process — or an author — with the thing
 * being measured. `prepare` writes a blind file, you solve it with
 * independent agents, `ingest` scores and persists. Keeping the solve
 * outside is what makes the blindness real rather than asserted.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'

const DIR = 'scripts/study-bank'

function loadEnv() {
  const raw = readFileSync(process.cwd() + '/.env.local', 'utf8')
  return Object.fromEntries(raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}
const env = loadEnv()
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

const [cmd, runId, ...rest] = process.argv.slice(2)
const argOf = f => { const i = rest.indexOf(f); return i === -1 ? null : rest[i + 1] }

/** Deterministic shuffle so a run can be reproduced from its id alone. */
function rng(seed) {
  let h = 2166136261
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const shuffle = (arr, rand) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

async function prepare() {
  const domain = argOf('--domain')
  const limit = Number(argOf('--limit') ?? 60)
  // --all takes `limit` items from EVERY cohort in one file, because the
  // expensive part of this loop is the solver pass, not the query. One
  // pass over 20 cohorts costs the same three agent calls as one cohort
  // and tells you where to look; twenty separate runs cost sixty.
  const all = rest.includes('--all')
  const family = argOf('--family')
  if (!runId || (!domain && !all)) {
    console.error('usage: prepare <run-id> (--domain "<d>" | --all [--family sat]) [--limit 60]'); process.exit(1)
  }

  // Everything already measured, in ANY run. This is the anti-repetition
  // rule and it is deliberately not scoped to this run id.
  // Same 1000-row cap applies here, and under-reading it would re-attack
  // items already measured — the exact repetition this script exists to
  // stop.
  const seen = new Set()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_attacks').select('item_id').range(from, from + 999)
    if (error) { console.error('could not read prior attacks:', error.message); process.exit(1) }
    for (const r of data ?? []) seen.add(r.item_id)
    if (!data || data.length < 1000) break
  }

  /*
   * PAGINATED, and that is not defensive coding.
   *
   * PostgREST caps a response at 1000 rows regardless of .limit(), and
   * it does so SILENTLY — the first version of this read asked for 6000
   * and reported "0 of 1000" for a family holding 1,770 items. CLAUDE.md
   * records the same trap producing a verifier that reported "0
   * problems" because the rows containing the defect were never loaded.
   *
   * A truncated read here would be worse than useless: it would sample
   * only the first page, mark those items measured, and leave the rest
   * looking like they had been considered and passed over.
   */
  const rows = []
  for (let from = 0; ; from += 1000) {
    let q = db.from('study_item_bank').select('id, item, domain, family').eq('archived', false)
    if (domain) q = q.eq('domain', domain)
    if (family) q = q.eq('family', family)
    const { data, error } = await q.range(from, from + 999)
    if (error) { console.error('bank read failed:', error.message); process.exit(1) }
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }

  const fresh = (rows ?? []).filter(r => !seen.has(r.id))
  if (fresh.length === 0) {
    console.log(`Nothing to do — all ${rows?.length ?? 0} items in "${domain}" already have an attack result.`)
    return
  }

  const rand = rng(runId)
  // Per-cohort quota under --all, so a 433-item domain cannot crowd out
  // a 48-item one and leave it looking measured when it is not.
  let picked
  if (all) {
    const byDomain = {}
    for (const r of shuffle(fresh, rand)) (byDomain[r.domain] ??= []).push(r)
    picked = Object.values(byDomain).flatMap(list => list.slice(0, limit))
  } else {
    picked = shuffle(fresh, rand).slice(0, limit)
  }

  const blind = {}, key = {}
  let skipped = 0
  picked.forEach((row, i) => {
    const it = row.item ?? {}
    // Field names verified against a real row, not guessed: the bank
    // stores `choices` (array of strings) and `correct_answer` (the
    // string itself, not an index or a letter). An earlier version of
    // this script guessed `answer`/`correct`/`key` and skipped 40/40
    // items as malformed — which is exactly why prepare refuses to
    // write an empty run instead of quietly producing one.
    const choices = it.choices ?? it.options
    const answer = it.correct_answer ?? it.answer ?? it.correct ?? it.key
    if (!Array.isArray(choices) || choices.length < 3 || answer == null) { skipped++; return }
    // The KEY's text, so re-lettering cannot lose it.
    const answerText = typeof answer === 'number' ? choices[answer]
      : (choices.find(c => c === answer) ?? choices[{ A: 0, B: 1, C: 2, D: 3 }[String(answer).trim().toUpperCase()] ?? -1])
    if (answerText == null) { skipped++; return }

    const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, choices.length)
    const order = shuffle(choices, rand)          // per-item re-letter: position carries nothing
    const n = String(i + 1)
    // `passage` / `audio` / `transcript` are the SOURCE and are the whole
    // point of the withholding — they are never copied into the blind
    // file. Only the prompt and the options cross this line.
    blind[n] = {
      stem: it.prompt ?? it.question ?? it.stem ?? '',
      options: Object.fromEntries(order.map((t, k) => [letters[k], t])),
    }
    key[n] = { letter: letters[order.indexOf(answerText)], _item_id: row.id }
  })

  writeFileSync(`${DIR}/${runId}.blind.json`, JSON.stringify(blind, null, 1))
  writeFileSync(`${DIR}/${runId}.key.json`, JSON.stringify(key, null, 1))
  console.log(`scope       : ${domain ?? (family ? family + ' (all cohorts)' : 'ALL cohorts')}`)
  console.log(`already done: ${rows.length - fresh.length} of ${rows.length}`)
  console.log(`prepared    : ${Object.keys(blind).length} items${skipped ? ` (${skipped} skipped — malformed)` : ''}`)
  console.log(`wrote       : ${DIR}/${runId}.blind.json  (SOURCE WITHHELD — solve this)`)
}

async function ingest() {
  const solverPaths = rest.filter(a => a.endsWith('.json'))
  if (!runId || solverPaths.length === 0) {
    console.error('usage: ingest <run-id> <solver.json> [...]'); process.exit(1)
  }
  const key = JSON.parse(readFileSync(`${DIR}/${runId}.key.json`, 'utf8'))
  const solvers = solverPaths.map(p => JSON.parse(readFileSync(p, 'utf8')))

  // REFUSE an incomplete solver file rather than scoring the subset it
  // happens to contain — a partial file scored as if whole is a number
  // that looks fine and means nothing.
  const nums = Object.keys(key)
  for (let i = 0; i < solvers.length; i++) {
    const missing = nums.filter(n => !solvers[i]?.[n]?.pick)
    if (missing.length) {
      console.error(`REFUSING: ${solverPaths[i]} is missing ${missing.length}/${nums.length} answers.`)
      process.exit(2)
    }
  }

  const rows = nums.map(n => ({
    item_id: key[n]._item_id,
    run_id: runId,
    solvers: solvers.length,
    correct: solvers.filter(s => s[n].pick === key[n].letter).length,
  }))

  const { error } = await db.from('study_item_attacks').insert(rows)
  if (error) { console.error('write failed:', error.message); process.exit(1) }

  const totalCorrect = rows.reduce((a, r) => a + r.correct, 0)
  const totalPicks = rows.length * solvers.length
  const allGot = rows.filter(r => r.correct === r.solvers).length
  // Control: best single fixed letter, i.e. what guessing one letter scores.
  const spread = {}
  for (const n of nums) spread[key[n].letter] = (spread[key[n].letter] ?? 0) + 1
  const control = Math.max(...Object.values(spread)) / nums.length

  console.log(`run          : ${runId}`)
  console.log(`items        : ${rows.length}   solvers: ${solvers.length}`)
  console.log(`blind score  : ${(100 * totalCorrect / totalPicks).toFixed(1)}%`)
  console.log(`control      : ${(100 * control).toFixed(1)}%  (best fixed letter)`)
  console.log(`margin       : ${(100 * (totalCorrect / totalPicks - control)).toFixed(1)}pts`)
  console.log(`every solver got it: ${allGot}/${rows.length}  <- the items to act on`)
  console.log(`persisted    : ${rows.length} rows in study_item_attacks`)
}

async function report() {
  const { data, error } = await db.from('study_item_attack_coverage').select('*')
  if (error) { console.error(error.message); process.exit(1) }
  const rows = (data ?? []).sort((a, b) => b.unmeasured - a.unmeasured)
  console.log('family  domain                                items  attacked  unmeasured  blind%')
  for (const r of rows) {
    console.log(
      `${(r.family ?? '?').padEnd(7)} ${(r.domain ?? '?').slice(0, 36).padEnd(37)} ` +
      `${String(r.items).padStart(5)} ${String(r.attacked).padStart(9)} ${String(r.unmeasured).padStart(11)}` +
      `${r.blind_score_pct == null ? '       —' : String(r.blind_score_pct).padStart(8)}`)
  }
  const tot = rows.reduce((a, r) => a + r.items, 0)
  const un = rows.reduce((a, r) => a + r.unmeasured, 0)
  console.log(`\nTOTAL ${tot} items, ${un} unmeasured (${(100 * un / tot).toFixed(1)}%)`)
}

const run = { prepare, ingest, report }[cmd]
if (!run) {
  console.error('usage: attack-cohort.mjs <prepare|ingest|report> ...'); process.exit(1)
}
await run()
