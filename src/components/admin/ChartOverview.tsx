'use client'

import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChartData {
  period: string;
  revenue: number;
  academies: number;
  users: number;
}

interface DashboardStats {
  totalAcademies: number;
  totalUsers: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  // We'll add historical monthly data
}

interface ChartOverviewProps {
  stats: DashboardStats;
}

const mockChartData: ChartData[] = [
  { period: 'Jan', revenue: 12500000, academies: 95, users: 2156 },
  { period: 'Feb', revenue: 13200000, academies: 102, users: 2287 },
  { period: 'Mar', revenue: 14100000, academies: 108, users: 2445 },
  { period: 'Apr', revenue: 13800000, academies: 112, users: 2512 },
  { period: 'May', revenue: 15100000, academies: 118, users: 2634 },
  { period: 'Jun', revenue: 14900000, academies: 125, users: 2721 },
  { period: 'Jul', revenue: 16200000, academies: 132, users: 2808 },
  { period: 'Aug', revenue: 15800000, academies: 138, users: 2743 },
  { period: 'Sep', revenue: 15650000, academies: 147, users: 2843 },
];

type ChartType = 'revenue' | 'academies' | 'users';

export function ChartOverview({ stats }: ChartOverviewProps) {
  const [activeChart, setActiveChart] = useState<ChartType>('revenue');
  const [timeRange, setTimeRange] = useState<'6m' | '12m'>('12m');
  const [chartData, setChartData] = useState<ChartData[]>(mockChartData);
  const [loading, setLoading] = useState(true);
  const [hoveredData, setHoveredData] = useState<{data: ChartData, index: number, mouseX: number, mouseY: number} | null>(null);

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

        // Use dummy revenue data since payment system isn't connected
        const baseRevenue = 12000000; // 12M KRW base
        const growthFactor = 1 + (Math.sin(index * 0.5) * 0.1) + (index * 0.02); // Simulate growth with variation
        const dummyRevenue = Math.floor(baseRevenue * growthFactor);
        
        return {
          period: month.period,
          revenue: dummyRevenue,
          academies: Math.max(academiesResult.count || 0, 0),
          users: Math.max(usersResult.count || 0, 0)
        };
      });

      const realChartData = await Promise.all(monthlyDataPromises);
      setChartData(realChartData);

    } catch (error) {
      console.error('Error loading chart data:', error);
      // Keep using mock data on error
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

  const getChartColor = (type: ChartType) => {
    switch (type) {
      case 'revenue':
        return 'bg-purple-500';
      case 'academies':
        return 'bg-blue-500';
      case 'users':
        return 'bg-green-500';
    }
  };

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
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
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
            growth >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`h-4 w-4 mr-1 ${growth < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(growth).toFixed(1)}%
          </div>
        </div>
        <span className="text-sm text-gray-500">vs last month</span>
      </div>

      {/* Simple Bar Chart */}
      <div className="h-48 flex items-end justify-between space-x-1 relative">
        {loading ? (
          // Loading skeleton
          Array.from({ length: timeRange === '6m' ? 6 : 12 }).map((_, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full flex justify-center mb-2">
                <div className="w-8 h-20 bg-gray-200 animate-pulse rounded-t" />
              </div>
              <div className="w-8 h-3 bg-gray-200 animate-pulse rounded" />
            </div>
          ))
        ) : (
          displayData.map((data, index) => (
          <div key={data.period} className="flex-1 flex flex-col items-center">
            <div className="w-full flex justify-center mb-2">
              <div
                className={`w-8 rounded-t cursor-pointer hover:opacity-80 ${getChartColor(activeChart)}`}
                style={{
                  height: `${Math.max(4, (data[activeChart] && !isNaN(data[activeChart]) ? data[activeChart] : 0) / maxValue * 160)}px`,
                  minHeight: '4px'
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredData({
                    data,
                    index,
                    mouseX: rect.left + rect.width / 2,
                    mouseY: rect.top - 10
                  });
                }}
                onMouseLeave={() => setHoveredData(null)}
              />
            </div>
            <span className="text-xs text-gray-500 font-medium">{data.period}</span>
          </div>
          ))
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

      {/* Tooltip - positioned absolutely using mouse coordinates */}
      {hoveredData && (
        <div 
          className="fixed bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none z-50"
          style={{
            left: hoveredData.mouseX,
            top: hoveredData.mouseY,
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap'
          }}
        >
          <div className="font-medium text-white mb-1">
            {hoveredData.data.period}
          </div>
          <div className={`font-semibold ${
            activeChart === 'revenue' ? 'text-purple-300' :
            activeChart === 'academies' ? 'text-blue-300' : 'text-green-300'
          }`}>
            {formatValue(hoveredData.data[activeChart], activeChart)}
          </div>
          <div className="text-xs text-gray-300 capitalize">
            {getChartTitle(activeChart)}
          </div>
        </div>
      )}
    </>
  );
}