#!/usr/bin/env node
/**
 * sci-packet.mjs: grading packets and REPORT-ONLY blind renders for the MAP Science pilot. Run from the repo root.
 *
 *   node .../sci-packet.mjs grader  <L.json> <P.json> <E.json> [--out DIR]        # with-source packets (cold + keyed)
 *   node .../sci-packet.mjs covered <files...> [--out DIR]                        # figure-covered render (data/investigation)
 *   node .../sci-packet.mjs oo      <files...> [--control 24] [--out DIR]         # options-only render (+ live ACT Science control)
 *   node .../sci-packet.mjs score   <key.json> <answers1.json> <answers2.json> <answers3.json>
 *   node .../sci-packet.mjs --selftest                                            # no DB
 *   default DIR: scratchpad/map-science-pilot/packets (repo-root scratchpad, git-excluded)
 *
 * WHAT DECIDES AND WHAT DOES NOT (MAP-SCIENCE-PILOT.prereg.md):
 *   grader   decides. Two with-source graders read each item with its stimulus DECODED exactly as the app draws it:
 *            table cells, bar heights with the y-axis tick labels the renderer prints (0, 1/4, 1/2, 3/4, max), and
 *            line/scatter points with the renderer's 5 ticks per axis. A grader can then check that a value is readable
 *            and not merely present in the JSON. The cold packet has no key; the keyed packet adds it.
 *   covered  REPORT-ONLY. Stem + options, with the graphic and the procedure removed. It asks "does the item need its
 *            stimulus?". A per-item drop needs the graders' `no_source_needed` as well (three samples of one model are
 *            not independent).
 *   oo       REPORT-ONLY. Options alone. It saturates on ACT Science (model 88.9% vs human 28.6% on the shipped bank) and
 *            measures the construct on model items, so it never holds or clears anything. --control appends N live
 *            act/science four-choice items (READ ONLY), dealt through the same render and interleaved. The candidate's
 *            unanimity rate is reported beside the control's, never a margin bar (the control's ceiling leaves no room).
 * Keys are dealt round-robin (flat) and the realised best-fixed-letter control is computed from the deal and printed.
 * Blind files carry no id that maps back: items are renumbered L01..; the mapping lives only in the key file.
 * Exit 2 on unreadable input or an empty population.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rng, shuffleWith } from '../../seeded-shuffle.mjs'

const SLOTS = ['A', 'B', 'C', 'D']
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const fmtTick = v => (Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 1 ? 2 : 1))   // = helpers.tsx fmtTick
const BANNER_REPORT = 'REPORT-ONLY (MAP-SCIENCE-PILOT.prereg.md): this render never holds, drops or clears an item on its own.'

/** The stimulus as the student sees it, in text. Mirrors QuestionGraphicView.tsx. */
export function decodeGraphic(g) {
  if (!g) return '(no figure)'
  const out = []
  if (g.type === 'table') {
    out.push(`TABLE: ${g.caption ?? ''}`, `| | ${g.colLabels.join(' | ')} |`, `|---|${g.colLabels.map(() => '---').join('|')}|`)
    g.rowLabels.forEach((r, i) => out.push(`| ${r} | ${(g.cells[i] ?? []).join(' | ')} |`))
  } else if (g.type === 'bar') {
    const max = Math.max(...g.bars.map(b => b.value), 1)
    out.push(`BAR CHART: ${g.caption ?? ''}`, `x: ${g.xLabel}   y: ${g.yLabel}`,
      `y-axis tick labels the student sees: ${[0, max * 0.25, max * 0.5, max * 0.75, max].map(v => (Number.isInteger(v) ? v : v.toFixed(1))).join(', ')}`,
      'bars (black, NO value labels; heights below are the data, which the student can only estimate):',
      ...g.bars.map(b => `  ${b.label}: ${b.value}`))
  } else if (g.type === 'line' || g.type === 'scatter') {
    const pts = g.type === 'line' ? g.series.flatMap(s => s.points) : g.points
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
    const ticks = (lo, hi) => Array.from({ length: 5 }, (_, i) => lo + ((hi - lo || 1) * i) / 4).map(fmtTick).join(', ')
    out.push(`${g.type === 'line' ? 'LINE GRAPH (one series, points joined)' : 'SCATTER PLOT'}: ${g.caption ?? ''}`, `x: ${g.xLabel}   y: ${g.yLabel}`,
      `x tick labels: ${ticks(Math.min(...xs, 0), Math.max(...xs))}`, `y tick labels: ${ticks(Math.min(...ys, 0), Math.max(...ys))}`,
      `points (data; the student reads them against the ticks): ${pts.map(p => `(${p[0]}, ${p[1]})`).join(' ')}`)
  } else out.push(`UNSUPPORTED FIGURE TYPE ${g.type}`)
  return out.join('\n')
}

function load(files) {
  const items = []
  for (const f of files) {
    if (!existsSync(f)) die(`no such file ${f}`)
    let a; try { a = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { die(`${f}: ${e.message}`) }
    if (!Array.isArray(a)) die(`${f}: not a JSON array`)
    items.push(...a.filter(x => !x.empty))
  }
  if (!items.length) die('zero written items in the input: nothing to render')
  if (items.some(i => !Array.isArray(i.choices) || i.choices.length !== 4 || !i.choices.includes(i.correct_answer))) die('every item needs 4 choices containing its key')
  return items
}

export function graderPacket(items, keyed) {
  const lines = [`# MAP Science pilot: with-source packet (${keyed ? 'KEYED' : 'COLD, no key'}), ${items.length} items`, '',
    'Read GRADER-BRIEF.md first. Options are in presentation order.', '']
  for (const it of items) {
    // The slot's `ask` is withheld from the COLD packet: for a trend item it names the key's direction.
    lines.push(`## ${it.id}  (${it.map_area}; grade ${it.grade_target} ${it.tier}; ${it.ngss_pe}; ${it.kind}/${it.stimulus}/${it.format}${keyed ? `/${it.ask}` : ''})`, '')
    if (it.passage) lines.push('PASSAGE:', it.passage, '')
    if (it.graphic) lines.push(decodeGraphic(it.graphic), '')
    lines.push(`QUESTION: ${it.prompt}`, ...it.choices.map((c, i) => `  ${SLOTS[i]}) ${c}`), '')
    if (keyed) {
      lines.push(`KEY: ${SLOTS[it.choices.indexOf(it.correct_answer)]}) ${it.correct_answer}`, `AUTHOR'S EXPLANATION: ${it.explanation}`,
        `KEY EVIDENCE: ${JSON.stringify(it.key_evidence ?? null)}`, `REAL-WORLD CHECK: ${it.real_world_check}`,
        // b1 finding 5: B4 (stated law) and B1 (option roles) were judged without the author's claims; show them.
        ...(it.prior_free ? [`PRIOR-FREE (author's claim that the standard does not give the answer): ${it.prior_free}`] : []),
        ...(Array.isArray(it.option_roles) ? [`OPTION ROLES (author's tags, choice order): ${it.choices.map((c, i) => `${SLOTS[i]}=${it.option_roles[i]}`).join(', ')}`] : []),
        ...((it.distractor_rationales ?? []).map(d => `  distractor "${d.choice}": ${d.fault}`)), '')
    }
  }
  return lines.join('\n') + '\n'
}

/** Flat round-robin deal; returns { blind, key, dealt, control } with ids renumbered and arms interleaved. */
export function deal(entries, seed, render) {
  const rand = rng(seed), blind = {}, key = {}
  entries.forEach((e, i) => {
    const ch = e.choices.map(String), ci = ch.indexOf(String(e.correct_answer))
    const want = SLOTS[i % 4], rest = shuffleWith(ch.filter((_, j) => j !== ci), rand)
    let r = 0
    blind[i] = { ...render(e), options: Object.fromEntries(SLOTS.map(s => [s, s === want ? ch[ci] : rest[r++]])) }
    key[i] = { letter: want, localId: e.id, kind: e.arm ?? 'candidate', itemKind: e.kind ?? null }
  })
  const order = shuffleWith(Object.keys(blind), rand), B = {}, K = {}
  order.forEach((old, n) => { const id = `L${String(n + 1).padStart(2, '0')}`; B[id] = blind[old]; K[id] = key[old] })
  const dealt = {}; for (const k of Object.values(K)) dealt[k.letter] = (dealt[k.letter] ?? 0) + 1
  return { blind: B, key: K, dealt, control: 100 * Math.max(...Object.values(dealt)) / Object.keys(K).length }
}

async function liveControl(n) {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { count, error: ce } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', 'act').eq('section', 'science').eq('verified', true).eq('archived', false)
  if (ce) die(ce.message)
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,item').eq('family', 'act').eq('section', 'science').eq('verified', true).eq('archived', false).order('id').range(f, f + 999)
    if (error) die(error.message)
    rows.push(...data); if (data.length < 1000) break
  }
  if (rows.length !== count) die(`read ${rows.length} live act/science rows, server count ${count}`)
  const pool = rows.filter(r => Array.isArray(r.item?.choices) && r.item.choices.length === 4 && r.item.choices.includes(r.item.correct_answer))
  console.log(`  control pool: ${rows.length} live act/science, ${pool.length} four-choice with key`)
  if (pool.length < n) die(`asked for ${n} control items, ${pool.length} eligible`)
  return shuffleWith(pool, rng(20261027)).slice(0, n).map(r => ({ id: r.id, choices: r.item.choices, correct_answer: r.item.correct_answer, arm: 'live-control', kind: 'act-science' }))
}

function write(dir, name, obj) { mkdirSync(dir, { recursive: true }); const p = join(dir, name); writeFileSync(p, typeof obj === 'string' ? obj : JSON.stringify(obj, null, 1) + '\n'); console.log(`  wrote ${p}`) }

/* An answer is a bare letter or {pick: letter}. Anything else is refused: an
 * object compared to a letter is never equal, so the first live run scored
 * {pick} files as 0/72 instead of failing (2026-10-27). */
export function pickOf(v) {
  const p = typeof v === 'string' ? v : v && typeof v === 'object' ? v.pick : undefined
  return typeof p === 'string' && /^[A-D]$/.test(p.trim()) ? p.trim() : null
}

export function score(key, answers) {
  const arms = {}
  for (const [id, k] of Object.entries(key)) {
    const raw = answers.map(a => a[id])
    if (raw.some(v => v === undefined)) return { err: `item ${id} unanswered in ${raw.filter(v => v === undefined).length} file(s)` }
    const picks = raw.map(pickOf)
    if (picks.some(p => p === null)) return { err: `item ${id} has an answer that is not a letter A-D or {pick: letter}: ${JSON.stringify(raw)}` }
    const a = (arms[k.kind] ??= { n: 0, picks: 0, hits: 0, unan: 0, unanHit: 0 })
    a.n++; a.picks += picks.length; a.hits += picks.filter(p => p === k.letter).length
    if (new Set(picks).size === 1) { a.unan++; if (picks[0] === k.letter) a.unanHit++ }
  }
  return { arms }
}

async function selftest() {
  let fail = 0; const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { fail++; console.log(`  FAIL ${m}`) } }
  const { FIXTURES } = await import('./sci-check.fixtures.mjs')
  const g = graderPacket(FIXTURES, false), k = graderPacket(FIXTURES, true)
  ok(!/KEY:/.test(g) && /KEY:/.test(k), 'cold packet carries no key; keyed packet does')
  ok(!/\/decrease\)/.test(g) && /\/decrease\)/.test(k), 'cold packet withholds the slot ask (a trend ask names the key direction)')
  {
    const { FIXTURES_B1 } = await import('./sci-check.fixtures.mjs')
    const g1 = graderPacket(FIXTURES_B1, false), k1 = graderPacket(FIXTURES_B1, true)
    ok(/PRIOR-FREE/.test(k1) && /OPTION ROLES/.test(k1), 'keyed packet carries prior_free and option_roles (b1 finding 5)')
    ok(!/PRIOR-FREE|OPTION ROLES/.test(g1), 'cold packet carries neither prior_free nor option_roles (both point at the key)')
  }
  ok(/y-axis tick labels the student sees: 0, 20, 40, 60, 80/.test(g), 'bar decoded with the renderer\'s tick labels (max 80 -> 0, 20, 40, 60, 80)')
  ok(/y tick labels: 0, 3.5, 7, 10.5, 14/.test(g), 'line decoded with the renderer\'s 5 ticks (0..14 -> 0, 3.5, 7, 10.5, 14)')
  const inv = FIXTURES.filter(f => f.kind !== 'model')
  const cov = deal(inv, 1, e => ({ question: e.prompt }))
  const covTxt = JSON.stringify(cov.blind)
  ok(!inv.some(e => (e.passage && covTxt.includes(e.passage.slice(0, 40))) || covTxt.includes('"graphic"') || covTxt.includes('rowLabels')), 'covered render has no passage and no graphic')
  ok(!inv.some(e => covTxt.includes(e.id)), 'covered render carries no item id')
  const oo = deal(FIXTURES, 2, () => ({}))
  const ooTxt = JSON.stringify(oo.blind)
  ok(!FIXTURES.some(e => ooTxt.includes(e.prompt.slice(0, 30)) || ooTxt.includes(e.id)), 'options-only render carries no stem and no id')
  ok(Math.max(...Object.values(oo.dealt)) - Math.min(...Object.values(oo.dealt)) <= 1, `keys dealt flat ${JSON.stringify(oo.dealt)}`)
  ok(Object.entries(oo.key).every(([id, kk]) => oo.blind[id].options[kk.letter] === FIXTURES.find(f => f.id === kk.localId).correct_answer), 'key file letter points at the real key in every blind item')
  const ctl = FIXTURES.slice(0, 4).map((f, i) => ({ id: `ctl-${i}`, choices: f.choices, correct_answer: f.correct_answer, arm: 'live-control' }))
  const mixed = deal([...FIXTURES, ...ctl], 3, () => ({}))
  const kinds = Object.values(mixed.key).map(x => x.kind)
  ok(kinds.filter(x => x === 'live-control').length === 4 && kinds.slice(0, 9).includes('live-control'), 'control arm present and interleaved, not appended')
  const ans = id => Object.fromEntries(Object.entries(oo.key).map(([i, kk]) => [i, id === 2 && i === 'L01' ? (kk.letter === 'A' ? 'B' : 'A') : kk.letter]))
  const s = score(oo.key, [ans(0), ans(1), ans(2)])
  ok(s.arms.candidate.hits === 26 && s.arms.candidate.unan === 8, `score: 26/27 picks, 8 unanimous (got ${s.arms.candidate.hits}, ${s.arms.candidate.unan})`)
  ok(!!score(oo.key, [ans(0), ans(1), {}]).err, 'score refuses an answer file with missing items')
  const wrap = a => Object.fromEntries(Object.entries(a).map(([i, l]) => [i, { pick: l, basis: 'guess' }]))
  const sw = score(oo.key, [wrap(ans(0)), ans(1), wrap(ans(2))])
  ok(!sw.err && sw.arms.candidate.hits === 26 && sw.arms.candidate.unan === 8, `score reads {pick} answers the same as bare letters (got ${sw.err ?? sw.arms.candidate.hits})`)
  const bad = Object.fromEntries(Object.keys(oo.key).map(i => [i, { choice: 'A' }]))
  ok(!!score(oo.key, [ans(0), ans(1), bad]).err, 'score refuses answers that are neither a letter nor {pick}')
  console.log(fail ? `PACKET SELFTEST FAILED: ${fail}` : 'PACKET SELFTEST OK')
  process.exit(fail ? 1 : 0)
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const A = process.argv.slice(2)
  if (A.includes('--selftest')) await selftest()
  const mode = A[0], oi = A.indexOf('--out'), ci = A.indexOf('--control')
  const dir = oi >= 0 ? A[oi + 1] : 'scratchpad/map-science-pilot/packets'
  const files = A.slice(1).filter((a, i, arr) => !a.startsWith('--') && !['--out', '--control'].includes(arr[i - 1]))
  if (mode === 'grader') {
    const items = load(files)
    write(dir, 'grader-cold.md', graderPacket(items, false)); write(dir, 'grader-keyed.md', graderPacket(items, true))
  } else if (mode === 'covered') {
    const items = load(files).filter(i => i.kind !== 'model')
    if (!items.length) die('no data/investigation items to cover')
    const d = deal(items, 20261028, e => ({ question: e.prompt }))
    write(dir, 'covered.blind.json', { _note: BANNER_REPORT + ' Figure and procedure withheld; stem and options only.', items: d.blind })
    write(dir, 'covered.key.json', d.key)
    console.log(`covered: ${items.length} items, keys ${JSON.stringify(d.dealt)}, best-fixed-letter control ${d.control.toFixed(1)}%`)
  } else if (mode === 'oo') {
    const items = load(files), n = ci >= 0 ? Number(A[ci + 1]) : 0
    if (ci >= 0 && !(n > 0)) die('--control needs a positive count')
    const ctl = n ? await liveControl(n) : []
    const d = deal([...items, ...ctl], 20261029, () => ({}))
    write(dir, 'oo.blind.json', { _note: BANNER_REPORT + ' Which of these four options is the answer? (the question, passage and figure are withheld)', items: d.blind })
    write(dir, 'oo.key.json', d.key)
    console.log(`oo: ${items.length} candidate + ${ctl.length} live control, keys ${JSON.stringify(d.dealt)}, best-fixed-letter control ${d.control.toFixed(1)}%`)
  } else if (mode === 'score') {
    if (files.length < 2) die('score <key.json> <answers.json ...>')
    const key = JSON.parse(readFileSync(files[0], 'utf8')), ans = files.slice(1).map(f => JSON.parse(readFileSync(f, 'utf8')))
    const r = score(key, ans); if (r.err) die(r.err)
    console.log(BANNER_REPORT)
    for (const [arm, a] of Object.entries(r.arms)) console.log(`  ${arm.padEnd(13)} items ${a.n}  picks ${a.hits}/${a.picks} = ${(100 * a.hits / a.picks).toFixed(1)}%  unanimous ${a.unan}/${a.n} = ${(100 * a.unan / a.n).toFixed(1)}% (on key ${a.unanHit})`)
    console.log('  samples are one model sampled several times: compare unanimity RATES between arms; no per-item verdict, no interval.')
  } else die('usage: sci-packet.mjs grader|covered|oo|score ... | --selftest')
}
