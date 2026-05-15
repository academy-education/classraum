'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import dynamic from 'next/dynamic';
import { RecentActivity } from './RecentActivity';

const AdminTrendChart = dynamic(() => import('./AdminTrendChart'), {
  ssr: false,
  loading: () => <div className="w-full h-full animate-pulse bg-gray-100 rounded" />,
});
import { ChartOverview } from './ChartOverview';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminSkeleton } from './AdminSkeleton';

interface DashboardStats {
  totalAcademies: number;
  activeAcademies: number;
  totalUsers: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  activeSubscriptions: number;
  trialAcademies: number;
  supportTickets: number;
  urgentTickets: number;
  normalTickets: number;
  systemHealth: number;
  servicesOperational: boolean;
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
  const router = useRouter();
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);

  // Resolve a system alert. Updates Supabase + optimistically removes the
  // alert from the local list so it disappears from the dashboard immediately.
  const handleResolveAlert = async (alertId: string) => {
    setResolvingAlertId(alertId);
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
      // Optimistic removal — the alert no longer needs admin attention.
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
    } catch (e) {
      console.error('[AdminDashboard] Failed to resolve alert:', e);
    } finally {
      setResolvingAlertId(null);
    }
  };

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

      // Fetch real support tickets count with priority breakdown
      const { count: supportTicketsCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);

      const { count: urgentTicketsCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress'])
        .eq('priority', 'high');

      const { count: normalTicketsCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress'])
        .in('priority', ['low', 'medium']);

      const supportTickets = supportTicketsCount || 0;
      const urgentTickets = urgentTicketsCount || 0;
      const normalTickets = normalTicketsCount || 0;

      // Calculate system health based on error rates and uptime
      const { count: criticalAlertsCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
        .in('severity', ['critical', 'high']);

      const { count: totalActiveAlertsCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);

      // System health calculation: 100% - (critical alerts * 5%) - (other alerts * 1%)
      const criticalImpact = (criticalAlertsCount || 0) * 5;
      const otherAlertsImpact = Math.max(0, (totalActiveAlertsCount || 0) - (criticalAlertsCount || 0)) * 1;
      const systemHealth = Math.max(0, Math.min(100, 100 - criticalImpact - otherAlertsImpact));
      const servicesOperational = (criticalAlertsCount || 0) === 0;

      const stats: DashboardStats = {
        totalAcademies: academiesResult.count || 0,
        activeAcademies: activeAcademiesCount,
        totalUsers: totalUsers, // Use the count from the users table
        monthlyRevenue,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10, // Round to 1 decimal
        activeSubscriptions: subscriptionsResult.count || 0,
        trialAcademies: trialCount || 0,
        supportTickets,
        urgentTickets,
        normalTickets,
        systemHealth: Math.round(systemHealth * 10) / 10, // Round to 1 decimal
        servicesOperational,
        // Trend data
        academiesTrend,
        usersTrend,
        subscriptionsTrend,
        revenueTrend,
        academiesGrowth: Math.round(academiesGrowth * 10) / 10,
        usersGrowth: Math.round(usersGrowth * 10) / 10,
        subscriptionsGrowth: Math.round(subscriptionsGrowth * 10) / 10
      };

      // Fetch real system alerts from database
      const { data: systemAlerts } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      const realAlerts: SystemAlert[] = (systemAlerts || []).map((alert: any) => ({
        id: alert.id,
        type: alert.severity === 'critical' || alert.severity === 'high' ? 'error' :
              alert.severity === 'medium' ? 'warning' : 'info',
        title: alert.title,
        message: alert.message,
        timestamp: new Date(alert.created_at),
        resolved: alert.resolved || false
      }));


      setStats(stats);
      setAlerts(realAlerts);
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
        urgentTickets: 0,
        normalTickets: 0,
        systemHealth: 0,
        servicesOperational: false,
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

  const getAlertIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-5 w-5 text-rose-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'info':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertBgColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'info':
        return 'bg-sky-50 border-sky-200';
    }
  };

  if (loading) {
    // Real header stays mounted; only the body content shows skeletons.
    // AdminSkeleton.Bar uses the shimmer sweep — no outer animate-pulse needed.
    return (
      <div className="space-y-6">
        <AdminPageHeader
          kicker="Overview"
          title="Platform Dashboard"
          description="A real-time view of academies, users, revenue and system health."
        />
        <AdminSkeleton.StatsGrid count={4} />
        {/* Two-column charts row matching the real layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AdminSkeleton.Bar className="h-72 rounded-xl" />
          <AdminSkeleton.Bar className="h-72 rounded-xl" />
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
      <AdminPageHeader
        kicker="Overview"
        title="Platform Dashboard"
        description="A real-time view of academies, users, revenue and system health."
        actions={
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-emerald-50 ring-1 ring-emerald-200/60 text-[11px] font-semibold text-emerald-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </div>
        }
      />

      {/* System Alerts */}
      {alerts.filter(alert => !alert.resolved).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
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
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    disabled={resolvingAlertId === alert.id}
                    className="text-sm font-medium text-[#2885e8] hover:text-[#1f6fc7] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resolvingAlertId === alert.id ? 'Resolving…' : 'Resolve'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-5 ring-1 ring-gray-200/70 hover:ring-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Academies</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.totalAcademies.toLocaleString()}
          </div>
          <div className={`flex items-center text-sm ${stats.academiesGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stats.academiesGrowth >= 0 ? 
              <TrendingUp className="w-4 h-4 mr-1" /> : 
              <TrendingDown className="w-4 h-4 mr-1" />
            }
            <span>{stats.academiesGrowth >= 0 ? '+' : ''}{stats.academiesGrowth}% over 10 days</span>
          </div>
          
          {/* Mini Academy Trend Chart */}
          <div className="mt-4 w-full h-16 relative">
            {stats.academiesTrend.length > 0 ? (
              <AdminTrendChart
                data={stats.academiesTrend.map((value, index) => ({ day: index, academies: value }))}
                dataKey="academies"
                color="#3B82F6"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                No data
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 ring-1 ring-gray-200/70 hover:ring-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.totalUsers.toLocaleString()}
          </div>
          <div className={`flex items-center text-sm ${stats.usersGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stats.usersGrowth >= 0 ? 
              <TrendingUp className="w-4 h-4 mr-1" /> : 
              <TrendingDown className="w-4 h-4 mr-1" />
            }
            <span>{stats.usersGrowth >= 0 ? '+' : ''}{stats.usersGrowth}% over 10 days</span>
          </div>
          
          {/* Mini Users Trend Chart */}
          <div className="mt-4 w-full h-16 relative">
            {stats.usersTrend.length > 0 ? (
              <AdminTrendChart
                data={stats.usersTrend.map((value, index) => ({ day: index, users: value }))}
                dataKey="users"
                color="#10B981"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                No data
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 ring-1 ring-gray-200/70 hover:ring-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Monthly Revenue</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {formatCurrency(stats.monthlyRevenue)}
          </div>
          <div className="flex items-center text-sm text-emerald-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>+{stats.revenueGrowth}% from last month</span>
          </div>
          
          {/* Mini Revenue Trend Chart */}
          <div className="mt-4 w-full h-16 relative">
            {stats.revenueTrend.length > 0 ? (
              <AdminTrendChart
                data={stats.revenueTrend.map((value, index) => ({ day: index, revenue: value }))}
                dataKey="revenue"
                color="#8B5CF6"
                isCurrency
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                No data
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 ring-1 ring-gray-200/70 hover:ring-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Active Subscriptions</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.activeSubscriptions.toLocaleString()}
          </div>
          <div className={`flex items-center text-sm ${stats.subscriptionsGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stats.subscriptionsGrowth >= 0 ? 
              <TrendingUp className="w-4 h-4 mr-1" /> : 
              <TrendingDown className="w-4 h-4 mr-1" />
            }
            <span>{stats.subscriptionsGrowth >= 0 ? '+' : ''}{stats.subscriptionsGrowth}% over 10 days</span>
          </div>
          
          {/* Mini Subscriptions Trend Chart */}
          <div className="mt-4 w-full h-16 relative">
            {stats.subscriptionsTrend.length > 0 ? (
              <AdminTrendChart
                data={stats.subscriptionsTrend.map((value, index) => ({ day: index, subscriptions: value }))}
                dataKey="subscriptions"
                color="#F59E0B"
              />
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
        <div className="bg-white p-5 rounded-xl ring-1 ring-gray-200/70 hover:ring-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Support Tickets</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.supportTickets}
          </div>
          <div className="flex items-center text-sm text-rose-600">
            <AlertTriangle className="w-4 h-4 mr-1" />
            <span>{stats.urgentTickets} urgent • {stats.normalTickets} normal</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl ring-1 ring-gray-200/70 hover:ring-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">System Health</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.systemHealth}%
          </div>
          <div className={`flex items-center text-sm ${stats.servicesOperational ? 'text-emerald-600' : 'text-amber-600'}`}>
            {stats.servicesOperational ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                <span>All services operational</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 mr-1" />
                <span>Some services degraded</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl ring-1 ring-gray-200/70 hover:ring-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Growth Rate</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth}%
          </div>
          {/* Honest copy — describes the trend rather than asserting a
              hardcoded "+10% target" we don't have anywhere in config. */}
          <div className={`flex items-center text-sm ${stats.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stats.revenueGrowth >= 0 ? (
              <>
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>Up vs. last month</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 mr-1" />
                <span>Down vs. last month</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartOverview />
        <RecentActivity />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-[0.06em]">Quick actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            // All four actions navigate to the relevant management page.
            // For "Create Academy" we land on the academies list — admins
            // open the create modal from there. We don't auto-open the modal
            // on navigation because the existing list view doesn't accept a
            // ?new=1 query param yet. Add one if you want one-click creation.
            { icon: Building2, label: 'Create Academy', desc: 'Add new academy account', accent: 'blue' as const, href: '/admin/academies' },
            { icon: Users, label: 'Manage Users', desc: 'User account management', accent: 'emerald' as const, href: '/admin/users' },
            { icon: CreditCard, label: 'Billing Issues', desc: 'Review subscriptions and payments', accent: 'violet' as const, href: '/admin/subscriptions?status=past_due' },
            { icon: Headphones, label: 'Support Queue', desc: 'Handle support tickets', accent: 'rose' as const, href: '/admin/support' },
          ].map(action => {
            const accentMap = {
              blue:    { iconBg: 'bg-[#2885e8]/10', iconColor: 'text-[#2885e8]', border: 'group-hover:border-[#2885e8]/40' },
              emerald: { iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', border: 'group-hover:border-emerald-300' },
              violet:  { iconBg: 'bg-violet-50', iconColor: 'text-violet-600', border: 'group-hover:border-violet-300' },
              rose:    { iconBg: 'bg-rose-50', iconColor: 'text-rose-600', border: 'group-hover:border-rose-300' },
            }
            const a = accentMap[action.accent]
            return (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className={`group bg-white p-4 text-left rounded-xl ring-1 ring-gray-200/70 ${a.border} hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-px transition-all`}
              >
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${a.iconBg} mb-3 transition-transform group-hover:scale-110`}>
                  <action.icon className={`h-4.5 w-4.5 ${a.iconColor}`} />
                </div>
                <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  );
}