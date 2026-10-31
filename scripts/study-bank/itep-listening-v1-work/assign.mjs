// assign.mjs — writes ASSIGNED.json, authors/<X>.md and authors/<X>.plan.json for iTEP Listening v1
// (ITEP-SLATE-LISTENING-V1.prereg.md §2). Deterministic: every draw comes from seeded-shuffle.mjs, seed
// 'itep-listening-v1-assign'.   node assign.mjs     (from this directory)
// No key property is required or forbidden (brief §0); each is drawn so it lands on the key at about base rate:
//   key length      per author over all items: floor(n/4) longest, floor(n/4) shortest, rest middle
//   script words    per author: half key-most, half key-not-most
//   about           balanced the woman / the man over the speaker-naming Part 1/2 items
//   opens/prevails  balanced cycles over the 20 dialogue sets (prevails: woman / man / neither)
//   stance          lecture: supports / rejects / unsettled cycle; idea shape: four different, one per lecture
//   whole options   main-idea: 1 / 2 / 4 cycle
//   kinds           Part 1 shuffled over 16 dialogues; Part 2/3 multisets drawn under caps, unique within the part
import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from '../seeded-shuffle.mjs'
const rand = rng(parseInt(createHash('sha256').update('itep-listening-v1-assign').digest('hex').slice(0, 8), 16))
const die = m => { console.error(`assign: ${m}`); process.exit(2) }
const cycle = (vals, n) => shuffleWith(Array.from({ length: n }, (_, i) => vals[i % vals.length]), rand)

const AUTH = {
  A: { initials: 'ABCD', lane: 'school life, clubs, sport, exercise and health', conv: ['a student', 'a classmate'], where: 'at school, between classes' },
  B: { initials: 'EFGH', lane: 'nature, animals, plants, weather and earth science', conv: ['a student', 'a teacher'], where: 'in a classroom after class' },
  C: { initials: 'JKLM', lane: 'towns, travel, shops, jobs and local history', conv: ['a teenager', 'a parent or older relative'], where: 'at home or out in town' },
  D: { initials: 'NPRST', lane: 'music, art, technology, inventions and space', conv: ['a student', 'a school staff member who is not a teacher (for example the librarian, the nurse, the office secretary, a lab technician)'], where: 'at school, in that staff member\'s office or room' },
}
const X = Object.keys(AUTH)
// Settings and role pairs drawn as fitting tuples (a ticket clerk belongs at a station), then shuffled.
const P1_SCENES = shuffleWith([
  ['train station', 'a passenger', 'a ticket clerk'], ['bookshop', 'a customer', 'a shop assistant'],
  ['library desk', 'a student', 'a librarian'], ['sports field', 'a player', 'a coach'],
  ['clinic waiting room', 'a patient', 'a receptionist'], ['museum on a class trip', 'a student', 'a museum guide'],
  ['kitchen at home', 'a parent', 'a teenager'], ['park', 'a neighbour', 'a neighbour'],
  ['cafeteria', 'a friend', 'a friend'], ['school bus', 'a sister', 'a brother'],
  ['science lab', 'a classmate', 'a classmate'], ['school office', 'a new student', 'an older student'],
  ['music room', 'a club member', 'a club leader'], ['corner shop', 'a cousin', 'a cousin'],
  ['computer room', 'a student', 'a teacher'], ['bus stop', 'a team member', 'a team captain'],
], rand)
const P1_KINDS = shuffleWith([...Array(4).fill('detail'), ...Array(4).fill('inference'), ...Array(4).fill('intent-next'), ...Array(2).fill('relationship'), ...Array(2).fill('purpose')], rand)
const SHAPES = shuffleWith(['change over time', 'a problem and its solution', 'a surprising result', 'two competing explanations'], rand)

const W = { 'main-idea': 6, detail: 4, inference: 3, 'intent-next': 2, purpose: 2.5, relationship: 1, attitude: 2 }
function drawKinds(n, caps, mins, used) {
  for (let tries = 0; tries < 5000; tries++) {
    const c = {}, out = []
    while (out.length < n) {
      const pool = Object.keys(W).filter(k => (c[k] || 0) < (caps[k] ?? 0))
      if (!pool.length) break
      const tot = pool.reduce((s, k) => s + W[k], 0)
      let r = rand() * tot, k = pool[0]
      for (const q of pool) { r -= W[q]; if (r <= 0) { k = q; break } }
      c[k] = (c[k] || 0) + 1; out.push(k)
    }
    if (out.length < n || Object.entries(mins).some(([k, m]) => (c[k] || 0) < m)) continue
    const sig = [...out].sort().join(',')
    if (used.has(sig)) continue
    used.add(sig)
    return shuffleWith(out, rand)
  }
  die('could not draw a kind multiset')
}
const P2CAPS = { 'main-idea': 1, detail: 2, inference: 1, 'intent-next': 1, purpose: 1, relationship: 1, attitude: 1 }
const P3CAPS = { 'main-idea': 1, attitude: 1, detail: 2, inference: 2, purpose: 2 }
const usedP2 = new Set(), usedP3 = new Set()

// ---- sets ----
const authors = {}
let p1i = 0
const dialogueSets = []
for (const x of X) {
  const a = AUTH[x], sets = {}
  for (const k of ['D1', 'D2', 'D3', 'D4']) {
    const [setting, ...pair] = P1_SCENES[p1i], coin = rand() < 0.5, flip = coin && !pair.includes('a brother')
    sets[k] = { part: 1, setting, speakers: { W: flip ? pair[1] : pair[0], M: flip ? pair[0] : pair[1] }, kinds: [P1_KINDS[p1i]] }
    p1i++; dialogueSets.push(sets[k])
  }
  const flip = rand() < 0.5
  sets.C = { part: 2, setting: a.where, speakers: { W: flip ? a.conv[1] : a.conv[0], M: flip ? a.conv[0] : a.conv[1] }, kinds: drawKinds(4, P2CAPS, { detail: 1 }, usedP2) }
  dialogueSets.push(sets.C)
  sets.L = { part: 3, setting: 'a class lecture', speakers: { S: 'a teacher giving a short lecture to a high-school class' }, idea_shape: SHAPES[X.indexOf(x)], kinds: drawKinds(6, P3CAPS, { detail: 1 }, usedP3) }
  authors[x] = { initials: a.initials, lane: a.lane, sets }
}
const opens = cycle(['W', 'M'], dialogueSets.length)
const prevails = cycle(['woman', 'man', 'neither'], dialogueSets.length)
dialogueSets.forEach((s, i) => { s.opens = opens[i]; s.prevails = prevails[i] })
const lectures = X.map(x => authors[x].sets.L)
cycle(['supports', 'rejects', 'unsettled'], lectures.length).forEach((v, i) => { lectures[i].stance = v })

// ---- items ----
const all = []
for (const x of X) for (const [k, s] of Object.entries(authors[x].sets)) s.items = s.kinds.map((kind, i) => { const it = { n: i + 1, kind }; all.push({ x, k, s, it }); return it })
const speakerItems = all.filter(r => r.s.part < 3 && !['main-idea', 'relationship'].includes(r.it.kind))
cycle(['the woman', 'the man'], speakerItems.length).forEach((v, i) => { speakerItems[i].it.about = v })
const mains = all.filter(r => r.it.kind === 'main-idea')
cycle([1, 2, 4], mains.length).forEach((v, i) => { mains[i].it.whole_options = v })
for (const x of X) {
  const mine = all.filter(r => r.x === x)
  const q = Math.floor(mine.length / 4)
  shuffleWith([...Array(q).fill('longest'), ...Array(q).fill('shortest'), ...Array(mine.length - 2 * q).fill('middle')], rand).forEach((v, i) => { mine[i].it.key_length = v })
  cycle(['key-most', 'key-not-most'], mine.length).forEach((v, i) => { mine[i].it.script_words = v })
}

writeFileSync('ASSIGNED.json', JSON.stringify({ batch: 'itep-listening-v1', authors }, null, 1) + '\n')
const LEN = { 1: '2-3 turns, 20-55 words', 2: '10-20 turns, 300-420 words', 3: 'one block, 480-580 words, at most 3,900 characters' }
const who = c => c === 'W' ? 'the woman' : 'the man'
const shape = it => [
  `key length: ${it.key_length}`, `script words: ${it.script_words}`,
  it.about ? `about: ${it.about}` : null,
  it.whole_options ? `whole-script options: ${it.whole_options}` : null,
].filter(Boolean).join('; ')
for (const x of X) {
  const a = authors[x]
  const nItems = Object.values(a.sets).reduce((s, t) => s + t.items.length, 0)
  writeFileSync(`authors/${x}.plan.json`, JSON.stringify({ batch: 'itep-listening-v1', author: x, ...a }, null, 1) + '\n')
  const rows = Object.entries(a.sets).map(([k, s]) => {
    const sp = s.part < 3 ? `W: ${s.speakers.W}; M: ${s.speakers.M}` : s.speakers.S
    const how = s.part < 3 ? `${who(s.opens)} speaks first; prevails: ${s.prevails}` : `stance: ${s.stance}; idea shape: ${s.idea_shape}`
    return `| \`ITL1-${x}-${k}\` | ${s.part} | ${s.setting} | ${sp} | ${how} | ${LEN[s.part]} | ${s.items.map(it => `${it.n}. ${it.kind}`).join(', ')} |`
  }).join('\n')
  const shapes = Object.entries(a.sets).map(([k, s]) => s.items.map(it => `- \`ITL1-${x}-${k}-${it.n}\` ${it.kind}: ${shape(it)}`).join('\n')).join('\n')
  writeFileSync(`authors/${x}.md`, `# Assignment: author ${x}, iTEP Listening v1

Brief: \`scripts/study-bank/briefs/itep-slate-listening-v1.md\` (read it first, all of it).
Repo root: \`/Users/andylee/Downloads/saas/classraum\`. Work only in \`scripts/study-bank/itep-listening-v1-work/\`.

**Output:** \`scripts/study-bank/itep-listening-v1-work/items/${x}.json\` with \`"author": "${x}"\` (${Object.keys(a.sets).length} scripts, ${nItems} items).

**Topic lane (choose every subject inside it as far as the setting allows; other authors hold other lanes):** ${a.lane}.

**Name initials:** every invented person and place name starts with one of the letters ${a.initials.split('').join(', ')}.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
${rows}

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

${shapes}

The same plan in machine form is \`authors/${x}.plan.json\` (the check script reads it). Do not open \`ASSIGNED.json\`
or any other author's files.

**Reference lists (read-only):** \`itep-listening-v1-work/existing-transcripts.txt\` (openings of every listening script
and passage in the bank: your subjects must not overlap any of them) and \`itep-listening-v1-work/existing-names.json\`
(capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints \`PROBLEMS 0\`):**

    node scripts/study-bank/itep-listening-v1-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v1-work/items/${x}.json --expect ${nItems} --plan scripts/study-bank/itep-listening-v1-work/authors/${x}.plan.json --existing-names scripts/study-bank/itep-listening-v1-work/existing-names.json

Read nothing else in the repo: not other authors' files, not \`ITEP-SLATE-BLUEPRINT.md\`, not any prereg, pending
file, batch file, grader file or any other \`*-work\` directory, and nothing under \`scratchpad/\`.
`)
}
const tally = f => all.reduce((m, r) => { const v = f(r); if (v != null) m[v] = (m[v] || 0) + 1; return m }, {})
console.log('items', all.length, tally(r => `part ${r.s.part}`))
console.log('kinds', tally(r => r.it.kind))
console.log('key length', tally(r => r.it.key_length), 'script words', tally(r => r.it.script_words))
console.log('about', tally(r => r.it.about), 'whole options', tally(r => r.it.whole_options))
console.log('opens', tally(r => r.it.n === 1 && r.s.opens), 'prevails', tally(r => r.it.n === 1 && r.s.prevails), 'stance', tally(r => r.it.n === 1 && r.s.stance))
console.log('wrote ASSIGNED.json, authors/A-D.md, authors/A-D.plan.json')
