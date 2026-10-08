#!/usr/bin/env node
/**
 * isee-verbal-s19-collisions.mjs — the s18 pre-freeze word check, written down.
 *
 *   node scripts/study-bank/isee-verbal-s19-collisions.mjs --build
 *        re-derive isee-verbal-s19.live-words.json from the LIVE bank (every
 *        non-archived ISEE verbal row) plus every word of s17 and s18
 *   node scripts/study-bank/isee-verbal-s19-collisions.mjs <file.batch.json> [--range a-l] [--against f1,f2,...]
 *        check one author file: shape, forbidden words (live/s17/s18, inflections
 *        included), optional initial-letter range for EVERY word the file uses,
 *        and collisions against other s19 files already on disk
 *   node scripts/study-bank/isee-verbal-s19-collisions.mjs --selftest
 *
 * s18 ran this check as an inline script and it did its job (29 problems found
 * and fixed before freeze, 0 left), but its one lesson is that EXACT matching is
 * not enough: C-14's key "reverberations" was the plural of an s17 key, and
 * D-01's "abstained" was the live headword ABSTAIN. Both were caught only by a
 * stem/prefix match. So two words collide here when they are equal, when their
 * light stems are equal, or when they share a prefix of >= 5 letters covering
 * >= 80% of the shorter word (with a trailing e/y dropped). That rule is meant
 * to over-fire: a flagged pair that is really two words is cheap to rename,
 * a missed inflection reaches a student as the same question twice.
 *
 * Exits 1 on any problem, 2 if it cannot read its input. It never prints
 * "clean" over zero items.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const DIR = 'scripts/study-bank'
// --words <file> picks another list (s20: isee-verbal-s20.live-words.json); default is s19's.
const _wi = process.argv.indexOf('--words')
const WORDS = _wi >= 0 ? process.argv[_wi + 1] : `${DIR}/isee-verbal-s19.live-words.json`
const STOP = new Set(['a', 'an', 'the', 'of', 'to', 'and', 'or', 'by', 'in', 'on', 'for', 'with', 'at', 'as', 'is', 'be', 'it', 'its', 'not', 'no', 'one', 'out', 'up', 'from', 'into', 'that', 'this'])

export const tokens = s => String(s ?? '').toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(w => w.length >= 3 && !STOP.has(w))
const SUFFIX_RAW = ['ations', 'ation', 'ments', 'ment', 'nesses', 'ness', 'ingly', 'ings', 'ing', 'edly', 'ed', 'ies', 'ied', 'iest', 'ier', 'es', 's', 'ly', 'ers', 'er', 'est', 'ions', 'ion', 'ity', 'ities', 'ive', 'ively', 'ous', 'ously', 'al', 'ally', 'ance', 'ence', 'ant', 'ent', 'ful', 'fully', 'less']
const SUFFIX = [...SUFFIX_RAW].sort((a, b) => b.length - a.length)   // longest first
export function stem(w) {
  let s = w.toLowerCase().replace(/(ies|ied|iest|ier)$/, 'y')
  for (let pass = 0; pass < 2; pass++) {
    for (const suf of SUFFIX) {
      if (s.endsWith(suf) && s.length - suf.length >= 4) { s = s.slice(0, -suf.length); break }
    }
  }
  s = s.replace(/(.)\1$/, '$1')          // stopped -> stopp -> stop
  return s.replace(/[ey]$/, '')           // abate/abated, carry/carried
}
export function collide(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase()
  if (a === b) return 'same word'
  if (stem(a) === stem(b)) return `same stem (${stem(a)})`
  const x = a.replace(/[ey]$/, ''), y = b.replace(/[ey]$/, '')
  let p = 0; while (p < x.length && p < y.length && x[p] === y[p]) p++
  const short = Math.min(x.length, y.length)
  if (p >= 5 && p >= 0.8 * short) return `shared prefix '${x.slice(0, p)}'`
  return null
}

function itemWords(it) {
  const out = []
  const kind = String(it.kind ?? '')
  if (/synonym/i.test(kind) || /^\[Synonym\]/.test(it.prompt ?? '')) {
    const hw = String(it.prompt ?? '').replace(/^\[Synonym\]\s*/, '').trim()
    out.push({ role: 'headword', word: hw.toLowerCase() })
  }
  for (const c of it.choices ?? []) out.push({ role: c === it.correct_answer ? 'key' : 'option', word: String(c).toLowerCase() })
  return out
}

function shape(it) {
  const p = []
  const ch = it.choices ?? []
  if (!Array.isArray(ch) || ch.length !== 4) p.push(`${ch.length} choices, need 4`)
  if (new Set(ch.map(c => String(c).toLowerCase())).size !== ch.length) p.push('choices not distinct')
  if (!ch.includes(it.correct_answer)) p.push('correct_answer not among choices')
  for (const c of ch) if (!/^[a-z]+$/.test(String(c))) p.push(`option '${c}' is not one lowercase word`)
  const pr = String(it.prompt ?? '')
  if (it.kind === 'synonym') {
    if (!/^\[Synonym\] [A-Z]+$/.test(pr)) p.push(`synonym prompt '${pr}' is not '[Synonym] WORD'`)
  } else if (it.kind === 'sentence completion') {
    if (!pr.startsWith('[Sentence Completion] ')) p.push('SC prompt lacks the [Sentence Completion] tag')
    const blanks = pr.match(/-{3,}/g) ?? []
    if (blanks.length !== 1 || blanks[0] !== '-------') p.push(`SC needs exactly one 7-hyphen blank (found ${blanks.map(b => b.length).join(',') || 'none'})`)
    if (/\bis to\b/i.test(pr)) p.push("SC contains 'is to' (verbalKind would read an analogy)")
  } else p.push(`kind '${it.kind}' is neither 'synonym' nor 'sentence completion'`)
  if (!it.id || !it.explanation) p.push('missing id or explanation')
  return p
}

function loadForbidden() {
  if (!existsSync(WORDS)) { console.error(`REFUSING: ${WORDS} missing — run --build first`); process.exit(2) }
  const w = JSON.parse(readFileSync(WORDS, 'utf8'))
  const list = w.words
  if (!Array.isArray(list) || list.length < 500) { console.error(`REFUSING: ${WORDS} holds ${list?.length ?? 0} words — expected the live + s17 + s18 list`); process.exit(2) }
  return list
}

function check(path, range, againstPaths) {
  if (!existsSync(path)) { console.error(`REFUSING: ${path} does not exist`); process.exit(2) }
  const batch = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${path} holds no items`); process.exit(2) }
  const forbidden = loadForbidden()
  const problems = []
  const mine = []
  for (const it of batch) {
    for (const s of shape(it)) problems.push(`${it.id}: SHAPE ${s}`)
    for (const w of itemWords(it)) mine.push({ ...w, id: it.id })
  }
  if (range) {
    const [lo, hi] = range.toLowerCase().split('-')
    for (const w of mine) if (w.word[0] < lo || w.word[0] > hi) problems.push(`${w.id}: RANGE ${w.role} '${w.word}' is outside ${range}`)
  }
  for (const w of mine) for (const f of forbidden) {
    const why = collide(w.word, f)
    if (why) { problems.push(`${w.id}: FORBIDDEN ${w.role} '${w.word}' vs forbidden '${f}' (${why})`); break }
  }
  // within the file: no word (or inflection) used twice anywhere
  for (let i = 0; i < mine.length; i++) for (let j = i + 1; j < mine.length; j++) {
    const why = collide(mine[i].word, mine[j].word)
    if (why) problems.push(`${mine[i].id}/${mine[j].id}: WITHIN-FILE '${mine[i].word}' vs '${mine[j].word}' (${why})`)
  }
  for (const ap of againstPaths) {
    if (!existsSync(ap)) { console.error(`REFUSING: --against ${ap} does not exist`); process.exit(2) }
    const other = JSON.parse(readFileSync(ap, 'utf8'))
    if (!Array.isArray(other) || !other.length) { console.error(`REFUSING: --against ${ap} holds no items`); process.exit(2) }
    const theirs = other.flatMap(it => itemWords(it).map(w => ({ ...w, id: it.id })))
    for (const a of mine) for (const b of theirs) {
      const why = collide(a.word, b.word)
      if (why) problems.push(`${a.id} x ${b.id}: CROSS-AUTHOR '${a.word}' vs '${b.word}' (${why})`)
    }
  }
  const nWords = mine.length
  console.log(`${path}: ${batch.length} items, ${nWords} words checked against ${forbidden.length} forbidden words (${WORDS.replace(/^.*\//, '')})${range ? `, range ${range}` : ''}${againstPaths.length ? `, against ${againstPaths.length} other s19 file(s)` : ''}`)
  if (problems.length) { for (const p of problems) console.log(`  ${p}`); console.log(`  ${problems.length} problem(s)`); process.exit(1) }
  console.log('  0 problems')
}

async function build() {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,item').eq('family', 'isee').eq('section', 'verbal')
      .eq('archived', false).order('id').range(f, f + 999)
    if (error) throw new Error(error.message)
    rows.push(...data); if (data.length < 1000) break
  }
  if (!rows.length) { console.error('REFUSING: read 0 live rows'); process.exit(2) }
  const set = new Set()
  for (const r of rows) {
    const p = String(r.item?.prompt ?? '')
    const m = p.match(/^\[Synonym\]\s*([A-Za-z -]+)$/) ?? p.match(/^([A-Z][A-Z -]{2,})$/)
    if (m) for (const t of tokens(m[1])) set.add(t)
    for (const c of r.item?.choices ?? []) for (const t of tokens(c)) set.add(t)
  }
  const nLive = set.size
  // --prior a,b,c replaces the default s17/s18 tag list (s20 adds the s19 files);
  // --out <file> writes somewhere other than the s19 list.
  const pi = process.argv.indexOf('--prior')
  const prior = pi >= 0 ? process.argv[pi + 1].split(',').filter(Boolean)
    : ['isee-verbal-s17-syn', 'isee-verbal-s17-sc', 'isee-verbal-s18-syn', 'isee-verbal-s18-sc', 'isee-verbal-s18a', 'isee-verbal-s18b', 'isee-verbal-s18c', 'isee-verbal-s18d', 'isee-verbal-s18e']
  const oi = process.argv.indexOf('--out')
  const OUT = oi >= 0 ? process.argv[oi + 1] : WORDS
  let nPrior = 0
  for (const f of prior) {
    const b = JSON.parse(readFileSync(`${DIR}/${f}.batch.json`, 'utf8'))
    nPrior += b.length
    for (const it of b) for (const w of itemWords(it)) for (const t of tokens(w.word)) set.add(t)
  }
  const words = [...set].sort()
  writeFileSync(OUT, JSON.stringify({
    note: `Every headword and option word of the ${rows.length} non-archived live ISEE verbal rows (read ${new Date().toISOString().slice(0, 10)}), plus every word of ${prior.join(', ')}. No new headword, key or option word may equal one of these or be an inflection of one (isee-verbal-s19-collisions.mjs).`,
    live_rows: rows.length, live_words: nLive, prior_items: nPrior, words,
  }, null, 1) + '\n')
  console.log(`wrote ${OUT}: ${words.length} words (${nLive} from ${rows.length} live rows; +${words.length - nLive} from ${nPrior} prior items in ${prior.length} files)`)
}

function selftest() {
  const cases = [
    ['reverberations', 'reverberation', true], ['abstained', 'abstain', true], ['abated', 'abate', true],
    ['carried', 'carry', true], ['stopped', 'stop', true], ['tenacious', 'tenacious', true],
    ['commendable', 'commend', true], ['precarious', 'precaution', false], ['intrepid', 'intricate', false],
    ['concise', 'concession', false], ['bland', 'blend', false],
  ]
  let bad = 0
  for (const [a, b, want] of cases) { const got = !!collide(a, b); if (got !== want) { bad++; console.log(`FAIL ${a} / ${b}: got ${got}, want ${want}`) } }
  console.log(bad ? `${bad} self-test failure(s)` : `self-test clean (${cases.length} cases)`)
  process.exit(bad ? 1 : 0)
}

const args = process.argv.slice(2)
if (args.includes('--selftest')) selftest()
else if (args.includes('--build')) await build()
else {
  const path = args.find(a => !a.startsWith('--') && !['--range', '--against', '--words'].includes(args[args.indexOf(a) - 1]))
  if (!path) { console.error('usage: isee-verbal-s19-collisions.mjs <file.batch.json> [--range a-l] [--against f1,f2] | --build | --selftest'); process.exit(2) }
  const ri = args.indexOf('--range'); const ai = args.indexOf('--against')
  check(path, ri >= 0 ? args[ri + 1] : null, ai >= 0 ? args[ai + 1].split(',').filter(Boolean) : [])
}
