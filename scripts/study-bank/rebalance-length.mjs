#!/usr/bin/env node
/**
 * rebalance-length.mjs — repair for the LENGTH TELL the co-founder found
 * in the b2-all-cohorts-2026-08-15 sitting (REGISTER.md §5, 2026-08-16).
 *
 * In 'Information and Ideas' and 'Craft and Structure' the key is
 * strictly the longest choice at 36.7% / 30.5% vs 25% chance, and his
 * refinement was that the exploitable case is the key being UNIQUELY
 * long — the outlier, not rank alone. Repair brief: LENGTHEN one
 * distractor per affected item (keys carry content; never shorten or
 * touch them).
 *
 *   node rebalance-length.mjs selftest
 *       run the measure logic on 3 hand-built fixtures whose answer is
 *       known. A detector that cannot reproduce a known number has no
 *       business on unknown data.
 *
 *   node rebalance-length.mjs measure
 *       population table for the two domains: key-strictly-longest %,
 *       and TARGETS = key strictly longest AND >=15% longer than the
 *       runner-up distractor.
 *
 *   node rebalance-length.mjs export <targets.json>
 *       write the TARGET items (id, domain, passage, prompt, choices,
 *       correct_answer, explanation, key_len, runner_up_len) for the
 *       authoring subagents.
 *
 *   node rebalance-length.mjs apply <edits.json> [--dry]
 *       edits.json: [{ id, distractor_index, new_text }]
 *       Updates item.choices[distractor_index] only. REFUSES any edit
 *       that would (a) point at the key, (b) change the key text,
 *       (c) duplicate another choice, (d) leave the item still an
 *       outlier by more than the key (informational warn), or
 *       (e) target a row that is archived or missing. explanation is
 *       rewritten ONLY where it quotes the old distractor verbatim.
 *       correct_answer is NEVER touched. content_sha is a generated
 *       column, so editing `item` bumps it and stale attack/review
 *       rows detach — as intended (same mechanics as
 *       apply-cr-register-fix.mjs).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'

const DOMAINS = ['Information and Ideas', 'Craft and Structure']
const OUTLIER_RATIO = 1.15   // key >= 15% longer than the longest distractor
const CLOSE_ENOUGH = 0.90    // a repaired distractor should reach >= 90% of key length

// ── pure measurement logic (unit-testable, no I/O) ──────────────────
export function measureItem(item) {
  const { choices, correct_answer } = item
  const ki = choices.indexOf(correct_answer)
  if (ki < 0) return { broken: true }
  const keyLen = choices[ki].length
  const dLens = choices.filter((_, i) => i !== ki).map(c => c.length)
  const maxD = Math.max(...dLens)
  return {
    broken: false,
    keyIndex: ki,
    keyLen,
    maxDistractorLen: maxD,
    keyStrictlyLongest: keyLen > maxD,
    gap: keyLen - maxD,                       // >0 means key is the longest
    outlier: keyLen > maxD && keyLen >= OUTLIER_RATIO * maxD,
  }
}

export function summarize(rows) {
  const by = {}
  for (const d of DOMAINS) by[d] = { n: 0, longest: 0, targets: 0, broken: 0, gapSum: 0, targetIds: [] }
  for (const r of rows) {
    const b = by[r.domain]; if (!b) continue
    const m = measureItem(r.item)
    if (m.broken) { b.broken++; continue }
    b.n++
    b.gapSum += m.gap
    if (m.keyStrictlyLongest) b.longest++
    if (m.outlier) { b.targets++; b.targetIds.push(r.id) }
  }
  return by
}

function printTable(by, label) {
  console.log(`\n── ${label} ──────────────────────────────────────────────`)
  console.log('domain'.padEnd(26), 'n'.padStart(5), 'key-longest'.padStart(12), '%'.padStart(7), 'outlier targets'.padStart(16), 'mean gap'.padStart(9))
  for (const d of DOMAINS) {
    const b = by[d]
    console.log(d.padEnd(26), String(b.n).padStart(5),
      String(b.longest).padStart(12),
      (b.n ? (100 * b.longest / b.n).toFixed(1) : '-').padStart(7),
      String(b.targets).padStart(16),
      (b.n ? (b.gapSum / b.n).toFixed(1) : '-').padStart(9))
    if (b.broken) console.log(`  !! ${b.broken} rows where correct_answer not in choices`)
  }
}

// ── self-test on fixtures whose answer is known ─────────────────────
function selftest() {
  const fx = [
    { name: 'key longest + outlier', item: {
      choices: ['This is the correct answer and it is much much longer than the rest',
        'short wrong one', 'another wrong', 'third wrong choice'],
      correct_answer: 'This is the correct answer and it is much much longer than the rest' },
      expect: { keyStrictlyLongest: true, outlier: true } },
    { name: 'balanced (key ties runner-up region)', item: {
      choices: ['a correct answer of middling size', 'a wrong answer of the same size!!',
        'a wrong answer somewhat longer than both of those', 'tiny'],
      correct_answer: 'a correct answer of middling size' },
      expect: { keyStrictlyLongest: false, outlier: false } },
    { name: 'key shortest', item: {
      choices: ['no', 'a plausible but wrong alternative here', 'another decoy of real length', 'a third distractor with words'],
      correct_answer: 'no' },
      expect: { keyStrictlyLongest: false, outlier: false } },
    // boundary: key exactly 15% longer counts as outlier (>=)
    { name: 'exact 15% boundary', item: {
      choices: ['x'.repeat(115), 'y'.repeat(100), 'z'.repeat(90), 'w'.repeat(80)],
      correct_answer: 'x'.repeat(115) },
      expect: { keyStrictlyLongest: true, outlier: true } },
    // just under the ratio: longest but NOT a target
    { name: 'longest but under ratio', item: {
      choices: ['x'.repeat(110), 'y'.repeat(100), 'z'.repeat(90), 'w'.repeat(80)],
      correct_answer: 'x'.repeat(110) },
      expect: { keyStrictlyLongest: true, outlier: false } },
  ]
  let fail = 0
  for (const f of fx) {
    const m = measureItem(f.item)
    const bad = Object.entries(f.expect).filter(([k, v]) => m[k] !== v)
    if (bad.length) { fail++; console.log(`FAIL ${f.name}: ${bad.map(([k, v]) => `${k} expected ${v} got ${m[k]}`).join(', ')}`) }
    else console.log(`ok   ${f.name}  (gap=${m.gap})`)
  }
  if (fail) { console.error(`${fail} fixture(s) failed — do not point this at the bank`); process.exit(1) }
  console.log('selftest PASSED')
}

// ── bank I/O ─────────────────────────────────────────────────────────
function db() {
  const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

async function fetchLive(admin) {
  const rows = []
  for (let f = 0; ; f += 1000) {  // paginate — PostgREST truncates at 1000 (see CLAUDE.md)
    const { data, error } = await admin.from('study_item_bank')
      .select('id, domain, item, verify_meta, archived')
      .in('domain', DOMAINS).order('id').range(f, f + 999)
    if (error) { console.error(error.message); process.exit(1) }
    if (!data?.length) break
    rows.push(...data)
    if (data.length < 1000) break
  }
  return rows.filter(r => !r.archived)
}

const cmd = process.argv[2]
if (cmd === 'selftest') { selftest(); process.exit(0) }

if (cmd === 'measure') {
  const rows = await fetchLive(db())
  printTable(summarize(rows), 'population (live, unarchived)')
  process.exit(0)
}

if (cmd === 'export') {
  const out = process.argv[3]
  if (!out) { console.error('usage: rebalance-length.mjs export <targets.json>'); process.exit(1) }
  const rows = await fetchLive(db())
  const targets = []
  for (const r of rows) {
    const m = measureItem(r.item)
    if (m.broken || !m.outlier) continue
    targets.push({
      id: r.id, domain: r.domain,
      passage: r.item.passage ?? null, prompt: r.item.prompt,
      choices: r.item.choices, correct_answer: r.item.correct_answer,
      explanation: r.item.explanation ?? null,
      key_len: m.keyLen, runner_up_len: m.maxDistractorLen,
    })
  }
  writeFileSync(out, JSON.stringify(targets, null, 2))
  const byD = {}
  for (const t of targets) byD[t.domain] = (byD[t.domain] || 0) + 1
  console.log(`exported ${targets.length} targets → ${out}`)
  for (const [d, c] of Object.entries(byD)) console.log(`  ${d}: ${c}`)
  process.exit(0)
}

if (cmd === 'apply') {
  const path = process.argv[3]
  const DRY = process.argv.includes('--dry')
  if (!path) { console.error('usage: rebalance-length.mjs apply <edits.json> [--dry]'); process.exit(1) }
  const admin = db()
  const edits = JSON.parse(readFileSync(path, 'utf8'))
  const rows = await fetchLive(admin)
  const byId = new Map(rows.map(r => [r.id, r]))

  printTable(summarize(rows), 'BEFORE')

  const refusals = []
  const plan = []
  for (const e of edits) {
    const r = byId.get(e.id)
    const tag = String(e.id).slice(0, 8)
    if (!r) { refusals.push(`${tag}: not a live row in the two domains`); continue }
    const { choices, correct_answer } = r.item
    const ki = choices.indexOf(correct_answer)
    if (!Number.isInteger(e.distractor_index) || e.distractor_index < 0 || e.distractor_index > 3) {
      refusals.push(`${tag}: bad distractor_index ${e.distractor_index}`); continue
    }
    if (e.distractor_index === ki) { refusals.push(`${tag}: index points at the KEY — refused`); continue }
    if (typeof e.new_text !== 'string' || !e.new_text.trim()) { refusals.push(`${tag}: empty new_text`); continue }
    const newText = e.new_text.trim()
    if (newText === correct_answer) { refusals.push(`${tag}: new_text equals the key — refused`); continue }
    if (choices.some((c, i) => i !== e.distractor_index && c === newText)) {
      refusals.push(`${tag}: new_text duplicates another choice — refused`); continue
    }
    const old = choices[e.distractor_index]
    if (old === correct_answer) { refusals.push(`${tag}: stored choice at index IS the key text — refused`); continue }
    if (newText.length < CLOSE_ENOUGH * correct_answer.length) {
      refusals.push(`${tag}: new_text still ${newText.length} vs key ${correct_answer.length} (<${CLOSE_ENOUGH * 100}%) — too short, refused`); continue
    }
    // the repaired item must no longer be an outlier
    const nextChoices = choices.map((c, i) => i === e.distractor_index ? newText : c)
    const m = measureItem({ choices: nextChoices, correct_answer })
    if (m.outlier) { refusals.push(`${tag}: key still an outlier after edit — refused`); continue }
    plan.push({ r, e: { ...e, new_text: newText }, old, nextChoices })
  }

  console.log(`\nplanned ${plan.length} edits, refused ${refusals.length}`)
  refusals.forEach(x => console.log('  REFUSE ' + x))
  if (DRY) { console.log('DRY RUN — nothing written'); process.exit(refusals.length ? 1 : 0) }

  let ok = 0, explFixed = 0
  for (const { r, e, old, nextChoices } of plan) {
    const item = { ...r.item, choices: nextChoices }
    // explanation: only rewrite where the OLD distractor is quoted verbatim
    if (typeof item.explanation === 'string' && item.explanation.includes(old)) {
      item.explanation = item.explanation.split(old).join(e.new_text)
      explFixed++
    }
    const meta = r.verify_meta ?? {}
    const nextMeta = 'legacy_choices_length' in meta ? meta : {
      ...meta, legacy_choices_length: r.item.choices,
      length_rebalanced_at: new Date().toISOString(),
    }
    const { error } = await admin.from('study_item_bank').update({ item, verify_meta: nextMeta }).eq('id', r.id)
    if (error) { console.error(`ERR ${r.id}: ${error.message}`); process.exit(1) }
    ok++
  }
  console.log(`updated ${ok} items (${explFixed} explanations rewritten where they quoted the old distractor)`)

  const after = await fetchLive(admin)
  printTable(summarize(after), 'AFTER')
  process.exit(0)
}

console.error('usage: rebalance-length.mjs selftest|measure|export <out.json>|apply <edits.json> [--dry]')
process.exit(1)
