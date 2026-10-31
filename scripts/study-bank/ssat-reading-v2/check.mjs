#!/usr/bin/env node
// SSAT Reading brief v2 mechanical check (briefs/ssat-reading-v2.md, SSAT-READING-V2.prereg.md).
//   node scripts/study-bank/ssat-reading-v2/check.mjs --draft N [--selftest]
// Reads scratchpad/ssat-draftN-work/authored/dN.json and the plan scratchpad/ssat-v2-work/plans/dN.json, writes
// scratchpad/ssat-draftN-work/merged.json (seeded, balanced key slots). Exit 0 clean, 1 problems, 2 cannot measure.
// Carried from the d19-22 merge: word counts, one negation per block, no DIR attitude word in a passage, verbatim
// why/why2, 5 distinct choices, length ratio <= 1.5, rationales, no letter names, kind mixes differ per passage,
// stem openings <= 3, attitude words once per draft and no repeated live set, absolutes/hedges balance.
// New in v2: the plan is enforced item by item (kind, difficulty, key length rank, main-idea breadth/two-part tags,
// attitude intensities, vocabulary distractor types, purpose abstract tags), no usage glosses, no shared key 4-gram,
// and no dangling "Looking back..., the X's attitude" stem.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const die = m => { console.error('NOT MEASURED: ' + m); process.exit(2) }
const arg = k => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : null }

export const DIR = {
  warm: 'admiring approving appreciative proud respectful grateful sympathetic fond affectionate enthusiastic reverent tender',
  critical: 'critical dismissive disapproving scornful contemptuous indignant irritated resentful exasperated disdainful annoyed angry',
  anxious: 'uneasy frightened worried apprehensive anxious wary fearful alarmed troubled',
  sorrowful: 'regretful sad wistful nostalgic mournful melancholy rueful sorrowful',
  amused: 'amused playful humorous whimsical',
  curious: 'curious inquisitive intrigued',
  neutral: 'detached impartial indifferent objective',
  doubtful: 'skeptical doubtful dubious',
}
// passage ban list keeps the d19 noun forms too
const NOUNS = 'admiration approval appreciation pride respect gratitude sympathy fondness affection enthusiasm reverence tenderness criticism disapproval scorn contempt indignation irritation resentment exasperation disdain annoyance anger unease worry apprehension anxiety wariness fear alarm regret sadness wistfulness nostalgia sorrow amusement playfulness humor whimsy'
export const STRONG = new Set('enthusiastic reverent scornful contemptuous indignant exasperated disdainful angry resentful frightened fearful alarmed mournful sorrowful'.split(' '))
export const dirOf = w => Object.keys(DIR).find(d => DIR[d].split(' ').includes(String(w).toLowerCase()))
const TABLE = [...Object.values(DIR).join(' ').split(' '), ...NOUNS.split(' ')]
const NEG = /\b(not|no|never|nothing|nor|none|neither|nobody|nowhere|cannot)\b|n't\b/gi
const ABS = /\b(all|every|always|never|only|entirely|completely|wholly|whole|any|none|no one|nothing|must|alone)\b/i
const HEDGE = /\b(may|might|some|partly|perhaps|could|somewhat|likely|probably|seem|seems|suggest)\b/i
const GLOSS = /(,\s*as (a|an|one|people|someone)\b)|\bin slang\b|\(as\b|\bas a [a-z]+ does\b/i
const DANGLE = /^(looking|thinking|writing|remembering|reflecting|speaking|recalling|reading)\b[^,]*,\s*(the|this|that|his|her|their|its)\s+[\w-]+'s\b/i
const norm = s => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const words = s => s.trim().split(/\s+/).filter(Boolean).length
const grams = s => { const w = norm(s).toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean); const g = new Set(); for (let i = 0; i + 4 <= w.length; i++) g.add(w.slice(i, i + 4).join(' ')); return g }

export function lengthRank(choices, key) {
  const L = choices.map(c => c.length), k = key.length
  const max = Math.max(...L), min = Math.min(...L)
  if (k === max && L.filter(x => x === k).length === 1) return 'longest'
  if (k === min && L.filter(x => x === k).length === 1) return 'shortest'
  if (k < max && k > min) return 'middle'
  return 'tied'
}
const count = (arr, v) => arr.filter(x => x === v).length

export function checkDraft(sets, plan, liveAtt = []) {
  const probs = []
  if (sets.length !== 6) probs.push(`expected 6 sets, got ${sets.length}`)
  const mixes = []
  sets.forEach((p, pi) => {
    const pp = plan.passages[pi]
    if (!pp || p.passage_id !== pp.passage_id) { probs.push(`${p.passage_id} is not plan passage ${pp?.passage_id}`); return }
    if (p.genre !== pp.genre) probs.push(`${p.passage_id} genre ${p.genre}, plan ${pp.genre}`)
    const w = words(p.passage), poem = p.genre === 'poetry'
    if (poem ? (w < 220 || w > 400) : (w < 300 || w > 600)) probs.push(`${p.passage_id} words ${w}`)
    p.passage.split(/\n\n/).forEach((para, i) => { const n = (para.match(NEG) || []).length; if (n > 1) probs.push(`${p.passage_id} block ${i + 1} negations ${n}: ${para.match(NEG).join(',')}`) })
    for (const t of TABLE) if (new RegExp(`\\b${t}\\b`, 'i').test(p.passage)) probs.push(`${p.passage_id} passage contains attitude word "${t}"`)
    if (p.items.length !== 6) probs.push(`${p.passage_id} items ${p.items.length}`)
    const ks = p.items.map(i => i.kind)
    mixes.push({ id: p.passage_id, mix: [...ks].sort().join(','), all6: new Set(ks).size === 6 })
    p.items.forEach((it, k) => {
      const pl = pp.items[k], s = pl?.shape || {}
      if (!pl || it.qid !== pl.qid) { probs.push(`${it.qid} is not plan item ${pl?.qid}`); return }
      if (it.kind !== pl.kind) probs.push(`${it.qid} kind ${it.kind}, plan ${pl.kind}`)
      if (it.difficulty !== pl.difficulty) probs.push(`${it.qid} difficulty ${it.difficulty}, plan ${pl.difficulty}`)
      if (!Array.isArray(it.choices) || it.choices.length !== 5 || new Set(it.choices).size !== 5) { probs.push(`${it.qid} choices`); return }
      if (!it.choices.includes(it.correct_answer)) { probs.push(`${it.qid} key not in choices`); return }
      const others = it.choices.filter(c => c !== it.correct_answer)
      if (!norm(p.passage).includes(norm(it.why || '@@'))) probs.push(`${it.qid} why not verbatim`)
      const L = it.choices.map(c => c.length); if (Math.max(...L) / Math.min(...L) > 1.5 + 1e-9) probs.push(`${it.qid} length ratio ${(Math.max(...L) / Math.min(...L)).toFixed(2)}`)
      const rank = lengthRank(it.choices, it.correct_answer)
      if (rank !== s.key_length) probs.push(`${it.qid} key length ${rank}, plan ${s.key_length}`)
      if (/\b(choice|option|answer) [A-E]\b|\([A-E]\)/.test(it.explanation)) probs.push(`${it.qid} explanation names a letter`)
      if (!String(it.explanation).includes(`"${it.correct_answer}"`)) probs.push(`${it.qid} explanation does not quote the key`)
      const dr = it.distractor_rationales || []
      if (dr.length !== 4 || new Set(dr.map(d => d.choice)).size !== 4 || dr.some(d => !it.choices.includes(d.choice) || d.choice === it.correct_answer)) probs.push(`${it.qid} rationales`)
      for (const d of dr) if (!String(d.reason).includes(`"${d.choice}"`)) probs.push(`${it.qid} rationale does not quote its choice`)
      if (DANGLE.test(it.prompt)) probs.push(`${it.qid} dangling opener in stem: "${it.prompt.slice(0, 60)}"`)
      if (it.kind === 'attitude') {
        if (!norm(p.passage).includes(norm(it.why2 || '@@'))) probs.push(`${it.qid} why2 not verbatim`)
        const ds = it.choices.map(dirOf)
        if (ds.includes(undefined) || new Set(ds).size !== 5) probs.push(`${it.qid} attitude directions ${ds}`)
        const ki = STRONG.has(it.correct_answer.toLowerCase()) ? 'strong' : 'moderate'
        if (ki !== s.key_intensity) probs.push(`${it.qid} key intensity ${ki}, plan ${s.key_intensity}`)
        const sd = others.filter(c => STRONG.has(c.toLowerCase())).length
        if (sd !== s.strong_distractors) probs.push(`${it.qid} strong distractors ${sd}, plan ${s.strong_distractors}`)
      }
      if (it.kind === 'main-idea') {
        if (!it.choices.includes(it.broadest)) probs.push(`${it.qid} "broadest" tag missing or not a choice`)
        else if (s.breadth === 'key-broadest' && it.broadest !== it.correct_answer) probs.push(`${it.qid} plan key-broadest, tagged broadest is a distractor`)
        else if (s.breadth === 'distractor-broader' && it.broadest === it.correct_answer) probs.push(`${it.qid} plan distractor-broader, tagged broadest is the key`)
        const tp = Array.isArray(it.two_part) ? it.two_part : null
        if (!tp || tp.some(c => !it.choices.includes(c))) probs.push(`${it.qid} "two_part" tag missing or not choices`)
        else {
          if (tp.includes(it.correct_answer) !== (s.key_form === 'two-part')) probs.push(`${it.qid} key_form plan ${s.key_form}, tags say ${tp.includes(it.correct_answer) ? 'two-part' : 'one-part'}`)
          const n = tp.filter(c => c !== it.correct_answer).length
          if (n !== s.two_part_distractors) probs.push(`${it.qid} two-part distractors ${n}, plan ${s.two_part_distractors}`)
        }
      }
      if (it.kind === 'vocabulary-in-context') {
        const dt = it.dtype || {}
        if (Object.keys(dt).length !== 4 || others.some(c => !(c in dt))) probs.push(`${it.qid} "dtype" must tag exactly the four distractors`)
        else {
          const got = Object.values(dt), want = s.distractor_types || []
          if (count(got, 'context') !== count(want, 'context') || count(got, 'sense') !== count(want, 'sense')) probs.push(`${it.qid} distractor types ${JSON.stringify(got)}, plan ${JSON.stringify(want)}`)
        }
        for (const c of it.choices) if (GLOSS.test(c)) probs.push(`${it.qid} usage gloss in option "${c}"`)
      }
      if (it.kind === 'purpose') {
        const ab = Array.isArray(it.abstract) ? it.abstract : null
        if (!ab || ab.some(c => !it.choices.includes(c))) probs.push(`${it.qid} "abstract" tag missing or not choices`)
        else {
          if (ab.includes(it.correct_answer) !== Boolean(s.key_abstract)) probs.push(`${it.qid} key_abstract plan ${s.key_abstract}`)
          const n = ab.filter(c => c !== it.correct_answer).length
          if (n !== s.abstract_distractors) probs.push(`${it.qid} abstract distractors ${n}, plan ${s.abstract_distractors}`)
        }
      }
    })
  })
  const mixCount = {}; for (const m of mixes) mixCount[m.mix] = (mixCount[m.mix] || 0) + 1
  for (const [m, c] of Object.entries(mixCount)) if (c > 1) probs.push(`one_template: ${c} passages share the kind mix ${m}`)
  const all = sets.flatMap(p => p.items).filter(it => Array.isArray(it.choices) && it.choices.includes(it.correct_answer))
  const stem = s => s.toLowerCase().replace(/["“”].*?["“”]/g, 'Q').split(/\s+/).slice(0, 4).join(' ')
  const stems = {}; for (const it of all) stems[stem(it.prompt)] = (stems[stem(it.prompt)] || 0) + 1
  for (const [s, c] of Object.entries(stems)) if (c > 3) probs.push(`stem opening "${s}" used ${c} times (max 3)`)
  const att = all.filter(i => i.kind === 'attitude')
  const aw = {}; for (const it of att) for (const c of it.choices) (aw[c.toLowerCase()] ??= []).push(it.qid)
  for (const [w, q] of Object.entries(aw)) if (q.length > 1) probs.push(`attitude word "${w}" reused in ${q.join(',')}`)
  const keyDirs = att.map(i => dirOf(i.correct_answer))
  if (new Set(keyDirs).size < att.length) probs.push(`attitude keys repeat a direction: ${keyDirs}`)
  for (const live of liveAtt) for (const it of att) { const sh = it.choices.map(c => c.toLowerCase()).filter(x => live.includes(x)); if (sh.length >= 4) probs.push(`${it.qid} attitude set repeats a live/staged set (${sh.join(',')})`) }
  const kg = all.filter(i => !['attitude', 'vocabulary-in-context'].includes(i.kind)).map(i => ({ q: i.qid, g: grams(i.correct_answer) }))
  for (let a = 0; a < kg.length; a++) for (let b = a + 1; b < kg.length; b++) { const sh = [...kg[a].g].find(x => kg[b].g.has(x)); if (sh) probs.push(`keys ${kg[a].q} and ${kg[b].q} share "${sh}"`) }
  const prose = all.filter(i => !['attitude', 'vocabulary-in-context'].includes(i.kind))
  const kA = prose.filter(i => ABS.test(i.correct_answer)).length, dA = prose.reduce((s, i) => s + i.choices.filter(c => c !== i.correct_answer && ABS.test(c)).length, 0)
  const kH = prose.filter(i => HEDGE.test(i.correct_answer)).length, dH = prose.reduce((s, i) => s + i.choices.filter(c => c !== i.correct_answer && HEDGE.test(c)).length, 0)
  const rate = (a, n) => n ? a / n : 0
  if (dA >= 4 && rate(kA, prose.length) < rate(dA, prose.length * 4) / 2) probs.push(`absolutes: keys ${kA}/${prose.length}, distractors ${dA}/${prose.length * 4}`)
  if (kH >= 3 && rate(dH, prose.length * 4) < rate(kH, prose.length) / 2) probs.push(`hedges: keys ${kH}/${prose.length}, distractors ${dH}/${prose.length * 4}`)
  return { probs, all, keyDirs, mixes, absHedge: { kA, dA, kH, dH, n: prose.length } }
}

function selftest() {
  // Break tests: each mutation must raise a problem the clean fixture does not.
  const mk = () => JSON.parse(JSON.stringify(FIX))
  const base = checkDraft(FIX.sets, FIX.plan).probs.filter(p => p.startsWith('T-'))
  const cases = [
    ['key length rank', f => { f.plan.passages[0].items[0].shape.key_length = 'longest' }, /key length/],
    ['attitude intensity', f => { f.plan.passages[0].items[1].shape.key_intensity = 'strong' }, /key intensity/],
    ['vocab dtype', f => { f.plan.passages[0].items[2].shape.distractor_types = ['context', 'context', 'sense', 'sense'] }, /distractor types/],
    ['gloss', f => { const it = f.sets[0].items[2]; const c = it.choices.find(x => x !== it.correct_answer); it.choices[it.choices.indexOf(c)] = c + ', as a cook does'; it.dtype[c + ', as a cook does'] = it.dtype[c]; delete it.dtype[c] }, /gloss/],
    ['broadest', f => { f.plan.passages[0].items[3].shape.breadth = 'key-broadest' }, /key-broadest/],
    ['dangling', f => { f.sets[0].items[1].prompt = "Looking back as an adult, the narrator's attitude toward the dog is" }, /dangling/],
  ]
  let fail = 0
  for (const [name, mut, re] of cases) { const f = mk(); mut(f); const got = checkDraft(f.sets, f.plan).probs.filter(p => p.startsWith('T-')); const hit = got.some(p => re.test(p)) && !base.some(p => re.test(p)); console.log(`${hit ? 'ok  ' : 'FAIL'} ${name}`); if (!hit) fail++ }
  process.exit(fail ? 1 : 0)
}
const FIX = {
  plan: { passages: [{ passage_id: 'T-P01', genre: 'essay', items: [
    { qid: 'T-P01-1', kind: 'detail', difficulty: 'medium', shape: { key_length: 'middle' } },
    { qid: 'T-P01-2', kind: 'attitude', difficulty: 'medium', shape: { key_length: 'shortest', key_intensity: 'moderate', strong_distractors: 1 } },
    { qid: 'T-P01-3', kind: 'vocabulary-in-context', difficulty: 'medium', shape: { key_length: 'middle', distractor_types: ['sense', 'sense', 'sense', 'context'] } },
    { qid: 'T-P01-4', kind: 'main-idea', difficulty: 'easy', shape: { key_length: 'middle', breadth: 'distractor-broader', key_form: 'one-part', two_part_distractors: 0 } },
  ] }] },
  sets: [{ passage_id: 'T-P01', genre: 'essay', passage: 'The dog ran home. '.repeat(4), items: [
    { qid: 'T-P01-1', kind: 'detail', difficulty: 'medium', prompt: 'Where did it run?', choices: ['to the barn', 'home', 'to the river', 'into the hills', 'to the yard'], correct_answer: 'to the river', why: 'The dog ran home.', explanation: '"to the river" x', distractor_rationales: [] },
    { qid: 'T-P01-2', kind: 'attitude', difficulty: 'medium', prompt: 'The author regards the dog as', choices: ['apprehensive', 'fond', 'scornful', 'amused', 'curious'], correct_answer: 'fond', why: 'The dog ran home.', why2: 'The dog ran home.', explanation: '"fond" x', distractor_rationales: [] },
    { qid: 'T-P01-3', kind: 'vocabulary-in-context', difficulty: 'medium', prompt: '"ran" most nearly means', choices: ['operated', 'hurried', 'flowed', 'leaked dye', 'went quickly'], correct_answer: 'hurried', why: 'The dog ran home.', explanation: '"hurried" x', distractor_rationales: [], dtype: { operated: 'sense', flowed: 'sense', 'leaked dye': 'sense', 'went quickly': 'context' } },
    { qid: 'T-P01-4', kind: 'main-idea', difficulty: 'easy', prompt: 'Mainly about?', choices: ['a dog going home', 'a cat going home', 'all animals going home', 'a dog going out', 'a dog at a fair'], correct_answer: 'a dog going home', why: 'The dog ran home.', explanation: '"a dog going home" x', distractor_rationales: [], broadest: 'all animals going home', two_part: [] },
  ] }],
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--selftest')) selftest()
  const N = arg('--draft') || die('--draft N required')
  const work = join(ROOT, `scratchpad/ssat-draft${N}-work`)
  const authored = join(work, `authored/d${N}.json`), planF = join(ROOT, `scratchpad/ssat-v2-work/plans/d${N}.json`)
  if (!existsSync(authored)) die(`no ${authored}`)
  if (!existsSync(planF)) die(`no plan ${planF}`)
  const sets = JSON.parse(readFileSync(authored, 'utf8')), plan = JSON.parse(readFileSync(planF, 'utf8'))
  if (!Array.isArray(sets) || !sets.length) die('authored file holds no sets')
  const liveF = join(ROOT, 'scratchpad/ssat-v2-work/live-att.json')
  const live = existsSync(liveF) ? JSON.parse(readFileSync(liveF, 'utf8')) : die('no live-att.json')
  const { probs, all, keyDirs, mixes, absHedge } = checkDraft(sets, plan, live)
  console.log(`mechanical problems: ${probs.length}`); probs.forEach(x => console.log('  ' + x))
  if (all.length !== 36) { console.log(`items with a valid key: ${all.length} of 36`); process.exit(1) }
  // balanced seeded key slots (letters are reshuffled by the packet deal and per student; this fixes stored order only)
  let s = createHash('sha256').update(`ssat-reading-draft-${N}-2026-10-31`).digest().readUInt32BE(0)
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 }
  const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
  let slots = sh([0, 1, 2, 3, 4].flatMap(i => Array(7 + (i < 1 ? 1 : 0)).fill(i)))
  const bad = () => sets.some((_, q) => { const c = {}; for (const x of slots.slice(q * 6, q * 6 + 6)) c[x] = (c[x] || 0) + 1; return Math.max(...Object.values(c)) > 2 }) || slots.some((x, i) => i >= 2 && slots[i - 1] === x && slots[i - 2] === x)
  let redeals = 0; while (bad()) { slots = sh(slots); if (++redeals > 20000) die('cannot deal slots') }
  let k = 0; const items = []
  for (const p of sets) for (const it of p.items) {
    const d = sh(it.choices.filter(c => c !== it.correct_answer)), slot = slots[k++]
    items.push({ ...it, passage_id: p.passage_id, title: p.title, genre: p.genre, passage: p.passage, choices: [...d.slice(0, slot), it.correct_answer, ...d.slice(slot)], key_slot: 'ABCDE'[slot] })
  }
  const ranks = {}; for (const it of items) { const r = lengthRank(it.choices, it.correct_answer); ranks[r] = (ranks[r] || 0) + 1 }
  console.log('key length ranks', JSON.stringify(ranks), `absolutes keys ${absHedge.kA}/${absHedge.n} distractors ${absHedge.dA}/${absHedge.n * 4}; hedges keys ${absHedge.kH}/${absHedge.n} distractors ${absHedge.dH}/${absHedge.n * 4}`)
  console.log('mixes', mixes.map(m => `${m.id}:${m.mix.replace(/vocabulary-in-context/g, 'vocab')}`).join(' | '))
  console.log(`attitude key directions: ${keyDirs.join(' ')}`)
  const diff = {}; items.forEach(i => diff[i.difficulty] = (diff[i.difficulty] || 0) + 1); console.log('difficulty', JSON.stringify(diff))
  writeFileSync(join(work, 'merged.json'), JSON.stringify({ sets: sets.map(p => ({ passage_id: p.passage_id, title: p.title, genre: p.genre, words: words(p.passage) })), items }, null, 1))
  for (const p of sets) console.log(p.passage_id, String(p.genre).padEnd(8), String(words(p.passage)).padStart(3), p.title)
  process.exit(probs.length ? 1 : 0)
}
