'use client'

import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Calendar } from 'lucide-react';
import { useAdminFetch } from './useAdminFetch';
import { useTranslation } from '@/hooks/useTranslation';
import { getMonthShort } from '@/utils/dateUtils';
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
  /** 0-11 month index — formatted to a localized label at render time so the
   *  x-axis follows the app language without a data refetch. */
  monthIndex: number;
  revenue: number;
  academies: number;
  users: number;
}

type ChartType = 'revenue' | 'academies' | 'users';

export function ChartOverview() {
  const { t, language } = useTranslation();
  const monthLabels = getMonthShort(language);
  const adminFetch = useAdminFetch();
  const [activeChart, setActiveChart] = useState<ChartType>('revenue');
  const [timeRange, setTimeRange] = useState<'6m' | '12m'>('12m');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadChartData();
  }, []);

  /**
   * Series come from /api/admin/dashboard/charts (service role, server-side).
   *
   * The previous implementation counted `academies` / `users` from the browser
   * with the anon-key client. RLS-denied counts return
   * `{ count: null, error: null }`, and `count || 0` turned that silent denial
   * into a chart of honest-looking zeroes. Errors are now surfaced instead of
   * being swallowed into an empty dataset.
   */
  const loadChartData = async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const res = await adminFetch('/api/admin/dashboard/charts');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || body?.error || `Request failed (${res.status})`);
      }

      const { series } = await res.json() as { series: ChartData[] };
      setChartData(series);
    } catch (error) {
      console.error('Error loading chart data:', error);
      setChartData([]);
      setLoadError(error instanceof Error ? error.message : String(error));
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
    academies: { dot: 'bg-primary',    hex: '#2885e8' },
    users:     { dot: 'bg-emerald-500',  hex: '#10b981' },
  };
  const getChartColor = (type: ChartType) => chartColors[type].dot;

  const getChartTitle = (type: ChartType) => {
    switch (type) {
      case 'revenue':
        return String(t('admin.chartOverview.revenueTrend'));
      case 'academies':
        return String(t('admin.chartOverview.academyGrowth'));
      case 'users':
        return String(t('admin.chartOverview.userGrowth'));
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
      <div className="bg-white p-5 rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div className="flex items-center space-x-2 min-w-0">
          <BarChart3 className="h-5 w-5 text-gray-600 flex-shrink-0" />
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
              {String(t('admin.chartOverview.range6M'))}
            </button>
            <button
              onClick={() => setTimeRange('12m')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors duration-150 ${
                timeRange === '12m'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {String(t('admin.chartOverview.range12M'))}
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
            className={`flex-1 min-w-0 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors duration-150 ${
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
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-4">
        <div className="flex items-center space-x-2">
          {/* An unavailable figure renders as "—", never as a plausible 0. */}
          <span className="text-2xl font-semibold text-gray-900">
            {displayData.length > 0 ? formatValue(displayData[displayData.length - 1][activeChart], activeChart) : '—'}
          </span>
          {displayData.length > 0 && (
            <div className={`flex items-center text-sm font-medium ${
              growth >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              <TrendingUp className={`h-4 w-4 mr-1 ${growth < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(growth).toFixed(1)}%
            </div>
          )}
        </div>
        <span className="text-sm text-gray-500">{String(t('admin.chartOverview.vsLastMonth'))}</span>
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
        ) : loadError ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-gray-900">{String(t('admin.dashboard.failedToLoad'))}</p>
            <p className="text-xs text-gray-500 max-w-xs break-words">{loadError}</p>
            <button
              onClick={loadChartData}
              className="text-xs font-medium text-primary hover:text-primary transition-colors"
            >
              {String(t('admin.common.refresh'))}
            </button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="monthIndex"
                tickFormatter={(i) => monthLabels[i as number] ?? ''}
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
                labelFormatter={(i) => monthLabels[i as number] ?? ''}
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
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getChartColor(activeChart)}`} />
              <span className="text-gray-600">{getChartTitle(activeChart)}</span>
            </div>
          </div>
          <div className="flex items-center text-gray-500">
            <Calendar className="h-4 w-4 mr-1" />
            {String(t('admin.chartOverview.lastMonths', { n: timeRange === '6m' ? '6' : '12' }))}
          </div>
        </div>
      </div>
      </div>
      {/* Manual hover tooltip removed — recharts <Tooltip> handles it. */}
    </>
  );
}