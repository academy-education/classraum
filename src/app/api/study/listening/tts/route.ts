import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/study/listening/tts — generate TOEFL Listening audio via
 * OpenAI's TTS API and return a cached MP3 URL.
 *
 * Cache strategy: sha256(voice + '\n' + text) → object name. Same
 * transcript + same voice = same URL across sessions and students.
 * Storage bucket is public — MP3s are non-sensitive TOEFL passages,
 * and the hash-based path is effectively unguessable.
 *
 * Cost: tts-1 = $15/1M chars. A typical 300-word conversation turn
 * (~1.5k chars) costs ~$0.02 to generate — future replays and other
 * students hitting the identical passage pay $0.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUCKET = 'study-listening-audio'

const BodySchema = z.object({
  /** Text to synthesize. Cleaned of the "Transcript:" prefix and speaker
   *  labels by the caller — we speak whatever we receive verbatim. */
  text: z.string().min(1).max(4000),
  /** OpenAI voice. Different voices per speaker turn give a real
   *  dialogue feel — the client rotates through these. */
  voice: z.enum(['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer']),
  /** tts-1 for cost-efficient, tts-1-hd for near-human. Default tts-1. */
  model: z.enum(['tts-1', 'tts-1-hd']).default('tts-1'),
})

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Rate limit — a single conversation turn issues ~10-16 TTS calls,
  // and a full test with 4 groups × 3 turns × 2 plays = ~100 calls.
  // Cache hits skip OpenAI entirely so this limit is really about
  // NEW passages. 60/min covers a full test + practice.
  const blocked = enforceRateLimit(`listening-tts:user:${user.id}`, { windowMs: 60 * 1000, max: 60 })
  if (blocked) return blocked

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad body', issues: parsed.error.issues }, { status: 400 })
  const { text, voice, model } = parsed.data

  const hash = createHash('sha256').update(`${voice}\n${model}\n${text}`).digest('hex').slice(0, 40)
  const objectPath = `${hash}.mp3`

  // Cache hit probe — try a HEAD on the deterministic public URL. This
  // avoids the ~300-500 ms Storage `list({search})` call, which turned
  // out to be a real bottleneck on warm-cache plays (student clicks Play
  // and still waits ~1 s before audio starts). HEAD to the public CDN
  // is typically ~40-80 ms.
  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath)
  try {
    const head = await fetch(pub.publicUrl, { method: 'HEAD' })
    if (head.ok) return NextResponse.json({ url: pub.publicUrl, cached: true })
  } catch {
    // Fall through to generation on network error.
  }

  // Cache miss — call OpenAI TTS, upload MP3.
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })

  // OpenAI TTS sometimes returns transient 429 (rate limit) or 5xx
  // under load. Retry once with a 800 ms backoff — enough to clear
  // most burst spikes without meaningfully delaying the student.
  const callOpenAi = () => fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, voice, input: text, response_format: 'mp3' }),
  })
  let ttsRes = await callOpenAi()
  if (!ttsRes.ok && (ttsRes.status === 429 || ttsRes.status >= 500)) {
    await new Promise(r => setTimeout(r, 800))
    ttsRes = await callOpenAi()
  }
  if (!ttsRes.ok) {
    const errText = await ttsRes.text().catch(() => '')
    console.error('[listening/tts] openai failed', ttsRes.status, errText.slice(0, 200))
    return NextResponse.json({ error: 'tts failed', status: ttsRes.status }, { status: 502 })
  }
  const mp3 = new Uint8Array(await ttsRes.arrayBuffer())

  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, mp3, { contentType: 'audio/mpeg', upsert: false })
  if (uploadErr && !/duplicate|already exists/i.test(uploadErr.message)) {
    console.error('[listening/tts] upload failed', uploadErr)
    return NextResponse.json({ error: 'upload failed' }, { status: 500 })
  }
  return NextResponse.json({ url: pub.publicUrl, cached: false })
}
