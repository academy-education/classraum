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

    // Create Supabase client with service role for admin operations
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

    // Check if user is admin or super_admin
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

    // Fetch all users with their academy relationships
    const { data: users, error: usersError } = await supabase.rpc('get_all_users_with_academies');

    if (usersError) {
      // If the function doesn't exist, fall back to manual query
      console.log('[Admin Users API] RPC function not found, using manual query');

      const { data: usersData, error: queryError } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          role,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      // Get auth data and academy relationships separately
      const userIds = usersData?.map(u => u.id) || [];

      // Get auth data
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authMap = new Map(authUsers.users.map(u => [u.id, u]));

      // Get academy relationships
      const [
        { data: managers },
        { data: teachers },
        { data: students },
        { data: parents }
      ] = await Promise.all([
        supabase.from('managers').select('user_id, academy_id, academies(name)').in('user_id', userIds),
        supabase.from('teachers').select('user_id, academy_id, academies(name)').in('user_id', userIds),
        supabase.from('students').select('user_id, academy_id, academies(name)').in('user_id', userIds),
        supabase.from('parents').select('user_id, academy_id, academies(name)').in('user_id', userIds)
      ]);

      // Create lookup maps
      const academyMap = new Map();
      [...(managers || []), ...(teachers || []), ...(students || []), ...(parents || [])].forEach(rel => {
        if (rel && rel.user_id) {
          academyMap.set(rel.user_id, {
            id: rel.academy_id,
            name: (rel as any).academies?.name || null
          });
        }
      });

      // Combine all data
      const enrichedUsers = usersData?.map(user => {
        const authUser = authMap.get(user.id);
        const academy = academyMap.get(user.id);

        // Determine status
        let status = 'active';
        if (authUser?.banned_until && new Date(authUser.banned_until) > new Date()) {
          status = 'suspended';
        } else if (!authUser?.email_confirmed_at) {
          status = 'pending';
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status,
          academyId: academy?.id || null,
          academyName: academy?.name || null,
          createdAt: user.created_at,
          lastLoginAt: authUser?.last_sign_in_at || null,
          loginCount: 0 // TODO: Implement login count tracking
        };
      });

      return NextResponse.json({
        success: true,
        data: enrichedUsers || []
      });
    }

    // If RPC function exists, use it
    return NextResponse.json({
      success: true,
      data: users || []
    });

  } catch (error: any) {
    console.error('[Admin Users API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
