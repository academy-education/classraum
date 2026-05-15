'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  Download,
  RefreshCw,
  Activity,
  AlertCircle,
  Clock
} from 'lucide-react';
import { formatPrice } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminPageHeader } from '../AdminPageHeader';
import { DashboardCard } from '../DashboardCard';
import { AdminSkeleton } from '../AdminSkeleton';
import { useAdminFetch } from '../useAdminFetch';

interface AnalyticsData {
  revenue: {
    total: number;
    growth: number;
    yearOverYearGrowth: number;
    byPlan: { plan: string; amount: number; percentage: number }[];
    trend: { month: string; amount: number }[];
    monthlyBreakdown: {
      monthly: number;
      annual: number;
    };
  };
  customers: {
    total: number;
    new: number;
    churn: number;
    byStatus: { status: string; count: number }[];
    acquisition: {
      websiteVisitors: number;
      trialSignups: number;
      trialConversionRate: number;
      paidConversions: number;
      paidConversionRate: number;
    };
  };
  usage: {
    activeUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
    topFeatures: { feature: string; usage: number }[];
  };
  geography: {
    byRegion: { region: string; customers: number; revenue: number }[];
  };
  performance: {
    apiResponseTime: string;
    databasePerformance: string;
    errorRate: string;
    peakHours: string;
  };
}

export function AnalyticsDashboard() {
  const adminFetch = useAdminFetch();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'customers' | 'usage'>('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  // Export the revenue trend as CSV — the most actionable analytic.
  // Dumping the entire payload (nested breakdowns, acquisition funnel,
  // etc.) doesn't fit the spreadsheet workflow this is normally used for.
  const handleExportCSV = () => {
    if (!data) return;
    const headers = ['Month', 'Revenue'];
    const rows = data.revenue.trend.map(t => [t.month, t.amount]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `revenue_trend_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      const response = await adminFetch(`/api/admin/analytics?range=${timeRange}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics data');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (error) {
      console.error('[AnalyticsDashboard] Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header always visible — body switches to skeleton during load */}
      <AdminPageHeader
        kicker="Insights"
        title="Analytics"
        description="Revenue insights and business metrics across all academies."
        actions={
          <>
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as '7d' | '30d' | '90d' | '1y')}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadAnalyticsData} variant="outline" size="sm" className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" className="gap-1.5" onClick={handleExportCSV} disabled={!data}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </>
        }
      />

      {loading ? (
        <AdminSkeleton.Body stats={4} cols={4} rows={4} />
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="h-10 w-10 text-rose-400 mb-3" />
          <p className="text-sm font-medium text-gray-900">Failed to load analytics</p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            The analytics endpoint didn&apos;t return any data. Try refreshing.
          </p>
          <Button onClick={loadAnalyticsData} variant="outline" className="mt-4 gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      ) : (<>
      {/* Key Metrics — uses shared DashboardCard with semantic accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Revenue"
          value={formatPrice(data.revenue.total)}
          subtitle={`+${data.revenue.growth}% from last month`}
          icon={<DollarSign className="h-5 w-5" />}
          accent="emerald"
          trend={{ value: data.revenue.growth, isPositive: data.revenue.growth >= 0 }}
        />
        <DashboardCard
          title="Total Customers"
          value={data.customers.total.toLocaleString()}
          subtitle={`+${data.customers.new} new this month`}
          icon={<Building2 className="h-5 w-5" />}
          accent="blue"
        />
        <DashboardCard
          title="Active Users"
          value={data.usage.activeUsers.toLocaleString()}
          subtitle={`${data.usage.totalSessions.toLocaleString()} sessions`}
          icon={<Activity className="h-5 w-5" />}
          accent="violet"
        />
        <DashboardCard
          title="Churn Rate"
          value={`${((data.customers.churn / data.customers.total) * 100).toFixed(1)}%`}
          subtitle={`${data.customers.churn} canceled this month`}
          icon={<TrendingDown className="h-5 w-5" />}
          accent="rose"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl ring-1 ring-gray-200/70">
        <div className="border-b border-gray-200/70">
          <div className="flex gap-1 px-4">
            {(['overview', 'revenue', 'customers', 'usage'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative py-3 px-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-[#1f6fc7]'
                    : 'text-gray-500 hover:text-gray-900'
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

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend Chart */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {data.revenue.trend.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex justify-center mb-2">
                        <div
                          className="w-8 bg-blue-500 rounded-t"
                          style={{
                            height: `${(item.amount / Math.max(...data.revenue.trend.map(t => t.amount))) * 200}px`,
                            minHeight: '20px'
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{item.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plan Distribution */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Plan</h3>
                <div className="space-y-3">
                  {data.revenue.byPlan.map((plan, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-purple-500' :
                          index === 1 ? 'bg-blue-500' : 'bg-emerald-500'
                        }`} />
                        <span className="font-medium">{plan.plan}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatPrice(plan.amount)}</div>
                        <div className="text-sm text-gray-500">{plan.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geographic Distribution */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customers by Region</h3>
                <div className="space-y-2">
                  {data.geography.byRegion.map((region, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{region.region}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{region.customers} academies</div>
                        <div className="text-xs text-gray-500">{formatPrice(region.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Features */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Usage</h3>
                <div className="space-y-3">
                  {data.usage.topFeatures.map((feature, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{feature.feature}</span>
                        <span className="text-gray-500">{feature.usage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${feature.usage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DashboardCard
                  title="MRR"
                  value={formatPrice(data.revenue.total)}
                  icon={<TrendingUp className="h-5 w-5" />}
                  accent="emerald"
                />
                <DashboardCard
                  title="ARR"
                  value={formatPrice(data.revenue.total * 12)}
                  icon={<BarChart3 className="h-5 w-5" />}
                  accent="blue"
                />
                <DashboardCard
                  title="Average Revenue Per User"
                  value={formatPrice(Math.round(data.revenue.total / data.customers.total))}
                  icon={<DollarSign className="h-5 w-5" />}
                  accent="violet"
                />
              </div>

              {/* Detailed Revenue Analysis */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">Revenue Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-3">By Billing Cycle</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Monthly subscriptions</span>
                        <span className="font-medium">{formatPrice(data.revenue.monthlyBreakdown.monthly)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Annual subscriptions</span>
                        <span className="font-medium">{formatPrice(data.revenue.monthlyBreakdown.annual)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Growth Metrics</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Month-over-month growth</span>
                        <span className="font-medium text-emerald-600">+{data.revenue.growth}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Year-over-year growth</span>
                        <span className="font-medium text-emerald-600">+{data.revenue.yearOverYearGrowth}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.customers.byStatus.map((status, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{status.status}</p>
                        <p className="text-2xl font-semibold">{status.count}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        status.status === 'Active' ? 'bg-emerald-500' :
                        status.status === 'Trial' ? 'bg-blue-500' :
                        status.status === 'Suspended' ? 'bg-rose-500' : 'bg-gray-500'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer Acquisition Funnel */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">Customer Acquisition Funnel</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded border">
                    <span>Website Visitors</span>
                    <span className="font-semibold">{data.customers.acquisition.websiteVisitors.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded border ml-4">
                    <span>Trial Signups</span>
                    <span className="font-semibold">{data.customers.acquisition.trialSignups.toLocaleString()} ({data.customers.acquisition.trialConversionRate}%)</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded border ml-8">
                    <span>Paid Conversions</span>
                    <span className="font-semibold">{data.customers.acquisition.paidConversions} ({data.customers.acquisition.paidConversionRate}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-6">
              {/* "Daily Active Users" was previously rendered as
                  Math.round(activeUsers * 0.4) — a fabricated 40% ratio.
                  Removed until the analytics API actually returns DAU. */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DashboardCard
                  title="Monthly Active Users"
                  value={data.usage.activeUsers.toLocaleString()}
                  icon={<Users className="h-5 w-5" />}
                  accent="emerald"
                />
                <DashboardCard
                  title="Avg Session Duration"
                  value={`${data.usage.avgSessionDuration} min`}
                  icon={<Clock className="h-5 w-5" />}
                  accent="violet"
                />
              </div>

              {/* Usage Heatmap */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">Platform Health</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-3">System Performance</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>API Response Time</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{data.performance.apiResponseTime}</span>
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Database Performance</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{data.performance.databasePerformance}</span>
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Error Rate</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{data.performance.errorRate}</span>
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Usage Alerts</h5>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2 p-2 bg-amber-50 border border-amber-200 rounded">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-900">High API Usage</p>
                          <p className="text-amber-700">Some academies approaching API limits</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2 p-2 bg-sky-50 border border-sky-200 rounded-lg">
                        <Activity className="h-4 w-4 text-sky-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-sky-900">Peak Usage Hours</p>
                          <p className="text-sky-700">{data.performance.peakHours}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </>)}
    </div>
  );
}