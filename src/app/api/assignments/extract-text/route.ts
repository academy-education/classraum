import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { extractTextFromFile, MAX_FILE_BYTES, MAX_EXTRACTED_CHARS } from '@/lib/file-text-extractor'

// POST /api/assignments/extract-text
// Body: multipart/form-data with fields:
//   file: File (PDF or DOCX)
//   academy_id: string
// Returns: { text: string }
//
// Text-based files (.txt/.md/.csv) are read client-side with file.text() and
// don't need this endpoint. This exists specifically to run the binary parsers
// (pdf-parse, mammoth) server-side where the libraries work cleanly.
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 30 }

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = checkRateLimit(`assignments-extract:${user.id}`, RATE_LIMIT)
    if (!rl.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait and try again.', retryAfter: retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      )
    }

    const form = await request.formData().catch(() => null)
    if (!form) {
      return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 })
    }

    const file = form.get('file')
    const academyId = form.get('academy_id')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }
    if (typeof academyId !== 'string' || !academyId) {
      return NextResponse.json({ error: 'academy_id is required' }, { status: 400 })
    }

    // Authorize: must be a manager for the academy
    const { data: mgr } = await supabaseAdmin
      .from('managers')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('academy_id', academyId)
      .single()
    if (!mgr) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File exceeds ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))}MB limit` },
        { status: 413 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { text, kind } = await extractTextFromFile(buffer, file.name, file.type)
    if (!text.trim()) {
      return NextResponse.json(
        { error: 'emptyDocument', kind },
        { status: 422 }
      )
    }

    // Cap the text we return so downstream parsing stays under its own limit.
    // A long PDF can produce 100K+ characters; we don't want to shove that into the textarea.
    const clipped = text.length > MAX_EXTRACTED_CHARS
    const out = clipped ? text.slice(0, MAX_EXTRACTED_CHARS) : text

    return NextResponse.json({ text: out, kind, truncated: clipped })
  } catch (error) {
    console.error('[assignments extract-text] Exception:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
