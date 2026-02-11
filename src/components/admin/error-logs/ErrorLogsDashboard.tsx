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
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateInput } from '@/components/ui/common/DateInput';

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

  const loadErrorLogs = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('[Error Logs] No session found');
        return;
      }

      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      if (levelFilter) params.append('level', levelFilter);
      if (serviceFilter) params.append('serviceName', serviceFilter);
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());

      const response = await fetch(`/api/admin/error-logs?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

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
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Delete logs older than 30 days?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/error-logs?daysToKeep=30', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cleanup logs');
      }

      loadErrorLogs();
    } catch (error) {
      console.error('[Error Logs] Error cleaning up logs:', error);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-300';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warn': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'debug': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Error Logs</h2>
          <p className="text-sm text-gray-600 mt-1">
            Monitor system errors and debugging information
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCleanup}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Cleanup Old Logs
          </button>
          <Button
            onClick={loadErrorLogs}
            disabled={loading}
            variant="default"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading error logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <Bug className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">No error logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <div key={log.id} className="hover:bg-gray-50 transition-colors">
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLevelColor(log.level)}`}>
                          {getLevelIcon(log.level)}
                          {formatLogLevel(log.level)}
                        </span>
                        <span className="text-sm font-medium text-gray-700">{log.service_name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">{log.message}</p>
                      {log.error_message && (
                        <p className="text-sm text-red-600 mt-1">{log.error_message}</p>
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
