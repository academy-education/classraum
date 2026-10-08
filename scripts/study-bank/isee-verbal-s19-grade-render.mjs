#!/usr/bin/env node
/**
 * isee-verbal-s19-grade-render.mjs <frozen.batch.json> <tag> <grader-letter> <seed>
 *
 * With-source render for one grader: item order and choice order re-shuffled
 * with the shared seeded generator (a different seed per grader, so no two
 * graders see one order), and ONLY what a student sees crosses: id, kind,
 * blanks, prompt, choices. correct_answer, difficulty, explanation,
 * distractor_rationales and clue_type are withheld (deny list = everything not
 * on the allow list, and any unrecognised field is NAMED, as make-grade-render
 * does). Writes <tag>.grade-<g>.grade.json and <tag>.grade-<g>.gradekey.json.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const [path, tag, g, seedArg] = process.argv.slice(2)
if (!path || !tag || !g || !seedArg) { console.error('usage: <frozen.batch.json> <tag> <grader-letter> <seed>'); process.exit(2) }
const batch = JSON.parse(readFileSync(path, 'utf8'))
if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${path} holds no items`); process.exit(2) }
const ALLOW = ['id', 'family', 'section', 'kind', 'blanks', 'prompt', 'choices']
const KNOWN_WITHHELD = ['correct_answer', 'difficulty', 'explanation', 'distractor_rationales', 'clue_type', 'domain', 'subskill']
const unknown = new Set()
const rand = rng(Number(seedArg))
const order = shuffleWith(batch.slice(), rand)
const grade = [], key = {}
for (const it of order) {
  for (const k of Object.keys(it)) if (!ALLOW.includes(k) && !KNOWN_WITHHELD.includes(k)) unknown.add(k)
  const ch = shuffleWith(it.choices.slice(), rand)
  const o = {}; for (const k of ALLOW) if (it[k] !== undefined) o[k] = it[k]
  o.choices = ch
  grade.push(o)
  key[it.id] = { correct_answer: it.correct_answer, difficulty: it.difficulty, dealt_index: ch.indexOf(it.correct_answer) }
}
const gf = `scripts/study-bank/${tag}.grade-${g}.grade.json`, kf = `scripts/study-bank/${tag}.grade-${g}.gradekey.json`
writeFileSync(gf, JSON.stringify(grade, null, 1) + '\n')
writeFileSync(kf, JSON.stringify(key, null, 1) + '\n')
const slots = [0, 0, 0, 0]; for (const v of Object.values(key)) slots[v.dealt_index]++
console.log(`${gf}: ${grade.length} items, key slots ${slots.join('/')}, sha ${createHash('sha256').update(readFileSync(gf)).digest('hex').slice(0, 16)}${unknown.size ? `, UNRECOGNISED fields withheld: ${[...unknown].join(',')}` : ''}`)
