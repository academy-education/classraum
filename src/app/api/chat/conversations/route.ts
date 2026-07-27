import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enforceRateLimit, userOrIpKey } from '@/lib/rate-limit'
import type { Database } from '@/lib/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a function to get an authenticated client for each request
function getAuthenticatedClient(token: string) {
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })
  return client
}

export async function GET(request: Request) {
  try {
    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract the JWT token
    const token = authHeader.substring(7)
    
    // Create authenticated client for this request
    const supabaseServer = getAuthenticatedClient(token)
    
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: conversations, error } = await supabaseServer
      .from('chat_conversations')
      .select(`
        *,
        chat_messages (
          id,
          message,
          sender_type,
          created_at,
          is_read
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Error in conversations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract the JWT token
    const token = authHeader.substring(7)
    
    // Create authenticated client for this request
    const supabaseServer = getAuthenticatedClient(token)
    
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 10 new conversations/user/hour. Conversation creation
    // is the heaviest spam vector — each one creates a row + notifies
    // the participant. Without this, a script could create thousands
    // of empty conversations to nuisance other users.
    const blocked = enforceRateLimit(
      userOrIpKey('chat-conversations-create', user.id, request as NextRequest),
      { windowMs: 60 * 60 * 1000, max: 10 }
    )
    if (blocked) return blocked

    const body = await request.json()
    const { academy_id, title } = body

    // Get user's academy_id if not provided, but don't fail if missing
    let userAcademyId = academy_id
    if (!userAcademyId) {
      // `users` has no academy_id — it is only a default-surface pointer.
      // The academy lives in the per-role join tables. The old select
      // errored on every call, and since supabase-js resolves rather than
      // throws, the catch never fired: userAcademyId was silently null and
      // every support conversation was filed against no academy.
      const [{ data: mgr }, { data: tch }, { data: std }] = await Promise.all([
        supabaseServer.from('managers').select('academy_id').eq('user_id', user.id).maybeSingle(),
        supabaseServer.from('teachers').select('academy_id').eq('user_id', user.id).maybeSingle(),
        supabaseServer.from('students').select('academy_id').eq('user_id', user.id).maybeSingle(),
      ])
      userAcademyId = mgr?.academy_id ?? tch?.academy_id ?? std?.academy_id ?? null
      if (!userAcademyId) {
        console.error('[chat/conversations] no academy row for user; filing conversation unscoped', user.id)
      }
    }

    const { data: conversation, error } = await supabaseServer
      .from('chat_conversations')
      .insert({
        user_id: user.id,
        academy_id: userAcademyId,
        title: title || 'Support Chat'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error in conversations POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}