'use client'

import React from 'react';
import {
  Building2,
  CreditCard,
  UserPlus,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

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

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'academy_created',
    title: 'New Academy Created',
    description: 'Seoul Language Academy signed up for Pro plan',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    status: 'success',
    metadata: { academyName: 'Seoul Language Academy' }
  },
  {
    id: '2',
    type: 'payment_failed',
    title: 'Payment Failed',
    description: 'Monthly subscription payment failed for Busan Math Center',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    status: 'error',
    metadata: { academyName: 'Busan Math Center', amount: 150000 }
  },
  {
    id: '3',
    type: 'support_ticket',
    title: 'Support Ticket Created',
    description: 'Urgent: Login issues reported by manager',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    status: 'warning',
    metadata: { ticketId: 'TK20250905-0001' }
  },
  {
    id: '4',
    type: 'subscription_created',
    title: 'Subscription Upgraded',
    description: 'Incheon Science Academy upgraded from Basic to Pro',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    status: 'success',
    metadata: { academyName: 'Incheon Science Academy' }
  },
  {
    id: '5',
    type: 'user_added',
    title: 'Bulk Users Added',
    description: '25 students added to Daegu Art Academy',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    status: 'success',
    metadata: { academyName: 'Daegu Art Academy', userName: '25 students' }
  },
  {
    id: '6',
    type: 'system_alert',
    title: 'System Alert Resolved',
    description: 'Database performance alert has been resolved',
    timestamp: new Date(Date.now() - 90 * 60 * 1000),
    status: 'success'
  }
];

export function RecentActivity() {
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
        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {mockActivities.map((activity) => (
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

      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
          <button className="text-blue-600 hover:text-blue-800 font-medium">
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}