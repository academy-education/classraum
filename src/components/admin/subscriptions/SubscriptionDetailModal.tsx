'use client'

import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  Calendar, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  Download,
  Edit,
  TrendingUp,
  Clock,
  Building2
} from 'lucide-react';
import { formatPrice } from '@/lib/subscription';

interface SubscriptionDetailModalProps {
  subscription: any;
  onClose: () => void;
}

export function SubscriptionDetailModal({ subscription, onClose }: SubscriptionDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'usage' | 'history'>('overview');

  // Mock billing history
  const billingHistory = [
    {
      id: 'inv_001',
      date: new Date('2024-11-01'),
      amount: subscription.monthlyAmount,
      status: 'paid',
      paymentMethod: 'Credit Card',
      description: `${subscription.tier} plan - November 2024`
    },
    {
      id: 'inv_002',
      date: new Date('2024-10-01'),
      amount: subscription.monthlyAmount,
      status: 'paid',
      paymentMethod: 'Credit Card',
      description: `${subscription.tier} plan - October 2024`
    },
    {
      id: 'inv_003',
      date: new Date('2024-09-01'),
      amount: subscription.monthlyAmount,
      status: subscription.status === 'past_due' ? 'failed' : 'paid',
      paymentMethod: 'Credit Card',
      description: `${subscription.tier} plan - September 2024`
    }
  ];

  // Mock usage data
  const usageData = {
    students: { current: subscription.studentCount, limit: subscription.tier === 'enterprise' ? -1 : 500 },
    teachers: { current: subscription.teacherCount, limit: subscription.tier === 'enterprise' ? -1 : 50 },
    storage: { current: 15.2, limit: subscription.tier === 'enterprise' ? -1 : 100 },
    apiCalls: { current: 45230, limit: subscription.tier === 'enterprise' ? -1 : 100000 }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{subscription.academyName}</h2>
              <p className="text-sm text-gray-500">Subscription ID: {subscription.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100">
          <div className="flex space-x-8 px-6">
            {(['overview', 'billing', 'usage', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Subscription Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Subscription Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Current Plan</p>
                    <p className="text-lg font-semibold capitalize">{subscription.tier}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Status</p>
                    <div className="flex items-center space-x-2">
                      {subscription.status === 'active' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {subscription.status === 'past_due' && <XCircle className="h-4 w-4 text-red-600" />}
                      {subscription.status === 'trialing' && <Clock className="h-4 w-4 text-blue-600" />}
                      <span className="capitalize">{subscription.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Monthly Amount</p>
                    <p className="text-lg font-semibold">{formatPrice(subscription.monthlyAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Billing Cycle</p>
                    <p className="text-lg font-semibold capitalize">{subscription.billingCycle}</p>
                  </div>
                </div>
              </div>

              {/* Billing Information */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Billing Period</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Current Period Start</span>
                      <span>{subscription.currentPeriodStart.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Current Period End</span>
                      <span>{subscription.currentPeriodEnd.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Next Billing Date</span>
                      <span className={subscription.status === 'past_due' ? 'text-red-600 font-medium' : ''}>
                        {subscription.nextBillingDate.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Payment Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Payment Method</span>
                      <span>{subscription.paymentMethod || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Auto Renew</span>
                      <span className={subscription.autoRenew ? 'text-green-600' : 'text-red-600'}>
                        {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {subscription.lastPaymentDate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Last Payment</span>
                        <span>{subscription.lastPaymentDate.toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-4">
                <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
                  <RefreshCw className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                  <p className="text-sm font-medium">Retry Payment</p>
                </button>
                
                <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
                  <Edit className="h-6 w-6 mx-auto text-green-600 mb-2" />
                  <p className="text-sm font-medium">Modify Plan</p>
                </button>
                
                <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
                  <FileText className="h-6 w-6 mx-auto text-purple-600 mb-2" />
                  <p className="text-sm font-medium">View Invoices</p>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Current Billing Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Current Billing Cycle</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="text-xl font-semibold">{formatPrice(subscription.monthlyAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Next Billing</p>
                    <p className="text-lg font-medium">{subscription.nextBillingDate.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Days Remaining</p>
                    <p className="text-lg font-medium">
                      {Math.max(0, Math.ceil((subscription.nextBillingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Invoices */}
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Recent Invoices</h3>
                <div className="space-y-3">
                  {billingHistory.map((invoice, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(invoice.status)}
                        <div>
                          <p className="font-medium text-gray-900">{invoice.id}</p>
                          <p className="text-sm text-gray-500">{invoice.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatPrice(invoice.amount)}</p>
                        <p className="text-sm text-gray-500">{invoice.date.toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status}
                        </span>
                        <button className="text-blue-600 hover:text-blue-800">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {subscription.status === 'past_due' && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <div className="flex items-start">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-red-900">Payment Overdue</h4>
                      <p className="text-sm text-red-700 mt-1">
                        This subscription has an overdue payment. The service may be suspended if payment is not received soon.
                      </p>
                      <button className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                        Retry Payment Now
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {Object.entries(usageData).map(([key, data]) => (
                  <div key={key} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900 capitalize">
                        {key === 'apiCalls' ? 'API Calls' : key}
                      </h4>
                      <span className="text-sm text-gray-600">
                        {data.current.toLocaleString()} / {data.limit === -1 ? 'Unlimited' : data.limit.toLocaleString()}
                      </span>
                    </div>
                    {data.limit !== -1 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(data.current, data.limit))}`}
                          style={{ width: `${getUsagePercentage(data.current, data.limit)}%` }}
                        />
                      </div>
                    )}
                    {data.limit !== -1 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {getUsagePercentage(data.current, data.limit).toFixed(1)}% used
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Usage Alerts */}
              {Object.entries(usageData).some(([_, data]) => data.limit !== -1 && getUsagePercentage(data.current, data.limit) > 80) && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Usage Alert</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Some usage metrics are approaching their limits. Consider upgrading to avoid service interruption.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Subscription History</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Subscription Created</p>
                    <p className="text-xs text-gray-500">{subscription.currentPeriodStart.toLocaleDateString()} at 10:30 AM</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Payment Successful</p>
                    <p className="text-xs text-gray-500">
                      {formatPrice(subscription.monthlyAmount)} charged successfully
                    </p>
                    <p className="text-xs text-gray-500">Nov 1, 2024 at 10:35 AM</p>
                  </div>
                </div>

                {subscription.status === 'past_due' && (
                  <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Payment Failed</p>
                      <p className="text-xs text-gray-500">
                        Card declined - insufficient funds
                      </p>
                      <p className="text-xs text-gray-500">Nov 1, 2024 at 2:00 AM</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
          <div className="flex space-x-3">
            {subscription.status === 'past_due' && (
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Retry Payment
              </button>
            )}
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Send Invoice
            </button>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
              Cancel Subscription
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}