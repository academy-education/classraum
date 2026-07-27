/**
 * Give the TOEFL Reading and Listening banks the task-type dimension
 * neither ever had.
 *
 * WHY
 * ---
 * ETS's Jan-2026 Listening section is FOUR distinct tasks — Listen and
 * Choose a Response, Listen to a Conversation, Listen to an
 * Announcement, Listen to an Academic Talk — with different audio
 * shapes and different questions-per-audio. TEST_SPECS already
 * describes all four correctly for the AI generator.
 *
 * The BANK path does not. Every one of the 467 banked listening items
 * is item_type='multiple_choice' with topic_tag NULL, and
 * TOEFL_META.listening asks for `[{ type: 'multiple_choice', n: 47 }]`.
 * There is nothing to select on, so a bank-assembled Listening test
 * draws 47 undifferentiated items and the ETS task mix is ignored
 * entirely. That is the bug — not the counts, the missing dimension.
 *
 * This script writes `item.listeningTask` on every listening row so the
 * assembler has something to draw against.
 *
 * WHY AN LLM AND NOT A REGEX
 * --------------------------
 * I tried regex first. Speaker-prefix + keyword rules left 60 of 181
 * audios (209 of 467 items, 45%) unclassified, and the residue was
 * mostly lecture-vs-announcement — two monologue types that open
 * identically ("Good afternoon, everyone…" begins both a library
 * announcement and an academic talk in this bank). A rule that cannot
 * separate them would mislabel, and a mislabelled item is worse than an
 * unlabelled one: it silently lands in the wrong quota.
 *
 * Classification is per-AUDIO, not per-item — every question sharing a
 * passageGroupId describes the same recording, so they must agree.
 *
 * SAFETY
 * ------
 * Dry-run by default: prints the distribution and a sample and writes
 * NOTHING. Pass --apply to write. Only ever sets `listeningTask`; every
 * other key in `item` is preserved.
 *
 * READING has the same defect, found the same way: all 524 reading MC rows
 * carry domain='multiple_choice' — a placeholder, not a task — so "Read in
 * Daily Life" and "Read an Academic Passage" were indistinguishable and the
 * ETS ratio between them could never be enforced. Reading writes
 * item.readingTask; listening writes item.listeningTask.
 *
 * Usage:
 *   npx tsx scripts/classify-toefl-tasks.ts listening [--apply]
 *   npx tsx scripts/classify-toefl-tasks.ts reading   [--apply]
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import type { Database } from '../src/lib/database.types'

config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiKey = process.env.OPENAI_API_KEY
if (!url || !key || !openaiKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / OPENAI_API_KEY in .env.local')
  process.exit(2)
}

const APPLY = process.argv.includes('--apply')
const SECTION = process.argv.includes('reading') ? 'reading' : 'listening'
const FIELD = SECTION === 'reading' ? 'readingTask' : 'listeningTask'
const db = createClient<Database>(url, key)
const openai = new OpenAI({ apiKey: openaiKey })

/** The ETS Jan-2026 task types, plus an explicit escape. Complete the Words
 *  is not listed for reading: it is item_type='fill_in_blanks' and already
 *  selectable without a tag. */
const LISTENING_TASKS = ['choose_response', 'conversation', 'announcement', 'academic_talk'] as const
const READING_TASKS = ['daily_life', 'academic_passage'] as const
const TASKS: readonly string[] = SECTION === 'reading' ? READING_TASKS : LISTENING_TASKS
type Task = string

const LISTENING_SYSTEM = `You classify TOEFL iBT (January 2026 format) Listening audio transcripts into exactly one of four ETS task types.

choose_response — a SINGLE short utterance (one speaker, roughly 8-25 words), the kind a test-taker must reply to. Not a dialogue with a resolution; just one cue line.
conversation   — a dialogue between TWO speakers, several turns, campus/service/office-hours context.
announcement   — a MONOLOGUE whose purpose is to inform an audience about a practical change, event, schedule, policy or facility. Library hours, residence hall inspections, transit delays, a new wing opening. The speaker is addressing listeners about something they must ACT on.
academic_talk  — a MONOLOGUE that teaches subject matter. A lecture or mini-talk explaining a concept in biology, economics, history, psychology, art, geology, linguistics. The speaker is addressing listeners about something they must UNDERSTAND.

The hardest distinction is announcement vs academic_talk: both are monologues and both often open "Good afternoon, everyone." Decide by PURPOSE, not by the opening. Practical/logistical information the listener acts on => announcement. Explanatory subject content the listener learns => academic_talk.

If a transcript genuinely fits none of these, answer "unknown". Do not guess.`

const READING_SYSTEM = `You classify TOEFL iBT (January 2026 format) Reading passages into exactly one of two ETS task types.

daily_life — "Read in Daily Life". A short NON-ACADEMIC practical text of the kind a student encounters day to day: a campus notice, a club flyer, a social-media post, an email, a job ad, a course-registration page, a schedule, a policy update. Plain everyday register. The reader's job is to act on it or understand someone's situation.

academic_passage — "Read an Academic Passage". A short expository passage from an academic subject — biology, art history, psychology, geology, business, linguistics, economics, history. Written in textbook register, explaining a concept, process, or scholarly debate. The reader's job is to understand subject matter.

Decide by REGISTER AND PURPOSE, not by length or topic alone: an email ABOUT a biology course is daily_life; a textbook paragraph about email etiquette is academic_passage.

If a passage genuinely fits neither, answer "unknown". Do not guess.`

const SYSTEM = SECTION === 'reading' ? READING_SYSTEM : LISTENING_SYSTEM

interface Audio {
  gid: string
  transcript: string
  ids: string[]
  qCount: number
}

async function loadAudios(): Promise<Audio[]> {
  // PostgREST caps a response at 1000 rows; the listening bank is well
  // under that, but page anyway so growth doesn't silently truncate.
  const rows: Array<{ id: string; item: unknown }> = []
  const PAGE = 500
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('study_item_bank')
      .select('id, item')
      .eq('family', 'toefl')
      .eq('section', SECTION)
      // Reading: MC only. Complete the Words is item_type='fill_in_blanks'
      // and is already selectable by type, so tagging it would add a field
      // nothing reads — and a stray tag on a CtW row invites a future
      // bucketing bug where a paragraph lands in an MC task quota.
      .eq('item_type', SECTION === 'reading' ? 'multiple_choice' : 'multiple_choice')
      .eq('verified', true)
      .eq('archived', false)
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`load failed: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }

  const byGid = new Map<string, Audio>()
  for (const r of rows) {
    const item = r.item as Record<string, unknown> | null
    if (!item) continue
    const gid = typeof item.passageGroupId === 'string' ? item.passageGroupId : `__solo_${r.id}`
    const transcript = typeof item.passage === 'string' ? item.passage : ''
    const a = byGid.get(gid) ?? { gid, transcript, ids: [], qCount: 0 }
    a.ids.push(r.id)
    a.qCount++
    if (!a.transcript) a.transcript = transcript
    byGid.set(gid, a)
  }
  return [...byGid.values()]
}

async function classify(a: Audio): Promise<Task> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4.1',
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content:
          `${SECTION === 'reading' ? 'Passage' : 'Transcript'} (${a.qCount} question(s) are asked about it):\n\n` +
          a.transcript.slice(0, 6000),
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'task',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['task', 'reason'],
          properties: {
            task: { type: 'string', enum: [...TASKS, 'unknown'] },
            reason: { type: 'string' },
          },
        },
      },
    },
  })
  const raw = res.choices[0]?.message?.content
  if (!raw) return 'unknown'
  try {
    return (JSON.parse(raw).task ?? 'unknown') as Task
  } catch {
    return 'unknown'
  }
}

/** Bounded concurrency — 181 audios against gpt-4.1 with no throttle
 *  invites rate-limit errors that would look like classification
 *  failures. */
async function mapLimit<T, R>(xs: T[], limit: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(xs.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, xs.length) }, async () => {
      for (;;) {
        const i = next++
        if (i >= xs.length) return
        out[i] = await f(xs[i]!)
      }
    }),
  )
  return out
}

async function main() {
  const audios = await loadAudios()
  console.log(`[${SECTION}] ${audios.length} distinct ${SECTION === 'reading' ? 'passages' : 'audios'} / ${audios.reduce((n, a) => n + a.qCount, 0)} items\n`)

  let done = 0
  const tasks = await mapLimit(audios, 6, async a => {
    const t = await classify(a)
    if (++done % 25 === 0) console.log(`  classified ${done}/${audios.length}`)
    return t
  })

  const dist = new Map<Task, { audios: number; items: number }>()
  audios.forEach((a, i) => {
    const t = tasks[i]!
    const d = dist.get(t) ?? { audios: 0, items: 0 }
    d.audios++
    d.items += a.qCount
    dist.set(t, d)
  })

  console.log('\n=== distribution ===')
  for (const [t, d] of [...dist.entries()].sort((x, y) => y[1].items - x[1].items)) {
    console.log(`  ${t.padEnd(16)} ${String(d.audios).padStart(4)} audios  ${String(d.items).padStart(4)} items`)
  }

  console.log('\n=== questions-per-audio by task ===')
  for (const t of [...TASKS, 'unknown']) {
    const qs = audios.filter((_, i) => tasks[i] === t).map(a => a.qCount)
    if (!qs.length) continue
    const hist = new Map<number, number>()
    qs.forEach(q => hist.set(q, (hist.get(q) ?? 0) + 1))
    console.log(`  ${t.padEnd(16)} ${[...hist.entries()].sort((a, b) => a[0] - b[0]).map(([q, n]) => `${q}Q×${n}`).join('  ')}`)
  }

  console.log('\n=== samples ===')
  for (const t of [...TASKS, 'unknown']) {
    const i = tasks.indexOf(t)
    if (i < 0) continue
    console.log(`  [${t}] ${audios[i]!.transcript.replace(/\s+/g, ' ').slice(0, 130)}`)
  }

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to persist.')
    return
  }

  console.log(`\nwriting ${FIELD}…`)
  let written = 0
  for (let i = 0; i < audios.length; i++) {
    const t = tasks[i]!
    if (t === 'unknown') continue
    for (const id of audios[i]!.ids) {
      // Read-modify-write per row: jsonb_set would be one statement, but
      // supabase-js has no jsonb_set, and preserving every other key
      // matters more than the round trips (181 audios, one-off script).
      const { data, error: readErr } = await db
        .from('study_item_bank').select('item').eq('id', id).single()
      if (readErr || !data) { console.error(`  read ${id}: ${readErr?.message}`); continue }
      const item = { ...(data.item as Record<string, unknown>), [FIELD]: t }
      // .update() RESOLVES with { error } — it does not throw. Checking
      // the returned error is the only way to know this worked.
      const { error } = await db.from('study_item_bank').update({ item }).eq('id', id)
      if (error) console.error(`  write ${id}: ${error.message}`)
      else written++
    }
  }
  console.log(`wrote ${FIELD} on ${written} rows`)
}

main().catch(e => { console.error(e); process.exit(1) })
