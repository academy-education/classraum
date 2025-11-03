'use client'

import React, { useState, useEffect } from 'react';
import { X, Search, Filter, ChevronDown } from 'lucide-react';
import { PortOnePayout, PayoutStatus } from '@/types/subscription';
import { supabase } from '@/lib/supabase';

interface PayoutHistoryProps {
  onClose: () => void;
}

export function PayoutHistory({ onClose }: PayoutHistoryProps) {
  const [payouts, setPayouts] = useState<PortOnePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    academyName: '',
    status: 'all' as PayoutStatus | 'all',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    loadPayouts();
  }, [page, filters]);

  const loadPayouts = async () => {
    try {
      setLoading(true);

      // Get session for auth token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('[PayoutHistory] No session found');
        alert('Authentication required');
        return;
      }

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

      const response = await fetch(`/api/admin/settlements/payouts?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

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
      alert('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: PayoutStatus) => {
    const statusConfig: Record<PayoutStatus, { label: string; color: string }> = {
      SCHEDULED: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
      PROCESSING: { label: 'Processing', color: 'bg-yellow-100 text-yellow-800' },
      SUCCEEDED: { label: 'Succeeded', color: 'bg-green-100 text-green-800' },
      FAILED: { label: 'Failed', color: 'bg-red-100 text-red-800' },
      CANCELED: { label: 'Canceled', color: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Payout History</h2>
            <p className="text-sm text-gray-600 mt-1">Track bank transfer payouts to academies</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Academy Name
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.academyName}
                  onChange={(e) => setFilters({ ...filters, academyName: e.target.value })}
                  placeholder="Search academy..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as PayoutStatus | 'all' })}
                  className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="SUCCEEDED">Succeeded</option>
                  <option value="FAILED">Failed</option>
                  <option value="CANCELED">Canceled</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payout ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Academy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheduled At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payout At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading payouts...
                  </td>
                </tr>
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No payouts found
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

        {/* Pagination */}
        {totalCount > 20 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
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
        )}
      </div>
    </div>
  );
}
