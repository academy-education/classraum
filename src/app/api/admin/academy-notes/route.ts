import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get academy_id from query params
    const searchParams = request.nextUrl.searchParams;
    const academy_id = searchParams.get('academy_id');

    if (!academy_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: academy_id' },
        { status: 400 }
      );
    }

    // Fetch notes for the academy
    const { data: notes, error: notesError } = await supabase
      .from('academy_notes')
      .select(`
        id,
        academy_id,
        admin_user_id,
        note_type,
        content,
        tags,
        is_important,
        created_at,
        updated_at,
        users!academy_notes_admin_user_id_fkey(name, email)
      `)
      .eq('academy_id', academy_id)
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('[Academy Notes API] Error fetching notes:', notesError);
      throw notesError;
    }

    return NextResponse.json({
      success: true,
      data: notes || []
    });

  } catch (error: any) {
    console.error('[Academy Notes API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch academy notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get note data from request body
    const body = await request.json();
    const { academy_id, note_type, content, tags, is_important } = body;

    if (!academy_id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: academy_id, content' },
        { status: 400 }
      );
    }

    // Insert academy note
    const { data: note, error: noteError } = await supabase
      .from('academy_notes')
      .insert({
        academy_id,
        admin_user_id: user.id,
        note_type: note_type || 'general',
        content,
        tags: tags || [],
        is_important: is_important || false
      })
      .select(`
        id,
        academy_id,
        admin_user_id,
        note_type,
        content,
        tags,
        is_important,
        created_at,
        updated_at,
        users!academy_notes_admin_user_id_fkey(name, email)
      `)
      .single();

    if (noteError) {
      console.error('[Academy Notes API] Error creating note:', noteError);
      throw noteError;
    }

    return NextResponse.json({
      success: true,
      data: note
    });

  } catch (error: any) {
    console.error('[Academy Notes API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create academy note' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get note data from request body
    const body = await request.json();
    const { id, note_type, content, tags, is_important } = body;

    if (!id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: id, content' },
        { status: 400 }
      );
    }

    // Update academy note
    const { data: note, error: noteError } = await supabase
      .from('academy_notes')
      .update({
        note_type,
        content,
        tags,
        is_important,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id,
        academy_id,
        admin_user_id,
        note_type,
        content,
        tags,
        is_important,
        created_at,
        updated_at,
        users!academy_notes_admin_user_id_fkey(name, email)
      `)
      .single();

    if (noteError) {
      console.error('[Academy Notes API] Error updating note:', noteError);
      throw noteError;
    }

    return NextResponse.json({
      success: true,
      data: note
    });

  } catch (error: any) {
    console.error('[Academy Notes API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update academy note' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get note ID from query params
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // Delete academy note
    const { error: deleteError } = await supabase
      .from('academy_notes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Academy Notes API] Error deleting note:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true
    });

  } catch (error: any) {
    console.error('[Academy Notes API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete academy note' },
      { status: 500 }
    );
  }
}
