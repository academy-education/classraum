/*
 * A3, step 1 — remove the REGISTER slot from cohort cr-v1.
 *
 * check-response-register.mjs established the scope: 24 of 56 cr-v1
 * items carry a distractor whose stated defect is its register, and
 * cr-v2 (14) and harvest-v1 (2) carry none. It is an artifact of one
 * authoring brief, not a property of the bank.
 *
 * Each replacement is written to be:
 *
 *   NATURAL in register   — the tell being removed
 *   COOPERATIVE in tone   — because the OTHER tell in this cohort is
 *                           that the key is the only friendly reply
 *                           (task #303). A replacement that is merely
 *                           rude would swap one give-away for another.
 *   WRONG in content      — it misses a qualifier, takes a branch the
 *                           cue ruled out, or answers a different
 *                           question.
 *
 * The failure modes are deliberately VARIED across the 24. A batch of
 * replacements all wrong in the same way is exactly how the previous
 * three cross-item tells reached this bank.
 *
 * This script does NOT prove the items are fixed. It removes one
 * measurable defect. Only a fresh blind attack, by solvers that have
 * not seen these items, can say whether the batch still leaks — and
 * editing `item` bumps the generated content_sha, which correctly
 * stales the existing reviews of these 24.
 *
 * Usage:  node scripts/study-bank/apply-cr-register-fix.mjs [--apply]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { isMarked } from './check-response-register.mjs'

/*
 * id -> the option to strike, what replaces it, and the clause in the
 * explanation that describes it.
 *
 * `clause` is matched with flexible whitespace and quote characters and
 * must appear EXACTLY ONCE, so a near-miss aborts rather than silently
 * editing the wrong sentence. The new clauses quote the option instead
 * of numbering it: the stored choice order does not match the ordinals
 * the original explanations use.
 */
const FIX = [
  {
    id: 'f0019f6f',
    old: 'I appreciate you drawing my attention to this discrepancy in the payroll.',
    new: 'Ah, got it — so I should ask to be moved onto the work-study payroll instead.',
    clause: 'And "I appreciate you drawing my attention to this discrepancy in the payroll" thanks the speaker in a formal register while leaving the actual confusion — which rate applies — unresolved.',
    newClause: 'And "Ah, got it — so I should ask to be moved onto the work-study payroll instead" treats a clarification of which rate applies as an offer to move between payrolls, which was never on the table.',
  },
  {
    id: '3dc068f7',
    old: 'Separate lists? That seems like pointless bureaucracy for a single seminar course.',
    new: "Nice — so that's the minor sorted, at least.",
    clause: 'and one attacks the policy in a register that fits a complaint, not an advising meeting.',
    newClause: 'and one banks the half that was allowed and treats the matter as closed, leaving the language requirement unaccounted for.',
  },
  {
    id: 'bb5806d0',
    old: 'Please be advised that declining this offer may affect the terms available to you in future.',
    new: 'Totally understand — shall I send the details over so you have them for next year?',
    clause: 'and the fourth is a stiff, faintly threatening script.',
    newClause: 'and the offer to send details for next year sounds accommodating while quietly continuing the sale that was just declined.',
  },
  {
    id: 'a6c04056',
    old: 'I would be exceedingly obliged if you might expound upon that.',
    new: "That's a relief — I'll grab the paper form off the website tonight, then.",
    clause: 'or accept in a register far too ornate for a front office.',
    newClause: 'or assume the paper route is self-serve, when the point of mentioning it was that it takes someone at the desk to start it.',
  },
  {
    id: '8f6e3049',
    old: 'Ugh, I knew that whole data slide was garbage.',
    new: "Thanks — I'll pass that on to the person who built the deck with me.",
    clause: 'or self-deprecate in a register that is off for a professor.',
    newClause: 'or accept the note and hand the fix to someone else, when the pacing being criticised was the speaker\u2019s own.',
  },
  {
    id: '0de0817d',
    old: 'Please confirm your attendance no later than close of business on Thursday.',
    new: "Of course — just text me Thursday and I'll see if there's still room.",
    clause: 'and the fourth applies office register to a dinner invitation.',
    newClause: 'and the reply promising to check for room on Thursday grants the delay but withdraws the seat, turning a held place into a gamble.',
  },
  {
    id: '0b280141',
    old: 'We regret any inconvenience — and thank you for bringing this matter to our attention.',
    new: "So sorry about that — I'll make you the medium right now.",
    clause: 'and the fourth is corporate written English.',
    newClause: 'and remaking the drink without mentioning the charge fixes only half of what was raised.',
  },
  {
    id: '8bcce6b3',
    old: 'Duly noted. I shall observe the prescribed interval between the two without deviation.',
    new: "Understood — so as long as it's the same day, the order doesn't matter.",
    clause: 'and the fourth is written formal register no one uses at a pharmacy counter.',
    newClause: 'and "Understood — so as long as it\u2019s the same day, the order doesn\u2019t matter" keeps the permission while softening the two-hour spacing into a vaguer rule.',
  },
  {
    id: 'cd4d70a7',
    old: 'Your apology is accepted. Please advise on your revised arrival time in due course.',
    new: "Don't stress about it — take your time and just come when you get here.",
    clause: 'and the fourth answers a friend\u2019s apology in the register of a formal email.',
    newClause: 'and "Don\u2019t stress about it — take your time and just come when you get here" is warm but leaves the meeting uncovered, which is the thing actually being asked for.',
  },
  {
    id: 'be340c00',
    old: 'I would be most grateful if you would confirm your availability in writing at your earliest convenience.',
    new: "You're a lifesaver — whichever day works best for you is fine by me.",
    clause: 'and the fourth is far too formal for a coworker swapping shifts.',
    newClause: 'and "whichever day works best for you is fine by me" hands back the choice the offer had already narrowed, leaving the Friday on the table.',
  },
  {
    id: '84e0c2a3',
    old: 'I would be most grateful for the loan of your instrument.',
    new: "That'd be great — is it the same model as mine, do you know?",
    clause: '"I would be most grateful for the loan of your instrument" accepts in a register no classmate would use about a calculator.',
    newClause: '"That\u2019d be great — is it the same model as mine, do you know?" accepts in principle but drifts to an irrelevant detail without ever settling how the calculator changes hands.',
  },
  {
    id: 'a4ff61a6',
    old: 'Kindly furnish me with a written statement of your returns policy for my records.',
    new: 'Perfect — and can I do the same on the jacket I bought last month?',
    clause: 'and the fourth is legalistic register for a shop counter.',
    newClause: 'and asking to do the same on a jacket bought last month takes the offer and opens an unrelated return instead of closing this one.',
  },
  {
    id: 'a1a41923',
    old: 'Your recommendation has been noted and will be implemented accordingly.',
    new: "Good thinking — I'll try them when I get back if they turn out to be closed.",
    clause: 'and the fourth is bureaucratic register between friends.',
    newClause: 'and the reply promising to ring them after the drive agrees warmly while inverting the advice, which was to call before setting off.',
  },
  {
    id: '2b930ea0',
    old: "Whatever's fastest, honestly. I really don't care which.",
    new: 'Perfect — so the sealed copy comes through by email as well, then?',
    clause: 'and use a dismissive register at an official counter.',
    newClause: 'and ask whether the sealed copy also arrives by email, collapsing the very distinction the clerk had just drawn.',
  },
  {
    id: '142fabb7',
    old: 'It would be quite improper of me — to impose upon you in that way.',
    new: "That's so kind — I'll let you know Saturday night once I've booked the taxi.",
    clause: 'and the fourth is stiff enough to sound like a refusal of a friend.',
    newClause: 'and accepting while still booking a taxi keeps the arrangement that makes the lift pointless.',
  },
  {
    id: '2f404ae1',
    old: 'I regret to inform you that I am unable to accommodate your request at this time.',
    new: 'Oh sorry — two friends are joining me at eleven, so we\u2019ll be four by then.',
    clause: 'and the formal refusal is both the wrong register and the wrong response to a rule.',
    newClause: 'and promising that friends will arrive later negotiates with the rule instead of freeing the room now.',
  },
  {
    id: '33566296',
    old: 'I do apologize for the delay; please advise if further documentation is required.',
    new: 'Oh no, did they not go through? I sent them to the group chat on Monday.',
    clause: '"I do apologize for the delay; please advise if further documentation is required" is office-memo register between classmates on a group project.',
    newClause: '"Oh no, did they not go through? I sent them to the group chat on Monday" is concerned and cooperative but disputes the chase-up rather than resolving it, and the slides still do not arrive.',
  },
  {
    id: '60feb484',
    old: 'Please submit a maintenance request through the residence portal.',
    new: "Oh you're right — I'll remind whoever's turn it is to take it out.",
    clause: 'And "Please submit a maintenance request through the residence portal" redirects a roommate to a facilities process in an inappropriately official register.',
    newClause: 'And "Oh you\u2019re right — I\u2019ll remind whoever\u2019s turn it is to take it out" agrees readily but passes the chore along instead of owning it.',
  },
  {
    id: '2ef36ac2',
    old: 'It is not customary to discuss graded coursework with other students.',
    new: "Four's fine so far — it's five that's going to finish me off.",
    clause: 'And "It is not customary to discuss graded coursework with other students" answers a warm peer offer by quoting a rule, misreading the register entirely.',
    newClause: 'And "Four\u2019s fine so far — it\u2019s five that\u2019s going to finish me off" stays friendly and on topic but declines the opening, so the offer of help goes unused.',
  },
  {
    id: '6fec1efe',
    old: 'Your reservations have been duly noted.',
    new: "You've done both at once yourself, though, haven't you?",
    clause: 'And "Your reservations have been duly noted" does register the doubt, but in a clipped bureaucratic register that shuts the conversation down instead of opening it.',
    newClause: 'And "You\u2019ve done both at once yourself, though, haven\u2019t you?" turns the hesitation into a question about the speaker rather than surfacing what they actually think of the plan.',
  },
  {
    id: '0a421dce',
    old: 'Kindly reconcile the two records in your system at your earliest convenience.',
    new: "That'll be the romanisation — could you just update it to whichever one you prefer?",
    clause: 'and one pushes the work back on staff in a stiff register.',
    newClause: 'and one asks staff to pick a spelling, which tidies the paperwork without ever establishing that the two records are the same person.',
  },
  {
    id: '4730ad1c',
    old: 'A thin letter is still better than missing the deadline, so just go ahead and submit it.',
    new: "That's honest of you, thank you — could I send you my transcript to give you more to work with?",
    clause: 'and one dismisses the professor\u2019s judgement in a blunt register.',
    newClause: 'and one answers a structural problem — a single large lecture — with more paperwork, taking the offer rather than the steer.',
  },
  {
    id: '1953423a',
    old: "My bad, I guess — honestly it's whatever, I'll just wing the thing and see how it turns out.",
    new: "That's alright — the questions barely change year to year, so I'll stick with this one.",
    clause: 'the last is the wrong register with a TA.',
    newClause: 'and the last waves the correction off on the assumption that the sheets barely change, which is the one thing just called into question.',
  },
  {
    id: '528b1436',
    old: 'I would be delighted to enroll at your earliest convenience.',
    new: "Maybe — do you know if the summer one's taught by the same professor?",
    clause: 'And "I would be delighted to enroll at your earliest convenience" accepts in a stiff, transactional register that does not fit advice from a peer.',
    newClause: 'And "Maybe — do you know if the summer one\u2019s taught by the same professor?" engages with the idea but diverts to a detail instead of weighing the suggestion itself.',
  },
]

/* Curly and straight quotes are used interchangeably in this bank. */
const norm = s => String(s).replace(/[\u2018\u2019\u201b]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim()

/** A regex for `clause` that tolerates whitespace and quote-style drift. */
function clauseRe(clause) {
  const esc = norm(clause).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(esc.replace(/ /g, '\\s+').replace(/'/g, "['\u2018\u2019]").replace(/"/g, '["\u201c\u201d]'), 'g')
}

async function main() {
  const apply = process.argv.includes('--apply')
  const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8').split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: rows, error } = await db.from('study_item_bank')
    .select('id,item').eq('domain', 'Choose a Response').eq('cohort', 'cr-v1')
  if (error) throw new Error(error.message)

  /* ---- guards, all of them, before a single write ---- */
  const planned = []
  const fail = m => { console.error('ABORT: ' + m); process.exitCode = 1 }

  const seenNew = new Map()
  for (const f of FIX) {
    const row = rows.find(r => r.id.startsWith(f.id))
    if (!row) { fail(`${f.id} not found in cr-v1`); continue }
    const item = JSON.parse(JSON.stringify(row.item))
    const choices = item.choices ?? []

    // G1 the option to strike must still be there, exactly once
    const idx = choices.findIndex(c => norm(c) === norm(f.old))
    if (idx < 0) { fail(`${f.id}: option to strike not found — item already changed?`); continue }
    if (choices.filter(c => norm(c) === norm(f.old)).length !== 1) { fail(`${f.id}: option to strike is not unique`); continue }

    // G2 never strike the key
    if (norm(choices[idx]) === norm(item.correct_answer)) { fail(`${f.id}: refusing to strike the KEY`); continue }

    // G3 the replacement must not carry the very tell being removed
    if (isMarked(f.new)) { fail(`${f.id}: replacement still trips the register detector`); continue }

    // G4 the replacement must not collide with another option or the key
    if (choices.some((c, i) => i !== idx && norm(c) === norm(f.new))) { fail(`${f.id}: replacement duplicates another option`); continue }
    if (norm(f.new) === norm(item.correct_answer)) { fail(`${f.id}: replacement equals the key`); continue }

    // G5 ...or with a replacement written for a DIFFERENT item. 24 new
    //    options authored in one sitting is exactly when that happens.
    if (seenNew.has(norm(f.new))) { fail(`${f.id}: replacement is a duplicate of ${seenNew.get(norm(f.new))}`); continue }
    seenNew.set(norm(f.new), f.id)

    // G6 the explanation clause must match exactly once
    const expl = String(item.explanation ?? '')
    const hits = norm(expl).match(clauseRe(f.clause))
    if (!hits) { fail(`${f.id}: explanation clause not found`); continue }
    if (hits.length !== 1) { fail(`${f.id}: explanation clause matched ${hits.length}×`); continue }

    choices[idx] = f.new
    item.choices = choices
    item.explanation = norm(expl).replace(clauseRe(f.clause), f.newClause)

    // G7 the key must survive the edit and still be one of the options
    if (!item.choices.some(c => norm(c) === norm(item.correct_answer))) { fail(`${f.id}: key no longer among the options`); continue }

    // G8 the repaired explanation must no longer describe a register defect
    const REG = /\b(register|too formal|far too formal|stiff|legalistic|officious|formal email|bureaucratic|starchy|stilted|corporate)\b/i
    if (REG.test(item.explanation)) { fail(`${f.id}: repaired explanation still names register as the defect`); continue }

    planned.push({ id: row.id, short: f.id, item, struck: f.old, added: f.new })
  }

  if (process.exitCode === 1) { console.error(`\n${planned.length}/${FIX.length} passed — nothing written.`); return }
  console.log(`all ${planned.length} guards passed\n`)

  for (const p of planned) {
    console.log(`${p.short}\n  -  ${p.struck}\n  +  ${p.added}`)
  }

  if (!apply) { console.log(`\nDRY RUN — re-run with --apply to write ${planned.length} items.`); return }

  let n = 0
  for (const p of planned) {
    const { error: e } = await db.from('study_item_bank').update({ item: p.item }).eq('id', p.id)
    if (e) { console.error(`write failed ${p.short}: ${e.message}`); process.exitCode = 1; continue }
    n++
  }
  console.log(`\nwrote ${n}/${planned.length} items.`)
  console.log('content_sha is generated, so the reviews of these items are now STALE — as intended.')
}

main().catch(e => { console.error(e); process.exit(1) })
