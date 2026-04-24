import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import {
  parseStructuredAssignments,
  parseFreeformAssignments,
  looksStructured,
  MAX_PARSE_INPUT_CHARS,
  type CategoryOption,
} from '@/lib/assignment-parser'
import { checkRateLimit } from '@/lib/rate-limit'

const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 20 } // 20 parses / 10 min / user

// POST /api/assignments/parse
// Body: { text: string, academy_id: string, mode?: 'auto' | 'structured' | 'ai', language?: 'english' | 'korean' }
// Returns: { drafts: ParsedAssignmentDraft[], mode: 'structured' | 'ai' }
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const text = typeof body.text === 'string' ? body.text : ''
    const academyId = typeof body.academy_id === 'string' ? body.academy_id : ''
    const mode: 'auto' | 'structured' | 'ai' = body.mode === 'structured' || body.mode === 'ai' ? body.mode : 'auto'
    const language: 'english' | 'korean' = body.language === 'korean' ? 'korean' : 'english'
    // Optional whitelist of categories for AI matching. Client passes what the
    // classroom actually has; server validates AI responses against this list.
    const rawCategories: unknown = body.categories
    const categories: CategoryOption[] | undefined = Array.isArray(rawCategories)
      ? rawCategories
          .filter(
            (c): c is { id: string; name: string } =>
              !!c && typeof c === 'object' &&
              typeof (c as { id?: unknown }).id === 'string' &&
              typeof (c as { name?: unknown }).name === 'string'
          )
          .map(c => ({ id: c.id, name: c.name }))
      : undefined

    if (!text.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }
    if (text.length > MAX_PARSE_INPUT_CHARS) {
      return NextResponse.json(
        { error: `Input exceeds ${MAX_PARSE_INPUT_CHARS} characters` },
        { status: 400 }
      )
    }
    if (!academyId) {
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

    const useStructured = mode === 'structured' || (mode === 'auto' && looksStructured(text))

    if (useStructured) {
      const drafts = parseStructuredAssignments(text)
      return NextResponse.json({ drafts, mode: 'structured' })
    }

    // AI path — rate limit per user to protect against runaway OpenAI costs
    const rl = checkRateLimit(`assignments-parse:${user.id}`, RATE_LIMIT)
    if (!rl.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait and try again.', retryAfter: retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      )
    }

    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD in UTC — close enough for "due Friday"-style resolution
    const drafts = await parseFreeformAssignments(text, { currentDate: today, language, categories })
    return NextResponse.json({ drafts, mode: 'ai' })
  } catch (error) {
    console.error('[assignments parse] Exception:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
