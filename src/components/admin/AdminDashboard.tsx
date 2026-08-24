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
import { AdminPageHeader } from './AdminPageHeader';
import { useAdminFetch } from './useAdminFetch';
import { Button } from '@/components/ui/button';
import { getDateLocale } from '@/utils/dateUtils';
import { AdminSkeleton } from './AdminSkeleton';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Every field is nullable, and `null` means "this tile's section failed",
 * NOT zero.
 *
 * The route fans out ~40 Supabase reads per load. They all used to sit under
 * one try/Promise.all, so one `TypeError: fetch failed` on a single
 * sparkline bucket returned 500 and this component rendered the whole-page
 * error — a dashboard blanked by one bad socket. The route now retries
 * transient faults and degrades per section; a section that still fails
 * arrives as nulls plus an entry in `degraded`, and the tile says so in
 * place while the rest of the page renders.
 *
 * The nullability is the guard that keeps that honest: there is no code path
 * that can turn a failed read into a believable 0.
 */
interface DashboardStats {
  totalAcademies: number | null;
  activeAcademies: number | null;
  totalUsers: number | null;
  monthlyRevenue: number | null;
  revenueGrowth: number | null;
  activeSubscriptions: number | null;
  trialAcademies: number | null;
  supportTickets: number | null;
  unreadSupportTickets: number | null;
  closedSupportTickets: number | null;
  systemHealth: number | null;
  servicesOperational: boolean | null;
  // Trend data for charts
  academiesTrend: number[] | null;
  usersTrend: number[] | null;
  subscriptionsTrend: number[] | null;
  revenueTrend: number[] | null;
  academiesGrowth: number | null;
  usersGrowth: number | null;
  subscriptionsGrowth: number | null;
}

/** One section the server could not load, with the reason. */
interface DegradedSection {
  section: string;
  detail: string;
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
  const { t, language } = useTranslation();
  const dateLocale = getDateLocale(language);
  const router = useRouter();
  const adminFetch = useAdminFetch();
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [resolvingAll, setResolvingAll] = useState(false);

  // Resolve one or more alerts (a de-duplicated card can stand for several
  // identical rows). The `alerts` table has NO update RLS policy, so a browser
  // update() silently no-ops and the alert reappears on reload — mutations MUST
  // go through the service-role /api/admin/alerts route. Only removes locally
  // once the server confirms the rows were actually resolved.
  const handleResolveGroup = async (ids: string[]) => {
    if (ids.length === 0) return;
    setResolvingAlertId(ids[0]);
    try {
      const res = await adminFetch('/api/admin/alerts', {
        method: 'PATCH',
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(`resolve failed (${res.status})`);
      setAlerts(prev => prev.map(a => ids.includes(a.id) ? { ...a, resolved: true } : a));
    } catch (e) {
      console.error('[AdminDashboard] Failed to resolve alerts:', e);
    } finally {
      setResolvingAlertId(null);
    }
  };

  // Clear the whole backlog in one click — handy after a fixed bug that logged
  // a batch of now-stale alerts (e.g. the webhook-verification false positives).
  const handleResolveAll = async () => {
    setResolvingAll(true);
    try {
      const res = await adminFetch('/api/admin/alerts', {
        method: 'PATCH',
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) throw new Error(`resolve-all failed (${res.status})`);
      setAlerts(prev => prev.map(a => ({ ...a, resolved: true })));
    } catch (e) {
      console.error('[AdminDashboard] Failed to resolve all alerts:', e);
    } finally {
      setResolvingAll(false);
    }
  };

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [degraded, setDegraded] = useState<DegradedSection[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  /**
   * All dashboard figures now come from /api/admin/dashboard, which runs the
   * queries server-side with the service-role key.
   *
   * Previously every count was issued straight from the browser with the
   * anon-key client. Those reads are subject to RLS, and a denied
   * `head + count` request returns `{ count: null, error: null }` — no error
   * at all. With `count || 0` at each call site an RLS denial was laundered
   * into a confident zero, which is how "Total academies" read 0 against a
   * table holding 10 rows.
   *
   * A failed load now sets `loadError` and renders an error state. It must
   * never be indistinguishable from an empty platform, which is exactly what
   * the old all-zeros fallback object produced.
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const res = await adminFetch('/api/admin/dashboard');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || body?.error || `Request failed (${res.status})`);
      }

      const { stats, alerts, degraded } = await res.json() as {
        stats: DashboardStats;
        alerts: { id: string; type: SystemAlert['type']; title: string; message: string; timestamp: string; resolved: boolean }[] | null;
        degraded?: DegradedSection[];
      };

      const failedSections = degraded ?? [];

      // Every section down is not a degraded page, it is a broken one —
      // there would be nothing left to render but a grid of dashes. Fall
      // through to the whole-page error so the admin gets the reason and a
      // retry rather than an empty-looking platform.
      const anySectionLoaded =
        Object.values(stats).some(v => v !== null) || alerts !== null;
      if (!anySectionLoaded) {
        throw new Error(
          failedSections.map(d => `${d.section}: ${d.detail}`).join('; ') || 'No data returned'
        );
      }

      setStats(stats);
      setDegraded(failedSections);
      setAlerts((alerts ?? []).map(a => ({ ...a, timestamp: new Date(a.timestamp) })));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // No fabricated zeros — surface the failure.
      setStats(null);
      setDegraded([]);
      setAlerts([]);
      setLoadError(error instanceof Error ? error.message : String(error));
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
        return 'bg-rose-50 ring-rose-200/70';
      case 'warning':
        return 'bg-amber-50 ring-amber-200/70';
      case 'info':
        return 'bg-sky-50 ring-sky-200/70';
    }
  };

  // Alert titles are written to the DB in English by the alerting service.
  // Map the known operational titles to localized labels at render time so the
  // dashboard headline reads in the admin's language (unknown titles pass
  // through verbatim — dynamic detail lives in the message body).
  const localizeAlertTitle = (title: string) => {
    const key = ({
      'Settlement Creation Failed': 'settlementCreationFailed',
      'Payout Failed': 'payoutFailed',
      'Webhook Verification Failed': 'webhookVerificationFailed',
      'Partner Setup Failed': 'partnerSetupFailed',
      'Payment Processing Error': 'paymentProcessingError',
      'Database Error': 'databaseError',
    } as Record<string, string>)[title];
    return key ? String(t(`admin.alertTitles.${key}`)) : title;
  };

  // Same story for the message body: the alerting service stores English
  // templates with interpolated data. Re-parse the known templates and render
  // them from the localized string (dynamic values like {reason} may still be
  // English if PortOne returned them — that's data, not UI copy). Falls back to
  // the raw message for anything unrecognized.
  const localizeAlertMessage = (title: string, message: string): string => {
    let m: RegExpMatchArray | null;
    switch (title) {
      case 'Payout Failed':
        m = message.match(/^Payout of (.+?) (\S+) to partner (.+?) failed\. Reason: (.+)$/);
        if (m) return String(t('admin.alertMessages.payoutFailed', { amount: m[1], currency: m[2], partnerId: m[3], reason: m[4] }));
        break;
      case 'Webhook Verification Failed':
        m = message.match(/^Failed to verify (\S+) webhook signature/);
        if (m) return String(t('admin.alertMessages.webhookVerificationFailed', { webhookType: m[1] }));
        break;
      case 'Settlement Creation Failed':
        m = message.match(/^Failed to create settlement for partner (.+)$/);
        if (m) return String(t('admin.alertMessages.settlementCreationFailed', { partnerId: m[1] }));
        break;
      case 'Partner Setup Failed':
        m = message.match(/^Failed to create PortOne partner for academy "(.+)"$/);
        if (m) return String(t('admin.alertMessages.partnerSetupFailed', { academyName: m[1] }));
        break;
      case 'Payment Processing Error':
        if (message === 'Critical error during payment processing') return String(t('admin.alertMessages.paymentProcessingError'));
        break;
      case 'Database Error':
        m = message.match(/^Database error during (.+)$/);
        if (m) return String(t('admin.alertMessages.databaseError', { operation: m[1] }));
        break;
    }
    return message;
  };

  /**
   * ── Rendering a tile whose section did not load ──────────────────────
   *
   * A dash, not a zero, and an explicit "couldn't load" line under it. The
   * temptation is to render 0 and move on; that is the defect this whole
   * change exists to prevent, because "Total academies 0" is a sentence the
   * reader believes.
   */
  const unavailable = String(t('admin.dashboard.tileUnavailable'));

  const metric = (v: number | null, fmt: (n: number) => string = n => n.toLocaleString()) =>
    v === null ? <span className="text-gray-300">—</span> : fmt(v);

  const unavailableRow = (
    <div className="flex items-center text-sm text-amber-600">
      <AlertTriangle className="w-4 h-4 mr-1" />
      <span>{unavailable}</span>
    </div>
  );

  const growthRow = (
    pct: number | null,
    labelKey: 'percentChangeOverDays' | 'percentChangeFromLastMonth',
  ) => {
    if (pct === null) return unavailableRow;
    return (
      <div className={`flex items-center text-sm ${pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
        {pct >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
        <span>{String(t(`admin.dashboard.${labelKey}`, { sign: pct >= 0 ? '+' : '', percent: pct }))}</span>
      </div>
    );
  };

  const trendBox = (
    series: number[] | null,
    dataKey: string,
    color: string,
    isCurrency = false,
  ) => (
    <div className="mt-4 w-full h-16 relative">
      {series === null ? (
        <div className="flex items-center justify-center h-full text-xs text-amber-600">
          {unavailable}
        </div>
      ) : series.length > 0 ? (
        <AdminTrendChart
          data={series.map((value, index) => ({ day: index, [dataKey]: value }))}
          dataKey={dataKey}
          color={color}
          isCurrency={isCurrency}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-xs text-gray-400">
          {String(t('admin.dashboard.noData'))}
        </div>
      )}
    </div>
  );

  if (loading) {
    // Real header stays mounted; only the body content shows skeletons.
    // AdminSkeleton.Bar uses the shimmer sweep — no outer animate-pulse needed.
    return (
      <div className="space-y-6">
        <AdminPageHeader
          kicker={String(t('admin.dashboard.kicker'))}
          title={String(t('admin.dashboard.title'))}
          description={String(t('admin.dashboard.subtitle'))}
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

  // Explicit failure state. The old code substituted an all-zeros stats object
  // here, so a broken load looked exactly like a brand-new empty platform.
  if (!stats) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          kicker={String(t('admin.dashboard.kicker'))}
          title={String(t('admin.dashboard.title'))}
          description={String(t('admin.dashboard.subtitle'))}
        />
        <div className="bg-white p-8 rounded-2xl ring-1 ring-rose-200/70 flex flex-col items-center text-center gap-3">
          <XCircle className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-medium text-gray-900">
            {String(t('admin.dashboard.failedToLoad'))}
          </p>
          {loadError && (
            <p className="text-xs text-gray-500 max-w-lg break-words">{loadError}</p>
          )}
          <Button variant="outline" size="sm" onClick={loadDashboardData}>
            {String(t('admin.common.refresh'))}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={String(t('admin.dashboard.kicker'))}
        title={String(t('admin.dashboard.title'))}
        description={String(t('admin.dashboard.subtitle'))}
        actions={
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-emerald-50 ring-1 ring-emerald-200/60 text-[11px] font-semibold text-emerald-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            {String(t('admin.dashboard.live'))}
          </div>
        }
      />

      {/* A partial load says so ONCE at the top, with the reason and a
          retry. Without this the page looks complete apart from a couple of
          dashes, and an admin reading a stale-looking tile has no way to
          tell it apart from a genuinely empty one. */}
      {degraded.length > 0 && (
        <div className="bg-amber-50 ring-1 ring-amber-200/70 rounded-2xl p-4 flex flex-wrap items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {String(t('admin.dashboard.partiallyLoaded', { count: degraded.length }))}
            </p>
            <p className="text-xs text-gray-600 mt-1 break-words">
              {degraded.map(d => `${d.section}: ${d.detail}`).join(' · ')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadDashboardData}>
            {String(t('admin.common.refresh'))}
          </Button>
        </div>
      )}

      {/* System Alerts — de-duplicated: identical title+message rows (e.g. a
          batch of the same failure) collapse into one card with an ×N count,
          and "Resolve all" clears the whole backlog at once. */}
      {(() => {
        const active = alerts.filter(alert => !alert.resolved);
        if (active.length === 0) return null;
        const groups = Array.from(
          active.reduce((m, a) => {
            const key = `${a.type}|${a.title}|${a.message}`;
            const g = m.get(key);
            if (g) { g.ids.push(a.id); if (a.timestamp > g.timestamp) g.timestamp = a.timestamp; }
            else m.set(key, { key, type: a.type, title: a.title, message: a.message, timestamp: a.timestamp, ids: [a.id] });
            return m;
          }, new Map<string, { key: string; type: SystemAlert['type']; title: string; message: string; timestamp: Date; ids: string[] }>()).values()
        ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
                {String(t('admin.dashboard.alerts'))}
                <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200/60">
                  {active.length}
                </span>
              </h2>
              <Button variant="outline" size="sm" onClick={handleResolveAll} disabled={resolvingAll}>
                {resolvingAll ? String(t('admin.dashboard.resolving')) : String(t('admin.dashboard.resolveAll'))}
              </Button>
            </div>
            <div className="space-y-2">
              {groups.map((g) => (
                <div key={g.key} className={`p-4 rounded-2xl ring-1 ${getAlertBgColor(g.type)}`}>
                  <div className="flex items-start gap-3">
                    {getAlertIcon(g.type)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        {localizeAlertTitle(g.title)}
                        {g.ids.length > 1 && (
                          <span className="inline-flex items-center h-5 px-1.5 rounded-full text-[11px] font-semibold bg-white/70 text-gray-600 ring-1 ring-gray-200/70">
                            ×{g.ids.length}
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{localizeAlertMessage(g.title, g.message)}</p>
                      <p className="text-xs text-gray-500 mt-2 flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {g.timestamp.toLocaleString(dateLocale)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResolveGroup(g.ids)}
                      disabled={resolvingAlertId === g.ids[0]}
                      className="flex-shrink-0 text-primary hover:text-primary"
                    >
                      {resolvingAlertId === g.ids[0] ? String(t('admin.dashboard.resolving')) : String(t('admin.dashboard.resolve'))}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] hover:ring-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{String(t('admin.dashboard.totalAcademies'))}</h3>
          </div>
          <div className="text-[28px] leading-none font-semibold text-gray-900 tracking-tight tabular-nums mb-2">
            {metric(stats.totalAcademies)}
          </div>
          {growthRow(stats.academiesGrowth, 'percentChangeOverDays')}
          {trendBox(stats.academiesTrend, 'academies', '#3B82F6')}
        </div>

        <div className="bg-white p-5 rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] hover:ring-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{String(t('admin.dashboard.totalUsers'))}</h3>
          </div>
          <div className="text-[28px] leading-none font-semibold text-gray-900 tracking-tight tabular-nums mb-2">
            {metric(stats.totalUsers)}
          </div>
          {growthRow(stats.usersGrowth, 'percentChangeOverDays')}
          {trendBox(stats.usersTrend, 'users', '#10B981')}
        </div>

        <div className="bg-white p-5 rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] hover:ring-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{String(t('admin.dashboard.monthlyRevenue'))}</h3>
          </div>
          <div className="text-[28px] leading-none font-semibold text-gray-900 tracking-tight tabular-nums mb-2">
            {metric(stats.monthlyRevenue, formatCurrency)}
          </div>
          {growthRow(stats.revenueGrowth, 'percentChangeFromLastMonth')}
          {trendBox(stats.revenueTrend, 'revenue', '#8B5CF6', true)}
        </div>

        <div className="bg-white p-5 rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] hover:ring-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{String(t('admin.dashboard.activeSubscriptions'))}</h3>
          </div>
          <div className="text-[28px] leading-none font-semibold text-gray-900 tracking-tight tabular-nums mb-2">
            {metric(stats.activeSubscriptions)}
          </div>
          {growthRow(stats.subscriptionsGrowth, 'percentChangeOverDays')}
          {trendBox(stats.subscriptionsTrend, 'subscriptions', '#F59E0B')}
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] hover:ring-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{String(t('admin.dashboard.supportTickets'))}</h3>
          </div>
          <div className="text-[28px] leading-none font-semibold text-gray-900 tracking-tight tabular-nums mb-2">
            {metric(stats.supportTickets)}
          </div>
          {stats.unreadSupportTickets === null || stats.closedSupportTickets === null ? unavailableRow : (
            <div className={`flex items-center text-sm ${stats.unreadSupportTickets > 0 ? 'text-rose-600' : 'text-gray-500'}`}>
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span>{String(t('admin.dashboard.conversationBreakdown', { unread: stats.unreadSupportTickets, closed: stats.closedSupportTickets }))}</span>
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] hover:ring-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{String(t('admin.dashboard.systemHealth'))}</h3>
          </div>
          <div className="text-[28px] leading-none font-semibold text-gray-900 tracking-tight tabular-nums mb-2">
            {stats.systemHealth === null ? <span className="text-gray-300">—</span> : `${stats.systemHealth}%`}
          </div>
          {stats.servicesOperational === null ? unavailableRow : (
          <div className={`flex items-center text-sm ${stats.servicesOperational ? 'text-emerald-600' : 'text-amber-600'}`}>
            {stats.servicesOperational ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                <span>{String(t('admin.dashboard.allServicesOperational'))}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 mr-1" />
                <span>{String(t('admin.dashboard.someServicesDegraded'))}</span>
              </>
            )}
          </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] hover:ring-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{String(t('admin.dashboard.growthRate'))}</h3>
          </div>
          <div className="text-[28px] leading-none font-semibold text-gray-900 tracking-tight tabular-nums mb-2">
            {stats.revenueGrowth === null
              ? <span className="text-gray-300">—</span>
              : `${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth}%`}
          </div>
          {/* Honest copy — describes the trend rather than asserting a
              hardcoded "+10% target" we don't have anywhere in config. */}
          {stats.revenueGrowth === null ? unavailableRow : (
          <div className={`flex items-center text-sm ${stats.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stats.revenueGrowth >= 0 ? (
              <>
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>{String(t('admin.dashboard.upVsLastMonth'))}</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 mr-1" />
                <span>{String(t('admin.dashboard.downVsLastMonth'))}</span>
              </>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartOverview />
        <RecentActivity />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-[0.06em]">{String(t('admin.dashboard.quickActions'))}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            // All four actions navigate to the relevant management page.
            // For "Create Academy" we land on the academies list — admins
            // open the create modal from there. We don't auto-open the modal
            // on navigation because the existing list view doesn't accept a
            // ?new=1 query param yet. Add one if you want one-click creation.
            { icon: Building2, label: String(t('admin.dashboard.createAcademy')), desc: String(t('admin.dashboard.createAcademyDesc')), accent: 'blue' as const, href: '/admin/academies' },
            { icon: Users, label: String(t('admin.dashboard.manageUsers')), desc: String(t('admin.dashboard.manageUsersDesc')), accent: 'emerald' as const, href: '/admin/users' },
            { icon: CreditCard, label: String(t('admin.dashboard.billingIssues')), desc: String(t('admin.dashboard.billingIssuesDesc')), accent: 'violet' as const, href: '/admin/subscriptions?status=past_due' },
            { icon: Headphones, label: String(t('admin.dashboard.supportQueue')), desc: String(t('admin.dashboard.supportQueueDesc')), accent: 'rose' as const, href: '/admin/support' },
          ].map(action => {
            const accentMap = {
              blue:    { iconBg: 'bg-primary/10', iconColor: 'text-primary', border: 'group-hover:border-primary/40' },
              emerald: { iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', border: 'group-hover:border-emerald-300' },
              violet:  { iconBg: 'bg-violet-50', iconColor: 'text-violet-600', border: 'group-hover:border-violet-300' },
              rose:    { iconBg: 'bg-rose-50', iconColor: 'text-rose-600', border: 'group-hover:border-rose-300' },
            }
            const a = accentMap[action.accent]
            return (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className={`group bg-white p-4 text-left rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] ${a.border} hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-px transition-all`}
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