#!/usr/bin/env node
/**
 * check-production-items.mjs — a gate for the 541 items the blind attack
 * cannot reach.
 *
 * READ ONLY. Only SELECTs against study_item_bank. Never writes.
 *
 * ── Why these six cohorts had no gate ────────────────────────────────
 * Every QC instrument in scripts/study-bank/ is a blind attack: hide the
 * passage or the audio, show the four options, see whether a solver can
 * still pick the key. It measures ONE failure — the options leak the
 * answer. Six cohorts have no options:
 *
 *   Build a Sentence     119   arrange_words
 *   Listen and Repeat     97   speaking_repeat
 *   Complete the Words    93   fill_in_blanks
 *   Academic Discussion   92   writing_discussion
 *   Email                 92   writing_email
 *   Interview             48   speaking_interview
 *
 * So the attack does not apply. That is NOT the same as "nothing checks
 * them", and the register overstated the gap: verify-listen-repeat.ts
 * already rule-checks the Listen-and-Repeat spec, and
 * verify-interview-sets.ts already checks that a drawn interview is one
 * coherent set. What had no item-level check at all is arrange_words,
 * fill_in_blanks, writing_email and writing_discussion — 396 items.
 *
 * ── The principle this script is built on ────────────────────────────
 * CLAUDE.md: structural proxies for semantic problems do not work. Five
 * have been built in this directory and each caught the tell it was
 * built for while missing the next one. So this script does not guess at
 * quality. Every detector here REPLAYS A REAL CODE PATH — the grader in
 * submit/route.ts, the chip pool in TestSession.tsx, the speaker parser
 * in discussion-speakers.ts, the scenario renderer in WritingPanels.tsx
 * — and reports where the item and the code that serves it disagree.
 * A finding is therefore a fact about the product, not an opinion about
 * the writing.
 *
 * The one place a lexicon is needed (Complete the Words) is fenced: a
 * word is only reported when it is BOTH unknown AND repairable by
 * deleting a duplicated join, so "exoplanets" (missing from a 1913
 * dictionary) is silent and "futuure" is not.
 *
 * ── What it flags ────────────────────────────────────────────────────
 * FATAL — the item cannot be answered correctly, or is served wrong:
 *   bas/key-not-assemblable   no tap order of the chips can equal the key
 *   bas/duplicate-chip        the UI pool drops both copies; unfinishable
 *   bas/malformed             fewer than 2 chips, or a key with no "|"
 *   ctw/placeholder-mismatch  a blank with no input box, or vice versa
 *   ctw/blank-count           not the 10 blanks the scorer assumes
 *   ctw/broken-word           passage + key spell a misspelling
 *   lr/script-key-mismatch    the audio says one sentence, the key another
 *   ad/speakers-unparsed      the discussion renders as undivided prose
 *   iv/set-size               an interview set that is not exactly 4
 *
 * HIGH — answerable, but the task is not the task:
 *   em/no-task-list           no "In your email…:" + bullets, so the
 *                             student is told nothing to cover and
 *                             task_fulfillment grades coverage of nothing
 *   ad/no-professor           / ad/too-few-students
 *
 * WARN — cross-item, the shape this project keeps rediscovering:
 *   */ /* dup-item, template-collision, near-duplicate
 *
 * ── --selftest ───────────────────────────────────────────────────────
 * A checker that has not been shown to fire is not evidence; this repo
 * has published "0 problems" from a verifier reading a truncated table.
 * --selftest drives every detector over fixtures with known answers and
 * asserts it fires on the defect AND stays quiet on the sound twin. It
 * touches no database and no dictionary (the lexicon is injected), so a
 * green self-test says the DETECTOR works, not that the bank is clean.
 *
 * usage:
 *   node scripts/study-bank/check-production-items.mjs --selftest
 *   node scripts/study-bank/check-production-items.mjs            # sweep
 *   node scripts/study-bank/check-production-items.mjs --verbose  # all rows
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'

const FATAL = 'FATAL', HIGH = 'HIGH', WARN = 'WARN'

/** submit/route.ts gradeAnswer(): the ONLY normalisation grading applies. */
const norm = s => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

/** test/helpers.tsx normalizeDisplayText() — what the renderer sees. */
function normalizeDisplayText(text) {
  if (!text) return ''
  let s = String(text)
  s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\'/g, "'")
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '$1').replace(/(?<![*\w])\*([^*\n]+?)\*(?![*\w])/g, '$1')
  s = s.replace(/^#{1,4}\s+/gm, '')
  return s
}

const push = (out, row, kind, sev, detail) =>
  out.push({ id: row.id, domain: row.domain ?? '?', kind, sev, detail })

// ─────────────────────────────────────────────────────────────────────
// Build a Sentence — arrange_words
//
// The student taps chips; TestSession stores `chips.join(' | ')`; submit
// grades `norm(student) === norm(correct_answer)`. Both sides are exact
// after case/whitespace folding, so the item is answerable IFF the
// multiset of normalised chips equals the multiset of the key's
// "|"-separated segments. A stray period on the key's last segment is
// enough to make the item unpassable, and nothing in the app would ever
// say so — the student assembles a correct sentence and is marked wrong.
// ─────────────────────────────────────────────────────────────────────
function checkArrangeWords(row, out) {
  const it = row.item ?? {}
  const chips = (it.choices ?? []).map(String)
  const key = String(it.correct_answer ?? '')
  const segs = key.split('|').map(s => s.trim()).filter(s => s.length)

  if (chips.length < 2 || segs.length < 2) {
    push(out, row, 'bas/malformed', FATAL,
      `${chips.length} chip(s), ${segs.length} key segment(s)`)
    return
  }
  // The UI pool is `choices.filter(c => !placed.includes(c))` — placing
  // one copy of a repeated chip removes every copy, so the student can
  // never place them all and `complete` is never reached.
  const seen = new Set()
  for (const c of chips) {
    if (seen.has(c)) {
      push(out, row, 'bas/duplicate-chip', FATAL, `chip appears twice: "${c}"`)
      return
    }
    seen.add(c)
  }
  const a = chips.map(norm).sort()
  const b = segs.map(norm).sort()
  if (a.length !== b.length || a.some((x, i) => x !== b[i])) {
    const extraKey = b.filter(x => !a.includes(x))
    const extraChip = a.filter(x => !b.includes(x))
    push(out, row, 'bas/key-not-assemblable', FATAL,
      `no tap order can equal the key. in key not in chips: ${JSON.stringify(extraKey)}; `
      + `in chips not in key: ${JSON.stringify(extraChip)}`)
  }
}

// ─────────────────────────────────────────────────────────────────────
// Complete the Words — fill_in_blanks
//
// Every blank id must have a [N] in the passage: TestSession renders an
// input per placeholder and submit grades per blanks[] entry, so a
// mismatch is either an ungradeable box or an ungradeable blank the
// student cannot even see. And BLANKS_PER_CTW = 10 is load-bearing —
// submit returns `{ total: blanks.length }` and the ETS weighting
// assumes ten.
//
// broken-word: the renderer shows `prefix` + expectedLen empty boxes +
// `suffix`, so the student is being asked to spell prefix+answer+suffix.
// Reported ONLY when that string is unknown to the lexicon AND becomes a
// known word once a duplicated join is deleted. That second condition is
// the whole precision story: a 1913 dictionary does not have
// "exoplanets" either, and 52 reconstructions are unknown to it — but
// only the ones that repair are defects.
// ─────────────────────────────────────────────────────────────────────
const BLANKS_PER_CTW = 10

/* English doubles a final consonant before -ing/-ed/-er/-est/-en:
 * "plan" + "ning" = "planning". That looks exactly like the defect —
 * and the first live run proved it, flagging "planning" twice and
 * proposing "planing", which is a different word. So a single-consonant
 * duplication followed by one of these suffixes is not repairable.
 * Deliberately excludes -ion: English does not double before it, which
 * is why "act" + "tion" = "acttion" stays a defect. */
const DOUBLING_SUFFIX = /^(ing|ings|ed|er|ers|est|en|y|able)$/

/** Delete a 1-3 char duplication at either join. Returns candidates. */
function joinRepairs(pre, ans, suf) {
  const out = []
  for (let k = 1; k <= 3 && k <= ans.length; k++) {
    if (pre.length >= k && pre.slice(-k) === ans.slice(0, k)) {
      if (k === 1 && !'aeiou'.includes(ans[0]) && DOUBLING_SUFFIX.test(ans.slice(1))) continue
      out.push(pre + ans.slice(k) + suf)
    }
  }
  for (let k = 1; k <= 3 && k <= suf.length; k++) {
    if (ans.length >= k && ans.slice(-k) === suf.slice(0, k)) out.push(pre + ans + suf.slice(k))
  }
  return out
}

function checkFillInBlanks(row, out, known) {
  const it = row.item ?? {}
  const passage = String(it.passage ?? '')
  const blanks = it.blanks ?? []
  const inPassage = [...passage.matchAll(/\[(\d+)\]/g)].map(m => Number(m[1]))
  const declared = blanks.map(b => Number(b.id))
  const sortNum = xs => [...xs].sort((x, y) => x - y).join(',')

  if (sortNum(inPassage) !== sortNum(declared)) {
    push(out, row, 'ctw/placeholder-mismatch', FATAL,
      `passage has [${sortNum(inPassage)}], blanks declare [${sortNum(declared)}]`)
  }
  if (declared.length !== BLANKS_PER_CTW) {
    push(out, row, 'ctw/blank-count', FATAL,
      `${declared.length} blanks, scorer assumes ${BLANKS_PER_CTW}`)
  }
  for (const b of blanks) {
    const ans = String(b.answer ?? '')
    if (!ans.trim()) {
      push(out, row, 'ctw/empty-answer', FATAL, `blank ${b.id} has no answer`)
      continue
    }
    if (!known) continue
    const m = passage.match(new RegExp(`([A-Za-z]*)\\[${b.id}\\]([A-Za-z]*)`))
    if (!m) continue
    const pre = m[1].toLowerCase(), suf = m[2].toLowerCase(), a = ans.toLowerCase()
    const full = pre + a + suf
    /* Deliberately the RAW headword set, not the morphologically expanded
     * one. The expansion exists so "instruments" does not read as a defect;
     * but it also accepts "momentss" (strip the final s -> "moments"), which
     * is exactly the defect this detector is for. So: a word that is in the
     * dictionary as written is fine, and everything else has to earn its
     * silence by having no join repair. */
    if (known.base ? known.base.has(full) : known(full)) continue
    const repaired = joinRepairs(pre, a, suf).filter(w => w !== full && known(w))
    if (repaired.length) {
      push(out, row, 'ctw/broken-word', FATAL,
        `blank ${b.id}: the student is shown "${m[1]}${'_'.repeat(ans.length)}${m[2]}" `
        + `and the key spells "${full}" — should be "${repaired[0]}"`)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Listen and Repeat — speaking_repeat
//
// verify-listen-repeat.ts owns the spec (8-12 words, one clause, top-2000
// vocabulary). The one thing it does not check is the pair: TTS speaks
// `passage` (prewarm-toefl-audio.mjs strips an "Audio script:" prefix and
// wrapping quotes) while submit grades against `correct_answer`. If they
// differ, the student hears one sentence and is graded on another, and
// listen-repeat-accuracy.ts will read it as a band-2 memory failure.
// ─────────────────────────────────────────────────────────────────────
function checkSpeakingRepeat(row, out) {
  const it = row.item ?? {}
  const spoken = String(it.passage ?? '')
    .replace(/^\s*(?:audio\s*script|transcript)\s*:\s*/i, '')
    .replace(/^"|"$/g, '').trim()
  const key = String(it.correct_answer ?? '').trim()
  if (!spoken || !key) {
    push(out, row, 'lr/missing-text', FATAL,
      `spoken="${spoken.slice(0, 40)}" key="${key.slice(0, 40)}"`)
    return
  }
  const strip = s => s.toLowerCase().replace(/[.,!?;:'"\-—–…‘’“”«»()]/g, '').replace(/\s+/g, ' ').trim()
  if (strip(spoken) !== strip(key)) {
    push(out, row, 'lr/script-key-mismatch', FATAL,
      `audio says "${spoken}" — key is "${key}"`)
  }
}

// ─────────────────────────────────────────────────────────────────────
// Academic Discussion — writing_discussion
//
// Verbatim port of parseDiscussionSpeakers() from
// src/app/mobile/study/session/[id]/test/discussion-speakers.ts. Its own
// docstring says the failure is invisible: an undetected speaker is
// silently absorbed into the previous card, and the student reads two
// classmates as one. The task then asks them to "engage at least one
// classmate by name" from a passage that shows no names.
// ─────────────────────────────────────────────────────────────────────
function parseDiscussionSpeakers(normalized) {
  const speakerRegex =
    /(?:^|(?<=[\s\n]))((?:Professor|Prof\.?|Dr\.?|Student|Mr\.?|Ms\.?|Mrs\.?)\s+\p{Lu}[\p{L}'’.-]{1,30}(?:\s+\p{Lu}[\p{L}'’.-]{1,30})?|\p{Lu}[\p{Ll}'’.-]{1,20}(?:\s+\p{Lu}[\p{Ll}'’.-]{1,20})?)\s*:\s*/gu
  const matches = []
  let m
  while ((m = speakerRegex.exec(normalized)) != null) {
    matches.push({
      start: m.index + (m[0].length - m[0].trimStart().length),
      end: m.index + m[0].length,
      header: m[1].trim(),
    })
  }
  const trimmed = []
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i], next = matches[i + 1]
    const bodyLen = (next ? next.start : normalized.length) - cur.end
    if (i === 0 || i === matches.length - 1 || bodyLen >= 15) trimmed.push(cur)
  }
  if (trimmed.length < 2) return []
  const blocks = []
  for (let i = 0; i < trimmed.length; i++) {
    const h = trimmed[i], next = trimmed[i + 1]
    const body = normalized.slice(h.end, next ? next.start : undefined).replace(/^\s+|\s+$/g, '')
    const isProf = /^(Professor|Prof\.?|Dr\.?)\b/i.test(h.header)
      || (i === 0 && !blocks.some(b => b.role === 'professor') && /\?/.test(body))
    const cleanName = h.header.replace(/^(?:Professor|Prof\.?|Dr\.?|Student|Mr\.?|Ms\.?|Mrs\.?)\s+/i, '').trim() || h.header
    blocks.push({ role: isProf ? 'professor' : 'student', name: cleanName, body })
  }
  return blocks
}

function checkDiscussion(row, out) {
  const blocks = parseDiscussionSpeakers(normalizeDisplayText(row.item?.passage))
  if (blocks.length === 0) {
    push(out, row, 'ad/speakers-unparsed', FATAL,
      'renders as undivided prose; no classmate name is identifiable')
    return
  }
  const profs = blocks.filter(b => b.role === 'professor').length
  const students = blocks.filter(b => b.role === 'student').length
  if (profs === 0) push(out, row, 'ad/no-professor', HIGH, `${blocks.length} speakers, none read as the professor`)
  if (students < 2) push(out, row, 'ad/too-few-students', HIGH, `${students} classmate post(s); the task requires engaging one by name`)
}

// ─────────────────────────────────────────────────────────────────────
// Email — writing_email
//
// Verbatim port of the ETS-format branch of WritingScenario() in
// WritingPanels.tsx: SITUATION + "In your email to X, be sure to:" +
// bullets. When that branch misses, the renderer falls back to printing
// the raw passage — and, far worse, the item never tells the student
// what to cover, while responseRubrics.toefl_writing_email scores
// `task_fulfillment` ("Task coverage") against points that were never
// stated. That is the "prompt that cannot be answered well" failure.
// ─────────────────────────────────────────────────────────────────────
const BULLET_LEAD = /^\s*(?:[•●◦▪□■\-*·]|\(?\d+\)|\d+\.)\s+/
const INTRO_BROAD = /(?:^|\n)\s*((?:in\s+your\s+(?:email|reply|response|message)|your\s+email\s+should|be\s+sure\s+to|include\s+the\s+following|address\s+the\s+following|make\s+sure\s+to|remember\s+to|the\s+email\s+should|write\s+(?:an?\s+email|a\s+reply|your\s+email)|please\s+(?:include|address)|your\s+email\s+must)\b[^\n:]{0,120}?:)\s*(?:\n|$)/i

function extractBullets(block) {
  const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean)
  const markered = lines.filter(l => BULLET_LEAD.test(l))
  if (markered.length >= 2) return markered.map(l => l.replace(BULLET_LEAD, '').trim())
  if (lines.length >= 2) return lines.map(l => l.replace(BULLET_LEAD, '').trim())
  if (lines.length === 1) {
    const parts = lines[0].split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean)
    if (parts.length >= 2) return parts
  }
  return []
}

function emailBullets(passage) {
  const n = normalizeDisplayText(passage)
  const im = n.match(INTRO_BROAD)
  if (!im || im.index == null) return null
  const start = im.index + im[0].indexOf(im[1])
  return extractBullets(n.slice(start + im[1].length).trim())
}

function checkEmail(row, out) {
  const bullets = emailBullets(row.item?.passage)
  if (bullets === null || bullets.length < 2) {
    push(out, row, 'em/no-task-list', HIGH,
      'no "In your email …:" + bullets — the student is told nothing to cover, '
      + 'and task_fulfillment grades coverage of unstated points')
    return
  }
  if (bullets.length !== 3) {
    push(out, row, 'em/bullet-count', WARN, `${bullets.length} bullets; ETS Jan-2026 uses 3`)
  }
}

// ─────────────────────────────────────────────────────────────────────
// Interview — speaking_interview
//
// verify-interview-sets.ts checks what the DRAW delivers. This checks the
// rows: all four questions of a set must share one premise, because
// assemble.ts groups on passageGroupId and plays them as one interview.
// ─────────────────────────────────────────────────────────────────────
function checkInterviewSets(rows, out) {
  const groups = new Map()
  for (const r of rows) {
    const g = r.item?.passageGroupId ?? null
    if (!g) { push(out, r, 'iv/ungrouped', FATAL, 'no passageGroupId; cannot be drawn as part of a set'); continue }
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g).push(r)
  }
  for (const [g, members] of groups) {
    const head = members[0]
    if (members.length !== 4) {
      push(out, head, 'iv/set-size', FATAL, `set "${g}" has ${members.length} items; the draw asks for 4`)
    }
    const premises = new Set(members.map(m => norm(m.item?.passage)))
    if (premises.size > 1) {
      push(out, head, 'iv/split-premise', FATAL, `set "${g}" has ${premises.size} different premises`)
    }
    const prompts = new Set(members.map(m => norm(m.item?.prompt)))
    if (prompts.size !== members.length) {
      push(out, head, 'iv/repeated-question', HIGH, `set "${g}" repeats a question`)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Cross-item: duplicates and template collisions.
//
// The corollary in CLAUDE.md: a batch built to one brief develops a tell
// across items that is invisible inside any single item. For Build a
// Sentence the countable version is the key's opening — if four items
// begin "The book | that was recommended | by my professor", a student
// who meets one has three chips of the next three for free. Ten of the
// 119 are drawn per Writing test.
// ─────────────────────────────────────────────────────────────────────
function shingles(text, k = 4) {
  const w = String(text ?? '').toLowerCase().match(/[a-z']+/g) ?? []
  const s = new Set()
  for (let i = 0; i + k <= w.length; i++) s.add(w.slice(i, i + k).join(' '))
  return s
}
const jaccard = (a, b) => {
  let i = 0
  for (const x of a) if (b.has(x)) i++
  return i / (a.size + b.size - i || 1)
}

function checkCrossItem(rows, out) {
  // exact duplicates, per type, on the field that identifies the task
  const idOf = r => r.item_type === 'arrange_words' ? norm(r.item?.correct_answer)
    : r.item_type === 'speaking_repeat' ? norm(r.item?.correct_answer)
      : norm(r.item?.passage) + '~' + norm(r.item?.prompt)
  const byKey = new Map()
  for (const r of rows) {
    const k = r.item_type + '~' + idOf(r)
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k).push(r)
  }
  for (const members of byKey.values()) {
    if (members.length > 1 && members[0].item_type !== 'speaking_interview') {
      push(out, members[0], 'x/duplicate-item', WARN,
        `identical to ${members.length - 1} other row(s): ${members.slice(1).map(m => m.id).join(', ')}`)
    }
  }
  // arrange_words template collisions on the first three key segments
  const heads = new Map()
  for (const r of rows.filter(r => r.item_type === 'arrange_words')) {
    const segs = String(r.item?.correct_answer ?? '').split('|').map(norm).filter(Boolean)
    if (segs.length < 3) continue
    const k = segs.slice(0, 3).join(' | ')
    if (!heads.has(k)) heads.set(k, [])
    heads.get(k).push(r)
  }
  for (const [k, members] of heads) {
    if (members.length > 1) {
      push(out, members[0], 'x/template-collision', WARN,
        `${members.length} items open "${k}" — the opening is free after the first`)
    }
  }
  // near-duplicate scenarios in the rubric-graded cohorts
  for (const t of ['writing_email', 'writing_discussion', 'speaking_interview']) {
    const g = rows.filter(r => r.item_type === t)
      .map(r => ({ r, s: shingles(`${r.item?.passage ?? ''} ${t === 'speaking_interview' ? r.item?.prompt ?? '' : ''}`) }))
    for (let i = 0; i < g.length; i++) {
      for (let j = i + 1; j < g.length; j++) {
        const v = jaccard(g[i].s, g[j].s)
        if (v >= 0.5) {
          push(out, g[i].r, 'x/near-duplicate', WARN,
            `${(v * 100).toFixed(0)}% 4-gram overlap with ${g[j].r.id}`)
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Draw sufficiency — arithmetic against the blueprint in assemble.ts.
// CLAUDE.md: "quota arithmetic that could not be satisfied by real set
// sizes, and a draw that silently came up short".
// ─────────────────────────────────────────────────────────────────────
const BLUEPRINT = [
  ['arrange_words', 10, null],
  ['writing_email', 1, null],
  ['writing_discussion', 1, null],
  ['speaking_repeat', 7, { easy: 3, medium: 3, hard: 1 }],
  ['speaking_interview', 4, null],
  ['fill_in_blanks', 2, null],
]

function checkDrawSufficiency(rows, log) {
  for (const [type, n, ramp] of BLUEPRINT) {
    const pool = rows.filter(r => r.item_type === type)
    const ok = pool.length >= n
    log.push(`  ${ok ? 'ok  ' : 'SHORT'} ${type}: pool ${pool.length}, draw needs ${n}`)
    if (!ramp) continue
    for (const [d, want] of Object.entries(ramp)) {
      const have = pool.filter(r => r.item?.difficulty === d).length
      log.push(`        ${have >= want ? 'ok  ' : 'SHORT'} ${d}: ${have} available, ramp wants ${want}`)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Lexicon (Complete the Words only)
// ─────────────────────────────────────────────────────────────────────
function loadLexicon() {
  const files = ['/usr/share/dict/web2', '/usr/share/dict/web2a', '/usr/share/dict/words']
    .filter(existsSync)
  if (!files.length) return null
  const base = new Set()
  for (const f of files) {
    for (const w of readFileSync(f, 'utf8').split('\n')) {
      const t = w.trim().toLowerCase()
      if (t) base.add(t)
    }
  }
  return makeKnown(base)
}

/** web2 is a 1913 headword list: no plurals, no -ing, no -ed. Expanded by
 *  rule so "instruments" and "changing" do not read as defects. */
function makeKnown(base) {
  const known = function known(w) {
    if (base.has(w)) return true
    const t = []
    if (w.endsWith('s')) t.push(w.slice(0, -1))
    if (w.endsWith('es')) t.push(w.slice(0, -2))
    if (w.endsWith('ies')) t.push(w.slice(0, -3) + 'y')
    if (w.endsWith('ed')) t.push(w.slice(0, -2), w.slice(0, -1))
    if (w.endsWith('ing')) t.push(w.slice(0, -3), w.slice(0, -3) + 'e')
    if (w.endsWith('ings')) t.push(w.slice(0, -4), w.slice(0, -4) + 'e')
    if (w.endsWith('ly')) t.push(w.slice(0, -2))
    if (w.endsWith('er')) t.push(w.slice(0, -2), w.slice(0, -1))
    if (w.endsWith('ers')) t.push(w.slice(0, -3), w.slice(0, -2))
    if (w.endsWith('ness')) t.push(w.slice(0, -4))
    if (w.endsWith('ally')) t.push(w.slice(0, -4) + 'al', w.slice(0, -2))
    if (/(.)\1(ed|ing|er|ers)$/.test(w)) t.push(w.replace(/(.)\1(ed|ing|er|ers)$/, '$1'))
    return t.some(x => x.length > 2 && base.has(x))
  }
  known.base = base
  return known
}

// ─────────────────────────────────────────────────────────────────────
// Dispatch
// ─────────────────────────────────────────────────────────────────────
const PER_ITEM = {
  arrange_words: checkArrangeWords,
  fill_in_blanks: checkFillInBlanks,
  speaking_repeat: checkSpeakingRepeat,
  writing_discussion: checkDiscussion,
  writing_email: checkEmail,
}

function scanAll(rows, known) {
  const out = []
  for (const r of rows) {
    const fn = PER_ITEM[r.item_type]
    if (fn) fn(r, out, known)
  }
  checkInterviewSets(rows.filter(r => r.item_type === 'speaking_interview'), out)
  checkCrossItem(rows, out)
  return out
}

// ─────────────────────────────────────────────────────────────────────
// Self-test
// ─────────────────────────────────────────────────────────────────────
if (process.argv.includes('--selftest')) {
  // A closed stub lexicon, so the self-test does not depend on the host's
  // dictionary — and so a missing /usr/share/dict cannot turn a red into
  // a green.
  const stubKnown = makeKnown(new Set([
    'future', 'action', 'moments', 'processes', 'process', 'geology', 'igneous',
    'instrument', 'planing', 'plane',
  ]))
  const CTW = (passage, blanks) => ({
    type: 'fill_in_blanks', passage, blanks,
    ...{},
  })
  const tenBlanks = extra => Array.from({ length: 10 }, (_, i) => ({ id: i + 1, answer: extra?.[i] ?? 'ous' }))
  const tenPlaceholders = pre => Array.from({ length: 10 }, (_, i) => `${pre?.[i] ?? 'igne'}[${i + 1}]`).join(' word ')

  const cases = [
    // ── Build a Sentence
    ['BAS key carries a period the chip does not', 'bas/key-not-assemblable', [{
      item_type: 'arrange_words',
      item: { choices: ['students', 'were studying', 'in', 'the library'], correct_answer: 'Students | were studying | in | the library.' },
    }]],
    ['BAS key segment missing from the chips', 'bas/key-not-assemblable', [{
      item_type: 'arrange_words',
      item: { choices: ['the cat', 'sat'], correct_answer: 'The cat | sat | quietly' },
    }]],
    ['BAS repeated chip (UI pool drops both)', 'bas/duplicate-chip', [{
      item_type: 'arrange_words',
      item: { choices: ['the', 'dog', 'the', 'cat'], correct_answer: 'The | dog | the | cat' },
    }]],
    ['BAS sound item — case and order differ only', null, [{
      item_type: 'arrange_words',
      item: { choices: ['were studying', 'in the library', 'students'], correct_answer: 'Students | were studying | in the library' },
    }]],

    // ── Complete the Words
    ['CTW blank with no placeholder in the passage', 'ctw/placeholder-mismatch', [{
      item_type: 'fill_in_blanks',
      item: CTW(tenPlaceholders().replace('[10]', ''), tenBlanks()),
    }]],
    ['CTW nine blanks, not ten', 'ctw/blank-count', [{
      item_type: 'fill_in_blanks',
      item: CTW(Array.from({ length: 9 }, (_, i) => `igne[${i + 1}]`).join(' w '), tenBlanks().slice(0, 9)),
    }]],
    ['CTW key duplicates the prefix (futu + ure)', 'ctw/broken-word', [{
      item_type: 'fill_in_blanks',
      item: CTW('futu[1] ' + Array.from({ length: 9 }, (_, i) => `igne[${i + 2}]`).join(' w '),
        [{ id: 1, answer: 'ure' }, ...Array.from({ length: 9 }, (_, i) => ({ id: i + 2, answer: 'ous' }))]),
    }]],
    ['CTW key duplicates the suffix (mome + nts + s)', 'ctw/broken-word', [{
      item_type: 'fill_in_blanks',
      item: CTW('mome[1]s ' + Array.from({ length: 9 }, (_, i) => `igne[${i + 2}]`).join(' w '),
        [{ id: 1, answer: 'nts' }, ...Array.from({ length: 9 }, (_, i) => ({ id: i + 2, answer: 'ous' }))]),
    }]],
    // The precision case. "proces" + "ses" = "processes" has a doubled
    // letter at the join and is CORRECT; and "geolog"+"ical" is simply
    // absent from the stub lexicon with no repair available. Neither may
    // fire, or the detector would flag half the cohort.
    // Regression fixture. The first live run flagged both of these
    // "planning" blanks and proposed "planing" — a real but different
    // word. Consonant doubling before -ing is grammar, not a defect.
    ['CTW consonant doubled before -ing (plan + ning)', null, [{
      item_type: 'fill_in_blanks',
      item: CTW('plan[1] ' + Array.from({ length: 9 }, (_, i) => `igne[${i + 2}]`).join(' w '),
        [{ id: 1, answer: 'ning' }, ...Array.from({ length: 9 }, (_, i) => ({ id: i + 2, answer: 'ous' }))]),
    }]],
    // …but the same shape before -ion is NOT grammar, and must still fire.
    ['CTW doubled consonant before -ion (act + tion)', 'ctw/broken-word', [{
      item_type: 'fill_in_blanks',
      item: CTW('act[1] ' + Array.from({ length: 9 }, (_, i) => `igne[${i + 2}]`).join(' w '),
        [{ id: 1, answer: 'tion' }, ...Array.from({ length: 9 }, (_, i) => ({ id: i + 2, answer: 'ous' }))]),
    }]],
    ['CTW legitimate doubled join (proces + ses)', null, [{
      item_type: 'fill_in_blanks',
      item: CTW('proces[1] ' + Array.from({ length: 9 }, (_, i) => `igne[${i + 2}]`).join(' w '),
        [{ id: 1, answer: 'ses' }, ...Array.from({ length: 9 }, (_, i) => ({ id: i + 2, answer: 'ous' }))]),
    }]],
    // The other half of the precision story: "instruments" is absent from a
    // 1913 headword list and reaches the detector as unknown. It must stay
    // quiet because no join repair exists — the morphology alone is not
    // what saves it.
    ['CTW inflection absent from the headword list (instru + ments)', null, [{
      item_type: 'fill_in_blanks',
      item: CTW('instru[1] ' + Array.from({ length: 9 }, (_, i) => `igne[${i + 2}]`).join(' w '),
        [{ id: 1, answer: 'ments' }, ...Array.from({ length: 9 }, (_, i) => ({ id: i + 2, answer: 'ous' }))]),
    }]],
    ['CTW word simply missing from the lexicon', null, [{
      item_type: 'fill_in_blanks',
      item: CTW('exoplan[1] ' + Array.from({ length: 9 }, (_, i) => `igne[${i + 2}]`).join(' w '),
        [{ id: 1, answer: 'ets' }, ...Array.from({ length: 9 }, (_, i) => ({ id: i + 2, answer: 'ous' }))]),
    }]],

    // ── Listen and Repeat
    ['LR audio and key are different sentences', 'lr/script-key-mismatch', [{
      item_type: 'speaking_repeat',
      item: { passage: 'She missed the train this morning.', correct_answer: 'He missed the bus this evening.' },
    }]],
    ['LR prefix and quotes only', null, [{
      item_type: 'speaking_repeat',
      item: { passage: 'Audio script: "She missed the train this morning."', correct_answer: 'She missed the train this morning.' },
    }]],

    // ── Academic Discussion
    ['AD passage with no speaker labels', 'ad/speakers-unparsed', [{
      item_type: 'writing_discussion',
      item: { passage: 'Some people think online learning is better than classroom learning because it is flexible. Others disagree and point to the value of face-to-face discussion.' },
    }]],
    ['AD professor plus one classmate only', 'ad/too-few-students', [{
      item_type: 'writing_discussion',
      item: { passage: 'Professor Hale: Should cities ban private cars downtown? Explain your view.\n\nMarco: I think a ban would help, because the air quality data from Oslo is very clear on this point.' },
    }]],
    ['AD professor plus two classmates', null, [{
      item_type: 'writing_discussion',
      item: { passage: 'Professor Hale: Should cities ban private cars downtown? Explain your view.\n\nMarco: I think a ban would help, because the air quality data from Oslo is very clear.\n\nPriya: I disagree with Marco, since delivery workers depend on road access every day.' },
    }]],

    // ── Email
    ['EM scenario with no task list', 'em/no-task-list', [{
      item_type: 'writing_email',
      item: { passage: 'From: Professor Lee\nTo: You\nSubject: Seminar\n\nWould you be willing to present your findings next Friday?' },
    }]],
    ['EM scenario with the ETS three bullets', null, [{
      item_type: 'writing_email',
      item: { passage: 'Your professor has invited you to a guest lecture that clashes with your shift.\n\nIn your email to the professor, be sure to:\n• thank her for the invitation\n• explain the conflict\n• ask whether a recording will exist' },
    }]],

    // ── Interview
    ['IV set of three', 'iv/set-size', [
      { item_type: 'speaking_interview', item: { passageGroupId: 'g', passage: 'p', prompt: 'q1' } },
      { item_type: 'speaking_interview', item: { passageGroupId: 'g', passage: 'p', prompt: 'q2' } },
      { item_type: 'speaking_interview', item: { passageGroupId: 'g', passage: 'p', prompt: 'q3' } },
    ]],
    ['IV set of four with one premise', null, [
      { item_type: 'speaking_interview', item: { passageGroupId: 'g', passage: 'p', prompt: 'q1' } },
      { item_type: 'speaking_interview', item: { passageGroupId: 'g', passage: 'p', prompt: 'q2' } },
      { item_type: 'speaking_interview', item: { passageGroupId: 'g', passage: 'p', prompt: 'q3' } },
      { item_type: 'speaking_interview', item: { passageGroupId: 'g', passage: 'p', prompt: 'q4' } },
    ]],

    // ── Cross-item
    ['X two identical Build a Sentence rows', 'x/duplicate-item', [
      { item_type: 'arrange_words', item: { choices: ['a', 'b'], correct_answer: 'a | b' } },
      { item_type: 'arrange_words', item: { choices: ['b', 'a'], correct_answer: 'A | b' } },
    ]],
    ['X shared three-chip opening', 'x/template-collision', [
      { item_type: 'arrange_words', item: { choices: ['the book', 'that was recommended', 'by my professor', 'was long'], correct_answer: 'The book | that was recommended | by my professor | was long' } },
      { item_type: 'arrange_words', item: { choices: ['the book', 'that was recommended', 'by my professor', 'was short'], correct_answer: 'The book | that was recommended | by my professor | was short' } },
    ]],
    ['X two unrelated Build a Sentence rows', null, [
      { item_type: 'arrange_words', item: { choices: ['the dog', 'barked'], correct_answer: 'The dog | barked' } },
      { item_type: 'arrange_words', item: { choices: ['a train', 'arrived'], correct_answer: 'A train | arrived' } },
    ]],
  ]

  let bad = 0
  for (const [name, expected, rowsIn] of cases) {
    const rows = rowsIn.map((r, i) => ({ id: `fixture-${i}`, domain: 'test', ...r }))
    const kinds = scanAll(rows, stubKnown).map(f => f.kind)
    const ok = expected === null ? kinds.length === 0 : kinds.includes(expected)
    if (!ok) bad++
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}  ->  [${kinds.join(', ') || 'none'}]`)
  }
  console.log(bad
    ? `\n${bad} self-test(s) FAILED — do not trust a clean sweep from this build.`
    : `\nself-test passed (${cases.length} fixtures): every detector fires on a real `
      + 'defect and stays quiet on its sound twin.')
  process.exit(bad ? 1 : 0)
}

// ─────────────────────────────────────────────────────────────────────
// Live sweep
// ─────────────────────────────────────────────────────────────────────
const VERBOSE = process.argv.includes('--verbose')
const TYPES = ['arrange_words', 'fill_in_blanks', 'speaking_repeat',
  'speaking_interview', 'writing_email', 'writing_discussion']

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

/* .range(), NOT .limit(): PostgREST caps a response at 1000 rows and
 * .limit() above that silently returns 1000. A verifier in this repo
 * already published "0 problems" from a bank truncated that way. */
const rows = []
for (const t of TYPES) {
  for (let from = 0; ; from += 500) {
    const { data, error } = await db.from('study_item_bank')
      .select('id, item_type, domain, archived, item')
      .eq('item_type', t).order('id', { ascending: true }).range(from, from + 499)
    if (error) { console.error('read failed:', error.message); process.exit(2) }
    if (!data?.length) break
    rows.push(...data)
    if (data.length < 500) break
  }
}
const live = rows.filter(r => !r.archived)

const known = loadLexicon()
if (!known) console.log('NOTE: no system dictionary found — ctw/broken-word is SKIPPED this run.\n')

const findings = scanAll(live, known)

// ── report ───────────────────────────────────────────────────────────
const counts = {}
for (const r of live) counts[r.domain ?? '?'] = (counts[r.domain ?? '?'] ?? 0) + 1
console.log(`${rows.length} rows read, ${live.length} live across ${Object.keys(counts).length} cohorts`)
for (const [d, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${n.toString().padStart(4)}  ${d}`)

const order = { [FATAL]: 0, [HIGH]: 1, [WARN]: 2 }
findings.sort((a, b) => order[a.sev] - order[b.sev] || a.kind.localeCompare(b.kind))
const byKind = {}
for (const f of findings) byKind[`${f.sev} ${f.kind}`] = (byKind[`${f.sev} ${f.kind}`] ?? 0) + 1

console.log('\nFINDINGS')
if (!findings.length) console.log('  none — run --selftest before believing this')
for (const [k, n] of Object.entries(byKind)) console.log(`  ${k}: ${n}`)

const shown = VERBOSE ? findings : findings.filter(f => f.sev !== WARN).concat(findings.filter(f => f.sev === WARN).slice(0, 12))
for (const f of shown) {
  console.log(`\n  [${f.sev}] ${f.kind}  ${f.id}  (${f.domain})`)
  console.log(`    ${f.detail}`)
}
if (!VERBOSE && shown.length < findings.length) console.log(`\n  … and ${findings.length - shown.length} more WARN rows (--verbose)`)

const draw = []
checkDrawSufficiency(live, draw)
console.log('\nDRAW SUFFICIENCY (blueprint in src/lib/study/assemble.ts)')
draw.forEach(l => console.log(l))

console.log(`
WHAT THIS CANNOT SEE
  Build a Sentence   whether a SECOND ordering is also grammatical. That is
                     the defining defect of the task and it is not decidable
                     without a parser or a human; only "the key is
                     assemblable at all" is checked here.
  Complete the Words whether a blank has a second defensible completion.
                     Measured and rejected as a gate: 387 of 930 blanks have
                     a same-length same-prefix alternative in modern English
                     (42%), so it is a base rate, not a defect list. Context
                     resolves nearly all of them and no rule can tell which.
  Listen and Repeat  register, clause depth and top-2000 vocabulary —
                     owned by scripts/verify-listen-repeat.ts, not repeated
                     here. Pronunciation difficulty is unmeasured anywhere.
  Email / Discussion / Interview
                     whether the prompt can be answered well, whether it
                     invites one obvious response from every candidate, and
                     whether the rubric can separate bands on it. All three
                     are semantic. The countable proxies for them —
                     duplicate and near-duplicate scenarios — are checked;
                     nothing else about them is.
  All six            item difficulty labels are taken on trust, and no
                     student response data exists for any of these cohorts
                     (study_attempts is internal testing).
`)

process.exit(findings.some(f => f.sev === FATAL) ? 1 : 0)
