'use client'

import React, { useState, useEffect } from 'react';
import {
  Building2,
  CreditCard,
  Users,
  Banknote,
  Headphones,
  ShieldCheck,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useAdminFetch } from './useAdminFetch';
import { StatusBadge } from './StatusBadge';
import { useTranslation } from '@/hooks/useTranslation';

interface ActivityItem {
  id: string;
  type: 'academy_created' | 'subscription_created' | 'user_added' | 'payment_failed' | 'support_ticket' | 'system_alert';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'success' | 'warning' | 'error';
  metadata?: {
    academyName?: string;
    userName?: string;
    amount?: number;
    ticketId?: string;
  };
}

export function RecentActivity() {
  const { t } = useTranslation();
  const adminFetch = useAdminFetch();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadRecentActivities();
  }, []);

  /**
   * Data comes from /api/admin/dashboard/activity (service role, server-side).
   *
   * These reads used to run in the browser against the anon-key client, so RLS
   * quietly filtered them to nothing and the panel showed "No recent activity"
   * whether the platform was idle or the queries were simply denied. Failures
   * now render as an error with a retry, distinct from a genuinely quiet week.
   *
   * The route returns data only; all copy is localized here.
   */
  const loadRecentActivities = async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const res = await adminFetch('/api/admin/dashboard/activity');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || body?.error || `Request failed (${res.status})`);
      }

      const payload = await res.json() as {
        academies: { id: string; name: string; createdAt: string }[];
        subscriptions: { id: string; planName: string | null; academyName: string | null; createdAt: string }[];
        failedPayments: { id: string; amount: number | null; academyName: string | null; createdAt: string }[];
        conversations: { id: string; academyName: string | null; createdAt: string }[];
        students: { academyId: string; academyName: string | null; createdAt: string }[];
      };

      const fallbackAcademy = String(t('admin.dashboard.fallbackAcademy'));
      const allActivities: ActivityItem[] = [];

      payload.academies.forEach(academy => {
        allActivities.push({
          id: `academy-${academy.id}`,
          type: 'academy_created',
          title: String(t('admin.dashboard.actNewAcademyTitle')),
          description: String(t('admin.dashboard.actNewAcademyDesc', { name: academy.name })),
          timestamp: new Date(academy.createdAt),
          status: 'success',
          metadata: { academyName: academy.name }
        });
      });

      payload.subscriptions.forEach(sub => {
        allActivities.push({
          id: `subscription-${sub.id}`,
          type: 'subscription_created',
          title: String(t('admin.dashboard.actNewSubTitle')),
          description: String(t('admin.dashboard.actNewSubDesc', { name: sub.academyName || fallbackAcademy, plan: sub.planName ?? '' })),
          timestamp: new Date(sub.createdAt),
          status: 'success',
          metadata: { academyName: sub.academyName ?? undefined }
        });
      });

      payload.failedPayments.forEach(payment => {
        allActivities.push({
          id: `payment-${payment.id}`,
          type: 'payment_failed',
          title: String(t('admin.dashboard.actPaymentFailedTitle')),
          description: String(t('admin.dashboard.actPaymentFailedDesc', { name: payment.academyName || fallbackAcademy })),
          timestamp: new Date(payment.createdAt),
          status: 'error',
          metadata: {
            academyName: payment.academyName ?? undefined,
            amount: payment.amount ?? undefined
          }
        });
      });

      payload.conversations.forEach(conv => {
        allActivities.push({
          id: `support-${conv.id}`,
          type: 'support_ticket',
          title: String(t('admin.dashboard.actSupportTitle')),
          description: String(t('admin.dashboard.actSupportDesc', { name: conv.academyName || String(t('admin.dashboard.fallbackUser')) })),
          timestamp: new Date(conv.createdAt),
          status: 'warning',
          metadata: {
            academyName: conv.academyName ?? undefined,
            ticketId: conv.id.substring(0, 8)
          }
        });
      });

      // Group new students by academy and day.
      const studentsByAcademyDay = new Map<string, { academy: string; count: number; timestamp: Date }>();
      payload.students.forEach(student => {
        const dayKey = `${student.academyId}-${new Date(student.createdAt).toDateString()}`;
        const existing = studentsByAcademyDay.get(dayKey);
        if (existing) {
          existing.count += 1;
        } else {
          studentsByAcademyDay.set(dayKey, {
            academy: student.academyName || fallbackAcademy,
            count: 1,
            timestamp: new Date(student.createdAt)
          });
        }
      });

      Array.from(studentsByAcademyDay.entries())
        .sort((a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime())
        .slice(0, 2)
        .forEach(([key, data]) => {
          allActivities.push({
            id: `students-${key}`,
            type: 'user_added',
            title: String(t('admin.dashboard.actStudentsTitle')),
            description: String(t('admin.dashboard.actStudentsDesc', { count: data.count, academy: data.academy })),
            timestamp: data.timestamp,
            status: 'success',
            metadata: {
              academyName: data.academy,
              userName: `${data.count} student${data.count > 1 ? 's' : ''}`
            }
          });
        });

      allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(allActivities.slice(0, 8));
    } catch (error) {
      console.error('Error loading recent activities:', error);
      setActivities([]);
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  // Each activity type uses the SAME lucide icon as its entity's own admin
  // tab (AdminSidebar): academies → Building2, subscriptions → CreditCard,
  // users → Users, money/settlements → Banknote, support → Headphones,
  // system → ShieldCheck. Severity is carried by the chip color, not by
  // swapping in status glyphs.
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'academy_created':
        return <Building2 className="h-5 w-5 text-primary" />;
      case 'subscription_created':
        return <CreditCard className="h-5 w-5 text-emerald-600" />;
      case 'user_added':
        return <Users className="h-5 w-5 text-violet-600" />;
      case 'payment_failed':
        return <Banknote className="h-5 w-5 text-rose-600" />;
      case 'support_ticket':
        return <Headphones className="h-5 w-5 text-amber-600" />;
      case 'system_alert':
        return <ShieldCheck className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  // Surface for the icon chip behind each activity icon. Aligned with the
  // tone vocabulary used elsewhere (emerald / amber / rose / slate).
  const getStatusColor = (status?: ActivityItem['status']) => {
    switch (status) {
      case 'success':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'warning':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'error':
        return 'text-rose-600 bg-rose-50 border-rose-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return String(t('admin.dashboard.timeJustNow'));
    if (diffInMinutes < 60) return String(t('admin.dashboard.timeMinAgo', { n: diffInMinutes }));

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return String(t('admin.dashboard.timeHourAgo', { n: diffInHours }));

    const diffInDays = Math.floor(diffInHours / 24);
    return String(t('admin.dashboard.timeDayAgo', { n: diffInDays }));
  };

  return (
    <div className="bg-white p-5 rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-[0.06em]">{String(t('admin.dashboard.recentActivityTitle'))}</h3>
        <button
          onClick={loadRecentActivities}
          className="text-xs font-medium text-primary hover:text-primary transition-colors"
        >
          {String(t('admin.common.refresh'))}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-start space-x-3 animate-pulse">
              <div className="flex-shrink-0 w-9 h-9 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="text-center py-8 flex flex-col items-center gap-2">
          <AlertCircle className="h-10 w-10 text-rose-300" />
          <p className="text-sm font-medium text-gray-900">{String(t('admin.dashboard.failedToLoad'))}</p>
          <p className="text-xs text-gray-500 max-w-xs break-words">{loadError}</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>{String(t('admin.dashboard.noRecentActivity'))}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={`flex-shrink-0 p-2 rounded-full border ${getStatusColor(activity.status)}`}>
              {getActivityIcon(activity.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.title}
                </p>
                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mt-1">
                {activity.description}
              </p>
              
              {activity.metadata && (
                <div className="text-xs text-gray-500 mt-2">
                  {activity.metadata.academyName && (
                    <span className="mr-2">
                      <StatusBadge tone="muted" size="sm">{activity.metadata.academyName}</StatusBadge>
                    </span>
                  )}
                  {activity.metadata.ticketId && (
                    <span className="mr-2">
                      <StatusBadge tone="info" size="sm">{activity.metadata.ticketId}</StatusBadge>
                    </span>
                  )}
                  {activity.metadata.amount && (
                    <span className="text-rose-600 font-medium">
                      ₩{activity.metadata.amount.toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        </div>
      )}

      {!loading && activities.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{String(t('admin.dashboard.showingLast7Days'))}</span>
          </div>
        </div>
      )}
    </div>
  );
}