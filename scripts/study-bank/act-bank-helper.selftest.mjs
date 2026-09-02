#!/usr/bin/env node
/**
 * act-bank-helper.selftest.mjs — run the checker against fixtures whose
 * verdict is KNOWN, so that a green "structure OK" on a real batch means
 * something. A detector that cannot reproduce a known verdict on known
 * data has no business being pointed at unknown data.
 *
 *   node scripts/study-bank/act-bank-helper.selftest.mjs
 *
 * Builds a clean 10-item English passage and a clean 9-item Reading
 * passage (both must PASS), then applies one mutation at a time (each
 * must be REFUSED, and the refusal message must name the right cause).
 * Exit 1 on any surprise.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const dir = join(process.env.SCRATCH ?? '/tmp', 'act-selftest'); mkdirSync(dir, { recursive: true })
const HELPER = 'scripts/study-bank/act-bank-helper.mjs'

const ENGLISH_PASSAGE = '[1] Mara learned to solder before she learned to drive. [A] Her uncle ran a repair shop and let her watch. [B]\n\n[2] The shop smelled of flux and coffee. Every Saturday, she took apart a radio, and every Saturday she put it back together. [C]\n\n[3] By sixteen she was doing the repairs herself. [D] Her uncle, retiring, handed her the keys.'
const englishItem = (n, over = {}) => ({
  id: `T-${String(n).padStart(2, '0')}`, passage_id: 'T-P1', passage_title: 'The Repair Shop', passage: ENGLISH_PASSAGE,
  prompt: `In the sentence "The shop smelled of flux and coffee," which choice makes the sentence most grammatically acceptable in place of "smelled of"? (${n})`,
  choices: ['No Change', 'smelled from', 'smelling of', 'had smell of'], correct_answer: 'No Change',
  explanation: 'The idiom is "smell of"; the other forms are either unidiomatic or leave the sentence without a finite verb.',
  domain: 'Conventions of Standard English', subskill: 'idiom', difficulty: 'medium', ...over,
})
const cleanEnglish = Array.from({ length: 10 }, (_, i) => englishItem(i + 1))

const READING_PASSAGE = '[1] The lighthouse keeper kept a ledger of every ship that passed. He was a patient man, and the ledger was patient work.\n\n[2] In winter the light was the only thing awake for miles. He wrote the names by lamplight, careful and slow.\n\n[3] When the automatic beacon came, the ledger stopped. Nobody needed a patient hand any more.'
const readingItem = (n, over = {}) => ({
  id: `R-${String(n).padStart(2, '0')}`, passage_id: 'R-P1', passage_title: 'The Ledger', genre: 'literary_narrative', paired: false, passage: READING_PASSAGE,
  prompt: `According to the second paragraph, how did the keeper write the names? (${n})`,
  choices: ['Quickly', 'By lamplight', 'From memory', 'In pencil'], correct_answer: 'By lamplight',
  explanation: 'The passage says he wrote the names by lamplight, careful and slow.',
  domain: 'Key Ideas and Details', subskill: 'detail', difficulty: 'easy', ...over,
})
const cleanReading = Array.from({ length: 9 }, (_, i) => readingItem(i + 1))

const run = (section, batch) => {
  const f = join(dir, `${section}-${Math.random().toString(36).slice(2)}.json`)
  writeFileSync(f, JSON.stringify(batch))
  const r = spawnSync('node', [HELPER, 'check', section, f], { encoding: 'utf8' })
  return { code: r.status, out: r.stdout + r.stderr }
}

const cases = [
  /* [name, section, batch, expectPass, expectedMessageFragment] */
  ['english: clean passage', 'english', cleanEnglish, true],
  ['english: 9 items', 'english', cleanEnglish.slice(0, 9), false, 'section needs exactly 10'],
  ['english: one item with different passage text', 'english', cleanEnglish.map((it, i) => i === 3 ? { ...it, passage: it.passage + ' ' } : it), false, 'IDENTICAL passage text'],
  ['english: No Change at index 2', 'english', cleanEnglish.map((it, i) => i === 0 ? { ...it, choices: ['smelled from', 'smelling of', 'No Change', 'had smell of'] } : it), false, '"No Change" must be choices[0]'],
  ['english: transition stem with no span (the old exemption)', 'english', cleanEnglish.map((it, i) => i === 0 ? { ...it, prompt: 'Which transition word or phrase is most logical in context?' } : it), false, 'cannot locate'],
  ['english: tone stem with no span', 'english', cleanEnglish.map((it, i) => i === 0 ? { ...it, prompt: "Which choice most effectively maintains the essay's tone?" } : it), false, 'cannot locate'],
  ['english: rhetorical stem naming a paragraph passes', 'english', cleanEnglish.map((it, i) => i === 0 ? { ...it, prompt: 'Which choice most effectively introduces paragraph 2?', choices: ['No Change', 'x', 'y', 'z'], correct_answer: 'x' } : it), true],
  ['english: placement stem naming a Point passes', 'english', cleanEnglish.map((it, i) => i === 0 ? { ...it, prompt: 'For the sake of logic, the sentence should be placed at Point [B].', choices: ['No Change', 'x', 'y', 'z'], correct_answer: 'x' } : it), true],
  ['english: domain misspelled', 'english', cleanEnglish.map((it, i) => i === 5 ? { ...it, domain: 'Conventions of Standard english' } : it), false, 'domain "Conventions of Standard english"'],
  ['english: explanation names choice B', 'english', cleanEnglish.map((it, i) => i === 5 ? { ...it, explanation: 'Choice B is wrong because it is unidiomatic.' } : it), false, 'names an option position'],
  ['english: explanation names (C)', 'english', cleanEnglish.map((it, i) => i === 5 ? { ...it, explanation: 'Answer (C) leaves no finite verb.' } : it), false, 'names an option position'],
  ['english: key not among choices', 'english', cleanEnglish.map((it, i) => i === 5 ? { ...it, correct_answer: 'No change' } : it), false, 'not among the choices verbatim'],
  ['english: five choices', 'english', cleanEnglish.map((it, i) => i === 5 ? { ...it, choices: [...it.choices, 'smelt of'] } : it), false, 'exactly 4 choices'],

  ['reading: clean passage', 'reading', cleanReading, true],
  ['reading: 8 items', 'reading', cleanReading.slice(0, 8), false, 'section needs exactly 9'],
  ['reading: line-number stem', 'reading', cleanReading.map((it, i) => i === 0 ? { ...it, prompt: 'In line 4, the keeper is described as:' } : it), false, 'cites a line number'],
  ['reading: "lines 3-5" stem', 'reading', cleanReading.map((it, i) => i === 0 ? { ...it, prompt: 'The description in lines 3-5 serves to:' } : it), false, 'cites a line number'],
  ['reading: genre typo', 'reading', cleanReading.map(it => ({ ...it, genre: 'literary-narrative' })), false, 'genre "literary-narrative"'],
  ['reading: paired=true without A/B headers', 'reading', cleanReading.map(it => ({ ...it, paired: true })), false, 'paired=true but passage lacks'],
  ['reading: paired=false WITH A/B headers', 'reading', cleanReading.map(it => ({ ...it, passage: 'Passage A\n\n' + it.passage + '\n\nPassage B\n\nMore.' })), false, 'paired=false but passage has'],
  ['reading: paired=true with headers passes', 'reading', cleanReading.map(it => ({ ...it, paired: true, passage: 'Passage A\n\n' + it.passage + '\n\nPassage B\n\nMore.' })), true],
  ['reading: vocab target occurs 3x, no pin', 'reading', cleanReading.map((it, i) => i === 0 ? { ...it, prompt: 'As it is used in the passage, the word "patient" most nearly means:', choices: ['calm', 'sick', 'slow', 'unhurried'], correct_answer: 'unhurried' } : it), false, 'occurs 3x'],
  ['reading: vocab target occurs 3x, pinned by unique phrase', 'reading', cleanReading.map((it, i) => i === 0 ? { ...it, prompt: 'As it is used in the phrase "the ledger was patient work," the word "patient" most nearly means:', choices: ['calm', 'sick', 'slow', 'unhurried'], correct_answer: 'unhurried' } : it), true],
  ['reading: vocab target occurs 3x, "pin" phrase is not in the passage', 'reading', cleanReading.map((it, i) => i === 0 ? { ...it, prompt: 'As it is used in the phrase "a patient and careful man," the word "patient" most nearly means:', choices: ['calm', 'sick', 'slow', 'unhurried'], correct_answer: 'unhurried' } : it), false, 'occurs 3x'],
  ['reading: vocab target occurs once passes', 'reading', cleanReading.map((it, i) => i === 0 ? { ...it, prompt: 'As it is used in the passage, the word "awake" most nearly means:', choices: ['lit', 'alert', 'moving', 'loud'], correct_answer: 'lit' } : it), true],
  ['reading: vocab target absent from passage', 'reading', cleanReading.map((it, i) => i === 0 ? { ...it, prompt: 'As it is used in the passage, the word "vigilant" most nearly means:', choices: ['lit', 'alert', 'moving', 'loud'], correct_answer: 'alert' } : it), false, 'does not occur in the passage'],
  ['reading: domain misspelled', 'reading', cleanReading.map((it, i) => i === 2 ? { ...it, domain: 'Key Ideas & Details' } : it), false, 'domain "Key Ideas & Details"'],
]

let bad = 0
for (const [name, section, batch, expectPass, frag] of cases) {
  const { code, out } = run(section, batch)
  const passed = code === 0
  const ok = passed === expectPass && (expectPass || !frag || out.includes(frag))
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}  -> exit ${code}${!ok ? `\n      expected ${expectPass ? 'PASS' : `REFUSE containing "${frag}"`}\n      got: ${out.trim().split('\n').slice(-6).join('\n           ')}` : ''}`)
  if (!ok) bad++
}
console.log(`\n${cases.length - bad}/${cases.length} known verdicts reproduced`)
process.exit(bad ? 1 : 0)
