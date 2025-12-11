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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    // Fetch subscription usage with academy info
    const { data: usageData, error: usageError, count } = await supabase
      .from('subscription_usage')
      .select(`
        *,
        academies!subscription_usage_academy_id_fkey(
          id,
          name,
          subscription_tier
        )
      `, { count: 'exact' })
      .order('calculated_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (usageError) {
      console.error('[Subscription Usage API] Error:', usageError);
      throw usageError;
    }

    // Fetch subscription data separately and merge
    if (usageData && usageData.length > 0) {
      const academyIds = usageData.map(u => u.academy_id);
      const { data: subscriptions } = await supabase
        .from('academy_subscriptions')
        .select('*')
        .in('academy_id', academyIds);

      // Merge subscription data with usage data
      if (subscriptions) {
        usageData.forEach((usage: any) => {
          usage.academy_subscriptions = subscriptions.find(
            (sub: any) => sub.academy_id === usage.academy_id
          );
        });
      }
    }

    // Calculate usage statistics
    const totalUsage = usageData?.reduce((acc, usage) => ({
      students: acc.students + (usage.current_student_count || 0),
      teachers: acc.teachers + (usage.current_teacher_count || 0),
      storage: acc.storage + (usage.current_storage_gb || 0),
      classrooms: acc.classrooms + (usage.current_classroom_count || 0)
    }), { students: 0, teachers: 0, storage: 0, classrooms: 0 }) || { students: 0, teachers: 0, storage: 0, classrooms: 0 };

    // Find academies approaching limits (>80% usage)
    const approaching_limits = usageData?.filter(usage => {
      const sub = Array.isArray(usage.academy_subscriptions)
        ? usage.academy_subscriptions[0]
        : usage.academy_subscriptions;

      if (!sub) return false;

      const studentLimit = sub.student_limit + (sub.additional_students || 0);
      const teacherLimit = sub.teacher_limit + (sub.additional_teachers || 0);
      const storageLimit = sub.storage_limit_gb + (sub.additional_storage_gb || 0);

      const studentUsage = (usage.current_student_count || 0) / studentLimit;
      const teacherUsage = (usage.current_teacher_count || 0) / teacherLimit;
      const storageUsage = (usage.current_storage_gb || 0) / storageLimit;

      return studentUsage > 0.8 || teacherUsage > 0.8 || storageUsage > 0.8;
    }).map(usage => {
      const sub = Array.isArray(usage.academy_subscriptions)
        ? usage.academy_subscriptions[0]
        : usage.academy_subscriptions;
      const academy = Array.isArray(usage.academies)
        ? usage.academies[0]
        : usage.academies;

      return {
        academy_id: usage.academy_id,
        academy_name: academy?.name || 'Unknown',
        student_usage: ((usage.current_student_count || 0) / (sub.student_limit + (sub.additional_students || 0)) * 100).toFixed(1),
        teacher_usage: ((usage.current_teacher_count || 0) / (sub.teacher_limit + (sub.additional_teachers || 0)) * 100).toFixed(1),
        storage_usage: ((usage.current_storage_gb || 0) / (sub.storage_limit_gb + (sub.additional_storage_gb || 0)) * 100).toFixed(1)
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: usageData || [],
      statistics: {
        total_usage: totalUsage,
        approaching_limits,
        total_academies: count || 0
      },
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    });

  } catch (error: any) {
    console.error('[Subscription Usage API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription usage' },
      { status: 500 }
    );
  }
}
