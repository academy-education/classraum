/**
 * Build a blind scoring packet for a human TOEFL rater.
 *
 * Usage:
 *   npx tsx scripts/build-calibration-packet.ts > calibration-packet.md
 *
 * The grader is 1-2 bands harsh (scripts/calibrate-grader.ts) and cannot
 * be fixed without responses whose correct score is known. Only two such
 * responses are public. This assembles everything else we have into one
 * file where a rater writes a 0-5 next to each.
 *
 * DESIGN NOTES
 *
 * Blind. Our AI's score is never shown. A rater who sees "the AI said 2"
 * anchors on it, and the packet then measures agreement with ourselves.
 *
 * Anchored. ETS's two published samples are mixed in, unlabelled, with
 * their official scores held back in the answer key at the bottom. If a
 * rater's numbers diverge from ETS on those two, the whole packet is
 * suspect — this is the check on the checker.
 *
 * Shuffled by content hash, not at random, so re-running produces the
 * same order and a partly-filled packet stays valid.
 *
 * Re-runnable. It reads whatever real responses exist today. Nine
 * interview answers now; run it again after students take more tests and
 * the packet grows. Do NOT pad it with model-written responses — an LLM
 * imitating a weak learner produces errors that are not the ones real
 * learners make, and a grader tuned on those is tuned on fiction.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { ETS_SCORED_SAMPLES } from '../src/lib/study/__fixtures__/ets-scored-samples'

config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(2)
}
const db = createClient(url, key, { auth: { persistSession: false } })

const TASK_LABEL: Record<string, string> = {
  speaking_interview: 'Speaking — Take an Interview',
  writing_email: 'Writing — Write an Email',
  writing_discussion: 'Writing — Write for an Academic Discussion',
}

interface PacketItem {
  id: string
  task: string
  prompt: string
  response: string
  /** Present only for the ETS anchors; printed in the answer key. */
  officialScore?: number
}

async function main() {
  const { data } = await db
    .from('study_attempts')
    .select('id, question, student_answer, session_id')
    .in('question->>type', ['speaking_interview', 'writing_email', 'writing_discussion'])

  const real: PacketItem[] = (data ?? []).flatMap(r => {
    const q = r.question as { type?: string; prompt?: string } | null
    const answer = (r.student_answer ?? '').trim()
    // Under ~40 characters there is nothing for a rater to judge beyond
    // "barely attempted", which we do not need 25 examples of.
    if (!q?.prompt || answer.length < 40) return []
    return [{
      id: `real-${r.id.slice(0, 8)}`,
      task: q.type!,
      prompt: q.prompt,
      response: answer,
    }]
  })

  const anchors: PacketItem[] = ETS_SCORED_SAMPLES.map(s => ({
    id: `anchor-${s.id}`,
    task: 'writing_discussion',
    prompt: s.promptText,
    response: s.responseText,
    officialScore: s.officialScore,
  }))

  const all = [...real, ...anchors].sort((a, b) =>
    createHash('md5').update(a.id).digest('hex')
      .localeCompare(createHash('md5').update(b.id).digest('hex')))

  const byTask = new Map<string, number>()
  for (const i of all) byTask.set(i.task, (byTask.get(i.task) ?? 0) + 1)

  console.log(`# TOEFL calibration packet\n`)
  console.log(`${all.length} responses to score. Roughly 30–45 minutes.\n`)
  console.log(`## What to do\n`)
  console.log(`Give each response a whole number **0–5** using the official ETS`)
  console.log(`rubric for its task, and one line saying why. Write it in the SCORE`)
  console.log(`line under each response.\n`)
  console.log(`Rubrics: <https://www.ets.org/content/dam/ets-org/pdfs/toefl/speaking-rubrics.pdf>`)
  console.log(`and <https://www.ets.org/content/dam/ets-org/pdfs/toefl/writing-rubrics.pdf>\n`)
  console.log(`Score each one independently. Do not go back and adjust earlier`)
  console.log(`scores for consistency — spread is information, and smoothing it`)
  console.log(`out is what makes a calibration set useless.\n`)
  console.log(`Speaking responses are transcripts of recordings, so judge content`)
  console.log(`and language only. You cannot hear pronunciation and are not being`)
  console.log(`asked to score it.\n`)
  console.log(`Contents: ${[...byTask].map(([t, n]) => `${n} × ${TASK_LABEL[t] ?? t}`).join(', ')}\n`)
  console.log(`---\n`)

  all.forEach((item, i) => {
    console.log(`## ${i + 1}. ${TASK_LABEL[item.task] ?? item.task}`)
    console.log(`\n> ${item.prompt.replace(/\n/g, '\n> ')}\n`)
    console.log(`**Response:**\n`)
    console.log(`${item.response}\n`)
    console.log(`**SCORE (0-5):** ____    **why:** ______________________________\n`)
    console.log(`<!-- ${item.id} -->\n`)
    console.log(`---\n`)
  })

  const withKey = all.filter(i => i.officialScore != null)
  console.log(`\n## Answer key — do not read until every score above is filled in\n`)
  console.log(`${withKey.length} of these are ETS's own published samples with official`)
  console.log(`scores. If your scores on them differ by more than one band, stop:`)
  console.log(`the rest of the packet cannot be trusted either.\n`)
  for (const i of withKey) {
    console.log(`- item \`${i.id}\` — ETS scored this **${i.officialScore}**`)
  }
  console.log(`\n### Still needed\n`)
  const target = 25
  console.log(`This packet has ${all.length}. A usable calibration set is about`)
  console.log(`${target}, spread across the whole 0–5 range rather than clustered.`)
  console.log(`Re-run this script as students complete more Speaking and Writing`)
  console.log(`tests; it picks up every new response automatically.\n`)
  if (!byTask.get('writing_email')) {
    console.log(`No Write an Email responses exist yet — that task is unscorable`)
    console.log(`until somebody completes one.\n`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
