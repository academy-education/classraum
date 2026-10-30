#!/usr/bin/env node
/**
 * build-packets.mjs — packets for the iTEP SLATE Grammar v1 gate (ITEP-SLATE-GRAMMAR-V1.prereg.md §3).
 *
 *   node scripts/study-bank/itep-grammar-v1-work/build-packets.mjs --cold    # packet-cold.json + index.json + MANIFEST
 *   node scripts/study-bank/itep-grammar-v1-work/build-packets.mjs --keyed   # packet.json, ONLY once cold-a/b/c exist
 *
 * Item order shuffled (seeded); Part 1 choices shuffled (seeded, unbiased); Part 2 choices kept in sentence
 * order, because the [A:]..[D:] labels in the sentence name them. --keyed refuses until every cold file
 * exists and records each cold file's sha256 in the manifest before the keyed packet is written.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rng, shuffleWith } from '../seeded-shuffle.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../../..')
const OUT = join(ROOT, 'scratchpad/itep-grammar-v1/packet1')
const MANIFEST = join(HERE, 'MANIFEST.json')
const ITEMS = ['author-a.json', 'author-b.json', 'author-c.json'].map(f => join(HERE, 'items', f))
const BRIEF = join(ROOT, 'scripts/study-bank/briefs/itep-slate-grammar-v1.md')
const GRADER_BRIEF = join(ROOT, 'scripts/study-bank/cofounder-grader/COFOUNDER-BRIEF-v2.md')
const COLD_BRIEF = join(HERE, 'COLD-BRIEF.md')
const GRADERS = ['a', 'b', 'c']
const die = m => { console.error(`build-packets: ${m}`); process.exit(2) }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const seedOf = s => parseInt(createHash('sha256').update(s).digest('hex').slice(0, 8), 16)

const items = ITEMS.flatMap(f => { if (!existsSync(f)) die(`missing ${f}`); return JSON.parse(readFileSync(f, 'utf8')) })
if (items.length !== 24) die(`read ${items.length} items, expected 24`)

function deal() {
  const rand = rng(seedOf('itep-grammar-v1:packet1'))
  const order = shuffleWith([...items], rand)
  return order.map((it, i) => {
    const p2 = it.part.startsWith('Part 2')
    return { n: i + 1, it, choices: p2 ? [...it.choices] : shuffleWith([...it.choices], rand) }
  })
}

const dealt = deal()
const mode = process.argv.includes('--keyed') ? 'keyed' : process.argv.includes('--cold') ? 'cold' : null
if (!mode) die('pass --cold or --keyed')
mkdirSync(OUT, { recursive: true })

const kind = it => it.part.startsWith('Part 2') ? 'Error Identification' : 'Sentence Completion'
if (mode === 'cold') {
  const cold = dealt.map(({ n, it, choices }) => ({ n, kind: kind(it), prompt: it.prompt, passage: it.passage, choices }))
  const index = dealt.map(({ n, it }) => ({ n, id: it.id, cohort: 'itep-grammar-v1', group: `item:${it.id}`, part: it.part, key: it.correct_answer }))
  writeFileSync(join(OUT, 'packet-cold.json'), JSON.stringify(cold, null, 1) + '\n')
  writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 1) + '\n')
  copyFileSync(COLD_BRIEF, join(OUT, 'COLD-BRIEF.md'))
  const manifest = {
    prereg: 'scripts/study-bank/ITEP-SLATE-GRAMMAR-V1.prereg.md', instrument: 'AGENT-REVIEW-SSAT-MAP.prereg.md + A1, cold solve first',
    author_brief: 'scripts/study-bank/briefs/itep-slate-grammar-v1.md', author_brief_sha256: sha(BRIEF),
    grader_brief: 'scripts/study-bank/cofounder-grader/COFOUNDER-BRIEF-v2.md', grader_brief_sha256: sha(GRADER_BRIEF),
    cold_brief_sha256: sha(COLD_BRIEF), item_files_sha256: Object.fromEntries(ITEMS.map(f => [f.split('/').pop(), sha(f)])),
    packet_dir: 'scratchpad/itep-grammar-v1/packet1', items: 24, graders: GRADERS, cold_sha256: null,
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n')
  console.log(`wrote cold packet (${cold.length} items), index, manifest`)
} else {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  for (const [f, h] of Object.entries(manifest.item_files_sha256)) if (sha(join(HERE, 'items', f)) !== h) die(`${f} changed since the cold packet was built`)
  const coldSha = {}
  for (const k of GRADERS) {
    const p = join(OUT, `cold-${k}.json`)
    if (!existsSync(p)) die(`cold-${k}.json does not exist yet; the keyed packet is written only after all cold files`)
    try { JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`cold-${k}.json is not valid JSON: ${e.message}`) }
    coldSha[k] = sha(p)
  }
  const keyed = dealt.map(({ n, it, choices }) => ({ n, family: 'itep', section: 'grammar', passage: it.passage, prompt: it.prompt, choices, correct_answer: it.correct_answer }))
  writeFileSync(join(OUT, 'packet.json'), JSON.stringify(keyed, null, 1) + '\n')
  copyFileSync(GRADER_BRIEF, join(OUT, 'COFOUNDER-BRIEF-v2.md'))
  manifest.cold_sha256 = coldSha
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n')
  console.log(`wrote keyed packet (${keyed.length} items); cold sha256 recorded for ${Object.keys(coldSha).join(', ')}`)
}
