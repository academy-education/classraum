'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Clock,
  User,
  Filter,
  Download,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  Users,
  CreditCard,
  MessageSquare,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateInput } from '@/components/ui/common/DateInput';
import { AdminPageHeader } from '../AdminPageHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { useAdminFetch } from '../useAdminFetch';
import { AdminSkeleton } from '../AdminSkeleton';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { useTableSort } from '../useTableSort';
import { SortableTh } from '../SortableTh';
import { usePolling } from '../usePolling';
import { useUrlState } from '../useUrlState';

interface ActivityLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  description: string;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  users: {
    name: string | null;
    email: string;
  };
}

const actionTypes = [
  'academy_created',
  'academy_suspended',
  'academy_unsuspended',
  'subscription_modified',
  'user_modified',
  'notification_sent',
  'support_ticket_created',
  'support_ticket_updated',
  'bulk_operation'
];

const targetTypes = ['academy', 'user', 'subscription', 'notification', 'support_ticket'];

export function ActivityLogsManagement() {
  const { t } = useTranslation();
  const adminFetch = useAdminFetch();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // Filters
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  // Actor filter is mirrored to the URL so deep links from other pages
  // (e.g. UserDetailModal → "View activity") work without extra plumbing.
  const [adminUserFilter, setAdminUserFilter] = useUrlState('actor', '');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Distinct actors derived from the current page of logs. This avoids a
  // second API round-trip for the dropdown options. If a deep link sets an
  // actor that isn't on the visible page, we still keep the value selected
  // (the API filters by id, not by what's in the dropdown).
  const adminOptions = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const log of logs) {
      if (!seen.has(log.admin_user_id)) {
        seen.set(log.admin_user_id, log.users?.name || log.users?.email || log.admin_user_id);
      }
    }
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [logs]);

  useEffect(() => {
    loadActivityLogs();
  }, [page, actionTypeFilter, targetTypeFilter, adminUserFilter, startDate, endDate]);

  // Auto-refresh every 60s while the tab is visible. Activity is the kind
  // of feed admins watch live (e.g. during an incident); pauses when the
  // tab is hidden so it doesn't run forever in a background tab.
  // `silent` skips the loading=true flash so background polls don't blank
  // the table out and back in every minute.
  usePolling(() => loadActivityLogs({ silent: true }), { intervalMs: 60_000 });

  const loadActivityLogs = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      if (actionTypeFilter) params.append('actionType', actionTypeFilter);
      if (targetTypeFilter) params.append('targetType', targetTypeFilter);
      if (adminUserFilter) params.append('adminUserId', adminUserFilter);
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());

      const response = await adminFetch(`/api/admin/activity-logs?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch activity logs');
      }

      const result = await response.json();

      if (result.success) {
        setLogs(result.data);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (error) {
      console.error('[ActivityLogs] Error loading logs:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('academy')) return <Building2 className="w-4 h-4" />;
    if (actionType.includes('user')) return <Users className="w-4 h-4" />;
    if (actionType.includes('subscription')) return <CreditCard className="w-4 h-4" />;
    if (actionType.includes('notification')) return <MessageSquare className="w-4 h-4" />;
    if (actionType.includes('support')) return <MessageSquare className="w-4 h-4" />;
    return <Settings className="w-4 h-4" />;
  };

  // Map admin action_type → semantic tone in shared StatusBadge.
  // suspend/destroy → danger, unsuspend/restore → active,
  // create → info (informational), modify/update → pending, other → muted.
  const actionTypeTone = (actionType: string): StatusTone => {
    if (actionType.includes('suspended') && !actionType.includes('unsuspended')) return 'danger';
    if (actionType.includes('unsuspended') || actionType.includes('activated')) return 'active';
    if (actionType.includes('created')) return 'info';
    if (actionType.includes('modified') || actionType.includes('updated')) return 'pending';
    return 'muted';
  };

  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Admin', 'Action Type', 'Target Type', 'Description', 'IP Address'];
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.users.name || log.users.email,
      formatActionType(log.action_type),
      log.target_type || '-',
      log.description,
      log.ip_address || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredLogs = searchQuery
    ? logs.filter(log =>
        log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.users.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.users.name && log.users.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : logs;

  // Click-to-sort on column headers. Sorts the visible page (50 rows) — the
  // overall ordering still comes from the API; this is a refinement on what
  // the admin is currently looking at.
  const { toggle: toggleSort, sortIndicator, sorted: sortedLogs } = useTableSort(filteredLogs, {
    defaultKey: 'created_at',
    defaultDir: 'desc',
    getValue: (log, key) => {
      switch (key) {
        case 'created_at':  return new Date(log.created_at);
        case 'admin':       return log.users.name || log.users.email;
        case 'action_type': return log.action_type;
        case 'description': return log.description;
        case 'ip_address':  return log.ip_address || '';
        default:            return '';
      }
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={String(t('admin.activityLogs.kicker'))}
        title={String(t('admin.activityLogs.title'))}
        description={String(t('admin.activityLogs.subtitle'))}
        actions={
          <>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-1.5">
              <Download className="w-4 h-4" />
              {String(t('admin.settlements.exportCsv'))}
            </Button>
            <Button onClick={() => loadActivityLogs()} disabled={loading} size="sm" className="gap-1.5">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {String(t('admin.header.refresh'))}
            </Button>
          </>
        }
      />

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl ring-1 ring-gray-200/70">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder={String(t('admin.activityLogs.searchPlaceholder'))}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 h-9 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin User</label>
              <Select
                value={adminUserFilter || 'all'}
                onValueChange={(value) => {
                  setAdminUserFilter(value === 'all' ? '' : value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Admins" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Admins</SelectItem>
                  {/* If a deep link selected an actor not in the visible
                      page, surface the id so the value renders correctly. */}
                  {adminUserFilter && !adminOptions.some(o => o.id === adminUserFilter) && (
                    <SelectItem value={adminUserFilter}>Selected admin</SelectItem>
                  )}
                  {adminOptions.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
              <Select
                value={actionTypeFilter || "all"}
                onValueChange={(value) => {
                  setActionTypeFilter(value === "all" ? "" : value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map(type => (
                    <SelectItem key={type} value={type}>{formatActionType(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Type</label>
              <Select
                value={targetTypeFilter || "all"}
                onValueChange={(value) => {
                  setTargetTypeFilter(value === "all" ? "" : value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Targets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Targets</SelectItem>
                  {targetTypes.map(type => (
                    <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <DateInput
                value={startDate}
                onChange={(value) => {
                  setStartDate(value);
                  setPage(0);
                }}
                placeholder="Select start date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <DateInput
                value={endDate}
                onChange={(value) => {
                  setEndDate(value);
                  setPage(0);
                }}
                placeholder="Select end date"
              />
            </div>
          </div>
        )}
      </div>

      {/* Activity Logs Table */}
      <div className="bg-white rounded-xl ring-1 ring-gray-200/70 overflow-hidden">
        {!loading && filteredLogs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-900">No activity logs found</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Try widening the date range or clearing filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/60 border-b border-gray-200/70">
                <tr>
                  <SortableTh sortKey="created_at" toggle={toggleSort} indicator={sortIndicator('created_at')}>
                    Timestamp
                  </SortableTh>
                  <SortableTh sortKey="admin" toggle={toggleSort} indicator={sortIndicator('admin')}>
                    Admin User
                  </SortableTh>
                  <SortableTh sortKey="action_type" toggle={toggleSort} indicator={sortIndicator('action_type')}>
                    Action
                  </SortableTh>
                  <SortableTh sortKey="description" toggle={toggleSort} indicator={sortIndicator('description')}>
                    Description
                  </SortableTh>
                  <SortableTh sortKey="ip_address" toggle={toggleSort} indicator={sortIndicator('ip_address')}>
                    IP Address
                  </SortableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Loading: render shimmer rows that match the real layout */}
                {loading && <AdminSkeleton.TableRows rows={6} cols={5} />}
                {!loading && (<>

                {sortedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{log.users.name || log.users.email}</p>
                          {log.users.name && (
                            <p className="text-xs text-gray-500">{log.users.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge tone={actionTypeTone(log.action_type)}>
                        <span className="mr-1">{getActionIcon(log.action_type)}</span>
                        {formatActionType(log.action_type)}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-md">
                        {log.description}
                        {log.target_type && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({log.target_type})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                ))}
                </>)}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredLogs.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} logs
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
