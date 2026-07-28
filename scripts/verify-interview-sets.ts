/**
 * READ-ONLY check of what a student is ACTUALLY served for the TOEFL
 * Speaking "Take an Interview" task.
 *
 * Usage:
 *   npx tsx scripts/verify-interview-sets.ts
 *
 * The unit test over INTERVIEW_SETS proves the authored data is sound.
 * It cannot prove the student receives it: the bank still holds legacy
 * ungrouped items, assemble.ts ranks and filters before drawing, and a
 * shortfall is reported as a console warning rather than an error. So
 * this runs the real assembler and inspects the delivered questions.
 *
 * Guarantees: never writes. assembleToeflFromBank only calls
 * recordExposures when studentId is set, and no studentId is passed.
 *
 * Exit 0 when every simulated draw yields ONE coherent interview.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(2)
}

const DRAWS = 12

async function main() {
  const { assembleToeflFromBank } = await import('../src/lib/study/assemble')
  const { INTERVIEW_SETS } = await import('../src/lib/study/toefl-interview-sets')

  // Rung by prompt text. The bank stores the rung in the `subskill`
  // COLUMN, which is not part of the item JSON and so never reaches the
  // delivered question — reading it off the question silently yields
  // undefined for every item, which is how the first version of this
  // check managed to fail on correct data. Mapping back through the
  // authored source also makes the assertion stronger: it proves the
  // DELIVERED order matches the AUTHORED order, not merely that four
  // rungs are present.
  const rungByPrompt = new Map<string, number>()
  for (const set of INTERVIEW_SETS) {
    for (const q of set.questions) rungByPrompt.set(`[Interview] ${q.text}`, q.rung)
  }

  let failures = 0
  const setsSeen = new Map<string, number>()

  for (let i = 0; i < DRAWS; i++) {
    // Distinct seed per draw. assembleToeflFromBank is deterministic for
    // a given seed, so without this every "draw" is the same draw and the
    // spread check below proves nothing.
    const t = await assembleToeflFromBank({ section: 'speaking' }, `verify-${i}`)
    const iv = t.questions.filter(q => q.type === 'speaking_interview')

    const groups = new Set(iv.map(q => q.passageGroupId ?? '(none)'))
    const passages = new Set(iv.map(q => (q.passage ?? '').trim()))
    const label = `draw ${String(i + 1).padStart(2)}`

    if (iv.length === 0) {
      console.error(`${label}: FAIL — no interview items served at all`)
      failures++
      continue
    }

    const problems: string[] = []
    // The whole point: four questions, one interview.
    if (groups.size !== 1) {
      problems.push(`${groups.size} groups (${[...groups].join(', ')}) — these are unrelated questions, not an interview`)
    }
    if (passages.size !== 1 || [...passages][0] === '') {
      problems.push(`${passages.size} distinct scenario texts — the premise must be identical on all items`)
    }
    // ETS escalates across the task; the authored order carries it, so a
    // reordered or partial draw is a real defect even if grouping held.
    const rungs = iv.map(q => rungByPrompt.get(q.prompt) ?? null)
    if (rungs.some(r => r == null)) {
      problems.push('an item is not from any authored set — a legacy singleton leaked into the draw')
    } else if (rungs.join(',') !== '1,2,3,4') {
      problems.push(`delivered order is ${rungs.join(',')}, not the authored 1,2,3,4 escalation`)
    }

    const gid = [...groups][0] ?? '(none)'
    setsSeen.set(gid, (setsSeen.get(gid) ?? 0) + 1)

    if (problems.length) {
      failures++
      console.error(`${label}: FAIL  items=${iv.length}`)
      for (const p of problems) console.error(`          - ${p}`)
      for (const q of iv) console.error(`          · ${q.prompt.slice(0, 78)}`)
    } else {
      console.log(`${label}: ok    ${gid}  (${iv.length} items, rungs ${rungs.join('→')})`)
    }
  }

  console.log('\nSets drawn across runs:')
  for (const [g, n] of [...setsSeen].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${g.padEnd(28)} ${n}`)
  }
  // A single set answering every draw would mean students all meet the
  // same interview — grouped, coherent, and still repetitive.
  const top = Math.max(...setsSeen.values())
  if (setsSeen.size > 0 && top > Math.ceil(DRAWS / 2)) {
    console.error(`\nWARN: one set carried ${top}/${DRAWS} draws — the draw is not spreading across sets.`)
    failures++
  }

  console.log(failures === 0 ? '\nPASS' : `\nFAIL (${failures})`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
