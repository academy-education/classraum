'use client'

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/supabase';
import {
  Webhook,
  Filter,
  Download,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateInput } from '@/components/ui/common/DateInput';
import { AdminPageHeader } from '../AdminPageHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { getDateLocale } from '@/utils/dateUtils';
import { useAdminFetch } from '../useAdminFetch';
import { AdminSkeleton } from '../AdminSkeleton';
import { DashboardCard } from '../DashboardCard';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { useUrlState } from '../useUrlState';
import { AdminEmptyState } from '../AdminEmptyState';
import { usePolling } from '../usePolling';
import { useDebouncedValue } from '../useDebouncedValue';

interface WebhookEvent {
  id: string;
  type: string;
  event_type: string;
  entity_id: string;
  partner_id: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
  timestamp: string;
  received_at: string;
  processed: boolean;
  error_message: string | null;
  raw_data: any;
  webhook_id: string | null;
}

const webhookTypes = ['settlement', 'payout'];

export function WebhookEventViewer() {
  const { t, language } = useTranslation();
  const adminFetch = useAdminFetch();
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  // A partition of the filtered set, computed server-side: the three buckets
  // are mutually exclusive and always sum to `total`. See the API route for
  // why the previous processed/unprocessed/errors triple could not.
  const [statistics, setStatistics] = useState({
    total: 0,
    succeeded: 0,
    pending: 0,
    failed: 0
  });

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [processedFilter, setProcessedFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // Debounced copy is what actually goes to the API — the search is a real
  // server round trip now, not a .filter() over the loaded page.
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sort dropdown — list view uses cards rather than a table. The key is sent
  // to the API and whitelisted there, so the ordering covers the whole
  // filtered set instead of re-ordering the 50 rows already in hand.
  const [sortBy, setSortBy] = useUrlState('sort', 'received_at:desc');

  // Expanded event details
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  useEffect(() => {
    loadWebhookEvents();
  }, [page, typeFilter, eventTypeFilter, statusFilter, processedFilter, startDate, endDate, debouncedSearch, sortBy]);

  // Auto-refresh every 60s while the tab is visible. Webhook events come in
  // unpredictably (settlements, payouts) and admins shouldn't have to F5
  // to see them. Visibility-aware so background tabs don't keep polling.
  // `silent` skips the loading=true flash so background polls don't blank
  // the list out and back in every minute.
  usePolling(() => loadWebhookEvents({ silent: true }), { intervalMs: 60_000 });

  const loadWebhookEvents = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      if (typeFilter) params.append('type', typeFilter);
      if (eventTypeFilter) params.append('eventType', eventTypeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (processedFilter) params.append('processed', processedFilter);
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (sortBy) params.append('sort', sortBy);

      const response = await adminFetch(`/api/admin/webhook-events?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch webhook events');
      }

      const result = await response.json();

      if (result.success) {
        setEvents(result.data);
        setEventTypes(result.eventTypes);
        setStatistics(result.statistics);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (error) {
      console.error('[Webhook Events] Error loading events:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Maximum rows one CSV export will pull. The API caps pageSize at the same
  // number, so this is the real ceiling either way.
  const CSV_MAX_ROWS = 5000;
  const [exporting, setExporting] = useState(false);

  // Export the WHOLE filtered set as CSV.
  //
  // This used to serialise the client-side sorted array — the 50 rows the
  // client happened to hold — while the footer directly below the button
  // announced the full total, so "export" quietly meant "export page 1". It
  // now re-fetches with the same filters/search/sort at a capped pageSize and
  // writes that.
  const exportToCSV = async () => {
    if (total === 0 || exporting) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({
        page: '0',
        pageSize: String(CSV_MAX_ROWS),
      });
      if (typeFilter) params.append('type', typeFilter);
      if (eventTypeFilter) params.append('eventType', eventTypeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (processedFilter) params.append('processed', processedFilter);
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (sortBy) params.append('sort', sortBy);

      const response = await adminFetch(`/api/admin/webhook-events?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch webhook events for export');
      const result = await response.json();
      const rowsToExport: WebhookEvent[] = result?.data ?? [];
      if (rowsToExport.length === 0) return;

      const headers = [
        String(t('admin.webhooks.receivedAt')),
        String(t('admin.webhooks.type')),
        String(t('admin.webhooks.event')),
        String(t('admin.common.status')),
        String(t('admin.webhooks.processed')),
        String(t('admin.webhooks.entityId')),
        String(t('admin.webhooks.partnerId')),
        String(t('admin.webhooks.amount')),
        String(t('admin.webhooks.currency')),
        String(t('admin.webhooks.webhookId')),
        String(t('admin.webhooks.error')),
      ];
      const rows = rowsToExport.map(e => [
        new Date(e.received_at).toISOString(),
        e.type,
        e.event_type,
        e.status,
        e.processed ? 'yes' : 'no',
        e.entity_id,
        e.partner_id || '',
        e.amount ?? '',
        e.currency || '',
        e.webhook_id || '',
        e.error_message || '',
      ]);
      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `webhook-events-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (error) {
      console.error('[Webhook Events] Error exporting CSV:', error);
    } finally {
      setExporting(false);
    }
  };

  const toggleProcessed = async (eventId: string, currentStatus: boolean) => {
    try {

      const response = await adminFetch('/api/admin/webhook-events', { method: 'POST',
        body: JSON.stringify({
          id: eventId,
          markProcessed: !currentStatus
        }) });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }

      loadWebhookEvents();
    } catch (error) {
      console.error('[Webhook Events] Error updating event:', error);
    }
  };

  // Map webhook event status → semantic tone for the shared StatusBadge.
  const eventStatusTone = (status: string): StatusTone => {
    switch (status.toLowerCase()) {
      case 'succeeded':
      case 'settled':
      case 'completed':
        return 'active';
      case 'pending':
      case 'scheduled':
        return 'pending';
      case 'failed':
      case 'cancelled':
        return 'danger';
      default:
        return 'muted';
    }
  };

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (amount === null) return '-';
    const currencySymbol = currency === 'KRW' ? '₩' : currency || '';
    return `${currencySymbol}${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={String(t('admin.webhooks.kicker'))}
        title={String(t('admin.webhooks.title'))}
        description={String(t('admin.webhooks.subtitle'))}
        actions={
          <>
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={total === 0 || exporting}
              title={String(t('admin.webhooks.exportCsvHint', { max: CSV_MAX_ROWS.toLocaleString() }))}
            >
              <Download className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
              {String(t('admin.settlements.exportCsv'))}
            </Button>
            <Button onClick={() => loadWebhookEvents()} disabled={loading} size="sm" className="gap-1.5">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {String(t('admin.header.refresh'))}
            </Button>
          </>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title={String(t('admin.webhooks.totalEvents'))}
          value={statistics.total.toLocaleString()}
          icon={<Webhook className="w-5 h-5" />}
          accent="blue"
        />
        <DashboardCard
          title={String(t('admin.webhooks.succeeded'))}
          value={statistics.succeeded.toLocaleString()}
          subtitle={String(t('admin.webhooks.succeededHint'))}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="emerald"
        />
        <DashboardCard
          title={String(t('admin.webhooks.pending'))}
          value={statistics.pending.toLocaleString()}
          subtitle={String(t('admin.webhooks.pendingHint'))}
          icon={<Clock className="w-5 h-5" />}
          accent="amber"
        />
        <DashboardCard
          title={String(t('admin.webhooks.failed'))}
          value={statistics.failed.toLocaleString()}
          subtitle={String(t('admin.webhooks.failedHint'))}
          icon={<XCircle className="w-5 h-5" />}
          accent="rose"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder={String(t('admin.webhooks.searchPlaceholder'))}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={String(t('admin.webhooks.sortBy'))} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="received_at:desc">{String(t('admin.webhooks.sortNewest'))}</SelectItem>
              <SelectItem value="received_at:asc">{String(t('admin.webhooks.sortOldest'))}</SelectItem>
              <SelectItem value="amount:desc">{String(t('admin.webhooks.sortAmountDesc'))}</SelectItem>
              <SelectItem value="amount:asc">{String(t('admin.webhooks.sortAmountAsc'))}</SelectItem>
              <SelectItem value="status:asc">{String(t('admin.webhooks.sortStatusAsc'))}</SelectItem>
              <SelectItem value="event_type:asc">{String(t('admin.webhooks.sortEventTypeAsc'))}</SelectItem>
              <SelectItem value="processed:asc">{String(t('admin.webhooks.sortUnprocessed'))}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            {String(t('admin.common.filter'))}
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{String(t('admin.webhooks.type'))}</label>
              <Select
                value={typeFilter || "all"}
                onValueChange={(value) => {
                  setTypeFilter(value === "all" ? "" : value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={String(t('admin.webhooks.allTypes'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{String(t('admin.webhooks.allTypes'))}</SelectItem>
                  {webhookTypes.map(type => (
                    <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{String(t('admin.webhooks.eventType'))}</label>
              <Select
                value={eventTypeFilter || "all"}
                onValueChange={(value) => {
                  setEventTypeFilter(value === "all" ? "" : value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={String(t('admin.webhooks.allEvents'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{String(t('admin.webhooks.allEvents'))}</SelectItem>
                  {eventTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{String(t('admin.webhooks.processed'))}</label>
              <Select
                value={processedFilter || "all"}
                onValueChange={(value) => {
                  setProcessedFilter(value === "all" ? "" : value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={String(t('admin.common.all'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{String(t('admin.common.all'))}</SelectItem>
                  <SelectItem value="true">{String(t('admin.webhooks.processed'))}</SelectItem>
                  <SelectItem value="false">{String(t('admin.webhooks.unprocessed'))}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{String(t('admin.webhooks.startDate'))}</label>
              <DateInput
                value={startDate}
                onChange={(value) => {
                  setStartDate(value);
                  setPage(0);
                }}
                placeholder={String(t('admin.webhooks.selectStartDate'))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{String(t('admin.webhooks.endDate'))}</label>
              <DateInput
                value={endDate}
                onChange={(value) => {
                  setEndDate(value);
                  setPage(0);
                }}
                placeholder={String(t('admin.webhooks.selectEndDate'))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Events List */}
      <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
        {loading ? (
          <AdminSkeleton.LogRows rows={6} />
        ) : events.length === 0 ? (
          <AdminEmptyState icon={Webhook} title={String(t('admin.webhooks.noEventsFound'))} />
        ) : (
          <div className="divide-y divide-gray-100">
            {events.map((event) => (
              <div key={event.id} className="hover:bg-gray-50 transition-colors">
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <StatusBadge tone="violet" size="sm">{event.type}</StatusBadge>
                        <StatusBadge tone={eventStatusTone(event.status)} size="sm">{event.status}</StatusBadge>
                        {event.processed ? (
                          <StatusBadge tone="active" icon={CheckCircle2} size="sm">{String(t('admin.webhooks.processed'))}</StatusBadge>
                        ) : (
                          <StatusBadge tone="pending" icon={Clock} size="sm">{String(t('admin.webhooks.pending'))}</StatusBadge>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(event.received_at).toLocaleString(getDateLocale(language))}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">{String(t('admin.webhooks.event'))}:</span>
                          <span className="ml-2 font-medium text-gray-900 break-all">{event.event_type}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">{String(t('admin.webhooks.entityId'))}:</span>
                          <span className="ml-2 font-mono text-xs text-gray-900 break-all">{event.entity_id}</span>
                        </div>
                        {event.amount && (
                          <div>
                            <span className="text-gray-600">{String(t('admin.webhooks.amount'))}:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {formatCurrency(event.amount, event.currency)}
                            </span>
                          </div>
                        )}
                      </div>

                      {event.error_message && (
                        <div className="mt-2 flex items-start gap-2 text-sm text-rose-600">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="break-words min-w-0">{event.error_message}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProcessed(event.id, event.processed);
                        }}
                      >
                        {event.processed ? String(t('admin.webhooks.markAsUnprocessed')) : String(t('admin.webhooks.markAsProcessed'))}
                      </Button>
                      {expandedEventId === event.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedEventId === event.id && (
                  <div className="px-4 pb-4 bg-gray-50">
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {event.partner_id && (
                          <div>
                            <span className="text-gray-600">{String(t('admin.webhooks.partnerId'))}:</span>
                            <span className="ml-2 text-gray-900 font-mono text-xs break-all">{event.partner_id}</span>
                          </div>
                        )}
                        {event.webhook_id && (
                          <div>
                            <span className="text-gray-600">{String(t('admin.webhooks.webhookId'))}:</span>
                            <span className="ml-2 text-gray-900 font-mono text-xs break-all">{event.webhook_id}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">{String(t('admin.webhooks.eventTime'))}:</span>
                          <span className="ml-2 text-gray-900">{new Date(event.timestamp).toLocaleString(getDateLocale(language))}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">{String(t('admin.webhooks.receivedAt'))}:</span>
                          <span className="ml-2 text-gray-900">{new Date(event.received_at).toLocaleString(getDateLocale(language))}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-medium text-gray-700 mb-1">{String(t('admin.webhooks.rawWebhookData'))}</h4>
                        <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                          {JSON.stringify(event.raw_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && events.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              {String(t('admin.webhooks.showingEvents', {
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
                {String(t('admin.common.page'))} {page + 1} {String(t('admin.common.of'))} {totalPages}
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
