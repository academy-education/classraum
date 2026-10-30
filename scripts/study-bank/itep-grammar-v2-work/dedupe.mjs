#!/usr/bin/env node
/**
 * dedupe.mjs — near-duplicate / shared-frame check for iTEP SLATE Grammar v2 (ITEP-SLATE-GRAMMAR-V2.prereg.md §2).
 * Built because the pilot's one cross-author finding was two authors converging on one sentence frame
 * (pending lesson 2: C06/E09 "should have ... but nobody remembered", C04/C12 both "Priya", C11/E11 careful/carefully).
 *
 *   node scripts/study-bank/itep-grammar-v2-work/dedupe.mjs <items.json ...> --expect 250 \
 *        --against scripts/study-bank/itep-grammar-v1-work/items/author-a.json [--against ...] [--all-pairs]
 *
 * A pair is compared when at least one member is a NEW item (an input file); --against items are compared with
 * new items but not with each other unless --all-pairs (used to break-test on the pilot, whose known collisions
 * it must reproduce). FAIL rules, per pair:
 *   F1 shared proper name (capitalised token that is not a function word, a stop-listed common noun, or a word
 *      seen lower-case anywhere in the corpus)
 *   F2 shared content root in the KEY text (careful / carefully = one root)
 *   F3 shared word 4-gram (names masked) containing at least 2 content words
 *   F4 same category AND at least 3 shared content roots in the sentence
 * WARN (printed, not failing): 4+ shared content roots across categories; a shared content 3-gram.
 * Exits 2 on unreadable/empty input or a count other than --expect (never a verdict over unread data),
 * 1 on any FAIL, 0 otherwise. Prints its denominators.
 */
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const die = m => { console.error(`dedupe: ${m}`); process.exit(2) }
const valIdx = new Set(); const vals = k => args.flatMap((a, i) => a === k ? (valIdx.add(i + 1), [args[i + 1]]) : [])
const expect = Number(vals('--expect')[0])
const against = vals('--against')
const allPairs = args.includes('--all-pairs')
const files = args.filter((a, i) => !a.startsWith('--') && !valIdx.has(i))
if (!files.length) die('no item files given')
if (!Number.isInteger(expect) || expect < 1) die('--expect <n> is required')

const load = (f, isNew) => {
  let j
  try { j = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { die(`${f}: unreadable (${e.message})`) }
  if (!Array.isArray(j) || !j.length) die(`${f}: not a non-empty JSON array`)
  for (const it of j) if (!it || typeof it.passage !== 'string' || typeof it.correct_answer !== 'string' || !it.id) die(`${f}: item without id/passage/correct_answer`)
  return j.map(it => ({ ...it, isNew, file: f }))
}
const fresh = files.flatMap(f => load(f, true))
if (fresh.length !== expect) die(`read ${fresh.length} new items from ${files.length} file(s), expected ${expect}`)
const old = against.flatMap(f => load(f, false))
const all = [...fresh, ...old]

const STOP = new Set(`a an the and or but so nor for yet of in on at to from by with without about into onto over under
after before during since until till than then as if unless because although though while whereas when whenever where
wherever which who whom whose what that this these those there here it its it's i me my mine we us our ours you your
yours he him his she her hers they them their theirs myself yourself himself herself itself ourselves themselves one
ones is am are was were be been being have has had having do does did doing done will would shall should can could
may might must ought need not no never always also too very just only even still already yet again more most less
least much many some any all each every both either neither few little lot lots other another such own same up down
out off away back how why whether once ago get got gets getting go goes went gone going make made makes let lets
s t don't doesn't didn't isn't aren't wasn't weren't hasn't haven't hadn't won't wouldn't can't couldn't shouldn't
mustn't`.split(/\s+/))
const STOPCAPS = new Set(['I', 'Mr', 'Ms', 'Mrs', 'Dr', 'Coach', 'Professor', 'Ranger', 'Chef', 'Aunt', 'Uncle', 'Mom', 'Dad',
  'Grandma', 'Grandpa', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February',
  'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'English', 'Spanish',
  'French', 'Korean', 'Chinese', 'Japanese', 'German', 'Earth', 'Moon', 'Sun', 'Math', 'Science', 'History', 'Art', 'Music',
  // common sentence starters (a capital at the start of a sentence is not a name)
  'Yesterday', 'Today', 'Tomorrow', 'Tonight', 'Last', 'Next', 'Usually', 'Often', 'Sometimes', 'Please', 'Instead',
  'Despite', 'However', 'Therefore', 'Moreover', 'Unless', 'Whenever', 'Every', 'Each', 'Most', 'Many', 'Some', 'Both',
  'Everyone', 'Nobody', 'Someone', 'Anyone', 'Visitors', 'Students', 'Passengers', 'Remember', 'Don\'t', 'Had', 'Were', 'Should', 'Dear', 'Hi', 'Hello', 'Attention', 'Welcome', 'Good'])
// A sentence-initial -ing / -ed / -ly word (Walking to school, ...; Built in 1900, ...; Luckily, ...) is not a name.
const initialForm = w => /^[A-Z][a-z]+(ing|ed|ly)$/.test(w)

const sentenceOf = it => {
  if (/\[[A-D]:/.test(it.passage)) return it.passage.replace(/\[[A-D]:\s?([^\]]*)\]/g, '$1')
  return it.passage.replace(/_{4,}/, it.correct_answer)
}
const words = s => s.match(/[A-Za-z][A-Za-z'-]*/g) || []
const lowerSeen = new Set(all.flatMap(it => words(sentenceOf(it)).filter(w => w === w.toLowerCase())))
const isName = w0 => { const w = w0.replace(/'s$/, ''); return /^[A-Z]/.test(w) && !initialForm(w) && !STOPCAPS.has(w) && !STOP.has(w.toLowerCase()) && !lowerSeen.has(w.toLowerCase()) }
const stem = w => {
  let s = w.toLowerCase().replace(/'s$/, '')
  if (s.length > 4 && s.endsWith('ies')) return s.slice(0, -3) + 'y'
  for (const suf of ['ly', 'ing', 'ed', 'es', 's']) if (s.length - suf.length >= 4 && s.endsWith(suf)) { s = s.slice(0, -suf.length); break }
  return s
}
const isContent = w => w !== 'NAME' && !STOP.has(w.toLowerCase()) && w.length >= 3

for (const it of all) {
  const ws = words(sentenceOf(it))
  it.names = new Set(ws.filter(isName).map(w => w.replace(/'s$/, '')))
  const masked = ws.map(w => isName(w) ? 'NAME' : w.toLowerCase())
  it.roots = new Set(masked.filter(isContent).map(stem))
  it.keyRoots = new Set(words(it.correct_answer).filter(w => isContent(w) && !isName(w)).map(stem))
  const grams = n => { const g = new Set(); for (let i = 0; i + n <= masked.length; i++) { const t = masked.slice(i, i + n); if (t.filter(isContent).length >= 2) g.add(t.join(' ')) } return g }
  it.g4 = grams(4); it.g3 = grams(3)
}

const inter = (a, b) => [...a].filter(x => b.has(x))
const fails = [], warns = []
let pairs = 0
for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
  const a = all[i], b = all[j]
  if (!a.isNew && !b.isNew && !allPairs) continue
  pairs++
  const tag = `${a.id} x ${b.id}`
  const n = inter(a.names, b.names); if (n.length) fails.push(`F1 ${tag}: shared name ${n.join(', ')}`)
  const k = inter(a.keyRoots, b.keyRoots); if (k.length) fails.push(`F2 ${tag}: shared key root ${k.join(', ')} (keys ${JSON.stringify(a.correct_answer)} / ${JSON.stringify(b.correct_answer)})`)
  const g = inter(a.g4, b.g4); if (g.length) fails.push(`F3 ${tag}: shared 4-gram "${g[0]}"${g.length > 1 ? ` (+${g.length - 1})` : ''}`)
  const r = inter(a.roots, b.roots)
  if (a.category === b.category && r.length >= 3) fails.push(`F4 ${tag}: same category (${a.category}) and ${r.length} shared roots: ${r.join(', ')}`)
  else if (r.length >= 4) warns.push(`W ${tag}: ${r.length} shared roots: ${r.join(', ')}`)
  const g3 = inter(a.g3, b.g3); if (g3.length && !g.length) warns.push(`W ${tag}: shared 3-gram "${g3[0]}"`)
}
console.log(`read ${fresh.length} new item(s) from ${files.length} file(s) + ${old.length} reference item(s); compared ${pairs} pairs${allPairs ? ' (all pairs)' : ''}`)
const byRule = r => fails.filter(f => f.startsWith(r)).length
console.log(`FAIL by rule: F1 names ${byRule('F1')} | F2 key roots ${byRule('F2')} | F3 4-grams ${byRule('F3')} | F4 same-category roots ${byRule('F4')} | warnings ${warns.length}`)
if (args.includes('--warn')) warns.forEach(w => console.log('  ' + w))
if (fails.length) { fails.forEach(f => console.log('  ' + f)); process.exit(1) }
console.log('PASS: no shared names, key roots or frames')
