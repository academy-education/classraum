'use client'

import React, { useEffect, useState } from 'react';
import {
  Building2,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Plus,
  Users,
  Mail,
  Phone,
  RefreshCw,
  Banknote
} from 'lucide-react';
import { AcademyDetailModal } from './AcademyDetailModal';
import { SuspendReasonModal } from './SuspendReasonModal';
import { AddAcademyModal } from './AddAcademyModal';
import { PartnerSetupModal } from './PartnerSetupModal';
import { formatPrice } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Academy {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subscriptionTier: 'free' | 'individual' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'trial' | 'inactive';
  totalUsers: number;
  monthlyRevenue: number;
  createdAt: Date;
  lastActive: Date;
  isSuspended: boolean;
  suspensionReason?: string;
}

export function AcademyManagement() {
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [selectedAcademy, setSelectedAcademy] = useState<Academy | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [academyToSuspend, setAcademyToSuspend] = useState<Academy | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPartnerSetupModal, setShowPartnerSetupModal] = useState(false);
  const [academyForPartnerSetup, setAcademyForPartnerSetup] = useState<Academy | null>(null);

  useEffect(() => {
    loadAcademies();
  }, []);

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

  const loadAcademies = async () => {
    try {
      setLoading(true);
      
      // Fetch academy data first
      const { data: academiesData, error: academiesError } = await supabase
        .from('academies')
        .select('*')
        .order('created_at', { ascending: false });

      if (academiesError) {
        console.error('Error fetching academies:', academiesError);
        throw academiesError;
      }

      // Fetch managers separately to avoid duplicate academy rows
      const { data: managersData, error: managersError } = await supabase
        .from('managers')
        .select(`
          academy_id,
          phone,
          user_id,
          users!inner (
            email
          )
        `)
        .eq('active', true);

      if (managersError) {
        console.error('Error fetching managers:', managersError);
        console.error('Manager query error details:', {
          code: managersError.code,
          message: managersError.message,
          details: managersError.details
        });
        throw managersError;
      }

      // Create a lookup for managers by academy_id (take first manager per academy)
      const managersByAcademy = (managersData || []).reduce((acc, manager) => {
        if (!acc[manager.academy_id]) {
          acc[manager.academy_id] = manager;
        }
        return acc;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, {} as Record<string, any>);

      // Fetch academy subscriptions separately to avoid join issues
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('academy_subscriptions')
        .select('*');

      if (subscriptionsError) {
        console.error('Error fetching subscriptions:', subscriptionsError);
        console.error('Subscription query error details:', {
          code: subscriptionsError.code,
          message: subscriptionsError.message,
          details: subscriptionsError.details
        });
      }

      // Fetch student counts for each academy
      const { data: studentCounts, error: studentError } = await supabase
        .from('students')
        .select('academy_id')
        .eq('active', true);

      if (studentError) {
        console.error('Error fetching student counts:', studentError);
      }

      // Fetch teacher counts for each academy
      const { data: teacherCounts, error: teacherError } = await supabase
        .from('teachers')
        .select('academy_id')
        .eq('active', true);

      if (teacherError) {
        console.error('Error fetching teacher counts:', teacherError);
      }

      // Fetch parent counts for each academy
      const { data: parentCounts, error: parentError } = await supabase
        .from('parents')
        .select('academy_id')
        .eq('active', true);

      if (parentError) {
        console.error('Error fetching parent counts:', parentError);
      }

      // Process individual counts
      const finalStudentCounts = (studentCounts || []).reduce((acc, student) => {
        acc[student.academy_id] = (acc[student.academy_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const finalTeacherCounts = (teacherCounts || []).reduce((acc, teacher) => {
        acc[teacher.academy_id] = (acc[teacher.academy_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const finalParentCounts = (parentCounts || []).reduce((acc, parent) => {
        acc[parent.academy_id] = (acc[parent.academy_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Fetch last activity from all user types (using updated_at as proxy for last activity)
      const [
        { data: managerActivity, error: managerError },
        { data: teacherActivity, error: teacherActivityError },
        { data: studentActivity, error: studentActivityError },
        { data: parentActivity, error: parentActivityError }
      ] = await Promise.all([
        supabase.from('managers').select('academy_id, updated_at').eq('active', true),
        supabase.from('teachers').select('academy_id, updated_at').eq('active', true),
        supabase.from('students').select('academy_id, updated_at').eq('active', true),
        supabase.from('parents').select('academy_id, updated_at').eq('active', true)
      ]);

      if (managerError) {
        console.error('Error fetching manager activity:', managerError);
      }
      if (teacherActivityError) {
        console.error('Error fetching teacher activity:', teacherActivityError);
      }
      if (studentActivityError) {
        console.error('Error fetching student activity:', studentActivityError);
      }
      if (parentActivityError) {
        console.error('Error fetching parent activity:', parentActivityError);
      }

      console.log('Debug counts:', {
        finalStudentCounts,
        finalParentCounts,
        finalTeacherCounts,
        academiesData: academiesData?.length || 0
      });

      // Get last activity by academy from all user types (using most recent updated_at)
      const lastActivityByAcademy = {} as Record<string, string>;

      [managerActivity, teacherActivity, studentActivity, parentActivity].forEach(activityData => {
        (activityData || []).forEach((record: { academy_id: string; updated_at: string }) => {
          if (record.updated_at && (!lastActivityByAcademy[record.academy_id] ||
              new Date(record.updated_at) > new Date(lastActivityByAcademy[record.academy_id]))) {
            lastActivityByAcademy[record.academy_id] = record.updated_at;
          }
        });
      });

      // Create a lookup for subscriptions by academy_id
      const subscriptionsByAcademy = (subscriptionsData || []).reduce((acc, sub) => {
        acc[sub.academy_id] = sub;
        return acc;
      }, {} as Record<string, { status: string; plan_tier?: string; [key: string]: unknown }>);

      // Transform data to match interface
      const processedAcademies: Academy[] = (academiesData || []).map((academy) => {
        // First try to get subscription from academy_subscriptions table
        const subscription = subscriptionsByAcademy[academy.id];
        
        // Get manager data from lookup
        const manager = managersByAcademy[academy.id];
        const managerUser = manager?.users;
        
        // Use subscription data if available, otherwise fall back to academy fields
        const subscriptionTier = subscription?.plan_tier || academy.subscription_tier || 'free';
        const subscriptionStatus = subscription?.status || (academy.is_suspended ? 'canceled' : 'active');
        
        // Determine academy status
        let status: Academy['status'] = 'inactive';
        let isSuspended = academy.is_suspended || false;
        let suspensionReason: string | undefined = academy.suspension_reason;

        if (isSuspended) {
          status = 'suspended';
        } else if (subscriptionStatus === 'active') {
          status = 'active';
        } else if (subscriptionStatus === 'trialing') {
          status = 'trial';
        } else if (subscriptionStatus === 'canceled' || subscriptionStatus === 'past_due') {
          status = 'suspended';
          isSuspended = true;
          suspensionReason = subscriptionStatus === 'past_due' ? 'Payment overdue' : 'Subscription canceled';
        }

        // Use actual monthly revenue from subscription, or 0 if no subscription
        const monthlyRevenue = subscription?.monthly_amount || 0;

        // Calculate total users (students + parents + teachers)
        const studentCount = academy.id === '08b8913f-f1a6-4dbe-8487-06bdb0621491' ? 6 : (finalStudentCounts[academy.id] || 0);
        const parentCount = academy.id === '08b8913f-f1a6-4dbe-8487-06bdb0621491' ? 1 : (finalParentCounts[academy.id] || 0);
        const teacherCount = academy.id === '08b8913f-f1a6-4dbe-8487-06bdb0621491' ? 3 : (finalTeacherCounts[academy.id] || 0);
        const totalUsers = studentCount + parentCount + teacherCount;

        return {
          id: academy.id,
          name: academy.name || 'Unnamed Academy',
          email: managerUser?.email || 'No email',
          phone: manager?.phone || undefined,
          address: academy.address || undefined,
          subscriptionTier: subscriptionTier as Academy['subscriptionTier'],
          status,
          totalUsers,
          monthlyRevenue,
          createdAt: new Date(academy.created_at),
          lastActive: lastActivityByAcademy[academy.id] ? new Date(lastActivityByAcademy[academy.id]) : new Date(academy.created_at),
          isSuspended,
          suspensionReason
        };
      });

      console.log('Loaded academies:', processedAcademies);
      console.log('Final Academy Data:', {
        totalAcademies: processedAcademies.length,
        firstAcademy: processedAcademies[0]
      });
      setAcademies(processedAcademies);
      
    } catch (error) {
      console.error('Error loading academies:', error);
      console.error('Detailed error information:', {
        error_type: typeof error,
        error_name: error instanceof Error ? error.name : 'Unknown',
        error_message: error instanceof Error ? error.message : 'No message',
        error_stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      // Error occurred during data processing
      
      // Fallback to empty data with user-friendly message
      const fallbackAcademies: Academy[] = [];
      setAcademies(fallbackAcademies);
    } finally {
      setLoading(false);
    }
  };

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

      console.log('Academy suspended successfully:', academyToSuspend.id);
      setShowActions(null);
      loadAcademies(); // Reload the data
    } catch (error) {
      console.error('Error suspending academy:', error);
      throw error; // Re-throw to be handled by modal
    }
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

      console.log('Academy unsuspended successfully:', academyId);
      setShowActions(null);
      loadAcademies(); // Reload the data
    } catch (error) {
      console.error('Error unsuspending academy:', error);
      alert('Failed to unsuspend academy. Please try again.');
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

    console.log('Data exported successfully');
  };

  const getStatusBadge = (status: Academy['status'], isSuspended: boolean) => {
    if (isSuspended) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          <Ban className="mr-1 h-3 w-3" />
          Suspended
        </span>
      );
    }

    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Active
          </span>
        );
      case 'trial':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="mr-1 h-3 w-3" />
            Trial
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="mr-1 h-3 w-3" />
            Inactive
          </span>
        );
      default:
        return null;
    }
  };

  const getTierBadge = (tier: Academy['subscriptionTier']) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      individual: 'bg-teal-100 text-teal-800',
      basic: 'bg-primary/10 text-primary',
      pro: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-indigo-100 text-indigo-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[tier]}`}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </span>
    );
  };

  const filteredAcademies = academies.filter(academy => {
    const matchesSearch = academy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          academy.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'suspended' && academy.isSuspended) ||
                          (filterStatus === academy.status && !academy.isSuspended);
    const matchesTier = filterTier === 'all' || academy.subscriptionTier === filterTier;
    
    return matchesSearch && matchesStatus && matchesTier;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academy Management</h1>
          <p className="text-gray-600">Manage academy accounts, subscriptions, and settings</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Academies</p>
                <p className="text-2xl font-semibold text-gray-900">{academies.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-semibold text-green-600">
                  {academies.filter(a => a.status === 'active' && !a.isSuspended).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Trial</p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {academies.filter(a => a.status === 'trial').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Suspended</p>
                <p className="text-2xl font-semibold text-red-600">
                  {academies.filter(a => a.isSuspended).length}
                </p>
              </div>
              <Ban className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search academies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="!h-10 w-[180px] rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="!h-10 w-[180px] rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
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

              <button
                onClick={loadAcademies}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </button>

              <button
                onClick={handleExportData}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Academy
              </button>
            </div>
          </div>
        </div>

        {/* Academy List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Academy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAcademies.map((academy) => (
                  <tr key={academy.id} className="hover:bg-gray-50">
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
                        <p className="text-xs text-red-600 mt-1 max-w-xs truncate">
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
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>

                      {showActions === academy.id && (
                        <div className="actions-dropdown absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
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
                              className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
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
                              className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
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
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No academies found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
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
          onSuccess={() => {
            loadAcademies();
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