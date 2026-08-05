/**
 * Merge and render crv3 — the 32-item Choose-a-Response rebuild.
 *
 * See CRV3-PREREGISTERED.md for the decision rule, written before the
 * batch was authored so the bar cannot move after the numbers land.
 *
 * ── What changed from crv2's render ──────────────────────────────────
 * One new gate, and it is the only mechanical purchase anyone has found
 * on the defect that failed round 2.
 *
 * Round 2 cleared the blind attack (+14.6 against a +29.5 ceiling) and
 * failed answerability: 6 of 16 items had a second defensible answer,
 * worse than the cohort it was replacing. Every author believed their
 * items were forced. The reader who found it named the mechanism —
 * "engages the detail" makes an option BETTER, it does not make the
 * alternative WRONG — and the fix is a different question: not "what
 * forces the key" but "quote the words that kill the runner-up".
 *
 * A quote is checkable. `secondBestKilledBy` must appear VERBATIM in
 * the stimulus, so an author who paraphrases, gestures at the general
 * situation, or reasons from the responder's private circumstances
 * fails here instead of at a reader three steps later.
 *
 * This does NOT verify that the quoted words actually rule the
 * runner-up out — that is semantic and stays with the with-source
 * readers. It verifies the author had to point at something real in
 * the utterance. That is a floor, not a ceiling, and round 2 shows the
 * floor was missing.
 *
 * Writes crv3.solver-input.json / crv3.withsource-input.json /
 * crv3.key.json, write-once unless --force.
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
const AUTHORS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

const items = []
for (const who of AUTHORS) {
  const f = here(`./crv3-${who}.json`)
  if (!existsSync(f)) { console.error(`MISSING crv3-${who}.json — all eight slices are required`); process.exit(1) }
  const slice = JSON.parse(readFileSync(f, 'utf8'))
  for (const it of slice.items) items.push({ ...it, author: who })
}

const problems = []
const warn = []

/** Loose normalisation so a quote is not failed over a curly apostrophe
 *  or doubled spacing. Word content still has to match. */
const norm = s => (s ?? '')
  .replace(/[‘’ʼ]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/[–—]/g, '-')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

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

  const words = (it.stimulus.match(/"(.*)"/s)?.[1] ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length < 5 || words.length > 14) warn.push(`item ${n}: stimulus ${words.length} words (brief says 5-14)`)
  const lens = all.map(o => o.length)
  const ratio = Math.max(...lens) / Math.min(...lens)
  if (ratio > 1.6) warn.push(`item ${n}: longest/shortest = ${ratio.toFixed(2)}x (cap 1.6)`)

  if (/\b(choice|option)\s*\d|\boption\s+[A-D]\b|\bthe (second|third|fourth|first) option\b|\([A-D]\)/i.test(it.explanation ?? '')) {
    problems.push(`item ${n}: explanation names an option by position`)
  }

  /*
   * THE NEW GATE. See the header.
   *
   * The field is prose containing a quote, not a bare quote: authors
   * write `"while you're at your clinical" — the speaker's own clause
   * has the responder elsewhere`. A first version required the WHOLE
   * field to be a substring of the stimulus and refused all 32 items.
   * That is a check failing on format while reading as a verdict on
   * substance — precisely the failure this repo keeps recording, and
   * it would have condemned a batch it had not examined.
   *
   * So: pull every quoted span out of the field and require at least
   * one of them to appear verbatim in the stimulus. If the author
   * quoted nothing, fall back to matching the whole field, which is
   * the bare-quote case.
   */
  const field = it.secondBestKilledBy
  const spans = [...(field ?? '').matchAll(/[""]([^""]{2,})[""]/g)].map(m => m[1])
  const candidates = spans.length ? spans : [field]
  /* An elided quote — `"Why's this ringing up ... when I'm buying it"` —
   * is honest quoting, so split on the ellipsis and require EVERY
   * fragment to appear. That verifies the same property (the words came
   * from the utterance) without failing the author for shortening. */
  const stim = norm(it.stimulus)
  const present = q => {
    const parts = q.split(/\s*(?:\.\.\.|…)\s*/).map(x => x.trim()).filter(Boolean)
    return parts.length > 0 && parts.every(x => stim.includes(x))
  }
  const hit = candidates.map(norm).filter(Boolean).find(present)

  if (!field?.trim()) {
    problems.push(`item ${n}: no secondBestKilledBy — the runner-up was never checked`)
  } else if (!hit) {
    problems.push(`item ${n}: secondBestKilledBy quotes nothing that appears in the stimulus\n` +
      `      claimed: ${field}\n` +
      `      stimulus: ${it.stimulus}`)
  } else if (hit.split(' ').length < 2) {
    problems.push(`item ${n}: secondBestKilledBy quotes a single word — quote the phrase that does the work`)
  }
  // The runner-up must actually be one of the distractors, not a
  // paraphrase of one the author wrote from memory.
  if (it.secondBest && !it.distractors.some(d => norm(d) === norm(it.secondBest))) {
    problems.push(`item ${n}: secondBest does not match any distractor verbatim`)
  }
})

const seen = new Map()
items.forEach((it, i) => {
  for (const o of [it.key, ...(it.distractors ?? [])]) {
    if (seen.has(o)) problems.push(`option shared by items ${seen.get(o)} and ${i + 1}: "${o.slice(0, 40)}…"`)
    seen.set(o, i + 1)
  }
})

const settings = items.map(i => (i.setting ?? '').toLowerCase().trim())
for (const [s, c] of Object.entries(settings.reduce((m, s) => ((m[s] = (m[s] || 0) + 1), m), {}))) {
  if (c > 1) problems.push(`setting "${s}" used ${c} times — the brief says no scenario twice`)
}

/*
 * Act cap. The brief says 3 per 16; at 32 items that is 6. Act labels
 * are free text across eight authors, so this normalises to the eight
 * canonical acts and counts those — an uncounted label is itself worth
 * knowing about.
 */
const ACTS = ['agree', 'question', 'refus', 'counter', 'premise', 'condition', 'redirect', 'fix']
const actOf = a => ACTS.find(k => (a ?? '').toLowerCase().includes(k)) ?? `UNMATCHED(${a})`
const actCounts = items.map(i => actOf(i.act)).reduce((m, a) => ((m[a] = (m[a] || 0) + 1), m), {})
for (const [a, c] of Object.entries(actCounts)) {
  if (a.startsWith('UNMATCHED')) problems.push(`act label "${a}" matches none of the eight canonical acts`)
  else if (c > 6) problems.push(`speech act "${a}" used ${c} times — cap is 6 in a batch of 32`)
}

const PIVOT = /(^|[\s,—–-])(but|though|although|however|it's just that|just that|still|only|actually)([\s,]|$)/i
const pivots = items.filter(it => PIVOT.test(it.stimulus)).length
if (pivots > 6) problems.push(`${pivots}/32 stimuli carry a concessive pivot — live cohort 94.4%, official ETS 0.0%`)

/*
 * The arithmetic template. Round 2 put three of sixteen on "the
 * speaker's numbers do not add up" and BOTH with-source readers found
 * it independently. The pre-registered cap is 2 in 32. A digit alone is
 * not the tell — a time or a room number is fine — so this only warns,
 * and the readers are asked the template question directly.
 */
const numeric = items.filter(it => (it.stimulus.match(/\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|hundred)\b/gi) ?? []).length >= 2)
if (numeric.length > 6) warn.push(`${numeric.length}/32 stimuli carry two or more number words — check the arithmetic template by hand`)

/*
 * TYPOGRAPHIC ASYMMETRY between key and distractors.
 *
 * Added mid-round, on an author's report. It rewrote two of its own
 * keys after noticing that three of its four carried a SEMICOLON and
 * none of its distractors did — a tell no rule in the brief names and
 * nothing else here would have seen. Length rank has been guarded since
 * the 74.3%-longest audit of 2026-07-29; every other surface feature
 * was unguarded, and "the key is the one with the dash" is the same
 * defect wearing different punctuation.
 *
 * Only the author who happened to look caught it. The point of putting
 * it here is that the next batch does not depend on someone looking.
 */
const FEATURES = [
  ['semicolon', s => s.includes(';')],
  ['em dash', s => /[—–]|( - )/.test(s)],
  ['question mark', s => s.includes('?')],
  ['two or more commas', s => (s.match(/,/g) ?? []).length >= 2],
  ['ellipsis', s => s.includes('...') || s.includes('…')],
  ['exclamation', s => s.includes('!')],
]
for (const [name, has] of FEATURES) {
  const keyRate = items.filter(it => has(it.key)).length / items.length
  const dis = items.flatMap(it => it.distractors)
  const disRate = dis.filter(has).length / dis.length
  // A feature carried by many keys and almost no distractors — or the
  // reverse — is a free rule. Direction matters: "never the key" is as
  // exploitable as "always the key", and a blind grader already found
  // five shapes that were never correct across one 26-item batch.
  const skewed = (keyRate >= 0.35 && disRate <= 0.08) || (disRate >= 0.35 && keyRate <= 0.08)
  const line = `${name}: keys ${(100 * keyRate).toFixed(0)}%  distractors ${(100 * disRate).toFixed(0)}%`
  if (skewed) problems.push(`typographic tell — ${line}`)
  else if (Math.abs(keyRate - disRate) > 0.25) warn.push(`typographic skew — ${line}`)
}

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

/* Key letters dealt FLAT — 8 of each over 32 — so the control is 25.0%
 * by construction. A free shuffle of 16 once produced a 56.3% control,
 * at which a solver's score means nothing. */
const targetLetters = shuffled(LETTERS.flatMap(L => Array(items.length / 4).fill(L)))

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
  key[id] = { letter, act: actOf(it.act), setting: it.setting, author: it.author }
})

const base = here('./crv3').pathname
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
console.log(`number-heavy stimuli  ${numeric.length}/${items.length}   (round 2 template was 3/16)`)
console.log(`acts  ${Object.entries(actCounts).map(([a, c]) => `${a}:${c}`).join('  ')}`)
console.log(`runner-up quotes verified against the stimulus: ${items.length}/${items.length}`)

const blindText = JSON.stringify(blindOut)
const leaked = items.filter(it => {
  const inner = (it.stimulus.match(/"(.*)"/s)?.[1] ?? it.stimulus).trim()
  return inner.length > 20 && blindText.includes(inner.slice(0, 20))
})
console.log(`\nblind file carries no stimulus: ${leaked.length === 0}`)
if (leaked.length) { console.error('LEAKED:', leaked.map(l => l.stimulus)); process.exit(1) }

if (warn.length) { console.log(`\n${warn.length} warning(s):`); for (const w of warn) console.log('  - ' + w) }
