#!/usr/bin/env node
/**
 * ssat-pd.mjs — SSAT Upper Reading on REAL public-domain passages, AI-written questions only.
 * Pre-registration: SSAT-READING-PD-PILOT-PREREGISTERED.md. Brief: SSAT-PD-AUTHOR-BRIEF.md.
 *
 *   srccheck <passages.json>                       Stage S: provenance fields, source sha256, every
 *                                                  [...]-segment verbatim (in order) in the fetched file
 *                                                  after reversing listed modernizations, word ranges, slots
 *   verify   <passages.json> <items.json>... [--a1 <dir>] [--lic <dir>] [--drop <ids,...>]
 *                                                  Stage 0 rules 1-11; exit 2 on any PROBLEM
 *   a1build  <outdir> <passages.json> <items.json>...   A1 judge file (key-blind) for lexically flagged items
 *   licbuild <outdir> <passages.json> <items.json>...   licensing file (attitude + vocabulary), seeded letters
 *   freeze   <outdir> <passages.json> <items.json>... [--drop <ids>]  bank-shaped batch.json (for ssat-wv build)
 *   score    <outdir> ws|iso|scale|screen           Stage 1 relative bars at the frozen n; Stage 3 margin;
 *                                                  the pre-registered scale test (H1, H2); v2 pre-freeze screen
 *
 * v2 (SSAT-READING-PD-PILOT-V2-PREREGISTERED.md, set_ids PD2-P1..P6): the five-direction attitude rule is
 * replaced by the POLARITY rule (attitudePolarity + attitudeMix), srccheck requires a cleared recognition
 * pre-check per passage, `score screen` lists the items the pre-freeze screen sends to re-authoring, and
 * `score iso` reports the candidate rate per passage and over the recognition-cleared passages.
 *   --selftest
 *
 * Every reader refuses (exit 2) on a missing file or a short population, and prints denominators
 * before verdicts (CLAUDE.md: a check that cannot read its input must not return a number).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lexicalFlags, a1Absent, judgeOk } from './absent-check.mjs'
import { attitudeDirections, content, stemW } from './ssat-wv.mjs'
import { scoreSsat, relBar, barAMargin } from './reading-cal.mjs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const L = 'ABCDE'
const KINDS = ['main-idea', 'detail', 'inference', 'vocabulary-in-context', 'attitude', 'purpose']
export const LURES = ['stops-short', 'reversed', 'half-right', 'detail-as-whole', 'misplaced-detail', 'character-not-author', 'too-far', 'keyword-match', 'prior-knowledge', 'figurative-literal', 'true-not-answering', 'unsupported']
const SLOTS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const sha = b => createHash('sha256').update(b).digest('hex')
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); return JSON.parse(readFileSync(p, 'utf8')) }
const lab = j => j.labels ?? j
const words = s => String(s).trim().split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length
const seedInt = s => parseInt(sha(s).slice(0, 8), 16)

// ---------- normalisation for verbatim checks ----------
export const vnorm = s => String(s ?? '').replace(/_/g, '').replace(/[‘’`]/g, "'").replace(/[“”]/g, '"')
  .replace(/[—–]/g, '-').replace(/--/g, '-').replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim().toLowerCase()
/** quote is verbatim in text (normalised; ellipsis markers in the TEXT are not bridged) */
export const verbatim = (quote, text) => vnorm(quote).length > 0 && vnorm(text).includes(vnorm(quote))

/** Stage S core: segments of the excerpt (split on [...]) occur in order in the source, after reversing modernizations */
export function segmentsInSource(text, source, modernizations = []) {
  let t = String(text)
  for (const m of modernizations) { if (!m?.from || !m?.to) return { ok: false, why: 'modernization without from/to' }; t = t.split(m.to).join(m.from) }
  const segs = t.split(/\s*\[\.\.\.\]\s*/).map(x => x.trim()).filter(Boolean)
  const src = vnorm(source)
  let at = 0
  for (const [i, s] of segs.entries()) {
    const j = src.indexOf(vnorm(s), at)
    if (j < 0) return { ok: false, why: `segment ${i + 1}/${segs.length} not found verbatim after the previous one: "${s.slice(0, 70)}..."` }
    at = j + vnorm(s).length
  }
  return { ok: true, segments: segs.length }
}

function srccheck(pfile) {
  const P = rd(pfile), problems = []
  if (!Array.isArray(P) || P.length !== 6) die(`passages.json holds ${Array.isArray(P) ? P.length : 'no'} passages (need 6)`)
  const need = ['set_id', 'slot', 'genre', 'title', 'author', 'year', 'url', 'local_path', 'source_sha256', 'pd_reason', 'trims', 'modernizations', 'text']
  for (const p of P) {
    const id = p.set_id ?? '?'
    if (isV2(id)) {
      // v2 Stage S: the recognition pre-check (one fresh solver, the passage's first two sentences only) must have
      // cleared THIS text: every attempt recorded, the last one on this exact opening, answer "unknown"
      const rc = p.recognition, open2 = firstSentences(p.text, 2)
      if (!rc || !Array.isArray(rc.attempts) || !rc.attempts.length) problems.push(`${id}: v2 needs recognition.attempts (the pre-check record)`)
      else {
        const last = rc.attempts[rc.attempts.length - 1]
        if (rc.cleared !== true) problems.push(`${id}: recognition not cleared`)
        if (vnorm(last.shown) !== vnorm(open2)) problems.push(`${id}: the last recognition attempt was not shown this passage's first two sentences`)
        if (!/^unknown$/i.test(String(last.author ?? '').trim()) || !/^unknown$/i.test(String(last.work ?? '').trim())) problems.push(`${id}: the recognition solver named "${last.author}" / "${last.work}" (v2: any name replaces the passage)`)
        if (!last.solver || !last.file) problems.push(`${id}: recognition attempt needs solver and file`)
      }
      if (!String(p.fame ?? '').trim()) problems.push(`${id}: v2 needs a fame judgement`)
    }
    for (const k of need) if (p[k] === undefined || p[k] === null || (typeof p[k] === 'string' && !p[k].trim())) problems.push(`${id}: missing ${k}`)
    if (!SLOTS.includes(p.slot)) problems.push(`${id}: slot ${p.slot} not one of ${SLOTS}`)
    if (!(Number(p.year) > 1600)) problems.push(`${id}: year ${p.year}`)
    if (p.slot !== 'P6' && p.slot !== 'P4' && !(Number(p.year) < 1930)) problems.push(`${id}: ${p.slot} must be first published before 1930 (year ${p.year})`)
    if (p.slot === 'P6' && !/\.gov(\/|$)/.test(String(p.url))) problems.push(`${id}: P6 must be US federal prose (.gov url); got ${p.url}`)
    if (p.slot === 'P4' && !(Number(p.year) < 1930) && !/\.gov(\/|$)/.test(String(p.url))) problems.push(`${id}: P4 must be pre-1930 or a .gov federal text`)
    if (!p.local_path || !existsSync(p.local_path)) { problems.push(`${id}: local source file missing (${p.local_path})`); continue }
    const buf = readFileSync(p.local_path)
    if (sha(buf) !== p.source_sha256) problems.push(`${id}: source sha256 ${sha(buf).slice(0, 12)} != recorded ${String(p.source_sha256).slice(0, 12)}`)
    const r = segmentsInSource(p.text, buf.toString('utf8'), p.modernizations ?? [])
    if (!r.ok) problems.push(`${id}: ${r.why}`)
    const nTrim = (String(p.text).match(/\[\.\.\.\]/g) ?? []).length
    if (nTrim !== (p.trims ?? []).length) problems.push(`${id}: ${nTrim} [...] markers but ${(p.trims ?? []).length} trims recorded`)
    const w = words(String(p.text).replace(/\[\.\.\.\]/g, ''))
    const [lo, hi] = p.slot === 'P3' ? [150, 500] : [280, 650]
    if (w < lo || w > hi) problems.push(`${id}: ${w} words, outside ${lo}-${hi}`)
    console.log(`  ${id} ${p.slot} ${p.genre}: "${p.title}", ${p.author} (${p.year}); ${w} words; ${r.ok ? r.segments + ' segment(s) verbatim' : 'NOT VERBATIM'}; trims ${nTrim}; modernizations ${(p.modernizations ?? []).length}`)
  }
  const slots = P.map(p => p.slot).sort().join(',')
  if (slots !== SLOTS.join(',')) problems.push(`slots ${slots} != ${SLOTS.join(',')}`)
  if (new Set(P.map(p => p.set_id)).size !== 6) problems.push('set_ids not unique')
  for (const x of problems) console.log(`PROBLEM ${x}`)
  if (problems.length) { console.log(`srccheck: ${problems.length} problem(s)`); process.exit(2) }
  console.log('srccheck: 6/6 passages clean')
}

// ---------- Stage 0 ----------
/** the first n sentences of a passage (for the v2 recognition pre-check); a sentence ends at . ! or ? followed by
 *  space/newline and an opening capital or quote, or at a paragraph break (a poem's stanza break) */
export function firstSentences(text, n) {
  const t = String(text).replace(/\[\.\.\.\]/g, ' ').replace(/\r/g, '')
  const out = []; let cur = ''
  for (let i = 0; i < t.length && out.length < n; i++) {
    cur += t[i]
    const end = /[.!?]/.test(t[i]) && /^["'’”)]*(\s+["'‘“(]?[A-Z]|\s*$)/.test(t.slice(i + 1, i + 6))
    const para = t[i] === '\n' && t[i + 1] === '\n'
    if ((end || para) && cur.trim()) { let j = i + 1; while (/["'’”)]/.test(t[j] ?? '')) { cur += t[j]; j++; i++ } out.push(cur.trim().replace(/\s+/g, ' ')); cur = '' }
  }
  if (out.length < n && cur.trim()) out.push(cur.trim().replace(/\s+/g, ' '))
  return out.join(' ')
}
const paras = text => String(text).split(/\n\s*\n/).filter(x => x.trim())
const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth']
const cw = s => [...new Set(content(s).map(stemW).filter(w => w.length > 3))]
const stemEq = (a, b) => { const n = Math.min(5, a.length, b.length); return n >= 4 && a.slice(0, n) === b.slice(0, n) }
const ATT_WORDS = Object.values({ ...(await import('./ssat-wv.mjs')).ATT_DIR }).flat()
export const isV2 = id => /^PD2-/.test(String(id))
// ---------- v2 attitude rule: POLARITY, not direction (SSAT-READING-PD-PILOT-V2-PREREGISTERED.md, rule 5') ----------
// Every choice carries words of exactly one polarity class; neutral / mixed words (indifferent, detached, wistful,
// nostalgic, ironic, wry, bemused, uncertain ...) are not in either list and refuse. At least one OTHER choice shares
// the key's polarity (the key is never the only warm or only cool option) and at least two hold the opposite one.
export const POLARITY = {
  warm: 'admiring admiration approving approval appreciative appreciation proud pride respectful respect grateful gratitude sympathetic sympathy fond fondness affectionate affection enthusiastic enthusiasm reverent reverence tender tenderness amused amusement playful humorous whimsical delighted delight hopeful hope compassionate compassion warm warmth'.split(' '),
  cool: 'critical disapproving disapproval scornful scorn contemptuous contempt indignant indignation irritated irritation resentful resentment exasperated exasperation disdainful disdain annoyed annoyance angry anger mocking uneasy unease worried worry apprehensive apprehension anxious anxiety wary wariness fearful fear alarmed alarm regretful regret sad sadness mournful melancholy rueful doubtful doubt skeptical skepticism sorrowful sorrow grief troubled bitter bitterness dismayed dismay suspicious suspicion disappointed disappointment'.split(' '),
}
const NEUTRAL_ATT = new Set([...Object.values((await import('./ssat-wv.mjs')).ATT_DIR).flat()].filter(w => !POLARITY.warm.includes(w) && !POLARITY.cool.includes(w)))
const attWords = c => String(c).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' -]/g, ' ').split(/[\s-]+/).filter(Boolean)
export function attitudePolarity(choices, answer) {
  const probs = [], cls = choices.map((c, j) => {
    const ws = attWords(c), hits = Object.entries(POLARITY).filter(([, lex]) => ws.some(w => lex.includes(w))).map(([k]) => k)
    const neu = ws.filter(w => NEUTRAL_ATT.has(w))
    if (neu.length) probs.push(`attitude choice ${j} ("${c}") uses neutral/mixed word(s) ${neu.join(', ')} (v2: every choice is warm or cool)`)
    if (hits.length !== 1) probs.push(`attitude choice ${j} ("${c}") matches ${hits.length ? hits.join('+') : 'no'} polarity class (need exactly one; use a lexicon word)`)
    return hits.length === 1 ? hits[0] : null
  })
  const k = cls[answer]
  if (k) {
    const same = cls.filter((x, j) => j !== answer && x === k).length, opp = cls.filter(x => x && x !== k).length
    if (same < 1) probs.push(`attitude key "${choices[answer]}" is the only ${k} option (v2: at least one other ${k} option)`)
    if (opp < 2) probs.push(`attitude: only ${opp} option(s) of the polarity opposite the key (v2: at least two)`)
  }
  return { classes: cls, keyClass: k, keyClassSize: k ? cls.filter(x => x === k).length : 0, probs }
}
/** v2 batch rule: the key's polarity class is the 2-option class in >= floor(n/3) attitude items and the 3-option class
 *  in >= floor(n/3), so "pick from the majority (or minority) polarity" never decides the batch */
export function attitudeMix(items) {
  const att = items.filter(q => q.kind === 'attitude' && isV2(q.set_id))
  const sizes = att.map(q => attitudePolarity(q.choices, q.answer).keyClassSize), need = Math.floor(att.length / 3)
  const two = sizes.filter(x => x === 2).length, three = sizes.filter(x => x === 3).length, pr = []
  if (att.length && (two < need || three < need)) pr.push(`batch: attitude key-polarity class size 2 in ${two}/${att.length}, 3 in ${three}/${att.length} (need >= ${need} of each)`)
  const warm = att.filter(q => attitudePolarity(q.choices, q.answer).keyClass === 'warm').length
  return { pr, two, three, n: att.length, warmKeys: warm }
}

/** mechanical rules 1-9 over one passage's items; returns problem strings */
export function checkPassage(p, items) {
  const pr = [], id = p.set_id, text = p.text
  const kinds = items.map(q => q.kind).sort().join(',')
  if (kinds !== [...KINDS].sort().join(',')) pr.push(`${id}: kinds ${kinds} (need one of each: ${KINDS.join(', ')})`)
  items.forEach(q => {
    const t = q.qid
    if (!new RegExp(`^${id}-[1-6]$`).test(t ?? '')) pr.push(`${t}: qid must be ${id}-1..6`)
    if (!Array.isArray(q.choices) || q.choices.length !== 5 || q.choices.some(c => !String(c ?? '').trim())) { pr.push(`${t}: need five non-empty choices`); return }
    if (new Set(q.choices.map(c => vnorm(c))).size !== 5) pr.push(`${t}: choices not distinct`)
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 4) pr.push(`${t}: answer must be an index 0-4`)
    const ls = q.choices.map(c => c.trim().length), ratio = Math.max(...ls) / Math.min(...ls)
    if (ratio > 1.5 + 1e-9) pr.push(`${t}: choice length ratio ${ratio.toFixed(2)} > 1.5 (lengths ${ls.join('/')})`)
    if (!verbatim(q.why, text) || words(q.why) < 3) pr.push(`${t}: "why" is not a >= 3-word verbatim span of the passage`)
    if (!String(q.explanation ?? '').trim()) pr.push(`${t}: explanation missing`)
    if (/\bline[s]?\s+\d/i.test(q.prompt)) pr.push(`${t}: stem cites a line number`)
    const labelled = q.kind !== 'vocabulary-in-context' && q.kind !== 'attitude'
    const lures = []
    for (let j = 0; j < 5; j++) {
      if (j === q.answer) continue
      const k = q.kills?.[String(j)]
      if (!k) { pr.push(`${t}: no kill for choice ${j}`); continue }
      if (!verbatim(k.quote, text) || words(k.quote) < 3) pr.push(`${t}: kill quote for choice ${j} is not a >= 3-word verbatim span`)
      if (!String(k.reason ?? '').trim() || !String(k.tempts ?? '').trim()) pr.push(`${t}: kill for choice ${j} needs reason and tempts`)
      if (labelled) { if (!LURES.includes(k.lure)) pr.push(`${t}: choice ${j} lure "${k.lure}" not one of ${LURES.join('/')}`); else lures.push(k.lure) }
    }
    if (labelled && lures.length === 4) {
      if (new Set(lures).size < 2) pr.push(`${t}: only one lure kind (${lures[0]}); need >= 2`)
      if (lures.filter(x => x === 'unsupported').length > 1) pr.push(`${t}: ${lures.filter(x => x === 'unsupported').length} "unsupported" lures (at most 1)`)
    }
    if (q.kind === 'attitude') {
      const { probs } = isV2(id) ? attitudePolarity(q.choices, q.answer) : attitudeDirections(q.choices); probs.forEach(x => pr.push(`${t}: ${x}`))
      const tw = content(text).map(stemW), lexW = isV2(id) ? [...ATT_WORDS, ...POLARITY.warm, ...POLARITY.cool] : ATT_WORDS
      for (const c of q.choices) for (const w of content(c).map(stemW)) if (lexW.some(a => stemEq(stemW(a), w)) && tw.some(x => stemEq(x, w))) pr.push(`${t}: attitude word "${w}" (choice "${c}") appears in the passage`)
    }
    if (q.kind === 'vocabulary-in-context') {
      const m = String(q.prompt).match(/["“]([A-Za-z'’-]+)["”]\s+most nearly means/)
      if (!m) pr.push(`${t}: vocabulary stem must quote the word: ... the word "X" most nearly means`)
      else {
        const X = m[1].toLowerCase(), re = new RegExp(`\\b${X.replace(/[’']/g, "['’]")}\\b`, 'i')
        if (!re.test(text)) pr.push(`${t}: "${X}" does not appear in the passage`)
        const om = String(q.prompt).match(new RegExp(`\\b(${ORD.join('|')})\\s+(paragraph|stanza)`, 'i'))
        if (om) { const n = ORD.indexOf(om[1].toLowerCase()), ps = paras(text); if (!ps[n] || !re.test(ps[n])) pr.push(`${t}: "${X}" is not in the ${om[1]} ${om[2]}`) }
      }
    }
  })
  // rule 8: a stem word that appears in exactly one choice of a DIFFERENT item
  for (const q of items) for (const o of items) {
    if (o === q || !Array.isArray(o.choices)) continue
    for (const w of cw(q.prompt)) {
      const hits = o.choices.filter(c => cw(c).some(x => stemEq(x, w)))
      if (hits.length === 1) pr.push(`${q.qid}: stem word "${w}" appears in exactly one choice of ${o.qid} ("${hits[0]}")`)
    }
  }
  return pr
}
/** rule 9: length band over the whole batch */
export function lengthBand(items) {
  const n = items.length, lo = Math.round(n * 2 / 36), hi = Math.round(n * 12 / 36)
  let longest = 0, shortest = 0
  for (const q of items) {
    const ls = q.choices.map(c => c.trim().length), k = ls[q.answer]
    if (ls.filter(x => x === Math.max(...ls)).length === 1 && k === Math.max(...ls)) longest++
    if (ls.filter(x => x === Math.min(...ls)).length === 1 && k === Math.min(...ls)) shortest++
  }
  const pr = []
  if (longest < lo || longest > hi) pr.push(`batch: key uniquely longest in ${longest}/${n} (band ${lo}-${hi})`)
  if (shortest < lo || shortest > hi) pr.push(`batch: key uniquely shortest in ${shortest}/${n} (band ${lo}-${hi})`)
  return { pr, longest, shortest, lo, hi }
}

function load(pfile, ifiles, drop = []) {
  const P = rd(pfile), items = ifiles.flatMap(f => rd(f)).filter(q => !drop.includes(q.qid))
  const byId = Object.fromEntries(P.map(p => [p.set_id, p]))
  for (const q of items) if (!byId[q.set_id]) die(`${q.qid}: set_id ${q.set_id} not in passages.json`)
  if (new Set(items.map(q => q.qid)).size !== items.length) die('duplicate qids')
  return { P, byId, items }
}
const a1Oid = (qid, j) => `${qid}.${L[j]}`

function verify(pfile, ifiles, { a1Dir, licDir, drop = [] }) {
  const { P, byId, items } = load(pfile, ifiles, drop), problems = []
  const sets = [...new Set(items.map(q => q.set_id))]
  for (const s of sets) {
    const its = items.filter(q => q.set_id === s)
    const pr = checkPassage(byId[s], its)
    // after drops a passage may hold 5: then the one-of-each rule is relaxed to "no kind twice"
    problems.push(...(its.length === 6 ? pr : pr.filter(x => !/kinds .* \(need one of each/.test(x))))
    if (its.length < 6 && new Set(its.map(q => q.kind)).size !== its.length) problems.push(`${s}: a kind appears twice`)
  }
  const band = lengthBand(items); problems.push(...band.pr)
  const mix = attitudeMix(items); problems.push(...mix.pr)
  // A1
  const toJudge = items.filter(q => lexicalFlags({ subskill: q.kind, prompt: q.prompt, passage: byId[q.set_id].text, choices: q.choices }).length)
  if (a1Dir) {
    const key = rd(join(a1Dir, 'a1-key.json')), J = ['a', 'b'].map(t => lab(rd(join(a1Dir, `a1-judge.${t}.json`))))
    for (const q of toJudge) {
      const flags = lexicalFlags({ subskill: q.kind, prompt: q.prompt, passage: byId[q.set_id].text, choices: q.choices })
      for (const j of flags.map(x => L.indexOf(x))) {
        const oid = a1Oid(q.qid, j)
        if (!key[oid] || key[oid].choice !== q.choices[j] || key[oid].passageSha !== sha(byId[q.set_id].text)) { problems.push(`${q.qid}: A1 judgement for choice ${j} is stale or missing (re-run a1build + judges)`); continue }
        const vs = J.map(x => x[oid]); if (vs.some(v => typeof v?.discussed !== 'boolean')) { problems.push(`${q.qid}: A1 judge label missing for ${oid}`); continue }
        if (a1Absent(true, vs, byId[q.set_id].text)) problems.push(`${q.qid}: A1 ABSENT choice ${j} ("${q.choices[j]}"): the passage never discusses it`)
      }
    }
  } else if (toJudge.length) problems.push(`A1: ${toJudge.length} item(s) carry lexical flags and no --a1 judgements were given`)
  // licensing
  const licItems = items.filter(q => q.kind === 'attitude' || q.kind === 'vocabulary-in-context')
  if (licDir) {
    const key = rd(join(licDir, 'lic-key.json')), J = ['a', 'b'].map(t => lab(rd(join(licDir, `lic.${t}.json`))))
    for (const q of licItems) {
      const k = key[q.qid]
      if (!k || JSON.stringify(k.choices) !== JSON.stringify(q.choices) || k.answer !== q.answer || k.passageSha !== sha(byId[q.set_id].text) || k.prompt !== q.prompt) { problems.push(`${q.qid}: licensing judgement stale or missing (re-run licbuild + judges)`); continue }
      J.forEach((x, ti) => {
        const v = x[q.qid], tag = `${q.qid} licensing judge ${'ab'[ti]}`
        if (!v) { problems.push(`${tag}: no label`); return }
        if (v.pick !== k.keyLetter) problems.push(`${tag}: picked ${v.pick} ("${k.options[v.pick] ?? '?'}"), not the key`)
        if (v.second_defensible && v.second_defensible !== 'none' && v.second_defensible !== v.pick) problems.push(`${tag}: second defensible ${v.second_defensible} ("${k.options[v.second_defensible] ?? '?'}")`)
        for (const Lx of L) { if (Lx === v.pick) continue; const e = v.exclusions?.[Lx]; if (!verbatim(e, byId[q.set_id].text) || words(e) < 3) problems.push(`${tag}: no verbatim >= 3-word exclusion for ${Lx} ("${k.options[Lx]}")`) }
      })
    }
  } else problems.push(`licensing: ${licItems.length} attitude/vocabulary item(s) need --lic judgements`)
  for (const x of problems) console.log(`PROBLEM ${x}`)
  const bad = new Set(problems.map(x => x.split(/[: ]/)[0]).filter(x => /^PD2?-P\d-\d$/.test(x)))
  console.log(`verify: ${items.length} items in ${sets.length} passages; key uniquely longest ${band.longest}, shortest ${band.shortest} (band ${band.lo}-${band.hi}); A1-judged items ${toJudge.length};${mix.n ? ` attitude key-polarity 2:${mix.two} 3:${mix.three} warm keys ${mix.warmKeys}/${mix.n};` : ''} licensing items ${licItems.length}; ${problems.length} problem(s) on ${bad.size} item(s)${bad.size ? ': ' + [...bad].join(' ') : ''}`)
  if (problems.length) process.exit(2)
  console.log('verify: CLEAN')
}

function a1build(outdir, pfile, ifiles) {
  const { byId, items } = load(pfile, ifiles), key = {}, out = {}
  for (const q of items) {
    const passage = byId[q.set_id].text
    const flags = lexicalFlags({ subskill: q.kind, prompt: q.prompt, passage, choices: q.choices })
    if (!flags.length) continue
    const e = out[q.set_id] ??= { passage_id: q.set_id, passage, option_lists: [] }
    e.option_lists.push({ list_id: q.qid, options: Object.fromEntries(q.choices.map((c, j) => { const oid = a1Oid(q.qid, j); key[oid] = { choice: c, passageSha: sha(passage), lexFlag: flags.includes(L[j]) }; return [oid, c] })) })
  }
  mkdirSync(outdir, { recursive: true })
  writeFileSync(join(outdir, 'a1-judge.json'), JSON.stringify(Object.values(out), null, 1) + '\n')
  writeFileSync(join(outdir, 'a1-key.json'), JSON.stringify(key, null, 1) + '\n')
  console.log(`  a1build: ${Object.keys(out).length} passages, ${Object.values(out).reduce((a, x) => a + x.option_lists.length, 0)} items, ${Object.keys(key).length} option ids (${Object.values(key).filter(x => x.lexFlag).length} lexically flagged)`)
}

function licbuild(outdir, pfile, ifiles) {
  const { byId, items } = load(pfile, ifiles), key = {}, out = {}
  for (const q of items.filter(q => q.kind === 'attitude' || q.kind === 'vocabulary-in-context')) {
    const passage = byId[q.set_id].text, r = rng(seedInt(`pd-lic|${q.qid}|${sha(passage)}|${q.prompt}|${q.choices.join('|')}`))
    const order = shuffleWith([0, 1, 2, 3, 4], r), options = Object.fromEntries(order.map((ci, s) => [L[s], q.choices[ci]]))
    key[q.qid] = { passageSha: sha(passage), prompt: q.prompt, choices: q.choices, answer: q.answer, kind: q.kind, order, options, keyLetter: L[order.indexOf(q.answer)] }
    ;(out[q.set_id] ??= { passage_id: q.set_id, passage, questions: [] }).questions.push({ id: q.qid, question: q.prompt, options })
  }
  mkdirSync(outdir, { recursive: true })
  writeFileSync(join(outdir, 'lic.json'), JSON.stringify(Object.values(out), null, 1) + '\n')
  writeFileSync(join(outdir, 'lic-key.json'), JSON.stringify(key, null, 1) + '\n')
  console.log(`  licbuild: ${Object.keys(key).length} items; key letters ${Object.values(key).map(x => x.keyLetter).join('')}`)
}

function freeze(outdir, pfile, ifiles, drop) {
  const { byId, items } = load(pfile, ifiles, drop)
  const order = [...items].sort((a, b) => a.qid.localeCompare(b.qid))
  const batch = order.map(q => {
    const p = byId[q.set_id]
    return {
      id: q.qid, set_id: q.set_id, passageGroupId: `pd-${q.set_id}`, genre: p.genre, subskill: q.kind, difficulty: q.difficulty ?? 'medium',
      passage: p.text, prompt: q.prompt, choices: q.choices, correct_answer: q.choices[q.answer], explanation: q.explanation, why: q.why,
      kills: Object.fromEntries(Object.entries(q.kills).map(([j, x]) => [q.choices[Number(j)], x.quote])),
      kill_detail: Object.fromEntries(Object.entries(q.kills).map(([j, x]) => [q.choices[Number(j)], x])),
      source: { title: p.title, author: p.author, year: p.year, url: p.url, pd_reason: p.pd_reason, trims: p.trims, modernizations: p.modernizations, slot: p.slot, source_sha256: p.source_sha256 },
    }
  })
  for (const b of batch) if (!b.choices.includes(b.correct_answer)) die(`${b.id}: key not among choices`)
  mkdirSync(outdir, { recursive: true })
  const s = JSON.stringify(batch, null, 1) + '\n'
  writeFileSync(join(outdir, 'batch.json'), s)
  console.log(`  freeze: ${batch.length} items in ${new Set(batch.map(b => b.set_id)).size} passages; dropped ${drop.length ? drop.join(',') : 'none'}; batch sha ${sha(s)}`)
}

// ---------- scoring ----------
const LIVE = () => rd(join(HERE, 'reading-cal', 'ssat', 'score.json'))
/** Stage 1 verdicts at the frozen n, from scoreSsat output and the live score rows */
export function stage1(s, live) {
  const get = n => live.find(x => x.name.startsWith(n)) ?? (() => { throw new Error(`live score has no ${n}`) })()
  const rows = [['C exclusivity', s.excl, s.n, 'good', 'C exclusivity'], ['F easy', s.easy, s.n, 'bad', 'F easy'], ['Q distractor >= plausible', s.Q.good, s.Q.n, 'good', 'Q distractor'], ['dead-by-both', s.deadBoth, s.n, 'bad', 'dead-by-both'], ['pilot-pass', s.pass, s.n, 'good', 'pilot-pass']]
  let ok = true
  const out = rows.map(([name, k, nc, dir, ln]) => {
    const L0 = get(ln), b = relBar(L0.k, L0.n, nc, dir), pass = dir === 'good' ? k >= b.bar : k <= b.bar
    if (b.decidable && !pass) ok = false
    return { name, k, n: nc, live: `${L0.k}/${L0.n}`, bar: `${dir === 'good' ? '>=' : '<='} ${b.bar}/${nc}`, decidable: b.decidable, pass }
  })
  return { ok, rows: out }
}
/** the pre-registered scale test */
export function scaleTest(s) {
  const h1 = s.easy <= Math.floor(s.n * 0.5 + 1e-9), h2 = s.deadBoth <= Math.floor(s.n / 6 + 1e-9)
  return { h1, h2, easy: s.easy, deadBoth: s.deadBoth, n: s.n, h1Bar: Math.floor(s.n * 0.5 + 1e-9), h2Bar: Math.floor(s.n / 6 + 1e-9) }
}
function cmdScore(outdir, stage) {
  const key = rd(join(outdir, 'attack.key.json')), batch = rd(join(outdir, 'batch.json'))
  if (stage === 'ws' || stage === 'scale') {
    const wk = Object.fromEntries(Object.entries(key).filter(([, k]) => k.pop === 'withsource').map(([q, k]) => [q, { fKey: k.fKey }]))
    const n = Object.keys(wk).length; if (n !== batch.length) die(`with-source key has ${n} items; batch has ${batch.length}`)
    if (n < 24) die(`${n} frozen items < 24`)
    let s; try { s = scoreSsat(wk, ['ws-a.json', 'ws-b.json'].map(f => lab(rd(join(outdir, f))))) } catch (e) { die(e.message) }
    console.log(`STAGE 1 (C+F+Q): ${s.n} items x 2 graders; Q over ${s.Q.n} (grader x distractor) labels; bars relative to Stage A live at n = ${s.n}\n`)
    const v = stage1(s, LIVE())
    for (const r of v.rows) console.log(`  ${r.name.padEnd(26)} ${String(r.k).padStart(3)}/${r.n}  live ${r.live}  bar ${r.bar.padEnd(10)} -> ${r.decidable ? (r.pass ? 'PASS' : 'FAIL') : `reported (would ${r.pass ? 'pass' : 'fail'})`}`)
    console.log(`  Q rate ${s.Q.rate.toFixed(1)}% (live 6.1%, WV6 39.6%)`)
    for (const r of s.res) console.log(`    ${r.q} ${key[r.q].src} ${key[r.q].subskill}: ${r.excl ? 'excl' : 'NOT-EXCL'} mean-rank ${r.mean}${r.deadBoth.length ? ` dead-both ${r.deadBoth}` : ''}`)
    const t = scaleTest(s)
    console.log(`\nSTAGE 1 ${v.ok ? 'PASSES' : 'FAILS'}; not inserted even on a pass (not exclusive): ${s.res.filter(r => !r.excl).map(r => key[r.q].src).join(' ') || 'none'}`)
    console.log(`SCALE TEST: H1 easy ${t.easy}/${t.n} (bar <= ${t.h1Bar}) -> ${t.h1 ? 'MET' : 'NOT MET'}; H2 dead-by-both ${t.deadBoth}/${t.n} (bar <= ${t.h2Bar}) -> ${t.h2 ? 'MET' : 'NOT MET'}`)
    writeFileSync(join(outdir, 'stage1.json'), JSON.stringify({ verdict: v.ok ? 'PASS' : 'FAIL', rows: v.rows, Q: { good: s.Q.good, n: s.Q.n, rate: s.Q.rate }, scale: t, notExclusive: s.res.filter(r => !r.excl).map(r => key[r.q].src), perItem: s.res.map(r => ({ q: r.q, src: key[r.q].src, excl: r.excl, mean: r.mean, easy: r.easy, deadBoth: r.deadBoth })) }, null, 1) + '\n')
  } else if (stage === 'iso') {
    const files = ['iso-a.json', 'iso-b.json', 'iso-c.json'].map(f => lab(rd(join(outdir, f))))
    const ids = Object.entries(key).filter(([, k]) => k.pop === 'candidate' || k.pop === 'live')
    const nc = ids.filter(([, k]) => k.pop === 'candidate').length, nl = ids.filter(([, k]) => k.pop === 'live').length
    if (nl !== 48 || nc < 20) die(`iso key: candidate ${nc}, live ${nl}`)
    const c = [0, 0], l = [0, 0], per = {}
    files.forEach((f, i) => { for (const [q, k] of ids) { const v = f[q]; if (!v?.pick || !L.includes(v.pick)) die(`iso sample ${i + 1}: no pick for ${q}`); const a = k.pop === 'candidate' ? c : l; a[0]++; const h = v.pick === k.fKey; a[1] += h; (per[q] ??= []).push(v.pick) } })
    const cr = 100 * c[1] / c[0], lr = 100 * l[1] / l[0], v = barAMargin(cr, lr)
    const unan = pop => ids.filter(([q, k]) => k.pop === pop && new Set(per[q]).size === 1).length
    const allHit = ids.filter(([q, k]) => k.pop === 'candidate' && per[q].every(p => p === k.fKey)).map(([q]) => key[q].src)
    console.log(`STAGE 3 (A, options-only isolated, 3 samples of one solver): candidate ${c[1]}/${c[0]} = ${cr.toFixed(1)}%  live control ${l[1]}/${l[0]} = ${lr.toFixed(1)}%  margin ${(cr - lr >= 0 ? '+' : '') + (cr - lr).toFixed(1)}  bar: control 10-45% and margin <= +10 -> ${v}`)
    console.log(`  unanimity (reported): candidate ${unan('candidate')}/${nc} = ${(100 * unan('candidate') / nc).toFixed(1)}%  control ${unan('live')}/${nl} = ${(100 * unan('live') / nl).toFixed(1)}%`)
    console.log(`  candidate items solved by all three samples: ${allHit.length}/${nc}${allHit.length ? ' (' + allHit.join(' ') + ')' : ''}`)
    const perSet = {}
    for (const [q, k] of ids) if (k.pop === 'candidate') { const g = (perSet[k.group] ??= [0, 0]); g[0] += per[q].length; g[1] += per[q].filter(p => p === k.fKey).length }
    const pf = join(outdir, 'passages.json'), PP = existsSync(pf) ? rd(pf) : null
    if (!PP && Object.keys(perSet).some(isV2)) die('v2: passages.json (with the recognition record) is required beside the renders to report the cleared subset')
    const cleared = new Set((PP ?? []).filter(p => p.recognition?.cleared === true).map(p => p.set_id))
    for (const [g, [n, h]] of Object.entries(perSet).sort()) console.log(`  per passage ${g}: ${h}/${n} = ${(100 * h / n).toFixed(1)}%${PP ? (cleared.has(g) ? '  (recognition: cleared)' : '  (recognition: NOT cleared)') : ''}`)
    const cl = Object.entries(perSet).filter(([g]) => cleared.has(g)).reduce((a, [, [n, h]]) => [a[0] + n, a[1] + h], [0, 0])
    if (PP) console.log(`  recognition-cleared passages ${Object.keys(perSet).filter(g => cleared.has(g)).length}/${Object.keys(perSet).length}: candidate ${cl[1]}/${cl[0]}${cl[0] ? ` = ${(100 * cl[1] / cl[0]).toFixed(1)}%` : ''}`)
    writeFileSync(join(outdir, 'stage3.json'), JSON.stringify({ verdict: v, candidate: c, live: l, margin: cr - lr, unanimity: { candidate: unan('candidate'), nc, live: unan('live'), nl }, allHit, perPassage: perSet, cleared: PP ? { sets: [...cleared], candidate: cl } : null }, null, 1) + '\n')
  } else if (stage === 'screen') {
    // v2 pre-freeze screen: same render shape as Stage 3, three FRESH samples (never reused in Stage 3); an item is
    // sent to re-authoring when >= 2 of the 3 samples pick its key. Reported, never a gate.
    const files = ['screen-a.json', 'screen-b.json', 'screen-c.json'].map(f => lab(rd(join(outdir, f))))
    const ids = Object.entries(key).filter(([, k]) => k.pop === 'candidate' || k.pop === 'live')
    const nc = ids.filter(([, k]) => k.pop === 'candidate').length, nl = ids.filter(([, k]) => k.pop === 'live').length
    if (nl !== 48 || nc < 20) die(`screen key: candidate ${nc}, live ${nl}`)
    const hits = {}, c = [0, 0], l = [0, 0]
    files.forEach((f, i) => { for (const [q, k] of ids) { const v = f[q]; if (!v?.pick || !L.includes(v.pick)) die(`screen sample ${i + 1}: no pick for ${q}`); const h = v.pick === k.fKey ? 1 : 0; hits[q] = (hits[q] ?? 0) + h; const a = k.pop === 'candidate' ? c : l; a[0]++; a[1] += h } })
    const reauthor = ids.filter(([q, k]) => k.pop === 'candidate' && hits[q] >= 2).map(([, k]) => k.src).sort()
    const ctl2 = ids.filter(([q, k]) => k.pop === 'live' && hits[q] >= 2).length
    console.log(`SCREEN (pre-freeze, 3 fresh samples; not a gate): candidate ${c[1]}/${c[0]} = ${(100 * c[1] / c[0]).toFixed(1)}%  live control ${l[1]}/${l[0]} = ${(100 * l[1] / l[0]).toFixed(1)}%`)
    console.log(`  solved by >= 2 of 3: candidate ${reauthor.length}/${nc}  live control ${ctl2}/${nl} (${(100 * ctl2 / nl).toFixed(1)}%)`)
    console.log(`  RE-AUTHOR (new stem + full new option set, same kind, once): ${reauthor.join(' ') || 'none'}`)
    writeFileSync(join(outdir, 'screen.json'), JSON.stringify({ candidate: c, live: l, reauthor, control2of3: ctl2, nl, nc, hits: Object.fromEntries(ids.map(([q, k]) => [k.src, hits[q]])) }, null, 1) + '\n')
  } else die('score <outdir> ws|iso|scale|screen')
}

// ---------- selftest ----------
function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  const src = 'CHAPTER I\n\nThe _old_ mill stood by the colour-washed wall.\n\nIt had stood there   a hundred years; the miller said so.\n\nNobody believed him.'
  expect(segmentsInSource('The old mill stood by the color-washed wall.\n\nIt had stood there a hundred years; the miller said so.', src, [{ from: 'colour', to: 'color' }]).ok, 'S: verbatim with a listed modernization and dropped _italics_ passes')
  expect(!segmentsInSource('The old mill stood by the color-washed wall.', src, []).ok, 'S: an UNLISTED modernization fails')
  expect(segmentsInSource('The old mill stood by the colour-washed wall. [...] Nobody believed him.', src).ok, 'S: a marked trim passes')
  expect(!segmentsInSource('Nobody believed him. [...] The old mill stood by the colour-washed wall.', src).ok, 'S: segments out of order fail')
  expect(!segmentsInSource('The old mill stood by the stone wall.', src).ok, 'S: a rewritten word fails')
  const P = { set_id: 'PD-P1', text: 'The miller kept his own counsel and ground the grain at dawn.\n\nHis daughter, who was quick, saw that the wheel had a slow turn and said nothing of it.\n\nIn the third paragraph the brook ran fast and bright.' }
  const mk = (n, kind, extra = {}) => ({ qid: `PD-P1-${n}`, set_id: 'PD-P1', kind, prompt: 'Which statement is best supported?', choices: ['the miller was secretive', 'the daughter was slow', 'the brook ran dry', 'the wheel was new', 'the grain was spoiled'], answer: 0, why: 'kept his own counsel', explanation: 'x',
    kills: { 1: { lure: 'misplaced-detail', quote: 'had a slow turn', reason: 'r', tempts: 't' }, 2: { lure: 'reversed', quote: 'the brook ran fast', reason: 'r', tempts: 't' }, 3: { lure: 'half-right', quote: 'saw that the wheel', reason: 'r', tempts: 't' }, 4: { lure: 'unsupported', quote: 'ground the grain at', reason: 'r', tempts: 't' } }, ...extra })
  const att = mk(5, 'attitude', { prompt: "The narrator's attitude in the passage is best described as", choices: ['admiring', 'scornful', 'wistful', 'detached', 'amused'] })
  const voc = mk(4, 'vocabulary-in-context', { prompt: 'As it is used in the second paragraph, the word "quick" most nearly means', choices: ['clever', 'brief', 'alive', 'hasty', 'sudden'] })
  const good = [mk(1, 'main-idea'), mk(2, 'detail'), mk(3, 'inference'), voc, att, mk(6, 'purpose')]
  const pr0 = checkPassage(P, good)
  expect(pr0.length === 0, `stage 0: a clean constructed passage passes (${pr0.join(' | ')})`)
  expect(checkPassage(P, good.map(q => q.qid === 'PD-P1-1' ? { ...q, choices: ['a', 'bb', 'cc', 'dd', 'ee'] } : q)).some(x => /ratio/.test(x)), 'rule 2: ratio > 1.5 refuses')
  expect(checkPassage(P, good.map(q => q.qid === 'PD-P1-2' ? { ...q, why: 'kept his counsel' } : q)).some(x => /why/.test(x)), 'rule 4: a non-verbatim why refuses')
  expect(checkPassage(P, good.map(q => q.qid === 'PD-P1-3' ? { ...q, kills: { ...q.kills, 1: { ...q.kills[1], lure: 'reversed' }, 3: { ...q.kills[3], lure: 'reversed' }, 4: { ...q.kills[4], lure: 'reversed' } } } : q)).some(x => /only one lure/.test(x)), 'rule 3: one lure kind refuses')
  expect(checkPassage(P, good.map(q => q.qid === 'PD-P1-3' ? { ...q, kills: { ...q.kills, 1: { ...q.kills[1], lure: 'unsupported' } } } : q)).some(x => /unsupported/.test(x)), 'rule 3: two unsupported lures refuse')
  expect(checkPassage(P, good.map(q => q.qid === 'PD-P1-5' ? { ...q, choices: ['admiring', 'scornful', 'wistful', 'uneasy', 'amused'] } : q)).some(x => /share the direction/.test(x)), 'rule 5: two troubled-class attitude words refuse')
  const P2 = { ...P, text: P.text + ' He was a proud man.' }
  expect(checkPassage(P2, good.map(q => q.qid === 'PD-P1-5' ? { ...q, choices: ['proud', 'scornful', 'wistful', 'detached', 'amused'] } : q)).some(x => /appears in the passage/.test(x)), 'rule 5: an attitude word named in the passage refuses')
  expect(checkPassage(P, good.map(q => q.qid === 'PD-P1-4' ? { ...q, prompt: 'As it is used in the first paragraph, the word "quick" most nearly means' } : q)).some(x => /not in the first/.test(x)), 'rule 6: wrong paragraph ordinal refuses')
  expect(checkPassage(P, good.map(q => q.qid === 'PD-P1-2' ? { ...q, prompt: 'In lines 3-4 the narrator' } : q)).some(x => /line number/.test(x)), 'rule 7: a line number refuses')
  expect(checkPassage(P, good.map(q => q.qid === 'PD-P1-6' ? { ...q, prompt: 'Why does the narrator mention the wheel?' } : q)).some(x => /exactly one choice of/.test(x)), 'rule 8: a stem word in exactly one choice of another item refuses')
  expect(checkPassage(P, good.slice(0, 5)).some(x => /kinds/.test(x)), 'rule 1: a missing kind refuses')
  const band = n => Array.from({ length: n }, () => ({ choices: ['aaaaaaaaaa', 'bbb', 'ccc', 'ddd', 'eee'], answer: 0 }))
  expect(lengthBand(band(36)).pr.some(x => /longest in 36\/36/.test(x)), 'rule 9: key always longest refuses')
  const mixed = Array.from({ length: 36 }, (_, i) => ({ choices: ['aaaaaaaaaa', 'bbbbbbbbb', 'cccccccc', 'ddddddd', 'eeeeee'], answer: i % 5 }))
  expect(lengthBand(mixed).pr.length === 0, `rule 9: a spread batch passes (longest ${lengthBand(mixed).longest}, shortest ${lengthBand(mixed).shortest})`)
  expect(lengthBand(Array.from({ length: 36 }, (_, i) => ({ choices: ['aaaaaaaaaa', 'bbbbbbbbb', 'cccccccc', 'ddddddd', 'eeeeee'], answer: 1 + (i % 3) }))).pr.length === 2, 'rule 9: key NEVER at an extreme refuses (band, not cap)')
  // stage 1 and scale
  const live = [{ name: 'C exclusivity', k: 33, n: 33 }, { name: 'F easy', k: 32, n: 33 }, { name: 'Q distractor', k: 16, n: 264 }, { name: 'dead-by-both', k: 15, n: 33 }, { name: 'pilot-pass', k: 1, n: 33 }]
  const S = (excl, easy, qg, dead, pass, n = 36) => ({ n, excl, easy, deadBoth: dead, pass, Q: { good: qg, n: n * 8 } })
  expect(stage1(S(34, 20, 40, 10, 5), live).ok, 'stage 1: 34/36 exclusive passes')
  expect(!stage1(S(33, 20, 40, 10, 5), live).ok, 'stage 1: 33/36 exclusive fails')
  expect(!stage1(S(36, 36, 40, 10, 0), live).ok, 'stage 1: all 36 easy fails F (decidable at n = 36)')
  expect(!stage1(S(36, 20, 14, 10, 5), live).ok && stage1(S(36, 20, 15, 10, 5), live).ok, 'stage 1: Q 14/288 fails, 15/288 passes')
  expect(!stage1(S(36, 20, 40, 20, 5), live).ok && stage1(S(36, 20, 40, 19, 5), live).ok, 'stage 1: dead-by-both 20/36 fails, 19/36 passes')
  expect(stage1(S(23, 24, 9, 13, 0, 24), live).ok, 'stage 1 at n = 24: F and pilot-pass not decidable; 23/24 C passes')
  expect(scaleTest(S(36, 18, 0, 6, 0)).h1 && scaleTest(S(36, 18, 0, 6, 0)).h2 && !scaleTest(S(36, 19, 0, 7, 0)).h1 && !scaleTest(S(36, 19, 0, 7, 0)).h2, 'scale: 18/36 easy and 6/36 dead meet; 19 and 7 do not')
  expect(barAMargin(33.0, 23.0) === 'PASS' && barAMargin(33.1, 23.0) === 'FAIL' && barAMargin(30, 46) === 'INVALID', 'A: margin +10 passes, +10.1 fails, control 46% INVALID')
  // v2 polarity rule
  const pol = (ch, a) => attitudePolarity(ch, a).probs
  expect(pol(['fond', 'admiring', 'scornful', 'uneasy', 'resentful'], 0).length === 0, 'v2 rule 5: warm key with one more warm and three cool passes')
  expect(pol(['fond', 'admiring', 'grateful', 'uneasy', 'scornful'], 3).length === 0, 'v2 rule 5: cool key with one more cool and three warm passes')
  expect(pol(['fond', 'scornful', 'uneasy', 'resentful', 'anxious'], 0).some(x => /only warm/.test(x)), 'v2 rule 5: a warm key that is the ONLY warm option refuses (the v1 tell)')
  expect(pol(['scornful', 'uneasy', 'resentful', 'anxious', 'fond'], 0).some(x => /opposite/.test(x)), 'v2 rule 5: only one option of the opposite polarity refuses')
  expect(pol(['fond', 'admiring', 'scornful', 'uneasy', 'detached'], 0).some(x => /neutral/.test(x)), 'v2 rule 5: a neutral option (detached) refuses')
  expect(pol(['fond', 'admiring', 'scornful', 'uneasy', 'wistful'], 0).some(x => /neutral/.test(x)), 'v2 rule 5: a mixed option (wistful) refuses')
  expect(pol(['fond regret', 'admiring', 'scornful', 'uneasy', 'resentful'], 1).some(x => /warm\+cool/.test(x)), 'v2 rule 5: an option hitting both classes refuses')
  const attQ = (sz, i) => ({ set_id: 'PD2-P1', kind: 'attitude', answer: 0, choices: sz === 2 ? ['fond', 'scornful', 'uneasy', 'resentful', 'admiring'].map((x, j) => j === 1 ? 'admiring' : j === 4 ? 'anxious' : x) : ['fond', 'admiring', 'grateful', 'uneasy', 'scornful'], qid: `PD2-P${i}-5` })
  expect(attitudeMix([1, 2, 3, 4, 5, 6].map(i => attQ(i <= 3 ? 2 : 3, i))).pr.length === 0, 'v2 batch: key class size 2 in 3/6 and 3 in 3/6 passes')
  expect(attitudeMix([1, 2, 3, 4, 5, 6].map(i => attQ(i <= 5 ? 3 : 2, i))).pr.length === 1, 'v2 batch: key class the majority in 5/6 refuses')
  const P2v = { ...P, set_id: 'PD2-P1' }, v2items = good.map(q => ({ ...q, qid: q.qid.replace('PD-', 'PD2-'), set_id: 'PD2-P1' }))
  expect(checkPassage(P2v, v2items).some(x => /neutral/.test(x)), 'v2: checkPassage applies the polarity rule to PD2- ids (the v1 five-direction set now refuses)')
  expect(checkPassage(P2v, v2items.map(q => q.kind === 'attitude' ? { ...q, choices: ['admiring', 'grateful', 'scornful', 'uneasy', 'resentful'] } : q)).length === 0, 'v2: a polarity-balanced attitude item passes checkPassage')
  expect(firstSentences('It was late. "Go home," she said. He did not.\n\nNext.', 2) === 'It was late. "Go home," she said.', `firstSentences: two sentences with a quote (${firstSentences('It was late. "Go home," she said. He did not.', 2)})`)
  expect(firstSentences('The wind is low\nupon the hill;\n\nAnd all is still.', 2) === 'The wind is low upon the hill; And all is still.', `firstSentences: a stanza break ends a sentence (${firstSentences('The wind is low\nupon the hill;\n\nAnd all is still.', 2)})`)
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed'); process.exit(fail ? 1 : 0)
}

const [cmd, ...rest] = process.argv.slice(2)
if (import.meta.url === `file://${process.argv[1]}`) {
  const after = f => { const i = rest.indexOf(f); return i < 0 ? null : rest[i + 1] }
  const strip = fl => rest.filter((x, i) => !fl.includes(x) && !fl.includes(rest[i - 1]))
  const drop = (after('--drop') ?? '').split(',').filter(Boolean)
  if (cmd === 'srccheck') srccheck(rest[0])
  else if (cmd === 'verify') { const [p, ...f] = strip(['--a1', '--lic', '--drop']); if (!f.length) die('verify <passages> <items...>'); verify(p, f, { a1Dir: after('--a1'), licDir: after('--lic'), drop }) }
  else if (cmd === 'a1build') { const [o, p, ...f] = rest; if (!f.length) die('a1build <outdir> <passages> <items...>'); a1build(o, p, f) }
  else if (cmd === 'licbuild') { const [o, p, ...f] = rest; if (!f.length) die('licbuild <outdir> <passages> <items...>'); licbuild(o, p, f) }
  else if (cmd === 'freeze') { const [o, p, ...f] = strip(['--drop']); if (!f.length) die('freeze <outdir> <passages> <items...>'); freeze(o, p, f, drop) }
  else if (cmd === 'score') cmdScore(rest[0], rest[1])
  else if (cmd === '--selftest') selftest()
  else die('usage: srccheck | verify | a1build | licbuild | freeze | score | --selftest')
}
