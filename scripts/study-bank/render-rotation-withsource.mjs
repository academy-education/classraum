/**
 * Render rotation-v1 WITH the stimulus, for the second gate.
 *
 * The blind attack asks "can you answer without the source". This asks
 * the opposite and equally necessary question: "is the item still worth
 * anything WHEN you have the source". Both endpoints previously measured
 * failed here, in opposite directions:
 *
 *   options from unrelated items   blind +9.9  BUT 0% hard with source
 *                                  (obviously wrong once you hear it)
 *   options as mutations of key    with-source fine, blind +40.4
 *
 * So a low blind margin alone proves nothing. An item nobody can guess
 * AND nobody can reason about is not a hard item, it is a broken one.
 *
 * Two failure modes are being watched, and they pull opposite ways:
 *   TOO EASY      the key is obvious the moment the stimulus is read;
 *                 the distractors were never live.
 *   TOO AMBIGUOUS more than one option is defensible even WITH the
 *                 stimulus. The previous pilot hit this on 16 items —
 *                 the elimination gate and the with-source gate pull
 *                 against each other and the corridor is narrow.
 *
 * Letters are reused from the blind render so an item's id means the
 * same thing in both files and the two runs can be compared per item.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const base = new URL('./rotation-v1', import.meta.url).pathname
const blind = JSON.parse(readFileSync(`${base}.blind.json`, 'utf8'))
const expanded = JSON.parse(readFileSync(new URL('./.rotation-expanded.json', import.meta.url).pathname, 'utf8'))

// Match blind items back to their stimulus by the option SET plus key,
// never by index — the blind render shuffled item order, and pairing on
// position would silently mismatch stimulus to options.
const withSource = blind.map(b => {
  const opts = Object.values(b.options)
  const matches = expanded.filter(e =>
    e.choices.length === opts.length && e.choices.every(c => opts.includes(c)))
  if (matches.length === 0) throw new Error(`item ${b.id}: no source item has this option set`)
  // Within a family all four items share the option set, so disambiguate
  // by which option is the key at this item's letter.
  const keyText = b.options[JSON.parse(readFileSync(`${base}.key.json`, 'utf8'))[b.id].letter]
  const exact = matches.filter(m => m.correct_answer === keyText)
  if (exact.length !== 1) throw new Error(`item ${b.id}: ${exact.length} source items match (expected 1)`)
  return {
    id: b.id,
    stimulus: exact[0].passage.replace(/^Transcript:\s*/, ''),
    question: b.question,
    options: b.options,
  }
})

writeFileSync(`${base}.withsource-input.json`, JSON.stringify(withSource, null, 2))
console.log(`wrote ${withSource.length} items with stimulus -> rotation-v1.withsource-input.json`)
console.log('every item matched exactly one source stimulus')
