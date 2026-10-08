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
 *   (pilot 4: verify applies SSAT-READING-WV4-PREREGISTERED.md rules to passage ids WV4- and later:
 *    question mix, no absent-entity options, kill quotes on target, attitude word never named)
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
import { lexicalFlags, a1Absent } from './absent-check.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const L = 'ABCDE'
const SEED = 'ssat-wv-2026-10-06'
const KINDS = ['main-idea', 'detail', 'inference', 'vocabulary-in-context', 'attitude', 'purpose']
const NEG = /\b(not|no|never|nothing|nor|none|neither|nobody|nowhere)\b|n't\b/gi
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const sha = b => createHash('sha256').update(b).digest('hex')
const words = s => String(s).trim().split(/\s+/).filter(Boolean).length
export const norm = s => String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim()
const STOP = new Set('the a an of to in on and or for with by at from as that this which who whom whose was were is are be been his her their its it he she they them him one what how why when chiefly most best passage author writer narrator'.split(' '))
export const content = s => norm(s).replace(/[^a-z' ]/g, ' ').split(' ').filter(w => w.length > 3 && !STOP.has(w))

// ── pilot 4 rules (SSAT-READING-WV4-PREREGISTERED.md), applied to passage_ids WV4- and later ──
const isV4 = id => /^WV(?:[4-9]|\d{2,})-/.test(String(id))
// ── batch WV5 (READING-BATCH-WV5-2026-10-07.prereg.md): pilot 3's one-of-each kinds, choice ratio 1.5, NAEP lure
//    labels on every kill of a non-vocabulary/non-attitude question (>= 2 kinds per question-version), and the
//    absent-option refusal is A1 (absent-check.mjs), not the lexical rule: a lexically flagged choice-version needs
//    two presence judgements (a1build, then verify --a1 <dir>) and is refused only if A1 calls it absent ──
const isV5 = id => /^WV(?:[5-9]|\d{2,})-/.test(String(id))
export const LURES = ['stops-short', 'reversed', 'half-right', 'detail-as-whole', 'misplaced-detail', 'character-not-author']
const a1Exempt = kind => kind === 'vocabulary-in-context' || kind === 'attitude'
// ── batch WV6 (READING-BATCH-WV6-2026-10-07.prereg.md): attitude options must differ in DIRECTION. Each option must
//    contain a word from exactly one class below, and the five options must cover five different classes.
//    Unknown attitude words refuse (use the lexicon). Plus the licensing pre-check (licbuild / verify --lic). ──
const isV6 = id => /^WV(?:[6-9]|\d{2,})-/.test(String(id))
const isV7 = id => /^WV(?:[7-9]|\d{2,})-/.test(String(id))
export const ATT_DIR = {
  warm: 'admiring admiration approving approval appreciative appreciation proud pride respectful respect grateful gratitude sympathetic sympathy fond fondness affectionate affection enthusiastic enthusiasm reverent reverence tender'.split(' '),
  critical: 'critical disapproving disapproval scornful scorn contemptuous contempt indignant indignation irritated irritation resentful resentment exasperated exasperation disdainful disdain annoyed annoyance angry'.split(' '),
  troubled: 'uneasy unease worried worry apprehensive apprehension anxious anxiety wary wariness fearful alarmed regretful regret sad sadness wistful nostalgic nostalgia mournful melancholy rueful doubtful doubt skeptical skepticism uncertain sorrowful sorrow grief troubled'.split(' '),
  indifferent: 'indifferent indifference detached detachment neutral unconcerned impassive dispassionate uninterested'.split(' '),
  amused: 'amused amusement wry playful ironic bemused humorous mocking whimsical'.split(' '),
}
export function attitudeDirections(choices) {
  const probs = [], classes = choices.map((c, j) => {
    const ws = norm(c).replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean)
    const hits = Object.entries(ATT_DIR).filter(([, lex]) => ws.some(w => lex.includes(w))).map(([k]) => k)
    if (hits.length !== 1) probs.push(`attitude choice ${j} ("${c}") matches ${hits.length ? hits.join('+') : 'no'} direction class (need exactly one; use a lexicon word)`)
    return hits.length === 1 ? hits[0] : null
  })
  const seen = {}; classes.forEach((k, j) => { if (k) (seen[k] ??= []).push(j) })
  for (const [k, js] of Object.entries(seen)) if (js.length > 1) probs.push(`attitude choices ${js.join(' and ')} share the direction "${k}" (${js.map(j => `"${choices[j]}"`).join(' / ')}): they differ in shade, not direction`)
  return { classes, probs }
}
// ── batch WV9 (READING-BATCH-WV9-2026-10-08.prereg.md): five FELT direction classes (no indifferent key), and the
//    passage may not announce its tone (no direction word, no tone-announcing word, in any version). ──
const isV9 = id => /^WV(?:9|\d{2,})-/.test(String(id))
export const ATT_DIR9 = {
  warm: ATT_DIR.warm,
  critical: ATT_DIR.critical,
  anxious: 'uneasy unease worried worry apprehensive apprehension anxious anxiety wary wariness fearful alarmed troubled'.split(' '),
  sorrowful: 'regretful regret sad sadness wistful nostalgic nostalgia mournful melancholy rueful sorrowful sorrow grief'.split(' '),
  amused: ATT_DIR.amused,
}
const INDIFF = ATT_DIR.indifferent
export const TONE_ANNOUNCE = 'comic comical funny laughable amusing hilarious absurd admirable praiseworthy shameful regrettable regrettably sadly worrying troubling lamentable delightful heartbreaking deplorable'.split(' ')
export function attitudeDirections9(choices) {
  const probs = [], classes = choices.map((c, j) => {
    const ws = norm(c).replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean)
    if (ws.some(w => INDIFF.includes(w))) { probs.push(`attitude choice ${j} ("${c}") is indifferent-class: not keyable in WV9+ (use five felt directions)`); return null }
    const hits = Object.entries(ATT_DIR9).filter(([, lex]) => ws.some(w => lex.includes(w))).map(([k]) => k)
    if (hits.length !== 1) probs.push(`attitude choice ${j} ("${c}") matches ${hits.length ? hits.join('+') : 'no'} felt direction class (need exactly one; use a lexicon word)`)
    return hits.length === 1 ? hits[0] : null
  })
  const seen = {}; classes.forEach((k, j) => { if (k) (seen[k] ??= []).push(j) })
  for (const [k, js] of Object.entries(seen)) if (js.length > 1) probs.push(`attitude choices ${js.join(' and ')} share the direction "${k}" (${js.map(j => `"${choices[j]}"`).join(' / ')})`)
  return { classes, probs }
}
export function announcedTone(text) {
  const ws = norm(text).replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean)
  const lex = new Set([...Object.values(ATT_DIR9).flat(), ...INDIFF, ...TONE_ANNOUNCE])
  return [...new Set(ws.filter(w => lex.has(w)))]
}
// ── batch WV10 (READING-BATCH-WV10-2026-10-08.prereg.md): the attitude item is CHARACTER-ACTION form:
//    "X's [action/reply] in paragraph N suggests that X feels/is". Never a tone judgement about author or narrator. ──
const isV10 = id => /^WV(?:1\d|[2-9]\d)-/.test(String(id))
export function characterActionStem(prompt) {
  const s = String(prompt ?? ''), probs = []
  if (!/\bparagraph\s+\w+/i.test(s) && !/\b(first|second|third|fourth|fifth|sixth|final|last)\s+paragraph\b/i.test(s)) probs.push('stem must name the paragraph where the action is')
  if (!/\bsuggests?\b/i.test(s)) probs.push('stem must read "... suggests that X feels/is"')
  if (!/\b[A-Z][a-z]+(?:'s|’s)\s/.test(s)) probs.push("stem must name the character whose action it is (\"X's ...\")")
  if (/\b(author|narrator)(?:'s|’s)?\s+(attitude|tone|feeling)|\btone\b|\bauthor's\b|\bnarrator's\b/i.test(s)) probs.push('stem asks about the author or narrator, not a character action')
  return probs
}
// ── batch WV11 (READING-BATCH-WV11-2026-10-08.prereg.md): (1) the attitude action/reply quoted as each version's
//    "why" is at least one full sentence (>= 6 words, sentence-shaped); (2) no irony (licensing prompt; not mechanical);
//    (3) vocabulary senses must not overlap: two judges rate every pair of the five glosses (sensebuild / --senses). ──
const isV11 = id => /^WV(?:1[1-9]|[2-9]\d)-/.test(String(id))
export function fullSentence(why) {
  const t = String(why ?? '').trim(), w = t.split(/\s+/).filter(x => /[a-z]/i.test(x)).length
  const probs = []
  if (w < 6) probs.push(`the attitude action quoted as "why" has ${w} word(s); it must be at least one full sentence of >= 6 words`)
  if (!/^["'‘“(]?[A-Z]/.test(t)) probs.push('the attitude action must be quoted from the start of a sentence')
  if (!/[.!?]["'’”)]?$/.test(t)) probs.push('the attitude action must be quoted to the end of a sentence')
  return probs
}
export const senseId = (pid, qid) => `${pid}.${qid.slice(pid.length + 1)}`
export const licId = (pid, k, qid) => `${pid}.v${k}.${qid.slice(pid.length + 1)}`
export const a1Oid = (pid, k, qid, j) => `${pid}.v${k}.${qid.slice(pid.length + 1)}.${'ABCDE'[j]}`
const GENERIC = new Set('show shows describe describes explain explains illustrate illustrates introduce introduces suggest suggests reveal reveals emphasize emphasizes contrast compare provide provides offer offers present presents recount recounts recall recalls account example give gives point reader readers establish establishes indicate indicates highlight highlights note notes stress stresses primarily serves serve mainly concerned where more into than there then been have would could about after before over some only also what other such each every very much made make makes take took became become becomes most many under upon them once just even still'.split(' '))
export const stemW = w => w.replace(/'s$/, '').replace(/'/g, '')
const stemEq = (a, b) => { const n = Math.min(5, a.length, b.length); return n >= 4 && a.slice(0, n) === b.slice(0, n) }
export const cw4 = s => [...new Set(content(s).map(stemW).filter(w => w.length > 3 && !STOP.has(w) && !GENERIC.has(w)))]
// distinctive words of choice j: content words NOT present in every other choice of the question
export function distinctive(choices, j) {
  const others = choices.filter((_, i) => i !== j).map(cw4)
  return cw4(choices[j]).filter(w => !others.every(o => o.some(x => stemEq(x, w))))
}
export const present = (w, textWords) => textWords.some(t => stemEq(t, w))
export const V4_MIX = { 'vocabulary-in-context': [1, 1], attitude: [1, 1], detail: [0, 1], 'main-idea': [0, 1], inference: [2, 6], purpose: [1, 6] }

export function kOf(frozenSha, pid) {
  return parseInt(sha(`${SEED}|${frozenSha}|${pid}`).slice(0, 8), 16) % 5
}

function verify(files, { quiet = false, a1Dir = null, licDir = null, senseDir = null } = {}) {
  const problems = [], notes = []
  let senses = null
  if (senseDir) {
    const rdj = f => { const p = join(senseDir, f); try { return JSON.parse(readFileSync(p, 'utf8')) } catch { die(`senses: cannot read ${p}`) } }
    const ja = rdj('sense-judge.a.json'), jb = rdj('sense-judge.b.json')
    senses = { key: rdj('sense-key.json'), j: [ja.labels ?? ja, jb.labels ?? jb] }
  }
  let lic = null
  if (licDir) {
    const rdj = f => { const p = join(licDir, f); try { return JSON.parse(readFileSync(p, 'utf8')) } catch { die(`licensing: cannot read ${p}`) } }
    const key = rdj('lic-key.json'), j = [{}, {}]
    for (let k = 0; k < 5; k++) ['a', 'b'].forEach((t, ti) => { const x = rdj(`lic-v${k}.${t}.json`); Object.entries(x.labels ?? x).forEach(([qid, v]) => { j[ti][`${k}|${qid}`] = v }) })
    lic = { key, j }
  }
  let a1 = null
  if (a1Dir) {
    const rdj = f => { const p = join(a1Dir, f); try { return JSON.parse(readFileSync(p, 'utf8')) } catch { die(`A1: cannot read ${p}`) } }
    const key = rdj('a1-key.json'), ja = rdj('a1-judge.a.json'), jb = rdj('a1-judge.b.json')
    a1 = { key, j: [ja.labels ?? ja, jb.labels ?? jb] }
  }
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
    if (!isV4(id) || isV5(id)) { if (kinds !== [...KINDS].sort().join(',')) problems.push(`${id}: kinds ${kinds} (need one each of ${KINDS.join(', ')})`) }
    else {
      // pilot 4 mix: weighted to inference/purpose/tone/vocab; at most one detail and one main-idea
      for (const q of p.questions) if (!KINDS.includes(q.kind)) problems.push(`${id}/${q.qid}: kind ${q.kind} not one of ${KINDS.join(', ')}`)
      for (const [k, [lo, hi]] of Object.entries(V4_MIX)) {
        const n = p.questions.filter(q => q.kind === k).length
        if (n < lo || n > hi) problems.push(`${id}: ${n} ${k} question(s) (pilot 4 mix needs ${lo}-${hi})`)
      }
    }
    let v4absent = 0, v4attn = 0, a1Flagged = 0, a1AbsentN = 0
    let named = 0, nk = 0, lexHits = 0, lexN = 0
    for (const q of p.questions) {
      const tag = `${id}/${q.qid}`
      if (!q.qid?.startsWith(`${id}-`)) problems.push(`${tag}: qid must start with ${id}-`)
      if (!q.prompt?.trim()) problems.push(`${tag}: empty prompt`)
      if (q.choices?.length !== 5) { problems.push(`${tag}: ${q.choices?.length} choices`); continue }
      if (new Set(q.choices.map(norm)).size !== 5) problems.push(`${tag}: choices not distinct`)
      const cl = q.choices.map(c => c.length)
      const maxRatio = isV5(id) ? 1.5 : 1.6
      if (Math.max(...cl) / Math.min(...cl) > maxRatio) problems.push(`${tag}: choice length ratio ${(Math.max(...cl) / Math.min(...cl)).toFixed(2)} > ${maxRatio}`)
      if (isV6(id) && !isV9(id) && q.kind === 'attitude') attitudeDirections(q.choices).probs.forEach(x => problems.push(`${tag}: ${x}`))
      if (isV10(id) && q.kind === 'attitude') characterActionStem(q.prompt).forEach(x => problems.push(`${tag}: ${x}`))
      if (isV11(id) && q.kind === 'attitude') (q.support ?? []).forEach((sp, k) => fullSentence(sp?.why).forEach(x => problems.push(`${tag} v${k}: ${x}`)))
      if (isV11(id) && q.kind === 'vocabulary-in-context') {
        const sid = senseId(id, q.qid)
        if (!senses) problems.push(`${tag}: sense-overlap pre-check required (sensebuild, then verify --senses <dir>)`)
        else {
          const ke = senses.key[sid]
          if (!ke || JSON.stringify(ke.choices) !== JSON.stringify(q.choices)) problems.push(`${tag}: sense judgement missing or stale (${sid})`)
          else {
            // WV11 prereg: refuse a pair only if BOTH judges rate it "overlap" (agreement rule; either-judge refused every
            // break-test set, a constructed homonym set included). Missing or malformed output refuses.
            const rs = senses.j.map(J => J[sid])
            if (rs.some(r => !r || typeof r.pairs !== 'object')) problems.push(`${tag}: sense judge output missing ${sid}`)
            else for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) {
              const vs = rs.map(r => r.pairs[`${a}-${b}`])
              if (vs.some(v => v !== 'overlap' && v !== 'distinct')) problems.push(`${tag}: sense pair ${a}-${b} not rated by both judges`)
              else if (vs.every(v => v === 'overlap')) problems.push(`${tag}: both sense judges rate "${q.choices[a]}" / "${q.choices[b]}" as overlapping`)
            }
          }
        }
      }
      if (isV9(id) && q.kind === 'attitude') {
        attitudeDirections9(q.choices).probs.forEach(x => problems.push(`${tag}: ${x}`))
        p.versions.forEach((v, k) => { const a = announcedTone(v.text); if (a.length) problems.push(`${tag} v${k}: the passage announces a tone ("${a.join('", "')}"); the attitude must be inferable, not named`) })
      }
      // WV7+ (READING-BATCH-WV7-WV8-2026-10-07.prereg.md): every attitude choice is some version's key, so an
      // indifferent-class choice (detached, neutral, ...) is a key in one world. WV6 P01-5 showed that key fails when the
      // narrator has a stake. Allowed only if the unit declares narrator_role "observer" (author/narrator with no stake).
      if (isV7(id) && q.kind === 'attitude') {
        const cls = attitudeDirections(q.choices).classes
        if (cls.includes('indifferent') && p.narrator_role !== 'observer') problems.push(`${tag}: an indifferent-class attitude choice ("${q.choices[cls.indexOf('indifferent')]}") is a key in one version; allowed only when the unit declares "narrator_role": "observer" (got ${JSON.stringify(p.narrator_role ?? null)})`)
      }
      if (isV7(id) && !['observer', 'participant'].includes(p.narrator_role)) { if (q === p.questions[0]) problems.push(`${id}: narrator_role must be "observer" or "participant"`) }
      if (isV6(id) && (q.kind === 'attitude' || q.kind === 'vocabulary-in-context')) {
        p.versions.forEach((v, k) => {
          const lid = licId(id, k, q.qid)
          if (!lic) { problems.push(`${tag} v${k}: licensing pre-check required (licbuild, then verify --lic <dir>)`); return }
          const ke = lic.key[lid]
          if (!ke || ke.versionSha !== sha(v.text) || JSON.stringify(ke.choices) !== JSON.stringify(q.choices)) { problems.push(`${tag} v${k}: licensing judgement missing or stale (${lid})`); return }
          lic.j.forEach((J, ji) => {
            const r = J[`${k}|${lid.replace(`.v${k}.`, '.')}`], want = ke.keyLetter
            if (!r || !'ABCDE'.includes(r.pick ?? '_')) { problems.push(`${tag} v${k}: licensing judge ${'ab'[ji]} output missing ${lid}`); return }
            const sd = r.second_defensible && r.second_defensible !== 'none' && r.second_defensible !== r.pick
            if (r.pick !== want) problems.push(`${tag} v${k}: licensing judge ${'ab'[ji]} picks choice ${ke.order['ABCDE'.indexOf(r.pick)]} ("${q.choices[ke.order['ABCDE'.indexOf(r.pick)]]}"), not the key (choice ${k})`)
            if (sd) problems.push(`${tag} v${k}: licensing judge ${'ab'[ji]} finds a second defensible answer: choice ${ke.order['ABCDE'.indexOf(r.second_defensible)]} ("${q.choices[ke.order['ABCDE'.indexOf(r.second_defensible)]]}")`)
            for (const x of 'ABCDE') { if (x === want) continue; const qt = r.exclusions?.[x]; if (!qt || String(qt).trim().split(/\s+/).length < 3 || !norm(v.text).includes(norm(qt))) problems.push(`${tag} v${k}: licensing judge ${'ab'[ji]} gives no verbatim sentence excluding choice ${ke.order['ABCDE'.indexOf(x)]}`) }
          })
        })
      }
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
        if (isV4(id)) {
          const Tw4 = [...new Set(content(p.versions[k].text).map(stemW))]
          if (q.kind === 'attitude') {
            // the passage must not NAME the attitude: the head (last distinctive) word of every choice is absent from every version
            q.choices.forEach((c, j) => {
              const d = distinctive(q.choices, j), head = d[d.length - 1]
              if (!head) { if (k === 0) problems.push(`${tag}: attitude choice ${j} has no distinctive word`); return }
              if (present(head, Tw4)) { v4attn++; problems.push(`${tag} v${k}: attitude word "${head}" (choice ${j}) appears in the passage; the reader must infer the attitude`) }
            })
          } else if (q.kind !== 'vocabulary-in-context') {
            // no absent-entity options: every choice (key included) is about something THIS version discusses
            q.choices.forEach((c, j) => {
              const d = distinctive(q.choices, j)
              if (!d.length) return
              const hit = d.filter(w => present(w, Tw4)), need = Math.ceil(d.length / 2)
              if (!isV5(id) && hit.length < need) { v4absent++; problems.push(`${tag} v${k}: choice ${j} is ABSENT from this version (distinctive words present ${hit.length}/${d.length}, need ${need}; missing ${d.filter(w => !hit.includes(w)).join(',')})`) }
              if (j !== k) {
                const kq = s.kills?.[String(j)]?.quote
                if (kq) { const qw = [...new Set(content(kq).map(stemW))]; if (!d.some(w => present(w, qw))) problems.push(`${tag} v${k}: kill quote for choice ${j} shares no distinctive word with it (${d.join(',')}); quote where the passage discusses it`) }
              }
            })
          }
        }
        if (isV5(id) && !a1Exempt(q.kind)) {
          const lures = Object.entries(s.kills ?? {}).map(([, x]) => x?.lure)
          lures.forEach((l, i) => { if (!LURES.includes(l)) problems.push(`${tag} v${k}: kill ${i} lure "${l}" is not one of ${LURES.join('|')}`) })
          if (new Set(lures).size < 2) problems.push(`${tag} v${k}: the four wrong choices use ${new Set(lures).size} lure kind(s); need >= 2`)
          const flags = lexicalFlags({ subskill: q.kind, prompt: q.prompt, passage: p.versions[k].text, choices: q.choices })
          for (const L0 of flags) {
            const j = 'ABCDE'.indexOf(L0), oid = a1Oid(id, k, q.qid, j); a1Flagged++
            if (!a1) { problems.push(`${tag} v${k}: choice ${j} is lexically flagged; A1 judgements required (a1build, then verify --a1 <dir>)`); continue }
            const ke = a1.key[oid]
            if (!ke || ke.choice !== q.choices[j] || ke.versionSha !== sha(p.versions[k].text)) { problems.push(`${tag} v${k}: A1 judgement for choice ${j} missing or stale (${oid}); re-run a1build and the judges`); continue }
            const vs = a1.j.map(J => J[oid]); if (vs.some(v => typeof v?.discussed !== 'boolean')) { problems.push(`${tag} v${k}: A1 judge output missing ${oid}`); continue }
            if (a1Absent(true, vs, p.versions[k].text)) { a1AbsentN++; problems.push(`${tag} v${k}: choice ${j} is ABSENT from this version under A1 (lexically flagged, and neither judge found it discussed with a verbatim quote)`) }
          }
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
    notes.push(`${id}: words ${vl.join('/')}; negations per version ${negs.join('/')}; kills naming the rival ${named}/${nk}; lexical word-match solver ${lexHits.toFixed(1)}/${lexN} (20% = ${(lexN / 5).toFixed(1)})${isV4(id) ? `; ${isV5(id) ? `A1 lexical flags ${a1Flagged}, A1 absent ${a1AbsentN}` : `v4 absent-option hits ${v4absent}`}, named-attitude hits ${v4attn}` : ''}`)
  }
  if (!quiet) notes.forEach(n => console.log('  ' + n))
  if (problems.length) { problems.forEach(x => console.log('  PROBLEM ' + x)); die(`${problems.length} mechanical problem(s)`) }
  console.log(`  verify OK: ${passages.length} passage(s), ${passages.reduce((a, x) => a + x.p.questions.length, 0)} questions, ${passages.length * 5} versions, ${passages.reduce((a, x) => a + x.p.questions.length * 5 * 4, 0)} kill quotes verbatim`)
  return passages
}

// WV11 sense-overlap pre-check input: for every vocabulary question, the word, the five glosses and the ten pairs.
function sensebuild(outdir, files) {
  const key = {}, out = []
  for (const f of [...files].sort()) {
    const p = JSON.parse(readFileSync(f, 'utf8')), id = p.passage_id
    for (const q of p.questions.filter(q => q.kind === 'vocabulary-in-context')) {
      const sid = senseId(id, q.qid), word = (q.prompt.match(/["“]([^"”]+)["”]/) ?? [])[1] ?? ''
      key[sid] = { choices: q.choices }
      const pairs = []; for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) pairs.push({ pair: `${a}-${b}`, senses: [q.choices[a], q.choices[b]] })
      out.push({ id: sid, word, glosses: q.choices, pairs })
    }
  }
  mkdirSync(outdir, { recursive: true })
  writeFileSync(join(outdir, 'sense-judge.json'), JSON.stringify(out, null, 1) + '\n')
  writeFileSync(join(outdir, 'sense-key.json'), JSON.stringify(key, null, 1) + '\n')
  console.log(`  sensebuild: ${out.length} vocabulary questions, ${out.length * 10} pairs`)
}

// licensing pre-check input (WV6), v2 after the v1 design failed its break test on WV5 (letters in choice order gave
// "version k keys letter k"; one file showed all five versions side by side). Now: ONE FILE PER VERSION INDEX k (both
// passages' version k, never two versions of one passage), only the attitude and vocabulary questions, letters
// re-dealt per question by a seeded shuffle, key withheld.
function licbuild(outdir, files) {
  const key = {}, byK = [[], [], [], [], []]
  for (const f of [...files].sort()) {
    const p = JSON.parse(readFileSync(f, 'utf8')), id = p.passage_id
    if (!isV6(id)) die(`${id}: licbuild is for WV6 units`)
    p.versions.forEach((v, k) => {
      const qs = p.questions.filter(q => q.kind === 'attitude' || q.kind === 'vocabulary-in-context').map(q => {
        const lid = licId(id, k, q.qid), r = rng(`lic|${lid}|${sha(v.text)}`)
        const order = shuffle([0, 1, 2, 3, 4], r)          // order[slot] = choice index
        key[lid] = { versionSha: sha(v.text), choices: q.choices, kind: q.kind, file: k, order, keyLetter: 'ABCDE'[order.indexOf(k)] }
        return { id: lid.replace(`.v${k}.`, '.'), question: q.prompt, options: Object.fromEntries(order.map((ci, slot) => ['ABCDE'[slot], q.choices[ci]])) }
      })
      byK[k].push({ passage_id: id, passage: v.text, questions: qs })
    })
  }
  mkdirSync(outdir, { recursive: true })
  byK.forEach((arr, k) => writeFileSync(join(outdir, `lic-v${k}.json`), JSON.stringify(arr, null, 1) + '\n'))
  writeFileSync(join(outdir, 'lic-key.json'), JSON.stringify(key, null, 1) + '\n')
  console.log(`  licbuild: 5 files (one per version index), ${Object.keys(key).length} question-versions; key letters ${Object.values(key).map(x => x.keyLetter).join('')}`)
}

// A1 judge input for every lexically flagged non-exempt question-version of WV5 units (all five choices listed)
function a1build(outdir, files) {
  const key = {}, out = []
  for (const f of [...files].sort()) {
    const p = JSON.parse(readFileSync(f, 'utf8')), id = p.passage_id
    if (!isV5(id)) die(`${id}: a1build is for WV5 units`)
    p.versions.forEach((v, k) => {
      const lists = []
      for (const q of p.questions) {
        if (a1Exempt(q.kind)) continue
        const flags = lexicalFlags({ subskill: q.kind, prompt: q.prompt, passage: v.text, choices: q.choices })
        if (!flags.length) continue
        lists.push({ list_id: `${id}.v${k}.${q.qid.slice(id.length + 1)}`, options: Object.fromEntries(q.choices.map((c, j) => { const oid = a1Oid(id, k, q.qid, j); key[oid] = { choice: c, versionSha: sha(v.text), lexFlag: flags.includes('ABCDE'[j]) }; return [oid, c] })) })
      }
      if (lists.length) out.push({ passage_id: `${id}.v${k}`, passage: v.text, option_lists: lists })
    })
  }
  mkdirSync(outdir, { recursive: true })
  writeFileSync(join(outdir, 'a1-judge.json'), JSON.stringify(out, null, 1) + '\n')
  writeFileSync(join(outdir, 'a1-key.json'), JSON.stringify(key, null, 1) + '\n')
  console.log(`  a1build: ${out.length} passage-versions, ${out.reduce((a, x) => a + x.option_lists.length, 0)} question-versions, ${Object.keys(key).length} option ids (${Object.values(key).filter(x => x.lexFlag).length} lexically flagged)`)
}


// ── WV9 pre-draw grouped-guess screen: one grouped options-only render per unit (version-independent), seeded
//    letters; three fresh samples; hits counted against EVERY version k (choice k). Pre-registered threshold: refuse a
//    unit if any version gets more than 40% of its picks (n = 6 questions x 3 samples = 18 -> refuse at >= 8/18).
//    With every unit at <= 7/18 for every version, ANY draw pools to <= 40% on these picks. ──
export function gscreenVerdict(hitsPerVersion, n) {
  const max = Math.max(...hitsPerVersion), lim = Math.floor(0.4 * n + 1e-9)
  return { max, lim, pass: max <= lim, argmax: hitsPerVersion.indexOf(max) }
}
function gscreenBuild(outdir, files) {
  mkdirSync(outdir, { recursive: true }); const key = {}
  for (const f of [...files].sort()) {
    const p = JSON.parse(readFileSync(f, 'utf8')), id = p.passage_id, r = rng(`gscreen|${id}`)
    const items = p.questions.map((q, i) => { const order = shuffle([0, 1, 2, 3, 4], r), qid = `${id}-G${i + 1}`; key[qid] = { unit: id, order }; return { qid, prompt: q.prompt, options: Object.fromEntries(order.map((ci, s) => ['ABCDE'[s], q.choices[ci]])) } })
    writeFileSync(join(outdir, `gscreen-${id}.json`), JSON.stringify(items, null, 1) + '\n')
  }
  writeFileSync(join(outdir, 'gscreen-key.json'), JSON.stringify(key, null, 1) + '\n')
  console.log(`  gscreen-build: ${Object.keys(key).length} questions in ${[...new Set(Object.values(key).map(k => k.unit))].length} unit files`)
}
function gscreenScore(outdir, samples) {
  const key = JSON.parse(readFileSync(join(outdir, 'gscreen-key.json'), 'utf8')), units = {}
  if (samples.length !== 3) die(`gscreen needs exactly 3 samples, got ${samples.length}`)
  for (const f of samples) { const lab = JSON.parse(readFileSync(f, 'utf8')); const L0 = lab.labels ?? lab
    for (const [qid, k] of Object.entries(key)) { const pk = L0[qid]?.pick; if (!'ABCDE'.includes(pk ?? '_') || !pk) die(`${f}: no pick for ${qid}`); (units[k.unit] ??= [0, 0, 0, 0, 0])[k.order['ABCDE'.indexOf(pk)]]++ } }
  let allPass = true
  for (const [u, h] of Object.entries(units)) { const n = h.reduce((a, b) => a + b, 0), v = gscreenVerdict(h, n); if (!v.pass) allPass = false
    console.log(`  ${u}: hits by version ${h.join('/')} of ${n}; max ${v.max} (v${v.argmax}) vs limit ${v.lim} -> ${v.pass ? 'PASS' : 'REFUSE'}`) }
  console.log(`  GSCREEN ${allPass ? 'all units pass' : 'at least one unit refused'}`)
}

function draw(outdir, files, a1Dir = null, licDir = null, senseDir = null) {
  const sorted = [...files].sort()
  const passages = verify(sorted, { quiet: true, a1Dir, licDir, senseDir })
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

function build(outdir, ctlDir, wvFiles, fixturesFile, natLiveFile, isoAll = false) {
  const batch = JSON.parse(readFileSync(join(outdir, 'batch.json'), 'utf8'))
  if (!batch.length) die('empty batch')
  const r = rng(`render|${outdir}`)
  const key = {}
  // --iso-all (SSAT-READING-AX1-PREREGISTERED.md): vocabulary items are attacked too; default keeps pilots 1-4
  const nonVocab = isoAll ? batch : batch.filter(x => x.subskill !== 'vocabulary-in-context')
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
  const strip = flags => rest.filter((x, i) => !flags.includes(x) && !flags.includes(rest[i - 1]))
  if (cmd === 'verify') { const a1Dir = after('--a1')[0] ?? null, licDir = after('--lic')[0] ?? null, senseDir = after('--senses')[0] ?? null; const fl = strip(['--a1', '--lic', '--senses']); if (!fl.length) die('no files'); verify(fl, { a1Dir, licDir, senseDir }) }
  else if (cmd === 'sensebuild') { const [out, ...f] = rest; if (!f.length) die('no files'); sensebuild(out, f) }
  else if (cmd === 'gscreen-build') { const [out, ...f] = rest; if (!f.length) die('no files'); gscreenBuild(out, f) }
  else if (cmd === 'gscreen-score') { const [out, ...f] = rest; gscreenScore(out, f) }
  else if (cmd === 'licbuild') { const [out, ...f] = rest; if (!f.length) die('no files'); licbuild(out, f) }
  else if (cmd === 'a1build') { const [out, ...f] = rest; if (!f.length) die('no files'); a1build(out, f) }
  else if (cmd === 'draw') { const a1Dir = after('--a1')[0] ?? null, licDir = after('--lic')[0] ?? null, senseDir = after('--senses')[0] ?? null; const [out, ...f] = strip(['--a1', '--lic', '--senses']); if (!f.length) die('no files'); draw(out, f, a1Dir, licDir, senseDir) }
  else if (cmd === 'build') build(rest[0], after('--ctl')[0] ?? join(HERE, 'ssat-reading-diag'), after('--wv'), after('--fixtures')[0], after('--natlive')[0], rest.includes('--iso-all'))
  else if (cmd === 'score') score(rest[0], rest.slice(1))
  else if (cmd === 'null') nullDist(rest[0], rest.slice(1))
  else die('usage: verify | draw | build | score | null')
}
