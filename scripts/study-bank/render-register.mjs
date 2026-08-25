#!/usr/bin/env node
/**
 * Regenerate scripts/study-bank/REGISTER.md.
 *
 * READ ONLY against the database. Writes exactly one file.
 *
 * ── Why this exists ──────────────────────────────────────────────────
 * The register was a hand-written markdown file and the admin page
 * described the same work in its own words. Two hand-maintained copies
 * of one list is how a list stops being true — and this project already
 * spent a day with a dashboard reporting "0% done" after the evidence
 * had changed.
 *
 * So there is one source per KIND of fact:
 *
 *   the plan     src/lib/study/bank-register.ts   (decided)
 *   the state    study_item_bank + attacks + reviews  (measured)
 *
 * Both renderings — this markdown and /admin/bank-qc — are generated
 * from those. Editing REGISTER.md by hand is pointless; the next run
 * overwrites it, which is the intended behaviour rather than a flaw.
 *
 * usage: node scripts/study-bank/render-register.mjs [--check]
 *        --check exits 1 if the file is stale, and writes nothing.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const CHECK = process.argv.includes('--check')
const OUT = new URL('./REGISTER.md', import.meta.url).pathname

/*
 * The plan lives in a .ts module the app imports. Rather than duplicate
 * it here — the exact mistake this script exists to prevent — it is
 * transpiled on the fly and imported. One definition, two consumers.
 */
const TS = new URL('../../src/lib/study/bank-register.ts', import.meta.url).pathname
const js = execFileSync('npx', ['esbuild', TS, '--format=esm', '--platform=node', '--loader:.ts=ts'],
  { encoding: 'utf8', maxBuffer: 8 << 20 })
const { WORK, SETTLED, FOUND_WHILE_FIXING, registerSummary, A3_ATTEMPTS, PLAIN_STATUS, unverifiedItems } =
  await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))

/* Same trick for the review maths — imported, never re-implemented. */
const IR = new URL('../../src/lib/study/item-review.ts', import.meta.url).pathname
const irJs = execFileSync('npx', ['esbuild', IR, '--format=esm', '--platform=node', '--loader:.ts=ts'],
  { encoding: 'utf8', maxBuffer: 8 << 20 })
const { scoreRun, provenanceSmell } =
  await import('data:text/javascript;base64,' + Buffer.from(irJs).toString('base64'))

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

/** .range(), never .limit() — PostgREST caps at 1000 and lies about it. */
async function all(table, cols, tweak = q => q) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await tweak(db.from(table).select(cols).range(from, from + 999))
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data?.length) break
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

const bank = (await all('study_item_bank', 'id, family, domain, item, archived')).filter(r => !r.archived)
const attacks = await all('study_item_attacks', 'item_id, correct, solvers, attacked_at')
/*
 * "Everything else" is COUNTED, not declared. It used to be a literal
 * in bank-register.ts (3,387) while this script already had the live
 * bank in hand (3,377) — the markdown and the admin page disagreed with
 * each other and with the database. `bank` is already filtered to
 * non-archived rows above, which is the same live population the admin
 * route counts.
 */
const UNVERIFIED = unverifiedItems(bank.length)
/*
 * reviewer_kind = 'human' is NOT optional here. The whole table below
 * turns on `blind` being a model and `human` not being one; a
 * model-produced row in the human column collapses the two into one and
 * every verdict becomes a model agreeing with itself. See migration 079.
 */
const reviews = await all('study_item_reviews_fresh', 'item_id, run_id, reviewer_id, blind_pick, key_slot, blind_at, reviewed_at',
  q => q.not('blind_at', 'is', null).eq('reviewer_kind', 'human'))
const assisted = await all('study_item_reviews_fresh', 'item_id, run_id, blind_pick, key_slot',
  q => q.not('blind_at', 'is', null).eq('reviewer_kind', 'model_assisted'))

const latest = new Map()
for (const a of attacks) {
  const p = latest.get(a.item_id)
  if (!p || a.attacked_at > p.attacked_at) latest.set(a.item_id, a)
}
const domainOf = new Map(bank.map(r => [r.id, r.domain ?? '?']))
/*
 * PER REVIEWER, then take the BEST — never a pooled average.
 *
 * This column answers one question: can a person find the answer with
 * the source withheld? If ONE careful reader can, the items leak. A
 * second reader who could not does not undo that, and averaging the two
 * describes neither of them.
 *
 * Found 2026-08-06, after it had already produced a wrong verdict.
 * Choose a Response had reviewer 1 at 55.0% (n=20, no abstentions) and
 * reviewer 2 at 15.0% (n=20, seventeen "can't tell"). Pooled that is
 * 30%, under the CONFIRMED-BROKEN threshold and over the n>=20 floor,
 * so the table rendered "cleared by hand — the model was wrong" about a
 * cohort a fresh blind attack had just scored 74.4% against a 29.2%
 * control. The two readers had also been given DIFFERENT instructions
 * about using "can't tell", so pooling them was meaningless as well as
 * wrong.
 *
 * Exactly the error migration 079 fixed for provenance — two sittings
 * of different character averaged into one number that describes
 * neither — repeated one level down, between two humans rather than
 * between a human and a model.
 */
/*
 * KEYED BY RUN, NOT BY REVIEWER — fixed 2026-08-11.
 *
 * This was keyed by reviewer_id, so every sitting one person ever did on
 * a cohort was averaged into a single number. The comment directly above
 * warns against exactly that ("two sittings of different character
 * averaged into one number that describes neither") and the code then
 * did it one level up.
 *
 * What it produced: the co-founder sat Choose a Response on 08-05
 * (11/20, no abstentions) and again inside the 08-11 calibration (2/9,
 * six abstentions). Pooled, that rendered as 41.7% and the verdict column
 * printed "cleared by hand — the model was wrong" — for the cohort cut
 * from 14 delivered to 6 that same morning as CONFIRMED BROKEN by both
 * instruments. It also buried the clean forced-choice TOEFL sweep inside
 * the abstention-wrecked runs that preceded it, so three cohorts that had
 * just been cleared still read "not interpretable".
 *
 * A sitting is a RUN: one sample, one instrument, one occasion. Pooling
 * across runs mixes samples taken under different instruments, which is
 * the same error the register records as having once cleared a cohort
 * scoring 74.4% blind.
 */
const humanBy = new Map()
const runReviewer = new Map()
for (const r of reviews) {
  const d = domainOf.get(r.item_id)
  if (!d) continue
  runReviewer.set(r.run_id, r.reviewer_id)
  const byRev = humanBy.get(d) ?? new Map()
  const e = byRev.get(r.run_id) ?? { n: 0, c: 0, abst: 0, run: r.run_id, first: null, last: null }
  /* Wall-clock span, to tell a SITTING from a window. See the span guard
   * below — this is the third validity rule the procedure had and the
   * renderer did not. */
  const t = Date.parse(r.blind_at)
  if (!Number.isNaN(t)) {
    e.first = e.first === null ? t : Math.min(e.first, t)
    e.last  = e.last  === null ? t : Math.max(e.last,  t)
  }
  e.n++
  // An abstention ("Can't tell") is scored as not-correct, which is
  // right for the SCORE and catastrophic for the VERDICT — see
  // bestHuman below.
  if (!r.blind_pick || String(r.blind_pick).trim() === '') e.abst++
  else if (r.blind_pick === r.key_slot) e.c++
  byRev.set(r.run_id, e)
  humanBy.set(d, byRev)
}

/**
 * The strongest human sitting on a cohort, plus how many readers sat it.
 * Sittings under 10 items are ignored for the verdict — at that size a
 * high score is luck — but still counted in `readers`, so a thin sitting
 * cannot masquerade as no sitting at all.
 */
/**
 * A sitting where the reader abstained on most items measures nothing.
 *
 * 2026-08-11, and this is the second time the same shape of bug has
 * reached this function. Abstentions score as not-correct, so a reader
 * who presses "Can't tell" on 19 of 20 items produces 0.0% — which
 * sails under every CONFIRMED threshold and rendered as "cleared by
 * hand: Academic Talk". The cohort had not been cleared; it had not
 * been measured. A low score from a reader who committed and a low
 * score from a reader who abstained look identical in the number and
 * mean opposite things.
 *
 * 50% is the line because below it the majority of items still carry a
 * real answer, and above it the score is mostly a count of how often
 * the reader declined. The reviewer notes on the Academic Talk run put
 * it beyond doubt — one reads "this was guessable but I just didn't
 * click it" — but the guard deliberately does NOT depend on reading
 * notes, because the next high-abstention run may not come with one.
 */
/* 0.20, not 0.50 — aligned 2026-08-11 with score-sweep-run.mjs, which
 * had been written to a stricter line. Two thresholds for one concept is
 * itself a defect; whichever is right, they cannot disagree.
 *
 * 0.20 is the defensible one. Abstentions score as not-correct, so a run
 * with 30% abstention understates its own score by up to 30 points —
 * more than enough to move a cohort from "leaks" to "clean". The old 0.5
 * only caught runs that were mostly declines; it let through exactly the
 * middling ones where the deflation does its damage. */
const ABSTENTION_CEILING = 0.2

/* A run spread over more than four hours is not a sitting.
 *
 * 2026-08-11. Academic Passage had two human readings that disagreed —
 * 41.7% (n=12, 04 Aug) and 13.3% (n=15, today) — and bestHuman took the
 * HIGHER one, because "best" means "the strongest a person managed",
 * which is right when both are sittings. The 04 Aug run spans 1,505
 * minutes: over 25 hours, 125 minutes per item. That is not a person
 * sitting down with hidden options; it is a window, and in a window the
 * source can be looked up, the items can be thought about overnight, and
 * the blind condition is simply not in force.
 *
 * So the disagreement was never about the items. One reading is a
 * measurement and the other is not, and the register was quoting the one
 * that is not. Four hours is generous — the longest genuine sitting on
 * record is 52 minutes for 60 items. */
const SITTING_SPAN_MS = 4 * 60 * 60 * 1000

/* Under ~10 seconds per item is clicking, not reading.
 *
 * The FOURTH validity rule, and the second one the scorer had while this
 * renderer did not. SITTING-PROCEDURE.md §4 has said since it was written
 * that "30-90 seconds per blind item is the observed band for an engaged
 * reader. Under ~10s per item across the run means clicking", and
 * score-sweep-run.mjs refuses to score below it. The register did not
 * check, and so published Academic Talk at 26.7% (n=15) as that cohort's
 * human number — from a run spanning TWO MINUTES. Eight seconds an item,
 * across fifteen items, with zero abstentions.
 *
 * Same shape as the 25-hour window above: a run that satisfies every rule
 * the renderer knew about and fails one it did not. A cohort of 275 items
 * has been carrying "a human read this and scored 26.7%" on the strength
 * of it.
 *
 * Measured over the gaps, so it is (span / n-1) — a 15-item run has 14
 * intervals, and dividing by n understates the pace. */
const MIN_SEC_PER_ITEM = 10

function bestHuman(domain) {
  const byRev = humanBy.get(domain)
  if (!byRev || !byRev.size) return null
  const sittings = [...byRev.values()]
    .map(e => ({
      pct: Math.round((1000 * e.c) / e.n) / 10,
      n: e.n,
      abst: e.abst,
      abstRate: e.abst / e.n,
      run: e.run,
      spanMs: e.first !== null && e.last !== null ? e.last - e.first : 0,
      secPerItem: e.n > 1 && e.first !== null && e.last !== null
        ? (e.last - e.first) / 1000 / (e.n - 1) : null,
    }))
    .sort((a, b) => b.pct - a.pct)
  // Under 10 items a high score is luck; over the abstention ceiling the
  // score is not about the items at all. Both are excluded from the
  // verdict and both stay visible in `all`, so a discarded sitting can
  // never look like no sitting.
  const usable = sittings.filter(s =>
    s.n >= 10 && s.abstRate <= ABSTENTION_CEILING && s.spanMs <= SITTING_SPAN_MS
    && (s.secPerItem === null || s.secPerItem >= MIN_SEC_PER_ITEM))
  if (!usable.length) {
    const people = new Set(sittings.map(s => runReviewer.get(s.run)).filter(Boolean))
    return { none: true, readers: people.size || sittings.length, all: sittings }
  }
  /* `readers` counts distinct PEOPLE, not sittings — one reader who sat
   * a cohort three times is still one reader, and the agreement question
   * is about people. */
  const people = new Set(sittings.map(s => runReviewer.get(s.run)).filter(Boolean))
  return { ...usable[0], readers: people.size || sittings.length, all: sittings }
}

const cohorts = new Map()
for (const r of bank) {
  const k = `${r.family ?? '?'}|${r.domain ?? '?'}`
  const e = cohorts.get(k) ?? { items: 0, picks: 0, correct: 0, measured: 0 }
  e.items++
  const a = latest.get(r.id)
  if (a) { e.measured++; e.picks += a.solvers; e.correct += a.correct }
  cohorts.set(k, e)
}

/*
 * The verdict column. This is the ONLY place the two instruments are
 * combined, and the rule is the one 2026-08-06 established: where a
 * human has been asked, the human wins. A model score with no human
 * behind it is a suspicion and is labelled as one.
 */
function verdict(blind, human) {
  if (blind === null) return 'never measured — the attack does not apply'
  if (human && human.none) {
    return '**sitting not interpretable** — the reader abstained on most of it'
  }
  if (human) {
    const margin = human.pct - 25
    if (margin >= 25.5) return '**CONFIRMED BROKEN** — both instruments agree'
    if (human.n >= 20) return '**cleared by hand** — the model was wrong'
    return 'human says maybe — needs more'
  }
  return blind >= 60 ? '**unconfirmed** — model only' : 'in band, spot-checked only'
}

/**
 * The human column. Always shows the abstention count next to the score,
 * because the two numbers are only meaningful together — 0% with 19
 * abstentions and 0% with none are different findings.
 */
function humanCell(human) {
  if (!human) return '—'
  const fmt = s => `${s.pct}%${s.abst ? ` (${s.abst}/${s.n} abstained)` : ''}`
  if (human.none) return `no usable sitting — ${human.all.map(fmt).join(' / ')}`
  const rest = human.readers > 1
    ? ` — best of ${human.readers}: ${human.all.map(fmt).join(' / ')}`
    : human.abst ? ` — ${human.abst} abstained` : ''
  return `${human.pct}% (n=${human.n})${rest}`
}

const rows = [...cohorts.entries()].map(([k, e]) => {
  const [family, domain] = k.split('|')
  const blind = e.picks ? Math.round((1000 * e.correct) / e.picks) / 10 : null
  return { family, domain, items: e.items, blind, human: bestHuman(domain) }
}).sort((a, b) => b.items - a.items)

const s = registerSummary(WORK)
const open = WORK.filter(w => w.state !== 'done')
const today = new Date().toISOString().slice(0, 10)

const md = `# Question bank register — the one list

<!-- GENERATED by scripts/study-bank/render-register.mjs. Do not edit by
     hand: the plan lives in src/lib/study/bank-register.ts and the
     cohort table is measured from the database. Re-run to update. -->

**Everything outstanding on the bank, in one place.** The same content
renders on /admin/bank-qc, from the same source, so the two cannot
disagree.

Generated ${today}. Live items: ${bank.length.toLocaleString()}.
Open work: ${s.open} — ${s.mine} mine, ${s.yours} need you.

---

## 0. What is actually wrong — read this first

Two facts carry the whole bank, and for weeks neither was stated
anywhere plainly. The register listed OPEN WORK and the findings log
recorded every twist of the debugging, so the surface grew by one entry
per discovery while never once giving the position. **Reporting the
process is not reporting the position.**

| | items | what is true |
|---|---|---|
| **${PLAIN_STATUS.brokenCohort}** | ${PLAIN_STATUS.brokenItems} | **Known broken.** Solvable without the audio, on two independent instruments.${PLAIN_STATUS.brokenIsLive ? ' **Live to students right now.**' : ''} |
| Everything else | ${UNVERIFIED.toLocaleString()} | **Not known to be broken** — never read by a person |

${((PLAIN_STATUS.brokenItems / (PLAIN_STATUS.brokenItems + UNVERIFIED)) * 100).toFixed(1)}% is a quality problem. The rest is a scheduling
problem, and it is blocked on one 20-minute task: **${PLAIN_STATUS.blockedOn}**.

${PLAIN_STATUS.humanChecksSoFar}

### Every attempt to fix ${PLAIN_STATUS.brokenCohort}

\`blind\` is how often three AI solvers pick the right answer with the
audio withheld. \`control\` is the best a fixed-letter guesser could do.
**A gap near zero is the goal.** Nothing has reached it.

| attempt | changed | blind | control | gap | verdict |
|---|---|---|---|---|---|
${A3_ATTEMPTS.map(a => `| **${a.label}** | ${a.changed} | ${a.blindPct}% | ${a.controlPct === null ? '—' : a.controlPct + '%'} | ${a.controlPct === null ? '*not recorded*' : '**+' + (a.blindPct - a.controlPct).toFixed(1) + '**'} | ${a.verdict.toUpperCase()} |`).join('\n')}

The shape of that table is the finding: **each attempt removes the
previous tell and introduces a new one.** Why each failed:

${A3_ATTEMPTS.map(a => `- **${a.label}** — ${a.why}`).join('\n')}

---

## 1. Where every cohort actually stands — MEASURED

\`blind\` is 3 AI solvers with the source withheld, against a 25%
control. \`human\` is a real reviewer under the same protocol. **Where
the two disagree the human wins** — the finding of 2026-08-06, and on
Announcement and Daily Life the model was indeed the one that was wrong.

Two qualifications, both learned the hard way:

- \`human\` is the **best single reader**, never a pooled average. The
  question is whether a person *can* shortcut these items, and one
  reader who can settles it. Pooling a diligent reader with a cautious
  one produced "cleared by hand" for a cohort scoring 74.4% blind.
- The human winning does not mean the model was noise. Where a reader
  also clears the control by a wide margin, the two AGREE and the cohort
  is confirmed broken — which is what happened to Choose a Response.

| test | cohort | items | blind | human | state |
|---|---|---|---|---|---|
${rows.map(r => `| ${r.family.toUpperCase()} | ${r.domain} | ${r.items} | ${r.blind === null ? '—' : r.blind + '%'} | ${humanCell(r.human)} | ${verdict(r.blind, r.human)} |`).join('\n')}

${(() => {
  /*
   * Provenance tripwire.
   *
   * On 2026-08-06 a model-answered sitting reached this table and turned
   * a cohort into "CONFIRMED BROKEN". Nothing objected, because "that
   * looks too good for a human" lived in a person's head. It lives here
   * now.
   *
   * The check is ABSOLUTE — it does not compare runs to each other. The
   * first version did, against the best of the others, and that fires on
   * whichever run is highest by construction: wired up, it flagged
   * choose-a-response, this project's strongest genuine finding. See
   * provenanceSmell for the full account.
   */
  const byRun = new Map()
  for (const r of reviews) {
    if (!byRun.has(r.run_id)) byRun.set(r.run_id, [])
    byRun.get(r.run_id).push({
      keySlot: r.key_slot, blindPick: r.blind_pick,
      answered: r.blind_at != null, verdict: null, realism: null,
    })
  }
  const flagged = [...byRun]
    .map(([run, rows]) => { const s = scoreRun(rows); return { run, s, smell: provenanceSmell(s) } })
    .filter(f => f.smell.suspicious)

  if (!flagged.length) return ''
  return `### ⚠ Check who sat these

${flagged.map(f => `- \`${f.run}\` (${f.s.pct}%, ${f.s.answered} answered) — ${f.smell.reasons.join('; ')}`).join('\n')}

A flagged run is not wrong, it is UNVERIFIED PROVENANCE. A genuinely
leaky cohort produces a high human score, and that is the finding we are
hunting — so this asks one question rather than rejecting anything:
*was this sat by a person, unaided?* Answering it costs a moment and
would have saved 2026-08-06, when a model-answered run rendered as
CONFIRMED BROKEN over 211 items.

`
})()}

${(() => {
  /*
   * Quarantined rows, shown rather than hidden. A number that has been
   * excluded is more dangerous invisible than visible: the next person
   * to run a sitting needs to know this failure mode exists, and the
   * 82.5%-vs-33.3% gap is the clearest evidence in the project that the
   * two instruments measure different things.
   */
  if (!assisted.length) return ''
  const byRun = new Map()
  for (const r of assisted) {
    const e = byRun.get(r.run_id) ?? { n: 0, c: 0 }
    e.n++; if (r.blind_pick && r.blind_pick === r.key_slot) e.c++
    byRun.set(r.run_id, e)
  }
  const humanPct = reviews.length
    ? (100 * reviews.filter(r => r.blind_pick && r.blind_pick === r.key_slot).length / reviews.length)
    : 0
  const aPct = 100 * assisted.filter(r => r.blind_pick && r.blind_pick === r.key_slot).length / assisted.length
  return `### Excluded from the human column — model-assisted

${assisted.length} reviews were entered through the human UI with a model
doing the answering. They are kept as data and marked \`model_assisted\`
(migration 079); they do NOT feed the \`human\` column above, because that
column is worth exactly one thing — being the number a model did not
produce.

${[...byRun].map(([run, e]) => `- \`${run}\` — ${e.c}/${e.n} (${(100 * e.c / e.n).toFixed(1)}%)`).join('\n')}

**${aPct.toFixed(1)}% assisted vs ${humanPct.toFixed(1)}% by hand.** That gap is
the point: a model reading four options scores far above a person doing
the same, which is exactly why one of the two instruments has to stay
human. Unfiltered, SAT Craft and Structure read *CONFIRMED BROKEN — both
instruments agree* on blind 97.4% + "human" 100%, condemning 211 items on
a model agreeing with itself.

`
})()}

${(() => {
  /*
   * Dependency summary, first, because it is the thing a skim misses.
   * "Blocked on B1" lived in A3's note for the life of this file and
   * still had to be said out loud twice — a prose sentence in the last
   * column of a wide table is not visible.
   */
  const blocked = open.filter(w => w.dependsOn?.length)
  if (!blocked.length) return '### Dependencies\n\nNothing is blocked — every open item can start today.'
  const byBlocker = new Map()
  for (const w of blocked) {
    for (const dep of w.dependsOn) {
      if (!byBlocker.has(dep)) byBlocker.set(dep, [])
      byBlocker.get(dep).push(w)
    }
  }
  return `### Dependencies — read this before picking anything up

${[...byBlocker].map(([dep, waiting]) => {
    const blocker = WORK.find(w => w.id === dep)
    return `**${dep} → ${waiting.map(w => w.id).join(', ')}**  \n`
      + `${dep} is *${blocker?.title ?? 'unknown'}* (${blocker?.size ?? '?'}, ${blocker?.owner === 'you' ? 'yours' : 'mine'}). `
      + `Until it lands, ${waiting.map(w => `**${w.id}** (${w.title}, ${w.size})`).join(' and ')} cannot start.`
  }).join('\n\n')}`
})()}

## 2. Open work — mine, no approval needed

| id | what | size | blocked by | why |
|---|---|---|---|---|
${open.filter(w => w.owner === 'claude').map(w => `| ${w.id} | ${w.title} | ${w.size} | ${w.dependsOn?.length ? `**${w.dependsOn.join(', ')}**` : '—'} | ${w.why}${w.note ? ` _${w.note}_` : ''} |`).join('\n')}

## 3. Open work — needs you

| id | what | cost | who | why |
|---|---|---|---|---|
${open.filter(w => w.owner === 'you').map(w => `| ${w.id} | ${w.title} | ${w.size} | ${w.account ? `**${w.account}**<br>` : ''}${w.whoSpecifically ?? 'Either of you.'} | ${w.why}${w.note ? ` _${w.note}_` : ''} |`).join('\n')}

## 4. Settled — do not redo

${SETTLED.map(x => `- **${x.title}.** ${x.finding}${x.doc ? ` → \`${x.doc}\`` : ''}`).join('\n')}

## 5. Found while fixing

Appended in the same commit as the work that surfaced it. A finding
recorded only in a commit message is a finding nobody reads.

${FOUND_WHILE_FIXING.map(f => `- **${f.date}** — ${f.what} ${f.landedAs === 'fixed' ? '_(fixed on the spot)_' : `→ **${f.landedAs}**`}`).join('\n')}

## 6. The rule that keeps this honest

A cohort is **not** clean because the cheap checks passed. Five
structural proxies have been built — letter spread, length rank,
punctuation asymmetry, concessive pivot, option-family balance — and
each caught the tell it was built for while missing the next one. The
blind attack is the gate, a human sitting is the confirmation, and the
structural checks are pre-flight only. See CLAUDE.md.
`

if (CHECK) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''
  // The generated-on date changes daily and is not a drift signal.
  const strip = t => t.replace(/^Generated \d{4}-\d{2}-\d{2}\./m, 'Generated <date>.')
  if (strip(current) !== strip(md)) {
    console.error('REGISTER.md is STALE — run: node scripts/study-bank/render-register.mjs')
    process.exit(1)
  }
  console.log('REGISTER.md is up to date')
  process.exit(0)
}

writeFileSync(OUT, md)
console.log(`wrote REGISTER.md — ${rows.length} cohorts, ${bank.length} live items, ${s.open} open items`)
console.log(`  confirmed broken : ${rows.filter(r => verdict(r.blind, r.human).includes('CONFIRMED')).map(r => r.domain).join(', ') || 'none'}`)
console.log(`  cleared by hand  : ${rows.filter(r => verdict(r.blind, r.human).includes('cleared')).map(r => r.domain).join(', ') || 'none'}`)
console.log(`  unconfirmed      : ${rows.filter(r => verdict(r.blind, r.human).includes('unconfirmed')).length} cohorts`)
