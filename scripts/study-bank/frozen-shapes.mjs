#!/usr/bin/env node
/**
 * Shape rules for the three frozen TOEFL item types. PURE — no DB client,
 * no side effects — so they can be unit-tested and pointed at the live
 * bank. They lived in toefl-bank-helper.mjs, which imports
 * @supabase/supabase-js at the top level; Jest cannot transform that, so a
 * test importing them collected ZERO tests while reporting a failed suite.
 * "Suites: 1 failed, Tests: 0 total" is a failure, not a pass with noise.
 *
 * The first draft of the blanks rule counted underscore runs and matched 0
 * of 93 — the marker is "[n]". Reading the live rows caught it; a unit test
 * over invented fixtures would have passed.
 */
const BLANK_MARKER = /\[\d+\]/g

export function checkFillInBlanks(it) {
  if (it.type !== 'fill_in_blanks') return 'type is not fill_in_blanks'
  if (!it.passage) return 'no passage'
  const blanks = it.blanks || []
  if (!blanks.length) return 'no blanks'
  const markers = (String(it.passage).match(BLANK_MARKER) || []).length
  if (markers !== blanks.length) return `${blanks.length} blanks but ${markers} [n] markers in the passage`
  for (let i = 0; i < blanks.length; i++) {
    if (blanks[i].id !== i + 1) return `blank ids must run 1..N in order (got ${blanks[i].id} at position ${i + 1})`
    if (!String(blanks[i].answer || '').trim()) return `blank ${i + 1} has no answer`
  }
  return null
}

export function checkArrangeWords(it) {
  if (it.type !== 'arrange_words') return 'type is not arrange_words'
  const choices = it.choices || []
  if (choices.length < 3) return `only ${choices.length} chunks`
  const answer = String(it.correct_answer || '').split('|').map(x => x.trim()).filter(Boolean)
  if (!answer.length) return 'no correct_answer'
  // The answer is the chunks reordered — nothing added, nothing dropped.
  // A student can only ever produce a permutation, so any other answer is
  // unreachable and the item is unanswerable.
  const bag = a => [...a].map(x => x.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()).sort().join('~')
  if (bag(choices) !== bag(answer)) return 'correct_answer is not a permutation of choices'
  return null
}

export function checkSpeakingInterview(it) {
  if (it.type !== 'speaking_interview') return 'type is not speaking_interview'
  if (!String(it.prompt || '').trim()) return 'no prompt'
  if (!String(it.passage || '').trim()) return 'no situation passage'
  // Free response: a non-empty key would be graded against as if it were
  // the only right answer.
  if (String(it.correct_answer || '').trim()) return 'correct_answer must be empty for a free-response task'
  if (!String(it.passageGroupId || '').trim()) return 'no passageGroupId — interview rungs must group'
  return null
}

