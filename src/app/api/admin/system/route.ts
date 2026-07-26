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

    // Get database statistics
    const tables = ['users', 'academies', 'subscriptions', 'students', 'teachers', 'parents', 'managers'];
    const tableStats: any[] = [];

    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      tableStats.push({
        name: table,
        count: count || 0
      });
    }

    // Get total users from auth
    const { data: authData } = await supabase.auth.admin.listUsers();
    const totalAuthUsers = authData?.users.length || 0;

    // Calculate active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = authData?.users.filter(u => {
      const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null;
      return lastSignIn && lastSignIn > thirtyDaysAgo;
    }).length || 0;

    // Get subscription metrics
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('status');

    const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0;
    const totalSubscriptions = subscriptions?.length || 0;

    // Real service health probes — measure reachability + latency instead of
    // fabricating SLA percentages. A probe that throws marks the service down.
    const probe = async (fn: () => PromiseLike<unknown>) => {
      const t0 = Date.now();
      try { await fn(); return { ok: true, ms: Date.now() - t0 }; }
      catch { return { ok: false, ms: Date.now() - t0 }; }
    };
    const dbProbe = await probe(() =>
      supabase.from('users').select('id', { head: true, count: 'exact' }).limit(1)
    );
    const storageProbe = await probe(() => supabase.storage.listBuckets());

    // `id` is the stable, machine-readable identifier the client maps to a
    // localized label. `name`/`description` stay for backwards compatibility
    // with any consumer that predates the ids, but the UI never renders them.
    const services = [
      { id: 'database',       name: 'Database',       status: dbProbe.ok ? 'running' : 'down',      responseMs: dbProbe.ms,      description: 'PostgreSQL database connection' },
      // Auth was already exercised above via auth.admin.listUsers().
      { id: 'authentication', name: 'Authentication', status: authData ? 'running' : 'down',        responseMs: null,            description: 'Supabase Auth service' },
      { id: 'api_server',     name: 'API Server',     status: 'running',                            responseMs: null,            description: 'Next.js API routes' },
      { id: 'file_storage',   name: 'File Storage',   status: storageProbe.ok ? 'running' : 'down', responseMs: storageProbe.ms, description: 'Supabase Storage' },
    ];

    // Real recent activity, pulled from the admin activity log (not synthesized).
    const { data: logRows } = await supabase
      .from('admin_activity_logs')
      .select('id, action_type, description, created_at')
      .order('created_at', { ascending: false })
      .limit(8);
    const recentLogs = (logRows || []).map((r: { id: string; action_type: string; description: string | null; created_at: string }) => ({
      id: r.id,
      level: 'info',
      message: r.description || r.action_type,
      timestamp: r.created_at,
      serviceId: 'admin',
      service: 'Admin',
    }));

    // Real process uptime for this server instance (serverless: since cold start).
    const uptimeSec = Math.floor(process.uptime());
    const uptime = `${Math.floor(uptimeSec / 86400)}d ${Math.floor((uptimeSec % 86400) / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`;

    // Overall status derived from the real probes above.
    const overall = services.every(s => s.status === 'running') ? 'healthy' : 'degraded';

    // System status
    const systemStatus = {
      overall,
      uptime,
      version: process.env.npm_package_version || process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      lastUpdate: new Date(),
      database: {
        status: 'connected',
        tables: tableStats
      }
    };

    // System metrics (database-based)
    // Same contract as `services`: `id` is the stable key the client localizes.
    const systemMetrics = [
      {
        id: 'total_users',
        name: 'Total Users',
        value: totalAuthUsers.toString(),
        status: 'good',
        description: 'Registered users in the system'
      },
      {
        id: 'active_users_30d',
        name: 'Active Users (30d)',
        value: activeUsers.toString(),
        status: 'good',
        description: 'Users active in last 30 days'
      },
      {
        id: 'active_subscriptions',
        name: 'Active Subscriptions',
        value: `${activeSubscriptions}/${totalSubscriptions}`,
        status: activeSubscriptions > 0 ? 'good' : 'warning',
        description: 'Currently active subscriptions'
      },
      {
        id: 'database_tables',
        name: 'Database Tables',
        value: tables.length.toString(),
        status: 'good',
        description: 'Main database tables'
      }
    ];

    const systemData = {
      status: systemStatus,
      // The header card reads systemData.activeUsers. It was never
      // returned here, so `systemData.activeUsers ?? 0` rendered a
      // permanent 0 while the very same number was correct in the
      // metrics grid below it.
      activeUsers,
      metrics: systemMetrics,
      services,
      logs: recentLogs,
      database: {
        connected: true,
        totalTables: tables.length,
        tableStats
      }
    };

    return NextResponse.json({
      success: true,
      data: systemData
    });

  } catch (error: any) {
    console.error('[Admin System API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch system metrics' },
      { status: 500 }
    );
  }
}
