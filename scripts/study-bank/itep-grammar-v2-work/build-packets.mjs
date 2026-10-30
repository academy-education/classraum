#!/usr/bin/env node
/**
 * build-packets.mjs — packets for the iTEP SLATE Grammar v2 gate (ITEP-SLATE-GRAMMAR-V2.prereg.md §3).
 * The v1 builder generalised to 6 packets (42/42/42/42/41/41) dealt from all 250 items.
 *
 *   node .../itep-grammar-v2-work/build-packets.mjs --cold            # all packet-cold.json + index.json + MANIFEST
 *   node .../itep-grammar-v2-work/build-packets.mjs --keyed --packet 3  # packet3/packet.json, ONLY once its cold-a/b/c exist
 *
 * --cold refuses unless the pre-flight and the dedupe check both exit 0 on the final item files.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rng, shuffleWith } from '../seeded-shuffle.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../../..')
const OUT = join(ROOT, 'scratchpad/itep-grammar-v2')
const MANIFEST = join(HERE, 'MANIFEST.json')
const AUTHORS = 'ABCDEFGHIJ'.split('')
const ITEMS = AUTHORS.map(a => join(HERE, 'items', `author-${a}.json`))
const PILOT = ['a', 'b', 'c'].map(a => join(HERE, '../itep-grammar-v1-work/items', `author-${a}.json`))
const BRIEF = join(ROOT, 'scripts/study-bank/briefs/itep-slate-grammar-v1.md')
const GRADER_BRIEF = join(ROOT, 'scripts/study-bank/cofounder-grader/COFOUNDER-BRIEF-v2.md')
const COLD_BRIEF = join(HERE, '../itep-grammar-v1-work/COLD-BRIEF.md')
const GRADERS = ['a', 'b', 'c']
const SIZES = [42, 42, 42, 42, 41, 41]
const die = m => { console.error(`build-packets: ${m}`); process.exit(2) }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const seedOf = s => parseInt(createHash('sha256').update(s).digest('hex').slice(0, 8), 16)

const items = ITEMS.flatMap(f => { if (!existsSync(f)) die(`missing ${f}`); return JSON.parse(readFileSync(f, 'utf8')) })
if (items.length !== 250) die(`read ${items.length} items, expected 250`)

function deal() {
  const rand = rng(seedOf('itep-grammar-v2'))
  const order = shuffleWith([...items], rand)
  const packets = []
  let at = 0
  SIZES.forEach((n, p) => {
    packets.push(order.slice(at, at + n).map((it, i) => ({ n: i + 1, it, choices: it.part.startsWith('Part 2') ? [...it.choices] : shuffleWith([...it.choices], rand) })))
    at += n
  })
  return packets
}
const packets = deal()
const kind = it => it.part.startsWith('Part 2') ? 'Error Identification' : 'Sentence Completion'
const mode = process.argv.includes('--keyed') ? 'keyed' : process.argv.includes('--cold') ? 'cold' : null
if (!mode) die('pass --cold or --keyed --packet <1-6>')

if (mode === 'cold') {
  const pf = spawnSync('node', [join(HERE, '../itep-grammar-v1-work/itep-grammar-check.mjs'), ...ITEMS, '--expect', '250', '--assigned', join(HERE, 'ASSIGNED.json')], { encoding: 'utf8' })
  if (pf.status !== 0) die(`pre-flight failed:\n${pf.stdout}${pf.stderr}`)
  const dd = spawnSync('node', [join(HERE, 'dedupe.mjs'), ...ITEMS, '--expect', '250', ...PILOT.flatMap(p => ['--against', p])], { encoding: 'utf8' })
  if (dd.status !== 0) die(`dedupe failed:\n${dd.stdout}${dd.stderr}`)
  packets.forEach((pk, p) => {
    const dir = join(OUT, `packet${p + 1}`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'packet-cold.json'), JSON.stringify(pk.map(({ n, it, choices }) => ({ n, kind: kind(it), prompt: it.prompt, passage: it.passage, choices })), null, 1) + '\n')
    writeFileSync(join(dir, 'index.json'), JSON.stringify(pk.map(({ n, it }) => ({ n, id: it.id, cohort: 'itep-grammar-v2', group: `item:${it.id}`, part: it.part, key: it.correct_answer })), null, 1) + '\n')
    copyFileSync(COLD_BRIEF, join(dir, 'COLD-BRIEF.md'))
  })
  const manifest = {
    prereg: 'scripts/study-bank/ITEP-SLATE-GRAMMAR-V2.prereg.md', instrument: 'AGENT-REVIEW-SSAT-MAP.prereg.md + A1, cold solve first (v1 gate)',
    author_brief: 'scripts/study-bank/briefs/itep-slate-grammar-v1.md', author_brief_sha256: sha(BRIEF),
    assigned_sha256: sha(join(HERE, 'ASSIGNED.json')),
    grader_brief: 'scripts/study-bank/cofounder-grader/COFOUNDER-BRIEF-v2.md', grader_brief_sha256: sha(GRADER_BRIEF),
    cold_brief_sha256: sha(COLD_BRIEF), item_files_sha256: Object.fromEntries(ITEMS.map(f => [f.split('/').pop(), sha(f)])),
    packet_root: 'scratchpad/itep-grammar-v2', packets: SIZES, items: 250, graders: GRADERS, cold_sha256: {},
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n')
  console.log(`pre-flight + dedupe PASS; wrote ${packets.length} cold packets (${SIZES.join('/')}), indexes, manifest`)
} else {
  const p = Number(process.argv[process.argv.indexOf('--packet') + 1])
  if (!(p >= 1 && p <= SIZES.length)) die('--packet <1-6> required')
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  for (const [f, h] of Object.entries(manifest.item_files_sha256)) if (sha(join(HERE, 'items', f)) !== h) die(`${f} changed since the cold packets were built`)
  const dir = join(OUT, `packet${p}`)
  const coldSha = {}
  for (const k of GRADERS) {
    const c = join(dir, `cold-${k}.json`)
    if (!existsSync(c)) die(`packet${p}/cold-${k}.json does not exist yet`)
    try { JSON.parse(readFileSync(c, 'utf8')) } catch (e) { die(`packet${p}/cold-${k}.json is not valid JSON: ${e.message}`) }
    coldSha[k] = sha(c)
  }
  const keyed = packets[p - 1].map(({ n, it, choices }) => ({ n, family: 'itep', section: 'grammar', passage: it.passage, prompt: it.prompt, choices, correct_answer: it.correct_answer }))
  writeFileSync(join(dir, 'packet.json'), JSON.stringify(keyed, null, 1) + '\n')
  copyFileSync(GRADER_BRIEF, join(dir, 'COFOUNDER-BRIEF-v2.md'))
  manifest.cold_sha256[`packet${p}`] = coldSha
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n')
  console.log(`packet${p}: wrote keyed packet (${keyed.length} items); cold sha256 recorded for ${Object.keys(coldSha).join(', ')}`)
}
