#!/usr/bin/env node
// SSAT Reading brief v2: draw the per-draft plans (SSAT-READING-V2.prereg.md §3). Deterministic from the seed.
//   node scripts/study-bank/ssat-reading-v2/assign.mjs --drafts 23-28 [--write]
// Writes scratchpad/ssat-v2-work/plans/dN.json (one per author; an author reads only its own) and prints a summary
// plus the sha256 of every plan. Every property below is drawn so that it lands on the key at about its natural rate;
// nothing is required or forbidden of the key (BRIEF-VERSIONING.md cut, briefs/ssat-reading.pending.md).
import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rng, shuffleWith } from '../seeded-shuffle.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const arg = k => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : null }
const range = arg('--drafts') || die('--drafts A-B required')
const [lo, hi] = range.split('-').map(Number)
if (!(lo > 22 && hi >= lo && hi - lo < 12)) die('--drafts must be a range above 22')
const DRAFTS = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
const SEED = 'ssat-reading-v2-2026-10-31'
const rand = rng(createHash('sha256').update(SEED).digest().readUInt32BE(0))
const pick = a => a[Math.floor(rand() * a.length)]
const bern = p => rand() < p
const binom = (n, p) => Array.from({ length: n }, () => bern(p)).filter(Boolean).length

const GENRES = ['fiction', 'poetry', 'memoir', 'essay', 'history', 'science']
// Subject AREAS (the author picks a specific fresh subject inside one and checks it against existing-passages.txt).
const AREAS = {
  fiction: ['a weekend or after-school job', 'a school competition or club', 'a neighbourhood repair or project', 'an apprenticeship in a craft', 'a farm or rural task', 'a trip on public transport', 'a rehearsal or performance', 'a found object and its owner'],
  poetry: ['a weather event', 'a household object', 'an animal in a city', 'a seasonal chore', 'an instrument or a piece of music', 'a night scene', 'a workplace', 'a body of water'],
  memoir: ['learning a skill from a relative', 'a first job', 'moving to a new place', 'a teacher or coach', 'an injury or a stay in bed', 'translating for someone', 'a family business', 'a sport or game'],
  essay: ['a common habit or custom', 'a tool or device of daily life', 'names and naming', 'a public space', 'measuring time or distance', 'a game and its rules', 'a food and how it is eaten', 'maps and directions'],
  history: ["an invented town's public works", 'a trade or guild', 'the founding of a school or library', 'a change in transport', 'a local newspaper or printer', 'a response to a storm, flood or fire', 'a market, fair or exchange', 'the arrival of a communication technology'],
  science: ['astronomy or space observation', 'rocks, soil or minerals', 'plant biology', 'animal behaviour', 'the physics of an everyday thing', 'the chemistry of a material or of cooking', 'microbes or fungi', 'human senses or the body', 'weather, ice or the ocean'],
}
const KIND_TOTALS = { 'main-idea': 4, detail: 9, inference: 8, 'vocabulary-in-context': 6, attitude: 3, purpose: 6 }
const KINDS = Object.keys(KIND_TOTALS)

function drawMixes() {
  const pool = Object.entries(KIND_TOTALS).flatMap(([k, n]) => Array(n).fill(k))
  for (let tries = 0; tries < 200000; tries++) {
    const s = shuffleWith([...pool], rand)
    const mixes = GENRES.map((_, i) => s.slice(i * 6, i * 6 + 6))
    const ok = mixes.every(m => {
      const c = {}; for (const k of m) c[k] = (c[k] || 0) + 1
      return Object.keys(c).length >= 4 && Math.max(...Object.values(c)) <= 3 && (c.attitude || 0) <= 1 && (c['main-idea'] || 0) <= 1
    })
      && mixes.filter(m => new Set(m).size === 6).length <= 1
      && new Set(mixes.map(m => [...m].sort().join(','))).size === 6
    if (ok) return mixes
  }
  die('cannot draw kind mixes')
}
const DIFF = { 'main-idea': () => 'easy', detail: () => 'medium', 'vocabulary-in-context': () => 'medium', inference: () => 'hard', purpose: () => 'hard', attitude: () => pick(['medium', 'hard']) }
// Key length rank: longest 1/5, shortest 1/5, middle 3/5 (the chance rates for a key among five options).
const keyLength = () => { const r = rand(); return r < 0.2 ? 'longest' : r < 0.4 ? 'shortest' : 'middle' }
function shape(kind) {
  const s = { key_length: keyLength() }
  if (kind === 'main-idea') {
    const r = rand()
    s.breadth = r < 0.25 ? 'key-broadest' : r < 0.65 ? 'distractor-broader' : 'all-level'
    const twoPart = binom(5, 0.3) // two-part options among five; the key is one of them at rate n/5
    s.key_form = bern(twoPart / 5) ? 'two-part' : 'one-part'
    s.two_part_distractors = s.key_form === 'two-part' ? Math.max(1, twoPart - 1) : Math.min(4, twoPart)
  }
  if (kind === 'attitude') {
    const strong = binom(5, 0.4)
    s.key_intensity = bern(strong / 5) ? 'strong' : 'moderate'
    s.strong_distractors = s.key_intensity === 'strong' ? strong - 1 : Math.min(4, strong)
  }
  if (kind === 'vocabulary-in-context') s.distractor_types = Array.from({ length: 4 }, () => (bern(0.35) ? 'context' : 'sense'))
  if (kind === 'purpose') {
    const abs = binom(5, 0.5)
    s.key_abstract = bern(abs / 5)
    s.abstract_distractors = s.key_abstract ? abs - 1 : Math.min(4, abs)
  }
  return s
}
const areaDeck = Object.fromEntries(GENRES.map(g => [g, shuffleWith([...AREAS[g]], rand)]))
const plans = DRAFTS.map((N, di) => {
  const mixes = drawMixes()
  return {
    draft: N, brief: 'scripts/study-bank/briefs/ssat-reading-v2.md', seed: SEED,
    passages: GENRES.map((genre, gi) => ({
      passage_id: `D${N}-P0${gi + 1}`, genre, subject_area: areaDeck[genre][di % areaDeck[genre].length],
      items: shuffleWith([...mixes[gi]], rand).map((kind, k) => ({ qid: `D${N}-P0${gi + 1}-${k + 1}`, kind, difficulty: DIFF[kind](), shape: shape(kind) })),
    })),
  }
})
// summary: how often each drawn property lands on the key
const items = plans.flatMap(p => p.passages.flatMap(x => x.items))
const tally = f => items.reduce((c, i) => { const v = f(i); if (v != null) c[v] = (c[v] || 0) + 1; return c }, {})
console.log('items', items.length, 'kinds', JSON.stringify(tally(i => i.kind)))
console.log('key_length', JSON.stringify(tally(i => i.shape.key_length)))
console.log('main-idea breadth', JSON.stringify(tally(i => i.shape.breadth)), 'key_form', JSON.stringify(tally(i => i.shape.key_form)))
console.log('attitude key_intensity', JSON.stringify(tally(i => i.shape.key_intensity)))
console.log('vocab distractor types', JSON.stringify(items.flatMap(i => i.shape.distractor_types || []).reduce((c, t) => (c[t] = (c[t] || 0) + 1, c), {})), 'all-sense items', items.filter(i => i.shape.distractor_types?.every(t => t === 'sense')).length, 'of', items.filter(i => i.shape.distractor_types).length)
console.log('purpose key_abstract', JSON.stringify(tally(i => i.shape.key_abstract)))
for (const p of plans) console.log(`D${p.draft}`, p.passages.map(x => `${x.genre}: ${x.subject_area}`).join(' | '))
if (process.argv.includes('--write')) {
  const dir = join(ROOT, 'scratchpad/ssat-v2-work/plans'); mkdirSync(dir, { recursive: true })
  for (const p of plans) {
    const txt = JSON.stringify(p, null, 1) + '\n'
    writeFileSync(join(dir, `d${p.draft}.json`), txt)
    console.log(`wrote plans/d${p.draft}.json sha256 ${createHash('sha256').update(txt).digest('hex')}`)
  }
} else console.log('dry run; --write writes the plans')
