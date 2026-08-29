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

const problems = [], warns = [], dropQ = new Set(), dropT = new Set()
for (const t of topics) {
  const V = t.variants
  // Variant count IS the choice count: N variants produce exactly N
  // options. ISEE (4-choice) needs 4 variants, SSAT (5-choice) needs 5.
  const NV = V.length
  /*
   * Family comes from the topic id, and the test must survive a new id
   * scheme. s3 numbers its topics RW3-S05 / RW3-I01, which
   * startsWith('RW-S') reads as FALSE — so every 5-variant SSAT topic
   * would have been dropped as "4 expected, 5 found", and the drop is
   * loud enough to look like an authoring failure rather than a parser
   * one. Match the family letter after the run prefix instead.
   */
  const fam = /^RW\d*-([SI])/.exec(t.topic_id)?.[1]
  if (!fam) { dropT.add(t.topic_id); warns.push(`${t.topic_id}: DROPPED — cannot read family from topic id (expected RW<run>-S… or RW<run>-I…)`); continue }
  const wantNV = fam === 'S' ? 5 : 4
  // A family mismatch is a known structural condition, not a defect, so
  // the topic is DROPPED LOUDLY rather than blocking a mixed file — and
  // never skipped silently, which is how the first run shipped nothing
  // for SSAT without saying so.
  if (NV !== wantNV) { dropT.add(t.topic_id); warns.push(`${t.topic_id}: DROPPED — ${NV} variants but this family needs ${wantNV} (N variants = N options)`); continue }
  /*
   * question_parity_note was s2's prose promise that every question is
   * answerable from every variant. s3 replaces it with `kills`, which
   * asserts the same property per answer and is machine-checked by
   * check-kill-spans.mjs — a stronger claim than a sentence.
   *
   * So the note is required ONLY for topics that carry no kills. A
   * topic with neither has nothing standing behind question parity and
   * still fails.
   */
  const hasKills = (t.variants ?? []).some(v => (v.answers ?? []).some(a => a.kills && Object.keys(a.kills).length))
  if (!hasKills && !t.question_parity_note?.trim()) problems.push(`${t.topic_id}: no question_parity_note and no kill spans — nothing asserts question parity`)
  // skeleton identity: pairwise passage token overlap must be high
  for (let i = 0; i < NV; i++) for (let j = i + 1; j < NV; j++) {
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
    if (new Set(texts.map(norm)).size !== NV) problems.push(`${t.topic_id}/${q.qid}: answers not distinct across variants — slot not load-bearing here`)
    const al = texts.map(x => x.length)
    if (Math.max(...al) / Math.min(...al) > 1.45) warns.push(`${t.topic_id}/${q.qid}: answer length ratio ${(Math.max(...al)/Math.min(...al)).toFixed(2)}`)
    for (let i = 0; i < NV; i++) for (let j = 0; j < NV; j++) {
      if (i === j) continue
      // A LEXICAL kill-map is wrong for reading. Good reading answers
      // paraphrase rather than quote ("declined to make her own" for
      // "stepped back"), so requiring a shared >3-char token between an
      // answer and its own passage condemns exactly the well-written
      // items. The cross-variant validity check is SEMANTIC and is done
      // by an agent gate (cross-variant reviewer), not here. What this
      // loop still catches cheaply: an answer that is literally more at
      // home in another variant's passage than in its own.
      /*
       * WRONG-HOME IS VOID ONCE A TOPIC CARRIES KILL SPANS, and is
       * skipped for those topics rather than merely tolerated.
       *
       * The check asks whether an answer's vocabulary sits more in a
       * sibling's passage than in its own. Under the s2 brief that was
       * a real signal. Under s3 it cannot be: a kill must POSITIVELY
       * CONTRADICT the sibling, so the passage has to NAME what it
       * denies — "She did not put me to mending and re-tarring the wire
       * trays" is W1's text carrying W2's answer vocabulary, and it is
       * there precisely because the brief demanded it.
       *
       * Measured on the s3 batch: 29 of 48 questions dropped, all here.
       * Every one was a well-formed item whose passage denies its
       * siblings by name — the brief working, scored as a defect.
       *
       * The property this check approximated (an answer must belong to
       * its own variant and no other) is still gated, by the semantic
       * cross-variant reviewer, which reads meaning rather than token
       * overlap and found 17 real failures on s2. A lexical proxy whose
       * premise the brief deliberately violates is not a weaker version
       * of that gate; it is noise pointed at the wrong property.
       */
      if (hasKills) continue
      const own = norm(V[i].passage), other = norm(V[j].passage)
      const t2 = [...toks(texts[i])]
      const inOwn = t2.filter(w => own.includes(w)).length
      const inOther = t2.filter(w => other.includes(w)).length
      if (t2.length >= 4 && inOther > inOwn) { dropQ.add(q.qid); warns.push(`${t.topic_id}/${q.qid}: DROPPED — ${V[i].label}'s answer shares more vocabulary with ${V[j].label}'s passage than its own`) }
    }
  }
}
console.log(problems.length ? `REFUSING — ${problems.length} problem(s):\n  ` + problems.slice(0, 25).join('\n  ') : 'kill-map + skeleton + parity checks CLEAN')
/*
 * Warnings print in full, and DROPS are separated from advisories.
 *
 * The first version printed `warns.slice(0, 10)` under a truthful
 * "134 warning(s)" header. Ten of those visible lines happened to be
 * DROPPED lines covering 2 questions, so the batch read as "2 questions
 * lost" while 29 were actually gone — the count was honest and the
 * detail was not, which is worse than either alone. A drop changes what
 * ships and must never be summarised away.
 */
const dropLines = warns.filter(w => w.includes('DROPPED'))
const advisory  = warns.filter(w => !w.includes('DROPPED'))
if (dropLines.length) {
  console.log(`\n${dropLines.length} DROP(s) — ${dropQ.size} question(s) and ${dropT.size} topic(s) removed:`)
  for (const d of dropLines) console.log('  ' + d)
}
if (advisory.length) {
  console.log(`\n${advisory.length} advisory warning(s) (reported, not blocking):`)
  for (const a of advisory.slice(0, 15)) console.log('  ' + a)
  if (advisory.length > 15) console.log(`  …and ${advisory.length - 15} more advisories`)
}
if (problems.length) process.exit(1)

// seeded selection AFTER validation
const rng = s => () => { s |= 0; s = (s + 0x6D2B79F5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const pick = rng(SEED0)
const items = [], key = {}, blind = []
for (const [ti, t] of topics.entries()) {
  if (dropT.has(t.topic_id)) continue
  const NV = t.variants.length
  const w = Math.floor(pick() * NV)
  const shown = t.variants[w]
  const others = t.variants.filter((_, i) => i !== w)
  const L = ['A', 'B', 'C', 'D', 'E']
  // Same family test as validation above — the stale startsWith('RW-S')
  // read RW3-S… as ISEE and would have capped SSAT items at 4 options.
  const nch = /^RW\d*-S/.test(t.topic_id) ? 5 : 4
  for (const [qi, q] of t.questions.entries()) {
    if (dropQ.has(q.qid)) continue
    const keyText = shown.answers.find(a => a.qid === q.qid).answer
    const pool = others.map(v => v.answers.find(a => a.qid === q.qid).answer)
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
const spread = ['A','B','C','D','E'].map(l => Object.values(key).filter(k => k === l).length)
const leaked = blind.some(b => 'passage' in b)
console.log(`\nitems ${items.length}  shown variants ${[...new Set(items.map(i=>i._shown))].join(',')}  key spread ${spread.join('/')}`)
console.log(`blind file passage-free: ${!leaked}`)
if (leaked) process.exit(1)
