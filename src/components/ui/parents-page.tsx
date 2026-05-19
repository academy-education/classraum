"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useListPageShortcuts } from '@/hooks/useListPageShortcuts'
import { SearchKbdHint } from '@/components/ui/search-kbd-hint'
import { supabase } from '@/lib/supabase'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Search,
  MoreHorizontal,
  X,
  UserPlus,
  Users,
  CheckCircle,
  XCircle,
  Home,
  Baby,
  UserX,
  UserCheck,
  Mail,
  Grid3X3,
  Rows3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DashboardCard, BulkActionBar, TableCheckbox } from '@/components/ui/dashboard'
import { useTranslation } from '@/hooks/useTranslation'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { useToast } from '@/hooks/use-toast'
import { showSuccessToast, showErrorToast } from '@/stores'
import { clearCachesOnRefresh, markRefreshHandled } from '@/utils/cacheRefresh'
import { Skeleton } from '@/components/ui/skeleton'

import { invalidateParentsCache } from '@/lib/cache'
export { invalidateParentsCache }

interface Parent {
  user_id: string
  name: string
  email: string
  phone?: string
  academy_id: string
  active: boolean
  created_at: string
  family_id?: string
  family_name?: string
  children_count?: number
  children_names?: string[]
}

interface Family {
  id: string
  name: string
}

interface ParentsPageProps {
  academyId: string
}

export function ParentsPage({ academyId }: ParentsPageProps) {
  // State management
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const [parents, setParents] = useState<Parent[]>([])
  const [loading, setLoading] = useState(false)
  const [tableLoading, setTableLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table')
  const [selectedParents, setSelectedParents] = useState<Set<string>>(new Set())
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Manager keyboard shortcuts: `/` → search, `Esc` → clear selection.
  useListPageShortcuts({
    searchInputRef,
    onEscape: selectedParents.size > 0
      ? () => setSelectedParents(new Set())
      : undefined,
  })
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showStatusFilter, setShowStatusFilter] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const dropdownButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [inactiveCount, setInactiveCount] = useState(0)
  const itemsPerPage = 10

  // Scroll to top when page changes
  useEffect(() => {
    const scrollContainer = document.querySelector('main .overflow-y-auto')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentPage])

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showViewFamilyModal, setShowViewFamilyModal] = useState(false)
  const [showViewChildrenModal, setShowViewChildrenModal] = useState(false)
  const [familyModalLoading, setFamilyModalLoading] = useState(false)
  const [childrenModalLoading, setChildrenModalLoading] = useState(false)
  const [parentToDelete, setParentToDelete] = useState<Parent | null>(null)
  const [viewingParent, setViewingParent] = useState<Parent | null>(null)
  const [parentFamily, setParentFamily] = useState<{ family_id: string; family_name: string } | null>(null)
  const [parentChildren, setParentChildren] = useState<{ name: string; email: string; school_name?: string; classroom_names: string[]; students: { school_name: string; active: boolean } }[]>([])

  // Form states
  const [, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    family_id: ''
  })
  const [, setFormErrors] = useState<{ [key: string]: string }>({})
  // const [, setSubmitting] = useState(false)

  // Available families for assignment  
  const [, setFamilies] = useState<Family[]>([])

  // Refs
  const statusFilterRef = useRef<HTMLDivElement>(null)

  // Fetch parents
  const fetchParents = useCallback(async () => {
    if (!academyId) return

    // PERFORMANCE: Check cache first (2-minute TTL for parents)
    const cacheKey = `parents-${academyId}-page${currentPage}-${statusFilter}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cachedTimestamp) {
      const cacheValidFor = 2 * 60 * 1000 // 2 minutes TTL
      const timeDiff = Date.now() - parseInt(cachedTimestamp)

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        setParents(parsed.parents)
        setTotalCount(parsed.totalCount || 0)
        setActiveCount(parsed.activeCount || 0)
        setInactiveCount(parsed.inactiveCount || 0)
        setLoading(false)
        setTableLoading(false)
        return parsed.parents
      }
    }

    try {
      // Calculate pagination range
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      // Build the base query with status filter
      let parentsQuery = supabase
        .from('parents')
        .select('user_id, phone, academy_id, active, created_at', { count: 'exact' })
        .eq('academy_id', academyId)

      // Apply status filter at database level
      if (statusFilter === 'active') {
        parentsQuery = parentsQuery.eq('active', true)
      } else if (statusFilter === 'inactive') {
        parentsQuery = parentsQuery.eq('active', false)
      }

      parentsQuery = parentsQuery
        .order('created_at', { ascending: false })
        .range(from, to)

      // Fetch counts in parallel with main query
      const [parentsResult, activeCountResult, inactiveCountResult] = await Promise.all([
        parentsQuery,
        // Count active parents
        supabase
          .from('parents')
          .select('*', { count: 'exact', head: true })
          .eq('academy_id', academyId)
          .eq('active', true),
        // Count inactive parents
        supabase
          .from('parents')
          .select('*', { count: 'exact', head: true })
          .eq('academy_id', academyId)
          .eq('active', false)
      ])

      const { data: parentsData, error: parentsError, count } = parentsResult
      const activeCount = activeCountResult.count || 0
      const inactiveCount = inactiveCountResult.count || 0
      setTotalCount(activeCount + inactiveCount)
      setActiveCount(activeCount)
      setInactiveCount(inactiveCount)

      if (parentsError) throw parentsError
      
      if (!parentsData || parentsData.length === 0) {
        setParents([])
        setLoading(false)
        setTableLoading(false)
        return
      }

      // Get user details for parents
      const parentIds = parentsData.map(p => p.user_id)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', parentIds)
      
      if (usersError) throw usersError

      // Get family information and children for each parent
      const familyData: { [key: string]: { family_id: string; family_name: string } } = {}
      const childrenData: { [key: string]: { count: number; names: string[] } } = {}
      
      if (parentIds.length > 0) {
        // Get family memberships
        const { data: familyMembers, error: familyError } = await supabase
          .from('family_members')
          .select('user_id, family_id')
          .in('user_id', parentIds)

        if (!familyError && familyMembers && familyMembers.length > 0) {
          // Get family details
          const familyIds = [...new Set(familyMembers.map(fm => fm.family_id))]
          const { data: familiesData, error: familiesError } = await supabase
            .from('families')
            .select('id, name')
            .in('id', familyIds)
          
          if (!familiesError && familiesData) {
            const familiesMap = Object.fromEntries(familiesData.map(f => [f.id, f]))
            
            familyMembers.forEach(member => {
              const family = familiesMap[member.family_id]
              familyData[member.user_id] = {
                family_id: family?.id || member.family_id,
                family_name: family?.name || `Family ${member.family_id.slice(0, 8)}`
              }
            })
          }
        }

        // Get children for all parents in a single batch query
        const familyIds = Object.values(familyData).map(f => f.family_id).filter(Boolean)
        if (familyIds.length > 0) {
          // Get family members (children)
          const { data: familyMembersChildren, error: childrenError } = await supabase
            .from('family_members')
            .select('user_id, family_id, role')
            .in('family_id', familyIds)
          
          if (!childrenError && familyMembersChildren && familyMembersChildren.length > 0) {
            // Get user details for family members
            const memberUserIds = familyMembersChildren.map(fm => fm.user_id)
            const { data: memberUsersData, error: memberUsersError } = await supabase
              .from('users')
              .select('id, name, role')
              .in('id', memberUserIds)
              .eq('role', 'student')

            if (!memberUsersError && memberUsersData) {
              // Create user map for students only
              const studentUsersMap = Object.fromEntries(memberUsersData.map(u => [u.id, u]))
              
              // Group children by family_id
              const childrenByFamily: { [familyId: string]: { name: string }[] } = {}
              familyMembersChildren.forEach(member => {
                const user = studentUsersMap[member.user_id]
                if (user && user.role === 'student') {
                  if (!childrenByFamily[member.family_id]) {
                    childrenByFamily[member.family_id] = []
                  }
                  childrenByFamily[member.family_id].push({ name: user.name })
                }
              })

              // Map children to parents based on family membership
              parentIds.forEach(parentId => {
                const parentFamilyId = familyData[parentId]?.family_id
                if (parentFamilyId && childrenByFamily[parentFamilyId]) {
                  childrenData[parentId] = {
                    count: childrenByFamily[parentFamilyId].length,
                    names: childrenByFamily[parentFamilyId].map(child => child.name)
                  }
                }
              })
            }
          }
        }
      }

      // Map parents with user data
      const userMap = Object.fromEntries((usersData || []).map(u => [u.id, u]))
      const mappedParents = parentsData.map(parent => ({
        user_id: parent.user_id,
        name: userMap[parent.user_id]?.name || '',
        email: userMap[parent.user_id]?.email || '',
        phone: parent.phone,
        academy_id: parent.academy_id,
        active: parent.active,
        created_at: parent.created_at,
        family_id: familyData[parent.user_id]?.family_id || '',
        family_name: familyData[parent.user_id]?.family_name || '',
        children_count: childrenData[parent.user_id]?.count || 0,
        children_names: childrenData[parent.user_id]?.names || []
      }))

      setParents(mappedParents)

      // PERFORMANCE: Cache the results
      try {
        const dataToCache = {
          parents: mappedParents,
          totalCount: count || 0,
          activeCount: activeCountResult.count || 0,
          inactiveCount: inactiveCountResult.count || 0
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache parents:', cacheError)
      }
    } catch (error) {
      console.error('Error fetching parents:', error)
      toast({ title: t('parents.errorLoadingParents') as string, description: (error as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
        setTableLoading(false)
    }
  }, [academyId, t, currentPage, itemsPerPage, statusFilter])

  // Fetch families for assignment
  const fetchFamilies = useCallback(async () => {
    if (!academyId) return
    
    try {
      const { data, error } = await supabase
        .from('families')
        .select('id, academy_id, created_at')
        .eq('academy_id', academyId)
        .order('created_at')

      if (error) throw error
      
      const familiesData = data?.map(family => ({
        id: family.id,
        name: `Family ${family.id.slice(0, 8)}`
      })) || []
      
      setFamilies(familiesData)
    } catch (error) {
      toast({ title: t('parents.errorFetchingFamilies') as string, description: (error as Error).message, variant: 'destructive' })
    }
  }, [academyId, t])

  useEffect(() => {
    if (!academyId) return

    // Check if page was refreshed - clear caches to get fresh data
    const wasRefreshed = clearCachesOnRefresh(academyId)
    if (wasRefreshed) {
      markRefreshHandled()
    }

    // Check cache SYNCHRONOUSLY before setting loading state
    const cacheKey = `parents-${academyId}-page${currentPage}-${statusFilter}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cacheTimestamp) {
      const timeDiff = Date.now() - parseInt(cacheTimestamp)
      const cacheValidFor = 2 * 60 * 1000 // 2 minutes

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        setParents(parsed.parents)
        setTotalCount(parsed.totalCount || 0)
        setActiveCount(parsed.activeCount || 0)
        setInactiveCount(parsed.inactiveCount || 0)
        setLoading(false)
        setTableLoading(false)
        setInitialized(true)
        fetchFamilies() // Still load families in background
        return // Skip fetchParents - we have cached data
      }
    }

    // Cache miss - show loading and fetch data
    if (!simpleTabDetection.isTrueTabReturn()) {
      if (!initialized) {
        // Initial load - show full page skeleton
        setLoading(true)
      } else {
        // Filter/page change - only show table loading
        setTableLoading(true)
      }
    }
    setInitialized(true)
    fetchParents()
    fetchFamilies()
  }, [academyId, currentPage, statusFilter, fetchParents, fetchFamilies])

  // Filter and sort parents (status is already filtered at database level)
  const filteredParents = useMemo(() => parents.filter(parent => {
    // Only apply search filter client-side (status already filtered by database)
    if (!searchQuery) return true

    const matchesSearch = parent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         parent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (parent.phone && parent.phone.includes(searchQuery)) ||
                         (parent.family_name && parent.family_name.toLowerCase().includes(searchQuery.toLowerCase()))

    return matchesSearch
  }).sort((a, b) => {
    if (!sortField) return 0
    
    let aVal: string | number, bVal: string | number
    switch (sortField) {
      case 'name':
        aVal = a.name
        bVal = b.name
        break
      case 'email':
        aVal = a.email
        bVal = b.email
        break
      case 'phone':
        aVal = a.phone || ''
        bVal = b.phone || ''
        break
      case 'family':
        aVal = a.family_name || ''
        bVal = b.family_name || ''
        break
      case 'children':
        aVal = a.children_count || 0
        bVal = b.children_count || 0
        break
      case 'status':
        aVal = a.active ? 'active' : 'inactive'
        bVal = b.active ? 'active' : 'inactive'
        break
      case 'created_at':
        aVal = new Date(a.created_at).getTime()
        bVal = new Date(b.created_at).getTime()
        break
      default:
        return 0
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  }), [parents, searchQuery, sortField, sortDirection])

  // Calculate effective count for pagination
  const effectiveTotalCount = searchQuery
    ? filteredParents.length // Client-side filtered count when searching
    : statusFilter === 'active'
      ? activeCount
      : statusFilter === 'inactive'
        ? inactiveCount
        : totalCount // Use database counts when only status filter is active

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Render sort icon
  const renderSortIcon = (field: string) => {
    const isActiveField = sortField === field
    const isAscending = isActiveField && sortDirection === 'asc'
    const isDescending = isActiveField && sortDirection === 'desc'
    
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 9l4-4 4 4" 
          stroke={isAscending ? '#2885e8' : 'currentColor'}
          className={isAscending ? '' : 'text-gray-400'}
        />
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 15l4 4 4-4" 
          stroke={isDescending ? '#2885e8' : 'currentColor'}
          className={isDescending ? '' : 'text-gray-400'}
        />
      </svg>
    )
  }

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedParents(new Set(filteredParents.map(p => p.user_id)))
    } else {
      setSelectedParents(new Set())
    }
  }

  const handleSelectParent = (parentId: string, checked: boolean) => {
    const newSelected = new Set(selectedParents)
    if (checked) {
      newSelected.add(parentId)
    } else {
      newSelected.delete(parentId)
    }
    setSelectedParents(newSelected)
  }

  // CRUD Operations
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      family_id: ''
    })
    setFormErrors({})
  }
  
  // Use functions to avoid unused warnings

  // const validateForm = () => {
  //   const errors: { [key: string]: string } = {}
  //   
  //   if (!formData.name.trim()) {
  //     errors.name = t('validation.nameRequired')
  //   }
  //   
  //   if (!formData.email.trim()) {
  //     errors.email = t('validation.emailRequired')
  //   } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
  //     errors.email = t('validation.invalidEmail')
  //   }
  //   
  //   setFormErrors(errors)
  //   return Object.keys(errors).length === 0
  // }




  const handleViewFamilyClick = async (parent: Parent) => {
    if (!parent.family_id) {
      toast({ title: t('parents.parentNotAssignedToFamily') as string, variant: 'destructive' })
      setDropdownOpen(null)
      return
    }

    // Open modal immediately with loading skeleton
    setViewingParent(parent)
    setParentFamily(null)
    setFamilyModalLoading(true)
    setShowViewFamilyModal(true)
    setDropdownOpen(null)

    try {
      // Get family details and members in parallel
      const [familyResult, membersResult] = await Promise.all([
        supabase.from('families').select('id, name, created_at').eq('id', parent.family_id).single(),
        supabase.from('family_members').select('user_id, role').eq('family_id', parent.family_id)
      ])

      if (familyResult.error) throw familyResult.error
      if (membersResult.error) throw membersResult.error

      if (!membersResult.data || membersResult.data.length === 0) {
        setParentFamily(null)
        return
      }

      const memberIds = membersResult.data.map(member => member.user_id)

      // Fetch user details and all phone numbers in parallel
      const [memberUsersResult, parentPhonesResult, studentPhonesResult, teacherPhonesResult] = await Promise.all([
        supabase.from('users').select('id, name, email, role').in('id', memberIds),
        supabase.from('parents').select('user_id, phone').in('user_id', memberIds),
        supabase.from('students').select('user_id, phone').in('user_id', memberIds),
        supabase.from('teachers').select('user_id, phone').in('user_id', memberIds)
      ])

      if (memberUsersResult.error) throw memberUsersResult.error

      // Build phone map from all role tables
      const phoneMap: { [key: string]: string | null } = {}
      parentPhonesResult.data?.forEach((p: { user_id: string; phone?: string }) => { phoneMap[p.user_id] = p.phone || null })
      studentPhonesResult.data?.forEach((s: { user_id: string; phone?: string }) => { phoneMap[s.user_id] = s.phone || null })
      teacherPhonesResult.data?.forEach((t: { user_id: string; phone?: string }) => { phoneMap[t.user_id] = t.phone || null })

      // Map family members with user data and phone
      const userMap = Object.fromEntries((memberUsersResult.data || []).map(u => [u.id, u]))
      const enrichedFamilyMembers = membersResult.data.map(member => {
        const user = userMap[member.user_id]
        return {
          user_id: member.user_id,
          role: member.role,
          users: {
            id: user?.id || member.user_id,
            name: user?.name || String(t('common.fallbacks.unknown')),
            email: user?.email || '',
            role: user?.role || member.role
          },
          phone: phoneMap[member.user_id] || null
        }
      })

      setParentFamily({ ...familyResult.data, family_members: enrichedFamilyMembers } as unknown as { family_id: string; family_name: string })
    } catch (error: unknown) {
      showErrorToast(t('parents.errorLoadingFamily') as string, (error as Error).message)
      setShowViewFamilyModal(false)
    } finally {
      setFamilyModalLoading(false)
    }
  }

  const handleViewChildrenClick = async (parent: Parent) => {
    if (!parent.family_id || parent.children_count === 0) {
      toast({ title: t('parents.parentHasNoChildren') as string, variant: 'destructive' })
      setDropdownOpen(null)
      return
    }

    // Open modal immediately with loading skeleton
    setViewingParent(parent)
    setParentChildren([])
    setChildrenModalLoading(true)
    setShowViewChildrenModal(true)
    setDropdownOpen(null)

    try {
      // Get all children for this parent's family
      const { data: familyMembersData, error: membersError } = await supabase
        .from('family_members')
        .select('user_id, role')
        .eq('family_id', parent.family_id)

      if (membersError) throw membersError

      if (!familyMembersData || familyMembersData.length === 0) {
        setParentChildren([])
        return
      }

      // Get user details for family members (students only)
      const memberIds = familyMembersData.map(fm => fm.user_id)
      const { data: memberUsersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .in('id', memberIds)
        .eq('role', 'student')

      if (usersError) throw usersError

      const studentIds = (memberUsersData || []).map(u => u.id)

      if (studentIds.length > 0) {
        // Fetch student details and classroom enrollments in parallel
        const [studentsResult, classroomResult] = await Promise.all([
          supabase.from('students').select('user_id, school_name, active').in('user_id', studentIds),
          supabase.from('classroom_students').select('student_id, classrooms(name)').in('student_id', studentIds)
        ])

        const studentsData: { [key: string]: { school_name: string; active: boolean } } = {}
        studentsResult.data?.forEach(student => {
          studentsData[student.user_id] = { school_name: student.school_name, active: student.active }
        })

        const classroomNames: { [key: string]: string[] } = {}
        classroomResult.data?.forEach((row: any) => {
          if (!classroomNames[row.student_id]) classroomNames[row.student_id] = []
          if (row.classrooms?.name) classroomNames[row.student_id].push(row.classrooms.name)
        })

        const enrichedChildren = memberUsersData?.map(child => ({
          ...child,
          students: studentsData[child.id] || { school_name: null, active: false },
          classroom_names: classroomNames[child.id] || []
        })) || []

        setParentChildren(enrichedChildren as { name: string; email: string; school_name?: string; classroom_names: string[]; students: { school_name: string; active: boolean } }[])
      } else {
        setParentChildren([])
      }
    } catch (error: unknown) {
      showErrorToast(t('parents.errorLoadingChildren') as string, (error as Error).message)
      setShowViewChildrenModal(false)
    } finally {
      setChildrenModalLoading(false)
    }
  }

  const handleDeleteClick = (parent: Parent) => {
    setParentToDelete(parent)
    setShowDeleteModal(true)
    setDropdownOpen(null)
  }

  const handleActivateClick = (parent: Parent) => {
    setParentToDelete(parent)
    setShowDeleteModal(true)
    setDropdownOpen(null)
  }

  const handleDeleteConfirm = async () => {
    if (!parentToDelete) return
    
    const newStatus = !parentToDelete.active
    
    try {
      const { error } = await supabase
        .from('parents')
        .update({ active: newStatus })
        .eq('user_id', parentToDelete.user_id)
        .select()

      if (error) throw error

      setShowDeleteModal(false)
      setParentToDelete(null)
      invalidateParentsCache(academyId)
      fetchParents()
      showSuccessToast(t(newStatus ? 'success.activated' : 'success.deactivated', {
        item: `${parentToDelete.name} (${t('parents.parent')})`
      }) as string)
    } catch (error: unknown) {
      showErrorToast(t(newStatus ? 'alerts.errorActivating' : 'alerts.errorDeactivating', { resource: String(t('parents.parent')), error: (error as Error).message }) as string)
    }
  }

  const handleBulkStatusUpdate = async (active: boolean) => {
    if (selectedParents.size === 0) return
    
    try {
      const { error } = await supabase
        .from('parents')
        .update({ active })
        .in('user_id', Array.from(selectedParents))

      if (error) throw error

      setSelectedParents(new Set())
      invalidateParentsCache(academyId)
      fetchParents()
      showSuccessToast(`Parents ${active ? 'activated' : 'deactivated'} successfully!`)
    } catch (error: unknown) {
      console.error('Error updating parents:', error)
      showErrorToast(t('parents.errorUpdatingParents') + ': ' + (error as Error).message)
    }
  }

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setShowStatusFilter(false)
      }
      
      // Close dropdown when clicking outside
      if (dropdownOpen) {
        const target = event.target as Node
        // Don't close if clicking inside a dropdown
        if (target && (target as Element).closest('.dropdown-menu')) {
          return
        }
        
        // Don't close if clicking on the dropdown button itself
        const clickedButton = Object.values(dropdownButtonRefs.current).some(
          ref => ref && ref.contains(target)
        )
        if (clickedButton) {
          return
        }
        
        setDropdownOpen(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // Loading skeleton
  const TableSkeleton = () => (
    <div className="animate-pulse">
      <div className="overflow-x-auto min-h-[640px] flex flex-col">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {[...Array(6)].map((_, i) => (
                <th key={i} className="text-left p-4">
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(8)].map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-4"></div>
                </td>
                <td className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </td>
                <td className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </td>
                <td className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-4"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t("eyebrows.parents")}</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{t("parents.title")}</h1>
            <p className="text-gray-500">{t("parents.description")}</p>
          </div>
          <div className="flex items-center gap-3">
          </div>
        </div>
        
        <div className="relative mb-4 max-w-md animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
        </div>
        
        <Card className="overflow-hidden">
          <TableSkeleton />
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t("eyebrows.parents")}</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{t("parents.title")}</h1>
          <p className="text-gray-500">{t("parents.description")}</p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-white">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className={`h-9 px-3 ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'}`}
            title={String(t("common.tableView"))}
          >
            <Rows3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setViewMode('card'); setSelectedParents(new Set()) }}
            className={`h-9 px-3 ${viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'}`}
            title={String(t("common.cardView"))}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder={String(t("parents.searchPlaceholder"))}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-12 pr-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
        />
        <SearchKbdHint />
      </div>

      {/* Bulk Action Bar — uses shared BulkActionBar primitive for visual consistency
          with the other refactored pages. */}
      {selectedParents.size > 0 && (
        <div className="mb-4">
          <BulkActionBar
            selectedCount={selectedParents.size}
            onClear={() => setSelectedParents(new Set())}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkStatusUpdate(true)}
            >
              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
              {t("parents.makeActive")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkStatusUpdate(false)}
              className="text-rose-600 ring-rose-200 hover:bg-rose-50 hover:ring-rose-300"
            >
              <UserX className="w-3.5 h-3.5 mr-1.5" />
              {t("parents.makeInactive")}
            </Button>
          </BulkActionBar>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="inline-flex items-center bg-white rounded-lg border border-gray-200 mb-4 p-1">
        <button
          onClick={() => {
            setStatusFilter('all')
            setCurrentPage(1)
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            statusFilter === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t("common.all")} ({totalCount})
        </button>
        <button
          onClick={() => {
            setStatusFilter('active')
            setCurrentPage(1)
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ml-1 ${
            statusFilter === 'active'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t("common.active")} ({activeCount})
        </button>
        <button
          onClick={() => {
            setStatusFilter('inactive')
            setCurrentPage(1)
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ml-1 ${
            statusFilter === 'inactive'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t("common.inactive")} ({inactiveCount})
        </button>
      </div>

      {/* Parents Content — card or table */}
      {viewMode === 'card' ? (
        tableLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="!gap-0 !py-0 overflow-hidden flex flex-col h-full">
                <div className="h-1 w-full bg-gray-200" />
                <div className="p-4 sm:p-5 flex flex-col flex-1 animate-pulse">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="h-3 w-16 bg-gray-200 rounded" />
                      <div className="h-5 w-3/4 bg-gray-200 rounded" />
                      <div className="h-3 w-1/2 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 my-3 py-3 border-y border-gray-100">
                    <div className="space-y-1.5"><div className="h-2 w-12 bg-gray-200 rounded" /><div className="h-4 w-10 bg-gray-200 rounded" /></div>
                    <div className="space-y-1.5"><div className="h-2 w-12 bg-gray-200 rounded" /><div className="h-4 w-10 bg-gray-200 rounded" /></div>
                    <div className="space-y-1.5"><div className="h-2 w-12 bg-gray-200 rounded" /><div className="h-4 w-10 bg-gray-200 rounded" /></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredParents.length === 0 ? (
          <Card>
            <EmptyState
              icon={Users}
              title={String(t("parents.noParentsFound"))}
              description={String(t("common.tryAdjustingSearch"))}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredParents.map((parent) => (
              <DashboardCard
                key={parent.user_id}
                paused={!parent.active}
                accentColor={parent.active ? '#10b981' : '#9ca3af'}
                statusLabel={parent.active ? t('common.active') : t('common.inactive')}
                statusToneClass={parent.active ? 'text-emerald-600' : 'text-gray-500'}
                title={parent.name}
                subtitle={
                  <>
                    <Mail className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                    <span className="truncate">{parent.email}</span>
                  </>
                }
                metrics={[
                  {
                    label: t('common.phone') as string,
                    value: parent.phone && parent.phone.trim() ? parent.phone : '—',
                  },
                  {
                    label: t('parents.family') as string,
                    value: parent.family_name && parent.family_name.trim() ? parent.family_name : '—',
                  },
                  {
                    label: t('parents.children') as string,
                    value: String(parent.children_count || 0),
                  },
                ]}
                footerActions={
                  <>
                    <Button
                      variant="outline"
                      className="w-full text-xs sm:text-sm h-9"
                      onClick={() => handleViewFamilyClick(parent)}
                    >
                      <Home className="w-3.5 h-3.5 mr-1.5" />
                      {t("parents.viewFamily")}
                    </Button>
                    <Button
                      className="w-full text-xs sm:text-sm h-9"
                      variant={parent.active ? 'outline' : 'default'}
                      onClick={() => parent.active ? handleDeleteClick(parent) : handleActivateClick(parent)}
                    >
                      {parent.active ? (
                        <><UserX className="w-3.5 h-3.5 mr-1.5" />{t("parents.makeInactive")}</>
                      ) : (
                        <><UserCheck className="w-3.5 h-3.5 mr-1.5" />{t("parents.makeActive")}</>
                      )}
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        )
      ) : (
      <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
        {tableLoading ? (
          <TableSkeleton />
        ) : (
        <>
        <div className="overflow-x-auto min-h-[640px] flex flex-col">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="text-left p-3 sm:p-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 whitespace-nowrap w-10">
                  {(() => {
                    const allSelected = filteredParents.length > 0 && selectedParents.size === filteredParents.length
                    const someSelected = selectedParents.size > 0 && selectedParents.size < filteredParents.length
                    return (
                      <TableCheckbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        ariaLabel={String(t('common.selectAll'))}
                        onChange={() => handleSelectAll(!allSelected)}
                      />
                    )
                  })()}
                </th>
                <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 ">
                      {t("parents.parent")}
                      {renderSortIcon('name')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('phone')} className="flex items-center gap-1 ">
                      {t("parents.phone")}
                      {renderSortIcon('phone')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[100px]">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('family')} className="flex items-center gap-1 ">
                      {t("parents.family")}
                      {renderSortIcon('family')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[100px]">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('children')} className="flex items-center gap-1 ">
                      {t("parents.children")}
                      {renderSortIcon('children')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[100px]">
                  <div className="flex items-center gap-2 relative">
                    {t("parents.status")}
                    <div className="relative z-20" ref={statusFilterRef}>
                      <button
                        onClick={() => setShowStatusFilter(!showStatusFilter)}
                        className={`flex items-center ${
                          statusFilter !== 'all' ? 'text-primary' : 'text-gray-400 '
                        }`}
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                      </button>
                      
                      {showStatusFilter && (
                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-50 normal-case tracking-normal font-normal">
                          <button
                            onClick={() => {
                              setStatusFilter('all')
                              setShowStatusFilter(false)
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                          >
                            {t("parents.all")}
                          </button>
                          <button
                            onClick={() => {
                              setStatusFilter('active')
                              setShowStatusFilter(false)
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'active' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                          >
                            {t("parents.active")}
                          </button>
                          <button
                            onClick={() => {
                              setStatusFilter('inactive')
                              setShowStatusFilter(false)
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'inactive' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                          >
                            {t("parents.inactive")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
                <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredParents.length > 0 ? filteredParents.map((parent) => (
                <tr key={parent.user_id} className={cn(
                  'transition-colors',
                  selectedParents.has(parent.user_id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-gray-50'
                )}>
                  <td className="p-3 sm:p-4">
                    <TableCheckbox
                      checked={selectedParents.has(parent.user_id)}
                      ariaLabel={String(t('common.selectRow'))}
                      onChange={() => handleSelectParent(parent.user_id, !selectedParents.has(parent.user_id))}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {parent.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{parent.name}</div>
                        <div className="text-xs text-gray-500 truncate">{parent.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4">
                    {parent.phone ? (
                      <div className="text-xs sm:text-sm text-gray-600">
                        {parent.phone}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs sm:text-sm">—</span>
                    )}
                  </td>
                  <td className="p-3 sm:p-4">
                    {parent.family_name ? (
                      <div className="text-xs sm:text-sm">
                        <span className="text-blue-600">{parent.family_name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs sm:text-sm">—</span>
                    )}
                  </td>
                  <td className="p-3 sm:p-4">
                    {(parent.children_count || 0) > 0 ? (
                      <span className="text-xs sm:text-sm text-gray-600">
                        {language === 'korean'
                          ? `${parent.children_count}개 자녀`
                          : `${parent.children_count} ${parent.children_count === 1 ? 'Child' : 'Children'}`
                        }
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs sm:text-sm">—</span>
                    )}
                  </td>
                  <td className="p-3 sm:p-4">
                    <div className="flex items-center gap-1 sm:gap-2">
                      {parent.active ? (
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer" />
                      ) : (
                        <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 hover:text-gray-700 transition-colors cursor-pointer" />
                      )}
                      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                        parent.active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-50 text-gray-700'
                      }`}>
                        {parent.active ? t('parents.active') : t('parents.inactive')}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4">
                    <div className="relative">
                      <Button
                        ref={(el) => { dropdownButtonRefs.current[parent.user_id] = el }}
                        variant="ghost"
                        size="sm"
                        onClick={() => setDropdownOpen(dropdownOpen === parent.user_id ? null : parent.user_id)}
                        className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                      >
                        <MoreHorizontal className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                      </Button>
                      
                      {dropdownOpen === parent.user_id && (
                        <div 
                          className="dropdown-menu absolute right-0 top-8 z-50 bg-white rounded-lg border border-gray-300 shadow-xl py-1 min-w-[160px]"
                          style={{ zIndex: 9999 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleViewFamilyClick(parent)
                            }}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                          >
                            <Home className="w-4 h-4" />
                            {t("parents.viewFamily")}
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleViewChildrenClick(parent)
                            }}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                          >
                            <Baby className="w-4 h-4" />
                            {t("parents.viewChildren")}
                          </button>
                          {parent.active ? (
                            <button
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-rose-600"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteClick(parent)
                              }}
                            >
                              <UserX className="w-4 h-4" />
                              {t("parents.makeInactive")}
                            </button>
                          ) : (
                            <button
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-emerald-600"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleActivateClick(parent)
                              }}
                            >
                              <UserCheck className="w-4 h-4" />
                              {t("parents.makeActive")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={UserPlus}
                      title={String(t("parents.noParentsFound"))}
                      description={searchQuery ? String(t("parents.tryAdjustingSearch")) : String(t("parents.getStartedFirstParent"))}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {effectiveTotalCount > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
              >
                {t("parents.pagination.previous")}
              </Button>
              <Button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(effectiveTotalCount / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(effectiveTotalCount / itemsPerPage)}
                variant="outline"
              >
                {t("parents.pagination.next")}
              </Button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {t("parents.pagination.showing")}
                  <span className="font-medium"> {((currentPage - 1) * itemsPerPage) + 1} </span>
                  {t("parents.pagination.to")}
                  <span className="font-medium"> {Math.min(currentPage * itemsPerPage, effectiveTotalCount)} </span>
                  {t("parents.pagination.of")}
                  <span className="font-medium"> {effectiveTotalCount} </span>
                  {t("parents.pagination.parents")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  {t("parents.pagination.previous")}
                </Button>
                <Button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(effectiveTotalCount / itemsPerPage), p + 1))}
                  disabled={currentPage >= Math.ceil(effectiveTotalCount / itemsPerPage)}
                  variant="outline"
                >
                  {t("parents.pagination.next")}
                </Button>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>
      )}



      {/* Delete Confirmation Modal */}
      {parentToDelete && (
        <ModalShell.Confirm
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setParentToDelete(null)
          }}
          onConfirm={handleDeleteConfirm}
          title={String(parentToDelete.active ? t('parents.makeInactiveParent') : t('parents.makeActiveParent'))}
          message={parentToDelete.active
            ? `${t('parents.makeInactiveConfirm', { name: parentToDelete.name })} ${t('parents.dataPreserved')}`
            : `${t('parents.makeActiveConfirm', { name: parentToDelete.name })} ${t('parents.regainAccess')}`}
          variant={parentToDelete.active ? 'danger' : 'info'}
          confirmLabel={String(parentToDelete.active ? t('parents.makeInactive') : t('parents.makeActive'))}
          cancelLabel={String(t('common.cancel'))}
        />
      )}

      {/* View Family Modal */}
      <ModalShell
        isOpen={showViewFamilyModal}
        onClose={() => {
          setShowViewFamilyModal(false)
          setViewingParent(null)
          setParentFamily(null)
        }}
        size="3xl"
        headerSlot={
          familyModalLoading ? (
            <Skeleton className="h-6 w-48" />
          ) : (
            <h2 className="text-xl font-semibold tracking-tight text-gray-900 truncate">
              {t("parents.familyMembers")} - {parentFamily ? String((parentFamily as Record<string, unknown>).name) || `${t('parents.family')} ${String(((parentFamily as Record<string, unknown>).id as string)?.slice(0, 8))}` : viewingParent?.name}
            </h2>
          )
        }
        footer={
          <ModalShell.Footer>
            <Button
              variant="outline"
              onClick={() => {
                setShowViewFamilyModal(false)
                setViewingParent(null)
                setParentFamily(null)
              }}
            >
              {t("common.close")}
            </Button>
          </ModalShell.Footer>
        }
      >
            {familyModalLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-32" />
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : parentFamily && (parentFamily as Record<string, unknown>).family_members && Array.isArray((parentFamily as Record<string, unknown>).family_members) && ((parentFamily as Record<string, unknown>).family_members as unknown[]).length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    {t('common.familyMembersCount', {
                      count: ((parentFamily as Record<string, unknown>).family_members as unknown[]).length
                    })}
                  </p>
                  <div className="grid gap-4">
                    {((parentFamily as Record<string, unknown>).family_members as Record<string, unknown>[]).map((member: Record<string, unknown>) => (
                      <div key={member.user_id as string} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg mb-2">{((member.users as Record<string, unknown>)?.name as string) || 'N/A'}</h3>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">{t("common.email")}:</span>
                                    <span> {((member.users as Record<string, unknown>)?.email as string) || 'N/A'}</span>
                                  </div>
                                  {(member.phone as string) && (
                                    <div>
                                      <span className="font-medium">{t("common.phone")}:</span>
                                      <span> {member.phone as string}</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium">{t("common.role")}:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ml-1 ${
                                      ((member.users as Record<string, unknown>)?.role as string) === 'parent'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-emerald-50 text-emerald-700'
                                    }`}>
                                      {t(`common.roles.${((member.users as Record<string, unknown>)?.role as string) || 'unknown'}`)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title={String(t("parents.noFamilyMembers"))}
                  description={String(t("parents.familyNoMembersYet"))}
                />
              )}
      </ModalShell>

      {/* View Children Modal */}
      <ModalShell
        isOpen={showViewChildrenModal}
        onClose={() => {
          setShowViewChildrenModal(false)
          setViewingParent(null)
          setParentChildren([])
        }}
        size="3xl"
        title={`${t("parents.children")} - ${viewingParent?.name}`}
        footer={
          <ModalShell.Footer>
            <Button
              variant="outline"
              onClick={() => {
                setShowViewChildrenModal(false)
                setViewingParent(null)
                setParentChildren([])
              }}
            >
              {t("common.close")}
            </Button>
          </ModalShell.Footer>
        }
      >
            {childrenModalLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-24" />
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : parentChildren.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    {language === 'korean'
                      ? `${parentChildren.length}개 자녀`
                      : `${parentChildren.length} ${parentChildren.length === 1 ? 'Child' : 'Children'}`
                    }
                  </p>
                  <div className="grid gap-4">
                    {parentChildren.map((child, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <h3 className="font-semibold text-gray-900 text-lg mb-3">{child.name}</h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">{t("common.email")}:</span>
                            <span> {child.email || 'N/A'}</span>
                          </div>
                          {child.students?.school_name && (
                            <div>
                              <span className="font-medium">{t("parents.school")}:</span>
                              <span> {child.students.school_name}</span>
                            </div>
                          )}
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className="font-medium">{t("parents.classrooms")}:</span>
                            {child.classroom_names && child.classroom_names.length > 0 ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                {child.classroom_names.map((classroom, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-medium">
                                    {classroom}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                {t("parents.noClassrooms")}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-medium">{t("parents.status")}:</span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium ml-1 bg-emerald-50 text-emerald-700">
                              {t('parents.active')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={Baby}
                  title={String(t("parents.noChildrenFound"))}
                  description={String(t("parents.parentNoChildrenYet"))}
                />
              )}
      </ModalShell>
    </div>
  )
}