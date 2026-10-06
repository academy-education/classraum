#!/usr/bin/env node
/**
 * ssat-cf.mjs — counterfactual-slot SSAT Reading (SSAT-READING-CF-PREREGISTERED.md).
 *
 *   verify <a.cf.json>...            mechanical gate; refuses (exit 2) on any violation.
 *                                    Prints NO key information: safe for authors to run.
 *   draw   <outdir> <a.cf.json>...   frozenSha over the files (sorted path order), the
 *                                    pre-registered k(qid), assembled passages, and a
 *                                    bank-shaped batch (<outdir>/batch.json) + draw.json.
 *   build  <outdir> [--ctl <ssat-reading-diag dir>]
 *                                    options-only files from <outdir>/batch.json: iso.json
 *                                    (candidate non-vocab items shuffled into the same 48 live
 *                                    control items as A69/A73, no siblings adjacent), grp-N.json
 *                                    (one passage per file), withsource.json (passages +
 *                                    unmarked choices), cv.json (every version of every slot),
 *                                    and the keys in attack.key.json.
 *   score  <outdir> --iso <f>... [--grp <f>...] [--ws <f>...] [--cv <f>...]
 *
 * Every scorer refuses on an empty or short population instead of printing a rate.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const L = 'ABCDE'
const SEED = 'ssat-cf-2026-10-06'
const KINDS = ['main-idea', 'detail', 'inference', 'vocabulary-in-context', 'attitude', 'purpose']
const NEG = /\b(not|no|never|nothing|nor|none|neither|nobody|nowhere)\b|n't\b/gi
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const sha = b => createHash('sha256').update(b).digest('hex')
const words = s => String(s).trim().split(/\s+/).filter(Boolean).length
const norm = s => String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const STOP = new Set('the a an of to in on and or for with by at from as that this which who whom whose was were is are be been his her their its it he she they them him one what how why when chiefly most best passage author writer narrator'.split(' '))
const content = s => norm(s).replace(/[^a-z' ]/g, ' ').split(' ').filter(w => w.length > 3 && !STOP.has(w))

export function kOf(frozenSha, qid) {
  return parseInt(sha(`${SEED}|${frozenSha}|${qid}`).slice(0, 8), 16) % 5
}

function assemble(p, pick) {
  return p.segments.map(s => typeof s === 'string' ? s : p.questions.find(q => q.qid === s.slot).versions[pick(s.slot)].text).join('')
}

function verify(files) {
  const problems = [], notes = []
  const passages = files.map(f => ({ f, p: JSON.parse(readFileSync(f, 'utf8')) }))
  for (const { f, p } of passages) {
    const id = p.passage_id ?? f
    if (!Array.isArray(p.segments) || !Array.isArray(p.questions)) { problems.push(`${id}: segments/questions missing`); continue }
    if (p.questions.length !== 6) problems.push(`${id}: ${p.questions.length} questions (need 6)`)
    const kinds = p.questions.map(q => q.kind).sort().join(',')
    if (kinds !== [...KINDS].sort().join(',')) problems.push(`${id}: kinds ${kinds} (need one each of ${KINDS.join(', ')})`)
    const slots = p.segments.filter(s => typeof s !== 'string').map(s => s.slot)
    for (const q of p.questions) if (slots.filter(s => s === q.qid).length !== 1) problems.push(`${id}/${q.qid}: must appear exactly once as a slot in segments`)
    for (const s of slots) if (!p.questions.some(q => q.qid === s)) problems.push(`${id}: slot ${s} has no question`)
    const fixed = p.segments.filter(s => typeof s === 'string').join(' ')
    for (const q of p.questions) {
      const tag = `${id}/${q.qid}`
      if (!q.prompt?.trim()) problems.push(`${tag}: empty prompt`)
      if (q.choices?.length !== 5) { problems.push(`${tag}: ${q.choices?.length} choices`); continue }
      if (new Set(q.choices.map(norm)).size !== 5) problems.push(`${tag}: choices not distinct`)
      const cl = q.choices.map(c => c.length)
      if (Math.max(...cl) / Math.min(...cl) > 1.6) problems.push(`${tag}: choice length ratio ${(Math.max(...cl) / Math.min(...cl)).toFixed(2)} > 1.6`)
      if (q.versions?.length !== 5) { problems.push(`${tag}: ${q.versions?.length} versions`); continue }
      const vl = q.versions.map(v => words(v.text))
      if (Math.max(...vl) / Math.min(...vl) > 1.35) problems.push(`${tag}: version word ratio ${(Math.max(...vl) / Math.min(...vl)).toFixed(2)} > 1.35 (${vl.join('/')})`)
      if (new Set(q.versions.map(v => norm(v.text))).size !== 5) problems.push(`${tag}: versions not distinct`)
      q.versions.forEach((v, k) => {
        const T = norm(v.text)
        const neg = (v.text.match(NEG) ?? []).length
        if (neg > 1) problems.push(`${tag} v${k}: ${neg} negation tokens (max 1)`)
        if (!v.why || !T.includes(norm(v.why))) problems.push(`${tag} v${k}: why not verbatim in its own version text`)
        for (let j = 0; j < 5; j++) {
          if (j === k) continue
          const kill = v.kills?.[String(j)]
          if (!kill?.quote || !kill?.reason) { problems.push(`${tag} v${k}: kill for choice ${j} missing quote/reason`); continue }
          if (!T.includes(norm(kill.quote))) problems.push(`${tag} v${k}: kill quote for choice ${j} not verbatim in version text`)
        }
        if (v.kills?.[String(k)]) problems.push(`${tag} v${k}: kills its own choice`)
      })
    }
    // stem leak: a choice's distinctive content word appearing in ANOTHER question's stem
    for (const q of p.questions) for (const o of p.questions) {
      if (o === q) continue
      const stem = new Set(content(o.prompt))
      for (const c of q.choices ?? []) {
        const own = content(c).filter(w => stem.has(w) && !(q.choices.filter(x => x !== c).some(x => content(x).includes(w))))
        if (own.length) problems.push(`${id}: stem of ${o.qid} contains "${own.join(',')}", unique to one choice of ${q.qid}`)
      }
    }
    // assembled length over all extremes: shortest and longest version per slot
    const short = assemble(p, s => { const v = p.questions.find(q => q.qid === s).versions; return v.map((x, i) => [words(x.text), i]).sort((a, b) => a[0] - b[0])[0][1] })
    const long = assemble(p, s => { const v = p.questions.find(q => q.qid === s).versions; return v.map((x, i) => [words(x.text), i]).sort((a, b) => b[0] - a[0])[0][1] })
    if (words(short) < 270 || words(long) > 380) problems.push(`${id}: assembled length ${words(short)}–${words(long)} words, outside 270–380`)
    const negFixed = (fixed.match(NEG) ?? []).length
    notes.push(`${id}: assembled ${words(short)}–${words(long)} words; fixed-text negations ${negFixed}; per-version negations ${p.questions.map(q => q.versions?.map(v => (v.text.match(NEG) ?? []).length).join('')).join(' ')}`)
  }
  notes.forEach(n => console.log('  ' + n))
  if (problems.length) { problems.forEach(x => console.log('  PROBLEM ' + x)); die(`${problems.length} mechanical problem(s)`) }
  console.log(`  verify OK: ${passages.length} passage(s), ${passages.reduce((a, x) => a + x.p.questions.length, 0)} questions, ${passages.reduce((a, x) => a + x.p.questions.length * 5 * 4, 0)} kill quotes verbatim`)
  return passages
}

function draw(outdir, files) {
  const sorted = [...files].sort()
  const passages = verify(sorted)
  const frozenSha = sha(Buffer.concat(sorted.map(f => readFileSync(f))))
  mkdirSync(outdir, { recursive: true })
  const drawn = {}, batch = []
  for (const { p } of passages) {
    const pick = qid => drawn[qid]
    for (const q of p.questions) drawn[q.qid] = kOf(frozenSha, q.qid)
    const passage = assemble(p, pick)
    for (const q of p.questions) {
      const k = drawn[q.qid], v = q.versions[k]
      batch.push({
        id: q.qid, set_id: p.passage_id, passageGroupId: `cf-${p.passage_id}`, genre: p.genre,
        subskill: q.kind, difficulty: q.difficulty ?? 'medium', passage, prompt: q.prompt,
        choices: q.choices, correct_answer: q.choices[k], explanation: v.why,
        kills: Object.fromEntries(Object.entries(v.kills).map(([j, x]) => [q.choices[Number(j)], x.quote])),
      })
    }
  }
  const hist = [0, 0, 0, 0, 0]; Object.values(drawn).forEach(k => hist[k]++)
  writeFileSync(join(outdir, 'draw.json'), JSON.stringify({ seed: SEED, files: sorted, frozenSha, drawn, keyIndexHistogram: hist }, null, 1))
  writeFileSync(join(outdir, 'batch.json'), JSON.stringify(batch, null, 1))
  console.log(`  frozenSha ${frozenSha}\n  drawn ${Object.keys(drawn).length} questions; key-index histogram ${hist.join('/')}\n  wrote ${outdir}/draw.json, batch.json (${batch.length} items)`)
}

// deterministic shuffles for render only (independent of the key draw)
function rng(seedStr) { let s = parseInt(sha(seedStr).slice(0, 8), 16); return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff } }
function shuffle(a, r) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[b[i], b[j]] = [b[j], b[i]] } return b }

function build(outdir, ctlDir, cfFiles) {
  const batch = JSON.parse(readFileSync(join(outdir, 'batch.json'), 'utf8'))
  if (!batch.length) die('empty batch')
  const r = rng(`render|${outdir}`)
  const key = {}
  const cand = batch.filter(x => x.subskill !== 'vocabulary-in-context').map(x => {
    const opts = shuffle(x.choices, r)
    return { src: x.id, group: x.set_id, prompt: x.prompt, options: Object.fromEntries(opts.map((c, j) => [L[j], c])), fKey: L[opts.indexOf(x.correct_answer)], pop: 'candidate', subskill: x.subskill }
  })
  const dkey = JSON.parse(readFileSync(join(ctlDir, 'label.key.json'), 'utf8'))
  const live = JSON.parse(readFileSync(join(ctlDir, 'taskF.json'), 'utf8')).filter(x => dkey[x.qid]?.pop === 'live')
  if (live.length !== 48) die(`expected the 48 live control items, got ${live.length}`)
  const pool = [...cand, ...live.map(x => ({ src: `L-${x.qid}`, group: `L-${x.qid.split('-')[0]}`, prompt: x.prompt, options: x.options, fKey: dkey[x.qid].fKey, pop: 'live', subskill: dkey[x.qid].subskill }))]
  let order = null
  for (let t = 0; t < 20000 && !order; t++) { const o = shuffle(pool, r); if (o.every((x, i) => i === 0 || x.group !== o[i - 1].group)) order = o }
  if (!order) die('could not separate siblings')
  order.forEach((x, i) => { const q = `Q${String(i + 1).padStart(2, '0')}`; key[q] = { src: x.src, pop: x.pop, group: x.group, fKey: x.fKey, subskill: x.subskill }; x.qid = q })
  writeFileSync(join(outdir, 'iso.json'), JSON.stringify(order.map(({ qid, prompt, options }) => ({ qid, prompt, options })), null, 1))
  // grouped: all 6 items of a passage (incl. vocab), fresh letters
  const groups = [...new Set(batch.map(x => x.set_id))]
  groups.forEach((g, gi) => {
    const items = batch.filter(x => x.set_id === g).map((x, i) => {
      const opts = shuffle(x.choices, r), qid = `G${gi + 1}-${i + 1}`
      key[qid] = { src: x.id, pop: 'candidate-grouped', group: g, fKey: L[opts.indexOf(x.correct_answer)], subskill: x.subskill }
      return { qid, prompt: x.prompt, options: Object.fromEntries(opts.map((c, j) => [L[j], c])) }
    })
    writeFileSync(join(outdir, `grp-${gi + 1}.json`), JSON.stringify(items, null, 1))
  })
  // with-source: passage + unmarked shuffled choices
  const ws = groups.map((g, gi) => {
    const items = batch.filter(x => x.set_id === g)
    return { passage_id: `P${gi + 1}`, passage: items[0].passage, questions: items.map((x, i) => {
      const opts = shuffle(x.choices, r), qid = `W${gi + 1}-${i + 1}`
      key[qid] = { src: x.id, pop: 'withsource', group: g, fKey: L[opts.indexOf(x.correct_answer)], subskill: x.subskill }
      return { qid, prompt: x.prompt, options: Object.fromEntries(opts.map((c, j) => [L[j], c])) }
    }) }
  })
  writeFileSync(join(outdir, 'withsource.json'), JSON.stringify(ws, null, 1))
  // cross-version: every version of every slot, in its drawn passage context
  if (cfFiles?.length) {
    const cv = []
    for (const f of cfFiles) {
      const p = JSON.parse(readFileSync(f, 'utf8'))
      const drawnPassage = batch.find(x => x.set_id === p.passage_id)?.passage
      for (const q of p.questions) q.versions.forEach((v, k) => {
        const id = `${q.qid}.v${k}`
        cv.push({ id, passage_id: p.passage_id, question: q.prompt, choices: q.choices, slot_text_shown: v.text, claimed_answer: q.choices[k],
          kills: Object.fromEntries(Object.entries(v.kills).map(([j, x]) => [q.choices[Number(j)], x])),
          passage_with_this_version: p.segments.map(s => typeof s === 'string' ? s : s.slot === q.qid ? `[[${v.text}]]` : `{${s.slot}}`).join('') })
      })
      // fill other slots with the drawn versions so the reviewer reads real prose
      for (const c of cv.filter(c => c.passage_id === p.passage_id)) {
        for (const q of p.questions) {
          const drawnK = q.choices.indexOf(batch.find(x => x.id === q.qid)?.correct_answer)
          if (drawnK >= 0) c.passage_with_this_version = c.passage_with_this_version.replace(`{${q.qid}}`, q.versions[drawnK].text)
        }
      }
      void drawnPassage
    }
    writeFileSync(join(outdir, 'cv.json'), JSON.stringify(cv, null, 1))
  }
  writeFileSync(join(outdir, 'attack.key.json'), JSON.stringify(key, null, 1))
  console.log(`  iso ${order.length} (candidate ${cand.length}, live ${live.length}); grouped files ${groups.length}; withsource ${ws.length} passages; keys ${Object.keys(key).length}`)
}

function score(outdir, args) {
  const key = JSON.parse(readFileSync(join(outdir, 'attack.key.json'), 'utf8'))
  const sets = { iso: [], grp: [], ws: [], cv: [] }
  let cur = null
  for (const a of args) { if (a.startsWith('--')) cur = a.slice(2); else if (cur) sets[cur].push(a) }
  const load = f => { const j = JSON.parse(readFileSync(f, 'utf8')); return j.labels ?? j }
  if (sets.iso.length) {
    const pooled = { candidate: [0, 0], live: [0, 0] }, per = {}
    const nc = Object.values(key).filter(k => k.pop === 'candidate').length, nl = Object.values(key).filter(k => k.pop === 'live').length
    for (const f of sets.iso) {
      const lab = load(f), a = { candidate: [0, 0], live: [0, 0] }, basis = {}
      for (const [q, k] of Object.entries(key)) {
        if (k.pop !== 'candidate' && k.pop !== 'live') continue
        const v = lab[q]; if (!v) continue
        const h = v.pick === k.fKey ? 1 : 0
        a[k.pop][0]++; a[k.pop][1] += h
        if (k.pop === 'candidate') { (per[q] ??= []).push(h); const b = (basis[v.basis] ??= [0, 0]); b[0]++; b[1] += h }
      }
      if (a.candidate[0] !== nc || a.live[0] !== nl) die(`${f}: scorable candidate ${a.candidate[0]}/${nc}, live ${a.live[0]}/${nl}`)
      for (const p of ['candidate', 'live']) { pooled[p][0] += a[p][0]; pooled[p][1] += a[p][1] }
      console.log(`  iso ${f.replace(/^.*\//, '')}: candidate ${a.candidate[1]}/${nc}  live ${a.live[1]}/${nl}  basis ${Object.entries(basis).map(([b, [n, h]]) => `${b} ${h}/${n}`).join(' ')}`)
    }
    const c = 100 * pooled.candidate[1] / pooled.candidate[0], l = 100 * pooled.live[1] / pooled.live[0]
    console.log(`  ISO POOLED (${sets.iso.length} samples of one solver): candidate ${pooled.candidate[1]}/${pooled.candidate[0]} = ${c.toFixed(1)}%  live ${pooled.live[1]}/${pooled.live[0]} = ${l.toFixed(1)}%  (5-choice line 20%)`)
    const unan = Object.values(per).filter(h => h.length === sets.iso.length && h.every(Boolean)).length
    console.log(`  candidate items solved by every sample: ${unan}/${Object.keys(per).length}`)
    let verdict
    if (l > 45 || l < 10) verdict = 'INVALID RUN (control outside 10-45%)'
    else if (c <= 40 && l <= 40) verdict = 'SUPPORTS (<=40%)'
    else if (c >= 60) verdict = 'FAILS (>=60%)'
    else verdict = 'BETWEEN (40-60%): second pilot'
    console.log(`  BAR A: ${verdict}`)
  }
  if (sets.grp.length) {
    let n = 0, h = 0
    for (const f of sets.grp) {
      const lab = load(f); let fn = 0, fh = 0
      for (const [q, v] of Object.entries(lab)) { const k = key[q]; if (!k || k.pop !== 'candidate-grouped') continue; fn++; fh += v.pick === k.fKey ? 1 : 0 }
      if (!fn) die(`${f}: zero scorable grouped items`)
      n += fn; h += fh
      console.log(`  grp ${f.replace(/^.*\//, '')}: ${fh}/${fn}`)
    }
    const expect = Object.values(key).filter(k => k.pop === 'candidate-grouped').length
    console.log(`  GROUPED POOLED: ${h}/${n} = ${(100 * h / n).toFixed(1)}% (expected n = ${expect} x samples)`)
  }
  if (sets.ws.length) {
    const items = Object.entries(key).filter(([, k]) => k.pop === 'withsource')
    const res = {}
    for (const f of sets.ws) {
      const lab = load(f)
      const got = items.filter(([q]) => lab[q]).length
      if (got !== items.length) die(`${f}: ${got}/${items.length} with-source items answered`)
      for (const [q, k] of items) {
        const v = lab[q]; const sd = v.second_defensible && v.second_defensible !== 'none' && v.second_defensible !== v.pick
        ;(res[k.src] ??= []).push({ hit: v.pick === k.fKey, sd, pick: v.pick, key: k.fKey, second: v.second_defensible, note: v.note })
      }
    }
    let pass = 0
    for (const [src, rs] of Object.entries(res)) {
      const ok = rs.every(x => x.hit && !x.sd); if (ok) pass++
      if (!ok) console.log(`  WS FAIL ${src}: ${rs.map(x => `pick ${x.pick} key ${x.key} second ${x.second}${x.note ? ' — ' + x.note : ''}`).join(' | ')}`)
    }
    console.log(`  BAR C: ${pass}/${Object.keys(res).length} items pass with-source exclusivity (${sets.ws.length} graders)`)
  }
  if (sets.cv.length) {
    for (const f of sets.cv) {
      const lab = load(f); const ids = Object.keys(lab)
      if (!ids.length) die(`${f}: empty`)
      const bad = ids.filter(i => lab[i].valid !== true)
      bad.forEach(i => console.log(`  CV FAIL ${i}: ${lab[i].reason ?? ''}`))
      console.log(`  BAR D (${f.replace(/^.*\//, '')}): ${ids.length - bad.length}/${ids.length} versions valid`)
    }
  }
}

const [cmd, ...rest] = process.argv.slice(2)
if (import.meta.url === `file://${process.argv[1]}`) {
  if (cmd === 'verify') { if (!rest.length) die('no files'); verify(rest) }
  else if (cmd === 'draw') { const [out, ...f] = rest; if (!f.length) die('no files'); draw(out, f) }
  else if (cmd === 'build') {
    const out = rest[0]; const ci = rest.indexOf('--ctl'); const fi = rest.indexOf('--cf')
    const ctl = ci >= 0 ? rest[ci + 1] : join(HERE, 'ssat-reading-diag')
    build(out, ctl, fi >= 0 ? rest.slice(fi + 1) : [])
  }
  else if (cmd === 'score') score(rest[0], rest.slice(1))
  else die('usage: verify | draw | build | score')
}
