// assign.mjs — writes ASSIGNED.json and authors/<X>.md for iTEP Reading v2 (ITEP-SLATE-READING-V2.prereg.md §2).
// Deterministic: every random draw comes from seeded-shuffle.mjs with the seed 'itep-reading-v2-assign'.
//   node assign.mjs     (from this directory)
// Per-item shapes are drawn so that no key property is required or forbidden (brief v2 §0):
//   main-idea breadth  balanced cycle of key-broadest / distractor-broader / all-level over the batch
//   main-idea key form balanced one-part / two-part over the batch; a two-part key always has a two-part distractor
//   main-idea cast     drawn per item from a menu; no cast multiset on more than half the main-idea items
//   key length         per author over non-vocabulary items: floor(n/4) longest, floor(n/4) shortest, rest middle
//   not-except key     balanced contradicted / not included
//   kinds              Part 1 kinds shuffled over the 16 texts; Part 2/3 kind multisets drawn under caps, unique
//                      within the part, order shuffled per passage
import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from '../seeded-shuffle.mjs'
const rand = rng(parseInt(createHash('sha256').update('itep-reading-v2-assign').digest('hex').slice(0, 8), 16))
const pick = a => a[Math.floor(rand() * a.length)]
const die = m => { console.error(`assign: ${m}`); process.exit(2) }

const AUTH = {
  A: { initials: 'AB', lane: 'animals, insects, birds, oceans, rivers and the natural world',
    p2: ['story', 'informational science'], p3: ['informational science', 'story'] },
  B: { initials: 'CD', lane: 'sports, outdoor games, exercise, health and the human body',
    p2: ['first-person school life'], p3: ['biography of an invented person', 'informational science'] },
  C: { initials: 'EFG', lane: 'towns, markets, shops, crafts, money and trade, past and present',
    p2: ['story'], p3: ['informational history', 'first-person account'] },
  D: { initials: 'HIJ', lane: 'plants, food, cooking, farming, gardens and weather',
    p2: ['first-person school life'], p3: ['informational science', 'informational history'] },
  E: { initials: 'KLU', lane: 'travel, roads, bridges, boats, trains, maps and how people got around',
    p2: ['informational science', 'first-person school life'], p3: ['informational history', 'story'] },
  F: { initials: 'MNO', lane: 'inventions, tools, machines, everyday technology, letters and communication',
    p2: ['story'], p3: ['informational technology', 'biography of an invented person'] },
  G: { initials: 'PQR', lane: 'music, painting, theatre, buildings, libraries and museums',
    p2: ['first-person school life'], p3: ['informational history', 'informational technology'] },
  H: { initials: 'STVWYZ', lane: 'rocks, volcanoes, caves, the sky, light, sound and other earth and space science; school clubs and competitions',
    p2: ['informational history'], p3: ['informational science', 'story'] },
}
const X = Object.keys(AUTH)

// ---- Part 1: genres and kinds shuffled over the 16 texts ----
const P1_GENRES = shuffleWith(['school notice', 'text message', 'poster', 'note', 'advertisement', 'diary entry', 'library notice', 'email', 'postcard', 'sign', 'invitation', 'club announcement', 'lost-and-found notice', 'short review', 'travel update', 'shop notice'], rand)
const P1_KINDS = shuffleWith([...Array(5).fill('detail'), ...Array(3).fill('purpose'), ...Array(3).fill('vocabulary'), ...Array(3).fill('main-idea'), ...Array(2).fill('inference')], rand)

// ---- Part 2/3 kind multisets ----
const W = { 'main-idea': 4, detail: 4, vocabulary: 3, 'not-except': 1.5, purpose: 2.5, inference: 2 }
function drawKinds(n, caps, mins, used) {
  for (let tries = 0; tries < 5000; tries++) {
    const c = {}
    const out = []
    while (out.length < n) {
      const pool = Object.keys(W).filter(k => (c[k] || 0) < (caps[k] ?? n))
      const tot = pool.reduce((s, k) => s + W[k], 0)
      let r = rand() * tot, k = pool[0]
      for (const q of pool) { r -= W[q]; if (r <= 0) { k = q; break } }
      c[k] = (c[k] || 0) + 1; out.push(k)
    }
    if (Object.entries(mins).some(([k, m]) => (c[k] || 0) < m)) continue
    const sig = [...out].sort().join(',')
    if (used.has(sig)) continue
    used.add(sig)
    return shuffleWith(out, rand)
  }
  die('could not draw a kind multiset')
}
const usedP2 = new Set(), usedP3 = new Set()
const P2CAPS = { 'main-idea': 1, vocabulary: 1, 'not-except': 1, purpose: 1, inference: 2, detail: 2 }
const P3CAPS = { 'main-idea': 1, vocabulary: 2, 'not-except': 1, purpose: 2, inference: 2, detail: 2 }

const authors = {}
let p1i = 0
for (const x of X) {
  const a = AUTH[x]
  const sets = {}
  for (const k of ['P1A', 'P1B']) { sets[k] = { part: 1, genre: P1_GENRES[p1i], kinds: [P1_KINDS[p1i]] }; p1i++ }
  a.p2.forEach((g, i) => { sets[`P2${'AB'[i]}`] = { part: 2, genre: g, kinds: drawKinds(4, P2CAPS, { detail: 1 }, usedP2) } })
  a.p3.forEach((g, i) => { sets[`P3${'AB'[i]}`] = { part: 3, genre: g, kinds: drawKinds(6, P3CAPS, { detail: 1, vocabulary: 1 }, usedP3) } })
  authors[x] = { initials: a.initials, lane: a.lane, sets }
}

// ---- per-item shapes ----
const allItems = []
for (const x of X) for (const [k, s] of Object.entries(authors[x].sets)) s.items = s.kinds.map((kind, i) => { const it = { n: i + 1, kind }; allItems.push({ x, k, it }); return it })
const mains = allItems.filter(r => r.it.kind === 'main-idea')
const cycle = (vals, n) => shuffleWith(Array.from({ length: n }, (_, i) => vals[i % vals.length]), rand)
const breadths = cycle(['key-broadest', 'distractor-broader', 'all-level'], mains.length)
const forms = cycle(['one-part', 'two-part'], mains.length)
const MENU = ['detail', 'misreading', 'minor-point', 'two-part']
mains.forEach((r, i) => {
  const b = breadths[i], f = forms[i]
  let cast
  for (;;) {
    if (b === 'all-level') cast = [0, 1, 2].map(() => pick(['misreading', 'two-part']))
    else cast = [...(b === 'distractor-broader' ? ['broader (wrong)'] : []), ...Array.from({ length: b === 'distractor-broader' ? 2 : 3 }, () => pick(MENU))]
    const cnt = {}; for (const c of cast) cnt[c] = (cnt[c] || 0) + 1
    if (Object.values(cnt).some(v => v > 2) && b !== 'all-level') continue
    if (f === 'two-part' && !cast.includes('two-part')) continue
    if (b === 'all-level' && f === 'one-part' && cast.every(c => c === 'two-part')) continue
    break
  }
  Object.assign(r.it, { breadth: b, key_form: f, cast: cast.sort() })
})
const sigs = {}; for (const r of mains) { const s = `${r.it.breadth}|${r.it.cast.join(',')}`; sigs[s] = (sigs[s] || 0) + 1 }
if (Object.values(sigs).some(v => v > mains.length / 2)) die('a main-idea cast exceeds half the main-idea items')
const nots = allItems.filter(r => r.it.kind === 'not-except')
cycle(['contradicted by the text', 'not included in the text'], nots.length).forEach((v, i) => { nots[i].it.key_type = v })
for (const x of X) {
  const mine = allItems.filter(r => r.x === x && r.it.kind !== 'vocabulary')
  const q = Math.floor(mine.length / 4)
  const lens = shuffleWith([...Array(q).fill('longest'), ...Array(q).fill('shortest'), ...Array(mine.length - 2 * q).fill('middle')], rand)
  mine.forEach((r, i) => { r.it.key_length = lens[i] })
}

writeFileSync('ASSIGNED.json', JSON.stringify({ batch: 'itep-reading-v2', authors }, null, 1) + '\n')
const WORDS = { 1: '55-95', 2: '180-240', 3: '450-560' }
const shape = it => [
  it.key_length ? `key length: ${it.key_length}` : 'key length: free (vocabulary)',
  it.breadth ? `breadth: ${it.breadth}; key form: ${it.key_form}; cast: ${it.cast.join(', ')}` : null,
  it.key_type ? `key: ${it.key_type}` : null,
].filter(Boolean).join('; ')
for (const x of X) {
  const a = authors[x]
  const nItems = Object.values(a.sets).reduce((s, t) => s + t.items.length, 0)
  const rows = Object.entries(a.sets).map(([k, s]) => `| \`ITR2-${x}-${k}\` | ${s.part} | ${s.genre} | ${WORDS[s.part]} | ${s.items.map(it => `${it.n}. ${it.kind}`).join(', ')} |`).join('\n')
  const shapes = Object.entries(a.sets).map(([k, s]) => s.items.map(it => `- \`ITR2-${x}-${k}-${it.n}\` ${it.kind}: ${shape(it)}`).join('\n')).join('\n')
  writeFileSync(`authors/${x}.md`, `# Assignment: author ${x}, iTEP Reading v2

Brief: \`scripts/study-bank/briefs/itep-slate-reading-v2.md\` (read it first, all of it).
Repo root: \`/Users/andylee/Downloads/saas/classraum\`. Work only in \`scripts/study-bank/itep-reading-v2-work/\`.

**Output:** \`scripts/study-bank/itep-reading-v2-work/items/${x}.json\` with \`"author": "${x}"\` (${Object.keys(a.sets).length} texts, ${nItems} items).

**Topic lane (choose every subject inside it; other authors hold other lanes):** ${a.lane}.

**Name initials:** every invented person and place name (first names, surnames, town names) starts with one of
the letters ${a.initials.split('').join(', ')}.

| set_id | part | genre | words | question kinds, in this order |
|---|---|---|---|---|
${rows}

**Per-item shape (brief §0, rule M, R5; follow exactly):**

${shapes}

**Reference lists (read-only):** \`itep-reading-v2-work/existing-passages.txt\` (openings of every passage in the bank:
your subjects must not overlap any of them) and \`itep-reading-v2-work/existing-names.json\` (capitalised words already
used in bank passages and earlier drafts: none of your names may appear in it).

**Check (run from the repo root until it prints \`PROBLEMS 0\`):**

    node scripts/study-bank/itep-reading-v2-work/itep-reading-check.mjs scripts/study-bank/itep-reading-v2-work/items/${x}.json --expect ${nItems} --assigned scripts/study-bank/itep-reading-v2-work/ASSIGNED.json --existing-names scripts/study-bank/itep-reading-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not \`ITEP-SLATE-BLUEPRINT.md\`, not any prereg, pending
file, batch file, grader file or any \`itep-reading-v1-work\` file, and nothing under \`scratchpad/\`.
`)
}
const tally = (f) => allItems.reduce((m, r) => { const v = f(r); if (v) m[v] = (m[v] || 0) + 1; return m }, {})
console.log('items', allItems.length, tally(r => `part ${authors[r.x].sets[r.k].part}`))
console.log('kinds', tally(r => r.it.kind))
console.log('main-idea breadth', tally(r => r.it.breadth), 'form', tally(r => r.it.key_form))
console.log('key length', tally(r => r.it.key_length))
console.log('wrote ASSIGNED.json and authors/A-H.md')
