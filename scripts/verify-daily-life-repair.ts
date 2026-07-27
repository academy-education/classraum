/**
 * Pre-insert QC for the Daily Life sibling/replacement batches.
 *
 * WHY A DEDICATED CHECKER
 * -----------------------
 * These items are authored by subagents against a rigid brief, and this repo
 * has now shipped three distinct cross-item TELLS from exactly that setup:
 * key-clustered-on-A, every-set-a-clean-ABCD-permutation, and hedge-only-in-
 * the-key. Each was invisible to the guard written for the previous one. So
 * this checks SHAPE (does the item work) and PATTERN (can a solver beat the
 * batch without reading) separately, and fails on either.
 *
 * Usage:
 *   npx tsx scripts/verify-daily-life-repair.ts A <in.json> <out.json> [...]
 *   npx tsx scripts/verify-daily-life-repair.ts B <in.json> <out.json> [...]
 * Exit 1 on any violation.
 */
import { readFileSync } from 'fs'

type Item = {
  type?: string; prompt?: string; choices?: string[]; passage?: string
  correct_answer?: string; passageGroupId?: string; readingTask?: string
  difficulty?: string; explanation?: string
  distractor_rationales?: { choice: string; reason: string }[]
}
type InA = { groupId: string; passage: string; existingPrompt: string; existingAnswer: string; addQuestions: number }
type InB = { groupId: string; original: string; existingPrompt: string }

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

/** Clause that concedes or narrows. The 2026-07-27 C2 batch put one of these
 *  in the KEY of 22% of its items and in no distractor, which let a solver
 *  pick "the option that qualifies itself" without reading the passage. */
const HEDGE = /\b(although|though|unless|except|only if|provided that|but not|while|however|if they|whereas)\b/i

let bad = 0
const fail = (m: string) => { console.error(`FAIL ${m}`); bad++ }
const warn = (m: string) => console.warn(`warn ${m}`)

const mode = process.argv[2]
if (mode !== 'A' && mode !== 'B') { console.error('usage: <A|B> <in> <out> [...]'); process.exit(1) }
const files = process.argv.slice(3)
if (files.length % 2 !== 0) { console.error('need in/out pairs'); process.exit(1) }

const allItems: Item[] = []
const bySet = new Map<string, Item[]>()

for (let i = 0; i < files.length; i += 2) {
  const inRecs = JSON.parse(readFileSync(files[i]!, 'utf8'))
  const out: Item[] = JSON.parse(readFileSync(files[i + 1]!, 'utf8'))
  const label = files[i + 1]!.split('/').pop()

  const expect = mode === 'A'
    ? (inRecs as InA[]).reduce((s, r) => s + r.addQuestions, 0)
    : (inRecs as InB[]).length * 3
  if (out.length !== expect) fail(`${label}: expected ${expect} items, got ${out.length}`)

  const byId = new Map<string, InA | InB>(inRecs.map((r: InA | InB) => [r.groupId, r]))

  for (const [n, it] of out.entries()) {
    const id = `${label}#${n}`
    allItems.push(it)

    if (it.type !== 'multiple_choice') fail(`${id} type=${it.type}`)
    if (it.readingTask !== 'daily_life') fail(`${id} readingTask=${it.readingTask}`)
    if (it.difficulty !== 'hard') fail(`${id} difficulty=${it.difficulty}`)
    if (!it.explanation?.trim()) fail(`${id} no explanation`)
    if (!/^\[Daily Life — /.test(it.prompt ?? '')) fail(`${id} prompt not tagged [Daily Life — ...]`)
    if (/\*\*|__|\$\$/.test(`${it.prompt}${it.passage}${it.choices?.join('')}`)) fail(`${id} markdown/LaTeX in text`)

    const ch = it.choices ?? []
    if (ch.length !== 4) fail(`${id} ${ch.length} choices`)
    if (new Set(ch.map(norm)).size !== ch.length) fail(`${id} duplicate choices`)
    if (!it.correct_answer || !ch.includes(it.correct_answer)) fail(`${id} correct_answer not byte-identical to a choice`)
    if ((it.distractor_rationales ?? []).length !== 3) fail(`${id} ${(it.distractor_rationales ?? []).length} distractor rationales, want 3`)

    const rec = byId.get(it.passageGroupId ?? '')
    if (!rec) { fail(`${id} passageGroupId ${it.passageGroupId} not in input`); continue }

    if (mode === 'A') {
      // The passage is content-hashed; ANY edit orphans the new item from the
      // set it is meant to join. Byte-identical or reject.
      if (it.passage !== (rec as InA).passage) fail(`${id} passage differs from the banked passage`)
    } else {
      const w = words(it.passage ?? '')
      if (w < 45 || w > 85) fail(`${id} replacement passage ${w} words, want 45-85`)
      if (norm(it.passage ?? '') === norm((rec as InB).original)) fail(`${id} replacement identical to original`)
    }

    // A sibling that re-asks the existing question adds no information.
    if (norm(it.prompt ?? '').includes(norm(rec.existingPrompt.replace(/^\[[^\]]*\]\s*/, '')))) {
      fail(`${id} restates the existing prompt`)
    }
    if (mode === 'A' && norm(it.correct_answer ?? '') === norm((rec as InA).existingAnswer)) {
      fail(`${id} key duplicates the existing item's key`)
    }

    bySet.set(it.passageGroupId!, [...(bySet.get(it.passageGroupId!) ?? []), it])
  }
}

// ---- cross-item pattern checks -------------------------------------------
const pos = [0, 0, 0, 0]
for (const it of allItems) {
  const i = (it.choices ?? []).indexOf(it.correct_answer ?? '')
  if (i >= 0) pos[i]!++
}
const total = allItems.length
console.log(`\n${total} items — key position A/B/C/D:`, pos.join(' / '),
  '=', pos.map(p => `${Math.round((p / total) * 100)}%`).join(' '))
const worst = Math.max(...pos) / total
if (worst > 0.40) fail(`key clusters on one position (${Math.round(worst * 100)}% > 40%)`)

// Every set a clean permutation is its own tell: three confident answers force
// the fourth. Only meaningful for 3+ sets.
let perms = 0, sets3 = 0
for (const items of bySet.values()) {
  if (items.length < 3) continue
  sets3++
  const idx = items.map(it => (it.choices ?? []).indexOf(it.correct_answer ?? ''))
  if (new Set(idx).size === idx.length) perms++
}
if (sets3 > 0) {
  const r = perms / sets3
  console.log(`sets of 3+: ${sets3}, all-distinct-position: ${perms} (${Math.round(r * 100)}%)`)
  if (r > 0.85) fail(`sets are near-always distinct positions (${Math.round(r * 100)}%) — looks permuted, not shuffled`)
}

// Hedge-only-in-the-key.
let hedgeKeyOnly = 0
for (const it of allItems) {
  const ch = it.choices ?? []
  const keyH = HEDGE.test(it.correct_answer ?? '')
  const distH = ch.filter(c => c !== it.correct_answer).some(c => HEDGE.test(c))
  if (keyH && !distH) hedgeKeyOnly++
}
const hr = hedgeKeyOnly / total
console.log(`key is the ONLY hedged option in ${hedgeKeyOnly}/${total} (${Math.round(hr * 100)}%)`)
if (hr > 0.25) fail(`hedge-only-in-key at ${Math.round(hr * 100)}% — solvable by option shape`)

// Longest-option tell.
let longest = 0
for (const it of allItems) {
  const ch = it.choices ?? []
  if (ch.length && it.correct_answer === ch.slice().sort((a, b) => b.length - a.length)[0]) longest++
}
const lr = longest / total
console.log(`key is the LONGEST option in ${longest}/${total} (${Math.round(lr * 100)}%)`)
if (lr > 0.45) fail(`longest-option tell at ${Math.round(lr * 100)}%`)

// Repeated option wording across passages reads as a template.
const seen = new Map<string, number>()
for (const it of allItems) for (const c of it.choices ?? []) seen.set(norm(c), (seen.get(norm(c)) ?? 0) + 1)
const repeated = [...seen.entries()].filter(([, n]) => n >= 4)
if (repeated.length) warn(`option wording reused 4+ times: ${repeated.slice(0, 5).map(([c, n]) => `"${c.slice(0, 40)}" x${n}`).join(', ')}`)

console.log(bad === 0 ? '\nOK — shape and pattern checks pass.' : `\n${bad} violation(s).`)
process.exit(bad === 0 ? 0 : 1)
