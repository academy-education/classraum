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

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversation_id')
    
    if (!conversationId) {
      return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 })
    }

    // Verify user owns this conversation
    const { data: conversation, error: convError } = await supabaseServer
      .from('chat_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { data: messages, error } = await supabaseServer
      .from('chat_messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        sender_type,
        message,
        message_type,
        file_url,
        file_name,
        file_size,
        is_read,
        read_at,
        created_at,
        updated_at,
        users!sender_id (
          name,
          email
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error in messages GET:', error)
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
    const { conversation_id, message, message_type = 'text', file_url, file_name, file_size } = body

    if (!conversation_id || !message) {
      return NextResponse.json({ error: 'conversation_id and message are required' }, { status: 400 })
    }

    // Verify user owns this conversation
    const { data: conversation, error: convError } = await supabaseServer
      .from('chat_conversations')
      .select('id')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { data: newMessage, error } = await supabaseServer
      .from('chat_messages')
      .insert({
        conversation_id,
        sender_id: user.id,
        sender_type: 'user',
        message,
        message_type,
        file_url,
        file_name,
        file_size
      })
      .select(`
        id,
        conversation_id,
        sender_id,
        sender_type,
        message,
        message_type,
        file_url,
        file_name,
        file_size,
        is_read,
        read_at,
        created_at,
        updated_at,
        users!sender_id (
          name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Error creating message:', error)
      console.error('Message data:', {
        conversation_id,
        sender_id: user.id,
        sender_type: 'user',
        message,
        message_type
      })
      return NextResponse.json({ 
        error: 'Failed to create message',
        details: error.message || error.details || error
      }, { status: 500 })
    }

    return NextResponse.json({ message: newMessage })
  } catch (error) {
    console.error('Error in messages POST:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : error
    }, { status: 500 })
  }
}