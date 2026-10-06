#!/usr/bin/env node
/**
 * ssat-wv.mjs — whole-passage-variant SSAT Reading (SSAT-READING-WV-PREREGISTERED.md).
 * Pilot 2, after the counterfactual-slot pilot (ssat-cf.mjs, A76) failed naturalness.
 *
 *   verify <a.wv.json>...            mechanical gate; refuses (exit 2) on any violation.
 *   draw   <outdir> <a.wv.json>...   frozenSha over the files (sorted path order), the
 *                                    pre-registered k(passage_id), bank-shaped batch.json + draw.json.
 *   build  <outdir> --wv <a.wv.json>... [--ctl <ssat-reading-diag dir>] [--fixtures <naturalness.json>]
 *                                    iso.json (candidate non-vocab items shuffled into the same 48
 *                                    live control items as A69/A73/A76), grp-N.json, withsource.json,
 *                                    cv.json (every version x every question), naturalness.json,
 *                                    attack.key.json + naturalness.key.json.
 *   score  <outdir> --iso <f>... [--grp <f>...] [--ws <f>...] [--cv <f>...] [--nat <f>...] [--nat3 <f>...]
 *   (pilot 3: build --natlive <natlive.json> writes the relative-naturalness file; score --nat3 applies
 *    SSAT-READING-WV3-PREREGISTERED.md bar E: pooled candidate median >= pooled live median)
 *   null   <outdir> --iso <f>...     exact null of the pooled iso candidate hits over all 5^P draws,
 *                                    picks held fixed (reported, not a bar).
 *
 * Unit: one passage_id, FIVE complete passages (versions), ONE fixed set of 6 questions x 5
 * choices. Version k makes choice k the answer to EVERY question (so every choice of every
 * question is correct in exactly one version). Every scorer refuses on a short population.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const L = 'ABCDE'
const SEED = 'ssat-wv-2026-10-06'
const KINDS = ['main-idea', 'detail', 'inference', 'vocabulary-in-context', 'attitude', 'purpose']
const NEG = /\b(not|no|never|nothing|nor|none|neither|nobody|nowhere)\b|n't\b/gi
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const sha = b => createHash('sha256').update(b).digest('hex')
const words = s => String(s).trim().split(/\s+/).filter(Boolean).length
const norm = s => String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim()
const STOP = new Set('the a an of to in on and or for with by at from as that this which who whom whose was were is are be been his her their its it he she they them him one what how why when chiefly most best passage author writer narrator'.split(' '))
const content = s => norm(s).replace(/[^a-z' ]/g, ' ').split(' ').filter(w => w.length > 3 && !STOP.has(w))

export function kOf(frozenSha, pid) {
  return parseInt(sha(`${SEED}|${frozenSha}|${pid}`).slice(0, 8), 16) % 5
}

function verify(files, { quiet = false } = {}) {
  const problems = [], notes = []
  const passages = files.map(f => ({ f, p: JSON.parse(readFileSync(f, 'utf8')) }))
  for (const { f, p } of passages) {
    const id = p.passage_id ?? f
    if (!Array.isArray(p.versions) || !Array.isArray(p.questions)) { problems.push(`${id}: versions/questions missing`); continue }
    if (p.versions.length !== 5) { problems.push(`${id}: ${p.versions.length} versions (need 5)`); continue }
    if (new Set(p.versions.map(v => norm(v.text))).size !== 5) problems.push(`${id}: versions not distinct`)
    const vl = p.versions.map(v => words(v.text))
    vl.forEach((n, k) => { if (n < 270 || n > 380) problems.push(`${id} v${k}: ${n} words, outside 270-380`) })
    if (Math.max(...vl) / Math.min(...vl) > 1.35) problems.push(`${id}: version word ratio ${(Math.max(...vl) / Math.min(...vl)).toFixed(2)} > 1.35`)
    const negs = []
    p.versions.forEach((v, k) => {
      const paras = v.text.split(/\n\s*\n/).filter(x => x.trim())
      if (paras.length < 3 || paras.length > 6) problems.push(`${id} v${k}: ${paras.length} paragraphs (need 3-6)`)
      const pn = paras.map(x => (x.match(NEG) ?? []).length)
      pn.forEach((n, i) => { if (n > 1) problems.push(`${id} v${k} para ${i + 1}: ${n} negation tokens (max 1 per paragraph: no denial runs)`) })
      negs.push(pn.reduce((a, b) => a + b, 0))
    })
    if (p.questions.length !== 6) problems.push(`${id}: ${p.questions.length} questions (need 6)`)
    const kinds = p.questions.map(q => q.kind).sort().join(',')
    if (kinds !== [...KINDS].sort().join(',')) problems.push(`${id}: kinds ${kinds} (need one each of ${KINDS.join(', ')})`)
    let named = 0, nk = 0, lexHits = 0, lexN = 0
    for (const q of p.questions) {
      const tag = `${id}/${q.qid}`
      if (!q.qid?.startsWith(`${id}-`)) problems.push(`${tag}: qid must start with ${id}-`)
      if (!q.prompt?.trim()) problems.push(`${tag}: empty prompt`)
      if (q.choices?.length !== 5) { problems.push(`${tag}: ${q.choices?.length} choices`); continue }
      if (new Set(q.choices.map(norm)).size !== 5) problems.push(`${tag}: choices not distinct`)
      const cl = q.choices.map(c => c.length)
      if (Math.max(...cl) / Math.min(...cl) > 1.6) problems.push(`${tag}: choice length ratio ${(Math.max(...cl) / Math.min(...cl)).toFixed(2)} > 1.6`)
      if (q.kind === 'vocabulary-in-context') {
        const w = (q.prompt.match(/["“]([^"”]+)["”]/) ?? [])[1]
        if (!w) problems.push(`${tag}: vocabulary stem must quote the word`)
        else p.versions.forEach((v, k) => { if (!new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(v.text)) problems.push(`${tag} v${k}: vocabulary word "${w}" absent`) })
      }
      if (q.support?.length !== 5) { problems.push(`${tag}: ${q.support?.length} support entries (need 5, one per version)`); continue }
      q.support.forEach((s, k) => {
        const T = norm(p.versions[k].text)
        if (!s.why || !T.includes(norm(s.why))) problems.push(`${tag} v${k}: why not verbatim in version ${k}`)
        if (s.kills?.[String(k)]) problems.push(`${tag} v${k}: kills its own choice`)
        for (let j = 0; j < 5; j++) {
          if (j === k) continue
          const kill = s.kills?.[String(j)]
          if (!kill?.quote || !kill?.reason) { problems.push(`${tag} v${k}: kill for choice ${j} missing quote/reason`); continue }
          if (!['refute', 'mention'].includes(kill.kind)) problems.push(`${tag} v${k}: kill ${j} kind must be refute|mention`)
          if (!T.includes(norm(kill.quote))) problems.push(`${tag} v${k}: kill quote for choice ${j} not verbatim in version ${k}`)
          nk++; if (kill.kind === 'mention') named++
        }
        // lexical word-match solver (reported): choice with most content words present in the version
        if (q.kind !== 'vocabulary-in-context') {
          const Tw = new Set(content(p.versions[k].text))
          const sc = q.choices.map(c => { const cw = content(c); return cw.length ? cw.filter(w => Tw.has(w)).length / cw.length : 0 })
          const mx = Math.max(...sc), top = sc.map((x, i) => x === mx ? i : -1).filter(i => i >= 0)
          lexN++; lexHits += top.includes(k) ? 1 / top.length : 0
        }
      })
    }
    for (const q of p.questions) for (const o of p.questions) {
      if (o === q) continue
      const stem = new Set(content(o.prompt))
      for (const c of q.choices ?? []) {
        const own = content(c).filter(w => stem.has(w) && !(q.choices.filter(x => x !== c).some(x => content(x).includes(w))))
        if (own.length) problems.push(`${id}: stem of ${o.qid} contains "${own.join(',')}", unique to one choice of ${q.qid}`)
      }
    }
    notes.push(`${id}: words ${vl.join('/')}; negations per version ${negs.join('/')}; kills naming the rival ${named}/${nk}; lexical word-match solver ${lexHits.toFixed(1)}/${lexN} (20% = ${(lexN / 5).toFixed(1)})`)
  }
  if (!quiet) notes.forEach(n => console.log('  ' + n))
  if (problems.length) { problems.forEach(x => console.log('  PROBLEM ' + x)); die(`${problems.length} mechanical problem(s)`) }
  console.log(`  verify OK: ${passages.length} passage(s), ${passages.reduce((a, x) => a + x.p.questions.length, 0)} questions, ${passages.length * 5} versions, ${passages.reduce((a, x) => a + x.p.questions.length * 5 * 4, 0)} kill quotes verbatim`)
  return passages
}

function draw(outdir, files) {
  const sorted = [...files].sort()
  const passages = verify(sorted, { quiet: true })
  const frozenSha = sha(Buffer.concat(sorted.map(f => readFileSync(f))))
  mkdirSync(outdir, { recursive: true })
  const drawn = {}, batch = []
  for (const { p } of passages) {
    const k = drawn[p.passage_id] = kOf(frozenSha, p.passage_id)
    for (const q of p.questions) {
      const s = q.support[k]
      batch.push({
        id: q.qid, set_id: p.passage_id, passageGroupId: `wv-${p.passage_id}`, genre: p.genre, version: k,
        subskill: q.kind, difficulty: q.difficulty ?? 'medium', passage: p.versions[k].text, prompt: q.prompt,
        choices: q.choices, correct_answer: q.choices[k], explanation: s.why,
        kills: Object.fromEntries(Object.entries(s.kills).map(([j, x]) => [q.choices[Number(j)], x.quote])),
      })
    }
  }
  const hist = [0, 0, 0, 0, 0]; Object.values(drawn).forEach(k => hist[k]++)
  writeFileSync(join(outdir, 'draw.json'), JSON.stringify({ seed: SEED, files: sorted, frozenSha, drawn, versionHistogram: hist }, null, 1))
  writeFileSync(join(outdir, 'batch.json'), JSON.stringify(batch, null, 1))
  console.log(`  frozenSha ${frozenSha}\n  drawn ${Object.keys(drawn).length} passages; version histogram ${hist.join('/')}\n  wrote ${outdir}/draw.json, batch.json (${batch.length} items)`)
}

function rng(seedStr) { let s = parseInt(sha(seedStr).slice(0, 8), 16); return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff } }
function shuffle(a, r) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[b[i], b[j]] = [b[j], b[i]] } return b }
function dealer(n, r) { const d = []; while (d.length < n) d.push(...shuffle([...L], r)); let i = 0; return () => d[i++] }
function placeKey(choices, key, letter, r) { const rest = shuffle(choices.filter(c => c !== key), r); rest.splice(L.indexOf(letter), 0, key); return rest }

function build(outdir, ctlDir, wvFiles, fixturesFile, natLiveFile) {
  const batch = JSON.parse(readFileSync(join(outdir, 'batch.json'), 'utf8'))
  if (!batch.length) die('empty batch')
  const r = rng(`render|${outdir}`)
  const key = {}
  const nonVocab = batch.filter(x => x.subskill !== 'vocabulary-in-context')
  const dealC = dealer(nonVocab.length, r)
  const cand = nonVocab.map(x => {
    const opts = placeKey(x.choices, x.correct_answer, dealC(), r)
    return { src: x.id, group: x.set_id, prompt: x.prompt, options: Object.fromEntries(opts.map((c, j) => [L[j], c])), fKey: L[opts.indexOf(x.correct_answer)], pop: 'candidate', subskill: x.subskill, choiceIdx: Object.fromEntries(opts.map((c, j) => [L[j], x.choices.indexOf(c)])) }
  })
  const dkey = JSON.parse(readFileSync(join(ctlDir, 'label.key.json'), 'utf8'))
  const live = JSON.parse(readFileSync(join(ctlDir, 'taskF.json'), 'utf8')).filter(x => dkey[x.qid]?.pop === 'live')
  if (live.length !== 48) die(`expected the 48 live control items, got ${live.length}`)
  const pool = [...cand, ...live.map(x => ({ src: `L-${x.qid}`, group: `L-${x.qid.split('-')[0]}`, prompt: x.prompt, options: x.options, fKey: dkey[x.qid].fKey, pop: 'live', subskill: dkey[x.qid].subskill }))]
  let order = null
  for (let t = 0; t < 20000 && !order; t++) { const o = shuffle(pool, r); if (o.every((x, i) => i === 0 || x.group !== o[i - 1].group)) order = o }
  if (!order) die('could not separate siblings')
  order.forEach((x, i) => { const q = `Q${String(i + 1).padStart(2, '0')}`; key[q] = { src: x.src, pop: x.pop, group: x.group, fKey: x.fKey, subskill: x.subskill, ...(x.choiceIdx ? { choiceIdx: x.choiceIdx } : {}) }; x.qid = q })
  writeFileSync(join(outdir, 'iso.json'), JSON.stringify(order.map(({ qid, prompt, options }) => ({ qid, prompt, options })), null, 1))
  const groups = [...new Set(batch.map(x => x.set_id))]
  const dealG = dealer(batch.length, r)
  groups.forEach((g, gi) => {
    const items = batch.filter(x => x.set_id === g).map((x, i) => {
      const opts = placeKey(x.choices, x.correct_answer, dealG(), r), qid = `G${gi + 1}-${i + 1}`
      key[qid] = { src: x.id, pop: 'candidate-grouped', group: g, fKey: L[opts.indexOf(x.correct_answer)], subskill: x.subskill }
      return { qid, prompt: x.prompt, options: Object.fromEntries(opts.map((c, j) => [L[j], c])) }
    })
    writeFileSync(join(outdir, `grp-${gi + 1}.json`), JSON.stringify(items, null, 1))
  })
  const dealW = dealer(batch.length, r)
  const ws = groups.map((g, gi) => {
    const items = batch.filter(x => x.set_id === g)
    return { passage_id: `P${gi + 1}`, passage: items[0].passage, questions: items.map((x, i) => {
      const opts = placeKey(x.choices, x.correct_answer, dealW(), r), qid = `W${gi + 1}-${i + 1}`
      key[qid] = { src: x.id, pop: 'withsource', group: g, fKey: L[opts.indexOf(x.correct_answer)], subskill: x.subskill }
      return { qid, prompt: x.prompt, options: Object.fromEntries(opts.map((c, j) => [L[j], c])) }
    }) }
  })
  writeFileSync(join(outdir, 'withsource.json'), JSON.stringify(ws, null, 1))
  if (wvFiles?.length) {
    const cv = []
    for (const f of wvFiles) {
      const p = JSON.parse(readFileSync(f, 'utf8'))
      p.versions.forEach((v, k) => cv.push({ id: `${p.passage_id}.v${k}`, passage: v.text, questions: p.questions.map(q => ({
        id: `${q.qid}.v${k}`, question: q.prompt, choices: q.choices, claimed_answer: q.choices[k],
        kills: Object.fromEntries(Object.entries(q.support[k].kills).map(([j, x]) => [q.choices[Number(j)], x])),
      })) }))
    }
    writeFileSync(join(outdir, 'cv.json'), JSON.stringify(cv, null, 1))
  }
  if (fixturesFile) {
    const fx = JSON.parse(readFileSync(fixturesFile, 'utf8')), fkey = JSON.parse(readFileSync(fixturesFile.replace(/\.json$/, '.key.json'), 'utf8'))
    const fixtures = fx.filter(x => /^rw-RW[34]-/.test(fkey[x.id])).map(x => ({ src: fkey[x.id], passage: x.passage }))
    if (fixtures.length !== 2 || !fixtures.some(x => x.src === 'rw-RW4-S09')) die('naturalness fixtures: need rw-RW4-S09 and rw-RW3-S01')
    const nat = shuffle([...groups.map(g => ({ src: g, passage: batch.find(x => x.set_id === g).passage })), ...fixtures], r)
    const nkey = {}
    writeFileSync(join(outdir, 'naturalness.json'), JSON.stringify(nat.map((x, i) => { nkey[`N${i + 1}`] = x.src; return { id: `N${i + 1}`, passage: x.passage } }), null, 1))
    writeFileSync(join(outdir, 'naturalness.key.json'), JSON.stringify(nkey, null, 1))
  }
  if (natLiveFile) {
    // pilot 3 (SSAT-READING-WV3-PREREGISTERED.md): drawn candidates + >= 4 live s2/s3/s4 passages, unlabelled, shuffled
    const lv = JSON.parse(readFileSync(natLiveFile, 'utf8'))
    if (lv.length < 4 || lv.some(x => !/^rw-RW/.test(x.src) || !x.passage?.trim())) die('natlive: need >= 4 live rw-RW passages with text')
    const nat = shuffle([...groups.map(g => ({ src: g, passage: batch.find(x => x.set_id === g).passage })), ...lv.map(x => ({ src: x.src, passage: x.passage }))], r)
    const nkey = {}
    writeFileSync(join(outdir, 'naturalness.json'), JSON.stringify(nat.map((x, i) => { nkey[`N${i + 1}`] = x.src; return { id: `N${i + 1}`, passage: x.passage } }), null, 1))
    writeFileSync(join(outdir, 'naturalness.key.json'), JSON.stringify(nkey, null, 1))
  }
  writeFileSync(join(outdir, 'attack.key.json'), JSON.stringify(key, null, 1))
  console.log(`  iso ${order.length} (candidate ${cand.length}, live ${live.length}); grouped files ${groups.length}; withsource ${ws.length} passages; keys ${Object.keys(key).length}`)
}

const load = f => { const j = JSON.parse(readFileSync(f, 'utf8')); return j.labels ?? j }
const RANK = { easy: 1, medium: 2, hard: 3 }

function score(outdir, args) {
  const key = JSON.parse(readFileSync(join(outdir, 'attack.key.json'), 'utf8'))
  const sets = { iso: [], grp: [], ws: [], cv: [], nat: [], nat3: [] }
  let cur = null
  for (const a of args) { if (a.startsWith('--')) cur = a.slice(2); else if (cur) sets[cur].push(a) }
  const verdicts = {}
  if (sets.iso.length) {
    const pooled = { candidate: [0, 0], live: [0, 0] }, per = {}
    const nc = Object.values(key).filter(k => k.pop === 'candidate').length, nl = Object.values(key).filter(k => k.pop === 'live').length
    for (const f of sets.iso) {
      const lab = load(f), a = { candidate: [0, 0], live: [0, 0] }
      for (const [q, k] of Object.entries(key)) {
        if (k.pop !== 'candidate' && k.pop !== 'live') continue
        const v = lab[q]; if (!v || !L.includes(v.pick)) continue
        const h = v.pick === k.fKey ? 1 : 0
        a[k.pop][0]++; a[k.pop][1] += h
        if (k.pop === 'candidate') (per[q] ??= []).push(h)
      }
      if (a.candidate[0] !== nc || a.live[0] !== nl) die(`${f}: scorable candidate ${a.candidate[0]}/${nc}, live ${a.live[0]}/${nl}`)
      for (const p of ['candidate', 'live']) { pooled[p][0] += a[p][0]; pooled[p][1] += a[p][1] }
      console.log(`  iso ${f.replace(/^.*\//, '')}: candidate ${a.candidate[1]}/${nc}  live ${a.live[1]}/${nl}`)
    }
    if (sets.iso.length !== 3) console.log(`  NOTE: ${sets.iso.length} iso samples; the bar is pre-registered on 3`)
    const c = 100 * pooled.candidate[1] / pooled.candidate[0], l = 100 * pooled.live[1] / pooled.live[0]
    console.log(`  ISO POOLED (${sets.iso.length} samples of one solver): candidate ${pooled.candidate[1]}/${pooled.candidate[0]} = ${c.toFixed(1)}%  live ${pooled.live[1]}/${pooled.live[0]} = ${l.toFixed(1)}%  (5-choice line 20%)`)
    console.log(`  candidate items solved by every sample: ${Object.values(per).filter(h => h.length === sets.iso.length && h.every(Boolean)).length}/${Object.keys(per).length}`)
    let v
    if (l > 45 || l < 10) v = 'INVALID'
    else if (c <= 40 && l <= 40) v = 'SUPPORTS'
    else if (c >= 60) v = 'FAILS'
    else v = 'BETWEEN'
    verdicts.A = v
    console.log(`  BAR A: ${v}${v === 'BETWEEN' ? ' (pilot 2: counts as not passing; no third pilot)' : ''}`)
  }
  if (sets.grp.length) {
    let n = 0, h = 0
    const expect = Object.values(key).filter(k => k.pop === 'candidate-grouped').length
    for (const f of sets.grp) {
      const lab = load(f); let fn = 0, fh = 0
      for (const [q, v] of Object.entries(lab)) { const k = key[q]; if (!k || k.pop !== 'candidate-grouped' || !L.includes(v.pick)) continue; fn++; fh += v.pick === k.fKey ? 1 : 0 }
      if (!fn) die(`${f}: zero scorable grouped items`)
      n += fn; h += fh
      console.log(`  grp ${f.replace(/^.*\//, '')}: ${fh}/${fn}`)
    }
    if (n % expect) die(`grouped scorable ${n} is not a multiple of ${expect}: a file is short`)
    const g = 100 * h / n
    verdicts.B = g <= 40 ? 'PASS' : 'FAIL'
    console.log(`  BAR B GROUPED POOLED: ${h}/${n} = ${g.toFixed(1)}% (${n / expect} samples x ${expect}) -> ${verdicts.B} (<=40%)`)
  }
  if (sets.ws.length) {
    const items = Object.entries(key).filter(([, k]) => k.pop === 'withsource')
    if (!items.length) die('no with-source items in key')
    const res = {}
    for (const f of sets.ws) {
      const lab = load(f)
      const got = items.filter(([q]) => lab[q] && RANK[lab[q].difficulty]).length
      if (got !== items.length) die(`${f}: ${got}/${items.length} with-source items answered with a difficulty`)
      for (const [q, k] of items) {
        const v = lab[q]; const sd = v.second_defensible && v.second_defensible !== 'none' && v.second_defensible !== v.pick
        ;(res[k.src] ??= []).push({ hit: v.pick === k.fKey, sd, pick: v.pick, key: k.fKey, second: v.second_defensible, diff: v.difficulty, note: v.note })
      }
    }
    let pass = 0, easy = 0
    for (const [src, rs] of Object.entries(res)) {
      const ok = rs.every(x => x.hit && !x.sd); if (ok) pass++
      const med = rs.reduce((a, x) => a + RANK[x.diff], 0) / rs.length
      if (med <= 1.5) easy++
      if (!ok) console.log(`  WS FAIL ${src}: ${rs.map(x => `pick ${x.pick} key ${x.key} second ${x.second}${x.note ? ' — ' + x.note : ''}`).join(' | ')}`)
    }
    const n = Object.keys(res).length
    verdicts.C = pass >= Math.ceil(n * 10 / 12) ? 'PASS' : 'FAIL'
    verdicts.F = easy <= n / 2 ? 'PASS' : 'FAIL'
    console.log(`  BAR C: ${pass}/${n} items pass with-source exclusivity (${sets.ws.length} graders) -> ${verdicts.C} (>= 10/12)`)
    console.log(`  BAR F (difficulty): ${easy}/${n} items grader-median easy (mean rank <= 1.5) -> ${verdicts.F} (<= 50%)`)
  }
  if (sets.cv.length) {
    for (const f of sets.cv) {
      const lab = load(f); const ids = Object.keys(lab)
      if (!ids.length) die(`${f}: empty`)
      const bad = ids.filter(i => lab[i].valid !== true)
      bad.forEach(i => console.log(`  CV FAIL ${i}: ${lab[i].reason ?? ''}`))
      verdicts.D = ids.length - bad.length >= Math.ceil(ids.length * 0.9) ? 'PASS' : 'FAIL'
      console.log(`  BAR D (${f.replace(/^.*\//, '')}): ${ids.length - bad.length}/${ids.length} question-versions valid -> ${verdicts.D} (>= 90%)`)
    }
  }
  if (sets.nat.length) {
    const nkey = JSON.parse(readFileSync(join(outdir, 'naturalness.key.json'), 'utf8'))
    const inv = Object.fromEntries(Object.entries(nkey).map(([n, s]) => [s, n]))
    const cands = Object.values(nkey).filter(s => !/^rw-/.test(s))
    const valid = []
    for (const f of sets.nat) {
      const lab = load(f)
      if (Object.keys(nkey).some(n => !lab[n] || !(lab[n].rating >= 1 && lab[n].rating <= 5))) die(`${f}: missing ratings`)
      const s4 = lab[inv['rw-RW4-S09']]
      const ok = s4.constructed === true
      console.log(`  nat ${f.replace(/^.*\//, '')}: s4 fixture ${s4.rating} flagged=${s4.constructed} -> ${ok ? 'valid' : 'DISCARD'}; ${Object.entries(nkey).map(([n, s]) => `${s} ${lab[n].rating}${lab[n].constructed ? 'F' : ''}`).join(', ')}`)
      if (ok) valid.push(lab)
    }
    if (valid.length < 2) { verdicts.E = 'INCOMPLETE'; console.log('  BAR E: fewer than 2 valid judges') }
    else {
      const s4m = valid.reduce((a, l) => a + l[inv['rw-RW4-S09']].rating, 0) / valid.length
      let ok = true
      for (const c of cands) {
        const rs = valid.map(l => l[inv[c]]), m = rs.reduce((a, x) => a + x.rating, 0) / rs.length, fl = rs.some(x => x.constructed)
        const pass = !fl && m >= 4 && m - s4m >= 1
        if (!pass) ok = false
        console.log(`  E ${c}: mean ${m.toFixed(1)} flagged ${fl} vs s4 ${s4m.toFixed(1)} -> ${pass ? 'pass' : 'FAIL'}`)
      }
      verdicts.E = ok ? 'PASS' : 'FAIL'
      console.log(`  BAR E: ${verdicts.E}`)
    }
  }
  if (sets.nat3.length) {
    // pilot 3 relative bar: median of pooled candidate ratings >= median of pooled live ratings (valid judges only)
    const nkey = JSON.parse(readFileSync(join(outdir, 'naturalness.key.json'), 'utf8'))
    const ids = Object.keys(nkey), isLive = n => /^rw-/.test(nkey[n])
    const nc = ids.filter(n => !isLive(n)).length, nl = ids.filter(isLive).length
    if (nc < 1 || nl < 4) die(`naturalness key: ${nc} candidates, ${nl} live (need >= 4 live)`)
    const med = a => { const b = [...a].sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2 }
    const valid = []
    for (const f of sets.nat3) {
      const lab = load(f)
      const bad = ids.filter(n => !lab[n] || !Number.isInteger(lab[n].rating) || lab[n].rating < 1 || lab[n].rating > 5 || !String(lab[n].reason ?? '').trim())
      const flat = new Set(ids.map(n => lab[n]?.rating)).size === 1
      const ok = !bad.length && !flat
      console.log(`  nat3 ${f.replace(/^.*\//, '')}: ${ids.length - bad.length}/${ids.length} rated with a reason${flat ? ', ALL IDENTICAL' : ''} -> ${ok ? 'valid' : 'DISCARD'}; ${ids.map(n => `${nkey[n]} ${lab[n]?.rating}`).join(', ')}`)
      if (ok) valid.push(lab)
    }
    if (valid.length < 2) { verdicts.E = 'INCOMPLETE'; console.log('  BAR E: fewer than 2 valid judges') }
    else {
      const cr = valid.flatMap(l => ids.filter(n => !isLive(n)).map(n => l[n].rating)), lr = valid.flatMap(l => ids.filter(isLive).map(n => l[n].rating))
      const cm = med(cr), lm = med(lr)
      for (const n of ids.filter(n => !isLive(n))) console.log(`  E ${nkey[n]}: ${valid.map(l => l[n].rating).join('/')}`)
      console.log(`  E pooled medians: candidate ${cm} (n=${cr.length})  live ${lm} (n=${lr.length})`)
      if (lm <= 1) { verdicts.E = 'INVALID'; console.log('  BAR E: INVALID: live median 1 leaves the bar unable to fail (floor)') }
      else { verdicts.E = cm >= lm ? 'PASS' : 'FAIL'; console.log(`  BAR E: ${verdicts.E} (candidate median >= live median)`) }
    }
  }
  console.log(`  VERDICTS ${JSON.stringify(verdicts)}`)
}

// exact null for the iso candidate: picks fixed, key = choice index k(passage) over all 5^P draws
function nullDist(outdir, args) {
  const key = JSON.parse(readFileSync(join(outdir, 'attack.key.json'), 'utf8'))
  const files = args.filter(a => !a.startsWith('--'))
  const labs = files.map(load)
  const cq = Object.entries(key).filter(([, k]) => k.pop === 'candidate')
  const groups = [...new Set(cq.map(([, k]) => k.group))]
  // hits per group per version
  const per = groups.map(g => [0, 1, 2, 3, 4].map(v => cq.filter(([, k]) => k.group === g).reduce((a, [q, k]) => a + labs.reduce((b, l) => b + (k.choiceIdx[l[q]?.pick] === v ? 1 : 0), 0), 0)))
  let dist = { 0: 1 }
  for (const pv of per) { const nd = {}; for (const [h, c] of Object.entries(dist)) for (const x of pv) nd[+h + x] = (nd[+h + x] ?? 0) + c / 5; dist = nd }
  const n = cq.length * labs.length
  const obs = cq.reduce((a, [q, k]) => a + labs.reduce((b, l) => b + (l[q]?.pick === k.fKey ? 1 : 0), 0), 0)
  const mean = Object.entries(dist).reduce((a, [h, p]) => a + h * p, 0)
  const pge = Object.entries(dist).filter(([h]) => +h >= obs).reduce((a, [, p]) => a + p, 0)
  const bar = Math.ceil(0.4 * n + 1e-9)
  const pbar = Object.entries(dist).filter(([h]) => +h > 0.4 * n).reduce((a, [, p]) => a + p, 0)
  console.log(`  exact null over 5^${groups.length} draws: observed ${obs}/${n}; mean ${mean.toFixed(1)} (${(100 * mean / n).toFixed(1)}%); P(>= observed) = ${pge.toFixed(3)}; P(> 40%, i.e. >= ${bar}) = ${pbar.toFixed(3)}`)
}

const [cmd, ...rest] = process.argv.slice(2)
if (import.meta.url === `file://${process.argv[1]}`) {
  const after = flag => { const i = rest.indexOf(flag); if (i < 0) return []; const out = []; for (let j = i + 1; j < rest.length && !rest[j].startsWith('--'); j++) out.push(rest[j]); return out }
  if (cmd === 'verify') { if (!rest.length) die('no files'); verify(rest) }
  else if (cmd === 'draw') { const [out, ...f] = rest; if (!f.length) die('no files'); draw(out, f) }
  else if (cmd === 'build') build(rest[0], after('--ctl')[0] ?? join(HERE, 'ssat-reading-diag'), after('--wv'), after('--fixtures')[0], after('--natlive')[0])
  else if (cmd === 'score') score(rest[0], rest.slice(1))
  else if (cmd === 'null') nullDist(rest[0], rest.slice(1))
  else die('usage: verify | draw | build | score | null')
}
