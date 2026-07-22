// Client-safe admin helpers — pure functions + types with NO Supabase
// client or next/server imports. Client components (AdminSidebar,
// AdminHeader, AdminLayout, SettingsDashboard) import from HERE so they
// never pull in the server-only admin-auth module, whose top-level
// createClient(url, SERVICE_ROLE_KEY) throws "supabaseKey is required"
// when bundled for the browser (the service-role key is server-only, so
// it's empty in the client bundle). admin-auth.ts re-exports these for
// server-side callers.

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'super_admin';
  createdAt: Date;
}

/**
 * Utility function to check admin role in client components
 */
export function isAdminRole(role: string): role is 'admin' | 'super_admin' {
  return role === 'admin' || role === 'super_admin';
}

/**
 * Check if a user has a specific admin permission (pure — no DB access).
 */
export function hasAdminPermission(
  adminUser: AdminUser,
  permission: 'manage_academies' | 'manage_users' | 'manage_billing' | 'manage_support' | 'manage_system'
): boolean {
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
