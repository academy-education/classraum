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
import { gateBatch, overrideReason } from './gate.mjs'

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
// SCOPED DELIBERATELY. The first version was /\b(choice|option)\s+(\d|[a-d]\b)|...|\([A-D]\)/i
// and it was wrong twice on SAT Math, where 192 items were flagged and only
// 43 were real:
//   - "Choice 7 comes from 2g = 6x - 4" names the option whose VALUE is 7.
//     A four-option item has no seventh choice, so a number above 4 is
//     always a value reference and survives a shuffle intact.
//   - f(g(a)) and sin(A) matched \([A-D]\), and the /i flag matched the
//     lowercase (a) too.
// Both would have sent authors to rewrite prose that was never broken.
// Two rules with DIFFERENT casing needs, which is why this is not one regex.
// "Choice 2" must match case-insensitively; "(A)" must NOT match "(a)",
// because f(g(a)) is function notation. Folding them into one /i pattern is
// what produced 149 false positives on SAT Math.
const POSITIONAL_WORD = /\b(choice|option)\s+([1-4]|[a-d])\b|\b(first|second|third|fourth)\s+(choice|option)\b/i
const POSITIONAL_PAREN = /(^|[^A-Za-z0-9_])\([A-D]\)/
const namesAPosition = (s) => POSITIONAL_WORD.test(s) || POSITIONAL_PAREN.test(s)
function explanationIsOrderSafe(it) {
  return !namesAPosition(String(it.explanation || ''))
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
    // SHUFFLE before rendering, with the same deterministic shuffle insert
    // uses, so the blind render can never be answered by position.
    //
    // It used to render the AUTHORED order. Authors write the key first —
    // cr-01.json and cr-03.json are both 22/22 key-in-slot-A — so a blind
    // solver answering "always (A)" scored 44/44 on those batches and the
    // QC that "confirmed" them proved nothing about their content. That is
    // the same false green as the 2026-07-28 blind grade that returned
    // 175/175 while reading position instead of content.
    //
    // The bank itself was never exposed: insert shuffles too. What was
    // compromised is the CHECK, which is worse, because a check that cannot
    // fail is what lets everything else through.
    const shown = shuffleInPlace(it, hashListening(it))
    out.push(`### ${id}`)
    out.push(shown.passage)                    // transcript kept; key stripped
    out.push(`Q: ${shown.prompt}`)
    shown.choices.forEach((c, i) => out.push(`  (${LETTERS[i]}) ${c}`))
    out.push('')
  }
  return out.join('\n')
}

async function insertListening(keepPath, files) {
  const keep = new Set((JSON.parse(readFileSync(keepPath, 'utf8')).keep) || [])
  const tagged = loadTagged(files)

  // ── THE GATE ────────────────────────────────────────────────────────
  // Everything below this point is mechanical: shape, explanation safety,
  // group size, and "the id is in a keep file". None of it asks whether an
  // item is answerable, appropriately hard, or solvable without its source
  // — and a bank-wide audit found 92.7-100% of verbal items solvable with
  // the audio or passage hidden. That is what this refuses.
  //
  // Bound to the sha256 of the item files, so editing an option after
  // review invalidates the approval rather than silently inheriting it.
  const batchTask = tagged[0]?.it?.listeningTask ?? tagged[0]?.it?.readingTask
  const verdict = gateBatch({ task: batchTask, family: 'toefl', section: sectionOf(tagged[0]?.it ?? {}), itemFiles: files })
  const override = overrideReason()
  if (!verdict.canInsert && !override) {
    console.error(`\nREFUSED — ${tagged.length} item(s) not inserted.`)
    console.error(`  batch family : ${verdict.family}`)
    console.error(`  content hash : ${verdict.sha.slice(0, 16)}`)
    console.error(`  reason       : ${verdict.reason}`)
    console.error(`\nRecord the gate results in scripts/study-bank/ledger.json under this`)
    console.error(`hash, or set BANK_GATE_OVERRIDE="<reason>" if this is a documented`)
    console.error(`exception such as an orphan-repair batch.\n`)
    process.exitCode = 1
    return
  }
  if (override) {
    console.warn(`\n!! GATE OVERRIDDEN: ${override}`)
    console.warn(`!! ${verdict.reason}`)
    console.warn(`!! Record this in the ledger under hash ${verdict.sha.slice(0, 16)}.\n`)
  }

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
  if (!refuseUnlessGated({ task: 'listen_and_repeat', section: 'speaking', files, count: tagged.length })) return
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
  if (!refuseUnlessGated({ task: tagged[0]?.it?.type, section: 'writing', files, count: tagged.length })) return
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


/**
 * The ledger gate, for every insert path.
 *
 * It was called from insertListening ONLY. insertRepeat and insertWriting
 * reached study_item_bank without it, so two of three paths could bank a
 * batch that had never been recorded as gated — the gate was documented
 * as the pipeline's floor and enforced on a third of it.
 */
function refuseUnlessGated({ task, section, files, count }) {
  const verdict = gateBatch({ task, family: 'toefl', section, itemFiles: files })
  const override = overrideReason()
  if (verdict.canInsert || override) {
    if (override) console.warn(`\n!! GATE OVERRIDDEN: ${override}`)
    return true
  }
  console.error(`\nREFUSED — ${count} item(s) not inserted.`)
  console.error(`  batch family : ${verdict.family}`)
  console.error(`  content hash : ${verdict.sha.slice(0, 16)}`)
  console.error(`  reason       : ${verdict.reason}`)
  process.exitCode = 1
  return false
}

import { checkFillInBlanks, checkArrangeWords, checkSpeakingInterview } from './frozen-shapes.mjs'

const FROZEN = {
  'fill-in-blanks': {
    type: 'fill_in_blanks', section: 'reading', domain: 'Complete the Words',
    check: checkFillInBlanks, task: 'complete_the_words',
    difficulty: it => it.difficulty || 'hard',
    hash: it => createHash('md5').update(norm(it.passage)).digest('hex'),
    words: it => String(it.passage).split(/\s+/).filter(Boolean).length,
  },
  'arrange-words': {
    type: 'arrange_words', section: 'writing', domain: 'Build a Sentence',
    check: checkArrangeWords, task: 'build_a_sentence',
    difficulty: it => it.difficulty || 'medium',
    hash: it => createHash('md5').update(norm(it.correct_answer)).digest('hex'),
    words: it => (it.choices || []).join(' ').split(/\s+/).filter(Boolean).length,
  },
  'interview': {
    type: 'speaking_interview', section: 'speaking', domain: 'Interview',
    check: checkSpeakingInterview, task: 'interview',
    difficulty: it => it.difficulty || 'hard',
    hash: it => createHash('md5').update(norm(it.prompt) + '|' + norm(it.passage)).digest('hex'),
    words: it => String(it.passage).split(/\s+/).filter(Boolean).length,
  },
}

/**
 * The three frozen types. 249 such items are live and, until now, none of
 * them had an insert command — they entered by a path that no longer
 * exists, so the bank could serve them and could not grow them.
 */
async function insertFrozen(kind, files) {
  const spec = FROZEN[kind]
  const tagged = loadTagged(files)
  if (!tagged.length) { console.error('no items'); process.exitCode = 1; return }
  if (!refuseUnlessGated({ task: spec.task, section: spec.section, files, count: tagged.length })) return

  const db = admin()
  const { data: existing } = await db.from('study_item_bank')
    .select('content_hash').eq('family', 'toefl').eq('item_type', spec.type)
  const seen = new Set((existing || []).map(r => r.content_hash))

  let inserted = 0, rejected = 0
  for (const { id, it } of tagged) {
    const why = spec.check(it)
    if (why) { console.log(`REJECT ${id} — ${why}`); rejected++; continue }
    const content_hash = spec.hash(it)
    if (seen.has(content_hash)) { console.log(`DUP ${id}`); continue }
    const { error } = await db.from('study_item_bank').insert({
      family: 'toefl', section: spec.section, domain: spec.domain,
      difficulty: spec.difficulty(it), item_type: spec.type, task: spec.task,
      item: it, content_hash, word_count: spec.words(it),
      verified: true, archived: false, source: 'hand', cohort: COHORT,
      verify_meta: { method: 'claude-authored+shape-rule-check', shape: spec.type },
    })
    if (error) { console.log(`ERR ${id}: ${error.message}`); rejected++; continue }
    seen.add(content_hash); inserted++
  }
  console.log(`\n${spec.domain}: inserted ${inserted}, rejected ${rejected}`)
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2)
  if (cmd === 'blind-listening') { process.stdout.write(renderBlindListening(loadTagged(rest))); return }
  if (cmd === 'insert-listening') { await insertListening(rest[0], rest.slice(1)); return }
  if (cmd === 'insert-repeat') { await insertRepeat(rest); return }
  if (cmd === 'insert-writing') { await insertWriting(rest[0], rest.slice(1)); return }
  if (cmd === 'insert-fill-in-blanks') { await insertFrozen('fill-in-blanks', rest); return }
  if (cmd === 'insert-arrange-words') { await insertFrozen('arrange-words', rest); return }
  if (cmd === 'insert-interview') { await insertFrozen('interview', rest); return }
  console.error('usage:\n  toefl-bank-helper.mjs blind-listening <file...>\n  toefl-bank-helper.mjs insert-listening <votes.json> <file...>\n  toefl-bank-helper.mjs insert-repeat <file...>\n  toefl-bank-helper.mjs insert-writing <flagged.json> <file...>\n  toefl-bank-helper.mjs insert-fill-in-blanks <file...>\n  toefl-bank-helper.mjs insert-arrange-words <file...>\n  toefl-bank-helper.mjs insert-interview <file...>')
  process.exit(1)
}
// Only run as a CLI. The shape validators are exported so they can be
// tested and pointed at the live bank; importing the module used to print
// usage and exit(1), which made them untestable.
if (process.argv[1] && process.argv[1].endsWith('toefl-bank-helper.mjs')) {
  main().catch(e => { console.error(e); process.exit(1) })
}
