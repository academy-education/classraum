#!/usr/bin/env node
// The seventh structural proxy. Solver C found it in sat-cs-hard-v1's
// cross-text block on 2026-09-04: the key is the option carrying a
// GRANT-VERB frame ("By granting that X while contending that Y"), and no
// distractor in the set carries one. That is the stance tell in a costume
// the concessive-pivot checker misses, because it looks at the STIMULUS
// while this lives in the OPTIONS.
//
// Unlike the stance tell itself, this shape is a string, so it is decidable
// and the whole population can be measured rather than sampled.
//
//   node check-grant-frame.mjs --selftest
//   node check-grant-frame.mjs <batch.json>...
//   node check-grant-frame.mjs --bank [section]     (needs .env.local sourced)
import { readFileSync } from 'node:fs'

// These checkers are imported by math-bank-helper.mjs, so the CLI below must
// not run on import — it reads process.argv and would try to open the host's
// arguments as batch files.
const RUN_AS_CLI = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())

const GRANT = /\b(grant(?:ing|s|ed)?|conced(?:e|ing|es|ed)|accept(?:ing|s|ed)?|allow(?:ing|s|ed)?|acknowledg(?:e|ing|es|ed)|admit(?:ting|s|ted)?)\b/i
// A frame needs the grant AND a limiting pivot; a bare "accepts the offer"
// is not a concession frame.
const LIMIT = /\b(while|but|yet|though|although|whereas|however|still|nonetheless|nevertheless)\b/i

export function hasGrantFrame(text) {
  const s = String(text ?? '')
  return GRANT.test(s) && LIMIT.test(s)
}

// Returns null when NO option in the set carries the frame (unstructured —
// the checker has nothing to say). Otherwise credit is 1/ties when the key
// is among the carriers, so a set where all four carry it scores 0.25 and a
// set where only the key carries it scores 1.0. Summed over a population
// with keys placed at random, the expectation is exactly 0.25.
export function scoreItem(choices, key) {
  const flags = choices.map(hasGrantFrame)
  const carriers = flags.filter(Boolean).length
  if (carriers === 0) return null
  const ki = choices.indexOf(key)
  if (ki < 0) return null
  return { keyCarries: flags[ki], credit: flags[ki] ? 1 / carriers : 0, carriers }
}

function report(label, rows) {
  const scored = rows.map(r => scoreItem(r.choices, r.key)).filter(Boolean)
  if (!scored.length) return console.log(`${label.padEnd(34)} no option sets carry a grant frame`)
  const rate = 100 * scored.reduce((a, s) => a + s.credit, 0) / scored.length
  const sole = scored.filter(s => s.carriers === 1 && s.keyCarries).length
  const soleDis = scored.filter(s => s.carriers === 1 && !s.keyCarries).length
  console.log(`${label.padEnd(34)} ${String(scored.length).padStart(4)} framed of ${String(rows.length).padStart(4)}   key-carries ${rate.toFixed(1)}%   control 25.0%   margin ${(rate - 25).toFixed(1)}pts`)
  console.log(`${''.padEnd(34)} sole carrier is the KEY in ${sole}, a DISTRACTOR in ${soleDis}`)
  return rate
}

if (RUN_AS_CLI && process.argv.includes('--selftest')) {
  const G = 'By granting that the rule ends the bargaining while contending that it also ends the record'
  const G2 = 'By accepting the finding but noting that it covers one season only'
  const F = 'By disputing that the rule ends the bargaining at all'
  const F2 = 'By arguing that fees have risen every year since'
  let ok = true
  const t = (name, got, want) => { const p = JSON.stringify(got) === JSON.stringify(want); if (!p) ok = false; console.log(`${p ? 'PASS' : 'FAIL'}  ${name}${p ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`) }
  t('bare grant verb is not a frame', hasGrantFrame('By accepting the offer outright'), false)
  t('grant + pivot is a frame', hasGrantFrame(G), true)
  t('flat option is not', hasGrantFrame(F), false)
  t('sole carrier is the key', scoreItem([G, F, F2, 'By denying it'], G), { keyCarries: true, credit: 1, carriers: 1 })
  t('sole carrier is a distractor', scoreItem([G, F, F2, 'By denying it'], F), { keyCarries: false, credit: 0, carriers: 1 })
  t('no carrier returns null', scoreItem([F, F2, 'By denying it', 'By restating it'], F), null)
  // The control: with every option framed, credit is 0.25 wherever the key sits.
  const all = [G, G2, 'By allowing the claim though limiting its scope', 'By conceding the point while narrowing it']
  const sum = all.reduce((a, k) => a + scoreItem(all, k).credit, 0)
  t('all-framed set sums to 1.0000 over the four key positions', sum.toFixed(4), '1.0000')
  console.log(ok ? '\nself-test PASSED' : '\nself-test FAILED'); process.exit(ok ? 0 : 1)
}

const bankIdx = RUN_AS_CLI ? process.argv.indexOf('--bank') : -1
if (bankIdx >= 0) {
  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const section = process.argv[bankIdx + 1] && !process.argv[bankIdx + 1].startsWith('--') ? process.argv[bankIdx + 1] : 'reading_writing'
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id, item, domain')
      .eq('family', 'sat').eq('section', section).eq('archived', false).range(from, from + 999)
    if (error) throw error
    rows.push(...(data ?? [])); if (!data || data.length < 1000) break
  }
  console.log(`live SAT ${section}, ${rows.length} rows read\n`)
  const byDomain = {}
  for (const r of rows) {
    const c = r.item?.choices, k = r.item?.correct_answer
    if (!Array.isArray(c) || c.length !== 4 || k == null) continue
    ;(byDomain[r.domain ?? '(none)'] ??= []).push({ choices: c, key: k })
  }
  const all = []
  for (const [d, rs] of Object.entries(byDomain).sort()) { report(d, rs); all.push(...rs) }
  console.log(); report('ALL', all)
} else if (RUN_AS_CLI) {
  const files = process.argv.slice(2).filter(a => !a.startsWith('--'))
  const all = []
  for (const f of files) {
    const items = JSON.parse(readFileSync(f, 'utf8'))
    const rows = (Array.isArray(items) ? items : items.items)
      .filter(i => Array.isArray(i.choices) && i.choices.length === 4)
      .map(i => ({ choices: i.choices, key: i.correct_answer }))
    report(f.split('/').pop(), rows); all.push(...rows)
  }
  if (files.length > 1) { console.log(); report('ALL', all) }
}
