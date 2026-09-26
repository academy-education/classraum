#!/usr/bin/env node
/**
 * check-explanation-hygiene.mjs <batch.json ...> — is reviewer-facing text
 * sitting in the student-facing `explanation` field?
 *
 * FOUND 2026-09-26 by a with-source grader. Four of fifteen Advanced Math
 * explanations carried blocks written for me, not for a student:
 *
 *   SM17A-B2  "OPTION-SET NOTE, recorded because it is what this set was
 *              built for. Every option v satisfies 'v - 16 is a square'..."
 *   SM17A-A7  "It is a known single strike, inside tolerance, and it is
 *              recorded here so that a grader locates it correctly."
 *
 * TWO SEPARATE PROBLEMS, AND THE SECOND IS THE BAD ONE.
 *
 * 1. It ships. `explanation` is what a student reads after answering, and an
 *    OPTION-SET NOTE explaining how the distractors were engineered tells them
 *    how to game the next item.
 * 2. IT CONTAMINATES THE GATE. A7's note states the verdict — "a known single
 *    strike, inside tolerance" — inside the artifact three independent graders
 *    were asked to judge cold. A grader reading that is anchored before it
 *    forms its own count, and the whole point of three independent graders is
 *    that they have not been told the answer.
 *
 * The cause is mine: I asked the repair agents to explain their reasoning and
 * did not say where that reasoning goes. Authoring notes belong in the report,
 * or in a field the renderer never shows — never in `explanation`.
 */
import { readFileSync } from 'node:fs'

const PATTERNS = [
  [/OPTION-SET NOTE/i,                        'an authoring note addressed to a reviewer'],
  [/recorded (here|because)/i,                'reasoning recorded for a reviewer'],
  /* Bare "grader"/"auditor" were matched as words and fired on SEC9B-04, whose
   * SENTENCE is about an auditor's report. Content can contain those nouns;
   * reviewer text addresses them. Match the address, not the word. */
  [/so that (a |the )?(grader|auditor|reviewer)/i, 'speaks to a grader'],
  [/\b(for|to) the (grader|auditor|reviewer)s?\b/i, 'speaks to a reviewer'],
  [/inside tolerance|known single strike/i,   'STATES THE GATE VERDICT — contaminates an independent grade'],
  [/re-audit|break-test|free elimination/i,   'process vocabulary from this pipeline'],
  [/distractor[- ]set was built|built for/i,  'describes how the distractors were engineered'],
]

let bad = 0, n = 0
for (const f of process.argv.slice(2)) {
  const batch = JSON.parse(readFileSync(f, 'utf8'))
  const name = f.replace(/^.*\//, '')
  let hits = 0
  for (const it of batch) {
    n++
    const text = String(it.explanation ?? '')
    const found = PATTERNS.filter(([re]) => re.test(text)).map(([, why]) => why)
    if (!found.length) continue
    hits++; bad++
    console.log(`${name} ${it.id}: ${found.join('; ')}`)
    const m = text.match(/.{0,50}(OPTION-SET NOTE|recorded here|recorded because|grader|auditor|inside tolerance).{0,80}/i)
    if (m) console.log(`    ...${m[0].trim().replace(/\s+/g, ' ')}...`)
  }
  console.log(`${name}: ${hits} of ${batch.length} explanations carry reviewer-facing text`)
}
console.log(bad ? `\n${bad} of ${n} items would ship authoring notes to students.` : `\nall ${n} explanations are student-facing only`)
process.exit(bad ? 1 : 0)
