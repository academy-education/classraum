#!/usr/bin/env node
/**
 * Writes the sat-wic-v6 ledger entry, bound to the sha256 of the exact kept
 * file. A HEREDOC SCRIPT FILE, not an inline `node -e` — a ledger write died
 * on 2026-09-21 on a quotation mark inside a verdict string, after the rule
 * saying exactly this had already been written down.
 *
 * The verdicts below are copied from measurements in this session's transcript
 * and the register; nothing here is a summary written from memory.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const D = 'scripts/study-bank'
const file = `${D}/sat-wic-v6.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))

const elim = JSON.parse(readFileSync(`${D}/wic6-oo.elim-f.json`, 'utf8'))
const nSets = Object.keys(elim).length
const withAny = Object.values(elim).filter(v => (v.eliminated || []).length > 0).length
const withTwo = Object.values(elim).filter(v => (v.eliminated || []).length >= 2).length
const key = JSON.parse(readFileSync(`${D}/wic6-oo.key.json`, 'utf8'))
const candIds = Object.entries(key).filter(([, v]) => v.kind === 'candidate').map(([n]) => n)
const keptOnly = new Set(['WIC6-01', 'WIC6-02', 'WIC6-05', 'WIC6-08', 'WIC6-10'])
const keptSets = Object.entries(key).filter(([, v]) => keptOnly.has(v.localId)).map(([n]) => n)
const keptWithAny = keptSets.filter(n => (elim[n]?.eliminated || []).length > 0).length
const keptWithTwo = keptSets.filter(n => (elim[n]?.eliminated || []).length >= 2).length

const entry = {
  id: 'sat-wic-v6-kept-2026-09-24',
  createdAt: '2026-09-24',
  targetTest: 'sat',
  section: 'reading_writing',
  task: 'multiple_choice',
  family: 'mc_hidden_source',
  cohort: 'rw-v15-wic',
  contentSha: sha,
  status: 'inserted',
  note: [
    '12 authored, 5 kept, 4 expected to bank (the fifth is graded easy by majority and accepts.mjs rejects easy under the default hard band -- left in the file so the gate, not I, makes that call).',
    'Six survived the six pre-registered drop conditions; WIC6-04 was then dropped although it PASSED, because it and WIC6-08 were the only two items sharing an option word (settlement, 1 of 47 distinct options) and two blind solvers noticed the repeat unprompted. 08 kept over 04 on difficulty: all three graders rate it hard/strong against 04 medium.',
  ].join(' '),
  stages: {
    shape: {
      passed: true,
      contentSha: sha,
      verdict: '5 items, all 4-choice with the key present, one blank per passage, Craft and Structure / Words in Context throughout. Decidable cross-item checks run exactly over the kept set and the whole live subskill: no key word appears in its own passage, no option word is shared across kept items, no kept key duplicates any of the 30 live keys, and no kept item shares 3 or more rare words (document frequency <= 2) with any live item. That last instrument is check-shared-headword.mjs, built today after bulk passage overlap scored a KNOWN live duplicate at 0.109 Jaccard and returned a clean zero.',
    },
    withsource: {
      passed: true,
      contentSha: sha,
      verdict: 'THREE independent graders, each solving from the passage before reading the explanation. All three agreed with the stated key on all 12 authored items -- key_votes 3/3 on every kept item. The key votes come from these three and NOT from the blind solvers, who had no passage: their picks measure what the option set leaks and are not votes on a key. Exclusivity was decided by MAJORITY (2 of 3), fixed before the third grader returned. Four items fell to it: WIC6-03 (unanswerable, 3/3), WIC6-06 (abandoned, 2/3), WIC6-07 (secondary, 2/3), WIC6-09 (compounds, 2/3). In three of those the graders found the explanation asserting a defeater that does not hold.',
    },
    nosource: {
      passed: true,
      contentSha: sha,
      verdict: 'Options-only attack, three solvers, 12 candidates interleaved with 9 shape-matched live controls in one file with nothing marking the arm. The control excludes gloss-shaped items (that family measured +42.9 blind) and excludes this session own cohorts so it is not self-referential -- 9 items, 27 picks, a 95% interval near +/-17 points, which refutes a large leak and cannot resolve a small one. Key slots dealt FLAT BY CONSTRUCTION after a free shuffle dealt best-fixed-letter lines of 41.7% and 44.4%; re-rolling seeds until a deal looks fair is choosing a result. CANDIDATE 27.8% (10/36) against its own 28.6% derived line; LIVE CONTROL 44.4% (12/27). Margin -16.7 -- the batch leaks LESS than the shipped bank. Splitting by the solvers own declared basis: mechanism-named 26.1%, declared-guess 30.8%, so the three heuristics all three described bought them nothing on the candidates while scoring 44.4% on the bank. One drop: WIC6-06, solved 3/3 with a mechanism named 3/3. WIC6-08 was also unanimous but all three declared it a guess, and the scorer refuses to drop on unanimity without a mechanism.',
    },
    elimination: {
      passed: true,
      contentSha: sha,
      verdict: `Independent elimination probe over the same 21 sets, told to name eliminable options WITHOUT the passage and to answer "none" where it saw nothing. ${withAny} of ${nSets} sets admit at least one free elimination, ${withTwo} admit two or more, and ${nSets - withAny} could not be cut into at all. THE PROBE CONVERGED WITH THE DROP RULE WITHOUT SEEING IT: all ${keptWithAny === 0 ? 'five' : '?'} kept items are uncuttable (${keptWithAny} of 5), while 4 of the 7 DROPPED candidates are cuttable and so are 4 of the 9 live controls -- the rejects and the shipped bank cut at the same rate, and the kept set at none. Structures found: near-synonym cancellation and off-register singleton, 3 each, the only two that ever kill a second option. The probe explicitly REFUSED to count antonym pairing, present in at least 5 sets, on the grounds that it names the axis and narrows to two without saying which member dies -- counting it would have inflated the yield from 8 to about 13. It also discarded "generic common word" as a heuristic, since words-in-context keys are routinely ordinary words. That refusal is why the number is worth quoting.`,
    },
    tells: {
      passed: true,
      contentSha: sha,
      verdict: 'The batch-level findings, both from the graders rather than any checker. First, the author declared six free eliminations and only THREE hold -- and all three are the not-X-but-Y frames it built deliberately, while it labelled three ordinary semantic kills as frame constraints and MISSED live ones on two items it had declared clean (WIC6-05 person, WIC6-12). Fourth author in a row to declare the constraints it had already satisfied. Second, the rich-vs-plain key split is 6/6 by the author count, which is the direct answer to the v4 defect where all fourteen keys were the deflationary option; the blind result is consistent with that having worked. Cross-item option repeat (settlement) found exactly and removed by dropping one of the two items rather than editing either.',
    },
  },
}

ledger.batches.push(entry)
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`ledger entry written for ${file}`)
console.log(`  contentSha ${sha}`)
console.log(`  elimination: ${withAny}/${nSets} sets cuttable, ${withTwo} deeply; kept ${keptWithAny}/5 and ${keptWithTwo}/5`)
