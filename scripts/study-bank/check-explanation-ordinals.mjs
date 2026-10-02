/**
 * Explanations that name an option by POSITION, where that position holds
 * the KEY — i.e. the explanation calls the right answer a wrong answer.
 *
 * WHY THE NOUN TEST EXISTS. The first version of this script flagged any
 * "the <ordinal>" whose index matched the key, and reported 63 items. Most
 * were false: "the second EQUATION is a multiple of the first", "the first
 * two INFINITIVES", "the third ELEMENT must also be a gerund", "in the
 * first PLACE". Those ordinals count content, not options, and every SAT
 * Math hit was of that kind. A detector that has not been read against
 * real rows will happily triple its own finding — the SAT Math hub lesson,
 * repeated by the checker written to honour it.
 *
 * So an ordinal counts as an OPTION reference only when it stands alone as
 * a pronoun: followed by punctuation, a conjunction, or a verb — never by
 * a noun. `OPTION_NOUNS` is the observed set plus obvious neighbours, and
 * the selftest pins both directions.
 */
/*
 * usage:
 *   check-explanation-ordinals.mjs <batch.json> [...]   report on THOSE files
 *   check-explanation-ordinals.mjs --live               the whole live bank
 *   check-explanation-ordinals.mjs --selftest           fixtures, no DB
 *
 * A22 (2026-10-02): until this date a batch path was IGNORED and the live
 * bank reported instead — byte-identical output for two different files —
 * and the self-test ran (and could process.exit) on IMPORT, so
 * apply-ordinal-fix.mjs ran it too. Now importing runs nothing. Exit 0
 * clean, 1 provably-wrong explanations found, 2 cannot process the input.
 */
import fs from 'fs'
import { isMain, parseCheckerArgs, loadBatchFile, loadLive, printDenominator, populationHeader, refuse } from './checker-input.mjs'

const USAGE = 'usage: check-explanation-ordinals.mjs <batch.json> [...] | --live | --selftest'

const ORD = { first: 0, second: 1, third: 2, fourth: 3 }
/** A following noun means the ordinal counts CONTENT, not options. */
const CONTENT_NOUNS = new Set(`equation equations equation's sentence sentences clause clauses
 paragraph line lines word words noun nouns verb phrase phrases infinitive infinitives gerund
 gerunds element elements item items list half halves part parts place condition conditions
 speaker speakers species week weeks day days friday monday tuesday wednesday thursday saturday
 sunday experiment experiments study studies figure table column row term terms draw reciprocal
 printer printer's volume volume's tin bronze thing things few two three set sets group groups
 stage step trial sample blank passage text quotation source claim premise number digit`.split(/\s+/))
/** These nouns DO name an option. */
const OPTION_NOUNS = new Set(['option', 'options', 'choice', 'choices', 'distractor', 'distractors', 'answer', 'reply'])

const stripQuoted = s => s.replace(/[“”][^“”]*[“”]/g, ' ').replace(/"[^"]*"/g, ' ').replace(/'[^']{6,}'/g, ' ')

/** A worked-arithmetic explanation counts equations and terms, never
 *  options — "double the first to get 6h+4d=27, then subtract the second".
 *  Four SAT Math items survived the noun and ellipsis rules by eliding the
 *  noun across a clause boundary; the reliable signal is the arithmetic
 *  itself. No item in this bank references an option by bare ordinal while
 *  also showing working. */
const looksLikeWorking = ex => /equation|=\s*[-\d(]|\d\s*[=+*/^]/.test(ex)

export function optionOrdinals(explanation) {
  if (looksLikeWorking(explanation)) return []
  const out = []
  // SENTENCE-SCOPED ELLIPSIS. "the second equation is a multiple of the
  // first" — the bare "the first" elides "equation" from earlier in the
  // same sentence, so it counts content too. Checking each ordinal in
  // isolation missed every one of these and kept all the SAT Math items
  // in the finding. If any ordinal in a sentence is followed by a content
  // noun, every ordinal in that sentence is a content reference.
  for (const sentence of stripQuoted(explanation).split(/(?<=[.;!?])\s+/)) {
    const ms = [...sentence.matchAll(/\bthe (first|second|third|fourth)\b(?:\s+([A-Za-z']+))?/gi)]
    if (!ms.length) continue
    const contentSentence = ms.some(m => {
      const w = (m[2] || '').toLowerCase()
      return w && CONTENT_NOUNS.has(w) && !OPTION_NOUNS.has(w)
    })
    if (contentSentence) continue
    for (const m of ms) out.push({ word: m[1].toLowerCase(), index: ORD[m[1].toLowerCase()] })
  }
  return out
}

const FIXTURES = [
  { n: 'bare ordinal + verb is an option ref', ex: 'the second echoes the sizes', want: [1] },
  { n: 'ordinal + content noun is NOT',        ex: 'the second equation is a multiple', want: [] },
  { n: 'the first two infinitives is NOT',     ex: 'the pattern set by the first two infinitives', want: [] },
  { n: 'in the first place is NOT',            ex: 'toward causation in the first place', want: [] },
  { n: 'the third element is NOT',             ex: 'so the third element must also be a gerund', want: [] },
  { n: 'the first distractor IS',              ex: 'The first distractor overstates the claim', want: [0] },
  { n: 'ordinal inside a quote is skipped',    ex: 'before my "first class" does', want: [] },
  { n: 'ordinal at end of clause IS',          ex: 'and the fourth is disproportionate', want: [3] },
  { n: 'elided noun in same sentence is NOT',  ex: 'the second equation is a multiple of the first.', want: [] },
  { n: 'elided across sentences is content',   ex: 'From the first equation, x=1. From the second, y=2.', want: [] },
  { n: 'two option refs in one sentence',      ex: 'the second echoes it, the third ignores it', want: [1, 2] },
  { n: 'worked arithmetic is never options',   ex: 'double the first to get 6h + 4d = 27, then subtract the second', want: [] },
  { n: 'prose with a digit is still prose',    ex: 'the second ignores the 40-minute warning', want: [1] },
]
/** Run the fixtures. Returns the number that failed. */
export function selftest(verbose = false) {
  let bad = 0
  for (const f of FIXTURES) {
    const got = optionOrdinals(f.ex).map(o => o.index)
    const ok = JSON.stringify(got) === JSON.stringify(f.want)
    if (!ok) bad++
    if (verbose || !ok) console.log(`${ok ? 'ok  ' : 'SELFTEST FAIL'}  ${f.n}  got ${JSON.stringify(got)} want ${JSON.stringify(f.want)}`)
  }
  console.log(bad ? `${bad} self-test(s) FAILED — detector is broken` : `selftest ${FIXTURES.length}/${FIXTURES.length} pass`)
  return bad
}

/** An explanation that names, by position, the slot holding the key. */
export function scanOrdinals(rows) {
  const broken = []
  let scorable = 0, cite = 0
  for (const r of rows) {
    const it = r.item || {}, ex = it.explanation, ch = it.choices
    if (!ex || !Array.isArray(ch)) continue
    const ki = ch.indexOf(it.correct_answer); if (ki < 0) continue
    scorable++
    const ords = optionOrdinals(ex)
    if (ords.length) cite++
    if (ords.some(o => o.index === ki)) broken.push({ id: r.id, family: r.family, task: r.task ?? r.item?.type ?? null, cohort: r.cohort, ki, ch, ex })
  }
  return { total: rows.length, scorable, cite, broken }
}

function report(label, rows) {
  const s = scanOrdinals(rows)
  console.log(`\nEXPLANATION ORDINALS vs KEY SLOT`)
  console.log(`  ${label}`)
  printDenominator('explanation + choices + key in choices', s.scorable, s.total)
  console.log('  explanations naming an option by position', s.cite)
  console.log('  PROVABLY WRONG (position = key)', s.broken.length)
  const by = f => { const m = {}; s.broken.forEach(b => m[f(b)] = (m[f(b)] || 0) + 1); return m }
  if (s.broken.length) {
    console.log('    by family:', JSON.stringify(by(b => b.family)))
    console.log('    by cohort:', JSON.stringify(by(b => b.cohort)))
    console.log('    by task  :', JSON.stringify(by(b => b.task)))
    for (const b of s.broken.slice(0, 8)) console.log(`    ${b.id}  key slot ${'ABCDE'[b.ki]}: ${String(b.ex).replace(/\s+/g, ' ').slice(0, 160)}`)
  }
  return s
}

if (isMain(import.meta.url)) {
  const { mode, paths } = parseCheckerArgs(process.argv, { name: 'check-explanation-ordinals.mjs', usage: USAGE })
  const stBad = selftest(mode === 'selftest')
  if (mode === 'selftest') process.exit(stBad ? 1 : 0)
  if (stBad) refuse('detector self-test failed — not running')
  let defects = 0
  if (mode === 'live') {
    const { rows } = await loadLive({ select: 'id,cohort,family,domain,task,item', filter: q => q.eq('archived', false) })
    const s = report(populationHeader('live'), rows)
    defects = s.broken.length
    // apply-ordinal-fix.mjs's review list; live mode only, never for a batch.
    fs.writeFileSync('/tmp/broken-ordinals.json', JSON.stringify(s.broken, null, 1))
  } else {
    for (const p of paths) defects += report(populationHeader('batch', p), loadBatchFile(p)).broken.length
  }
  process.exit(defects ? 1 : 0)
}
