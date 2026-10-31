// breaktest-check.mjs — prereg §3 break test for the pre-flight: each mutation of a real author file (items/A.json)
// must make itep-listening-check.mjs fail with the named problem. Run from this directory.
//   node breaktest-check.mjs <tmpdir>
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const tmp = process.argv[2]; if (!tmp) { console.error('usage: breaktest-check.mjs <tmpdir>'); process.exit(2) }
const base = () => JSON.parse(readFileSync('items/A.json', 'utf8'))
const plan = JSON.parse(readFileSync('authors/A.plan.json', 'utf8'))
const N = String(base().sets.reduce((a, s) => a + s.items.length, 0))
const all = d => d.sets.flatMap(s => s.items)
const set = (d, k) => d.sets.find(s => s.set_id.endsWith(`-${k}`))
const shapeOf = (s, it) => plan.sets[s.set_id.split('-').pop()].items[Number(it.qid.split('-').pop()) - 1]
const swapChoice = (it, i, nv) => { const old = it.choices[i]; it.choices[i] = nv; if (it.correct_answer === old) { it.correct_answer = nv; it.explanation = `"${nv}" is correct.` } for (const r of it.distractor_rationales) if (r.choice === old) { r.choice = nv; r.reason = `"${nv}" x` } }
const find = (d, pred) => { for (const s of d.sets) for (const it of s.items) if (pred(s, it)) return [s, it]; throw new Error('no item for mutation') }
const cases = {
  'why not verbatim': [d => { d.sets[0].items[0].why = 'zzqq not in the script' }, /why is not verbatim/],
  'inference without why2 (kind relabelled)': [d => { const [s, it] = find(d, (s, it) => s.part === 3 && it.kind === 'detail'); it.kind = 'inference'; delete it.why2 }, /inference needs a verbatim why2/],
  'third speaker label': [d => { const s = set(d, 'C'); s.transcript = s.transcript.replace(/\n(W|M): /, '\nJ: ') }, /not starting "W: " or "M: "/],
  'stray Plan B: inside a turn': [d => { const s = set(d, 'C'); const L = s.transcript.split('\n'); L[2] += ' Plan B: we just wait.'; s.transcript = L.join('\n') }, /turn regex splits/],
  'lecture over 3,900 characters': [d => { const s = set(d, 'L'); s.transcript += ' ' + 'So remember this point well.'.repeat(45) }, /must be <= 3900/],
  'wrong speaker first': [d => { const s = set(d, 'D1'); s.transcript = s.transcript.split('\n').map(l => (l[0] === 'W' ? 'M' : 'W') + l.slice(1)).join('\n') }, /speaks first, planned/],
  'length ratio over 1.5': [d => { const it = all(d)[0]; const i = it.choices.findIndex(c => c !== it.correct_answer); swapChoice(it, i, it.choices[i] + ' and then a great many more words to make this option far too long') }, /length ratio/],
  'key breaks planned length rank': [d => { const [s, it] = find(d, (s, it) => shapeOf(s, it).key_length === 'shortest'); const L = Math.max(...it.choices.map(c => c.length)); swapChoice(it, it.choices.indexOf(it.correct_answer), it.correct_answer.replace(/[.?!]$/, '') + ' at the end'.repeat(Math.ceil((L - it.correct_answer.length + 2) / 11))) }, /planned shortest/],
  'key breaks planned script-words rank': [d => { const [s, it] = find(d, (s, it) => shapeOf(s, it).script_words === 'key-most'); const i = it.choices.findIndex(c => c !== it.correct_answer); const w = s.transcript.replace(/^[WM]: /gm, '').split(/\s+/).filter(x => x.length > 4).slice(0, 4).join(' '); swapChoice(it, i, w.slice(0, Math.max(...it.choices.map(c => c.length)))) }, /planned key-most/],
  'she in a lecture option': [d => { const it = set(d, 'L').items[0]; const i = it.choices.findIndex(c => c !== it.correct_answer); swapChoice(it, i, it.choices[i].replace(/\s*\S+$/, ' she')) }, /lecture option uses "she"/],
  'prompt about the wrong speaker': [d => { const [, it] = find(d, (s, it) => !!shapeOf(s, it).about); const want = shapeOf(...find(d, (s, x) => x === it)).about; it.prompt = want === 'the woman' ? 'What does the man say about it?' : 'What does the woman say about it?' }, /prompt should ask about/],
}
let ok = 0
for (const [name, [mut, re]] of Object.entries(cases)) {
  const d = base(); mut(d); const f = `${tmp}/btl-${name.replace(/\W+/g, '_')}.json`; writeFileSync(f, JSON.stringify(d))
  let out = '', code = 0
  try { out = execFileSync('node', ['itep-listening-check.mjs', f, '--expect', N, '--plan', 'authors/A.plan.json', '--existing-names', 'existing-names.json'], { encoding: 'utf8' }) } catch (e) { out = e.stdout; code = e.status }
  const hit = code === 1 && re.test(out)
  console.log(`${hit ? 'FIRES ' : 'MISSED'} ${name}${hit ? '' : `\n${out}`}`); if (hit) ok++
}
console.log(`break test: ${ok}/${Object.keys(cases).length} mutations caught`)
process.exit(ok === Object.keys(cases).length ? 0 : 1)
