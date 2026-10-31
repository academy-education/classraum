// breaktest-check.mjs — prereg §3 break test for the v2 pre-flight: each mutation of a real author file (items/A.json)
// must make itep-reading-check.mjs fail with the named problem. Run from this directory.
//   node breaktest-check.mjs <tmpdir>
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const tmp = process.argv[2]; if (!tmp) { console.error('usage: breaktest-check.mjs <tmpdir>'); process.exit(2) }
const base = () => JSON.parse(readFileSync('items/A.json', 'utf8'))
const N = String(base().sets.reduce((a, s) => a + s.items.length, 0))
const names = JSON.parse(readFileSync('existing-names.json', 'utf8'))
const H = /\b(may|might|some|partly|perhaps|could|somewhat|likely|probably|seem|seems|usually|often)\b/i
const all = d => d.sets.flatMap(s => s.items)
const swapChoice = (it, i, nv) => { const old = it.choices[i]; it.choices[i] = nv; if (it.correct_answer === old) { it.correct_answer = nv; it.explanation = `"${nv}" is correct.` } for (const r of it.distractor_rationales) if (r.choice === old) { r.choice = nv; r.reason = `"${nv}" x` } }
const cases = {
  'why not verbatim': [d => { d.sets[0].items[0].why = 'zzqq not in the text' }, /why is not verbatim/],
  'inference without why2': [d => { delete all(d).find(i => i.kind === 'inference').why2 }, /inference needs a verbatim why2/],
  'name shared across sets': [d => { const s = d.sets.find(x => x.names.length); d.sets.find(x => x !== s).names.push(s.names[0]) }, /also used in/],
  'name from the bank list': [d => { d.sets[0].names.push(Object.keys(names).find(n => /^[AB]/.test(n))) }, /already used in a bank passage/],
  'length ratio over 1.5': [d => { const it = all(d).find(i => i.kind === 'detail'); const i = it.choices.findIndex(c => c !== it.correct_answer); swapChoice(it, i, it.choices[i] + ' and then a great deal more words to make this option very long indeed') }, /length ratio/],
  'key lone hedge 3/3': [d => { let n = 0; for (const it of all(d)) { if (n === 3 || it.kind === 'vocabulary' || it.choices.some(c => H.test(c))) continue; const k = it.correct_answer; swapChoice(it, it.choices.indexOf(k), 'Probably ' + k[0].toLowerCase() + k.slice(1)); n++ } }, /lone "hedge" in \d+\/\d+ items \(>= 75%\)/],
  'fifth choice': [d => { d.sets[3].items[0].choices.push('an extra fifth option here') }, /needs 4 distinct choices/],
  'wrong kind order': [d => { const its = d.sets.find(s => s.part === 3).items; [its[0], its[1]] = [its[1], its[0]] }, /kinds .* assigned/],
  'key breaks assigned length rank': [d => { const a = JSON.parse(readFileSync('ASSIGNED.json', 'utf8')).authors.A.sets; const s = d.sets.find(s => a[s.set_id.split('-').pop()].items.some(p => p.key_length === 'shortest')); const j = a[s.set_id.split('-').pop()].items.findIndex(p => p.key_length === 'shortest'); const it = s.items[j]; const L = Math.max(...it.choices.map(c => c.length)); swapChoice(it, it.choices.indexOf(it.correct_answer), it.correct_answer + ' '.repeat(0) + ' in the end'.repeat(Math.ceil((L - it.correct_answer.length + 2) / 11))) }, /assigned shortest/],
  'gendered option without the pronoun in the text': [d => { const s = d.sets.find(s => !/\b(she|her|hers)\b/i.test(s.passage)); const it = s.items[0]; const i = it.choices.findIndex(c => c !== it.correct_answer); swapChoice(it, i, it.choices[i] + ' for her') }, /uses "her" but the passage never does/],
}
let ok = 0
for (const [name, [mut, re]] of Object.entries(cases)) {
  const d = base(); mut(d); const f = `${tmp}/bt2-${name.replace(/\W+/g, '_')}.json`; writeFileSync(f, JSON.stringify(d))
  let out = '', code = 0
  try { out = execFileSync('node', ['itep-reading-check.mjs', f, '--expect', N, '--assigned', 'ASSIGNED.json', '--existing-names', 'existing-names.json'], { encoding: 'utf8' }) } catch (e) { out = e.stdout; code = e.status }
  const hit = code === 1 && re.test(out)
  console.log(`${hit ? 'FIRES ' : 'MISSED'} ${name}${hit ? '' : `\n${out}`}`); if (hit) ok++
}
console.log(`break test: ${ok}/${Object.keys(cases).length} mutations caught`)
process.exit(ok === Object.keys(cases).length ? 0 : 1)
