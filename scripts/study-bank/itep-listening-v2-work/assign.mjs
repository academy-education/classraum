// assign.mjs — writes ASSIGNED.json, authors/<X>.md and authors/<X>.plan.json for iTEP Listening v2
// (ITEP-SLATE-LISTENING-V2.prereg.md §2). Deterministic: every draw comes from seeded-shuffle.mjs, seed
// 'itep-listening-v2-assign'.   node assign.mjs     (from this directory)
// Frozen brief v1 (no cut); refuses if its sha256 differs from v1's MANIFEST.
// No key property is required or forbidden (brief §0); each is drawn so it lands on the key at about base rate:
//   key length      per author PER PART (pending lesson 1): dialogues 1 longest / 1 shortest / 2 middle;
//                   conversation 1/1/2; lecture 1/1/4
//   script words    per author per part: half key-most, half key-not-most
//   about           balanced the woman / the man over the speaker-naming Part 1/2 items
//   opens/prevails  balanced cycles over the 45 dialogue sets (prevails: woman / man / neither)
//   stance          lecture: supports / rejects / unsettled 3/3/3; idea shape: nine different, one per lecture
//   common belief   lecture (pending lesson 2): none x5, named-right x2, named-wrong x2
//   whole options   main-idea: 1 / 2 / 4 cycle
//   kinds           Part 1 shuffled over 36 dialogues; Part 2/3 multisets drawn under v1's caps, unique within the part
import { writeFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from '../seeded-shuffle.mjs'
const rand = rng(parseInt(createHash('sha256').update('itep-listening-v2-assign').digest('hex').slice(0, 8), 16))
const die = m => { console.error(`assign: ${m}`); process.exit(2) }
const cycle = (vals, n) => shuffleWith(Array.from({ length: n }, (_, i) => vals[i % vals.length]), rand)
const BRIEF = '../briefs/itep-slate-listening-v1.md'
const v1m = JSON.parse(readFileSync('../itep-listening-v1-work/MANIFEST.json', 'utf8'))
if (createHash('sha256').update(readFileSync(BRIEF)).digest('hex') !== v1m.author_brief_sha256) die('brief v1 changed since it was frozen')

const AUTH = {
  A: { initials: 'AB', lane: 'school life, clubs, exams and study habits', conv: ['a student', 'a classmate'], where: 'at school, between classes' },
  B: { initials: 'CD', lane: 'animals, insects, birds and ecosystems', conv: ['a student', 'a teacher'], where: 'in a classroom after class' },
  C: { initials: 'EF', lane: 'plants, food, cooking and farming', conv: ['a teenager', 'a parent or older relative'], where: 'at home or out in town' },
  D: { initials: 'GH', lane: 'weather, oceans, rocks, earth and space science', conv: ['a student', 'a school staff member who is not a teacher (for example the librarian, the nurse, the office secretary, a lab technician)'], where: 'at school, in that staff member\'s office or room' },
  E: { initials: 'JK', lane: 'towns, transport, buildings and invented local history', conv: ['a club member', 'the club\'s student leader'], where: 'at a school club meeting room before the meeting' },
  F: { initials: 'LM', lane: 'jobs, shops, money and markets', conv: ['a teenager with a weekend job', 'the teenager\'s manager at work'], where: 'at a small shop or cafe before opening' },
  G: { initials: 'NP', lane: 'music, art, crafts and museums', conv: ['a sister', 'a brother'], where: 'at home on a weekend' },
  H: { initials: 'RS', lane: 'technology, inventions and communication', conv: ['a student', 'a sports coach'], where: 'at the side of a school sports field after practice' },
  I: { initials: 'TVW', lane: 'the human body, sport, sleep and health', conv: ['a high-school student', 'a university student who tutors the high-school student'], where: 'at a public library study room' },
}
const X = Object.keys(AUTH)
// Settings and role pairs drawn as fitting tuples, then shuffled. 36, all different from each other.
const P1_SCENES = shuffleWith([
  ['train station', 'a passenger', 'a ticket clerk'], ['bookshop', 'a customer', 'a shop assistant'],
  ['library desk', 'a student', 'a librarian'], ['swimming pool', 'a swimmer', 'a lifeguard'],
  ['clinic waiting room', 'a patient', 'a receptionist'], ['museum on a class trip', 'a student', 'a museum guide'],
  ['kitchen at home', 'a parent', 'a teenager'], ['park', 'a neighbour', 'a neighbour'],
  ['cafeteria', 'a friend', 'a friend'], ['school bus', 'a sister', 'a brother'],
  ['science lab', 'a classmate', 'a classmate'], ['school office', 'a new student', 'an older student'],
  ['music room', 'a club member', 'a club leader'], ['corner shop', 'a customer', 'a shopkeeper'],
  ['computer room', 'a student', 'a teacher'], ['bus stop', 'a team member', 'a team captain'],
  ['bakery', 'a customer', 'a baker'], ['post office', 'a customer', 'a clerk'],
  ['school hallway', 'a student', 'a teacher'], ['bike repair shop', 'a customer', 'a mechanic'],
  ['school garden', 'a student volunteer', 'a garden club leader'], ['art supply shop', 'a customer', 'a shop assistant'],
  ['airport check-in desk', 'a traveller', 'an airline agent'], ['hotel front desk', 'a guest', 'a receptionist'],
  ['pharmacy counter', 'a customer', 'a pharmacist'], ['living room at home', 'a grandparent', 'a grandchild'],
  ['school gym', 'a student', 'a coach'], ['ferry dock', 'a passenger', 'a ferry worker'],
  ['cinema ticket counter', 'a customer', 'a ticket seller'], ['school theatre backstage', 'an actor', 'a stage manager'],
  ['camping site', 'a camper', 'a park ranger'], ['phone shop', 'a customer', 'a sales assistant'],
  ['restaurant', 'a diner', 'a waiter'], ['farmers\' market stall', 'a shopper', 'a farmer'],
  ['school lost-and-found desk', 'a student', 'an office worker'], ['dentist\'s waiting room', 'a parent', 'a teenager'],
], rand)
if (P1_SCENES.length !== 36 || new Set(P1_SCENES.map(s => s[0])).size !== 36) die('need 36 different Part 1 settings')
const P1_KINDS = shuffleWith([...Array(9).fill('detail'), ...Array(9).fill('inference'), ...Array(9).fill('intent-next'), ...Array(4).fill('relationship'), ...Array(5).fill('purpose')], rand)
const SHAPES = shuffleWith(['change over time', 'a problem and its solution', 'a surprising result', 'two competing explanations',
  'how a process works, step by step', 'a comparison of two cases', 'one cause and its several effects',
  'a method and its limits', 'a discovery and how it was made'], rand)
const BELIEF = shuffleWith(['none', 'none', 'none', 'none', 'none', 'named, and the lecture shows it is right', 'named, and the lecture shows it is right', 'named, and the lecture shows it is wrong', 'named, and the lecture shows it is wrong'], rand)

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
    const [setting, ...pair] = P1_SCENES[p1i], gendered = pair.some(p => /sister|brother/.test(p)), flip = rand() < 0.5 && !gendered
    sets[k] = { part: 1, setting, speakers: { W: flip ? pair[1] : pair[0], M: flip ? pair[0] : pair[1] }, kinds: [P1_KINDS[p1i]] }
    p1i++; dialogueSets.push(sets[k])
  }
  const gendered = a.conv.some(p => /sister|brother/.test(p)), flip = rand() < 0.5 && !gendered
  sets.C = { part: 2, setting: a.where, speakers: { W: flip ? a.conv[1] : a.conv[0], M: flip ? a.conv[0] : a.conv[1] }, kinds: drawKinds(4, P2CAPS, { detail: 1 }, usedP2) }
  dialogueSets.push(sets.C)
  const li = X.indexOf(x)
  sets.L = { part: 3, setting: 'a class lecture', speakers: { S: 'a teacher giving a short lecture to a high-school class' }, idea_shape: SHAPES[li], common_belief: BELIEF[li], kinds: drawKinds(6, P3CAPS, { detail: 1 }, usedP3) }
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
for (const x of X) for (const part of [1, 2, 3]) {
  const mine = all.filter(r => r.x === x && r.s.part === part)
  const q = Math.floor(mine.length / 4)
  shuffleWith([...Array(q).fill('longest'), ...Array(q).fill('shortest'), ...Array(mine.length - 2 * q).fill('middle')], rand).forEach((v, i) => { mine[i].it.key_length = v })
  cycle(['key-most', 'key-not-most'], mine.length).forEach((v, i) => { mine[i].it.script_words = v })
}

writeFileSync('ASSIGNED.json', JSON.stringify({ batch: 'itep-listening-v2', authors }, null, 1) + '\n')
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
  writeFileSync(`authors/${x}.plan.json`, JSON.stringify({ batch: 'itep-listening-v2', author: x, ...a }, null, 1) + '\n')
  const rows = Object.entries(a.sets).map(([k, s]) => {
    const sp = s.part < 3 ? `W: ${s.speakers.W}; M: ${s.speakers.M}` : s.speakers.S
    const how = s.part < 3 ? `${who(s.opens)} speaks first; prevails: ${s.prevails}` : `stance: ${s.stance}; idea shape: ${s.idea_shape}; common belief: ${s.common_belief}`
    return `| \`ITL2-${x}-${k}\` | ${s.part} | ${s.setting} | ${sp} | ${how} | ${LEN[s.part]} | ${s.items.map(it => `${it.n}. ${it.kind}`).join(', ')} |`
  }).join('\n')
  const shapes = Object.entries(a.sets).map(([k, s]) => s.items.map(it => `- \`ITL2-${x}-${k}-${it.n}\` ${it.kind}: ${shape(it)}`).join('\n')).join('\n')
  writeFileSync(`authors/${x}.md`, `# Assignment: author ${x}, iTEP Listening (round 2)

Brief: \`scripts/study-bank/briefs/itep-slate-listening-v1.md\` (read it first, all of it). Set ids in this round
start \`ITL2-\` where the brief's examples say \`ITL1-\`.
Repo root: \`/Users/andylee/Downloads/saas/classraum\`. Work only in \`scripts/study-bank/itep-listening-v2-work/\`.
**Your own scratch directory** (any drafts or temporary files go here and nowhere else; other authors work at the
same time): \`scripts/study-bank/itep-listening-v2-work/scratch/${x}/\`.

**Output:** \`scripts/study-bank/itep-listening-v2-work/items/${x}.json\` with \`"author": "${x}"\` (${Object.keys(a.sets).length} scripts, ${nItems} items).

**Topic lane (choose every subject inside it as far as the setting allows; other authors hold other lanes):** ${a.lane}.

**Name initials:** every invented person and place name starts with one of the letters ${a.initials.split('').join(', ')}.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
${rows}

**Lecture \`common belief\` (a script shape, like stance; follow it exactly):** \`none\` = the lecture states no popular
or common belief or "many people think" view at all; \`named, and the lecture shows it is right\` = the speaker names
one common belief and the lecture's evidence supports it; \`named, and the lecture shows it is wrong\` = the speaker
names one common belief and the lecture's evidence goes against it.

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

${shapes}

The same plan in machine form is \`authors/${x}.plan.json\` (the check script reads it). Do not open \`ASSIGNED.json\`
or any other author's files.

**Reference lists (read-only):** \`itep-listening-v2-work/existing-transcripts.txt\` (openings of every listening script
and passage in the bank and in earlier drafts: your subjects must not overlap any of them) and
\`itep-listening-v2-work/existing-names.json\` (capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints \`PROBLEMS 0\`):**

    node scripts/study-bank/itep-listening-v2-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v2-work/items/${x}.json --expect ${nItems} --plan scripts/study-bank/itep-listening-v2-work/authors/${x}.plan.json --existing-names scripts/study-bank/itep-listening-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not \`ITEP-SLATE-BLUEPRINT.md\`, not any prereg, pending
file, batch file, grader file or any other \`*-work\` directory (including \`itep-listening-v1-work\`), and nothing
under the repo-root \`scratchpad/\`.
`)
}
const tally = f => all.reduce((m, r) => { const v = f(r); if (v != null && v !== false) m[v] = (m[v] || 0) + 1; return m }, {})
console.log('items', all.length, tally(r => `part ${r.s.part}`))
console.log('kinds', tally(r => r.it.kind))
for (const p of [1, 2, 3]) console.log(`part ${p} key length`, tally(r => r.s.part === p && r.it.key_length), 'script words', tally(r => r.s.part === p && r.it.script_words))
console.log('about', tally(r => r.it.about), 'whole options', tally(r => r.it.whole_options))
console.log('opens', tally(r => r.it.n === 1 && r.s.opens), 'prevails', tally(r => r.it.n === 1 && r.s.prevails), 'stance', tally(r => r.it.n === 1 && r.s.stance), 'belief', tally(r => r.it.n === 1 && r.s.common_belief))
if (all.length !== 126) die(`drew ${all.length} items, want 126`)
console.log(`wrote ASSIGNED.json, authors/${X[0]}-${X.at(-1)}.md and .plan.json`)
