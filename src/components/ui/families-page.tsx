"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
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
  Share
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface Family {
  id: string
  name?: string
  academy_id: string
  created_at: string
  member_count: number
  members: FamilyMember[]
  parent_count: number
  student_count: number
}

interface FamilyMember {
  user_id: string
  name: string
  email: string
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
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
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
  const [familyToDelete, setFamilyToDelete] = useState<Family | null>(null)
  const [editingFamily, setEditingFamily] = useState<Family | null>(null)
  const [viewingFamily, setViewingFamily] = useState<Family | null>(null)
  const [createdFamilyId, setCreatedFamilyId] = useState<string | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    selectedMembers: [] as { user_id: string }[]
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)

  // Available users for family assignment
  const [availableUsers, setAvailableUsers] = useState<User[]>([])

  // Fetch families
  const fetchFamilies = useCallback(async () => {
    if (!academyId) return
    
    setLoading(true)
    try {
      const { data: familiesData, error: familiesError } = await supabase
        .from('families')
        .select('id, name, academy_id, created_at')
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })

      if (familiesError) throw familiesError

      // Get family members for each family
      const familyIds = familiesData?.map(f => f.id) || []
      const familyMembers: { [key: string]: FamilyMember[] } = {}

      if (familyIds.length > 0) {
        const { data: membersData, error: membersError } = await supabase
          .from('family_members')
          .select(`
            user_id,
            family_id,
            role,
            users!inner(
              id,
              name,
              email,
              role
            )
          `)
          .in('family_id', familyIds)

        if (!membersError && membersData) {
          // Get phone numbers for all members from their respective role tables
          const allMemberIds = membersData.map((member: { user_id: string }) => member.user_id)
          const phoneMap: { [key: string]: string | null } = {}

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

          membersData.forEach((member: Record<string, unknown>) => {
            const typedMember = member as { family_id: string; user_id: string; users: { name: string; email: string; role?: string }; role: string }
            if (!familyMembers[typedMember.family_id]) {
              familyMembers[typedMember.family_id] = []
            }
            familyMembers[typedMember.family_id].push({
              user_id: typedMember.user_id,
              name: typedMember.users.name,
              email: typedMember.users.email,
              phone: phoneMap[typedMember.user_id] || null,
              role: typedMember.role,
              user_role: (typedMember.users.role as 'student' | 'teacher' | 'manager' | 'parent') || 'parent'
            })
          })
        }
      }

      const enrichedFamilies = familiesData?.map(family => {
        const members = familyMembers[family.id] || []
        const parentCount = members.filter(m => m.user_role === 'parent').length
        const studentCount = members.filter(m => m.user_role === 'student').length

        return {
          id: family.id,
          name: family.name || `${t('families.family')} ${family.id.slice(0, 8)}`,
          academy_id: family.academy_id,
          created_at: family.created_at,
          member_count: members.length,
          members: members,
          parent_count: parentCount,
          student_count: studentCount
        }
      }) || []

      setFamilies(enrichedFamilies)
    } catch (error) {
      alert(t('families.errorLoadingFamilies') + ': ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [academyId, t])

  // Fetch available users for assignment
  const fetchAvailableUsers = useCallback(async () => {
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

      let allUsers: User[] = []

      if (!studentsError && studentsData) {
        const students = studentsData.map((s: Record<string, unknown>) => {
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
        const parents = parentsData.map((p: Record<string, unknown>) => {
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
                           member.email.toLowerCase().includes(searchQuery.toLowerCase())
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
      errors.name = t('families.familyNameRequired')
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
        // Get user roles for selected members
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, role')
          .in('id', formData.selectedMembers.map(m => m.user_id))

        if (usersError) throw usersError

        const memberInserts = formData.selectedMembers.map(member => {
          const user = usersData?.find(u => u.id === member.user_id)
          return {
            family_id: familyData.id,
            user_id: member.user_id,
            role: user?.role || 'student' // fallback to student if role not found
          }
        })

        const { error: membersError } = await supabase
          .from('family_members')
          .insert(memberInserts)

        if (membersError) {
          console.error('{t("families.members")} error:', membersError)
          throw membersError
        }
      }

      // Success - show invitation modal
      setShowAddModal(false)
      resetForm()
      setCreatedFamilyId(familyData.id)
      setShowInvitationModal(true)
      fetchFamilies()
    } catch (error: unknown) {
      console.error('Error adding family:', error)
      alert(t('families.errorAddingFamily') + ': ' + (error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditClick = (family: Family) => {
    setEditingFamily(family)
    setFormData({
      name: family.name || '',
      selectedMembers: family.members.map(member => ({
        user_id: member.user_id
      }))
    })
    setShowEditModal(true)
    setDropdownOpen(null)
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
        // Get user roles for selected members
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, role')
          .in('id', formData.selectedMembers.map(m => m.user_id))

        if (usersError) throw usersError

        const memberInserts = formData.selectedMembers.map(member => {
          const user = usersData?.find(u => u.id === member.user_id)
          return {
            family_id: editingFamily.id,
            user_id: member.user_id,
            role: user?.role || 'student' // fallback to student if role not found
          }
        })

        const { error: membersError } = await supabase
          .from('family_members')
          .insert(memberInserts)

        if (membersError) {
          console.error('{t("families.members")} error:', membersError)
          throw membersError
        }
      }

      setShowEditModal(false)
      setEditingFamily(null)
      resetForm()
      fetchFamilies()
      alert(t('families.familyUpdatedSuccessfully'))
    } catch (error: unknown) {
      console.error('Error updating family:', error)
      alert(t('families.errorUpdatingFamily') + ': ' + (error as Error).message)
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
      fetchFamilies()
      alert(t('families.familyDeletedSuccessfully'))
    } catch (error: unknown) {
      console.error('Error deleting family:', error)
      alert(t('families.errorDeletingFamily') + ': ' + (error as Error).message)
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
      fetchFamilies()
      alert(t('families.familiesDeletedSuccessfully'))
    } catch (error: unknown) {
      console.error('Error deleting families:', error)
      alert(t('families.errorDeletingFamilies') + ': ' + (error as Error).message)
    }
  }

  const addMemberToForm = () => {
    setFormData({
      ...formData,
      selectedMembers: [...formData.selectedMembers, { user_id: '' }]
    })
  }

  const removeMemberFromForm = (index: number) => {
    const newMembers = formData.selectedMembers.filter((_, i) => i !== index)
    setFormData({ ...formData, selectedMembers: newMembers })
  }

  const updateMemberInForm = (index: number, value: string) => {
    const newMembers = [...formData.selectedMembers]
    newMembers[index] = { user_id: value }
    setFormData({ ...formData, selectedMembers: newMembers })
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
            <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
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
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
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
          placeholder={t("families.searchPlaceholder")}
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
                      className="rounded border-gray-300"
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
              {filteredFamilies.length > 0 ? filteredFamilies.map((family) => (
                <tr key={family.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
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
                      <span className="font-medium">{family.member_count}</span>
                      <span className="text-gray-500">{t("families.total")}</span>
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
                    placeholder={t("families.enterFamilyName")}
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMemberToForm}
                      className="flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {t("families.addMember")}
                    </Button>
                  </div>
                  
                  {formData.selectedMembers.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{t("families.noMembersAddedYet")}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addMemberToForm}
                        className="mt-2"
                      >
                        {t("families.addFirstMember")}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.selectedMembers.map((member, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <Select
                              value={member.user_id}
                              onValueChange={(value) => updateMemberInForm(index, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("families.selectPerson")} />
                              </SelectTrigger>
                              <SelectContent>
                                {availableUsers
                                  .filter(user => !formData.selectedMembers.some((m, i) => i !== index && m.user_id === user.id))
                                  .map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name} ({t(`common.roles.${user.role}`)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMemberFromForm(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
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
                    placeholder={t("families.enterFamilyName")}
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMemberToForm}
                      className="flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {t("families.addMember")}
                    </Button>
                  </div>
                  
                  {formData.selectedMembers.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{t("families.noMembersAddedYet")}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addMemberToForm}
                        className="mt-2"
                      >
                        {t("families.addFirstMember")}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.selectedMembers.map((member, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <Select
                              value={member.user_id}
                              onValueChange={(value) => updateMemberInForm(index, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("families.selectPerson")} />
                              </SelectTrigger>
                              <SelectContent>
                                {availableUsers
                                  .filter(user => !formData.selectedMembers.some((m, i) => i !== index && m.user_id === user.id))
                                  .map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name} ({t(`common.roles.${user.role}`)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMemberFromForm(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
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
                    {viewingFamily.members.length}{t("families.memberCount")}
                  </p>
                  <div className="grid gap-4">
                    {viewingFamily.members.map((member) => (
                      <div key={member.user_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg mb-2">{member.name}</h3>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">{t("families.email")}:</span>
                                    <span> {member.email}</span>
                                  </div>
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
                {t("families.deleteFamilyConfirm", { name: familyToDelete.name || t("common.unnamed") })}
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
      {showInvitationModal && createdFamilyId && (
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
                {/* Parent Registration Link */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{t("families.parentRegistrationLink")}</h3>
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
                        alert(t('families.parentLinkCopied'))
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{t("families.studentRegistrationLink")}</h3>
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
                        alert(t('families.studentLinkCopied'))
                      }}
                      className="shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{t("families.shareStudentLink")}</p>
                </div>
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
      )}
    </div>
  )
}