#!/usr/bin/env node
/**
 * isee-verbal-s18-rarity.mjs — with the stem withheld, is the KEY the rarest word?
 *
 *   node scripts/study-bank/isee-verbal-s18-rarity.mjs render <tag> --cand a.json,b.json [--anchor s17.json] [--live N]
 *   node scripts/study-bank/isee-verbal-s18-rarity.mjs score  <tag> [rater files...]   (default <tag>.rater-*.json)
 *
 * Pre-registered in isee-verbal-s18.prereg.md. s17's 40 SC were held because three
 * options-only samples all said "pick the most specific, test-worthy word". This
 * measures that property directly: raters see ONLY the four words of each set
 * (stem, headword, ids withheld; keys dealt flat; arms interleaved) and name the
 * rarest word and the most "test-like" word. K = key-rarest rate pooled over raters.
 *
 * No word-frequency corpus is installed, so rarity is a rater judgement, not a count.
 * That is why the ANCHOR arm exists: the frozen s17 SC carry the tell, so a valid
 * instrument must read them high (prereg: K or T >= 40%). If it does not, this
 * script prints NO MEASUREMENT and exits 3 — it never returns a pass it cannot read.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const [mode, tag, ...rest] = process.argv.slice(2)
const DIR = 'scripts/study-bank'
if (!mode || !tag) { console.error('usage: render|score <tag> ...'); process.exit(2) }
const opt = n => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : null }
const SLOT = ['A', 'B', 'C', 'D']

if (mode === 'render') {
  const rand = rng(20261008)
  const shuffle = a => shuffleWith(a.slice(), rand)
  const sets = []
  const kindOf = it => /\[Synonym\]/i.test(it.prompt ?? '') ? 'syn' : 'sc'
  for (const f of String(opt('--cand') ?? '').split(',').filter(Boolean)) {
    if (!existsSync(f)) { console.error(`REFUSING: ${f} missing`); process.exit(2) }
    const b = JSON.parse(readFileSync(f, 'utf8'))
    if (!Array.isArray(b) || !b.length) { console.error(`REFUSING: ${f} holds no items`); process.exit(2) }
    for (const it of b) sets.push({ arm: `cand-${kindOf(it)}`, id: it.id, choices: it.choices, key: it.correct_answer })
  }
  const anchor = opt('--anchor')
  if (anchor) for (const it of JSON.parse(readFileSync(anchor, 'utf8'))) sets.push({ arm: 'anchor', id: it.id, choices: it.choices, key: it.correct_answer })
  const nLive = Number(opt('--live') ?? 0)
  if (nLive) {
    const { createClient } = await import('@supabase/supabase-js')
    const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
    const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const rows = []
    for (let f = 0; ; f += 1000) {
      const { data, error } = await db.from('study_item_bank').select('id,cohort,difficulty,subskill,item')
        .eq('family', 'isee').eq('section', 'verbal').eq('verified', true).eq('archived', false).order('id').range(f, f + 999)
      if (error) throw new Error(error.message)
      rows.push(...data); if (data.length < 1000) break
    }
    const pool = rows.filter(r => String(r.subskill ?? '').toLowerCase() === 'sentence_completion'
      && ['medium', 'hard'].includes(String(r.difficulty)) && r.cohort !== 'isee-verbal-s4'
      && Array.isArray(r.item?.choices) && r.item.choices.length === 4
      && r.item.choices.includes(r.item.correct_answer) && !String(r.item.correct_answer).includes('..'))
    console.log(`  live pool: ${rows.length} isee verbal -> ${pool.length} single-blank medium/hard SC (s4 excluded)`)
    if (pool.length < nLive) { console.error(`REFUSING: ${nLive} asked, ${pool.length} eligible`); process.exit(2) }
    for (const r of shuffle(pool).slice(0, nLive)) sets.push({ arm: 'live-sc1', id: r.id, choices: r.item.choices, key: r.item.correct_answer })
  }
  for (const s of sets) {
    if (s.choices.length !== 4 || !s.choices.includes(s.key)) { console.error(`REFUSING: ${s.id} not a 4-choice item with its key`); process.exit(2) }
  }
  const order = shuffle(sets)
  const blind = {}, key = {}
  order.forEach((s, i) => {
    const want = SLOT[i % 4]
    const others = shuffle(s.choices.filter(c => c !== s.key))
    let k = 0
    const out = SLOT.map(sl => (sl === want ? s.key : others[k++]))
    const bid = `R${String(i + 1).padStart(3, '0')}`
    blind[bid] = Object.fromEntries(SLOT.map((sl, j) => [sl, out[j]]))
    key[bid] = { letter: want, arm: s.arm, id: s.id }
  })
  writeFileSync(`${DIR}/${tag}.blind.json`, JSON.stringify(blind, null, 1) + '\n')
  writeFileSync(`${DIR}/${tag}.key.json`, JSON.stringify(key, null, 1) + '\n')
  const arms = {}; for (const k of Object.values(key)) arms[k.arm] = (arms[k.arm] ?? 0) + 1
  console.log(`${tag}: ${order.length} sets ${JSON.stringify(arms)}; blind sha ${createHash('sha256').update(readFileSync(`${DIR}/${tag}.blind.json`)).digest('hex').slice(0, 16)}`)
  process.exit(0)
}

if (mode === 'score') {
  const key = JSON.parse(readFileSync(`${DIR}/${tag}.key.json`, 'utf8'))
  let files = rest.filter(a => !a.startsWith('--'))
  if (!files.length) files = readdirSync(DIR).filter(f => f.startsWith(`${tag}.rater-`) && f.endsWith('.json')).map(f => `${DIR}/${f}`)
  if (!files.length) { console.error('REFUSING: no rater files'); process.exit(2) }
  const raters = files.map(f => JSON.parse(readFileSync(f, 'utf8')))
  const ids = Object.keys(key)
  for (const [i, r] of raters.entries()) {
    const ok = ids.filter(id => SLOT.includes(r[id]?.rarest) && SLOT.includes(r[id]?.testlike)).length
    console.log(`  rater ${files[i].replace(/^.*\//, '')}: readable ${ok} of ${ids.length}`)
    if (ok !== ids.length) { console.error('REFUSING: a rater did not answer every set — no number from partial input'); process.exit(2) }
  }
  const byArm = {}
  const group = (k) => k.arm.startsWith('cand') && rest.includes('--by-author') ? [k.arm, `${k.arm}:${k.id.replace(/-\d+$/, '')}`] : [k.arm]
  for (const id of ids) for (const g of group(key[id])) {
    const a = (byArm[g] ??= { n: 0, K: 0, T: 0, Kmaj: 0, Kmin: 0, slots: 0 })
    a.n++
    const votes = raters.map(r => r[id].rarest)
    const hits = votes.filter(v => v === key[id].letter).length
    a.K += hits; a.T += raters.filter(r => r[id].testlike === key[id].letter).length
    if (hits * 2 > raters.length) a.Kmaj++
    // the opposite tell: the key is never anyone's rarest
    if (hits === 0) a.Kmin++
  }
  const R = raters.length
  console.log(`\n  arm                 n    K key-rarest      T key-testlike    majority-rarest`)
  for (const [g, a] of Object.entries(byArm).sort()) {
    console.log(`  ${g.padEnd(18)}${String(a.n).padStart(4)}   ${String(a.K).padStart(3)}/${a.n * R} = ${(100 * a.K / (a.n * R)).toFixed(1).padStart(5)}%   ${String(a.T).padStart(3)}/${a.n * R} = ${(100 * a.T / (a.n * R)).toFixed(1).padStart(5)}%   ${a.Kmaj}/${a.n}`)
  }
  const anc = byArm.anchor
  if (anc) {
    const k = 100 * anc.K / (anc.n * R), t = 100 * anc.T / (anc.n * R)
    if (k < 40 && t < 40) { console.log(`\n  NO MEASUREMENT: anchor (s17 SC) reads K ${k.toFixed(1)}% / T ${t.toFixed(1)}%, both under 40% — the instrument does not see the tell it was built for.`); process.exit(3) }
    console.log(`\n  anchor valid: K ${k.toFixed(1)}% / T ${t.toFixed(1)}% (needs either >= 40%)`)
  } else console.log('\n  (no anchor arm in this render — validity not established)')
  process.exit(0)
}
console.error(`unknown mode ${mode}`); process.exit(2)
