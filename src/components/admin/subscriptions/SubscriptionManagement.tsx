'use client'

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  Search,
  Download,
  MoreVertical,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Building2
} from 'lucide-react';
import { formatPrice } from '@/lib/subscription';
import { SubscriptionDetailModal } from './SubscriptionDetailModal';

interface SubscriptionData {
  id: string;
  academyId: string;
  academyName: string;
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  monthlyAmount: number;
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  autoRenew: boolean;
  studentCount: number;
  teacherCount: number;
  paymentMethod?: string;
}

interface RevenueMetrics {
  totalMRR: number;
  totalARR: number;
  growth: number;
  churnRate: number;
  newSubscriptions: number;
  canceledSubscriptions: number;
}

export function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActions, setShowActions] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      
      // Mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockMetrics: RevenueMetrics = {
        totalMRR: 12500000,
        totalARR: 150000000,
        growth: 15.3,
        churnRate: 2.1,
        newSubscriptions: 23,
        canceledSubscriptions: 5
      };

      const mockSubscriptions: SubscriptionData[] = [
        {
          id: 'sub_001',
          academyId: '1',
          academyName: 'Seoul Language Academy',
          tier: 'pro',
          status: 'active',
          monthlyAmount: 150000,
          billingCycle: 'monthly',
          currentPeriodStart: new Date('2024-11-01'),
          currentPeriodEnd: new Date('2024-12-01'),
          nextBillingDate: new Date('2024-12-01'),
          lastPaymentDate: new Date('2024-11-01'),
          lastPaymentAmount: 150000,
          autoRenew: true,
          studentCount: 156,
          teacherCount: 12,
          paymentMethod: 'Credit Card'
        },
        {
          id: 'sub_002',
          academyId: '2',
          academyName: 'Busan Math Center',
          tier: 'basic',
          status: 'past_due',
          monthlyAmount: 50000,
          billingCycle: 'monthly',
          currentPeriodStart: new Date('2024-10-01'),
          currentPeriodEnd: new Date('2024-11-01'),
          nextBillingDate: new Date('2024-11-01'),
          lastPaymentDate: new Date('2024-09-01'),
          lastPaymentAmount: 50000,
          autoRenew: true,
          studentCount: 89,
          teacherCount: 6,
          paymentMethod: 'Bank Transfer'
        },
        {
          id: 'sub_003',
          academyId: '3',
          academyName: 'Incheon Science Academy',
          tier: 'pro',
          status: 'active',
          monthlyAmount: 150000,
          billingCycle: 'yearly',
          currentPeriodStart: new Date('2024-01-01'),
          currentPeriodEnd: new Date('2025-01-01'),
          nextBillingDate: new Date('2025-01-01'),
          lastPaymentDate: new Date('2024-01-01'),
          lastPaymentAmount: 1800000,
          autoRenew: true,
          studentCount: 234,
          teacherCount: 18,
          paymentMethod: 'Credit Card'
        },
        {
          id: 'sub_004',
          academyId: '5',
          academyName: 'Gwangju Music School',
          tier: 'enterprise',
          status: 'active',
          monthlyAmount: 500000,
          billingCycle: 'monthly',
          currentPeriodStart: new Date('2024-11-01'),
          currentPeriodEnd: new Date('2024-12-01'),
          nextBillingDate: new Date('2024-12-01'),
          lastPaymentDate: new Date('2024-11-01'),
          lastPaymentAmount: 500000,
          autoRenew: true,
          studentCount: 512,
          teacherCount: 45,
          paymentMethod: 'Enterprise Contract'
        },
      ];

      setMetrics(mockMetrics);
      setSubscriptions(mockSubscriptions);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: SubscriptionData['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Active
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            Past Due
          </span>
        );
      case 'trialing':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            <AlertCircle className="mr-1 h-3 w-3" />
            Trial
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="mr-1 h-3 w-3" />
            Canceled
          </span>
        );
      default:
        return null;
    }
  };

  const getTierBadge = (tier: SubscriptionData['tier']) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      basic: 'bg-blue-100 text-blue-800',
      pro: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-indigo-100 text-indigo-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[tier]}`}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </span>
    );
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.academyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sub.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    const matchesTier = filterTier === 'all' || sub.tier === filterTier;
    
    return matchesSearch && matchesStatus && matchesTier;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Failed to load subscription data</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Revenue Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Recurring Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">{formatPrice(metrics.totalMRR)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">+{metrics.growth}%</span>
              <span className="text-gray-500 ml-1">from last month</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Annual Recurring Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">{formatPrice(metrics.totalARR)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <ArrowUpRight className="h-4 w-4 text-blue-600 mr-1" />
              <span className="text-blue-600 font-medium">Projected</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Churn Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.churnRate}%</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <ArrowDownRight className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">-0.3%</span>
              <span className="text-gray-500 ml-1">from last month</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Growth</p>
                <p className="text-2xl font-semibold text-gray-900">
                  +{metrics.newSubscriptions - metrics.canceledSubscriptions}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-green-600 font-medium">+{metrics.newSubscriptions}</span>
              <span className="text-gray-500 mx-1">new,</span>
              <span className="text-red-600 font-medium">-{metrics.canceledSubscriptions}</span>
              <span className="text-gray-500 ml-1">canceled</span>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search subscriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="past_due">Past Due</option>
                <option value="trialing">Trial</option>
                <option value="canceled">Canceled</option>
              </select>
              
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Tiers</option>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              
              <button
                onClick={loadSubscriptionData}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </button>
              
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center">
                <Download className="mr-2 h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Subscription List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Academy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Billing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{subscription.academyName}</div>
                        <div className="text-xs text-gray-500">ID: {subscription.id}</div>
                        {subscription.paymentMethod && (
                          <div className="text-xs text-gray-500 mt-1">{subscription.paymentMethod}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(subscription.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {getTierBadge(subscription.tier)}
                        <div className="text-xs text-gray-500">
                          {subscription.billingCycle}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatPrice(subscription.monthlyAmount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {subscription.billingCycle === 'yearly' ? '/year' : '/month'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">
                          {subscription.nextBillingDate.toLocaleDateString()}
                        </div>
                        <div className={`text-xs ${
                          subscription.status === 'past_due' ? 'text-red-600 font-medium' : 'text-gray-500'
                        }`}>
                          {subscription.status === 'past_due' ? 'Overdue' : 
                           `${Math.ceil((subscription.nextBillingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="flex items-center text-gray-900">
                          <Users className="mr-1 h-3 w-3" />
                          {subscription.studentCount}S / {subscription.teacherCount}T
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right relative">
                      <button
                        onClick={() => setShowActions(showActions === subscription.id ? null : subscription.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      
                      {showActions === subscription.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                          <button
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setShowDetailModal(true);
                              setShowActions(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <CreditCard className="mr-3 h-4 w-4" />
                            View Details
                          </button>
                          <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <Calendar className="mr-3 h-4 w-4" />
                            Billing History
                          </button>
                          <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <RefreshCw className="mr-3 h-4 w-4" />
                            Retry Payment
                          </button>
                          <hr className="my-1" />
                          <button className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50">
                            <XCircle className="mr-3 h-4 w-4" />
                            Cancel Subscription
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredSubscriptions.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No subscriptions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedSubscription && (
        <SubscriptionDetailModal
          subscription={selectedSubscription}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedSubscription(null);
          }}
        />
      )}

      {/* Click outside to close actions menu */}
      {showActions && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowActions(null)}
        />
      )}
    </>
  );
}