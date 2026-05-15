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
import { useTranslation } from '@/hooks/useTranslation';
import { AdminPageHeader } from '../AdminPageHeader';
import { useAdminFetch } from '../useAdminFetch';
import { useConfirm } from '../useConfirm';
import { AdminSkeleton } from '../AdminSkeleton';
import { DashboardCard } from '../DashboardCard';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { AdminEmptyState } from '../AdminEmptyState';

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
  const adminFetch = useAdminFetch();
  const { t } = useTranslation();
  const confirm = useConfirm();
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
      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      if (reportTypeFilter) params.append('reportType', reportTypeFilter);
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());

      const response = await adminFetch(`/api/admin/comment-reports?${params.toString()}`);

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
    const ok = await confirm({
      title: 'Dismiss this report?',
      description: String(t('admin.confirmDismissReport')),
      variant: 'warning',
      confirmText: 'Dismiss',
    });
    if (!ok) return;

    try {
      const response = await adminFetch(`/api/admin/comment-reports?reportId=${reportId}&action=dismiss`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to dismiss report');
      }

      loadReports();
    } catch (error) {
      console.error('[Comment Reports] Error dismissing report:', error);
    }
  };

  const handleRemoveComment = async (reportId: string, commentId: string) => {
    const ok = await confirm({
      title: 'Remove this comment?',
      description: String(t('admin.confirmRemoveComment')),
      variant: 'danger',
      confirmText: 'Remove',
    });
    if (!ok) return;

    try {
      const response = await adminFetch(`/api/admin/comment-reports?reportId=${reportId}&commentId=${commentId}&action=remove_comment`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to remove comment');
      }

      loadReports();
    } catch (error) {
      console.error('[Comment Reports] Error removing comment:', error);
    }
  };

  // Map report type → semantic tone in shared StatusBadge so the colors
  // match every other admin pill.
  const reportTypeTone = (type: string): StatusTone => {
    switch (type) {
      case 'abuse': return 'danger';
      case 'spam':  return 'pending';
      default:      return 'muted';
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
      <AdminPageHeader
        kicker="Moderation"
        title="Comment Reports"
        description="Review and moderate user-reported comments across the platform."
        actions={
          <Button onClick={loadReports} disabled={loading} variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Reports"
          value={statistics.total.toLocaleString()}
          icon={<Flag className="w-5 h-5" />}
          accent="slate"
        />
        <DashboardCard
          title="Spam"
          value={statistics.spam.toLocaleString()}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="amber"
        />
        <DashboardCard
          title="Abuse"
          value={statistics.abuse.toLocaleString()}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="rose"
        />
        <DashboardCard
          title="Other"
          value={statistics.other.toLocaleString()}
          icon={<MessageSquare className="w-5 h-5" />}
          accent="violet"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl ring-1 ring-gray-200/70">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
      <div className="bg-white rounded-xl ring-1 ring-gray-200/70 overflow-hidden">
        {loading ? (
          <AdminSkeleton.LogRows rows={6} />
        ) : filteredReports.length === 0 ? (
          <AdminEmptyState
            icon={MessageSquare}
            title="No comment reports found"
            description="Reports will appear here when users flag comments for moderation."
          />
        ) : (
          <div className="divide-y divide-gray-100">
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
                      <StatusBadge tone={reportTypeTone(report.report_type)}>
                        {formatReportType(report.report_type)}
                      </StatusBadge>
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
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove Comment
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Report Details */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Flag className="w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-900 mb-1">Report Reason</p>
                          <p className="text-sm text-amber-800">{report.text}</p>
                          <p className="text-xs text-amber-600 mt-2">
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
