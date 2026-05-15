"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import { useListPageShortcuts } from '@/hooks/useListPageShortcuts'
import { SearchKbdHint } from '@/components/ui/search-kbd-hint'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Search,
  Download,
  Grid3X3,
  Rows3,
  User,
  Mail,
  Home,
  School,
  BookOpen,
  Edit,
  UserCheck,
  UserX,
  UserPlus,
} from 'lucide-react'
import { DashboardCard, BulkActionBar } from '@/components/ui/dashboard'
import { StatusPill } from '@/components/ui/status-pill'
import { useTranslation } from '@/hooks/useTranslation'
import { useToast } from '@/hooks/use-toast'
import { showSuccessToast, showErrorToast } from '@/stores'
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits'
import { useStudentData, Student, invalidateStudentsCache } from '@/hooks/useStudentData'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { useStudentActions } from '@/hooks/useStudentActions'
import { usePageShortcuts, studentPageShortcuts } from '@/hooks/usePageShortcuts'
import { StudentsTable } from './StudentsTable'

// Modals are conditionally rendered — dynamic-import keeps the ~700
// lines of modal JSX (plus the 521-line DataImportModal with its tabs/
// progress/alert deps) out of the page chunk until the user opens one.
import dynamic from 'next/dynamic'
const StudentsEditModal = dynamic(() => import('./StudentsEditModal').then(m => m.StudentsEditModal), { ssr: false })
const StudentsDeleteModal = dynamic(() => import('./StudentsDeleteModal').then(m => m.StudentsDeleteModal), { ssr: false })
const StudentsViewClassroomsModal = dynamic(() => import('./StudentsViewClassroomsModal').then(m => m.StudentsViewClassroomsModal), { ssr: false })
const StudentsClassroomDetailsModal = dynamic(() => import('./StudentsClassroomDetailsModal').then(m => m.StudentsClassroomDetailsModal), { ssr: false })
const StudentsViewFamilyModal = dynamic(() => import('./StudentsViewFamilyModal').then(m => m.StudentsViewFamilyModal), { ssr: false })
const DataExportModal = dynamic(() => import('@/components/ui/common/DataExportModal').then(m => m.DataExportModal), { ssr: false })
const DataImportModal = dynamic(() => import('@/components/ui/common/DataImportModal').then(m => m.DataImportModal), { ssr: false })
import { ImportResult } from '@/hooks/useDataImport'

interface StudentsPageOriginalUIProps {
  academyId: string
}

export function StudentsPageOriginalUI({ academyId }: StudentsPageOriginalUIProps) {
  // State management
  const { t } = useTranslation()
  const { toast } = useToast()
  const { totalUsers, totalUserLimit, canAddUsers, loading: limitsLoading } = useSubscriptionLimits(academyId)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const itemsPerPage = 10

  const {
    students,
    families,
    loading,
    tableLoading,
    totalCount,
    activeCount,
    inactiveCount,
    initialized,
    refreshData,
    fetchFamilyDetails,
    fetchStudentClassrooms
  } = useStudentData(academyId, currentPage, itemsPerPage, statusFilter)
  const { updateStudent, toggleStudentStatus, bulkUpdateStudents } = useStudentActions()

  // Set up page-specific keyboard shortcuts and commands
  usePageShortcuts({
    shortcuts: studentPageShortcuts.shortcuts,
    commands: studentPageShortcuts.commands
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Manager keyboard shortcuts: `/` → search, `Esc` → clear selection.
  useListPageShortcuts({
    searchInputRef,
    onEscape: selectedStudents.size > 0
      ? () => setSelectedStudents(new Set())
      : undefined,
  })
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showStatusFilter, setShowStatusFilter] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const dropdownButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showViewFamilyModal, setShowViewFamilyModal] = useState(false)
  const [showViewClassroomsModal, setShowViewClassroomsModal] = useState(false)
  const [showClassroomDetailsModal, setShowClassroomDetailsModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null)
  const [studentFamily, setStudentFamily] = useState<{
    id: string
    name?: string
    members?: Array<{
      user_id: string
      phone?: string
      users: {
        name: string
        email: string
        role: string
      }
    }>
  } | null>(null)
  const [studentClassrooms, setStudentClassrooms] = useState<Array<{
    id: string
    name: string
    grade?: string
    subject?: string
    color?: string
    notes?: string
    teacher_id?: string
    teacher_name?: string | null
    created_at?: string
    updated_at?: string
    student_count?: number
    enrolled_students?: Array<{
      name: string
      school_name?: string
    }>
  }>>([])
  const [selectedClassroomForDetails, setSelectedClassroomForDetails] = useState<{
    id: string
    name: string
    color?: string
    grade?: string
    subject?: string
    teacher_name?: string | null
    notes?: string
    created_at?: string
    updated_at?: string
    student_count?: number
    enrolled_students?: Array<{
      name: string
      school_name?: string
    }>
  } | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    school_name: '',
    family_id: ''
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)

  // Refs
  const statusFilterRef = useRef<HTMLDivElement>(null)

  // Filter and sort students (status is already filtered at database level)
  const filteredStudents = useMemo(() => students.filter(student => {
    // Only apply search filter client-side (status already filtered by database)
    if (!searchQuery) return true

    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (student.phone && student.phone.includes(searchQuery)) ||
                         (student.school_name && student.school_name.toLowerCase().includes(searchQuery.toLowerCase()))

    return matchesSearch
  }).sort((a, b) => {
    if (!sortField) return 0

    let aVal: string | number | Date, bVal: string | number | Date
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
      case 'school':
        aVal = a.school_name || ''
        bVal = b.school_name || ''
        break
      case 'family':
        aVal = a.family_name || ''
        bVal = b.family_name || ''
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
  }), [students, searchQuery, sortField, sortDirection])

  // Calculate effective count for pagination
  const effectiveTotalCount = searchQuery
    ? filteredStudents.length // Client-side filtered count when searching
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

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(filteredStudents.map(s => s.user_id)))
    } else {
      setSelectedStudents(new Set())
    }
  }

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedStudents)
    if (checked) {
      newSelected.add(studentId)
    } else {
      newSelected.delete(studentId)
    }
    setSelectedStudents(newSelected)
  }

  // CRUD Operations
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      school_name: '',
      family_id: ''
    })
    setFormErrors({})
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    
    if (!formData.name.trim()) {
      errors.name = String(t('students.nameRequired'))
    }
    
    if (!formData.email.trim()) {
      errors.email = String(t('students.emailRequired'))
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = String(t('students.validEmailRequired'))
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }


  const handleUpdateStudent = async () => {
    if (!editingStudent || !validateForm()) return
    
    setSubmitting(true)
    const result = await updateStudent(editingStudent.user_id, academyId, {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      school_name: formData.school_name,
      family_id: formData.family_id,
      active: editingStudent.active
    })

    if (result.success) {
      setShowEditModal(false)
      setEditingStudent(null)
      resetForm()
      await refreshData()
      toast({ title: String(t('students.studentUpdatedSuccessfully')), variant: 'success' })
    } else {
      if ((result.error as { code?: string })?.code === '23505') {
        setFormErrors({ email: String(t('students.emailAlreadyInUse')) })
      } else {
        toast({ title: String(t('students.errorUpdatingStudent')), description: result.error?.message, variant: 'destructive' })
      }
    }
    setSubmitting(false)
  }

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student)
    setShowDeleteModal(true)
    setDropdownOpen(null)
  }

  const handleActivateClick = (student: Student) => {
    setStudentToDelete(student)
    setShowDeleteModal(true)
    setDropdownOpen(null)
  }

  const handleViewFamilyClick = async (student: Student) => {
    if (!student.family_id) {
      toast({ title: String(t('students.studentNotAssignedToFamily')), variant: 'warning' })
      setDropdownOpen(null)
      return
    }

    const familyData = await fetchFamilyDetails(student.family_id)
    if (familyData) {
      setStudentFamily(familyData)
      setViewingStudent(student)
      setShowViewFamilyModal(true)
      setDropdownOpen(null)
    }
  }

  const handleViewClassroomsClick = async (student: Student) => {
    const classrooms = await fetchStudentClassrooms(student.user_id)
    setStudentClassrooms(classrooms)
    setViewingStudent(student)
    setShowViewClassroomsModal(true)
    setDropdownOpen(null)
  }

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return
    
    const newStatus = !studentToDelete.active
    const result = await toggleStudentStatus(studentToDelete.user_id, academyId, newStatus)
    
    if (result.success) {
      setShowDeleteModal(false)
      setStudentToDelete(null)
      invalidateStudentsCache(academyId)
      await refreshData()
      showSuccessToast(t(newStatus ? 'success.activated' : 'success.deactivated', {
        item: `${studentToDelete.name} (${t('common.student')})`
      }) as string)
    } else {
      showErrorToast(t(newStatus ? 'alerts.errorActivating' : 'alerts.errorDeactivating', {
        resource: t('common.student') as string,
        error: result.error?.message || 'Unknown error'
      }) as string)
    }
  }

  const handleBulkStatusUpdate = async (active: boolean) => {
    if (selectedStudents.size === 0) return
    
    const updates = Array.from(selectedStudents).map(studentId => ({
      studentId,
      active
    }))

    const result = await bulkUpdateStudents(academyId, updates)
    
    if (result.success) {
      setSelectedStudents(new Set())
      await refreshData()
      showSuccessToast(t(active ? 'success.multipleActivated' : 'success.multipleDeactivated', { items: t('students.students') as string }) as string)
    } else {
      showErrorToast(String(t('students.errorUpdatingStudents')) + ': ' + result.error?.message)
    }
  }

  const handleImportComplete = async (result: ImportResult<unknown>) => {
    await refreshData()
    toast({ title: String(t('students.importSuccess', { count: result.metadata.validRows })) || `Successfully imported ${result.metadata.validRows} students`, variant: 'success' })
  }

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setShowStatusFilter(false)
      }
      
      if (dropdownOpen) {
        const target = event.target as Node
        if (target && (target as Element).closest('.dropdown-menu')) {
          return
        }
        
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

  // Loading skeleton — matches DataTable chrome used by sessions / payments / etc.
  const TableSkeleton = () => (
    <div className="overflow-x-auto min-h-[640px]">
      <table className="w-full min-w-[800px] text-sm">
        <thead className="bg-gray-50/60">
          <tr>
            <th className="w-10 px-4 py-3"><div className="h-3 w-3 bg-gray-200 rounded" /></th>
            {['w-20', 'w-16', 'w-16', 'w-16', 'w-12', 'w-8'].map((w, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <div className={`h-3 ${w} bg-gray-200 rounded`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {[...Array(10)].map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="px-4 py-3"><div className="h-4 w-4 bg-gray-100 rounded" /></td>
              {[...Array(6)].map((_, j) => (
                <td key={j} className="px-4 py-3">
                  <div className="h-4 bg-gray-100 rounded" style={{ width: `${60 + ((i * 7 + j * 3) % 30)}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t("eyebrows.students")}</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{t("students.title")}</h1>
            <p className="text-gray-500">{t("students.description")}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              {t('students.export') || 'Export'}
            </Button>
          </div>
        </div>

        {/* Toggle Skeleton */}
        <div className="flex justify-end mb-4 animate-pulse">
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
            <div className="h-9 w-9 bg-gray-200 rounded"></div>
            <div className="h-9 w-9 bg-gray-200 rounded"></div>
          </div>
        </div>

        <div className="relative mb-4 max-w-md animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
        </div>

        <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <TableSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t("eyebrows.students")}</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{t("students.title")}</h1>
          <p className="text-gray-500">{t("students.description")}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {!limitsLoading && totalUserLimit > 0 && (
            <span className={`text-xs sm:text-sm font-medium px-2.5 py-1 rounded-full ${
              canAddUsers ? 'bg-gray-100 text-gray-600' : 'bg-rose-50 text-rose-700'
            }`}>
              {t('subscription.usersCount', { current: totalUsers, limit: totalUserLimit })}
            </span>
          )}
          {/* Import button hidden for now
          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
            size="sm"
            data-import-btn
          >
            <Upload className="w-4 h-4 mr-2" />
            {t('students.import') || 'Import'}
          </Button>
          */}
          <Button
            variant="outline"
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4"
            data-export-btn
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
            {t('students.export') || 'Export'}
          </Button>
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
            onClick={() => { setViewMode('card'); setSelectedStudents(new Set()) }}
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
          placeholder={String(t("students.searchPlaceholder"))}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-12 pr-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
        />
        <SearchKbdHint />
      </div>

      {/* Bulk Action Bar — uses shared BulkActionBar primitive for visual consistency
          with sessions / assignments / classrooms / attendance / payments pages. */}
      {selectedStudents.size > 0 && (
        <div className="mb-4">
          <BulkActionBar
            selectedCount={selectedStudents.size}
            onClear={() => setSelectedStudents(new Set())}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkStatusUpdate(true)}
            >
              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
              {t("students.makeActive")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkStatusUpdate(false)}
              className="text-rose-600 ring-rose-200 hover:bg-rose-50 hover:ring-rose-300"
            >
              <UserX className="w-3.5 h-3.5 mr-1.5" />
              {t("students.makeInactive")}
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

      {/* Students Content — card or table */}
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
                  <div className="h-3 w-2/3 bg-gray-200 rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card>
            <EmptyState
              icon={UserPlus}
              title={String(t("students.noStudentsFound"))}
              description={searchQuery ? String(t('common.tryAdjustingSearch')) : String(t('students.getStartedFirstStudent'))}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStudents.map((student) => (
              <DashboardCard
                key={student.user_id}
                paused={!student.active}
                accentColor={student.active ? '#10b981' : '#9ca3af'}
                statusLabel={student.active ? t('students.active') : t('students.inactive')}
                statusToneClass={student.active ? 'text-emerald-600' : 'text-gray-500'}
                title={student.name}
                subtitle={
                  <>
                    <Mail className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                    <span className="truncate">{student.email}</span>
                  </>
                }
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                    onClick={() => handleViewClassroomsClick(student)}
                    title={String(t("students.viewClassrooms"))}
                  >
                    <BookOpen className="w-4 h-4" strokeWidth={1.75} />
                  </Button>
                }
                metrics={[
                  {
                    label: t('students.school') as string,
                    value: student.school_name && student.school_name.trim() ? student.school_name : '—',
                  },
                  {
                    label: t('students.family') as string,
                    value: student.family_name && student.family_name.trim() ? student.family_name : '—',
                  },
                  {
                    label: t('navigation.classrooms') as string,
                    value: String(student.classroom_count || 0),
                  },
                ]}
                meta={
                  student.phone ? (
                    <div className="flex items-start gap-1.5">
                      <User className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                      <span>{student.phone}</span>
                    </div>
                  ) : null
                }
                footerActions={
                  <>
                    <Button
                      variant="outline"
                      className="w-full text-xs sm:text-sm h-9"
                      onClick={() => handleViewFamilyClick(student)}
                    >
                      <Home className="w-3.5 h-3.5 mr-1.5" />
                      {t("students.viewFamily")}
                    </Button>
                    <Button
                      className="w-full text-xs sm:text-sm h-9"
                      variant={student.active ? 'outline' : 'default'}
                      onClick={() => student.active ? handleDeleteClick(student) : handleActivateClick(student)}
                    >
                      {student.active ? (
                        <><UserX className="w-3.5 h-3.5 mr-1.5" />{t("students.makeInactive")}</>
                      ) : (
                        <><UserCheck className="w-3.5 h-3.5 mr-1.5" />{t("students.makeActive")}</>
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
        <StudentsTable
          students={filteredStudents}
          selectedStudents={selectedStudents}
          sortField={sortField}
          sortDirection={sortDirection}
          statusFilter={statusFilter}
          showStatusFilter={showStatusFilter}
          searchQuery={searchQuery}
          dropdownOpen={dropdownOpen}
          dropdownButtonRefs={dropdownButtonRefs}
          statusFilterRef={statusFilterRef}
          initialized={initialized}
          t={(key: string) => String(t(key))}
          onSort={handleSort}
          onSelectAll={handleSelectAll}
          onSelectStudent={handleSelectStudent}
          onStatusFilterChange={setStatusFilter}
          onShowStatusFilterChange={setShowStatusFilter}
          onDropdownOpenChange={setDropdownOpen}
          onViewFamilyClick={handleViewFamilyClick}
          onViewClassroomsClick={handleViewClassroomsClick}
          onDeleteClick={handleDeleteClick}
          onActivateClick={handleActivateClick}
        />

        {/* Pagination Controls */}
        {effectiveTotalCount > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
              >
                {t("students.pagination.previous")}
              </Button>
              <Button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(effectiveTotalCount / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(effectiveTotalCount / itemsPerPage)}
                variant="outline"
              >
                {t("students.pagination.next")}
              </Button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {t("students.pagination.showing")}
                  <span className="font-medium"> {((currentPage - 1) * itemsPerPage) + 1} </span>
                  {t("students.pagination.to")}
                  <span className="font-medium"> {Math.min(currentPage * itemsPerPage, effectiveTotalCount)} </span>
                  {t("students.pagination.of")}
                  <span className="font-medium"> {effectiveTotalCount} </span>
                  {t("students.pagination.students")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  {t("students.pagination.previous")}
                </Button>
                <Button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(effectiveTotalCount / itemsPerPage), p + 1))}
                  disabled={currentPage >= Math.ceil(effectiveTotalCount / itemsPerPage)}
                  variant="outline"
                >
                  {t("students.pagination.next")}
                </Button>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>
      )}

      {/* Modals */}
      <StudentsEditModal
        isOpen={showEditModal}
        student={editingStudent}
        formData={formData}
        formErrors={formErrors}
        families={families}
        submitting={submitting}
        t={(key: string) => String(t(key))}
        onClose={() => {
          setShowEditModal(false)
          setEditingStudent(null)
          resetForm()
        }}
        onFormDataChange={setFormData}
        onSubmit={handleUpdateStudent}
      />

      <StudentsDeleteModal
        isOpen={showDeleteModal}
        student={studentToDelete}
        t={(key: string, params?: Record<string, string | number | undefined>) => String(t(key, params))}
        onClose={() => {
          setShowDeleteModal(false)
          setStudentToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
      />

      <StudentsViewClassroomsModal
        isOpen={showViewClassroomsModal}
        student={viewingStudent}
        classrooms={studentClassrooms}
        t={(key: string, params?: Record<string, string | number | undefined>) => String(t(key, params))}
        onClose={() => {
          setShowViewClassroomsModal(false)
          setViewingStudent(null)
          setStudentClassrooms([])
        }}
        onViewDetails={(classroom) => {
          setSelectedClassroomForDetails(classroom)
          setShowClassroomDetailsModal(true)
        }}
      />

      <StudentsClassroomDetailsModal
        isOpen={showClassroomDetailsModal}
        classroom={selectedClassroomForDetails}
        t={(key: string) => String(t(key))}
        onClose={() => {
          setShowClassroomDetailsModal(false)
          setSelectedClassroomForDetails(null)
        }}
      />

      <StudentsViewFamilyModal
        isOpen={showViewFamilyModal}
        student={viewingStudent}
        familyData={studentFamily}
        t={(key: string) => String(t(key))}
        onClose={() => {
          setShowViewFamilyModal(false)
          setViewingStudent(null)
          setStudentFamily(null)
        }}
      />

      {/* Export Modal */}
      {showExportModal && (
        <DataExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          data={filteredStudents as unknown as Record<string, unknown>[]}
          title={t('students.exportTitle') || 'Export Students'}
          defaultFilename="students_export"
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <DataImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
          title={t('students.importTitle') || 'Import Students'}
          acceptedFormats={['csv', 'json']}
        />
      )}
    </div>
  )
}