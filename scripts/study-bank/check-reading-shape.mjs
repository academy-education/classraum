#!/usr/bin/env node
/**
 * check-reading-shape.mjs — structural pre-flight for a passage-drawn
 * reading batch (SSAT / ISEE).
 *
 * READ ONLY. Exits non-zero on any defect and refuses rather than
 * returning a number when it cannot read its input.
 *
 * The unit here is the PASSAGE, not the item: `drawByPassage` picks whole
 * passages and a group that cannot supply ITEMS_PER_PASSAGE questions is
 * second-class supply for ever. So the checks are group-level as well as
 * item-level, and a short group is an error rather than a note.
 */
import { readFileSync } from 'node:fs'

const file = process.argv[2]
const WANT_PER = Number(process.argv[3] ?? 6)
const WANT_CHOICES = Number(process.argv[4] ?? 5)
if (!file) { console.error('usage: check-reading-shape.mjs <batch.json> [perPassage] [choices]'); process.exit(2) }
let b
try { b = JSON.parse(readFileSync(file, 'utf8')) } catch (e) { console.error(`REFUSING: ${e.message}`); process.exit(2) }
if (!Array.isArray(b) || !b.length) { console.error('REFUSING: parsed to zero items'); process.exit(2) }

const problems = []
const notes = []
const note = (id, m) => problems.push(`${id}: ${m}`)
const groups = new Map()
for (const it of b) {
  const id = it.id ?? '?'
  if (!it.set_id) { note(id, 'no set_id — cannot be drawn as a passage'); continue }
  ;(groups.get(it.set_id) ?? groups.set(it.set_id, []).get(it.set_id)).push(it)
  if (!Array.isArray(it.choices) || it.choices.length !== WANT_CHOICES) note(id, `${it.choices?.length} choices, want ${WANT_CHOICES}`)
  else if (!it.choices.includes(it.correct_answer)) note(id, 'key not among choices')
  if (new Set(it.choices ?? []).size !== (it.choices ?? []).length) note(id, 'duplicate choices')
  if (!it.passage || String(it.passage).split(/\s+/).length < 150) note(id, 'passage missing or under 150 words')
  if (!it.explanation) note(id, 'no explanation')
  if (!it.subskill) note(id, 'no subskill')
}
/*
 * A repeated prompt is only a defect WITHIN one passage.
 *
 * The first version of this flagged "The passage is chiefly concerned
 * with" appearing in two different passages and failed the batch. That is
 * the standard main-idea stem: measured on the live bank it is shared by
 * TWELVE passages, and three other generic stems are shared too. A check
 * that condemns the house style is a check that will be ignored.
 *
 * What DOES carry across passages is a vocabulary-in-context stem naming
 * the same WORD twice — the candidate meets "the word 'charge' most nearly
 * means" in two sittings, and the live bank already has one such pair. It
 * is a note rather than an error, because two genuinely different senses
 * of one word is a legitimate item.
 */
const seenPrompt = new Map()
for (const it of b) {
  const k = String(it.prompt).toLowerCase().trim()
  const prior = seenPrompt.get(k)
  if (prior && prior.set === it.set_id) note(it.id, `duplicate prompt inside passage ${it.set_id}, same as ${prior.id}`)
  else if (!prior) seenPrompt.set(k, { id: it.id, set: it.set_id })
}
const vocabWord = new Map()
for (const it of b) {
  const m = String(it.prompt).match(/"([^"]+)"/)
  if (!m || !/most nearly means/i.test(it.prompt)) continue
  const w = m[1].toLowerCase()
  if (vocabWord.has(w)) notes.push(`NOTE ${it.id}: vocabulary item on "${w}" also appears as ${vocabWord.get(w)} — a candidate can meet the same word twice`)
  else vocabWord.set(w, it.id)
}
const passageOf = new Map()
for (const [sid, items] of groups) {
  if (items.length !== WANT_PER) note(sid, `${items.length} items, want exactly ${WANT_PER} — a short group is permanently second-class supply`)
  const texts = new Set(items.map(x => String(x.passage)))
  if (texts.size !== 1) note(sid, `${texts.size} different passage texts inside one set`)
  const t = [...texts][0]
  if (passageOf.has(t)) note(sid, `passage is identical to ${passageOf.get(t)}`)
  else passageOf.set(t, sid)
  const subs = new Set(items.map(x => x.subskill))
  if (subs.size < 4) note(sid, `only ${subs.size} distinct subskills across ${items.length} items — a passage of one question type`)
  /*
   * A group that uses EVERY slot lets confident answers force the rest —
   * CLAUDE.md records this reaching the bank on 78% of one cohort.
   *
   * The first version tested `slots.length === WANT_CHOICES`, i.e. it only
   * fired when a group held exactly as many items as there are choices. At
   * the size this section actually uses — six items, five choices — it
   * could therefore NEVER fire, and the guard was decorative. Found by an
   * author who read the condition, noticed it could not apply to its own
   * batch, and enforced the property by construction instead of trusting
   * the check. Tests the distinct slots used, whatever the group size.
   */
  const slots = items.map(x => (x.choices ?? []).indexOf(x.correct_answer))
  if (new Set(slots).size >= WANT_CHOICES) {
    note(sid, `key slots use all ${WANT_CHOICES} positions within the group — confident answers narrow the rest`)
  }
}
const slotDist = {}
for (const it of b) slotDist[(it.choices ?? []).indexOf(it.correct_answer)] = (slotDist[(it.choices ?? []).indexOf(it.correct_answer)] ?? 0) + 1
console.log(`${file}: ${b.length} items in ${groups.size} passages`)
console.log(`  key slots ${JSON.stringify(slotDist)}   passage words ${[...groups.values()].map(v => String(v[0].passage).split(/\s+/).length).join('/')}`)
for (const n of notes) console.log('  ' + n)
if (problems.length) { console.error(`\nFAIL — ${problems.length}:`); problems.slice(0, 20).forEach(p => console.error('  ' + p)); process.exit(1) }
console.log('  shape ok')
