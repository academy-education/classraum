#!/usr/bin/env node
/**
 * question-number-refs.mjs [--self-test | <batch.json> ...]
 *
 * Finds text that names a question by its POSITION — "Question 10 asks about
 * the preceding passage", "questions 4-6", "see item 5", "the previous
 * question". Every assembler draws items into a new order, so any such text
 * names the wrong question on a drawn form. Register A74 (2026-10-02): ten
 * live act-english-v1 rows and two staged v4 rows read "Question N asks about
 * the preceding passage as a whole"; v7 had the same stems and was caught by
 * hand before insert. This is the check that would have caught it.
 *
 * Wired into gate.mjs `gateBatch`, so every inserter that calls the ledger
 * gate (bank-helper, act-, math-, verbal-, toefl-, essay-bank-helper,
 * insert-verbal-sets, bank-crv*) refuses a batch with a hit.
 *
 * WHAT IS DELIBERATELY NOT A HIT (measured on the 7,357-row live bank):
 *   - bare "#NNN": 795 hits, every one an SVG hex colour. "#" counts only
 *     after question/item/problem ("Question #12").
 *   - "Q1".."Q4": quartiles and quarters (29 hits, all legitimate).
 *   - "the third item", "the last item": list members in parallelism
 *     explanations (22 hits). Ordinal + item is a series, not a question.
 *   - "which of the following questions?", "the same question", "the first
 *     question" (ISEE dictionary entry): no position implied.
 * Keys named `svg` are never read.
 *
 * A check that cannot read its input must not return a number: a file that
 * is not JSON, or JSON with no strings at all, throws.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const PATTERNS = [
  // "Question 10", "questions 4-6", "Question #12", "item no. 5", "problem number 3"
  { name: 'numbered', rx: /\b(?:questions?|items?|problems?)\s*(?:#|no\.?|number)?\s*\d+\b/gi },
  // "the previous question", "the next problem", "the question above"
  { name: 'relative', rx: /\b(?:previous|preceding|next|prior|last|earlier|above)\s+(?:questions?|problems?)\b/gi },
  { name: 'relative', rx: /\b(?:questions?|problems?)\s+(?:above|below)\b/gi },
  // Korean: "문제 3", "3번 문제", "문항 12"
  { name: 'numbered-ko', rx: /(?:문제|문항)\s*\d+|\d+\s*번\s*(?:문제|문항)/g },
]

/** Hits in one string. */
export function findRefs(text) {
  const out = []
  if (typeof text !== 'string') return out
  for (const { name, rx } of PATTERNS) {
    for (const m of text.matchAll(rx)) {
      out.push({ kind: name, match: m[0], index: m.index,
        context: text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, ' ') })
    }
  }
  return out
}

/** Walk every string under `value` (skipping svg). Returns { strings, hits:[{path,...}] }. */
export function scanValue(value, path = '') {
  let strings = 0
  const hits = []
  const walk = (v, p) => {
    if (typeof v === 'string') { strings++; for (const h of findRefs(v)) hits.push({ path: p, ...h }); return }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${p}[${i}]`)); return }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (/svg$/i.test(k)) continue; walk(x, p ? `${p}.${k}` : k) }
  }
  walk(value, path)
  return { strings, hits }
}

/** Scan item files for the gate. Throws if a file cannot be read as JSON with text in it. */
export function scanFiles(files) {
  const hits = []
  let strings = 0
  for (const f of files) {
    let parsed
    try { parsed = JSON.parse(readFileSync(f, 'utf8')) } catch (e) {
      throw new Error(`question-number check cannot read ${f} as JSON: ${e.message}`)
    }
    const r = scanValue(parsed)
    if (r.strings === 0) throw new Error(`question-number check found no text in ${f}; refusing to report it clean`)
    strings += r.strings
    for (const h of r.hits) hits.push({ file: f, ...h })
  }
  return { strings, hits }
}

export function describeHits(hits, max = 5) {
  const lines = hits.slice(0, max).map(h => `${h.path}: "${h.match}" … ${h.context}`)
  if (hits.length > max) lines.push(`… and ${hits.length - max} more`)
  return lines.join('\n    ')
}

function selfTest() {
  const FIRE = [
    'Question 10 asks about the preceding passage as a whole.',
    'Questions 4-6 refer to the table.',
    'Refer to question 3.',
    'Unlike in Question #12, the writer',
    'See item 5 for the figure.',
    'Use your answer to the previous question.',
    'The question above gives the rate.',
    'problem number 7',
    '문제 3을 참고하세요',
    '12번 문제',
  ]
  const SILENT = [
    'the first paragraph',
    'The third item must be a noun phrase as well.',
    'makes the last item a separate clause',
    'Text 1 and Text 2 would most clearly disagree over which of the following questions?',
    'the lower half is 2, 5, 7 (Q1 = 5)',
    'She began each market day with the same question.',
    'answer the first question exactly',
    'It became a #1 bestseller.',
    'Paragraph 1 sets up the problem before any battery pack exists',
    'which is the answer to the previous step, not to the question asked',
    'This question asks about the preceding passage as a whole.',
  ]
  let bad = 0
  for (const s of FIRE) if (!findRefs(s).length) { console.error(`SELF-TEST FAIL (should fire): ${s}`); bad++ }
  for (const s of SILENT) if (findRefs(s).length) { console.error(`SELF-TEST FAIL (should be silent): ${s} -> ${findRefs(s).map(h => h.match)}`); bad++ }
  // svg keys are skipped; the same text elsewhere is not
  if (scanValue({ graphic: { svg: '<text>Question 3</text>' } }).hits.length) { console.error('SELF-TEST FAIL: svg key was read'); bad++ }
  if (!scanValue({ items: [{ prompt: 'Question 3 asks' }] }).hits.length) { console.error('SELF-TEST FAIL: nested prompt not read'); bad++ }
  // cannot-read cases throw rather than report clean
  let threw = false
  try { scanFiles([new URL(import.meta.url).pathname]) } catch { threw = true }
  if (!threw) { console.error('SELF-TEST FAIL: a non-JSON file did not throw'); bad++ }
  const empty = join(tmpdir(), `qnum-selftest-${process.pid}.json`)
  writeFileSync(empty, '[{"choices":[]}]')
  threw = false
  try { scanFiles([empty]) } catch { threw = true } finally { unlinkSync(empty) }
  if (!threw) { console.error('SELF-TEST FAIL: a JSON file with no text did not throw'); bad++ }
  // Through the real insert path: gateBatch must refuse on the reference and
  // must NOT refuse for it on clean text (that one then fails on the ledger).
  // (In a child process: gate.mjs imports this module, so importing it back
  // from inside this module's top-level await would deadlock.)
  const mk = (prompt) => { const f = join(tmpdir(), `qnum-gate-${process.pid}-${Math.random().toString(36).slice(2)}.json`); writeFileSync(f, JSON.stringify([{ prompt, choices: ['A', 'B', 'C', 'D'], correct_answer: 'A', passage: 'In the first paragraph, the writer…' }])); return f }
  const fBad = mk('Question 10 asks about the preceding passage as a whole.'), fOk = mk('This question asks about the preceding passage as a whole.')
  const gate = f => {
    const code = `import { gateBatch } from ${JSON.stringify(pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), 'gate.mjs')).href)}; const g = gateBatch({ task: 'multiple_choice', family: 'act', section: 'english', itemFiles: [${JSON.stringify(f)}] }); console.log(JSON.stringify({ canInsert: g.canInsert, refs: g.questionNumberRefs?.length ?? 0 }))`
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' })
    if (r.status !== 0) throw new Error(`gateBatch child failed: ${r.stderr}`)
    return JSON.parse(r.stdout.trim().split('\n').pop())
  }
  try {
    const gBad = gate(fBad)
    if (gBad.canInsert || !gBad.refs) { console.error('SELF-TEST FAIL: gateBatch did not refuse "Question 10 asks"'); bad++ }
    const gOk = gate(fOk)
    if (gOk.refs) { console.error('SELF-TEST FAIL: gateBatch refused clean text for question numbers'); bad++ }
  } finally { unlinkSync(fBad); unlinkSync(fOk) }
  if (bad) { console.error(`${bad} self-test failure(s)`); process.exit(1) }
  console.log(`question-number-refs self-test: ${FIRE.length} fire, ${SILENT.length} silent, svg skip, non-JSON and no-text throw, gateBatch refuses/passes — OK`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2)
  if (!args.length || args[0] === '--self-test') selfTest()
  else {
    const { strings, hits } = scanFiles(args)
    console.log(`scanned ${strings} strings in ${args.length} file(s): ${hits.length} question-number reference(s)`)
    if (hits.length) { console.log('    ' + describeHits(hits, 50)); process.exit(1) }
  }
}
