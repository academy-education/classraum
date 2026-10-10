#!/usr/bin/env node
/**
 * ssat-wv12-rules.mjs — the WV12-only mechanical rules (READING-BATCH-WV12-2026-10-11.prereg.md).
 *
 * WV12 shares WV11's base (ssat-wv.mjs verify for WV11+ ids: character-action frames, full-sentence action, felt
 * lexicon, announced tone, sense overlap, licensing). Its one difference is the attitude construction: in at least
 * 2 of the 3 units the attitude item asks about the AUTHOR's or NARRATOR's attitude toward the subject, in an essay,
 * memoir or nature piece, licensed by at least two separate sentences. Every unit declares "attitude_form":
 * "author" | "character". Pre-flight for WV12 = `ssat-wv.mjs verify` AND `ssat-wv12-rules.mjs check`, both clean.
 *
 *   check <a.wv.json>... [--lic <dir>]   exit 2 on any problem; --lic also checks the licensing judges' "support"
 *                                        (two different verbatim sentences per author-form attitude version)
 *   --selftest
 *
 * Rules (ids WV12- only):
 *   R1 attitude_form is "author" or "character"; an "author" unit's genre names an essay, a memoir or a nature piece.
 *   R2 an author-form attitude stem matches exactly one AUTHOR_FRAMES phrasing (taken from live SSAT stems), and no
 *      two author-form units in one call use the same frame. (AUTHOR_FRAMES/authorFrame live in ssat-wv.mjs so that
 *      verify and draw enforce the frame too; they are re-exported here.)
 *   R3 an author-form attitude version declares `why` AND `why2`: two full sentences (ssat-wv.mjs fullSentence),
 *      both verbatim in that version, touching no common sentence.
 *   R4 no attitude choice (either form) uses an irony word: ironic, mocking, wry, sarcastic, sardonic (the WV10 P03
 *      failure was a dry jab; WV12 keeps the amused direction to plain enjoyment).
 *   R5 (--lic) for every author-form attitude version, BOTH licensing judges give "support": >= 2 different sentences,
 *      each >= 4 words, verbatim in that version, at least two touching no common sentence. Missing or malformed support refuses.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { fullSentence, norm, licId, AUTHOR_FRAMES, authorFrame } from './ssat-wv.mjs'
export { AUTHOR_FRAMES, authorFrame }

const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const sha = b => createHash('sha256').update(b).digest('hex')
export const isV12 = id => /^WV12-/.test(String(id))
export const IRONY = /\b(ironic|irony|ironical|mocking|mockery|wry|wryly|sarcastic|sarcasm|sardonic)\b/i
const GENRE = /\b(essay|memoir|nature)\b/i

/** sentence indices (in the version) that a verbatim span touches; null if not verbatim */
export function sentenceSpan(text, span) {
  const T = norm(text), S = norm(span), at = T.indexOf(S)
  if (!S || at < 0) return null
  const ends = []; const re = /[.!?]["'’”)]?(?=\s|$)/g; let m; while ((m = re.exec(T))) ends.push(m.index + m[0].length)
  const idx = pos => { let i = 0; while (i < ends.length && pos >= ends[i]) i++; return i }
  const out = new Set(); for (let i = idx(at); i <= idx(at + S.length - 1); i++) out.add(i)
  return out
}
const disjoint = (a, b) => a && b && [...a].every(x => !b.has(x))


/** unit-level problems for one parsed WV12 unit; returns { probs, frame } */
export function unitProblems(p) {
  const id = p.passage_id, probs = []
  if (!isV12(id)) return { probs: [`${id}: not a WV12 unit`], frame: null }
  if (!['author', 'character'].includes(p.attitude_form)) probs.push(`${id}: attitude_form must be "author" or "character" (got ${JSON.stringify(p.attitude_form ?? null)})`)
  if (p.attitude_form === 'author' && !GENRE.test(String(p.genre ?? ''))) probs.push(`${id}: an author-form unit must be an essay, a memoir or a nature piece (genre ${JSON.stringify(p.genre ?? null)})`)
  const att = (p.questions ?? []).filter(q => q.kind === 'attitude')
  if (att.length !== 1) { probs.push(`${id}: ${att.length} attitude questions (need 1)`); return { probs, frame: null } }
  const q = att[0], tag = `${id}/${q.qid}`
  ;(q.choices ?? []).forEach((c, j) => { if (IRONY.test(c)) probs.push(`${tag}: attitude choice ${j} ("${c}") is an irony word; WV12 keeps the amused direction to plain enjoyment`) })
  let frame = null
  if (p.attitude_form === 'author') {
    const af = authorFrame(q.prompt); frame = af.frame; af.probs.forEach(x => probs.push(`${tag}: ${x}`))
    ;(q.support ?? []).forEach((sp, k) => {
      const T = norm(p.versions?.[k]?.text ?? '')
      if (!sp?.why2) { probs.push(`${tag} v${k}: author-form attitude needs "why2", a second licensing sentence`); return }
      fullSentence(sp.why2).forEach(x => probs.push(`${tag} v${k}: why2: ${x.replace('the attitude action', 'the second licensing sentence')}`))
      if (!T.includes(norm(sp.why2))) probs.push(`${tag} v${k}: why2 not verbatim in version ${k}`)
      const T0 = p.versions?.[k]?.text ?? '', sa = sentenceSpan(T0, sp.why ?? ''), sb = sentenceSpan(T0, sp.why2)
      if (sa && sb && !disjoint(sa, sb)) probs.push(`${tag} v${k}: why and why2 share a sentence; they must be two separate sentences`)
    })
    if ((q.support ?? []).length !== 5) probs.push(`${tag}: ${(q.support ?? []).length} support entries (need 5)`)
  }
  return { probs, frame }
}

/** R5: one licensing judge label for an author-form attitude version */
export function licSupportProblems(label, versionText) {
  const s = label?.support, T = norm(versionText)
  if (!Array.isArray(s) || s.length < 2) return [`gives ${Array.isArray(s) ? s.length : 'no'} support sentence(s); need two different verbatim sentences`]
  const ok = s.filter(x => String(x).trim().split(/\s+/).length >= 4 && T.includes(norm(x)))
  if (ok.length < 2) return [`gives ${ok.length} verbatim support sentence(s) of >= 4 words; need two`]
  const spans = ok.map(x => sentenceSpan(versionText, x))
  for (let i = 0; i < spans.length; i++) for (let j = i + 1; j < spans.length; j++) if (disjoint(spans[i], spans[j])) return []
  return ['support spans fall in one sentence; need two separate sentences']
}

export function check(files, licDir = null) {
  const problems = [], frames = []
  let lic = null
  if (licDir) {
    const rdj = f => { try { return JSON.parse(readFileSync(join(licDir, f), 'utf8')) } catch { die(`licensing: cannot read ${join(licDir, f)}`) } }
    lic = { key: rdj('lic-key.json'), j: [{}, {}] }
    for (let k = 0; k < 5; k++) ['a', 'b'].forEach((t, ti) => { const x = rdj(`lic-v${k}.${t}.json`); Object.entries(x.labels ?? x).forEach(([qid, v]) => { lic.j[ti][`${k}|${qid}`] = v }) })
  }
  const units = files.map(f => JSON.parse(readFileSync(f, 'utf8')))
  if (!units.length) die('no units')
  for (const p of units) {
    const { probs, frame } = unitProblems(p); probs.forEach(x => problems.push(x))
    if (frame) frames.push({ id: p.passage_id, frame })
    if (lic && p.attitude_form === 'author') {
      const q = p.questions.find(q => q.kind === 'attitude')
      p.versions.forEach((v, k) => {
        const lid = licId(p.passage_id, k, q.qid), ke = lic.key[lid]
        if (!ke || ke.versionSha !== sha(v.text)) { problems.push(`${p.passage_id}/${q.qid} v${k}: licensing judgement missing or stale (${lid})`); return }
        lic.j.forEach((J, ji) => { const r = J[`${k}|${lid.replace(`.v${k}.`, '.')}`]; licSupportProblems(r, v.text).forEach(x => problems.push(`${p.passage_id}/${q.qid} v${k}: licensing judge ${'ab'[ji]} ${x}`)) })
      })
    }
  }
  const seen = {}; frames.forEach(r => (seen[r.frame] ??= []).push(r.id))
  for (const [f, ids] of Object.entries(seen)) if (ids.length > 1) problems.push(`stem variety: author frame "${f}" is used by ${ids.join(' and ')}; each author-form unit uses a different phrasing`)
  const forms = units.map(p => `${p.passage_id}=${p.attitude_form}${frames.find(r => r.id === p.passage_id) ? `(${frames.find(r => r.id === p.passage_id).frame})` : ''}`)
  console.log(`  WV12 attitude forms: ${forms.join(', ')}`)
  if (problems.length) { problems.forEach(x => console.log('  PROBLEM ' + x)); die(`${problems.length} WV12 problem(s)`) }
  console.log(`  WV12 check OK: ${units.length} unit(s)${lic ? ', licensing support verified' : ''}`)
}

function selftest() {
  let fail = 0; const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  // frames: live SSAT author phrasings pass; character, tone-only and bare stems refuse
  expect(authorFrame("The author's attitude toward the new signs is best described as").frame === 'attitude-best', 'attitude-best frame')
  expect(authorFrame("The narrator's feelings about the hives are best described as").frame === 'feeling-best', 'feeling-best frame')
  expect(authorFrame('How does the writer regard the swifts?').frame === 'regard', 'regard frame')
  expect(authorFrame('In describing the old signs, the essayist conveys a feeling of').frame === 'conveys', 'conveys frame')
  expect(authorFrame("Mara's reply to the inspector in paragraph 4 suggests that she is").frame === null, 'a character-action stem (WV10) refuses as an author frame')
  expect(authorFrame("In the final paragraph, the author's attitude is best described as").frame === null, 'WV9 tone stem without a subject ("toward ...") refuses')
  expect(authorFrame('Which best describes the author\'s attitude toward the events in the passage?').frame === null, 'WV9-P01 stem refuses (not a listed phrasing)')
  // unit rules on a constructed unit
  const v = k => ({ text: `First sentence of version ${k} sits here today. The second licensing sentence for ${k} is here. Then more words follow in this version ${k}.` })
  const sp = k => ({ why: `First sentence of version ${k} sits here today.`, why2: `The second licensing sentence for ${k} is here.`, kills: {} })
  const unit = o => ({ passage_id: 'WV12-T01', genre: 'reflective essay', attitude_form: 'author', versions: [0, 1, 2, 3, 4].map(v), questions: [{ qid: 'WV12-T01-5', kind: 'attitude', prompt: "The author's attitude toward the signs is best described as", choices: ['admiring', 'critical', 'worried', 'wistful', 'amused'], support: [0, 1, 2, 3, 4].map(sp) }], ...o })
  expect(unitProblems(unit()).probs.length === 0, `a clean author-form unit passes (got ${unitProblems(unit()).probs.join('; ')})`)
  expect(unitProblems(unit({ attitude_form: undefined })).probs.some(x => /attitude_form/.test(x)), 'R1: no attitude_form refuses')
  expect(unitProblems(unit({ genre: 'narrative fiction' })).probs.some(x => /essay, a memoir/.test(x)), 'R1: author form in fiction refuses')
  const noWhy2 = unit(); delete noWhy2.questions[0].support[2].why2
  expect(unitProblems(noWhy2).probs.some(x => /v2: author-form attitude needs "why2"/.test(x)), 'R3: a missing why2 refuses')
  const same = unit(); same.questions[0].support[1].why2 = same.questions[0].support[1].why
  expect(unitProblems(same).probs.some(x => /v1: why and why2 share a sentence/.test(x)), 'R3: why2 identical to why refuses')
  const half = unit(); half.questions[0].support[0].why2 = 'sits here today.'
  expect(unitProblems(half).probs.some(x => /v0: why and why2 share a sentence/.test(x)), 'R3: why2 a tail of the same sentence refuses')
  const frag = unit(); frag.questions[0].support[3].why2 = 'second licensing sentence'
  expect(unitProblems(frag).probs.some(x => /v3: why2:/.test(x)), 'R3: a fragment why2 refuses')
  const notv = unit(); notv.questions[0].support[4].why2 = 'A sentence that is not in the passage at all.'
  expect(unitProblems(notv).probs.some(x => /v4: why2 not verbatim/.test(x)), 'R3: a non-verbatim why2 refuses')
  const iro = unit(); iro.questions[0].choices[4] = 'wry'
  expect(unitProblems(iro).probs.some(x => /irony word/.test(x)), 'R4: "wry" refuses')
  const ch = unit({ attitude_form: 'character', genre: 'narrative fiction' }); ch.questions[0].prompt = "Mara's reply to the inspector in paragraph 4 suggests that she is"
  expect(unitProblems(ch).probs.length === 0, 'a character-form unit is left to ssat-wv.mjs (no why2 needed here)')
  // R5 licensing support
  const T = v(0).text
  expect(licSupportProblems({ support: ['First sentence of version 0 sits here today.', 'The second licensing sentence for 0 is here.'] }, T).length === 0, 'R5: two verbatim sentences pass')
  expect(licSupportProblems({ support: ['First sentence of version 0 sits here today.'] }, T).length === 1, 'R5: one sentence refuses')
  expect(licSupportProblems({}, T).length === 1, 'R5: no support refuses')
  expect(licSupportProblems({ support: ['First sentence of version 0', 'sentence of version 0 sits'] }, T).length === 1, 'R5: two overlapping spans of one sentence refuse')
  expect(licSupportProblems({ support: ['First sentence of version 0 sits here today.', 'An invented sentence not in the text.'] }, T).length === 1, 'R5: a non-verbatim second sentence refuses')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed'); process.exit(fail ? 1 : 0)
}

const [cmd, ...rest] = process.argv.slice(2)
if (import.meta.url === `file://${process.argv[1]}`) {
  if (cmd === 'check') { const i = rest.indexOf('--lic'), licDir = i >= 0 ? rest[i + 1] : null; const fl = rest.filter((x, j) => x !== '--lic' && rest[j - 1] !== '--lic'); if (!fl.length) die('no files'); check(fl, licDir) }
  else if (cmd === '--selftest') selftest()
  else die('usage: check <a.wv.json>... [--lic <dir>] | --selftest')
}
