// breaktest-check.mjs — prereg §3 break test: each mutation of a real author file must make the pre-flight fail
// with the named problem. Run from this directory. Writes temp files into the session scratch dir given as argv[2].
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const tmp = process.argv[2]; if (!tmp) { console.error('usage: breaktest-check.mjs <tmpdir>'); process.exit(2) }
const base = () => JSON.parse(readFileSync('items/A.json', 'utf8'))
const names = JSON.parse(readFileSync('existing-names.json', 'utf8'))
const H = /\b(may|might|some|partly|perhaps|could|somewhat|likely|probably|seem|seems|usually|often)\b/i
const cases = {
  'why not verbatim': [d => { d.sets[0].items[0].why = 'zzqq not in the text'; }, /why is not verbatim/],
  'inference without why2': [d => { const it = d.sets.flatMap(s => s.items).find(i => i.kind === 'inference'); delete it.why2 }, /inference needs a verbatim why2/],
  'name shared across sets': [d => { d.sets[1].names.push(d.sets[0].names[0]) }, /also used in/],
  'name from the bank list': [d => { d.sets[0].names.push(Object.keys(names).find(n => /^[A-F]/.test(n))) }, /already used in a bank passage/],
  'length ratio over 1.5': [d => { const it = d.sets[2].items[1]; const i = it.choices.findIndex(c => c !== it.correct_answer); const old = it.choices[i]; it.choices[i] = old + ' and then a great deal more words to make this option very long indeed'; for (const r of it.distractor_rationales) if (r.choice === old) { r.choice = it.choices[i]; r.reason = `"${it.choices[i]}" x` } }, /length ratio/],
  'key lone hedge 3/3': [d => { let n = 0; for (const it of d.sets.flatMap(s => s.items)) { if (n === 3 || it.kind === 'vocabulary' || it.choices.some(c => H.test(c))) continue; const k = it.correct_answer, nk = 'Probably ' + k[0].toLowerCase() + k.slice(1); it.choices[it.choices.indexOf(k)] = nk; it.correct_answer = nk; it.explanation = `"${nk}" is correct.`; n++ } }, /lone "hedge" in \d+\/\d+ items \(>= 75%\)/],
  'fifth choice': [d => { d.sets[3].items[0].choices.push('an extra fifth option here') }, /needs 4 distinct choices/],
  'wrong kind order': [d => { const its = d.sets[3].items; [its[0], its[1]] = [its[1], its[0]] }, /kinds .* assigned/],
}
let ok = 0
for (const [name, [mut, re]] of Object.entries(cases)) {
  const d = base(); mut(d); const f = `${tmp}/bt-${name.replace(/\W+/g, '_')}.json`; writeFileSync(f, JSON.stringify(d))
  let out = '', code = 0
  try { out = execFileSync('node', ['itep-reading-check.mjs', f, '--expect', '12', '--assigned', 'ASSIGNED.json', '--existing-names', 'existing-names.json'], { encoding: 'utf8' }) } catch (e) { out = e.stdout; code = e.status }
  const hit = code === 1 && re.test(out)
  console.log(`${hit ? 'FIRES ' : 'MISSED'} ${name}${hit ? '' : `\n${out}`}`); if (hit) ok++
}
console.log(`break test: ${ok}/${Object.keys(cases).length} mutations caught`)
process.exit(ok === Object.keys(cases).length ? 0 : 1)
