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
      title: String(t('admin.confirmDismissReport')),
      description: String(t('admin.confirmDismissReport')),
      variant: 'warning',
      confirmText: String(t('admin.commentReports.dismiss')),
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
      title: String(t('admin.commentReports.removeCommentTitle')),
      description: String(t('admin.confirmRemoveComment')),
      variant: 'danger',
      confirmText: String(t('admin.commentReports.remove')),
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

        const q = searchQuery.toLowerCase();
        return (
          (report.text || '').toLowerCase().includes(q) ||
          (comment?.text || '').toLowerCase().includes(q) ||
          (reporter?.email || '').toLowerCase().includes(q)
        );
      })
    : reports;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={String(t('admin.commentReports.kicker'))}
        title={String(t('admin.commentReports.title'))}
        description={String(t('admin.commentReports.subtitle'))}
        actions={
          <Button onClick={loadReports} disabled={loading} variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {String(t('admin.header.refresh'))}
          </Button>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title={String(t('admin.commentReports.totalReports'))}
          value={statistics.total.toLocaleString()}
          icon={<Flag className="w-5 h-5" />}
          accent="slate"
        />
        <DashboardCard
          title={String(t('admin.commentReports.spam'))}
          value={statistics.spam.toLocaleString()}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="amber"
        />
        <DashboardCard
          title={String(t('admin.commentReports.abuse'))}
          value={statistics.abuse.toLocaleString()}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="rose"
        />
        <DashboardCard
          title={String(t('admin.commentReports.other'))}
          value={statistics.other.toLocaleString()}
          icon={<MessageSquare className="w-5 h-5" />}
          accent="violet"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder={String(t('admin.commentReports.searchReportsPlaceholder'))}
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
            {String(t('admin.commentReports.filters'))}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{String(t('admin.commentReports.reportType'))}</label>
              <Select
                value={reportTypeFilter || "all"}
                onValueChange={(value) => {
                  setReportTypeFilter(value === "all" ? "" : value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={String(t('admin.commentReports.allTypes'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{String(t('admin.commentReports.allTypes'))}</SelectItem>
                  {reportTypes.map(type => (
                    <SelectItem key={type} value={type}>{formatReportType(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{String(t('admin.commentReports.startDate'))}</label>
              <DateInput
                value={startDate}
                onChange={(value) => {
                  setStartDate(value);
                  setPage(0);
                }}
                placeholder={String(t('admin.commentReports.selectStartDate'))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{String(t('admin.commentReports.endDate'))}</label>
              <DateInput
                value={endDate}
                onChange={(value) => {
                  setEndDate(value);
                  setPage(0);
                }}
                placeholder={String(t('admin.commentReports.selectEndDate'))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
        {loading ? (
          <AdminSkeleton.LogRows rows={6} />
        ) : filteredReports.length === 0 ? (
          <AdminEmptyState
            icon={MessageSquare}
            title={String(t('admin.commentReports.noCommentReportsFound'))}
            description={String(t('admin.commentReports.emptyDescription'))}
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
                        {String(t('admin.commentReports.reportedOn', { date: new Date(report.created_at).toLocaleDateString() }))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDismissReport(report.id)}
                        className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        {String(t('admin.commentReports.dismiss'))}
                      </button>
                      <button
                        onClick={() => comment && handleRemoveComment(report.id, comment.id)}
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        {String(t('admin.commentReports.removeComment'))}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Report Details */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Flag className="w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-900 mb-1">{String(t('admin.commentReports.reportReason'))}</p>
                          <p className="text-sm text-amber-800">{report.text}</p>
                          <p className="text-xs text-amber-600 mt-2">
                            {String(t('admin.commentReports.reportedBy'))}: {reporter?.name || reporter?.email || String(t('admin.common.unknownUser'))}
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
                            <p className="text-sm font-medium text-gray-900 mb-1">{String(t('admin.commentReports.originalComment'))}</p>
                            <p className="text-sm text-gray-700">{comment.text}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {String(t('admin.commentReports.by'))}: {commenter?.name || commenter?.email || String(t('admin.common.unknownUser'))}
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
              {String(t('admin.commentReports.showingReports', { from: page * pageSize + 1, to: Math.min((page + 1) * pageSize, total), total }))}
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
                {String(t('admin.common.page'))} {page + 1} {String(t('admin.common.of'))} {totalPages}
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
