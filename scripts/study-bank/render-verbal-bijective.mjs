/**
 * render-verbal-bijective.mjs — assemble SSAT verbal items from
 * BIJECTIVE sets (SV5-PREREGISTERED.md).
 *
 * A topic is five (stem, answer) rows where each answer is correct for
 * exactly one stem. The five answers are the option set; a seeded RNG
 * picks which stem is SHOWN, after the text is frozen, so no author
 * knows the key.
 *
 * Same provenance cure as render-crv7 and render-reading-worlds: the
 * key is statistically independent of every text feature BY
 * CONSTRUCTION, because nothing was written to be wrong.
 *
 *   node render-verbal-bijective.mjs <topics.json> <out-prefix> [seed]
 */
import { readFileSync, writeFileSync } from 'node:fs'

const IN = process.argv[2], OUT = process.argv[3], SEED0 = Number(process.argv[4] ?? 20261201)
if (!IN || !OUT) { console.error('usage: render-verbal-bijective.mjs <topics.json> <out-prefix> [seed]'); process.exit(1) }
const topics = JSON.parse(readFileSync(IN, 'utf8'))

const problems = []
for (const t of topics) {
  const V = t.variants ?? []
  if (V.length !== 5) { problems.push(`${t.topic_id}: ${V.length} variants, expected 5`); continue }
  /* Synonym variants carry `stem`; analogy variants carry `source`. The
     first version read only `stem` and refused every analogy topic with
     "stems not distinct" — a confusing message for a correct file. */
  const stems = V.map(v => String(v.stem ?? v.source ?? '').trim())
  const answers = V.map(v => String(v.answer ?? '').trim())
  if (new Set(stems.map(s => s.toUpperCase())).size !== 5) problems.push(`${t.topic_id}: stems not distinct`)
  if (new Set(answers.map(s => s.toLowerCase())).size !== 5) problems.push(`${t.topic_id}: answers not distinct`)
  if (stems.some(s => !s) || answers.some(a => !a)) problems.push(`${t.topic_id}: empty stem or answer`)
  for (const v of V) {
    const want = V.map(x => x.label).filter(l => l !== v.label)
    const got = Object.keys(v.kills ?? {})
    if (got.length !== 4 || !want.every(l => got.includes(l))) problems.push(`${t.topic_id}/${v.label}: kills must name exactly the other four`)
    for (const [l, why] of Object.entries(v.kills ?? {})) {
      if (!String(why).trim()) problems.push(`${t.topic_id}/${v.label}: empty kill for ${l}`)
    }
  }
  /*
   * An answer that is ALSO one of the stems would let a solver pair them
   * off. Cheap to check and impossible to see by eye across 15 topics.
   */
  const lowerStems = new Set(stems.map(s => s.toLowerCase()))
  for (const a of answers) if (lowerStems.has(a.toLowerCase())) problems.push(`${t.topic_id}: "${a}" is both a stem and an answer`)
}
console.log(problems.length ? `REFUSING — ${problems.length} problem(s):\n  ` + problems.slice(0, 20).join('\n  ') : 'bijective-set checks CLEAN')
if (problems.length) process.exit(1)

// seeded selection AFTER validation
const rng = s => () => { s |= 0; s = (s + 0x6D2B79F5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const pick = rng(SEED0)
const L = ['A', 'B', 'C', 'D', 'E']
const items = [], key = {}, blind = []

for (const [ti, t] of topics.entries()) {
  const V = t.variants
  const w = Math.floor(pick() * V.length)
  const shown = V[w]
  const opts = V.map(v => v.answer)
  const r = rng(SEED0 + 977 * (ti + 1))
  const ord = [...opts]
  for (let i = ord.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]] }
  const isAnalogy = !!shown.source
  const id = t.topic_id
  /* SSAT prints analogies as "A is to B as", not "A : B" — the colon is
     an authoring shorthand and must not reach a student. */
  const asWords = s => String(s).split(':').map(x => x.trim()).join(' is to ')
  const prompt = isAnalogy
    ? `[Analogy] ${asWords(shown.source)} as`
    : `[Synonym] ${shown.stem}`
  items.push({
    id, kind: isAnalogy ? 'analogy' : 'synonym',
    subskill: t.domain ?? t.field ?? (isAnalogy ? 'analogy' : 'synonym'),
    topic_tag: isAnalogy ? 'analogy' : 'synonym',
    difficulty: t.difficulty ?? 'medium',
    prompt,
    choices: isAnalogy ? ord.map(asWords) : ord,
    correct_answer: isAnalogy ? asWords(shown.answer) : shown.answer,
    explanation: isAnalogy
      ? `${shown.source} — ${shown.relation}. ${shown.answer} expresses the same relation.`
      : `${shown.stem} means ${shown.answer}.`,
    distractor_rationales: Object.entries(shown.kills).map(([l, why]) => {
      const other = V.find(v => v.label === l)
      return { choice: isAnalogy ? asWords(other.answer) : other.answer, reason: why }
    }),
    _shown: shown.label,
  })
  const rendered = isAnalogy ? ord.map(asWords) : ord
  key[id] = L[rendered.indexOf(isAnalogy ? asWords(shown.answer) : shown.answer)]
  blind.push({ id, options: Object.fromEntries(rendered.map((o, i) => [L[i], o])) })
}

const spread = L.map(l => Object.values(key).filter(k => k === l).length)
console.log(`items ${items.length}  shown ${[...new Set(items.map(i => i._shown))].join(',')}  key spread ${spread.join('/')}`)
// The blind file must carry NO stem: for verbal the stem IS the question.
const leak = items.filter(i => JSON.stringify(blind).includes(i.prompt.replace(/^\[\w+\]\s*/, '').slice(0, 10))).length
console.log(`blind file stem-free: ${leak === 0} (${leak} leaks)`)
writeFileSync(`scripts/study-bank/${OUT}.items.json`, JSON.stringify(items, null, 1))
writeFileSync(`scripts/study-bank/${OUT}-attack.key.json`, JSON.stringify(key, null, 1))
writeFileSync(`/tmp/${OUT}-blind.json`, JSON.stringify(blind, null, 1))
