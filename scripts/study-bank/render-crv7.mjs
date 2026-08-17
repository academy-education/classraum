/**
 * CR-V7 render — sixth rebuild attempt of Choose a Response.
 *
 *   node scripts/study-bank/render-crv7.mjs [--force]
 *
 * ── The method, and why it is different from cr-v1..v6 ──────────────
 * Every prior attempt authored the KEY as "the reply to the real line"
 * and the distractors some other way (a roster, near-misses, varied
 * stimuli). That authorship asymmetry is the one invariant that
 * survived all five failures, and every solver in every round described
 * it: "the key takes up the news and does something about it; the
 * distractors are the alternative states of the world."
 *
 * cr-v7 removes the provenance instead of trying to hide it. Each item
 * is FOUR mutually exclusive worlds authored symmetrically — each world
 * has a spoken line AND a reply, and each world's line must quotably
 * kill the other three replies. Only after the text is frozen does a
 * SEEDED RNG in this script choose which world is actually spoken.
 * The key is therefore statistically independent of every text feature:
 * expected blind margin 0 by construction, not by discipline.
 *
 * ── Pre-committed before any item existed (session 2026-08-18) ──────
 *   selection seed 20260818; re-roll +1 ONLY on a stimulus-kind or
 *     key-act quota violation (>25% of batch), every re-roll logged
 *   key letters dealt flat 3/3/3/3 → control 25.0% by construction
 *   kill rule (standing pre-registration): margin >= +30 KILLED,
 *     <= +25 clear, 25-30 inconclusive at n=12 → fresh 12, re-attack
 *   NO post-selection edits to any line or option. A defective item is
 *     discarded whole. (The cr-v5 lesson: pre-flight gates authoring,
 *     it never drives rewriting.)
 *
 * Pre-flight REPORTS every structural number (length rank, typography,
 * pivots) and REFUSES only on hard schema/answerability violations.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const here = p => new URL(p, import.meta.url)
const argv = process.argv.slice(2)
const argOf = f => { const i = argv.indexOf(f); return i === -1 ? null : argv[i + 1] }
// S2 batches: --in crv7-b3-quads.json --out crv7-b3 --seed-offset 300
// Seed scheme pre-committed 2026-08-18: base 20260818 + 100*batchIndex.
const IN = argOf('--in') ?? 'crv7-quads.json'
const OUT = argOf('--out') ?? 'crv7-pilot'
const SEED = 20260818 + Number(argOf('--seed-offset') ?? 0)

function rng(s) {
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

const LETTERS = ['A', 'B', 'C', 'D']
const quadsPath = here('./' + IN)
if (!existsSync(quadsPath)) { console.error('MISSING ' + IN); process.exit(1) }
const batch = JSON.parse(readFileSync(quadsPath, 'utf8'))
const items = batch.items

const problems = []
const warn = []

const norm = s => (s ?? '')
  .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
  .replace(/\s+/g, ' ').trim().toLowerCase()

const KINDS = ['good news', 'bad news', 'neutral info', 'question', 'request', 'offer', 'correction']

items.forEach((it, i) => {
  const n = it.localId ?? String(i + 1)
  if (!Array.isArray(it.worlds) || it.worlds.length !== 4) {
    problems.push(`item ${n}: ${it.worlds?.length} worlds, expected 4`); return
  }
  const replies = it.worlds.map(w => w.reply)
  const lines = it.worlds.map(w => w.line)
  if (new Set(replies.map(norm)).size !== 4) problems.push(`item ${n}: duplicate reply text`)
  if (replies.some(r => !r?.trim()) || lines.some(l => !l?.trim())) problems.push(`item ${n}: empty line or reply`)

  it.worlds.forEach((w, wi) => {
    const words = (w.line ?? '').trim().split(/\s+/).filter(Boolean)
    if (words.length < 5 || words.length > 14) warn.push(`item ${n} world ${wi}: line ${words.length} words (spec 5-14)`)
    if (!KINDS.includes(w.kind)) problems.push(`item ${n} world ${wi}: kind "${w.kind}" not one of the seven canonical kinds`)
    if (!w.explanationIfSpoken?.trim()) problems.push(`item ${n} world ${wi}: no explanationIfSpoken`)
    if (/\b(choice|option)\s*\d|\boption\s+[A-D]\b|\bthe (second|third|fourth|first) option\b|\([A-D]\)/i
      .test(w.explanationIfSpoken ?? '')) problems.push(`item ${n} world ${wi}: explanation names an option by position`)

    // EVERY world's line must quotably kill the other three replies —
    // not just the world that ends up selected, because selection is
    // post-hoc and any world could have been the item.
    for (let j = 0; j < 4; j++) {
      if (j === wi) continue
      const kill = w.kills?.[String(j)]
      if (!kill?.trim()) { problems.push(`item ${n} world ${wi}: no kill for reply ${j}`); continue }
      const spans = [...kill.matchAll(/["“”]([^"“”]{2,})["“”]/g)].map(m => m[1])
      // b4 quoted its spans with straight single quotes; accept those too,
      // but only spans of 2+ words so apostrophes/contractions cannot match.
      // Boundary-delimited so contractions inside the span ("There's")
      // do not terminate it; only 2+ word spans, so apostrophes never match.
      for (const m of kill.matchAll(/(?:^|[\s(])'([^]+?)'(?=[\s,.;:)—–-]|$)/g)) if (m[1].trim().includes(' ')) spans.push(m[1])
      const stim = norm(w.line)
      const present = q => {
        const parts = q.split(/\s*(?:\.\.\.|…)\s*/).map(x => x.trim()).filter(Boolean)
        return parts.length > 0 && parts.every(x => stim.includes(x))
      }
      const candidates = spans.length ? spans : [kill]
      // Prefer the LONGEST present span: a kill citing both "Bring" and
      // "next time" is sound, and failing it on the one-word span is a
      // checker artifact, not an authoring defect.
      const hits = candidates.map(norm).filter(Boolean).filter(present)
      const hit = hits.sort((a, b) => b.split(' ').length - a.split(' ').length)[0]
      if (!hit) problems.push(`item ${n} world ${wi} kill for reply ${j}: quotes nothing in that world's line\n      kill: ${kill}\n      line: ${w.line}`)
      else if (hit.split(' ').length < 2) problems.push(`item ${n} world ${wi} kill for reply ${j}: quotes a single word`)
    }
  })

  const lens = replies.map(r => r.length)
  const ratio = Math.max(...lens) / Math.min(...lens)
  if (ratio > 1.6) warn.push(`item ${n}: reply longest/shortest = ${ratio.toFixed(2)}x (cap 1.6)`)
})

// no option or line shared across items, no scenario reuse
const seen = new Map()
items.forEach((it, i) => {
  for (const w of it.worlds ?? []) for (const t of [w.reply, w.line]) {
    if (seen.has(norm(t))) problems.push(`text shared by items ${seen.get(norm(t))} and ${it.localId}: "${(t ?? '').slice(0, 40)}…"`)
    seen.set(norm(t), it.localId)
  }
})
const settings = items.map(i => (i.setting ?? '').toLowerCase().trim())
for (const [s, c] of Object.entries(settings.reduce((m, s) => ((m[s] = (m[s] || 0) + 1), m), {})))
  if (c > 1) problems.push(`setting "${s}" used ${c} times`)

if (problems.length) {
  console.error(`REFUSING TO RENDER — ${problems.length} problem(s):`)
  for (const p of problems) console.error('  - ' + p)
  if (warn.length) { console.error('\nalso, not blocking:'); for (const w of warn) console.error('  - ' + w) }
  process.exit(1)
}

/*
 * SELECTION. Seeded, pre-committed, independent of the text. Re-roll
 * (seed+1) only if a realized stimulus KIND or key speech-act family
 * exceeds 25% of the batch — the accumulated mandatory quota — and log
 * every re-roll. The re-roll rule reads only the kind/act LABELS, never
 * the option text, so it cannot smuggle in a quality preference.
 */
const cap = Math.ceil(items.length * 0.25)
let seed = SEED, picks = null, rolls = 0
for (; rolls < 50; rolls++) {
  const rand = rng(seed)
  const p = items.map(it => Math.floor(rand() * 4))
  const kinds = p.map((wi, i) => items[i].worlds[wi].kind)
  const kc = kinds.reduce((m, k) => ((m[k] = (m[k] || 0) + 1), m), {})
  const acts = p.map((wi, i) => items[i].worlds[wi].keyAct ?? 'unlabelled')
  const ac = acts.reduce((m, k) => ((m[k] = (m[k] || 0) + 1), m), {})
  if (Math.max(...Object.values(kc)) <= cap && Math.max(...Object.values(ac)) <= cap) { picks = p; break }
  console.log(`re-roll ${rolls + 1}: seed ${seed} violated quota — kinds ${JSON.stringify(kc)} acts ${JSON.stringify(ac)}`)
  seed += 1
}
if (!picks) { console.error('quota unsatisfiable in 50 rolls — the WORLD SETS are too uniform; fix authoring'); process.exit(1) }

const rand = rng(seed + 7919) // letter/order stream, distinct from selection stream
const shuffled = a => { a = [...a]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a }

const targetLetters = shuffled(LETTERS.flatMap(L => Array(items.length / 4).fill(L)))

const blindOut = [], key = {}, assembled = []
shuffled(items.map((it, ix) => ({ it, wi: picks[ix] }))).forEach(({ it, wi }, i) => {
  const id = String(i + 1)
  const world = it.worlds[wi]
  const letter = targetLetters[i]
  const others = shuffled(it.worlds.filter((_, j) => j !== wi).map(w => w.reply))
  const opts = LETTERS.map(L => (L === letter ? world.reply : others.pop()))
  if (opts.some(o => o === undefined)) throw new Error(`item ${id}: option slot unfilled`)

  blindOut.push({ id, question: 'Which is the most natural reply?', options: Object.fromEntries(opts.map((o, k) => [LETTERS[k], o])) })
  key[id] = { letter, localId: it.localId, world: wi, kind: world.kind, act: world.keyAct, setting: it.setting }
  assembled.push({
    type: 'multiple_choice',
    passage: `Transcript: "${world.line}"`,
    passageGroupId: null,
    prompt: '[Choose a Response] Which is the most natural reply?',
    choices: opts,
    correct_answer: world.reply,
    difficulty: 'hard',
    listeningTask: 'choose_response',
    explanation: world.explanationIfSpoken,
    distractor_rationales: Object.fromEntries(
      it.worlds.map((w, j) => [w.reply, world.kills?.[String(j)] ?? null]).filter(([, v]) => v)),
    _crv7: { localId: it.localId, selectedWorld: wi, kind: world.kind, keyAct: world.keyAct, setting: it.setting },
  })
})

// ── pre-flight REPORT on the realized batch ──────────────────────────
const ranks = assembled.map(a => {
  const sorted = [...a.choices].sort((x, y) => y.length - x.length)
  return sorted.indexOf(a.correct_answer) + 1
})
const rankCounts = [1, 2, 3, 4].map(r => ranks.filter(x => x === r).length)
const FEATURES = [
  ['semicolon', s => s.includes(';')],
  ['em dash', s => /[—–]|( - )/.test(s)],
  ['question mark', s => s.includes('?')],
  ['two+ commas', s => (s.match(/,/g) ?? []).length >= 2],
  ['exclamation', s => s.includes('!')],
  ['hedge word', s => /\b(i thought|i gather|apparently|perhaps|i assumed)\b/i.test(s)],
  ['intensifier restatement', s => /\b(at all|outright|all week|in one go|entirely)\b/i.test(s)],
]
const tellLines = []
for (const [name, has] of FEATURES) {
  const keyRate = assembled.filter(a => has(a.correct_answer)).length / assembled.length
  const dis = assembled.flatMap(a => a.choices.filter(c => c !== a.correct_answer))
  const disRate = dis.filter(has).length / dis.length
  tellLines.push(`  ${name.padEnd(24)} keys ${(100 * keyRate).toFixed(0)}%  distractors ${(100 * disRate).toFixed(0)}%`)
  if ((keyRate >= 0.35 && disRate <= 0.08) || (disRate >= 0.35 && keyRate <= 0.08))
    warn.push(`typographic skew — ${name}: keys ${(100 * keyRate).toFixed(0)}% distractors ${(100 * disRate).toFixed(0)}%`)
}
const PIVOT = /(^|[\s,—–-])(but|though|although|however|it's just that|still|only|actually)([\s,]|$)/i
const pivots = assembled.filter(a => PIVOT.test(a.passage)).length
const numeric = assembled.filter(a => (a.passage.match(/\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|hundred)\b/gi) ?? []).length >= 2).length

const base = here('./' + OUT).pathname
const outs = ['.blind.json', '.key.json', '.items.json'].map(x => base + x)
if (outs.some(existsSync) && !process.argv.includes('--force')) {
  console.error('REFUSING TO OVERWRITE an existing render. Use --force and re-derive downstream files.')
  process.exit(1)
}
writeFileSync(outs[0], JSON.stringify(blindOut, null, 2))
writeFileSync(outs[1], JSON.stringify(key, null, 2))
writeFileSync(outs[2], JSON.stringify(assembled, null, 2))

const counts = LETTERS.map(L => Object.values(key).filter(k => k.letter === L).length)
const kindCounts = Object.values(key).reduce((m, k) => ((m[k.kind] = (m[k.kind] || 0) + 1), m), {})
const actCounts = Object.values(key).reduce((m, k) => ((m[k.act] = (m[k.act] || 0) + 1), m), {})
console.log(`items ${assembled.length}   selection seed ${seed} (${rolls} re-roll${rolls === 1 ? '' : 's'})   pre-committed base ${SEED}`)
console.log(`key letters   ${LETTERS.map((L, n) => `${L}:${counts[n]}`).join('  ')}   control ${(100 * Math.max(...counts) / assembled.length).toFixed(1)}%`)
console.log(`key length rank (1=longest)  ${rankCounts.join('/')}`)
console.log(`realized stimulus kinds  ${Object.entries(kindCounts).map(([k, c]) => `${k}:${c}`).join('  ')}`)
console.log(`realized key acts        ${Object.entries(actCounts).map(([k, c]) => `${k}:${c}`).join('  ')}`)
console.log(`concessive pivots in spoken lines  ${pivots}/${assembled.length}`)
console.log(`number-heavy spoken lines          ${numeric}/${assembled.length}`)
console.log('typography (key vs distractor):')
for (const l of tellLines) console.log(l)

const blindText = JSON.stringify(blindOut)
const leaked = assembled.filter(a => {
  const inner = (a.passage.match(/"(.*)"/s)?.[1] ?? '').trim()
  return inner.length > 20 && blindText.includes(inner.slice(0, 20))
})
console.log(`blind file carries no spoken line: ${leaked.length === 0}`)
if (leaked.length) { console.error('LEAKED:', leaked.map(l => l.passage)); process.exit(1) }
if (warn.length) { console.log(`\n${warn.length} warning(s) — REPORTED, not driving rewrites:`); for (const w of warn) console.log('  - ' + w) }
