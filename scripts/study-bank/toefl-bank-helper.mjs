#!/usr/bin/env node
/**
 * study-bank/toefl-bank-helper.mjs — deterministic half of the Claude-only
 * TOEFL bank-scaling pipeline (Listening + Writing free-response). Does NO
 * model calls itself; authoring + QC are driven by Claude Code subagents
 * in-session. This script only renders blind batches and inserts passers.
 *
 * Commands:
 *   blind-listening <file...>            print answer-blind rendering of
 *                                        listening batches (keys stripped),
 *                                        one block per item, stable ids
 *                                        "<fileTag>#<idx>", for solver agents.
 *
 *   insert-listening <keep.json> <file...>
 *                                        keep.json = { "keep": ["<id>", ...] }
 *                                        — the ids a blind Claude grader
 *                                        confirmed (own answer == key, passage-
 *                                        dependent, 4 clean choices). Insert
 *                                        only kept items into study_item_bank.
 *
 *   insert-writing <flagged.json> <file...>
 *                                        flagged.json = { "archive": ["<id>"] }.
 *                                        Insert every writing item NOT flagged
 *                                        (free-response = no key, format-checked
 *                                        at author time + reviewer-flagged here).
 *
 * fileTag = basename without extension (e.g. "listening-01", "email-02").
 * All inserts: family='toefl', verified=true, source='hand' (Claude-authored),
 * cohort from BANK_COHORT env (default 'v3-claude'). Dedups on content_hash
 * against the existing TOEFL bank so re-runs are idempotent.
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'

const LETTERS = ['A', 'B', 'C', 'D']
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const tagOf = p => basename(p, extname(p))
const COHORT = process.env.BANK_COHORT || 'v3-claude'

// Listening dedup: transcript + prompt + choices. Writing dedup: the scenario
// passage (prompt is a fixed instruction string, so it doesn't discriminate).
// content_hash must be ORDER-INSENSITIVE over choices, and blind to the
// cosmetic parts of a stem.
//
// It used to hash `choices` in authored order. A harvest then inserted 14
// copies of one EXCEPT question on a single reef passage: same prompt, same
// key, choices merely permuted — so 14 different hashes, 14 rows, and a
// student could meet the same question 14 times on one passage. Sorting the
// choices and stripping the "[Academic — X]" tag and the
// "According to the passage," lead-in makes those collapse to one hash.
//
// This matters more now, not less: choice order is randomised per session
// at draw time, so authored order carries no information worth hashing.
const stripStem = t => norm(String(t || '')
  .replace(/^\s*\[[^\]]*\]\s*/, '')
  .replace(/^\s*(according to|based on)\s+the\s+passage\s*,?\s*/i, ''))
const hashListening = it => createHash('md5')
  .update([norm(it.passage), stripStem(it.prompt),
           (it.choices || []).map(norm).sort().join('|')].join('~~')).digest('hex')
const hashWriting = it => createHash('md5').update(norm(it.passage)).digest('hex')

/**
 * Deterministic choice shuffle applied at INSERT.
 *
 * Nothing downstream reorders a banked item's choices: shuffleChoices() in
 * src/lib/test-verify.ts is called ONLY by the AI generation route, so the
 * bank draw (assembleFromBank / assembleToeflFromBank / drawBankPractice)
 * serves choices in exactly the order they were authored.
 *
 * That is fine for generated cohorts, which were shuffled before banking.
 * It is not fine for hand-authored ones: an author writing the key first
 * every time produces a bank where "always pick A" scores ~100%. The
 * TOEFL cr-v1 batch landed at 73% key-at-A and was caught by a blind
 * grader, not by any test.
 *
 * Seeded by the content hash so it is stable — re-running an insert
 * produces the same order, and the same item never shuffles two ways.
 */
function shuffleInPlace(it, seedHex) {
  if (!Array.isArray(it.choices) || it.choices.length < 2) return it
  if (!it.choices.includes(it.correct_answer)) return it   // caller validates
  let s = parseInt(seedHex.slice(0, 8), 16) >>> 0
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  const out = it.choices.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  // correct_answer is matched by VALUE, so it needs no remapping — but the
  // per-choice rationales are keyed by text and must survive untouched.
  return { ...it, choices: out }
}

function loadEnv() {
  const raw = readFileSync(process.cwd() + '/.env.local', 'utf8')
  return Object.fromEntries(raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}
const admin = () => {
  const env = loadEnv()
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

// Load files, tag each item with a stable id "<fileTag>#<idx>".
function loadTagged(files) {
  const out = []
  for (const f of files) {
    const tag = tagOf(f)
    const arr = JSON.parse(readFileSync(f, 'utf8'))
    arr.forEach((it, i) => out.push({ id: `${tag}#${i}`, it }))
  }
  return out
}

// Pull a short domain label from the leading "[Tag — Sub]" in the prompt/passage.
function labelFrom(text, fallback) {
  const m = (text || '').match(/^\s*\[([^\]—-]+)/)
  return (m ? m[1].trim() : fallback).slice(0, 60)
}

// The four ETS Jan-2026 Listening tasks. src/lib/study/assemble.ts draws
// the Listening blueprint per task, and an item with no listeningTask
// matches no quota and is NEVER served. Requiring it here is the point at
// which that becomes impossible to get wrong: banking an untagged item
// used to "succeed" and then silently vanish from every test.
const LISTENING_TASKS = new Set(['choose_response', 'conversation', 'announcement', 'academic_talk'])

// An explanation may NOT point at an option by position.
//
// Both helpers shuffle choices at insert (that is what killed the
// key-in-slot-A tell), and the explanation is authored against the
// PRE-shuffle order. So "Choice 2 echoes 'wall'" ends up naming a
// different option than the one it describes. Verified against source on
// 2026-07-30: 245 of 342 items traceable to an authored file had their
// choices reordered, and 72 of those carry a positional reference — the
// wrong-answer explanation a student reads points at the wrong option.
//
// The fix cannot be "shuffle less". It is to write explanations that
// survive reordering: quote the option ("the option that offers a
// refund"), never number it.
const POSITIONAL_REF = /\b(choice|option)\s+(\d|[a-d]\b)|\b(first|second|third|fourth)\s+(choice|option)\b|\([A-D]\)/i
function explanationIsOrderSafe(it) {
  return !POSITIONAL_REF.test(String(it.explanation || ''))
}


// Only Choose-a-Response is one question per audio. The other three must
// carry 2+ questions sharing a passageGroupId — the assembler drops
// single-question sets for those tasks, so banking one wastes the work.
const MULTI_QUESTION_TASKS = new Set(['conversation', 'announcement', 'academic_talk'])

const READING_TASKS = new Set(['daily_life', 'academic_passage'])

// Section is per-item now: an orphan-repair batch mixes reading and
// listening. Default to listening so the original hand-authored batches
// (which carry no `section`) keep inserting exactly as before.
const sectionOf = it => (it.section === 'reading' ? 'reading' : 'listening')

function listeningShapeOk(it) {
  const base = it.type === 'multiple_choice'
    && Array.isArray(it.choices) && it.choices.length === 4
    && it.choices.includes(it.correct_answer)
    && new Set(it.choices.map(c => String(c).trim())).size === 4
  if (!base) return false
  return sectionOf(it) === 'reading'
    ? READING_TASKS.has(it.readingTask)
    // A listening item must still carry its transcript marker; a reading
    // passage must not be forced into that shape.
    : (/^\s*transcript:/i.test(it.passage || '') && LISTENING_TASKS.has(it.listeningTask))
}

function renderBlindListening(tagged) {
  const out = []
  for (const { id, it } of tagged) {
    out.push(`### ${id}`)
    out.push(it.passage)                       // transcript kept; key stripped
    out.push(`Q: ${it.prompt}`)
    it.choices.forEach((c, i) => out.push(`  (${LETTERS[i]}) ${c}`))
    out.push('')
  }
  return out.join('\n')
}

async function insertListening(keepPath, files) {
  const keep = new Set((JSON.parse(readFileSync(keepPath, 'utf8')).keep) || [])
  const tagged = loadTagged(files)
  const db = admin()
  // Dedup across BOTH sections — a mixed batch inserts into either.
  const { data: existing } = await db.from('study_item_bank')
    .select('content_hash').eq('family', 'toefl').in('section', ['reading', 'listening'])
  const seen = new Set((existing || []).map(r => r.content_hash))
  // Group sizes within this batch, so a multi-question task cannot be
  // banked as an orphan (the assembler would refuse to serve it).
  const groupSize = new Map()
  for (const { it } of tagged) {
    if (!it.passageGroupId) continue
    groupSize.set(it.passageGroupId, (groupSize.get(it.passageGroupId) || 0) + 1)
  }
  // How many questions each group ALREADY has in the bank, so an
  // orphan-repair sibling is not mistaken for a new orphan.
  const { data: existingItems } = await db.from('study_item_bank')
    .select('item').eq('family', 'toefl').in('section', ['reading', 'listening'])
    .eq('verified', true).eq('archived', false)
  const existingGroupCount = new Map()
  for (const r of existingItems || []) {
    const g = r.item?.passageGroupId
    if (g) existingGroupCount.set(g, (existingGroupCount.get(g) || 0) + 1)
  }

  let inserted = 0, rejected = 0
  for (const { id, it: raw } of tagged) {
    let it = raw
    if (!listeningShapeOk(it)) { console.log(`SKIP ${id} — bad shape (check listeningTask)`); rejected++; continue }
    if (!explanationIsOrderSafe(it)) {
      console.log(`SKIP ${id} — explanation names an option by position; choices are shuffled at insert, so quote the option instead of numbering it`)
      rejected++; continue
    }
    // Orphan repair EXEMPTION: these items are siblings for an audio that
    // already has one question in the bank, so the batch legitimately holds
    // fewer than 2 for a group. Counting only within the file would reject
    // exactly the repair we are performing.
    const task = it.listeningTask ?? it.readingTask
    const inBank = existingGroupCount.get(it.passageGroupId) || 0
    if (MULTI_QUESTION_TASKS.has(task)
        && (groupSize.get(it.passageGroupId) || 0) + inBank < 2) {
      console.log(`SKIP ${id} — ${task} set would still have <2 questions; the assembler will not serve it`)
      rejected++; continue
    }
    if (!keep.has(id)) { console.log(`REJECT ${id} — not confirmed by grader`); rejected++; continue }
    const content_hash = hashListening(it)
    if (seen.has(content_hash)) { console.log(`DUP ${id}`); continue }
    // Namespace the passage group id.
    //
    // Migration 062 had to re-key the whole harvest-v1 TOEFL bank because
    // generated payloads use ids that are unique only WITHIN one generated
    // test ("academic-1", "convo-2"). Harvesting many tests into one bank
    // made them collide globally — one id ended up spanning 28 different
    // passages, and the UI told students "question 3 of 5 in this passage"
    // while the passage changed underneath them.
    //
    // 062 fixed the DATA. This fixes the CAUSE: derive the id from the
    // passage itself, exactly as that migration did, so a second harvest
    // cannot reintroduce the collision. Ids that are already content-derived
    // ('pg-<md5>') are left alone, and items with no passage keep null.
    if (it.passage && it.passageGroupId && !/^pg-[0-9a-f]{32}$/.test(it.passageGroupId)) {
      const norm = String(it.passage).toLowerCase().replace(/\s+/g, ' ').trim()
      it = { ...it, passageGroupId: 'pg-' + createHash('md5').update(norm).digest('hex') }
    }
    // Shuffle BEFORE hashing-for-storage so what we store is what we serve.
    it = shuffleInPlace(it, content_hash)
    const domain = labelFrom(it.prompt, 'Listening')
    const { error } = await db.from('study_item_bank').insert({
      family: 'toefl', section: sectionOf(it), domain, difficulty: it.difficulty || 'hard',
      item_type: 'multiple_choice', item: it, content_hash,
      topic_tag: it.listeningTask ?? it.readingTask,
      word_count: it.passage ? it.passage.split(/\s+/).filter(Boolean).length : null,
      verified: true, archived: false, source: 'hand', cohort: COHORT,
      verify_meta: { method: 'claude-authored+claude-blind-grade', passage_needed: true },
    })
    if (error) { console.log(`ERR ${id}: ${error.message}`); continue }
    seen.add(content_hash); inserted++
  }
  console.log(`\nListening: inserted ${inserted}, rejected ${rejected}`)
}

/**
 * Listen-and-Repeat insert.
 *
 * Deliberately NOT routed through insertListening: a speaking_repeat item
 * has no choices and no distractors, so the MC shape check would reject
 * every one of them. Its quality gate is different in kind — there is no
 * answer key to blind-grade, only the sentence itself, and TEST_SPECS
 * states the rule in checkable terms (8-12 words, one main clause, no
 * nested clauses). scripts/verify-listen-repeat.ts is that gate; this
 * function re-applies the two rules that would corrupt DATA rather than
 * merely quality, so a bad batch cannot reach the bank even if the
 * verifier was skipped.
 */
async function insertRepeat(files) {
  const tagged = loadTagged(files)
  const db = admin()
  const { data: existing } = await db.from('study_item_bank')
    .select('content_hash').eq('family', 'toefl').eq('section', 'speaking')
  const seen = new Set((existing || []).map(r => r.content_hash))
  const wordsOf = t => String(t || '').trim().split(/\s+/).filter(Boolean).length
  const bandFor = n => (n >= 8 && n <= 9 ? 'easy' : n >= 10 && n <= 11 ? 'medium' : n === 12 ? 'hard' : null)

  let inserted = 0, rejected = 0
  for (const { id, it } of tagged) {
    if (it.type !== 'speaking_repeat' || !it.passage) { console.log(`SKIP ${id} — bad shape`); rejected++; continue }
    // The student's transcription is compared against correct_answer, so a
    // drift between the two makes the item ungradeable. 58 live items had
    // exactly this, because the passage carried an 'Audio script: "' prefix
    // that the key did not — and that prefix is READ ALOUD by the TTS.
    if (it.passage !== it.correct_answer) { console.log(`SKIP ${id} — passage !== correct_answer`); rejected++; continue }
    if (/^\s*(audio script|transcript)\s*:/i.test(it.passage)) {
      console.log(`SKIP ${id} — scaffolding prefix would be spoken aloud`); rejected++; continue
    }
    const n = wordsOf(it.passage)
    const band = bandFor(n)
    if (!band) { console.log(`SKIP ${id} — ${n} words, outside the 8-12 spec band`); rejected++; continue }
    if (it.difficulty && it.difficulty !== band) {
      console.log(`SKIP ${id} — ${n} words is '${band}', labelled '${it.difficulty}'`); rejected++; continue
    }
    const content_hash = createHash('md5').update(norm(it.passage)).digest('hex')
    if (seen.has(content_hash)) { console.log(`DUP ${id}`); continue }
    const { error } = await db.from('study_item_bank').insert({
      family: 'toefl', section: 'speaking', domain: 'Listen and Repeat', difficulty: band,
      item_type: 'speaking_repeat', item: { ...it, difficulty: band }, content_hash,
      word_count: n, verified: true, archived: false, source: 'hand', cohort: COHORT,
      verify_meta: { method: 'claude-authored+spec-rule-check', band_by: 'word_count' },
    })
    if (error) { console.log(`ERR ${id}: ${error.message}`); continue }
    seen.add(content_hash); inserted++
  }
  console.log(`\nListen-and-Repeat: inserted ${inserted}, rejected ${rejected}`)
}

async function insertWriting(flaggedPath, files) {
  const flagged = new Set((JSON.parse(readFileSync(flaggedPath, 'utf8')).archive) || [])
  const tagged = loadTagged(files)
  const db = admin()
  const { data: existing } = await db.from('study_item_bank').select('content_hash').eq('family', 'toefl').eq('section', 'writing')
  const seen = new Set((existing || []).map(r => r.content_hash))
  const DOMAIN = { writing_email: 'Email', writing_discussion: 'Academic Discussion' }
  let inserted = 0, skipped = 0
  for (const { id, it } of tagged) {
    if (!['writing_email', 'writing_discussion'].includes(it.type) || !it.passage) { console.log(`SKIP ${id} — bad shape`); skipped++; continue }
    if (flagged.has(id)) { console.log(`FLAGGED ${id} — archived by reviewer`); skipped++; continue }
    const content_hash = hashWriting(it)
    if (seen.has(content_hash)) { console.log(`DUP ${id}`); continue }
    const { error } = await db.from('study_item_bank').insert({
      family: 'toefl', section: 'writing', domain: DOMAIN[it.type], difficulty: it.difficulty || 'hard',
      item_type: it.type, item: it, content_hash,
      word_count: it.passage.split(/\s+/).filter(Boolean).length,
      verified: true, archived: false, source: 'hand', cohort: COHORT,
      verify_meta: { method: 'claude-authored+claude-reviewer', free_response: true },
    })
    if (error) { console.log(`ERR ${id}: ${error.message}`); continue }
    seen.add(content_hash); inserted++
  }
  console.log(`\nWriting: inserted ${inserted}, skipped ${skipped}`)
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2)
  if (cmd === 'blind-listening') { process.stdout.write(renderBlindListening(loadTagged(rest))); return }
  if (cmd === 'insert-listening') { await insertListening(rest[0], rest.slice(1)); return }
  if (cmd === 'insert-repeat') { await insertRepeat(rest); return }
  if (cmd === 'insert-writing') { await insertWriting(rest[0], rest.slice(1)); return }
  console.error('usage:\n  toefl-bank-helper.mjs blind-listening <file...>\n  toefl-bank-helper.mjs insert-listening <votes.json> <file...>\n  toefl-bank-helper.mjs insert-repeat <file...>\n  toefl-bank-helper.mjs insert-writing <flagged.json> <file...>')
  process.exit(1)
}
main().catch(e => { console.error(e); process.exit(1) })
