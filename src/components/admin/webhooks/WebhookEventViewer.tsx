'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
import { useAdminFetch } from '../useAdminFetch';
import { AdminSkeleton } from '../AdminSkeleton';
import { DashboardCard } from '../DashboardCard';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { useUrlState } from '../useUrlState';
import { AdminEmptyState } from '../AdminEmptyState';
import { usePolling } from '../usePolling';

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
  const { t } = useTranslation();
  const adminFetch = useAdminFetch();
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState({
    total: 0,
    processed: 0,
    unprocessed: 0,
    errors: 0
  });

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [processedFilter, setProcessedFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Expanded event details
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  useEffect(() => {
    loadWebhookEvents();
  }, [page, typeFilter, eventTypeFilter, statusFilter, processedFilter, startDate, endDate]);

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

  // Export the currently-sorted page of events as CSV. Uses sortedEvents
  // (vs raw events) so the file matches what's on screen.
  const exportToCSV = () => {
    if (sortedEvents.length === 0) return;
    const headers = ['Received', 'Type', 'Event', 'Status', 'Processed', 'Entity ID', 'Partner ID', 'Amount', 'Currency', 'Webhook ID', 'Error'];
    const rows = sortedEvents.map(e => [
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

  const filteredEvents = searchQuery
    ? events.filter(event =>
        event.entity_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.partner_id && event.partner_id.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : events;

  // Sort dropdown — list view uses cards rather than a table.
  const [sortBy, setSortBy] = useUrlState('sort', 'received_at:desc');
  const sortedEvents = React.useMemo(() => {
    const [key, dir] = sortBy.split(':');
    const sign = dir === 'asc' ? 1 : -1;
    return [...filteredEvents].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (key) {
        case 'received_at':
          av = new Date(a.received_at).getTime();
          bv = new Date(b.received_at).getTime();
          break;
        case 'amount':
          av = a.amount ?? -Infinity;
          bv = b.amount ?? -Infinity;
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
        case 'event_type':
          av = a.event_type;
          bv = b.event_type;
          break;
        case 'processed':
          av = a.processed ? 1 : 0;
          bv = b.processed ? 1 : 0;
          break;
      }
      if (typeof av === 'number' && typeof bv === 'number') return sign * (av - bv);
      return sign * String(av).localeCompare(String(bv));
    });
  }, [filteredEvents, sortBy]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={String(t('admin.webhooks.kicker'))}
        title={String(t('admin.webhooks.title'))}
        description={String(t('admin.webhooks.subtitle'))}
        actions={
          <>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-1.5" disabled={sortedEvents.length === 0}>
              <Download className="w-4 h-4" />
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
          value={statistics.processed.toLocaleString()}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="emerald"
        />
        <DashboardCard
          title={String(t('admin.webhooks.pending'))}
          value={statistics.unprocessed.toLocaleString()}
          icon={<Clock className="w-5 h-5" />}
          accent="amber"
        />
        <DashboardCard
          title={String(t('admin.webhooks.failed'))}
          value={statistics.errors.toLocaleString()}
          icon={<XCircle className="w-5 h-5" />}
          accent="rose"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl ring-1 ring-gray-200/70">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by entity ID, event type, or partner ID..."
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
              <SelectItem value="received_at:desc">Newest first</SelectItem>
              <SelectItem value="received_at:asc">Oldest first</SelectItem>
              <SelectItem value="amount:desc">Amount (high → low)</SelectItem>
              <SelectItem value="amount:asc">Amount (low → high)</SelectItem>
              <SelectItem value="status:asc">Status (A → Z)</SelectItem>
              <SelectItem value="event_type:asc">Event type (A → Z)</SelectItem>
              <SelectItem value="processed:asc">Unprocessed first</SelectItem>
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
          <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <Select
                value={typeFilter || "all"}
                onValueChange={(value) => {
                  setTypeFilter(value === "all" ? "" : value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {webhookTypes.map(type => (
                    <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
              <Select
                value={eventTypeFilter || "all"}
                onValueChange={(value) => {
                  setEventTypeFilter(value === "all" ? "" : value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {eventTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Processed</label>
              <Select
                value={processedFilter || "all"}
                onValueChange={(value) => {
                  setProcessedFilter(value === "all" ? "" : value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Processed</SelectItem>
                  <SelectItem value="false">Unprocessed</SelectItem>
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

      {/* Events List */}
      <div className="bg-white rounded-xl ring-1 ring-gray-200/70 overflow-hidden">
        {loading ? (
          <AdminSkeleton.LogRows rows={6} />
        ) : sortedEvents.length === 0 ? (
          <AdminEmptyState icon={Webhook} title="No webhook events found" />
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedEvents.map((event) => (
              <div key={event.id} className="hover:bg-gray-50 transition-colors">
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge tone="violet" size="sm">{event.type}</StatusBadge>
                        <StatusBadge tone={eventStatusTone(event.status)} size="sm">{event.status}</StatusBadge>
                        {event.processed ? (
                          <StatusBadge tone="active" icon={CheckCircle2} size="sm">Processed</StatusBadge>
                        ) : (
                          <StatusBadge tone="pending" icon={Clock} size="sm">Pending</StatusBadge>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(event.received_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Event:</span>
                          <span className="ml-2 font-medium text-gray-900">{event.event_type}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Entity ID:</span>
                          <span className="ml-2 font-mono text-xs text-gray-900">{event.entity_id}</span>
                        </div>
                        {event.amount && (
                          <div>
                            <span className="text-gray-600">Amount:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {formatCurrency(event.amount, event.currency)}
                            </span>
                          </div>
                        )}
                      </div>

                      {event.error_message && (
                        <div className="mt-2 flex items-start gap-2 text-sm text-rose-600">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{event.error_message}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProcessed(event.id, event.processed);
                        }}
                        className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Mark as {event.processed ? 'Unprocessed' : 'Processed'}
                      </button>
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
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {event.partner_id && (
                          <div>
                            <span className="text-gray-600">Partner ID:</span>
                            <span className="ml-2 text-gray-900 font-mono text-xs">{event.partner_id}</span>
                          </div>
                        )}
                        {event.webhook_id && (
                          <div>
                            <span className="text-gray-600">Webhook ID:</span>
                            <span className="ml-2 text-gray-900 font-mono text-xs">{event.webhook_id}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">Event Time:</span>
                          <span className="ml-2 text-gray-900">{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Received At:</span>
                          <span className="ml-2 text-gray-900">{new Date(event.received_at).toLocaleString()}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-medium text-gray-700 mb-1">Raw Webhook Data</h4>
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
        {!loading && sortedEvents.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} events
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
