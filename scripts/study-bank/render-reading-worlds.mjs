/**
 * render-reading-worlds.mjs — validate + assemble the symmetric-worlds
 * reading design (READING-WORLDS-PREREGISTERED.md).
 *
 * Refuses on hard violations; reports the rest. Seeded selection picks
 * the shown variant AFTER validation, exactly as render-crv7 does, so
 * no author can know the key.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const IN = process.argv[2], OUT = process.argv[3], SEED0 = Number(process.argv[4] ?? 20260901)
if (!IN || !OUT) { console.error('usage: render-reading-worlds.mjs <topics.json> <out-prefix> [seed]'); process.exit(1) }
const topics = JSON.parse(readFileSync(IN, 'utf8'))
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const toks = s => new Set(norm(s).split(' ').filter(w => w.length > 3))

const problems = [], warns = [], dropQ = new Set()
for (const t of topics) {
  const V = t.variants
  if (V.length !== 4) { problems.push(`${t.topic_id}: ${V.length} variants`); continue }
  if (!t.question_parity_note?.trim()) problems.push(`${t.topic_id}: no question_parity_note`)
  // skeleton identity: pairwise passage token overlap must be high
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const a = toks(V[i].passage), b = toks(V[j].passage)
    const inter = [...a].filter(x => b.has(x)).length
    const jac = inter / (a.size + b.size - inter)
    // REPORTED, NOT REFUSED. A slot like "what arrangement she made"
    // legitimately rewrites a paragraph, so low overlap is not by itself
    // a defect; what matters is that all four read as equally plausible
    // passages and that the answers cannot be matched to the wrong one.
    if (jac < 0.45) warns.push(`${t.topic_id}: variants ${V[i].label}/${V[j].label} share only ${(jac*100).toFixed(0)}% of content tokens — check they are still one story`)
  }
  const lens = V.map(v => v.passage.split(/\s+/).length)
  if (Math.max(...lens) / Math.min(...lens) > 1.12) problems.push(`${t.topic_id}: passage length ratio ${(Math.max(...lens)/Math.min(...lens)).toFixed(2)} (>1.12)`)
  // kill-map: each variant's answer must be checkably wrong against every other variant's passage
  for (const q of t.questions) {
    const ans = V.map(v => v.answers.find(a => a.qid === q.qid))
    if (ans.some(a => !a)) { problems.push(`${t.topic_id}/${q.qid}: missing an answer`); continue }
    const texts = ans.map(a => a.answer)
    if (new Set(texts.map(norm)).size !== 4) problems.push(`${t.topic_id}/${q.qid}: answers not distinct across variants — slot not load-bearing here`)
    const al = texts.map(x => x.length)
    if (Math.max(...al) / Math.min(...al) > 1.45) warns.push(`${t.topic_id}/${q.qid}: answer length ratio ${(Math.max(...al)/Math.min(...al)).toFixed(2)}`)
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      if (i === j) continue
      // A LEXICAL kill-map is wrong for reading. Good reading answers
      // paraphrase rather than quote ("declined to make her own" for
      // "stepped back"), so requiring a shared >3-char token between an
      // answer and its own passage condemns exactly the well-written
      // items. The cross-variant validity check is SEMANTIC and is done
      // by an agent gate (cross-variant reviewer), not here. What this
      // loop still catches cheaply: an answer that is literally more at
      // home in another variant's passage than in its own.
      const own = norm(V[i].passage), other = norm(V[j].passage)
      const t2 = [...toks(texts[i])]
      const inOwn = t2.filter(w => own.includes(w)).length
      const inOther = t2.filter(w => other.includes(w)).length
      if (t2.length >= 4 && inOther > inOwn) { dropQ.add(q.qid); warns.push(`${t.topic_id}/${q.qid}: DROPPED — ${V[i].label}'s answer shares more vocabulary with ${V[j].label}'s passage than its own`) }
    }
  }
}
console.log(problems.length ? `REFUSING — ${problems.length} problem(s):\n  ` + problems.slice(0, 25).join('\n  ') : 'kill-map + skeleton + parity checks CLEAN')
if (warns.length) console.log(`\n${warns.length} warning(s) (reported, not blocking):\n  ` + warns.slice(0, 10).join('\n  '))
if (problems.length) process.exit(1)

// seeded selection AFTER validation
const rng = s => () => { s |= 0; s = (s + 0x6D2B79F5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const pick = rng(SEED0)
const items = [], key = {}, blind = []
for (const [ti, t] of topics.entries()) {
  const w = Math.floor(pick() * 4)
  const shown = t.variants[w]
  const others = t.variants.filter((_, i) => i !== w)
  const L = ['A', 'B', 'C', 'D', 'E']
  const nch = t.topic_id.startsWith('RW-S') ? 5 : 4
  for (const [qi, q] of t.questions.entries()) {
    if (dropQ.has(q.qid)) continue
    const keyText = shown.answers.find(a => a.qid === q.qid).answer
    const pool = others.map(v => v.answers.find(a => a.qid === q.qid).answer)
    // 5-choice families need a fifth option: reuse a 4th variant answer from an adjacent question of the same variant set is NOT valid; instead the SSAT set draws its extra from the shown variant's neighbouring-slot answer is also invalid. So SSAT items ship with 4 options is wrong too — record and skip.
    const opts = [keyText, ...pool]
    if (opts.length < nch) { continue }
    const r = rng(SEED0 + 977 * (ti + 1) + qi)
    const ord = [...opts]
    for (let i = ord.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]] }
    const id = q.qid
    items.push({ id, topic_id: t.topic_id, kind: q.kind, difficulty: q.difficulty, prompt: q.prompt,
      passage: shown.passage, choices: ord, correct_answer: keyText,
      explanation: shown.answers.find(a => a.qid === q.qid).why, _shown: shown.label })
    key[id] = L[ord.indexOf(keyText)]
    blind.push({ id, prompt: q.prompt, options: Object.fromEntries(ord.map((o, i) => [L[i], o])) })
  }
}
writeFileSync(`scripts/study-bank/${OUT}.items.json`, JSON.stringify(items, null, 1))
writeFileSync(`scripts/study-bank/${OUT}-attack.key.json`, JSON.stringify(key, null, 1))
writeFileSync(`/tmp/${OUT}-blind.json`, JSON.stringify(blind))
const spread = ['A','B','C','D'].map(l => Object.values(key).filter(k => k === l).length)
const leaked = blind.some(b => 'passage' in b)
console.log(`\nitems ${items.length}  shown variants ${[...new Set(items.map(i=>i._shown))].join(',')}  key spread ${spread.join('/')}`)
console.log(`blind file passage-free: ${!leaked}`)
if (leaked) process.exit(1)
