#!/usr/bin/env node
// Build the fresh re-check packets for stage 1's single-grader returns (prereg rules 2 and 9: "one grader -> one
// return; a fresh grader re-checks; a second hit -> drop"). Reads STAGE1-DECISION.json (from score-b3full.mjs) and
// the keyed packets in packets/hold/. Writes scratchpad/map-science-b3full/recheck/<area>/{packet.md,questions.json}.
// The re-checker sees the item(s) and the field to check, never the first grader's words.
//   node make-recheck-b3full.mjs [--root <repo>]
import fs from 'node:fs'
import path from 'node:path'
const args = process.argv.slice(2)
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const ROOT = path.resolve(flag('--root', process.cwd()))
const SP = path.join(ROOT, 'scratchpad/map-science-b3full')
const die = (m) => { console.error('FATAL: ' + m); process.exit(2) }
const decPath = path.join(ROOT, 'scripts/study-bank/map-v2-work/science-b3full/STAGE1-DECISION.json')
if (!fs.existsSync(decPath)) die('run score-b3full.mjs first')
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
  b3_stem_echo: 'B15: does the key alone repeat a word (or word stem) from the stem?',
  b3_interp_cast: 'B16: in an interpolation item, is the key the only unprinted option or the only midpoint of two others?',
  b3_bar_extreme: 'B20: in a read item, can the position of the options on the chart decide it without reading the asked bar (the key the only option on a tick label, the only option equal to a bar, the only one not equal to the tallest/shortest bar)?',
  b3_claim_marker: 'B18/B23/B31: in a claim (or term) item, does a reason or degree word sit on one option or all but one? Are the misconception distractors absurd, of another category, or self-contradicting, so the one sensible option is the key? Is the key the lone Yes/No?',
  b3p2_direction: 'B21: in a trend item, is the key the only option carrying the data\'s direction, or the only compound / only simple option? Is a distractor merely an incomplete version of the key (defensible)?',
  b3p2_general_knowledge: 'B24/B28: in a data or investigation item, is the key the only option a student who knows the topic would find plausible without the figure?',
}
for (const [area, d] of Object.entries(dec.areas)) {
  const md = fs.readFileSync(path.join(SP, `packets/hold/${area}-keyed.md`), 'utf8')
  const blocks = {}
  for (const b of md.split(/\n(?=## MSB3-)/).slice(1)) blocks[b.match(/^## (MSB3-\S+)/)[1]] = b.trim()
  const qs = [], need = new Set()
  for (const r of d.returns) {
    if (!Q[r.field]) die('no question text for ' + r.field)
    const ids = r.pair ? r.pair : [r.id]
    ids.forEach((x) => { if (!blocks[x]) die('no keyed block for ' + x); need.add(x) })
    qs.push({ id: r.id, field: r.field, items: ids, question: r.pair ? `${Q.b2_duplicate} Pair: ${ids.join(' and ')}.` : Q[r.field] })
  }
  const dir = path.join(SP, `recheck/${area}`); fs.mkdirSync(dir, { recursive: true })
  const order = [...need].sort()
  fs.writeFileSync(path.join(dir, 'packet.md'), `# MAP Science b3 full: re-check packet (${area}, KEYED), ${order.length} items\n\nRead GRADER-BRIEF.md and BRIEF-grader.md first. Options are in presentation order.\n\n` + order.map((x) => blocks[x]).join('\n\n') + '\n')
  fs.writeFileSync(path.join(dir, 'questions.json'), JSON.stringify(qs, null, 1) + '\n')
  console.log(`${area}: ${qs.length} questions over ${order.length} items -> ${path.relative(ROOT, dir)}`)
}
