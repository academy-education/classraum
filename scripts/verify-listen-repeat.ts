/**
 * Listen-and-Repeat spec compliance.
 *
 * WHY THIS IS DETERMINISTIC AND NOT A MODEL JUDGEMENT
 * ---------------------------------------------------
 * Every other item type in this bank needs a blind grader, because "is the
 * key right" and "is it ambiguous" are judgement calls. Listen-and-Repeat is
 * different: there is no answer key to verify — the student repeats the
 * sentence. The entire quality question is whether the sentence obeys the
 * task definition, and TEST_SPECS states that definition in checkable terms:
 *
 *   8-12 words, everyday register, roughly the 2000 most common English
 *   words, ONE main clause plus at most ONE simple extension (a time/place
 *   phrase or a short because/so/when tail), no idioms, no nested clauses.
 *   And: EXEMPT from hard-difficulty framing regardless of the requested
 *   test difficulty — "the challenge is working memory + pronunciation,
 *   not vocabulary."
 *
 * That is a rule, so it gets a rule-checker. Measured against it on
 * 2026-07-28 the live bank was 7/140 compliant: 111 items ran to 17+ words
 * (max 26) and 101 carried subordinate clauses. The items were authored
 * against the spec, not merely mis-labelled, which is why a student hit the
 * task as far too hard.
 *
 * DIFFICULTY BANDING
 * ------------------
 * By WORD COUNT, because for a repetition task the construct is working
 * memory, and length is the actual load — unlike the listening MC bank,
 * where difficulty needed a model estimate against CEFR. Here the proxy is
 * the thing itself.
 *   easy 8-9 · medium 10-11 · hard 12
 *
 * Usage:
 *   npx tsx scripts/verify-listen-repeat.ts <file.json>   # check a batch
 *   npx tsx scripts/verify-listen-repeat.ts --bank        # check the live bank
 * Exit 1 on any violation.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
config({ path: resolve(process.cwd(), '.env.local') })

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

/** Subordinating words that signal a nested clause. `that`/`who`/`which`
 *  only count when they introduce a clause (a following verb-ish word), so a
 *  determiner "that book" does not trip the check. */
const REL = /\b(who|whom|whose|which)\b/i
const THAT_CLAUSE = /\bthat\s+\w+(s|ed|ing)?\s+(is|are|was|were|has|have|had|will|would|can|could)\b/i
const CONCESSIVE = /\b(although|though|whereas|despite|however|nevertheless|moreover|furthermore)\b/i

export function bandFor(n: number): 'easy' | 'medium' | 'hard' | null {
  if (n >= 8 && n <= 9) return 'easy'
  if (n >= 10 && n <= 11) return 'medium'
  if (n === 12) return 'hard'
  return null
}

interface Item { passage?: string; correct_answer?: string; difficulty?: string }

function check(items: Item[], label: string): number {
  let bad = 0
  const hist = new Map<number, number>()
  const bands = new Map<string, number>()
  const seen = new Set<string>()

  items.forEach((it, i) => {
    const s = (it.passage ?? '').trim()
    const id = `${label}#${i}`
    if (!s) { console.error(`EMPTY ${id}`); bad++; return }
    const n = words(s)
    hist.set(n, (hist.get(n) ?? 0) + 1)

    const want = bandFor(n)
    if (want === null) {
      console.error(`LEN   ${id} — ${n} words, outside the 8-12 spec band: "${s.slice(0, 70)}"`); bad++
    } else {
      bands.set(want, (bands.get(want) ?? 0) + 1)
      if (it.difficulty && it.difficulty !== want) {
        console.error(`BAND  ${id} — ${n} words is '${want}', labelled '${it.difficulty}'`); bad++
      }
    }
    if (it.correct_answer !== undefined && it.correct_answer !== it.passage) {
      console.error(`KEY   ${id} — correct_answer differs from passage`); bad++
    }
    if (REL.test(s) || THAT_CLAUSE.test(s)) {
      console.error(`CLAUSE ${id} — relative/nested clause: "${s.slice(0, 70)}"`); bad++
    }
    if (CONCESSIVE.test(s)) {
      console.error(`CONN  ${id} — concessive/formal connective: "${s.slice(0, 70)}"`); bad++
    }
    const k = s.toLowerCase().replace(/[^a-z0-9 ]/g, '')
    if (seen.has(k)) { console.error(`DUP   ${id} — duplicate sentence`); bad++ }
    seen.add(k)
  })

  console.log(`\n${label}: ${items.length} items, ${bad} violations`)
  console.log('  bands  ', [...bands].sort().map(([b, n]) => `${b}:${n}`).join('  '))
  console.log('  words  ', [...hist].sort((a, b) => a[0] - b[0]).map(([w, n]) => `${w}w:${n}`).join(' '))
  return bad
}

;(async () => {
  let bad = 0
  const args = process.argv.slice(2)
  if (args.includes('--bank')) {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await db.from('study_item_bank')
      .select('item').eq('family', 'toefl').eq('section', 'speaking')
      .eq('item_type', 'speaking_repeat').eq('verified', true).eq('archived', false)
    if (error) throw new Error(error.message)
    bad += check((data ?? []).map(r => r.item as Item), 'live bank')
  }
  for (const f of args.filter(a => !a.startsWith('--'))) {
    bad += check(JSON.parse(readFileSync(f, 'utf8')), f.split('/').pop()!)
  }
  console.log(bad === 0 ? '\nOK — every sentence is inside the spec band.' : `\n${bad} violation(s).`)
  process.exit(bad === 0 ? 0 : 1)
})()
