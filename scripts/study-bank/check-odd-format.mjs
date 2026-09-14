#!/usr/bin/env node
/**
 * check-odd-format.mjs <batch.json> | --live [--family F] [--section S]
 *
 * THE TENTH PROXY. Named by a `v14` options-only solver against their own run:
 * "M3 (format) is the one that fired most -- 13 of 27 mechanism picks... If the
 * key is the ugly value at better than chance, this is a real authoring tell
 * and it is cheap to check exactly."
 *
 * Their examples: 90 / 15 / 900 vs 194.4; 20 / 40 / 80 vs 34.6;
 * 4500 / 486 / 450 vs 3280.5; 39.0 / 49.0 / 41.0 vs 43.9. In each the key is
 * the only value that could not have come from a round-number slip.
 *
 * THE QUESTION AND ITS CONTROL. "Exactly one option has a different numeric
 * shape from the rest -- is it the key?" has a chance line of 1/k, DERIVED from
 * the option count: 25% on four choices, 20% on five. The tightest-pair proxy
 * the day before looked enormous only because it was scored against 25% when
 * its real line was 50%, so the control here is computed and never typed.
 *
 * TWO DEFINITIONS, REPORTED SEPARATELY, because "ugly" is a judgement and the
 * result should not depend on which one I happened to pick:
 *   A  the only NON-INTEGER among integers (or the only integer among
 *      non-integers) -- the sharpest reading of the solver's examples
 *   B  the only value that is not a multiple of 5 -- "round-number slip"
 * An item counts for a definition only when EXACTLY ONE option is singled out
 * by it; zero or several means the channel does not fire and the item is not
 * scorable under that definition.
 */
import { readFileSync } from 'node:fs'

export function asNum(s) {
  const t = String(s ?? '').replace(/[$,\s]/g, '').replace(/%$/, '').replace(/[a-z°²³]+$/i, '')
  if (!/^-?\d*\.?\d+$/.test(t)) return null
  const v = Number(t)
  return Number.isFinite(v) ? v : null
}
/* `.0` is written by an author who wants the column to line up, so 39.0 is
 * INTEGER-shaped here even though the string carries a point. The solver's own
 * example (39.0 / 49.0 / 41.0 vs 43.9) only works under that reading. */
const isIntegral = v => Number.isFinite(v) && Math.abs(v - Math.round(v)) < 1e-9
const mult5 = v => isIntegral(v) && Math.abs(Math.round(v)) % 5 === 0

/** Index of the unique option singled out by `pred`, or null. */
function unique(nums, pred) {
  const hits = nums.map((v, i) => (pred(v) ? i : -1)).filter(i => i >= 0)
  const miss = nums.map((v, i) => (pred(v) ? -1 : i)).filter(i => i >= 0)
  if (hits.length === 1) return hits[0]
  if (miss.length === 1) return miss[0]
  return null
}
export function oddOne(choices, key, defn) {
  const nums = choices.map(asNum)
  if (nums.some(n => n === null)) return null
  const ki = choices.findIndex(c => String(c) === String(key))
  if (ki < 0) return null
  const idx = unique(nums, defn === 'A' ? isIntegral : mult5)
  if (idx === null) return null
  return idx === ki
}

function report(label, items, getChoices, getKey) {
  const width = (items.find(i => Array.isArray(getChoices(i))) ? getChoices(items.find(i => Array.isArray(getChoices(i)))) : []).length || 4
  console.log(label)
  if (!items.length) { console.log('  REFUSING: zero items loaded.'); return }
  for (const defn of ['A', 'B']) {
    let fired = 0, hit = 0
    for (const it of items) {
      const r = oddOne(getChoices(it) ?? [], getKey(it), defn)
      if (r === null) continue
      fired++
      if (r) hit++
    }
    const chance = 100 / width
    const name = defn === 'A' ? 'A  unique non-integer / unique integer' : 'B  unique non-multiple-of-5'
    console.log(`  ${name}`)
    console.log(`     FIRED on ${fired} of ${items.length} items${fired ? '' : '   -> NOT MEASURED, the channel never fires here'}`)
    if (!fired) continue
    if (fired < 10) { console.log('     fewer than 10 firings is not a population — NOT MEASURED.'); continue }
    const rate = 100 * hit / fired
    const se = Math.sqrt((chance / 100) * (1 - chance / 100) / fired) * 100
    const z = se ? (rate - chance) / se : 0
    console.log(`     the singled-out option IS the key : ${hit}/${fired} = ${rate.toFixed(1)}%   (chance 1/k = ${chance.toFixed(1)}%)`)
    console.log(`     margin ${(rate - chance >= 0 ? '+' : '') + (rate - chance).toFixed(1)}pts   z = ${z.toFixed(2)}`)
    console.log(Math.abs(z) < 2 ? '     -> not distinguishable from chance.'
      : rate > chance ? '     -> REAL CHANNEL: the odd-shaped option is the key more than chance.'
      : '     -> ANTI-predictive: the odd-shaped option is the key LESS than chance.')
  }
}

const RUN = process.argv[1] && process.argv[1].endsWith('check-odd-format.mjs')
if (RUN) {
  const arg = process.argv[2]
  if (!arg) { console.error('usage: check-odd-format.mjs <batch.json> | --live [--family F] [--section S]'); process.exit(2) }
  if (arg === '--live') {
    const { createClient } = await import('@supabase/supabase-js')
    const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
    const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const fi = process.argv.indexOf('--family'), si = process.argv.indexOf('--section')
    const rows = []
    for (let f = 0; ; f += 1000) {
      let q = db.from('study_item_bank').select('id,item').eq('verified', true).eq('archived', false)
        .order('id', { ascending: true }).range(f, f + 999)
      if (fi > 0) q = q.eq('family', process.argv[fi + 1])
      if (si > 0) q = q.eq('section', process.argv[si + 1])
      const { data, error } = await q
      if (error) throw new Error(error.message)
      rows.push(...data)
      if (data.length < 1000) break
    }
    if (new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }
    report(`LIVE ${process.argv[fi + 1] ?? ''}/${process.argv[si + 1] ?? ''}`, rows, r => r.item?.choices, r => r.item?.correct_answer)
  } else {
    const batch = JSON.parse(readFileSync(arg, 'utf8'))
    if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${arg} holds no items.`); process.exit(2) }
    report(arg, batch, it => it.choices, it => it.correct_answer)
  }
}
