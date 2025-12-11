'use client'

import React, { useState, useEffect } from 'react';
import {
  Building2,
  CreditCard,
  UserPlus,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivities();
  }, []);

  const loadRecentActivities = async () => {
    try {
      setLoading(true);
      const allActivities: ActivityItem[] = [];

      // Fetch recent academies (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: academies } = await supabase
        .from('academies')
        .select('id, name, created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      academies?.forEach(academy => {
        allActivities.push({
          id: `academy-${academy.id}`,
          type: 'academy_created',
          title: 'New Academy Created',
          description: `${academy.name} signed up`,
          timestamp: new Date(academy.created_at),
          status: 'success',
          metadata: { academyName: academy.name }
        });
      });

      // Fetch recent subscriptions
      const { data: subscriptions } = await supabase
        .from('academy_subscriptions')
        .select('id, plan_name, created_at, academies(name)')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      subscriptions?.forEach((sub: any) => {
        allActivities.push({
          id: `subscription-${sub.id}`,
          type: 'subscription_created',
          title: 'New Subscription',
          description: `${sub.academies?.name || 'Academy'} subscribed to ${sub.plan_name}`,
          timestamp: new Date(sub.created_at),
          status: 'success',
          metadata: { academyName: sub.academies?.name }
        });
      });

      // Fetch recent failed payments
      const { data: failedPayments } = await supabase
        .from('invoices')
        .select('id, final_amount, created_at, academies(name)')
        .eq('status', 'failed')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(2);

      failedPayments?.forEach((payment: any) => {
        allActivities.push({
          id: `payment-${payment.id}`,
          type: 'payment_failed',
          title: 'Payment Failed',
          description: `Payment failed for ${payment.academies?.name || 'Academy'}`,
          timestamp: new Date(payment.created_at),
          status: 'error',
          metadata: {
            academyName: payment.academies?.name,
            amount: payment.final_amount
          }
        });
      });

      // Fetch recent support conversations
      const { data: conversations } = await supabase
        .from('chat_conversations')
        .select('id, created_at, academies(name)')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(2);

      conversations?.forEach((conv: any) => {
        allActivities.push({
          id: `support-${conv.id}`,
          type: 'support_ticket',
          title: 'Support Conversation Started',
          description: `New support request from ${conv.academies?.name || 'User'}`,
          timestamp: new Date(conv.created_at),
          status: 'warning',
          metadata: {
            academyName: conv.academies?.name,
            ticketId: conv.id.substring(0, 8)
          }
        });
      });

      // Fetch recent students added (group by academy and date)
      const { data: students } = await supabase
        .from('students')
        .select('academy_id, created_at, academies(name)')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      // Group students by academy and day
      const studentsByAcademyDay = new Map<string, { academy: string; count: number; timestamp: Date }>();
      students?.forEach((student: any) => {
        const dayKey = `${student.academy_id}-${new Date(student.created_at).toDateString()}`;
        if (!studentsByAcademyDay.has(dayKey)) {
          studentsByAcademyDay.set(dayKey, {
            academy: student.academies?.name || 'Academy',
            count: 1,
            timestamp: new Date(student.created_at)
          });
        } else {
          const existing = studentsByAcademyDay.get(dayKey)!;
          existing.count += 1;
        }
      });

      // Add top 2 student addition activities
      Array.from(studentsByAcademyDay.entries())
        .sort((a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime())
        .slice(0, 2)
        .forEach(([key, data]) => {
          allActivities.push({
            id: `students-${key}`,
            type: 'user_added',
            title: 'Students Added',
            description: `${data.count} student${data.count > 1 ? 's' : ''} added to ${data.academy}`,
            timestamp: data.timestamp,
            status: 'success',
            metadata: {
              academyName: data.academy,
              userName: `${data.count} student${data.count > 1 ? 's' : ''}`
            }
          });
        });

      // Sort all activities by timestamp and take the most recent 8
      allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(allActivities.slice(0, 8));

    } catch (error) {
      console.error('Error loading recent activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityItem['type'], status?: ActivityItem['status']) => {
    const iconProps = { className: "h-5 w-5" };
    
    switch (type) {
      case 'academy_created':
        return <Building2 {...iconProps} className="h-5 w-5 text-blue-600" />;
      case 'subscription_created':
        return <CreditCard {...iconProps} className="h-5 w-5 text-green-600" />;
      case 'user_added':
        return <UserPlus {...iconProps} className="h-5 w-5 text-purple-600" />;
      case 'payment_failed':
        return <XCircle {...iconProps} className="h-5 w-5 text-red-600" />;
      case 'support_ticket':
        return <AlertCircle {...iconProps} className="h-5 w-5 text-yellow-600" />;
      case 'system_alert':
        return status === 'success' 
          ? <CheckCircle {...iconProps} className="h-5 w-5 text-green-600" />
          : <AlertCircle {...iconProps} className="h-5 w-5 text-red-600" />;
      default:
        return <Clock {...iconProps} className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status?: ActivityItem['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <button
          onClick={loadRecentActivities}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Refresh
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
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>No recent activity in the last 7 days</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={`flex-shrink-0 p-2 rounded-full border ${getStatusColor(activity.status)}`}>
              {getActivityIcon(activity.type, activity.status)}
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
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                      {activity.metadata.academyName}
                    </span>
                  )}
                  {activity.metadata.ticketId && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                      {activity.metadata.ticketId}
                    </span>
                  )}
                  {activity.metadata.amount && (
                    <span className="text-red-600 font-medium">
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
            <span className="text-gray-500">Showing last 7 days of activity</span>
          </div>
        </div>
      )}
    </div>
  );
}