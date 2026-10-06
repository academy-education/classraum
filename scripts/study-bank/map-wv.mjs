#!/usr/bin/env node
/**
 * map-wv.mjs: whole-passage-variant comprehension for the MAP pilot, batch 3
 * (MAP-PILOT-3-2026-10-06.prereg.md, strand 2). A MAP copy of ssat-wv.mjs
 * (SSAT pilots A76-A78 and the pilot-4 rules), resized to MAP's shape:
 * FOUR versions, FOUR choices, FIVE questions, grade 5-7 prose.
 *
 *   verify <a.wv.json>...          mechanical gate; refuses (exit 2) on any violation
 *   draw   <outdir> <a.wv.json>... frozenSha over the files (sorted path order),
 *                                  k(passage_id) = sha256(SEED|frozenSha|pid)[0:8] mod 4;
 *                                  writes draw.json + batch.json (bank-shaped, drawn version only)
 *   build  <outdir> --wv <a.wv.json>... --natctl <batch.json>
 *                                  cv.json (every version x every question) and
 *                                  naturalness.json (+ .key.json): the drawn candidate passages
 *                                  shuffled with the batch-2 comprehension passages (the control)
 *   score  <outdir> [--cv <f>] [--nat <f>...]
 *                                  bar D (cross-version validity) and bar E (relative naturalness)
 *   --selftest                     break-tests verify and both scorers before any author runs
 *
 * Unit: one passage_id, FOUR complete passages, ONE fixed set of 5 questions x 4 choices.
 * Version k makes choice k the answer to EVERY question, so every choice of every
 * question is correct in exactly one version. Over the uniform draw the expected
 * options-only hit rate is exactly 25% whatever the solver picks; what the draw cannot
 * protect is the WITH-SOURCE half (easy word-matches, flat dismissals) and naturalness,
 * which is where SSAT pilots 1-3 failed. Every scorer refuses on a short population.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { readability } from './map-pilot-checks.mjs'

export const NV = 4
const L = 'ABCD'
export const SEED = 'map-wv-2026-10-06'
export const KINDS = ['theme', 'central-idea', 'summary', 'inference', 'point-of-view', 'attitude', 'purpose', 'structure', 'vocabulary-in-context']
export const MIX = [
  ['vocabulary-in-context', ['vocabulary-in-context'], 1, 1],
  ['theme or central-idea', ['theme', 'central-idea'], 1, 1],
  ['summary', ['summary'], 0, 1],
  ['inference', ['inference'], 1, 3],
  ['point-of-view / attitude / purpose / structure', ['point-of-view', 'attitude', 'purpose', 'structure'], 1, 3],
]
export const WORDS = [190, 320], WRATIO = 1.3, FK = [4.0, 9.0]
const NEG = /\b(not|no|never|nothing|nor|none|neither|nobody|nowhere)\b|n't\b/gi
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const sha = b => createHash('sha256').update(b).digest('hex')
const words = s => String(s).trim().split(/\s+/).filter(Boolean).length
const norm = s => String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim()
const STOP = new Set('the a an of to in on and or for with by at from as that this which who whom whose was were is are be been his her their its it he she they them him one what how why when chiefly most best passage author writer narrator story'.split(' '))
const content = s => norm(s).replace(/[^a-z' ]/g, ' ').split(' ').filter(w => w.length > 3 && !STOP.has(w))
const GENERIC = new Set('show shows describe describes explain explains illustrate illustrates introduce introduces suggest suggests reveal reveals emphasize emphasizes contrast compare provide provides offer offers present presents recount recounts recall recalls account example give gives point reader readers establish establishes indicate indicates highlight highlights note notes stress stresses primarily serves serve mainly concerned where more into than there then been have would could about after before over some only also what other such each every very much made make makes take took became become becomes most many under upon them once just even still paragraph paragraphs feels felt'.split(' '))
const stemW = w => w.replace(/'s$/, '').replace(/'/g, '')
const stemEq = (a, b) => { const n = Math.min(5, a.length, b.length); return n >= 4 && a.slice(0, n) === b.slice(0, n) }
const cw = s => [...new Set(content(s).map(stemW).filter(w => w.length > 3 && !STOP.has(w) && !GENERIC.has(w)))]
export function distinctive(choices, j) {
  const others = choices.filter((_, i) => i !== j).map(cw)
  return cw(choices[j]).filter(w => !others.every(o => o.some(x => stemEq(x, w))))
}
const present = (w, textWords) => textWords.some(t => stemEq(t, w))
export const kOf = (frozenSha, pid) => parseInt(sha(`${SEED}|${frozenSha}|${pid}`).slice(0, 8), 16) % NV

export function verifyUnits(units) {
  const problems = [], notes = []
  for (const { f, p } of units) {
    const id = p.passage_id ?? f
    if (!Array.isArray(p.versions) || !Array.isArray(p.questions)) { problems.push(`${id}: versions/questions missing`); continue }
    if (p.versions.length !== NV) { problems.push(`${id}: ${p.versions.length} versions (need ${NV})`); continue }
    if (new Set(p.versions.map(v => norm(v.text))).size !== NV) problems.push(`${id}: versions not distinct`)
    if (!['literary', 'informational'].includes(p.text_type)) problems.push(`${id}: text_type must be literary|informational`)
    const vl = p.versions.map(v => words(v.text))
    vl.forEach((n, k) => { if (n < WORDS[0] || n > WORDS[1]) problems.push(`${id} v${k}: ${n} words, outside ${WORDS[0]}-${WORDS[1]}`) })
    if (Math.max(...vl) / Math.min(...vl) > WRATIO) problems.push(`${id}: version word ratio ${(Math.max(...vl) / Math.min(...vl)).toFixed(2)} > ${WRATIO}`)
    const negs = [], fks = []
    p.versions.forEach((v, k) => {
      const paras = v.text.split(/\n\s*\n/).filter(x => x.trim())
      if (paras.length < 3 || paras.length > 7) problems.push(`${id} v${k}: ${paras.length} paragraphs (need 3-7)`)
      const pn = paras.map(x => (x.match(NEG) ?? []).length)
      pn.forEach((n, i) => { if (n > 1) problems.push(`${id} v${k} para ${i + 1}: ${n} negation tokens (max 1 per paragraph: no denial runs)`) })
      negs.push(pn.reduce((a, b) => a + b, 0))
      const r = readability(v.text); fks.push(r ? r.fk.toFixed(1) : 'NA')
      if (!r || !(r.fk >= FK[0] && r.fk < FK[1])) problems.push(`${id} v${k}: Flesch-Kincaid ${r ? r.fk.toFixed(1) : 'unscorable'} outside [${FK[0]}, ${FK[1]}) (grade 5-7 prose)`)
    })
    if (p.questions.length !== 5) problems.push(`${id}: ${p.questions.length} questions (need 5)`)
    for (const q of p.questions) if (!KINDS.includes(q.kind)) problems.push(`${id}/${q.qid}: kind ${q.kind} not one of ${KINDS.join(', ')}`)
    for (const [name, ks, lo, hi] of MIX) {
      const n = p.questions.filter(q => ks.includes(q.kind)).length
      if (n < lo || n > hi) problems.push(`${id}: ${n} ${name} question(s) (mix needs ${lo}-${hi})`)
    }
    let absent = 0, attn = 0, named = 0, nk = 0, lexHits = 0, lexN = 0
    for (const q of p.questions) {
      const tag = `${id}/${q.qid}`
      if (!q.qid?.startsWith(`${id}-`)) problems.push(`${tag}: qid must start with ${id}-`)
      if (!q.prompt?.trim()) problems.push(`${tag}: empty prompt`)
      if (q.choices?.length !== NV) { problems.push(`${tag}: ${q.choices?.length} choices (need ${NV})`); continue }
      if (new Set(q.choices.map(norm)).size !== NV) problems.push(`${tag}: choices not distinct`)
      const cl = q.choices.map(c => c.length)
      if (Math.max(...cl) / Math.min(...cl) > 1.6) problems.push(`${tag}: choice length ratio ${(Math.max(...cl) / Math.min(...cl)).toFixed(2)} > 1.6`)
      if (q.kind === 'vocabulary-in-context') {
        const w = (q.prompt.match(/["“]([^"”]+)["”]/) ?? [])[1]
        if (!w) problems.push(`${tag}: vocabulary stem must quote the word`)
        else p.versions.forEach((v, k) => { if (!new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(v.text)) problems.push(`${tag} v${k}: vocabulary word "${w}" absent`) })
      }
      if (q.support?.length !== NV) { problems.push(`${tag}: ${q.support?.length} support entries (need ${NV}, one per version)`); continue }
      q.support.forEach((s, k) => {
        const T = norm(p.versions[k].text)
        if (!s.why || !T.includes(norm(s.why))) problems.push(`${tag} v${k}: why not verbatim in version ${k}`)
        if (s.kills?.[String(k)]) problems.push(`${tag} v${k}: kills its own choice`)
        for (let j = 0; j < NV; j++) {
          if (j === k) continue
          const kill = s.kills?.[String(j)]
          if (!kill?.quote || !kill?.reason) { problems.push(`${tag} v${k}: kill for choice ${j} missing quote/reason`); continue }
          if (!['refute', 'mention'].includes(kill.kind)) problems.push(`${tag} v${k}: kill ${j} kind must be refute|mention`)
          if (!T.includes(norm(kill.quote))) problems.push(`${tag} v${k}: kill quote for choice ${j} not verbatim in version ${k}`)
          nk++; if (kill.kind === 'mention') named++
        }
        const Tw = [...new Set(content(p.versions[k].text).map(stemW))]
        if (q.kind === 'attitude') {
          q.choices.forEach((c, j) => {
            const d = distinctive(q.choices, j), head = d[d.length - 1]
            if (!head) { if (k === 0) problems.push(`${tag}: attitude choice ${j} has no distinctive word`); return }
            if (present(head, Tw)) { attn++; problems.push(`${tag} v${k}: attitude word "${head}" (choice ${j}) appears in the passage; the reader must infer the attitude`) }
          })
        } else if (q.kind !== 'vocabulary-in-context') {
          q.choices.forEach((c, j) => {
            const d = distinctive(q.choices, j)
            if (!d.length) return
            const hit = d.filter(w => present(w, Tw)), need = Math.ceil(d.length / 2)
            if (hit.length < need) { absent++; problems.push(`${tag} v${k}: choice ${j} is ABSENT from this version (distinctive words present ${hit.length}/${d.length}, need ${need}; missing ${d.filter(w => !hit.includes(w)).join(',')})`) }
            if (j !== k) {
              const kq = s.kills?.[String(j)]?.quote
              if (kq) { const qw = [...new Set(content(kq).map(stemW))]; if (!d.some(w => present(w, qw))) problems.push(`${tag} v${k}: kill quote for choice ${j} shares no distinctive word with it (${d.join(',')}); quote where the passage discusses it`) }
            }
          })
        }
        if (q.kind !== 'vocabulary-in-context') {
          const Ts = new Set(content(p.versions[k].text))
          const sc = q.choices.map(c => { const w = content(c); return w.length ? w.filter(x => Ts.has(x)).length / w.length : 0 })
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
    notes.push(`${id}: words ${vl.join('/')}; FK ${fks.join('/')}; negations per version ${negs.join('/')}; kills naming the rival ${named}/${nk}; lexical word-match solver ${lexHits.toFixed(1)}/${lexN} (25% = ${(lexN / 4).toFixed(1)}); absent-option hits ${absent}, named-attitude hits ${attn}`)
  }
  return { problems, notes }
}

function verify(files, { quiet = false } = {}) {
  const units = files.map(f => { if (!existsSync(f)) die(`${f} missing`); return { f, p: JSON.parse(readFileSync(f, 'utf8')) } })
  if (!units.length) die('no files')
  const { problems, notes } = verifyUnits(units)
  if (!quiet) notes.forEach(n => console.log('  ' + n))
  if (problems.length) { problems.forEach(x => console.log('  PROBLEM ' + x)); die(`${problems.length} mechanical problem(s)`) }
  console.log(`  verify OK: ${units.length} unit(s), ${units.reduce((a, x) => a + x.p.questions.length, 0)} questions, ${units.length * NV} versions, ${units.reduce((a, x) => a + x.p.questions.length * NV * (NV - 1), 0)} kill quotes verbatim`)
  return units
}

function draw(outdir, files) {
  const sorted = [...files].sort()
  const units = verify(sorted, { quiet: true })
  const frozenSha = sha(Buffer.concat(sorted.map(f => readFileSync(f))))
  mkdirSync(outdir, { recursive: true })
  const drawn = {}, batch = []
  for (const { p } of units) {
    const k = drawn[p.passage_id] = kOf(frozenSha, p.passage_id)
    for (const q of p.questions) {
      batch.push({
        id: q.qid, family: 'map', map_subject: 'reading', set_id: p.passage_id, passageGroupId: `mapwv-${p.passage_id}`,
        map_area: p.text_type === 'literary' ? 'Literary Text' : 'Informational Text', stratum: 'comprehension',
        kind: q.kind, target_band: p.target_band, grade_target: p.grade_target, version: k,
        passage: p.versions[k].text, prompt: q.prompt, choices: q.choices, correct_answer: q.choices[k],
        explanation: q.support[k].why, difficulty: q.difficulty ?? 'medium',
      })
    }
  }
  const hist = Array(NV).fill(0); Object.values(drawn).forEach(k => hist[k]++)
  writeFileSync(join(outdir, 'draw.json'), JSON.stringify({ seed: SEED, files: sorted, frozenSha, drawn, versionHistogram: hist }, null, 1) + '\n')
  writeFileSync(join(outdir, 'batch.json'), JSON.stringify(batch, null, 1) + '\n')
  console.log(`  frozenSha ${frozenSha}\n  drawn ${JSON.stringify(drawn)}\n  wrote ${outdir}/draw.json, batch.json (${batch.length} items)`)
}

function rng(seedStr) { let h = sha(seedStr), i = 0; return () => { if (i + 8 > h.length) { h = sha(h); i = 0 } const x = parseInt(h.slice(i, i + 8), 16) / 0x100000000; i += 8; return x } }
function shuffle(a, r) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[b[i], b[j]] = [b[j], b[i]] } return b }

function build(outdir, wvFiles, natCtlFile) {
  const batch = JSON.parse(readFileSync(join(outdir, 'batch.json'), 'utf8'))
  if (!batch.length) die('empty batch')
  if (!wvFiles.length) die('build needs --wv files')
  const cv = []
  for (const f of wvFiles) {
    const p = JSON.parse(readFileSync(f, 'utf8'))
    p.versions.forEach((v, k) => cv.push({ id: `${p.passage_id}.v${k}`, passage: v.text, questions: p.questions.map(q => ({
      id: `${q.qid}.v${k}`, question: q.prompt, choices: q.choices, claimed_answer: q.choices[k],
      kills: Object.fromEntries(Object.entries(q.support[k].kills).map(([j, x]) => [q.choices[Number(j)], x])),
    })) }))
  }
  writeFileSync(join(outdir, 'cv.json'), JSON.stringify(cv, null, 1) + '\n')
  const ctl = JSON.parse(readFileSync(natCtlFile, 'utf8')).filter(x => x.stratum === 'comprehension' && x.passage)
  if (ctl.length !== 6) die(`naturalness control: expected the 6 batch-2 comprehension passages, got ${ctl.length}`)
  const groups = [...new Set(batch.map(x => x.set_id))]
  const r = rng(`map-wv-nat|${groups.join(',')}`)
  const nat = shuffle([...groups.map(g => ({ src: g, passage: batch.find(x => x.set_id === g).passage })), ...ctl.map(x => ({ src: `ctl:${x.id}`, passage: x.passage }))], r)
  const nkey = {}
  writeFileSync(join(outdir, 'naturalness.json'), JSON.stringify(nat.map((x, i) => { nkey[`N${i + 1}`] = x.src; return { id: `N${i + 1}`, passage: x.passage } }), null, 1) + '\n')
  writeFileSync(join(outdir, 'naturalness.key.json'), JSON.stringify(nkey, null, 1) + '\n')
  console.log(`  cv ${cv.length} passage-versions, ${cv.reduce((a, x) => a + x.questions.length, 0)} question-versions; naturalness ${nat.length} passages (${groups.length} candidate, ${ctl.length} control)`)
}

const load = f => { const j = JSON.parse(readFileSync(f, 'utf8')); return j.labels ?? j }
const med = a => { const b = [...a].sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2 }

export function scoreCv(lab, expectN) {
  const ids = Object.keys(lab)
  if (ids.length !== expectN) return { error: `${ids.length} question-versions judged, expected ${expectN}` }
  if (ids.some(i => typeof lab[i]?.valid !== 'boolean')) return { error: 'a question-version lacks a boolean "valid"' }
  const bad = ids.filter(i => lab[i].valid !== true)
  const need = Math.ceil(expectN * 0.9)
  return { n: ids.length, ok: ids.length - bad.length, need, bad, verdict: ids.length - bad.length >= need ? 'PASS' : 'FAIL' }
}
export function scoreNat(nkey, labs) {
  const ids = Object.keys(nkey), isCtl = n => /^ctl:/.test(nkey[n])
  const nc = ids.filter(n => !isCtl(n)).length, nl = ids.filter(isCtl).length
  if (nc < 1 || nl < 4) return { error: `naturalness key: ${nc} candidates, ${nl} control (need >= 4 control)` }
  const valid = [], log = []
  for (const lab of labs) {
    const bad = ids.filter(n => !lab[n] || !Number.isInteger(lab[n].rating) || lab[n].rating < 1 || lab[n].rating > 5 || !String(lab[n].reason ?? '').trim())
    const flat = new Set(ids.map(n => lab[n]?.rating)).size === 1
    const ok = !bad.length && !flat
    log.push(`${ids.length - bad.length}/${ids.length} rated with a reason${flat ? ', ALL IDENTICAL' : ''} -> ${ok ? 'valid' : 'DISCARD'}; ${ids.map(n => `${nkey[n]} ${lab[n]?.rating}`).join(', ')}`)
    if (ok) valid.push(lab)
  }
  if (valid.length < 2) return { log, verdict: 'INCOMPLETE' }
  const cr = valid.flatMap(l => ids.filter(n => !isCtl(n)).map(n => l[n].rating)), lr = valid.flatMap(l => ids.filter(isCtl).map(n => l[n].rating))
  const cm = med(cr), lm = med(lr)
  const per = ids.filter(n => !isCtl(n)).map(n => `${nkey[n]} ${valid.map(l => l[n].rating).join('/')}`)
  if (lm <= 1) return { log, per, cm, lm, cr, lr, verdict: 'INVALID' }
  return { log, per, cm, lm, cr, lr, verdict: cm >= lm ? 'PASS' : 'FAIL' }
}

function score(outdir, args) {
  const sets = { cv: [], nat: [] }; let cur = null
  for (const a of args) { if (a.startsWith('--')) cur = a.slice(2); else if (cur && sets[cur]) sets[cur].push(a) }
  if (!sets.cv.length && !sets.nat.length) die('score needs --cv and/or --nat')
  const verdicts = {}
  if (sets.cv.length) {
    const cv = JSON.parse(readFileSync(join(outdir, 'cv.json'), 'utf8'))
    const expectN = cv.reduce((a, x) => a + x.questions.length, 0)
    for (const f of sets.cv) {
      const r = scoreCv(load(f), expectN)
      if (r.error) die(`${f}: ${r.error}`)
      const lab = load(f)
      r.bad.forEach(i => console.log(`  CV FAIL ${i}: ${lab[i].reason ?? ''}`))
      const absent = Object.entries(lab).filter(([, v]) => (v.absent ?? []).length).length
      console.log(`  BAR D: ${r.ok}/${r.n} question-versions valid (need ${r.need}) -> ${r.verdict}; question-versions with a choice the version never discusses (recorded): ${absent}`)
      verdicts.D = r.verdict
    }
  }
  if (sets.nat.length) {
    const nkey = JSON.parse(readFileSync(join(outdir, 'naturalness.key.json'), 'utf8'))
    const r = scoreNat(nkey, sets.nat.map(load))
    if (r.error) die(r.error)
    r.log.forEach((l, i) => console.log(`  nat ${sets.nat[i].replace(/^.*\//, '')}: ${l}`))
    if (r.per) { r.per.forEach(x => console.log(`  E ${x}`)); console.log(`  E pooled medians: candidate ${r.cm} (n=${r.cr.length})  control ${r.lm} (n=${r.lr.length})`) }
    console.log(`  BAR E: ${r.verdict}${r.verdict === 'INVALID' ? ' (control median 1: the bar cannot fail)' : ' (candidate median >= control median)'}`)
    verdicts.E = r.verdict
  }
  console.log(`  VERDICTS ${JSON.stringify(verdicts)}`)
}

// ---------- break-tests: every gate must be able to fail ----------
function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  // a synthetic unit that passes, then single mutations that must each refuse
  const sent = (who, what) => `${who} walked to the old mill by the river on a cold morning in early March. ${who} wanted to see the ${what} before the town meeting began. The wheel turned slowly while the water rushed past the stones.`
  const para = (who, what) => [sent(who, what), 'The town was quiet, and the river ran high and brown after the long winter rains.'].join(' ')
  const opts = ['the broken gate', 'the flooded garden', 'the empty barn', 'the fallen fence']
  const vtext = k => [para('Mara', opts[k].replace('the ', '')), `Everyone mentioned ${opts.join(', ')} at the meeting. ${para('Jon', 'gate and garden')}`, para('Ana', 'barn and fence'), `In the end the plan was about ${opts[k]}. ${para('Mara', 'fence')}`].join('\n\n')
  const mkQ = (n, kind, prompt) => ({ qid: `T-P01-${n}`, kind, prompt, choices: opts.map(o => `${o} mattered most to the town`), support: [0, 1, 2, 3].map(k => ({ why: `In the end the plan was about ${opts[k]}.`, kills: Object.fromEntries([0, 1, 2, 3].filter(j => j !== k).map(j => [String(j), { kind: 'mention', quote: `Everyone mentioned ${opts.join(', ')} at the meeting.`, reason: 'mentioned, not the plan' }])) })) })
  const base = () => ({ passage_id: 'T-P01', text_type: 'informational', versions: [0, 1, 2, 3].map(k => ({ text: vtext(k) })), questions: [
    mkQ(1, 'central-idea', 'Which statement best expresses the central idea?'),
    mkQ(2, 'inference', 'What can the reader infer?'),
    mkQ(3, 'purpose', 'Why does the author include the meeting?'),
    mkQ(4, 'inference', 'Which conclusion is best supported?'),
    { ...mkQ(5, 'vocabulary-in-context', 'As it is used in the passage, what does the word "turned" mean?'), choices: ['spun around', 'changed into', 'went sour', 'became older'], support: [0, 1, 2, 3].map(k => ({ why: 'The wheel turned slowly', kills: Object.fromEntries([0, 1, 2, 3].filter(j => j !== k).map(j => [String(j), { kind: 'mention', quote: 'The wheel turned slowly', reason: 'other sense' }])) })) },
  ] })
  const run = u => verifyUnits([{ f: 'x', p: u }]).problems
  const b0 = run(base())
  expect(b0.length === 0, `a well-formed synthetic unit passes verify (${b0.slice(0, 3).join(' | ') || 'no problems'})`)
  const m1 = base(); m1.versions.pop(); expect(run(m1).some(x => /versions \(need 4\)/.test(x)), 'three versions refuses')
  const m2 = base(); m2.questions[0].support[1].kills['2'].quote = 'a sentence that is nowhere in the text'; expect(run(m2).some(x => /not verbatim/.test(x)), 'a fake kill quote refuses')
  const m3 = base(); m3.versions[2].text = m3.versions[2].text.replace('In the end', 'It was not the gate, not the garden. In the end'); expect(run(m3).some(x => /negation tokens/.test(x)), 'two negations in one paragraph refuses')
  const m4 = base(); m4.versions[3].text = m4.versions[3].text.split('barn').join('shed').split('empty').join('old'); expect(run(m4).some(x => /ABSENT/.test(x)), 'an option absent from one version refuses')
  const m5 = base(); m5.questions[1].kind = 'central-idea'; expect(run(m5).some(x => /theme or central-idea question/.test(x)), 'two central-idea questions refuses (mix)')
  const m6 = base(); m6.questions[2].choices = m6.questions[2].choices.slice(0, 3); expect(run(m6).some(x => /choices \(need 4\)/.test(x)), 'three choices refuses')
  const m7 = base(); m7.versions[0].text = m7.versions[0].text.replace(/walked to the old mill by the river on a cold morning in early March\./g, 'perambulated circumspectly toward the antiquated manufacturing establishment, contemplating municipal administrative responsibilities.'); expect(run(m7).some(x => /Flesch-Kincaid/.test(x)), 'grade-12 prose refuses on FK')
  const m8 = base(); m8.questions[1].support[0].kills['3'].quote = 'The wheel turned slowly while the water rushed past the stones.'; expect(run(m8).some(x => /shares no distinctive word/.test(x)), 'an off-target kill quote refuses')
  // D scorer
  const cvLab = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [`q${i}`, { valid: true }]))
  const d1 = cvLab(40); for (let i = 0; i < 5; i++) d1[`q${i}`].valid = false
  expect(scoreCv(d1, 40).verdict === 'FAIL', '35/40 valid FAILS bar D (need 36)')
  const d2 = cvLab(40); for (let i = 0; i < 4; i++) d2[`q${i}`].valid = false
  expect(scoreCv(d2, 40).verdict === 'PASS', '36/40 valid passes bar D')
  expect(!!scoreCv(cvLab(30), 40).error, 'a short D file (30 of 40) refuses')
  // E scorer: half-point margins both ways, flat judge, missing rating, floor
  const nkey = { N1: 'P01', N2: 'P02', N3: 'ctl:a', N4: 'ctl:b', N5: 'ctl:c', N6: 'ctl:d', N7: 'ctl:e', N8: 'ctl:f' }
  const J = rs => Object.fromEntries(Object.keys(nkey).map((n, i) => [n, { rating: rs[i], reason: 'r' }]))
  expect(scoreNat(nkey, [J([3, 3, 4, 4, 3, 4, 4, 3]), J([3, 3, 3, 4, 4, 4, 3, 4])]).verdict === 'FAIL', 'candidate median 3 vs control 3.5 FAILS bar E')
  expect(scoreNat(nkey, [J([4, 3, 3, 3, 4, 3, 3, 3]), J([4, 4, 3, 3, 3, 3, 3, 4])]).verdict === 'PASS', 'candidate median 4 vs control 3 passes bar E')
  expect(scoreNat(nkey, [J([4, 4, 4, 4, 4, 4, 4, 4]), J([4, 4, 3, 3, 3, 3, 3, 4])]).verdict === 'INCOMPLETE', 'a flat judge is discarded (leaves fewer than 2 valid)')
  const miss = J([4, 4, 3, 3, 3, 3, 3, 4]); delete miss.N5
  expect(scoreNat(nkey, [miss, J([4, 4, 3, 3, 3, 3, 3, 4])]).verdict === 'INCOMPLETE', 'a judge missing a rating is discarded')
  expect(scoreNat(nkey, [J([2, 2, 1, 1, 1, 1, 1, 2]), J([2, 1, 1, 1, 1, 1, 1, 2])]).verdict === 'INVALID', 'control median 1 is INVALID (floor)')
  // draw is deterministic and uses mod 4
  const ks = Array.from({ length: 400 }, (_, i) => kOf('abc', `P${i}`)); const h = [0, 0, 0, 0]; ks.forEach(k => h[k]++)
  expect(Math.max(...ks) === 3 && Math.min(...h) > 70, `k(passage) spans 0-3 roughly flat over 400 ids (${h.join('/')})`)
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed: verify, D and E can all fail')
  process.exit(fail ? 1 : 0)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...rest] = process.argv.slice(2)
  const after = flag => { const i = rest.indexOf(flag); if (i < 0) return []; const out = []; for (let j = i + 1; j < rest.length && !rest[j].startsWith('--'); j++) out.push(rest[j]); return out }
  if (cmd === '--selftest') selftest()
  else if (cmd === 'verify') { if (!rest.length) die('no files'); verify(rest) }
  else if (cmd === 'draw') { const [out, ...f] = rest; if (!f.length) die('no files'); draw(out, f) }
  else if (cmd === 'build') build(rest[0], after('--wv'), after('--natctl')[0] ?? die('build needs --natctl'))
  else if (cmd === 'score') score(rest[0], rest.slice(1))
  else die('usage: --selftest | verify | draw | build | score')
}
