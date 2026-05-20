'use client'

import React, { useEffect, useState } from 'react';
import {
  Building2,
  Search,
  MoreVertical,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Plus,
  Users,
  Phone,
  RefreshCw,
  Banknote,
  Copy,
  Clock
} from 'lucide-react';
import { DashboardCard } from '../DashboardCard';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { AdminPageHeader } from '../AdminPageHeader';
import { AdminSkeleton } from '../AdminSkeleton';
import { useAdminFetch } from '../useAdminFetch';
import { useUrlState } from '../useUrlState';
import { useTableSort } from '../useTableSort';
import { SortableTh } from '../SortableTh';
import { useDebouncedValue } from '../useDebouncedValue';
import { useLiveAnnounce } from '../useLiveAnnounce';
import { AcademyDetailModal } from './AcademyDetailModal';
import { SuspendReasonModal } from './SuspendReasonModal';
import { AddAcademyModal } from './AddAcademyModal';
import { PartnerSetupModal } from './PartnerSetupModal';
import { formatPrice } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDedupedToast } from '../useDedupedToast';
import { useConfirm } from '../useConfirm';
import { useTranslation } from '@/hooks/useTranslation';
import { AdminEmptyState } from '../AdminEmptyState';

interface Academy {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subscriptionTier: 'free' | 'individual' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'trial' | 'inactive' | 'pending_onboarding';
  totalUsers: number;
  monthlyRevenue: number;
  createdAt: Date;
  lastActive: Date;
  isSuspended: boolean;
  suspensionReason?: string;
  // Onboarding state — set when an academy was created via the admin flow
  // and the manager hasn't signed up yet.
  onboardingToken: string | null;
  onboardingExpiresAt: string | null;
  onboardingCompletedAt: string | null;
  hasManager: boolean;
}

export function AcademyManagement() {
  const { toast } = useDedupedToast();
  const confirm = useConfirm();
  const adminFetch = useAdminFetch();
  const { announce, LiveRegion } = useLiveAnnounce();
  const { t } = useTranslation();
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [loading, setLoading] = useState(true);
  // Filter state mirrored to URL params so refreshing / sharing the page
  // preserves what the admin was looking at.
  const [searchTerm, setSearchTerm] = useUrlState('q', '');
  const [filterStatus, setFilterStatus] = useUrlState('status', 'all');
  const [filterTier, setFilterTier] = useUrlState('tier', 'all');
  // Debounce the search term so the filter doesn't re-run on every keystroke
  // when the admin types into the search box. 200ms feels instant.
  const debouncedSearch = useDebouncedValue(searchTerm, 200);
  const [selectedAcademy, setSelectedAcademy] = useState<Academy | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [academyToSuspend, setAcademyToSuspend] = useState<Academy | null>(null);
  // Bulk selection — set of academy ids the admin has checked. Lives outside
  // URL state because it's session-scoped (no value to refreshing/sharing).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPartnerSetupModal, setShowPartnerSetupModal] = useState(false);
  const [academyForPartnerSetup, setAcademyForPartnerSetup] = useState<Academy | null>(null);

  useEffect(() => {
    loadAcademies();
  }, []);

  // Clear bulk selection when filters change. The selected ids may point at
  // rows that no longer match the new filter view, which leads to confusing
  // partial-success results (e.g. "suspended 3" but only 1 is on screen).
  useEffect(() => {
    setSelectedIds(new Set());
  }, [debouncedSearch, filterStatus, filterTier]);

  // Close actions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showActions) {
        const target = event.target as HTMLElement;
        if (!target.closest('.actions-dropdown') && !target.closest('.actions-button')) {
          setShowActions(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActions]);

  // Loads via the service-role admin API instead of direct supabase queries
  // from the browser. The previous approach used the anon key, which hit RLS
  // and surfaced as an empty `{}` error. The API does the heavy lifting:
  // joins, counts, last-activity computation — and returns one clean payload.
  const loadAcademies = async () => {
    try {
      setLoading(true);

      const response = await adminFetch('/api/admin/academies')
      const body = await response.json()

      if (!response.ok) {
        // Surface the actual error rather than swallowing as `{}`.
        console.error('[AcademyManagement] Admin API error:', body)
        toast({
          title: 'Failed to load academies',
          description: body.detail || body.error || `HTTP ${response.status}`,
          variant: 'destructive',
        })
        setAcademies([])
        return
      }

      // Transform the API response → component's Academy shape.
      // The API has already done the join + counts work, we just compute
      // the derived display state (status badge, suspension reason).
      const processed: Academy[] = (body.academies || []).map((a: {
        id: string
        name: string
        email: string | null
        phone: string | null
        address: string | null
        subscriptionTier: string
        subscriptionStatus: string
        monthlyRevenue: number
        isSuspended: boolean
        suspensionReason: string | null
        totalUsers: number
        createdAt: string
        updatedAt: string
        lastActive: string
        onboardingToken: string | null
        onboardingExpiresAt: string | null
        onboardingCompletedAt: string | null
        hasManager: boolean
      }) => {
        let status: Academy['status'] = 'inactive'
        let isSuspended = a.isSuspended
        let suspensionReason = a.suspensionReason || undefined

        // Pending onboarding takes priority over other statuses — if the
        // manager hasn't signed up yet, that's the most actionable state.
        if (!a.hasManager && a.onboardingToken && !a.onboardingCompletedAt) {
          status = 'pending_onboarding'
        } else if (isSuspended) {
          status = 'suspended'
        } else if (a.subscriptionStatus === 'active') {
          status = 'active'
        } else if (a.subscriptionStatus === 'trialing') {
          status = 'trial'
        } else if (a.subscriptionStatus === 'canceled' || a.subscriptionStatus === 'past_due') {
          status = 'suspended'
          isSuspended = true
          suspensionReason = a.subscriptionStatus === 'past_due' ? 'Payment overdue' : 'Subscription canceled'
        }

        return {
          id: a.id,
          name: a.name,
          email: a.email || 'No email',
          phone: a.phone || undefined,
          address: a.address || undefined,
          subscriptionTier: a.subscriptionTier as Academy['subscriptionTier'],
          status,
          totalUsers: a.totalUsers,
          monthlyRevenue: a.monthlyRevenue,
          createdAt: new Date(a.createdAt),
          lastActive: new Date(a.lastActive),
          isSuspended,
          suspensionReason,
          onboardingToken: a.onboardingToken,
          onboardingExpiresAt: a.onboardingExpiresAt,
          onboardingCompletedAt: a.onboardingCompletedAt,
          hasManager: a.hasManager,
        }
      })

      setAcademies(processed)
      // Announce row count to screen readers — useful when a refresh or
      // filter change updates the list silently.
      announce(`Loaded ${processed.length} ${processed.length === 1 ? 'academy' : 'academies'}.`)
    } catch (error) {
      console.error('[AcademyManagement] Unexpected load error:', error);
      toast({
        title: 'Failed to load academies',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
      setAcademies([]);
    } finally {
      setLoading(false);
    }
  };

  // Build the public onboarding URL from a token. Origin lives on the
  // current page (works for localhost + prod), the path is fixed.
  const buildOnboardingUrl = (token: string) =>
    `${window.location.origin}/onboarding/${token}`

  const handleCopyOnboardingLink = async (academy: Academy) => {
    if (!academy.onboardingToken) return
    const url = buildOnboardingUrl(academy.onboardingToken)
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: 'Onboarding link copied', description: url, variant: 'success' })
    } catch {
      toast({
        title: 'Could not copy automatically',
        description: url,
        variant: 'destructive',
      })
    }
    setShowActions(null)
  }

  // Revoke an outstanding onboarding token. Confirms first because this
  // permanently invalidates the link the manager may already have. After
  // revocation the row's "Pending invite" badge goes away — the admin can
  // regenerate later if needed (which mints a fresh token).
  const handleRevokeOnboardingLink = async (academy: Academy) => {
    setShowActions(null)
    const ok = await confirm({
      title: `Revoke onboarding link for "${academy.name}"?`,
      description: 'The current link will stop working immediately. You can generate a new one later.',
      variant: 'warning',
      confirmText: 'Revoke link',
    })
    if (!ok) return

    try {
      const response = await adminFetch(`/api/admin/academies/${academy.id}/onboarding-token`, {
        method: 'DELETE',
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || body.detail || 'Failed to revoke link')
      }

      toast({
        title: 'Onboarding link revoked',
        description: `"${academy.name}" no longer has a pending invite.`,
        variant: 'success',
      })
      loadAcademies()
    } catch (err) {
      console.error('[AcademyManagement] Revoke link error:', err)
      toast({
        title: 'Could not revoke link',
        description: err instanceof Error ? err.message : 'Unexpected error',
        variant: 'destructive',
      })
    }
  }

  // Regenerate the onboarding token. Used when the original link expired
  // (or got lost) and the manager hasn't completed onboarding yet.
  // Auto-copies the fresh link so the admin can paste it straight into
  // an email/message to the manager.
  const handleRegenerateOnboardingLink = async (academy: Academy) => {
    setShowActions(null)
    try {
      const response = await adminFetch(`/api/admin/academies/${academy.id}/onboarding-token`, {
        method: 'POST',
      })
      const body = await response.json()
      if (!response.ok) {
        throw new Error(body.error || body.detail || 'Failed to regenerate link')
      }

      const url: string = body.academy.onboardingUrl
      try {
        await navigator.clipboard.writeText(url)
        toast({
          title: 'New onboarding link copied',
          description: url,
          variant: 'success',
        })
      } catch {
        toast({
          title: 'New onboarding link generated',
          description: url,
          variant: 'success',
        })
      }
      loadAcademies()
    } catch (err) {
      console.error('[AcademyManagement] Regenerate link error:', err)
      toast({
        title: 'Could not regenerate link',
        description: err instanceof Error ? err.message : 'Unexpected error',
        variant: 'destructive',
      })
    }
  }

  const handleSuspendAcademy = async (reason: string) => {
    if (!academyToSuspend) return;

    try {
      const { error } = await supabase
        .from('academies')
        .update({
          is_suspended: true,
          suspension_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', academyToSuspend.id);

      if (error) throw error;

      setShowActions(null);
      loadAcademies(); // Reload the data
    } catch (error) {
      console.error('Error suspending academy:', error);
      throw error; // Re-throw to be handled by modal
    }
  };

  // Bulk-suspend or unsuspend N academies in parallel. Tracks success /
  // failure counts so the user gets accurate feedback.
  const handleBulkSuspendChange = async (suspend: boolean, reason?: string) => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    await Promise.all(
      Array.from(selectedIds).map(async id => {
        const { error } = await supabase
          .from('academies')
          .update({
            is_suspended: suspend,
            suspension_reason: suspend ? (reason || 'Bulk-suspended by admin') : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) {
          console.error('[Bulk] suspend update failed for', id, error);
          fail++;
        } else {
          ok++;
        }
      }),
    );
    setBulkBusy(false);
    setSelectedIds(new Set());
    toast({
      title: fail === 0
        ? `${ok} ${ok === 1 ? 'academy' : 'academies'} ${suspend ? 'suspended' : 'reactivated'}`
        : `${ok} updated, ${fail} failed`,
      variant: fail === 0 ? 'success' : 'destructive',
    });
    announce(`${ok} ${suspend ? 'suspended' : 'reactivated'}${fail ? `, ${fail} failed` : ''}.`);
    loadAcademies();
  };

  const handleUnsuspendAcademy = async (academyId: string) => {
    try {
      const { error } = await supabase
        .from('academies')
        .update({
          is_suspended: false,
          suspension_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', academyId);

      if (error) throw error;

      setShowActions(null);
      loadAcademies(); // Reload the data
    } catch (error) {
      console.error('Error unsuspending academy:', error);
      toast({ title: String(t('admin.failedToUnsuspend')), variant: 'destructive' });
    }
  };

  const handleExportData = () => {
    // Export academies data to CSV
    const headers = ['Academy Name', 'Email', 'Phone', 'Status', 'Tier', 'Total Users', 'Monthly Revenue', 'Created Date', 'Last Active'];

    const csvData = filteredAcademies.map(academy => [
      academy.name,
      academy.email,
      academy.phone || 'N/A',
      academy.isSuspended ? 'Suspended' : academy.status,
      academy.subscriptionTier,
      academy.totalUsers,
      academy.monthlyRevenue,
      academy.createdAt.toLocaleDateString(),
      academy.lastActive.toLocaleDateString()
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `academies-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  };

  // Status badge map — uses shared StatusBadge primitive so colors / sizing /
  // ring treatment stay consistent across all admin tables.
  const getStatusBadge = (status: Academy['status'], isSuspended: boolean) => {
    if (isSuspended) {
      return <StatusBadge tone="danger" icon={Ban}>Suspended</StatusBadge>
    }
    const map: Record<Academy['status'], { tone: StatusTone; icon: typeof CheckCircle; label: string } | null> = {
      active:              { tone: 'active',  icon: CheckCircle, label: 'Active' },
      suspended:           { tone: 'danger',  icon: Ban,         label: 'Suspended' },
      trial:               { tone: 'pending', icon: AlertCircle, label: 'Trial' },
      pending_onboarding:  { tone: 'violet',  icon: Clock,       label: 'Pending invite' },
      inactive:            { tone: 'muted',   icon: XCircle,     label: 'Inactive' },
    }
    const entry = map[status]
    if (!entry) return null
    return <StatusBadge tone={entry.tone} icon={entry.icon}>{entry.label}</StatusBadge>
  };

  // Tier badge — same tone vocabulary as SubscriptionManagement so the same
  // tier reads identically in both tables.
  const getTierBadge = (tier: Academy['subscriptionTier']) => {
    const tones: Record<Academy['subscriptionTier'], StatusTone> = {
      free:       'muted',
      individual: 'info',
      basic:      'brand',
      pro:        'violet',
      enterprise: 'violet',
    }
    return (
      <StatusBadge tone={tones[tier] || 'muted'}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </StatusBadge>
    )
  };

  // Sortable columns. Sort key + direction sync to URL via the shared hook.
  const academySortableValue = (a: Academy, key: string) => {
    switch (key) {
      case 'name':         return a.name
      case 'status':       return a.isSuspended ? 'suspended' : a.status
      case 'subscription': return a.subscriptionTier
      case 'users':        return a.totalUsers
      case 'revenue':      return a.monthlyRevenue
      case 'lastActive':   return a.lastActive
      default: return null
    }
  }

  const filteredAcademies = academies.filter(academy => {
    const matchesSearch = academy.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                          academy.email.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'suspended' && academy.isSuspended) ||
                          (filterStatus === academy.status && !academy.isSuspended);
    const matchesTier = filterTier === 'all' || academy.subscriptionTier === filterTier;
    
    return matchesSearch && matchesStatus && matchesTier;
  });

  // Apply column sort on top of filter. The hook keeps key + direction in
  // the URL via useUrlState — same shape as the other admin filters.
  const { toggle: toggleSort, sortIndicator, sorted: sortedAcademies } = useTableSort(
    filteredAcademies,
    { defaultKey: '', defaultDir: '', getValue: academySortableValue },
  )

  return (
    <>
      <div className="space-y-6">
        {/* Header stays mounted during loading — only the body content
            (stats / filters / table) shows skeleton. Matches the
            teacher / manager pages so the real title and description are
            visible immediately on navigation. */}
        <AdminPageHeader
          kicker={String(t('admin.academies.kicker'))}
          title={String(t('admin.academies.title'))}
          description={String(t('admin.academies.subtitle'))}
        />

        {/* Visually-hidden region read aloud by screen readers when the
            list refreshes / filters change. */}
        <LiveRegion />

        {/* Bulk action bar — sticky just below the page header whenever
            the admin has selected one or more rows. */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-[#2885e8]/8 ring-1 ring-[#2885e8]/20 rounded-xl px-4 py-2.5">
            <p className="text-sm font-medium text-[#1f6fc7]">
              {selectedIds.size} selected
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => handleBulkSuspendChange(false)}
                className="gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                Reactivate
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={async () => {
                  const ok = await confirm({
                    title: `Suspend ${selectedIds.size} academies?`,
                    description: 'Their managers will lose access immediately.',
                    variant: 'danger',
                    confirmText: 'Suspend',
                  });
                  if (ok) handleBulkSuspendChange(true);
                }}
                className="gap-1.5 text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200"
              >
                <Ban className="w-4 h-4" />
                Suspend
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={bulkBusy}
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <AdminSkeleton.Body stats={4} cols={7} rows={6} />
        ) : (<>

        {/* Stats Overview — uses shared DashboardCard for consistent surfaces + accents */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title={String(t('admin.academies.totalAcademies'))}
            value={academies.length.toLocaleString()}
            icon={<Building2 className="h-5 w-5" />}
            accent="blue"
          />
          <DashboardCard
            title={String(t('admin.academies.active'))}
            value={academies.filter(a => a.status === 'active' && !a.isSuspended).length.toLocaleString()}
            icon={<CheckCircle className="h-5 w-5" />}
            accent="emerald"
          />
          <DashboardCard
            title={String(t('admin.academies.trial'))}
            value={academies.filter(a => a.status === 'trial').length.toLocaleString()}
            icon={<AlertCircle className="h-5 w-5" />}
            accent="amber"
          />
          <DashboardCard
            title={String(t('admin.academies.suspended'))}
            value={academies.filter(a => a.isSuspended).length.toLocaleString()}
            icon={<Ban className="h-5 w-5" />}
            accent="rose"
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
                  placeholder="Search academies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="pending_onboarding">Pending invite</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={loadAcademies}
                variant="outline"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>

              <Button
                onClick={handleExportData}
                variant="outline"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>

              <Button
                onClick={() => setShowAddModal(true)}
                variant="default"
              >
                <Plus className="w-4 h-4" />
                Add Academy
              </Button>
            </div>
          </div>
        </div>

        {/* Academy List */}
        <div className="bg-white rounded-xl ring-1 ring-gray-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/60 border-b border-gray-200/70">
                <tr>
                  {/* Bulk-select header checkbox — toggles all visible
                      (filtered/sorted) rows. Indeterminate when partial. */}
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all visible academies"
                      className="h-4 w-4 rounded border-gray-300 text-[#2885e8] focus:ring-[#2885e8]/30"
                      ref={el => {
                        if (!el) return;
                        const visible = sortedAcademies.length;
                        const checkedHere = sortedAcademies.filter(a => selectedIds.has(a.id)).length;
                        el.indeterminate = checkedHere > 0 && checkedHere < visible;
                      }}
                      checked={sortedAcademies.length > 0 && sortedAcademies.every(a => selectedIds.has(a.id))}
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) {
                          sortedAcademies.forEach(a => next.add(a.id));
                        } else {
                          sortedAcademies.forEach(a => next.delete(a.id));
                        }
                        setSelectedIds(next);
                      }}
                    />
                  </th>
                  {/* Sortable column headers — click to cycle asc → desc → off.
                      Indicator shows current sort key + direction. */}
                  <SortableTh sortKey="name" toggle={toggleSort} indicator={sortIndicator('name')}>Academy</SortableTh>
                  <SortableTh sortKey="status" toggle={toggleSort} indicator={sortIndicator('status')}>Status</SortableTh>
                  <SortableTh sortKey="subscription" toggle={toggleSort} indicator={sortIndicator('subscription')}>Subscription</SortableTh>
                  <SortableTh sortKey="users" toggle={toggleSort} indicator={sortIndicator('users')}>Users</SortableTh>
                  <SortableTh sortKey="revenue" toggle={toggleSort} indicator={sortIndicator('revenue')}>Revenue</SortableTh>
                  <SortableTh sortKey="lastActive" toggle={toggleSort} indicator={sortIndicator('lastActive')}>Last Active</SortableTh>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedAcademies.map((academy) => (
                  <tr key={academy.id} className={`hover:bg-gray-50 ${selectedIds.has(academy.id) ? 'bg-[#2885e8]/[0.03]' : ''}`}>
                    <td className="px-4 py-4 w-8">
                      <input
                        type="checkbox"
                        aria-label={`Select ${academy.name}`}
                        className="h-4 w-4 rounded border-gray-300 text-[#2885e8] focus:ring-[#2885e8]/30"
                        checked={selectedIds.has(academy.id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(academy.id);
                          else next.delete(academy.id);
                          setSelectedIds(next);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{academy.name}</div>
                        <div className="text-xs text-gray-500">{academy.email}</div>
                        {academy.phone && (
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <Phone className="mr-1 h-3 w-3" />
                            {academy.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(academy.status, academy.isSuspended)}
                      {academy.suspensionReason && (
                        <p className="text-xs text-rose-600 mt-1 max-w-xs truncate">
                          {academy.suspensionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="mb-1">
                          {getTierBadge(academy.subscriptionTier)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm flex items-center text-gray-900">
                        <Users className="mr-1 h-3 w-3" />
                        {academy.totalUsers}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(academy.monthlyRevenue)}
                      </div>
                      <div className="text-xs text-gray-500">per month</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(academy.lastActive).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(academy.lastActive).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right relative">
                      <button
                        onClick={() => setShowActions(showActions === academy.id ? null : academy.id)}
                        className="actions-button text-gray-400 hover:text-gray-600"
                        aria-label="Row actions"
                        aria-haspopup="menu"
                        aria-expanded={showActions === academy.id}
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>

                      {showActions === academy.id && (
                        <div className="actions-dropdown absolute right-0 mt-2 min-w-[180px] w-max bg-white rounded-xl shadow-xl shadow-gray-900/10 ring-1 ring-gray-200/70 py-1 z-10">
                          <button
                            onClick={() => {
                              setSelectedAcademy(academy);
                              setShowDetailModal(true);
                              setShowActions(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Eye className="mr-3 h-4 w-4" />
                            View Details
                          </button>
                          {/* Show "Copy onboarding link" only while the manager hasn't
                              completed onboarding. Once they sign up the token is
                              cleared, so this button hides itself. */}
                          {academy.onboardingToken && !academy.onboardingCompletedAt && (
                            <>
                              <button
                                onClick={() => handleCopyOnboardingLink(academy)}
                                className="flex items-center w-full px-4 py-2 text-sm text-violet-700 hover:bg-violet-50"
                              >
                                <Copy className="mr-3 h-4 w-4" />
                                Copy onboarding link
                              </button>
                              <button
                                onClick={() => handleRegenerateOnboardingLink(academy)}
                                className="flex items-center w-full px-4 py-2 text-sm text-violet-700 hover:bg-violet-50"
                              >
                                <RefreshCw className="mr-3 h-4 w-4" />
                                Regenerate onboarding link
                              </button>
                              <button
                                onClick={() => handleRevokeOnboardingLink(academy)}
                                className="flex items-center w-full px-4 py-2 text-sm text-rose-700 hover:bg-rose-50"
                              >
                                <XCircle className="mr-3 h-4 w-4" />
                                Revoke onboarding link
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setAcademyForPartnerSetup(academy);
                              setShowPartnerSetupModal(true);
                              setShowActions(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                          >
                            <Banknote className="mr-3 h-4 w-4" />
                            Setup Partner
                          </button>
                          {academy.isSuspended ? (
                            <button
                              onClick={() => handleUnsuspendAcademy(academy.id)}
                              className="flex items-center w-full px-4 py-2 text-sm text-emerald-700 hover:bg-green-50"
                            >
                              <CheckCircle className="mr-3 h-4 w-4" />
                              Unsuspend
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setAcademyToSuspend(academy);
                                setShowSuspendModal(true);
                                setShowActions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-rose-700 hover:bg-rose-50"
                            >
                              <Ban className="mr-3 h-4 w-4" />
                              Suspend
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredAcademies.length === 0 && (
            <AdminEmptyState
              icon={Building2}
              title={String(t('admin.academies.noAcademiesFound'))}
              description={String(t('admin.academies.noAcademiesFoundDesc'))}
            />
          )}
        </div>
        </>)}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAcademy && (
        <AcademyDetailModal
          academy={selectedAcademy}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedAcademy(null);
          }}
        />
      )}

      {/* Suspend Modal */}
      {showSuspendModal && academyToSuspend && (
        <SuspendReasonModal
          academyName={academyToSuspend.name}
          onClose={() => {
            setShowSuspendModal(false);
            setAcademyToSuspend(null);
          }}
          onConfirm={handleSuspendAcademy}
        />
      )}

      {/* Add Academy Modal */}
      {showAddModal && (
        <AddAcademyModal
          onClose={() => setShowAddModal(false)}
          onSuccess={async (created) => {
            loadAcademies();
            // Auto-copy the onboarding URL so the admin can paste it
            // straight into an email/message. The link also remains in the
            // row's actions menu ("Copy onboarding link") for later use.
            if (created?.onboardingUrl) {
              try {
                await navigator.clipboard.writeText(created.onboardingUrl)
                toast({
                  title: `${created.name} created — onboarding link copied`,
                  description: created.onboardingUrl,
                  variant: 'success',
                })
              } catch {
                toast({
                  title: `${created.name} created`,
                  description: `Onboarding link: ${created.onboardingUrl}`,
                  variant: 'success',
                })
              }
            }
          }}
        />
      )}

      {/* Partner Setup Modal */}
      {showPartnerSetupModal && academyForPartnerSetup && (
        <PartnerSetupModal
          academyId={academyForPartnerSetup.id}
          academyName={academyForPartnerSetup.name}
          onClose={() => {
            setShowPartnerSetupModal(false);
            setAcademyForPartnerSetup(null);
          }}
          onSuccess={() => {
            loadAcademies();
          }}
        />
      )}

      {/* Click outside to close actions menu */}
      {showActions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActions(null)}
        />
      )}
    </>
  );
}

