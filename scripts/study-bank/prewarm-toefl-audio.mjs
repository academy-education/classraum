#!/usr/bin/env node
/**
 * study-bank/prewarm-toefl-audio.mjs — pre-generate every TOEFL audio
 * clip the app will ever request, so no student is the one who triggers
 * on-the-spot TTS. Replicates the client's EXACT text→segment transform
 * (ListeningAudioPlayer) and the server's EXACT cache hash
 * (/api/study/listening/tts), so the objects this writes are the same
 * ones the player looks up — a guaranteed cache hit at play time.
 *
 * Covers the three audio item types (verified, not archived):
 *   - listening multiple_choice  → transcript, dialogue split into
 *     per-speaker voices (nova/onyx/shimmer/echo) or monologue = nova
 *   - speaking_repeat            → the sentence, voice nova
 *   - speaking_interview         → the question (tag stripped), voice nova
 *
 * Usage:
 *   node scripts/study-bank/prewarm-toefl-audio.mjs plan   # count + cost, no spend
 *   node scripts/study-bank/prewarm-toefl-audio.mjs run     # generate missing clips
 *
 * Dedups (text, voice) across all items (many questions share one
 * recording) and skips clips already in storage, so re-runs are cheap.
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const BUCKET = 'study-listening-audio'
const MODEL = 'tts-1'
const DIALOGUE_VOICE_ROTATION = ['nova', 'onyx', 'shimmer', 'echo']
const MONOLOGUE_VOICE = 'nova'
const CONCURRENCY = 6

function loadEnv() {
  const raw = readFileSync(process.cwd() + '/.env.local', 'utf8')
  return Object.fromEntries(raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}

// ── EXACT client replicas (ListeningAudioPlayer.tsx) ──────────────────
function parseTurns(cleaned) {
  const turnRegex = /(?:^|\s)([A-Z]):\s+([\s\S]*?)(?=(?:\s[A-Z]:\s+)|$)/g
  const turns = []
  let m
  while ((m = turnRegex.exec(cleaned)) != null) {
    turns.push({ speaker: m[1], text: m[2].trim().replace(/^"|"$/g, '') })
  }
  const uniqueSpeakers = new Set(turns.map(t => t.speaker)).size
  return turns.length >= 2 && uniqueSpeakers >= 2 ? turns : []
}
function listeningSegments(passage) {
  const cleaned = (passage || '').replace(/^\s*transcript:\s*/i, '').trim()
  const turns = parseTurns(cleaned)
  if (turns.length === 0) return [{ text: cleaned.replace(/^"|"$/g, ''), voice: MONOLOGUE_VOICE }]
  const speakerVoice = new Map()
  return turns.map(({ speaker, text }) => {
    if (!speakerVoice.has(speaker)) speakerVoice.set(speaker, DIALOGUE_VOICE_ROTATION[speakerVoice.size % DIALOGUE_VOICE_ROTATION.length])
    return { text, voice: speakerVoice.get(speaker) }
  })
}
function repeatSegment(item) {
  const src = (item.passage ?? '')
    .replace(/^\s*(?:audio\s*script|transcript)\s*:\s*/i, '')
    .replace(/^"|"$/g, '')
    .trim() || item.correct_answer || ''
  return [{ text: src.replace(/^"|"$/g, ''), voice: MONOLOGUE_VOICE }]
}
function interviewSegment(item) {
  const q = (item.prompt || '').replace(/^\s*\[[^\]]+\]\s*/, '').replace(/^\s*transcript:\s*/i, '').trim()
  return [{ text: q.replace(/^"|"$/g, ''), voice: MONOLOGUE_VOICE }]
}

// ── EXACT server hash (listening/tts route) ───────────────────────────
const objectPath = (voice, text) =>
  createHash('sha256').update(`${voice}\n${MODEL}\n${text}`).digest('hex').slice(0, 40) + '.mp3'

async function main() {
  const mode = process.argv[2] || 'plan'
  const env = loadEnv()
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const openaiKey = env.OPENAI_API_KEY

  // Pull audio-bearing items. Paginate to dodge row/size caps.
  const rows = []
  for (const section of ['listening', 'speaking']) {
    let from = 0
    for (;;) {
      const { data, error } = await db.from('study_item_bank')
        .select('id, item_type, item')
        .eq('family', 'toefl').eq('section', section).eq('verified', true).eq('archived', false)
        .range(from, from + 499)
      if (error) throw new Error(error.message)
      rows.push(...(data || []))
      if (!data || data.length < 500) break
      from += 500
    }
  }

  // Build the set of unique (voice, text) clips.
  const clips = new Map() // objectPath -> {voice, text}
  let itemCount = 0
  for (const r of rows) {
    const it = r.item
    let segs = []
    if (r.item_type === 'multiple_choice') segs = listeningSegments(it.passage)
    else if (r.item_type === 'speaking_repeat') segs = repeatSegment(it)
    else if (r.item_type === 'speaking_interview') segs = interviewSegment(it)
    else continue
    itemCount++
    for (const s of segs) {
      if (!s.text) continue
      clips.set(objectPath(s.voice, s.text), s)
    }
  }
  const all = [...clips.entries()].map(([path, s]) => ({ path, ...s }))

  // Which already exist? HEAD the public URL (cheap).
  const existsCheck = async ({ path }) => {
    const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path)
    try { const h = await fetch(pub.publicUrl, { method: 'HEAD' }); return h.ok } catch { return false }
  }
  const missing = []
  await mapLimit(all, CONCURRENCY, async c => { if (!(await existsCheck(c))) missing.push(c) })

  const chars = missing.reduce((a, c) => a + c.text.length, 0)
  const estCost = (chars / 1_000_000) * 15 // tts-1 = $15 / 1M chars
  console.log(`items: ${itemCount}  |  unique clips: ${all.length}  |  already cached: ${all.length - missing.length}  |  to generate: ${missing.length}`)
  console.log(`chars to synthesize: ${chars.toLocaleString()}  |  est. one-time cost: ~$${estCost.toFixed(2)}`)
  if (mode !== 'run') { console.log('\n(plan only — pass "run" to generate)'); return }
  if (!openaiKey) throw new Error('OPENAI_API_KEY missing from .env.local')

  let done = 0, failed = 0
  await mapLimit(missing, CONCURRENCY, async c => {
    const gen = () => fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, voice: c.voice, input: c.text, response_format: 'mp3' }),
    })
    let res = await gen()
    if (!res.ok && (res.status === 429 || res.status >= 500)) { await sleep(800); res = await gen() }
    if (!res.ok) { failed++; console.log(`FAIL ${c.path} (${res.status})`); return }
    const mp3 = new Uint8Array(await res.arrayBuffer())
    const { error } = await db.storage.from(BUCKET).upload(c.path, mp3, { contentType: 'audio/mpeg', upsert: false })
    if (error && !/duplicate|already exists/i.test(error.message)) { failed++; console.log(`UPLOAD-FAIL ${c.path}: ${error.message}`); return }
    done++
    if (done % 25 === 0) console.log(`  …${done}/${missing.length}`)
  })
  console.log(`\nGenerated ${done}, failed ${failed}, of ${missing.length} missing.`)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
async function mapLimit(arr, limit, fn) {
  const q = [...arr.keys()]
  const workers = Array.from({ length: Math.min(limit, arr.length) }, async () => {
    for (;;) { const i = q.shift(); if (i === undefined) return; await fn(arr[i], i) }
  })
  await Promise.all(workers)
}

main().catch(e => { console.error(e); process.exit(1) })
