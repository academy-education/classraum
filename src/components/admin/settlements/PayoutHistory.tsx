'use client'

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { getDateLocale } from '@/utils/dateUtils';
import { Search, AlertTriangle, RefreshCw } from 'lucide-react';
import { PortOnePayout, PayoutStatus } from '@/types/subscription';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/common/DateInput';
import { useDedupedToast } from '../useDedupedToast';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { useAdminFetch } from '../useAdminFetch';
import { ModalShell } from '../ModalShell';
import { AdminEmptyState } from '../AdminEmptyState';
import { useDebouncedValue } from '../useDebouncedValue';

interface PayoutHistoryProps {
  /** Overlay mode only. Ignored when `inline`. */
  onClose?: () => void;
  /** Render as a page view (the settlements view switch) instead of a modal. */
  inline?: boolean;
}

export function PayoutHistory({ onClose, inline = false }: PayoutHistoryProps) {
  const adminFetch = useAdminFetch();
  const { toast } = useDedupedToast();
  const { t, language } = useTranslation();
  const [payouts, setPayouts] = useState<PortOnePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  // Upstream failure vs. genuinely-no-payouts are different screens.
  const [loadError, setLoadError] = useState<string | null>(null);

  // Calculate default date range (last 30 days)
  const getDefaultDateRange = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return {
      from: thirtyDaysAgo.toISOString().split('T')[0], // Format: YYYY-MM-DD
      to: today.toISOString().split('T')[0],
    };
  };

  const defaultDates = getDefaultDateRange();

  const [filters, setFilters] = useState({
    academyName: '',
    status: 'all' as PayoutStatus | 'all',
    dateFrom: defaultDates.from,
    dateTo: defaultDates.to,
  });

  // The academy search is server-side now, so debounce it: one PortOne call
  // per pause, not one per keystroke.
  const debouncedAcademy = useDebouncedValue(filters.academyName, 400);

  // Any change to the filter criteria puts you back on page 1 — otherwise a
  // search run from page 3 lands on a page the filtered set may not have.
  useEffect(() => {
    setPage(0);
  }, [filters.status, filters.dateFrom, filters.dateTo, debouncedAcademy]);

  useEffect(() => {
    loadPayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.status, filters.dateFrom, filters.dateTo, debouncedAcademy]);

  const loadPayouts = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
      });

      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.dateFrom) {
        params.append('from', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('to', filters.dateTo);
      }
      // Academy-name search is resolved SERVER-SIDE (name -> PortOne partner
      // ids) so it spans every page and totalCount stays consistent with the
      // rows. The old client-side .filter() only searched the loaded 20.
      if (debouncedAcademy.trim()) {
        params.append('academyName', debouncedAcademy.trim());
      }

      setLoadError(null);

      const response = await adminFetch(`/api/admin/settlements/payouts?${params.toString()}`);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.message || String(t('admin.settlements.failedToFetchPayouts')));
      }

      const data = await response.json();

      setPayouts(data.items || []);
      // Route normalises PortOne's `page.totalCount` to `totalCount`; the
      // fallback covers a raw upstream envelope.
      setTotalCount(data.totalCount ?? data.page?.totalCount ?? 0);
    } catch (error) {
      console.error('Error loading payouts:', error);
      setPayouts([]);
      setTotalCount(0);
      setLoadError(
        error instanceof Error ? error.message : String(t('admin.settlements.failedToFetchPayouts'))
      );
      toast({ title: String(t('admin.failedToLoadPayouts')), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: PayoutStatus) => {
    // Lifecycle: scheduled (info) → processing (pending) → succeeded (active)
    // / failed (danger) / canceled (muted). Same vocabulary as the parent
    // SettlementManagement page for visual continuity across the two screens.
    const statusConfig: Record<PayoutStatus, { tone: StatusTone; label: string }> = {
      SCHEDULED:  { tone: 'info',    label: String(t('admin.settlements.statuses.scheduled')) },
      PROCESSING: { tone: 'pending', label: String(t('admin.settlements.statuses.processing')) },
      SUCCEEDED:  { tone: 'active',  label: String(t('admin.settlements.statuses.succeeded')) },
      FAILED:     { tone: 'danger',  label: String(t('admin.settlements.failed')) },
      CANCELED:   { tone: 'muted',   label: String(t('admin.settlements.statuses.canceled')) },
    };
    const config = statusConfig[status] || { tone: 'muted' as StatusTone, label: status };
    return <StatusBadge tone={config.tone}>{config.label}</StatusBadge>;
  };

  const formatCurrency = (amount: number, currency: string = 'KRW') => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(getDateLocale(language), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const footerNode = totalCount > 20 ? (
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-gray-700">
            {String(t('admin.settlements.showingResults', { from: page * 20 + 1, to: Math.min((page + 1) * 20, totalCount), total: totalCount }))}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              variant="outline"
              size="sm"
            >
              {String(t('admin.common.previous'))}
            </Button>
            <Button
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * 20 >= totalCount}
              variant="outline"
              size="sm"
            >
              {String(t('admin.common.next'))}
            </Button>
          </div>
        </div>
  ) : undefined;

  const bodyNode = (
      <div className="flex flex-col h-full">
        {/* Filters */}
        <div className="px-6 py-4 bg-white border-b border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {String(t('admin.settlements.academyNameLabel'))}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  type="text"
                  value={filters.academyName}
                  onChange={(e) => setFilters({ ...filters, academyName: e.target.value })}
                  placeholder={String(t('admin.settlements.searchAcademyPlaceholder'))}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {String(t('admin.settlements.statusLabel'))}
              </label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value as PayoutStatus | 'all' })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={String(t('admin.settlements.allStatuses'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{String(t('admin.settlements.allStatuses'))}</SelectItem>
                  <SelectItem value="SCHEDULED">{String(t('admin.settlements.statuses.scheduled'))}</SelectItem>
                  <SelectItem value="PROCESSING">{String(t('admin.settlements.statuses.inProcess'))}</SelectItem>
                  <SelectItem value="SUCCEEDED">{String(t('admin.settlements.statuses.paidOut'))}</SelectItem>
                  <SelectItem value="FAILED">{String(t('admin.settlements.failed'))}</SelectItem>
                  <SelectItem value="CANCELED">{String(t('admin.settlements.statuses.canceled'))}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {String(t('admin.settlements.fromDateLabel'))}
              </label>
              <DateInput
                value={filters.dateFrom}
                onChange={(value) => setFilters({ ...filters, dateFrom: value })}
                placeholder={String(t('admin.settlements.selectStartDate'))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {String(t('admin.settlements.toDateLabel'))}
              </label>
              <DateInput
                value={filters.dateTo}
                onChange={(value) => setFilters({ ...filters, dateTo: value })}
                placeholder={String(t('admin.settlements.selectEndDate'))}
              />
            </div>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="flex-1 overflow-y-auto">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-[0.1em]">
                  {String(t('admin.settlements.payoutId'))}
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-[0.1em]">
                  {String(t('admin.settlements.academy'))}
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-[0.1em]">
                  {String(t('admin.settlements.status'))}
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-[0.1em]">
                  {String(t('admin.settlements.amount'))}
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-[0.1em]">
                  {String(t('admin.settlements.bankAccount'))}
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-[0.1em]">
                  {String(t('admin.settlements.scheduledAt'))}
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-[0.1em]">
                  {String(t('admin.settlements.payoutAt'))}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    {String(t('admin.settlements.loadingPayouts'))}
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                      <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-red-700">
                          {String(t('admin.settlements.payoutLoadErrorTitle'))}
                        </p>
                        <p className="mt-1 text-sm text-gray-500 max-w-md">
                          {String(t('admin.settlements.payoutLoadErrorDesc'))}
                        </p>
                        <p className="mt-1 text-xs text-gray-400 break-all">{loadError}</p>
                      </div>
                      <Button onClick={() => loadPayouts()} variant="outline" size="sm" className="gap-1.5">
                        <RefreshCw className="w-4 h-4" />
                        {String(t('admin.settlements.loadErrorRetry'))}
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <AdminEmptyState icon={Search} title={String(t('admin.settlements.noPayoutsFound'))} compact />
                  </td>
                </tr>
              ) : (
                payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payout.id.substring(0, 12)}...
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payout.academyName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(payout.status)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(payout.amount, payout.currency)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payout.account ? (
                        <div>
                          <div>{payout.account.bank}</div>
                          <div className="text-xs text-gray-500">{payout.account.accountNumber}</div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payout.scheduledAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payout.payoutAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

      </div>
  );

  /**
   * Inline mode — the settlements page renders this INSTEAD of its own
   * table when the view switch is on "Payouts", rather than opening an
   * overlay on top of it. Two tables and two four-field filter rows on the
   * same screen (one of them dimmed behind a scrim) was the defect: the
   * page read as if it had appended a second, near-identical section.
   *
   * The modal path is kept because nothing else about ModalShell is wrong;
   * it just is not the right shape for what is really a second view of the
   * same page.
   */
  if (inline) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
        {bodyNode}
        {footerNode ? (
          <div className="px-6 py-4 border-t border-gray-100">{footerNode}</div>
        ) : null}
      </div>
    );
  }

  return (
    <ModalShell
      onClose={onClose ?? (() => {})}
      title={String(t('admin.settlements.payoutHistory'))}
      description={String(t('admin.settlements.payoutHistoryDesc'))}
      className="!max-w-6xl"
      bodyClassName="p-0"
      footer={footerNode}
    >
      {bodyNode}
    </ModalShell>
  );
}
