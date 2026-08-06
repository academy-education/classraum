#!/usr/bin/env node
/**
 * A11 — the Email items graded on a task they never state.
 *
 * `responseRubrics.toefl_writing_email` scores `task_fulfillment`
 * ("Task coverage") and the grader prompt tells the model the prompt
 * "gives a scenario ... plus the points to address". On these items
 * there were no points to address, so the grader was scoring coverage
 * of nothing.
 *
 * Reading them changed the job in three ways the register did not say:
 *
 *  1. TWO of the ten (f19757f8, fabf733a) DO state their task — as
 *     "Write a reply that: (1) ... (2) ..." appended INSIDE the
 *     professor's email, after the sign-off. The student reads test
 *     instructions in the voice of a character, and because the colon
 *     is not followed by a newline the renderer's intro regex misses
 *     it and the item falls to the legacy branch anyway. Those are
 *     moved out, not written from scratch.
 *
 *  2. FOUR of the ten are two near-duplicate PAIRS — the same scenario
 *     with the professor's name changed. Both pairs are inside these
 *     ten; the other 82 items have no pair above 0.35. Writing four
 *     task lists for two scenarios would polish a duplicate, so one of
 *     each pair is archived instead. See check-email-cohort.mjs.
 *
 *  3. FIVE use a "From: / To: / Subject:" header that appears in NONE
 *     of the 82 sound items, and WritingPanels.tsx says in as many
 *     words that the modern format has no such header. Those are
 *     converted to the situation form the rest of the cohort uses.
 *
 * usage: node apply-a11-fix.mjs [--dry]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const DRY = process.argv.includes('--dry')

/* ── renderer parity ───────────────────────────────────────────────────
 * Copied VERBATIM from src/app/mobile/study/session/[id]/test/
 * WritingPanels.tsx. Copied rather than imported because that file is
 * TSX inside a Next route — but that means it can drift, so the script
 * asserts against real rendered output, not against its own opinion of
 * what good text looks like. If this drifts from the component the
 * assertion below stops meaning anything; that risk is the price of
 * not importing, and it is why the check is a copy and not a rewrite.
 */
const introBroad = /(?:^|\n)\s*((?:in\s+your\s+(?:email|reply|response|message)|your\s+email\s+should|be\s+sure\s+to|include\s+the\s+following|address\s+the\s+following|make\s+sure\s+to|remember\s+to|the\s+email\s+should|write\s+(?:an?\s+email|a\s+reply|your\s+email)|please\s+(?:include|address)|your\s+email\s+must)\b[^\n:]{0,120}?:)\s*(?:\n|$)/i
const bulletLead = /^\s*(?:[•●◦▪□■\-*·]|\(?\d+\)|\d+\.)\s+/
const legacyHeader = /^\s*(From|To|Subject|CC|BCC|Date)\s*:\s*/im

function renderShape(passage) {
  const m = passage.match(introBroad)
  if (!m || m.index == null) return { branch: 'legacy', bullets: 0 }
  const start = m.index + m[0].indexOf(m[1])
  const situation = passage.slice(0, start).trim()
  const block = passage.slice(start + m[1].length).trim()
  const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean)
  const markered = lines.filter(l => bulletLead.test(l))
  const bullets = markered.length >= 2 ? markered.length : lines.length >= 2 ? lines.length : 0
  return { branch: bullets >= 2 ? 'modern' : 'legacy', bullets, situation, intro: m[1].trim() }
}

/* ── the repairs ──────────────────────────────────────────────────────
 * `append` keeps the item's own situation text and adds only the task
 * block. `replace` rewrites the stimulus, and is used ONLY for the five
 * From:/To:/Subject: items, where the header format is itself the
 * defect. Every bullet has to be answerable from the situation, because
 * task_fulfillment scores whether the response covered it.
 *
 * Professors are referred to as they/them throughout the text written
 * here — none of these items states a professor's pronouns.
 */
const FIX = [
  {
    id: '09e8e9e8', mode: 'append', to: 'Professor Lin',
    bullets: [
      'Explain that you are no longer able to be there on the lecture date',
      'Acknowledge that you had already agreed to help, and say why the conflict is unavoidable',
      'Propose a specific alternative — another date, or another way you could contribute',
    ],
  },
  {
    id: '7100d22a', mode: 'append', to: 'Priya',
    bullets: [
      'Acknowledge the family emergency she is dealing with',
      'Explain why the group needs her section before tomorrow’s deadline',
      'Offer a concrete way forward — a reduced scope, a later handover time, or help from the group',
    ],
  },
  {
    id: 'a0f721e5', mode: 'append', to: 'Professor Lee',
    bullets: [
      'Thank them for considering you for the additional analysis',
      'Explain your current workload and why taking it on could affect the quality of your work',
      'Propose a specific compromise — a narrower scope, a later deadline, or shared responsibility',
    ],
  },
  {
    id: 'd6ef877e', mode: 'append', to: 'Maya',
    bullets: [
      'Tell her clearly that your section will not be ready by the agreed deadline',
      'Explain the emergency without giving more detail than you wish to share',
      'Propose a concrete way forward — a partial handover, a new date, or help from another member',
    ],
  },
  {
    id: '802ff650', mode: 'replace', to: 'Professor Lee',
    situation:
      'Professor Lee, who teaches your International Relations class, has emailed you. An unexpected '
      + 'scheduling conflict means they cannot deliver tomorrow’s lecture, and they are asking whether you '
      + 'would step in as a guest lecturer, citing your recent presentation on global trade. They acknowledge '
      + 'that the notice is extremely short and say they will understand if you have other commitments.\n\n'
      + 'You have your own deadlines that week and could not prepare a full lecture by tomorrow.',
    bullets: [
      'Thank them for the confidence the request shows in your work',
      'Explain, without over-apologising, why you cannot prepare a full lecture by tomorrow',
      'Offer a specific alternative — a shorter contribution, a later date, or someone else who could step in',
    ],
  },
  {
    id: 'a5a0948f', mode: 'replace', to: 'Professor Lee',
    situation:
      'Professor Lee has emailed your group. Another group has had an unexpected emergency, and Professor '
      + 'Lee is asking whether your group could move its presentation from next Thursday to this coming Monday. '
      + 'They acknowledge that this is sudden and that your group may need the extra preparation time, but they '
      + 'would like an answer as soon as possible.\n\n'
      + 'Your group has not finished its slides, and one member is away until Sunday evening.',
    bullets: [
      'Answer directly whether your group can move to Monday',
      'Explain the specific constraint your group is under',
      'Suggest a workable alternative, or the conditions under which Monday would be possible',
    ],
  },
  {
    id: 'f19757f8', mode: 'replace', to: 'Professor Lee',
    situation:
      'Professor Martin Lee has emailed you to ask whether you can help organize next month’s Departmental '
      + 'Research Symposium, praising your organizational work at last semester’s conference. They note that '
      + 'this is a busy period for you given your thesis, and say that even limited involvement would be '
      + 'appreciated.\n\n'
      + 'You are in the final months of your thesis and could not take on the full role.',
    bullets: [
      'Acknowledge the request and the recognition it reflects',
      'Explain your thesis commitments in a way that does not read as a flat refusal',
      'Propose the specific, limited form of help you could realistically offer',
    ],
  },
  {
    id: 'fabf733a', mode: 'replace', to: 'Professor Lin',
    situation:
      'Professor Lin, of the Biology department, has emailed you to ask whether you would present your '
      + 'group’s research findings at next Friday’s departmental seminar. They call the work particularly '
      + 'impressive and say it would benefit your peers, while acknowledging the short notice and that you may '
      + 'have other commitments.\n\n'
      + 'Your group has not prepared presentation materials, and one member is unavailable that week.',
    bullets: [
      'Answer directly whether you are able to present next Friday',
      'Explain the specific difficulty the short notice creates for your group',
      'Propose an alternative, or ask for the guidance you would need to make it work',
    ],
  },
]

/*
 * The two archives. Kept deterministic and justified rather than
 * lexicographic: in each pair the survivor is the one with the richer
 * stimulus, and both survivors are being repaired above anyway.
 */
const ARCHIVE = [
  { id: '13e0c10d', dupOf: '09e8e9e8', why: 'same scenario (RA, guest lecture, unavoidable family conflict) with the professor renamed Lee/Lin; content-word Jaccard 0.43' },
  { id: '019c50a6', dupOf: 'fabf733a', why: 'same scenario (professor asks you to present group findings at next Friday’s seminar, short notice); content-word Jaccard 0.38, and fabf733a has the fuller stimulus' },
]

const PROMPT = '[Email] Read the email above and write your reply (target 100+ words).'

/* ── self-test ─────────────────────────────────────────────────────── */
if (process.argv.includes('--selftest')) {
  const fail = []
  const ok = (l, c) => { if (!c) fail.push(l) }
  ok('modern shape parses', renderShape('A situation.\n\nIn your email to X, be sure to:\n• one\n• two\n• three').branch === 'modern')
  ok('and finds 3 bullets', renderShape('A situation.\n\nIn your email to X, be sure to:\n• one\n• two\n• three').bullets === 3)
  ok('bare situation is legacy', renderShape('Dear Student, please let me know.').branch === 'legacy')
  // The exact miss that put f19757f8/fabf733a on the legacy branch: an
  // intro whose colon is followed by text rather than a newline.
  ok('inline "Write a reply that: (1)" does NOT reach the modern branch',
    renderShape('Dear Student, ... Write a reply that: (1) x (2) y (3) z').branch === 'legacy')
  ok('legacy header detected', legacyHeader.test('From: Professor Lee To: You'))
  if (fail.length) { console.error('SELFTEST FAILED:'); fail.forEach(f => console.error('  ' + f)); process.exit(1) }
  console.log('selftest passed')
  process.exit(0)
}

/* ── live ──────────────────────────────────────────────────────────── */
const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

const rows = []
for (let f = 0; ; f += 1000) {
  const { data } = await db.from('study_item_bank').select('id, item, verify_meta, archived').order('id').range(f, f + 999)
  if (!data?.length) break
  rows.push(...data)
  if (data.length < 1000) break
}
const find = p => rows.find(r => r.id.startsWith(p))

const problems = []
const plan = []

for (const f of FIX) {
  const row = find(f.id)
  if (!row) { problems.push(`${f.id}: not found`); continue }
  if (row.archived) { problems.push(`${f.id}: archived`); continue }
  if (row.item?.type !== 'writing_email') { problems.push(`${f.id}: not writing_email`); continue }

  const before = String(row.item.passage ?? '')
  // Refuse an item that already renders correctly — this script is not
  // idempotent and must not silently overwrite a good repair.
  if (renderShape(before).branch === 'modern') {
    problems.push(`${f.id}: already renders on the modern branch — already repaired?`)
    continue
  }

  const situation = f.mode === 'replace' ? f.situation : before.trim()
  if (f.mode === 'append' && legacyHeader.test(situation)) {
    problems.push(`${f.id}: append mode, but the situation carries a From:/Subject: header — needs replace`)
    continue
  }
  const passage = `${situation}\n\nIn your email to ${f.to}, be sure to:\n`
    + f.bullets.map(b => `• ${b}`).join('\n')

  // The assertion that matters: it must parse the way the app parses it.
  const shape = renderShape(passage)
  if (shape.branch !== 'modern') { problems.push(`${f.id}: repaired passage still falls to the legacy renderer`); continue }
  if (shape.bullets !== 3) { problems.push(`${f.id}: renderer sees ${shape.bullets} bullets, not 3`); continue }
  if (legacyHeader.test(passage)) { problems.push(`${f.id}: a From:/Subject: header survives the repair`); continue }
  if (!shape.situation || shape.situation.length < 120) { problems.push(`${f.id}: situation is ${shape.situation?.length ?? 0} chars — too thin to answer`); continue }
  // The student must not be told to cover something the situation never
  // raised, since task_fulfillment scores exactly that.
  if (f.bullets.length !== 3) { problems.push(`${f.id}: ${f.bullets.length} bullets authored, house style is 3`); continue }

  plan.push({ row, passage, prompt: PROMPT, note: `A11: ${f.mode} — task line + 3 bullets, addressed to ${f.to}` })
}

for (const a of ARCHIVE) {
  const row = find(a.id)
  if (!row) { problems.push(`${a.id}: not found`); continue }
  if (row.archived) { problems.push(`${a.id}: already archived`); continue }
  if (!find(a.dupOf)) { problems.push(`${a.id}: survivor ${a.dupOf} not found`); continue }
  if (find(a.dupOf).archived) { problems.push(`${a.id}: survivor ${a.dupOf} is already archived — would archive both`); continue }
  /*
   * And the survivor must not be archived by THIS run either. The
   * already-archived check above passes vacuously in that case, because
   * nothing has been written yet — a break test pointed a pair at
   * itself and both halves sailed through.
   */
  if (ARCHIVE.some(o => a.dupOf.startsWith(o.id) || o.id.startsWith(a.dupOf))) {
    problems.push(`${a.id}: survivor ${a.dupOf} is itself scheduled for archiving — would remove both`)
    continue
  }
  plan.push({ row, archive: a, note: `A11: archived as a duplicate of ${a.dupOf}` })
}

if (problems.length) {
  console.error(`ABORTED — ${problems.length} problem(s), nothing written:`)
  problems.forEach(p => console.error('  ' + p))
  process.exit(1)
}

console.log(`validated: ${plan.length} items (${plan.filter(p => p.passage).length} repaired, ${plan.filter(p => p.archive).length} archived)`)
for (const p of plan) console.log(`  ${p.row.id.slice(0, 8)}  ${p.note}`)
if (DRY) {
  const ex = plan.find(p => p.passage)
  console.log('\n--- example repaired passage ---\n' + ex.passage)
  console.log('\nDRY RUN — nothing written')
  process.exit(0)
}

let ok = 0
for (const p of plan) {
  const meta = p.row.verify_meta ?? {}
  const patch = { verify_meta: { ...meta, ...('legacy_item_a11' in meta ? {} : { legacy_item_a11: p.row.item }), a11_fixed_at: new Date().toISOString(), a11_note: p.note } }
  if (p.archive) {
    patch.archived = true
    patch.verify_meta.archived_reason = `duplicate of ${p.archive.dupOf} (A11): ${p.archive.why}`
  } else {
    patch.item = { ...p.row.item, passage: p.passage, prompt: p.prompt }
  }
  const { error } = await db.from('study_item_bank').update(patch).eq('id', p.row.id)
  if (error) { console.error('ERR ' + p.row.id + ': ' + error.message); process.exit(1) }
  ok++
}
console.log(`\nupdated ${ok}`)
