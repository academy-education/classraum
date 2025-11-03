import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('[Admin Usage API] Request received');
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Admin Usage API] Missing or invalid auth header');
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Use service role key for admin operations to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // First verify auth with regular client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Verify user is admin/super_admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userInfo, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userInfo || !['admin', 'super_admin'].includes(userInfo.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get academy_id from query params
    const { searchParams } = new URL(req.url);
    const academyId = searchParams.get('academyId');

    console.log('[Admin Usage API] Academy ID:', academyId);

    if (!academyId) {
      console.error('[Admin Usage API] Missing academy ID');
      return NextResponse.json(
        { error: 'Academy ID is required' },
        { status: 400 }
      );
    }

    // Fetch user counts from role-specific tables (managers, teachers, students, parents)
    // since academy_id is stored in those tables, not the users table
    const [
      { count: managerCount },
      { count: teacherCount },
      { count: studentCount },
      { count: parentCount }
    ] = await Promise.all([
      supabaseAdmin.from('managers').select('*', { count: 'exact', head: true }).eq('academy_id', academyId),
      supabaseAdmin.from('teachers').select('*', { count: 'exact', head: true }).eq('academy_id', academyId),
      supabaseAdmin.from('students').select('*', { count: 'exact', head: true }).eq('academy_id', academyId),
      supabaseAdmin.from('parents').select('*', { count: 'exact', head: true }).eq('academy_id', academyId)
    ]);

    const totalUserCount = (managerCount || 0) + (teacherCount || 0) + (studentCount || 0) + (parentCount || 0);

    console.log('[Admin Usage API] User counts:', { managerCount, teacherCount, studentCount, parentCount, totalUserCount });

    // Fetch storage from subscription_usage if available using admin client
    const { data: usage } = await supabaseAdmin
      .from('subscription_usage')
      .select('current_storage_gb')
      .eq('academy_id', academyId)
      .maybeSingle();

    console.log('[Admin Usage API] Returning data:', { totalUsers: totalUserCount, storageGb: usage ? parseFloat(usage.current_storage_gb || '0') : 0 });

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: totalUserCount,
        storageGb: usage ? parseFloat(usage.current_storage_gb || '0') : 0
      }
    });

  } catch (error) {
    console.error('[Admin Usage API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
