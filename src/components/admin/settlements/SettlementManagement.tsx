'use client'

import React, { useState, useEffect } from 'react';
import { Search, Download, Eye, Calendar } from 'lucide-react';
import { AdminPageHeader } from '../AdminPageHeader';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { AdminSkeleton } from '../AdminSkeleton';
import { useAdminFetch } from '../useAdminFetch';
import { useLiveAnnounce } from '../useLiveAnnounce';
import { useTableSort } from '../useTableSort';
import { SortableTh } from '../SortableTh';
import { PortOneSettlement, SettlementStatus } from '@/types/subscription';
import { SettlementDetailModal } from './SettlementDetailModal';
import { PayoutHistory } from './PayoutHistory';
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
import { Button } from '@/components/ui/button';
import { useDedupedToast } from '../useDedupedToast';
import { useTranslation } from '@/hooks/useTranslation';
import { getDateLocale } from '@/utils/dateUtils';
import { AdminEmptyState } from '../AdminEmptyState';

interface Filters {
  academyName: string;
  status: SettlementStatus | 'all';
  dateFrom: string;
  dateTo: string;
}

export function SettlementManagement() {
  const { toast } = useDedupedToast();
  const { t, language } = useTranslation();
  const adminFetch = useAdminFetch();
  const { announce, LiveRegion } = useLiveAnnounce();
  const [settlements, setSettlements] = useState<PortOneSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState<PortOneSettlement | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPayoutHistory, setShowPayoutHistory] = useState(false);
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

  const [filters, setFilters] = useState<Filters>({
    academyName: '',
    status: 'all',
    dateFrom: defaultDates.from,
    dateTo: defaultDates.to,
  });

  useEffect(() => {
    loadSettlements();
  }, [page, filters]);

  const loadSettlements = async () => {
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

      const response = await adminFetch(`/api/admin/settlements?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch settlements');
      }

      const data = await response.json();

      // Show friendly message if API not configured or no data
      if (data.message) {
      }

      // Filter by academy name if specified
      let filteredItems = data.items || [];
      if (filters.academyName) {
        filteredItems = filteredItems.filter((s: PortOneSettlement) =>
          s.academyName?.toLowerCase().includes(filters.academyName.toLowerCase())
        );
      }

      setSettlements(filteredItems);
      announce(`Loaded ${filteredItems.length} settlements.`);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Error loading settlements:', error);
      // Set empty data instead of showing alert
      setSettlements([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: SettlementStatus) => {
    // Maps PortOne settlement states → semantic tones in the shared StatusBadge.
    // Lifecycle reads left → right: scheduled → in process → settled → paid out.
    const statusConfig: Record<SettlementStatus, { tone: StatusTone; label: string }> = {
      SCHEDULED:        { tone: 'info',    label: 'Scheduled' },
      IN_PROCESS:       { tone: 'pending', label: 'In Process' },
      SETTLED:          { tone: 'brand',   label: 'Settled' },
      PAYOUT_SCHEDULED: { tone: 'violet',  label: 'Payout Scheduled' },
      PAID_OUT:         { tone: 'active',  label: 'Paid Out' },
      CANCELED:         { tone: 'danger',  label: 'Canceled' },
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(getDateLocale(language), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleExportCSV = () => {
    // Prepare CSV data
    const csvRows = [
      ['Settlement ID', 'Academy', 'Type', 'Status', 'Order Amount', 'Settlement Amount', 'Settlement Date'].join(','),
      ...settlements.map(s =>
        [
          s.id,
          s.academyName || 'Unknown',
          s.type,
          s.status,
          s.amount.order,
          s.amount.settlement,
          s.settlementDate,
        ].join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `settlements_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Sort settlements via the shared hook (key + dir sync to URL).
  const { toggle: toggleSort, sortIndicator, sorted: sortedSettlements } = useTableSort(
    settlements,
    {
      defaultKey: '', defaultDir: '',
      getValue: (s, key) => {
        switch (key) {
          case 'id':              return s.id
          case 'academy':         return s.academyName || ''
          case 'type':            return s.type
          case 'status':          return s.status
          case 'orderAmount':     return s.amount.order
          case 'settlementAmount':return s.amount.settlement
          case 'settlementDate':  return new Date(s.settlementDate)
          default: return null
        }
      },
    },
  )

  const handleViewDetails = (settlement: PortOneSettlement) => {
    setSelectedSettlement(settlement);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={String(t('admin.settlements.kicker'))}
        title={String(t('admin.settlements.title'))}
        description={String(t('admin.settlements.subtitle'))}
        actions={
          <>
            <Button onClick={() => setShowPayoutHistory(true)} variant="outline" size="sm" className="gap-1.5">
              <Calendar className="w-4 h-4" />
              {String(t('admin.settlements.payoutHistory'))}
            </Button>
            <Button onClick={handleExportCSV} size="sm" className="gap-1.5">
              <Download className="w-4 h-4" />
              {String(t('admin.settlements.exportCsv'))}
            </Button>
          </>
        }
      />
      <LiveRegion />

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 ring-1 ring-gray-200/70">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              onValueChange={(value) => setFilters({ ...filters, status: value as SettlementStatus | 'all' })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={String(t('admin.settlements.allStatuses'))} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{String(t('admin.settlements.allStatuses'))}</SelectItem>
                <SelectItem value="SCHEDULED">{String(t('admin.settlements.statuses.scheduled'))}</SelectItem>
                <SelectItem value="IN_PROCESS">{String(t('admin.settlements.statuses.inProcess'))}</SelectItem>
                <SelectItem value="SETTLED">{String(t('admin.settlements.statuses.settled'))}</SelectItem>
                <SelectItem value="PAYOUT_SCHEDULED">{String(t('admin.settlements.statuses.payoutScheduled'))}</SelectItem>
                <SelectItem value="PAID_OUT">{String(t('admin.settlements.statuses.paidOut'))}</SelectItem>
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

      {/* Settlements Table */}
      <div className="bg-white rounded-xl ring-1 ring-gray-200/70 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/60 border-b border-gray-200/70">
              <tr>
                <SortableTh sortKey="id" toggle={toggleSort} indicator={sortIndicator('id')}>Settlement ID</SortableTh>
                <SortableTh sortKey="academy" toggle={toggleSort} indicator={sortIndicator('academy')}>Academy</SortableTh>
                <SortableTh sortKey="type" toggle={toggleSort} indicator={sortIndicator('type')}>Type</SortableTh>
                <SortableTh sortKey="status" toggle={toggleSort} indicator={sortIndicator('status')}>Status</SortableTh>
                <SortableTh sortKey="orderAmount" toggle={toggleSort} indicator={sortIndicator('orderAmount')} align="right">Order Amount</SortableTh>
                <SortableTh sortKey="settlementAmount" toggle={toggleSort} indicator={sortIndicator('settlementAmount')} align="right">Settlement Amount</SortableTh>
                <SortableTh sortKey="settlementDate" toggle={toggleSort} indicator={sortIndicator('settlementDate')}>Settlement Date</SortableTh>
                <th className="px-6 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                // Skeleton rows match the real row height for a stable layout
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    {Array.from({ length: 8 }).map((_, c) => (
                      <td key={c} className="px-6 py-4">
                        <AdminSkeleton.Bar className="h-3.5 w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : settlements.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <AdminEmptyState
                      icon={Search}
                      title={String(t('admin.settlements.noSettlementsFound'))}
                      description="No settlements match your current filters. Try widening the date range or clearing filters."
                      compact
                    />
                  </td>
                </tr>
              ) : (
                sortedSettlements.map((settlement) => (
                  <tr key={settlement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {settlement.id.substring(0, 12)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {settlement.academyName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {settlement.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(settlement.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(settlement.amount.order, settlement.settlementCurrency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(settlement.amount.settlement, settlement.settlementCurrency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(settlement.settlementDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Button
                        onClick={() => handleViewDetails(settlement)}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-500 hover:text-[#2885e8] hover:bg-[#2885e8]/10"
                        aria-label="View settlement"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — uses shared Button so disabled / hover treatment matches */}
        {totalCount > 20 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500 tabular-nums">
              Showing <span className="font-medium text-gray-900">{page * 20 + 1}</span>–
              <span className="font-medium text-gray-900">{Math.min((page + 1) * 20, totalCount)}</span> of{' '}
              <span className="font-medium text-gray-900">{totalCount.toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setPage(page - 1)} disabled={page === 0} variant="outline" size="sm">
                Previous
              </Button>
              <Button onClick={() => setPage(page + 1)} disabled={(page + 1) * 20 >= totalCount} variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showDetailModal && selectedSettlement && (
        <SettlementDetailModal
          settlement={selectedSettlement}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedSettlement(null);
          }}
        />
      )}

      {showPayoutHistory && (
        <PayoutHistory onClose={() => setShowPayoutHistory(false)} />
      )}
    </div>
  );
}
