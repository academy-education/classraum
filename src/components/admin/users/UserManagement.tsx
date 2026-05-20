'use client'

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  MoreVertical,
  Eye,
  UserCog,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  UserPlus,
  Mail,
  Shield,
  Activity
} from 'lucide-react';
import { DashboardCard } from '../DashboardCard';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { AdminPageHeader } from '../AdminPageHeader';
import { AdminSkeleton } from '../AdminSkeleton';
import { useAdminFetch } from '../useAdminFetch';
import { useLiveAnnounce } from '../useLiveAnnounce';
import { useDedupedToast } from '../useDedupedToast';
import { useConfirm } from '../useConfirm';
import { useUrlState } from '../useUrlState';
import { useTableSort } from '../useTableSort';
import { SortableTh } from '../SortableTh';
import { useDebouncedValue } from '../useDebouncedValue';
import { AdminEmptyState } from '../AdminEmptyState';
import { UserDetailModal } from './UserDetailModal';
import { EditUserModal, type EditUserTarget } from './EditUserModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';
import { getDateLocale } from '@/utils/dateUtils';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'parent' | 'teacher' | 'manager' | 'admin' | 'super_admin';
  status: 'active' | 'suspended' | 'pending';
  academyId?: string;
  academyName?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  loginCount: number;
}

export function UserManagement() {
  const { t, language } = useTranslation();
  const adminFetch = useAdminFetch();
  const { announce, LiveRegion } = useLiveAnnounce();
  const { toast } = useDedupedToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  // Filter state mirrored to URL params so refreshing / sharing the page
  // preserves what the admin was looking at.
  const [searchTerm, setSearchTerm] = useUrlState('q', '');
  const [filterRole, setFilterRole] = useUrlState('role', 'all');
  const [filterStatus, setFilterStatus] = useUrlState('status', 'all');
  const debouncedSearch = useDebouncedValue(searchTerm, 200);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  // Bulk selection — set of user ids checked across pages. Bulk actions are
  // limited to operations that don't need a write API (we don't have an
  // admin user-suspend endpoint yet): CSV export and "email selected".
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  // Current admin's own auth id — used to disable self-modifying actions in
  // the UI. The API also rejects these, but disabling them client-side
  // avoids confusing failure toasts and prevents an admin from selecting
  // their own row into a bulk action and getting a partial-success result.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // Caller's role gates which target roles the EditUserModal exposes — only
  // super_admin can grant admin / super_admin. Fetched once on mount.
  const [callerRole, setCallerRole] = useState<string>('admin');
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? null;
      setCurrentUserId(id);
      if (!id) return;
      const { data: row } = await supabase
        .from('users')
        .select('role')
        .eq('id', id)
        .single();
      if (row?.role) setCallerRole(row.role);
    })();
  }, []);
  const [editTarget, setEditTarget] = useState<EditUserTarget | null>(null);

  // Single- or bulk-update users via the admin API. `ids` may be a single id
  // or many — the server accepts either. Optimistically updates the list on
  // success; refetches on partial failure to make sure UI matches reality.
  const updateUsers = async (
    ids: string[],
    payload: { status?: 'active' | 'suspended'; role?: string },
    description: string,
  ) => {
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const response = await adminFetch('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ ids, ...payload }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Update failed');
      }
      const { okCount, failCount } = result;
      if (failCount === 0) {
        toast({
          title: `${description} (${okCount})`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'Partial update',
          description: `${okCount} succeeded, ${failCount} failed. Reloading list.`,
          variant: 'warning',
        });
      }
      announce(`${description}: ${okCount} of ${ids.length}.`);
      setSelectedIds(new Set());
      await loadUsers();
    } catch (err: any) {
      console.error('[UserManagement] update failed:', err);
      toast({
        title: 'Update failed',
        description: err?.message || 'Could not update user(s).',
        variant: 'destructive',
      });
    } finally {
      setBulkBusy(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);

      const response = await adminFetch('/api/admin/users');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Format the data to match the User interface
        const formattedUsers: User[] = result.data.map((user: any) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          academyId: user.academyId,
          academyName: user.academyName,
          createdAt: new Date(user.createdAt),
          lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined,
          loginCount: user.loginCount || 0
        }));

        setUsers(formattedUsers)
        announce(`Loaded ${formattedUsers.length} users.`);
      }
    } catch (error) {
      console.error('[UserManagement] Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Both badges go through the shared StatusBadge so colors / sizing /
  // ring-1 treatment match every other admin table.
  const getStatusBadge = (status: User['status']) => {
    const map: Record<User['status'], { tone: StatusTone; icon: typeof CheckCircle; label: string } | null> = {
      active:    { tone: 'active',  icon: CheckCircle,    label: 'Active' },
      suspended: { tone: 'danger',  icon: XCircle,        label: 'Suspended' },
      pending:   { tone: 'pending', icon: AlertTriangle,  label: 'Pending' },
    }
    const entry = map[status]
    if (!entry) return null
    return <StatusBadge tone={entry.tone} icon={entry.icon}>{entry.label}</StatusBadge>
  };

  const getRoleBadge = (role: User['role']) => {
    // Map roles to semantic tones. The "elevated privilege" roles (admin,
    // super_admin) use brand color so they stand out at a glance.
    const map: Record<User['role'], StatusTone> = {
      student: 'info',
      parent: 'violet',
      teacher: 'active',
      manager: 'pending',
      admin: 'brand',
      super_admin: 'brand',
    }
    return (
      <StatusBadge tone={map[role]}>
        {role === 'super_admin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
      </StatusBadge>
    );
  };

  // Export users as a CSV. If a selection is active, exports just the
  // selected users — otherwise exports the full filtered view.
  const handleExportCSV = () => {
    const source = selectedIds.size > 0
      ? filteredUsers.filter(u => selectedIds.has(u.id))
      : filteredUsers;
    if (source.length === 0) return;
    const headers = ['User ID', 'Name', 'Email', 'Role', 'Status', 'Academy', 'Login Count', 'Created'];
    const rows = source.map(u => [
      u.id,
      u.name,
      u.email,
      u.role,
      u.status,
      u.academyName || '',
      u.loginCount,
      u.createdAt.toISOString().split('T')[0],
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    announce(`Exported ${source.length} ${source.length === 1 ? 'user' : 'users'} to CSV.`);
  };

  // Compose an email to all selected users via the OS mail client. Bcc keeps
  // recipients private. No backend involved — fire-and-forget.
  const handleEmailSelected = () => {
    if (selectedIds.size === 0) return;
    const emails = filteredUsers
      .filter(u => selectedIds.has(u.id))
      .map(u => u.email)
      .filter(Boolean);
    if (emails.length === 0) return;
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(','))}`;
    announce(`Opened email composer for ${emails.length} ${emails.length === 1 ? 'user' : 'users'}.`);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                          user.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                          user.academyName?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Sort filtered users via shared hook (sort key + direction sync to URL).
  const { toggle: toggleSort, sortIndicator, sorted: sortedUsers } = useTableSort(
    filteredUsers,
    {
      defaultKey: '', defaultDir: '',
      getValue: (u, key) => {
        switch (key) {
          case 'name':       return u.name
          case 'email':      return u.email
          case 'role':       return u.role
          case 'status':     return u.status
          case 'academy':    return u.academyName || ''
          case 'lastLogin':  return u.lastLoginAt
          case 'created':    return u.createdAt
          default: return null
        }
      },
    },
  )

  // Reset to page 1 when filters change. Also clear bulk selection — once
  // the visible set changes, the selection often points at rows the admin
  // can no longer see, which leads to confusing partial-success results
  // ("you suspended 3 users" but only 1 was on screen).
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm, filterRole, filterStatus]);

  // Calculate pagination — page slice now comes from the sorted view.
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  // Calculate stats
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    admins: users.filter(u => ['admin', 'super_admin'].includes(u.role)).length
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header always visible — only the body switches to skeleton */}
        <AdminPageHeader
          kicker={String(t('admin.users.kicker'))}
          title={String(t('admin.users.title'))}
          description={String(t('admin.users.subtitle'))}
        />
        <LiveRegion />

        {loading ? (
          <AdminSkeleton.Body stats={4} cols={6} rows={6} />
        ) : (<>
        {/* Stats Overview — shared DashboardCard for consistent surfaces */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title={String(t('admin.users.totalUsers'))}
            value={stats.total.toLocaleString()}
            subtitle={String(t('admin.users.totalUsersSubtitle'))}
            icon={<Users className="h-5 w-5" />}
            accent="blue"
          />
          <DashboardCard
            title={String(t('admin.users.activeUsers'))}
            value={stats.active.toLocaleString()}
            subtitle={String(t('admin.users.activeUsersSubtitle'))}
            icon={<CheckCircle className="h-5 w-5" />}
            accent="emerald"
          />
          <DashboardCard
            title={String(t('admin.users.suspendedStat'))}
            value={stats.suspended.toLocaleString()}
            subtitle={String(t('admin.users.suspendedSubtitle'))}
            icon={<XCircle className="h-5 w-5" />}
            accent="rose"
          />
          <DashboardCard
            title={String(t('admin.users.adminUsers'))}
            value={stats.admins.toLocaleString()}
            subtitle={String(t('admin.users.adminUsersSubtitle'))}
            icon={<Shield className="h-5 w-5" />}
            accent="violet"
          />
        </div>

        {/* Controls */}
        <div className="bg-white p-4 rounded-xl ring-1 ring-gray-200/70">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder={String(t('admin.users.searchPlaceholder'))}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={filterRole} onValueChange={(value) => setFilterRole(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={String(t('admin.users.allRoles'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{String(t('admin.users.allRoles'))}</SelectItem>
                  <SelectItem value="student">{String(t('admin.users.students'))}</SelectItem>
                  <SelectItem value="parent">{String(t('admin.users.parents'))}</SelectItem>
                  <SelectItem value="teacher">{String(t('admin.users.teachers'))}</SelectItem>
                  <SelectItem value="manager">{String(t('admin.users.managers'))}</SelectItem>
                  <SelectItem value="admin">{String(t('admin.users.admins'))}</SelectItem>
                  <SelectItem value="super_admin">{String(t('admin.users.superAdmins'))}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={String(t('admin.users.allStatuses'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{String(t('admin.users.allStatuses'))}</SelectItem>
                  <SelectItem value="active">{String(t('admin.users.active'))}</SelectItem>
                  <SelectItem value="suspended">{String(t('admin.users.suspended'))}</SelectItem>
                  <SelectItem value="pending">{String(t('admin.users.pending'))}</SelectItem>
                </SelectContent>
              </Select>
              
              {/* "Add User" was a placeholder — there's no admin user-creation
                  API. Reintroduce when /api/admin/users supports POST. */}
              <Button variant="outline" onClick={handleExportCSV} disabled={filteredUsers.length === 0}>
                <Download className="w-4 h-4" />
                {String(t('admin.users.export'))}
              </Button>
            </div>
          </div>
        </div>

        {/* Bulk action bar — appears once one or more rows are selected. */}
        {selectedIds.size > 0 && (
          <div className="bg-[#2885e8]/5 border border-[#2885e8]/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-medium text-[#1f6cc4]">
              {String(t('admin.users.selected', { count: selectedIds.size }))}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleExportCSV}>
                <Download className="w-4 h-4" />
                {String(t('admin.users.exportSelected'))}
              </Button>
              <Button size="sm" variant="outline" onClick={handleEmailSelected}>
                <Mail className="w-4 h-4" />
                {String(t('admin.users.emailSelected'))}
              </Button>
              {/* Bulk role change — server enforces that only super_admin
                  can grant elevated roles, so we just show every option and
                  let the API reject ones the caller can't assign. The role
                  options below stay in lock-step with EditUserModal. */}
              <Select
                disabled={bulkBusy}
                value=""
                onValueChange={async (value) => {
                  if (!value) return;
                  const ok = await confirm({
                    title: `Set ${selectedIds.size} user${selectedIds.size === 1 ? '' : 's'} to "${value === 'super_admin' ? 'Super Admin' : value.charAt(0).toUpperCase() + value.slice(1)}"?`,
                    description: 'Only Super Admins can assign Admin or Super Admin roles. Other changes will be rejected by the server.',
                    variant: value === 'admin' || value === 'super_admin' ? 'warning' : 'info',
                    confirmText: 'Apply',
                  });
                  if (!ok) return;
                  await updateUsers(Array.from(selectedIds), { role: value }, `Role set to ${value}`);
                }}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder={String(t('admin.users.setRole'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{String(t('admin.users.roles.student'))}</SelectItem>
                  <SelectItem value="parent">{String(t('admin.users.roles.parent'))}</SelectItem>
                  <SelectItem value="teacher">{String(t('admin.users.roles.teacher'))}</SelectItem>
                  <SelectItem value="manager">{String(t('admin.users.roles.manager'))}</SelectItem>
                  {callerRole === 'super_admin' && <SelectItem value="admin">{String(t('admin.users.roles.admin'))}</SelectItem>}
                  {callerRole === 'super_admin' && <SelectItem value="super_admin">{String(t('admin.users.roles.superAdmin'))}</SelectItem>}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => updateUsers(Array.from(selectedIds), { status: 'active' }, String(t('admin.users.reactivate')))}
              >
                <CheckCircle className="w-4 h-4" />
                {String(t('admin.users.reactivate'))}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={bulkBusy}
                onClick={async () => {
                  const ok = await confirm({
                    title: `Suspend ${selectedIds.size} user${selectedIds.size === 1 ? '' : 's'}?`,
                    description: 'They will lose access immediately.',
                    variant: 'danger',
                    confirmText: 'Suspend',
                  });
                  if (ok) updateUsers(Array.from(selectedIds), { status: 'suspended' }, 'Suspended');
                }}
              >
                <Ban className="w-4 h-4" />
                {String(t('admin.users.suspend'))}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} disabled={bulkBusy}>
                {String(t('admin.users.clear'))}
              </Button>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-xl ring-1 ring-gray-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/60 border-b border-gray-200/70">
                <tr>
                  {/* Bulk-select header checkbox — toggles all visible
                      (current page) users. Indeterminate when partial. */}
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      ref={el => {
                        if (!el) return;
                        const visible = paginatedUsers.length;
                        const checkedHere = paginatedUsers.filter(u => selectedIds.has(u.id)).length;
                        el.indeterminate = checkedHere > 0 && checkedHere < visible;
                      }}
                      checked={
                        paginatedUsers.filter(u => u.id !== currentUserId).length > 0 &&
                        paginatedUsers.filter(u => u.id !== currentUserId).every(u => selectedIds.has(u.id))
                      }
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) {
                          // Skip the current admin — they can't act on themselves.
                          paginatedUsers.forEach(u => { if (u.id !== currentUserId) next.add(u.id); });
                        } else {
                          paginatedUsers.forEach(u => next.delete(u.id));
                        }
                        setSelectedIds(next);
                      }}
                      aria-label={String(t('admin.users.selectAllVisible'))}
                      className="h-4 w-4 rounded border-gray-300 text-[#2885e8] focus:ring-[#2885e8]"
                    />
                  </th>
                  <SortableTh sortKey="name" toggle={toggleSort} indicator={sortIndicator('name')}>User</SortableTh>
                  <SortableTh sortKey="role" toggle={toggleSort} indicator={sortIndicator('role')}>Role &amp; Status</SortableTh>
                  <SortableTh sortKey="academy" toggle={toggleSort} indicator={sortIndicator('academy')}>Academy</SortableTh>
                  <SortableTh sortKey="lastLogin" toggle={toggleSort} indicator={sortIndicator('lastLogin')}>Last Login</SortableTh>
                  <SortableTh sortKey="created" toggle={toggleSort} indicator={sortIndicator('created')}>Activity</SortableTh>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-50 ${selectedIds.has(user.id) ? 'bg-[#2885e8]/[0.03]' : ''}`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.id)}
                        disabled={user.id === currentUserId}
                        title={user.id === currentUserId ? "You can't select your own account" : undefined}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(user.id);
                          else next.delete(user.id);
                          setSelectedIds(next);
                        }}
                        aria-label={`Select ${user.name}`}
                        className="h-4 w-4 rounded border-gray-300 text-[#2885e8] focus:ring-[#2885e8] disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getRoleBadge(user.role)}
                        {getStatusBadge(user.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.academyName || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.lastLoginAt ? user.lastLoginAt.toLocaleDateString(getDateLocale(language)) : String(t('admin.common.never'))}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.lastLoginAt ? user.lastLoginAt.toLocaleTimeString() : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Activity className="mr-1 h-4 w-4" />
                        {user.loginCount} logins
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setShowActions(showActions === user.id ? null : user.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                          aria-label={String(t('admin.users.rowActions'))}
                          aria-haspopup="menu"
                          aria-expanded={showActions === user.id}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        
                        {showActions === user.id && (
                          <div className="absolute right-0 mt-2 min-w-[180px] w-max bg-white rounded-xl shadow-xl shadow-gray-900/10 ring-1 ring-gray-200/70 py-1 z-10">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDetailModal(true);
                                setShowActions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="mr-3 h-4 w-4" />
                              View Details
                            </button>
                            <button
                              onClick={() => {
                                setShowActions(null);
                                setEditTarget({
                                  id: user.id,
                                  name: user.name,
                                  email: user.email,
                                  role: user.role,
                                });
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <UserCog className="mr-3 h-4 w-4" />
                              Edit Role
                            </button>
                            <button
                              onClick={() => {
                                setShowActions(null);
                                window.location.href = `mailto:${encodeURIComponent(user.email)}`;
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Mail className="mr-3 h-4 w-4" />
                              Send Email
                            </button>
                            <button
                              onClick={async () => {
                                setShowActions(null);
                                const willSuspend = user.status !== 'suspended';
                                if (willSuspend) {
                                  const ok = await confirm({
                                    title: `Suspend ${user.name}?`,
                                    description: 'They will lose access immediately.',
                                    variant: 'danger',
                                    confirmText: 'Suspend',
                                  });
                                  if (!ok) return;
                                }
                                updateUsers(
                                  [user.id],
                                  { status: willSuspend ? 'suspended' : 'active' },
                                  willSuspend ? 'Suspended' : 'Reactivated',
                                );
                              }}
                              disabled={bulkBusy || user.id === currentUserId}
                              title={user.id === currentUserId ? "You can't suspend your own account" : undefined}
                              className={`flex items-center w-full px-4 py-2 text-sm hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed ${user.status === 'suspended' ? 'text-emerald-700 hover:bg-emerald-50' : 'text-rose-700'}`}
                            >
                              {user.status === 'suspended' ? (
                                <><CheckCircle className="mr-3 h-4 w-4" />Reactivate User</>
                              ) : (
                                <><Ban className="mr-3 h-4 w-4" />Suspend User</>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <AdminEmptyState
              icon={Users}
              title={String(t('admin.users.noUsersFound'))}
              description="Try adjusting your search or filter criteria."
            />
          )}

          {/* Pagination */}
          {filteredUsers.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing
                    <span className="font-medium"> {startIndex + 1} </span>
                    to
                    <span className="font-medium"> {Math.min(endIndex, filteredUsers.length)} </span>
                    of
                    <span className="font-medium"> {filteredUsers.length} </span>
                    users
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        </>)}
      </div>

      {/* User Detail Modal */}
      {showDetailModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Edit User Modal — narrow editor for the role field. */}
      {editTarget && (
        <EditUserModal
          user={editTarget}
          callerRole={callerRole}
          isSelf={editTarget.id === currentUserId}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            toast({ title: 'User updated', variant: 'success' });
            loadUsers();
          }}
        />
      )}
    </>
  );
}

