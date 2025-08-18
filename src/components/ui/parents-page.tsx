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
  UserPlus,
  Users,
  CheckCircle,
  XCircle,
  Home,
  Baby,
  UserX,
  UserCheck
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

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
  const [parents, setParents] = useState<Parent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedParents, setSelectedParents] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showStatusFilter, setShowStatusFilter] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const dropdownButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showViewFamilyModal, setShowViewFamilyModal] = useState(false)
  const [showViewChildrenModal, setShowViewChildrenModal] = useState(false)
  const [parentToDelete, setParentToDelete] = useState<Parent | null>(null)
  const [viewingParent, setViewingParent] = useState<Parent | null>(null)
  const [parentFamily, setParentFamily] = useState<any>(null)
  const [parentChildren, setParentChildren] = useState<any[]>([])

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    family_id: ''
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)

  // Available families for assignment
  const [families, setFamilies] = useState<Family[]>([])

  // Refs
  const statusFilterRef = useRef<HTMLDivElement>(null)

  // Fetch parents
  const fetchParents = useCallback(async () => {
    if (!academyId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('parents')
        .select(`
          user_id,
          phone,
          academy_id,
          active,
          created_at,
          users!inner(
            id,
            name,
            email
          )
        `)
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get family information and children for each parent
      const parentIds = data?.map(p => p.user_id) || []
      let familyData: { [key: string]: { family_id: string; family_name: string } } = {}
      let childrenData: { [key: string]: { count: number; names: string[] } } = {}
      
      if (parentIds.length > 0) {
        // Get family memberships
        const { data: familyMembers, error: familyError } = await supabase
          .from('family_members')
          .select(`
            user_id,
            families!inner(
              id,
              name
            )
          `)
          .in('user_id', parentIds)

        if (!familyError) {
          familyMembers?.forEach((member: any) => {
            familyData[member.user_id] = {
              family_id: member.families.id,
              family_name: member.families.name || `Family ${member.families.id.slice(0, 8)}`
            }
          })
        }

        // Get children for all parents in a single batch query
        const familyIds = Object.values(familyData).map(f => f.family_id).filter(Boolean)
        if (familyIds.length > 0) {
          const { data: allFamilyChildren, error: childrenError } = await supabase
            .from('family_members')
            .select(`
              user_id,
              family_id,
              role,
              users!inner(
                id,
                name,
                role
              )
            `)
            .in('family_id', familyIds)
            .eq('users.role', 'student')

          if (!childrenError && allFamilyChildren) {
            // Group children by family_id first, then map to parents
            const childrenByFamily: { [familyId: string]: any[] } = {}
            allFamilyChildren.forEach((child: any) => {
              if (!childrenByFamily[child.family_id]) {
                childrenByFamily[child.family_id] = []
              }
              childrenByFamily[child.family_id].push(child)
            })

            // Map children to parents based on family membership
            parentIds.forEach(parentId => {
              const parentFamilyId = familyData[parentId]?.family_id
              if (parentFamilyId && childrenByFamily[parentFamilyId]) {
                childrenData[parentId] = {
                  count: childrenByFamily[parentFamilyId].length,
                  names: childrenByFamily[parentFamilyId].map((child: any) => child.users.name)
                }
              }
            })
          }
        }
      }

      const parentsData = data?.map((parent: any) => ({
        user_id: parent.user_id,
        name: parent.users.name,
        email: parent.users.email,
        phone: parent.phone,
        academy_id: parent.academy_id,
        active: parent.active,
        created_at: parent.created_at,
        family_id: familyData[parent.user_id]?.family_id,
        family_name: familyData[parent.user_id]?.family_name,
        children_count: childrenData[parent.user_id]?.count || 0,
        children_names: childrenData[parent.user_id]?.names || []
      })) || []

      setParents(parentsData)
    } catch (error) {
      console.error('Error fetching parents:', error)
      alert(t('parents.errorLoadingParents') + ': ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [academyId])

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
      alert(t('parents.errorFetchingFamilies') + ': ' + (error as Error).message)
    }
  }, [academyId])

  useEffect(() => {
    fetchParents()
    fetchFamilies()
  }, [fetchParents, fetchFamilies])

  // Filter and sort parents
  const filteredParents = parents.filter(parent => {
    const matchesSearch = parent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         parent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (parent.phone && parent.phone.includes(searchQuery)) ||
                         (parent.family_name && parent.family_name.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && parent.active) ||
                         (statusFilter === 'inactive' && !parent.active)
    
    return matchesSearch && matchesStatus
  }).sort((a, b) => {
    if (!sortField) return 0
    
    let aVal: any, bVal: any
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
        aVal = new Date(a.created_at)
        bVal = new Date(b.created_at)
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

  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    
    if (!formData.name.trim()) {
      errors.name = t('validation.nameRequired')
    }
    
    if (!formData.email.trim()) {
      errors.email = t('validation.emailRequired')
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = t('validation.invalidEmail')
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }




  const handleViewFamilyClick = async (parent: Parent) => {
    if (!parent.family_id) {
      alert(t('parents.parentNotAssignedToFamily'))
      setDropdownOpen(null)
      return
    }

    try {
      // Get family info with members
      const { data, error } = await supabase
        .from('families')
        .select(`
          id,
          name,
          created_at,
          family_members!inner(
            user_id,
            role,
            users!inner(
              id,
              name,
              email,
              role
            )
          )
        `)
        .eq('id', parent.family_id)
        .single()

      if (error) throw error

      // Get phone numbers for family members from their respective role tables
      const memberIds = data.family_members.map((member: any) => member.user_id)
      const phoneMap: { [key: string]: string | null } = {}

      // Fetch from parents table
      const { data: parentPhones } = await supabase
        .from('parents')
        .select('user_id, phone')
        .in('user_id', memberIds)
      
      parentPhones?.forEach((p: any) => {
        phoneMap[p.user_id] = p.phone
      })

      // Fetch from students table  
      const { data: studentPhones } = await supabase
        .from('students')
        .select('user_id, phone')
        .in('user_id', memberIds)
      
      studentPhones?.forEach((s: any) => {
        phoneMap[s.user_id] = s.phone
      })

      // Fetch from teachers table
      const { data: teacherPhones } = await supabase
        .from('teachers')
        .select('user_id, phone')
        .in('user_id', memberIds)
      
      teacherPhones?.forEach((t: any) => {
        phoneMap[t.user_id] = t.phone
      })

      // Add phone data to family members
      const enrichedData = {
        ...data,
        family_members: data.family_members.map((member: any) => ({
          ...member,
          phone: phoneMap[member.user_id] || null
        }))
      }

      setParentFamily(enrichedData)
      setViewingParent(parent)
      setShowViewFamilyModal(true)
      setDropdownOpen(null)
    } catch (error: any) {
      alert(t('parents.errorLoadingFamily') + ': ' + error.message)
    }
  }

  const handleViewChildrenClick = async (parent: Parent) => {
    if (!parent.family_id || parent.children_count === 0) {
      alert(t('parents.parentHasNoChildren'))
      setDropdownOpen(null)
      return
    }

    try {
      // Get all children for this parent's family
      const { data: childrenData, error } = await supabase
        .from('family_members')
        .select(`
          user_id,
          role,
          users!inner(
            id,
            name,
            email,
            role
          )
        `)
        .eq('family_id', parent.family_id)
        .eq('users.role', 'student')

      if (error) throw error

      // Get student details for the children
      const studentIds = childrenData?.map(child => child.user_id) || []
      let studentsData: { [key: string]: { school_name: string; active: boolean } } = {}
      
      if (studentIds.length > 0) {
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('user_id, school_name, active')
          .in('user_id', studentIds)

        if (!studentsError && students) {
          students.forEach(student => {
            studentsData[student.user_id] = {
              school_name: student.school_name,
              active: student.active
            }
          })
        }
      }

      // Get classroom counts for each child
      let classroomCounts: { [key: string]: number } = {}
      
      if (studentIds.length > 0) {
        const { data: classroomCountData, error: classroomError } = await supabase
          .rpc('count_classrooms_by_student', {
            student_ids: studentIds
          })

        if (!classroomError && classroomCountData) {
          classroomCountData.forEach((row: { student_id: string; classroom_count: number }) => {
            classroomCounts[row.student_id] = row.classroom_count
          })
        }
      }

      // Enrich children data with student details and classroom counts
      const enrichedChildren = childrenData?.map(child => ({
        ...child,
        students: studentsData[child.user_id] || { school_name: null, active: false },
        classroom_count: classroomCounts[child.user_id] || 0
      })) || []

      setParentChildren(enrichedChildren)
      setViewingParent(parent)
      setShowViewChildrenModal(true)
      setDropdownOpen(null)
    } catch (error: any) {
      alert(t('parents.errorLoadingChildren') + ': ' + error.message)
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

      if (error) throw error

      setShowDeleteModal(false)
      setParentToDelete(null)
      fetchParents()
      alert(t(newStatus ? 'success.activated' : 'success.deactivated', { item: t('parents.parent') }))
    } catch (error: any) {
      alert(t(newStatus ? 'alerts.errorActivating' : 'alerts.errorDeactivating', { resource: t('parents.parent'), error: error.message }))
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
      fetchParents()
      alert(`Parents ${active ? 'activated' : 'deactivated'} successfully!`)
    } catch (error: any) {
      console.error('Error updating parents:', error)
      alert(t('parents.errorUpdatingParents') + ': ' + error.message)
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
            <h1 className="text-2xl font-bold text-gray-900">{t("parents.title")}</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">{t("parents.title")}</h1>
          <p className="text-gray-500">{t("parents.description")}</p>
        </div>
        <div className="flex items-center gap-3">
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          placeholder={t("parents.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
        />
      </div>

      {/* Bulk Actions Menu */}
      {selectedParents.size > 0 && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedParents.size}개 선택됨
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedParents(new Set())}
              >
                {t("parents.clearSelection")}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => handleBulkStatusUpdate(true)} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                {t("parents.makeActive")}
              </Button>
              <Button onClick={() => handleBulkStatusUpdate(false)} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                {t("parents.makeInactive")}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Parents Table */}
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
                      checked={filteredParents.length > 0 && selectedParents.size === filteredParents.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 ">
                      {t("parents.parent")}
                      {renderSortIcon('name')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('phone')} className="flex items-center gap-1 ">
                      {t("parents.phone")}
                      {renderSortIcon('phone')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('family')} className="flex items-center gap-1 ">
                      {t("parents.family")}
                      {renderSortIcon('family')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('children')} className="flex items-center gap-1 ">
                      {t("parents.children")}
                      {renderSortIcon('children')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2 relative">
                    {t("parents.status")}
                    <div className="relative z-20" ref={statusFilterRef}>
                      <button
                        onClick={() => setShowStatusFilter(!showStatusFilter)}
                        className={`flex items-center ${
                          statusFilter !== 'all' ? 'text-primary' : 'text-gray-400 '
                        }`}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                      </button>
                      
                      {showStatusFilter && (
                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-50">
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
                <th className="text-left p-4 font-medium text-gray-900"></th>
              </tr>
            </thead>
            <tbody>
              {filteredParents.length > 0 ? filteredParents.map((parent) => (
                <tr key={parent.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedParents.has(parent.user_id)}
                      onChange={(e) => handleSelectParent(parent.user_id, e.target.checked)}
                    />
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-gray-900">{parent.name}</div>
                      <div className="text-sm text-gray-500">
                        {parent.email}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {parent.phone ? (
                      <div className="text-sm text-gray-600">
                        {parent.phone}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    {parent.family_name ? (
                      <div className="text-sm">
                        <span className="text-blue-600">{parent.family_name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    {(parent.children_count || 0) > 0 ? (
                      <span className="text-sm text-gray-600">
                        {language === 'korean' 
                          ? `${parent.children_count}개 자녀`
                          : `${parent.children_count} ${parent.children_count === 1 ? 'Child' : 'Children'}`
                        }
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {parent.active ? (
                        <CheckCircle className="w-4 h-4 text-green-600 hover:text-green-700 transition-colors cursor-pointer" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-600 hover:text-gray-700 transition-colors cursor-pointer" />
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        parent.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {parent.active ? t('parents.active') : t('parents.inactive')}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="relative">
                      <Button
                        ref={(el) => { dropdownButtonRefs.current[parent.user_id] = el }}
                        variant="ghost"
                        size="sm"
                        onClick={() => setDropdownOpen(dropdownOpen === parent.user_id ? null : parent.user_id)}
                        className="p-1"
                      >
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
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
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-red-600"
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
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-green-600"
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
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center">
                      <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{t("parents.noParentsFound")}</h3>
                      <p className="text-gray-600">
                        {searchQuery ? t("parents.tryAdjustingSearch") : t("parents.getStartedFirstParent")}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>



      {/* Delete Confirmation Modal */}
      {showDeleteModal && parentToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{parentToDelete.active ? t('parents.makeInactiveParent') : t('parents.makeActiveParent')}</h2>
              <p className="text-gray-600 mb-6">
                {parentToDelete.active 
                  ? `${t('parents.makeInactiveConfirm', { name: parentToDelete.name })} ${t('parents.dataPreserved')}`
                  : `${t('parents.makeActiveConfirm', { name: parentToDelete.name })} ${t('parents.regainAccess')}`}
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteModal(false)
                    setParentToDelete(null)
                  }}
                  className="flex-1"
                >
                  {t("common.cancel")}
                </Button>
                <Button 
                  onClick={handleDeleteConfirm}
                  className={`flex-1 text-white ${parentToDelete.active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {parentToDelete.active ? t('parents.makeInactive') : t('parents.makeActive')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Family Modal */}
      {showViewFamilyModal && viewingParent && parentFamily && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-3xl mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {t("parents.familyMembers")} - {parentFamily.name || `${t('parents.family')} ${parentFamily.id.slice(0, 8)}`}
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowViewFamilyModal(false)
                  setViewingParent(null)
                  setParentFamily(null)
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6">
              {/* Family members display - updated to match families page design */}
              {parentFamily.family_members && parentFamily.family_members.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    {language === 'korean'
                      ? `${parentFamily.family_members.length}개 가족 구성원`
                      : `${parentFamily.family_members.length} Family Members`
                    }
                  </p>
                  <div className="grid gap-4">
                    {parentFamily.family_members.map((member: any) => (
                      <div key={member.user_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg mb-2">{member.users.name}</h3>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">{t("common.email")}:</span>
                                    <span> {member.users.email}</span>
                                  </div>
                                  {member.phone && (
                                    <div>
                                      <span className="font-medium">{t("common.phone")}:</span>
                                      <span> {member.phone}</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium">{t("common.role")}:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ml-1 ${
                                      member.users.role === 'parent' 
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {t(`common.roles.${member.users.role}`)}
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t("parents.noFamilyMembers")}</h3>
                  <p className="text-gray-600">{t("parents.familyNoMembersYet")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Children Modal */}
      {showViewChildrenModal && viewingParent && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-3xl mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {t("parents.children")} - {viewingParent.name}
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowViewChildrenModal(false)
                  setViewingParent(null)
                  setParentChildren([])
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6">
              {parentChildren.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    {language === 'korean'
                      ? `${parentChildren.length}개 자녀`
                      : `${parentChildren.length} ${parentChildren.length === 1 ? 'Child' : 'Children'}`
                    }
                  </p>
                  <div className="grid gap-4">
                    {parentChildren.map((child) => (
                      <div key={child.user_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg mb-2">{child.users.name}</h3>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">{t("common.email")}:</span>
                                    <span> {child.users.email}</span>
                                  </div>
                                  {child.students.school_name && (
                                    <div>
                                      <span className="font-medium">{t("parents.school")}:</span>
                                      <span> {child.students.school_name}</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium">{t("parents.classrooms")}:</span>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium ml-1">
                                      {child.classroom_count || 0}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium">{t("parents.status")}:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ml-1 ${
                                      child.students.active 
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {child.students.active ? t('parents.active') : t('parents.inactive')}
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
                  <Baby className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t("parents.noChildrenFound")}</h3>
                  <p className="text-gray-600">{t("parents.parentNoChildrenYet")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}