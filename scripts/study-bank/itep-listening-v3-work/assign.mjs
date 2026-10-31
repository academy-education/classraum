// assign.mjs — writes ASSIGNED.json, authors/<X>.md and authors/<X>.plan.json for iTEP Listening v3, the Part 2
// conversation top-up (ITEP-SLATE-LISTENING-V3.prereg.md §1-2). Deterministic: every draw comes from
// seeded-shuffle.mjs, seed 'itep-listening-v3-assign'.   node assign.mjs     (from this directory)
// Frozen brief v1 (no cut); refuses if its sha256 differs from v1's MANIFEST.
// No key property is required or forbidden (brief §0); every shape is drawn WITHIN this part (lessons 1, 13):
//   key length      per author: 1 longest / 1 shortest / 2 middle
//   script words    per author: 2 key-most / 2 key-not-most
//   about           balanced the woman / the man over the speaker-naming items
//   opens           4 W / 4 M
//   prevails x first plan   (lesson 10) woman/holds x2, woman/replaced, man/holds, man/replaced x2, neither/left open x2
//   whole options   main-idea: 4 only (lesson 12: `2` made the key a twin, `1` made it the only whole option)
//   kinds           multisets under v1's Part 2 caps, unique within the round
import { writeFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from '../seeded-shuffle.mjs'
const rand = rng(parseInt(createHash('sha256').update('itep-listening-v3-assign').digest('hex').slice(0, 8), 16))
const die = m => { console.error(`assign: ${m}`); process.exit(2) }
const cycle = (vals, n) => shuffleWith(Array.from({ length: n }, (_, i) => vals[i % vals.length]), rand)
const BRIEF = '../briefs/itep-slate-listening-v1.md'
const v1m = JSON.parse(readFileSync('../itep-listening-v1-work/MANIFEST.json', 'utf8'))
if (createHash('sha256').update(readFileSync(BRIEF)).digest('hex') !== v1m.author_brief_sha256) die('brief v1 changed since it was frozen')

// Roles: [W-capable role, M-capable role]; `fixed` = the roles are gendered as written (W first, M second).
const AUTH = {
  A: { initials: 'AB', lane: 'family events, holidays and travel plans', conv: ['a girl', 'her cousin, a boy of about the same age'], fixed: true, where: 'at a relative\'s house during a family gathering' },
  B: { initials: 'CD', lane: 'volunteering, charity events and neighbourhood projects', conv: ['a teenage volunteer', 'the volunteer coordinator'], where: 'at a community centre before a volunteer shift' },
  C: { initials: 'EF', lane: 'the school newspaper, reporting and interviewing', conv: ['a student reporter for the school newspaper', 'the student being interviewed for an article'], where: 'in an empty classroom at lunchtime' },
  D: { initials: 'GH', lane: 'home life, small repairs, pets and apartment buildings', conv: ['a teenager', 'an adult neighbour who lives in the same apartment building'], where: 'in the hallway or lobby of their apartment building' },
  E: { initials: 'JK', lane: 'camping, hiking and outdoor activities', conv: ['a camper at a summer camp', 'a camp counsellor'], where: 'at a summer camp, outside the camp office' },
  F: { initials: 'LM', lane: 'languages, food and everyday customs in different countries', conv: ['a high-school student', 'an exchange student who is staying with the student\'s family'], where: 'at the family\'s home in the evening' },
  G: { initials: 'NP', lane: 'science-fair projects, experiments and measuring things', conv: ['a student entering the school science fair', 'a volunteer judge for the science fair'], where: 'in the school hall the day before the science fair' },
  H: { initials: 'RS', lane: 'university life, choosing courses and moving away from home', conv: ['an older sister who has just started university', 'her younger brother who is in high school'], fixed: true, where: 'on a video call on a weekend evening' },
}
const X = Object.keys(AUTH)
const W = { 'main-idea': 6, detail: 4, inference: 3, 'intent-next': 2, purpose: 2.5, relationship: 1, attitude: 2 }
const P2CAPS = { 'main-idea': 1, detail: 2, inference: 1, 'intent-next': 1, purpose: 1, relationship: 1, attitude: 1 }
const used = new Set()
function drawKinds(n) {
  for (let tries = 0; tries < 5000; tries++) {
    const c = {}, out = []
    while (out.length < n) {
      const pool = Object.keys(W).filter(k => (c[k] || 0) < (P2CAPS[k] ?? 0))
      const tot = pool.reduce((s, k) => s + W[k], 0)
      let r = rand() * tot, k = pool[0]
      for (const q of pool) { r -= W[q]; if (r <= 0) { k = q; break } }
      c[k] = (c[k] || 0) + 1; out.push(k)
    }
    if (!c.detail) continue
    const sig = [...out].sort().join(',')
    if (used.has(sig)) continue
    used.add(sig)
    return shuffleWith(out, rand)
  }
  die('could not draw a kind multiset')
}
const OUTCOME = shuffleWith([['woman', 'holds'], ['woman', 'holds'], ['woman', 'replaced'], ['man', 'holds'], ['man', 'replaced'], ['man', 'replaced'], ['neither', 'left open'], ['neither', 'left open']], rand)
const opens = cycle(['W', 'M'], X.length)
const authors = {}
X.forEach((x, i) => {
  const a = AUTH[x], flip = !a.fixed && rand() < 0.5
  const C = { part: 2, setting: a.where, speakers: { W: flip ? a.conv[1] : a.conv[0], M: flip ? a.conv[0] : a.conv[1] }, kinds: drawKinds(4), opens: opens[i], prevails: OUTCOME[i][0], first_plan: OUTCOME[i][1] }
  authors[x] = { initials: a.initials, lane: a.lane, sets: { C } }
})
const all = []
for (const x of X) { const s = authors[x].sets.C; s.items = s.kinds.map((kind, i) => { const it = { n: i + 1, kind }; all.push({ x, s, it }); return it }) }
const speakerItems = all.filter(r => !['main-idea', 'relationship'].includes(r.it.kind))
cycle(['the woman', 'the man'], speakerItems.length).forEach((v, i) => { speakerItems[i].it.about = v })
for (const r of all) if (r.it.kind === 'main-idea') r.it.whole_options = 4
for (const x of X) {
  const mine = all.filter(r => r.x === x)
  shuffleWith(['longest', 'shortest', 'middle', 'middle'], rand).forEach((v, i) => { mine[i].it.key_length = v })
  cycle(['key-most', 'key-not-most'], mine.length).forEach((v, i) => { mine[i].it.script_words = v })
}

writeFileSync('ASSIGNED.json', JSON.stringify({ batch: 'itep-listening-v3', authors }, null, 1) + '\n')
const who = c => c === 'W' ? 'the woman' : 'the man'
const shape = it => [`key length: ${it.key_length}`, `script words: ${it.script_words}`, it.about ? `about: ${it.about}` : null, it.whole_options ? `whole-script options: ${it.whole_options}` : null].filter(Boolean).join('; ')
for (const x of X) {
  const a = authors[x], s = a.sets.C
  writeFileSync(`authors/${x}.plan.json`, JSON.stringify({ batch: 'itep-listening-v3', author: x, ...a }, null, 1) + '\n')
  writeFileSync(`authors/${x}.md`, `# Assignment: author ${x}, iTEP Listening (round 3: one Part 2 conversation)

Brief: \`scripts/study-bank/briefs/itep-slate-listening-v1.md\` (read it first, all of it). This round has ONE
script for you, a Part 2 conversation; ignore what the brief says about dialogues and lectures. Set ids in this round
start \`ITL3-\` where the brief's examples say \`ITL1-\`.
Repo root: \`/Users/andylee/Downloads/saas/classraum\`. Work only in \`scripts/study-bank/itep-listening-v3-work/\`.
**Your own scratch directory** (any drafts or temporary files go here and nowhere else; other authors work at the
same time): \`scripts/study-bank/itep-listening-v3-work/scratch/${x}/\`.

**Output:** \`scripts/study-bank/itep-listening-v3-work/items/${x}.json\` with \`"author": "${x}"\` (1 script, 4 items).

**Topic lane (choose the subject inside it; other authors hold other lanes):** ${a.lane}.

**Name initials:** every invented person and place name starts with one of the letters ${a.initials.split('').join(', ')}.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
| \`ITL3-${x}-C\` | 2 | ${s.setting} | W: ${s.speakers.W}; M: ${s.speakers.M} | ${who(s.opens)} speaks first; prevails: ${s.prevails}; first plan: ${s.first_plan} | 10-20 turns, 300-420 words | ${s.items.map(it => `${it.n}. ${it.kind}`).join(', ')} |

**\`first plan\` (a script shape, like prevails; follow it exactly):** the first plan or suggestion made in the
conversation is the one that is finally followed (\`holds\`), is dropped for a later one (\`replaced\`), or is still
undecided at the end (\`left open\`).

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

${s.items.map(it => `- \`ITL3-${x}-C-${it.n}\` ${it.kind}: ${shape(it)}`).join('\n')}

The same plan in machine form is \`authors/${x}.plan.json\` (the check script reads it). Do not open \`ASSIGNED.json\`
or any other author's files.

**Reference lists (read-only):** \`itep-listening-v3-work/existing-transcripts.txt\` (openings of every listening script
and passage in the bank and in earlier drafts: your subject must not overlap any of them) and
\`itep-listening-v3-work/existing-names.json\` (capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints \`PROBLEMS 0\`):**

    node scripts/study-bank/itep-listening-v3-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v3-work/items/${x}.json --expect 4 --plan scripts/study-bank/itep-listening-v3-work/authors/${x}.plan.json --existing-names scripts/study-bank/itep-listening-v3-work/existing-names.json

Read nothing else in the repo: not other authors' files, not \`ITEP-SLATE-BLUEPRINT.md\`, not any prereg, pending
file, batch file, grader file or any other \`*-work\` directory (including \`itep-listening-v1-work\` and
\`itep-listening-v2-work\`), and nothing under the repo-root \`scratchpad/\`.
`)
}
const tally = f => all.reduce((m, r) => { const v = f(r); if (v != null && v !== false) m[v] = (m[v] || 0) + 1; return m }, {})
console.log('items', all.length, 'kinds', tally(r => r.it.kind))
console.log('key length', tally(r => r.it.key_length), 'script words', tally(r => r.it.script_words), 'about', tally(r => r.it.about))
console.log('opens', tally(r => r.it.n === 1 && r.s.opens), 'outcome', tally(r => r.it.n === 1 && `${r.s.prevails}/${r.s.first_plan}`))
for (const x of X) console.log(x, authors[x].sets.C.kinds.join(','), authors[x].sets.C.opens, authors[x].sets.C.prevails, authors[x].sets.C.first_plan)
if (all.length !== 32) die(`drew ${all.length} items, want 32`)
console.log('wrote ASSIGNED.json, authors/A-H.md and .plan.json')
