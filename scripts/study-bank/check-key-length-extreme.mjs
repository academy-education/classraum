#!/usr/bin/env node
/**
 * check-key-length-extreme.mjs — is the key identifiable as the SHORTEST (or
 * longest) option, without reading anything?
 *
 *   node scripts/study-bank/check-key-length-extreme.mjs --selftest
 *   node scripts/study-bank/check-key-length-extreme.mjs <batch.json>
 *   node scripts/study-bank/check-key-length-extreme.mjs --bank [--family sat] [--section reading_writing] [--by-domain]
 *
 * ── Why, and why this one is not like the others ─────────────────────
 *
 * Four cheap channels were measured against the live bank on 2026-09-11 and
 * three dissolved: stem-echo at -2.8pts, key-magnitude at +2.6, authored
 * option order unreachable entirely. This one did not.
 *
 *   SAT Reading & Writing, by domain, verified only, "pick the shortest":
 *     Standard English Conventions   n=308   35.6%     <- p = 2.2e-5
 *     Expression of Ideas            n=241   21.0%
 *     Craft and Structure            n=244   20.0%
 *     Information and Ideas          n=250   19.0%
 *
 * It is domain-specific, not section-wide, and the reason is morphological.
 * SEC options are grammatical minimal pairs — `contradicts`/`contradict`,
 * `records`/`record` — and an English singular present-tense verb carries an
 * extra -s. So whenever the key is the plural or the bare form, the key is
 * literally the shorter string. A grader found this by hand before the script
 * existed; this file is the population check on their observation.
 *
 * It is REACHABLE: length is a property of the option set, not of authored
 * order, so `shuffleDrawnChoices` does not touch it. Contrast §2b of
 * AUTHORING-BRIEF.
 *
 * ── THREE DEFENSIBLE STATISTICS GIVE 29% / 48% / 65% ON ONE FILE ─────
 *
 * Measured on sat-sec-h8, 23 scorable items, the same bytes:
 *
 *     29%   key's RANK is 1 after sorting the four lengths   (an author)
 *     48%   expected value, ties split 1/t                   (this file)
 *     65%   key is AT the minimum length, ties counted whole
 *
 * They are not contradictory; they answer different questions, and the
 * spread comes entirely from the 8 of 23 items where the key TIES another
 * option for shortest. A rank sort breaks those ties by accident of sort
 * order, so a tied key lands in rank 1 about half the time for no reason.
 * The naive count credits a tie as a full hit, which overstates the channel:
 * two equally-short options do not hand a solver the answer.
 *
 * The question that decides anything is what a solver PLAYING the rule
 * actually scores, and that is the expected value. This is the "read the
 * denominator" rule one level in — here the denominator is fine and it is
 * the ESTIMATOR that has to be named, because a 36-point spread is enough
 * to start or stop a rewrite programme on its own.
 *
 * ── Ties, and why expected value rather than a count ─────────────────
 *
 * Two options of equal shortest length do not give a solver the answer; they
 * give a coin flip. Counting such an item as a "hit" would overstate the
 * channel. Each item contributes 1/t where t is the size of the tied group,
 * which is exactly what a solver playing the rule scores in expectation.
 *
 * ── Refusals ─────────────────────────────────────────────────────────
 *
 * An item whose options are ALL the same length is UNSCORABLE, not clean —
 * the rule cannot fire, and counting it as a miss would dilute the rate
 * toward chance. It is excluded and the exclusion is printed. A population
 * with no scorable items reports NOT MEASURED and exits 2.
 *
 * The control is derived from the modal option count of the scored items.
 * CLAUDE.md records two separate files that hardcoded 25% onto five-choice
 * data; SSAT is five-choice and would be handed five free points.
 */
import { readFileSync } from 'node:fs'

export function lengthVerdict(choices, key) {
  if (!Array.isArray(choices) || choices.length < 3 || key == null) return null
  const lens = choices.map(c => String(c).length)
  if (new Set(lens).size === 1) return null            // unscorable, not clean
  const min = Math.min(...lens), max = Math.max(...lens)
  const kl = String(key).length
  return {
    w: choices.length,
    shortEv: kl === min ? 1 / lens.filter(l => l === min).length : 0,
    longEv: kl === max ? 1 / lens.filter(l => l === max).length : 0,
  }
}

function selftest() {
  let bad = 0
  const ok = (name, cond, got) => {
    console.log(`${cond ? 'ok   ' : 'FAIL '} ${name}${cond ? '' : `  -> ${JSON.stringify(got)}`}`)
    if (!cond) bad++
  }
  let v = lengthVerdict(['aa', 'bbbb', 'cccccc', 'dddddddd'], 'aa')
  ok('key uniquely shortest scores 1.0', v.shortEv === 1 && v.longEv === 0)
  v = lengthVerdict(['aa', 'bbbb', 'cccccc', 'dddddddd'], 'dddddddd')
  ok('key uniquely longest scores 1.0 on the long side', v.longEv === 1 && v.shortEv === 0)
  v = lengthVerdict(['aa', 'bb', 'cccccc', 'dddddddd'], 'aa')
  ok('a two-way tie for shortest scores 0.5, not 1.0', v.shortEv === 0.5, v)
  ok('all-equal lengths are UNSCORABLE (null), not a clean pass',
    lengthVerdict(['aa', 'bb', 'cc', 'dd'], 'aa') === null)
  v = lengthVerdict(['aa', 'bbbb', 'cccccc', 'dddddddd'], 'bbbb')
  ok('an interior key scores zero on both sides', v.shortEv === 0 && v.longEv === 0)
  /* The real case this exists for: an SEC minimal pair, where the plural verb
   * is one character shorter than the singular purely because of the -s. */
  v = lengthVerdict(['contradicts', 'contradict', 'contradicting', 'contradicted'], 'contradict')
  ok('the SEC morphology case fires (plural verb is shortest)', v.shortEv === 1, v)
  /* Break it: over a run of items where the key is placed at random, the
   * expected shortEv must come out near 1/w, or the estimator is biased. */
  let tot = 0, n = 0
  for (let i = 0; i < 4000; i++) {
    const ch = ['a'.repeat(2), 'b'.repeat(4), 'c'.repeat(6), 'd'.repeat(8)]
    const k = ch[Math.floor(Math.random() * 4)]
    tot += lengthVerdict(ch, k).shortEv; n++
  }
  const rate = tot / n
  ok(`unbiased on random keys (${(100 * rate).toFixed(1)}% vs 25.0% expected)`, Math.abs(rate - 0.25) < 0.03, rate)
  console.log(bad ? `\nSELF-TEST FAILED (${bad})` : '\nself-test passed.')
  process.exit(bad ? 1 : 0)
}

function report(label, rows) {
  let n = 0, unscorable = 0, shortEv = 0, longEv = 0, wsum = 0
  for (const r of rows) {
    const v = lengthVerdict(r.choices, r.key)
    if (!v) { unscorable++; continue }
    n++; shortEv += v.shortEv; longEv += v.longEv; wsum += v.w
  }
  if (n === 0) {
    console.log(`${label}: NOT MEASURED — 0 scorable of ${rows.length} (${unscorable} have all options the same length).`)
    return null
  }
  const control = 100 / (wsum / n)
  const s = 100 * shortEv / n, l = 100 * longEv / n
  console.log(`${label}`)
  console.log(`  scorable ${n} of ${rows.length}  (${unscorable} unscorable — all options equal length)`)
  console.log(`  pick the SHORTEST : ${s.toFixed(1)}%   control ${control.toFixed(1)}%   margin ${(s - control >= 0 ? '+' : '')}${(s - control).toFixed(1)}pts`)
  console.log(`  pick the LONGEST  : ${l.toFixed(1)}%   control ${control.toFixed(1)}%   margin ${(l - control >= 0 ? '+' : '')}${(l - control).toFixed(1)}pts`)
  return { n, s, l, control }
}

/* The CLI runs ONLY when this file is the entry point. Without this guard,
 * `import { ... } from './check-key-length-extreme.mjs'` executes the CLI, prints usage and exits —
 * so a script importing this checker to measure the live bank measures
 * NOTHING while printing something that looks like output. Added 2026-09-11
 * after exactly that happened twice in one session. */
const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-key-length-extreme.mjs')
if (RUN_AS_CLI) {
  const args = process.argv.slice(2)
  if (args.includes('--selftest')) selftest()

  if (args.includes('--bank')) {
    const argOf = f => { const i = args.indexOf(f); return i === -1 ? null : args[i + 1] }
    const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8')
      .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const rows = []
    for (let from = 0; ; from += 1000) {
      let q = db.from('study_item_bank').select('family, section, domain, item')
        .eq('archived', false).eq('verified', true)
      if (argOf('--family')) q = q.eq('family', argOf('--family'))
      if (argOf('--section')) q = q.eq('section', argOf('--section'))
      const { data, error } = await q.order('id').range(from, from + 999)
      if (error) { console.error(error.message); process.exit(1) }
      rows.push(...(data ?? [])); if (!data || data.length < 1000) break
    }
    const mapped = rows.map(r => ({ domain: r.domain, choices: r.item?.choices, key: r.item?.correct_answer }))
    if (args.includes('--by-domain')) {
      const g = {}
      for (const r of mapped) (g[r.domain ?? '(none)'] ??= []).push(r)
      for (const [d, list] of Object.entries(g)) { if (list.length >= 40) report(d, list) }
    } else {
      report(`LIVE BANK family=${argOf('--family') ?? 'all'} section=${argOf('--section') ?? 'all'}`, mapped)
    }
  } else {
    const path = args.find(a => a.endsWith('.json'))
    if (!path) { console.error('usage: check-key-length-extreme.mjs <batch.json> | --bank | --selftest'); process.exit(2) }
    const batch = JSON.parse(readFileSync(path, 'utf8'))
    if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${path} holds no items.`); process.exit(2) }
    const r = report(path, batch.map(i => ({ choices: i.choices, key: i.correct_answer })))
    if (r === null) process.exit(2)
  }
}
