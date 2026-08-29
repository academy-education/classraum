/**
 * check-keyword-parity.mjs — the re-homing guard.
 *
 * FOUND BY AN AUTHOR, NOT BY A CHECKER. While trimming RW3-I03's
 * denials for word count, two option keywords silently lost parity:
 * `enlarged` ended up in W4's passage only, and `exposes` in W2's only,
 * because the tightened denial dropped the very word its option was
 * built on. Either one lets a reader pick that option without reading —
 * find the rare word, find its passage, done.
 *
 * The whole point of the kill design is that every option's vocabulary
 * appears in EVERY variant's passage: asserted in one, denied in the
 * others. That is also why the renderer's lexical wrong-home check is
 * void here. Parity is the property that makes both true, so it is
 * worth checking directly.
 *
 * TWO FAILURE SHAPES, and the second is the dangerous one:
 *   LONE      an option word occurs in exactly one variant's passage
 *   INVERTED  an option word is absent ONLY from its own variant's
 *             passage — the option is at home everywhere except where
 *             it belongs, which is a stronger tell than LONE
 *
 *   node check-keyword-parity.mjs <topics.json> [...]
 *   node check-keyword-parity.mjs --selftest
 *
 * ADVISORY, NOT A GATE — measured, not assumed.
 *
 * On the s3 batch it fired 160 INVERTED and 118 LONE. Reading the hits
 * shows most are PARAPHRASE, which is exactly what a reading answer
 * should do: W1's answer "how a colony was driven off by an animal
 * newcomer" against a passage that says "a ground predator from the
 * mainland". The word sits in the siblings because they deny it by
 * name.
 *
 * Nor is that direction exploitable: a solver holding the passage and
 * matching words is led AWAY from the key, so the effect makes items
 * harder, not guessable. All 160 also fell in four ISEE topics and none
 * in any SSAT topic — an authoring-style difference, not a property of
 * the method.
 *
 * This is the SEVENTH structural proxy built on this project and every
 * earlier one was too coarse for the tell it chased. So it reports and
 * hands its hits to the with-passage QC vote, which reads meaning. The
 * one case worth acting on directly is the narrow one the author hit:
 * a keyword that vanished from the denials during a LENGTH EDIT, which
 * shows up as LONE on a topic that was previously parity-clean. Compare
 * runs; do not read a single run's absolute count as a verdict.
 */
import { readFileSync } from 'node:fs'

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')
const words = s => new Set(norm(s).split(' ').filter(w => w.length > 4))

// Words too common to carry a signal. Deliberately short: an
// over-eager stop list is how a real tell gets filtered out.
const STOP = new Set(['which', 'their', 'there', 'these', 'those', 'about', 'would',
  'could', 'should', 'because', 'while', 'where', 'after', 'before', 'other',
  'another', 'through', 'without', 'passage', 'author', 'writer', 'narrator'])

export function run(topics) {
  const lone = [], inverted = []
  let checked = 0

  for (const t of topics) {
    const V = t.variants ?? []
    const pw = V.map(v => words(v.passage))

    for (const q of t.questions ?? []) {
      for (const [vi, v] of V.entries()) {
        const a = (v.answers ?? []).find(x => x.qid === q.qid)
        if (!a) continue
        for (const w of words(a.answer)) {
          if (STOP.has(w)) continue
          checked++
          const inWhich = pw.map((s, i) => s.has(w) ? i : -1).filter(i => i >= 0)
          /*
           * The two categories MUST NOT OVERLAP, and INVERTED wins where
           * they would. A word present in exactly one passage that is not
           * its own is both "lone" and "inverted"; reporting it as lone
           * buries the worse fact. Absence from its own passage is the
           * stronger tell, so it is tested first.
           */
          if (!inWhich.includes(vi)) {
            if (inWhich.length) inverted.push(`${t.topic_id}/${q.qid} ${v.label}: "${w}" appears in ${inWhich.length} passage(s) but NOT its own`)
          } else if (inWhich.length === 1) {
            lone.push(`${t.topic_id}/${q.qid} ${v.label}: "${w}" appears in ${v.label}'s passage only`)
          }
        }
      }
    }
  }
  return { lone, inverted, checked }
}

function selftest() {
  const mk = (p1, p2, ans) => ([{
    topic_id: 'RW3-I99',
    questions: [{ qid: 'q1' }],
    variants: [
      { label: 'W1', passage: p1, answers: [{ qid: 'q1', answer: ans[0] }] },
      { label: 'W2', passage: p2, answers: [{ qid: 'q1', answer: ans[1] }] },
    ],
  }])

  // parity held: both keywords appear in both passages
  const good = run(mk(
    'The hall was enlarged in spring; it was never shuttered.',
    'The hall was shuttered in spring; it was never enlarged.',
    ['The hall was enlarged', 'The hall was shuttered']))
  if (good.lone.length || good.inverted.length) {
    console.error('SELFTEST FAIL: parity-clean topic flagged —', good); process.exit(1)
  }

  // LONE: "enlarged" is W1's own word and appears nowhere else — the
  // real RW3-I03 defect, where trimming a denial dropped the keyword
  // from the passages that were supposed to deny it.
  const bad = run(mk(
    'The hall was enlarged in spring; it was never closed.',
    'The hall was closed in spring.',
    ['The hall was enlarged', 'The hall was closed']))
  if (!bad.lone.some(x => x.includes('enlarged'))) {
    console.error('SELFTEST FAIL: lone keyword not caught —', bad); process.exit(1)
  }

  // INVERTED needs THREE variants: the word must sit in two passages
  // that are not its own. With two variants this case is
  // indistinguishable from LONE, which is why the first fixture here
  // could not fail for the right reason.
  const inv = run([{
    topic_id: 'RW3-I98',
    questions: [{ qid: 'q1' }],
    variants: [
      { label: 'W1', passage: 'The hall was closed in spring and stayed shut.', answers: [{ qid: 'q1', answer: 'The hall was enlarged' }] },
      { label: 'W2', passage: 'The hall was enlarged in spring; it was never closed.', answers: [{ qid: 'q1', answer: 'The hall was closed' }] },
      { label: 'W3', passage: 'The hall was enlarged that year, not closed.', answers: [{ qid: 'q1', answer: 'The hall was rebuilt' }] },
    ],
  }])
  if (!inv.inverted.some(x => x.includes('enlarged') && x.includes('W1'))) {
    console.error('SELFTEST FAIL: inverted keyword not caught —', inv); process.exit(1)
  }
  if (inv.lone.some(x => x.includes('enlarged'))) {
    console.error('SELFTEST FAIL: inverted case also reported as lone —', inv); process.exit(1)
  }

  console.log('selftest OK — catches lone and inverted option keywords, passes a parity-clean topic')
}

const args = process.argv.slice(2)
if (args[0] === '--selftest') { selftest(); process.exit(0) }
if (!args.length) { console.error('usage: check-keyword-parity.mjs <topics.json> [...] | --selftest'); process.exit(1) }
const topics = args.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
const { lone, inverted, checked } = run(topics)
console.log(`${checked} option words checked across ${topics.length} topics`)
if (inverted.length) { console.log(`\n${inverted.length} INVERTED (option word absent only from its own passage):`); for (const x of inverted.slice(0, 20)) console.log('  - ' + x) }
if (lone.length) { console.log(`\n${lone.length} LONE (option word in one passage only):`); for (const x of lone.slice(0, 20)) console.log('  - ' + x) }
if (!lone.length && !inverted.length) console.log('keyword parity clean — no option is re-homeable by a rare word')
