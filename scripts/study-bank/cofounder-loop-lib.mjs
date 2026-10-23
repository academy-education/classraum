/**
 * cofounder-loop-lib.mjs — pure logic for the co-founder feedback loop.
 *
 * No database, no filesystem, no env. The three CLIs (build-notes-ledger.mjs,
 * run-fixtures.mjs, apply-notes.mjs) do the I/O and call these, so the parts
 * that decide a number — which rows count, which items become fixtures, how a
 * grade file is scored — are pinned by src/lib/study/__tests__/cofounder-loop.test.ts.
 *
 * The rule this file exists to enforce (CLAUDE.md, "a check that cannot read its
 * input must not return a number"): every function here that can be handed an
 * incomplete input returns the gap as an error list, and the CLIs refuse with a
 * non-zero exit when that list is non-empty.
 */

export const COFOUNDER_REVIEWER_ID = '6ca6edaf-4044-4eed-84e0-137ebd79a81d'

/**
 * The taxonomy, derived from reading all 160 human notes/flags on 2026-10-23.
 * `block` is the DEFAULT for the type; each ledger entry carries its own
 * would_block, which may differ (e.g. a formatting note that creates a second
 * answer). `grader` says whether COFOUNDER-BRIEF-v2 checks it.
 */
export const TAXONOMY = {
  second_defensible:     { block: true,  grader: true,  def: 'Another option is a reasonable, natural or plausible answer for a careful student.' },
  source_underspecified: { block: true,  grader: true,  def: 'The line/passage leaves out what is needed, so several options fit some plausible filling ("all sort of possible").' },
  key_wrong:             { block: true,  grader: true,  def: 'The key is false: wrong agent (who does what), or it asserts an inference the source never makes.' },
  factual_error:         { block: true,  grader: true,  def: 'A real-world claim in the source (a sport\'s rule, a law, a named fact) is false.' },
  self_contradiction:    { block: true,  grader: true,  def: 'The source contradicts itself in dates, names, numbers, events or explanations.' },
  unnatural_speech:      { block: true,  grader: true,  def: 'A transcript reads as scripted: no contractions, stilted lines ("Let us do that"), unestablished speaker gender.' },
  batch_pattern:         { block: true,  grader: true,  def: 'Across items the key is predictable from a pattern: key order, punctuation only in keys, identical key prose, one template.' },
  key_imprecise:         { block: false, grader: false, def: 'Key is a narrower/looser/regional word or adds a detail, but no rival competes.' },
  rival_some_pull:       { block: false, grader: false, def: 'A rival has "some pull" from a gap or ambiguity, but the text still decides.' },
  story_logic_gap:       { block: false, grader: false, def: 'A story/transcript logic gap (who signs what; a notebook entry that reverses its purpose) that does not change the key.' },
  distractor_too_easy:   { block: false, grader: false, def: 'Distractors are far from the passage and easy to eliminate.' },
  option_set_reused:     { block: false, grader: false, def: 'The same distractor set (typically attitude words) is reused across passages.' },
  difficulty_off:        { block: false, grader: false, def: 'The item or answer is too easy/obvious overall.' },
  skill_mislabel:        { block: false, grader: false, def: 'The item tests a different skill than labelled (a purpose/inference item answerable as a detail).' },
  key_stands_out:        { block: false, grader: false, def: 'The key is the longest or the odd one out by form, category or wording.' },
  option_wording:        { block: false, grader: false, def: 'An option is ungrammatical, idiomatically odd, or copies the passage verbatim.' },
  formatting:            { block: false, grader: false, def: 'Display: paragraph/stanza breaks, speaker labels.' },
  'praise/none':         { block: false, grader: false, def: 'No defect named (a lucky guess, praise).' },
}
export const SCOPES = ['item', 'batch', 'display']
export const VERDICTS = ['unique', 'alternative', 'broken', 'hold']

/** Split one reviewer's rows. Model-assisted rows are never notes of his. */
export function selectNoteRows(revs, reviewerId = COFOUNDER_REVIEWER_ID) {
  const mine = revs.filter(r => r.reviewer_id === reviewerId)
  const human = mine.filter(r => r.reviewer_kind === 'human')
  const modelAssisted = mine.filter(r => r.reviewer_kind === 'model_assisted')
  const other = mine.filter(r => r.reviewer_kind !== 'human' && r.reviewer_kind !== 'model_assisted')
  const hasNote = r => typeof r.note === 'string' && r.note.trim() !== ''
  const selected = human.filter(r => hasNote(r) || r.verdict !== 'unique')
  return { human, modelAssisted, other, selected }
}

export const isFresh = (review, item) =>
  !!item && !!review.item_sha && !!item.content_sha && review.item_sha === item.content_sha

/**
 * Join selected review rows to the hand classifications. Every selected row
 * must be classified, every classification must name a selected row, and every
 * classification must be well-formed. Any gap is an error, never a default.
 */
export function mergeClassifications(selected, classified, itemsById) {
  const errors = { unclassified: [], missing: [], invalid: [], noItem: [] }
  const cls = new Map()
  for (const c of classified) {
    if (cls.has(c.review_id)) errors.invalid.push(`${c.review_id}: classified twice`)
    cls.set(c.review_id, c)
  }
  const sel = new Map(selected.map(r => [r.id, r]))
  for (const id of cls.keys()) if (!sel.has(id)) errors.missing.push(id)
  const entries = []
  for (const r of selected) {
    const c = cls.get(r.id)
    if (!c) { errors.unclassified.push(r.id); continue }
    const bad = []
    if (!TAXONOMY[c.defect_type]) bad.push(`unknown defect_type ${c.defect_type}`)
    for (const s of c.secondary_types ?? []) if (!TAXONOMY[s]) bad.push(`unknown secondary ${s}`)
    if (typeof c.would_block !== 'boolean') bad.push('would_block not boolean')
    if (!SCOPES.includes(c.scope)) bad.push(`bad scope ${c.scope}`)
    if (!c.rationale || !String(c.rationale).trim()) bad.push('empty rationale')
    if (bad.length) { errors.invalid.push(`${r.id}: ${bad.join('; ')}`); continue }
    const it = itemsById.get(r.item_id)
    if (!it) { errors.noItem.push(r.id); continue }
    entries.push({
      review_id: r.id, item_id: r.item_id, run_id: r.run_id, cohort: it.cohort ?? null,
      family: it.family, section: it.section, task: it.task ?? it.domain ?? null,
      verdict: r.verdict, note: r.note ?? '', reviewed_at: r.reviewed_at,
      defect_type: c.defect_type, secondary_types: c.secondary_types ?? [],
      would_block: c.would_block, scope: c.scope, rationale: c.rationale,
      source: 'review', fresh: isFresh(r, it), archived: !!it.archived,
      item_sha: r.item_sha ?? null, content_sha: it.content_sha ?? null,
      classified_by: c.classified_by ?? null,
    })
  }
  const n = Object.values(errors).reduce((a, l) => a + l.length, 0)
  return { entries, errors, ok: n === 0 }
}

/** family x defect_type counts, plus row/column totals. */
export function crossTab(entries) {
  const t = {}, byType = {}, byFam = {}
  for (const e of entries) {
    const f = e.family ?? '?'
    ;(t[f] ??= {})[e.defect_type] = (t[f][e.defect_type] ?? 0) + 1
    byType[e.defect_type] = (byType[e.defect_type] ?? 0) + 1
    byFam[f] = (byFam[f] ?? 0) + 1
  }
  return { table: t, byType, byFam, n: entries.length }
}

// ---------- seeded randomness (mulberry32 over a string hash) ----------
export function hashStr(s) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
  return h
}
export function rng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashStr(String(seed))
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function shuffle(arr, seed) {
  const r = rng(seed), a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export const stratumOf = it => `${it.family}/${it.section}/${it.task ?? it.domain ?? '-'}`

/**
 * Positives: ledger rows from reviews, would_block, item scope, FRESH (the item
 * today is the item he judged). One fixture per item.
 * Negatives: items he reviewed (human) with ONLY clean reviews (unique, no note),
 * every one of those reviews fresh, not archived. Sampled with a fixed seed,
 * matched to positives stratum-first, then family, then anywhere; each negative
 * inherits its positive's defect_type as `matched_type`.
 *
 * Returns the exclusions too, so the CLI can print what was left out and why.
 */
export function pickFixtures({ ledger, humanReviews, itemsById, seed }) {
  const excluded = { stale: [], notItemScope: [], noItem: [] }
  const posByItem = new Map()
  for (const e of ledger) {
    if (e.source !== 'review' || !e.would_block) continue
    if (e.scope !== 'item') { excluded.notItemScope.push(e.review_id); continue }
    if (!e.fresh) { excluded.stale.push(e.review_id); continue }
    const it = itemsById.get(e.item_id)
    if (!it) { excluded.noItem.push(e.review_id); continue }
    const p = posByItem.get(e.item_id)
    if (p) { p.review_ids.push(e.review_id); if (!p.defect_types.includes(e.defect_type)) p.defect_types.push(e.defect_type); continue }
    posByItem.set(e.item_id, { item_id: e.item_id, label: 'positive', defect_type: e.defect_type, defect_types: [e.defect_type], review_ids: [e.review_id], stratum: stratumOf(it), family: it.family })
  }
  // An item with ANY non-clean human review by him, or any stale/archived signal, is never a negative.
  const dirty = new Set(), staleItems = new Set(), cleanItems = new Set()
  const hasNote = r => typeof r.note === 'string' && r.note.trim() !== ''
  for (const r of humanReviews) {
    if (r.verdict !== 'unique' || hasNote(r)) dirty.add(r.item_id)
    else cleanItems.add(r.item_id)
    if (!isFresh(r, itemsById.get(r.item_id))) staleItems.add(r.item_id)
  }
  const pool = [...cleanItems].filter(id => !dirty.has(id) && !staleItems.has(id) && !posByItem.has(id))
    .map(id => itemsById.get(id)).filter(it => it && !it.archived)
  const shuffled = shuffle(pool.map(it => it.id).sort(), `neg:${seed}`)
  const used = new Set(), negatives = [], match = { stratum: 0, family: 0, any: 0, short: 0 }
  const positives = [...posByItem.values()].sort((a, b) => a.item_id.localeCompare(b.item_id))
  const take = pred => { const id = shuffled.find(i => !used.has(i) && pred(itemsById.get(i))); if (id) used.add(id); return id }
  for (const p of shuffle(positives, `pos:${seed}`)) {
    let id = take(it => stratumOf(it) === p.stratum), how = 'stratum'
    if (!id) { id = take(it => it.family === p.family); how = 'family' }
    if (!id) { id = take(() => true); how = 'any' }
    if (!id) { match.short++; continue }
    match[how]++
    const it = itemsById.get(id)
    negatives.push({ item_id: id, label: 'negative', matched_type: p.defect_type, matched_to: p.item_id, match: how, stratum: stratumOf(it), family: it.family })
  }
  return { positives, negatives, excluded, match, poolSize: pool.length }
}

/** Opaque fixture id: does not reveal the label, stable for a seed. */
export const fixtureId = (itemId, seed) => 'F' + hashStr(`${seed}:${itemId}`).toString(16).padStart(8, '0')

/**
 * Blind packet in mkpacket.py's shape: packet.json [{n,family,section,passage,prompt,choices,correct_answer,graphic?}]
 * and index.json [{n,file,id}]. Optionally split into `parts` grader packets that keep the global n.
 */
export function buildPacket(fixtures, { seed, parts = 1, file = 'cofounder-fixtures.json' }) {
  const order = shuffle(fixtures.slice().sort((a, b) => a.id.localeCompare(b.id)), `packet:${seed}`)
  const packet = [], index = []
  order.forEach((f, i) => {
    const n = i + 1, it = f.item
    packet.push({ n, family: f.family, section: f.section, passage: it.passage ?? null, prompt: it.prompt, choices: it.choices, correct_answer: it.correct_answer, ...(it.graphic ? { graphic: it.graphic } : {}) })
    index.push({ n, file, id: f.id })
  })
  const k = Math.max(1, Math.min(parts, packet.length || 1))
  const size = Math.ceil(packet.length / k)
  const split = []
  for (let p = 0; p < k; p++) split.push({ part: p + 1, packet: `packet-${p + 1}.json`, grades: `grades-${p + 1}.json`, items: packet.slice(p * size, (p + 1) * size) })
  return { packet, index, parts: split.filter(s => s.items.length) }
}

/**
 * Score grade files against the fixtures. NEVER returns a usable result when
 * the input is incomplete: `errors` lists every gap and `valid` is false.
 *
 * - every expected grade file must be present (else: NOT MEASURED, no numbers)
 * - every index n must map to a fixture; an unmapped item is counted FLAGGED in
 *   an UNMAPPED bucket that enters the negatives' false-flag numerator and
 *   denominator, and the run is invalid
 * - every index n must carry exactly one recognised verdict; grade keys that are
 *   not in the index, or appear in two files, are errors
 * - if requireBatchPatterns, each grade file must carry a batch_patterns array
 */
export function scoreGrades({ index, fixturesById, gradeFiles, expected, requireBatchPatterns = false }) {
  const errors = []
  const missingFiles = expected.filter(f => !(f in gradeFiles))
  if (missingFiles.length) return { valid: false, measured: false, errors: missingFiles.map(f => `grade file missing: ${f}`) }
  const verdictByN = new Map(), seenIn = new Map()
  for (const [file, g] of Object.entries(gradeFiles)) {
    if (!g || typeof g !== 'object' || Array.isArray(g)) { errors.push(`${file}: not a JSON object keyed by item number`); continue }
    if (requireBatchPatterns && !Array.isArray(g.batch_patterns)) errors.push(`${file}: batch_patterns array missing (required by this brief)`)
    for (const [k, v] of Object.entries(g)) {
      if (k === 'batch_patterns') continue
      if (seenIn.has(k)) { errors.push(`item ${k} graded in both ${seenIn.get(k)} and ${file}`); continue }
      seenIn.set(k, file)
      verdictByN.set(k, v)
    }
  }
  const indexNs = new Set(index.map(e => String(e.n)))
  for (const k of verdictByN.keys()) if (!indexNs.has(k)) errors.push(`grade for item ${k} which is not in index.json`)

  const blank = () => ({ x: 0, n: 0 })
  const pos = { all: blank(), byType: {}, byFam: {} }, neg = { all: blank(), byType: {}, byFam: {} }
  const add = (bucket, key, flagged) => { const b = (bucket[key] ??= blank()); b.n++; if (flagged) b.x++ }
  let unmapped = 0, unscored = 0
  for (const e of index) {
    const f = fixturesById.get(e.id)
    const g = verdictByN.get(String(e.n))
    const scored = g && typeof g === 'object' && VERDICTS.includes(g.verdict)
    if (!scored) { unscored++; errors.push(`item ${e.n} (${e.id}) unscored${g ? `: verdict ${JSON.stringify(g.verdict)}` : ''}`) }
    if (!f) {
      unmapped++
      errors.push(`index item ${e.n} id ${e.id} maps to no fixture`)
      neg.all.n++; neg.all.x++; add(neg.byFam, 'UNMAPPED', true); add(neg.byType, 'UNMAPPED', true)
      continue
    }
    if (!scored) continue
    const flagged = g.verdict !== 'unique'
    if (f.label === 'positive') { pos.all.n++; if (flagged) pos.all.x++; add(pos.byType, f.defect_type, flagged); add(pos.byFam, f.family, flagged) }
    else if (f.label === 'negative') { neg.all.n++; if (flagged) neg.all.x++; add(neg.byType, f.matched_type, flagged); add(neg.byFam, f.family, flagged) }
    else { errors.push(`fixture ${f.id} has label ${f.label}`) }
  }
  const fixtureIds = new Set(index.map(e => e.id))
  for (const id of fixturesById.keys()) if (!fixtureIds.has(id)) errors.push(`fixture ${id} is not in the packet`)
  return { valid: errors.length === 0, measured: true, errors, unmapped, unscored, scorable: index.length - unscored - unmapped, total: index.length, pos, neg }
}

export const rate = b => (b && b.n ? b.x / b.n : null)

/**
 * The pre-registered ship bar (recorded in COFOUNDER-BRIEF-v2.md's header):
 * v2 ships only if, on real cases, recall >= 80% on EACH defect type with >= 10
 * positives, and its false-flag rate is not more than 10 points above the old
 * brief's. Types with < 10 positives are "unvalidated" and cannot support promotion.
 * At least one validated type is required: a bar with nothing to test cannot pass.
 */
export function shipBar(v2, old, { minPos = 10, recall = 0.8, maxFfDelta = 0.10 } = {}) {
  if (!v2?.valid || !old?.valid) return { pass: false, reasons: ['one of the two runs is not a valid measurement'], types: {} }
  const types = {}, reasons = []
  for (const [t, b] of Object.entries(v2.pos.byType)) {
    if (b.n < minPos) { types[t] = { status: 'unvalidated', ...b }; continue }
    const ok = b.x / b.n >= recall
    types[t] = { status: ok ? 'pass' : 'FAIL', ...b }
    if (!ok) reasons.push(`${t}: recall ${b.x}/${b.n} < ${recall * 100}%`)
  }
  const validated = Object.values(types).filter(t => t.status !== 'unvalidated').length
  if (!validated) reasons.push(`no defect type has >= ${minPos} positives: nothing validated`)
  const ffV2 = rate(v2.neg.all), ffOld = rate(old.neg.all)
  if (ffV2 === null || ffOld === null) reasons.push('false-flag rate has no denominator')
  else if (ffV2 - ffOld > maxFfDelta + 1e-12) reasons.push(`false flags ${(ffV2 * 100).toFixed(1)}% vs old ${(ffOld * 100).toFixed(1)}%: +${((ffV2 - ffOld) * 100).toFixed(1)} > ${maxFfDelta * 100} points`)
  return { pass: reasons.length === 0, reasons, types, ffV2, ffOld }
}

/**
 * What a new sitting's would-block notes add to the loop. `applied` is the set
 * of review ids (and register ids) already reflected in the current brief
 * version, the fixtures and the authoring rules.
 */
export function planApply({ ledger, applied, briefVersion, briefTypesCovered }) {
  const fresh = ledger.filter(e => e.would_block && !applied.has(e.review_id ?? e.register_id))
  const nextVersion = `v${Number(String(briefVersion).replace(/^v/, '')) + 1}`
  const fixtures = [], briefLines = [], authoringRules = []
  for (const e of fresh) {
    const id = e.review_id ?? e.register_id
    if (e.source === 'review' && e.scope === 'item' && e.fresh) fixtures.push({ id, item_id: e.item_id, defect_type: e.defect_type })
    else fixtures.push({ id, skipped: e.source !== 'review' ? 'register entry (no item of its own)' : e.scope !== 'item' ? `${e.scope}-scope defect is not visible in a single item` : 'stale review: item edited since' })
    briefLines.push({ id, register: e.source === 'register', defect_type: e.defect_type, kind: briefTypesCovered.has(e.defect_type) ? 'example' : 'new-check', quote: (e.note || e.summary || '').slice(0, 240) })
    authoringRules.push({ id, register: e.source === 'register', defect_type: e.defect_type, family: e.family, note: (e.note || e.summary || '').slice(0, 240) })
  }
  return { count: fresh.length, nextVersion: fresh.length ? nextVersion : briefVersion, fixtures, briefLines, authoringRules, triggersFixtureRun: fresh.length > 0 }
}
