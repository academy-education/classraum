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
const { WORK, SETTLED, FOUND_WHILE_FIXING, registerSummary } =
  await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))

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
const reviews = await all('study_item_reviews_fresh', 'item_id, blind_pick, key_slot, blind_at',
  q => q.not('blind_at', 'is', null))

const latest = new Map()
for (const a of attacks) {
  const p = latest.get(a.item_id)
  if (!p || a.attacked_at > p.attacked_at) latest.set(a.item_id, a)
}
const domainOf = new Map(bank.map(r => [r.id, r.domain ?? '?']))
const humanBy = new Map()
for (const r of reviews) {
  const d = domainOf.get(r.item_id)
  if (!d) continue
  const e = humanBy.get(d) ?? { n: 0, c: 0 }
  e.n++
  if (r.blind_pick && r.blind_pick === r.key_slot) e.c++
  humanBy.set(d, e)
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
  if (human) {
    const margin = human.pct - 25
    if (margin >= 25.5) return '**CONFIRMED BROKEN** — both instruments agree'
    if (human.n >= 20) return '**cleared by hand** — the model was wrong'
    return 'human says maybe — needs more'
  }
  return blind >= 60 ? '**unconfirmed** — model only' : 'in band, spot-checked only'
}

const rows = [...cohorts.entries()].map(([k, e]) => {
  const [family, domain] = k.split('|')
  const blind = e.picks ? Math.round((1000 * e.correct) / e.picks) / 10 : null
  const h = humanBy.get(domain)
  const human = h && h.n ? { pct: Math.round((1000 * h.c) / h.n) / 10, n: h.n } : null
  return { family, domain, items: e.items, blind, human }
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

## 1. Where every cohort actually stands — MEASURED

\`blind\` is 3 AI solvers with the source withheld, against a 25%
control. \`human\` is a real reviewer under the same protocol. **Where
the two disagree the human wins** — that is the finding of 2026-08-06,
and on both cohorts checked so far the model was the one that was wrong.

| test | cohort | items | blind | human | state |
|---|---|---|---|---|---|
${rows.map(r => `| ${r.family.toUpperCase()} | ${r.domain} | ${r.items} | ${r.blind === null ? '—' : r.blind + '%'} | ${r.human ? `${r.human.pct}% (n=${r.human.n})` : '—'} | ${verdict(r.blind, r.human)} |`).join('\n')}

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
