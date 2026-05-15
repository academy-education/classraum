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
      // The supabase-js User type omits admin-only fields like `banned_until`,
      // even though the admin REST endpoint returns them. Widen the value type
      // here so we can read them without per-call casts.
      type AdminAuthUser = (typeof authUsers.users)[number] & {
        banned_until?: string | null
      }
      const authMap = new Map<string, AdminAuthUser>(
        authUsers.users.map(u => [u.id, u as AdminAuthUser])
      );

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

/**
 * PATCH — admin write operations on users.
 *
 * Body shape:
 *   { id: string, status?: 'active' | 'suspended', role?: string }   // single
 *   { ids: string[], status?, role? }                                 // bulk
 *
 * - `status` toggles suspension via `auth.admin.updateUserById` and
 *   `ban_duration` ('876000h' ~ 100 years for suspended, 'none' for active).
 * - `role` updates the application-level role in the `users` table only;
 *   it does not change Supabase auth metadata.
 *
 * Returns per-id success/failure so the client can show partial-success
 * feedback (e.g. "5 of 7 updated").
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: callerData, error: callerErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (callerErr || !callerData || !['admin', 'super_admin'].includes(callerData.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const ids: string[] = Array.isArray(body.ids)
      ? body.ids
      : (typeof body.id === 'string' ? [body.id] : []);
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Missing id or ids' }, { status: 400 });
    }

    const { status, role } = body as { status?: 'active' | 'suspended'; role?: string };
    if (!status && !role) {
      return NextResponse.json({ error: 'Provide status or role to update' }, { status: 400 });
    }

    // Guard: only super_admin may grant admin / super_admin roles. Admins
    // can adjust roles below their tier but not promote.
    if (role && ['admin', 'super_admin'].includes(role) && callerData.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super_admin may assign admin roles' },
        { status: 403 }
      );
    }

    // Prevent self-suspension / self-demotion lockout. Admins routinely
    // shoot themselves in the foot — block at the API layer.
    if (ids.includes(user.id) && (status === 'suspended' || (role && role !== callerData.role))) {
      return NextResponse.json(
        { error: 'You cannot modify your own status or role' },
        { status: 400 }
      );
    }

    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const id of ids) {
      try {
        if (status) {
          // Supabase admin API: setting `ban_duration` puts a `banned_until`
          // timestamp on the auth row. 'none' clears it.
          const banDuration = status === 'suspended' ? '876000h' : 'none';
          const { error: banErr } = await supabase.auth.admin.updateUserById(id, {
            ban_duration: banDuration,
          } as any);
          if (banErr) throw banErr;
        }

        if (role) {
          const { error: roleErr } = await supabase
            .from('users')
            .update({ role, updated_at: new Date().toISOString() })
            .eq('id', id);
          if (roleErr) throw roleErr;
        }

        results.push({ id, ok: true });
      } catch (err: any) {
        console.error('[Admin Users PATCH] Failed for', id, err);
        results.push({ id, ok: false, error: err?.message || 'Update failed' });
      }
    }

    // Best-effort audit log — don't fail the request if logging fails.
    try {
      await supabase.from('admin_activity_logs').insert({
        admin_user_id: user.id,
        action_type: 'user_modified',
        target_type: 'user',
        target_id: ids.length === 1 ? ids[0] : null,
        description: `Updated ${results.filter(r => r.ok).length}/${ids.length} user(s)` +
          (status ? ` status→${status}` : '') +
          (role ? ` role→${role}` : ''),
        metadata: { ids, status, role, results },
      });
    } catch (logErr) {
      console.warn('[Admin Users PATCH] Audit log failed:', logErr);
    }

    const okCount = results.filter(r => r.ok).length;
    return NextResponse.json({
      success: okCount === ids.length,
      partial: okCount > 0 && okCount < ids.length,
      okCount,
      failCount: ids.length - okCount,
      results,
    });
  } catch (error: any) {
    console.error('[Admin Users PATCH] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update users' },
      { status: 500 }
    );
  }
}
