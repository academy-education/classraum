'use client'

import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Headphones
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { RecentActivity } from './RecentActivity';
import { ChartOverview } from './ChartOverview';
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  totalAcademies: number;
  activeAcademies: number;
  totalUsers: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  activeSubscriptions: number;
  trialAcademies: number;
  supportTickets: number;
  // Trend data for charts
  academiesTrend: number[];
  usersTrend: number[];
  subscriptionsTrend: number[];
  revenueTrend: number[];
  academiesGrowth: number;
  usersGrowth: number;
  subscriptionsGrowth: number;
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Add CSS to remove outline from all Recharts elements (matching main dashboard)
    const style = document.createElement('style')
    style.textContent = `
      .recharts-wrapper,
      .recharts-wrapper *,
      .recharts-wrapper *:focus,
      .recharts-wrapper *:active,
      .recharts-surface,
      .recharts-surface *,
      .recharts-surface *:focus {
        outline: none !important;
        border: none !important;
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch real data from Supabase
      const [
        academiesResult,
        usersResult,
        subscriptionsResult,
        studentsResult,
        parentsResult,
        teachersResult,
        managersResult
      ] = await Promise.all([
        // Fetch total academies
        supabase
          .from('academies')
          .select('*', { count: 'exact', head: true }),
        
        // Fetch total users
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true }),
        
        // Fetch active subscriptions from academy_subscriptions table
        supabase
          .from('academy_subscriptions')
          .select('*', { count: 'exact', head: true })
          .in('status', ['active', 'trialing']),
        
        // Fetch students count
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('active', true),
        
        // Fetch parents count
        supabase
          .from('parents')
          .select('*', { count: 'exact', head: true })
          .eq('active', true),
        
        // Fetch teachers count
        supabase
          .from('teachers')
          .select('*', { count: 'exact', head: true })
          .eq('active', true),
        
        // Fetch managers count
        supabase
          .from('managers')
          .select('*', { count: 'exact', head: true })
          .eq('active', true)
      ]);

      // Use the total users from the users table (the authoritative source)
      const totalUsers = usersResult.count || 0;
      
      // Optionally, we can also calculate users by type for additional stats
      const totalUsersByType = 
        (studentsResult.count || 0) + 
        (parentsResult.count || 0) + 
        (teachersResult.count || 0) + 
        (managersResult.count || 0);

      // Fetch active academies (academies with active subscriptions)
      const { data: activeAcademiesData } = await supabase
        .from('academy_subscriptions')
        .select('academy_id')
        .in('status', ['active', 'trialing']);
      
      const uniqueActiveAcademies = new Set(activeAcademiesData?.map(s => s.academy_id) || []);
      const activeAcademiesCount = uniqueActiveAcademies.size;

      // Fetch trial academies
      const { count: trialCount } = await supabase
        .from('academy_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'trialing');

      // Calculate monthly revenue (fetch paid invoices for current month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: revenueData } = await supabase
        .from('invoices')
        .select('final_amount')
        .eq('status', 'paid')
        .gte('paid_at', startOfMonth.toISOString());

      const monthlyRevenue = revenueData?.reduce((sum, invoice) => sum + (invoice.final_amount || 0), 0) || 0;

      // Calculate revenue growth (compare with last month)
      const startOfLastMonth = new Date(startOfMonth);
      startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
      
      const { data: lastMonthRevenueData } = await supabase
        .from('invoices')
        .select('final_amount')
        .eq('status', 'paid')
        .gte('paid_at', startOfLastMonth.toISOString())
        .lt('paid_at', startOfMonth.toISOString());

      const lastMonthRevenue = lastMonthRevenueData?.reduce((sum, invoice) => sum + (invoice.final_amount || 0), 0) || 0;
      const revenueGrowth = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      // Fetch historical data for trends (last 10 days)
      const last10Days = Array.from({ length: 10 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (9 - i));
        return date.toISOString().split('T')[0];
      });

      // Fetch historical academies data
      const academiesTrendPromises = last10Days.map(async (date) => {
        const { count } = await supabase
          .from('academies')
          .select('*', { count: 'exact', head: true })
          .lte('created_at', date + 'T23:59:59');
        return count || 0;
      });

      // Fetch historical users data
      const usersTrendPromises = last10Days.map(async (date) => {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .lte('created_at', date + 'T23:59:59');
        return count || 0;
      });

      // Fetch historical subscriptions data
      const subscriptionsTrendPromises = last10Days.map(async (date) => {
        const { count } = await supabase
          .from('academy_subscriptions')
          .select('*', { count: 'exact', head: true })
          .in('status', ['active', 'trialing'])
          .lte('created_at', date + 'T23:59:59');
        return count || 0;
      });

      // Fetch historical revenue data (daily revenue for last 10 days)
      const revenueTrendPromises = last10Days.map(async (date) => {
        const startOfDay = date + 'T00:00:00';
        const endOfDay = date + 'T23:59:59';
        
        const { data: dailyRevenueData } = await supabase
          .from('invoices')
          .select('final_amount')
          .eq('status', 'paid')
          .gte('paid_at', startOfDay)
          .lte('paid_at', endOfDay);
          
        return dailyRevenueData?.reduce((sum, invoice) => sum + (invoice.final_amount || 0), 0) || 0;
      });

      const [academiesTrend, usersTrend, subscriptionsTrend, revenueTrend] = await Promise.all([
        Promise.all(academiesTrendPromises),
        Promise.all(usersTrendPromises),
        Promise.all(subscriptionsTrendPromises),
        Promise.all(revenueTrendPromises)
      ]);

      // Calculate growth percentages
      const academiesGrowth = academiesTrend.length > 1 ? 
        ((academiesTrend[academiesTrend.length - 1] - academiesTrend[0]) / Math.max(academiesTrend[0], 1)) * 100 : 0;
      
      const usersGrowth = usersTrend.length > 1 ? 
        ((usersTrend[usersTrend.length - 1] - usersTrend[0]) / Math.max(usersTrend[0], 1)) * 100 : 0;
      
      const subscriptionsGrowth = subscriptionsTrend.length > 1 ? 
        ((subscriptionsTrend[subscriptionsTrend.length - 1] - subscriptionsTrend[0]) / Math.max(subscriptionsTrend[0], 1)) * 100 : 0;

      // Fetch support tickets (you may need to adjust this based on your support system)
      // For now, using a mock value as support tickets might be handled differently
      const supportTickets = 7;

      const stats: DashboardStats = {
        totalAcademies: academiesResult.count || 0,
        activeAcademies: activeAcademiesCount,
        totalUsers: totalUsers, // Use the count from the users table
        monthlyRevenue,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10, // Round to 1 decimal
        activeSubscriptions: subscriptionsResult.count || 0,
        trialAcademies: trialCount || 0,
        supportTickets,
        // Trend data
        academiesTrend,
        usersTrend,
        subscriptionsTrend,
        revenueTrend,
        academiesGrowth: Math.round(academiesGrowth * 10) / 10,
        usersGrowth: Math.round(usersGrowth * 10) / 10,
        subscriptionsGrowth: Math.round(subscriptionsGrowth * 10) / 10
      };

      const mockAlerts: SystemAlert[] = [
        {
          id: '1',
          type: 'warning',
          title: 'High Storage Usage',
          message: 'Platform storage usage is at 85% capacity',
          timestamp: new Date(),
          resolved: false
        },
        {
          id: '2',
          type: 'error',
          title: 'Payment Processing Issue',
          message: '3 payments failed in the last hour',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          resolved: false
        },
        {
          id: '3',
          type: 'info',
          title: 'System Maintenance',
          message: 'Scheduled maintenance completed successfully',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          resolved: true
        }
      ];

      console.log('Admin Dashboard Stats:', stats);
      console.log('Users table count:', totalUsers);
      console.log('Users by type count:', totalUsersByType);
      console.log('Breakdown:', {
        students: studentsResult.count || 0,
        parents: parentsResult.count || 0,
        teachers: teachersResult.count || 0,
        managers: managersResult.count || 0
      });

      setStats(stats);
      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      // Set fallback values if data fetching fails
      const fallbackStats: DashboardStats = {
        totalAcademies: 0,
        activeAcademies: 0,
        totalUsers: 0,
        monthlyRevenue: 0,
        revenueGrowth: 0,
        activeSubscriptions: 0,
        trialAcademies: 0,
        supportTickets: 0,
        academiesTrend: [],
        usersTrend: [],
        subscriptionsTrend: [],
        revenueTrend: [],
        academiesGrowth: 0,
        usersGrowth: 0,
        subscriptionsGrowth: 0
      };
      
      setStats(fallbackStats);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Custom tooltip component for mini charts
  const CustomTooltip = ({ active, payload, label, dataKey }: {
    active?: boolean;
    payload?: Array<{ value: number; color: string }>;
    label?: string;
    dataKey?: string;
  }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const formattedValue = dataKey === 'revenue' 
        ? formatCurrency(value)
        : value.toLocaleString();
      
      return (
        <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs shadow-lg">
          <p className="font-medium">{`Day ${(Number(label) || 0) + 1}`}</p>
          <p className="text-gray-300">{formattedValue}</p>
        </div>
      );
    }
    return null;
  };

  const getAlertIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertBgColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page Header Skeleton */}
        <div>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="w-5 h-5 bg-gray-200 rounded"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-36 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Platform overview and key metrics</p>
      </div>

      {/* System Alerts */}
      {alerts.filter(alert => !alert.resolved).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
            System Alerts
          </h2>
          <div className="space-y-2">
            {alerts.filter(alert => !alert.resolved).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 border rounded-lg ${getAlertBgColor(alert.type)}`}
              >
                <div className="flex items-start space-x-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{alert.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-2 flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {alert.timestamp.toLocaleString()}
                    </p>
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Academies</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.totalAcademies.toLocaleString()}
          </div>
          <div className={`flex items-center text-sm ${stats.academiesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.academiesGrowth >= 0 ? 
              <TrendingUp className="w-4 h-4 mr-1" /> : 
              <TrendingDown className="w-4 h-4 mr-1" />
            }
            <span>{stats.academiesGrowth >= 0 ? '+' : ''}{stats.academiesGrowth}% over 10 days</span>
          </div>
          
          {/* Mini Academy Trend Chart */}
          <div className="mt-4 w-full h-16 relative">
            {stats.academiesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.academiesTrend.map((value, index) => ({
                    day: index,
                    academies: value
                  }))}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <Line
                    type="monotone"
                    dataKey="academies"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Tooltip 
                    content={<CustomTooltip dataKey="academies" />}
                    wrapperStyle={{ outline: 'none' }}
                    cursor={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                No data
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.totalUsers.toLocaleString()}
          </div>
          <div className={`flex items-center text-sm ${stats.usersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.usersGrowth >= 0 ? 
              <TrendingUp className="w-4 h-4 mr-1" /> : 
              <TrendingDown className="w-4 h-4 mr-1" />
            }
            <span>{stats.usersGrowth >= 0 ? '+' : ''}{stats.usersGrowth}% over 10 days</span>
          </div>
          
          {/* Mini Users Trend Chart */}
          <div className="mt-4 w-full h-16 relative">
            {stats.usersTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.usersTrend.map((value, index) => ({
                    day: index,
                    users: value
                  }))}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Tooltip 
                    content={<CustomTooltip dataKey="users" />}
                    wrapperStyle={{ outline: 'none' }}
                    cursor={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                No data
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Monthly Revenue</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {formatCurrency(stats.monthlyRevenue)}
          </div>
          <div className="flex items-center text-sm text-green-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>+{stats.revenueGrowth}% from last month</span>
          </div>
          
          {/* Mini Revenue Trend Chart */}
          <div className="mt-4 w-full h-16 relative">
            {stats.revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.revenueTrend.map((value, index) => ({
                    day: index,
                    revenue: value
                  }))}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Tooltip 
                    content={<CustomTooltip dataKey="revenue" />}
                    wrapperStyle={{ outline: 'none' }}
                    cursor={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                No data
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Active Subscriptions</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.activeSubscriptions.toLocaleString()}
          </div>
          <div className={`flex items-center text-sm ${stats.subscriptionsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.subscriptionsGrowth >= 0 ? 
              <TrendingUp className="w-4 h-4 mr-1" /> : 
              <TrendingDown className="w-4 h-4 mr-1" />
            }
            <span>{stats.subscriptionsGrowth >= 0 ? '+' : ''}{stats.subscriptionsGrowth}% over 10 days</span>
          </div>
          
          {/* Mini Subscriptions Trend Chart */}
          <div className="mt-4 w-full h-16 relative">
            {stats.subscriptionsTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.subscriptionsTrend.map((value, index) => ({
                    day: index,
                    subscriptions: value
                  }))}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <Line
                    type="monotone"
                    dataKey="subscriptions"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Tooltip 
                    content={<CustomTooltip dataKey="subscriptions" />}
                    wrapperStyle={{ outline: 'none' }}
                    cursor={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                No data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Support Tickets</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.supportTickets}
          </div>
          <div className="flex items-center text-sm text-red-600">
            <AlertTriangle className="w-4 h-4 mr-1" />
            <span>3 urgent • 4 normal</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">System Health</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            98.9%
          </div>
          <div className="flex items-center text-sm text-green-600">
            <CheckCircle className="w-4 h-4 mr-1" />
            <span>All services operational</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Growth Rate</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            +{stats.revenueGrowth}%
          </div>
          <div className="flex items-center text-sm text-green-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>Above target (+10%)</span>
          </div>
        </div>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartOverview stats={stats} />
        <RecentActivity />
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="p-4 text-left border border-gray-100 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors duration-150">
            <Building2 className="h-6 w-6 text-blue-600 mb-2" />
            <p className="font-medium text-gray-900">Create Academy</p>
            <p className="text-sm text-gray-500">Add new academy account</p>
          </button>
          
          <button className="p-4 text-left border border-gray-100 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors duration-150">
            <Users className="h-6 w-6 text-green-600 mb-2" />
            <p className="font-medium text-gray-900">Manage Users</p>
            <p className="text-sm text-gray-500">User account management</p>
          </button>
          
          <button className="p-4 text-left border border-gray-100 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors duration-150">
            <CreditCard className="h-6 w-6 text-purple-600 mb-2" />
            <p className="font-medium text-gray-900">Billing Issues</p>
            <p className="text-sm text-gray-500">Review payment problems</p>
          </button>
          
          <button className="p-4 text-left border border-gray-100 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors duration-150">
            <Headphones className="h-6 w-6 text-red-600 mb-2" />
            <p className="font-medium text-gray-900">Support Queue</p>
            <p className="text-sm text-gray-500">Handle support tickets</p>
          </button>
        </div>
      </div>
    </div>
  );
}