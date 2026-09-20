#!/usr/bin/env node
/**
 * check-essay-shape.mjs — the structural pre-flight for free-response
 * prompt batches (SSAT Writing Sample, ISEE Essay).
 *
 * READ ONLY. Exits non-zero on any defect, and refuses rather than
 * returning a number when it cannot read its input — the standing rule
 * after six checkers were found emitting confident verdicts about data
 * they had never loaded.
 *
 *   node scripts/study-bank/check-essay-shape.mjs essay-prompts-v2.json
 *
 * There is no answer key here, so none of the MC gates mean anything.
 * What CAN go wrong with a prompt, and is checked:
 *
 *   - an SSAT pair missing one half (the student loses their choice)
 *   - a one-sided essay prompt: if it does not state the opposing view,
 *     the "position" it asks for is the only one on offer
 *   - a story starter that is not a usable opening sentence
 *   - a prompt duplicating a theme already banked, which on a bank this
 *     small is the difference between ten forms and nine
 *   - missing guidance or accessibility note, which are what a grader
 *     and a reviewer respectively read
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const file = process.argv[2]
if (!file) { console.error('usage: check-essay-shape.mjs <prompts.json> [...compare-against.json]'); process.exit(2) }

let prompts
try { prompts = JSON.parse(readFileSync(join(HERE, file), 'utf8')) } catch (e) {
  console.error(`REFUSING: cannot read ${file}: ${e.message}`); process.exit(2)
}
if (!Array.isArray(prompts) || !prompts.length) { console.error(`REFUSING: ${file} parsed to zero prompts`); process.exit(2) }

const others = process.argv.slice(3).flatMap(f => JSON.parse(readFileSync(join(HERE, f), 'utf8')))

const problems = []
const note = (id, msg) => problems.push(`${id}: ${msg}`)

/* Content words only, so two prompts about community service collide
 * however differently they are worded. */
const STOP = new Set(('a an the and or but of to in on for with that this those these is are be been it its as at by from your you their they some others people believe think believes'
  + ' should would could do does did not no yes than then when what which who whom whose how why where more most less least own about into over under between').split(' '))
const bag = s => new Set(String(s).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)))
/*
 * Compare the PROMPT'S OWN CONTENT, not its instructions.
 *
 * Every story starter carries the identical sentence "Write a story that
 * begins with the following sentence:", which is five content words
 * against a quoted sentence of a dozen — so the first version of this
 * check scored every pair of unrelated story starters at 55-56% and
 * would have blocked the batch for a collision that does not exist. The
 * quoted sentence IS the item; the wrapper is a constant.
 */
const themeOf = s => {
  const q = String(s).match(/"([^"]+)"/)
  return q ? q[1] : String(s)
}
const overlap = (a, b) => {
  const A = bag(themeOf(a)), B = bag(themeOf(b))
  const inter = [...A].filter(w => B.has(w)).length
  return inter / Math.max(1, Math.min(A.size, B.size))
}

const ids = new Set()
for (const p of prompts) {
  const id = p.id ?? '(no id)'
  if (ids.has(id)) note(id, 'duplicate id')
  ids.add(id)
  for (const k of ['kind', 'prompt', 'guidance', 'accessibility_note']) {
    if (!p[k] || typeof p[k] !== 'string' || !p[k].trim()) note(id, `missing ${k}`)
  }
  if (!['essay', 'story starter'].includes(p.kind)) note(id, `unknown kind '${p.kind}'`)
  if (p.kind === 'essay') {
    /*
     * Two-sidedness applies to ARGUMENTATIVE prompts only.
     *
     * The first version of this check demanded an "Others ..." clause of
     * every essay prompt and flagged IE10. That was the checker being
     * wrong, not the prompt: ISEE mixes argumentative prompts with
     * NARRATIVE ones ("Think of a time you changed your mind", "Describe
     * a place you can reach on foot" — both live and both shipped), and a
     * narrative prompt has no opposing view to state. Caught by running
     * this against the already-banked v1 set, where it condemned two
     * items that have been serving students for weeks.
     *
     * A prompt that asks the reader to take a side says so, so that is
     * what is tested — not the presence of an essay.
     */
    const argumentative = /\b(do you agree|should|which do you think|who should|which approach)\b/i.test(p.prompt)
    if (argumentative) {
      /*
       * A prompt can present both sides two ways, and the live bank uses
       * both. The "Some people ... Others ..." construction is the SSAT
       * house style; ISEE's IE6 instead embeds the choice in the question
       * ("one empty lot ... a small park or a small library. Which should
       * it build"). Demanding the first form condemned a shipped item, so
       * either counts — what is being tested is that the candidate is
       * offered a genuine alternative, not which sentence builds it.
       */
      /*
       * Test the QUESTION, not the closing instruction. "Support your
       * position with specific examples from your own experience, your
       * reading, or your observation" contains an "or", so the first
       * version of the either/or branch matched every prompt that carried
       * the standard SSAT ending — including a deliberately one-sided one
       * planted to check this, which sailed through. Strip the boilerplate
       * first and the heuristic tests what it claims to.
       */
      const asked = p.prompt.replace(/support your (position|answer)[\s\S]*$/i, '')
      const twoSided = /others?\b/i.test(asked)
        || /\bor\b/i.test(asked)
      if (!twoSided) note(id, 'argumentative prompt offers no alternative position — leading')
      if (p.prompt.length < 200) note(id, `argumentative prompt is short (${p.prompt.length} chars) for a two-sided setup`)
    }
    /*
     * "Support your position with specific examples ..." is the SSAT
     * Writing Sample's published closing instruction. It is NOT ISEE's:
     * six of the eight live ISEE prompts omit it, so requiring it of them
     * flagged three quarters of a shipped section. Checked where the
     * convention applies.
     */
    if (/^SW/.test(id) && !/support your (position|answer)/i.test(p.prompt)) {
      note(id, 'SSAT essay missing the "Support your position" instruction')
    }
  }
  if (p.kind === 'story starter') {
    if (!/begins with the following sentence/i.test(p.prompt)) note(id, 'story starter does not name its opening sentence')
    const m = p.prompt.match(/"([^"]+)"/)
    if (!m) note(id, 'story starter has no quoted opening sentence')
    else if (!/[.!?]$/.test(m[1].trim())) note(id, 'the opening sentence is not punctuated as a sentence')
  }
}

/* SSAT delivers both halves or neither. */
const pairs = new Map()
for (const p of prompts.filter(x => /^SW/.test(x.id ?? ''))) {
  const k = p.id.replace(/[ab]$/, '')
  const g = pairs.get(k) ?? {}
  g[p.kind === 'essay' ? 'essay' : 'story'] = p
  pairs.set(k, g)
}
for (const [k, g] of pairs) if (!g.essay || !g.story) note(k, 'incomplete SSAT pair — delivers both or neither')

/* Theme collision, within the batch and against anything already banked. */
const all = [...prompts.map(p => ({ ...p, src: file })), ...others.map(p => ({ ...p, src: 'existing' }))]
for (let i = 0; i < all.length; i++) {
  for (let j = i + 1; j < all.length; j++) {
    if (all[i].kind !== all[j].kind) continue
    if (all[i].src === 'existing' && all[j].src === 'existing') continue
    const o = overlap(all[i].prompt, all[j].prompt)
    if (o >= 0.5) note(all[i].id, `theme overlap ${(100 * o).toFixed(0)}% with ${all[j].id} (${all[j].src})`)
  }
}

const essays = prompts.filter(p => p.kind === 'essay').length
const stories = prompts.filter(p => p.kind === 'story starter').length
console.log(`${file}: ${prompts.length} prompts — ${essays} essay, ${stories} story starter, ${pairs.size} SSAT pair(s)`)
if (others.length) console.log(`compared against ${others.length} already-banked prompt(s)`)
if (problems.length) {
  console.error(`\nFAIL — ${problems.length} problem(s):`)
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}
console.log('shape ok')
