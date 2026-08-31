/**
 * check-kill-spans.mjs — the mechanical half of the s3 gate.
 *
 * Every variant answer must carry, for each SIBLING variant, a verbatim
 * span from its OWN passage that makes that sibling's answer false. This
 * script checks only the cheap half: does the span actually appear in
 * that passage, character for character.
 *
 * WHAT THIS CANNOT DO, stated because the s2 failure was exactly a check
 * that looked sufficient and was not: it cannot tell whether the span
 * REFUTES the sibling or merely sits near the topic. "The lighthouse was
 * repainted in June" is a valid verbatim span and a worthless kill. That
 * judgement is semantic and belongs to the agent gate. A PASS here means
 * the author did not invent quotes; it does not mean the items are sound.
 *
 *   node check-kill-spans.mjs <topics.json> [...more]
 *   node check-kill-spans.mjs --selftest
 *
 * Exit 1 if any topic fails. Failing topics are named so they can be
 * dropped as a unit — a topic with a fabricated kill is not partially
 * salvageable, because the same author wrote all of it.
 */
import { readFileSync } from 'node:fs'

/** Authors reflow whitespace; a kill that differs only in spacing is a
 *  real quote and refusing it would send them chasing invisible bugs. */
const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim()

/**
 * META-TEXTUAL non-assertions dressed as kills.
 *
 * The defect is a claim about the PASSAGE'S SILENCE ("the passage never
 * mentions a flood"), which refutes nothing: the other variant's world
 * may simply be elsewhere in the text.
 *
 * A claim about the WORLD is the opposite and must PASS, even when it is
 * grammatically negative. "Nothing about her puzzled me" positively
 * asserts the narrator's state and flatly contradicts a sibling answer
 * that says she was puzzled. "The crew had published nothing about these
 * fish" is a fact about the crew, not about the prose.
 *
 * The first draft of this pattern matched the bare substring "nothing
 * about" and condemned both kinds. It flagged 8 spans across RW3-S06 and
 * RW3-S07 — every one of them a legitimate in-world negation — and would
 * have dropped two sound topics. The subject of the sentence is what
 * separates the classes, so the pattern now requires an explicitly
 * textual subject.
 */
const TEXT_SUBJECT = '(?:the )?(?:passage|text|excerpt|author|writer|narrator|account|article)'
const NON_ASSERTION = new RegExp(
  `\\b${TEXT_SUBJECT}\\s+(?:never|does not|doesn't|did not|didn't)\\s+(?:say|says|mention|mentions|state|states|tell|tells)`
  + `|\\bno mention (?:of|is made)`
  + `|\\b(?:is|are) (?:never )?mentioned nowhere`
  + `|\\b${TEXT_SUBJECT}\\s+is silent\\b`
  + `|\\bnothing in the (?:passage|text|excerpt)\\b`,
  'i')

export function run(topics) {
  const fails = [], warns = []
  let spans = 0, checked = 0

  for (const t of topics) {
    const V = t.variants ?? []
    const labels = V.map(v => v.label)
    const bad = []

    for (const v of V) {
      const hay = norm(v.passage)
      if (!hay) { bad.push(`${v.label}: empty passage`); continue }

      for (const a of v.answers ?? []) {
        const kills = a.kills ?? {}
        const want = labels.filter(l => l !== v.label)
        checked++

        for (const sib of want) {
          const span = kills[sib]
          if (!span) { bad.push(`${v.label} ${a.qid}: no kill for ${sib}`); continue }
          spans++
          if (NON_ASSERTION.test(span)) {
            bad.push(`${v.label} ${a.qid} -> ${sib}: kill is a non-assertion ("${String(span).slice(0, 60)}…")`)
            continue
          }
          if (!hay.includes(norm(span))) {
            bad.push(`${v.label} ${a.qid} -> ${sib}: span not in own passage ("${String(span).slice(0, 60)}…")`)
          }
        }

        // A kill quoting a variant that does not exist is a sign the
        // author worked from a different variant count than they shipped.
        for (const k of Object.keys(kills)) {
          if (!labels.includes(k)) bad.push(`${v.label} ${a.qid}: kill names unknown variant ${k}`)
          if (k === v.label) bad.push(`${v.label} ${a.qid}: kill names itself`)
        }
      }
    }

    // N variants must produce exactly N options — the s2 lesson.
    // SSAT topics (…-S…) are 5-choice, ISEE topics (…-I…) 4-choice. Keyed on
    // the letter, not the batch number, so a new batch (RW4-S…) is not
    // silently held to the ISEE count.
    const wantN = /^RW\d+-S/.test(String(t.topic_id)) ? 5 : 4
    if (V.length !== wantN) bad.push(`${V.length} variants, expected ${wantN} for ${t.topic_id}`)

    if (bad.length) fails.push(`${t.topic_id}: ${bad.length} problem(s)\n      - ` + bad.slice(0, 6).join('\n      - ')
      + (bad.length > 6 ? `\n      - …and ${bad.length - 6} more` : ''))
    else warns.push(`${t.topic_id}: ${V.length} variants clean`)
  }

  return { fails, warns, spans, checked }
}

function selftest() {
  const mk = (kills, passage = 'The lamp was lit at dusk. The keeper stayed ashore all winter.') => ([{
    topic_id: 'RW3-I99',
    variants: ['W1', 'W2', 'W3', 'W4'].map(l => ({
      label: l, passage,
      // Siblings get a valid kill for every OTHER label — including
      // themselves would be the "kill names itself" defect, which the
      // first draft of this fixture actually had and the checker caught.
      answers: [{
        qid: 'q1', answer: 'a', why: 'w',
        kills: l === 'W1' ? kills : Object.fromEntries(
          ['W1', 'W2', 'W3', 'W4'].filter(o => o !== l)
            .map(o => [o, 'The lamp was lit at dusk'])),
      }],
    })),
  }])

  // 1. a good topic passes
  const good = run(mk({ W2: 'The keeper stayed ashore all winter', W3: 'The lamp was lit at dusk', W4: 'The keeper stayed ashore' }))
  if (good.fails.length) { console.error('SELFTEST FAIL: clean topic rejected —', good.fails); process.exit(1) }

  // 2. a fabricated span is caught
  const fake = run(mk({ W2: 'The keeper sailed home in October', W3: 'The lamp was lit at dusk', W4: 'The lamp was lit at dusk' }))
  if (!fake.fails.some(f => f.includes('span not in own passage'))) {
    console.error('SELFTEST FAIL: invented quote not caught'); process.exit(1)
  }

  // 3. a META-TEXTUAL non-assertion is caught
  for (const meta of [
    'the passage never says the keeper left',
    'The text does not mention a storm',
    'nothing in the passage supports it',
  ]) {
    const weak = run(mk({ W2: meta, W3: 'The lamp was lit at dusk', W4: 'The lamp was lit at dusk' },
      `The lamp was lit at dusk. The keeper stayed ashore all winter. ${meta}`))
    if (!weak.fails.some(f => f.includes('non-assertion'))) {
      console.error(`SELFTEST FAIL: meta non-assertion not caught — "${meta}"`); process.exit(1)
    }
  }

  // 3b. IN-WORLD negations must PASS. These are positive claims about the
  // world that genuinely contradict a sibling, and the first draft of the
  // pattern condemned all of them.
  for (const world of [
    'Nothing about her puzzled me',
    'The crew had published nothing about these fish before',
    'no surveyor had yet sounded the riverbed',
  ]) {
    const ok = run(mk({ W2: world, W3: 'The lamp was lit at dusk', W4: 'The lamp was lit at dusk' },
      `The lamp was lit at dusk. The keeper stayed ashore all winter. ${world}.`))
    if (ok.fails.length) {
      console.error(`SELFTEST FAIL: in-world negation wrongly condemned — "${world}"`, ok.fails); process.exit(1)
    }
  }

  // 4. a missing kill is caught
  const missing = run(mk({ W2: 'The lamp was lit at dusk' }))
  if (!missing.fails.some(f => f.includes('no kill for'))) {
    console.error('SELFTEST FAIL: missing kill not caught'); process.exit(1)
  }

  // 5. whitespace reflow must NOT be treated as a fabrication
  const reflow = run(mk({ W2: 'The keeper   stayed\nashore all winter', W3: 'The lamp was lit at dusk', W4: 'The lamp was lit at dusk' }))
  if (reflow.fails.length) { console.error('SELFTEST FAIL: whitespace reflow rejected —', reflow.fails); process.exit(1) }

  console.log('selftest OK — catches invented spans, META-textual non-assertions and missing kills; passes clean topics, whitespace reflow and IN-WORLD negations')
}

const args = process.argv.slice(2)
if (args[0] === '--selftest') { selftest(); process.exit(0) }
if (!args.length) { console.error('usage: check-kill-spans.mjs <topics.json> [...] | --selftest'); process.exit(1) }
const topics = args.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
const { fails, warns, spans, checked } = run(topics)
for (const w of warns) console.log(`  ok  ${w}`)
console.log(`\n${spans} kill spans across ${checked} answers in ${topics.length} topics`)
if (fails.length) { console.error('\nFAIL:'); for (const f of fails) console.error('  - ' + f); process.exit(1) }
console.log('all kill spans verbatim')
