#!/usr/bin/env node
/**
 * lu3-check.mjs — structural pre-flight for MAP Language v3 (MAP-LANGUAGE-V3-BRIEF.md).
 * Pre-flight only: the agent-review gate decides (MAP-LANGUAGE-V3.prereg.md).
 *
 *   node lu3-check.mjs [items/*.json ...]      # default: every file in ./items
 *   node lu3-check.mjs --selftest              # break-tests each area-level guard
 *
 * Exits non-zero on any failure, on an empty population, or if the spell oracle
 * or the exclusion sources cannot be read. Prints every denominator.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../../../..')
const die = m => { console.error(`lu3-check: ${m}`); process.exit(2) }

export const AREA = {
  G: 'Language: Understand, Edit for Grammar, Usage',
  W: 'Writing: Write, Revise Texts for Purpose and Audience',
}
export const STRAND = {
  PoS: ['G', 'Parts of Speech'],
  PCAS: ['G', 'Phrases, Clauses, Agreement, Sentences'],
  Org: ['W', 'Plan, Organize; Create Cohesion, Use Transitions'],
  Style: ['W', 'Establish and Maintain Style; Use Precise Language'],
}
const FORMATS = {
  G: ['blank', 'revise', 'find-error', 'choose-correct', 'identify', 'combine-grammar'],
  W: ['transition', 'placement', 'irrelevant', 'intro-conclusion', 'precise-word', 'combine', 'audience-purpose', 'concise-revision'],
}
const ORG = ['transition', 'placement', 'irrelevant', 'intro-conclusion']
const POSITIONAL = ['placement', 'irrelevant']
const SLANG = /!|\b(super|totally|really|very|awesome|cool|kinda|gonna|wanna|stuff|tons|lots)\b/i
const LETTER = /\b([Cc]hoice|[Oo]ption|[Aa]nswer)\s+[A-D]\b|\([A-D]\)/

export function itemErrors(it) {
  const e = []
  const s = STRAND[it.strand]
  if (!s) return [`unknown strand ${it.strand}`]
  const area = s[0]
  if (![5, 6, 7, 8].includes(it.grade)) e.push(`grade ${it.grade}`)
  if (!FORMATS[area].includes(it.format)) e.push(`format ${it.format} not allowed in ${area === 'G' ? 'Grammar' : 'Writing'}`)
  if (area === 'W' && ORG.includes(it.format) !== (it.strand === 'Org')) e.push(`format ${it.format} under the wrong strand`)
  const ccssRe = area === 'G' ? new RegExp(`^L\\.${it.grade}\\.(1|3)[a-e]?$`) : new RegExp(`^(W\\.${it.grade}\\.[1-5][a-f]?|L\\.${it.grade}\\.3[ab]?)$`)
  if (!ccssRe.test(it.ccss || '')) e.push(`ccss ${it.ccss} is not a grade-${it.grade} ${area === 'G' ? 'L.1/L.3' : 'W or L.3'} code`)
  if (!it.prompt) e.push('no prompt')
  if (!Array.isArray(it.choices) || it.choices.length !== 4) e.push('needs 4 choices')
  else {
    if (new Set(it.choices.map(c => c.trim().toLowerCase())).size !== 4) e.push('choices not distinct')
    if (it.choices.some(c => !c || !c.trim())) e.push('empty choice')
  }
  if (!Number.isInteger(it.key) || it.key < 0 || it.key > 3) e.push('key must be an index 0-3')
  if (!Array.isArray(it.why_wrong) || it.why_wrong.length !== 3 || it.why_wrong.some(w => !w || w.length < 12)) e.push('why_wrong needs 3 real entries')
  if (!it.explanation || it.explanation.length < 40) e.push('explanation missing or too short')
  if (LETTER.test(it.explanation || '')) e.push('explanation names a letter')
  if (it.format === 'grid') e.push('grid format is banned in v3')
  if (it.format === 'transition') {
    if (!it.relation) e.push('transition needs relation')
    if (!it.option_class) e.push('transition needs option_class')
  }
  if (POSITIONAL.includes(it.format)) {
    const n = (it.passage || '').match(/\((\d)\)/g)?.length || 0
    if (n < 4 || n > 7) e.push(`paragraph has ${n} numbered sentences (4-7)`)
    const pat = it.format === 'placement' ? /^(Before|After) sentence \d$/ : /^Sentence \d$/
    if (it.choices?.some(c => !pat.test(c))) e.push(`${it.format} options must be positions`)
  }
  if (['transition', 'intro-conclusion', 'precise-word', 'audience-purpose', 'concise-revision'].includes(it.format) && !it.passage) e.push(`${it.format} needs a passage`)
  if (it.format === 'audience-purpose' && it.choices?.some(c => SLANG.test(c))) e.push('audience-purpose option carries slang, "!" or an intensifier')
  if (/____/.test(it.passage || '') !== ['blank', 'transition'].includes(it.format)) e.push('a blank appears exactly in blank/transition items')
  if (['revise', 'precise-word'].includes(it.format) && !/\[[^\]]+\]/.test(it.passage || '')) e.push(`${it.format} needs a bracketed part`)
  return e
}

const lengthRank = it => {
  const L = it.choices.map(c => c.length)
  const k = L[it.key]
  return { longest: L.filter(x => x >= k).length === 1, shortest: L.filter(x => x <= k).length === 1, rank: 1 + L.filter(x => x > k).length }
}
const lastSentence = it => Math.max(...[...(it.passage || '').matchAll(/\((\d)\)/g)].map(m => +m[1]))

/** Area-level guards. Returns { fails: [], report: [] }. */
export function areaChecks(items, area) {
  const fails = []
  const report = []
  const n = items.length
  if (!n) return { fails: [`${area}: zero items`], report }
  const byFmt = {}
  for (const it of items) byFmt[it.format] = (byFmt[it.format] || 0) + 1
  report.push(`formats (n=${n}): ${Object.entries(byFmt).map(([f, c]) => `${f} ${c}`).join(', ')}`)
  const minShapes = area === 'G' ? 5 : 8
  const cap = area === 'G' ? 0.30 : 0.20
  if (Object.keys(byFmt).length < minShapes) fails.push(`${Object.keys(byFmt).length} shapes < ${minShapes}`)
  for (const [f, c] of Object.entries(byFmt)) if (c / n > cap + 1e-9) fails.push(`format ${f} is ${c}/${n} > ${cap * 100}%`)
  const byStrand = {}
  for (const it of items) { byStrand[it.strand] ??= new Set(); byStrand[it.strand].add(it.format) }
  for (const [s, f] of Object.entries(byStrand)) if (f.size < 3) fails.push(`strand ${s} uses only ${f.size} shapes`)
  // option-set reuse
  const seen = new Map()
  for (const it of items) {
    if (POSITIONAL.includes(it.format)) continue
    const sig = [...it.choices].map(c => c.trim().toLowerCase()).sort().join('|')
    if (seen.has(sig)) fails.push(`${it.id} repeats the option set of ${seen.get(sig)}`)
    else seen.set(sig, it.id)
  }
  // key length
  const text = items.filter(it => !POSITIONAL.includes(it.format) && it.format !== 'identify')
  const lr = text.map(lengthRank)
  const ul = lr.filter(r => r.longest).length
  const us = lr.filter(r => r.shortest).length
  const ranks = [1, 2, 3, 4].map(r => lr.filter(x => x.rank === r).length)
  report.push(`key length over ${text.length} text-option items: uniquely longest ${ul} (${pct(ul, text.length)}), uniquely shortest ${us} (${pct(us, text.length)}), rank 1-4 ${ranks.join('/')}`)
  if (text.length < 10) fails.push(`only ${text.length} text-option items: key-length check cannot run`)
  else {
    if (ul / text.length > 0.30) fails.push(`key uniquely longest ${ul}/${text.length} > 30%`)
    if (us / text.length > 0.30) fails.push(`key uniquely shortest ${us}/${text.length} > 30%`)
  }
  // positional
  for (const f of POSITIONAL) {
    const its = items.filter(it => it.format === f)
    if (!its.length) continue
    const k = {}
    for (const it of its) { const c = it.choices[it.key]; k[c] = (k[c] || 0) + 1 }
    report.push(`${f} keys (n=${its.length}): ${Object.entries(k).map(([a, b]) => `${a} ${b}`).join(', ')}`)
    for (const [c, m] of Object.entries(k)) if (its.length >= 5 && m / its.length > 0.40) fails.push(`${f}: "${c}" keys ${m}/${its.length} > 40%`)
    if (f === 'irrelevant') {
      const last = its.filter(it => it.choices[it.key] === `Sentence ${lastSentence(it)}`).length
      report.push(`irrelevant key is the final sentence in ${last}/${its.length}`)
      if (last > 2) fails.push(`irrelevant key is the final sentence in ${last} > 2`)
    }
  }
  // transitions
  const tr = items.filter(it => it.format === 'transition')
  if (tr.length) {
    const rel = {}
    for (const it of tr) rel[it.relation] = (rel[it.relation] || 0) + 1
    report.push(`transition key relations (n=${tr.length}): ${Object.entries(rel).map(([a, b]) => `${a} ${b}`).join(', ')}`)
    for (const [r, c] of Object.entries(rel)) if (c > 3) fails.push(`transition relation ${r} keys ${c} > 3`)
    const dist = {}
    const keyed = new Set(tr.map(it => it.choices[it.key].toLowerCase()))
    for (const it of tr) it.choices.forEach((c, i) => { if (i !== it.key) { const w = c.toLowerCase(); dist[w] = (dist[w] || 0) + 1 } })
    const over = Object.entries(dist).filter(([, c]) => c > 2)
    if (over.length) fails.push(`transition distractors in > 2 items: ${over.map(([w, c]) => `${w} ${c}`).join(', ')}`)
    const never = Object.keys(dist).filter(w => !keyed.has(w) && dist[w] > 1)
    report.push(`transition distractors used twice and never keyed: ${never.length ? never.join(', ') : 'none'}`)
  }
  // concise: a wrong option shorter than the key in >= 3 items
  const cr = items.filter(it => it.format === 'concise-revision')
  if (cr.length) {
    const shorter = cr.filter(it => it.choices.some((c, i) => i !== it.key && c.length < it.choices[it.key].length)).length
    report.push(`concise-revision with a shorter wrong option: ${shorter}/${cr.length}`)
    if (cr.length >= 3 && shorter < 3) fails.push(`concise-revision: only ${shorter} items have a wrong option shorter than the key`)
  }
  return { fails, report }
}
const pct = (a, b) => b ? `${(100 * a / b).toFixed(1)}%` : 'n/a'

// proper nouns the lowercase oracle rejects: brief's first names, days, months
// plus the invented place names used in v3 paragraphs
const PROPER = new Set('millbrook riverton westfield brookfield ashford lakeview hillside riverside elm ridge maya leo sam ana ben mia omar lily jack nora priya diego hana theo ivy max zoe eli ruby owen monday tuesday wednesday thursday friday saturday sunday mondays tuesdays wednesdays thursdays fridays saturdays sundays january february march april may june july august september october november december'.split(' '))
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function exclusions() {
  const ex = readFileSync(join(ROOT, 'scripts/study-bank/map-v2-work/language/EXCLUSIONS-map-language.txt'), 'utf8')
  const keys = new Set(ex.split('\n').filter(l => /^\s*KEY:/.test(l)).map(l => norm(l.replace(/^\s*KEY:/, ''))).filter(k => k.split(' ').length >= 4))
  if (keys.size < 300) die(`exclusions: only ${keys.size} KEY lines read`)
  const bank = JSON.parse(readFileSync(join(HERE, 'bank-language-snapshot.json'), 'utf8'))
  if (bank.length < 200) die(`bank snapshot: only ${bank.length} rows`)
  const texts = new Set()
  for (const r of bank) {
    for (const c of r.choices || []) if (norm(c).split(' ').length >= 4) texts.add(norm(c))
    if (r.passage && norm(r.passage).split(' ').length >= 6) texts.add(norm(r.passage))
  }
  return { keys, texts, nKeys: keys.size, nBank: bank.length }
}

function spell(words) {
  const bad = []
  for (let i = 0; i < words.length; i += 150) {
    const r = spawnSync('node', [join(ROOT, 'scripts/study-bank/map-lu-v6.mjs'), 'spell', ...words.slice(i, i + 150)], { cwd: ROOT, encoding: 'utf8' })
    if (r.status !== 0 && !r.stdout) die('spell oracle failed: ' + (r.stderr || '').slice(0, 300))
    const lines = r.stdout.split('\n').filter(l => /NSSpellChecker/.test(l))
    if (lines.length !== words.slice(i, i + 150).length) die(`spell oracle returned ${lines.length} lines for ${words.slice(i, i + 150).length} words`)
    for (const l of lines) if (/NSSpellChecker rejects/.test(l)) bad.push(l.split(/\s+/)[0])
  }
  return bad
}

function selftest() {
  let ok = true
  const t = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false }
  const mk = (i, over = {}) => ({ id: `T${i}`, strand: 'PoS', grade: 5, format: ['blank', 'revise', 'find-error', 'choose-correct', 'identify'][i % 5], ccss: 'L.5.1b', prompt: 'p', passage: null, choices: [`a${i}xx`, `bb${i}xxx`, `ccc${i}xxxx`, `dddd${i}xxxxx`], key: i % 4, why_wrong: ['xxxxxxxxxxxxx', 'xxxxxxxxxxxxx', 'xxxxxxxxxxxxx'], explanation: 'x'.repeat(50), ...over })
  const base = Array.from({ length: 20 }, (_, i) => mk(i))
  t(areaChecks(base, 'G').fails.length === 0, `balanced 20-item grammar set passes (${areaChecks(base, 'G').fails.join('; ')})`)
  const longKey = base.map((it, i) => i < 8 ? { ...it, key: 3 } : it)
  t(areaChecks(longKey, 'G').fails.some(f => /uniquely longest/.test(f)), 'key uniquely longest on 10/16 text items fails')
  const oneShape = base.map(it => ({ ...it, format: 'blank' }))
  t(areaChecks(oneShape, 'G').fails.some(f => /shapes/.test(f)), 'one shape fails')
  const dup = base.map((it, i) => i === 1 ? { ...it, choices: [...base[0].choices] } : it)
  t(areaChecks(dup, 'G').fails.some(f => /repeats the option set/.test(f)), 'repeated option set fails')
  const irr = Array.from({ length: 10 }, (_, i) => ({ ...mk(i), strand: 'Org', format: 'irrelevant', passage: '(1) a. (2) b. (3) c. (4) d. (5) e.', choices: ['Sentence 2', 'Sentence 3', 'Sentence 4', 'Sentence 5'], key: i < 3 ? 3 : i % 3 }))
  t(areaChecks(irr, 'W').fails.some(f => /final sentence in 3/.test(f)), 'irrelevant final-sentence key 3 times fails')
  const tr = Array.from({ length: 6 }, (_, i) => ({ ...mk(i), strand: 'Org', format: 'transition', relation: i < 4 ? 'result' : 'contrast', option_class: 'adverb', passage: '(1) x ____ y', choices: ['Therefore,', `W${i},`, `X${i},`, `Y${i},`], key: 0 }))
  t(areaChecks(tr, 'W').fails.some(f => /relation result keys 4/.test(f)), 'a relation keyed 4 times fails')
  const tr2 = tr.map((it, i) => ({ ...it, relation: `r${i}`, choices: ['Instead,', `W${i},`, `X${i},`, `K${i},`], key: 3 }))
  t(areaChecks(tr2, 'W').fails.some(f => /instead, 6/.test(f)), 'a distractor in 6 items fails')
  t(itemErrors({ ...mk(0), format: 'grid' }).some(e => /grid/.test(e)), 'grid item fails')
  t(itemErrors({ ...mk(0), strand: 'Style', format: 'audience-purpose', ccss: 'W.5.4', passage: 'x', choices: ['It is great!', 'b b', 'c c', 'd d'] }).some(e => /slang/.test(e)), 'audience-purpose "!" fails')
  t(itemErrors({ ...mk(0), explanation: 'Option B is wrong because '.padEnd(60, 'x') }).some(e => /letter/.test(e)), 'explanation naming a letter fails')
  t(itemErrors({ ...mk(0), ccss: 'L.6.1a' }).some(e => /ccss/.test(e)), 'another grade\'s ccss fails')
  process.exit(ok ? 0 : 1)
}

function main() {
  if (process.argv.includes('--selftest')) return selftest()
  let files = process.argv.slice(2).filter(a => !a.startsWith('--'))
  if (!files.length) files = readdirSync(join(HERE, 'items')).filter(f => f.endsWith('.json')).map(f => join(HERE, 'items', f))
  const items = files.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
  if (!items.length) die('zero items read')
  let bad = 0
  const ids = new Set()
  const ex = exclusions()
  const words = new Set()
  for (const it of items) {
    const e = itemErrors(it)
    if (ids.has(it.id)) e.push('duplicate id')
    ids.add(it.id)
    for (const c of it.choices || []) { if (norm(c).split(' ').length >= 5 && (ex.keys.has(norm(c)) || ex.texts.has(norm(c)))) e.push(`option reuses an earlier MAP Language key/option: "${c.slice(0, 50)}"`) }
    if (it.passage && ex.texts.has(norm(it.passage))) e.push('passage reuses an earlier MAP Language passage')
    for (const t of [it.passage, ...(it.choices || [])]) for (const w of (t || '').replace(/\[|\]|____/g, ' ').match(/[A-Za-z][A-Za-z']*/g) || []) words.add(w.replace(/'s$|'$/, ''))
    if (e.length) { bad++; console.log(`${it.id}: ${e.join('; ')}`) }
  }
  const misspelt = spell([...words].filter(w => w.length > 1 && !PROPER.has(w.toLowerCase())))
  if (misspelt.length) { bad++; console.log(`spellchecker rejects (${misspelt.length} of ${words.size} words): ${misspelt.join(', ')}`) }
  console.log(`items ${items.length} from ${files.length} files; item-level failures ${bad}; exclusions read: ${ex.nKeys} KEY lines + ${ex.nBank} bank rows; words spell-checked ${words.size}`)
  let areaFail = 0
  for (const a of ['G', 'W']) {
    const its = items.filter(it => STRAND[it.strand]?.[0] === a)
    const byG = [5, 6, 7, 8].map(g => its.filter(it => it.grade === g).length)
    const bySt = Object.keys(STRAND).filter(s => STRAND[s][0] === a).map(s => `${s} ${its.filter(it => it.strand === s).length}`)
    console.log(`\n${AREA[a]}: n=${its.length}; grades 5-8 ${byG.join('/')}; ${bySt.join(', ')}`)
    if (!its.length) { console.log('  (no items in this area)'); continue }
    const { fails, report } = areaChecks(its, a)
    for (const r of report) console.log('  ' + r)
    for (const f of fails) console.log('  FAIL ' + f)
    areaFail += fails.length
  }
  if (bad || areaFail) { console.log(`\nFAILED: ${bad} item-level, ${areaFail} area-level`); process.exit(1) }
  console.log('\nall checks pass')
}

main()
