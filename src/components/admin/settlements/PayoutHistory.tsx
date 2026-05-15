'use client'

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Search } from 'lucide-react';
import { PortOnePayout, PayoutStatus } from '@/types/subscription';
import { supabase } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/common/DateInput';
import { useDedupedToast } from '../useDedupedToast';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { useAdminFetch } from '../useAdminFetch';
import { ModalShell } from '../ModalShell';
import { AdminEmptyState } from '../AdminEmptyState';

interface PayoutHistoryProps {
  onClose: () => void;
}

export function PayoutHistory({ onClose }: PayoutHistoryProps) {
  const adminFetch = useAdminFetch();
  const { toast } = useDedupedToast();
  const { t } = useTranslation();
  const [payouts, setPayouts] = useState<PortOnePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

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

  useEffect(() => {
    loadPayouts();
  }, [page, filters]);

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

      const response = await adminFetch(`/api/admin/settlements/payouts?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch payouts');
      }

      const data = await response.json();

      // Filter by academy name if specified
      let filteredItems = data.items || [];
      if (filters.academyName) {
        filteredItems = filteredItems.filter((p: PortOnePayout) =>
          p.academyName?.toLowerCase().includes(filters.academyName.toLowerCase())
        );
      }

      setPayouts(filteredItems);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Error loading payouts:', error);
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
      SCHEDULED:  { tone: 'info',    label: 'Scheduled' },
      PROCESSING: { tone: 'pending', label: 'Processing' },
      SUCCEEDED:  { tone: 'active',  label: 'Succeeded' },
      FAILED:     { tone: 'danger',  label: 'Failed' },
      CANCELED:   { tone: 'muted',   label: 'Canceled' },
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
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ModalShell
      onClose={onClose}
      title="Payout History"
      description="Track bank transfer payouts to academies"
      className="!max-w-6xl"
      bodyClassName="p-0"
      footer={totalCount > 20 ? (
        <div className="w-full flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {page * 20 + 1} to {Math.min((page + 1) * 20, totalCount)} of {totalCount} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * 20 >= totalCount}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      ) : undefined}
    >
      <div className="flex flex-col h-full">
        {/* Filters */}
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Academy Name
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  type="text"
                  value={filters.academyName}
                  onChange={(e) => setFilters({ ...filters, academyName: e.target.value })}
                  placeholder="Search academy..."
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value as PayoutStatus | 'all' })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="SUCCEEDED">Succeeded</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="CANCELED">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <DateInput
                value={filters.dateFrom}
                onChange={(value) => setFilters({ ...filters, dateFrom: value })}
                placeholder="Select start date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <DateInput
                value={filters.dateTo}
                onChange={(value) => setFilters({ ...filters, dateTo: value })}
                placeholder="Select end date"
              />
            </div>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="flex-1 overflow-y-auto">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/60 border-b border-gray-200/70">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                  Payout ID
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                  Academy
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                  Bank Account
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                  Scheduled At
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                  Payout At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading payouts...
                  </td>
                </tr>
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <AdminEmptyState icon={Search} title="No payouts found" compact />
                  </td>
                </tr>
              ) : (
                payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payout.id.substring(0, 12)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payout.academyName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payout.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(payout.amount, payout.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payout.account ? (
                        <div>
                          <div>{payout.account.bank}</div>
                          <div className="text-xs text-gray-500">{payout.account.accountNumber}</div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payout.scheduledAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
    </ModalShell>
  );
}
