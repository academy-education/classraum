/**
 * Merge and render the Choose-a-Response rebuild pilot (crv2) for both
 * gates in one pass.
 *
 * ── Why this batch was authored by FOUR agents, not one ──────────────
 * `choose-response-repair-v1` rewrote all 213 distractors of the live
 * cohort and failed every gate: the blind margin fell 55.9 -> 40.4
 * against a 29.5 ceiling and stopped there. The recorded reason is that
 * the residual signal is RELATIONAL — three distractors form a matched
 * set and the key sits outside it — which is a property of the SET, so
 * per-option repair cannot reach it.
 *
 * `nearmiss-v1` failed the other way: one agent authoring 16 items to
 * one brief wrote 16 concessions out of 16 and scored 91.7% blind. A
 * candidate answers all sixteen with "respond to the second clause".
 *
 * So the acts and settings are DEALT to four authors who cannot see
 * each other's work, rather than requested from one who can. Uniformity
 * is the failure mode; assigning the axis is the only mechanism here
 * that does not depend on an author remembering to vary it.
 *
 * ── What this script refuses to do ───────────────────────────────────
 * Render a batch that already carries a countable tell. Every check
 * below has a real failure behind it, and each is cheap next to a
 * solver run. Structural checks only: whether an act is genuinely
 * varied is semantic and stays with the graders.
 *
 * Writes, write-once unless --force (a re-render once overwrote a key
 * file that downstream inputs had already been built against):
 *
 *   crv2.solver-input.json      blind — stem kept, stimulus stripped
 *   crv2.withsource-input.json  stimulus INCLUDED, same ids and letters
 *   crv2.key.json               shared by both, so the two runs compare
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const SEED = 20260806
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

const LETTERS = ['A', 'B', 'C', 'D']
const here = p => new URL(p, import.meta.url)

const items = []
for (const who of ['a', 'b', 'c', 'd']) {
  const f = here(`./crv2-${who}.json`)
  if (!existsSync(f)) { console.error(`MISSING crv2-${who}.json — all four slices are required`); process.exit(1) }
  const slice = JSON.parse(readFileSync(f, 'utf8'))
  for (const it of slice.items) items.push({ ...it, author: who })
}

const problems = []
const warn = []

items.forEach((it, i) => {
  const n = i + 1
  if (!Array.isArray(it.distractors) || it.distractors.length !== 3) {
    problems.push(`item ${n}: ${it.distractors?.length} distractors, expected 3`)
    return
  }
  const all = [it.key, ...it.distractors]
  if (new Set(all).size !== 4) problems.push(`item ${n}: duplicate option text`)
  if (all.some(o => !o?.trim())) problems.push(`item ${n}: empty option`)
  if (!it.stimulus?.trim()) problems.push(`item ${n}: no stimulus`)

  // The brief's own numeric caps.
  const words = (it.stimulus.match(/"(.*)"/s)?.[1] ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length < 5 || words.length > 14) warn.push(`item ${n}: stimulus ${words.length} words (brief says 5-14)`)
  const lens = all.map(o => o.length)
  const ratio = Math.max(...lens) / Math.min(...lens)
  if (ratio > 1.6) warn.push(`item ${n}: longest/shortest = ${ratio.toFixed(2)}x (cap 1.6)`)

  /*
   * The explanation is written against option CONTENT because the
   * insert helper shuffles choices. 72 banked items were verified
   * wrong this way on 2026-07-30 — the student reading a wrong-answer
   * explanation was pointed at a different option than the one
   * described.
   */
  if (/\b(choice|option)\s*\d|\boption\s+[A-D]\b|\bthe (second|third|fourth|first) option\b|\([A-D]\)/i.test(it.explanation ?? '')) {
    problems.push(`item ${n}: explanation names an option by position`)
  }
})

/*
 * An option repeated ACROSS items lets a solver link them, which is how
 * an earlier batch leaked its own structure.
 */
const seen = new Map()
items.forEach((it, i) => {
  for (const o of [it.key, ...(it.distractors ?? [])]) {
    if (seen.has(o)) problems.push(`option shared by items ${seen.get(o)} and ${i + 1}: "${o.slice(0, 40)}…"`)
    seen.set(o, i + 1)
  }
})

/*
 * Every setting distinct, and no act over the brief's cap of 3. These
 * are the two axes that were DEALT, so a violation means an author
 * ignored its slice — worth failing loudly rather than measuring.
 */
const settings = items.map(i => (i.setting ?? '').toLowerCase().trim())
for (const [s, c] of Object.entries(settings.reduce((m, s) => ((m[s] = (m[s] || 0) + 1), m), {}))) {
  if (c > 1) problems.push(`setting "${s}" used ${c} times — the brief says no scenario twice`)
}
const acts = items.map(i => (i.act ?? '').toLowerCase().trim())
const actCounts = acts.reduce((m, a) => ((m[a] = (m[a] || 0) + 1), m), {})
for (const [a, c] of Object.entries(actCounts)) {
  if (c > 3) problems.push(`speech act "${a}" used ${c} times — cap is 3 in a batch of 16`)
}

/*
 * The concessive shape is THE tell of the live cohort (94.4%) and of
 * nearmiss-v1 (87.5%). The official ETS corpus scores 0.0%. A pivot in
 * the stimulus is not automatically fatal — one or two is within the
 * official form's tolerance — so this warns and prints, and the number
 * goes in the writeup either way.
 */
const PIVOT = /(^|[\s,—–-])(but|though|although|however|it's just that|just that|still|only|actually)([\s,]|$)/i
const pivots = items.filter(it => PIVOT.test(it.stimulus)).length
if (pivots > 3) problems.push(`${pivots}/16 stimuli carry a concessive pivot — live cohort 94.4%, official ETS 0.0%`)

/*
 * Key length RANK across the batch. An audit on 2026-07-29 found the
 * key was the longest of four in 74.3% of banked Listening items;
 * always picking the longest scored about three quarters.
 */
const ranks = items.map(it => {
  const sorted = [it.key, ...it.distractors].sort((a, b) => b.length - a.length)
  return sorted.indexOf(it.key) + 1
})
const rankCounts = [1, 2, 3, 4].map(r => ranks.filter(x => x === r).length)
const worstRank = Math.max(...rankCounts) / items.length
if (worstRank > 0.4) problems.push(`key at one length rank in ${(100 * worstRank).toFixed(0)}% of items (cap 40%) — ranks ${rankCounts.join('/')}`)

if (problems.length) {
  console.error(`REFUSING TO RENDER — ${problems.length} problem(s):`)
  for (const p of problems) console.error('  - ' + p)
  if (warn.length) { console.error('\nalso, not blocking:'); for (const w of warn) console.error('  - ' + w) }
  process.exit(1)
}

/*
 * Key letters assigned FLAT (each letter keys 4 of 16), not left to the
 * shuffle. A free shuffle of 16 previously produced A:9 B:1 C:4 D:2 — a
 * 56.3% fixed-letter control, at which a solver's score means nothing.
 */
const targetLetters = shuffled(LETTERS.flatMap(L => [L, L, L, L]))

const blindOut = [], wsOut = [], key = {}
shuffled(items).forEach((it, i) => {
  const id = String(i + 1)
  const letter = targetLetters[i]
  const rest = shuffled(it.distractors)
  const opts = LETTERS.map(L => (L === letter ? it.key : rest.pop()))
  if (opts.some(o => o === undefined)) throw new Error(`item ${id}: option slot unfilled`)
  if (opts[LETTERS.indexOf(letter)] !== it.key) throw new Error(`item ${id}: key misplaced`)

  const question = 'Which is the most natural reply?'
  const options = Object.fromEntries(opts.map((o, n) => [LETTERS[n], o]))
  blindOut.push({ id, question, options })
  wsOut.push({ id, stimulus: it.stimulus, question, options })
  key[id] = { letter, act: it.act, setting: it.setting, author: it.author }
})

const base = here('./crv2').pathname
const outs = ['.solver-input.json', '.withsource-input.json', '.key.json'].map(x => base + x)
const existing = outs.filter(existsSync)
if (existing.length && !process.argv.includes('--force')) {
  console.error('REFUSING TO OVERWRITE an existing render:')
  for (const f of existing) console.error('  ' + f.split('/').pop())
  console.error('\nDownstream solver files were built against it. Use --force and re-derive.')
  process.exit(1)
}
writeFileSync(outs[0], JSON.stringify(blindOut, null, 2))
writeFileSync(outs[1], JSON.stringify(wsOut, null, 2))
writeFileSync(outs[2], JSON.stringify(key, null, 2))

const counts = LETTERS.map(L => Object.values(key).filter(k => k.letter === L).length)
console.log(`items ${blindOut.length}  seed ${SEED}`)
console.log(`key letters   ${LETTERS.map((L, n) => `${L}:${counts[n]}`).join('  ')}`)
console.log(`control       ${(100 * Math.max(...counts) / blindOut.length).toFixed(1)}%  (best fixed letter)`)
console.log(`key length rank (1=longest)  ${rankCounts.join('/')}`)
console.log(`concessive pivots  ${pivots}/${items.length}   (live cohort 94.4%, official ETS 0.0%)`)
console.log(`acts  ${Object.entries(actCounts).map(([a, c]) => `${a}:${c}`).join('  ')}`)

// The blind file must not contain the stimulus. Asserted, not assumed:
// a render that leaks it scores the wrong thing and looks fine.
const blindText = JSON.stringify(blindOut)
const leaked = items.filter(it => {
  const inner = (it.stimulus.match(/"(.*)"/s)?.[1] ?? it.stimulus).trim()
  return inner.length > 20 && blindText.includes(inner.slice(0, 20))
})
console.log(`\nblind file carries no stimulus: ${leaked.length === 0}`)
if (leaked.length) { console.error('LEAKED:', leaked.map(l => l.stimulus)); process.exit(1) }

if (warn.length) { console.log(`\n${warn.length} warning(s):`); for (const w of warn) console.log('  - ' + w) }
