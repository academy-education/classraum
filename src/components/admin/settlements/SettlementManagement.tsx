'use client'

import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, ChevronDown, Eye, Calendar } from 'lucide-react';
import { PortOneSettlement, SettlementStatus } from '@/types/subscription';
import { SettlementDetailModal } from './SettlementDetailModal';
import { PayoutHistory } from './PayoutHistory';
import { supabase } from '@/lib/supabase';

interface Filters {
  academyName: string;
  status: SettlementStatus | 'all';
  dateFrom: string;
  dateTo: string;
}

export function SettlementManagement() {
  const [settlements, setSettlements] = useState<PortOneSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState<PortOneSettlement | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPayoutHistory, setShowPayoutHistory] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    academyName: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    loadSettlements();
  }, [page, filters]);

  const loadSettlements = async () => {
    try {
      setLoading(true);

      // Get session for auth token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('[SettlementManagement] No session found');
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

      const response = await fetch(`/api/admin/settlements?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settlements');
      }

      const data = await response.json();

      // Show friendly message if API not configured or no data
      if (data.message) {
        console.log('[Settlements]', data.message);
      }

      // Filter by academy name if specified
      let filteredItems = data.items || [];
      if (filters.academyName) {
        filteredItems = filteredItems.filter((s: PortOneSettlement) =>
          s.academyName?.toLowerCase().includes(filters.academyName.toLowerCase())
        );
      }

      setSettlements(filteredItems);
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
    const statusConfig: Record<SettlementStatus, { label: string; color: string }> = {
      SCHEDULED: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
      IN_PROCESS: { label: 'In Process', color: 'bg-yellow-100 text-yellow-800' },
      SETTLED: { label: 'Settled', color: 'bg-green-100 text-green-800' },
      PAYOUT_SCHEDULED: { label: 'Payout Scheduled', color: 'bg-purple-100 text-purple-800' },
      PAID_OUT: { label: 'Paid Out', color: 'bg-emerald-100 text-emerald-800' },
      CANCELED: { label: 'Canceled', color: 'bg-red-100 text-red-800' },
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
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

  const handleViewDetails = (settlement: PortOneSettlement) => {
    setSelectedSettlement(settlement);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settlement Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track and manage partner settlements from PortOne
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPayoutHistory(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Payout History
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
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
                onChange={(e) => setFilters({ ...filters, status: e.target.value as SettlementStatus | 'all' })}
                className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Status</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROCESS">In Process</option>
                <option value="SETTLED">Settled</option>
                <option value="PAYOUT_SCHEDULED">Payout Scheduled</option>
                <option value="PAID_OUT">Paid Out</option>
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

      {/* Settlements Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Settlement ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Academy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Settlement Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Settlement Date
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Loading settlements...
                  </td>
                </tr>
              ) : settlements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No settlements found
                  </td>
                </tr>
              ) : (
                settlements.map((settlement) => (
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
                      <button
                        onClick={() => handleViewDetails(settlement)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
