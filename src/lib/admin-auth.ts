import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client for server-side operations
// Use service role key if available, otherwise fall back to anon key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Create regular client for auth verification
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'super_admin';
  createdAt: Date;
}

/**
 * Verify if a user has admin privileges
 */
export async function verifyAdminUser(authToken: string): Promise<AdminUser | null> {
  try {
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authToken);
    
    if (authError || !user) {
      return null;
    }

    // Get user details from database to check role
    const { data: userInfo, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, created_at')
      .eq('id', user.id)
      .single();

    if (userError || !userInfo) {
      return null;
    }

    // Check if user has admin role
    if (!userInfo.role || !['admin', 'super_admin'].includes(userInfo.role)) {
      return null;
    }

    return {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      role: userInfo.role as 'admin' | 'super_admin',
      createdAt: new Date(userInfo.created_at)
    };

  } catch (error) {
    console.error('Error verifying admin user:', error);
    return null;
  }
}

/**
 * Extract admin user from request
 */
export async function getAdminUserFromRequest(request: NextRequest): Promise<AdminUser | null> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return await verifyAdminUser(token);
}

/**
 * Middleware function to protect admin routes
 */
export async function requireAdminAuth(
  request: NextRequest,
  requiredRole: 'admin' | 'super_admin' = 'admin'
): Promise<{ success: true; user: AdminUser } | { success: false; response: NextResponse }> {
  try {
    const adminUser = await getAdminUserFromRequest(request);

    if (!adminUser) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            message: '관리자 권한이 필요합니다.',
            code: 'ADMIN_AUTH_REQUIRED'
          },
          { status: 401 }
        )
      };
    }

    // Check role hierarchy: super_admin can access everything, admin has limited access
    if (requiredRole === 'super_admin' && adminUser.role !== 'super_admin') {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            message: '최고 관리자 권한이 필요합니다.',
            code: 'SUPER_ADMIN_REQUIRED'
          },
          { status: 403 }
        )
      };
    }

    return { success: true, user: adminUser };

  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          message: '인증 처리 중 오류가 발생했습니다.',
          code: 'AUTH_ERROR'
        },
        { status: 500 }
      )
    };
  }
}

/**
 * Higher-order function to wrap admin API routes with authentication
 */
export function withAdminAuth(
  handler: (req: NextRequest, adminUser: AdminUser) => Promise<NextResponse>,
  requiredRole: 'admin' | 'super_admin' = 'admin'
) {
  return async (req: NextRequest) => {
    const authResult = await requireAdminAuth(req, requiredRole);
    
    if (!authResult.success) {
      return authResult.response;
    }

    // Log admin activity
    await logAdminActivity({
      adminUserId: authResult.user.id,
      action: `API_${req.method}_${req.nextUrl.pathname}`,
      description: `Admin API call: ${req.method} ${req.nextUrl.pathname}`,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent'),
    });

    return await handler(req, authResult.user);
  };
}

/**
 * Log admin activity
 */
export async function logAdminActivity(activity: {
  adminUserId: string;
  action: string;
  description: string;
  targetType?: 'academy' | 'user' | 'subscription' | 'notification' | 'support_ticket';
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const actionType = activity.action.toLowerCase().includes('academy') ? 'academy_modified' :
                      activity.action.toLowerCase().includes('user') ? 'user_modified' :
                      activity.action.toLowerCase().includes('subscription') ? 'subscription_modified' :
                      activity.action.toLowerCase().includes('notification') ? 'notification_sent' :
                      activity.action.toLowerCase().includes('ticket') ? 'support_ticket_updated' :
                      'bulk_operation';

    await supabaseAdmin
      .from('admin_activity_logs')
      .insert({
        admin_user_id: activity.adminUserId,
        action_type: actionType,
        target_type: activity.targetType,
        target_id: activity.targetId,
        description: activity.description,
        metadata: activity.metadata || {},
        ip_address: activity.ipAddress,
        user_agent: activity.userAgent,
      });

  } catch (error) {
    console.error('Error logging admin activity:', error);
    // Don't throw here to avoid breaking the main operation
  }
}

/**
 * Check if current user has specific admin permission
 */
export async function hasAdminPermission(
  adminUser: AdminUser,
  permission: 'manage_academies' | 'manage_users' | 'manage_billing' | 'manage_support' | 'manage_system'
): Promise<boolean> {
  // Super admin has all permissions
  if (adminUser.role === 'super_admin') {
    return true;
  }

  // Regular admins have all permissions except system management
  if (adminUser.role === 'admin') {
    return permission !== 'manage_system';
  }

  return false;
}

/**
 * Utility function to check admin role in client components
 */
export function isAdminRole(role: string): role is 'admin' | 'super_admin' {
  return role === 'admin' || role === 'super_admin';
}

/**
 * Generate admin session token for client-side admin authentication
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateAdminSessionToken(_adminUserId: string): Promise<string | null> {
  try {
    // For admin users, we'll use Supabase's built-in JWT tokens
    // This is a placeholder - in a real implementation, you might want
    // to generate custom admin tokens with specific claims
    
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: '', // We'll get this from the user record
    });

    if (error) {
      console.error('Error generating admin session:', error);
      return null;
    }

    // Extract token from the magic link if needed
    // This is a simplified approach - you might want to implement
    // custom JWT generation for admin sessions
    
    return (data.properties as Record<string, unknown>)?.access_token as string || null;

  } catch (error) {
    console.error('Error generating admin session token:', error);
    return null;
  }
}

/**
 * Revoke admin session
 */
export async function revokeAdminSession(adminUserId: string): Promise<boolean> {
  try {
    // Sign out the admin user from all sessions
    await supabaseAdmin.auth.admin.signOut(adminUserId, 'global');
    
    // Log the session revocation
    await logAdminActivity({
      adminUserId,
      action: 'SESSION_REVOKED',
      description: 'Admin session revoked',
    });

    return true;
  } catch (error) {
    console.error('Error revoking admin session:', error);
    return false;
  }
}

/**
 * Get admin dashboard permissions for a user
 */
export function getAdminPermissions(role: 'admin' | 'super_admin') {
  const basePermissions = {
    viewDashboard: true,
    manageAcademies: true,
    viewSubscriptions: true,
    manageBilling: true,
    viewSupport: true,
    manageSupport: true,
    viewAnalytics: true,
    manageUsers: true,
    viewSettlements: true,
    managePartnerSettings: true,
  };

  const superAdminPermissions = {
    ...basePermissions,
    manageSystem: true,
    viewSystemLogs: true,
    manageAdminUsers: true,
    accessSensitiveSettings: true,
  };

  return role === 'super_admin' ? superAdminPermissions : basePermissions;
}