'use client'

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Search,
  Download,
  MoreVertical,
  RefreshCw,
  Users,
  Building2
} from 'lucide-react';
import { formatPrice } from '@/lib/subscription';
import { SubscriptionDetailModal } from './SubscriptionDetailModal';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '../AdminPageHeader';
import { DashboardCard } from '../DashboardCard';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { AdminSkeleton } from '../AdminSkeleton';
import { useAdminFetch } from '../useAdminFetch';
import { useLiveAnnounce } from '../useLiveAnnounce';
import { useUrlState } from '../useUrlState';
import { useTableSort } from '../useTableSort';
import { SortableTh } from '../SortableTh';
import { useDebouncedValue } from '../useDebouncedValue';
import { AdminEmptyState } from '../AdminEmptyState';
import { useTranslation } from '@/hooks/useTranslation';

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
  totalUsers: number;
  totalUserLimit?: number;
  storageLimitGb?: number;
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
  const { t } = useTranslation();
  const adminFetch = useAdminFetch();
  const { announce, LiveRegion } = useLiveAnnounce();
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  // Filter state mirrored to URL params so refreshing / sharing the page
  // preserves what the admin was looking at. The Quick Action on the
  // dashboard links to `/admin/subscriptions?status=past_due` — that
  // already works because of this hook.
  const [searchTerm, setSearchTerm] = useUrlState('q', '');
  const [filterStatus, setFilterStatus] = useUrlState('status', 'all');
  const [filterTier, setFilterTier] = useUrlState('tier', 'all');
  const debouncedSearch = useDebouncedValue(searchTerm, 200);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);

      const response = await adminFetch('/api/admin/subscriptions');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch subscriptions');
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Convert date strings to Date objects
        const formattedSubscriptions = result.data.subscriptions.map((sub: any) => ({
          ...sub,
          currentPeriodStart: new Date(sub.currentPeriodStart),
          currentPeriodEnd: new Date(sub.currentPeriodEnd),
          nextBillingDate: new Date(sub.nextBillingDate),
          lastPaymentDate: sub.lastPaymentDate ? new Date(sub.lastPaymentDate) : undefined,
        }));

        setSubscriptions(formattedSubscriptions)
        announce(`Loaded ${formattedSubscriptions.length} subscriptions.`);
        setMetrics(result.data.metrics);
      }
    } catch (error) {
      console.error('[SubscriptionManagement] Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Status badge — routes through shared StatusBadge so colors stay
  // consistent with every other admin table.
  const getStatusBadge = (status: SubscriptionData['status']) => {
    const map: Record<SubscriptionData['status'], { tone: StatusTone; icon: typeof CheckCircle; label: string }> = {
      active:    { tone: 'active',  icon: CheckCircle, label: 'Active' },
      past_due:  { tone: 'danger',  icon: XCircle,     label: 'Past Due' },
      trialing:  { tone: 'pending', icon: AlertCircle, label: 'Trial' },
      canceled:  { tone: 'muted',   icon: XCircle,     label: 'Canceled' },
    }
    const entry = map[status]
    if (!entry) return null
    return <StatusBadge tone={entry.tone} icon={entry.icon}>{entry.label}</StatusBadge>
  };

  // Tier badge — also through StatusBadge. "Higher" tiers get richer tones
  // so admins can scan plan distribution at a glance.
  const getTierBadge = (tier: SubscriptionData['tier']) => {
    const tierTones: Record<string, StatusTone> = {
      free: 'muted',
      individual: 'info',
      basic: 'brand',
      pro: 'violet',
      enterprise: 'violet',
    }
    return (
      <StatusBadge tone={tierTones[tier] || 'muted'}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </StatusBadge>
    )
  };

  // Export the currently-filtered subscription rows as a CSV. Uses the
  // visible filters so admins get exactly what's on screen, not the whole
  // dataset. Reasonable for ad-hoc reporting; for large datasets do
  // server-side export instead.
  const handleExportCSV = () => {
    if (filteredSubscriptions.length === 0) return;
    const headers = ['Subscription ID', 'Academy', 'Tier', 'Status', 'Monthly Amount', 'Billing Cycle', 'Next Billing', 'Total Users'];
    const rows = filteredSubscriptions.map(sub => [
      sub.id,
      sub.academyName,
      sub.tier,
      sub.status,
      sub.monthlyAmount,
      sub.billingCycle,
      sub.nextBillingDate.toISOString().split('T')[0],
      sub.totalUsers,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `subscriptions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.academyName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                          sub.id.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    const matchesTier = filterTier === 'all' || sub.tier === filterTier;
    
    return matchesSearch && matchesStatus && matchesTier;
  });

  // Sort filtered subscriptions; key + direction sync to the URL.
  const { toggle: toggleSort, sortIndicator, sorted: sortedSubscriptions } = useTableSort(
    filteredSubscriptions,
    {
      defaultKey: '', defaultDir: '',
      getValue: (s, key) => {
        switch (key) {
          case 'academy':     return s.academyName
          case 'status':      return s.status
          case 'plan':        return s.tier
          case 'revenue':     return s.monthlyAmount
          case 'nextBilling': return s.nextBillingDate
          case 'users':       return s.totalUsers
          default: return null
        }
      },
    },
  )

  return (
    <>
      <div className="space-y-6">
        {/* Header always visible — body shows skeleton or error during load */}
        <AdminPageHeader
          kicker={String(t('admin.subscriptions.kicker'))}
          title={String(t('admin.subscriptions.title'))}
          description={String(t('admin.subscriptions.subtitle'))}
          actions={
            <Button onClick={loadSubscriptionData} variant="outline" size="sm" disabled={loading} className="gap-1.5">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {String(t('admin.header.refresh'))}
            </Button>
          }
        />
        <LiveRegion />

        {loading ? (
          <AdminSkeleton.Body stats={4} cols={7} rows={6} />
        ) : !metrics ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="h-10 w-10 text-rose-400 mb-3" />
            <p className="text-sm font-medium text-gray-900">{String(t('admin.subscriptions.failedToLoad'))}</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              {String(t('admin.subscriptions.failedToLoadDesc'))}
            </p>
            <Button onClick={loadSubscriptionData} variant="outline" className="mt-4">
              <RefreshCw className="w-4 h-4 mr-1.5" />
              {String(t('admin.subscriptions.retry'))}
            </Button>
          </div>
        ) : (<>
        {/* Revenue Metrics — uses shared DashboardCard for consistent surfaces */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title={String(t('admin.subscriptions.monthlyRecurringRevenue'))}
            value={formatPrice(metrics.totalMRR)}
            subtitle={String(t('admin.subscriptions.growthFromLastMonth', { percent: metrics.growth }))}
            icon={<DollarSign className="h-5 w-5" />}
            accent="emerald"
            trend={{ value: metrics.growth, isPositive: metrics.growth >= 0 }}
          />
          <DashboardCard
            title={String(t('admin.subscriptions.annualRecurringRevenue'))}
            value={formatPrice(metrics.totalARR)}
            subtitle={String(t('admin.subscriptions.annualRecurringRevenueSubtitle'))}
            icon={<TrendingUp className="h-5 w-5" />}
            accent="blue"
          />
          {/* No subtitle: the API doesn't return a previous-period churn yet,
              so we can't show a real delta. Showing a hardcoded "-0.3%"
              would be a lie. Add the subtitle back once the metrics
              endpoint exposes a comparable historical churn rate. */}
          <DashboardCard
            title={String(t('admin.subscriptions.churnRate'))}
            value={`${metrics.churnRate}%`}
            icon={<AlertCircle className="h-5 w-5" />}
            accent="amber"
          />
          <DashboardCard
            title={String(t('admin.subscriptions.netGrowth'))}
            value={`+${metrics.newSubscriptions - metrics.canceledSubscriptions}`}
            subtitle={String(t('admin.subscriptions.netGrowthSubtitle', { newCount: metrics.newSubscriptions, canceledCount: metrics.canceledSubscriptions }))}
            icon={<Building2 className="h-5 w-5" />}
            accent="violet"
          />
        </div>

        {/* Filters and Actions */}
        <div className="bg-white p-4 rounded-xl ring-1 ring-gray-200/70">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder={String(t('admin.subscriptions.searchPlaceholder'))}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={String(t('admin.subscriptions.allStatuses'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{String(t('admin.subscriptions.allStatuses'))}</SelectItem>
                  <SelectItem value="active">{String(t('admin.subscriptions.active'))}</SelectItem>
                  <SelectItem value="past_due">{String(t('admin.subscriptions.pastDueStatus'))}</SelectItem>
                  <SelectItem value="trialing">{String(t('admin.subscriptions.trial'))}</SelectItem>
                  <SelectItem value="canceled">{String(t('admin.subscriptions.cancelledStatus'))}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={String(t('admin.subscriptions.allTiers'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{String(t('admin.subscriptions.allTiers'))}</SelectItem>
                  <SelectItem value="free">{String(t('admin.subscriptions.tierFree'))}</SelectItem>
                  <SelectItem value="individual">{String(t('admin.subscriptions.tierIndividual'))}</SelectItem>
                  <SelectItem value="basic">{String(t('admin.subscriptions.tierBasic'))}</SelectItem>
                  <SelectItem value="pro">{String(t('admin.subscriptions.tierPro'))}</SelectItem>
                  <SelectItem value="enterprise">{String(t('admin.subscriptions.tierEnterprise'))}</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={handleExportCSV} disabled={filteredSubscriptions.length === 0}>
                <Download className="w-4 h-4" />
                {String(t('admin.users.export'))}
              </Button>
            </div>
          </div>
        </div>

        {/* Subscription List */}
        <div className="bg-white rounded-xl ring-1 ring-gray-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/60 border-b border-gray-200/70">
                <tr>
                  <SortableTh sortKey="academy" toggle={toggleSort} indicator={sortIndicator('academy')}>{String(t('admin.subscriptions.columns.academy'))}</SortableTh>
                  <SortableTh sortKey="status" toggle={toggleSort} indicator={sortIndicator('status')}>{String(t('admin.subscriptions.columns.status'))}</SortableTh>
                  <SortableTh sortKey="plan" toggle={toggleSort} indicator={sortIndicator('plan')}>{String(t('admin.subscriptions.columns.plan'))}</SortableTh>
                  <SortableTh sortKey="revenue" toggle={toggleSort} indicator={sortIndicator('revenue')}>{String(t('admin.subscriptions.columns.revenue'))}</SortableTh>
                  <SortableTh sortKey="nextBilling" toggle={toggleSort} indicator={sortIndicator('nextBilling')}>{String(t('admin.subscriptions.columns.nextBilling'))}</SortableTh>
                  <SortableTh sortKey="users" toggle={toggleSort} indicator={sortIndicator('users')}>{String(t('admin.subscriptions.columns.users'))}</SortableTh>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedSubscriptions.map((subscription) => (
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
                      <div>
                        <div className="mb-1">
                          {getTierBadge(subscription.tier)}
                        </div>
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
                          subscription.status === 'past_due' ? 'text-rose-600 font-medium' : 'text-gray-500'
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
                          {subscription.totalUsers} {subscription.totalUserLimit && subscription.totalUserLimit > 0 ? `/ ${subscription.totalUserLimit}` : ''}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPosition({
                              top: rect.bottom + 8,
                              right: window.innerWidth - rect.right
                            });
                            setShowActions(showActions === subscription.id ? null : subscription.id);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label={String(t('admin.subscriptions.rowActions'))}
                          aria-haspopup="menu"
                          aria-expanded={showActions === subscription.id}
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        {showActions === subscription.id && menuPosition && (
                          <div
                            className="fixed min-w-[180px] w-max bg-white rounded-xl shadow-xl shadow-gray-900/10 ring-1 ring-gray-200/70 py-1 z-50 overflow-hidden"
                            style={{
                              top: `${menuPosition.top}px`,
                              right: `${menuPosition.right}px`
                            }}
                          >
                          <button
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setShowDetailModal(true);
                              setShowActions(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                          >
                            <CreditCard className="mr-3 h-4 w-4" />
                            View Details
                          </button>
                        </div>
                      )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredSubscriptions.length === 0 && (
            <AdminEmptyState
              icon={CreditCard}
              title={String(t('admin.subscriptions.noSubscriptionsTitle'))}
              description="Try adjusting your search or filters"
            />
          )}
        </div>
        </>)}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedSubscription && (
        <SubscriptionDetailModal
          subscription={selectedSubscription}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedSubscription(null);
          }}
          onRefresh={() => {
            loadSubscriptionData();
          }}
        />
      )}

      {/* Click outside to close actions menu */}
      {showActions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowActions(null);
            setMenuPosition(null);
          }}
        />
      )}
    </>
  );
}