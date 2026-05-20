'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Server,
  Database,
  Users,
  HardDrive,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Monitor,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminPageHeader } from '../AdminPageHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { DashboardCard } from '../DashboardCard';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { AdminSkeleton } from '../AdminSkeleton';
import { useAdminFetch } from '../useAdminFetch';
import { usePolling } from '../usePolling';
import { AdminEmptyState } from '../AdminEmptyState';

// Shape of the payload from /api/admin/system. Kept loose because the real
// backing data evolves; the UI only renders the fields that exist.
interface SystemMetric {
  name: string
  value: string
  status: 'good' | 'warning' | 'critical'
}
interface SystemService {
  name: string
  status: 'running' | 'healthy' | 'warning' | 'error'
  uptime: string
}
interface SystemLog {
  id: string
  level: 'info' | 'warning' | 'error'
  message: string
  service: string
  timestamp: string | Date
}
interface SystemPayload {
  status?: { overall?: string; uptime?: string; version?: string }
  metrics?: SystemMetric[]
  services?: SystemService[]
  logs?: SystemLog[]
  activeUsers?: number
}

export function SystemDashboard() {
  const { t } = useTranslation();
  const adminFetch = useAdminFetch();
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'logs'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [systemData, setSystemData] = useState<SystemPayload | null>(null);
  const [logLevelFilter, setLogLevelFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all');

  useEffect(() => {
    loadSystemData();
  }, []);

  // Auto-refresh every 30s while the tab is visible. Hidden tabs pause to
  // avoid wasted server cycles. Manual Refresh still works alongside.
  usePolling(() => loadSystemData(), { intervalMs: 30_000 });

  const loadSystemData = async () => {
    try {
      setRefreshing(true);

      const response = await adminFetch('/api/admin/system');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch system data');
      }

      const result = await response.json();
      if (result.success && result.data) {
        setSystemData(result.data);
      }
    } catch (error) {
      console.error('[SystemDashboard] Error loading system data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Map service name → icon. Falls back to a generic globe.
  const serviceIcon = (name: string): LucideIcon => {
    if (name === 'Database') return Database;
    if (name === 'Authentication') return Shield;
    if (name === 'API Server') return Server;
    if (name === 'File Storage') return HardDrive;
    return Globe;
  };

  // Status string → semantic tone for our shared StatusBadge.
  const toTone = (status: string): StatusTone => {
    switch (status) {
      case 'running':
      case 'healthy':
      case 'good':
        return 'active';
      case 'warning':
        return 'pending';
      case 'error':
      case 'critical':
        return 'danger';
      default:
        return 'muted';
    }
  };

  const logLevelTone = (level: string): StatusTone => {
    switch (level) {
      case 'info':    return 'info';
      case 'warning': return 'pending';
      case 'error':   return 'danger';
      default:        return 'muted';
    }
  };

  // Compute these only when data is present so we don't crash during the
  // loading / error branches.
  const systemStatus = systemData?.status || {};
  const systemMetrics = systemData?.metrics || [];
  const services = systemData?.services || [];
  const allLogs: SystemLog[] = (systemData?.logs || []).map(log => ({
    ...log,
    timestamp: new Date(log.timestamp),
  }));
  const filteredLogs = logLevelFilter === 'all'
    ? allLogs
    : allLogs.filter(l => l.level === logLevelFilter);

  return (
    <div className="space-y-6">
      {/* Header always visible — body switches to skeleton during load */}
      <AdminPageHeader
        kicker={String(t('admin.system.kicker'))}
        title={String(t('admin.system.title'))}
        description={String(t('admin.system.subtitle'))}
        actions={
          <Button onClick={loadSystemData} disabled={refreshing || loading} size="sm" className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${refreshing || loading ? 'animate-spin' : ''}`} />
            {String(t('admin.header.refresh'))}
          </Button>
        }
      />

      {loading ? (
        <AdminSkeleton.Body stats={4} cols={3} rows={5} />
      ) : !systemData ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="h-10 w-10 text-rose-400 mb-3" />
          <p className="text-sm font-medium text-gray-900">Failed to load system data</p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            The system endpoint didn&apos;t return any data. Try refreshing — if the issue persists,
            check the server logs.
          </p>
          <Button onClick={loadSystemData} variant="outline" className="mt-4 gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      ) : (<>
      {/* System Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title={String(t('admin.system.systemStatus'))}
          value={systemStatus.overall ? systemStatus.overall.charAt(0).toUpperCase() + systemStatus.overall.slice(1) : String(t('admin.common.unknown'))}
          icon={<CheckCircle className="h-5 w-5" />}
          accent={toTone(systemStatus.overall || '') === 'active' ? 'emerald'
                  : toTone(systemStatus.overall || '') === 'pending' ? 'amber'
                  : toTone(systemStatus.overall || '') === 'danger' ? 'rose' : 'slate'}
        />
        <DashboardCard
          title={String(t('admin.system.uptime'))}
          value={systemStatus.uptime || '—'}
          icon={<Clock className="h-5 w-5" />}
          accent="blue"
        />
        <DashboardCard
          title="Version"
          value={systemStatus.version || '—'}
          icon={<Monitor className="h-5 w-5" />}
          accent="violet"
        />
        <DashboardCard
          title="Active Users"
          value={(systemData.activeUsers ?? 0).toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl ring-1 ring-gray-200/70">
        <div className="border-b border-gray-200/70">
          <div className="flex gap-1 px-4">
            {(['overview', 'health', 'logs'] as const).map(tab => (
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

        <div className="p-6">
          {/* OVERVIEW: services + key metrics */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.06em] mb-3">
                  Services
                </h3>
                {services.length === 0 ? (
                  <p className="text-sm text-gray-500">No service data reported.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {services.map(service => {
                      const Icon = serviceIcon(service.name)
                      return (
                        <div key={service.name} className="bg-gray-50/60 rounded-lg ring-1 ring-gray-200/70 p-3.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white ring-1 ring-gray-200/70 flex items-center justify-center text-gray-600">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{service.name}</p>
                              <p className="text-xs text-gray-500">Uptime · {service.uptime}</p>
                            </div>
                          </div>
                          <StatusBadge tone={toTone(service.status)} size="sm">{service.status}</StatusBadge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.06em] mb-3">
                  Metrics
                </h3>
                {systemMetrics.length === 0 ? (
                  <p className="text-sm text-gray-500">No metric data reported.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {systemMetrics.map(metric => (
                      <div key={metric.name} className="bg-white rounded-lg ring-1 ring-gray-200/70 p-3.5">
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">{metric.name}</p>
                        <div className="mt-1.5 flex items-baseline justify-between gap-2">
                          <p className="text-lg font-semibold text-gray-900 tabular-nums">{metric.value}</p>
                          <StatusBadge tone={toTone(metric.status)} size="sm">{metric.status}</StatusBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* HEALTH: only the reported performance metrics, no hardcoded checks */}
          {activeTab === 'health' && (
            <div className="space-y-3">
              {systemMetrics.length === 0 ? (
                <p className="text-sm text-gray-500">No performance metrics reported.</p>
              ) : (
                systemMetrics.map(metric => (
                  <div key={metric.name} className="bg-gray-50/60 rounded-lg ring-1 ring-gray-200/70 p-3.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{metric.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums text-gray-700">{metric.value}</span>
                      <StatusBadge tone={toTone(metric.status)} size="sm">{metric.status}</StatusBadge>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Showing <span className="font-semibold text-gray-900 tabular-nums">{filteredLogs.length}</span>
                  {' '}of <span className="font-semibold text-gray-900 tabular-nums">{allLogs.length}</span> entries
                </p>
                <Select value={logLevelFilter} onValueChange={(v) => setLogLevelFilter(v as 'all' | 'info' | 'warning' | 'error')}>
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredLogs.length === 0 ? (
                <AdminEmptyState icon={Clock} title="No logs match this filter" />
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map(log => (
                    <div key={log.id} className="bg-gray-50/60 rounded-lg ring-1 ring-gray-200/70 p-3.5 flex items-start gap-3">
                      <StatusBadge tone={logLevelTone(log.level)} size="sm">
                        {log.level.toUpperCase()}
                      </StatusBadge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{log.message}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{(log.timestamp as Date).toLocaleString()}</span>
                          <span className="text-gray-300">·</span>
                          <span className="font-medium">{log.service}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </>)}
    </div>
  );
}
