'use client'

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  Download,
  RefreshCw,
  Eye,
  Activity,
  AlertCircle,
  Clock
} from 'lucide-react';
import { formatPrice } from '@/lib/subscription';

interface AnalyticsData {
  revenue: {
    total: number;
    growth: number;
    byPlan: { plan: string; amount: number; percentage: number }[];
    trend: { month: string; amount: number }[];
  };
  customers: {
    total: number;
    new: number;
    churn: number;
    byStatus: { status: string; count: number }[];
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
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'customers' | 'usage'>('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: AnalyticsData = {
        revenue: {
          total: 15650000,
          growth: 12.5,
          byPlan: [
            { plan: 'Pro', amount: 7800000, percentage: 49.8 },
            { plan: 'Basic', amount: 3900000, percentage: 24.9 },
            { plan: 'Enterprise', amount: 3950000, percentage: 25.3 }
          ],
          trend: [
            { month: 'Jul', amount: 12500000 },
            { month: 'Aug', amount: 13200000 },
            { month: 'Sep', amount: 14100000 },
            { month: 'Oct', amount: 14900000 },
            { month: 'Nov', amount: 15650000 }
          ]
        },
        customers: {
          total: 147,
          new: 23,
          churn: 5,
          byStatus: [
            { status: 'Active', count: 128 },
            { status: 'Trial', count: 12 },
            { status: 'Suspended', count: 4 },
            { status: 'Canceled', count: 3 }
          ]
        },
        usage: {
          activeUsers: 2843,
          totalSessions: 15420,
          avgSessionDuration: 24.5,
          topFeatures: [
            { feature: 'Student Management', usage: 89.2 },
            { feature: 'Attendance Tracking', usage: 76.8 },
            { feature: 'Assignment Creation', usage: 65.4 },
            { feature: 'Payment Processing', usage: 58.9 },
            { feature: 'Reports Generation', usage: 45.3 }
          ]
        },
        geography: {
          byRegion: [
            { region: 'Seoul', customers: 45, revenue: 6200000 },
            { region: 'Busan', customers: 28, revenue: 3800000 },
            { region: 'Incheon', customers: 22, revenue: 2950000 },
            { region: 'Daegu', customers: 18, revenue: 1850000 },
            { region: 'Other', customers: 34, revenue: 850000 }
          ]
        }
      };

      setData(mockData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Revenue insights and business metrics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <button
            onClick={loadAnalyticsData}
            className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {formatPrice(data.revenue.total)}
          </div>
          <div className="flex items-center text-sm text-green-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>+{data.revenue.growth}% from last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Customers</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {data.customers.total}
          </div>
          <div className="flex items-center text-sm text-green-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>+{data.customers.new} new this month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Active Users</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {data.usage.activeUsers.toLocaleString()}
          </div>
          <div className="flex items-center text-sm text-blue-600">
            <Activity className="w-4 h-4 mr-1" />
            <span>{data.usage.totalSessions.toLocaleString()} sessions</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Churn Rate</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {((data.customers.churn / data.customers.total) * 100).toFixed(1)}%
          </div>
          <div className="flex items-center text-sm text-red-600">
            <TrendingDown className="w-4 h-4 mr-1" />
            <span>{data.customers.churn} canceled this month</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <div className="flex space-x-8 px-6">
            {(['overview', 'revenue', 'customers', 'usage'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 border-b-2 font-medium text-sm transition-colors ${
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
                          index === 1 ? 'bg-blue-500' : 'bg-green-500'
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
                          className="bg-blue-500 h-2 rounded-full"
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
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700">MRR</p>
                      <p className="text-xl font-semibold text-green-900">{formatPrice(data.revenue.total)}</p>
                    </div>
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700">ARR</p>
                      <p className="text-xl font-semibold text-blue-900">{formatPrice(data.revenue.total * 12)}</p>
                    </div>
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-700">Average Revenue Per User</p>
                      <p className="text-xl font-semibold text-purple-900">
                        {formatPrice(Math.round(data.revenue.total / data.customers.total))}
                      </p>
                    </div>
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
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
                        <span className="font-medium">{formatPrice(data.revenue.total * 0.7)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Annual subscriptions</span>
                        <span className="font-medium">{formatPrice(data.revenue.total * 0.3)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Growth Metrics</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Month-over-month growth</span>
                        <span className="font-medium text-green-600">+{data.revenue.growth}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Year-over-year growth</span>
                        <span className="font-medium text-green-600">+45.2%</span>
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
                        status.status === 'Active' ? 'bg-green-500' :
                        status.status === 'Trial' ? 'bg-blue-500' :
                        status.status === 'Suspended' ? 'bg-red-500' : 'bg-gray-500'
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
                    <span className="font-semibold">12,450</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded border ml-4">
                    <span>Trial Signups</span>
                    <span className="font-semibold">1,245 (10%)</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded border ml-8">
                    <span>Paid Conversions</span>
                    <span className="font-semibold">156 (12.5%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700">Daily Active Users</p>
                      <p className="text-xl font-semibold text-blue-900">{Math.round(data.usage.activeUsers * 0.4).toLocaleString()}</p>
                    </div>
                    <Eye className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700">Monthly Active Users</p>
                      <p className="text-xl font-semibold text-green-900">{data.usage.activeUsers.toLocaleString()}</p>
                    </div>
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-700">Avg Session Duration</p>
                      <p className="text-xl font-semibold text-purple-900">{data.usage.avgSessionDuration} min</p>
                    </div>
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
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
                          <span className="text-sm font-medium">245ms</span>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Database Performance</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">Good</span>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Error Rate</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">0.2%</span>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Usage Alerts</h5>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-900">High API Usage</p>
                          <p className="text-yellow-700">Some academies approaching API limits</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <Activity className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-900">Peak Usage Hours</p>
                          <p className="text-blue-700">9 AM - 11 AM, 2 PM - 4 PM</p>
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
    </div>
  );
}