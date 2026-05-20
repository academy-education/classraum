'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users,
  GraduationCap,
  HardDrive,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '../AdminPageHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { useAdminFetch } from '../useAdminFetch';
import { AdminSkeleton } from '../AdminSkeleton';
import { DashboardCard } from '../DashboardCard';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { AdminEmptyState } from '../AdminEmptyState';

interface AcademySubscription {
  id: string;
  plan_tier: string;
  status: string;
  student_limit: number;
  teacher_limit: number;
  storage_limit_gb: number;
  additional_students: number;
  additional_teachers: number;
  additional_storage_gb: number;
}

interface Academy {
  id: string;
  name: string;
  subscription_tier: string;
}

interface UsageData {
  id: string;
  academy_id: string;
  current_student_count: number;
  current_teacher_count: number;
  current_storage_gb: number;
  current_classroom_count: number;
  peak_student_count: number;
  peak_teacher_count: number;
  calculated_at: string;
  academies: Academy | Academy[];
  academy_subscriptions: AcademySubscription | AcademySubscription[];
}

interface ApproachingLimit {
  academy_id: string;
  academy_name: string;
  student_usage: string;
  teacher_usage: string;
  storage_usage: string;
}

export function SubscriptionUsageMonitoring() {
  const { t } = useTranslation();
  const adminFetch = useAdminFetch();
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const [statistics, setStatistics] = useState({
    total_usage: { students: 0, teachers: 0, storage: 0, classrooms: 0 },
    approaching_limits: [] as ApproachingLimit[],
    total_academies: 0
  });

  useEffect(() => {
    loadUsageData();
  }, [page]);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      const response = await adminFetch(`/api/admin/subscription-usage?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch subscription usage');
      }

      const result = await response.json();

      if (result.success) {
        setUsageData(result.data);
        setStatistics(result.statistics);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (error) {
      console.error('[Subscription Usage] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = (current: number, limit: number, additional: number = 0) => {
    const totalLimit = limit + additional;
    return totalLimit > 0 ? (current / totalLimit) * 100 : 0;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-rose-600 bg-rose-50';
    if (percentage >= 80) return 'text-amber-600 bg-amber-50';
    return 'text-emerald-600 bg-emerald-50';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-rose-500';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-[#2885e8]';
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={String(t('admin.usage.kicker'))}
        title={String(t('admin.usage.title'))}
        description={String(t('admin.usage.subtitle'))}
        actions={
          <Button onClick={loadUsageData} disabled={loading} size="sm" className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {String(t('admin.header.refresh'))}
          </Button>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title={String(t('admin.usage.totalStudents'))}
          value={statistics.total_usage.students.toLocaleString()}
          icon={<Users className="w-5 h-5" />}
          accent="blue"
        />
        <DashboardCard
          title={String(t('admin.usage.totalTeachers'))}
          value={statistics.total_usage.teachers.toLocaleString()}
          icon={<GraduationCap className="w-5 h-5" />}
          accent="violet"
        />
        <DashboardCard
          title={String(t('admin.usage.storageUsed'))}
          value={`${statistics.total_usage.storage.toFixed(1)} GB`}
          icon={<HardDrive className="w-5 h-5" />}
          accent="emerald"
        />
        <DashboardCard
          title={String(t('admin.usage.totalClassrooms'))}
          value={statistics.total_usage.classrooms.toLocaleString()}
          icon={<BookOpen className="w-5 h-5" />}
          accent="amber"
        />
      </div>

      {/* Approaching Limits Alert */}
      {statistics.approaching_limits.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-50/30 ring-1 ring-amber-200/70 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900">
                {statistics.approaching_limits.length} {statistics.approaching_limits.length === 1 ? 'academy' : 'academies'} approaching limits
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Using over 80% of their allocated resources.
              </p>
              <div className="mt-3 space-y-1.5">
                {statistics.approaching_limits.slice(0, 3).map((limit) => (
                  <div key={limit.academy_id} className="text-xs text-amber-800 flex items-center gap-2">
                    <span className="font-semibold">{limit.academy_name}</span>
                    <span className="text-amber-600">·</span>
                    <span className="tabular-nums">Students {limit.student_usage}% · Teachers {limit.teacher_usage}% · Storage {limit.storage_usage}%</span>
                  </div>
                ))}
                {statistics.approaching_limits.length > 3 && (
                  <p className="text-xs font-medium text-amber-700">
                    +{statistics.approaching_limits.length - 3} more
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Table */}
      <div className="bg-white rounded-xl ring-1 ring-gray-200/70 overflow-hidden">
        {!loading && usageData.length === 0 ? (
          <AdminEmptyState icon={TrendingUp} title="No usage data found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/60 border-b border-gray-200/70">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    Academy
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    Teachers
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    Storage
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    Classrooms
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Loading: shimmer rows that match the real table layout */}
                {loading && <AdminSkeleton.TableRows rows={6} cols={6} />}
                {!loading && usageData.map((usage) => {
                  const academy = Array.isArray(usage.academies) ? usage.academies[0] : usage.academies;
                  const subscription = Array.isArray(usage.academy_subscriptions)
                    ? usage.academy_subscriptions[0]
                    : usage.academy_subscriptions;

                  const studentLimit = subscription.student_limit + (subscription.additional_students || 0);
                  const teacherLimit = subscription.teacher_limit + (subscription.additional_teachers || 0);
                  const storageLimit = subscription.storage_limit_gb + (subscription.additional_storage_gb || 0);

                  const studentPercentage = getUsagePercentage(usage.current_student_count, subscription.student_limit, subscription.additional_students);
                  const teacherPercentage = getUsagePercentage(usage.current_teacher_count, subscription.teacher_limit, subscription.additional_teachers);
                  const storagePercentage = getUsagePercentage(usage.current_storage_gb, subscription.storage_limit_gb, subscription.additional_storage_gb);

                  return (
                    <tr key={usage.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{academy?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">
                            Last updated: {new Date(usage.calculated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {/* Same tier-tone mapping as SubscriptionManagement
                            so the same plan reads identically across pages. */}
                        {(() => {
                          const tone: StatusTone =
                            subscription.plan_tier === 'free' ? 'muted'
                            : subscription.plan_tier === 'individual' ? 'info'
                            : subscription.plan_tier === 'basic' ? 'brand'
                            : 'violet'
                          return (
                            <StatusBadge tone={tone}>
                              <span className="capitalize">{subscription.plan_tier}</span>
                            </StatusBadge>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className={`font-medium ${getUsageColor(studentPercentage)}`}>
                              {usage.current_student_count} / {studentLimit}
                            </span>
                            <span className="text-xs text-gray-500">{studentPercentage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${getProgressBarColor(studentPercentage)}`}
                              style={{ width: `${Math.min(studentPercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className={`font-medium ${getUsageColor(teacherPercentage)}`}>
                              {usage.current_teacher_count} / {teacherLimit}
                            </span>
                            <span className="text-xs text-gray-500">{teacherPercentage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${getProgressBarColor(teacherPercentage)}`}
                              style={{ width: `${Math.min(teacherPercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className={`font-medium ${getUsageColor(storagePercentage)}`}>
                              {usage.current_storage_gb.toFixed(1)} / {storageLimit} GB
                            </span>
                            <span className="text-xs text-gray-500">{storagePercentage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${getProgressBarColor(storagePercentage)}`}
                              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{usage.current_classroom_count}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && usageData.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} academies
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
