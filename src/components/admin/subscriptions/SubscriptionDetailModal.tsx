'use client'

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  Clock,
  Undo2,
} from 'lucide-react';
import { formatPrice } from '@/lib/subscription';
import { RefundModal } from './RefundModal';
import { Button } from '@/components/ui/button';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { useAdminFetch } from '../useAdminFetch';
import { ModalShell } from '../ModalShell';
import { AdminSkeleton } from '../AdminSkeleton';

interface Subscription {
  id: string;
  academyId: string;
  academyName: string;
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  monthlyAmount: number;
  billingCycle: 'monthly' | 'yearly';
  totalUsers: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  paymentMethod?: string;
  autoRenew: boolean;
  lastPaymentDate?: Date;
  totalUserLimit?: number;
  storageLimitGb?: number;
}

interface Invoice {
  id: string;
  date: Date;
  amount: number;
  status: string;
  paymentMethod?: string;
  description?: string;
  refunded?: boolean;
  refundDetails?: {
    refundType?: string;
    refundAmount?: number;
    refundReason?: string;
    refundedAt?: string;
  };
  portoneReceiptUrl?: string;
}

interface SubscriptionDetailModalProps {
  subscription: Subscription;
  onClose: () => void;
  onRefresh?: () => void;
}

export function SubscriptionDetailModal({ subscription, onClose, onRefresh }: SubscriptionDetailModalProps) {
  const adminFetch = useAdminFetch();
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'usage' | 'history'>('overview');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [billingHistory, setBillingHistory] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [usageData, setUsageData] = useState<any>(null);

  // Fetch real invoice data
  useEffect(() => {
    loadInvoices();
    loadUsageData();
  }, [subscription.id]);

  const loadInvoices = async () => {
    try {
      setLoadingInvoices(true);

      const response = await adminFetch(`/api/admin/subscriptions/invoices?subscriptionId=${subscription.id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch invoices');
      }

      const result = await response.json();

      if (result.success && result.data.invoices) {
        // Format invoices for display
        const formattedInvoices = result.data.invoices.map((inv: any) => ({
          id: inv.id,
          date: new Date(inv.paidAt || inv.createdAt),
          amount: parseFloat(inv.amount),
          status: inv.status,
          paymentMethod: inv.paymentMethod,
          description: `${inv.planTier} plan - ${new Date(inv.billingPeriodStart).toLocaleDateString()} to ${new Date(inv.billingPeriodEnd).toLocaleDateString()}`,
          refunded: inv.refunded,
          refundDetails: inv.refundDetails,
          portoneReceiptUrl: inv.portoneReceiptUrl,
        }));

        setBillingHistory(formattedInvoices);
      }
    } catch (error) {
      console.error('[SubscriptionDetailModal] Error loading invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const loadUsageData = async () => {
    try {
      // Fetch usage data from API
      const response = await adminFetch(`/api/admin/subscriptions/usage?academyId=${subscription.academyId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setUsageData({
          users: {
            current: result.data.totalUsers,
            limit: subscription.totalUserLimit || -1
          },
          storage: {
            current: result.data.storageGb,
            limit: subscription.storageLimitGb || -1
          },
        });
      } else {
        throw new Error('Invalid response from usage API');
      }
    } catch (error) {
      console.error('[SubscriptionDetailModal] Error loading usage:', error);
      // Use fallback data on error
      setUsageData({
        users: { current: subscription.totalUsers || 0, limit: subscription.totalUserLimit || -1 },
        storage: { current: 0, limit: subscription.storageLimitGb || -1 },
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-rose-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-rose-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <ModalShell
      onClose={onClose}
      size="4xl"
      bodyClassName="p-0"
      title={
        <span className="inline-flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-[#1f6fc7]" />
          <span className="flex flex-col">
            <span className="text-xl font-semibold text-gray-900">{subscription.academyName}</span>
            <span className="text-sm font-normal text-gray-500">Subscription ID: {subscription.id}</span>
          </span>
        </span>
      }
      footer={
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      }
    >
      <>
        {/* Tabs — pill-underline pattern shared with all admin tabbed UIs. */}
        <div className="border-b border-gray-200/70">
          <div className="flex gap-1 px-4">
            {(['overview', 'billing', 'usage', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative py-3 px-3 text-sm font-medium transition-colors ${
                  activeTab === tab ? 'text-[#1f6fc7]' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <span className="absolute -bottom-px left-2 right-2 h-0.5 bg-[#2885e8] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
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
                      {subscription.status === 'active' && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                      {subscription.status === 'past_due' && <XCircle className="h-4 w-4 text-rose-600" />}
                      {subscription.status === 'trialing' && <Clock className="h-4 w-4 text-[#1f6fc7]" />}
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
                      <span className={subscription.status === 'past_due' ? 'text-rose-600 font-medium' : ''}>
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
                      <span className={subscription.autoRenew ? 'text-emerald-600' : 'text-rose-600'}>
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
                <h3 className="font-medium text-gray-900 mb-4">Payment History</h3>
                {loadingInvoices ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="bg-gray-50/60 ring-1 ring-gray-200/70 rounded-lg p-4 flex items-center justify-between">
                        <div className="space-y-2">
                          <AdminSkeleton.Bar className="h-3.5 w-32" />
                          <AdminSkeleton.Bar className="h-2.5 w-48" />
                        </div>
                        <AdminSkeleton.Bar className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : billingHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No payment history</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No invoices found for this subscription
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {billingHistory.map((invoice, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                        <div className="flex items-center space-x-3 flex-1">
                          {getStatusIcon(invoice.status)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-gray-900">{invoice.id.substring(0, 8)}...</p>
                              {invoice.refunded && (
                                <StatusBadge tone="pending" size="sm">Refunded</StatusBadge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{invoice.description}</p>
                            {invoice.refunded && invoice.refundDetails && (
                              <p className="text-xs text-amber-600 mt-1">
                                {invoice.refundDetails.refundType === 'partial' ? 'Partial refund' : 'Full refund'}:
                                {invoice.refundDetails.refundAmount && ` ${formatPrice(invoice.refundDetails.refundAmount)}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right mr-4">
                          <p className="font-medium">{formatPrice(invoice.amount)}</p>
                          <p className="text-sm text-gray-500">{invoice.date.toLocaleDateString()}</p>
                          <p className="text-xs text-gray-400">{invoice.paymentMethod}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {(() => {
                            // Local helper — invoice status → tone mapping.
                            // paid → active, partially_refunded/refunded → pending,
                            // failed → danger, unknown → muted.
                            const tone: StatusTone =
                              invoice.status === 'paid' ? 'active' :
                              invoice.status === 'refunded' ? 'pending' :
                              invoice.status === 'partially_refunded' ? 'pending' :
                              invoice.status === 'failed' ? 'danger' : 'muted'
                            return (
                              <StatusBadge tone={tone}>
                                {invoice.status.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </StatusBadge>
                            )
                          })()}
                          {(invoice.status === 'paid' && !invoice.refunded) && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowRefundModal(true);
                              }}
                              className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50"
                              title="Process Refund"
                            >
                              <Undo2 className="h-4 w-4" />
                            </button>
                          )}
                          {invoice.portoneReceiptUrl && (
                            <a
                              href={invoice.portoneReceiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#1f6fc7] hover:text-primary/90 p-1"
                              title="View Receipt"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {subscription.status === 'past_due' && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg">
                  <div className="flex items-start">
                    <XCircle className="h-5 w-5 text-rose-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-red-900">Payment Overdue</h4>
                      <p className="text-sm text-rose-700 mt-1">
                        This subscription has an overdue payment. The service may be suspended if payment is not received soon.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-6">
              {!usageData ? (
                <div className="space-y-3">
                  <AdminSkeleton.Bar className="h-12 w-full rounded-lg" />
                  <AdminSkeleton.Bar className="h-12 w-full rounded-lg" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    {Object.entries(usageData).map(([key, data]: [string, any]) => (
                      <div key={key} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900 capitalize">
                            {key}
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
                  {Object.entries(usageData).some(([_, data]: [string, any]) => data.limit !== -1 && getUsagePercentage(data.current, data.limit) > 80) && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-2" />
                        <div>
                          <h4 className="font-medium text-amber-900">Usage Alert</h4>
                          <p className="text-sm text-amber-700 mt-1">
                            Some usage metrics are approaching their limits. Consider upgrading to avoid service interruption.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Subscription History</h3>

              {/* Real history from billingHistory + subscription lifecycle.
                  The previous version showed two hardcoded fake events with
                  fixed "Nov 1, 2024" timestamps. Replaced with the real
                  subscription start + actual invoice events from the API. */}
              <div className="space-y-3">
                {/* Subscription created — real from currentPeriodStart */}
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Subscription Created</p>
                    <p className="text-xs text-gray-500">
                      {subscription.currentPeriodStart.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Real invoice / payment events from the billing API */}
                {loadingInvoices ? (
                  <>
                    <AdminSkeleton.Bar className="h-16 w-full rounded-lg" />
                    <AdminSkeleton.Bar className="h-16 w-full rounded-lg" />
                  </>
                ) : billingHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 italic px-4">
                    No payment events recorded for this subscription yet.
                  </p>
                ) : (
                  billingHistory.map((invoice) => {
                    const isPaid = invoice.status === 'paid'
                    const isFailed = invoice.status === 'failed'
                    const isRefunded = invoice.refunded || invoice.status === 'refunded' || invoice.status === 'partially_refunded'
                    return (
                      <div
                        key={invoice.id}
                        className={`flex items-start space-x-3 p-4 rounded-lg ${isFailed ? 'bg-rose-50' : 'bg-gray-50'}`}
                      >
                        {isFailed ? (
                          <XCircle className="h-5 w-5 text-rose-600 mt-0.5" />
                        ) : isRefunded ? (
                          <Undo2 className="h-5 w-5 text-amber-600 mt-0.5" />
                        ) : (
                          <DollarSign className="h-5 w-5 text-[#1f6fc7] mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {isFailed ? 'Payment Failed' :
                             isRefunded ? 'Payment Refunded' :
                             isPaid ? 'Payment Successful' :
                             `Payment ${invoice.status}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatPrice(invoice.amount)}
                            {invoice.paymentMethod ? ` · ${invoice.paymentMethod}` : ''}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {invoice.date.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </>

      {/* Refund Modal */}
      {showRefundModal && selectedInvoice && (
        <RefundModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowRefundModal(false);
            setSelectedInvoice(null);
          }}
          onRefundSuccess={() => {
            // Reload invoices to show refund status
            loadInvoices();
            // Refresh the subscription data
            if (onRefresh) {
              onRefresh();
            }
          }}
        />
      )}
    </ModalShell>
  );
}