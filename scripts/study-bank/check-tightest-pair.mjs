#!/usr/bin/env node
/**
 * check-tightest-pair.mjs <batch.json> | --live [--family F] [--section S]
 *
 * THE NINTH STRUCTURAL PROXY. Flagged by the `act-math-v14-mix` author against
 * their own batch, unprompted: "in 11 of 18 sets the key sits inside the
 * tightest adjacent pair of values (144/148, 32/33, 267/283 …). A solver who
 * always guessed inside the tightest pair would score about 30%."
 *
 * THE CONTROL THEY QUOTED IS THE WRONG ONE, and that is the whole reason this
 * script exists. They compared against the 25% four-choice chance line, but the
 * question "is the key one of the two closest options?" has a chance line of
 * 2/k, which is 50% on a four-choice item — DERIVED from the width, never a
 * literal. Against 25% a rate of 61% looks like a large channel; against the
 * correct 50% it is 11 points and may be nothing. Eight proxies have now been
 * built and refuted, and more than one of them looked real only against a
 * control that did not match the question being asked.
 *
 * A hit is a QUESTION until the population answers it. Report the denominator.
 */
import { readFileSync } from 'node:fs'

/** Parse an option to a number, or null. Handles $, commas, %, trailing units. */
export function asNum(s) {
  const t = String(s ?? '').replace(/[$,\s]/g, '').replace(/%$/, '').replace(/[a-z°²³]+$/i, '')
  if (!/^-?\d*\.?\d+$/.test(t)) return null
  const v = Number(t)
  return Number.isFinite(v) ? v : null
}

/** Is the key one of the two options with the smallest adjacent gap?
 *
 * `metric` is 'abs' (difference) or 'ratio' (b/a). A `v14` solver raised this
 * and was right that it matters: "TAP has to be taken on ratio, not absolute
 * gap, when the set spans an order of magnitude -- and the two disagree",
 * naming 15 / 90 / 194.4 / 900, where absolute picks {15,90} and ratio picks
 * {90,194.4}. The original 66.6% was measured on 'abs' alone and was therefore
 * ambiguous between two readings of its own definition. Both are measured now
 * and reported side by side rather than one being chosen after the fact.
 *
 * Ratio needs every value strictly positive to be defined; sets containing a
 * zero or a negative are not scorable under it and say so rather than being
 * silently handed to the absolute metric. */
export function keyInTightestPair(choices, key, metric = 'abs') {
  const nums = choices.map(asNum)
  if (nums.some(n => n === null)) return null            // not a numeric set
  const ki = choices.findIndex(c => String(c) === String(key))
  if (ki < 0) return null
  const idx = nums.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  if (new Set(nums).size !== nums.length) return null    // duplicate values: "adjacent" is undefined
  if (metric === 'ratio' && nums.some(v => v <= 0)) return null
  const gapAt = j => metric === 'ratio' ? idx[j + 1].v / idx[j].v : idx[j + 1].v - idx[j].v
  let best = Infinity, pair = null
  for (let j = 0; j + 1 < idx.length; j++) {
    const gap = gapAt(j)
    if (gap < best) { best = gap; pair = [idx[j].i, idx[j + 1].i] }
  }
  /* A TIE FOR TIGHTEST IS NOT SCORABLE. If two different pairs share the
   * smallest gap the "tightest pair" a solver would pick is undefined, and
   * counting it either way invents a result. Dropped from the denominator and
   * reported separately. */
  let ties = 0
  for (let j = 0; j + 1 < idx.length; j++) if (gapAt(j) === best) ties++
  if (ties > 1) return 'tie'
  return pair.includes(ki)
}

const METRIC = process.env.TAP_METRIC === 'ratio' ? 'ratio' : 'abs'

function report(label, items, getChoices, getKey) {
  let loaded = 0, nonNumeric = 0, tied = 0, scorable = 0, inside = 0
  for (const it of items) {
    loaded++
    const ch = getChoices(it), key = getKey(it)
    if (!Array.isArray(ch) || ch.length < 3) { nonNumeric++; continue }
    const r = keyInTightestPair(ch, key, METRIC)
    if (r === null) { nonNumeric++; continue }
    if (r === 'tie') { tied++; continue }
    scorable++
    if (r) inside++
  }
  /* An EMPTY input crashed here rather than saying so: `items.find(...)`
   * returned undefined and the width read threw. It was reached by zsh
   * refusing to word-split `set -- $fs`, which is the same shell trap that
   * once made six sections report `scorable 0 of 0`. A crash is better than a
   * fabricated zero, but it should name the cause. */
  if (!loaded) { console.log(label); console.log('  REFUSING: zero items loaded. A rate over an empty set is not a result.'); return null }
  const firstWithChoices = items.find(i => Array.isArray(getChoices(i)))
  const width = (firstWithChoices ? getChoices(firstWithChoices) : []).length || 4
  const chance = 100 * 2 / width          // DERIVED from the option count
  console.log(label + `   [metric: ${METRIC}]`)
  console.log(`  loaded ${loaded}   non-numeric or key absent ${nonNumeric}   tied-for-tightest ${tied} (not scorable)`)
  console.log(`  SCORABLE ${scorable}`)
  if (scorable < 10) { console.log('  NOT MEASURED — fewer than 10 scorable items is not a population.'); return null }
  const rate = 100 * inside / scorable
  console.log(`  key is in the tightest adjacent pair : ${inside}/${scorable} = ${rate.toFixed(1)}%`)
  console.log(`  chance for a ${width}-option item (2/k, derived)   : ${chance.toFixed(1)}%`)
  const margin = rate - chance
  // Two-sided binomial-ish z on the proportion.
  const se = Math.sqrt((chance / 100) * (1 - chance / 100) / scorable) * 100
  const z = se ? margin / se : 0
  console.log(`  margin ${(margin >= 0 ? '+' : '') + margin.toFixed(1)}pts   z = ${z.toFixed(2)}`)
  console.log(Math.abs(z) < 2
    ? '  -> NOT DISTINGUISHABLE from chance. The shape exists and does not point anywhere.'
    : margin > 0
      ? '  -> the key IS in the tightest pair more than chance. A solver halving to that pair gains.'
      : '  -> the key AVOIDS the tightest pair. The channel is anti-predictive.')
  return { scorable, inside, rate, chance, z }
}

const RUN = process.argv[1] && process.argv[1].endsWith('check-tightest-pair.mjs')
if (RUN) {
  const arg = process.argv[2]
  if (!arg) { console.error('usage: check-tightest-pair.mjs <batch.json> | --live [--family F] [--section S]'); process.exit(2) }
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
    if (new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }
    report(`LIVE${fi > 0 ? ' ' + process.argv[fi + 1] : ''}${si > 0 ? '/' + process.argv[si + 1] : ''}`,
      rows, r => r.item?.choices, r => r.item?.correct_answer)
  } else {
    const batch = JSON.parse(readFileSync(arg, 'utf8'))
    if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${arg} holds no items.`); process.exit(2) }
    report(arg, batch, it => it.choices, it => it.correct_answer)
  }
}
