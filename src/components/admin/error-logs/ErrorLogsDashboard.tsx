'use client'

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/supabase';
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
import { getDateLocale } from '@/utils/dateUtils';
import { AdminPageHeader } from '../AdminPageHeader';
import { useAdminFetch } from '../useAdminFetch';
import { AdminSkeleton } from '../AdminSkeleton';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { usePolling } from '../usePolling';
import { useUrlState } from '../useUrlState';
import { useConfirm } from '../useConfirm';
import { AdminEmptyState } from '../AdminEmptyState';
import { useDebouncedValue } from '../useDebouncedValue';

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

/** Upper bound on rows pulled for a CSV export. The export covers the whole
 *  FILTERED set, not the loaded page; if the filter still matches more than
 *  this, the filename says so rather than the file quietly being partial. */
const CSV_EXPORT_CAP = 5000;

export function ErrorLogsDashboard() {
  const adminFetch = useAdminFetch();
  const { t, language } = useTranslation();
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

  // Search runs SERVER-SIDE (see /api/admin/error-logs). Debounced so typing
  // doesn't fire a request per keystroke; `searchQuery` drives the input,
  // `debouncedSearch` drives the fetch.
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // Sort is also server-side, so the ordering is over the whole filtered set
  // rather than the 50 loaded rows. URL-persisted so a refresh keeps it.
  const [sortBy, setSortBy] = useUrlState('sort', 'created_at:desc');

  // Expanded log details
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    loadErrorLogs();
  }, [page, levelFilter, serviceFilter, startDate, endDate, debouncedSearch, sortBy]);

  // Auto-refresh every 60s while the tab is visible. Errors are time-
  // sensitive; an admin watching the page wants new errors to appear
  // without a manual click. Pauses when the tab is hidden.
  // The `silent` flag skips the loading=true flash so background polls
  // don't blank the table out and back in every minute.
  usePolling(() => loadErrorLogs({ silent: true }), { intervalMs: 60_000 });

  // Every filter — including search and sort — is a query param, so the
  // server decides both the matching set and its order.
  const buildParams = (overrides: { page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams({
      page: (overrides.page ?? page).toString(),
      pageSize: (overrides.pageSize ?? pageSize).toString(),
      sort: sortBy,
    });
    if (levelFilter) params.append('level', levelFilter);
    if (serviceFilter) params.append('serviceName', serviceFilter);
    if (startDate) params.append('startDate', new Date(startDate).toISOString());
    if (endDate) params.append('endDate', new Date(endDate).toISOString());
    if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
    return params;
  };

  const loadErrorLogs = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const params = buildParams();

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

  // Export the WHOLE filtered set as CSV, not just the loaded page — the
  // footer claims a total, so the export has to mean the same thing. Re-fetches
  // with the same filters and sort at a large pageSize (capped at
  // CSV_EXPORT_CAP); if the filtered total is bigger than the cap the filename
  // records exactly how much was written.
  const [exporting, setExporting] = useState(false);
  const exportToCSV = async () => {
    if (total === 0 || exporting) return;
    setExporting(true);
    let exportLogs: ErrorLog[] = [];
    try {
      const params = buildParams({ page: 0, pageSize: CSV_EXPORT_CAP });
      const response = await adminFetch(`/api/admin/error-logs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch logs for export');
      const result = await response.json();
      exportLogs = result.success ? result.data : [];
    } catch (error) {
      console.error('[Error Logs] Export failed:', error);
      setExporting(false);
      return;
    }
    setExporting(false);
    if (exportLogs.length === 0) return;
    const headers = [
      String(t('admin.errorLogs.csvTimestamp')),
      String(t('admin.errorLogs.service')),
      String(t('admin.errorLogs.csvLevel')),
      String(t('admin.errorLogs.csvMessage')),
      String(t('admin.errorLogs.csvError')),
      String(t('admin.errorLogs.requestId')),
      String(t('admin.errorLogs.userId')),
    ];
    const rows = exportLogs.map(l => [
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
    // Honest filename: if the filtered set exceeded the cap, say so in the name
    // rather than shipping a silently-truncated file called "error-logs".
    const suffix = exportLogs.length < total ? `-first${exportLogs.length}of${total}` : '';
    link.download = `error-logs-${new Date().toISOString().split('T')[0]}${suffix}.csv`;
    link.click();
  };

  const handleCleanup = async () => {
    const ok = await confirm({
      title: String(t('admin.errorLogs.cleanupTitle')),
      description: String(t('admin.confirmDeleteOldLogs')),
      variant: 'danger',
      confirmText: String(t('admin.common.delete')),
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

  // No client-side filter or sort here on purpose: search, sort and paging are
  // all resolved by the API over the full table, so `logs` is already the
  // correct page of the correctly-ordered, correctly-filtered set. Keeping a
  // second copy of that logic here would give two writers for one ordering.

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={String(t('admin.errorLogs.kicker'))}
        title={String(t('admin.errorLogs.title'))}
        description={String(t('admin.errorLogs.subtitle'))}
        actions={
          <>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-1.5" disabled={total === 0 || exporting}>
              <Download className="w-4 h-4" />
              {String(t('admin.settlements.exportCsv'))}
            </Button>
            <Button onClick={handleCleanup} variant="outline" size="sm" className="gap-1.5">
              <Trash2 className="w-4 h-4" />
              {String(t('admin.activityLogs.deleteOldLogs'))}
            </Button>
            <Button onClick={() => loadErrorLogs()} disabled={loading} size="sm" className="gap-1.5">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {String(t('admin.header.refresh'))}
            </Button>
          </>
        }
      />

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder={String(t('admin.errorLogs.searchPlaceholder'))}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // A new search means a new result set — page 3 of the old one
                // is meaningless (and often past the end of the new one).
                setPage(0);
              }}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(value) => { setSortBy(value); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={String(t('admin.errorLogs.sortByPlaceholder'))} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at:desc">{String(t('admin.errorLogs.sortNewest'))}</SelectItem>
              <SelectItem value="created_at:asc">{String(t('admin.errorLogs.sortOldest'))}</SelectItem>
              <SelectItem value="level:desc">{String(t('admin.errorLogs.sortSeverityDesc'))}</SelectItem>
              <SelectItem value="level:asc">{String(t('admin.errorLogs.sortSeverityAsc'))}</SelectItem>
              <SelectItem value="service_name:asc">{String(t('admin.errorLogs.sortServiceAsc'))}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            {String(t('admin.errorLogs.filters'))}
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{String(t('admin.errorLogs.logLevel'))}</label>
              <Select
                value={levelFilter || "all"}
                onValueChange={(value) => {
                  setLevelFilter(value === "all" ? "" : value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={String(t('admin.errorLogs.allLevels'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{String(t('admin.errorLogs.allLevels'))}</SelectItem>
                  {logLevels.map(level => (
                    <SelectItem key={level} value={level}>{formatLogLevel(level)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{String(t('admin.errorLogs.service'))}</label>
              <Select
                value={serviceFilter || "all"}
                onValueChange={(value) => {
                  setServiceFilter(value === "all" ? "" : value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={String(t('admin.errorLogs.allServices'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{String(t('admin.errorLogs.allServices'))}</SelectItem>
                  {services.map(service => (
                    <SelectItem key={service} value={service}>{service}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{String(t('admin.errorLogs.startDate'))}</label>
              <DateInput
                value={startDate}
                onChange={(value) => {
                  setStartDate(value);
                  setPage(0);
                }}
                placeholder={String(t('admin.errorLogs.selectStartDate'))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{String(t('admin.errorLogs.endDate'))}</label>
              <DateInput
                value={endDate}
                onChange={(value) => {
                  setEndDate(value);
                  setPage(0);
                }}
                placeholder={String(t('admin.errorLogs.selectEndDate'))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Logs Table */}
      <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
        {loading ? (
          // Skeleton rows match the real log row layout for a stable feel.
          <AdminSkeleton.LogRows rows={6} />
        ) : logs.length === 0 ? (
          <AdminEmptyState icon={Bug} title={String(t('admin.errorLogs.noLogsFound'))} />
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="hover:bg-gray-50 transition-colors">
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <StatusBadge tone={levelTone(log.level)}>
                          <span className="mr-1">{getLevelIcon(log.level)}</span>
                          {formatLogLevel(log.level)}
                        </StatusBadge>
                        <span className="text-sm font-medium text-gray-700">{log.service_name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString(getDateLocale(language))}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 break-words">{log.message}</p>
                      {log.error_message && (
                        <p className="text-sm text-rose-600 mt-1 break-words">{log.error_message}</p>
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
                          <h4 className="text-xs font-medium text-gray-700 mb-1">{String(t('admin.errorLogs.stackTrace'))}</h4>
                          <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                            {log.error_stack}
                          </pre>
                        </div>
                      )}

                      {log.context && Object.keys(log.context).length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-700 mb-1">{String(t('admin.errorLogs.context'))}</h4>
                          <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                            {JSON.stringify(log.context, null, 2)}
                          </pre>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {log.user_id && (
                          <div>
                            <span className="text-gray-600">{String(t('admin.errorLogs.userId'))}:</span>
                            <span className="ml-2 text-gray-900 font-mono break-all">{log.user_id}</span>
                          </div>
                        )}
                        {log.request_id && (
                          <div>
                            <span className="text-gray-600">{String(t('admin.errorLogs.requestId'))}:</span>
                            <span className="ml-2 text-gray-900 font-mono break-all">{log.request_id}</span>
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
        {!loading && logs.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              {String(t('admin.errorLogs.showingRange', {
                from: page * pageSize + 1,
                to: Math.min((page + 1) * pageSize, total),
                total,
              }))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600">
                {String(t('admin.errorLogs.pageOf', { page: page + 1, total: totalPages }))}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
