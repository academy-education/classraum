#!/usr/bin/env node
/**
 * attack-generated.mjs — the blind attack, pointed at the GENERATOR.
 *
 * ── Why this exists ──────────────────────────────────────────────────
 * Every QC number in this repo describes `study_item_bank`. But a live
 * test can serve a question the generator produced on the spot, and
 * those are never bank rows — so the entire measurement programme has
 * been blind to the surface students actually hit.
 *
 * `study_attempts` records what was really served. `item_id` is the
 * discriminator: NOT NULL means the question was drawn from the bank
 * (already measured), NULL means the generator made it (never
 * measured). As of 2026-08-05 that is 951 distinct generated questions,
 * 752 of them clean 4-option items, against 379 from the bank.
 *
 * CAVEAT, carried deliberately: these attempts are internal testing,
 * not real student traffic. That makes the ATTEMPT data useless for
 * item statistics — but the QUESTIONS are genuine generator output, and
 * guessability is a property of the question, not of who answered it.
 * This measures the questions. It says nothing about students.
 *
 * ── The threat model, unchanged ──────────────────────────────────────
 * Keep the stem, withhold the SOURCE (passage / transcript). A solver
 * that still picks the key was reading the options, not the material.
 * Score against the sample's own best fixed-letter control, never 25% —
 * see ANSWERABILITY-GATE.md.
 *
 * usage:
 *   attack-generated.mjs sample [n]     write .blind.json + .key.json
 *   attack-generated.mjs score          score solver files against key
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const TAG = 'generated-2026-08-05'
const LETTERS = ['A', 'B', 'C', 'D']
const base = new URL(`./${TAG}`, import.meta.url).pathname

const SEED = 20260805
function rng(s) {
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const rand = rng(SEED)
const shuffled = a => { a = [...a]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a }

function loadEnv() {
  const raw = readFileSync(process.cwd() + '/.env.local', 'utf8')
  return Object.fromEntries(raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}

/*
 * Fields that carry the SOURCE and must never reach the solver. Listed
 * explicitly and allow-listed on the way out rather than deleted on the
 * way in: a generated question is free-form JSON from a model, so a
 * deny-list would leak the first time the generator invented a new key
 * name for the transcript.
 */
const KEEP = ['prompt', 'question', 'stem']

async function sample(n) {
  const env = loadEnv()
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } })

  /*
   * PAGINATED, because `.limit(5000)` does NOT lift the cap.
   *
   * The first version of this function used `.limit(5000)` with a
   * comment claiming it guarded against PostgREST's silent 1000-row
   * ceiling. It does not: the server's max-rows setting wins, and the
   * read came back with exactly 1000 of 1030 rows while the script
   * printed a number that looked deliberate. A comment asserting a
   * guarantee is not the guarantee — the same lesson this repo has
   * already paid for twice.
   *
   * `.range()` and a short-page terminator is the actual fix, and the
   * caller below prints the total so a future cap change is visible
   * rather than silent.
   */
  const PAGE = 1000
  const data = []
  for (let from = 0; ; from += PAGE) {
    const { data: page, error } = await admin
      .from('study_attempts')
      .select('id, question, session_id')
      .is('item_id', null)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    data.push(...(page ?? []))
    if (!page || page.length < PAGE) break
  }

  const seen = new Set()
  const usable = []
  let sourceInStem = 0
  for (const r of data ?? []) {
    const q = r.question
    if (!q || !Array.isArray(q.choices) || q.choices.length !== 4) continue
    if (typeof q.correct_answer !== 'string') continue
    const keyIndex = q.choices.indexOf(q.correct_answer)
    if (keyIndex < 0) continue
    if (new Set(q.choices.map(c => String(c).trim())).size !== 4) continue
    const stem = KEEP.map(k => q[k]).find(v => typeof v === 'string' && v.trim())
    if (!stem) continue

    /*
     * SOURCE-IN-STEM items are excluded, and counted.
     *
     * The generator sometimes writes the whole passage into `prompt`
     * instead of a separate passage field. For those the attack cannot
     * withhold anything — the solver is handed the material and a
     * correct answer means it read the passage, exactly the way a maths
     * stem contains its own problem (see bank-targets.ts). Leaving one
     * in silently inflates the blind score with a legitimate solve.
     *
     * The first render caught one at 1015 chars against a median of 88.
     * The threshold is deliberately generous: a real stem in this bank
     * runs 38-189 chars, so 400 excludes passages without trimming
     * genuinely long questions.
     */
    if (stem.length > 400) { sourceInStem++; continue }
    // Dedup on content, not on attempt id — the same generated question
    // is served to more than one session and would otherwise dominate.
    const sig = JSON.stringify([stem, [...q.choices].sort()])
    if (seen.has(sig)) continue
    seen.add(sig)
    usable.push({ stem, choices: q.choices, keyIndex, section: q.section ?? null, type: q.type ?? null })
  }

  console.log(`generated attempts read: ${data.length}`)
  console.log(`distinct usable 4-option items: ${usable.length}`)
  console.log(`EXCLUDED, passage written into the stem: ${sourceInStem}`)
  if (usable.length < n) throw new Error(`only ${usable.length} usable, asked for ${n}`)

  const picked = shuffled(usable).slice(0, n)

  // Key letters assigned FLAT. A free shuffle of 16 once produced
  // A:9 B:1 C:4 D:2 — a 56.3% control, at which a solver's score is
  // uninterpretable.
  const slots = shuffled(picked.map((_, i) => LETTERS[i % 4]))

  const blind = [], key = {}
  picked.forEach((it, i) => {
    const id = String(i + 1)
    const letter = slots[i]
    const rest = shuffled(it.choices.filter((_, ix) => ix !== it.keyIndex))
    const opts = LETTERS.map(L => (L === letter ? it.choices[it.keyIndex] : rest.pop()))
    if (opts.some(o => o === undefined)) throw new Error(`item ${id}: unfilled slot`)
    if (opts[LETTERS.indexOf(letter)] !== it.choices[it.keyIndex]) throw new Error(`item ${id}: key misplaced`)
    blind.push({ id, question: it.stem, options: Object.fromEntries(opts.map((o, ix) => [LETTERS[ix], o])) })
    key[id] = { letter, section: it.section, type: it.type }
  })

  const outs = ['.blind.json', '.key.json'].map(x => base + x)
  if (outs.some(existsSync) && !process.argv.includes('--force')) {
    console.error('REFUSING TO OVERWRITE an existing render — solver files were built against it.')
    process.exit(1)
  }
  writeFileSync(outs[0], JSON.stringify(blind, null, 2))
  writeFileSync(outs[1], JSON.stringify(key, null, 2))

  const counts = LETTERS.map(L => Object.values(key).filter(k => k.letter === L).length)
  console.log(`\nitems ${blind.length}  seed ${SEED}`)
  console.log(`key letters  ${LETTERS.map((L, i) => `${L}:${counts[i]}`).join('  ')}`)
  console.log(`best fixed-letter control = ${(100 * Math.max(...counts) / blind.length).toFixed(1)}%`)

  // Belt and braces: nothing over the threshold may survive into the
  // render, or the run measures reading comprehension instead of
  // guessability.
  const leaked = blind.filter(b => b.question.length > 400)
  if (leaked.length) throw new Error(`${leaked.length} source-in-stem items reached the render`)
  console.log(`longest stem in render: ${Math.max(...blind.map(b => b.question.length))} chars`)
}

function score() {
  const key = JSON.parse(readFileSync(base + '.key.json', 'utf8'))
  const ids = Object.keys(key)
  const counts = LETTERS.map(L => ids.filter(i => key[i].letter === L).length)
  const control = 100 * Math.max(...counts) / ids.length

  const rows = []
  for (const s of ['a', 'b', 'c']) {
    const f = `${base}.solver-${s}.json`
    if (!existsSync(f)) continue
    const ans = JSON.parse(readFileSync(f, 'utf8'))
    const got = ids.filter(i => (ans[i]?.answer ?? ans[i]) === key[i].letter).length
    const spread = LETTERS.map(L => ids.filter(i => (ans[i]?.answer ?? ans[i]) === L).length)
    rows.push({ s, got, pct: 100 * got / ids.length, spread: spread.join('/') })
  }
  if (!rows.length) { console.error('no solver files found'); process.exit(1) }

  for (const r of rows) console.log(`solver ${r.s}  ${r.got}/${ids.length} = ${r.pct.toFixed(1)}%  spread ${r.spread}`)
  const mean = rows.reduce((a, r) => a + r.pct, 0) / rows.length
  console.log(`\nMEAN ${mean.toFixed(1)}%   control ${control.toFixed(1)}%   margin ${(mean - control > 0 ? '+' : '')}${(mean - control).toFixed(1)}pts`)
  console.log(`\nreference: live bank choose_response +40.4, official ETS reply items +25.5`)
  // Identical spreads across independent solvers is the signature of a
  // shared rule rather than three readers reasoning separately.
  const uniq = new Set(rows.map(r => r.spread))
  console.log(uniq.size === 1 ? 'WARNING: all solvers produced an identical spread.' : `spreads differ (${uniq.size} distinct) — healthy`)
}

const cmd = process.argv[2]
if (cmd === 'sample') await sample(Number(process.argv[3]) || 24)
else if (cmd === 'score') score()
else { console.error('usage: attack-generated.mjs sample [n] | score'); process.exit(1) }
