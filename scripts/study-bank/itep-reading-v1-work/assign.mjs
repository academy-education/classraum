// assign.mjs — writes ASSIGNED.json and authors/<X>.md for iTEP Reading v1 (deterministic; no randomness).
//   node assign.mjs     (from this directory)
import { writeFileSync } from 'node:fs'
const A = {
  A: { initials: 'ABCDEF', lane: 'animals, insects, oceans and the natural world; sports and outdoor games',
    sets: {
      P1A: { genre: 'school notice', kinds: ['detail'] },
      P1B: { genre: 'text message', kinds: ['purpose'] },
      P2: { genre: 'story', kinds: ['main-idea', 'detail', 'vocabulary', 'inference'] },
      P3: { genre: 'informational science', kinds: ['main-idea', 'detail', 'vocabulary', 'inference', 'detail', 'purpose'] },
    } },
  B: { initials: 'GHIJKL', lane: 'towns, markets and crafts in the past and present; school clubs and events',
    sets: {
      P1A: { genre: 'poster', kinds: ['vocabulary'] },
      P1B: { genre: 'note', kinds: ['detail'] },
      P2: { genre: 'informational history', kinds: ['detail', 'vocabulary', 'not-except', 'purpose'] },
      P3: { genre: 'first-person school life', kinds: ['main-idea', 'inference', 'detail', 'vocabulary', 'not-except', 'inference'] },
    } },
  C: { initials: 'MNOPQR', lane: 'plants, food, farming and weather; roads, boats, trains and how people travelled',
    sets: {
      P1A: { genre: 'advertisement', kinds: ['main-idea'] },
      P1B: { genre: 'diary entry', kinds: ['inference'] },
      P2: { genre: 'informational science', kinds: ['main-idea', 'not-except', 'detail', 'inference'] },
      P3: { genre: 'informational history', kinds: ['main-idea', 'vocabulary', 'detail', 'purpose', 'vocabulary', 'inference'] },
    } },
  D: { initials: 'STUVWYZ', lane: 'inventions, tools and everyday technology; music, art, buildings, libraries and museums',
    sets: {
      P1A: { genre: 'library notice', kinds: ['purpose'] },
      P1B: { genre: 'email', kinds: ['detail'] },
      P2: { genre: 'first-person school life', kinds: ['main-idea', 'vocabulary', 'purpose', 'inference'] },
      P3: { genre: 'informational technology', kinds: ['main-idea', 'detail', 'not-except', 'inference', 'purpose', 'purpose'] },
    } },
}
writeFileSync('ASSIGNED.json', JSON.stringify({ batch: 'itep-reading-v1', authors: A }, null, 1) + '\n')
const W = { P1A: '55-95', P1B: '55-95', P2: '180-240', P3: '450-560' }
for (const [x, a] of Object.entries(A)) {
  const rows = Object.entries(a.sets).map(([k, s]) => `| \`ITR1-${x}-${k}\` | ${k.startsWith('P1') ? 1 : k.slice(1)} | ${s.genre} | ${W[k]} | ${s.kinds.map((q, i) => `${i + 1}. ${q}`).join(', ')} |`).join('\n')
  writeFileSync(`authors/${x}.md`, `# Assignment: author ${x}, iTEP Reading v1

Brief: \`scripts/study-bank/briefs/itep-slate-reading-v1.md\` (read it first, all of it).
Repo root: \`/Users/andylee/Downloads/saas/classraum\`. Work only in \`scripts/study-bank/itep-reading-v1-work/\`.

**Output:** \`scripts/study-bank/itep-reading-v1-work/items/${x}.json\` with \`"author": "${x}"\`.

**Topic lane (choose all four subjects inside it; other authors hold other lanes):** ${a.lane}.

**Name initials:** every invented person and place name (first names, surnames, town names) starts with one of
the letters ${a.initials.split('').join(', ')}.

| set_id | part | genre | words | question kinds, in order |
|---|---|---|---|---|
${rows}

**Reference lists (read-only):** \`itep-reading-v1-work/existing-passages.txt\` (openings of every passage in the bank:
your subjects must not overlap any of them) and \`itep-reading-v1-work/existing-names.json\` (capitalised words already
used in bank passages: none of your names may appear in it).

**Check (run from the repo root until it prints \`PROBLEMS 0\`):**

    node scripts/study-bank/itep-reading-v1-work/itep-reading-check.mjs scripts/study-bank/itep-reading-v1-work/items/${x}.json --expect 12 --assigned scripts/study-bank/itep-reading-v1-work/ASSIGNED.json --existing-names scripts/study-bank/itep-reading-v1-work/existing-names.json

Read nothing else in the repo: not other authors' files, not \`ITEP-SLATE-BLUEPRINT.md\`, not any prereg, pending
file, batch file or grader file, and nothing under \`scratchpad/\`.
`)
}
console.log('wrote ASSIGNED.json and authors/A-D.md')
