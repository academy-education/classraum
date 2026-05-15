'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  AlertTriangle,
  Bug,
  Filter,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Info,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateInput } from '@/components/ui/common/DateInput';
import { useTranslation } from '@/hooks/useTranslation';
import { AdminPageHeader } from '../AdminPageHeader';
import { useAdminFetch } from '../useAdminFetch';
import { AdminSkeleton } from '../AdminSkeleton';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { usePolling } from '../usePolling';
import { useUrlState } from '../useUrlState';
import { useConfirm } from '../useConfirm';
import { AdminEmptyState } from '../AdminEmptyState';

interface ErrorLog {
  id: string;
  service_name: string;
  level: string;
  message: string;
  error_message: string | null;
  error_stack: string | null;
  context: any;
  user_id: string | null;
  request_id: string | null;
  created_at: string;
}

const logLevels = ['debug', 'info', 'warn', 'error', 'critical'];

export function ErrorLogsDashboard() {
  const adminFetch = useAdminFetch();
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // Filters
  const [levelFilter, setLevelFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Expanded log details
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    loadErrorLogs();
  }, [page, levelFilter, serviceFilter, startDate, endDate]);

  // Auto-refresh every 60s while the tab is visible. Errors are time-
  // sensitive; an admin watching the page wants new errors to appear
  // without a manual click. Pauses when the tab is hidden.
  // The `silent` flag skips the loading=true flash so background polls
  // don't blank the table out and back in every minute.
  usePolling(() => loadErrorLogs({ silent: true }), { intervalMs: 60_000 });

  const loadErrorLogs = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      if (levelFilter) params.append('level', levelFilter);
      if (serviceFilter) params.append('serviceName', serviceFilter);
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());

      const response = await adminFetch(`/api/admin/error-logs?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch error logs');
      }

      const result = await response.json();

      if (result.success) {
        setLogs(result.data);
        setServices(result.services);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (error) {
      console.error('[Error Logs] Error loading logs:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Export the currently-sorted page of logs as CSV. Mirrors the visible
  // filter + sort state — admins get exactly what's on screen, which is
  // what they typically want for sharing with engineering.
  const exportToCSV = () => {
    if (sortedLogs.length === 0) return;
    const headers = ['Timestamp', 'Service', 'Level', 'Message', 'Error', 'Request ID', 'User ID'];
    const rows = sortedLogs.map(l => [
      new Date(l.created_at).toISOString(),
      l.service_name,
      l.level,
      l.message,
      l.error_message || '',
      l.request_id || '',
      l.user_id || '',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `error-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleCleanup = async () => {
    const ok = await confirm({
      title: 'Delete logs older than 30 days?',
      description: String(t('admin.confirmDeleteOldLogs')),
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!ok) return;

    try {
      const response = await adminFetch('/api/admin/error-logs?daysToKeep=30', { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to cleanup logs');
      }

      loadErrorLogs();
    } catch (error) {
      console.error('[Error Logs] Error cleaning up logs:', error);
    }
  };

  // Map log level → semantic tone in shared StatusBadge.
  // critical and error both render danger; warn → pending; info → info;
  // debug → muted. Keeps the visual hierarchy obvious in long log lists.
  const levelTone = (level: string): StatusTone => {
    switch (level) {
      case 'critical':
      case 'error':   return 'danger';
      case 'warn':    return 'pending';
      case 'info':    return 'info';
      case 'debug':   return 'muted';
      default:        return 'muted';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical':
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4" />;
      case 'info':
        return <Info className="w-4 h-4" />;
      case 'debug':
        return <Bug className="w-4 h-4" />;
      default:
        return <Bug className="w-4 h-4" />;
    }
  };

  const formatLogLevel = (level: string) => {
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  const filteredLogs = searchQuery
    ? logs.filter(log =>
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.error_message && log.error_message.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : logs;

  // Sort the visible page. List view uses cards rather than a table, so a
  // dropdown is the natural affordance. URL-persisted via useUrlState so a
  // refresh keeps the chosen order.
  const [sortBy, setSortBy] = useUrlState('sort', 'created_at:desc');
  const levelOrder: Record<string, number> = { critical: 4, error: 3, warn: 2, info: 1, debug: 0 };
  const sortedLogs = React.useMemo(() => {
    const [key, dir] = sortBy.split(':');
    const sign = dir === 'asc' ? 1 : -1;
    return [...filteredLogs].sort((a, b) => {
      let av: string | number | Date = '';
      let bv: string | number | Date = '';
      switch (key) {
        case 'created_at':
          av = new Date(a.created_at).getTime();
          bv = new Date(b.created_at).getTime();
          break;
        case 'level':
          av = levelOrder[a.level] ?? -1;
          bv = levelOrder[b.level] ?? -1;
          break;
        case 'service_name':
          av = a.service_name;
          bv = b.service_name;
          break;
      }
      if (typeof av === 'number' && typeof bv === 'number') return sign * (av - bv);
      return sign * String(av).localeCompare(String(bv));
    });
  }, [filteredLogs, sortBy]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="System"
        title="Error Logs"
        description="Monitor system errors, exceptions and debugging information."
        actions={
          <>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-1.5" disabled={sortedLogs.length === 0}>
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button onClick={handleCleanup} variant="outline" size="sm" className="gap-1.5">
              <Trash2 className="w-4 h-4" />
              Cleanup Old Logs
            </Button>
            <Button onClick={() => loadErrorLogs()} disabled={loading} size="sm" className="gap-1.5">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
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
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at:desc">Newest first</SelectItem>
              <SelectItem value="created_at:asc">Oldest first</SelectItem>
              <SelectItem value="level:desc">Severity (high → low)</SelectItem>
              <SelectItem value="level:asc">Severity (low → high)</SelectItem>
              <SelectItem value="service_name:asc">Service (A → Z)</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Log Level</label>
              <Select
                value={levelFilter || "all"}
                onValueChange={(value) => {
                  setLevelFilter(value === "all" ? "" : value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {logLevels.map(level => (
                    <SelectItem key={level} value={level}>{formatLogLevel(level)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
              <Select
                value={serviceFilter || "all"}
                onValueChange={(value) => {
                  setServiceFilter(value === "all" ? "" : value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {services.map(service => (
                    <SelectItem key={service} value={service}>{service}</SelectItem>
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

      {/* Error Logs Table */}
      <div className="bg-white rounded-xl ring-1 ring-gray-200/70 overflow-hidden">
        {loading ? (
          // Skeleton rows match the real log row layout for a stable feel.
          <AdminSkeleton.LogRows rows={6} />
        ) : sortedLogs.length === 0 ? (
          <AdminEmptyState icon={Bug} title="No error logs found" />
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedLogs.map((log) => (
              <div key={log.id} className="hover:bg-gray-50 transition-colors">
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <StatusBadge tone={levelTone(log.level)}>
                          <span className="mr-1">{getLevelIcon(log.level)}</span>
                          {formatLogLevel(log.level)}
                        </StatusBadge>
                        <span className="text-sm font-medium text-gray-700">{log.service_name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">{log.message}</p>
                      {log.error_message && (
                        <p className="text-sm text-rose-600 mt-1">{log.error_message}</p>
                      )}
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      {expandedLogId === log.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {expandedLogId === log.id && (
                  <div className="px-4 pb-4 bg-gray-50">
                    <div className="space-y-3">
                      {log.error_stack && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-700 mb-1">Stack Trace</h4>
                          <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                            {log.error_stack}
                          </pre>
                        </div>
                      )}

                      {log.context && Object.keys(log.context).length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-700 mb-1">Context</h4>
                          <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                            {JSON.stringify(log.context, null, 2)}
                          </pre>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {log.user_id && (
                          <div>
                            <span className="text-gray-600">User ID:</span>
                            <span className="ml-2 text-gray-900 font-mono">{log.user_id}</span>
                          </div>
                        )}
                        {log.request_id && (
                          <div>
                            <span className="text-gray-600">Request ID:</span>
                            <span className="ml-2 text-gray-900 font-mono">{log.request_id}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && sortedLogs.length > 0 && (
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
