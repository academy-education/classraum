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
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('[Subscription Usage] No session found');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      const response = await fetch(`/api/admin/subscription-usage?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

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
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subscription Usage</h2>
          <p className="text-sm text-gray-600 mt-1">
            Monitor resource usage across all academies
          </p>
        </div>
        <Button
          onClick={loadUsageData}
          disabled={loading}
          variant="default"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statistics.total_usage.students.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Teachers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statistics.total_usage.teachers.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <GraduationCap className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Storage</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statistics.total_usage.storage.toFixed(1)} GB
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <HardDrive className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Classrooms</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statistics.total_usage.classrooms.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <BookOpen className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Approaching Limits Alert */}
      {statistics.approaching_limits.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-900">
                {statistics.approaching_limits.length} {statistics.approaching_limits.length === 1 ? 'Academy' : 'Academies'} Approaching Limits
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                The following academies are using over 80% of their allocated resources
              </p>
              <div className="mt-3 space-y-2">
                {statistics.approaching_limits.slice(0, 3).map((limit) => (
                  <div key={limit.academy_id} className="text-sm text-yellow-800">
                    <span className="font-medium">{limit.academy_name}</span>
                    <span className="text-yellow-600"> - Students: {limit.student_usage}%, Teachers: {limit.teacher_usage}%, Storage: {limit.storage_usage}%</span>
                  </div>
                ))}
                {statistics.approaching_limits.length > 3 && (
                  <p className="text-sm text-yellow-600">
                    +{statistics.approaching_limits.length - 3} more...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading usage data...</p>
          </div>
        ) : usageData.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">No usage data found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Academy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teachers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Storage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Classrooms
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usageData.map((usage) => {
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
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 capitalize">
                          {subscription.plan_tier}
                        </span>
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
