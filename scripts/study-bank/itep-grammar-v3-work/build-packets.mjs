#!/usr/bin/env node
/**
 * build-packets.mjs — packets for the iTEP SLATE Grammar v3 gate (ITEP-SLATE-GRAMMAR-V3.prereg.md §3).
 *
 *   node .../itep-grammar-v3-work/build-packets.mjs --cold
 *       pre-flight + dedupe must exit 0; deals 90 items into 3 packets of 30, STRATIFIED by Part 2 key slot
 *       (the v2 defect); writes packetN/packet-cold.json, keys/packetN.index.json, MANIFEST.json; then runs
 *       check-packets.mjs on the files it wrote and exits 2 if that fails.
 *   node .../itep-grammar-v3-work/build-packets.mjs --keyed --packet 2 --grader b
 *       run BY THE GRADER after its cold file exists: refuses unless packet2/cold-b.json covers every item with a
 *       pick that is one of the item's choices; records its sha256 in results/coldsha/packet2-b.sha256 (write
 *       once); only then writes packet2/packet-b.json (the stated key added) and the keyed brief.
 *
 * The deal: Part 2 items are dealt per key slot to the fixed targets below (every packet within 1 of an even
 * split on A/B/C/D); Part 1 items 7/7/6 with their choices arranged so the key letter is also within 1 per
 * packet (Part 1 letters do not count under rule 4; balancing them removes noise for the graders). A seeded
 * search over attempts 0..999 takes the first deal that also has: no three consecutive Part 2 items (packet
 * order) with one key letter; no Part 2 key length rank held by more than 9 of a packet's Part 2 items; no
 * author with more than 6 items in a packet; no category on more than 2 of a packet's Part 2 items.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rng, shuffleWith } from '../seeded-shuffle.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../../..')
const OUT = join(ROOT, 'scratchpad/itep-grammar-v3')
const MANIFEST = join(HERE, 'MANIFEST.json')
const AUTHORS = 'ABCDEFG'.split('')
const ITEMS = AUTHORS.map(a => join(HERE, 'items', `author-${a}.json`))
const REF = join(HERE, 'ref-199.json')
const BRIEF = join(ROOT, 'scripts/study-bank/briefs/itep-slate-grammar-v1.md')
const GRADER_BRIEF = join(ROOT, 'scripts/study-bank/cofounder-grader/COFOUNDER-BRIEF-v2.md')
const COLD_BRIEF = join(HERE, '../itep-grammar-v1-work/COLD-BRIEF.md')
const P1N = [7, 7, 6]
const P2T = [{ A: 6, B: 6, C: 6, D: 5 }, { A: 6, B: 6, C: 5, D: 6 }, { A: 6, B: 6, C: 6, D: 6 }]
const L = ['A', 'B', 'C', 'D']
const die = m => { console.error(`build-packets: ${m}`); process.exit(2) }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const seedOf = s => parseInt(createHash('sha256').update(s).digest('hex').slice(0, 8), 16)
const isP2 = it => it.part.startsWith('Part 2')
const kind = it => isP2(it) ? 'Error Identification' : 'Sentence Completion'
const arg = k => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined }

const items = ITEMS.flatMap((f, i) => { if (!existsSync(f)) die(`missing ${f}`); return JSON.parse(readFileSync(f, 'utf8')).map(x => ({ ...x, __author: AUTHORS[i] })) })
if (items.length !== 90) die(`read ${items.length} items, expected 90`)

function tryDeal(t) {
  const rand = rng(seedOf(`itep-grammar-v3#${t}`))
  const p2 = items.filter(isP2), p1 = shuffleWith(items.filter(i => !isP2(i)), rand)
  const bySlot = Object.fromEntries(L.map(s => [s, shuffleWith(p2.filter(i => i.key_slot === s), rand)]))
  const packets = [[], [], []]
  for (const s of L) { let at = 0; P2T.forEach((tg, p) => { packets[p].push(...bySlot[s].slice(at, at + tg[s])); at += tg[s] }); if (at !== bySlot[s].length) return null }
  let at = 0
  P1N.forEach((n, p) => { packets[p].push(...p1.slice(at, at + n)); at += n })
  // Local repair: swap same-slot Part 2 items (or any two Part 1 items) between packets while that does not
  // raise the violation count; seeded, so deterministic. Slot targets are preserved by every swap.
  const over = (arr, key, cap) => { const m = {}; arr.forEach(x => { const k = key(x); m[k] = (m[k] || 0) + 1 }); return Object.values(m).reduce((s, v) => s + Math.max(0, v - cap), 0) }
  const cost = pk => over(pk.filter(isP2), x => x.key_len_rank, 9) + over(pk, x => x.__author, 6) + over(pk.filter(isP2), x => x.category, 2)
  const total = () => packets.reduce((s, pk) => s + cost(pk), 0)
  let c = total()
  for (let step = 0; step < 20000 && c > 0; step++) {
    const pa = Math.floor(rand() * 3), pb = (pa + 1 + Math.floor(rand() * 2)) % 3
    const i = Math.floor(rand() * packets[pa].length), x = packets[pa][i]
    const cands = packets[pb].map((y, j) => [y, j]).filter(([y]) => isP2(x) ? isP2(y) && y.key_slot === x.key_slot : !isP2(y))
    if (!cands.length) continue
    const [, j] = cands[Math.floor(rand() * cands.length)]
    ;[packets[pa][i], packets[pb][j]] = [packets[pb][j], packets[pa][i]]
    const c2 = total()
    if (c2 <= c) c = c2; else [packets[pa][i], packets[pb][j]] = [packets[pb][j], packets[pa][i]]
  }
  if (c > 0) return null
  const out = []
  for (let p = 0; p < 3; p++) {
    // partition constraints (independent of order)
    const p2items = packets[p].filter(isP2)
    const rk = {}; p2items.forEach(it => { rk[it.key_len_rank] = (rk[it.key_len_rank] || 0) + 1 }); if (Math.max(...Object.values(rk)) > 9) return null
    const au = {}; packets[p].forEach(it => { au[it.__author] = (au[it.__author] || 0) + 1 }); if (Math.max(...Object.values(au)) > 6) return null
    const ca = {}; p2items.forEach(it => { ca[it.category] = (ca[it.category] || 0) + 1 }); if (Math.max(...Object.values(ca)) > 2) return null
    // order: up to 500 seeded shuffles of this packet until no three consecutive Part 2 keys share a letter
    let order = null
    for (let o = 0; o < 500 && !order; o++) {
      const cand = shuffleWith([...packets[p]], rand)
      const letters = cand.filter(isP2).map(it => it.key_slot)
      if (!letters.some((x, i) => i >= 2 && x === letters[i - 1] && x === letters[i - 2])) order = cand
    }
    if (!order) return null
    const nP1 = order.filter(i => !isP2(i)).length
    const p1Letters = shuffleWith(Array.from({ length: nP1 }, (_, k) => L[(k + p) % 4]), rand)
    let q = 0
    const rows = order.map((it, i) => {
      let choices = [...it.choices]
      if (!isP2(it)) {
        const others = shuffleWith(choices.filter(c => c !== it.correct_answer), rand)
        const at2 = L.indexOf(p1Letters[q++]); choices = [...others.slice(0, at2), it.correct_answer, ...others.slice(at2)]
      }
      return { n: i + 1, it, choices }
    })
    out.push(rows)
  }
  return out
}
let packets = null, attempt = -1
for (let t = 0; t < 1000 && !packets; t++) { packets = tryDeal(t); attempt = t }
if (!packets) die('no deal in 1000 attempts satisfies the constraints')

const mode = process.argv.includes('--keyed') ? 'keyed' : process.argv.includes('--cold') ? 'cold' : null
if (!mode) die('pass --cold or --keyed --packet <1-3> --grader <a|b|c>')

if (mode === 'cold') {
  const pf = spawnSync('node', [join(HERE, '../itep-grammar-v1-work/itep-grammar-check.mjs'), ...ITEMS, '--expect', '90', '--assigned', join(HERE, 'ASSIGNED.json')], { encoding: 'utf8' })
  if (pf.status !== 0) die(`pre-flight failed:\n${pf.stdout}${pf.stderr}`)
  const dd = spawnSync('node', [join(HERE, '../itep-grammar-v2-work/dedupe.mjs'), ...ITEMS, '--expect', '90', '--against', REF], { encoding: 'utf8' })
  if (dd.status !== 0) die(`dedupe failed:\n${dd.stdout}${dd.stderr}`)
  mkdirSync(join(OUT, 'keys'), { recursive: true })
  packets.forEach((pk, p) => {
    const dir = join(OUT, `packet${p + 1}`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'packet-cold.json'), JSON.stringify(pk.map(({ n, it, choices }) => ({ n, kind: kind(it), prompt: it.prompt, passage: it.passage, choices })), null, 1) + '\n')
    writeFileSync(join(OUT, 'keys', `packet${p + 1}.index.json`), JSON.stringify(pk.map(({ n, it }) => ({ n, id: it.id, author: it.__author, cohort: 'itep-grammar-v3', part: it.part, category: it.category, key: it.correct_answer, key_len_rank: it.key_len_rank })), null, 1) + '\n')
    copyFileSync(COLD_BRIEF, join(dir, 'COLD-BRIEF.md'))
  })
  const manifest = {
    prereg: 'scripts/study-bank/ITEP-SLATE-GRAMMAR-V3.prereg.md', instrument: 'v2 gate: cold solve, then COFOUNDER-BRIEF-v2 keyed, A1 rules per packet',
    author_brief: 'scripts/study-bank/briefs/itep-slate-grammar-v1.md', author_brief_sha256: sha(BRIEF),
    assigned_sha256: sha(join(HERE, 'ASSIGNED.json')), ref_sha256: sha(REF),
    grader_brief: 'scripts/study-bank/cofounder-grader/COFOUNDER-BRIEF-v2.md', grader_brief_sha256: sha(GRADER_BRIEF),
    cold_brief_sha256: sha(COLD_BRIEF), item_files_sha256: Object.fromEntries(ITEMS.map(f => [f.split('/').pop(), sha(f)])),
    packet_root: 'scratchpad/itep-grammar-v3', deal_attempt: attempt, packets: packets.map(p => p.length), items: 90, graders: ['a', 'b', 'c'],
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n')
  const ck = spawnSync('node', [join(HERE, 'check-packets.mjs'), '--root', OUT], { encoding: 'utf8' })
  process.stdout.write(ck.stdout + ck.stderr)
  if (ck.status !== 0) die('check-packets FAILED on the written packets; do not send them to graders')
  console.log(`pre-flight + dedupe PASS; deal attempt ${attempt}; wrote 3 cold packets (${manifest.packets.join('/')}), keys, manifest; check-packets PASS`)
} else {
  const p = Number(arg('--packet')), k = arg('--grader')
  if (!(p >= 1 && p <= 3) || !['a', 'b', 'c'].includes(k)) die('--packet <1-3> --grader <a|b|c> required')
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  for (const [f, h] of Object.entries(manifest.item_files_sha256)) if (sha(join(HERE, 'items', f)) !== h) die(`${f} changed since the cold packets were built`)
  const dir = join(OUT, `packet${p}`)
  const cold = JSON.parse(readFileSync(join(dir, 'packet-cold.json'), 'utf8'))
  const c = join(dir, `cold-${k}.json`)
  if (!existsSync(c)) die(`packet${p}/cold-${k}.json does not exist yet: write your cold answers first`)
  let cj; try { cj = JSON.parse(readFileSync(c, 'utf8')) } catch (e) { die(`packet${p}/cold-${k}.json is not valid JSON: ${e.message}`) }
  for (const row of cold) {
    const a = cj[String(row.n)]
    if (!a || typeof a.pick !== 'string' || !Array.isArray(a.also_correct)) die(`cold-${k}.json item ${row.n}: needs {pick, also_correct[]}`)
    if (!row.choices.includes(a.pick)) die(`cold-${k}.json item ${row.n}: pick ${JSON.stringify(a.pick)} is not one of its choices (copy the text exactly)`)
    for (const x of a.also_correct) if (!row.choices.includes(x)) die(`cold-${k}.json item ${row.n}: also_correct ${JSON.stringify(x)} is not one of its choices`)
  }
  const shaDir = join(HERE, 'results/coldsha'); mkdirSync(shaDir, { recursive: true })
  const sf = join(shaDir, `packet${p}-${k}.sha256`), h = sha(c)
  if (existsSync(sf) && readFileSync(sf, 'utf8').trim() !== h) die(`cold-${k}.json changed after its sha256 was recorded; the cold file may not be edited`)
  writeFileSync(sf, h + '\n')
  const keyed = packets[p - 1].map(({ n, it, choices }) => ({ n, family: 'itep', section: 'grammar', passage: it.passage, prompt: it.prompt, choices, correct_answer: it.correct_answer }))
  writeFileSync(join(dir, `packet-${k}.json`), JSON.stringify(keyed, null, 1) + '\n')
  copyFileSync(GRADER_BRIEF, join(dir, 'COFOUNDER-BRIEF-v2.md'))
  console.log(`packet${p}/${k}: cold file accepted (${cold.length} items, sha256 recorded); wrote packet${p}/packet-${k}.json with the stated keys`)
}
