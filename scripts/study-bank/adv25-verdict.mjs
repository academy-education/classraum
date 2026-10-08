#!/usr/bin/env node
/**
 * adv25-verdict.mjs <frozen.batch.json> [--confirm adv25.confirm.json]
 *
 * Applies PREREG-ADV25-2026-10-08.md's per-item bars to the three with-source
 * graders' files adv25.ws-{d,e,f}-{h1,h2}.json (stage 2, each row carrying its
 * stage-1 fields). Written before any grader ran.
 *
 * Mechanical DROPs: 1 key_ok false (any) | 2 exclusive false (majority) | 3
 * distractors_weak (majority) | 4 median n_struck >= 2 | 6 plug-back routine in
 * <= 2 tries (majority) | 11 same_template_as an EARLIER item (seeded frozen order)
 * by >= 2 graders | EXT-1 drop_recommend (any). HOLD: on_blueprint false (majority).
 * CONFIRM-by-hand flags (any one grader; decided in --confirm, {id: {rule: true|false}}):
 * r4key key_identifiable_free or key struck | r5 path_coherent false | r7 arith_tell |
 * r8 one_sided on an extreme key | r9 interior_tell | r10 single_bound_kills_all on an
 * extreme key | r11 one grader's template of an earlier item, or a live_duplicate note.
 * A flag left undecided makes the item PENDING and the script exits 1.
 * Difficulty = median of the three graders' difficulty_final. Easy cap (prereg): inserted
 * easy <= max(1, round(0.031 x kept)), earliest in the frozen order first; the rest HELD-EASY.
 * Writes m25adv.verdict.json. Refuses (exit 2) on a missing grader row.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { scoreItem } from './key-extremity-breakdown.mjs'
const DIR = new URL('.', import.meta.url).pathname
const args = process.argv.slice(2)
const bp = args[0]; const ci = args.indexOf('--confirm')
const items = JSON.parse(readFileSync(bp, 'utf8'))
if (!Array.isArray(items) || !items.length) { console.error('REFUSING: empty batch'); process.exit(2) }
const conf = ci >= 0 ? JSON.parse(readFileSync(args[ci + 1], 'utf8')) : {}
const G = ['d', 'e', 'f'].map(g => { const m = {}; for (const h of ['h1', 'h2']) { const p = `${DIR}adv25.ws-${g}-${h}.json`; if (!existsSync(p)) { console.error(`REFUSING: ${p} missing`); process.exit(2) } Object.assign(m, JSON.parse(readFileSync(p, 'utf8'))) } return m })
for (const [i, g] of G.entries()) for (const it of items) if (!g[it.id]) { console.error(`REFUSING: grader ${'DEF'[i]} has no row for ${it.id}`); process.exit(2) }
const val = s => { const t = String(s).trim().replace(/−/g, '-'); const m = t.match(/^(-?)(\d+)\s*\/\s*(\d+)$/); return m ? (m[1] ? -1 : 1) * m[2] / m[3] : Number(t) }
const same = (a, b) => Math.abs(val(a) - val(b)) < 1e-9
const order = new Map(items.map((x, i) => [x.id, i]))
const RANK = { easy: 0, medium: 1, hard: 2 }
const out = {}; let pending = 0
for (const it of items) {
  const R = G.map(g => g[it.id]); const who = f => R.map((r, i) => f(r) ? 'DEF'[i] : '').join('')
  const sc = scoreItem(it.choices.map(String), String(it.correct_answer)); const extreme = !sc.skip && (sc.keyMin || sc.keyMax)
  const why = [], flags = {}
  const keyVotes = R.filter(r => same(r.my_answer, it.correct_answer)).length
  if (R.some(r => r.key_ok === false)) why.push(`r1 key disputed by ${who(r => r.key_ok === false)}`)
  if (R.filter(r => r.exclusive === false).length >= 2) why.push('r2 not exclusive (majority)')
  if (R.filter(r => r.distractors_weak === true).length >= 2) why.push('r3 distractors weak (majority)')
  const ns = R.map(r => Number(r.n_struck) || 0).sort((a, b) => a - b)
  if (ns[1] >= 2) why.push(`r4 median struck ${ns[1]}`)
  if (R.filter(r => r.plugback_routine === true && r.plugback_tries != null && r.plugback_tries <= 2).length >= 2) why.push(`r6 plug-back <= 2 by ${who(r => r.plugback_routine === true && r.plugback_tries != null && r.plugback_tries <= 2)}`)
  const earlier = {}
  for (const [gi, g] of G.entries()) for (const t of order.keys()) {
    if (order.get(t) >= order.get(it.id)) continue
    if ((g[it.id].same_template_as || []).includes(t) || (g[t].same_template_as || []).includes(it.id)) (earlier[t] ??= new Set()).add(gi)
  }
  for (const [t, s] of Object.entries(earlier)) { if (s.size >= 2) why.push(`r11 template of earlier ${t} (${s.size}/3)`); else flags[`r11:${t}`] = `one grader names earlier ${t}` }
  if (R.some(r => r.drop_recommend === true)) why.push(`EXT-1 drop_recommend by ${who(r => r.drop_recommend === true)}: ${R.filter(r => r.drop_recommend).map(r => r.drop_reason).join(' | ')}`)
  if (R.some(r => r.key_identifiable_free === true || (r.struck || []).some(s => same(s, it.correct_answer)))) flags.r4key = who(r => r.key_identifiable_free === true || (r.struck || []).some(s => same(s, it.correct_answer)))
  if (R.some(r => r.path_coherent === false)) flags.r5 = who(r => r.path_coherent === false)
  if (R.some(r => r.arith_tell)) flags.r7 = who(r => r.arith_tell)
  if (extreme && R.some(r => r.one_sided === true)) flags.r8 = who(r => r.one_sided === true)
  if (R.some(r => r.interior_tell === true)) flags.r9 = who(r => r.interior_tell === true)
  if (extreme && R.some(r => r.single_bound_kills_all === true)) flags.r10 = who(r => r.single_bound_kills_all === true)
  if (R.some(r => r.live_duplicate)) flags.r11live = who(r => r.live_duplicate)
  const decided = conf[it.id] ?? {}
  const open = Object.keys(flags).filter(f => !(f in decided))
  for (const f of Object.keys(flags)) if (decided[f] === true) why.push(`${f} CONFIRMED by hand (${flags[f]})`)
  const offBp = R.filter(r => r.on_blueprint === false).length
  const diffs = R.map(r => r.difficulty_final ?? r.difficulty)
  const difficulty = Object.keys(RANK).find(k => RANK[k] === diffs.map(d => RANK[d]).sort((a, b) => a - b)[1])
  const status = why.length ? 'DROP' : open.length && !why.length ? 'PENDING' : offBp >= 2 ? 'HOLD' : 'KEEP'
  if (status === 'PENDING') pending++
  out[it.id] = { position: order.get(it.id) + 1, difficulty, difficulties: diffs, key_votes: keyVotes, n_struck_median: ns[1], extreme, status, why, flags, open, off_blueprint_votes: offBp }
}
const kept = items.filter(it => out[it.id].status === 'KEEP')
const cap = Math.max(1, Math.round(0.031 * kept.length)); let easyIn = 0
for (const it of kept) if (out[it.id].difficulty === 'easy') { if (easyIn < cap) easyIn++; else out[it.id].status = 'HELD-EASY' }
for (const it of items) { const v = out[it.id]; console.log(`${String(v.position).padStart(2)} ${it.id.padEnd(10)} ${v.status.padEnd(9)} ${v.difficulty.padEnd(6)} [${v.difficulties.join(',')}] key ${v.key_votes}/3 struck~${v.n_struck_median}${v.extreme ? ' EXT' : ''}${v.why.length ? '  ' + v.why.join('; ') : ''}${v.open.length ? '  OPEN ' + v.open.map(f => `${f}(${v.flags[f]})`).join(' ') : ''}`) }
const S = s => items.filter(it => out[it.id].status === s)
const ins = S('KEEP')
console.log(`\nINSERT ${ins.length} of ${items.length} frozen (easy ${ins.filter(i => out[i.id].difficulty === 'easy').length} / medium ${ins.filter(i => out[i.id].difficulty === 'medium').length} / hard ${ins.filter(i => out[i.id].difficulty === 'hard').length}); easy cap ${cap} over ${kept.length} survivors; HELD-EASY ${S('HELD-EASY').length}; DROP ${S('DROP').length}; HOLD ${S('HOLD').length}; PENDING ${pending}`)
writeFileSync(`${DIR}m25adv.verdict.json`, JSON.stringify(out, null, 1) + '\n')
process.exit(pending ? 1 : 0)
