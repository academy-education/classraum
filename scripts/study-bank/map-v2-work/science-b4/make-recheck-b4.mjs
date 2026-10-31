#!/usr/bin/env node
// Build the fresh re-check packets for stage 1's single-grader returns (MAP-SCIENCE-B4.prereg.md rules 2 and 9: "one grader -> one
// return; a fresh grader re-checks; a second hit -> drop"). Reads STAGE1-DECISION.json (from score-b4.mjs) and
// the keyed packets in packets/hold/. Writes scratchpad/map-science-b4/recheck/<area>/{packet.md,questions.json}.
// The re-checker sees the item(s) and the field to check, never the first grader's words.
//   node make-recheck-b4.mjs [--root <repo>]
import fs from 'node:fs'
import path from 'node:path'
const args = process.argv.slice(2)
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const ROOT = path.resolve(flag('--root', process.cwd()))
const SP = path.join(ROOT, 'scratchpad/map-science-b4')
const die = (m) => { console.error('FATAL: ' + m); process.exit(2) }
const decPath = path.join(ROOT, 'scripts/study-bank/map-v2-work/science-b4/STAGE1-DECISION.json')
if (!fs.existsSync(decPath)) die('run score-b4.mjs first')
const dec = JSON.parse(fs.readFileSync(decPath, 'utf8'))
const Q = {
  second_defensible: 'Is a distractor defensible by a careful grade-level student from this stimulus and stem (co-founder rule A1; check for a correlated twin, B11)? If yes, name the option letter.',
  b1_option_set: 'B1: can the option set decide this compare-or-variable item without the stimulus?',
  b1_qualifier: 'B2: does one trend option carry a qualifier the others lack?',
  b1_absolute: 'B3: is one claim option the lone absolute or the lone hedged one?',
  b1_stated_law: 'B4: does the targeted standard state the relationship the data show, so the figure is decoration? Read the PRIOR-FREE claim and say whether it holds (hit = it does NOT hold).',
  b1_name_property: 'B5: does an invented name announce the property the stem asks about?',
  b2_label_shape: "B6: in a compare item, does the key's label look different from the others?",
  b2_duplicate: 'B7: do these two items test the same system, concept or key, so one of them should not be in the bank beside the other?',
  b3_trend_parallel: 'B13: does one trend option carry a clause, subject, qualifier or time phrase the others lack?',
  b3_role_statement: "B14/B27: does the procedure state a quantity's role so the variable key is a word lookup?",
  b3_stem_echo: 'B36: does the key alone repeat a word (or word stem) from the stem, in a way that picks it?',
  b3_interp_cast: 'B16: in an interpolation item, is the key the only unprinted option or the only midpoint of two others?',
  b3_bar_extreme: 'B20: in a read item, can the position of the options on the chart decide it without reading the asked bar (the key the only option on a tick label, the only option equal to a bar, the only one not equal to the tallest/shortest bar)?',
  b3_claim_marker: 'B18/B23/B31: in a claim (or term) item, does a reason or degree word sit on one option or all but one? Are the misconception distractors absurd, of another category, or self-contradicting, so the one sensible option is the key? Is the key the lone Yes/No?',
  b3p2_direction: 'B21: in a trend item, is the key the only option carrying the data\'s direction, or the only compound / only simple option? Is a distractor merely an incomplete version of the key (defensible)?',
  b3p2_general_knowledge: 'B24/B28: in a data or investigation item, is the key the only option a student who knows the topic would find plausible without the figure?',
  b4_one_sensible: "B38: in a model item, is any distractor absurd, of another category than the key, denying the stem's own premise, or a belief no grade-level student actually holds, so fewer than three options are live? Read each distractor's declared misconception and judge whether a real student holds it.",
  b4_lamarck: 'B39: does any option attribute change to need, will, effort, use or learning?',
  b4_var_plan: 'B33: does this variable passage introduce its options in a sentence plan (after noted/wrote down, a first..then series, one-value phrases, a label/card naming one option) so the roles can be read off sentence shape?',
  b4_keyword: 'B35: does the key carry a content word that sits on keys and not on distractors across this area (judge from this item: is the word on the key and on no distractor, and is it a cue)?',
  b4_cross_naming: "B37: does one of these items' passage, prompt or figure name the other item's key, or hand over the fact it tests?",
  b4_plausibility: 'B40/B41: are the invented numbers the right SIZE for the real system, is the curve the real device\'s shape, is the table an exact textbook law, is a model distractor true somewhere in the world, or does the explanation misdescribe its own figure?',
}
for (const [area, d] of Object.entries(dec.areas)) {
  const md = fs.readFileSync(path.join(SP, `packets/hold/${area}-keyed.md`), 'utf8')
  const blocks = {}
  for (const b of md.split(/\n(?=## MSB4-)/).slice(1)) blocks[b.match(/^## (MSB4-\S+)/)[1]] = b.trim()
  const qs = [], need = new Set()
  for (const r of d.returns) {
    if (!Q[r.field]) die('no question text for ' + r.field)
    const ids = r.pair ? r.pair : [r.id]
    ids.forEach((x) => { if (!blocks[x]) die('no keyed block for ' + x); need.add(x) })
    qs.push({ id: r.id, field: r.field, items: ids, question: r.pair ? `${Q[r.field]} Pair: ${ids.join(' and ')}.` : Q[r.field] })
  }
  const dir = path.join(SP, `recheck/${area}`); fs.mkdirSync(dir, { recursive: true })
  const order = [...need].sort()
  fs.writeFileSync(path.join(dir, 'packet.md'), `# MAP Science b4: re-check packet (${area}, KEYED), ${order.length} items\n\nRead GRADER-BRIEF.md and BRIEF-grader.md first. Options are in presentation order.\n\n` + order.map((x) => blocks[x]).join('\n\n') + '\n')
  fs.writeFileSync(path.join(dir, 'questions.json'), JSON.stringify(qs, null, 1) + '\n')
  console.log(`${area}: ${qs.length} questions over ${order.length} items -> ${path.relative(ROOT, dir)}`)
}
