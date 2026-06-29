import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/study/response/transcribe — multipart upload of a recorded
 * speaking response. Forwards the audio to OpenAI gpt-4o-transcribe
 * and returns the text. Also uploads the audio to the per-student
 * folder in the study-response-audio Storage bucket so the grade
 * screen can re-play it later.
 *
 * The audio is stored at `<student_id>/<session_id>/<timestamp>.webm`
 * — the RLS bucket policy keys off the first folder segment so other
 * students cannot read it.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const blocked = enforceRateLimit(
    `response-transcribe:user:${user.id}`,
    { windowMs: 10 * 60 * 1000, max: 20 },
  )
  if (blocked) return blocked

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'expected multipart/form-data' }, { status: 400 })

  const audio = form.get('audio')
  const sessionId = form.get('sessionId') as string | null
  const language = (form.get('language') as string | null) ?? 'en'
  if (!(audio instanceof Blob)) return NextResponse.json({ error: 'missing audio' }, { status: 400 })
  if (!sessionId) return NextResponse.json({ error: 'missing sessionId' }, { status: 400 })
  if (audio.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'audio too large (max 25MB)' }, { status: 400 })

  // Session ownership check.
  const { data: session } = await supabaseAdmin
    .from('study_sessions')
    .select('id, student_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session || session.student_id !== user.id) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 })
  }

  // Store the audio first so we have a path to return even if
  // transcription fails (the client can retry transcription against
  // the stored file separately if needed).
  const ext = (audio.type.includes('webm') ? 'webm' : audio.type.includes('mp4') ? 'm4a' : 'webm')
  const path = `${user.id}/${sessionId}/${Date.now()}.${ext}`
  const uploadRes = await supabaseAdmin.storage
    .from('study-response-audio')
    .upload(path, audio, { contentType: audio.type || 'audio/webm', upsert: false })
  if (uploadRes.error) {
    console.error('[response/transcribe] upload', uploadRes.error)
    return NextResponse.json({ error: 'upload failed' }, { status: 502 })
  }

  // Forward to OpenAI transcription. Using direct fetch — the AI SDK
  // transcription helper is still experimental in v5 and direct call
  // is simpler for a single one-shot.
  const openaiForm = new FormData()
  openaiForm.append('file', audio, `response.${ext}`)
  openaiForm.append('model', 'gpt-4o-transcribe')
  if (language === 'ko' || language === 'en') openaiForm.append('language', language)

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: openaiForm,
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    console.error('[response/transcribe] openai', res.status, errBody)
    return NextResponse.json({ error: 'transcription failed', audioPath: path }, { status: 502 })
  }
  const json = (await res.json()) as { text?: string }
  const text = (json.text ?? '').trim()

  return NextResponse.json({ text, audioPath: path })
}
