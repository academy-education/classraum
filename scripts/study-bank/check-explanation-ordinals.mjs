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
import fs from 'fs'
const env = fs.readFileSync('.env.local', 'utf8')
const g = k => env.match(new RegExp('^' + k + '=(.*)$', 'm'))[1].trim()
const U = g('NEXT_PUBLIC_SUPABASE_URL'), K = g('SUPABASE_SERVICE_ROLE_KEY')

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
let bad = 0
for (const f of FIXTURES) {
  const got = optionOrdinals(f.ex).map(o => o.index)
  if (JSON.stringify(got) !== JSON.stringify(f.want)) { bad++; console.log('SELFTEST FAIL:', f.n, 'got', got, 'want', f.want) }
}
if (bad) { console.log('detector is broken — refusing to run'); process.exit(1) }

if (process.argv[1].endsWith('check-explanation-ordinals.mjs')) {
  console.log(`selftest ${FIXTURES.length}/${FIXTURES.length} pass\n`)
  const all = async q => { let o = [], f = 0
    for (;;) { const r = await fetch(`${U}/rest/v1/study_item_bank?${q}`, { headers: { apikey: K, Authorization: 'Bearer ' + K, Range: `${f}-${f + 999}` } })
      const d = await r.json(); if (!Array.isArray(d)) throw new Error(JSON.stringify(d)); o = o.concat(d); if (d.length < 1000) break; f += 1000 }
    return o }
  const rows = await all('select=id,cohort,family,domain,task,item&archived=is.false')
  const broken = []
  let cite = 0
  for (const r of rows) {
    const it = r.item || {}, ex = it.explanation, ch = it.choices
    if (!ex || !Array.isArray(ch)) continue
    const ki = ch.indexOf(it.correct_answer); if (ki < 0) continue
    const ords = optionOrdinals(ex)
    if (ords.length) cite++
    if (ords.some(o => o.index === ki)) broken.push({ id: r.id, family: r.family, task: r.task, cohort: r.cohort, ki, ch, ex })
  }
  console.log('live items scanned          ', rows.length)
  console.log('explanations naming an option by position', cite)
  console.log('PROVABLY WRONG (position = key)', broken.length)
  const by = f => { const m = {}; broken.forEach(b => m[f(b)] = (m[f(b)] || 0) + 1); return m }
  console.log('  by family:', JSON.stringify(by(b => b.family)))
  console.log('  by cohort:', JSON.stringify(by(b => b.cohort)))
  console.log('  by task  :', JSON.stringify(by(b => b.task)))
  fs.writeFileSync('/tmp/broken-ordinals.json', JSON.stringify(broken, null, 1))
}
