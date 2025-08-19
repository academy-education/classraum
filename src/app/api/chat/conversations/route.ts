import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a function to get an authenticated client for each request
function getAuthenticatedClient(token: string) {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
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

    const body = await request.json()
    const { academy_id, title } = body

    // Get user's academy_id if not provided, but don't fail if missing
    let userAcademyId = academy_id
    if (!userAcademyId) {
      try {
        const { data: userData } = await supabaseServer
          .from('users')
          .select('academy_id')
          .eq('id', user.id)
          .single()

        userAcademyId = userData?.academy_id || null
      } catch {
        // If user doesn't exist in users table, just use null for academy_id
        console.log('User not found in users table, using null for academy_id')
        userAcademyId = null
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