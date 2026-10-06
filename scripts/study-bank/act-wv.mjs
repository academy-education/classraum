#!/usr/bin/env node
/**
 * act-wv.mjs — whole-passage-variant ACT Reading (ACT-READING-WV-PREREGISTERED.md).
 * The SSAT method (ssat-wv.mjs, pilots A77/A78 and the pilot-4 difficulty brief) adapted to the
 * enhanced ACT: FOUR choices, so FOUR complete versions; NINE questions per passage; domains
 * Key Ideas and Details / Craft and Structure / Integration of Knowledge and Ideas; paragraph
 * references, never line numbers; one paired (Passage A / Passage B) unit allowed.
 *
 *   verify <a.wv.json>...            mechanical gate; refuses (exit 2) on any violation.
 *   draw   <outdir> <a.wv.json>...   frozenSha over the files (sorted path order), the pre-registered
 *                                    k(passage_id) = sha256(SEED|frozenSha|pid) mod 4; writes
 *                                    draw.json and an act-bank-helper-shaped batch.json.
 *   build  <outdir> --wv <a.wv.json>...   (reads live ACT Reading from the DB, paged, asserted)
 *                                    withsource.json (C+F), cv.json (D), naturalness.json (E: drawn
 *                                    candidates + 6 live passages by hash), iso-fN.json (A: sibling-free
 *                                    options-only files, candidate + 4 live act-reading-v1 passages),
 *                                    grp.json (B: passage blocks, options-only), attack.key.json.
 *   score  <outdir> [--ws f...] [--cv f...] [--nat f...] [--iso f...] [--grp f...]
 *   null   <outdir> --iso f... | --grp f...   exact null of candidate hits over all 4^P draws.
 *
 * Every scorer refuses on a short population (CLAUDE.md: a check that cannot read its input must
 * not return a number).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { distinctive } from './ssat-wv.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const L = 'ABCD'
const NV = 4
const NQ = 9
const SEED = 'act-wv-2026-10-06'
const GENRES = ['literary_narrative', 'social_science', 'humanities', 'natural_science']
const KIND_DOMAIN = {
  inference: 'Key Ideas and Details', detail: 'Key Ideas and Details', 'main-idea': 'Key Ideas and Details',
  'vocabulary-in-context': 'Craft and Structure', attitude: 'Craft and Structure', purpose: 'Craft and Structure',
  argument: 'Integration of Knowledge and Ideas', comparison: 'Integration of Knowledge and Ideas',
}
// per-unit mix (prereg §Mix)
const MIX = { 'vocabulary-in-context': [1, 1], attitude: [1, 1], purpose: [1, 1], inference: [2, 4], detail: [0, 1], 'main-idea': [0, 1], argument: [0, 2], comparison: [0, 2] }
const DOMAIN_N = { 'Key Ideas and Details': 4, 'Craft and Structure': 3, 'Integration of Knowledge and Ideas': 2 }
const NEG = /\b(not|no|never|nothing|nor|none|neither|nobody|nowhere)\b|n't\b/gi
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const sha = b => createHash('sha256').update(b).digest('hex')
const words = s => String(s).trim().split(/\s+/).filter(Boolean).length
const norm = s => String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim()
const STOP = new Set('the a an of to in on and or for with by at from as that this which who whom whose was were is are be been his her their its it he she they them him one what how why when chiefly most best passage author writer narrator'.split(' '))
const content = s => norm(s).replace(/[^a-z' ]/g, ' ').split(' ').filter(w => w.length > 3 && !STOP.has(w))
const stemW = w => w.replace(/'s$/, '').replace(/'/g, '')
const stemEq = (a, b) => { const n = Math.min(5, a.length, b.length); return n >= 4 && a.slice(0, n) === b.slice(0, n) }
const present = (w, textWords) => textWords.some(t => stemEq(t, w))
const paras = t => String(t).split(/\n\s*\n/).filter(x => x.trim())
// paired text: "Passage A" header ... "Passage B" header ...; returns [A, B] bodies or null
function splitAB(t) {
  const m = String(t).match(/^\s*Passage A\b[^\n]*\n([\s\S]*?)\n\s*Passage B\b[^\n]*\n([\s\S]*)$/)
  return m ? [m[1], m[2]] : null
}

export function kOf(frozenSha, pid) { return parseInt(sha(`${SEED}|${frozenSha}|${pid}`).slice(0, 8), 16) % NV }

function verify(files, { quiet = false } = {}) {
  const problems = [], notes = []
  const units = files.map(f => ({ f, p: JSON.parse(readFileSync(f, 'utf8')) }))
  for (const { f, p } of units) {
    const id = p.passage_id ?? f
    if (!/^AWV\d+-P\d{2}$/.test(String(p.passage_id))) problems.push(`${id}: passage_id must look like AWV1-P01`)
    if (!GENRES.includes(p.genre)) problems.push(`${id}: genre "${p.genre}" not one of ${GENRES.join(' | ')}`)
    if (typeof p.paired !== 'boolean') problems.push(`${id}: paired must be true or false`)
    if (!String(p.passage_title ?? '').trim()) problems.push(`${id}: passage_title missing`)
    if (!Array.isArray(p.versions) || !Array.isArray(p.questions)) { problems.push(`${id}: versions/questions missing`); continue }
    if (p.versions.length !== NV) { problems.push(`${id}: ${p.versions.length} versions (need ${NV})`); continue }
    if (new Set(p.versions.map(v => norm(v.text))).size !== NV) problems.push(`${id}: versions not distinct`)
    const vl = p.versions.map(v => words(v.text))
    vl.forEach((n, k) => { if (n < 680 || n > 880) problems.push(`${id} v${k}: ${n} words, outside 680-880`) })
    if (Math.max(...vl) / Math.min(...vl) > 1.2) problems.push(`${id}: version word ratio ${(Math.max(...vl) / Math.min(...vl)).toFixed(2)} > 1.2`)
    const negs = [], pcounts = []
    p.versions.forEach((v, k) => {
      if (/\blines?\s+\d+/i.test(v.text)) problems.push(`${id} v${k}: passage text cites a line number`)
      let bodies
      if (p.paired) {
        const ab = splitAB(v.text)
        if (!ab) { problems.push(`${id} v${k}: paired unit must open with a "Passage A" header line and contain a "Passage B" header line`); return }
        ab.forEach((b, i) => { const n = words(b); if (n < 300 || n > 470) problems.push(`${id} v${k}: Passage ${'AB'[i]} ${n} words, outside 300-470`) })
        bodies = ab
      } else {
        if (/Passage A|Passage B/.test(v.text)) problems.push(`${id} v${k}: unpaired unit carries Passage A/B headers`)
        bodies = [v.text]
      }
      const pc = bodies.map(b => paras(b).length)
      pcounts.push(pc.join('+'))
      bodies.forEach((b, bi) => {
        const n = paras(b).length, lo = p.paired ? 2 : 5, hi = p.paired ? 6 : 10
        if (n < lo || n > hi) problems.push(`${id} v${k}${p.paired ? ` Passage ${'AB'[bi]}` : ''}: ${n} paragraphs (need ${lo}-${hi})`)
      })
      const pn = bodies.flatMap(b => paras(b).map(x => (x.match(NEG) ?? []).length))
      pn.forEach((n, i) => { if (n > 2) problems.push(`${id} v${k} paragraph ${i + 1}: ${n} negation tokens (max 2 per paragraph: no denial runs)`) })
      negs.push(pn.reduce((a, b) => a + b, 0))
    })
    if (new Set(pcounts).size > 1) problems.push(`${id}: paragraph counts differ across versions (${pcounts.join(' / ')}); stems cite paragraphs, so every version needs the same paragraphing`)
    if (p.questions.length !== NQ) problems.push(`${id}: ${p.questions.length} questions (need ${NQ})`)
    for (const q of p.questions) if (!KIND_DOMAIN[q.kind]) problems.push(`${id}/${q.qid}: kind "${q.kind}" not one of ${Object.keys(KIND_DOMAIN).join(', ')}`)
    for (const [k, [lo, hi]] of Object.entries(MIX)) {
      const n = p.questions.filter(q => q.kind === k).length
      if (n < lo || n > hi) problems.push(`${id}: ${n} ${k} question(s) (mix needs ${lo}-${hi})`)
    }
    for (const [d, n] of Object.entries(DOMAIN_N)) {
      const got = p.questions.filter(q => KIND_DOMAIN[q.kind] === d).length
      if (got !== n) problems.push(`${id}: ${got} ${d} questions (need exactly ${n})`)
    }
    if (p.paired && !p.questions.some(q => q.kind === 'comparison')) problems.push(`${id}: a paired unit needs at least 1 comparison question`)
    if (!p.paired && p.questions.some(q => q.kind === 'comparison')) problems.push(`${id}: comparison questions belong to paired units`)
    let absent = 0, attn = 0, named = 0, nk = 0, lexHits = 0, lexN = 0
    p.questions.forEach((q, qi) => {
      const tag = `${id}/${q.qid}`
      if (q.qid !== `${id}-${qi + 1}`) problems.push(`${tag}: qid must be ${id}-${qi + 1}`)
      if (!q.prompt?.trim()) problems.push(`${tag}: empty prompt`)
      if (/\blines?\s+\d+/i.test(q.prompt ?? '')) problems.push(`${tag}: stem cites a line number — cite the paragraph or quote the phrase`)
      if (!['easy', 'medium', 'hard'].includes(q.difficulty)) problems.push(`${tag}: difficulty "${q.difficulty}"`)
      if (q.choices?.length !== NV) { problems.push(`${tag}: ${q.choices?.length} choices (need ${NV})`); return }
      if (new Set(q.choices.map(norm)).size !== NV) problems.push(`${tag}: choices not distinct`)
      const cl = q.choices.map(c => c.length)
      if (Math.max(...cl) / Math.min(...cl) > 1.6) problems.push(`${tag}: choice length ratio ${(Math.max(...cl) / Math.min(...cl)).toFixed(2)} > 1.6`)
      // paragraph references must exist in every version
      const pm = [...String(q.prompt).matchAll(/\bparagraph\s+(\d+)/gi)].map(m => +m[1])
      const ordinals = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 }
      for (const m of String(q.prompt).matchAll(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+paragraph/gi)) pm.push(ordinals[m[1].toLowerCase()])
      if (pm.length && pcounts.length) { const minP = Math.min(...pcounts[0].split('+').map(Number)); pm.forEach(n => { if (n > minP) problems.push(`${tag}: stem names paragraph ${n} but a passage has only ${minP}`) }) }
      if (q.kind === 'vocabulary-in-context') {
        const w = (q.prompt.match(/["“]([^"”]+)["”]/) ?? [])[1]
        if (!w || !/most nearly means/i.test(q.prompt)) problems.push(`${tag}: vocabulary stem must quote the word and read "most nearly means"`)
        else p.versions.forEach((v, k) => {
          const n = (norm(v.text).match(new RegExp(`\\b${norm(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')) ?? []).length
          if (n !== 1) problems.push(`${tag} v${k}: vocabulary target "${w}" occurs ${n}x (need exactly once in every version)`)
        })
      }
      if (q.support?.length !== NV) { problems.push(`${tag}: ${q.support?.length} support entries (need ${NV}, one per version)`); return }
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
          const sc = q.choices.map(c => { const cw = content(c); return cw.length ? cw.filter(w => Ts.has(w)).length / cw.length : 0 })
          const mx = Math.max(...sc), top = sc.map((x, i) => x === mx ? i : -1).filter(i => i >= 0)
          lexN++; lexHits += top.includes(k) ? 1 / top.length : 0
        }
      })
    })
    for (const q of p.questions) for (const o of p.questions) {
      if (o === q) continue
      const stem = new Set(content(o.prompt))
      for (const c of q.choices ?? []) {
        const own = content(c).filter(w => stem.has(w) && !(q.choices.filter(x => x !== c).some(x => content(x).includes(w))))
        if (own.length) problems.push(`${id}: stem of ${o.qid} contains "${own.join(',')}", unique to one choice of ${q.qid}`)
      }
    }
    notes.push(`${id}: ${p.genre}${p.paired ? ' (paired)' : ''}; words ${vl.join('/')}; paragraphs ${pcounts[0] ?? '?'}; negations per version ${negs.join('/')}; kills naming the rival ${named}/${nk}; lexical word-match solver ${lexHits.toFixed(1)}/${lexN} (25% = ${(lexN / 4).toFixed(1)}); absent-option hits ${absent}, named-attitude hits ${attn}`)
  }
  if (!quiet) notes.forEach(n => console.log('  ' + n))
  if (problems.length) { problems.forEach(x => console.log('  PROBLEM ' + x)); die(`${problems.length} mechanical problem(s)`) }
  console.log(`  verify OK: ${units.length} unit(s), ${units.reduce((a, x) => a + x.p.questions.length, 0)} questions, ${units.length * NV} versions, ${units.reduce((a, x) => a + x.p.questions.length * NV * (NV - 1), 0)} kill quotes verbatim`)
  return units
}

function rng(seedStr) { let s = parseInt(sha(seedStr).slice(0, 8), 16); return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff } }
function shuffle(a, r) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[b[i], b[j]] = [b[j], b[i]] } return b }
function dealer(n, r) { const d = []; while (d.length < n) d.push(...shuffle([...L], r)); let i = 0; return () => d[i++] }
function placeKey(choices, key, letter, r) { const rest = shuffle(choices.filter(c => c !== key), r); rest.splice(L.indexOf(letter), 0, key); return rest }

function draw(outdir, files) {
  const sorted = [...files].sort()
  const units = verify(sorted, { quiet: true })
  const frozenSha = sha(Buffer.concat(sorted.map(f => readFileSync(f))))
  mkdirSync(outdir, { recursive: true })
  const drawn = {}, batch = []
  const r = rng(`batch|${frozenSha}`)
  const deal = dealer(units.length * NQ, r)
  for (const { p } of units) {
    const k = drawn[p.passage_id] = kOf(frozenSha, p.passage_id)
    for (const q of p.questions) {
      const s = q.support[k], key = q.choices[k]
      const choices = placeKey(q.choices, key, deal(), r) // stored order dealt flat: never "choice index = version"
      batch.push({
        id: q.qid, passage_id: p.passage_id, passage_title: p.passage_title, genre: p.genre, paired: p.paired,
        passage: p.versions[k].text, prompt: q.prompt, choices, correct_answer: key,
        explanation: s.why.length > 0 ? `The passage states: "${s.why}"` : '', domain: KIND_DOMAIN[q.kind], subskill: q.kind,
        difficulty: q.difficulty, wv: { version: k },
      })
    }
  }
  const hist = Array(NV).fill(0); Object.values(drawn).forEach(k => hist[k]++)
  writeFileSync(join(outdir, 'draw.json'), JSON.stringify({ seed: SEED, files: sorted, frozenSha, drawn, versionHistogram: hist }, null, 1))
  writeFileSync(join(outdir, 'batch.json'), JSON.stringify(batch, null, 1))
  console.log(`  frozenSha ${frozenSha}\n  drawn ${JSON.stringify(drawn)}; version histogram ${hist.join('/')}\n  wrote ${outdir}/draw.json, batch.json (${batch.length} items)`)
}

async function liveReading() {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync(join(HERE, '../../.env.local'), 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,cohort,domain,task,passage_group_id,verified,item')
      .eq('family', 'act').eq('section', 'reading').eq('archived', false).eq('verified', true).order('id').range(f, f + 999)
    if (error) die(error.message)
    rows.push(...data); if (data.length < 1000) break
  }
  if (new Set(rows.map(x => x.id)).size !== rows.length) die('paging slipped')
  const groups = {}
  for (const x of rows) (groups[x.passage_group_id] ??= []).push(x)
  for (const [g, list] of Object.entries(groups)) {
    if (list.length !== 9) die(`live group ${g} has ${list.length} rows`)
    if (new Set(list.map(x => x.item.passage)).size !== 1) die(`live group ${g} passages differ`)
    for (const x of list) if (!x.item.choices?.includes(x.item.correct_answer) || x.item.choices.length !== 4) die(`live ${x.id}: bad choices/key`)
  }
  return groups
}
const byHash = (ids, salt) => [...ids].sort((a, b) => sha(`${salt}|${a}`).localeCompare(sha(`${salt}|${b}`)))
const isVocab = prompt => /most nearly means/i.test(prompt)

async function build(outdir, wvFiles) {
  const batch = JSON.parse(readFileSync(join(outdir, 'batch.json'), 'utf8'))
  if (!batch.length) die('empty batch')
  const r = rng(`render|${outdir}`)
  const key = {}
  const groupsLive = await liveReading()
  const liveIds = Object.keys(groupsLive)
  console.log(`  live verified ACT Reading: ${liveIds.length} passages, ${Object.values(groupsLive).flat().length} rows`)
  // control for A/B: 4 complete passages of the human-cleared cohort act-reading-v1, chosen by hash
  const ctlIds = byHash(liveIds.filter(g => g.startsWith('act-reading-v1:')), `${SEED}|ctl`).slice(0, 4)
  // E: 6 live passages from all live verified cohorts, chosen by hash
  const natIds = byHash(liveIds, `${SEED}|nat`).slice(0, 6)
  if (ctlIds.length !== 4 || natIds.length !== 6) die('control selection short')
  const units = [...new Set(batch.map(x => x.passage_id))]
  // ---- withsource (C+F): drawn passages, items dealt flat ----
  const dealW = dealer(batch.length, r)
  const ws = units.map((u, ui) => {
    const items = batch.filter(x => x.passage_id === u)
    return { passage_id: `P${ui + 1}`, passage: items[0].passage, questions: items.map((x, i) => {
      const opts = placeKey(x.choices, x.correct_answer, dealW(), r), qid = `W${ui + 1}-${i + 1}`
      key[qid] = { src: x.id, pop: 'withsource', group: u, fKey: L[opts.indexOf(x.correct_answer)], kind: x.subskill }
      return { qid, prompt: x.prompt, options: Object.fromEntries(opts.map((c, j) => [L[j], c])) }
    }) }
  })
  writeFileSync(join(outdir, 'withsource.json'), JSON.stringify(ws, null, 1))
  // ---- cv (D): every version x every question ----
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
  // ---- naturalness (E) ----
  const nat = shuffle([...units.map(u => ({ src: u, passage: batch.find(x => x.passage_id === u).passage })),
    ...natIds.map(g => ({ src: `live:${g}`, passage: groupsLive[g][0].item.passage }))], r)
  const nkey = {}
  writeFileSync(join(outdir, 'naturalness.json'), JSON.stringify(nat.map((x, i) => { nkey[`N${i + 1}`] = x.src; return { id: `N${i + 1}`, passage: x.passage } }), null, 1))
  writeFileSync(join(outdir, 'naturalness.key.json'), JSON.stringify(nkey, null, 1))
  // ---- A/B population: non-vocab items, candidate + control, options only ----
  const candItems = batch.filter(x => !isVocab(x.prompt)).map(x => ({ src: x.id, group: x.passage_id, pop: 'candidate', choices: x.choices, key: x.correct_answer, kind: x.subskill }))
  const ctlItems = ctlIds.flatMap(g => groupsLive[g].filter(x => !isVocab(x.item.prompt)).map(x => ({ src: x.id, group: g, pop: 'live', choices: x.item.choices, key: x.item.correct_answer, kind: x.domain })))
  const all = [...candItems, ...ctlItems]
  // iso: sibling-free files (one item per passage per file); keys dealt flat GLOBALLY across both pops
  const byG = {}
  for (const it of shuffle(all, r)) (byG[it.group] ??= []).push(it)
  const depth = Math.max(...Object.values(byG).map(v => v.length))
  const dealI = dealer(all.length, r)
  for (let f = 0; f < depth; f++) {
    const picked = shuffle(Object.values(byG).map(v => v[f]).filter(Boolean), r)
    if (new Set(picked.map(x => x.group)).size !== picked.length) die(`iso file ${f + 1} repeats a passage`)
    const out = picked.map((it, i) => {
      const qid = `I${f + 1}-${String(i + 1).padStart(2, '0')}`, opts = placeKey(it.choices, it.key, dealI(), r)
      key[qid] = { src: it.src, pop: `iso-${it.pop}`, group: it.group, fKey: L[opts.indexOf(it.key)], file: f + 1, choiceOrder: opts }
      return { qid, options: Object.fromEntries(opts.map((c, j) => [L[j], c])) }
    })
    writeFileSync(join(outdir, `iso-f${f + 1}.json`), JSON.stringify(out, null, 1))
  }
  // grp: passage blocks (unlabelled arm), options only
  const dealG = dealer(all.length, r)
  const blocks = shuffle(Object.keys(byG), r).map((g, bi) => ({ block: `B${bi + 1}`, items: all.filter(x => x.group === g).map((it, i) => {
    const qid = `G${bi + 1}-${i + 1}`, opts = placeKey(it.choices, it.key, dealG(), r)
    key[qid] = { src: it.src, pop: `grp-${it.pop}`, group: it.group, fKey: L[opts.indexOf(it.key)], choiceOrder: opts }
    return { qid, options: Object.fromEntries(opts.map((c, j) => [L[j], c])) }
  }) }))
  writeFileSync(join(outdir, 'grp.json'), JSON.stringify(blocks, null, 1))
  writeFileSync(join(outdir, 'attack.key.json'), JSON.stringify({ ctlIds, natIds, key }, null, 1))
  const slot = pop => { const t = { A: 0, B: 0, C: 0, D: 0 }; Object.values(key).filter(k => k.pop === pop).forEach(k => t[k.fKey]++); return JSON.stringify(t) }
  console.log(`  withsource ${batch.length} items; cv ${wvFiles?.length ?? 0} units; naturalness ${nat.length} (candidates ${units.length}, live ${natIds.join(', ')})`)
  console.log(`  A/B control passages (act-reading-v1): ${ctlIds.join(', ')}; candidate ${candItems.length}, control ${ctlItems.length}`)
  console.log(`  iso files ${depth}; slots candidate ${slot('iso-candidate')} live ${slot('iso-live')}; grp blocks ${blocks.length}; slots candidate ${slot('grp-candidate')} live ${slot('grp-live')}`)
}

const load = f => { const j = JSON.parse(readFileSync(f, 'utf8')); return j.labels ?? j }
const RANK = { easy: 1, medium: 2, hard: 3 }
const med = a => { const b = [...a].sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2 }

function screen(name, key, files, pfx) {
  const cand = Object.entries(key).filter(([, k]) => k.pop === `${pfx}-candidate`), live = Object.entries(key).filter(([, k]) => k.pop === `${pfx}-live`)
  const t = { candidate: [0, 0], live: [0, 0] }
  const labs = files.map(load)
  if (pfx === 'iso') {
    // each file answered by one solver; every qid must be answered exactly once across files
    const merged = Object.assign({}, ...labs)
    for (const [q, k] of [...cand, ...live]) { const v = merged[q]; if (!v || !L.includes(v.pick)) die(`${name}: ${q} unanswered`); const p = k.pop.endsWith('candidate') ? 'candidate' : 'live'; t[p][0]++; t[p][1] += v.pick === k.fKey ? 1 : 0 }
  } else {
    for (const [f, lab] of labs.map((l, i) => [files[i], l])) {
      for (const [q, k] of [...cand, ...live]) { const v = lab[q]; if (!v || !L.includes(v.pick)) die(`${name} ${f}: ${q} unanswered`); const p = k.pop.endsWith('candidate') ? 'candidate' : 'live'; t[p][0]++; t[p][1] += v.pick === k.fKey ? 1 : 0 }
    }
  }
  const c = 100 * t.candidate[1] / t.candidate[0], l = 100 * t.live[1] / t.live[0], d = c - l
  const ceiling = l > 90
  const v = ceiling ? 'CANNOT FIRE (control > 90%: a +10 excess is unreachable)' : d <= 10 ? 'PASS' : 'FAIL'
  console.log(`  ${name}: candidate ${t.candidate[1]}/${t.candidate[0]} = ${c.toFixed(1)}%  live control ${t.live[1]}/${t.live[0]} = ${l.toFixed(1)}%  excess ${d >= 0 ? '+' : ''}${d.toFixed(1)} -> ${v}`)
  return ceiling ? 'CANNOT_FIRE' : d <= 10 ? 'PASS' : 'FAIL'
}

function score(outdir, args) {
  const K = JSON.parse(readFileSync(join(outdir, 'attack.key.json'), 'utf8')), key = K.key
  const sets = { ws: [], cv: [], nat: [], iso: [], grp: [] }
  let cur = null
  for (const a of args) { if (a.startsWith('--')) cur = a.slice(2); else if (cur) sets[cur].push(a) }
  const verdicts = {}
  if (sets.ws.length) {
    if (sets.ws.length !== 3) die(`C+F are pre-registered on 3 graders, got ${sets.ws.length}`)
    const items = Object.entries(key).filter(([, k]) => k.pop === 'withsource')
    const res = {}
    for (const f of sets.ws) {
      const lab = load(f)
      const got = items.filter(([q]) => lab[q] && RANK[lab[q].difficulty] && L.includes(lab[q].pick)).length
      if (got !== items.length) die(`${f}: ${got}/${items.length} with-source items answered with pick + difficulty`)
      for (const [q, k] of items) {
        const v = lab[q]; const sd = v.second_defensible && v.second_defensible !== 'none' && v.second_defensible !== v.pick
        ;(res[k.src] ??= { group: k.group, rs: [] }).rs.push({ hit: v.pick === k.fKey, sd, pick: v.pick, key: k.fKey, second: v.second_defensible, diff: v.difficulty, note: v.note })
      }
    }
    let pass = 0, easy = 0
    const perUnit = {}
    for (const [src, { group, rs }] of Object.entries(res)) {
      const ok = rs.every(x => x.hit && !x.sd); if (ok) pass++
      ;(perUnit[group] ??= [0, 0]); perUnit[group][1]++; if (ok) perUnit[group][0]++
      const m = rs.reduce((a, x) => a + RANK[x.diff], 0) / rs.length
      if (m <= 1.5) easy++
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${src}: ${rs.map(x => `${x.pick}${x.hit ? '' : '(key ' + x.key + ')'}${x.sd ? ' 2nd ' + x.second : ''} ${x.diff}`).join(' | ')}${ok ? '' : ' — ' + rs.filter(x => !x.hit || x.sd).map(x => x.note).join(' / ')}`)
    }
    const n = Object.keys(res).length
    verdicts.C = pass >= Math.ceil(n * 15 / 18) ? 'PASS' : 'FAIL'
    verdicts.F = easy <= n / 2 ? 'PASS' : 'FAIL'
    console.log(`  per unit (all 9 needed to insert a passage): ${Object.entries(perUnit).map(([g, [a, b]]) => `${g} ${a}/${b}`).join(', ')}`)
    console.log(`  BAR C: ${pass}/${n} items pass with-source exclusivity (3 graders) -> ${verdicts.C} (>= ${Math.ceil(n * 15 / 18)})`)
    console.log(`  BAR F (difficulty): ${easy}/${n} items grader-mean easy (mean rank <= 1.5) -> ${verdicts.F} (<= ${n / 2})`)
  }
  if (sets.cv.length) {
    const lab = load(sets.cv[0]); const ids = Object.keys(lab)
    const cvf = JSON.parse(readFileSync(join(outdir, 'cv.json'), 'utf8')), want = cvf.flatMap(u => u.questions.map(q => q.id))
    const miss = want.filter(i => !lab[i] || typeof lab[i].valid !== 'boolean')
    if (miss.length) die(`${sets.cv[0]}: ${miss.length}/${want.length} question-versions unanswered`)
    const bad = want.filter(i => lab[i].valid !== true)
    bad.forEach(i => console.log(`  CV FAIL ${i}: ${lab[i].reason ?? ''}`))
    verdicts.D = want.length - bad.length >= Math.ceil(want.length * 0.9) ? 'PASS' : 'FAIL'
    console.log(`  BAR D: ${want.length - bad.length}/${want.length} question-versions valid -> ${verdicts.D} (>= 90%)${ids.length > want.length ? ' (extra keys ignored)' : ''}`)
  }
  if (sets.nat.length) {
    const nkey = JSON.parse(readFileSync(join(outdir, 'naturalness.key.json'), 'utf8'))
    const ids = Object.keys(nkey), isLive = n => nkey[n].startsWith('live:')
    const nc = ids.filter(n => !isLive(n)).length, nl = ids.filter(isLive).length
    if (nc < 1 || nl !== 6) die(`naturalness key: ${nc} candidates, ${nl} live (need 6 live)`)
    const valid = []
    for (const f of sets.nat) {
      const lab = load(f)
      const bad = ids.filter(n => !lab[n] || !Number.isInteger(lab[n].rating) || lab[n].rating < 1 || lab[n].rating > 5 || !String(lab[n].reason ?? '').trim())
      const flat = new Set(ids.map(n => lab[n]?.rating)).size === 1
      const ok = !bad.length && !flat
      console.log(`  nat ${f.replace(/^.*\//, '')}: ${ids.length - bad.length}/${ids.length} rated with a reason${flat ? ', ALL IDENTICAL' : ''} -> ${ok ? 'valid' : 'DISCARD'}; ${ids.map(n => `${nkey[n]} ${lab[n]?.rating}`).join(', ')}`)
      if (ok) valid.push(lab)
    }
    if (valid.length < 2) { verdicts.E = 'INCOMPLETE'; console.log('  BAR E: fewer than 2 valid judges') }
    else {
      const cr = valid.flatMap(l => ids.filter(n => !isLive(n)).map(n => l[n].rating)), lr = valid.flatMap(l => ids.filter(isLive).map(n => l[n].rating))
      const cm = med(cr), lm = med(lr)
      console.log(`  E pooled medians: candidate ${cm} (n=${cr.length})  live ${lm} (n=${lr.length})`)
      if (lm <= 1) { verdicts.E = 'INVALID'; console.log('  BAR E: INVALID: live median 1 (floor)') }
      else { verdicts.E = cm >= lm ? 'PASS' : 'FAIL'; console.log(`  BAR E: ${verdicts.E} (candidate median >= live median)`) }
    }
  }
  if (sets.iso.length) verdicts.A = screen('SCREEN A iso (sibling-free, options-only)', key, sets.iso, 'iso')
  if (sets.grp.length) verdicts.B = screen(`SCREEN B grouped (${sets.grp.length} samples)`, key, sets.grp, 'grp')
  console.log(`  VERDICTS ${JSON.stringify(verdicts)}`)
}

// exact null: picks fixed, the candidate key of passage u = original choice k(u), over all 4^P draws
function nullDist(outdir, args, wvFiles) {
  const K = JSON.parse(readFileSync(join(outdir, 'attack.key.json'), 'utf8')), key = K.key
  const pfx = args[0] === '--grp' ? 'grp' : 'iso'
  const labs = args.slice(1).map(load)
  const units = Object.fromEntries(wvFiles.map(f => { const p = JSON.parse(readFileSync(f, 'utf8')); return [p.passage_id, p] }))
  const cq = Object.entries(key).filter(([, k]) => k.pop === `${pfx}-candidate`)
  const groups = [...new Set(cq.map(([, k]) => k.group))]
  const per = groups.map(g => [0, 1, 2, 3].map(v => cq.filter(([, k]) => k.group === g).reduce((a, [q, k]) => {
    const qq = units[g].questions.find(x => x.qid === k.src), want = qq.choices[v]
    return a + labs.reduce((b, l) => { const pk = l[q]?.pick; return b + (pk && k.choiceOrder[L.indexOf(pk)] === want ? 1 : 0) }, 0)
  }, 0)))
  let dist = { 0: 1 }
  for (const pv of per) { const nd = {}; for (const [h, c] of Object.entries(dist)) for (const x of pv) nd[+h + x] = (nd[+h + x] ?? 0) + c / 4; dist = nd }
  const n = cq.length * (pfx === 'iso' ? 1 : labs.length)
  const obs = cq.reduce((a, [q, k]) => a + labs.reduce((b, l) => b + (l[q]?.pick === k.fKey ? 1 : 0), 0), 0)
  const mean = Object.entries(dist).reduce((a, [h, p]) => a + h * p, 0)
  const pge = Object.entries(dist).filter(([h]) => +h >= obs).reduce((a, [, p]) => a + p, 0)
  console.log(`  exact null (${pfx}) over 4^${groups.length} draws: observed ${obs}/${n}; mean ${mean.toFixed(1)} (${(100 * mean / n).toFixed(1)}%); P(>= observed) = ${pge.toFixed(3)}`)
}

const [cmd, ...rest] = process.argv.slice(2)
if (import.meta.url === `file://${process.argv[1]}`) {
  const after = flag => { const i = rest.indexOf(flag); if (i < 0) return []; const out = []; for (let j = i + 1; j < rest.length && !rest[j].startsWith('--'); j++) out.push(rest[j]); return out }
  if (cmd === 'verify') { if (!rest.length) die('no files'); verify(rest) }
  else if (cmd === 'draw') { const [out, ...f] = rest; if (!f.length) die('no files'); if (existsSync(join(out, 'draw.json'))) die(`${out}/draw.json exists: the draw is never re-rolled`); draw(out, f) }
  else if (cmd === 'build') await build(rest[0], after('--wv'))
  else if (cmd === 'score') score(rest[0], rest.slice(1))
  else if (cmd === 'null') nullDist(rest[0], rest.slice(1).filter(a => !a.endsWith('.wv.json')), rest.filter(a => a.endsWith('.wv.json')))
  else die('usage: verify | draw | build | score | null')
}
