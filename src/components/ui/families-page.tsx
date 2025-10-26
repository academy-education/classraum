"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  X,
  Users,
  Eye,
  Copy,
  Share,
  Upload
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { showSuccessToast, showErrorToast } from '@/stores'
import { FamilyImportModal } from '@/components/ui/families/FamilyImportModal'

// Cache invalidation function for families
export const invalidateFamiliesCache = (academyId: string) => {
  const keys = Object.keys(sessionStorage)
  let clearedCount = 0

  keys.forEach(key => {
    if (key.startsWith(`families-${academyId}-page`) ||
        key.includes(`families-${academyId}-page`)) {
      sessionStorage.removeItem(key)
      clearedCount++
    }
  })

  console.log(`[Performance] Cleared ${clearedCount} families cache entries`)
}

interface Family {
  id: string
  name?: string
  academy_id: string
  created_at: string
  member_count: number
  signed_up_count?: number
  total_member_count?: number
  members: FamilyMember[]
  parent_count: number
  student_count: number
}

interface FamilyMember {
  id?: string  // family_member id
  user_id: string | null
  name: string
  email: string | null
  phone?: string | null
  role: string
  user_role: 'teacher' | 'student' | 'parent' | 'manager'
}

interface User {
  id: string
  name: string
  email: string
  role: 'teacher' | 'student' | 'parent' | 'manager'
}

interface FamiliesPageProps {
  academyId: string
}

export function FamiliesPage({ academyId }: FamiliesPageProps) {
  // State management
  const { t, language } = useTranslation()
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10

  // Scroll to top when page changes
  useEffect(() => {
    const scrollContainer = document.querySelector('main .overflow-y-auto')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentPage])

  const [selectedFamilies, setSelectedFamilies] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const dropdownButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showInvitationModal, setShowInvitationModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [familyToDelete, setFamilyToDelete] = useState<Family | null>(null)
  const [editingFamily, setEditingFamily] = useState<Family | null>(null)
  const [viewingFamily, setViewingFamily] = useState<Family | null>(null)
  const [createdFamilyId, setCreatedFamilyId] = useState<string | null>(null)

  // Form states
  interface FormMember {
    type: 'existing' | 'manual'
    user_id?: string  // For existing users
    user_name?: string  // For manual members
    email?: string
    phone?: string
    role?: 'student' | 'parent'
  }

  const [formData, setFormData] = useState({
    name: '',
    selectedMembers: [] as FormMember[]
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [showManualMemberForm, setShowManualMemberForm] = useState(false)
  const [manualMemberData, setManualMemberData] = useState({
    user_name: '',
    email: '',
    phone: '',
    role: 'student' as 'student' | 'parent'
  })

  // Available users for family assignment
  const [availableUsers, setAvailableUsers] = useState<User[]>([])

  // Fetch families
  const fetchFamilies = useCallback(async () => {
    if (!academyId) return

    // PERFORMANCE: Check cache first (2-minute TTL for families)
    const cacheKey = `families-${academyId}-page${currentPage}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cachedTimestamp) {
      const cacheValidFor = 2 * 60 * 1000 // 2 minutes TTL
      const timeDiff = Date.now() - parseInt(cachedTimestamp)

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        console.log('✅ Cache hit:', {
          families: parsed.families?.length || 0,
          totalCount: parsed.totalCount || 0,
          page: currentPage
        })
        setFamilies(parsed.families)
        setTotalCount(parsed.totalCount || 0)
        setLoading(false)
        return parsed.families
      } else {
        console.log('⏰ Cache expired, fetching fresh data')
      }
    } else {
      console.log('❌ Cache miss, fetching from database')
    }

    try {
      // Calculate pagination range
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data: familiesData, error: familiesError, count } = await supabase
        .from('families')
        .select('id, name, academy_id, created_at', { count: 'exact' })
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })
        .range(from, to)

      // Update total count
      setTotalCount(count || 0)

      if (familiesError) throw familiesError

      // Get family members for each family (including those without user_id)
      const familyIds = familiesData?.map(f => f.id) || []
      const familyMembers: { [key: string]: FamilyMember[] } = {}

      if (familyIds.length > 0) {
        const { data: membersData, error: membersError } = await supabase
          .from('family_members')
          .select(`
            id,
            user_id,
            family_id,
            role,
            user_name,
            phone,
            email,
            users(
              id,
              name,
              email,
              role
            )
          `)
          .in('family_id', familyIds)

        if (!membersError && membersData) {
          // Get phone numbers for members with user_id from their respective role tables
          const membersWithUserId = membersData.filter((member: { user_id: string | null }) => member.user_id !== null)
          const allMemberIds = membersWithUserId.map((member: { user_id: string }) => member.user_id)
          const phoneMap: { [key: string]: string | null } = {}

          if (allMemberIds.length > 0) {
            // Fetch from parents table
            const { data: parentPhones } = await supabase
              .from('parents')
              .select('user_id, phone')
              .in('user_id', allMemberIds)

            parentPhones?.forEach((p: { user_id: string; phone: string }) => {
              phoneMap[p.user_id] = p.phone
            })

            // Fetch from students table
            const { data: studentPhones } = await supabase
              .from('students')
              .select('user_id, phone')
              .in('user_id', allMemberIds)

            studentPhones?.forEach((s: { user_id: string; phone: string }) => {
              phoneMap[s.user_id] = s.phone
            })

            // Fetch from teachers table
            const { data: teacherPhones } = await supabase
              .from('teachers')
              .select('user_id, phone')
              .in('user_id', allMemberIds)

            teacherPhones?.forEach((t: { user_id: string; phone?: string }) => {
              phoneMap[t.user_id] = t.phone || null
            })
          }

          membersData.forEach((member: Record<string, unknown>) => {
            const typedMember = member as {
              id: string
              family_id: string
              user_id: string | null
              user_name?: string
              phone?: string
              email?: string
              users: { name: string; email: string; role?: string } | null
              role: string
            }

            if (!familyMembers[typedMember.family_id]) {
              familyMembers[typedMember.family_id] = []
            }

            // If user_id exists, use user data, otherwise use pre-registration data
            if (typedMember.user_id && typedMember.users) {
              familyMembers[typedMember.family_id].push({
                id: typedMember.id,
                user_id: typedMember.user_id,
                name: typedMember.users.name,
                email: typedMember.users.email,
                phone: phoneMap[typedMember.user_id] || null,
                role: typedMember.role,
                user_role: (typedMember.users.role as 'student' | 'teacher' | 'manager' | 'parent') || 'parent'
              })
            } else {
              // Pre-registration member (no user_id yet)
              familyMembers[typedMember.family_id].push({
                id: typedMember.id,
                user_id: null,
                name: typedMember.user_name || 'Unknown',
                email: typedMember.email || null,
                phone: typedMember.phone || null,
                role: typedMember.role,
                user_role: typedMember.role as 'student' | 'parent'
              })
            }
          })
        }
      }

      const enrichedFamilies = familiesData?.map(family => {
        const members = familyMembers[family.id] || []
        const parentCount = members.filter(m => m.user_role === 'parent').length
        const studentCount = members.filter(m => m.user_role === 'student').length
        const signedUpCount = members.filter(m => m.user_id !== null).length
        const totalCount = members.length

        return {
          id: family.id,
          name: family.name || `${t('families.family')} ${family.id.slice(0, 8)}`,
          academy_id: family.academy_id,
          created_at: family.created_at,
          member_count: members.length,
          signed_up_count: signedUpCount,
          total_member_count: totalCount,
          members: members,
          parent_count: parentCount,
          student_count: studentCount
        }
      }) || []

      setFamilies(enrichedFamilies)

      // PERFORMANCE: Cache the results
      try {
        const dataToCache = {
          families: enrichedFamilies,
          totalCount: count || 0
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        console.log('[Performance] Families cached for faster future loads')
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache families:', cacheError)
      }
    } catch (error) {
      alert(t('families.errorLoadingFamilies') + ': ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [academyId, t, currentPage, itemsPerPage])

  useEffect(() => {
    if (!academyId) return

    // Check cache SYNCHRONOUSLY before setting loading state
    const cacheKey = `families-${academyId}-page${currentPage}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cacheTimestamp) {
      const timeDiff = Date.now() - parseInt(cacheTimestamp)
      const cacheValidFor = 2 * 60 * 1000 // 2 minutes

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        console.log('✅ [Families useEffect] Using cached data - NO skeleton')
        setFamilies(parsed.families)
        setTotalCount(parsed.totalCount || 0)
        setLoading(false)
        setInitialized(true)
        return // Skip fetchFamilies - we have cached data
      }
    }

    // Cache miss - show loading and fetch data
    console.log('❌ [Families useEffect] Cache miss - showing skeleton')
    setInitialized(true)
    if (!simpleTabDetection.isTrueTabReturn()) {
      setLoading(true)
    }
    fetchFamilies()
  }, [academyId, currentPage, fetchFamilies])

  // Fetch available users for assignment
  const fetchAvailableUsers = useCallback(async (excludeFamilyId?: string) => {
    if (!academyId) return

    try {
      // Get all users in the academy (students and parents)
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          user_id,
          users!inner(
            id,
            name,
            email,
            role
          )
        `)
        .eq('academy_id', academyId)
        .eq('active', true)

      const { data: parentsData, error: parentsError } = await supabase
        .from('parents')
        .select(`
          user_id,
          users!inner(
            id,
            name,
            email,
            role
          )
        `)
        .eq('academy_id', academyId)
        .eq('active', true)

      // Get users already in families within this academy (excluding current family if editing)
      let assignedUsersQuery = supabase
        .from('family_members')
        .select(`
          user_id,
          families!inner(
            academy_id
          )
        `)
        .eq('families.academy_id', academyId)

      // When editing a family, exclude members of that family from the "assigned" list
      if (excludeFamilyId) {
        assignedUsersQuery = assignedUsersQuery.neq('family_id', excludeFamilyId)
      }

      const { data: assignedUsers, error: assignedError } = await assignedUsersQuery

      if (assignedError) {
        console.error('Error fetching assigned users:', assignedError)
      }

      // Create set of user IDs that are already assigned to families
      const assignedUserIds = new Set(
        assignedUsers?.map(au => au.user_id) || []
      )

      let allUsers: User[] = []

      if (!studentsError && studentsData) {
        const students = studentsData
          .filter((s: Record<string, unknown>) => {
            const typedS = s as { users: { id: string } }
            return !assignedUserIds.has(typedS.users.id)
          })
          .map((s: Record<string, unknown>) => {
            const typedS = s as { users: { id: string; name: string; email: string; role: string } }
            return {
              id: typedS.users.id,
              name: typedS.users.name,
              email: typedS.users.email,
              role: typedS.users.role as 'student'
            }
          })
        allUsers = [...allUsers, ...students]
      }

      if (!parentsError && parentsData) {
        const parents = parentsData
          .filter((p: Record<string, unknown>) => {
            const typedP = p as { users: { id: string } }
            return !assignedUserIds.has(typedP.users.id)
          })
          .map((p: Record<string, unknown>) => {
            const typedP = p as { users: { id: string; name: string; email: string; role: string } }
            return {
              id: typedP.users.id,
              name: typedP.users.name,
              email: typedP.users.email,
              role: typedP.users.role as 'parent'
            }
          })
        allUsers = [...allUsers, ...parents]
      }

      setAvailableUsers(allUsers)
    } catch (error) {
      console.error('Error fetching available users:', error)
    }
  }, [academyId])

  useEffect(() => {
    fetchFamilies()
    fetchAvailableUsers()
  }, [fetchFamilies, fetchAvailableUsers])


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  // Filter and sort families
  const filteredFamilies = families.filter(family => {
    const matchesSearch = (family.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         family.members.some(member =>
                           member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase()))
                         )

    return matchesSearch
  }).sort((a, b) => {
    if (!sortField) return 0
    
    let aVal: string | number, bVal: string | number
    switch (sortField) {
      case 'name':
        aVal = a.name || ''
        bVal = b.name || ''
        break
      case 'members':
        aVal = a.member_count
        bVal = b.member_count
        break
      case 'parents':
        aVal = a.parent_count
        bVal = b.parent_count
        break
      case 'students':
        aVal = a.student_count
        bVal = b.student_count
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
  })

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
      setSelectedFamilies(new Set(filteredFamilies.map(f => f.id)))
    } else {
      setSelectedFamilies(new Set())
    }
  }

  const handleSelectFamily = (familyId: string, checked: boolean) => {
    const newSelected = new Set(selectedFamilies)
    if (checked) {
      newSelected.add(familyId)
    } else {
      newSelected.delete(familyId)
    }
    setSelectedFamilies(newSelected)
  }

  // CRUD Operations
  const resetForm = () => {
    setFormData({
      name: '',
      selectedMembers: []
    })
    setFormErrors({})
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    
    if (!formData.name.trim()) {
      errors.name = String(t('families.familyNameRequired'))
    }
    
    // Family members are optional - families can be created without initial members
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddFamily = async () => {
    if (!validateForm()) return
    
    setSubmitting(true)
    try {
      // Create family first
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert({
          name: formData.name.trim(),
          academy_id: academyId
        })
        .select()
        .single()


      if (familyError) throw familyError

      // Add family members (if any)
      if (formData.selectedMembers.length > 0) {
        // Separate existing users and manual members
        const existingUserMembers = formData.selectedMembers.filter(m => m.type === 'existing' && m.user_id)
        const manualMembers = formData.selectedMembers.filter(m => m.type === 'manual')

        // Server-side validation: Check if any selected users are already in families
        if (existingUserMembers.length > 0) {
          const { data: existingMembers, error: checkError } = await supabase
            .from('family_members')
            .select(`
              user_id,
              families!inner(academy_id)
            `)
            .eq('families.academy_id', academyId)
            .in('user_id', existingUserMembers.map(m => m.user_id!))

          if (checkError) throw checkError

          if (existingMembers && existingMembers.length > 0) {
            const conflictUserIds = existingMembers.map(em => em.user_id)
            const conflictUsers = availableUsers.filter(u => conflictUserIds.includes(u.id))
            const userNames = conflictUsers.map(u => u.name).join(', ')
            throw new Error(`The following users are already assigned to other families: ${userNames}`)
          }

          // Get user roles for selected members
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, role')
            .in('id', existingUserMembers.map(m => m.user_id!))

          if (usersError) throw usersError

          const existingUserInserts = existingUserMembers.map(member => {
            const user = usersData?.find(u => u.id === member.user_id)
            return {
              family_id: familyData.id,
              user_id: member.user_id,
              role: user?.role || 'student'
            }
          })

          const { error: existingMembersError } = await supabase
            .from('family_members')
            .insert(existingUserInserts)

          if (existingMembersError) {
            console.error('Existing members error:', existingMembersError)
            throw existingMembersError
          }
        }

        // Insert manual members (without user_id)
        if (manualMembers.length > 0) {
          const manualMemberInserts = manualMembers.map(member => ({
            family_id: familyData.id,
            user_id: null,
            role: member.role || 'student',
            user_name: member.user_name!,
            email: member.email || null,
            phone: member.phone || null
          }))

          const { error: manualMembersError } = await supabase
            .from('family_members')
            .insert(manualMemberInserts)

          if (manualMembersError) {
            console.error('Manual members error:', manualMembersError)
            throw manualMembersError
          }
        }
      }

      // Success - show invitation modal
      setShowAddModal(false)
      resetForm()
      setCreatedFamilyId(familyData.id)
      setShowInvitationModal(true)
      invalidateFamiliesCache(academyId)
      fetchFamilies()
    } catch (error: unknown) {
      console.error('Error adding family:', error)
      alert(t('families.errorAddingFamily') + ': ' + (error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddClick = () => {
    resetForm()
    setShowAddModal(true)
    // Refresh available users (no exclusions for new family)
    fetchAvailableUsers()
  }

  const handleEditClick = (family: Family) => {
    setEditingFamily(family)
    setFormData({
      name: family.name || '',
      selectedMembers: family.members.map(member => {
        if (member.user_id !== null) {
          // Existing user
          return {
            type: 'existing' as const,
            user_id: member.user_id
          }
        } else {
          // Manual member (pre-registration)
          return {
            type: 'manual' as const,
            user_name: member.name,
            email: member.email || undefined,
            phone: member.phone || undefined,
            role: member.role as 'student' | 'parent'
          }
        }
      })
    })
    setShowEditModal(true)
    setDropdownOpen(null)
    // Refresh available users for this family (exclude current family members from "assigned" check)
    fetchAvailableUsers(family.id)
  }

  const handleUpdateFamily = async () => {
    if (!editingFamily || !validateForm()) return
    
    setSubmitting(true)
    try {
      // Update family name
      const { error: familyError } = await supabase
        .from('families')
        .update({ name: formData.name.trim() })
        .eq('id', editingFamily.id)

      if (familyError) throw familyError

      // Remove all existing family members
      await supabase
        .from('family_members')
        .delete()
        .eq('family_id', editingFamily.id)

      // Add updated family members (if any)
      if (formData.selectedMembers.length > 0) {
        // Separate existing users and manual members
        const existingUserMembers = formData.selectedMembers.filter(m => m.type === 'existing' && m.user_id)
        const manualMembers = formData.selectedMembers.filter(m => m.type === 'manual')

        // Server-side validation: Check if any selected users are already in OTHER families
        if (existingUserMembers.length > 0) {
          const { data: existingMembers, error: checkError } = await supabase
            .from('family_members')
            .select(`
              user_id,
              families!inner(academy_id)
            `)
            .eq('families.academy_id', academyId)
            .neq('family_id', editingFamily.id) // Exclude current family being edited
            .in('user_id', existingUserMembers.map(m => m.user_id!))

          if (checkError) throw checkError

          if (existingMembers && existingMembers.length > 0) {
            const conflictUserIds = existingMembers.map(em => em.user_id)
            const conflictUsers = availableUsers.filter(u => conflictUserIds.includes(u.id))
            const userNames = conflictUsers.map(u => u.name).join(', ')
            throw new Error(`The following users are already assigned to other families: ${userNames}`)
          }

          // Get user roles for selected members
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, role')
            .in('id', existingUserMembers.map(m => m.user_id!))

          if (usersError) throw usersError

          const existingUserInserts = existingUserMembers.map(member => {
            const user = usersData?.find(u => u.id === member.user_id)
            return {
              family_id: editingFamily.id,
              user_id: member.user_id,
              role: user?.role || 'student'
            }
          })

          const { error: existingMembersError } = await supabase
            .from('family_members')
            .insert(existingUserInserts)

          if (existingMembersError) {
            console.error('Existing members error:', existingMembersError)
            throw existingMembersError
          }
        }

        // Insert manual members (without user_id)
        if (manualMembers.length > 0) {
          const manualMemberInserts = manualMembers.map(member => ({
            family_id: editingFamily.id,
            user_id: null,
            role: member.role || 'student',
            user_name: member.user_name!,
            email: member.email || null,
            phone: member.phone || null
          }))

          const { error: manualMembersError } = await supabase
            .from('family_members')
            .insert(manualMemberInserts)

          if (manualMembersError) {
            console.error('Manual members error:', manualMembersError)
            throw manualMembersError
          }
        }
      }

      setShowEditModal(false)
      setEditingFamily(null)
      resetForm()
      invalidateFamiliesCache(academyId)
      fetchFamilies()
      showSuccessToast(t('families.familyUpdatedSuccessfully') as string)
    } catch (error: unknown) {
      console.error('Error updating family:', error)
      showErrorToast(t('families.errorUpdatingFamily') + ': ' + (error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewMembersClick = (family: Family) => {
    setViewingFamily(family)
    setShowMembersModal(true)
    setDropdownOpen(null)
  }

  const handleShareLinksClick = (family: Family) => {
    setCreatedFamilyId(family.id)
    setShowInvitationModal(true)
    setDropdownOpen(null)
  }

  const handleDeleteClick = (family: Family) => {
    setFamilyToDelete(family)
    setShowDeleteModal(true)
    setDropdownOpen(null)
  }

  const handleDeleteConfirm = async () => {
    if (!familyToDelete) return
    
    try {
      // Delete family members first
      await supabase
        .from('family_members')
        .delete()
        .eq('family_id', familyToDelete.id)

      // Delete family
      const { error } = await supabase
        .from('families')
        .delete()
        .eq('id', familyToDelete.id)

      if (error) throw error

      setShowDeleteModal(false)
      setFamilyToDelete(null)
      invalidateFamiliesCache(academyId)
      fetchFamilies()
      showSuccessToast(t('families.familyDeletedSuccessfully') as string)
    } catch (error: unknown) {
      console.error('Error deleting family:', error)
      showErrorToast(t('families.errorDeletingFamily') + ': ' + (error as Error).message)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedFamilies.size === 0) return
    
    try {
      const familyIds = Array.from(selectedFamilies)
      
      // Delete all family members first
      await supabase
        .from('family_members')
        .delete()
        .in('family_id', familyIds)

      // Delete families
      const { error } = await supabase
        .from('families')
        .delete()
        .in('id', familyIds)

      if (error) throw error

      setSelectedFamilies(new Set())
      invalidateFamiliesCache(academyId)
      fetchFamilies()
      showSuccessToast(t('families.familiesDeletedSuccessfully') as string)
    } catch (error: unknown) {
      console.error('Error deleting families:', error)
      showErrorToast(t('families.errorDeletingFamilies') + ': ' + (error as Error).message)
    }
  }

  const addMemberToForm = () => {
    setFormData({
      ...formData,
      selectedMembers: [...formData.selectedMembers, { type: 'existing', user_id: '' }]
    })
  }

  const removeMemberFromForm = (index: number) => {
    const newMembers = formData.selectedMembers.filter((_, i) => i !== index)
    setFormData({ ...formData, selectedMembers: newMembers })
  }

  const updateMemberInForm = (index: number, value: string) => {
    const newMembers = [...formData.selectedMembers]
    newMembers[index] = { type: 'existing', user_id: value }
    setFormData({ ...formData, selectedMembers: newMembers })
  }

  const updateManualMemberInForm = (index: number, field: keyof FormMember, value: string) => {
    const newMembers = [...formData.selectedMembers]
    const member = newMembers[index]
    if (member.type === 'manual') {
      newMembers[index] = { ...member, [field]: value }
      setFormData({ ...formData, selectedMembers: newMembers })
    }
  }

  const addManualMember = () => {
    // Validate manual member data
    if (!manualMemberData.user_name.trim()) {
      showErrorToast(t('families.nameRequired') as string)
      return
    }

    // Add manual member to form
    setFormData({
      ...formData,
      selectedMembers: [...formData.selectedMembers, {
        type: 'manual',
        user_name: manualMemberData.user_name.trim(),
        email: manualMemberData.email.trim() || undefined,
        phone: manualMemberData.phone.trim() || undefined,
        role: manualMemberData.role
      }]
    })

    // Reset manual member form
    setManualMemberData({
      user_name: '',
      email: '',
      phone: '',
      role: 'student'
    })
    setShowManualMemberForm(false)
    showSuccessToast(t('families.manualMemberAdded') as string)
  }

  // Loading skeleton
  const TableSkeleton = () => (
    <div className="animate-pulse">
      <div className="overflow-x-auto min-h-[640px] flex flex-col">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
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
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
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
            <h1 className="text-2xl font-bold text-gray-900">{t("families.title")}</h1>
            <p className="text-gray-500">{t("families.description")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleAddClick} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {t("families.createFamily")}
            </Button>
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
          <h1 className="text-2xl font-bold text-gray-900">{t("families.title")}</h1>
          <p className="text-gray-500">{t("families.description")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {t("families.import")}
          </Button>
          <Button onClick={handleAddClick} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t("families.createFamily")}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          placeholder={String(t("families.searchPlaceholder"))}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
        />
      </div>

      {/* Bulk Actions Menu */}
      {selectedFamilies.size > 0 && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedFamilies.size}개 선택됨
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFamilies(new Set())}
              >
                {t("families.clearSelection")}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleBulkDelete} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                {t("families.deleteSelected")}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Families Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto min-h-[640px] flex flex-col">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 accent-primary"
                      checked={filteredFamilies.length > 0 && selectedFamilies.size === filteredFamilies.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 ">
                      {t("families.familyName")}
                      {renderSortIcon('name')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('members')} className="flex items-center gap-1 ">
                      {t("families.members")}
                      {renderSortIcon('members')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('parents')} className="flex items-center gap-1 ">
                      {t("families.parents")}
                      {renderSortIcon('parents')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('students')} className="flex items-center gap-1 ">
                      {t("families.students")}
                      {renderSortIcon('students')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 ">
                      {t("families.created")}
                      {renderSortIcon('created_at')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900"></th>
              </tr>
            </thead>
            <tbody>
              {!initialized ? (
                <tr><td colSpan={4}></td></tr>
              ) : filteredFamilies.length > 0 ? filteredFamilies.map((family) => (
                <tr key={family.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 accent-primary"
                      checked={selectedFamilies.has(family.id)}
                      onChange={(e) => handleSelectFamily(family.id, e.target.checked)}
                    />
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-gray-900">{family.name}</div>
                      <div className="text-sm text-gray-500">ID: {family.id.slice(0, 8)}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-sm">
                      <span className="font-medium">{family.signed_up_count || 0}/{family.total_member_count || 0}</span>
                      <span className="text-gray-500">{t("families.signedUp")}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-sm">
                      <span className="font-medium text-black">{family.parent_count}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-sm">
                      <span className="font-medium text-black">{family.student_count}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      {language === 'korean' 
                        ? new Date(family.created_at).toLocaleDateString('ko-KR', { 
                            year: 'numeric', 
                            month: '2-digit', 
                            day: '2-digit' 
                          }).replace(/\./g, '').replace(/(\d{4}) (\d{2}) (\d{2})/, '$1년 $2월 $3일')
                        : new Date(family.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                      }
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="relative">
                      <Button
                        ref={(el) => { dropdownButtonRefs.current[family.id] = el }}
                        variant="ghost"
                        size="sm"
                        onClick={() => setDropdownOpen(dropdownOpen === family.id ? null : family.id)}
                        className="p-1"
                      >
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                      </Button>
                      
                      {dropdownOpen === family.id && (
                        <div
                          className="dropdown-menu absolute right-0 top-8 z-50 bg-white rounded-lg border border-gray-300 shadow-xl py-1 min-w-[160px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleViewMembersClick(family)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                            {t("families.viewMembers")}
                          </button>
                          <button
                            className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleEditClick(family)
                            }}
                          >
                            <Edit className="w-4 h-4" />
                            {t("families.edit")}
                          </button>
                          <button
                            className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleShareLinksClick(family)
                            }}
                          >
                            <Share className="w-4 h-4" />
                            {t("families.shareLinks")}
                          </button>
                          <button
                            className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-red-600"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDeleteClick(family)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                            {t("families.delete")}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{t("families.noFamiliesFound")}</h3>
                      <p className="text-gray-600">
                        {searchQuery ? t("families.tryAdjustingSearch") : t("families.getStartedCreating")}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
              >
                {t("families.pagination.previous")}
              </Button>
              <Button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                variant="outline"
              >
                {t("families.pagination.next")}
              </Button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {t("families.pagination.showing")}
                  <span className="font-medium"> {((currentPage - 1) * itemsPerPage) + 1} </span>
                  {t("families.pagination.to")}
                  <span className="font-medium"> {Math.min(currentPage * itemsPerPage, totalCount)} </span>
                  {t("families.pagination.of")}
                  <span className="font-medium"> {totalCount} </span>
                  {t("families.pagination.families")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  {t("families.pagination.previous")}
                </Button>
                <Button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / itemsPerPage), p + 1))}
                  disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                  variant="outline"
                >
                  {t("families.pagination.next")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>


      {/* Edit Family Modal */}
      {showEditModal && editingFamily && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-2xl mx-4 shadow-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t("families.editFamily")}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowEditModal(false)
                  setEditingFamily(null)
                  resetForm()
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700">
                    {t("families.familyName")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`mt-1 ${formErrors.name ? 'border-red-500' : ''}`}
                    placeholder={String(t("families.enterFamilyName"))}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-gray-700">
                      {t("families.familyMembers")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowManualMemberForm(true)}
                        className="flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {t("families.addManualMember")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addMemberToForm}
                        disabled={availableUsers.length === 0}
                        className="flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {t("families.addMember")}
                      </Button>
                    </div>
                  </div>
                  {availableUsers.length === 0 && (
                    <p className="text-xs text-amber-600 text-right mb-3">
                      All users are already assigned to families
                    </p>
                  )}
                  
                  {formData.selectedMembers.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{t("families.noMembersAddedYet")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.selectedMembers.map((member, index) => (
                        <div key={index} className={`p-3 bg-white rounded-lg border border-gray-200 ${member.type === 'manual' ? 'relative' : 'flex items-center gap-3'}`}>
                          {member.type === 'manual' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMemberFromForm(index)}
                              className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1 h-auto"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                          <div className={member.type === 'manual' ? 'pr-8' : 'flex-1'}>
                            {member.type === 'existing' ? (
                              <Select
                                value={member.user_id}
                                onValueChange={(value) => updateMemberInForm(index, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("families.selectPerson")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableUsers
                                    .filter(user => !formData.selectedMembers.some((m, i) => i !== index && m.type === 'existing' && m.user_id === user.id))
                                    .map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.name} ({t(`common.roles.${user.role}`)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="space-y-3 flex-1">
                                <div>
                                  <Label className="text-xs font-medium text-gray-600">
                                    {t("families.name")} <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    type="text"
                                    value={member.user_name || ''}
                                    onChange={(e) => updateManualMemberInForm(index, 'user_name', e.target.value)}
                                    className="mt-1 bg-white"
                                    placeholder={String(t("families.enterName"))}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                      {t("families.email")}
                                    </Label>
                                    <Input
                                      type="email"
                                      value={member.email || ''}
                                      onChange={(e) => updateManualMemberInForm(index, 'email', e.target.value)}
                                      className="mt-1 bg-white"
                                      placeholder={String(t("families.enterEmail"))}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                      {t("families.phone")}
                                    </Label>
                                    <Input
                                      type="tel"
                                      value={member.phone || ''}
                                      onChange={(e) => updateManualMemberInForm(index, 'phone', e.target.value)}
                                      className="mt-1 bg-white"
                                      placeholder={String(t("families.enterPhone"))}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs font-medium text-gray-600">
                                    {t("families.role")} <span className="text-red-500">*</span>
                                  </Label>
                                  <Select
                                    value={member.role}
                                    onValueChange={(value) => updateManualMemberInForm(index, 'role', value)}
                                  >
                                    <SelectTrigger className="mt-1 bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="student">{t("common.roles.student")}</SelectItem>
                                      <SelectItem value="parent">{t("common.roles.parent")}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                          </div>
                          {member.type === 'existing' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMemberFromForm(index)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual Member Addition Section */}
                  {showManualMemberForm && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-900">{t("families.manualMemberInfo")}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowManualMemberForm(false)
                              setManualMemberData({
                                user_name: '',
                                email: '',
                                phone: '',
                                role: 'student'
                              })
                            }}
                            className="p-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div>
                          <Label htmlFor="manual-name" className="text-sm font-medium text-gray-700">
                            {t("families.name")} <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="manual-name"
                            type="text"
                            value={manualMemberData.user_name}
                            onChange={(e) => setManualMemberData({ ...manualMemberData, user_name: e.target.value })}
                            className="mt-1 bg-white"
                            placeholder={String(t("families.enterName"))}
                          />
                        </div>

                        <div>
                          <Label htmlFor="manual-email" className="text-sm font-medium text-gray-700">
                            {t("families.email")}
                          </Label>
                          <Input
                            id="manual-email"
                            type="email"
                            value={manualMemberData.email}
                            onChange={(e) => setManualMemberData({ ...manualMemberData, email: e.target.value })}
                            className="mt-1 bg-white"
                            placeholder={String(t("families.enterEmail"))}
                          />
                        </div>

                        <div>
                          <Label htmlFor="manual-phone" className="text-sm font-medium text-gray-700">
                            {t("families.phone")}
                          </Label>
                          <Input
                            id="manual-phone"
                            type="tel"
                            value={manualMemberData.phone}
                            onChange={(e) => setManualMemberData({ ...manualMemberData, phone: e.target.value })}
                            className="mt-1 bg-white"
                            placeholder={String(t("families.enterPhone"))}
                          />
                        </div>

                        <div>
                          <Label htmlFor="manual-role" className="text-sm font-medium text-gray-700">
                            {t("families.role")} <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={manualMemberData.role}
                            onValueChange={(value) => setManualMemberData({ ...manualMemberData, role: value as 'student' | 'parent' })}
                          >
                            <SelectTrigger className="mt-1 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">{t("common.roles.student")}</SelectItem>
                              <SelectItem value="parent">{t("common.roles.parent")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="button"
                          onClick={addManualMember}
                          className="w-full bg-primary text-white"
                        >
                          {t("families.addToList")}
                        </Button>
                      </div>
                    </div>
                  )}

                  {formErrors.members && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.members}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditModal(false)
                  setEditingFamily(null)
                  resetForm()
                }}
                disabled={submitting}
              >
                {t("common.cancel")}
              </Button>
              <Button 
                onClick={handleUpdateFamily}
                disabled={submitting}
                className="bg-primary text-white"
              >
                {submitting ? t('families.updating') : t('families.updateFamily')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Family Modal */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-2xl mx-4 shadow-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t("families.createNewFamily")}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    {t("families.familyName")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`mt-1 ${formErrors.name ? 'border-red-500' : ''}`}
                    placeholder={String(t("families.enterFamilyName"))}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-gray-700">
                      {t("families.familyMembers")} <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowManualMemberForm(true)}
                        className="flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {t("families.addManualMember")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addMemberToForm}
                        disabled={availableUsers.length === 0}
                        className="flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {t("families.addMember")}
                      </Button>
                    </div>
                  </div>
                  {availableUsers.length === 0 && (
                    <p className="text-xs text-amber-600 text-right mb-3">
                      All users are already assigned to families
                    </p>
                  )}
                  
                  {formData.selectedMembers.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{t("families.noMembersAddedYet")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.selectedMembers.map((member, index) => (
                        <div key={index} className={`p-3 bg-white rounded-lg border border-gray-200 ${member.type === 'manual' ? 'relative' : 'flex items-center gap-3'}`}>
                          {member.type === 'manual' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMemberFromForm(index)}
                              className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1 h-auto"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                          <div className={member.type === 'manual' ? 'pr-8' : 'flex-1'}>
                            {member.type === 'existing' ? (
                              <Select
                                value={member.user_id}
                                onValueChange={(value) => updateMemberInForm(index, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("families.selectPerson")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableUsers
                                    .filter(user => !formData.selectedMembers.some((m, i) => i !== index && m.type === 'existing' && m.user_id === user.id))
                                    .map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.name} ({t(`common.roles.${user.role}`)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="space-y-3 flex-1">
                                <div>
                                  <Label className="text-xs font-medium text-gray-600">
                                    {t("families.name")} <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    type="text"
                                    value={member.user_name || ''}
                                    onChange={(e) => updateManualMemberInForm(index, 'user_name', e.target.value)}
                                    className="mt-1 bg-white"
                                    placeholder={String(t("families.enterName"))}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                      {t("families.email")}
                                    </Label>
                                    <Input
                                      type="email"
                                      value={member.email || ''}
                                      onChange={(e) => updateManualMemberInForm(index, 'email', e.target.value)}
                                      className="mt-1 bg-white"
                                      placeholder={String(t("families.enterEmail"))}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                      {t("families.phone")}
                                    </Label>
                                    <Input
                                      type="tel"
                                      value={member.phone || ''}
                                      onChange={(e) => updateManualMemberInForm(index, 'phone', e.target.value)}
                                      className="mt-1 bg-white"
                                      placeholder={String(t("families.enterPhone"))}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs font-medium text-gray-600">
                                    {t("families.role")} <span className="text-red-500">*</span>
                                  </Label>
                                  <Select
                                    value={member.role}
                                    onValueChange={(value) => updateManualMemberInForm(index, 'role', value)}
                                  >
                                    <SelectTrigger className="mt-1 bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="student">{t("common.roles.student")}</SelectItem>
                                      <SelectItem value="parent">{t("common.roles.parent")}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                          </div>
                          {member.type === 'existing' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMemberFromForm(index)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual Member Addition Section */}
                  {showManualMemberForm && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-900">{t("families.manualMemberInfo")}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowManualMemberForm(false)
                              setManualMemberData({
                                user_name: '',
                                email: '',
                                phone: '',
                                role: 'student'
                              })
                            }}
                            className="p-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div>
                          <Label htmlFor="manual-name" className="text-sm font-medium text-gray-700">
                            {t("families.name")} <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="manual-name"
                            type="text"
                            value={manualMemberData.user_name}
                            onChange={(e) => setManualMemberData({ ...manualMemberData, user_name: e.target.value })}
                            className="mt-1 bg-white"
                            placeholder={String(t("families.enterName"))}
                          />
                        </div>

                        <div>
                          <Label htmlFor="manual-email" className="text-sm font-medium text-gray-700">
                            {t("families.email")}
                          </Label>
                          <Input
                            id="manual-email"
                            type="email"
                            value={manualMemberData.email}
                            onChange={(e) => setManualMemberData({ ...manualMemberData, email: e.target.value })}
                            className="mt-1 bg-white"
                            placeholder={String(t("families.enterEmail"))}
                          />
                        </div>

                        <div>
                          <Label htmlFor="manual-phone" className="text-sm font-medium text-gray-700">
                            {t("families.phone")}
                          </Label>
                          <Input
                            id="manual-phone"
                            type="tel"
                            value={manualMemberData.phone}
                            onChange={(e) => setManualMemberData({ ...manualMemberData, phone: e.target.value })}
                            className="mt-1 bg-white"
                            placeholder={String(t("families.enterPhone"))}
                          />
                        </div>

                        <div>
                          <Label htmlFor="manual-role" className="text-sm font-medium text-gray-700">
                            {t("families.role")} <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={manualMemberData.role}
                            onValueChange={(value) => setManualMemberData({ ...manualMemberData, role: value as 'student' | 'parent' })}
                          >
                            <SelectTrigger className="mt-1 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">{t("common.roles.student")}</SelectItem>
                              <SelectItem value="parent">{t("common.roles.parent")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="button"
                          onClick={addManualMember}
                          className="w-full bg-primary text-white"
                        >
                          {t("families.addToList")}
                        </Button>
                      </div>
                    </div>
                  )}

                  {formErrors.members && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.members}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                disabled={submitting}
              >
                {t("common.cancel")}
              </Button>
              <Button 
                onClick={handleAddFamily}
                disabled={submitting}
                className="bg-primary text-white"
              >
                {submitting ? t('families.creating') : t('families.createFamily')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Members Modal */}
      {showMembersModal && viewingFamily && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-3xl mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {t("families.familyMembers")} - {viewingFamily.name}
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowMembersModal(false)
                  setViewingFamily(null)
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6">
              {viewingFamily.members.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    {viewingFamily.signed_up_count || 0}/{viewingFamily.total_member_count || 0} {t("families.signedUp")}
                  </p>
                  <div className="grid gap-4">
                    {viewingFamily.members.map((member, index) => (
                      <div key={member.user_id || `pending-${index}`} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-gray-900 text-lg">{member.name}</h3>
                                  {!member.user_id && (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                      {t("families.notSignedUp")}
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                  {member.email && (
                                    <div>
                                      <span className="font-medium">{t("families.email")}:</span>
                                      <span> {member.email}</span>
                                    </div>
                                  )}
                                  {member.phone && (
                                    <div>
                                      <span className="font-medium">{t("families.phone")}:</span>
                                      <span> {member.phone}</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium">{t("families.role")}:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ml-1 ${
                                      member.user_role === 'parent'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {t(`common.roles.${member.user_role}`)}
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
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t("families.noFamilyMembers")}</h3>
                  <p className="text-gray-600">{t("families.noMembersYet")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && familyToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t("families.deleteFamily")}</h2>
              <p className="text-gray-600 mb-6">
                {t("families.deleteFamilyConfirm", { name: familyToDelete.name || String(t("common.unnamed")) })}
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteModal(false)
                    setFamilyToDelete(null)
                  }}
                  className="flex-1"
                >
                  {t("common.cancel")}
                </Button>
                <Button 
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {t("families.delete")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Family Invitation Modal */}
      {showInvitationModal && createdFamilyId && (() => {
        const currentFamily = families.find(f => f.id === createdFamilyId)
        const manualMembers = currentFamily?.members.filter(m => m.user_id === null) || []

        return (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg border border-border w-full max-w-2xl mx-4 shadow-lg max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{t("families.shareLinks")}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowInvitationModal(false)
                    setCreatedFamilyId(null)
                  }}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">

                <div className="space-y-6">
                  {/* General Links Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{t("families.generalLinks")}</h3>

                    {/* Parent Registration Link */}
                    <div className="mb-4">
                      <h4 className="text-base font-semibold text-gray-900 mb-2">{t("families.parentRegistrationLink")}</h4>
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={`${typeof window !== 'undefined' ? window.location.origin : 'https://classraum.com'}/auth?family_id=${createdFamilyId}&role=parent&academy_id=${academyId}`}
                            readOnly
                            className="w-full bg-transparent text-sm text-gray-700 outline-none"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const parentUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://classraum.com'}/auth?family_id=${createdFamilyId}&role=parent&academy_id=${academyId}`
                            navigator.clipboard.writeText(parentUrl)
                            showSuccessToast(t('families.parentLinkCopied') as string)
                          }}
                          className="shrink-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">{t("families.shareParentLink")}</p>
                    </div>

                    {/* Student Registration Link */}
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 mb-2">{t("families.studentRegistrationLink")}</h4>
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={`${typeof window !== 'undefined' ? window.location.origin : 'https://classraum.com'}/auth?family_id=${createdFamilyId}&role=student&academy_id=${academyId}`}
                            readOnly
                            className="w-full bg-transparent text-sm text-gray-700 outline-none"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const studentUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://classraum.com'}/auth?family_id=${createdFamilyId}&role=student&academy_id=${academyId}`
                            navigator.clipboard.writeText(studentUrl)
                            showSuccessToast(t('families.studentLinkCopied') as string)
                          }}
                          className="shrink-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">{t("families.shareStudentLink")}</p>
                    </div>
                  </div>

                  {/* Manual Members Links */}
                  {manualMembers.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{t("families.personalizedLinks")}</h3>
                      <div className="space-y-4">
                        {manualMembers.map((member, index) => (
                          <div key={member.id || index} className="border border-gray-200 rounded-lg p-4 bg-white">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="text-base font-semibold text-gray-900">{member.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    {t(`common.roles.${member.role}`)}
                                  </span>
                                  <span className="text-xs text-gray-500">{t("families.notSignedUp")}</span>
                                </div>
                                {member.email && (
                                  <p className="text-sm text-gray-600 mt-1">{member.email}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={`${typeof window !== 'undefined' ? window.location.origin : 'https://classraum.com'}/auth?family_member_id=${member.id}&academy_id=${academyId}`}
                                  readOnly
                                  className="w-full bg-transparent text-sm text-gray-700 outline-none"
                                />
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const memberUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://classraum.com'}/auth?family_member_id=${member.id}&academy_id=${academyId}`
                                  navigator.clipboard.writeText(memberUrl)
                                  showSuccessToast(t('families.memberLinkCopied') as string)
                                }}
                                className="shrink-0"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end p-6 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => {
                    setShowInvitationModal(false)
                    setCreatedFamilyId(null)
                  }}
                  className="bg-primary text-white"
                >
                  {t("families.done")}
                </Button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Family Import Modal */}
      <FamilyImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        academyId={academyId}
        onSuccess={() => {
          invalidateFamiliesCache(academyId)
          fetchFamilies()
        }}
      />
    </div>
  )
}