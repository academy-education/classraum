#!/usr/bin/env node
/**
 * stagea13.mjs — MAP Math b13 stage-A instrument and selection (MAP-MATH-V2-B13.prereg.md §A6, §A7). No DB, no model.
 *   render            all authors' candidates.json -> per-area cold screener packets (<= 40, order 20262312, deal
 *                     20262313) and per-area options-only files (order/relabel 20262311). Rendered once.
 *   select            reads every screen.json and the three solver files per area; eligibility + selection exactly as
 *                     §A6, carried-in items counted for rank balance; writes SELECTION.md + selection.json.
 *   --selftest        eligibility and the rank-balance swap at their margins, each reverted must fail a case.
 * Exits 2 on any missing or short input; never prints a rate over an unread file.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from '../../seeded-shuffle.mjs'
// --topup (prereg §A7): the N and O top-up authors' <author>/topup/candidates.json, stageA-topup/, seeds + 100, and the
// first-round picks counted (with the carried-in items) for rank balance. Writes SELECTION-topup.md / selection-topup.json.
const TOP = process.argv.includes('--topup'), S0 = TOP ? 100 : 0
const ROOT = '/Users/andylee/Downloads/saas/classraum', W = ROOT + '/scratchpad/map-v2-math-b13-work', SA = W + (TOP ? '/stageA-topup' : '/stageA')
const AUTHORS = TOP ? ['N-a', 'N-b', 'O-a', 'O-b'] : ['N-a', 'N-b', 'O-a', 'O-b', 'G-a', 'G-b', 'D-a', 'D-b']
const CFILE = a => `${W}/${a}/${TOP ? 'topup/' : ''}candidates.json`
const AREA = { N: 'Real and Complex Number Systems', O: 'Operations and Algebraic Thinking', G: 'Geometry', D: 'Statistics and Probability' }
const CARRIED = { O: [{ id: 'MB12C-O2-b', rank: 3 }], D: [{ id: 'MB12C-D61-a', rank: 3 }], N: [], G: [] }
const TIER = { low: 'low (easier than typical for this grade: most students in the grade answer it correctly)', mid: 'mid (typical for this grade: about half of students in the grade answer it correctly)', high: 'high (harder than typical for this grade: only stronger students in the grade answer it correctly)' }
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const rd = p => { if (!existsSync(p)) die('missing ' + p); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`unreadable ${p}`) } }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const val = s => { let m = String(s).match(/^(-?)(\d+) (\d+)\/(\d+)$/); if (m) return (m[1] ? -1 : 1) * (+m[2] + m[3] / m[4]); m = String(s).match(/^(-?\d+)\/(\d+)$/); if (m) return m[1] / m[2]; return Number(s) }
const rankOf = it => 1 + it.choices.filter(c => val(c) < val(it.correct_answer) - 1e-12).length
const chunk = (a, max) => { const k = Math.ceil(a.length / max), o = []; let i = 0; for (let c = 0; c < k; c++) { const n = Math.floor(a.length / k) + (c < a.length % k ? 1 : 0); o.push(a.slice(i, i + n)); i += n } return o }
const areaOf = it => Object.keys(AREA).find(k => AREA[k] === it.domain) ?? die(`${it.id}: domain ${it.domain}`)
export const mechOf = id => id.split('-').slice(0, -1).join('-')

function load() {
  const all = [], shas = {}
  for (const a of AUTHORS) { const p = CFILE(a), j = rd(p); if (!Array.isArray(j) || !j.length) die(`${p} empty`); shas[a] = sha(p); for (const it of j) { if (!/^MB13C-/.test(it.id)) die(`${it.id} id`); if (rankOf(it) !== it.key_rank) die(`${it.id}: key_rank ${it.key_rank}, value rank ${rankOf(it)}`); all.push({ ...it, author: a }) } }
  if (new Set(all.map(i => i.id)).size !== all.length) die('duplicate ids')
  return { all, shas }
}
function cmdRender() {
  if (existsSync(SA + '/manifest.json')) die('stage-A packets already rendered')
  const { all, shas } = load(); mkdirSync(SA, { recursive: true })
  const man = { authorsSha: shas, screen: {}, oo: {} }
  Object.keys(AREA).forEach((L, ai) => {
    const items = all.filter(i => areaOf(i) === L); if (!items.length) return
    const order = shuffleWith(items.slice(), rng(20262312 + ai)), deal = rng(20262313 + ai)
    chunk(order, 40).forEach((part, pi) => {
      const dir = `${SA}/screen-${L}${pi + 1}`; mkdirSync(dir, { recursive: true })
      let md = `# Items for screening (${part.length})\n\nEach item: id, area, target grade and tier, the question, four options. The correct answer is NOT marked.\n`
      part.forEach((it, i) => {
        const want = i % 4, rest = shuffleWith(it.choices.filter(c => c !== String(it.correct_answer)), deal), opts = []; let q = 0
        for (let j = 0; j < 4; j++) opts.push(j === want ? String(it.correct_answer) : rest[q++])
        md += `\n---\n\n## ${it.id}\n\nArea: ${it.domain} | Target grade: ${it.grade_target} | Target tier: ${TIER[it.tier]}\n\nQuestion: ${it.prompt}\n\n${opts.map((o, j) => `${'ABCD'[j]}. ${o}`).join('\n')}\n`
      })
      writeFileSync(dir + '/screen.md', md); man.screen[`${L}${pi + 1}`] = { dir, ids: part.map(i => i.id), sha: sha(dir + '/screen.md') }
      console.log(`${dir}/screen.md  ${part.length} items`)
    })
    const r = rng(20262311 + S0 + ai), ord = shuffleWith(items.slice(), r), blind = {}, key = {}
    ord.forEach((it, i) => { const id = `${L}C${String(i + 1).padStart(3, '0')}`, ch = shuffleWith(it.choices.map(String), r); blind[id] = { options: Object.fromEntries(ch.map((c, j) => ['ABCD'[j], c])) }; key[id] = { letter: 'ABCD'[ch.indexOf(String(it.correct_answer))], localId: it.id, key_rank: it.key_rank } })
    const dir = `${SA}/oo-${L}`; mkdirSync(dir, { recursive: true }); writeFileSync(dir + '/oo.blind.json', JSON.stringify(blind, null, 1)); writeFileSync(`${SA}/oo-${L}.key.json`, JSON.stringify(key, null, 1))
    man.oo[L] = { dir, n: ord.length, sha: sha(dir + '/oo.blind.json') }
    const h = [1, 2, 3, 4].map(k => items.filter(i => i.key_rank === k).length)
    console.log(`${L}: ${items.length} candidates, ${new Set(items.map(i => mechOf(i.id))).size} mechanisms, ranks ${h.join('/')}, nearMean ${items.filter(nearMean).length}; oo ${dir}/oo.blind.json`)
  })
  writeFileSync(SA + '/manifest.json', JSON.stringify(man, null, 1)); console.log('manifest', SA + '/manifest.json')
}
export const nearMean = it => { const v = it.choices.map(val), k = val(it.correct_answer), m = v.reduce((a, b) => a + b, 0) / 4; return Math.abs(k - m) <= Math.min(...v.filter(x => Math.abs(x - k) > 1e-12).map(x => Math.abs(x - m))) }
export function eligible(it, s, hits, R = { strikeMax: 1, ooMax: 1, needAnswer: true, pair: true, plug: true, ident: true }) {
  const why = []
  if (!s) return ['no screener row']
  if (R.needAnswer && val(s.my_answer) !== val(it.correct_answer)) why.push(`screener answered ${s.my_answer}`)
  if (+s.n_struck > R.strikeMax) why.push(`struck ${s.n_struck}`)
  if (R.ident && s.key_identifiable_free === true) why.push('key identifiable free')
  if (R.pair && s.option_pair_tell != null && s.option_pair_tell !== '') why.push('option pair tell')
  if (R.plug && s.plugback_routine === true) why.push('plug-back routine')
  if (hits > R.ooMax) why.push(`oo ${hits}/3`)
  return why
}
export function select(cands, carried, R) {
  // cands: [{id, mech, rank, hits, struck, ok}] ; returns picks
  const tie = rng(20262321 + S0), byM = {}
  for (const c of cands.filter(c => c.ok)) (byM[c.mech] ??= []).push(c)
  const ms = shuffleWith(Object.keys(byM).sort(), tie).map(m => ({ m, best: byM[m].reduce((a, b) => (a.hits - b.hits || a.struck - b.struck) <= 0 ? a : b) }))
  ms.sort((a, b) => a.best.hits - b.best.hits || a.best.struck - b.best.struck)
  const picks = [], cnt = r => [...carried, ...picks].filter(x => x.rank === r).length
  for (const { m } of ms) { const alts = byM[m].slice().sort((a, b) => a.hits - b.hits || a.struck - b.struck || cnt(a.rank) - cnt(b.rank)); picks.push(alts[0]) }
  if (R?.noSwap) return picks
  const n = () => picks.length + carried.length
  for (let guard = 0; guard < 100; guard++) {
    const over = [1, 2, 3, 4].find(r => cnt(r) > Math.ceil(n() / 4) + 1); if (!over) break
    let done = false
    for (let i = picks.length - 1; i >= 0 && !done; i--) { if (picks[i].rank !== over) continue; const alt = byM[picks[i].mech].filter(a => a.rank !== over && cnt(a.rank) < cnt(over) - 1).sort((a, b) => cnt(a.rank) - cnt(b.rank))[0]; if (alt) { picks[i] = alt; done = true } }
    if (!done) break
  }
  return picks
}
function cmdSelect() {
  const man = rd(SA + '/manifest.json'), { all, shas } = load()
  for (const [a, s] of Object.entries(man.authorsSha)) if (shas[a] !== s) die(`${a}/candidates.json changed since render`)
  const rows = {}
  const first = TOP ? rd(W + '/selection.json') : null, allFirst = TOP ? Object.fromEntries(['N-a', 'N-b', 'O-a', 'O-b', 'G-a', 'G-b', 'D-a', 'D-b'].flatMap(a => rd(`${W}/${a}/candidates.json`)).map(i => [i.id, i])) : null
  const carriedOf = L => TOP ? [...CARRIED[L], ...first[L].picks.map(id => ({ id, rank: allFirst[id].key_rank }))] : CARRIED[L]
  for (const [nm, p] of Object.entries(man.screen)) { if (sha(p.dir + '/screen.md') !== p.sha) die(`${nm} screen.md changed`); const j = rd(p.dir + '/screen.json'); const got = p.ids.filter(id => j[id]).length; if (got !== p.ids.length) die(`${nm}: screener rows ${got} of ${p.ids.length}`); Object.assign(rows, j) }
  let md = `# b13 stage-A selection (coordinator, ${new Date().toISOString().slice(0, 10)})\n\nRule: MAP-MATH-V2-B13.prereg.md §A6. Inputs: authors' candidates (sha in stageA/manifest.json), ${Object.keys(man.screen).length} screener packets, 3 options-only samples per area.\n`
  const out = {}
  for (const L of Object.keys(man.oo)) {
    const key = rd(`${SA}/oo-${L}.key.json`), sol = ['a', 'b', 'c'].map(x => rd(`${man.oo[L].dir}/solver-${x}.json`))
    for (const [i, s] of sol.entries()) { const n = Object.keys(key).filter(id => /^[A-D]$/.test(s[id]?.pick ?? '')).length; if (n !== Object.keys(key).length) die(`${L} solver ${'abc'[i]}: ${n} of ${Object.keys(key).length} picks`) }
    const hits = {}; for (const [id, k] of Object.entries(key)) hits[k.localId] = sol.filter(s => s[id].pick === k.letter).length
    const items = all.filter(i => areaOf(i) === L)
    const cands = items.map(it => { const why = eligible(it, rows[it.id], hits[it.id]); return { id: it.id, mech: mechOf(it.id), rank: it.key_rank, hits: hits[it.id], struck: +rows[it.id]?.n_struck || 0, ok: !why.length, why, nearMean: nearMean(it) } })
    const picks = select(cands, carriedOf(L))
    const tot = cands.reduce((a, c) => a + c.hits, 0)
    const h = r => [1, 2, 3, 4].map(k => r.filter(x => x.rank === k).length).join('/')
    const n = picks.length + carriedOf(L).length
    out[L] = { candidates: cands.length, ooAll: tot / (3 * cands.length), eligible: cands.filter(c => c.ok).length, picks: picks.map(p => p.id), carried: carriedOf(L).map(c => c.id), n, gate: n >= 10 }
    md += `\n## ${L} ${AREA[L]}\n\ncandidates ${cands.length} (${new Set(cands.map(c => c.mech)).size} mechanisms), ranks ${h(cands)}, options-only ${tot}/${3 * cands.length} = ${(100 * tot / (3 * cands.length)).toFixed(1)}%; eligible ${out[L].eligible}.\n\n**Selected ${picks.length} + carried ${carriedOf(L).length}${TOP ? ' (carried-in + round-1 picks)' : ''} = ${n}** (${n >= 10 ? 'GATE' : 'below 10: top-up or pool'}); ranks ${h([...picks, ...carriedOf(L)])}; nearMean ${picks.filter(p => p.nearMean).length}/${picks.length}; selected oo ${picks.reduce((a, p) => a + p.hits, 0)}/${3 * picks.length}.\n\n| pick | rank | oo /3 | struck |\n|---|---|---|---|\n${picks.map(p => `| ${p.id} | ${p.rank} | ${p.hits} | ${p.struck} |`).join('\n')}\n\nIneligible:\n${cands.filter(c => !c.ok).map(c => `- ${c.id} (r${c.rank}): ${c.why.join('; ')}`).join('\n')}\n`
  }
  writeFileSync(W + (TOP ? '/SELECTION-topup.md' : '/SELECTION.md'), md); writeFileSync(W + (TOP ? '/selection-topup.json' : '/selection.json'), JSON.stringify(out, null, 1)); console.log(md)
}
function selftest() {
  let bad = 0; const t = (ok, m) => { if (!ok) { bad++; console.error('FAIL ' + m) } }
  const it = { correct_answer: '5', choices: ['2', '5', '9', '14'] }, s = { my_answer: '5', n_struck: 1, key_identifiable_free: false, option_pair_tell: null, plugback_routine: false }
  t(!eligible(it, s, 1).length, 'margin row eligible'); t(eligible(it, { ...s, n_struck: 2 }, 1).length, '2 struck ineligible'); t(eligible(it, s, 2).length, 'oo 2 ineligible')
  t(eligible(it, { ...s, my_answer: '9' }, 0).length, 'wrong answer ineligible'); t(eligible(it, { ...s, option_pair_tell: '5 & 14' }, 0).length, 'pair ineligible')
  const C = [], mk = (m, r) => ({ id: `${m}-${r}`, mech: m, rank: r, hits: 0, struck: 0, ok: true })
  for (let i = 0; i < 8; i++) C.push(mk('M' + i, 2), mk('M' + i, i % 2 ? 1 : 4))
  const p = select(C, []), maxc = Math.max(...[1, 2, 3, 4].map(r => p.filter(x => x.rank === r).length))
  t(p.length === 8 && maxc <= 4, `rank balance holds (max ${maxc} of 8)`)
  // break-tests: reverted rules must fail
  const pr = select(C.map(c => ({ ...c, rank: c.rank === 2 ? 2 : c.rank })).map(c => c.rank === 2 ? { ...c, hits: 0 } : { ...c, hits: 1 }), [], { noSwap: true })
  t(Math.max(...[1, 2, 3, 4].map(r => pr.filter(x => x.rank === r).length)) > 4, 'break-test: without the swap step a skewed pool stays skewed (the swap is live)')
  t(eligible(it, { ...s, n_struck: 2 }, 1, { strikeMax: 2, ooMax: 1, needAnswer: true, pair: true, plug: true, ident: true }).length === 0, 'break-test: loosening strikeMax admits the 2-struck row (the check is live)')
  if (bad) die(`selftest ${bad} failure(s)`); console.log('stagea13 selftest ok')
}
const c = process.argv[2]
if (c === 'render') cmdRender(); else if (c === 'select') cmdSelect(); else if (c === '--selftest') selftest(); else die('usage: render | select | --selftest')
