'use client'

import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface ChartData {
  period: string;
  revenue: number;
  academies: number;
  users: number;
}

type ChartType = 'revenue' | 'academies' | 'users';

export function ChartOverview() {
  const [activeChart, setActiveChart] = useState<ChartType>('revenue');
  const [timeRange, setTimeRange] = useState<'6m' | '12m'>('12m');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    try {
      setLoading(true);

      // Generate last 12 months
      const months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (11 - i));
        return {
          date,
          period: date.toLocaleDateString('en-US', { month: 'short' }),
          year: date.getFullYear(),
          monthStart: new Date(date.getFullYear(), date.getMonth(), 1),
          monthEnd: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
        };
      });

      // Fetch monthly data
      const monthlyDataPromises = months.map(async (month, index) => {
        const [academiesResult, usersResult] = await Promise.all([
          // Academies count at end of month
          supabase
            .from('academies')
            .select('*', { count: 'exact', head: true })
            .lte('created_at', month.monthEnd.toISOString()),
          
          // Users count at end of month
          supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .lte('created_at', month.monthEnd.toISOString())
        ]);

        // Fetch real revenue data from invoices
        const { data: invoices } = await supabase
          .from('invoices')
          .select('final_amount')
          .eq('status', 'paid')
          .gte('paid_at', month.monthStart.toISOString())
          .lte('paid_at', month.monthEnd.toISOString());

        const monthlyRevenue = invoices?.reduce((sum, inv) => sum + (inv.final_amount || 0), 0) || 0;

        return {
          period: month.period,
          revenue: monthlyRevenue,
          academies: Math.max(academiesResult.count || 0, 0),
          users: Math.max(usersResult.count || 0, 0)
        };
      });

      const realChartData = await Promise.all(monthlyDataPromises);
      setChartData(realChartData);

    } catch (error) {
      console.error('Error loading chart data:', error);
      // Data will remain empty on error
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    const data = timeRange === '6m' ? chartData.slice(-6) : chartData;
    return data;
  };

  const getMaxValue = (data: ChartData[], type: ChartType) => {
    if (!data || data.length === 0) return 1;
    const values = data.map(item => item[type]).filter(val => !isNaN(val) && val > 0);
    return values.length > 0 ? Math.max(...values) : 1;
  };

  const formatValue = (value: number, type: ChartType) => {
    // Handle NaN and invalid values
    if (!value || isNaN(value)) {
      return '0';
    }
    
    switch (type) {
      case 'revenue':
        return `₩${(value / 1000000).toFixed(1)}M`;
      case 'academies':
        return Math.floor(value).toString();
      case 'users':
        return value < 1000 ? Math.floor(value).toString() : `${(value / 1000).toFixed(1)}K`;
      default:
        return Math.floor(value).toString();
    }
  };

  // Two color shapes per chart: a Tailwind class (for the legend dot) and
  // a hex value (for recharts <Bar fill="...">).
  const chartColors: Record<ChartType, { dot: string; hex: string }> = {
    revenue:   { dot: 'bg-violet-500',   hex: '#8b5cf6' },
    academies: { dot: 'bg-[#2885e8]',    hex: '#2885e8' },
    users:     { dot: 'bg-emerald-500',  hex: '#10b981' },
  };
  const getChartColor = (type: ChartType) => chartColors[type].dot;

  const getChartTitle = (type: ChartType) => {
    switch (type) {
      case 'revenue':
        return 'Revenue Trend';
      case 'academies':
        return 'Academy Growth';
      case 'users':
        return 'User Growth';
    }
  };

  const displayData = getChartData();
  const maxValue = getMaxValue(displayData, activeChart);

  const calculateGrowth = () => {
    if (displayData.length < 2) return 0;
    const latest = displayData[displayData.length - 1][activeChart];
    const previous = displayData[displayData.length - 2][activeChart];
    
    // Handle division by zero and NaN cases
    if (!previous || previous === 0 || !latest || isNaN(latest) || isNaN(previous)) {
      return 0;
    }
    
    const growth = ((latest - previous) / previous * 100);
    return isNaN(growth) ? 0 : growth;
  };

  const growth = calculateGrowth();

  return (
    <>
      <div className="bg-white p-5 rounded-xl ring-1 ring-gray-200/70">
        <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">{getChartTitle(activeChart)}</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTimeRange('6m')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors duration-150 ${
                timeRange === '6m'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              6M
            </button>
            <button
              onClick={() => setTimeRange('12m')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors duration-150 ${
                timeRange === '12m'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              12M
            </button>
          </div>
        </div>
      </div>

      {/* Chart Type Selector */}
      <div className="flex space-x-1 mb-6 p-1 bg-gray-100 rounded-lg">
        {(['revenue', 'academies', 'users'] as ChartType[]).map((type) => (
          <button
            key={type}
            onClick={() => setActiveChart(type)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
              activeChart === type
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {getChartTitle(type)}
          </button>
        ))}
      </div>

      {/* Growth Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-semibold text-gray-900">
            {displayData.length > 0 ? formatValue(displayData[displayData.length - 1][activeChart], activeChart) : '0'}
          </span>
          <div className={`flex items-center text-sm font-medium ${
            growth >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            <TrendingUp className={`h-4 w-4 mr-1 ${growth < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(growth).toFixed(1)}%
          </div>
        </div>
        <span className="text-sm text-gray-500">vs last month</span>
      </div>

      {/* Bar chart — replaces the hand-rolled flex-bar version. recharts
          gives us proper hover tooltips, axis labels, keyboard a11y, and
          responsive resizing for free. */}
      <div className="h-56">
        {loading ? (
          <div className="h-full flex items-end justify-between gap-1">
            {Array.from({ length: timeRange === '6m' ? 6 : 12 }).map((_, i) => (
              <div key={i} className="flex-1 bg-gray-100 rounded-t animate-pulse" style={{ height: `${30 + (i * 13) % 60}%` }} />
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatValue(v as number, activeChart)}
                width={50}
              />
              <Tooltip
                cursor={{ fill: 'rgba(40, 133, 232, 0.06)' }}
                contentStyle={{
                  background: '#0f172a',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 12,
                  padding: '8px 12px',
                }}
                labelStyle={{ color: '#9ca3af', fontWeight: 500, marginBottom: 2 }}
                formatter={(value) => [formatValue(value as number, activeChart), getChartTitle(activeChart)]}
              />
              <Bar
                dataKey={activeChart}
                fill={chartColors[activeChart].hex}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getChartColor(activeChart)}`} />
              <span className="text-gray-600">{getChartTitle(activeChart)}</span>
            </div>
          </div>
          <div className="flex items-center text-gray-500">
            <Calendar className="h-4 w-4 mr-1" />
            Last {timeRange === '6m' ? '6' : '12'} months
          </div>
        </div>
      </div>
      </div>
      {/* Manual hover tooltip removed — recharts <Tooltip> handles it. */}
    </>
  );
}