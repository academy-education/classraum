#!/usr/bin/env node
/**
 * ssat-ax.mjs — SSAT Reading pilot 5, "axis-aligned" single-passage sets
 * (SSAT-READING-AX1-PREREGISTERED.md). Pre-flight checks and the bank-shaped batch.
 *
 *   check <unit.ax.json>...         mechanical gate; refuses (exit 2) on any violation.
 *   batch <outdir> <unit.ax.json>...  frozenSha over the files (sorted path order) + batch.json in the
 *                                    shape `ssat-wv.mjs build` reads (then: build <outdir> --iso-all
 *                                    --natlive ssat-wv3-pilot/natlive.json; score as pilots 3-4).
 *   absent <outdir> <reviewer.json>  bar G: items with a choice the reviewer says the passage never
 *                                    discusses (vocabulary items exempt).
 *   selftest                         break-tests every refusal on a built-in fixture.
 *
 * Unlike pilots 1-4 there are no passage versions and no draw: ONE passage, ONE authored key per
 * question. The options-only leak is controlled by the option FRAME (every option satisfies the stem
 * equally; only the passage decides), not by a randomised key. Every scorer refuses on a short
 * population.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { distinctive, present, content, norm, stemW } from './ssat-wv.mjs'

const MIX = { 'main-idea': 1, evidence: 1, detail: 1, 'vocabulary-in-context': 1, structure: 1, 'inference|attitude': 1 }
const MIC = new Set(['main-idea', 'evidence', 'detail'])
const SUBSKILL = { 'main-idea': 'main-idea', evidence: 'detail-evidence', detail: 'detail', 'vocabulary-in-context': 'vocabulary-in-context', structure: 'purpose-structure', inference: 'inference', attitude: 'attitude' }
const sha = b => createHash('sha256').update(b).digest('hex')
const words = s => String(s).trim().split(/\s+/).filter(Boolean).length
const has = (text, q) => norm(text).includes(norm(q))
let DIE = m => { console.error(`REFUSING: ${m}`); process.exit(2) }

export function checkUnit(u, sourceIds) {
  const P = []
  const id = u.passage_id ?? '?'
  if (!/^AX\d+-P\d{2}$/.test(id)) P.push(`${id}: passage_id must look like AX1-P01`)
  const text = String(u.passage ?? '')
  const wc = words(text), paras = text.split(/\n\s*\n/).filter(s => s.trim()).length
  if (wc < 280 || wc > 380) P.push(`${id}: passage is ${wc} words (280-380)`)
  if (paras < 3) P.push(`${id}: ${paras} paragraphs (need >= 3, separated by a blank line)`)
  if (!u.source || !['new', 'public-domain'].includes(u.source.kind)) P.push(`${id}: source.kind must be "new" or "public-domain"`)
  if (u.source?.kind === 'public-domain' && !(u.source.citation && u.source.url && u.source.changes)) P.push(`${id}: public-domain source needs citation, url and changes`)
  const qs = u.questions ?? []
  if (qs.length !== 6) P.push(`${id}: ${qs.length} questions (need 6)`)
  const count = {}
  for (const q of qs) { const k = q.kind === 'inference' || q.kind === 'attitude' ? 'inference|attitude' : q.kind; count[k] = (count[k] ?? 0) + 1 }
  for (const [k, n] of Object.entries(MIX)) if ((count[k] ?? 0) !== n) P.push(`${id}: mix: ${count[k] ?? 0} "${k}" (need ${n})`)
  for (const k of Object.keys(count)) if (!(k in MIX)) P.push(`${id}: unknown kind "${k}"`)
  const T = [...new Set(content(text).map(stemW))]
  let keyLongest = 0, lex = 0, lexN = 0, adapted = 0
  qs.forEach((q, qi) => {
    const tag = `${id} ${q.qid ?? `#${qi + 1}`} (${q.kind})`
    const ch = q.choices ?? []
    if (ch.length !== 5) { P.push(`${tag}: ${ch.length} choices (need 5)`); return }
    if (new Set(ch.map(norm)).size !== 5) P.push(`${tag}: duplicate choices`)
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 4) { P.push(`${tag}: answer must be an index 0-4`); return }
    if (!String(q.prompt ?? '').trim()) P.push(`${tag}: empty prompt`)
    if (!q.explanation || !has(text, q.explanation)) P.push(`${tag}: explanation must be a verbatim passage quote`)
    for (let j = 0; j < 5; j++) {
      if (j === q.answer) continue
      const kq = q.kills?.[j] ?? q.kills?.[String(j)]
      if (!kq || !has(text, kq)) P.push(`${tag}: kill quote for choice ${j} missing or not verbatim`)
    }
    if (q.adapted_from) {
      adapted++
      if (!sourceIds.has(q.adapted_from.id)) P.push(`${tag}: adapted_from.id ${q.adapted_from.id} is not one of the offered SAT source items`)
      if (!String(q.adapted_from.changes ?? '').trim()) P.push(`${tag}: adapted_from.changes is empty`)
    }
    const lens = ch.map(c => c.length), mx = Math.max(...lens), mn = Math.min(...lens)
    if (lens[q.answer] === mx && lens.filter(l => l === mx).length === 1) keyLongest++
    if (q.kind === 'vocabulary-in-context') {
      const m = String(q.prompt).match(/["“]([^"”]+)["”]/)
      if (!m) P.push(`${tag}: vocabulary prompt must quote the word`)
      else if (!new RegExp(`\\b${m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) P.push(`${tag}: vocabulary word "${m[1]}" is not in the passage`)
      return
    }
    if (q.kind === 'evidence') {
      ch.forEach((c, j) => { if (!has(text, c)) P.push(`${tag}: choice ${j} is not a verbatim passage sentence`) })
      if (mx / mn > 2.0) P.push(`${tag}: choice length ratio ${(mx / mn).toFixed(2)} > 2.0`)
      return
    }
    if (mx / mn > 1.6) P.push(`${tag}: choice length ratio ${(mx / mn).toFixed(2)} > 1.6`)
    // absent option (pilot-4 rule A, single version): every choice concerns things the passage discusses
    ch.forEach((c, j) => {
      const d = distinctive(ch, j), hit = d.filter(w => present(w, T)), need = Math.ceil(d.length / 2)
      if (hit.length < need) P.push(`${tag}: choice ${j} is ABSENT from the passage (distinctive words present ${hit.length}/${d.length}; missing ${d.filter(w => !hit.includes(w)).join(',')})`)
    })
    // slot frame (detail): every declared slot value is in the passage and in exactly one choice
    if (q.kind === 'detail') {
      if (!Array.isArray(q.slots) || !q.slots.length) P.push(`${tag}: detail items declare "slots" (the parts that vary in one frame)`)
      else q.slots.forEach((vals, si) => {
        if (!Array.isArray(vals) || vals.length !== 5 || new Set(vals.map(norm)).size !== 5) { P.push(`${tag}: slot ${si} needs 5 distinct values`); return }
        vals.forEach(v => {
          if (!has(text, v)) P.push(`${tag}: slot ${si} value "${v}" is not in the passage`)
          const n = ch.filter(c => has(c, v)).length
          if (n !== 1) P.push(`${tag}: slot ${si} value "${v}" appears in ${n} choices (need exactly 1)`)
        })
      })
    }
    // lexical word-match solver (reported): the choice with the most distinctive words found in the passage
    const sc = ch.map((c, j) => { const d = distinctive(ch, j); return d.length ? d.filter(w => present(w, T)).length / d.length : 0 })
    const best = Math.max(...sc), tied = sc.map((s, j) => s === best ? j : -1).filter(j => j >= 0)
    lex += tied.includes(q.answer) ? 1 / tied.length : 0; lexN++
  })
  // stem leak: a choice's distinctive word appearing in ANOTHER question's stem
  qs.forEach((q, qi) => (q.choices ?? []).forEach((c, j) => {
    if (q.kind === 'evidence' || q.kind === 'vocabulary-in-context') return
    const d = distinctive(q.choices, j)
    qs.forEach((o, oi) => { if (oi === qi) return; const sw = [...new Set(content(o.prompt ?? '').map(stemW))]; const leak = d.filter(w => present(w, sw)); if (leak.length && j === q.answer) P.push(`${id} ${q.qid}: key's distinctive word(s) ${leak.join(',')} appear in the stem of ${o.qid}`) })
  }))
  if (keyLongest >= 3) P.push(`${id}: key is the uniquely longest choice on ${keyLongest}/6 questions (max 2)`)
  if (!adapted) P.push(`${id}: no question records adapted_from (the pilot requires >= 1 adapted SAT item per unit)`)
  return { problems: P, note: `${id}: ${wc} words, ${paras} paragraphs; MIC ${qs.filter(q => MIC.has(q.kind)).length}/HOI ${qs.filter(q => !MIC.has(q.kind)).length}; key uniquely longest ${keyLongest}/6; lexical word-match solver ${lex.toFixed(1)}/${lexN} (20% = ${(lexN / 5).toFixed(1)}); adapted ${adapted}` }
}

function loadSources() {
  const f = new URL('./ssat-ax1-pilot/sat-sources.json', import.meta.url)
  try { return new Set(JSON.parse(readFileSync(f, 'utf8')).map(x => x.id)) } catch { return null }
}

function check(files) {
  const src = loadSources()
  if (!src || !src.size) DIE('ssat-ax1-pilot/sat-sources.json missing or empty')
  let bad = 0
  for (const f of files) {
    const u = JSON.parse(readFileSync(f, 'utf8'))
    const { problems, note } = checkUnit(u, src)
    console.log(`  ${note}`)
    problems.forEach(p => console.log(`  PROBLEM ${p}`))
    bad += problems.length
  }
  if (bad) DIE(`${bad} problem(s)`)
  console.log(`  check OK: ${files.length} unit(s)`)
}

function batch(outdir, files) {
  const src = loadSources()
  const sorted = [...files].sort()
  const frozenSha = sha(Buffer.concat(sorted.map(f => readFileSync(f))))
  const out = []
  for (const f of sorted) {
    const u = JSON.parse(readFileSync(f, 'utf8'))
    const { problems } = checkUnit(u, src)
    if (problems.length) DIE(`${f}: ${problems.length} check problem(s); run check first`)
    u.questions.forEach(q => out.push({
      id: `${u.passage_id}-${q.qid}`, set_id: u.passage_id, passage: u.passage, prompt: q.prompt,
      choices: q.choices, correct_answer: q.choices[q.answer], subskill: SUBSKILL[q.kind], kind: q.kind,
      explanation: q.explanation, adapted_from: q.adapted_from ?? null,
    }))
  }
  if (out.length !== files.length * 6) DIE(`batch has ${out.length} items for ${files.length} units`)
  mkdirSync(outdir, { recursive: true })
  writeFileSync(join(outdir, 'batch.json'), JSON.stringify(out, null, 1))
  writeFileSync(join(outdir, 'freeze.json'), JSON.stringify({ files: sorted, frozenSha }, null, 1))
  console.log(`  batch ${out.length} items from ${files.length} units; frozenSha ${frozenSha}`)
}

// bar G: reviewer file {labels: {"<qid>": {"absent": ["A", ...], "note": "..."}}} on withsource.json qids
function absent(outdir, file) {
  const key = JSON.parse(readFileSync(join(outdir, 'attack.key.json'), 'utf8'))
  const lab = (j => j.labels ?? j)(JSON.parse(readFileSync(file, 'utf8')))
  const ws = Object.entries(key).filter(([, k]) => k.pop === 'withsource')
  const scope = ws.filter(([, k]) => k.subskill !== 'vocabulary-in-context')
  if (!scope.length) DIE('no non-vocabulary with-source items in key')
  const missing = scope.filter(([q]) => !lab[q] || !Array.isArray(lab[q].absent))
  if (missing.length) DIE(`${file}: ${missing.length}/${scope.length} items lack an "absent" array (${missing.map(([q]) => q).join(',')})`)
  const flagged = scope.filter(([q]) => lab[q].absent.length > 0)
  flagged.forEach(([q, k]) => console.log(`  G ${k.src}: absent ${lab[q].absent.join(',')} — ${lab[q].note ?? ''}`))
  const v = flagged.length <= 1 ? 'PASS' : 'FAIL'
  console.log(`  BAR G (absent option): ${flagged.length}/${scope.length} non-vocabulary items have a choice the passage never discusses -> ${v} (<= 1)`)
}

function selftest() {
  const para = 'The ferry crossed at six in the morning and at four in the afternoon, and the miller, the teacher, the doctor, the clerk and the smith all rode it. '
  const base = {
    passage_id: 'AX1-P01', source: { kind: 'new' },
    passage: [para.repeat(3) + 'The teacher counted the fares each Monday.', para.repeat(3) + 'The doctor kept the tide tables in a drawer. The clerk wrote the crossings in a ledger.', para.repeat(3) + 'The smith mended the chain every spring. The miller said the river was sound and deep.'].join('\n\n'),
    questions: [
      { qid: 'Q1', kind: 'main-idea', prompt: 'The passage is mainly about', choices: ['the ferry and the miller', 'the ferry and the teacher', 'the ferry and the doctor', 'the ferry and the clerk', 'the ferry and the smith'], answer: 0 },
      { qid: 'Q2', kind: 'evidence', prompt: 'Which sentence shows the schedule?', choices: ['The teacher counted the fares each Monday.', 'The miller said the river was sound and deep.', 'The doctor kept the tide tables in a drawer.', 'The clerk wrote the crossings in a ledger.', 'The smith mended the chain every spring.'], answer: 0 },
      { qid: 'Q3', kind: 'detail', prompt: 'Who rode first?', choices: ['the miller rode', 'the teacher rode', 'the doctor rode', 'the clerk rode', 'the smith rode'], answer: 0, slots: [['miller', 'teacher', 'doctor', 'clerk', 'smith']] },
      { qid: 'Q4', kind: 'vocabulary-in-context', prompt: 'As used in the last paragraph, "sound" most nearly means', choices: ['noise', 'healthy', 'thorough', 'deep inlet', 'measure depth'], answer: 1, adapted_from: { id: 'SRC1', changes: 'converted' } },
      { qid: 'Q5', kind: 'structure', prompt: 'The list of riders serves to', choices: ['name the miller', 'name the teacher', 'name the doctor', 'name the clerk', 'name the smith'], answer: 0 },
      { qid: 'Q6', kind: 'inference', prompt: 'It can be inferred that the ferry', choices: ['carried the miller', 'carried the teacher', 'carried the doctor', 'carried the clerk', 'carried the smith'], answer: 0 },
    ],
  }
  base.questions.forEach(q => { q.explanation = 'The ferry crossed at six'; q.kills = { 0: 'the miller', 1: 'the teacher', 2: 'the doctor', 3: 'the clerk', 4: 'the smith' } })
  const src = new Set(['SRC1'])
  const ok = checkUnit(base, src)
  if (ok.problems.length) { console.error(ok.problems); throw new Error('selftest: clean fixture refused') }
  const clone = () => JSON.parse(JSON.stringify(base))
  const cases = [
    ['short passage', u => { u.passage = 'Too short.\n\nb\n\nc' }, /words/],
    ['mix', u => { u.questions[5].kind = 'main-idea' }, /mix/],
    ['4 choices', u => { u.questions[0].choices.pop() }, /4 choices/],
    ['absent option', u => { u.questions[5].choices[4] = 'carried a giraffe' }, /ABSENT/],
    ['evidence not verbatim', u => { u.questions[1].choices[4] = 'The river ran north quickly today.' }, /verbatim passage sentence/],
    ['evidence length ratio', u => { u.questions[1].choices[4] = 'The smith mended' }, /length ratio/],
    ['kill not verbatim', u => { u.questions[0].kills[3] = 'a sentence nowhere' }, /kill quote/],
    ['slot value in 2 choices', u => { u.questions[2].choices[1] = 'the miller and teacher rode' }, /appears in 2 choices/],
    ['slot value absent', u => { u.questions[2].slots[0][4] = 'baker'; u.questions[2].choices[4] = 'the baker rode' }, /not in the passage/],
    ['vocab word absent', u => { u.questions[3].prompt = 'As used, "fathom" most nearly means' }, /not in the passage/],
    ['no adaptation', u => { delete u.questions[3].adapted_from }, /adapted_from/],
    ['unknown source id', u => { u.questions[3].adapted_from.id = 'NOPE' }, /not one of the offered/],
    ['key longest x3', u => { for (const i of [0, 4, 5]) u.questions[i].choices[0] += ' x' }, /uniquely longest/],
    ['length ratio', u => { u.questions[0].choices[0] = 'the ferry and the miller and the miller again and the miller once more' }, /length ratio/],
  ]
  for (const [name, mut, re] of cases) {
    const u = clone(); mut(u)
    const r = checkUnit(u, src)
    if (!r.problems.some(p => re.test(p))) { console.error(r.problems); throw new Error(`selftest: "${name}" was not refused`) }
    console.log(`  selftest refuses: ${name}`)
  }
  console.log(`  selftest OK (${cases.length} break cases + clean fixture)`)
}

const [cmd, ...rest] = process.argv.slice(2)
if (import.meta.url === `file://${process.argv[1]}`) {
  if (cmd === 'check') { if (!rest.length) DIE('no files'); check(rest) }
  else if (cmd === 'batch') { const [o, ...f] = rest; if (!f.length) DIE('no files'); batch(o, f) }
  else if (cmd === 'absent') absent(rest[0], rest[1])
  else if (cmd === 'selftest') selftest()
  else DIE('usage: check | batch | absent | selftest')
}
