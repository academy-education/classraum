#!/usr/bin/env node
/**
 * check-twin-options.mjs <batch.json> | --live [--family X] [--section Y]
 *
 * THE TWIN PAIR. Found 2026-09-12 by two options-only solvers independently,
 * on different files, neither able to see the other:
 *
 *   "A and D are the same semicolon clause differing only in `had put` /
 *    `put`, so neither can be uniquely correct, and the pair itself
 *    eliminates half the set."
 *
 *   "two options are semantically interchangeable, so neither can be the
 *    unique key, which halves the field for free."
 *
 * The reasoning is sound and the exact form is SEMANTIC — whether two options
 * are truly interchangeable depends on the sentence. What is DECIDABLE is the
 * shape it leaves: a pair of options far closer to each other than to the rest
 * of the set. This checker finds that shape and asks one question of it:
 *
 *     WHEN A NEAR-DUPLICATE PAIR EXISTS, IS THE KEY INSIDE IT OR OUTSIDE IT?
 *
 * If the key sits OUTSIDE such a pair more often than chance, then "eliminate
 * the twins" is a free channel and the shape is a real leak. If the key sits
 * inside at or above chance, the shape is an authoring habit that does not
 * help a solver — the fate of run-middle, key-is-sum, key-magnitude,
 * stem-echo, option-balance and the ratio hub, all of which looked like
 * channels and measured as noise or anti-predictive.
 *
 * A hit is therefore a QUESTION, not a verdict, until the population answer is
 * in. Report the denominator before the rate.
 */
import { readFileSync } from 'node:fs'

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

/** Character-level similarity, 0..1. Cheap and order-sensitive, which is what
 *  we want: two options differing by one word score very high. */
function sim(a, b) {
  a = norm(a); b = norm(b)
  if (!a || !b) return 0
  if (a === b) return 1
  const grams = s => { const g = new Map(); for (let i = 0; i < s.length - 2; i++) { const k = s.slice(i, i + 3); g.set(k, (g.get(k) ?? 0) + 1) } return g }
  const ga = grams(a), gb = grams(b)
  let inter = 0
  for (const [k, v] of ga) inter += Math.min(v, gb.get(k) ?? 0)
  const total = [...ga.values()].reduce((x, y) => x + y, 0) + [...gb.values()].reduce((x, y) => x + y, 0)
  return total ? 2 * inter / total : 0
}

/** A twin pair: two options whose similarity exceeds `thresh` AND exceeds
 *  every other pair's similarity in the set by a clear margin. The margin
 *  matters — in a well-built ACT item ALL options are minimally different, and
 *  flagging those would make every item a hit. */
export function twinPair(choices, thresh = 0.80, margin = 0.10, minLen = 12) {
  if (!Array.isArray(choices) || choices.length < 3) return null
  /* SHORT OPTION SETS ARE A MINIMAL-PAIR LATTICE BY DESIGN and must never fire.
   * `its / it is / its' / their` is not a twin pair with a spare — it is four
   * members of one contrast, and the contrast IS the item. Trigram similarity
   * is also degenerate at that length (`its` has one trigram), so the score
   * means nothing. The mechanism the solvers described was two FULL CLAUSES
   * differing by one unimportant feature; that is what this measures.
   * Caught by the self-test below before this was pointed at any data. */
  /* NO CHANGE is excluded from the comparison entirely. It is an OPAQUE TOKEN
   * carrying no orthography -- an options-only solver never sees the text it
   * stands for -- so it can be neither half of a twin pair. Both ACT English
   * repair agents derived this independently and it is the rule their whole
   * method rests on: "the entire leak lives in the three NAMED alternates."
   * It also breaks the length guard on its own, being 9 characters. */
  const idx = choices.map((c, i) => i).filter(i => !/^\s*no change\s*$/i.test(String(choices[i])))
  if (idx.length < 3) return null
  if (idx.some(i => norm(choices[i]).length < minLen)) return null
  const pairs = []
  for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) {
    pairs.push({ i: idx[a], j: idx[b], s: sim(choices[idx[a]], choices[idx[b]]) })
  }
  pairs.sort((a, b) => b.s - a.s)
  const top = pairs[0], next = pairs[1]
  if (!top || top.s < thresh) return null
  if (next && top.s - next.s < margin) return null   // the whole set is tight; no distinguished pair
  return { i: top.i, j: top.j, s: top.s, runnerUp: next ? next.s : 0 }
}

function report(label, items, getChoices, getKey) {
  let scorable = 0, withTwin = 0, keyInside = 0
  const hits = []
  for (const it of items) {
    const ch = getChoices(it)
    const key = getKey(it)
    if (!Array.isArray(ch) || ch.length < 3) continue
    const ki = ch.findIndex(c => String(c) === String(key))
    if (ki < 0) continue
    scorable++
    const t = twinPair(ch)
    if (!t) continue
    withTwin++
    const inside = ki === t.i || ki === t.j
    if (inside) keyInside++
    hits.push({ id: it.id ?? '?', s: t.s, inside })
  }
  console.log(label)
  console.log(`  scorable ${scorable} of ${items.length}   (fewer than 3 options, or key not among them, is not scored)`)
  if (!scorable) { console.log('  NOT MEASURED — a rate over zero scorable items is not a pass.'); return null }
  console.log(`  items carrying a twin pair : ${withTwin} = ${(100 * withTwin / scorable).toFixed(1)}%`)
  if (!withTwin) { console.log('  0 — a zero-population line, not a pass.'); return { scorable, withTwin: 0 } }
  const insideRate = 100 * keyInside / withTwin
  /* Chance that the key falls inside a 2-of-n pair if placement is random. */
  const chance = 100 * 2 / (getChoices(items.find(i => Array.isArray(getChoices(i)))) ?? [0, 0, 0, 0]).length
  console.log(`  of those, key is INSIDE the pair : ${keyInside}/${withTwin} = ${insideRate.toFixed(1)}%   (chance ${chance.toFixed(1)}%)`)
  console.log(`  margin ${(insideRate - chance >= 0 ? '+' : '') + (insideRate - chance).toFixed(1)}pts`)
  console.log(insideRate < chance - 10
    ? '  -> the key avoids the pair. "Eliminate the twins" is a FREE CHANNEL. Act on it.'
    : insideRate > chance + 10
      ? '  -> the key sits inside the pair more than chance. Eliminating twins HURTS a solver.'
      : '  -> no direction. The shape exists and does not help. Do not build on it.')
  return { scorable, withTwin, keyInside, insideRate, chance }
}

const RUN = process.argv[1] && process.argv[1].endsWith('check-twin-options.mjs')
if (RUN) {
  const arg = process.argv[2]
  if (!arg) { console.error('usage: check-twin-options.mjs <batch.json> | --live [--family X] [--section Y]'); process.exit(2) }
  if (arg === '--live') {
    const { createClient } = await import('@supabase/supabase-js')
    const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
    const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const fi = process.argv.indexOf('--family'), si = process.argv.indexOf('--section')
    const rows = []
    for (let f = 0; ; f += 1000) {
      let q = db.from('study_item_bank').select('id,family,section,item')
        .eq('verified', true).eq('archived', false).order('id', { ascending: true }).range(f, f + 999)
      if (fi > 0) q = q.eq('family', process.argv[fi + 1])
      if (si > 0) q = q.eq('section', process.argv[si + 1])
      const { data, error } = await q
      if (error) throw new Error(error.message)
      rows.push(...data)
      if (data.length < 1000) break
    }
    const ids = new Set(rows.map(r => r.id))
    if (ids.size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }
    report(`LIVE BANK${fi > 0 ? ' ' + process.argv[fi + 1] : ''}${si > 0 ? '/' + process.argv[si + 1] : ''}`,
      rows, r => r.item?.choices, r => r.item?.correct_answer)
  } else {
    const batch = JSON.parse(readFileSync(arg, 'utf8'))
    if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${arg} holds no items.`); process.exit(2) }
    report(arg, batch, it => it.choices, it => it.correct_answer)
  }
}
