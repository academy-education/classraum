#!/usr/bin/env node
/**
 * mf30-verdict.mjs <frozen.batch.json> [--confirm mf30.confirm.json] [--write]
 *
 * Applies PREREG-MF30-2026-10-10.md's per-item bars to the three with-source
 * graders' files mf30.ws-{d,e,f}-{h1,h2,h3}.json (stage 2, each row carrying its
 * stage-1 fields). mf28-verdict.mjs unchanged except the easy-cap rates (live mix 2026-10-10) and the r7pair wording (DSUM); mf28: algf27-verdict.mjs with three renders, the DPAIR wording of r7pair and
 * the easy cap applied PER DOMAIN. Written before any grader ran.
 *
 * Mechanical DROPs: 1 key_ok false (any) | 2 exclusive false (majority) | 3
 * distractors_weak (majority) | 4 median n_struck >= 2 | 6 plug-back routine in
 * <= 2 tries (majority) | 11 same_template_as an EARLIER item (seeded frozen order)
 * by >= 2 graders | EXT-1 drop_recommend (any). HOLD: on_blueprint false (majority).
 * CONFIRM-by-hand flags (any one grader; decided in --confirm, {id: {rule: true|false}}):
 * r4key key_identifiable_free or key struck | r5 path_coherent false | r7 arith_tell |
 * r7pair option_pair_tell (A89 + A90: an option pair, one member the key, joined by a printed number
 * or by a multiplier one step from one: n - 1, n + 1, the sum of two printed numbers; A91: or by a DIFFERENCE equal to the sum of two printed numbers, R01) |
 * r8 one_sided on an extreme key | r9 interior_tell | r10 single_bound_kills_all on an
 * extreme key | r11 one grader's template of an earlier item, or a live_duplicate note.
 * A flag left undecided makes the item PENDING and the script exits 1.
 * Difficulty = median of the three graders' difficulty_final. Easy cap PER DOMAIN at the live
 * mix (prereg): easy <= max(1, round(rate x kept)), rate Algebra 0.021 / Advanced Math 0.030 / Geometry 0.060 /
 * PSDA 0.105, earliest in the frozen order first; the rest HELD-EASY.
 * Writes mf30.verdict.json. With --write (only when nothing is PENDING) also writes
 * sat-math-v30-full.gate-{alg,adv,geo,psda}.batch.json (the per-domain sets that go to the kept-set gate,
 * panel-median difficulty, author fields kept as frozen), .held.batch.json (HOLD + HELD-EASY),
 * .dropped.json. mf30-kept.mjs runs the per-domain extremity gate on the two gate files.
 * Refuses (exit 2) on a missing grader row.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { scoreItem } from './key-extremity-breakdown.mjs'
import { DOMAINS, DTAG } from './mf30-slots.mjs'
const DIR = new URL('.', import.meta.url).pathname
const args = process.argv.slice(2)
const bp = args[0]; const ci = args.indexOf('--confirm')
const items = JSON.parse(readFileSync(bp, 'utf8'))
if (!Array.isArray(items) || !items.length) { console.error('REFUSING: empty batch'); process.exit(2) }
const conf = ci >= 0 ? JSON.parse(readFileSync(args[ci + 1], 'utf8')) : {}
const G = ['d', 'e', 'f'].map(g => { const m = {}; for (const h of ['h1', 'h2', 'h3']) { const p = `${DIR}mf30.ws-${g}-${h}.json`; if (!existsSync(p)) { console.error(`REFUSING: ${p} missing`); process.exit(2) } Object.assign(m, JSON.parse(readFileSync(p, 'utf8'))) } return m })
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
  if (R.some(r => r.option_pair_tell)) flags.r7pair = who(r => r.option_pair_tell)
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
// Easy cap per domain at the live mix measured 2026-10-10 (bank-state.mjs counts): Algebra 11/533, Advanced Math 16/535,
// Geometry 15/252, PSDA 31/296 (PREREG-MF30-2026-10-10.md).
const CAP = { Algebra: 0.021, 'Advanced Math': 0.030, 'Geometry and Trigonometry': 0.060, 'Problem-Solving and Data Analysis': 0.105 }, caps = {}
for (const dom of Object.keys(CAP)) {
  const kept = items.filter(it => it.domain === dom && out[it.id].status === 'KEEP')
  const cap = Math.max(1, Math.round(CAP[dom] * kept.length)); let easyIn = 0; caps[dom] = `${cap} over ${kept.length}`
  for (const it of kept) if (out[it.id].difficulty === 'easy') { if (easyIn < cap) easyIn++; else out[it.id].status = 'HELD-EASY' }
}
for (const it of items) if (!CAP[it.domain]) { console.error(`REFUSING: ${it.id} domain ${it.domain}`); process.exit(2) }
for (const it of items) { const v = out[it.id]; console.log(`${String(v.position).padStart(2)} ${it.id.padEnd(10)} ${v.status.padEnd(9)} ${v.difficulty.padEnd(6)} [${v.difficulties.join(',')}] key ${v.key_votes}/3 struck~${v.n_struck_median}${v.extreme ? ' EXT' : ''}${v.why.length ? '  ' + v.why.join('; ') : ''}${v.open.length ? '  OPEN ' + v.open.map(f => `${f}(${v.flags[f]})`).join(' ') : ''}`) }
const S = (s, dom) => items.filter(it => out[it.id].status === s && (!dom || it.domain === dom))
for (const dom of Object.keys(CAP)) {
  const ins = S('KEEP', dom), n = items.filter(i => i.domain === dom).length
  console.log(`\n${dom}: KEEP ${ins.length} of ${n} frozen (easy ${ins.filter(i => out[i.id].difficulty === 'easy').length} / medium ${ins.filter(i => out[i.id].difficulty === 'medium').length} / hard ${ins.filter(i => out[i.id].difficulty === 'hard').length}); easy cap ${caps[dom]} survivors; HELD-EASY ${S('HELD-EASY', dom).length}; DROP ${S('DROP', dom).length}; HOLD ${S('HOLD', dom).length}`)
}
console.log(`PENDING ${pending}`)
writeFileSync(`${DIR}mf30.verdict.json`, JSON.stringify(out, null, 1) + '\n')
if (args.includes('--write')) {
  if (pending) { console.error('REFUSING --write: PENDING flags'); process.exit(1) }
  for (const [dom, tag] of DOMAINS.map(d => [d, DTAG[d]])) {
    const kept = S('KEEP', dom).map(it => ({ ...it, difficulty: out[it.id].difficulty }))
    writeFileSync(`${DIR}sat-math-v30-full.gate-${tag}.batch.json`, JSON.stringify(kept, null, 1) + '\n')
  }
  writeFileSync(`${DIR}sat-math-v30-full.held.batch.json`, JSON.stringify(items.filter(it => ['HOLD', 'HELD-EASY'].includes(out[it.id].status)).map(it => ({ ...it, _held: out[it.id].status === 'HOLD' ? 'off-blueprint by majority' : `panel-median easy past the ${it.domain} easy cap (live mix)`, _panel_difficulty: out[it.id].difficulty })), null, 1) + '\n')
  writeFileSync(`${DIR}sat-math-v30-full.dropped.json`, JSON.stringify(S('DROP').map(it => ({ id: it.id, domain: it.domain, ...out[it.id] })), null, 1) + '\n')
  console.log(`written: ${DOMAINS.map(d => `gate-${DTAG[d]} ${S('KEEP', d).length}`).join(', ')}, held, dropped`)
}
process.exit(pending ? 1 : 0)
