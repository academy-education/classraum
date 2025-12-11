'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  MessageSquare,
  Filter,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Flag,
  Trash2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateInput } from '@/components/ui/common/DateInput';

interface CommentUser {
  name: string | null;
  email: string;
}

interface AssignmentComment {
  id: string;
  text: string;
  user_id: string;
  assignment_id: string;
  users: CommentUser | CommentUser[];
}

interface CommentReport {
  id: string;
  comment_id: string;
  text: string;
  user_id: string;
  report_type: string;
  created_at: string;
  updated_at: string;
  users: CommentUser | CommentUser[];
  assignment_comments: AssignmentComment | AssignmentComment[];
}

const reportTypes = ['spam', 'abuse', 'other'];

export function CommentReportsModeration() {
  const [reports, setReports] = useState<CommentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState({
    total: 0,
    spam: 0,
    abuse: 0,
    other: 0
  });

  // Filters
  const [reportTypeFilter, setReportTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadReports();
  }, [page, reportTypeFilter, startDate, endDate]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('[Comment Reports] No session found');
        return;
      }

      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      if (reportTypeFilter) params.append('reportType', reportTypeFilter);
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());

      const response = await fetch(`/api/admin/comment-reports?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch comment reports');
      }

      const result = await response.json();

      if (result.success) {
        setReports(result.data);
        setStatistics(result.statistics);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (error) {
      console.error('[Comment Reports] Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissReport = async (reportId: string) => {
    if (!confirm('Dismiss this report?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/comment-reports?reportId=${reportId}&action=dismiss`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to dismiss report');
      }

      loadReports();
    } catch (error) {
      console.error('[Comment Reports] Error dismissing report:', error);
    }
  };

  const handleRemoveComment = async (reportId: string, commentId: string) => {
    if (!confirm('Remove this comment? This action cannot be undone.')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/comment-reports?reportId=${reportId}&commentId=${commentId}&action=remove_comment`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove comment');
      }

      loadReports();
    } catch (error) {
      console.error('[Comment Reports] Error removing comment:', error);
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'abuse': return 'text-red-700 bg-red-100 border-red-200';
      case 'spam': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'other': return 'text-gray-700 bg-gray-100 border-gray-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const formatReportType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const filteredReports = searchQuery
    ? reports.filter(report => {
        const comment = Array.isArray(report.assignment_comments)
          ? report.assignment_comments[0]
          : report.assignment_comments;
        const reporter = Array.isArray(report.users)
          ? report.users[0]
          : report.users;

        return (
          report.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          comment?.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          reporter.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : reports;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Comment Reports</h2>
          <p className="text-sm text-gray-600 mt-1">
            Review and moderate reported comments
          </p>
        </div>
        <Button
          onClick={loadReports}
          disabled={loading}
          variant="default"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{statistics.total}</p>
            </div>
            <Flag className="w-8 h-8 text-gray-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Spam</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{statistics.spam}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Abuse</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{statistics.abuse}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Other</p>
              <p className="text-2xl font-bold text-gray-600 mt-1">{statistics.other}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search reports..."
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
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <Select
                value={reportTypeFilter || "all"}
                onValueChange={(value) => {
                  setReportTypeFilter(value === "all" ? "" : value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {reportTypes.map(type => (
                    <SelectItem key={type} value={type}>{formatReportType(type)}</SelectItem>
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

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading comment reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">No comment reports found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredReports.map((report) => {
              const comment = Array.isArray(report.assignment_comments)
                ? report.assignment_comments[0]
                : report.assignment_comments;
              const reporter = Array.isArray(report.users)
                ? report.users[0]
                : report.users;
              const commenter = comment && (Array.isArray(comment.users)
                ? comment.users[0]
                : comment.users);

              return (
                <div key={report.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getReportTypeColor(report.report_type)}`}>
                        {formatReportType(report.report_type)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Reported {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDismissReport(report.id)}
                        className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Dismiss
                      </button>
                      <button
                        onClick={() => comment && handleRemoveComment(report.id, comment.id)}
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove Comment
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Report Details */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Flag className="w-4 h-4 text-yellow-600 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-900 mb-1">Report Reason</p>
                          <p className="text-sm text-yellow-800">{report.text}</p>
                          <p className="text-xs text-yellow-600 mt-2">
                            Reported by: {reporter.name || reporter.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Original Comment */}
                    {comment && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-4 h-4 text-gray-600 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 mb-1">Original Comment</p>
                            <p className="text-sm text-gray-700">{comment.text}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              By: {commenter?.name || commenter?.email || 'Unknown user'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredReports.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} reports
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
